import { TextSelection, NodeSelection } from "prosemirror-state";
import { setBlockType, wrapIn, lift } from "prosemirror-commands";
import { dispatchAndMap, joinAdjacentNodes } from "../utils/window.js";
import { hasAncestorOfType, isBlockActive } from "../utils/selection.js";
import { dispatchSelectBlock } from "../utils/shared.js";

export function wrapAllBlocksNotInAncestorWindow(view, nodeType, win) {
  for (; ;) {
    const { state } = view;
    let target = null;
    state.doc.nodesBetween(win.from, win.to, (node, pos) => {
      if (!node.isTextblock) return;
      const $inner = state.doc.resolve(pos + 1);
      if (hasAncestorOfType($inner, nodeType)) return;
      target = { pos, node };
      return false;
    });
    if (!target) break;
    dispatchSelectBlock(view, target.pos, target.node, win);
    wrapIn(nodeType)(view.state, (tr) => dispatchAndMap(view, tr, win), view);
  }
}

export function wrapListsInBlockquoteAcrossWindow(view, blockquoteType, tracker, opts = {}) {
  const { bullet_list, ordered_list } = view.state.schema.nodes;
  if (!blockquoteType || (!bullet_list && !ordered_list)) return false;

  const listTypes = new Set([bullet_list, ordered_list].filter(Boolean));
  const skipAlreadyWrapped = opts.skipIfAlreadyWrapped ?? true;
  const maxLoops = opts.maxLoops ?? 500;

  let did = false;
  let loops = 0;

  for (; ;) {
    if (++loops > maxLoops) {
      console.warn("Safety break: excessive blockquote wraps");
      break;
    }

    let target = null;
    const { doc } = view.state;
    doc.nodesBetween(tracker.from, tracker.to, (node, pos) => {
      if (!listTypes.has(node.type)) return;
      if (skipAlreadyWrapped) {
        const $inner = doc.resolve(pos + 1);
        if (hasAncestorOfType($inner, blockquoteType)) return;
      }
      target = { pos };
      return false;
    });

    if (!target) break;

    const $pos = view.state.doc.resolve(target.pos);
    dispatchAndMap(view, view.state.tr.setSelection(new NodeSelection($pos)), tracker);

    let applied = null;
    wrapIn(blockquoteType)(
      view.state,
      (tr) => { applied = tr; dispatchAndMap(view, tr, tracker); },
      view
    );

    if (!applied) break;
    did = true;
  }

  return did;
}

export function convertTextblocksInSelectionWindow(view, targetType, attrs, win) {
  for (; ;) {
    const { state } = view;
    let target = null;
    state.doc.nodesBetween(win.from, win.to, (node, pos) => {
      if (!node.isTextblock) return;
      if (node.type === targetType && (!attrs || JSON.stringify(node.attrs) === JSON.stringify(attrs))) return;
      target = { pos, node };
      return false;
    });
    if (!target) break;
    dispatchSelectBlock(view, target.pos, target.node, win);
    let applied = null;
    setBlockType(targetType, attrs)(view.state, (tr) => { applied = tr; dispatchAndMap(view, tr, win); }, view);
    if (!applied) break;
  }
}

export function liftAcrossSelection(view, win) {
  let did = false;
  for (; ;) {
    let applied = null;
    const ok = lift(view.state, (tr) => { applied = tr; dispatchAndMap(view, tr, win); }, view);
    if (!ok) break;
    did = true;
  }
  return did;
}
