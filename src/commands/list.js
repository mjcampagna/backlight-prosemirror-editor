import { TextSelection, NodeSelection } from "prosemirror-state";
import { setBlockType, wrapIn, lift } from "prosemirror-commands";
import { wrapInList, liftListItem, sinkListItem } from "prosemirror-schema-list";
import { dispatchAndMap, joinAdjacentNodes } from "../utils/window.js";
import { hasAnyListAncestor } from "../utils/selection.js";
import { dispatchSelectBlock } from "../utils/shared.js";

export function mergeListsAcrossWindow(view, listType, tracker) {
  const { schema } = view.state;
  const P = schema.nodes.paragraph;
  if (!listType) return;

  const clamp = (n) => Math.max(0, Math.min(n, view.state.doc.content.size));
  const padFrom = () => clamp(tracker.from - 5);
  const padTo   = () => clamp(tracker.to + 5);

  const joinPass = () => {
    joinAdjacentNodes(view, listType, padFrom(), padTo());
  };

  joinPass();

  for (;;) {
    let removedGap = false;

    view.state.doc.nodesBetween(padFrom(), padTo(), (node, pos) => {
      if (!node.isBlock || node.childCount < 3) return;
      let childPos = pos + 1;

      for (let i = 0; i <= node.childCount - 3; i++) {
        const a = node.child(i);
        const b = node.child(i + 1);
        const c = node.child(i + 2);

        const aStart = childPos;
        const aEnd   = aStart + a.nodeSize;
        const bStart = aEnd;
        const bEnd   = bStart + b.nodeSize;

        const bIsEmptyPara = P && b.type === P && b.content.size === 0;
        if (a.type === listType && bIsEmptyPara && c.type === listType) {
          const tr = view.state.tr.delete(bStart, bEnd).scrollIntoView();
          dispatchAndMap(view, tr, tracker);
          removedGap = true;
          return false;
        }

        childPos += a.nodeSize;
      }
    });

    if (!removedGap) break;
    joinPass();
  }
}

export function outdentAllListItemsInWindow(view, listItemType, tracker) {
  for (; ;) {
    let target = null;
    const { doc } = view.state;

    doc.nodesBetween(tracker.from, tracker.to, (node, pos) => {
      if (node.type === listItemType) { target = { pos, node }; return false; }
    });

    if (!target) break;

    const innerPos = target.pos + 2;
    const trSetSel = view.state.tr.setSelection(TextSelection.create(view.state.doc, innerPos));
    dispatchAndMap(view, trSetSel, tracker);

    let applied = null;
    const ok = liftListItem(listItemType)(view.state, (tr) => { applied = tr; dispatchAndMap(view, tr, tracker); }, view);

    if (!ok || !applied) {
      const skipTo = target.pos + target.node.nodeSize;
      tracker.from = Math.min(tracker.to, skipTo);
    }
  }
}

export function retargetListsInWindow(view, win, targetListType) {
  const { state } = view;
  let tr = state.tr;
  state.doc.nodesBetween(win.from, win.to, (node, pos) => {
    const nm = node.type.name;
    if ((nm === "bullet_list" || nm === "ordered_list") && node.type !== targetListType) {
      tr.setNodeMarkup(pos, targetListType, node.attrs, node.marks);
    }
  });
  if (tr.steps.length) dispatchAndMap(view, tr.scrollIntoView(), win);
}

export function wrapAllNonListBlocksInWindow(view, targetListType, win) {
  const { paragraph } = view.state.schema.nodes;

  for (; ;) {
    const { state } = view;
    let target = null;

    state.doc.nodesBetween(win.from, win.to, (node, pos) => {
      if (!node.isTextblock) return;
      const $inner = state.doc.resolve(pos + 1);
      if (hasAnyListAncestor($inner, state.schema)) return;
      target = { pos, node };
      return false;
    });

    if (!target) break;

    dispatchSelectBlock(view, target.pos, target.node, win);

    if (paragraph && target.node.type !== paragraph) {
      let normalized = false;
      setBlockType(paragraph)(view.state, (tr) => {
        normalized = true;
        dispatchAndMap(view, tr, win);
      }, view);
      if (!normalized) {
        win.from = Math.min(win.to, win.from + 1);
        continue;
      }
    }

    wrapInList(targetListType)(view.state, (tr) => dispatchAndMap(view, tr, win), view);
  }
}



export function liftListItemsAcrossSelection(view, listItemType, win) {
  let did = false;
  for (; ;) {
    let applied = null;
    const ok = liftListItem(listItemType)(view.state, (tr) => { applied = tr; dispatchAndMap(view, tr, win); }, view);
    if (!ok) break;
    did = true;
  }
  return did;
}
