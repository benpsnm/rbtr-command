window.PSNM_WARM = (function(){
  const state = { tab: 'ww', filter: 'all', leads: [], preview: [] };

  const el  = id => document.getElementById(id);
  const esc = s  => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function computeEngagement(e){
    if (typeof e.engagement_score === 'number') return e.engagement_score;
    let s = 0;
    if (e.replied) s += 50;
    if (e.quote_sent) s += 20;
    return s;
  }
  function tempRank(t){ return ({hot:0, warm:1, cold:2, dead:3})[t] ?? 4; }
  function temperatureBadge(t){
    const map = {hot:'🔥 HOT', warm:'🌡 WARM', cold:'❄ COLD', dead:'☠ DEAD'};
    const col = {hot:'#4ade80', warm:'#fbbf24', cold:'#60a5fa', dead:'#6b7280'};
    return '<span style="color:'+(col[t]||'#6b7280')+';font-weight:700;font-size:10px;letter-spacing:1px">'+(map[t]||'—')+'</span>';
  }

  const PLACEHOLDER = {
    ww:     'Paste the WhichWarehouse weekly brief — subject line, enquiry list, whatever arrived in your inbox. ROCKO will pull out company names, contacts, pallets, dates.',
    quotes: 'Paste past quote emails — sent-folder threads, quote PDFs pasted as text, forwarded conversations. ROCKO extracts company, contact, quote amount, reply status.',
    manual: 'Type or paste any lead from memory — one per line or as a paragraph. Example: "Called Acme Logistics last week re 60 pallets, waiting on callback from John."'
  };
  const LABEL = {
    ww: 'WHICHWAREHOUSE WEEKLY BRIEF',
    quotes: 'PAST QUOTE EMAILS',
    manual: 'MANUAL LEAD ENTRY'
  };

  function tab(name){
    state.tab = name;
    document.querySelectorAll('#pw-import-tabs .tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-t') === name));
    const p = el('pw-import-panel');
    if (!p) return;
    p.innerHTML =
      '<label class="sl" style="font-size:11px;letter-spacing:1px">' + LABEL[name] + '</label>' +
      '<textarea id="pw-input" rows="8" placeholder="' + esc(PLACEHOLDER[name]) + '" style="width:100%;background:#0a0a0a;border:1px solid #1a1a1a;color:#e8e8e8;padding:12px;border-radius:6px;font-family:ui-monospace,monospace;font-size:12px;margin-top:6px;box-sizing:border-box"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">' +
        '<button class="btn pri" onclick="PSNM_WARM.extract()" id="pw-extract-btn">✨ Extract with ROCKO</button>' +
        '<button class="btn sm" onclick="PSNM_WARM.clearInput()">Clear</button>' +
        '<span class="sl" id="pw-extract-status" style="font-size:11px"></span>' +
      '</div>';
  }

  function clearInput(){
    const i = el('pw-input'); if (i) i.value = '';
    const p = el('pw-preview'); if (p){ p.style.display = 'none'; p.innerHTML = ''; }
    const s = el('pw-extract-status'); if (s) s.textContent = '';
  }

  async function extract(){
    const input = el('pw-input');
    const text = (input && input.value || '').trim();
    const status = el('pw-extract-status');
    if (text.length < 10){ if(status) status.textContent = 'Paste some text first.'; return; }
    const btn = el('pw-extract-btn');
    if (btn){ btn.disabled = true; btn.textContent = 'Extracting…'; }
    if (status) status.textContent = 'ROCKO is reading…';
    try {
      const r = await fetch('/api/extract-leads', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          kind: state.tab === 'ww' ? 'whichwarehouse' : state.tab === 'quotes' ? 'past_quotes' : 'manual_leads',
          text
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
      state.preview = Array.isArray(data.leads) ? data.leads : [];
      renderPreview();
      if (status) status.textContent = 'Found ' + state.preview.length + ' lead' + (state.preview.length === 1 ? '' : 's') + '. Review below.';
    } catch (e){
      console.error('[PSNM_WARM.extract]', e);
      if (status) status.textContent = 'Extraction failed: ' + e.message;
    } finally {
      if (btn){ btn.disabled = false; btn.textContent = '✨ Extract with ROCKO'; }
    }
  }

  function renderPreview(){
    const p = el('pw-preview');
    if (!p) return;
    if (!state.preview.length){ p.style.display = 'none'; p.innerHTML = ''; return; }
    p.style.display = 'block';
    const rows = state.preview.map((l, i) =>
      '<tr>' +
        '<td><input type="checkbox" ' + (l._skip ? '' : 'checked') + ' onchange="PSNM_WARM.togglePreview(' + i + ')"></td>' +
        '<td><input type="text" value="' + esc(l.company || '') + '" onchange="PSNM_WARM.editPreview(' + i + ',\'company\',this.value)" style="background:#0a0a0a;border:1px solid #1a1a1a;color:#e8e8e8;padding:4px 6px;border-radius:4px;min-width:140px;width:100%"></td>' +
        '<td style="font-size:11px">' + esc(l.contact_name || '—') + '</td>' +
        '<td style="font-size:11px;line-height:1.4">' + esc(l.contact_email || '') + (l.contact_email && l.contact_phone ? '<br>' : '') + esc(l.contact_phone || '') + '</td>' +
        '<td style="font-size:11px">' + esc(l.pallets_requested || '—') + '</td>' +
        '<td style="font-size:11px">' + esc(l.lead_source || '—') + '</td>' +
        '<td>' + temperatureBadge(l.temperature || 'warm') + '</td>' +
        '<td style="font-size:11px;color:#9ca3af">' + esc(l.notes || '') + '</td>' +
      '</tr>'
    ).join('');
    p.innerHTML =
      '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
          '<div class="ct" style="margin-bottom:0">PREVIEW — ' + state.preview.length + ' LEAD' + (state.preview.length === 1 ? '' : 'S') + ' READY</div>' +
          '<div style="display:flex;gap:6px">' +
            '<button class="btn sm" onclick="PSNM_WARM.discardPreview()">Discard</button>' +
            '<button class="btn pri" onclick="PSNM_WARM.importAll()">✓ Import checked</button>' +
          '</div>' +
        '</div>' +
        '<div style="overflow-x:auto"><table class="dt"><thead><tr><th>✓</th><th>Company</th><th>Contact</th><th>Email / Phone</th><th>Pallets</th><th>Source</th><th>Temp</th><th>Notes</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '</div>';
  }

  function togglePreview(i){ if (state.preview[i]) state.preview[i]._skip = !state.preview[i]._skip; }
  function editPreview(i, field, value){ if (state.preview[i]) state.preview[i][field] = value; }
  function discardPreview(){ state.preview = []; renderPreview(); const s = el('pw-extract-status'); if (s) s.textContent = ''; }

  function computePreImportScore(l){
    let s = 0;
    if (l.replied) s += 50;
    if (l.quote_sent) s += 20;
    if (l.source_date){
      const days = (Date.now() - new Date(l.source_date).getTime()) / 86400000;
      if (days < 7) s += 10;
      if (days > 30) s -= 20;
    }
    return s;
  }

  async function importAll(){
    const toImport = state.preview.filter(l => !l._skip && l.company);
    if (!toImport.length){ alert('Nothing to import (all unchecked or missing company).'); return; }
    const status = el('pw-extract-status');
    if (status) status.textContent = 'Importing ' + toImport.length + '…';

    let ok = 0, fail = 0;
    for (const l of toImport){
      try {
        const now = new Date().toISOString();
        const enquiryRow = {
          company: l.company,
          contact_name: l.contact_name || null,
          contact_email: l.contact_email || null,
          contact_phone: l.contact_phone || null,
          source: (state.tab === 'ww' ? 'web_form' : state.tab === 'quotes' ? 'email' : 'other'),
          pallets: l.pallets_requested || null,
          duration_weeks: l.duration_months ? (l.duration_months * 4) : null,
          status: 'new',
          lead_source: l.lead_source || (state.tab === 'ww' ? 'whichwarehouse' : state.tab === 'quotes' ? 'direct_email' : 'referral'),
          first_contact_at: l.source_date ? (l.source_date + 'T00:00:00Z') : now,
          last_contact_at: now,
          temperature: l.temperature || 'warm',
          replied: !!l.replied,
          quote_sent: !!l.quote_sent,
          quote_amount_gbp: l.quote_amount_gbp || null,
          engagement_score: computePreImportScore(l),
          notes: l.notes || null
        };

        const eR = await fetch('/api/supabase-proxy', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ table: 'psnm_enquiries', op: 'insert', row: enquiryRow })
        });
        const eData = await eR.json();
        if (!eR.ok){ console.warn('[import] enquiry insert failed', l.company, eData); fail++; continue; }
        const enquiryId = Array.isArray(eData) && eData[0] ? eData[0].id : null;

        if (l.quote_sent && l.quote_amount_gbp && enquiryId){
          await fetch('/api/supabase-proxy', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ table: 'psnm_quotes', op: 'insert', row: {
              enquiry_id: enquiryId,
              company: l.company,
              contact_name: l.contact_name || null,
              contact_email: l.contact_email || null,
              quote_date: (l.source_date || now.slice(0, 10)),
              pallets_quoted: l.pallets_requested || null,
              duration_months: l.duration_months || null,
              monthly_rate_gbp: l.quote_amount_gbp,
              total_quote_gbp: (l.quote_amount_gbp && l.duration_months) ? (l.quote_amount_gbp * l.duration_months) : null,
              status: l.replied ? 'replied' : 'sent',
              sent_via: 'email',
              notes: l.notes || null
            }})
          });
        }

        if (enquiryId){
          await fetch('/api/supabase-proxy', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ table: 'psnm_outreach_touches', op: 'insert', row: {
              enquiry_id: enquiryId,
              channel: state.tab === 'quotes' ? 'email' : (state.tab === 'ww' ? 'email' : 'phone'),
              direction: 'inbound',
              outcome: l.replied ? 'replied' : 'sent',
              notes: 'Imported via Phase 2.7 warm-ingest' + (l.notes ? ': ' + l.notes : ''),
              touched_at: now,
              replied_at: l.replied ? now : null
            }})
          });
        }

        ok++;
      } catch (e){
        console.error('[import row]', e);
        fail++;
      }
    }

    state.preview = [];
    renderPreview();
    if (status) status.textContent = 'Imported ' + ok + '.' + (fail ? ' Failed ' + fail + '. Check console.' : '');
    load();
  }

  async function load(){
    const list = el('pw-list');
    if (list) list.innerHTML = '<div class="card"><div class="sl">Loading…</div></div>';
    try {
      const [eR, qR, tR] = await Promise.all([
        fetch('/api/supabase-proxy', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({table:'psnm_enquiries', op:'select'})}),
        fetch('/api/supabase-proxy', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({table:'psnm_quotes',    op:'select'})}),
        fetch('/api/supabase-proxy', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({table:'psnm_outreach_touches', op:'select'})})
      ]);
      const enquiries = eR.ok ? await eR.json() : [];
      const quotes    = qR.ok ? await qR.json() : [];
      const touches   = tR.ok ? await tR.json() : [];
      state.leads = Array.isArray(enquiries) ? enquiries : [];

      const quotesByEnq = {}; (Array.isArray(quotes)?quotes:[]).forEach(q => { if (q.enquiry_id){ (quotesByEnq[q.enquiry_id] = quotesByEnq[q.enquiry_id] || []).push(q); } });
      const touchesByEnq = {}; (Array.isArray(touches)?touches:[]).forEach(t => { if (t.enquiry_id){ (touchesByEnq[t.enquiry_id] = touchesByEnq[t.enquiry_id] || []).push(t); } });
      state.leads.forEach(l => {
        l._quotes  = quotesByEnq[l.id]  || [];
        l._touches = touchesByEnq[l.id] || [];
        l._score   = computeEngagement(l);
      });

      state.leads.sort((a, b) => {
        const t = tempRank(a.temperature) - tempRank(b.temperature);
        if (t !== 0) return t;
        const s = (b._score || 0) - (a._score || 0);
        if (s !== 0) return s;
        return new Date(b.last_contact_at || 0) - new Date(a.last_contact_at || 0);
      });

      updateCounts();
      renderList();
    } catch (e){
      console.error('[PSNM_WARM.load]', e);
      if (list) list.innerHTML = '<div class="card"><div class="sl" style="color:#ef4444">Load failed: ' + esc(e.message) + '</div></div>';
    }
  }

  function updateCounts(){
    const c = { hot:0, warm:0, cold:0, dead:0, quotesPending:0 };
    state.leads.forEach(l => {
      c[l.temperature || 'warm'] = (c[l.temperature || 'warm'] || 0) + 1;
      if (l.quote_sent && !l.replied) c.quotesPending++;
    });
    ['hot','warm','cold','quotes'].forEach(k => {
      const id = 'pw-count-' + k;
      const val = k === 'quotes' ? c.quotesPending : c[k];
      if (el(id)) el(id).textContent = val;
    });
  }

  function filter(f){
    state.filter = f;
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('pri', b.getAttribute('data-filter') === f));
    renderList();
  }

  function renderList(){
    const list = el('pw-list');
    if (!list) return;
    const visible = state.leads.filter(l => state.filter === 'all' ? true : (l.temperature || 'warm') === state.filter);
    if (!visible.length){
      list.innerHTML = '<div class="card"><div class="sl">No leads matching filter. Paste a brief above, or switch the filter.</div></div>';
      return;
    }
    list.innerHTML = visible.map(l => {
      const phoneRaw = l.contact_phone ? String(l.contact_phone).replace(/\s+/g,'') : '';
      const waPhone  = phoneRaw.replace(/^\+/,'').replace(/^0/,'44');
      const daysSince = l.last_contact_at ? Math.floor((Date.now() - new Date(l.last_contact_at).getTime()) / 86400000) : null;
      const quoteLine = l._quotes && l._quotes.length ? ('£' + (l._quotes[0].monthly_rate_gbp || '?') + '/mo quoted ' + (l._quotes[0].quote_date || '')) : '';
      const context = [
        l.lead_source ? 'source: ' + l.lead_source : '',
        l.pallets ? (l.pallets + ' pallets') : '',
        quoteLine,
        (daysSince != null) ? ('last touch ' + daysSince + 'd ago') : '',
        l.replied ? 'replied ✓' : (l.quote_sent ? 'quote out, waiting' : '')
      ].filter(Boolean).join(' · ');

      return (
        '<div class="card" style="padding:14px" data-id="' + esc(l.id) + '">' +
          '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start">' +
            '<div style="flex:1;min-width:220px">' +
              '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px">' +
                temperatureBadge(l.temperature || 'warm') +
                '<div style="font-weight:700;font-size:15px">' + esc(l.company || '(unnamed)') + '</div>' +
                '<span class="sl" style="font-size:10px">score ' + (l._score || 0) + '</span>' +
              '</div>' +
              (l.contact_name ? '<div class="sl" style="font-size:12px">' + esc(l.contact_name) + (l.contact_email ? ' · ' + esc(l.contact_email) : '') + '</div>' : '') +
              (context ? '<div class="sl" style="font-size:11px;margin-top:4px;color:#9ca3af">' + esc(context) + '</div>' : '') +
              (l.notes  ? '<div style="font-size:11px;margin-top:6px;color:#e8e8e8;line-height:1.4">' + esc(l.notes) + '</div>' : '') +
            '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
              (phoneRaw      ? '<button class="btn sm pri" onclick="window.open(\'tel:' + esc(phoneRaw) + '\')">📞 Call</button>' : '') +
              (waPhone       ? '<button class="btn sm" onclick="window.open(\'https://wa.me/' + esc(waPhone) + '\',\'_blank\')">💬 WA</button>' : '') +
              (l.contact_email ? '<button class="btn sm" onclick="window.open(\'mailto:' + esc(l.contact_email) + '\')">✉ Mail</button>' : '') +
              '<button class="btn sm" onclick="PSNM_WARM.logOutcome(\'' + esc(l.id) + '\')">📝 Log</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  async function logOutcome(id){
    const lead = state.leads.find(l => l.id === id);
    if (!lead){ alert('Lead not found'); return; }
    const outcome = prompt(
      'Log outcome for ' + (lead.company || 'lead') + ':\n\n' +
      'Try: replied | quoted | callback | no-answer | dead\n\n' +
      'Or type a short note:',
      'replied'
    );
    if (!outcome) return;
    const now = new Date().toISOString();
    const updates = { last_contact_at: now };
    let newTemp = lead.temperature || 'warm';
    if (/replied/i.test(outcome))       { updates.replied = true;    newTemp = 'hot'; }
    if (/quote/i.test(outcome))         { updates.quote_sent = true; if (newTemp !== 'hot') newTemp = 'warm'; }
    if (/\bdead\b|gave up|not interested/i.test(outcome)) { newTemp = 'dead'; }
    if (newTemp !== lead.temperature) updates.temperature = newTemp;
    updates.engagement_score = (updates.replied || lead.replied ? 50 : 0) + (updates.quote_sent || lead.quote_sent ? 20 : 0) + 10;

    try {
      await fetch('/api/supabase-proxy', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ table: 'psnm_enquiries', op: 'update', match: { id }, row: updates })
      });
      await fetch('/api/supabase-proxy', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ table: 'psnm_outreach_touches', op: 'insert', row: {
          enquiry_id: id, channel: 'phone', direction: 'outbound',
          outcome: (/replied/i.test(outcome) ? 'replied' : /quote/i.test(outcome) ? 'sent' : /no.?answer/i.test(outcome) ? 'no_answer' : 'sent'),
          notes: outcome, touched_at: now,
          replied_at: updates.replied ? now : null
        }})
      });
      load();
    } catch (e){
      console.error('[logOutcome]', e);
      alert('Log failed: ' + e.message);
    }
  }

  return { tab, extract, clearInput, togglePreview, editPreview, discardPreview, importAll, load, filter, logOutcome };
})();
