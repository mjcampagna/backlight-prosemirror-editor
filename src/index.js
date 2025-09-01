import { DOMParser as ProseMirrorDOMParser } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
// import { schema } from "prosemirror-schema-basic";
import {
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  // schema,
} from "prosemirror-markdown";

import { undo, redo, history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";

import { exampleSetup } from "prosemirror-example-setup";

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

        const schema = defaultMarkdownParser.schema;

    // Build the editor and keep the textarea in sync on every transaction
    this.view = new EditorView(mountEl, {
      state: EditorState.create({
        schema,
        doc: defaultMarkdownParser.parse(initialMarkdown),
        plugins: [
          ...buildMarkdownPlugins(schema, { codeJoinMode: "smart" }), // never | always | smart
          htmlLiteralStylingPlugin({ className: "pm-html-literal" }),
        ],

        // plugins: exampleSetup({
        //   schema,
        //   // Avoid floating menubar to prevent inline min-height glitches:
        //   menuBar: { floating: false }
        // })
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
      const md = defaultMarkdownSerializer.serialize(this.view.state.doc);
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
    return defaultMarkdownSerializer.serialize(this.view.state.doc);
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
  const btn = ta.parentElement?.querySelector("button");
  if (!btn) {
    console.warn("No toggle <button> found next to textarea:", ta);
    return;
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

// Init all textareas
document
  .querySelectorAll("textarea.prosemirror-enabled")
  .forEach((ta) => wireEditorToggle(ta));











// // --- Active-editor registry (works even with multiple editors) ---
// const REGISTRY_KEY = Symbol.for("app/active-editor-registry");
// const ACTIVE = (globalThis[REGISTRY_KEY] ??= new WeakMap());
// const isTextarea = (el) => el && el.nodeType === 1 && el.tagName === "TEXTAREA";

// function markActive(el, mode, instance) {
//   ACTIVE.set(el, { mode, instance });
//   // Optional for debugging:
//   // el.dataset.editorMode = mode;
// }

// function unmarkActive(el, instance) {
//   const rec = ACTIVE.get(el);
//   if (rec && rec.instance === instance) ACTIVE.delete(el);
//   // delete el.dataset.editorMode;
// }

// class MarkdownView {
//   static MODE = "markdown";

//   static isActive(el) { return ACTIVE.get(el)?.mode === this.MODE; }
//   static activeMode(el) { return ACTIVE.get(el)?.mode ?? null; }
//   static activeInstance(el) { return ACTIVE.get(el)?.instance ?? null; }

//   constructor(target, content = "") {
//     this.root = target;

//     if (isTextarea(target)) {
//       // Use the textarea as-is
//       this.textarea = target;
//       this._ownsTextarea = false;
//       if (content != null && content !== "") this.textarea.value = content;
//     } else {
//       // Create and append a textarea inside the container
//       this.textarea = document.createElement("textarea");
//       this.textarea.value = content ?? "";
//       target.appendChild(this.textarea);
//       this._ownsTextarea = true;
//     }

//     markActive(this.root, MarkdownView.MODE, this);
//   }

//   get content() { return this.textarea.value; }
//   get mode() { return MarkdownView.MODE; }
//   focus() { this.textarea.focus(); }
//   destroy() {
//     if (this._ownsTextarea) this.textarea.remove();
//     unmarkActive(this.root, this);
//   }
// }

// class ProseMirrorView {
//   static MODE = "prosemirror";

//   static isActive(el) { return ACTIVE.get(el)?.mode === this.MODE; }
//   static activeMode(el) { return ACTIVE.get(el)?.mode ?? null; }
//   static activeInstance(el) { return ACTIVE.get(el)?.instance ?? null; }

//   constructor(target, content = "") {
//     this.root = target;

//     let mountEl;
//     let initialMarkdown;

//     if (isTextarea(target)) {
//       // Hide the textarea and mount the editor next to it
//       this.textarea = target;
//       initialMarkdown = (content != null && content !== "") ? content : (target.value ?? "");
//       this._createdMount = document.createElement("div");
//       // Optional: give it a class for styling/debugging
//       this._createdMount.className = "pm-editor-container";
//       // Insert before the textarea so layout stays stable
//       target.insertAdjacentElement("beforebegin", this._createdMount);

//       // Hide textarea but keep it in DOM for easy restore
//       this._prevDisplay = target.style.display;
//       target.style.display = "none";

//       mountEl = this._createdMount;
//     } else {
//       // Use the container directly
//       this.textarea = null;
//       initialMarkdown = content ?? "";
//       mountEl = target;
//     }

//     this.view = new EditorView(mountEl, {
//       state: EditorState.create({
//         doc: defaultMarkdownParser.parse(initialMarkdown),
//         plugins: exampleSetup({ schema })
//       })
//     });

//     markActive(this.root, ProseMirrorView.MODE, this);
//   }

//   get content() {
//     return defaultMarkdownSerializer.serialize(this.view.state.doc);
//   }
//   get mode() { return ProseMirrorView.MODE; }
//   focus() { this.view.focus(); }
//   destroy() {
//     this.view.destroy();

//     // If we created a mount next to a textarea, remove it and restore the textarea
//     if (this._createdMount) {
//       this._createdMount.remove();
//       this._createdMount = null;
//     }
//     if (this.textarea) {
//       this.textarea.style.display = this._prevDisplay || "";
//     }

//     unmarkActive(this.root, this);
//   }
// }

// // Optional helper
// function getActiveEditorMode(el) {
//   return ACTIVE.get(el)?.mode ?? null; // "markdown" | "prosemirror" | null
// }



// // Helper: read current mode from your earlier helper (or fallback)
// const readMode = (el) => {
//   if (typeof getActiveEditorMode === "function") return getActiveEditorMode(el);
//   return null; // if you didn't wire the registry/dataset yet
// };

// // Label helper
// const labelFor = (mode) => (mode === "markdown" ? "to WYSIWYG" : "to Markdown");

// // Wire a single textarea + button
// function wireEditorToggle(ta) {
//   const btn = ta.parentElement?.querySelector("button");
//   if (!btn) {
//     console.warn("No toggle <button> found next to textarea:", ta);
//     return;
//   }

//   // Determine starting mode; default to markdown if unknown
//   const initialMode = readMode(ta) || "markdown";

//   // Create initial view
//   let view =
//     initialMode === "markdown"
//       ? new MarkdownView(ta, ta.value)
//       : new ProseMirrorView(ta, ta.value);

//   // Keep button label in sync with current mode
//   function updateButton() {
//     const mode =
//       readMode(ta) ||
//       (view instanceof MarkdownView ? "markdown" : "prosemirror");
//     btn.textContent = labelFor(mode);
//     btn.setAttribute("data-editor-mode", mode); // optional, handy for styling/tests
//   }

//   // Switch function used by the button (and available for you to call)
//   function switchTo(nextMode) {
//     const currentMode =
//       readMode(ta) ||
//       (view instanceof MarkdownView ? "markdown" : "prosemirror");
//     if (nextMode === currentMode) return;

//     const content = view.content; // pull current content before destroying
//     view.destroy();

//     view =
//       nextMode === "markdown"
//         ? new MarkdownView(ta, content)
//         : new ProseMirrorView(ta, content);

//     updateButton();
//     view.focus();
//   }

//   // Initial label
//   updateButton();

//   // Toggle on click
//   btn.addEventListener("click", () => {
//     const mode =
//       readMode(ta) ||
//       (view instanceof MarkdownView ? "markdown" : "prosemirror");
//     switchTo(mode === "markdown" ? "prosemirror" : "markdown");
//   });

//   // Optional: expose a tiny API for programmatic control
//   ta._editorAPI = {
//     get mode() {
//       return (
//         readMode(ta) ||
//         (view instanceof MarkdownView ? "markdown" : "prosemirror")
//       );
//     },
//     get view() {
//       return view;
//     },
//     switchTo,
//     refreshButton: updateButton
//   };
// }

// // Init all textareas
// document
//   .querySelectorAll("textarea.prosemirror-enabled")
//   .forEach((ta) => wireEditorToggle(ta));












// /**
//  * Create a ProseMirror editor.
//  * @param {string|HTMLElement} mount - CSS selector or element to mount into.
//  * @param {string} [initialHTML] - Optional HTML content to seed the doc.
//  * @param {object} [opts] - Optional { menuBar: { floating: boolean } } etc.
//  * @returns {EditorView}
//  */
// export function createEditor(mount, initialHTML, opts = {}) {
//   const el = typeof mount === "string" ? document.querySelector(mount) : mount;
//   if (!el) throw new Error(`createEditor: mount target not found: ${mount}`);

//   let doc;
//   if (initialHTML) {
//     const tmp = document.createElement("div");
//     tmp.innerHTML = initialHTML;
//     doc = ProseMirrorDOMParser.fromSchema(schema).parse(tmp);
//   }

//   const state = EditorState.create({
//     schema,
//     doc,
//     plugins: [
//       history(),
//       keymap({ "Mod-z": undo, "Mod-y": redo }),
//       keymap(baseKeymap),
//     ],
//     // plugins: exampleSetup({
//     //   schema,
//     // })
//   });

//   const view = new EditorView(el, {
//     state,
//     // dispatchTransaction(transaction) {
//     //   console.log("Document size went from", transaction.before.content.size, "to", transaction.doc.content.size);
//     //   let newState = view.state.apply(transaction);
//     //   view.updateState(newState);
//     // },
//   });

//   return view;
// }

// // For non-module consumers of the IIFE build, expose a global at runtime.
// if (typeof window !== "undefined") {
//   window.PMBundle = window.PMBundle || {};
//   window.PMBundle.createEditor = window.PMBundle.createEditor || createEditor;
// }
