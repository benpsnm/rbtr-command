/**
 * JARVIS RBTR Modules
 * Created: 2026-05-13
 * Rock Bottom to Roaming — 5-year expedition + content project
 *
 * Departure: July 1, 2027
 * Route: 45 countries, UK → Patagonia → Alaska (5 years on road)
 * Vehicle: Mercedes Arocs 6x6 expedition truck
 * Team: Ben + Sarah + Hudson (10) + Benson (8) + Peanut (dog)
 */

const RBTR_MODULES = {
  // ── RBTR LANDING MENU ──────────────────────────────────────────────────────
  renderLanding() {
    const daysUntilDeparture = Math.ceil((new Date('2027-07-01') - new Date()) / 86400000);

    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">RBTR</h1>
        <div class="jarvis-module-actions">
          <span class="font-mono text-h2" style="color: var(--copper);">${daysUntilDeparture} days</span>
          <span class="text-small text-tertiary">until departure</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <div class="jarvis-card" style="cursor: pointer; border: 2px solid var(--copper);" onclick="RBTR_MODULES.renderCountdown()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2" style="color: var(--copper);">⏱ Countdown</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">July 1, 2027 — Departure from UK</p>
            <p class="font-mono text-h2" style="color: var(--copper); margin-top: 8px;">${daysUntilDeparture} days</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer; border: 2px solid var(--copper);" onclick="RBTR_MODULES.renderSponsorSystem()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2" style="color: var(--copper);">🤝 Sponsor System</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">53 targets, email templates, outreach tracker</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer; border: 2px solid var(--copper);" onclick="RBTR_MODULES.renderBuildTracker()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2" style="color: var(--copper);">🚛 Build Tracker</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Arocs 6x6 — 10-stage build progress</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderRouteMap()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🗺 Route Map</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">45 countries, 3 shipping legs, live Leaflet map</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderItinerary()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📍 Itinerary</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">45 countries with visa/vaccination requirements</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderContentEngine()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🎥 Content Engine</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">YouTube + social content pipeline</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderCameraGear()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📷 Camera Gear</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Kit list + buy schedule (tied to cash flow)</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderBuildFinancials()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">💰 Build Financials</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Apr 2026 → Jul 2027 cash flow</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderExpeditionFinancials()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">💵 Expedition Financials</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Years 1-5 on-road budget</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderJobRoles()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">👥 Job Roles</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Ben + Sarah responsibilities</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderSocialPages()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📱 Social Pages</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Quick-launch: YouTube, IG, TikTok, FB, Patreon</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderResurrectionDays()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🔥 Resurrection Days</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">30-day accountability tracker</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderGuyAndSharronMartin()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🧑‍🦳 Guy & Sharron Martin</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Garage + workshop tracker</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderSkillsTracker()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🎓 Skills Tracker</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Video/photography/editing skills roadmap</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderSubscriberTiers()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🎖 Subscriber Tiers</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Free / Explorer / Pioneer tiers (STUB — Phase 2)</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderMerch()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🛍 Merch</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Merch store (STUB — Phase 2)</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="RBTR_MODULES.renderMediaVault()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📂 Media Vault</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Asset library (STUB — Phase 2)</p>
          </div>
        </div>
      </div>
    `;
  },

  // ── COUNTDOWN CLOCK (FULL IMPLEMENTATION) ──────────────────────────────────
  renderCountdown() {
    const departure = new Date('2027-07-01T00:00:00');
    const now = new Date();
    const diff = departure - now;

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const yearProgress = ((now - new Date(now.getFullYear(), 0, 1)) / (new Date(now.getFullYear() + 1, 0, 1) - new Date(now.getFullYear(), 0, 1))) * 100;

    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Countdown</h1>
      </div>

      <div class="jarvis-card" style="text-align: center; padding: 64px 32px;">
        <h2 class="font-display" style="font-size: 48px; color: var(--copper); margin-bottom: 32px;">
          July 1, 2027
        </h2>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; max-width: 800px; margin: 0 auto 48px;">
          <div>
            <div class="font-mono" style="font-size: 64px; color: var(--copper); line-height: 1;">${days}</div>
            <div class="text-small text-tertiary" style="margin-top: 8px;">DAYS</div>
          </div>
          <div>
            <div class="font-mono" style="font-size: 64px; color: var(--copper); line-height: 1;">${String(hours).padStart(2, '0')}</div>
            <div class="text-small text-tertiary" style="margin-top: 8px;">HOURS</div>
          </div>
          <div>
            <div class="font-mono" style="font-size: 64px; color: var(--copper); line-height: 1;">${String(minutes).padStart(2, '0')}</div>
            <div class="text-small text-tertiary" style="margin-top: 8px;">MINUTES</div>
          </div>
          <div>
            <div class="font-mono" style="font-size: 64px; color: var(--copper); line-height: 1;" id="countdown-seconds">${String(seconds).padStart(2, '0')}</div>
            <div class="text-small text-tertiary" style="margin-top: 8px;">SECONDS</div>
          </div>
        </div>

        <div style="max-width: 600px; margin: 0 auto;">
          <p class="text-small text-secondary" style="margin-bottom: 8px;">
            ${Math.round(yearProgress)}% of 2026 complete
          </p>
          <div style="background: var(--surface-deep); height: 8px; border-radius: 4px; overflow: hidden;">
            <div style="background: var(--copper); height: 100%; width: ${yearProgress}%; transition: width 0.3s;"></div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Key Milestones</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Truck build complete</span>
              <span class="font-mono text-small text-copper">Jun 2027</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">53 sponsors confirmed</span>
              <span class="font-mono text-small text-copper">Target: 0/53</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Departure: UK → France → Spain</span>
              <span class="font-mono text-small text-copper">Jul 1, 2027</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Live seconds update
    setInterval(() => {
      const now = new Date();
      const diff = departure - now;
      const seconds = Math.floor((diff % 60000) / 1000);
      const el = document.getElementById('countdown-seconds');
      if (el) el.textContent = String(seconds).padStart(2, '0');
    }, 1000);
  },

  // ── SPONSOR SYSTEM (FULL IMPLEMENTATION) ───────────────────────────────────
  renderSponsorSystem() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Sponsor System</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="RBTR_MODULES.newSponsorEmail()">
            ✉️ New Email
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Target</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0/53</div>
            <p class="text-small text-tertiary">Confirmed sponsors</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">In Progress</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Outreach sent, awaiting reply</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Not Contacted</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">53</div>
            <p class="text-small text-tertiary">Ready for outreach</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">53 Sponsor Targets</h3>
          <div style="display: flex; gap: 12px; align-items: center; margin-top: 12px;">
            <input type="text" class="jarvis-input" placeholder="Search sponsors..." style="width: 240px;" />
            <select class="jarvis-input" style="width: 160px;">
              <option value="">All categories</option>
              <option value="outdoor">Outdoor Gear</option>
              <option value="tech">Tech</option>
              <option value="automotive">Automotive</option>
              <option value="media">Media</option>
            </select>
          </div>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Sponsor target list + email templates coming soon — wire to sponsor_targets table</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Categories: Outdoor gear (Arc'teryx, Patagonia, North Face), Tech (GoPro, DJI, Garmin), Automotive (BFGoodrich, Rhino-Rack), Media (Red Bull, National Geographic)
          </p>
        </div>
      </div>
    `;
  },

  newSponsorEmail() {
    JARVIS.Toast({ message: 'Email template selector coming soon', duration: 2000 });
  },

  // ── BUILD TRACKER (FULL IMPLEMENTATION) ────────────────────────────────────
  renderBuildTracker() {
    // 10-stage build: Acquisition, Strip, Fabrication, Electrical, Plumbing, Interior, Exterior, Systems, Shakedown, Complete
    const stages = [
      { name: 'Acquisition', progress: 100 },
      { name: 'Strip', progress: 0 },
      { name: 'Fabrication', progress: 0 },
      { name: 'Electrical', progress: 0 },
      { name: 'Plumbing', progress: 0 },
      { name: 'Interior', progress: 0 },
      { name: 'Exterior', progress: 0 },
      { name: 'Systems', progress: 0 },
      { name: 'Shakedown', progress: 0 },
      { name: 'Complete', progress: 0 }
    ];

    const overallProgress = stages.reduce((sum, s) => sum + s.progress, 0) / stages.length;

    const stageCards = stages.map((stage, i) => {
      const ring = JARVIS.ProgressRing({ percent: stage.progress, size: 72, label: `${stage.progress}%` });
      return `
        <div class="jarvis-card" style="background: var(--surface-deep);">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div>${ring.outerHTML}</div>
            <div style="flex: 1;">
              <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 4px;">
                ${i + 1}. ${stage.name}
              </h4>
              <p class="text-small text-tertiary">${stage.progress === 100 ? '✓ Complete' : stage.progress > 0 ? 'In progress' : 'Not started'}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Build Tracker</h1>
        <div class="jarvis-module-actions">
          <span class="font-mono text-h2" style="color: var(--copper);">${Math.round(overallProgress)}%</span>
          <span class="text-small text-tertiary">complete</span>
        </div>
      </div>

      <div class="jarvis-card" style="margin-bottom: 32px;">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Mercedes Arocs 6x6</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">60-week build plan | Start: May 2026 | Complete: Jun 2027</p>
          <div style="background: var(--surface-deep); height: 12px; border-radius: 6px; overflow: hidden; margin-top: 16px;">
            <div style="background: var(--copper); height: 100%; width: ${overallProgress}%; transition: width 0.6s;"></div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
        ${stageCards}
      </div>

      <div class="jarvis-card" style="margin-top: 32px;">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Build Bible Links</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">PDF links to detailed build specs coming soon — wire to build_bible table</p>
        </div>
      </div>
    `;
  },

  // ── STUBBED MODULES ────────────────────────────────────────────────────────
  renderRouteMap() { this._stubModule('Route Map', 'Live Leaflet map with 45 countries, 3 shipping legs, animated route. Port from V12.'); },
  renderItinerary() { this._stubModule('Expedition Itinerary', '45 countries with visa requirements, vaccination schedules, border crossings. Port from V12.'); },
  renderContentEngine() { this._stubModule('Content Engine', 'YouTube + social content pipeline. Wire to rbtr_content_drafts/published tables (migrations 60+62 applied).'); },
  renderCameraGear() { this._stubModule('Camera Gear', 'Kit list + buy schedule tied to cash flow. Port from V12.'); },
  renderBuildFinancials() { this._stubModule('Build Phase Financials', 'Apr 2026 → Jul 2027 cash flow. Port from V12.'); },
  renderExpeditionFinancials() { this._stubModule('Expedition Financials', 'Years 1-5 on-road budget. Port from V12.'); },
  renderJobRoles() { this._stubModule('Job Roles', 'Ben + Sarah responsibilities. Port from V12.'); },
  renderSocialPages() { this._stubModule('Social Pages', 'Quick-launch: YouTube, IG, TikTok, FB, Patreon. Port from V12.'); },
  renderResurrectionDays() { this._stubModule('Resurrection Days', '30-day accountability tracker. Port from V12.'); },
  renderGuyAndSharronMartin() { this._stubModule('Guy & Sharron Martin', 'Garage + workshop tracker. Port from V12.'); },
  renderSkillsTracker() { this._stubModule('Skills Tracker', 'Video/photography/editing skills roadmap. Port from V12.'); },
  renderSubscriberTiers() { this._stubModule('Subscriber Tiers', 'Free / Explorer / Pioneer tiers — STUB (Phase 2 product). Port from V12.'); },
  renderMerch() { this._stubModule('Merch', 'Merch store — STUB (Phase 2 product). Port from V12.'); },
  renderMediaVault() { this._stubModule('Media Vault', 'Asset library — STUB (Phase 2 product). Port from V12.'); },

  _stubModule(title, description) {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">${title}</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">${description}</p>
        </div>
      </div>
    `;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RBTR_MODULES;
}
