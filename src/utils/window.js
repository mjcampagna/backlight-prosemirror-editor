import { NodeSelection } from "prosemirror-state";
import { canJoin } from "prosemirror-transform";
import { debugGroup, snapshotTracker, debugLogDispatch } from "../debug/utils.js";

export function mapMarkersBy(tracker, tr) {
  if (!tracker || !tracker.markers) return;
  tracker.markers = tracker.markers.map((p) => tr.mapping.map(p, -1));
}

export function mapWindowBy(win, tr) {
  if (!tr) return;
  win.from = tr.mapping.map(win.from, -1);
  win.to = tr.mapping.map(win.to, 1);
}

export function dispatchAndMap(view, tr, tracker) {
  const hadTracker = !!tracker;
  const before = hadTracker ? snapshotTracker(tracker) : null;

  debugGroup(`[PM] dispatch ${tr.steps.length} step(s)`, () => {
    view.dispatch(tr);

    if (hadTracker) {
      if (typeof tracker.from === "number" && typeof tracker.to === "number") {
        mapWindowBy(tracker, tr);
      }
      if (tracker.markers) mapMarkersBy(tracker, tr);
    }

    const after = hadTracker ? snapshotTracker(tracker) : null;
    debugLogDispatch(view, tr, before, after);
  });
}

export function joinAdjacentNodes(view, nodeType, from, to) {
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
