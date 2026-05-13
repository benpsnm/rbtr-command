/**
 * JARVIS System Modules
 * Created: 2026-05-13
 * System administration + configuration
 */

const SYSTEM_MODULES = {
  // ── SYSTEM LANDING ─────────────────────────────────────────────────────────
  renderLanding() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">System</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <div class="jarvis-card" style="cursor: pointer;" onclick="SYSTEM_MODULES.renderSettings()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">⚙️ Settings</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Integrations: Google Cal, Shopify, Printful, Drive</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="SYSTEM_MODULES.renderTheme()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🎨 Theme</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">B&W variants, motion preferences</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="SYSTEM_MODULES.renderAPIKeys()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🔑 API Keys</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Key rotation interface</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="SYSTEM_MODULES.renderCronStatus()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">⏰ Cron Status</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">7 active crons — detailed view</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="SYSTEM_MODULES.renderDeploys()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🚀 Deploys</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">History + rollback</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="SYSTEM_MODULES.renderBackup()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">💾 Backup & Restore</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Database + file backups</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="SYSTEM_MODULES.renderAbout()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">ℹ️ About</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Version + build info</p>
          </div>
        </div>
      </div>
    `;
  },

  // ── SETTINGS ───────────────────────────────────────────────────────────────
  renderSettings() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Settings</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Integrations</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <p class="text-small font-weight-600">Google Calendar</p>
                <p class="text-tiny text-tertiary">Sync family calendar events</p>
              </div>
              <span class="jarvis-pill font-mono text-pill">Not Connected</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <p class="text-small font-weight-600">Shopify</p>
                <p class="text-tiny text-tertiary">RBTR merch store (Phase 2)</p>
              </div>
              <span class="jarvis-pill font-mono text-pill">Pending Setup</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <p class="text-small font-weight-600">Printful</p>
                <p class="text-tiny text-tertiary">Print-on-demand fulfillment</p>
              </div>
              <span class="jarvis-pill font-mono text-pill">Pending Setup</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <p class="text-small font-weight-600">Google Drive</p>
                <p class="text-tiny text-tertiary">Cloud file storage</p>
              </div>
              <span class="jarvis-pill font-mono text-pill">Not Connected</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── THEME ──────────────────────────────────────────────────────────────────
  renderTheme() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Theme</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Appearance</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 16px;">
            <div>
              <label class="text-small text-secondary">Color Scheme</label>
              <select id="theme-color" class="jarvis-input" style="margin-top: 8px;">
                <option value="western-bw">Western Black & White + Copper (Current)</option>
                <option value="light" disabled>Light Mode (Coming Soon)</option>
              </select>
            </div>

            <div>
              <label class="text-small text-secondary">Motion</label>
              <select id="theme-motion" class="jarvis-input" style="margin-top: 8px;">
                <option value="full">Full Animations (Current)</option>
                <option value="reduced">Reduced Motion</option>
                <option value="none">No Motion</option>
              </select>
            </div>

            <div>
              <label class="text-small text-secondary">Scanline Effect</label>
              <select id="theme-scanline" class="jarvis-input" style="margin-top: 8px;">
                <option value="disabled">Disabled (Current)</option>
                <option value="enabled">Enabled (Subtle)</option>
              </select>
            </div>

            <button class="jarvis-btn jarvis-btn--primary" onclick="SYSTEM_MODULES.saveTheme()" style="margin-top: 16px;">
              Save Theme Preferences
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ── API KEYS ───────────────────────────────────────────────────────────────
  renderAPIKeys() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">API Keys & Tokens</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">API key rotation interface coming soon. For now, update keys in .env.production</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Keys: ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY, SENDGRID_API_KEY, STRIPE_SECRET_KEY
          </p>
        </div>
      </div>
    `;
  },

  // ── CRON STATUS ────────────────────────────────────────────────────────────
  renderCronStatus() {
    const crons = [
      { path: '/api/cron-morning-brief', schedule: '0 6 * * 1-5', desc: 'Morning brief (voice)' },
      { path: '/api/cron-morning-brief?mode=psnm-brief', schedule: '0 6 * * 1-5', desc: 'PSNM brief' },
      { path: '/api/cron-morning-brief?mode=evening', schedule: '0 21 * * 1-5', desc: 'Evening reflection' },
      { path: '/api/cron-backup', schedule: '0 3 * * *', desc: 'Daily backup (03:00)' },
      { path: '/api/atlas?action=intel_harvest_daily', schedule: '0 6 * * *', desc: 'Intel harvest (daily)' },
      { path: '/api/atlas?action=intel_harvest_insolvency_daily', schedule: '15 6 * * *', desc: 'Insolvency harvest' },
      { path: '/api/atlas?action=intel_harvest_defence_weekly', schedule: '30 6 * * 0', desc: 'Defence harvest (weekly)' },
      { path: '/api/cron-atlas3', schedule: '*/15 * * * *', desc: 'Atlas v3 dispatch (every 15min)' }
    ];

    const cronRows = crons.map(cron => `
      <tr>
        <td class="font-mono text-small">${cron.path}</td>
        <td class="font-mono text-small">${cron.schedule}</td>
        <td class="text-small">${cron.desc}</td>
        <td><span class="jarvis-pill jarvis-pill--live font-mono text-pill">ACTIVE</span></td>
      </tr>
    `).join('');

    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Cron Status</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="SYSTEM_MODULES.refreshCronStatus()">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Active Crons</h3>
        </div>
        <div class="jarvis-card__body">
          <table class="jarvis-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Schedule</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${cronRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ── DEPLOYS ────────────────────────────────────────────────────────────────
  renderDeploys() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Deploys</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Deploy history + rollback interface coming soon</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Current: feature/jarvis-cockpit branch<br>
            Production: v14-beniproautobodies-8729s-projects.vercel.app, rbtr-jarvis.vercel.app
          </p>
        </div>
      </div>
    `;
  },

  // ── BACKUP & RESTORE ───────────────────────────────────────────────────────
  renderBackup() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Backup & Restore</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Manual Backup</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 16px;">Trigger a manual database backup. Backups are stored in Supabase and run automatically daily at 03:00.</p>
          <button class="jarvis-btn jarvis-btn--primary" onclick="SYSTEM_MODULES.runBackupNow()">
            💾 Run Backup Now
          </button>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Restore</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Restore interface coming soon (Phase 4 TODO)</p>
        </div>
      </div>
    `;
  },

  // ── ABOUT ──────────────────────────────────────────────────────────────────
  renderAbout() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">About JARVIS</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Version</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="font-mono text-small">v14.0.0 — JARVIS Cockpit Edition</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Built: May 13, 2026<br>
            Branch: feature/jarvis-cockpit<br>
            Framework: Vercel Serverless + Vanilla JS<br>
            Database: Supabase (Postgres)<br>
            Design: Western B&W + Copper / Rye + Geist Mono + Inter
          </p>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Credits</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small">Built by Claude Sonnet 4.5 for Ben Greenwood</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Rock Bottom to Roaming — 5-year expedition project<br>
            Departure: July 1, 2027
          </p>
        </div>
      </div>
    `;
  },

  // ── SYSTEM ACTIONS ─────────────────────────────────────────────────────────

  saveTheme() {
    const color = document.getElementById('theme-color')?.value || 'western-bw';
    const motion = document.getElementById('theme-motion')?.value || 'full';
    const scanline = document.getElementById('theme-scanline')?.value || 'disabled';

    // Save to localStorage
    localStorage.setItem('jarvis-theme-color', color);
    localStorage.setItem('jarvis-theme-motion', motion);
    localStorage.setItem('jarvis-theme-scanline', scanline);

    // Apply motion preference
    if (motion === 'none' || motion === 'reduced') {
      document.body.style.setProperty('--transition-speed', '0s');
    } else {
      document.body.style.setProperty('--transition-speed', '0.3s');
    }

    // Apply scanline
    if (scanline === 'enabled') {
      document.body.classList.add('scanline-effect');
    } else {
      document.body.classList.remove('scanline-effect');
    }

    JARVIS.Toast({ message: 'Theme preferences saved', duration: 2000 });
  },

  async runBackupNow() {
    JARVIS.Toast({ message: 'Running backup...', duration: 2000 });

    try {
      const response = await fetch('/api/cron-backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.CRON_SECRET || ''}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        JARVIS.Toast({ message: 'Backup completed successfully', duration: 3000 });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[SYSTEM] Backup failed:', error);
      JARVIS.Toast({ message: 'Backup failed — check logs', duration: 3000 });
    }
  },

  refreshCronStatus() {
    this.renderCronStatus();
    JARVIS.Toast({ message: 'Cron status refreshed', duration: 2000 });
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SYSTEM_MODULES;
}
