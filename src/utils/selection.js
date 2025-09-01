import { TextSelection, Selection } from "prosemirror-state";

export function hasAncestorOfType($pos, nodeType) {
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type === nodeType) return true;
  return false;
}

export function hasAnyListAncestor($pos, schema) {
  const { bullet_list, ordered_list } = schema.nodes;
  for (let d = $pos.depth; d > 0; d--) {
    const t = $pos.node(d).type;
    if (t === bullet_list || t === ordered_list) return true;
  }
  return false;
}

export function reselectWindow(view, tracker, bias = 1) {
  if (!tracker || typeof tracker.from !== "number" || typeof tracker.to !== "number") return;

  const { doc } = view.state;
  const clamp = (n) => Math.max(0, Math.min(n, doc.content.size));
  let from = clamp(tracker.from);
  let to   = clamp(tracker.to);
  if (from > to) [from, to] = [to, from];

  const $from = doc.resolve(from);
  const $to   = doc.resolve(to);

  let sel =
    (TextSelection.between && TextSelection.between($from, $to, bias)) ||
    Selection.between($from, $to, bias) ||
    Selection.near($to, bias);

  view.dispatch(view.state.tr.setSelection(sel));
}

export function selectionAllInAncestorType(state, nodeType) {
  const { from, to } = state.selection;
  let all = true;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return;
    const $inner = state.doc.resolve(pos + 1);
    if (!hasAncestorOfType($inner, nodeType)) { all = false; return false; }
  });
  return all;
}

export function selectionHasAnyOutsideAncestor(state, nodeType) {
  const { from, to } = state.selection;
  let any = false;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return;
    const $inner = state.doc.resolve(pos + 1);
    if (!hasAncestorOfType($inner, nodeType)) { any = true; return false; }
  });
  return any;
}

export function selectionHasAnyNonListTextblock(state, schema) {
  const { from, to } = state.selection;
  let any = false;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return;
    const $inner = state.doc.resolve(pos + 1);
    if (!hasAnyListAncestor($inner, schema)) { any = true; return false; }
  });
  return any;
}

export function selectionIntersectsList(state) {
  const { bullet_list, ordered_list } = state.schema.nodes;
  const listTypes = new Set([bullet_list, ordered_list].filter(Boolean));
  let hit = false;
  const { from, to } = state.selection;
  state.doc.nodesBetween(from, to, (node) => {
    if (listTypes.has(node.type)) { hit = true; return false; }
  });
  return hit;
}

export function collectTypePositionsInRange(doc, from, to, nodeType) {
  const out = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.type === nodeType) out.push(pos);
  });
  return out;
}

export const isMarkActive = (state, type) => {
  if (!type) return false;
  const { from, $from, to, empty } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks());
  return state.doc.rangeHasMark(from, to, type);
};

export const isBlockActive = (state, type, attrs = null) => {
  if (!type) return false;
  const { from, to } = state.selection;
  let active = true;
  state.doc.nodesBetween(from, to, (node) => {
    if (node.isTextblock && !node.hasMarkup(type, attrs)) { active = false; return false; }
  });
  return active;
};
