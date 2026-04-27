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
   *   liveStatFetcher: async () => 'N/912 pallets',
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
    // Notification bell
    const bellBtn = buildNotifBell();
    top.appendChild(bellBtn);
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

  // ── Notification bell + drawer ────────────────────────────────────────────
  let notifDrawer = null;
  let notifDrawerOpen = false;

  async function fetchNotifications() {
    try {
      const r = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'notifications', op: 'select', order: 'created_at.desc', limit: 20 }),
      });
      return r.ok ? (await r.json()) : [];
    } catch { return []; }
  }

  async function markRead(id) {
    await fetch('/api/supabase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'notifications', op: 'update', match: { id }, data: { read_at: new Date().toISOString() } }),
    });
  }

  async function markAllRead() {
    const notifs = await fetchNotifications();
    const unread = notifs.filter(n => !n.read_at);
    await Promise.all(unread.map(n => markRead(n.id)));
  }

  const SEVERITY_STYLE = {
    critical: { border: '#ff4444', dot: '#ff4444' },
    high:     { border: '#ff8800', dot: '#ff8800' },
    normal:   { border: 'var(--border-default)', dot: 'var(--text-secondary)' },
    low:      { border: 'var(--border-subtle)', dot: 'var(--text-muted)' },
  };

  function relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function buildNotifDrawerContent(notifs) {
    const list = el('div', { style: { flex: '1', overflowY: 'auto', padding: 'var(--space-3)' } });
    if (!notifs || notifs.length === 0) {
      list.appendChild(el('div', { style: { textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' } }, 'No notifications'));
      return list;
    }
    for (const n of notifs) {
      const sev = SEVERITY_STYLE[n.severity] || SEVERITY_STYLE.normal;
      const isUnread = !n.read_at;
      const item = el('div', {
        style: {
          padding: 'var(--space-3)',
          marginBottom: 'var(--space-2)',
          background: isUnread ? 'var(--bg-secondary)' : 'transparent',
          border: `1px solid ${sev.border}`,
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          position: 'relative',
        },
        onClick: async () => {
          if (isUnread) {
            await markRead(n.id);
            item.style.background = 'transparent';
            item.querySelector('.notif-dot')?.remove();
          }
          if (n.data?.portal_section) location.hash = n.data.portal_section;
        },
      });
      if (isUnread) {
        const dot = el('span', { className: 'notif-dot', style: { position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: sev.dot } });
        item.appendChild(dot);
      }
      item.appendChild(el('div', { style: { fontSize: 'var(--text-sm)', fontWeight: '600', marginBottom: '2px', paddingRight: 'var(--space-4)' } }, n.title || n.type));
      if (n.body) item.appendChild(el('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: '1.4' } }, n.body));
      item.appendChild(el('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' } }, relativeTime(n.created_at)));
      list.appendChild(item);
    }
    return list;
  }

  function buildNotifBell() {
    const badge = el('span', {
      id: 'notif-badge',
      style: {
        display: 'none', position: 'absolute', top: '-4px', right: '-4px',
        background: '#ff4444', color: '#fff', borderRadius: '50%',
        width: '16px', height: '16px', fontSize: '10px', lineHeight: '16px',
        textAlign: 'center', fontFamily: 'var(--font-mono)', pointerEvents: 'none',
      },
    }, '0');

    const bellWrap = el('div', {
      style: { position: 'relative', display: 'inline-flex', marginLeft: 'var(--space-2)' },
    });

    const bellBtn = el('button', {
      id: 'notif-bell',
      style: {
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-primary)', fontSize: '18px', padding: '4px 8px',
        lineHeight: '1',
      },
      onClick: () => toggleNotifDrawer(),
    }, '🔔');

    bellWrap.appendChild(bellBtn);
    bellWrap.appendChild(badge);

    async function refreshBadge() {
      try {
        const notifs = await fetchNotifications();
        const unread = (notifs || []).filter(n => !n.read_at).length;
        badge.style.display = unread > 0 ? 'block' : 'none';
        badge.textContent = unread > 9 ? '9+' : String(unread);
      } catch {}
    }
    refreshBadge();
    setInterval(refreshBadge, 60000);
    window._refreshNotifBadge = refreshBadge;

    return bellWrap;
  }

  async function toggleNotifDrawer() {
    if (notifDrawer) {
      notifDrawerOpen = !notifDrawerOpen;
      notifDrawer.style.transform = notifDrawerOpen ? 'translateX(0)' : 'translateX(100%)';
      if (notifDrawerOpen) renderNotifList();
      return;
    }

    notifDrawer = el('aside', {
      id: 'notif-drawer',
      style: {
        position: 'fixed', top: '0', right: '0', bottom: '0',
        width: 'min(360px, 100vw)',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-default)',
        zIndex: 'var(--z-overlay, 1000)',
        display: 'flex', flexDirection: 'column',
        transform: 'translateX(0)',
        transition: 'transform var(--transition-base, 0.2s)',
        boxShadow: 'var(--shadow-xl, -4px 0 24px rgba(0,0,0,0.5))',
      },
    });

    const drawerHeader = el('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)',
      },
    },
      el('div', { style: { fontFamily: 'var(--font-mono)', fontWeight: '700', letterSpacing: 'var(--track-wide)', textTransform: 'uppercase', fontSize: 'var(--text-sm)' } }, '🔔 Notifications'),
      el('div', { style: { display: 'flex', gap: 'var(--space-2)' } },
        el('button', {
          style: { background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' },
          onClick: async () => { await markAllRead(); await renderNotifList(); if (window._refreshNotifBadge) window._refreshNotifBadge(); },
        }, 'Mark all read'),
        el('button', {
          style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px', padding: '4px' },
          onClick: () => toggleNotifDrawer(),
        }, '×'),
      ),
    );

    const listHost = el('div', { id: 'notif-list-host', style: { flex: '1', overflowY: 'auto' } });

    notifDrawer.appendChild(drawerHeader);
    notifDrawer.appendChild(listHost);
    document.body.appendChild(notifDrawer);

    notifDrawerOpen = true;

    async function renderNotifList() {
      listHost.innerHTML = '';
      listHost.appendChild(el('div', { style: { padding: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' } }, 'Loading…'));
      const notifs = await fetchNotifications();
      listHost.innerHTML = '';
      listHost.appendChild(buildNotifDrawerContent(notifs));
      if (window._refreshNotifBadge) window._refreshNotifBadge();
    }
    notifDrawer.renderNotifList = renderNotifList;

    renderNotifList();
  }

  async function renderNotifList() {
    if (!notifDrawer) return;
    if (notifDrawer.renderNotifList) await notifDrawer.renderNotifList();
  }

  window.RBTR_Portal = { mount };
})();
