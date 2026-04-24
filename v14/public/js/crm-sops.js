// Shared CRM + SOPs UI module — Phase 1.6 Workstream C+D
// Loaded on demand by any portal that shows contacts or SOPs.
// Exports: window.CRM_UI.renderContacts(entity), window.SOPS_UI.renderSops(entity)

(function() {
  const C = window.RBTR_Components;
  if (!C) { console.warn('crm-sops.js: RBTR_Components not loaded'); return; }

  function proxy(table, op, extra = {}) {
    return fetch('/api/supabase-proxy', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ table, op, ...extra })
    }).then(r => r.ok ? r.json() : []);
  }

  function el(tag, props = {}, ...children) { return C.el ? C.el(tag, props, ...children) : _el(tag, props, ...children); }
  function _el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (k === 'className') node.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else node[k] = v;
    });
    children.forEach(c => c instanceof HTMLElement ? node.appendChild(c) : c ? node.appendChild(document.createTextNode(String(c))) : null);
    return node;
  }

  // ── CRM ───────────────────────────────────────────────────────────────────

  async function renderContacts(entity) {
    const wrap = document.createElement('div');

    // Search bar
    const searchWrap = document.createElement('div');
    searchWrap.style.cssText = 'margin-bottom:16px';
    const searchIn = document.createElement('input');
    searchIn.type = 'text';
    searchIn.placeholder = 'Search contacts…';
    searchIn.style.cssText = 'width:100%;box-sizing:border-box;padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border-subtle);color:var(--text-primary);border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:var(--text-sm)';
    searchWrap.appendChild(searchIn);
    wrap.appendChild(searchWrap);

    let allContacts = [];
    let interactions = [];

    async function load() {
      try {
        allContacts = await proxy('contacts', 'select');
        if (!Array.isArray(allContacts)) allContacts = [];
        if (entity && entity !== 'all') {
          allContacts = allContacts.filter(c => Array.isArray(c.entities) && c.entities.includes(entity));
        }
      } catch(e) {}
      render(allContacts);
    }

    const listHost = document.createElement('div');
    wrap.appendChild(listHost);

    searchIn.addEventListener('input', () => {
      const q = searchIn.value.toLowerCase();
      const filtered = allContacts.filter(c =>
        (c.first_name || '').toLowerCase().includes(q) ||
        (c.last_name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q)
      );
      render(filtered);
    });

    function render(contacts) {
      listHost.innerHTML = '';
      if (!contacts.length) {
        listHost.appendChild(C.emptyState({ icon: '👤', title: 'No contacts', body: entity ? 'No contacts tagged for ' + entity + ' yet.' : 'No contacts yet.' }));
        return;
      }
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit, minmax(280px,1fr));gap:12px';
      contacts.forEach(contact => {
        const cCard = C.card({ children: document.createElement('div') });
        const cb = cCard.querySelector('div');

        const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '—';
        const nameEl = document.createElement('div');
        nameEl.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px';
        const nameLeft = document.createElement('div');
        const nameStrong = document.createElement('strong');
        nameStrong.textContent = name;
        nameLeft.appendChild(nameStrong);
        if (contact.company) {
          const compEl = document.createElement('div');
          compEl.style.cssText = 'font-size:var(--text-xs);color:var(--text-secondary)';
          compEl.textContent = contact.company;
          nameLeft.appendChild(compEl);
        }
        nameEl.appendChild(nameLeft);
        if (contact.relationship_type) {
          const badge = document.createElement('span');
          badge.style.cssText = 'display:inline-block;padding:2px 8px;border-radius:var(--radius-pill);font-size:10px;font-family:var(--font-mono);background:var(--bg-secondary);border:1px solid var(--border-subtle)';
          badge.textContent = contact.relationship_type.toUpperCase();
          nameEl.appendChild(badge);
        }
        cb.appendChild(nameEl);

        if (contact.phones && contact.phones.length) {
          const phone = contact.phones[0];
          const phoneEl = document.createElement('a');
          phoneEl.href = 'tel:' + phone;
          phoneEl.style.cssText = 'display:block;font-size:var(--text-sm);color:var(--text-primary);margin-bottom:4px;text-decoration:none';
          phoneEl.textContent = phone;
          cb.appendChild(phoneEl);
        }
        if (contact.emails && contact.emails.length) {
          const emailEl = document.createElement('a');
          emailEl.href = 'mailto:' + contact.emails[0];
          emailEl.style.cssText = 'display:block;font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:8px;text-decoration:none';
          emailEl.textContent = contact.emails[0];
          cb.appendChild(emailEl);
        }
        if (contact.notes) {
          const notesEl = document.createElement('p');
          notesEl.style.cssText = 'font-size:var(--text-xs);color:var(--text-secondary);margin:0 0 8px';
          notesEl.textContent = contact.notes.length > 120 ? contact.notes.slice(0, 120) + '…' : contact.notes;
          cb.appendChild(notesEl);
        }
        if (contact.last_contact_at) {
          const lastEl = document.createElement('div');
          lastEl.style.cssText = 'font-size:10px;color:var(--text-secondary);font-family:var(--font-mono)';
          lastEl.textContent = 'Last contact: ' + new Date(contact.last_contact_at).toLocaleDateString('en-GB');
          cb.appendChild(lastEl);
        }

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;margin-top:8px';
        const logBtn = C.button({ label: 'Log interaction', size: 'sm', onClick: async () => {
          const type = prompt('Interaction type (call/email/meeting/text/whatsapp/note):');
          if (!type) return;
          const summary = prompt('Brief summary:');
          if (!summary) return;
          const record = { contact_id: contact.id, interaction_type: type, direction: 'out', summary };
          try {
            await proxy('contact_interactions', 'insert', { record });
            await proxy('contacts', 'update', {
              filters: [{ column: 'id', op: 'eq', value: contact.id }],
              updates: { last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            });
            contact.last_contact_at = new Date().toISOString();
            C.toast({ message: 'Interaction logged', type: 'success' });
          } catch(e) { C.toast({ message: 'Log failed', type: 'error' }); }
        }});
        actions.appendChild(logBtn);
        cb.appendChild(actions);
        grid.appendChild(cCard);
      });
      listHost.appendChild(grid);
    }

    // Add contact form
    const addCard = C.card({ children: document.createElement('div') });
    const ab = addCard.querySelector('div');
    const addTitle = document.createElement('div');
    addTitle.className = 'ds-caption';
    addTitle.style.marginBottom = '12px';
    addTitle.textContent = 'ADD CONTACT';
    ab.appendChild(addTitle);

    function makeInput(ph, type = 'text') {
      const i = document.createElement('input');
      i.type = type; i.placeholder = ph;
      i.style.cssText = 'flex:1;min-width:120px;padding:8px;background:var(--bg-secondary);border:1px solid var(--border-subtle);color:var(--text-primary);border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:var(--text-sm)';
      return i;
    }
    const fnIn = makeInput('First name');
    const lnIn = makeInput('Last name');
    const coIn = makeInput('Company');
    const phoneIn = makeInput('Phone', 'tel');
    const emailIn = makeInput('Email', 'email');
    const relIn = document.createElement('select');
    relIn.style.cssText = 'flex:1;min-width:100px;padding:8px;background:var(--bg-secondary);border:1px solid var(--border-subtle);color:var(--text-primary);border-radius:var(--radius-sm)';
    ['customer','prospect','supplier','trade','mentor','friend','family','medical','vet','school','legal','accountant','advisor'].forEach(t => {
      const opt = document.createElement('option'); opt.value = t; opt.textContent = t; relIn.appendChild(opt);
    });
    const notesIn = makeInput('Notes (optional)');

    function makeRow(...inputs) {
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap';
      inputs.forEach(i => r.appendChild(i));
      return r;
    }
    ab.appendChild(makeRow(fnIn, lnIn, coIn));
    ab.appendChild(makeRow(phoneIn, emailIn, relIn));
    ab.appendChild(makeRow(notesIn));
    const saveBtn = C.button({ label: 'Add contact', onClick: async () => {
      if (!fnIn.value) { C.toast({ message: 'Enter first name', type: 'error' }); return; }
      const record = {
        first_name: fnIn.value,
        last_name: lnIn.value || null,
        company: coIn.value || null,
        phones: phoneIn.value ? [phoneIn.value] : [],
        emails: emailIn.value ? [emailIn.value] : [],
        relationship_type: relIn.value,
        entities: entity ? [entity] : [],
        notes: notesIn.value || null,
      };
      try {
        await proxy('contacts', 'insert', { record });
        allContacts.unshift({ ...record, id: 'tmp-' + Date.now() });
        render(allContacts);
        [fnIn, lnIn, coIn, phoneIn, emailIn, notesIn].forEach(i => { i.value = ''; });
        C.toast({ message: 'Contact added', type: 'success' });
      } catch(e) { C.toast({ message: 'Save failed', type: 'error' }); }
    }});
    ab.appendChild(saveBtn);
    wrap.appendChild(addCard);

    await load();
    return wrap;
  }

  // ── SOPs ──────────────────────────────────────────────────────────────────

  async function renderSops(entity) {
    const wrap = document.createElement('div');
    let sops = [];
    try {
      sops = await proxy('sops', 'select', { filters: [{ column: 'entity', op: 'eq', value: entity }], order: { column: 'category' } });
    } catch(e) {}
    if (!Array.isArray(sops)) sops = [];

    if (!sops.length) {
      wrap.appendChild(C.emptyState({ icon: '📋', title: 'No SOPs yet', body: 'Run migration 34_sops.sql to seed 16 SOPs across PSNM/House/Eternal/Ben.' }));
      return wrap;
    }

    // Filter tabs by frequency
    const frequencies = ['all', ...new Set(sops.map(s => s.frequency).filter(Boolean))];
    let activeFreq = 'all';

    const filterBar = document.createElement('div');
    filterBar.style.cssText = 'display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap';
    frequencies.forEach(f => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = f === 'all' ? 'All' : f.replace('_',' ');
      btn.style.cssText = 'padding:4px 10px;border:1px solid var(--border-subtle);background:' + (f === 'all' ? 'var(--text-primary)' : 'transparent') + ';color:' + (f === 'all' ? 'var(--bg-primary)' : 'var(--text-secondary)') + ';cursor:pointer;border-radius:var(--radius-pill);font-size:var(--text-xs);font-family:var(--font-mono)';
      btn.addEventListener('click', () => {
        activeFreq = f;
        filterBar.querySelectorAll('button').forEach(b => {
          b.style.background = 'transparent'; b.style.color = 'var(--text-secondary)'; b.style.borderColor = 'var(--border-subtle)';
        });
        btn.style.background = 'var(--text-primary)'; btn.style.color = 'var(--bg-primary)';
        renderSopList();
      });
      filterBar.appendChild(btn);
    });
    wrap.appendChild(filterBar);

    const sopListHost = document.createElement('div');
    wrap.appendChild(sopListHost);

    function renderSopList() {
      sopListHost.innerHTML = '';
      const filtered = activeFreq === 'all' ? sops : sops.filter(s => s.frequency === activeFreq);
      filtered.forEach(sop => {
        const steps = Array.isArray(sop.steps) ? sop.steps : (typeof sop.steps === 'string' ? JSON.parse(sop.steps || '[]') : []);
        const items = sop.required_items || [];
        const c = C.card({ children: document.createElement('div') });
        const cb = c.querySelector('div');

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px';
        const left = document.createElement('div');
        const title = document.createElement('strong');
        title.style.fontSize = 'var(--text-sm)';
        title.textContent = sop.title;
        left.appendChild(title);
        if (sop.description) {
          const desc = document.createElement('p');
          desc.style.cssText = 'font-size:var(--text-xs);color:var(--text-secondary);margin:4px 0 0';
          desc.textContent = sop.description;
          left.appendChild(desc);
        }
        header.appendChild(left);
        const rightDiv = document.createElement('div');
        if (sop.frequency) {
          const badge = document.createElement('span');
          badge.style.cssText = 'display:inline-block;padding:2px 8px;border-radius:var(--radius-pill);font-size:10px;font-family:var(--font-mono);border:1px solid var(--border-subtle);color:var(--text-secondary);white-space:nowrap';
          badge.textContent = sop.frequency.replace('_',' ').toUpperCase();
          rightDiv.appendChild(badge);
        }
        header.appendChild(rightDiv);
        cb.appendChild(header);

        if (steps.length) {
          const stepsInfo = document.createElement('div');
          stepsInfo.style.cssText = 'font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:8px';
          const totalMins = steps.reduce((a, s) => a + (s.estimated_mins || 0), 0);
          stepsInfo.textContent = steps.length + ' steps · ~' + totalMins + ' min';
          cb.appendChild(stepsInfo);
        }

        const runBtn = C.button({ label: '▶ Run SOP', onClick: () => runSop(sop, steps) });
        cb.appendChild(runBtn);
        sopListHost.appendChild(c);
      });
    }

    function runSop(sop, steps) {
      // Create execution modal/overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--bg-primary);z-index:9999;overflow-y:auto;padding:24px';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;position:sticky;top:0;background:var(--bg-primary);padding-bottom:16px;border-bottom:1px solid var(--border-subtle)';
      const titleEl = document.createElement('div');
      const titleMain = document.createElement('h2');
      titleMain.style.cssText = 'margin:0;font-size:var(--text-lg)';
      titleMain.textContent = sop.title;
      titleEl.appendChild(titleMain);
      const timerEl = document.createElement('div');
      timerEl.style.cssText = 'font-family:var(--font-mono);font-size:var(--text-sm);color:var(--text-secondary);margin-top:4px';
      timerEl.textContent = '00:00';
      titleEl.appendChild(timerEl);
      header.appendChild(titleEl);

      const closeBtn = C.button({ label: 'Close', variant: 'secondary', onClick: () => {
        overlay.remove();
        clearInterval(timerInterval);
      }});
      header.appendChild(closeBtn);
      overlay.appendChild(header);

      // Timer
      const startTime = Date.now();
      const timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2,'0');
        const s = (elapsed % 60).toString().padStart(2,'0');
        timerEl.textContent = m + ':' + s;
      }, 1000);

      let completedSteps = [];

      // Steps
      steps.forEach((step, i) => {
        const stepEl = document.createElement('div');
        stepEl.style.cssText = 'padding:16px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);margin-bottom:12px';
        stepEl.id = 'sop-step-' + i;

        const stepHeader = document.createElement('div');
        stepHeader.style.cssText = 'display:flex;align-items:flex-start;gap:12px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.style.cssText = 'margin-top:3px;width:18px;height:18px;flex-shrink:0;accent-color:var(--text-primary);cursor:pointer';
        const stepContent = document.createElement('div');
        stepContent.style.flex = '1';
        const stepTitle = document.createElement('strong');
        stepTitle.style.cssText = 'font-size:var(--text-sm);display:block;margin-bottom:4px';
        stepTitle.textContent = 'Step ' + step.step_number + ': ' + step.action;
        const stepDetail = document.createElement('p');
        stepDetail.style.cssText = 'font-size:var(--text-sm);color:var(--text-secondary);margin:0 0 8px';
        stepDetail.textContent = step.detail;
        stepContent.appendChild(stepTitle);
        stepContent.appendChild(stepDetail);
        if (step.estimated_mins) {
          const mins = document.createElement('span');
          mins.style.cssText = 'font-size:10px;color:var(--text-secondary);font-family:var(--font-mono)';
          mins.textContent = '~' + step.estimated_mins + ' min';
          stepContent.appendChild(mins);
        }
        cb.addEventListener('change', () => {
          stepEl.style.opacity = cb.checked ? '.5' : '1';
          if (cb.checked) completedSteps.push(i);
          else completedSteps = completedSteps.filter(s => s !== i);
        });
        stepHeader.appendChild(cb);
        stepHeader.appendChild(stepContent);
        stepEl.appendChild(stepHeader);
        overlay.appendChild(stepEl);
      });

      // Complete SOP button
      const completeBtn = C.button({ label: 'Complete SOP', onClick: async () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const issues = prompt('Any issues encountered? (leave blank if none)');
        const record = {
          sop_id: sop.id,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          steps_completed: completedSteps,
          issues_encountered: issues || null,
        };
        try {
          await proxy('sop_executions', 'insert', { record });
          C.toast({ message: sop.title + ' completed', type: 'success' });
          overlay.remove();
          clearInterval(timerInterval);
        } catch(e) { C.toast({ message: 'Save failed', type: 'error' }); }
      }});
      completeBtn.style.marginTop = '16px';
      overlay.appendChild(completeBtn);
      document.body.appendChild(overlay);
    }

    renderSopList();
    return wrap;
  }

  // ── History tab for SOPs ─────────────────────────────────────────────────

  async function renderSopHistory(entity) {
    const wrap = document.createElement('div');
    let executions = [];
    let sops = [];
    try {
      [executions, sops] = await Promise.all([
        proxy('sop_executions', 'select', { order: { column: 'started_at', ascending: false }, limit: 30 }),
        proxy('sops', 'select', { filters: [{ column: 'entity', op: 'eq', value: entity }] }),
      ]);
    } catch(e) {}

    if (!Array.isArray(executions) || !executions.length) {
      wrap.appendChild(C.emptyState({ icon: '📋', title: 'No executions yet', body: 'Run a SOP to see history here.' }));
      return wrap;
    }

    const sopMap = {};
    if (Array.isArray(sops)) sops.forEach(s => { sopMap[s.id] = s; });

    const entityExecs = executions.filter(e => {
      const sop = sopMap[e.sop_id];
      return sop && sop.entity === entity;
    });

    if (!entityExecs.length) {
      wrap.appendChild(C.emptyState({ icon: '📋', title: 'No executions for ' + entity, body: 'Run a SOP above to start building history.' }));
      return wrap;
    }

    const t = document.createElement('table');
    t.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--text-sm)';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['SOP','Started','Duration','Steps done','Issues'].forEach(h => {
      const th = document.createElement('th');
      th.style.cssText = 'text-align:left;padding:8px;border-bottom:1px solid var(--border-subtle);font-size:var(--text-xs);color:var(--text-secondary);text-transform:uppercase';
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    t.appendChild(thead);

    const tbody = document.createElement('tbody');
    entityExecs.forEach(e => {
      const sop = sopMap[e.sop_id] || {};
      const duration = e.completed_at && e.started_at ? Math.round((new Date(e.completed_at) - new Date(e.started_at)) / 60000) + 'min' : '—';
      const stepsCount = Array.isArray(e.steps_completed) ? e.steps_completed.length : '—';
      const tr = document.createElement('tr');
      [
        sop.title || '—',
        e.started_at ? new Date(e.started_at).toLocaleDateString('en-GB') : '—',
        duration,
        String(stepsCount),
        e.issues_encountered || '—',
      ].forEach((val, i) => {
        const td = document.createElement('td');
        td.style.cssText = 'padding:8px;border-bottom:1px solid var(--border-subtle);' + (i >= 2 ? 'font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-secondary)' : '');
        td.textContent = val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    wrap.appendChild(t);
    return wrap;
  }

  // Full SOP section (list + history tabs)
  async function renderSopSection(entity) {
    const wrap = document.createElement('div');
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:4px;margin-bottom:16px';
    const bodies = [document.createElement('div'), document.createElement('div')];
    bodies[1].style.display = 'none';
    let loaded = [false, false];

    async function activate(i) {
      tabBar.querySelectorAll('button').forEach((b, j) => {
        b.style.background = j === i ? 'var(--text-primary)' : 'transparent';
        b.style.color = j === i ? 'var(--bg-primary)' : 'var(--text-secondary)';
      });
      bodies.forEach((b, j) => { b.style.display = j === i ? '' : 'none'; });
      if (!loaded[i]) {
        loaded[i] = true;
        const fn = i === 0 ? renderSops : renderSopHistory;
        bodies[i].appendChild(await fn(entity));
      }
    }

    ['SOPs', 'History'].forEach((label, i) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = label;
      btn.style.cssText = 'padding:4px 12px;border:1px solid var(--border-subtle);cursor:pointer;border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:var(--text-sm);background:transparent;color:var(--text-secondary)';
      btn.addEventListener('click', () => activate(i));
      tabBar.appendChild(btn);
    });
    wrap.appendChild(tabBar);
    bodies.forEach(b => wrap.appendChild(b));
    await activate(0);
    return wrap;
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  window.CRM_UI = { renderContacts };
  window.SOPS_UI = { renderSops, renderSopSection };
})();
