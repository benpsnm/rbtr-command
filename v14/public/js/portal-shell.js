// Phase 2.6 WS3 · portal shell renderer.
// Each portal page sets window.PORTAL_CONFIG before loading this script:
//   { key, title, emoji, liveStat, sidebarGroups: [{heading, items: [{label, hash, path?}]}] }
// hash → deep-links back to legacy Command Centre at /#<hash>
// path → if present, links to a new portal-local page
(function(){
  const cfg = window.PORTAL_CONFIG;
  if (!cfg) { console.error('[portal-shell] PORTAL_CONFIG missing'); return; }
  document.body.setAttribute('data-portal', cfg.key);
  document.title = cfg.title + ' · RBTR';

  function h(tag, attrs={}, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v);
    });
    children.forEach(c => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  }

  function render() {
    const root = document.getElementById('portal-root');
    if (!root) return;

    // Top nav
    const topNav = h('div', { className: 'p-top' });
    topNav.appendChild(h('a', { className: 'p-home', href: '/' }, '← Home'));
    topNav.appendChild(h('div', { className: 'p-title' }, cfg.emoji + ' ' + cfg.title));
    const stat = h('div', { className: 'p-stat', id: 'p-live-stat' }, cfg.liveStat || '—');
    topNav.appendChild(stat);
    topNav.appendChild(h('button', { className: 'p-logout', onclick: 'window.RBTR_logout && window.RBTR_logout()' }, 'Log out'));

    // Sidebar
    const sidebar = h('aside', { className: 'p-side' });
    (cfg.sidebarGroups || []).forEach(group => {
      sidebar.appendChild(h('div', { className: 'p-group' }, group.heading));
      group.items.forEach(item => {
        const href = item.path || ('/index.html#' + (item.hash || ''));
        sidebar.appendChild(h('a', { className: 'p-item', href }, item.label));
      });
    });

    // Main content area (empty — portals fill at deep-link navigation time)
    const content = h('main', { className: 'p-main' });
    content.appendChild(h('div', { className: 'p-hero', html:
      `<h1 style="font-family:Ultra,Impact,sans-serif;font-size:36px;letter-spacing:4px;margin:0 0 8px">${cfg.emoji} ${cfg.title}</h1>
       <p style="color:#8a8a8a;margin:0 0 20px">${cfg.tagline || ''}</p>
       <div class="p-tiles" id="p-tiles"></div>`
    }));

    root.appendChild(topNav);
    const body = h('div', { className: 'p-body' });
    body.appendChild(sidebar);
    body.appendChild(content);
    root.appendChild(body);

    // Render sidebar items as clickable tile grid on landing (hero)
    const tiles = document.getElementById('p-tiles');
    if (tiles) {
      const allItems = (cfg.sidebarGroups || []).flatMap(g => g.items.map(i => ({ ...i, group: g.heading })));
      tiles.innerHTML = allItems.slice(0, 24).map(i => {
        const href = i.path || ('/index.html#' + (i.hash || ''));
        return `<a class="p-tile" href="${href}">
          <div class="p-tile-group">${i.group}</div>
          <div class="p-tile-label">${i.label}</div>
        </a>`;
      }).join('');
    }
  }

  document.addEventListener('rbtr-auth-ready', e => {
    render();
    // Per-portal live stat from /api/briefing-data
    if (cfg.liveStatFetcher) {
      cfg.liveStatFetcher().then(val => {
        const el = document.getElementById('p-live-stat');
        if (el && val) el.textContent = val;
      }).catch(() => {});
    }
  });
})();
