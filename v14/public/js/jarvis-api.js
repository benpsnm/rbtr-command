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
