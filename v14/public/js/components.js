// ═══════════════════════════════════════════════════════════════════════════
// RBTR Components · Phase 1.5
// Vanilla-JS component helpers. No framework. Each returns an HTMLElement.
// Styles driven by design-system.css tokens — no inline colours.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────────────────
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'className') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
        else node.setAttribute(k, v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === 'string' || typeof c === 'number'
        ? document.createTextNode(String(c))
        : c);
    }
    return node;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  // ── Components ────────────────────────────────────────────────────────────

  // card({ variant, clickable, onClick, body, heading })
  function card({ variant = 'default', clickable = false, onClick, children, className = '' } = {}) {
    const klass = ['ds-card', className, clickable ? 'interactive' : '', variant === 'elevated' ? 'elevated' : '']
      .filter(Boolean).join(' ');
    const node = el('div', { className: klass, onClick: clickable ? onClick : null });
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? el('div', { html: c }) : c);
      });
    }
    return node;
  }

  // button({ variant, size, icon, label, loading, onClick, disabled })
  function button({ variant = 'secondary', size = 'md', icon, label, loading = false, onClick, disabled = false } = {}) {
    const klass = ['ds-btn', variant, size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : ''].filter(Boolean).join(' ');
    return el('button', {
      className: klass,
      disabled: disabled || loading || null,
      onClick: onClick || null,
    },
      loading ? el('span', { className: 'spinner' }, '⏳') : (icon ? el('span', {}, icon) : null),
      label || '',
    );
  }

  // statCard({ label, value, unit, sub, emoji, mono })
  function statCard({ label, value, unit, sub, emoji, mono = true } = {}) {
    return el('div', { className: 'ds-stat' },
      el('div', { className: 'label' }, (emoji ? emoji + ' ' : '') + (label || '')),
      el('div', { className: 'value' + (mono ? '' : ' no-mono'), style: mono ? null : { fontFamily: 'var(--font-body)' } },
        value == null ? '—' : String(value) + (unit ? ' ' + unit : '')),
      sub ? el('div', { className: 'sub' }, sub) : null,
    );
  }

  // temperatureBadge(temp, score)
  function temperatureBadge(temp, score) {
    const map = { hot: '🔥 HOT', warm: '🌡 WARM', cold: '❄ COLD', dead: '💀 DEAD' };
    const label = map[temp] || '? UNKNOWN';
    return el('span', { className: 'ds-badge ' + (temp || '') },
      label,
      score != null ? el('span', { className: 'mono', style: { marginLeft: '6px', opacity: '0.7' } }, String(score)) : null,
    );
  }

  // emptyState({ icon, title, body, action: {label, onClick} })
  function emptyState({ icon = '·', title = 'Nothing here yet', body, action } = {}) {
    const node = el('div', { className: 'ds-empty' },
      el('div', { className: 'icon' }, icon),
      el('div', { className: 'title' }, title),
      body ? el('div', { className: 'body' }, body) : null,
    );
    if (action) node.appendChild(button({ variant: 'secondary', size: 'sm', label: action.label, onClick: action.onClick }));
    return node;
  }

  // badge({ label, variant })
  function badge({ label, variant = '' }) {
    return el('span', { className: 'ds-badge ' + variant }, label || '');
  }

  // sidebarNav({ groups: [{ heading, items: [{ label, id, emoji, badge, active, onClick }] }], current })
  function sidebarNav({ groups = [], current, collapsible = false } = {}) {
    const side = el('aside', { className: 'p-side' });
    for (const g of groups) {
      side.appendChild(el('div', { className: 'p-group' }, g.heading || ''));
      for (const it of g.items || []) {
        const active = current && current === it.id;
        const item = el('a', {
          className: 'p-item' + (active ? ' active' : ''),
          href: it.href || 'javascript:void(0)',
          onClick: it.onClick ? (e) => { e.preventDefault(); it.onClick(it); } : null,
          dataset: { section: it.id || '' },
        },
          it.emoji ? el('span', { className: 'p-item-emoji' }, it.emoji) : null,
          el('span', { className: 'p-item-label' }, it.label || ''),
          it.badge ? el('span', { className: 'ds-badge ' + (it.badge.variant || 'new'), style: { marginLeft: 'auto', fontSize: '9px' } }, it.badge.label || it.badge) : null,
        );
        side.appendChild(item);
      }
    }
    return side;
  }

  // topNav({ emoji, title, liveStat, backHref, onLogout, onRocko })
  function topNav({ emoji = '', title = '', liveStat = '—', backHref = '/landing.html', onLogout, onRocko } = {}) {
    return el('header', { className: 'p-top' },
      el('a', { className: 'p-home', href: backHref }, '← Home'),
      el('div', { className: 'p-title' },
        el('span', { style: { marginRight: '8px' } }, emoji),
        title,
      ),
      el('div', { className: 'p-stat', id: 'p-live-stat' }, liveStat || '—'),
      button({ variant: 'ghost', size: 'sm', label: 'Log out', onClick: onLogout || (() => window.RBTR_logout && window.RBTR_logout()) }),
    );
  }

  // toast({ type, message, duration })
  let toastStack;
  function toast({ type = 'info', message, duration = 4000 } = {}) {
    if (!toastStack) {
      toastStack = el('div', { className: 'ds-toast-stack' });
      document.body.appendChild(toastStack);
    }
    const t = el('div', { className: 'ds-toast ' + type }, message || '');
    toastStack.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; }, duration - 300);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, duration);
    return t;
  }

  // modal({ title, body, primaryLabel, primaryAction, cancelLabel, onClose })
  function modal({ title, body, primaryLabel, primaryAction, cancelLabel = 'Cancel', onClose } = {}) {
    const close = () => { backdrop.remove(); if (onClose) onClose(); };
    const backdrop = el('div', { className: 'ds-modal-backdrop', onClick: (e) => { if (e.target === backdrop) close(); } });
    const primary = primaryAction
      ? button({ variant: 'primary', label: primaryLabel || 'OK', onClick: async () => { await primaryAction(); close(); } })
      : null;
    const cancel = button({ variant: 'ghost', label: cancelLabel, onClick: close });
    const dlg = el('div', { className: 'ds-modal' },
      title ? el('h3', { className: 'ds-h3' }, title) : null,
      typeof body === 'string' ? el('div', { html: body, className: 'text-muted' }) : body,
      el('div', { className: 'row', style: { marginTop: 'var(--space-5)', justifyContent: 'flex-end', gap: 'var(--space-3)' } },
        cancel, primary),
    );
    backdrop.appendChild(dlg);
    document.body.appendChild(backdrop);
    const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    return { close };
  }

  // rockoOrb({ onClick, unread })
  function rockoOrb({ onClick, unread = false } = {}) {
    return el('button', {
      className: 'ds-orb-fab' + (unread ? ' unread' : ''),
      title: unread ? 'ROCKO has something for you' : 'Talk to ROCKO',
      'aria-label': 'Open ROCKO chat',
      onClick: onClick || (() => {
        // Default: navigate to legacy ROCKO chat
        window.location.href = '/index.html#sec-dashboard';
      }),
    });
  }

  // ── Export on window ──────────────────────────────────────────────────────
  window.RBTR_Components = {
    el, escapeHtml,
    card, button, statCard, temperatureBadge,
    emptyState, badge, sidebarNav, topNav,
    toast, modal, rockoOrb,
  };
})();
