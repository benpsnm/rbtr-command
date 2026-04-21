// ═══════════════════════════════════════════════════════════════════════════
// RBTR Command Centre · SMOKE TEST (automated)
//
// Paste this into the DevTools console on https://rbtr-jarvis.vercel.app
// It navigates every section, catches console errors, tests API endpoints,
// and prints a results table.
//
// ~60 seconds.
// ═══════════════════════════════════════════════════════════════════════════

(async () => {
  const START = performance.now();
  const errors = window.__jsErrors = window.__jsErrors || [];
  const origError = window.onerror;
  window.onerror = function(m, f, l, c, e) { errors.push({m, f, l, c, type:'onerror'}); return false; };

  const origConsoleError = console.error;
  const consoleErrs = [];
  console.error = function(...args) { consoleErrs.push(args.map(a => a?.message || String(a)).join(' ')); return origConsoleError.apply(this, args); };

  const SECTIONS = [
    // [group, id, label]
    ['Assistant','today','Today'],                 ['Assistant','goals','Goals & Wins'],
    ['Assistant','dojo','Learning Dojo'],          ['Assistant','bestself','Best-Self Protocol'],
    ['Assistant','signals','Live Signals'],        ['Assistant','registry','Tool Registry'],
    ['Assistant','jarvischat','ROCKO Chat'],
    ['Command','dashboard','Dashboard'],           ['Command','dailybrief','Daily Briefing'],
    ['Command','wins','Wins Tracker'],             ['Command','countdown','Countdown'],
    ['Command','colab','Co-Lab Debt'],             ['Command','gates','Three Gates'],
    ['Command','moneymeeting','Money Meeting'],    ['Command','aminedecisions','Amine Framework'],
    ['Command','contentoverride','Content Override'],
    ['Life','routine','Daily Routine'],            ['Life','training','Training Plan'],
    ['Life','nutrition','Nutrition'],              ['Life','relationship','Ben & Sarah'],
    ['Life','mindset','Mindset & Mood'],
    ['Launch','firstvideo','First Video'],         ['Launch','channel','Channel Transition'],
    ['Launch','custemer-emails','Customer Emails'],
    ['Expedition','route','Route & Map'],          ['Expedition','build','Arocs Build'],
    ['Expedition','gear','Camera Gear'],           ['Expedition','skills','Skills Tracker'],
    ['Business','finance','Cash Flow'],            ['Business','budget','Budget Tracker'],
    ['Business','psnm','Pallet Storage'],          ['Business','eternal','Eternal Kustoms'],
    ['Business','airbnb','AirBnB'],                ['Business','coffee','Coffee Brothers'],
    ['Business','sponsors','Sponsors'],            ['Business','crm','Contacts CRM'],
    ['Business','merch','Merch'],                  ['Business','subscribers','Subscribers'],
    ['Content','scheduler','Social Scheduler'],    ['Content','broll','B-Roll Extraction'],
    ['Content','deploy','Deploy'],                 ['Content','media','Media Vault'],
    ['Content','social','Social Pages'],           ['Content','mediaplan','Media Plan'],
    ['Content','podcast','Nate Podcasts'],         ['Content','guests','Guest List'],
    ['Content','editing','Editing Tools'],
    ['Prep','predeparture','Pre-Departure'],       ['Prep','documents','Document Tracker'],
    ['Prep','visas','Visas'],                      ['Prep','vaccines','Vaccinations'],
    ['Prep','itinerary','Full Itinerary'],         ['Prep','livemap','Route Map'],
    ['Planning','planner','Planner'],              ['Planning','calendar','Calendar'],
    ['Planning','house','House Jobs'],             ['Planning','tasks','Tasks'],
    ['Planning','notes','Notes'],
    ['Sarah','sarah','Sarah\'s Hub'],
    ['Setup','jobs','Job Roles'],                  ['Setup','settings','Settings'],
    ['STR','str-s1','Listing Copy'],               ['STR','str-s2','Revenue Calculator'],
    ['STR','str-s3','SOPs & Checklists'],          ['STR','str-s4','Social Generator'],
    ['STR','str-s5','Review Management'],          ['STR','str-s6','Photography Guide'],
    ['STR','str-s7','Costs & Valuation'],          ['STR','str-s8','Booking Calendar'],
    ['STR','str-s9','Suppliers'],                  ['STR','str-s10','Social Strategy'],
  ];

  const results = [];

  // 1) Navigation test — walk every section
  for (const [group, id, label] of SECTIONS) {
    const before = consoleErrs.length;
    let pass = true, reason = '';
    try {
      if (typeof window.show !== 'function') { pass = false; reason = 'show() missing'; }
      else window.show(id);
      await new Promise(r => setTimeout(r, 60));
      const sec = document.getElementById('sec-' + id) || document.getElementById(id);
      if (!sec) { pass = false; reason = 'section DOM missing'; }
      else if (!sec.classList.contains('active')) { pass = false; reason = 'not active after show()'; }
      else if (sec.offsetHeight < 10) { pass = false; reason = 'renders with 0 height'; }
    } catch (e) {
      pass = false; reason = 'exception: ' + e.message;
    }
    const errsDuring = consoleErrs.slice(before);
    if (pass && errsDuring.length) { pass = false; reason = 'console error: ' + errsDuring[0].slice(0,80); }
    results.push({ group, id, label, pass, reason });
  }

  // 2) Data-integrity assertions
  const dataChecks = [
    {
      name: 'Departure countdown ≥ 300',
      check: () => {
        const v = parseInt(document.getElementById('td-dep')?.textContent || '0', 10);
        return v > 300 && v < 1000;
      },
    },
    {
      name: 'House Jobs total = 104',
      check: () => (window.HJ_ITEMS || []).length === 104,
    },
    {
      name: 'Co-Lab Debt £200,000 present',
      check: () => document.body.textContent.includes('200,000'),
    },
    {
      name: 'Guitar curriculum 30 days',
      check: () => window.RBTR_CURRICULUM?.guitar?.days?.length === 30,
    },
    {
      name: 'Turkish curriculum 30 days',
      check: () => window.RBTR_CURRICULUM?.turkish?.days?.length === 30,
    },
    {
      name: 'ROCKO globals exposed',
      check: () => typeof window.ROCKO === 'object' && typeof window.ROCKO.briefMorning === 'function',
    },
    {
      name: 'BUDGET_CATS renders 6 rows',
      check: () => {
        window.show && window.show('budget');
        const tbody = document.getElementById('budget-tbody');
        return !!tbody && tbody.querySelectorAll('tr').length === 6;
      },
    },
    {
      name: 'House jobs spend remaining in range',
      check: () => {
        if (!window.HJ_STATS) return false;
        const s = window.HJ_STATS();
        return s.remaining_low >= 18000 && s.remaining_low <= 19000;
      },
    },
  ];
  const dataResults = dataChecks.map(c => {
    try { return { name: c.name, pass: !!c.check() }; }
    catch (e) { return { name: c.name, pass: false, reason: e.message }; }
  });

  // 3) API endpoint tests (skipped when running on localhost file://)
  const apiResults = [];
  if (location.origin.startsWith('http')) {
    const apis = [
      { name: 'GET /api/weather', url: '/api/weather', opts: { method: 'GET' } },
      { name: 'POST /api/jarvis', url: '/api/jarvis', opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'smoke-test, answer with exactly the word OK' }) } },
      { name: 'POST /api/tts (204 or 200 accepted)', url: '/api/tts', opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'smoke test' }) }, accept: [200, 204] },
      { name: 'GET /curriculum.js', url: '/curriculum.js', opts: { method: 'GET' } },
      { name: 'GET /house-jobs.js', url: '/house-jobs.js', opts: { method: 'GET' } },
    ];
    for (const a of apis) {
      try {
        const r = await fetch(a.url, a.opts);
        const okSet = a.accept || [200];
        apiResults.push({ name: a.name, pass: okSet.includes(r.status), status: r.status });
      } catch (e) {
        apiResults.push({ name: a.name, pass: false, reason: e.message });
      }
    }
  }

  // Restore originals
  window.onerror = origError;
  console.error = origConsoleError;

  // Return to Today
  try { window.show && window.show('today'); } catch(e){}

  // ── REPORT ───────────────────────────────────────────────────────────────
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass).length;
  const dataPass = dataResults.filter(r => r.pass).length;
  const dataFail = dataResults.filter(r => !r.pass).length;
  const apiPass = apiResults.filter(r => r.pass).length;
  const apiFail = apiResults.filter(r => !r.pass).length;
  const elapsed = ((performance.now() - START) / 1000).toFixed(1);

  console.group('%c🟢 RBTR SMOKE TEST', 'font-size:18px;font-weight:bold;color:#5bc0ff');
  console.log(`Elapsed: ${elapsed}s · ${errors.length} JS errors captured`);
  console.log('');
  console.log(`%cSections: ${pass}/${results.length} pass · ${fail} fail`, `color:${fail?'#ff4500':'#00c853'}`);
  console.table(results.map(r => ({ group: r.group, section: r.id, label: r.label, result: r.pass ? '✓' : '✗', reason: r.reason || '' })));
  console.log('');
  console.log(`%cData: ${dataPass}/${dataResults.length} pass`, `color:${dataFail?'#ff4500':'#00c853'}`);
  console.table(dataResults);
  console.log('');
  console.log(`%cAPIs: ${apiPass}/${apiResults.length} pass`, `color:${apiFail?'#ff4500':'#00c853'}`);
  console.table(apiResults);
  if (errors.length) {
    console.log('');
    console.log('%cJS errors captured during test:', 'color:#ff4500');
    console.table(errors);
  }
  console.groupEnd();

  const totalFail = fail + dataFail + apiFail;
  if (totalFail === 0) console.log('%c✓ ALL GREEN', 'color:#00c853;font-size:20px;font-weight:bold');
  else console.log(`%c✗ ${totalFail} failures — see tables`, 'color:#ff4500;font-size:20px;font-weight:bold');

  return { sections: { pass, fail }, data: { pass: dataPass, fail: dataFail }, apis: { pass: apiPass, fail: apiFail }, jsErrors: errors.length };
})();
