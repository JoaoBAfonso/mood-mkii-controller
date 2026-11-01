export function createHelpTooltip() {
  const tip = document.createElement('div');
  tip.id = 'control-tooltip'; tip.className = 'control-tooltip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.append(tip);
  let active;
  let timer;
  let hoverTimer;
  function hide() {
    clearTimeout(timer);
    clearTimeout(hoverTimer);
    if (active) active.pinned = false;
    active?.button.setAttribute('aria-expanded', 'false');
    active = undefined; tip.hidden = true;
  }
  function show(entry) {
    hide(); active = entry;
    (entry.root.closest('dialog[open]') || document.body).append(tip);
    tip.textContent = entry.text();
    if (!tip.textContent) { hide(); return; }
    tip.hidden = false;
    entry.button.setAttribute('aria-expanded', 'true');
    place(entry);
  }
  function place(entry) {
    const rect = entry.root.getBoundingClientRect();
    if (!entry.root.isConnected || rect.bottom < 0 || rect.top > innerHeight) { hide(); return; }
    tip.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - tip.offsetWidth - 8))}px`;
    const above = rect.top - tip.offsetHeight - 8;
    const below = rect.bottom + 8;
    tip.style.top = `${above >= 8 ? above : Math.min(below, innerHeight - tip.offsetHeight - 8)}px`;
  }
  const later = () => { clearTimeout(hoverTimer); clearTimeout(timer); if (!active?.pinned) timer = setTimeout(hide, 180); };
  tip.onpointerenter = () => clearTimeout(timer);
  tip.onpointerleave = later;
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide(); });
  document.addEventListener('pointerdown', (event) => {
    if (active && !active.root.contains(event.target) && !tip.contains(event.target)) hide();
  });
  window.addEventListener('scroll', () => { if (active) place(active); }, true);
  window.addEventListener('resize', hide);
  return {
    hide,
    refresh: () => { if (active) { tip.textContent = active.text(); place(active); } },
    attach(root, text, name) {
      if (!text()) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'control-help';
      button.textContent = '?'; button.setAttribute('aria-label', `Help: ${name}`);
      button.setAttribute('aria-controls', tip.id); button.setAttribute('aria-expanded', 'false');
      const entry = { root, button, text, pinned: false };
      root.append(button);
      root.querySelectorAll('input,select,button').forEach((input) => input.setAttribute('aria-describedby', tip.id));
      root.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch' || active?.pinned) return;
        if (active && active !== entry) hide();
        clearTimeout(timer); clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          if (root.isConnected && root.matches(':hover') && root.getClientRects().length) show(entry);
        }, 3000);
      });
      root.addEventListener('pointerleave', later);
      root.addEventListener('focusin', (event) => { if (event.target.matches(':focus-visible') && !active?.pinned) show(entry); });
      root.addEventListener('focusout', (event) => { if (!root.contains(event.relatedTarget)) later(); });
      button.onclick = () => { if (entry.pinned) hide(); else { show(entry); entry.pinned = true; } };
    },
  };
}
