/**
 * JARVIS Component Library
 * Created: 2026-05-13
 * Vanilla JS reusable UI components for JARVIS cockpit
 */

const JARVIS = {
  // ── CARD ──────────────────────────────────────────────────────────────────
  Card({ title, body, footer, className = '', onClick }) {
    const card = document.createElement('div');
    card.className = `jarvis-card ${className}`;
    if (onClick) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', onClick);
    }

    if (title) {
      const header = document.createElement('div');
      header.className = 'jarvis-card__header';
      header.innerHTML = `<h3 class="font-display text-h2">${title}</h3>`;
      card.appendChild(header);
    }

    if (body) {
      const bodyEl = document.createElement('div');
      bodyEl.className = 'jarvis-card__body';
      if (typeof body === 'string') {
        bodyEl.innerHTML = body;
      } else {
        bodyEl.appendChild(body);
      }
      card.appendChild(bodyEl);
    }

    if (footer) {
      const footerEl = document.createElement('div');
      footerEl.className = 'jarvis-card__footer';
      if (typeof footer === 'string') {
        footerEl.innerHTML = footer;
      } else {
        footerEl.appendChild(footer);
      }
      card.appendChild(footerEl);
    }

    return card;
  },

  // ── BUTTON ────────────────────────────────────────────────────────────────
  Button({ label, variant = 'primary', size = 'md', onClick, disabled = false, icon, className = '' }) {
    const btn = document.createElement('button');
    btn.className = `jarvis-btn jarvis-btn--${variant} jarvis-btn--${size} ${className}`;
    btn.disabled = disabled;
    if (onClick) btn.addEventListener('click', onClick);

    if (icon && !label) {
      btn.innerHTML = icon;
      btn.classList.add('jarvis-btn--icon-only');
    } else if (icon) {
      btn.innerHTML = `${icon}<span>${label}</span>`;
    } else {
      btn.textContent = label;
    }

    return btn;
  },

  // ── INPUT ─────────────────────────────────────────────────────────────────
  Input({ type = 'text', placeholder = '', value = '', onChange, onEnter, className = '', mono = false }) {
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.value = value;
    input.className = `jarvis-input ${mono ? 'font-mono' : ''} ${className}`;
    if (onChange) input.addEventListener('input', (e) => onChange(e.target.value));
    if (onEnter) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') onEnter(e.target.value);
      });
    }
    return input;
  },

  // ── STATUS PILL ───────────────────────────────────────────────────────────
  StatusPill({ label, variant = 'default', live = false }) {
    const pill = document.createElement('span');
    pill.className = `jarvis-pill jarvis-pill--${variant} font-mono text-pill`;
    if (live) pill.classList.add('jarvis-pill--live');
    pill.textContent = label;
    return pill;
  },

  // ── TABLE ─────────────────────────────────────────────────────────────────
  Table({ columns, data, onRowClick, className = '' }) {
    const table = document.createElement('table');
    table.className = `jarvis-table ${className}`;

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
      const th = document.createElement('th');
      th.className = 'font-mono text-tiny';
      th.textContent = col.header;
      if (col.width) th.style.width = col.width;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
      const tr = document.createElement('tr');
      if (onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => onRowClick(row));
      }
      columns.forEach(col => {
        const td = document.createElement('td');
        const value = col.accessor ? col.accessor(row) : row[col.key];
        if (col.mono) td.className = 'font-mono';
        if (typeof value === 'object' && value instanceof HTMLElement) {
          td.appendChild(value);
        } else {
          td.innerHTML = value ?? '—';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
  },

  // ── TABS ──────────────────────────────────────────────────────────────────
  Tabs({ tabs, activeTab, onChange }) {
    const container = document.createElement('div');
    container.className = 'jarvis-tabs';

    tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = `jarvis-tab ${tab.id === activeTab ? 'jarvis-tab--active' : ''}`;
      btn.textContent = tab.label;
      btn.addEventListener('click', () => onChange(tab.id));
      container.appendChild(btn);
    });

    return container;
  },

  // ── MODAL ─────────────────────────────────────────────────────────────────
  Modal({ title, body, footer, onClose, size = 'md' }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'jarvis-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = `jarvis-modal jarvis-modal--${size}`;

    // Header
    const header = document.createElement('div');
    header.className = 'jarvis-modal__header';
    header.innerHTML = `
      <h2 class="font-display text-h2">${title}</h2>
      <button class="jarvis-modal__close" aria-label="Close">&times;</button>
    `;
    const closeBtn = header.querySelector('.jarvis-modal__close');
    closeBtn.addEventListener('click', () => {
      backdrop.remove();
      if (onClose) onClose();
    });
    modal.appendChild(header);

    // Body
    const bodyEl = document.createElement('div');
    bodyEl.className = 'jarvis-modal__body';
    if (typeof body === 'string') {
      bodyEl.innerHTML = body;
    } else {
      bodyEl.appendChild(body);
    }
    modal.appendChild(bodyEl);

    // Footer
    if (footer) {
      const footerEl = document.createElement('div');
      footerEl.className = 'jarvis-modal__footer';
      if (typeof footer === 'string') {
        footerEl.innerHTML = footer;
      } else {
        footerEl.appendChild(footer);
      }
      modal.appendChild(footerEl);
    }

    backdrop.appendChild(modal);

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
        if (onClose) onClose();
      }
    });

    // ESC to close
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        backdrop.remove();
        if (onClose) onClose();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    return backdrop;
  },

  // ── TOAST ─────────────────────────────────────────────────────────────────
  Toast({ message, duration = 4000, variant = 'default' }) {
    const toast = document.createElement('div');
    toast.className = `jarvis-toast jarvis-toast--${variant}`;
    toast.textContent = message;

    const container = document.querySelector('.jarvis-toast-container') || (() => {
      const c = document.createElement('div');
      c.className = 'jarvis-toast-container';
      document.body.appendChild(c);
      return c;
    })();

    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('jarvis-toast--show'), 10);

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.remove('jarvis-toast--show');
      setTimeout(() => toast.remove(), 200);
    }, duration);

    return toast;
  },

  // ── SPARKLINE ─────────────────────────────────────────────────────────────
  Sparkline({ data, width = 100, height = 32 }) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'jarvis-sparkline');

    if (!data || data.length === 0) return svg;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', points);
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', 'var(--copper)');
    polyline.setAttribute('stroke-width', '1.5');
    svg.appendChild(polyline);

    // Last point dot
    const lastX = ((data.length - 1) / (data.length - 1)) * width;
    const lastY = height - ((data[data.length - 1] - min) / range) * height;
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', lastX);
    dot.setAttribute('cy', lastY);
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', 'var(--copper)');
    svg.appendChild(dot);

    return svg;
  },

  // ── NUMBER DISPLAY (animated counter) ────────────────────────────────────
  NumberDisplay({ value, prefix = '', suffix = '', duration = 600, className = '' }) {
    const el = document.createElement('span');
    el.className = `jarvis-number font-mono ${className}`;

    let current = 0;
    const target = parseFloat(value) || 0;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      current = target * progress;

      // Preserve formatting (commas, decimals)
      let formatted = current.toFixed(target % 1 === 0 ? 0 : 2);
      if (target >= 1000) {
        formatted = current.toLocaleString('en-GB', { maximumFractionDigits: 2 });
      }

      el.textContent = `${prefix}${formatted}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
    return el;
  },

  // ── PROGRESS RING ─────────────────────────────────────────────────────────
  ProgressRing({ percent, size = 64, label }) {
    const container = document.createElement('div');
    container.className = 'jarvis-progress-ring';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);

    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    // Track circle
    const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    track.setAttribute('cx', size / 2);
    track.setAttribute('cy', size / 2);
    track.setAttribute('r', radius);
    track.setAttribute('fill', 'none');
    track.setAttribute('stroke', 'var(--border)');
    track.setAttribute('stroke-width', strokeWidth);
    svg.appendChild(track);

    // Progress circle
    const progress = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progress.setAttribute('cx', size / 2);
    progress.setAttribute('cy', size / 2);
    progress.setAttribute('r', radius);
    progress.setAttribute('fill', 'none');
    progress.setAttribute('stroke', 'var(--copper)');
    progress.setAttribute('stroke-width', strokeWidth);
    progress.setAttribute('stroke-dasharray', circumference);
    progress.setAttribute('stroke-dashoffset', offset);
    progress.setAttribute('stroke-linecap', 'round');
    progress.style.transition = 'stroke-dashoffset 800ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    progress.style.transformOrigin = '50% 50%';
    progress.style.transform = 'rotate(-90deg)';
    svg.appendChild(progress);

    container.appendChild(svg);

    // Center label
    if (label) {
      const labelEl = document.createElement('div');
      labelEl.className = 'jarvis-progress-ring__label font-mono';
      labelEl.textContent = label;
      container.appendChild(labelEl);
    }

    return container;
  },

  // ── COMMAND PALETTE ───────────────────────────────────────────────────────
  CommandPalette({ commands, onSelect, onClose }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'jarvis-command-palette-backdrop';

    const palette = document.createElement('div');
    palette.className = 'jarvis-command-palette';

    const input = JARVIS.Input({
      placeholder: 'Search commands...',
      onChange: (val) => filterCommands(val),
      className: 'jarvis-command-palette__input'
    });

    const results = document.createElement('div');
    results.className = 'jarvis-command-palette__results';

    let filteredCommands = commands;
    let selectedIndex = 0;

    const renderResults = () => {
      results.innerHTML = '';
      filteredCommands.slice(0, 8).forEach((cmd, i) => {
        const item = document.createElement('div');
        item.className = `jarvis-command-palette__item ${i === selectedIndex ? 'jarvis-command-palette__item--selected' : ''}`;
        item.innerHTML = `
          <div class="jarvis-command-palette__item-label">${cmd.label}</div>
          ${cmd.description ? `<div class="jarvis-command-palette__item-desc text-small">${cmd.description}</div>` : ''}
        `;
        item.addEventListener('click', () => {
          backdrop.remove();
          onSelect(cmd);
        });
        results.appendChild(item);
      });
    };

    const filterCommands = (query) => {
      if (!query) {
        filteredCommands = commands;
      } else {
        const q = query.toLowerCase();
        filteredCommands = commands.filter(cmd =>
          cmd.label.toLowerCase().includes(q) ||
          (cmd.description && cmd.description.toLowerCase().includes(q)) ||
          (cmd.keywords && cmd.keywords.some(k => k.toLowerCase().includes(q)))
        );
      }
      selectedIndex = 0;
      renderResults();
    };

    // Keyboard nav
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
        renderResults();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderResults();
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        backdrop.remove();
        onSelect(filteredCommands[selectedIndex]);
      } else if (e.key === 'Escape') {
        backdrop.remove();
        if (onClose) onClose();
      }
    });

    palette.appendChild(input);
    palette.appendChild(results);
    backdrop.appendChild(palette);

    renderResults();

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
        if (onClose) onClose();
      }
    });

    // Focus input after render
    setTimeout(() => input.focus(), 100);

    return backdrop;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JARVIS;
}
