import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { createMarkdownSystem } from "./markdownSystem.js";
import { strikethroughExtension } from "./extensions/strikethrough.js";

import buildMarkdownPlugins from "./markdownToolbarPlugin.js";
import htmlLiteralStylingPlugin from "./htmlLiteralStylingPlugin.js";

// --- Active-editor registry (works even with multiple editors) ---
const REGISTRY_KEY = Symbol.for("app/active-editor-registry");
const ACTIVE = (globalThis[REGISTRY_KEY] ??= new WeakMap());
const isTextarea = (el) => el && el.nodeType === 1 && el.tagName === "TEXTAREA";
const nearestForm = (el) => el?.closest?.("form") ?? null;

function markActive(el, mode, instance) {
  ACTIVE.set(el, { mode, instance });
  // el.dataset.editorMode = mode; // (optional) visible in devtools
}

function unmarkActive(el, instance) {
  const rec = ACTIVE.get(el);
  if (rec && rec.instance === instance) ACTIVE.delete(el);
  // delete el.dataset.editorMode;
}

class MarkdownView {
  static MODE = "markdown";

  static isActive(el) { return ACTIVE.get(el)?.mode === this.MODE; }
  static activeMode(el) { return ACTIVE.get(el)?.mode ?? null; }
  static activeInstance(el) { return ACTIVE.get(el)?.instance ?? null; }

  constructor(target, content = "") {
    this.root = target;

    if (isTextarea(target)) {
      this.textarea = target; // the form field of record
      this._ownsTextarea = false;
      if (content != null && content !== "") this.textarea.value = content;
      // ensure it's visible if a previous PM instance hid it
      this.textarea.style.display = this._prevDisplay || "";
    } else {
      this.textarea = document.createElement("textarea");
      this.textarea.value = content ?? "";
      target.appendChild(this.textarea);
      this._ownsTextarea = true;
    }

    markActive(this.root, MarkdownView.MODE, this);
  }

  get content() { return this.textarea.value; }
  get mode() { return MarkdownView.MODE; }
  focus() { this.textarea.focus(); }
  destroy() {
    if (this._ownsTextarea) this.textarea.remove();
    unmarkActive(this.root, this);
  }
}

class ProseMirrorView {
  static MODE = "prosemirror";

  static isActive(el) { return ACTIVE.get(el)?.mode === this.MODE; }
  static activeMode(el) { return ACTIVE.get(el)?.mode ?? null; }
  static activeInstance(el) { return ACTIVE.get(el)?.instance ?? null; }

  constructor(target, content = "") {
    this.root = target;

    let mountEl;
    let initialMarkdown;

    if (isTextarea(target)) {
      // Use the textarea as the mirror (field submitted to PHP)
      this.mirror = target;
      initialMarkdown = content != null && content !== "" ? content : (target.value ?? "");

      // Create a mount container for the editor and hide textarea
      this._createdMount = document.createElement("div");
      this._createdMount.className = "pm-editor-container";
      target.insertAdjacentElement("beforebegin", this._createdMount);

      this._prevDisplay = target.style.display;
      target.style.display = "none";

      mountEl = this._createdMount;
    } else {
      // Container case (not typical in your init, but supported)
      this.mirror = document.createElement("textarea");
      this.mirror.hidden = true;
      // If you ever use containers, set name on container: data-name="field"
      this.mirror.name = target.getAttribute("data-name") || "content";
      target.insertAdjacentElement("afterend", this.mirror);

      initialMarkdown = content ?? "";
      mountEl = target;
      this._ownsMirror = true;
    }

    // Create markdown system with extensions
    const markdownSystem = createMarkdownSystem([strikethroughExtension]);
    const { schema, mdParser, mdSerializer, keymapPlugins } = markdownSystem;
    
    // Store serializer for later use
    this.mdSerializer = mdSerializer;

    // Build the editor and keep the textarea in sync on every transaction
    this.view = new EditorView(mountEl, {
      state: EditorState.create({
        schema,
        doc: mdParser.parse(initialMarkdown),
        plugins: [
          ...buildMarkdownPlugins(schema, { codeJoinMode: "smart" }),
          ...keymapPlugins,
          htmlLiteralStylingPlugin({ className: "pm-html-literal" }),
        ],
      }),
      dispatchTransaction: (tr) => {
        const newState = this.view.state.apply(tr);
        this.view.updateState(newState);
        this._scheduleSync();
      }
    });

    // Initial sync so the textarea has the right value immediately
    this._syncToMirror(true);

    // Final sync before PHP receives POST
    this.form = nearestForm(this.mirror) || nearestForm(mountEl);
    if (this.form) {
      this._onSubmit = () => this._syncToMirror(true);
      this.form.addEventListener("submit", this._onSubmit);
    }

    markActive(this.root, ProseMirrorView.MODE, this);
  }

  // Serialize editor → textarea (throttled with rAF)
  _syncToMirror(force = false) {
    if (!this.mirror) return;
    const run = () => {
      this._syncScheduled = false;
      const md = this.mdSerializer.serialize(this.view.state.doc);
      if (this.mirror.value !== md) this.mirror.value = md;
    };
    if (force) {
      if (this._raf) cancelAnimationFrame(this._raf);
      run();
    } else {
      if (this._syncScheduled) return;
      this._syncScheduled = true;
      this._raf = requestAnimationFrame(run);
    }
  }
  _scheduleSync() { this._syncToMirror(false); }

  get content() {
    return this.mdSerializer.serialize(this.view.state.doc);
  }
  get mode() { return ProseMirrorView.MODE; }
  focus() { this.view.focus(); }
  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.form && this._onSubmit) this.form.removeEventListener("submit", this._onSubmit);
    this.view.destroy();

    if (this._createdMount) {
      this._createdMount.remove();
      this._createdMount = null;
    }
    if (this.mirror && isTextarea(this.root)) {
      // restore original textarea visibility
      this.mirror.style.display = this._prevDisplay || "";
    }
    if (this._ownsMirror && this.mirror) {
      // container case: remove hidden mirror we created
      this.mirror.remove();
      this._ownsMirror = false;
    }

    unmarkActive(this.root, this);
  }
}

// Optional helper
function getActiveEditorMode(el) {
  return ACTIVE.get(el)?.mode ?? null; // "markdown" | "prosemirror" | null
}

// Helper: read current mode from helper (or fallback)
const readMode = (el) => (typeof getActiveEditorMode === "function" ? getActiveEditorMode(el) : null);

// Label helper
const labelFor = (mode) => (mode === "markdown" ? "to WYSIWYG" : "to Markdown");

// Wire a single textarea + button
function wireEditorToggle(ta) {
  let btn = ta.parentElement?.querySelector("button");
  if (!btn) {
    // Create toggle button if it doesn't exist
    btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Editor mode");
    btn.className = "toggle-editor-mode";
    btn.style.marginBottom = "12px";
    
    // Insert before the textarea
    ta.parentElement.insertBefore(btn, ta);
    
    console.log("Created toggle button for textarea");
  }

  // Determine starting mode; default to markdown if unknown
  const initialMode = readMode(ta) || "prosemirror";

  // Create initial view
  let view =
    initialMode === "markdown"
      ? new MarkdownView(ta, ta.value)
      : new ProseMirrorView(ta, ta.value);

  // Keep button label in sync with current mode
  function updateButton() {
    const mode =
      readMode(ta) ||
      (view instanceof MarkdownView ? "markdown" : "prosemirror");
    btn.textContent = labelFor(mode);
    btn.setAttribute("data-editor-mode", mode); // optional, handy for styling/tests
  }

  // Switch function used by the button (and available for you to call)
  function switchTo(nextMode) {
    const currentMode =
      readMode(ta) ||
      (view instanceof MarkdownView ? "markdown" : "prosemirror");
    if (nextMode === currentMode) return;

    const content = view.content; // pull current content before destroying
    view.destroy();

    view =
      nextMode === "markdown"
        ? new MarkdownView(ta, content)
        : new ProseMirrorView(ta, content);

    updateButton();
    view.focus();
  }

  // Initial label
  updateButton();

  // Toggle on click
  btn.addEventListener("click", () => {
    const mode =
      readMode(ta) ||
      (view instanceof MarkdownView ? "markdown" : "prosemirror");
    switchTo(mode === "markdown" ? "prosemirror" : "markdown");
  });

  // Optional: expose a tiny API for programmatic control
  ta._editorAPI = {
    get mode() {
      return (
        readMode(ta) ||
        (view instanceof MarkdownView ? "markdown" : "prosemirror")
      );
    },
    get view() {
      return view;
    },
    switchTo,
    refreshButton: updateButton
  };
}

// Configurable initialization function
export function initProseMirrorEditor(selector = "textarea.prosemirror-enabled") {
  document
    .querySelectorAll(selector)
    .forEach((ta) => wireEditorToggle(ta));
}

// Export additional utilities for advanced usage
export { createMarkdownSystem } from "./markdownSystem.js";
export { buildMarkdownPlugins } from "./markdownToolbarPlugin.js";


