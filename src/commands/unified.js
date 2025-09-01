import { selectionHasAnyNonListTextblock, selectionAllInAncestorType, selectionHasAnyOutsideAncestor, selectionIntersectsList, collectTypePositionsInRange, isBlockActive, reselectWindow } from "../utils/selection.js";
import { dispatchAndMap, joinAdjacentNodes } from "../utils/window.js";
import { mergeListsAcrossWindow, outdentAllListItemsInWindow, retargetListsInWindow, wrapAllNonListBlocksInWindow, liftListItemsAcrossSelection } from "./list.js";
import { wrapAllBlocksNotInAncestorWindow, wrapListsInBlockquoteAcrossWindow, convertTextblocksInSelectionWindow, liftAcrossSelection } from "./block.js";

export function outdentCommand(listItemType) {
  return (state, dispatch, view) => {
    if (!view) return false;
    const tracker = { from: state.selection.from, to: state.selection.to };
    outdentAllListItemsInWindow(view, listItemType, tracker);
    reselectWindow(view, tracker);
    return true;
  };
}

export function applyListUnified(targetListType, listItemType) {
  return (state, dispatch, view) => {
    if (!view) return false;
    const schema = state.schema;
    const win = { from: state.selection.from, to: state.selection.to };

    if (selectionHasAnyNonListTextblock(state, schema)) {
      retargetListsInWindow(view, win, targetListType);
      wrapAllNonListBlocksInWindow(view, targetListType, win);
      mergeListsAcrossWindow(view, targetListType, win);
      reselectWindow(view, win);
      return true;
    }

    if (!selectionAllInAncestorType(state, targetListType)) {
      retargetListsInWindow(view, win, targetListType);
      mergeListsAcrossWindow(view, targetListType, win);
      reselectWindow(view, win);
      return true;
    }

    outdentAllListItemsInWindow(view, listItemType, win);
    reselectWindow(view, win);
    return true;
  };
}

export function applyBlockquoteUnified(blockquoteType) {
  return (state, dispatch, view) => {
    if (!view) return false;

    if (selectionHasAnyOutsideAncestor(state, blockquoteType)) {
      const win = { from: state.selection.from, to: state.selection.to };

      if (selectionIntersectsList(state)) {
        wrapListsInBlockquoteAcrossWindow(view, blockquoteType, win);
      }

      wrapAllBlocksNotInAncestorWindow(view, blockquoteType, win);

      const s2 = view.state;
      joinAdjacentNodes(
        view,
        blockquoteType,
        Math.max(0, win.from - 10),
        Math.min(s2.doc.content.size, win.to + 10)
      );
      reselectWindow(view, win);
      return true;
    }
    return liftAcrossSelection(view);
  };
}

export function applyCodeBlockUnified(codeBlockType, paragraphType, listItemType, joinMode = "smart") {
  return (state, dispatch, view) => {
    if (!view) return false;

    if (isBlockActive(state, codeBlockType)) {
      const trackerOff = { from: state.selection.from, to: state.selection.to };
      convertTextblocksInSelectionWindow(view, paragraphType, null, trackerOff);
      return true;
    }

    const tracker = {
      from: state.selection.from,
      to: state.selection.to,
      markers: joinMode === "smart"
        ? collectTypePositionsInRange(state.doc, state.selection.from, state.selection.to, codeBlockType)
        : []
    };

    if (selectionIntersectsList(state) && listItemType) {
      liftListItemsAcrossSelection(view, listItemType, tracker);
    }

    convertTextblocksInSelectionWindow(view, codeBlockType, null, tracker);

    const docSize = view.state.doc.content.size;
    if (joinMode === "always") {
      joinAdjacentNodes(view, codeBlockType,
        Math.max(0, tracker.from - 10),
        Math.min(docSize, tracker.to + 10)
      );
    } else if (joinMode === "smart" && tracker.markers.length) {
      for (const p of tracker.markers) {
        const from = Math.max(0, p - 2);
        const to = Math.min(docSize, p + 2);
        joinAdjacentNodes(view, codeBlockType, from, to);
      }
    }

    reselectWindow(view, tracker);
    return true;
  };
}

export function applyCodeBlockUnifiedSingle(codeBlockType) {
  return (state, dispatch, view) => {
    if (!view) return false;
    if (isBlockActive(state, codeBlockType)) return true;

    const { from, to } = state.selection;
    const raw = state.doc.textBetween(from, to, "\n", "\n");
    const hasText = !!raw && raw.length > 0;
    const textNode = hasText ? state.schema.text(raw) : null;

    let node = codeBlockType.createAndFill(null, textNode || undefined);
    if (!node) node = codeBlockType.create(null, textNode || undefined);

    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(node, false).scrollIntoView());
    }
    return true;
  };
}
