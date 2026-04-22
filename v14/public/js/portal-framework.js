// ═══════════════════════════════════════════════════════════════════════════
// Portal Framework · Phase 1.5
// Each portal page calls RBTR_Portal.mount(config) with its section list.
// Handles: auth guard integration, sidebar, top bar, inline section render,
// floating ROCKO orb, URL hash → section routing.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const C = window.RBTR_Components || null;
  if (!C) {
    console.error('[portal-framework] components.js must load before portal-framework.js');
    return;
  }

  const { el, sidebarNav, topNav, rockoOrb, toast } = C;

  /**
   * Portal config:
   * {
   *   id: 'psnm',
   *   name: 'PSNM',
   *   emoji: '🏭',
   *   tagline: 'Pallet operations. Atlas engine.',
   *   liveStatFetcher: async () => 'N/827 pallets',
   *   access: ['ben'],              // roles allowed (set on body data-portal too)
   *   sections: [
   *     { id, group, label, emoji, badge?, render: async () => HTMLElement, default?: true,
   *       iframeHash?: '#sec-xyz'   // optional: render as iframe of legacy instead
   *     }
   *   ],
   * }
   */

  async function mount(config) {
    if (!config || !config.id) { console.error('[portal-framework] invalid config'); return; }
    document.body.setAttribute('data-portal', config.id);
    document.title = config.name + ' · RBTR';

    // Wait for auth-ready event (auth-guard.js dispatches)
    await new Promise((resolve) => {
      if (window.RBTR_USER) return resolve();
      document.addEventListener('rbtr-auth-ready', () => resolve(), { once: true });
    });

    const root = document.getElementById('portal-root');
    if (!root) { console.error('[portal-framework] #portal-root missing'); return; }
    root.innerHTML = '';

    // Top bar
    const top = topNav({
      emoji: config.emoji, title: config.name,
      liveStat: '—',
      onLogout: () => window.RBTR_logout && window.RBTR_logout(),
    });
    root.appendChild(top);

    // Body grid: sidebar + main
    const body = el('div', { className: 'p-body' });

    // Sidebar
    const groups = groupSections(config.sections || []);
    const currentSectionId = (location.hash.replace(/^#/, '') || (config.sections.find(s => s.default) || config.sections[0] || {}).id);

    const sideMount = (cur) => {
      const newSide = sidebarNav({
        groups: groups.map(g => ({
          heading: g.heading,
          items: g.items.map(it => ({
            ...it,
            onClick: (item) => navigateTo(item.id),
          })),
        })),
        current: cur,
      });
      // Replace existing sidebar if present
      const old = body.querySelector('.p-side');
      if (old) old.replaceWith(newSide);
      else body.appendChild(newSide);
    };
    sideMount(currentSectionId);

    // Main area
    const main = el('main', { className: 'p-main' });
    main.appendChild(el('div', { className: 'p-hero' },
      el('h1', { className: 'ds-h1' }, config.emoji + ' ' + config.name),
      config.tagline ? el('p', {}, config.tagline) : null,
    ));
    const sectionHost = el('div', { id: 'p-section-host' });
    main.appendChild(sectionHost);
    body.appendChild(main);
    root.appendChild(body);

    // Floating ROCKO orb
    const orb = rockoOrb({ onClick: () => openRockoChat(config) });
    document.body.appendChild(orb);

    // Live stat
    if (config.liveStatFetcher) {
      config.liveStatFetcher().then(v => {
        const el = document.getElementById('p-live-stat');
        if (el && v != null) el.textContent = v;
      }).catch(() => {});
    }

    // Render initial section
    async function navigateTo(sectionId) {
      const section = (config.sections || []).find(s => s.id === sectionId) || (config.sections || [])[0];
      if (!section) return;
      // Update hash without reloading
      history.replaceState(null, '', '#' + section.id);
      sideMount(section.id);
      sectionHost.innerHTML = '';
      const loading = el('div', { className: 'ds-empty' }, el('div', { className: 'icon' }, '⏳'), el('div', { className: 'title' }, 'Loading…'));
      sectionHost.appendChild(loading);
      try {
        let content;
        if (section.iframeHash) {
          content = renderIframeEscape(section);
        } else if (typeof section.render === 'function') {
          content = await section.render();
        } else {
          content = el('div', { className: 'ds-empty' },
            el('div', { className: 'icon' }, '🔧'),
            el('div', { className: 'title' }, 'Coming soon'),
            el('div', { className: 'body' }, 'This section will render inline in the next portal pass. For now, use the legacy view below.'),
          );
        }
        sectionHost.innerHTML = '';
        const wrap = el('div', { className: 'p-section' });
        wrap.appendChild(content);
        sectionHost.appendChild(wrap);
      } catch (err) {
        console.error('[portal-framework] section render failed', err);
        sectionHost.innerHTML = '';
        sectionHost.appendChild(el('div', { className: 'ds-empty' },
          el('div', { className: 'icon' }, '⚠'),
          el('div', { className: 'title' }, 'Section failed to load'),
          el('div', { className: 'body' }, String(err.message || err).slice(0, 200)),
        ));
      }
    }

    // React to hash changes from user back/forward
    window.addEventListener('hashchange', () => {
      const id = location.hash.replace(/^#/, '');
      if (id) navigateTo(id);
    });

    navigateTo(currentSectionId);
  }

  function groupSections(sections) {
    const map = new Map();
    for (const s of sections) {
      const g = s.group || 'OTHER';
      if (!map.has(g)) map.set(g, { heading: g, items: [] });
      map.get(g).items.push(s);
    }
    return Array.from(map.values());
  }

  function renderIframeEscape(section) {
    const src = '/index.html' + (section.iframeHash || '');
    return el('div', { className: 'p-iframe-wrap' },
      el('div', { className: 'p-iframe-note' },
        '📎 Rendered from legacy Command Centre. ',
        el('a', { href: src, target: '_blank', style: { color: 'var(--text-primary)' } }, 'Open in new tab ↗'),
      ),
      el('iframe', { src, loading: 'lazy' }),
    );
  }

  // ── ROCKO chat overlay ────────────────────────────────────────────────────
  let rockoPanel = null;
  function openRockoChat(portalConfig) {
    if (rockoPanel) { rockoPanel.classList.add('open'); return; }
    rockoPanel = el('aside', {
      className: 'rocko-panel open',
      style: {
        position: 'fixed', top: '0', right: '0', bottom: '0',
        width: 'min(420px, 100vw)',
        background: 'var(--bg-tertiary)',
        borderLeft: '1px solid var(--border-default)',
        zIndex: 'var(--z-overlay)',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        transform: 'translateX(0)',
        transition: 'transform var(--transition-base)',
      }
    });
    const header = el('div', { className: 'row', style: { padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' } },
      el('div', { className: 'grow' },
        el('div', { style: { fontFamily: 'var(--font-body)', fontWeight: '700', letterSpacing: 'var(--track-wide)', textTransform: 'uppercase' } }, 'ROCKO'),
        el('div', { className: 'ds-caption' }, 'Context: ' + (portalConfig.name || 'unknown')),
      ),
      C.button({ variant: 'ghost', size: 'sm', label: 'Close', onClick: () => rockoPanel.classList.remove('open') }),
    );
    const scroll = el('div', { id: 'rocko-messages', style: { flex: '1', overflowY: 'auto', padding: 'var(--space-4)' } });
    const footer = el('div', { style: { padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--border-subtle)' } });
    const input = el('textarea', {
      className: 'ds-textarea',
      placeholder: 'Say something to ROCKO…',
      style: { minHeight: '60px', resize: 'vertical' },
      onKeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } },
    });
    const sendBtn = C.button({ variant: 'primary', size: 'sm', label: 'Send', onClick: () => send() });
    footer.appendChild(input);
    footer.appendChild(el('div', { className: 'row', style: { marginTop: 'var(--space-2)', justifyContent: 'flex-end' } }, sendBtn));

    rockoPanel.appendChild(header);
    rockoPanel.appendChild(scroll);
    rockoPanel.appendChild(footer);
    document.body.appendChild(rockoPanel);

    // Greeting
    addMsg('assistant', `👋 Hey — I'm with you on ${portalConfig.name}. What do you need?`);

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addMsg('user', text);
      const thinking = addMsg('assistant', '…', true);
      try {
        const r = await fetch('/api/jarvis', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            message: text,
            mode: 'auto',
            history: (window.RBTR_State?.get('rockoMessages') || []).slice(-10),
            context: { portal: portalConfig.id, name: portalConfig.name },
          }),
        });
        const j = await r.json();
        thinking.querySelector('.bubble').textContent = j.reply || '(no reply)';
        // persist last N messages
        const msgs = window.RBTR_State?.get('rockoMessages') || [];
        msgs.push({ role: 'user', content: text });
        msgs.push({ role: 'assistant', content: j.reply || '' });
        window.RBTR_State?.set('rockoMessages', msgs);
      } catch(err) {
        thinking.querySelector('.bubble').textContent = 'Network error: ' + (err.message || err);
      }
    }

    function addMsg(role, content, thinking = false) {
      const msg = el('div', {
        className: 'rocko-msg ' + role,
        style: {
          display: 'flex',
          flexDirection: role === 'user' ? 'row-reverse' : 'row',
          marginBottom: 'var(--space-3)',
        }
      },
        el('div', {
          className: 'bubble',
          style: {
            maxWidth: '85%',
            padding: 'var(--space-3) var(--space-4)',
            background: role === 'user' ? 'var(--text-primary)' : 'var(--bg-secondary)',
            color: role === 'user' ? 'var(--bg-primary)' : 'var(--text-primary)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-base)',
            whiteSpace: 'pre-wrap',
            opacity: thinking ? '0.6' : '1',
          }
        }, content)
      );
      scroll.appendChild(msg);
      scroll.scrollTop = scroll.scrollHeight;
      return msg;
    }
  }

  window.RBTR_Portal = { mount };
})();
