import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { createMarkdownSystem } from "./markdownSystem.js";
import { enhancedLinkExtension } from "./extensions/enhancedLink.js";
import { tableRowSplittingExtension } from "./extensions/tableRowSplitting.js";

import buildMarkdownPlugins from "./markdownToolbarPlugin.js";
import htmlLiteralStylingPlugin from "./htmlLiteralStylingPlugin.js";
import { createTableRowStylingPlugin } from "./patternNodeStylingPlugin.js";
import { createTableRowTextProcessingPlugin } from "./patternTextProcessingPlugin.js";
import { presets } from "./plugins/textProcessing.js";

// --- Constants ---
const CSS_CLASSES = {
  EDITOR_CONTAINER: 'pm-editor-container',
  PROSEMIRROR_CONTENT: '.ProseMirror',
  TOOLBAR: '.pm-toolbar',
  TOGGLE_BUTTON: 'toggle-editor-mode-button'
};

const MODES = {
  MARKDOWN: 'markdown',
  PROSEMIRROR: 'prosemirror'
};

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

// --- Utility Functions ---
function safeSerialize(serializer, doc) {
  try {
    return serializer.serialize(doc);
  } catch (err) {
    console.error('Failed to serialize PM doc, falling back to plain text', err);
    return doc.textContent || '';
  }
}

function getOuterHeight(node) {
  const rect = node?.getBoundingClientRect();
  return rect ? rect.height : 0;
}

function preserveHeight(wrapper, callback) {
  const prevHeight = getOuterHeight(wrapper);
  if (prevHeight > 0) {
    wrapper.style.height = `${prevHeight}px`;
  }
  callback();
  requestAnimationFrame(() => {
    wrapper.style.height = '';
  });
}

// --- Base View Class ---
class BaseView {
  static isActive(el) { return ACTIVE.get(el)?.mode === this.MODE; }
  static activeMode(el) { return ACTIVE.get(el)?.mode ?? null; }
  static activeInstance(el) { return ACTIVE.get(el)?.instance ?? null; }

  constructor(target) {
    this.root = target;
    this._destroyed = false;
    markActive(this.root, this.constructor.MODE, this);
  }

  get mode() { return this.constructor.MODE; }
  
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    unmarkActive(this.root, this);
  }
}

class MarkdownView extends BaseView {
  static MODE = MODES.MARKDOWN;

  constructor(target, content = "") {
    super(target);

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
  }

  get content() { return this.textarea.value; }
  focus() { this.textarea.focus(); }
  
  destroy() {
    if (this._destroyed) return;
    if (this._ownsTextarea) this.textarea.remove();
    super.destroy();
  }
}

class ProseMirrorView extends BaseView {
  static MODE = MODES.PROSEMIRROR;

  constructor(target, content = "") {
    super(target);

    let mountEl;
    let initialMarkdown;

    if (isTextarea(target)) {
      // Use the textarea as the mirror (field submitted to PHP)
      this.mirror = target;
      initialMarkdown = content != null && content !== "" ? content : (target.value ?? "");

      // Create a mount container for the editor and hide textarea
      this._createdMount = document.createElement("div");
      this._createdMount.className = CSS_CLASSES.EDITOR_CONTAINER;
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

    // Create markdown system with extensions and text processing
    const markdownSystem = createMarkdownSystem([enhancedLinkExtension, tableRowSplittingExtension], {
      textProcessing: createTableRowTextProcessingPlugin() // Enable pattern-based text processing
    });
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
          createTableRowStylingPlugin({ 
            serializer: mdSerializer
          }),
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

    // markActive called by super()
  }

  // Serialize editor → textarea (throttled with rAF)
  _syncToMirror(force = false) {
    if (!this.mirror) return;
    const run = () => {
      this._syncScheduled = false;
      const md = safeSerialize(this.mdSerializer, this.view.state.doc);
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
    return safeSerialize(this.mdSerializer, this.view.state.doc);
  }
  
  focus() { this.view.focus(); }
  
  destroy() {
    if (this._destroyed) return;
    
    // Cancel scheduled work
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this._syncScheduled = false;
    
    // Clean up form listener
    if (this.form && this._onSubmit) {
      this.form.removeEventListener("submit", this._onSubmit);
      this._onSubmit = null;
    }
    
    // Clean up editor
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }

    // Clean up DOM
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
      this.mirror = null;
    }

    super.destroy();
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

// View factory
function createView(mode, target, content) {
  return mode === MODES.MARKDOWN 
    ? new MarkdownView(target, content)
    : new ProseMirrorView(target, content);
}

// Mode detection from data attributes
function detectModeFromElement(element) {
  // Check various data attributes for mode specification
  const dataEditor = element.getAttribute('data-editor');
  const dataEditorMode = element.getAttribute('data-editor-mode');
  
  // Validate mode values
  const isValidMode = (mode) => mode === MODES.MARKDOWN || mode === MODES.PROSEMIRROR;
  
  if (isValidMode(dataEditor)) return dataEditor;
  if (isValidMode(dataEditorMode)) return dataEditorMode;
  
  // Default to prosemirror mode
  return MODES.PROSEMIRROR;
}

// Wire a single element + button  
function wireEditorToggle(element, initialMode = MODES.PROSEMIRROR) {

  let btn = element.parentElement?.querySelector("button");
  if (!btn) {
    // Create toggle button wrapper and button
    const btnWrapper = document.createElement("div");
    btnWrapper.className = "pm-editor-controls";
    
    btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Editor mode");
    btn.className = CSS_CLASSES.TOGGLE_BUTTON;
    
    btnWrapper.appendChild(btn);
    element.parentElement.insertBefore(btnWrapper, element);
  }

  // Use the provided initial mode
  // Create initial view
  let view = createView(initialMode, element, element.value || "");

  // Keep button label in sync with current mode
  function updateButton() {
    btn.textContent = labelFor(view.mode);
    btn.setAttribute("data-editor-mode", view.mode);
    btn.setAttribute("aria-pressed", view.mode === MODES.MARKDOWN ? "true" : "false");
  }

  // Switch function used by the button (and available for you to call)
  function switchTo(nextMode) {
    if (nextMode === view.mode) return;

    const content = view.content;
    
    // Simple height preservation - measure current editor
    let currentHeight = 0;
    if (view.mode === MODES.PROSEMIRROR && view.view?.dom) {
      currentHeight = view.view.dom.offsetHeight;
    } else if (view.mode === MODES.MARKDOWN && view.textarea) {
      currentHeight = view.textarea.offsetHeight;
    }

    view.destroy();
    view = createView(nextMode, element, content);

    // Apply preserved height to new editor
    if (currentHeight > 0) {
      if (nextMode === MODES.MARKDOWN && view.textarea) {
        view.textarea.style.height = `${currentHeight}px`;
      } else if (nextMode === MODES.PROSEMIRROR && view.view?.dom) {
        view.view.dom.style.height = `${currentHeight}px`;
      }
    }

    updateButton();
    view.focus();
  }

  // Initial label
  updateButton();

  // Toggle on click
  btn.addEventListener("click", () => {
    const nextMode = view.mode === MODES.MARKDOWN ? MODES.PROSEMIRROR : MODES.MARKDOWN;
    switchTo(nextMode);
  });

  // Optional: expose a tiny API for programmatic control
  element._editorAPI = {
    get mode() { return view.mode; },
    get view() { return view; },
    toggle() { 
      const nextMode = view.mode === MODES.MARKDOWN ? MODES.PROSEMIRROR : MODES.MARKDOWN;
      switchTo(nextMode);
    },
    switchTo,
    refreshButton: updateButton
  };
}

// Configurable initialization function
export function initProseMirrorEditor(selector = "textarea[data-editor-mode]") {
  document
    .querySelectorAll(selector)
    .forEach((element) => {
      // Ensure element is a textarea
      if (!isTextarea(element)) {
        alert(`Error: initProseMirrorEditor requires textarea elements. Found: ${element.tagName.toLowerCase()}`);
        return;
      }
      
      // Detect mode from data attributes
      const initialMode = detectModeFromElement(element);
      wireEditorToggle(element, initialMode);
    });
}

// Export additional utilities for advanced usage
export { createMarkdownSystem } from "./markdownSystem.js";
export { buildMarkdownPlugins } from "./markdownToolbarPlugin.js";

// Export height utilities for testing
export { getOuterHeight, preserveHeight, safeSerialize };


