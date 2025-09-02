// markdownSystem.js
import { Schema, Fragment } from "prosemirror-model";
import MarkdownIt from "markdown-it";
import {
  schema as baseSchema,
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  MarkdownParser,
  MarkdownSerializer
} from "prosemirror-markdown";
import { keymap } from "prosemirror-keymap";

/**
 * Extension shape:
 * {
 *   name: "strike",
 *   nodes?: { [name]: NodeSpec },
 *   marks?: { [name]: MarkSpec },
 *   md?: {
 *     configureMarkdownIt?: (md: MarkdownIt) => void,       // enable rules/plugins
 *     tokens?: Record<string, any>,                          // from-markdown token map additions
 *     toMarkdown?: { nodes?: object, marks?: object }        // serializer additions
 *   },
 *   keymap?: (schema) => Record<string, Command>,            // optional extra keybinds
 *   toolbarItems?: (schema, helpers) => Array<{dom, update, bindView}>
 * }
 */

function extendOrderedMap(om, additions = {}) {
  // baseSchema.spec.nodes/marks are OrderedMap with .addToEnd(name, spec)
  let out = om;
  for (const [name, spec] of Object.entries(additions)) {
    out = out.addToEnd(name, spec);
  }
  return out;
}

export function createMarkdownSystem(extensions = []) {
  // 1) Schema
  let nodes = baseSchema.spec.nodes;
  let marks = baseSchema.spec.marks;
  for (const ext of extensions) {
    if (ext.nodes) nodes = extendOrderedMap(nodes, ext.nodes);
    if (ext.marks) marks = extendOrderedMap(marks, ext.marks);
  }
  const schema = new Schema({ nodes, marks });

  // 2) Markdown-it + from-markdown tokens
  const md = new MarkdownIt("commonmark");
  
  // Disable HTML parsing to prevent html_block tokens
  md.disable(['html_block', 'html_inline']);
  
  for (const ext of extensions) ext.md?.configureMarkdownIt?.(md);

  // Most PM versions expose default tokens here:
  const baseTokens =
    defaultMarkdownParser.tokens ||
    // Fallback: if not present, you can pin prosemirror-markdown >= 1.10 or
    // explicitly pass a full token map. We keep empty as a last resort.
    {};

  const mergedTokens = { ...baseTokens };
  for (const ext of extensions) {
    if (ext.md?.tokens) Object.assign(mergedTokens, ext.md.tokens);
  }

  const mdParser = new MarkdownParser(schema, md, mergedTokens);

  // 3) To-markdown (serializer)
  const nodeSerializers = { ...defaultMarkdownSerializer.nodes };
  const markSerializers = { ...defaultMarkdownSerializer.marks };
  for (const ext of extensions) {
    if (ext.md?.toMarkdown?.nodes) Object.assign(nodeSerializers, ext.md.toMarkdown.nodes);
    if (ext.md?.toMarkdown?.marks) Object.assign(markSerializers, ext.md.toMarkdown.marks);
  }
  const mdSerializer = new MarkdownSerializer(nodeSerializers, markSerializers);

  // 4) Optional keymaps from extensions (you can add these to your plugin list)
  const keymapPlugins = [];
  for (const ext of extensions) {
    if (ext.keymap) keymapPlugins.push(keymap(ext.keymap(schema)));
  }

  // 5) Optional toolbar items aggregator (if you want to expose to your toolbar plugin)
  function collectToolbarItems(helpers) {
    // helpers: { makeBtn, isMarkActive, isBlockActive, run }
    return extensions.flatMap((ext) =>
      typeof ext.toolbarItems === "function" ? ext.toolbarItems(schema, helpers) : []
    );
  }

  return { schema, mdParser, mdSerializer, keymapPlugins, collectToolbarItems };
}
