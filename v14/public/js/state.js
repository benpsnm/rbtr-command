// ═══════════════════════════════════════════════════════════════════════════
// RBTR State · Phase 1.5
// Minimal reactive store, no framework. Keyed slice subscriptions.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const state = {
    user: null,
    currentPortal: null,
    currentSection: null,
    briefing: null,      // cached /api/briefing-data response
    rockoOpen: false,
    rockoUnread: false,
    rockoMessages: [],
  };

  const listeners = new Map(); // key -> Set<fn>

  function subscribe(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    // Immediately invoke with current slice
    try { fn(state[key]); } catch(e) {}
    return () => listeners.get(key)?.delete(fn);
  }

  function set(key, value) {
    state[key] = value;
    const subs = listeners.get(key);
    if (subs) subs.forEach(fn => { try { fn(value); } catch(e){} });
  }

  function get(key) { return state[key]; }

  // Convenience helpers
  async function refreshBriefing() {
    try {
      const r = await fetch('/api/briefing-data');
      if (r.ok) {
        const j = await r.json();
        set('briefing', j.data || null);
      }
    } catch(e) { /* silent */ }
  }

  window.RBTR_State = { subscribe, set, get, refreshBriefing };
})();
