// ═══════════════════════════════════════════════════════════════════════════
// JARVIS Design System — Reusable UI Components
// ═══════════════════════════════════════════════════════════════════════════

window.JARVIS = window.JARVIS || {};

JARVIS.Toast = function({ message, variant = 'default', duration = 3000 }) {
  const toast = document.createElement('div');
  toast.className = `jarvis-toast jarvis-toast--${variant}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 16px;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-primary);
    z-index: 10000;
    animation: slideInUp 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);

  return toast;
};

JARVIS.Modal = function({ title, content, actions }) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 500px;
    width: 90%;
  `;

  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  titleEl.style.cssText = `
    font-family: var(--font-display);
    font-size: 24px;
    color: var(--text-primary);
    margin-bottom: var(--space-4);
  `;

  const contentEl = document.createElement('div');
  contentEl.innerHTML = content;

  const actionsEl = document.createElement('div');
  actionsEl.style.cssText = `
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-6);
    justify-content: flex-end;
  `;

  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.className = `jarvis-btn jarvis-btn--${action.variant}`;
    btn.onclick = () => action.onClick(() => overlay.remove());
    actionsEl.appendChild(btn);
  });

  modal.appendChild(titleEl);
  modal.appendChild(contentEl);
  modal.appendChild(actionsEl);
  overlay.appendChild(modal);

  return overlay;
};

JARVIS.ProgressRing = function({ percent, size = 64, label = '' }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', size / 2);
  circle.setAttribute('cy', size / 2);
  circle.setAttribute('r', radius);
  circle.setAttribute('stroke', 'var(--copper)');
  circle.setAttribute('stroke-width', '3');
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke-dasharray', circumference);
  circle.setAttribute('stroke-dashoffset', offset);
  circle.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);

  svg.appendChild(circle);

  if (label) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50%');
    text.setAttribute('y', '50%');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-family', 'var(--font-mono)');
    text.setAttribute('font-size', '14');
    text.setAttribute('fill', 'var(--text-primary)');
    text.textContent = label;
    svg.appendChild(text);
  }

  return svg;
};

JARVIS.CommandPalette = function({ commands, onSelect, onClose }) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 20vh;
  `;

  const palette = document.createElement('div');
  palette.style.cssText = `
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    width: 600px;
    max-width: 90%;
  `;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type a command...';
  input.style.cssText = `
    width: 100%;
    padding: var(--space-4);
    border: none;
    background: transparent;
    font-family: var(--font-mono);
    font-size: 16px;
    color: var(--text-primary);
    outline: none;
  `;

  const list = document.createElement('div');
  list.style.cssText = `
    max-height: 400px;
    overflow-y: auto;
  `;

  commands.forEach(cmd => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: var(--space-3) var(--space-4);
      cursor: pointer;
      border-top: 1px solid var(--border);
    `;
    item.innerHTML = `
      <div style="font-family: var(--font-mono); font-size: 14px; color: var(--text-primary);">${cmd.label}</div>
      <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">${cmd.description}</div>
    `;
    item.onclick = () => {
      onSelect(cmd);
      overlay.remove();
    };
    list.appendChild(item);
  });

  palette.appendChild(input);
  palette.appendChild(list);
  overlay.appendChild(palette);

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onClose();
    }
  };

  input.focus();

  return overlay;
};
