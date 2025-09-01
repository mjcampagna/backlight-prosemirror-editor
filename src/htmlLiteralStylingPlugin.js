// htmlLiteralStylingPlugin.js
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * Heuristic: a paragraph (or heading if enabled) is "HTML-only" if its textContent
 * is whitespace + one or more HTML-ish tags/comments/doctypes, with nothing else.
 * Tweak the regex if you want to be stricter/looser.
 */
const HTML_ONLY_RE =
  /^(?:\s*(?:<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\?[\s\S]*?\?>|<\/?\w[\s\S]*?>)\s*)+$/i;

function isHtmlOnlyParagraph(node, schema) {
  return node.type === schema.nodes.paragraph && HTML_ONLY_RE.test(node.textContent);
}

export function htmlLiteralStylingPlugin(options = {}) {
  const className = options.className || "pm-html-literal";
  const includeHeadings = !!options.includeHeadings;

  function computeDecos(doc, schema) {
    const decos = [];
    doc.descendants((node, pos) => {
      if (!node.isTextblock) return;

      // Skip explicit code blocks
      if (schema.nodes.code_block && node.type === schema.nodes.code_block) return;

      if (isHtmlOnlyParagraph(node, schema)) {
        decos.push(Decoration.node(pos, pos + node.nodeSize, { class: className }));
        return;
      }

      if (includeHeadings && schema.nodes.heading && node.type === schema.nodes.heading) {
        if (HTML_ONLY_RE.test(node.textContent)) {
          decos.push(Decoration.node(pos, pos + node.nodeSize, { class: className }));
        }
      }
    });
    return DecorationSet.create(doc, decos);
  }

  return new Plugin({
    key: new PluginKey("html-literal-styling"),
    state: {
      init: (_, state) => computeDecos(state.doc, state.schema),
      apply(tr, oldDecos, _oldState, newState) {
        // Map existing decos, recompute on doc changes
        let decos = oldDecos.map(tr.mapping, tr.doc);
        if (tr.docChanged) {
          decos = computeDecos(newState.doc, newState.schema);
        }
        return decos;
      }
    },
    props: {
      decorations(state) {
        return this.getState(state);
      }
    }
  });
}

export default htmlLiteralStylingPlugin;
