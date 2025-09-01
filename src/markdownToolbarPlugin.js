import { Plugin, TextSelection, NodeSelection, Selection } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark, setBlockType, wrapIn, lift } from "prosemirror-commands";
import { history, undo, redo } from "prosemirror-history";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { wrapInList, liftListItem, sinkListItem, splitListItem } from "prosemirror-schema-list";
import { canJoin } from "prosemirror-transform";

/* ─────────────────────── Debug helpers (optional) ─────────────────────── */

const PM_DEBUG = () => typeof window !== "undefined" && !!window.__PM_DEBUG;

function snapshotTracker(tracker) {
  if (!tracker) return null;
  return {
    from: typeof tracker.from === "number" ? tracker.from : null,
    to: typeof tracker.to === "number" ? tracker.to : null,
    markers: Array.isArray(tracker.markers) ? tracker.markers.slice() : null
  };
}

function debugGroup(label, fn) {
  if (!PM_DEBUG()) return fn();
  console.groupCollapsed(label);
  try { return fn(); } finally { console.groupEnd(); }
}

function debugLogDispatch(view, tr, beforeTracker, afterTracker) {
  if (!PM_DEBUG()) return;

  const stepNames = tr.steps.map(s => (s?.constructor?.name) || "Step");
  const beforeSel = view.state.selection; // this is the *old* selection (pre-dispatch), because we haven't dispatched yet

  console.log({
    steps: stepNames,
    selectionBefore: { from: beforeSel.from, to: beforeSel.to },
    trackerBefore: beforeTracker,
    trackerAfter: afterTracker,
  });

  // small extra: show current selection after dispatch
  const sel = view.state.selection;
  console.log("selectionAfter", { from: sel.from, to: sel.to });
}

/* ─────────────────────── Selection / ancestry helpers ─────────────────────── */

function hasAncestorOfType($pos, nodeType) {
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type === nodeType) return true;
  return false;
}
function hasAnyListAncestor($pos, schema) {
  const { bullet_list, ordered_list } = schema.nodes;
  for (let d = $pos.depth; d > 0; d--) {
    const t = $pos.node(d).type;
    if (t === bullet_list || t === ordered_list) return true;
  }
  return false;
}

/* Restore selection to the (remapped) window safely.
   Prefers a TextSelection; falls back to a valid Selection near the range. */
function reselectWindow(view, tracker, bias = 1) {
  if (!tracker || typeof tracker.from !== "number" || typeof tracker.to !== "number") return;

  const { doc } = view.state;
  const clamp = (n) => Math.max(0, Math.min(n, doc.content.size));
  let from = clamp(tracker.from);
  let to   = clamp(tracker.to);
  if (from > to) [from, to] = [to, from];

  // Resolve raw positions (they might be at block boundaries)
  const $from = doc.resolve(from);
  const $to   = doc.resolve(to);

  // Try to make a TextSelection spanning the window
  let sel =
    (TextSelection.between && TextSelection.between($from, $to, bias)) ||
    Selection.between($from, $to, bias) ||                       // falls back to NodeSelection if needed
    Selection.near($to, bias);                                   // last-resort caret near end

  view.dispatch(view.state.tr.setSelection(sel));
}


function selectionAllInAncestorType(state, nodeType) {
  const { from, to } = state.selection;
  let all = true;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return;
    const $inner = state.doc.resolve(pos + 1);
    if (!hasAncestorOfType($inner, nodeType)) { all = false; return false; }
  });
  return all;
}
function selectionHasAnyOutsideAncestor(state, nodeType) {
  const { from, to } = state.selection;
  let any = false;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return;
    const $inner = state.doc.resolve(pos + 1);
    if (!hasAncestorOfType($inner, nodeType)) { any = true; return false; }
  });
  return any;
}
function selectionHasAnyNonListTextblock(state, schema) {
  const { from, to } = state.selection;
  let any = false;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return;
    const $inner = state.doc.resolve(pos + 1);
    if (!hasAnyListAncestor($inner, schema)) { any = true; return false; }
  });
  return any;
}
function selectionIntersectsList(state) {
  const { bullet_list, ordered_list } = state.schema.nodes;
  const listTypes = new Set([bullet_list, ordered_list].filter(Boolean));
  let hit = false;
  const { from, to } = state.selection;
  state.doc.nodesBetween(from, to, (node) => {
    if (listTypes.has(node.type)) { hit = true; return false; }
  });
  return hit;
}
function listRangeAroundSelection(state) {
  const { bullet_list, ordered_list } = state.schema.nodes;
  const types = new Set([bullet_list, ordered_list].filter(Boolean));
  const { $from, $to } = state.selection;
  const find = ($pos) => {
    for (let d = $pos.depth; d > 0; d--) {
      const n = $pos.node(d);
      if (types.has(n.type)) return { before: $pos.before(d), after: $pos.after(d) };
    }
    return null;
  };
  const left = find($from);
  const right = find($to);
  if (!left && !right) return null;
  return {
    from: left ? left.before : state.selection.from,
    to: right ? right.after : state.selection.to
  };
}

/* Merge adjacent lists of the same type across the tracker window.
   Also removes truly EMPTY paragraphs between lists so they can join.
   This version iterates parent.children with explicit positions, avoiding out-of-range issues. */
function mergeListsAcrossWindow(view, listType, tracker) {
  const { schema } = view.state;
  const P = schema.nodes.paragraph;
  if (!listType) return;

  const clamp = (n) => Math.max(0, Math.min(n, view.state.doc.content.size));
  const padFrom = () => clamp(tracker.from - 5);
  const padTo   = () => clamp(tracker.to + 5);

  // Helper: join lists already directly adjacent
  const joinPass = () => {
    joinAdjacentNodes(view, listType, padFrom(), padTo());
  };

  // First: join adjacents in case they’re already neighbors
  joinPass();

  // Then: repeatedly remove [list][EMPTY paragraph][list] gaps and re-join
  for (;;) {
    let removedGap = false;

    // Scan all block parents that overlap our padded window
    view.state.doc.nodesBetween(padFrom(), padTo(), (node, pos) => {
      if (!node.isBlock || node.childCount < 3) return; // need at least L-P-L
      // Absolute position of the first child inside `node`
      let childPos = pos + 1;

      for (let i = 0; i <= node.childCount - 3; i++) {
        const a = node.child(i);
        const b = node.child(i + 1);
        const c = node.child(i + 2);

        // Compute absolute starts for a, b, c
        const aStart = childPos;
        const aEnd   = aStart + a.nodeSize;
        const bStart = aEnd;
        const bEnd   = bStart + b.nodeSize;
        // cStart = bEnd (not needed except for debugging)

        // Check pattern: [list][EMPTY paragraph][list]
        const bIsEmptyPara = P && b.type === P && b.content.size === 0;
        if (a.type === listType && bIsEmptyPara && c.type === listType) {
          // Remove the empty paragraph `b`
          const tr = view.state.tr.delete(bStart, bEnd).scrollIntoView();
          dispatchAndMap(view, tr, tracker);
          removedGap = true;
          // After a dispatch, abort this parent scan and restart outer loop with fresh doc
          return false;
        }

        // Advance absolute position for next i (move past child `a`)
        childPos += a.nodeSize;
      }
    });

    if (!removedGap) break;

    // After removing a gap, try to join again
    joinPass();
  }
}

/* Outdent ALL list items that intersect the tracker window, even across
   multiple separate lists. We drive selection into each list_item before lifting. */
function outdentAllListItemsInWindow(view, listItemType, tracker) {
  for (; ;) {
    let target = null;
    const { doc } = view.state;

    doc.nodesBetween(tracker.from, tracker.to, (node, pos) => {
      if (node.type === listItemType) { target = { pos, node }; return false; }
    });

    if (!target) break;

    // Place a caret safely inside the first child of this list_item
    const innerPos = target.pos + 2; // pos + 1 enters content, +1 enters first child's content
    const trSetSel = view.state.tr.setSelection(TextSelection.create(view.state.doc, innerPos));
    dispatchAndMap(view, trSetSel, tracker);

    // Try to lift this item (and potentially its siblings if the command expands)
    let applied = null;
    const ok = liftListItem(listItemType)(view.state, (tr) => { applied = tr; dispatchAndMap(view, tr, tracker); }, view);

    if (!ok || !applied) {
      // Couldn’t lift this one (e.g., already top-level) → skip past it to avoid loops
      const skipTo = target.pos + target.node.nodeSize;
      tracker.from = Math.min(tracker.to, skipTo);
    }
  }
}

/* Outdent command that uses the window-aware outdenter above */
function outdentCommand(listItemType) {
  return (state, dispatch, view) => {
    if (!view) return false;
    const tracker = { from: state.selection.from, to: state.selection.to };
    outdentAllListItemsInWindow(view, listItemType, tracker);
    reselectWindow(view, tracker);
    return true;
  };
}

// Collect starting positions of nodes of a given type within [from,to]
function collectTypePositionsInRange(doc, from, to, nodeType) {
  const out = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.type === nodeType) out.push(pos);
  });
  return out;
}

// Map marker positions through a transaction mapping (in-place on tracker)
function mapMarkersBy(tracker, tr) {
  if (!tracker || !tracker.markers) return;
  tracker.markers = tracker.markers.map((p) => tr.mapping.map(p, -1));
}

/* ─────────────────────── Window mapping helpers ─────────────────────── */

function mapWindowBy(win, tr) {
  if (!tr) return;
  win.from = tr.mapping.map(win.from, -1);
  win.to = tr.mapping.map(win.to, 1);
}

function dispatchAndMap(view, tr, tracker) {
  const hadTracker = !!tracker;
  const before = hadTracker ? snapshotTracker(tracker) : null;

  debugGroup(`[PM] dispatch ${tr.steps.length} step(s)`, () => {
    // 1) dispatch
    view.dispatch(tr);

    // 2) remap the moving window & markers
    if (hadTracker) {
      if (typeof tracker.from === "number" && typeof tracker.to === "number") {
        mapWindowBy(tracker, tr);
      }
      if (tracker.markers) mapMarkersBy(tracker, tr);
    }

    // 3) log
    const after = hadTracker ? snapshotTracker(tracker) : null;
    debugLogDispatch(view, tr, before, after);
  });
}


/* ─────────────────────── Safe per-block ops (window-aware) ───────────────── */

function dispatchSelectBlock(view, pos, node, win) {
  const sel = TextSelection.create(view.state.doc, pos + 1, pos + node.nodeSize - 1);
  dispatchAndMap(view, view.state.tr.setSelection(sel), win);
}

/* Wrap every non-ancestor textblock in the window with nodeType */
function wrapAllBlocksNotInAncestorWindow(view, nodeType, win) {
  for (; ;) {
    const { state } = view;
    let target = null;
    state.doc.nodesBetween(win.from, win.to, (node, pos) => {
      if (!node.isTextblock) return;
      const $inner = state.doc.resolve(pos + 1);
      if (hasAncestorOfType($inner, nodeType)) return;
      target = { pos, node };
      return false; // break
    });
    if (!target) break;
    dispatchSelectBlock(view, target.pos, target.node, win);
    wrapIn(nodeType)(view.state, (tr) => dispatchAndMap(view, tr, win), view);
  }
}

/* Wrap ALL list nodes intersecting `tracker` in a blockquote, remapping the
   moving window as we go. Skips lists already inside a blockquote to avoid
   nesting/looping. Returns true if it wrapped anything. */
function wrapListsInBlockquoteAcrossWindow(view, blockquoteType, tracker, opts = {}) {
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

    // Find the next list in the current window that (optionally) isn't already wrapped
    let target = null;
    const { doc } = view.state;
    doc.nodesBetween(tracker.from, tracker.to, (node, pos) => {
      if (!listTypes.has(node.type)) return;
      if (skipAlreadyWrapped) {
        const $inner = doc.resolve(pos + 1);
        if (hasAncestorOfType($inner, blockquoteType)) return; // already inside a blockquote
      }
      target = { pos };
      return false; // break
    });

    if (!target) break;

    // Node-select the list and wrap it in a blockquote, remapping the tracker as we go
    const $pos = view.state.doc.resolve(target.pos);
    dispatchAndMap(view, view.state.tr.setSelection(new NodeSelection($pos)), tracker);

    let applied = null;
    wrapIn(blockquoteType)(
      view.state,
      (tr) => { applied = tr; dispatchAndMap(view, tr, tracker); },
      view
    );

    if (!applied) break; // couldn't wrap; bail to avoid loops
    did = true;
  }

  return did;
}

/* Convert all list nodes in window to target type (one tr), remap window */
function retargetListsInWindow(view, win, targetListType) {
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

/* Wrap every non-list textblock within window into target list type.
   If a block isn't a paragraph, first convert it to paragraph (schema-safe). */
function wrapAllNonListBlocksInWindow(view, targetListType, win) {
  const { paragraph } = view.state.schema.nodes;

  for (; ;) {
    const { state } = view;
    let target = null;

    state.doc.nodesBetween(win.from, win.to, (node, pos) => {
      if (!node.isTextblock) return;
      const $inner = state.doc.resolve(pos + 1);
      if (hasAnyListAncestor($inner, state.schema)) return; // already in a list
      target = { pos, node };
      return false; // break
    });

    if (!target) break;

    // Select the block
    dispatchSelectBlock(view, target.pos, target.node, win);

    // Ensure the first child of a list_item would be a paragraph
    if (paragraph && target.node.type !== paragraph) {
      let normalized = false;
      setBlockType(paragraph)(view.state, (tr) => {
        normalized = true;
        dispatchAndMap(view, tr, win);
      }, view);
      if (!normalized) {
        // If we can't normalize, skip this block to avoid infinite loop
        // Move window forward 1 char to progress
        win.from = Math.min(win.to, win.from + 1);
        continue;
      }
    }

    // Now wrap in list
    wrapInList(targetListType)(view.state, (tr) => dispatchAndMap(view, tr, win), view);
  }
}

/* Convert every textblock within a moving window to targetType (attrs optional) */
function convertTextblocksInSelectionWindow(view, targetType, attrs, win) {
  for (; ;) {
    const { state } = view;
    let target = null;
    state.doc.nodesBetween(win.from, win.to, (node, pos) => {
      if (!node.isTextblock) return;
      if (node.type === targetType && (!attrs || JSON.stringify(node.attrs) === JSON.stringify(attrs))) return;
      target = { pos, node };
      return false; // break
    });
    if (!target) break;
    dispatchSelectBlock(view, target.pos, target.node, win);
    let applied = null;
    setBlockType(targetType, attrs)(view.state, (tr) => { applied = tr; dispatchAndMap(view, tr, win); }, view);
    if (!applied) break;
  }
}

/* Join adjacent nodes of a given type across [from,to] (no window changes) */
function joinAdjacentNodes(view, nodeType, from, to) {
  const { state } = view;
  const doc = state.doc;
  const clamp = (n) => Math.max(0, Math.min(n, doc.content.size));
  from = clamp(from); to = clamp(to);
  const positions = [];
  doc.nodesBetween(from, to, (node, pos, parent, index) => {
    if (!parent || node.type !== nodeType) return;
    if (index > 0 && parent.child(index - 1).type === nodeType) positions.push(pos);
  });
  if (!positions.length) return;
  let tr = state.tr;
  positions.sort((a, b) => b - a).forEach((p) => {
    const mapped = tr.mapping.map(p);
    if (canJoin(tr.doc, mapped)) tr = tr.join(mapped);
  });
  if (tr.steps.length) view.dispatch(tr.scrollIntoView());
}

/* Lift all possible blocks/list-items across selection (window-aware variants) */
function liftAcrossSelection(view, win) {
  let did = false;
  for (; ;) {
    let applied = null;
    const ok = lift(view.state, (tr) => { applied = tr; dispatchAndMap(view, tr, win); }, view);
    if (!ok) break;
    did = true;
  }
  return did;
}
function liftListItemsAcrossSelection(view, listItemType, win) {
  let did = false;
  for (; ;) {
    let applied = null;
    const ok = liftListItem(listItemType)(view.state, (tr) => { applied = tr; dispatchAndMap(view, tr, win); }, view);
    if (!ok) break;
    did = true;
  }
  return did;
}

/* ─────────────────────── UI state helpers ─────────────────────── */

const isMarkActive = (state, type) => {
  if (!type) return false;
  const { from, $from, to, empty } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks());
  return state.doc.rangeHasMark(from, to, type);
};
const isBlockActive = (state, type, attrs = null) => {
  if (!type) return false;
  const { from, to } = state.selection;
  let active = true;
  state.doc.nodesBetween(from, to, (node) => {
    if (node.isTextblock && !node.hasMarkup(type, attrs)) { active = false; return false; }
  });
  return active;
};

/* ─────────────────────── Unified commands (window-preserving) ────────────── */

/* LISTS: reapply/convert across the whole window, then merge adjacent lists */
function applyListUnified(targetListType, listItemType) {
  return (state, dispatch, view) => {
    if (!view) return false;
    const schema = state.schema;
    const win = { from: state.selection.from, to: state.selection.to };

    if (selectionHasAnyNonListTextblock(state, schema)) {
      // normalize any existing lists in-window to target, then wrap all non-lists
      retargetListsInWindow(view, win, targetListType);
      wrapAllNonListBlocksInWindow(view, targetListType, win);
      // finally, merge adjacent lists of same type across the window
      mergeListsAcrossWindow(view, targetListType, win); // (your safer version)
      reselectWindow(view, win);
      return true;
    }

    // selection is only lists
    if (!selectionAllInAncestorType(state, targetListType)) {
      retargetListsInWindow(view, win, targetListType);
      mergeListsAcrossWindow(view, targetListType, win);
      reselectWindow(view, win);
      return true;
    }

    // toggle off → outdent
    outdentAllListItemsInWindow(view, listItemType, win);
    reselectWindow(view, win);
    return true;
  };
}

/* BLOCKQUOTE: keep window; wrap lists as whole nodes to respect schema; merge neighbors */
function applyBlockquoteUnified(blockquoteType) {
  return (state, dispatch, view) => {
    if (!view) return false;

    if (selectionHasAnyOutsideAncestor(state, blockquoteType)) {
      const win = { from: state.selection.from, to: state.selection.to };

      // Wrap list nodes themselves (schema-safe) — now via reusable helper
      if (selectionIntersectsList(state)) {
        wrapListsInBlockquoteAcrossWindow(view, blockquoteType, win);
      }

      // Wrap any remaining non-quoted textblocks inside the window
      wrapAllBlocksNotInAncestorWindow(view, blockquoteType, win);

      // Merge adjacent blockquotes around the window
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


// CHANGE SIGNATURE: add joinMode with default "smart"
function applyCodeBlockUnified(codeBlockType, paragraphType, listItemType, joinMode = "smart") {
  return (state, dispatch, view) => {
    if (!view) return false;

    // Toggle off → back to paragraph
    if (isBlockActive(state, codeBlockType)) {
      const trackerOff = { from: state.selection.from, to: state.selection.to };
      convertTextblocksInSelectionWindow(view, paragraphType, null, trackerOff);
      return true;
    }

    // Track original selection window + (for "smart") the positions of any code blocks that already existed
    const tracker = {
      from: state.selection.from,
      to: state.selection.to,
      markers: joinMode === "smart"
        ? collectTypePositionsInRange(state.doc, state.selection.from, state.selection.to, codeBlockType)
        : []
    };

    // Schema safety: lift list items before converting to code blocks
    if (selectionIntersectsList(state) && listItemType) {
      liftListItemsAcrossSelection(view, listItemType, tracker);
    }

    // Convert every textblock in the original window to code_block
    convertTextblocksInSelectionWindow(view, codeBlockType, null, tracker);

    // Post-conversion joins based on mode
    const docSize = view.state.doc.content.size;
    if (joinMode === "always") {
      // Join all adjacents in the selection span
      joinAdjacentNodes(view, codeBlockType,
        Math.max(0, tracker.from - 10),
        Math.min(docSize, tracker.to + 10)
      );
    } else if (joinMode === "smart" && tracker.markers.length) {
      // Only join around places that were code BEFORE the action
      for (const p of tracker.markers) {
        const from = Math.max(0, p - 2);
        const to = Math.min(docSize, p + 2);
        joinAdjacentNodes(view, codeBlockType, from, to);
      }
    }
    // "never" → no join

    reselectWindow(view, tracker);
    return true;
  };
}

/* CODE (single): replace selection with one code_block; avoid empty text node */
function applyCodeBlockUnifiedSingle(codeBlockType) {
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
      // keep this variant self-contained; no joining needed
    }
    return true;
  };
}

/* ─────────────────────── Toolbar UI pieces ─────────────────────── */

function makeBtn({ label, title, run, isActive, isEnabled }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pm-btn";
  btn.textContent = label;
  if (title) btn.title = title;
  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  let viewRef = null;
  btn.addEventListener("click", () => viewRef && run(viewRef));
  return {
    dom: btn,
    bindView(view) { viewRef = view; },
    update(state) {
      const active = isActive ? !!isActive(state) : false;
      const enabled = isEnabled ? !!isEnabled(state) : true;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
      btn.disabled = !enabled;
    }
  };
}

function makeSelect({ options, compute, apply, isEnabled }) {
  const wrap = document.createElement("div");
  wrap.className = "pm-select";
  const sel = document.createElement("select");
  sel.innerHTML = options.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
  wrap.appendChild(sel);
  let viewRef = null;
  sel.addEventListener("change", () => { if (viewRef) { apply(viewRef, sel.value); viewRef.focus(); } });
  return {
    dom: wrap,
    bindView(view) { viewRef = view; },
    update(state) {
      const value = compute(state);
      if (sel.value !== value) sel.value = value;
      const enabled = isEnabled ? !!isEnabled(state) : true;
      sel.disabled = !enabled;
    }
  };
}

/* ─────────────────────── Keymap (renamed to avoid duplicates) ────────────── */

export function createMarkdownKeymap(schema) {
  const bind = {};
  if (schema.marks.strong) bind["Mod-b"] = toggleMark(schema.marks.strong);
  if (schema.marks.em) bind["Mod-i"] = toggleMark(schema.marks.em);
  if (schema.marks.code) bind["Mod-`"] = toggleMark(schema.marks.code);

  if (schema.nodes.paragraph) bind["Shift-Ctrl-0"] = setBlockType(schema.nodes.paragraph);
  if (schema.nodes.heading) {
    bind["Shift-Ctrl-1"] = setBlockType(schema.nodes.heading, { level: 1 });
    bind["Shift-Ctrl-2"] = setBlockType(schema.nodes.heading, { level: 2 });
    bind["Shift-Ctrl-3"] = setBlockType(schema.nodes.heading, { level: 3 });
  }

  if (schema.nodes.blockquote) bind["Shift-Ctrl-b"] = applyBlockquoteUnified(schema.nodes.blockquote);

  if (schema.nodes.code_block && schema.nodes.paragraph) {
    bind["Shift-Ctrl-\\"] = applyCodeBlockUnified(
      schema.nodes.code_block,
      schema.nodes.paragraph,
      schema.nodes.list_item || null
    );
    // Optional: bind a hotkey for the single-block variant if you like.
    // bind["Alt-Shift-Ctrl-\\"] = applyCodeBlockUnifiedSingle(schema.nodes.code_block);
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

/* ─────────────────────── Toolbar plugin & bundle ─────────────────────────── */

export function markdownToolbarPlugin(options = {}) {
  const { codeJoinMode = "smart" } = options; // "smart" | "always" | "never"

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

      if (schema.nodes.paragraph && schema.nodes.heading) {
        const p = schema.nodes.paragraph, h = schema.nodes.heading;
        items.push(makeSelect({
          options: [["p", "Paragraph"], ["h1", "H1"], ["h2", "H2"], ["h3", "H3"]],
          compute: (s) => {
            if (isBlockActive(s, h, { level: 1 })) return "h1";
            if (isBlockActive(s, h, { level: 2 })) return "h2";
            if (isBlockActive(s, h, { level: 3 })) return "h3";
            return "p";
          },
          apply: (view, v) => {
            const cmd = v === "p" ? setBlockType(p) : setBlockType(h, { level: v === "h1" ? 1 : v === "h2" ? 2 : 3 });
            cmd(view.state, view.dispatch, view);
          },
          // Disable if the selection touches the first paragraph in any list item (schema rule)
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
        if (bullet_list) items.push(makeBtn({
          label: "• List", title: "Bulleted list (Shift-Ctrl-8)",
          run: run(applyListUnified(bullet_list, list_item)),
          isActive: (s) => selectionAllInAncestorType(s, bullet_list),
          isEnabled: () => true
        }));
        if (ordered_list) items.push(makeBtn({
          label: "1. List", title: "Numbered list (Shift-Ctrl-7)",
          run: run(applyListUnified(ordered_list, list_item)),
          isActive: (s) => selectionAllInAncestorType(s, ordered_list),
          isEnabled: () => true
        }));
        items.push(
          makeBtn({ label: "→", title: "Indent (Tab)", run: run(sinkListItem(list_item)), isEnabled: (s) => sinkListItem(list_item)(s) }),
          makeBtn({
            label: "←",
            title: "Outdent (Shift-Tab)",
            run: run(outdentCommand(list_item)),
            // enable if there's any list_item in the selection
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
          isActive: (s) => selectionAllInAncestorType(s, schema.nodes.blockquote),
          isEnabled: () => true
        }));
      }

      if (schema.nodes.code_block && schema.nodes.paragraph) {
        const cmdMulti = applyCodeBlockUnified(
          schema.nodes.code_block,
          schema.nodes.paragraph,
          schema.nodes.list_item || null,
          codeJoinMode // <-- pass the option here
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
            label: "Code (single)",
            title: "Flatten to one code block",
            run: run(cmdSingle),
          })
        );
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
