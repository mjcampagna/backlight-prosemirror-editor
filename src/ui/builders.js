export function makeBtn({ label, title, run, isActive, isEnabled }) {
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

export function makeSelect({ options, compute, apply, isEnabled }) {
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
