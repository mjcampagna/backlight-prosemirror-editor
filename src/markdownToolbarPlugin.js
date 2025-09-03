import { Plugin } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark, setBlockType } from "prosemirror-commands";
import { history, undo, redo } from "prosemirror-history";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { sinkListItem, liftListItem, splitListItem } from "prosemirror-schema-list";

import { isMarkActive, isBlockActive, selectionAllInAncestorType } from "./utils/selection.js";
import { makeBtn, makeSelect } from "./ui/builders.js";
import { applyListUnified, applyBlockquoteUnified, applyCodeBlockUnified, applyCodeBlockUnifiedSingle, outdentCommand } from "./commands/unified.js";
import { hasLink, createLinkCommand, removeLink } from "./commands/links.js";

export function createMarkdownKeymap(schema) {
  const bind = {};
  if (schema.marks.strong) bind["Mod-b"] = toggleMark(schema.marks.strong);
  if (schema.marks.em) bind["Mod-i"] = toggleMark(schema.marks.em);
  if (schema.marks.code) bind["Mod-`"] = toggleMark(schema.marks.code);
  if (schema.marks.link) bind["Mod-k"] = createLinkCommand();

  if (schema.nodes.paragraph) bind["Shift-Ctrl-0"] = setBlockType(schema.nodes.paragraph);
  if (schema.nodes.heading) {
    bind["Shift-Ctrl-1"] = setBlockType(schema.nodes.heading, { level: 1 });
    bind["Shift-Ctrl-2"] = setBlockType(schema.nodes.heading, { level: 2 });
    bind["Shift-Ctrl-3"] = setBlockType(schema.nodes.heading, { level: 3 });
    bind["Shift-Ctrl-4"] = setBlockType(schema.nodes.heading, { level: 4 });
    bind["Shift-Ctrl-5"] = setBlockType(schema.nodes.heading, { level: 5 });
    bind["Shift-Ctrl-6"] = setBlockType(schema.nodes.heading, { level: 6 });
  }

  if (schema.nodes.blockquote) bind["Shift-Ctrl-b"] = applyBlockquoteUnified(schema.nodes.blockquote);

  if (schema.nodes.code_block && schema.nodes.paragraph) {
    bind["Shift-Ctrl-\\"] = applyCodeBlockUnified(
      schema.nodes.code_block,
      schema.nodes.paragraph,
      schema.nodes.list_item || null
    );
  }

  if (schema.nodes.list_item) {
    const { bullet_list, ordered_list, list_item } = schema.nodes;
    if (bullet_list) bind["Shift-Ctrl-8"] = applyListUnified(bullet_list, list_item);
    if (ordered_list) bind["Shift-Ctrl-7"] = applyListUnified(ordered_list, list_item);
    bind["Tab"] = sinkListItem(list_item);
    bind["Shift-Tab"] = liftListItem(list_item);
    bind["Enter"] = splitListItem(list_item);
  }

  if (schema.nodes.hard_break) {
    bind["Shift-Enter"] = (state, dispatch) => {
      if (dispatch) dispatch(state.tr.replaceSelectionWith(state.schema.nodes.hard_break.create()).scrollIntoView());
      return true;
    };
  }

  bind["Mod-z"] = undo;
  bind["Shift-Mod-z"] = redo;
  bind["Mod-y"] = redo;

  return keymap(bind);
}

export function markdownToolbarPlugin(options = {}) {
  const { codeJoinMode = "smart" } = options;

  return new Plugin({
    view(editorView) {
      const toolbar = document.createElement("div");
      toolbar.className = "pm-toolbar";

      const items = [];
      const { schema } = editorView.state;
      const run = (cmd) => (view) => cmd(view.state, view.dispatch, view);
      const can = (cmd) => (state) => cmd(state);

      if (schema.marks.strong) items.push(makeBtn({
        label: "B", title: "Bold (Mod-B)",
        run: run(toggleMark(schema.marks.strong)),
        isActive: (s) => isMarkActive(s, schema.marks.strong),
        isEnabled: can(toggleMark(schema.marks.strong))
      }));
      if (schema.marks.em) items.push(makeBtn({
        label: "I", title: "Italic (Mod-I)",
        run: run(toggleMark(schema.marks.em)),
        isActive: (s) => isMarkActive(s, schema.marks.em),
        isEnabled: can(toggleMark(schema.marks.em))
      }));
      if (schema.marks.code) items.push(makeBtn({
        label: "{;}", title: "Inline code (Mod-`)",
        run: run(toggleMark(schema.marks.code)),
        isActive: (s) => isMarkActive(s, schema.marks.code),
        isEnabled: can(toggleMark(schema.marks.code))
      }));
      if (schema.marks.link) items.push(makeBtn({
        label: "Link", title: "Link (Mod-K)",
        run: (view) => createLinkCommand()(view.state, view.dispatch, view),
        isActive: (s) => hasLink(s),
        isEnabled: () => true
      }));

      if (schema.nodes.paragraph && schema.nodes.heading) {
        const p = schema.nodes.paragraph, h = schema.nodes.heading;
        items.push(makeSelect({
          options: [["p", "Paragraph"], ["h1", "H1"], ["h2", "H2"], ["h3", "H3"], ["h4", "H4"], ["h5", "H5"], ["h6", "H6"]],
          compute: (s) => {
            if (isBlockActive(s, h, { level: 1 })) return "h1";
            if (isBlockActive(s, h, { level: 2 })) return "h2";
            if (isBlockActive(s, h, { level: 3 })) return "h3";
            if (isBlockActive(s, h, { level: 4 })) return "h4";
            if (isBlockActive(s, h, { level: 5 })) return "h5";
            if (isBlockActive(s, h, { level: 6 })) return "h6";
            return "p";
          },
          apply: (view, v) => {
            if (v === "p") {
              setBlockType(p)(view.state, view.dispatch, view);
            } else {
              const level = parseInt(v.substring(1)); // Extract number from "h1", "h2", etc.
              setBlockType(h, { level })(view.state, view.dispatch, view);
            }
          },
          isEnabled: (s) => {
            const { list_item, paragraph } = s.schema.nodes;
            if (!list_item || !paragraph) return true;
            let hit = false;
            const { from, to } = s.selection;
            s.doc.nodesBetween(from, to, (node, pos) => {
              if (node.type === list_item && node.firstChild && node.firstChild.type === paragraph) {
                const firstStart = pos + 1;
                const firstEnd = firstStart + node.firstChild.nodeSize;
                if (firstEnd > from && firstStart < to) { hit = true; return false; }
              }
            });
            return !hit;
          }
        }));
      }

      if (schema.nodes.list_item) {
        const { bullet_list, ordered_list, list_item } = schema.nodes;
        if (ordered_list) items.push(makeBtn({
          label: "ol", title: "Numbered list (Shift-Ctrl-7)",
          run: run(applyListUnified(ordered_list, list_item)),
          isActive: (s) => {
            // Don't activate if HR is in selection
            const { from, to } = s.selection;
            let hasHR = false;
            s.doc.nodesBetween(from, to, (node) => {
              if (node.type.name === 'horizontal_rule') { hasHR = true; return false; }
            });
            return !hasHR && selectionAllInAncestorType(s, ordered_list);
          },
          isEnabled: () => true
        }));
        if (bullet_list) items.push(makeBtn({
          label: "ul", title: "Bulleted list (Shift-Ctrl-8)",
          run: run(applyListUnified(bullet_list, list_item)),
          isActive: (s) => {
            // Don't activate if HR is in selection
            const { from, to } = s.selection;
            let hasHR = false;
            s.doc.nodesBetween(from, to, (node) => {
              if (node.type.name === 'horizontal_rule') { hasHR = true; return false; }
            });
            return !hasHR && selectionAllInAncestorType(s, bullet_list);
          },
          isEnabled: () => true
        }));
        items.push(
          makeBtn({ label: "→", title: "Indent (Tab)", run: run(sinkListItem(list_item)), isEnabled: (s) => sinkListItem(list_item)(s) }),
          makeBtn({
            label: "←",
            title: "Outdent (Shift-Tab)",
            run: run(outdentCommand(list_item)),
            isEnabled: (s) => {
              let has = false;
              s.doc.nodesBetween(s.selection.from, s.selection.to, (n) => { if (n.type === s.schema.nodes.list_item) { has = true; return false; } });
              return has;
            }
          })
        );
      }

      if (schema.nodes.blockquote) {
        const cmd = applyBlockquoteUnified(schema.nodes.blockquote);
        items.push(makeBtn({
          label: "❝ ❞", title: "Blockquote (Shift-Ctrl-B)",
          run: run(cmd),
          isActive: (s) => {
            // Don't activate if HR is in selection
            const { from, to } = s.selection;
            let hasHR = false;
            s.doc.nodesBetween(from, to, (node) => {
              if (node.type.name === 'horizontal_rule') { hasHR = true; return false; }
            });
            return !hasHR && selectionAllInAncestorType(s, schema.nodes.blockquote);
          },
          isEnabled: () => true
        }));
      }

      if (schema.nodes.code_block && schema.nodes.paragraph) {
        const cmdMulti = applyCodeBlockUnified(
          schema.nodes.code_block,
          schema.nodes.paragraph,
          schema.nodes.list_item || null,
          codeJoinMode
        );
        const cmdSingle = applyCodeBlockUnifiedSingle(schema.nodes.code_block);

        items.push(
          makeBtn({
            label: "</>",
            title: "Code block (Shift-Ctrl-\\)",
            run: run(cmdMulti),
            isActive: (s) => isBlockActive(s, schema.nodes.code_block),
          }),
          makeBtn({
            label: "<*>",
            title: "Flatten to one code block",
            run: run(cmdSingle),
          })
        );
      }

      if (schema.nodes.horizontal_rule) {
        items.push(makeBtn({
          label: "—",
          title: "Horizontal rule",
          run: (view) => {
            const { state, dispatch } = view;
            const { selection } = state;
            
            // Insert horizontal rule at current position
            const hrNode = schema.nodes.horizontal_rule.create();
            const tr = state.tr.replaceSelectionWith(hrNode);
            dispatch(tr);
          },
          isEnabled: (state) => {
            const { selection } = state;
            const { $from } = selection;
            
            // Only enable when at start of an empty paragraph
            return $from.parent.type === state.schema.nodes.paragraph && 
                   $from.parent.content.size === 0 &&
                   $from.parentOffset === 0;
          },
          isActive: () => false // HR doesn't have an "active" state
        }));
      }

      const parent = editorView.dom.parentNode;
      if (parent) parent.insertBefore(toolbar, editorView.dom);
      for (const it of items) { it.bindView?.(editorView); toolbar.appendChild(it.dom); }

      const updateUI = () => { const st = editorView.state; for (const it of items) it.update?.(st); };
      updateUI();

      return { update() { updateUI(); }, destroy() { toolbar.remove(); } };
    }
  });
}

export function buildMarkdownPlugins(schema, options = {}) {
  return [
    markdownToolbarPlugin(options),
    history(),
    createMarkdownKeymap(schema),
    keymap(baseKeymap),
    dropCursor(),
    gapCursor()
  ];
}

export default buildMarkdownPlugins;
