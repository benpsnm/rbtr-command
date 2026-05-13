/**
 * JARVIS API Layer
 * Created: 2026-05-13
 * Supabase client wrapper + API endpoint helpers for JARVIS cockpit
 */

const API = {
  // ── CONFIG ─────────────────────────────────────────────────────────────────
  BASE_URL: window.location.origin,

  // ── AUTH ───────────────────────────────────────────────────────────────────
  async checkAuth() {
    try {
      const response = await fetch(`${this.BASE_URL}/api/auth/check`, {
        credentials: 'include'
      });
      const data = await response.json();
      return data.authenticated || false;
    } catch (err) {
      console.error('Auth check failed:', err);
      return false;
    }
  },

  // ── COCKPIT DATA FETCHERS ──────────────────────────────────────────────────

  async getCockpitData() {
    try {
      const response = await fetch(`${this.BASE_URL}/api/cockpit`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Cockpit API failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || null;
    } catch (err) {
      console.error('Failed to fetch cockpit data:', err);
      return null;
    }
  },

  // ── TASKS API ──────────────────────────────────────────────────────────────
  async createTask(taskData) {
    try {
      const response = await fetch(`${this.BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        throw new Error(`Task creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to create task:', err);
      return null;
    }
  },

  async updateTask(taskId, updates) {
    try {
      const response = await fetch(`${this.BASE_URL}/api/tasks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ id: taskId, ...updates })
      });

      if (!response.ok) {
        throw new Error(`Task update failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to update task:', err);
      return null;
    }
  },

  // ── NOTES API ──────────────────────────────────────────────────────────────
  async createNote(noteData) {
    return this.supabaseInsert('notes', noteData);
  },

  // ── BUILD LOGS API ─────────────────────────────────────────────────────────
  async createBuildLog(content) {
    return this.supabaseInsert('notes', {
      content,
      category: 'build_log',
      created_by: 'ben'
    });
  },

  // ── QUOTES API ─────────────────────────────────────────────────────────────
  async createQuote(quoteData) {
    return this.supabaseInsert('psnm_quotes', quoteData);
  },

  async getQuotes(filters = {}) {
    let qs = 'order=created_at.desc&select=*';
    if (filters.status) qs = `status=eq.${filters.status}&${qs}`;
    if (filters.limit) qs += `&limit=${filters.limit}`;
    return this.supabaseQuery('psnm_quotes', qs);
  },

  // ── GENERIC SUPABASE HELPERS ───────────────────────────────────────────────
  async supabaseQuery(table, queryString = '') {
    try {
      const SUPA_URL = 'https://mpxgyobotiqcawmqlhbf.supabase.co';
      const SUPA_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1weGd5b2JvdGlxY2F3bXFsaGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ5MTIxNzAsImV4cCI6MjAzMDQ4ODE3MH0.F_jZ3sE6vY9YPz7r5UNz9Zy5cX9GZxJ3m8NKqg2iSjM';

      const response = await fetch(`${SUPA_URL}/rest/v1/${table}${queryString ? '?' + queryString : ''}`, {
        headers: {
          'apikey': SUPA_ANON_KEY,
          'Authorization': `Bearer ${SUPA_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Supabase query failed: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`Supabase query failed for ${table}:`, err);
      return null;
    }
  },

  async supabaseInsert(table, data) {
    try {
      const SUPA_URL = 'https://mpxgyobotiqcawmqlhbf.supabase.co';
      const SUPA_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1weGd5b2JvdGlxY2F3bXFsaGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ5MTIxNzAsImV4cCI6MjAzMDQ4ODE3MH0.F_jZ3sE6vY9YPz7r5UNz9Zy5cX9GZxJ3m8NKqg2iSjM';

      const response = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': SUPA_ANON_KEY,
          'Authorization': `Bearer ${SUPA_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Supabase insert failed: ${response.status}`);
      }

      const result = await response.json();
      return result[0] || result;
    } catch (err) {
      console.error(`Supabase insert failed for ${table}:`, err);
      return null;
    }
  },

  async supabaseUpdate(table, id, data) {
    try {
      const SUPA_URL = 'https://mpxgyobotiqcawmqlhbf.supabase.co';
      const SUPA_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1weGd5b2JvdGlxY2F3bXFsaGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ5MTIxNzAsImV4cCI6MjAzMDQ4ODE3MH0.F_jZ3sE6vY9YPz7r5UNz9Zy5cX9GZxJ3m8NKqg2iSjM';

      const response = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPA_ANON_KEY,
          'Authorization': `Bearer ${SUPA_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Supabase update failed: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`Supabase update failed for ${table}:`, err);
      return null;
    }
  },

  // ── SYSTEM STATUS ──────────────────────────────────────────────────────────
  async getSystemStatus() {
    try {
      const response = await fetch(`${this.BASE_URL}/api/diagnose/post-build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`
        },
        body: JSON.stringify({
          triggered_by: 'jarvis-cockpit',
          build_summary: 'System health check'
        })
      });

      if (!response.ok) {
        return { healthy: false, message: 'Diagnose endpoint unavailable' };
      }

      return await response.json();
    } catch (err) {
      console.error('System status check failed:', err);
      return { healthy: false, message: err.message };
    }
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
