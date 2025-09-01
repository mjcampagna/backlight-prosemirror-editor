export const PM_DEBUG = () => typeof window !== "undefined" && !!window.__PM_DEBUG;

export function snapshotTracker(tracker) {
  if (!tracker) return null;
  return {
    from: typeof tracker.from === "number" ? tracker.from : null,
    to: typeof tracker.to === "number" ? tracker.to : null,
    markers: Array.isArray(tracker.markers) ? tracker.markers.slice() : null
  };
}

export function debugGroup(label, fn) {
  if (!PM_DEBUG()) return fn();
  console.groupCollapsed(label);
  try { return fn(); } finally { console.groupEnd(); }
}

export function debugLogDispatch(view, tr, beforeTracker, afterTracker) {
  if (!PM_DEBUG()) return;

  const stepNames = tr.steps.map(s => (s?.constructor?.name) || "Step");
  const beforeSel = view.state.selection;

  console.log({
    steps: stepNames,
    selectionBefore: { from: beforeSel.from, to: beforeSel.to },
    trackerBefore: beforeTracker,
    trackerAfter: afterTracker,
  });

  const sel = view.state.selection;
  console.log("selectionAfter", { from: sel.from, to: sel.to });
}
