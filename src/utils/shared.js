import { TextSelection } from "prosemirror-state";
import { dispatchAndMap } from "./window.js";

export function dispatchSelectBlock(view, pos, node, win) {
  const sel = TextSelection.create(view.state.doc, pos + 1, pos + node.nodeSize - 1);
  dispatchAndMap(view, view.state.tr.setSelection(sel), win);
}
