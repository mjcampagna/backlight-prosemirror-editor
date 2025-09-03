// patternNodeStylingPlugin.js
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { createSafeRegexTester, TABLE_ROW_PATTERN, validateTableStructure } from "./utils/patternUtils.js";

/**
 * A configurable utility for detecting nodes based on text patterns and applying CSS classes.
 * 
 * @param {Object} options - Configuration options
 * @param {RegExp} options.pattern - The regex pattern to match against node text content
 * @param {string} options.className - The CSS class to apply to matching nodes
 * @param {string} [options.pluginKey] - Optional unique key for the plugin instance
 * @param {string[]} [options.nodeTypes] - Node types to check (defaults to ['paragraph'])
 * @param {string[]} [options.excludeTypes] - Node types to exclude from checking (defaults to ['code_block'])
 * 
 * @returns {Plugin} ProseMirror plugin instance
 */
export function createPatternNodeStylingPlugin(options = {}) {
  const {
    pattern,
    className,
    pluginKey = "pattern-node-styling",
    nodeTypes = ["paragraph"],
    excludeTypes = ["code_block"]
  } = options;

  if (!pattern || !className) {
    throw new Error("Both 'pattern' and 'className' options are required");
  }

  // Create safe regex tester to avoid lastIndex mutations
  const safePatternTest = createSafeRegexTester(pattern);

  function matchesPattern(node) {
    // Check if this node type should be processed
    const nodeTypeName = node.type.name;
    if (nodeTypes.length > 0 && !nodeTypes.includes(nodeTypeName)) {
      return false;
    }

    // Skip excluded node types
    if (excludeTypes.includes(nodeTypeName)) {
      return false;
    }

    // Test the pattern against the node's text content using safe tester
    return safePatternTest(node.textContent);
  }

  function computeDecorations(doc) {
    const decorations = [];
    
    doc.descendants((node, pos) => {
      if (!node.isTextblock) return;

      if (matchesPattern(node)) {
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, { class: className })
        );
      }
    });
    
    return DecorationSet.create(doc, decorations);
  }

  return new Plugin({
    key: new PluginKey(pluginKey),
    state: {
      init: (_, state) => computeDecorations(state.doc),
      apply(tr, oldDecorations, _oldState, newState) {
        // Map existing decorations, recompute on document changes
        let decorations = oldDecorations.map(tr.mapping, tr.doc);
        if (tr.docChanged) {
          decorations = computeDecorations(newState.doc);
        }
        return decorations;
      }
    },
    props: {
      decorations(state) {
        return this.getState(state);
      }
    }
  });
}

// Simple table validation and styling plugin  
export function createTableRowStylingPlugin(options = {}) {
  const {
    pluginKey = "table-styling"
  } = options;

  function computeDecorations(doc) {
    const decorations = [];
    
    doc.descendants((node, pos) => {
      if (!node.isTextblock) return;
      
      // Check if this looks like table content
      const text = node.textContent;
      if (!text || !text.includes('|') || !text.trim().startsWith('|')) {
        return;
      }
      
      // Validate the table structure and get appropriate class
      const validation = validateTableStructure(text);
      
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, { 
          class: validation.cssClass 
        })
      );
    });
    
    return DecorationSet.create(doc, decorations);
  }

  return new Plugin({
    key: new PluginKey(pluginKey),
    state: {
      init: (_, state) => computeDecorations(state.doc),
      apply(tr, oldDecorations, _oldState, newState) {
        let decorations = oldDecorations.map(tr.mapping, tr.doc);
        if (tr.docChanged) {
          decorations = computeDecorations(newState.doc);
        }
        return decorations;
      }
    },
    props: {
      decorations(state) {
        return this.getState(state);
      }
    }
  });
}

export default createPatternNodeStylingPlugin;
