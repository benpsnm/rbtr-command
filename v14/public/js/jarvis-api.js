// ═══════════════════════════════════════════════════════════════════════════
// JARVIS API Layer
// ═══════════════════════════════════════════════════════════════════════════

window.API = {
  // Auth
  async checkAuth() {
    try {
      const res = await fetch('/api/auth/check');
      return res.ok;
    } catch (error) {
      console.error('[API] Auth check failed:', error);
      return false;
    }
  },

  // Cockpit Data
  async getCockpitData() {
    try {
      const res = await fetch('/api/cockpit/data');
      if (!res.ok) throw new Error('Failed to fetch cockpit data');
      return await res.json();
    } catch (error) {
      console.error('[API] Cockpit data fetch failed:', error);
      return {
        dailyLog: [],
        todayTasks: [],
        weekGoals: [],
        psnm: { live: 0, quotes: 0, leads: 0, total: 0 },
        str: { thisWeekBookings: 0, totalBookings: 0, revenue: 0 },
        wellness: null
      };
    }
  },

  // Tasks
  async createTask(taskData) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!res.ok) throw new Error('Failed to create task');
      return await res.json();
    } catch (error) {
      console.error('[API] Task creation failed:', error);
      return null;
    }
  },

  // Quotes
  async createQuote(quoteData) {
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      });
      if (!res.ok) throw new Error('Failed to create quote');
      return await res.json();
    } catch (error) {
      console.error('[API] Quote creation failed:', error);
      return null;
    }
  },

  // Notes
  async createNote(noteData) {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });
      if (!res.ok) throw new Error('Failed to create note');
      return await res.json();
    } catch (error) {
      console.error('[API] Note creation failed:', error);
      return null;
    }
  },

  // Build Log
  async createBuildLog(content) {
    try {
      const res = await fetch('/api/build-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, category: 'build_log', created_by: 'ben' })
      });
      if (!res.ok) throw new Error('Failed to create build log');
      return await res.json();
    } catch (error) {
      console.error('[API] Build log creation failed:', error);
      return null;
    }
  }
};
