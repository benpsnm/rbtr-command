// ═══════════════════════════════════════════════════════════════════════════
// House Jobs · 4 Woodhead Mews, Blacker Hill, Barnsley S74 0RH
// Real list compiled from Ben's planning conversations (20 Apr 2026)
// Target: dark luxury AirBnB sleeping 6-8 with full wellness circuit. Launch 2026.
//
// Schema:
//   id · section (blue|pink|attic|garage|compliance|launch)
//   title · who · cost_low · cost_high · priority (1 highest)
// Ticks persist to localStorage key `rbtr_hj`.
// ═══════════════════════════════════════════════════════════════════════════

window.HJ_ITEMS = [
  // ───────── BLUE LIST — STRUCTURAL / FABRIC ─────────
  // External & Garden Structure
  { id:'b01', cat:'blue', subcat:'External & Garden', name:'Remove all blocks front', who:'Ben', cost_low:500, cost_high:500, priority:2 },
  { id:'b02', cat:'blue', subcat:'External & Garden', name:'Render wall', who:'Ben', cost_low:500, cost_high:500, priority:2 },
  { id:'b03', cat:'blue', subcat:'External & Garden', name:'Fit fence posts front', who:'Ben', cost_low:0, cost_high:0, priority:2 },
  { id:'b04', cat:'blue', subcat:'External & Garden', name:'Fit new fence front', who:'Ben', cost_low:300, cost_high:300, priority:2 },
  { id:'b05', cat:'blue', subcat:'External & Garden', name:'Finish fence slats', who:'Josh', cost_low:500, cost_high:500, priority:2 },
  { id:'b06', cat:'blue', subcat:'External & Garden', name:'Fit roof felt/rubber on sauna', who:'Ben', cost_low:200, cost_high:200, priority:2 },
  { id:'b07', cat:'blue', subcat:'External & Garden', name:'Build wall water feature', who:'Ben', cost_low:100, cost_high:100, priority:3 },
  { id:'b08', cat:'blue', subcat:'External & Garden', name:'Finish water feature + filter media', who:'Ben', cost_low:100, cost_high:100, priority:3 },
  { id:'b09', cat:'blue', subcat:'External & Garden', name:'Tiles on roof', who:'TBC', cost_low:null, cost_high:null, priority:3 },
  { id:'b10', cat:'blue', subcat:'External & Garden', name:'Paint render', who:'Ben', cost_low:0, cost_high:0, priority:2 },
  { id:'b11', cat:'blue', subcat:'External & Garden', name:'Jet wash resin before new goes down', who:'Ben', cost_low:50, cost_high:50, priority:2 },
  { id:'b12', cat:'blue', subcat:'External & Garden', name:'Paint back of house', who:'Ben', cost_low:100, cost_high:100, priority:2 },
  { id:'b13', cat:'blue', subcat:'External & Garden', name:'Paint fence back garden', who:'Ben', cost_low:100, cost_high:100, priority:3 },
  { id:'b14', cat:'blue', subcat:'External & Garden', name:'Paint fence front garden', who:'Ben', cost_low:50, cost_high:50, priority:3 },
  // Doors & Windows
  { id:'b15', cat:'blue', subcat:'Doors & Windows', name:'New back door', who:'Ben', cost_low:500, cost_high:500, priority:1 },
  { id:'b16', cat:'blue', subcat:'Doors & Windows', name:'Change downstairs taps (kitchen + bathroom)', who:'Ben', cost_low:0, cost_high:0, priority:2 },
  // Hot Tub / Ice Bath / Sauna
  { id:'b17', cat:'blue', subcat:'Wellness Circuit', name:'Buy ice bath', who:'Ben', cost_low:600, cost_high:600, priority:1 },
  { id:'b18', cat:'blue', subcat:'Wellness Circuit', name:'Wire hot tub', who:'Ben', cost_low:0, cost_high:0, priority:1 },
  { id:'b19', cat:'blue', subcat:'Wellness Circuit', name:'Chlorine + chemicals for hot tub', who:'Ben', cost_low:200, cost_high:200, priority:1 },
  { id:'b20', cat:'blue', subcat:'Wellness Circuit', name:'Fit outdoor shower', who:'Ben', cost_low:0, cost_high:0, priority:2 },
  // Outdoor Kitchen
  { id:'b21', cat:'blue', subcat:'Outdoor Kitchen', name:'Build outdoor furniture', who:'Ben', cost_low:0, cost_high:0, priority:3 },
  { id:'b22', cat:'blue', subcat:'Outdoor Kitchen', name:'Sand outside table + lacquer', who:'Ben', cost_low:0, cost_high:0, priority:3 },
  { id:'b23', cat:'blue', subcat:'Outdoor Kitchen', name:'Clean BBQ + prep area', who:'Ben', cost_low:0, cost_high:0, priority:3 },
  { id:'b24', cat:'blue', subcat:'Outdoor Kitchen', name:'Filter for extractor hob', who:'Ben', cost_low:0, cost_high:0, priority:3 },
  { id:'b25', cat:'blue', subcat:'Outdoor Kitchen', name:'Jet wash + clean astro turf', who:'Ben', cost_low:0, cost_high:0, priority:3 },
  // Internal Building Work
  { id:'b26', cat:'blue', subcat:'Internal', name:'Upstairs bathroom complete', who:'Ben', cost_low:0, cost_high:0, priority:1 },
  { id:'b27', cat:'blue', subcat:'Internal', name:'Remove wallpaper from main bathroom', who:'Sarah', cost_low:0, cost_high:0, priority:1 },
  { id:'b28', cat:'blue', subcat:'Internal', name:'Paint bathroom ceiling', who:'Sarah', cost_low:0, cost_high:0, priority:1 },
  { id:'b29', cat:'blue', subcat:'Internal', name:'Re-paint all black walls + skirting', who:'Ben + Sarah', cost_low:0, cost_high:0, priority:1 },
  // Entertainment
  { id:'b30', cat:'blue', subcat:'Entertainment', name:'Pool table + table tennis table', who:'Ben + M', cost_low:200, cost_high:200, priority:3 },
  { id:'b31', cat:'blue', subcat:'Entertainment', name:'Door handle module (remote)', who:'Ben', cost_low:20, cost_high:20, priority:2 },

  // ───────── PINK LIST — FINISHING / DRESSING ─────────
  // Beds & Bedding
  { id:'p01', cat:'pink', subcat:'Beds & Bedding', name:'Source bunk beds + mattresses (boys\' rooms)', who:'Sarah + M', cost_low:600, cost_high:600, priority:3 },
  { id:'p02', cat:'pink', subcat:'Beds & Bedding', name:'New bedding for all beds', who:'Sarah + M', cost_low:30, cost_high:30, priority:3 },
  { id:'p03', cat:'pink', subcat:'Beds & Bedding', name:'Comfy pillows + mattress toppers', who:'Sarah + M', cost_low:100, cost_high:100, priority:3 },
  // Soft Furnishings
  { id:'p04', cat:'pink', subcat:'Soft Furnishings', name:'New towels', who:'Sarah + M', cost_low:50, cost_high:50, priority:3 },
  { id:'p05', cat:'pink', subcat:'Soft Furnishings', name:'Black robes for sauna + slippers', who:'Sarah + M', cost_low:50, cost_high:50, priority:3 },
  { id:'p06', cat:'pink', subcat:'Soft Furnishings', name:'Curtains + poles for kitchen', who:'Sarah + M', cost_low:50, cost_high:50, priority:3 },
  { id:'p07', cat:'pink', subcat:'Soft Furnishings', name:'Blind for kitchen', who:'Sarah + M', cost_low:0, cost_high:0, priority:3 },
  { id:'p08', cat:'pink', subcat:'Soft Furnishings', name:'Sauna kit + essential oils', who:'Sarah + M', cost_low:100, cost_high:100, priority:3 },
  // Wall Art
  { id:'p09', cat:'pink', subcat:'Wall Art', name:'Swap all photos — replace with cool art', who:'Sarah', cost_low:0, cost_high:0, priority:3 },
  { id:'p10', cat:'pink', subcat:'Wall Art', name:'Get cool wall art/pictures', who:'Sarah + M', cost_low:50, cost_high:50, priority:3 },
  { id:'p11', cat:'pink', subcat:'Wall Art', name:'Blackboard for hallway', who:'Sarah + M', cost_low:20, cost_high:20, priority:3 },
  // Guest Experience
  { id:'p12', cat:'pink', subcat:'Guest Experience', name:'Tea, coffee, treats (welcome pack)', who:'Sarah + M', cost_low:100, cost_high:100, priority:3 },
  { id:'p13', cat:'pink', subcat:'Guest Experience', name:'Toiletries (hotel spec)', who:'Sarah + M', cost_low:100, cost_high:100, priority:3 },
  { id:'p14', cat:'pink', subcat:'Guest Experience', name:'Scent machine', who:'Sarah + M', cost_low:null, cost_high:null, priority:3 },
  { id:'p15', cat:'pink', subcat:'Guest Experience', name:'Board games', who:'Sarah + M', cost_low:30, cost_high:30, priority:3 },
  { id:'p16', cat:'pink', subcat:'Guest Experience', name:'Marshmallows for fire pit + sticks', who:'Sarah + M', cost_low:10, cost_high:10, priority:3 },
  // Deep Cleans
  { id:'p17', cat:'pink', subcat:'Deep Clean', name:'Deep clean garage', who:'Sarah / cleaner', cost_low:0, cost_high:0, priority:3 },
  { id:'p18', cat:'pink', subcat:'Deep Clean', name:'Deep clean gym', who:'Sarah / cleaner', cost_low:0, cost_high:0, priority:3 },
  { id:'p19', cat:'pink', subcat:'Deep Clean', name:'Deep clean sauna', who:'Sarah / cleaner', cost_low:0, cost_high:0, priority:3 },
  // Appliances
  { id:'p20', cat:'pink', subcat:'Appliances', name:'Confirm oven, washing machine, dryer', who:'Ben', cost_low:0, cost_high:0, priority:2 },

  // ───────── ATTIC CONVERSION ─────────
  { id:'a01', cat:'attic', subcat:'Pre-Check', name:'Measure head height at ridge (min 2.2m)', who:'Ben', cost_low:0, cost_high:0, priority:4 },
  { id:'a02', cat:'attic', subcat:'Pre-Check', name:'Confirm Permitted Development with council', who:'Ben', cost_low:0, cost_high:0, priority:4 },
  { id:'a03', cat:'attic', subcat:'Pre-Check', name:'Get loft conversion structural quotes', who:'Ben + T', cost_low:0, cost_high:0, priority:4 },
  { id:'a04', cat:'attic', subcat:'Structural', name:'Board + insulate loft floor', who:'Ben', cost_low:600, cost_high:1200, priority:4 },
  { id:'a05', cat:'attic', subcat:'Structural', name:'Build staircase into small box bedroom', who:'Ben + T', cost_low:1500, cost_high:3000, priority:4 },
  { id:'a06', cat:'attic', subcat:'Structural', name:'Install 4× Velux windows (already owned)', who:'Ben', cost_low:400, cost_high:800, priority:4 },
  { id:'a07', cat:'attic', subcat:'Structural', name:'Internal walls + partition for bedroom', who:'Ben', cost_low:500, cost_high:1000, priority:4 },
  { id:'a08', cat:'attic', subcat:'Structural', name:'Fire escape provision confirmed', who:'Ben + T', cost_low:0, cost_high:0, priority:4 },
  { id:'a09', cat:'attic', subcat:'Plumbing & Electrics', name:'Run plumbing feed to attic WC', who:'Ben + T', cost_low:400, cost_high:800, priority:4 },
  { id:'a10', cat:'attic', subcat:'Plumbing & Electrics', name:'Fit compact WC + hand basin', who:'Ben + T', cost_low:800, cost_high:1500, priority:4 },
  { id:'a11', cat:'attic', subcat:'Plumbing & Electrics', name:'Electrical circuit extension (NICEIC)', who:'T', cost_low:500, cost_high:900, priority:4 },
  { id:'a12', cat:'attic', subcat:'Plumbing & Electrics', name:'Lighting + sockets + heating', who:'Ben', cost_low:300, cost_high:500, priority:4 },
  { id:'a13', cat:'attic', subcat:'Finishing', name:'Skim plaster attic bedroom', who:'T', cost_low:400, cost_high:700, priority:4 },
  { id:'a14', cat:'attic', subcat:'Finishing', name:'Decorate attic bedroom', who:'Sarah + Ben', cost_low:400, cost_high:800, priority:4 },
  { id:'a15', cat:'attic', subcat:'Finishing', name:'Attic bedroom furniture (bed, storage)', who:'Sarah + M', cost_low:600, cost_high:1200, priority:4 },
  { id:'a16', cat:'attic', subcat:'Finishing', name:'Building regs sign-off', who:'T', cost_low:200, cost_high:400, priority:4 },
  { id:'a17', cat:'attic', subcat:'Box Room', name:'Decide box room use', who:'Ben + Sarah', cost_low:0, cost_high:0, priority:4 },
  { id:'a18', cat:'attic', subcat:'Box Room', name:'Finish box room to chosen purpose', who:'Ben', cost_low:200, cost_high:500, priority:4 },

  // ───────── GARAGE OFFICE CONVERSION ─────────
  { id:'g01', cat:'garage', subcat:'Structural', name:'Insulate garage walls + ceiling', who:'Ben', cost_low:400, cost_high:700, priority:5 },
  { id:'g02', cat:'garage', subcat:'Structural', name:'Board out walls + ceiling', who:'Ben', cost_low:300, cost_high:500, priority:5 },
  { id:'g03', cat:'garage', subcat:'Structural', name:'Floor levelled + laid (vinyl/engineered)', who:'Ben', cost_low:400, cost_high:800, priority:5 },
  { id:'g04', cat:'garage', subcat:'Structural', name:'Replace garage door (insulated + window)', who:'Ben + T', cost_low:800, cost_high:1500, priority:5 },
  { id:'g05', cat:'garage', subcat:'Structural', name:'Internal door from house to garage', who:'Ben', cost_low:250, cost_high:250, priority:5 },
  { id:'g06', cat:'garage', subcat:'Plumbing & Electrics', name:'Run electrics + sockets', who:'Ben + T', cost_low:400, cost_high:700, priority:5 },
  { id:'g07', cat:'garage', subcat:'Plumbing & Electrics', name:'Run small plumbing feed for kitchenette sink', who:'Ben + T', cost_low:300, cost_high:600, priority:5 },
  { id:'g08', cat:'garage', subcat:'Plumbing & Electrics', name:'Electric or small log burner for heat', who:'Ben + M', cost_low:500, cost_high:1200, priority:5 },
  { id:'g09', cat:'garage', subcat:'Kitchenette & Furniture', name:'Fit kitchenette (base units, sink, worktop, mini fridge)', who:'Ben + M', cost_low:500, cost_high:1000, priority:5 },
  { id:'g10', cat:'garage', subcat:'Kitchenette & Furniture', name:'Pull-out sofa bed', who:'Sarah + M', cost_low:400, cost_high:800, priority:5 },
  { id:'g11', cat:'garage', subcat:'Kitchenette & Furniture', name:'Desk + office setup', who:'Ben + M', cost_low:200, cost_high:400, priority:5 },
  { id:'g12', cat:'garage', subcat:'Kitchenette & Furniture', name:'Storage + shelving', who:'Ben', cost_low:100, cost_high:200, priority:5 },
  { id:'g13', cat:'garage', subcat:'Finishing', name:'Paint + decorate', who:'Ben + Sarah', cost_low:100, cost_high:200, priority:5 },
  { id:'g14', cat:'garage', subcat:'Finishing', name:'Soft furnishings + styling', who:'Sarah + M', cost_low:150, cost_high:300, priority:5 },
  { id:'g15', cat:'garage', subcat:'Finishing', name:'Wi-Fi extender — coverage check', who:'Ben', cost_low:50, cost_high:50, priority:5 },

  // ───────── COMPLIANCE (BEFORE FIRST GUEST) ─────────
  { id:'c01', cat:'compliance', subcat:'Certificates', name:'Gas safety certificate', who:'Gas Safe engineer', cost_low:80, cost_high:80, priority:6 },
  { id:'c02', cat:'compliance', subcat:'Certificates', name:'EICR (5-yr electrical report)', who:'NICEIC', cost_low:150, cost_high:300, priority:6 },
  { id:'c03', cat:'compliance', subcat:'Certificates', name:'PAT testing all appliances', who:'T', cost_low:100, cost_high:100, priority:6 },
  { id:'c04', cat:'compliance', subcat:'Certificates', name:'EPC certificate', who:'Domestic Energy Assessor', cost_low:80, cost_high:80, priority:6 },
  { id:'c05', cat:'compliance', subcat:'Fire Safety', name:'Fire risk assessment (formal)', who:'Ben / T', cost_low:150, cost_high:150, priority:6 },
  { id:'c06', cat:'compliance', subcat:'Fire Safety', name:'Smoke alarms (interlinked, all floors)', who:'Ben', cost_low:100, cost_high:100, priority:6 },
  { id:'c07', cat:'compliance', subcat:'Fire Safety', name:'CO alarm (near boiler + fires)', who:'Ben', cost_low:30, cost_high:30, priority:6 },
  { id:'c08', cat:'compliance', subcat:'Fire Safety', name:'Heat alarm (kitchen)', who:'Ben', cost_low:30, cost_high:30, priority:6 },
  { id:'c09', cat:'compliance', subcat:'Fire Safety', name:'Fire extinguisher + fire blanket (kitchen)', who:'Ben + M', cost_low:50, cost_high:50, priority:6 },
  { id:'c10', cat:'compliance', subcat:'Legal & Insurance', name:'Short-term letting consent from mortgage lender', who:'Sarah', cost_low:0, cost_high:0, priority:6 },
  { id:'c11', cat:'compliance', subcat:'Legal & Insurance', name:'Public liability insurance for STR', who:'M', cost_low:300, cost_high:300, priority:6 },
  { id:'c12', cat:'compliance', subcat:'Legal & Insurance', name:'AirBnB accidental damage cover', who:'M', cost_low:0, cost_high:0, priority:6 },

  // ───────── PHOTOGRAPHY & LAUNCH ─────────
  { id:'l01', cat:'launch', subcat:'Pre-Photo', name:'Whole house deep clean + dressed', who:'Sarah + cleaner', cost_low:150, cost_high:150, priority:6 },
  { id:'l02', cat:'launch', subcat:'Photography', name:'Professional photography booked', who:'M', cost_low:300, cost_high:500, priority:6 },
  { id:'l03', cat:'launch', subcat:'Photography', name:'Drone exterior shots (FX30 owned)', who:'Ben', cost_low:0, cost_high:0, priority:6 },
  { id:'l04', cat:'launch', subcat:'Listing', name:'AirBnB listing written + published', who:'Sarah + Ben', cost_low:0, cost_high:0, priority:6 },
  { id:'l05', cat:'launch', subcat:'Listing', name:'House manual + welcome book', who:'Sarah', cost_low:0, cost_high:0, priority:6 },
  { id:'l06', cat:'launch', subcat:'Listing', name:'Local guide (pubs, walks, taxis)', who:'Sarah', cost_low:0, cost_high:0, priority:6 },
  { id:'l07', cat:'launch', subcat:'Operations', name:'Cleaner booked — trusted + reliable', who:'Sarah', cost_low:0, cost_high:0, priority:6 },
  { id:'l08', cat:'launch', subcat:'Operations', name:'Smart lock for self check-in', who:'Ben', cost_low:100, cost_high:150, priority:6 },
];

// Category metadata
window.HJ_CATS = {
  blue:       { label:'Blue List',  icon:'🔨', tint:'#1e90ff', desc:'Structural / fabric' },
  pink:       { label:'Pink List',  icon:'💗', tint:'#e040fb', desc:'Finishing / dressing' },
  attic:      { label:'Attic',      icon:'🪜', tint:'#ff4500', desc:'Conversion — equity lift' },
  garage:     { label:'Garage',     icon:'🚪', tint:'#ffab00', desc:'Office + sleeps 2 more' },
  compliance: { label:'Compliance', icon:'📋', tint:'#00c853', desc:'Legal before first guest' },
  launch:     { label:'Launch',     icon:'🚀', tint:'#b370ff', desc:'Photos + listing' },
};

// Priority labels
window.HJ_PRIORITIES = {
  1: 'Month 1 · launch-critical',
  2: 'Month 2 · structural',
  3: 'Month 3 · finishing',
  4: 'Month 4 · attic',
  5: 'Month 5 · garage',
  6: 'Month 6 · compliance + launch',
};

// Restore tick state
try { window.hjState = JSON.parse(localStorage.getItem('rbtr-hj') || '{}'); }
catch(e) { window.hjState = {}; }

window.HJ_SAVE = function(){
  try { localStorage.setItem('rbtr-hj', JSON.stringify(window.hjState||{})); } catch(e){}
};

// ── Aggregate helpers ────────────────────────────────────────────────────
window.HJ_STATS = function(filter){
  const items = filter ? HJ_ITEMS.filter(j => j.cat === filter) : HJ_ITEMS;
  const s = { total:0, done:0, cost_low:0, cost_high:0, spent_low:0, spent_high:0, remaining_low:0, remaining_high:0 };
  items.forEach(j => {
    s.total++;
    const isDone = !!window.hjState[j.id];
    if (isDone) s.done++;
    const lo = j.cost_low || 0, hi = j.cost_high || 0;
    s.cost_low += lo; s.cost_high += hi;
    if (isDone) { s.spent_low += lo; s.spent_high += hi; }
    else       { s.remaining_low += lo; s.remaining_high += hi; }
  });
  s.pct = s.total ? Math.round(s.done/s.total*100) : 0;
  return s;
};

// Top N priority jobs for a given "who" filter (Ben, Sarah, etc.)
window.HJ_TOP = function(whoSubstr, limit){
  const all = HJ_ITEMS.filter(j => !window.hjState[j.id])
    .filter(j => whoSubstr ? (j.who||'').toLowerCase().includes(whoSubstr.toLowerCase()) : true)
    .sort((a,b) => (a.priority||99) - (b.priority||99));
  return all.slice(0, limit || 5);
};
