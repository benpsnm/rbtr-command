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
  async renderSponsorSystem() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Sponsor System</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="RBTR_MODULES.newSponsor()">
            + New Sponsor
          </button>
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="RBTR_MODULES.newSponsorEmail()">
            ✉️ Bulk Email
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Signed</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="sponsors-signed-count">—</div>
            <p class="text-small text-tertiary">Confirmed sponsors</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">In Progress</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="sponsors-in-progress-count">—</div>
            <p class="text-small text-tertiary">Negotiating / replied</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Not Contacted</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="sponsors-target-count">—</div>
            <p class="text-small text-tertiary">Ready for outreach</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Value</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="sponsors-total-value">—</div>
            <p class="text-small text-tertiary">Estimated package value</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Sponsor Pipeline</h3>
        </div>
        <div class="jarvis-card__body" id="sponsors-list">
          Loading sponsors...
        </div>
      </div>
    `;

    this.loadSponsors();
  },

  async loadSponsors() {
    try {
      const sponsors = await API.supabaseQuery('rbtr_sponsors', 'select=*&order=value_estimate_gbp.desc.nullslast');

      if (!sponsors || sponsors.length === 0) {
        document.getElementById('sponsors-signed-count').textContent = '0';
        document.getElementById('sponsors-in-progress-count').textContent = '0';
        document.getElementById('sponsors-target-count').textContent = '0';
        document.getElementById('sponsors-total-value').textContent = '£0';
        document.getElementById('sponsors-list').innerHTML = '<p class="text-small text-tertiary">No sponsors yet. Click "+ New Sponsor" to add one.</p>';
        return;
      }

      // Stats
      const signedCount = sponsors.filter(s => s.status === 'signed').length;
      const inProgressCount = sponsors.filter(s => ['replied', 'negotiating', 'contacted'].includes(s.status)).length;
      const targetCount = sponsors.filter(s => s.status === 'target').length;
      const totalValue = sponsors.reduce((sum, s) => sum + (parseFloat(s.value_estimate_gbp) || 0), 0);

      document.getElementById('sponsors-signed-count').textContent = signedCount;
      document.getElementById('sponsors-in-progress-count').textContent = inProgressCount;
      document.getElementById('sponsors-target-count').textContent = targetCount;
      document.getElementById('sponsors-total-value').textContent = `£${totalValue.toFixed(0)}k`;

      // Sponsor list
      document.getElementById('sponsors-list').innerHTML = sponsors.map(s => {
        const statusColor = s.status === 'signed' ? '#4CAF50' :
                            s.status === 'negotiating' ? 'var(--copper)' :
                            s.status === 'replied' ? '#2196F3' :
                            s.status === 'contacted' ? '#FFA726' : '#999';

        const typeIcon = s.sponsor_type === 'product' ? '📦' :
                        s.sponsor_type === 'cash' ? '💰' : '🔧';

        return `
          <div class="jarvis-card" style="background: var(--surface-deep); margin-bottom: 12px; cursor: pointer;"
               onclick="RBTR_MODULES.viewSponsorDetail('${s.id}')">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div style="flex: 1;">
                <h4 class="text-small" style="margin-bottom: 4px;">${typeIcon} ${s.company_name}</h4>
                <p class="text-tiny text-tertiary">${s.sponsor_type.replace(/_/g, ' ')} • ${s.contact_name || 'No contact'}</p>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                ${s.value_estimate_gbp ? `<span class="font-mono text-tiny">£${parseFloat(s.value_estimate_gbp).toFixed(0)}k</span>` : ''}
                <span class="jarvis-pill text-pill" style="background: ${statusColor}; color: #fff;">
                  ${s.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            ${s.package_details ? `<p class="text-tiny text-tertiary">${s.package_details}</p>` : ''}
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('[RBTR] Load sponsors failed:', error);
      document.getElementById('sponsors-signed-count').textContent = 'ERR';
    }
  },

  newSponsorEmail() {
    JARVIS.Toast({ message: 'Bulk email template (Phase 4 TODO)', duration: 2000 });
  },

  // ── BUILD TRACKER (FULL IMPLEMENTATION) ────────────────────────────────────
  async renderBuildTracker() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Build Tracker</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="RBTR_MODULES.newBuildStage()">
            + New Stage
          </button>
          <span class="font-mono text-h2" style="color: var(--copper);" id="build-overall-progress">—</span>
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
            <div id="build-progress-bar" style="background: var(--copper); height: 100%; width: 0%; transition: width 0.6s;"></div>
          </div>
        </div>
      </div>

      <div id="build-stages-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
        Loading build stages...
      </div>

      <div class="jarvis-card" style="margin-top: 32px;">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Build Bible Links</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">PDF links to detailed build specs (Phase 4 TODO: build_bible table)</p>
        </div>
      </div>
    `;

    this.loadBuildStages();
  },

  async loadBuildStages() {
    try {
      const stages = await API.supabaseQuery('cc_build_progress', 'select=*&order=stage_number.asc');

      // Default 10-stage structure if no data
      const defaultStages = [
        'Acquisition', 'Strip', 'Fabrication', 'Electrical', 'Plumbing',
        'Interior', 'Exterior', 'Systems', 'Shakedown', 'Complete'
      ];

      let stagesData = stages && stages.length > 0 ? stages : defaultStages.map((name, i) => ({
        id: null,
        stage_name: name,
        stage_number: i + 1,
        status: 'not_started',
        target_week: null,
        actual_week: null
      }));

      // Calculate progress
      const completedCount = stagesData.filter(s => s.status === 'complete').length;
      const overallProgress = (completedCount / stagesData.length) * 100;

      document.getElementById('build-overall-progress').textContent = `${Math.round(overallProgress)}%`;
      document.getElementById('build-progress-bar').style.width = `${overallProgress}%`;

      // Render stage cards
      const stageCards = stagesData.map((stage, i) => {
        const progress = stage.status === 'complete' ? 100 :
                         stage.status === 'in_progress' ? 50 : 0;
        const ring = JARVIS.ProgressRing({ percent: progress, size: 72, label: `${progress}%` });

        const statusColor = stage.status === 'complete' ? '#4CAF50' :
                            stage.status === 'in_progress' ? 'var(--copper)' :
                            stage.status === 'blocked' ? '#f44336' : '#999';

        return `
          <div class="jarvis-card" style="background: var(--surface-deep); cursor: pointer;"
               onclick="RBTR_MODULES.viewBuildStageDetail('${stage.id}', ${i + 1})">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div>${ring.outerHTML}</div>
              <div style="flex: 1;">
                <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 4px;">
                  ${i + 1}. ${stage.stage_name}
                </h4>
                <p class="text-small" style="color: ${statusColor};">
                  ${stage.status === 'complete' ? '✓ Complete' :
                    stage.status === 'in_progress' ? 'In progress' :
                    stage.status === 'blocked' ? '⚠️ Blocked' : 'Not started'}
                </p>
                ${stage.target_week ? `<p class="text-tiny text-tertiary">Target: Week ${stage.target_week}</p>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      document.getElementById('build-stages-container').innerHTML = stageCards;
    } catch (error) {
      console.error('[RBTR] Load build stages failed:', error);
      document.getElementById('build-stages-container').innerHTML = '<p class="text-small text-tertiary">Failed to load build stages.</p>';
    }
  },

  // ── ROUTE MAP ──────────────────────────────────────────────────────────────
  renderRouteMap() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Route Map</h1>
      </div>

      <div class="jarvis-card" style="margin-bottom: 32px;">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">45-Country Route</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 16px;">
            UK → Europe → Mediterranean → Africa → South America → North America → Alaska
          </p>

          <div style="background: var(--surface-deep); height: 400px; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
            <p class="text-small text-tertiary">Leaflet interactive map coming soon — 45 countries, 3 shipping legs (Morocco→Brazil, Argentina→Chile, Chile→Alaska)</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 16px; height: 3px; background: var(--copper);"></div>
              <span class="text-tiny text-tertiary">Overland route</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 16px; height: 3px; background: var(--copper); border-top: 2px dashed var(--bg);"></div>
              <span class="text-tiny text-tertiary">Shipping legs (3)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; background: var(--copper); border-radius: 50%;"></div>
              <span class="text-tiny text-tertiary">Key waypoints</span>
            </div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Year 1: Europe + Africa</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small">UK, France, Spain, Portugal, Morocco, Western Sahara, Mauritania, Senegal, Mali, Burkina Faso, Ivory Coast, Ghana</p>
            <p class="text-tiny text-tertiary" style="margin-top: 8px;">12 countries | Ship: Morocco → Brazil</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Year 2-3: South America</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small">Brazil, Uruguay, Argentina, Chile, Bolivia, Peru, Ecuador, Colombia, Venezuela, Guyana, Suriname, French Guiana</p>
            <p class="text-tiny text-tertiary" style="margin-top: 8px;">12 countries | Ship: Argentina → Chile (Patagonia)</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Year 3-4: Central + North America</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small">Panama, Costa Rica, Nicaragua, Honduras, El Salvador, Guatemala, Belize, Mexico, USA (lower 48), Canada</p>
            <p class="text-tiny text-tertiary" style="margin-top: 8px;">10 countries | Ship: Chile → Alaska (final leg)</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Year 5: Alaska Basecamp</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small">Alaska wilderness, Denali, Yukon border, Arctic Circle, final content sprint</p>
            <p class="text-tiny text-tertiary" style="margin-top: 8px;">1 territory | 365 days stationary</p>
          </div>
        </div>
      </div>
    `;
  },

  // ── ITINERARY ──────────────────────────────────────────────────────────────
  renderItinerary() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Expedition Itinerary</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="RBTR_MODULES.downloadItineraryPDF()">
            📥 Download PDF
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Countries</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">45</div>
            <p class="text-small text-tertiary">5-year route</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Visas Required</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">18</div>
            <p class="text-small text-tertiary">Pre-arranged or on-arrival</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Vaccinations</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">9</div>
            <p class="text-small text-tertiary">Yellow fever, typhoid, hepatitis, etc.</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Border Crossings</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">42</div>
            <p class="text-small text-tertiary">Land crossings with truck</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">45 Countries (By Region)</h3>
          <div class="jarvis-tabs" style="margin-top: 16px;" id="itinerary-tabs">
            <button class="jarvis-tab jarvis-tab--active" data-tab="all" onclick="RBTR_MODULES.setItineraryTab('all')">All</button>
            <button class="jarvis-tab" data-tab="europe" onclick="RBTR_MODULES.setItineraryTab('europe')">Europe</button>
            <button class="jarvis-tab" data-tab="africa" onclick="RBTR_MODULES.setItineraryTab('africa')">Africa</button>
            <button class="jarvis-tab" data-tab="south_america" onclick="RBTR_MODULES.setItineraryTab('south_america')">S. America</button>
            <button class="jarvis-tab" data-tab="north_america" onclick="RBTR_MODULES.setItineraryTab('north_america')">N. America</button>
          </div>
        </div>
        <div class="jarvis-card__body">
          <div id="itinerary-list">
            ${this.renderItineraryList('all')}
          </div>
        </div>
      </div>
    `;
  },

  itineraryTab: 'all',

  setItineraryTab(tab) {
    this.itineraryTab = tab;
    document.querySelectorAll('#itinerary-tabs .jarvis-tab').forEach(btn => {
      btn.classList.toggle('jarvis-tab--active', btn.dataset.tab === tab);
    });
    document.getElementById('itinerary-list').innerHTML = this.renderItineraryList(tab);
  },

  renderItineraryList(region) {
    const countries = {
      europe: [
        { country: 'UK', visa: 'No', vaccinations: 'None', days: 0, notes: 'Departure point Jul 1 2027' },
        { country: 'France', visa: 'No (EU)', vaccinations: 'None', days: 14, notes: 'Ferry Dover → Calais' },
        { country: 'Spain', visa: 'No (EU)', vaccinations: 'None', days: 21, notes: 'Basque Country, Barcelona, Andalucia' },
        { country: 'Portugal', visa: 'No (EU)', vaccinations: 'None', days: 14, notes: 'Lisbon, Algarve coast' }
      ],
      africa: [
        { country: 'Morocco', visa: 'No (90d)', vaccinations: 'Hep A, Typhoid', days: 30, notes: 'Tangier → Marrakech → Sahara' },
        { country: 'Western Sahara', visa: 'No', vaccinations: 'Hep A, Typhoid', days: 7, notes: 'Transit to Mauritania' },
        { country: 'Mauritania', visa: 'On arrival', vaccinations: 'Yellow Fever, Hep A', days: 14, notes: 'Nouakchott, desert crossing' },
        { country: 'Senegal', visa: 'On arrival', vaccinations: 'Yellow Fever, Malaria', days: 10, notes: 'Dakar, St. Louis' },
        { country: 'Mali', visa: 'Pre-arranged', vaccinations: 'Yellow Fever, Malaria', days: 14, notes: 'Bamako, Timbuktu' },
        { country: 'Burkina Faso', visa: 'On arrival', vaccinations: 'Yellow Fever, Malaria', days: 7, notes: 'Ouagadougou, transit' },
        { country: 'Ivory Coast', visa: 'Pre-arranged', vaccinations: 'Yellow Fever, Malaria', days: 10, notes: 'Abidjan, Yamoussoukro' },
        { country: 'Ghana', visa: 'On arrival', vaccinations: 'Yellow Fever, Malaria', days: 14, notes: 'Accra, Cape Coast' }
      ],
      south_america: [
        { country: 'Brazil', visa: 'No (90d)', vaccinations: 'Yellow Fever, Hep A', days: 60, notes: 'Ship arrival, Salvador, Rio, Amazon' },
        { country: 'Uruguay', visa: 'No', vaccinations: 'None', days: 14, notes: 'Montevideo, Punta del Este' },
        { country: 'Argentina', visa: 'No', vaccinations: 'None', days: 90, notes: 'Buenos Aires, Iguazu, Patagonia' },
        { country: 'Chile', visa: 'No', vaccinations: 'None', days: 60, notes: 'Santiago, Atacama, Patagonia' },
        { country: 'Bolivia', visa: 'On arrival', vaccinations: 'Yellow Fever, Typhoid', days: 30, notes: 'La Paz, Uyuni Salt Flats' },
        { country: 'Peru', visa: 'No', vaccinations: 'Yellow Fever, Hep A', days: 45, notes: 'Cusco, Machu Picchu, Lima' },
        { country: 'Ecuador', visa: 'No', vaccinations: 'Yellow Fever, Hep A', days: 30, notes: 'Quito, Galapagos (optional)' },
        { country: 'Colombia', visa: 'No', vaccinations: 'Yellow Fever, Hep A', days: 30, notes: 'Bogota, Cartagena, coffee region' },
        { country: 'Venezuela', visa: 'Pre-arranged', vaccinations: 'Yellow Fever, Malaria', days: 14, notes: 'Caracas, Angel Falls' },
        { country: 'Guyana', visa: 'On arrival', vaccinations: 'Yellow Fever, Malaria', days: 7, notes: 'Georgetown, Kaieteur Falls' },
        { country: 'Suriname', visa: 'On arrival', vaccinations: 'Yellow Fever, Malaria', days: 7, notes: 'Paramaribo, rainforest' },
        { country: 'French Guiana', visa: 'No (EU)', vaccinations: 'Yellow Fever, Malaria', days: 7, notes: 'Cayenne, space centre' }
      ],
      north_america: [
        { country: 'Panama', visa: 'No', vaccinations: 'Hep A, Typhoid', days: 21, notes: 'Panama City, canal, Bocas del Toro' },
        { country: 'Costa Rica', visa: 'No', vaccinations: 'Hep A, Typhoid', days: 21, notes: 'San Jose, Arenal, beaches' },
        { country: 'Nicaragua', visa: 'On arrival', vaccinations: 'Hep A, Typhoid', days: 14, notes: 'Managua, Granada, volcanoes' },
        { country: 'Honduras', visa: 'On arrival', vaccinations: 'Hep A, Typhoid', days: 10, notes: 'Tegucigalpa, Bay Islands' },
        { country: 'El Salvador', visa: 'On arrival', vaccinations: 'Hep A, Typhoid', days: 7, notes: 'San Salvador, surf beaches' },
        { country: 'Guatemala', visa: 'On arrival', vaccinations: 'Hep A, Typhoid', days: 21, notes: 'Antigua, Tikal, Lake Atitlan' },
        { country: 'Belize', visa: 'On arrival', vaccinations: 'Hep A, Typhoid', days: 10, notes: 'Belize City, barrier reef' },
        { country: 'Mexico', visa: 'No', vaccinations: 'Hep A, Typhoid', days: 90, notes: 'Cancun, Oaxaca, Mexico City, Baja' },
        { country: 'USA', visa: 'ESTA', vaccinations: 'None', days: 180, notes: 'Lower 48 states, national parks' },
        { country: 'Canada', visa: 'eTA', vaccinations: 'None', days: 90, notes: 'Vancouver, Rockies, Yukon' },
        { country: 'Alaska', visa: 'No (USA)', vaccinations: 'None', days: 365, notes: 'Final basecamp — 1 year stationary' }
      ]
    };

    const filtered = region === 'all'
      ? Object.values(countries).flat()
      : countries[region] || [];

    return filtered.map(c => `
      <div class="jarvis-card" style="background: var(--surface-deep); margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div>
            <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 4px;">${c.country}</h4>
            <p class="text-small text-secondary">${c.notes}</p>
          </div>
          <span class="jarvis-pill ${c.visa === 'No' || c.visa.includes('No (') ? 'jarvis-pill--live' : ''} font-mono text-pill">
            ${c.days}d
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
          <div>
            <p class="text-tiny text-tertiary">Visa</p>
            <p class="text-small">${c.visa}</p>
          </div>
          <div>
            <p class="text-tiny text-tertiary">Vaccinations</p>
            <p class="text-small">${c.vaccinations}</p>
          </div>
        </div>
      </div>
    `).join('');
  },

  downloadItineraryPDF() {
    JARVIS.Toast({ message: 'PDF download coming soon — full itinerary with border crossing notes', duration: 2000 });
  },

  // ── CONTENT ENGINE ─────────────────────────────────────────────────────────
  async renderContentEngine() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Content Engine</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="RBTR_MODULES.newContentDraft()">
            + New Draft
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Published (Total)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Videos + posts live</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Drafts</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">8</div>
            <p class="text-small text-tertiary">In pipeline</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Publishing Rate</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Per week (target: 3)</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Subscribers</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">YouTube + social</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Content Pipeline</h3>
          <div class="jarvis-tabs" style="margin-top: 16px;" id="content-tabs">
            <button class="jarvis-tab jarvis-tab--active" data-tab="draft" onclick="RBTR_MODULES.setContentTab('draft')">Drafts</button>
            <button class="jarvis-tab" data-tab="filming" onclick="RBTR_MODULES.setContentTab('filming')">Filming</button>
            <button class="jarvis-tab" data-tab="editing" onclick="RBTR_MODULES.setContentTab('editing')">Editing</button>
            <button class="jarvis-tab" data-tab="published" onclick="RBTR_MODULES.setContentTab('published')">Published</button>
          </div>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">YouTube + social content pipeline. Wire to rbtr_content_drafts + rbtr_content_published tables (migrations 60+62 applied).</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Content types: Build diaries, Sponsor features, Expedition prep, Training vlogs, Family life, Behind-the-scenes
          </p>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Content Calendar (Next 30 Days)</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">No content scheduled yet. Start building pipeline for pre-departure content sprint.</p>
        </div>
      </div>
    `;
  },

  contentTab: 'draft',

  setContentTab(tab) {
    this.contentTab = tab;
    document.querySelectorAll('#content-tabs .jarvis-tab').forEach(btn => {
      btn.classList.toggle('jarvis-tab--active', btn.dataset.tab === tab);
    });
  },

  newContentDraft() {
    JARVIS.Toast({ message: 'Content draft form coming soon — wire to rbtr_content_drafts', duration: 2000 });
  },

  // ── CAMERA GEAR ────────────────────────────────────────────────────────────
  renderCameraGear() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Camera Gear</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Budget</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£18k</div>
            <p class="text-small text-tertiary">Full kit + spares</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Purchased</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£0</div>
            <p class="text-small text-tertiary">0% complete</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Remaining</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£18k</div>
            <p class="text-small text-tertiary">To purchase</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Target Date</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">May 27</div>
            <p class="text-small text-tertiary">All kit acquired</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Core Kit List</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <h4 class="text-small font-weight-600">Sony A7S III (x2)</h4>
                <p class="text-tiny text-tertiary">Primary video cameras + backup</p>
              </div>
              <span class="font-mono text-small" style="color: var(--copper);">£7,000</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <h4 class="text-small font-weight-600">DJI Mavic 3 Pro</h4>
                <p class="text-tiny text-tertiary">Aerial footage + backup batteries</p>
              </div>
              <span class="font-mono text-small" style="color: var(--copper);">£2,200</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <h4 class="text-small font-weight-600">Sony 24-70mm f/2.8 GM II</h4>
                <p class="text-tiny text-tertiary">Primary lens</p>
              </div>
              <span class="font-mono text-small" style="color: var(--copper);">£2,300</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <h4 class="text-small font-weight-600">Sony 16-35mm f/2.8 GM</h4>
                <p class="text-tiny text-tertiary">Wide angle landscapes</p>
              </div>
              <span class="font-mono text-small" style="color: var(--copper);">£1,800</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <h4 class="text-small font-weight-600">DJI RS 3 Pro Gimbal</h4>
                <p class="text-tiny text-tertiary">Stabilized handheld shots</p>
              </div>
              <span class="font-mono text-small" style="color: var(--copper);">£900</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <h4 class="text-small font-weight-600">Rode Wireless Pro</h4>
                <p class="text-tiny text-tertiary">Audio (interviews + vlogs)</p>
              </div>
              <span class="font-mono text-small" style="color: var(--copper);">£400</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div>
                <h4 class="text-small font-weight-600">Batteries + Media + Spares</h4>
                <p class="text-tiny text-tertiary">NP-FZ100 batteries, CFexpress cards, cables</p>
              </div>
              <span class="font-mono text-small" style="color: var(--copper);">£3,400</span>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Buy Schedule (Tied to Cash Flow)</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Phased purchase plan aligned with PSNM + Booking Proof revenue.</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Phase 1 (Oct 2026): Cameras + primary lens (£9,300)<br>
            Phase 2 (Jan 2027): Drone + wide lens (£4,000)<br>
            Phase 3 (Apr 2027): Gimbal + audio + spares (£4,700)
          </p>
        </div>
      </div>
    `;
  },
  // ── BUILD FINANCIALS ───────────────────────────────────────────────────────
  renderBuildFinancials() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Build Phase Financials</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Budget</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£185k</div>
            <p class="text-small text-tertiary">Build phase (Apr 2026 → Jul 2027)</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Spent to Date</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£28k</div>
            <p class="text-small text-tertiary">15% of budget</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Remaining</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£157k</div>
            <p class="text-small text-tertiary">14 months until departure</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Monthly Burn</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£11.2k</div>
            <p class="text-small text-tertiary">Required avg. spend</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Build Budget Breakdown</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Truck acquisition</span>
              <span class="font-mono text-small" style="color: var(--copper);">£45k (complete)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Fabrication (box, pop-top, windows)</span>
              <span class="font-mono text-small" style="color: var(--copper);">£35k (pending)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Electrical system (solar, lithium, inverter)</span>
              <span class="font-mono text-small" style="color: var(--copper);">£18k (pending)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Plumbing (water tanks, heater, shower)</span>
              <span class="font-mono text-small" style="color: var(--copper);">£8k (pending)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Interior fitout (kitchen, beds, storage)</span>
              <span class="font-mono text-small" style="color: var(--copper);">£22k (pending)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Exterior (paint, ladder, awning, roof rack)</span>
              <span class="font-mono text-small" style="color: var(--copper);">£12k (pending)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Systems (comms, navigation, recovery gear)</span>
              <span class="font-mono text-small" style="color: var(--copper);">£15k (pending)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Camera gear</span>
              <span class="font-mono text-small" style="color: var(--copper);">£18k (pending)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Spares + contingency</span>
              <span class="font-mono text-small" style="color: var(--copper);">£12k (buffer)</span>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Cash Flow Projection (Apr 2026 → Jul 2027)</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Revenue sources: PSNM (£18k/mo MRR), Booking Proof (£8k/mo target), Ben savings, sponsor contracts.</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Projected total income: £220k (15 months) → £185k build budget + £35k living costs buffer
          </p>
        </div>
      </div>
    `;
  },

  // ── EXPEDITION FINANCIALS ──────────────────────────────────────────────────
  renderExpeditionFinancials() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Expedition Financials</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">5-Year Budget</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£180k</div>
            <p class="text-small text-tertiary">Total expedition cost</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Monthly Burn</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£3k</div>
            <p class="text-small text-tertiary">Avg. monthly spend on road</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Revenue Target</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£4k</div>
            <p class="text-small text-tertiary">Monthly from YouTube + Patreon</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Sponsor Contracts</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£60k</div>
            <p class="text-small text-tertiary">Target sponsor income (5 years)</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">On-Road Budget (Years 1-5)</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Fuel (diesel + shipping)</span>
              <span class="font-mono text-small" style="color: var(--copper);">£45k</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Food + supplies</span>
              <span class="font-mono text-small" style="color: var(--copper);">£36k</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Visas + border crossings</span>
              <span class="font-mono text-small" style="color: var(--copper);">£12k</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Vehicle maintenance + repairs</span>
              <span class="font-mono text-small" style="color: var(--copper);">£25k</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Insurance + vehicle docs</span>
              <span class="font-mono text-small" style="color: var(--copper);">£18k</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Campsites + accommodation (occasional)</span>
              <span class="font-mono text-small" style="color: var(--copper);">£15k</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Medical + vaccinations</span>
              <span class="font-mono text-small" style="color: var(--copper);">£8k</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Communications (Starlink, SIM cards)</span>
              <span class="font-mono text-small" style="color: var(--copper);">£9k</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Contingency + emergencies</span>
              <span class="font-mono text-small" style="color: var(--copper);">£12k</span>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Revenue Model</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 12px;">Target: £4k/mo passive income from content + sponsors.</p>

          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">YouTube AdSense</h4>
              <p class="text-tiny text-tertiary">Target: 100k subs, 2M views/mo → £1.5k/mo</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Patreon (3 tiers)</h4>
              <p class="text-tiny text-tertiary">Target: 500 patrons @ avg £8/mo → £4k/mo (see Subscriber Tiers module)</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Sponsor contracts (53 targets)</h4>
              <p class="text-tiny text-tertiary">Target: 15 sponsors @ £4k/yr → £60k over 5 years</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Merch (Phase 2)</h4>
              <p class="text-tiny text-tertiary">Shopify + Printful POD → est. £500/mo</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── JOB ROLES ──────────────────────────────────────────────────────────────
  renderJobRoles() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Job Roles</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Ben</h3>
          </div>
          <div class="jarvis-card__body">
            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
              <li class="text-small">✓ Filming + photography</li>
              <li class="text-small">✓ Video editing (DaVinci Resolve)</li>
              <li class="text-small">✓ Vehicle maintenance + repairs</li>
              <li class="text-small">✓ Route planning + navigation</li>
              <li class="text-small">✓ Sponsor outreach + contracts</li>
              <li class="text-small">✓ Social media (YouTube, IG, TikTok)</li>
              <li class="text-small">✓ Build project management</li>
              <li class="text-small">✓ Mechanical work (truck build)</li>
              <li class="text-small">✓ Educational content (homeschooling support)</li>
            </ul>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Sarah</h3>
          </div>
          <div class="jarvis-card__body">
            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
              <li class="text-small">✓ Homeschooling lead (Hudson + Benson)</li>
              <li class="text-small">✓ Meal planning + cooking</li>
              <li class="text-small">✓ Family logistics + health</li>
              <li class="text-small">✓ Interior design (truck fitout)</li>
              <li class="text-small">✓ Social media support (IG stories, FB)</li>
              <li class="text-small">✓ Booking Proof SaaS founder</li>
              <li class="text-small">✓ Forge STR business (AirBnB operations)</li>
              <li class="text-small">✓ Patreon community management</li>
              <li class="text-small">✓ Merch design + Printful liaison</li>
            </ul>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Hudson (10) + Benson (8)</h3>
          </div>
          <div class="jarvis-card__body">
            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
              <li class="text-small">✓ On-camera talent (vlogs)</li>
              <li class="text-small">✓ Photography (kid's perspective)</li>
              <li class="text-small">✓ Daily chores (water fill, trash, dog care)</li>
              <li class="text-small">✓ Language practice (Spanish, Portuguese, French)</li>
              <li class="text-small">✓ Cultural immersion ambassadors</li>
              <li class="text-small">✓ Homeschool projects (geography, history, science)</li>
            </ul>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Peanut (Dog)</h3>
          </div>
          <div class="jarvis-card__body">
            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
              <li class="text-small">✓ Morale officer</li>
              <li class="text-small">✓ Campsite security</li>
              <li class="text-small">✓ Content gold (Instagram appeal)</li>
              <li class="text-small">✓ Daily exercise enforcer (walks)</li>
              <li class="text-small">✓ Cultural bridge (universal dog language)</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  },

  // ── SOCIAL PAGES ───────────────────────────────────────────────────────────
  renderSocialPages() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Social Pages</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Quick Launch</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('https://youtube.com/@rbtr-coming-soon', '_blank')" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-small">YouTube</span>
              <span class="text-tiny text-tertiary">@rbtr-coming-soon</span>
            </button>

            <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('https://instagram.com/rbtr-coming-soon', '_blank')" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-small">Instagram</span>
              <span class="text-tiny text-tertiary">@rbtr-coming-soon</span>
            </button>

            <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('https://tiktok.com/@rbtr-coming-soon', '_blank')" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-small">TikTok</span>
              <span class="text-tiny text-tertiary">@rbtr-coming-soon</span>
            </button>

            <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('https://facebook.com/rbtr-coming-soon', '_blank')" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-small">Facebook</span>
              <span class="text-tiny text-tertiary">@rbtr-coming-soon</span>
            </button>

            <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('https://patreon.com/rbtr-coming-soon', '_blank')" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-small">Patreon</span>
              <span class="text-tiny text-tertiary">3-tier membership (not yet launched)</span>
            </button>
          </div>

          <p class="text-tiny text-tertiary" style="margin-top: 16px; color: var(--copper);">
            Note: Real URLs pending. Replace placeholder URLs with actual social media handles before launch.
          </p>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Content Editing Tools</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <button class="jarvis-btn jarvis-btn--ghost" onclick="window.open('davinciresolve://open', '_blank')">
              DaVinci Resolve (Video editing)
            </button>
            <button class="jarvis-btn jarvis-btn--ghost" onclick="window.open('capcut://open', '_blank')">
              CapCut (Quick edits + mobile)
            </button>
            <button class="jarvis-btn jarvis-btn--ghost" onclick="window.open('https://lightroom.adobe.com', '_blank')">
              Adobe Lightroom (Photo editing)
            </button>
            <button class="jarvis-btn jarvis-btn--ghost" onclick="window.open('https://descript.com', '_blank')">
              Descript (Transcription + audio)
            </button>
            <button class="jarvis-btn jarvis-btn--ghost" onclick="window.open('https://epidemicsound.com', '_blank')">
              Epidemic Sound (Royalty-free music)
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ── RESURRECTION DAYS ──────────────────────────────────────────────────────
  renderResurrectionDays() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Resurrection Days</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Current Streak</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Days completed</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Target</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">30</div>
            <p class="text-small text-tertiary">Total days</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Completion</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0%</div>
            <p class="text-small text-tertiary">Progress</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Start Date</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">TBD</div>
            <p class="text-small text-tertiary">Not yet started</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">30-Day Accountability Challenge</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 12px;">
            30 consecutive days of discipline across fitness, content creation, and build work. Track daily completion + reset on miss.
          </p>

          <div style="display: grid; gap: 8px;">
            <h4 class="text-small font-weight-600" style="margin-top: 12px;">Daily Requirements:</h4>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" disabled />
              <span class="text-small">Training session (1h minimum)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" disabled />
              <span class="text-small">Content creation (film or edit)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" disabled />
              <span class="text-small">Build work (truck or admin)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" disabled />
              <span class="text-small">No alcohol</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" disabled />
              <span class="text-small">7+ hours sleep</span>
            </label>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">30-Day Calendar</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Calendar grid coming soon — visual progress tracker with streak protection + reset logic.</p>
        </div>
      </div>
    `;
  },

  // ── GUY & SHARRON MARTIN ───────────────────────────────────────────────────
  renderGuyAndSharronMartin() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Guy & Sharron Martin</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Workshop + Garage Access</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 12px;">
            Guy + Sharron Martin are providing workshop space + mechanical expertise for Arocs 6x6 build.
          </p>

          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Workshop Location</h4>
              <p class="text-tiny text-tertiary">Rotherham, South Yorkshire (10 min from Ben's house)</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Access Schedule</h4>
              <p class="text-tiny text-tertiary">Weekends + evenings (by arrangement)</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Tools Available</h4>
              <p class="text-tiny text-tertiary">Full garage setup: welders, grinders, power tools, vehicle lift, air compressor</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Guy's Expertise</h4>
              <p class="text-tiny text-tertiary">40+ years mechanical experience, HGV specialist, fabrication skills</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Build Support Log</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Track workshop sessions, Guy's input, materials borrowed, reciprocal favors. Coming soon.</p>
        </div>
      </div>
    `;
  },
  // ── SKILLS TRACKER ─────────────────────────────────────────────────────────
  renderSkillsTracker() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Skills Tracker</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Video / Photography / Editing Roadmap</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 16px;">
            Skill development plan for professional-quality content creation. Target: camera-ready by Jun 2027.
          </p>

          <div style="display: grid; gap: 16px;">
            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 8px;">
                <h4 class="font-display text-h2" style="font-size: 16px;">Camera Operation</h4>
                <span class="font-mono text-small" style="color: var(--copper);">60%</span>
              </div>
              <div style="background: var(--surface); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                <div style="background: var(--copper); height: 100%; width: 60%; transition: width 0.6s;"></div>
              </div>
              <p class="text-tiny text-tertiary">Master Sony A7S III settings, manual focus, exposure triangle, ISO/shutter/aperture</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 class="font-display text-h2" style="font-size: 16px;">Composition & Framing</h4>
                <span class="font-mono text-small" style="color: var(--copper);">45%</span>
              </div>
              <div style="background: var(--surface); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                <div style="background: var(--copper); height: 100%; width: 45%; transition: width 0.6s;"></div>
              </div>
              <p class="text-tiny text-tertiary">Rule of thirds, leading lines, depth, dynamic angles, B-roll storytelling</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 class="font-display text-h2" style="font-size: 16px;">DaVinci Resolve Editing</h4>
                <span class="font-mono text-small" style="color: var(--copper);">30%</span>
              </div>
              <div style="background: var(--surface); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                <div style="background: var(--copper); height: 100%; width: 30%; transition: width 0.6s;"></div>
              </div>
              <p class="text-tiny text-tertiary">Cut/trim, color grading, audio mixing, transitions, export optimization for YouTube</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 class="font-display text-h2" style="font-size: 16px;">Lighting</h4>
                <span class="font-mono text-small" style="color: var(--copper);">20%</span>
              </div>
              <div style="background: var(--surface); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                <div style="background: var(--copper); height: 100%; width: 20%; transition: width 0.6s;"></div>
              </div>
              <p class="text-tiny text-tertiary">Natural light use, golden hour, softbox setup, 3-point lighting for interviews</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 class="font-display text-h2" style="font-size: 16px;">Audio Recording</h4>
                <span class="font-mono text-small" style="color: var(--copper);">40%</span>
              </div>
              <div style="background: var(--surface); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                <div style="background: var(--copper); height: 100%; width: 40%; transition: width 0.6s;"></div>
              </div>
              <p class="text-tiny text-tertiary">Lavalier mic placement, wind protection, audio levels, noise reduction in post</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 class="font-display text-h2" style="font-size: 16px;">Drone Operation</h4>
                <span class="font-mono text-small" style="color: var(--copper);">15%</span>
              </div>
              <div style="background: var(--surface); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                <div style="background: var(--copper); height: 100%; width: 15%; transition: width 0.6s;"></div>
              </div>
              <p class="text-tiny text-tertiary">DJI Mavic 3 Pro flight, cinematic moves, ND filters, battery management, CAA regs</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 class="font-display text-h2" style="font-size: 16px;">Storytelling Structure</h4>
                <span class="font-mono text-small" style="color: var(--copper);">35%</span>
              </div>
              <div style="background: var(--surface); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                <div style="background: var(--copper); height: 100%; width: 35%; transition: width 0.6s;"></div>
              </div>
              <p class="text-tiny text-tertiary">Narrative arc, hook + payoff, emotional beats, pacing, audience retention strategies</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 class="font-display text-h2" style="font-size: 16px;">YouTube SEO + Thumbnails</h4>
                <span class="font-mono text-small" style="color: var(--copper);">25%</span>
              </div>
              <div style="background: var(--surface); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                <div style="background: var(--copper); height: 100%; width: 25%; transition: width 0.6s;"></div>
              </div>
              <p class="text-tiny text-tertiary">Keyword research, titles, tags, thumbnail design (contrast + text), CTR optimization</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Learning Resources</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Peter McKinnon (YouTube)</h4>
              <p class="text-tiny text-tertiary">Photography + videography tutorials, creative storytelling</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Corridor Crew (YouTube)</h4>
              <p class="text-tiny text-tertiary">VFX breakdowns, filmmaking techniques, gear reviews</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">DaVinci Resolve Official Tutorials</h4>
              <p class="text-tiny text-tertiary">Blackmagic's free training series on editing + color grading</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Paddy Galloway (YouTube)</h4>
              <p class="text-tiny text-tertiary">YouTube SEO, thumbnails, audience retention, algorithm strategies</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── SUBSCRIBER TIERS ───────────────────────────────────────────────────────
  renderSubscriberTiers() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Subscriber Tiers</h1>
      </div>

      <div class="jarvis-card" style="border: 2px solid var(--copper); margin-bottom: 32px;">
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">
            <strong style="color: var(--copper);">PHASE 2 PRODUCT</strong> — Patreon membership tiers launching after first 10k YouTube subscribers. Design locked, pricing set, benefits defined. Launch ETA: Q1 2028 (6 months into expedition).
          </p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Free Tier</h3>
            <p class="text-small" style="color: var(--copper); margin-top: 4px;">£0/month</p>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary" style="margin-bottom: 12px;">Public YouTube content + social media</p>

            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
              <li class="text-small">✓ Weekly YouTube vlogs (10-15 min)</li>
              <li class="text-small">✓ Instagram stories + reels</li>
              <li class="text-small">✓ TikTok short-form content</li>
              <li class="text-small">✓ Facebook family updates</li>
            </ul>
          </div>
        </div>

        <div class="jarvis-card" style="border: 2px solid var(--copper);">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Explorer Tier</h3>
            <p class="text-small" style="color: var(--copper); margin-top: 4px;">£5/month</p>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary" style="margin-bottom: 12px;">Extended content + behind-the-scenes</p>

            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
              <li class="text-small">✓ All Free Tier content</li>
              <li class="text-small">✓ Extended cuts (20-30 min episodes)</li>
              <li class="text-small">✓ Behind-the-scenes footage</li>
              <li class="text-small">✓ Early access (48h before public)</li>
              <li class="text-small">✓ Patron-only Discord channel</li>
              <li class="text-small">✓ Monthly live Q&A</li>
            </ul>
          </div>
        </div>

        <div class="jarvis-card" style="border: 2px solid var(--copper);">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Pioneer Tier</h3>
            <p class="text-small" style="color: var(--copper); margin-top: 4px;">£15/month</p>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary" style="margin-bottom: 12px;">Premium access + influence + recognition</p>

            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
              <li class="text-small">✓ All Explorer Tier content</li>
              <li class="text-small">✓ Weekly exclusive vlogs (family-only)</li>
              <li class="text-small">✓ Route + itinerary input (vote on destinations)</li>
              <li class="text-small">✓ Name on truck (vinyl decal)</li>
              <li class="text-small">✓ Monthly video call (group, 10-15 Pioneers)</li>
              <li class="text-small">✓ Postcard from each country</li>
              <li class="text-small">✓ Access to photo vault (RAW files)</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Projected Revenue (Target: 500 patrons)</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">300 Explorer @ £5/mo</span>
              <span class="font-mono text-small" style="color: var(--copper);">£1,500/mo</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">200 Pioneer @ £15/mo</span>
              <span class="font-mono text-small" style="color: var(--copper);">£3,000/mo</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px; border: 2px solid var(--copper);">
              <span class="text-small font-weight-600">Total MRR (target)</span>
              <span class="font-mono text-small font-weight-600" style="color: var(--copper);">£4,500/mo</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── MERCH ──────────────────────────────────────────────────────────────────
  renderMerch() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Merch Store</h1>
      </div>

      <div class="jarvis-card" style="border: 2px solid var(--copper); margin-bottom: 32px;">
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">
            <strong style="color: var(--copper);">PHASE 2 PRODUCT</strong> — Shopify + Printful print-on-demand store launching Q2 2028 (1 year into expedition). Zero inventory risk, designs ready, supplier confirmed.
          </p>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Product Line</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 class="text-small font-weight-600">RBTR T-Shirts</h4>
                <span class="font-mono text-small" style="color: var(--copper);">£22</span>
              </div>
              <p class="text-tiny text-tertiary" style="margin-top: 4px;">Organic cotton, 4 designs, sizes S-XXL</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 class="text-small font-weight-600">Hoodies</h4>
                <span class="font-mono text-small" style="color: var(--copper);">£42</span>
              </div>
              <p class="text-tiny text-tertiary" style="margin-top: 4px;">Heavy blend, embroidered logo, 2 colors</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 class="text-small font-weight-600">Baseball Caps</h4>
                <span class="font-mono text-small" style="color: var(--copper);">£18</span>
              </div>
              <p class="text-tiny text-tertiary" style="margin-top: 4px;">Adjustable, embroidered RBTR logo, 3 colors</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 class="text-small font-weight-600">Route Map Poster</h4>
                <span class="font-mono text-small" style="color: var(--copper);">£15</span>
              </div>
              <p class="text-tiny text-tertiary" style="margin-top: 4px;">A2 size, 45-country route, museum-quality print</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 class="text-small font-weight-600">Sticker Pack</h4>
                <span class="font-mono text-small" style="color: var(--copper);">£8</span>
              </div>
              <p class="text-tiny text-tertiary" style="margin-top: 4px;">6 vinyl stickers, weatherproof, RBTR + truck designs</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 class="text-small font-weight-600">Enamel Pins</h4>
                <span class="font-mono text-small" style="color: var(--copper);">£6</span>
              </div>
              <p class="text-tiny text-tertiary" style="margin-top: 4px;">3 designs: truck, compass, route flag</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Revenue Projection</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 12px;">
            Target: £500/mo passive income from merch. Conservative estimate based on 10k YouTube subs, 2% conversion rate.
          </p>

          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Avg. order value</span>
              <span class="font-mono text-small" style="color: var(--copper);">£35</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Orders/month (target)</span>
              <span class="font-mono text-small" style="color: var(--copper);">20</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Gross revenue/mo</span>
              <span class="font-mono text-small" style="color: var(--copper);">£700</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Printful fees + shipping (30%)</span>
              <span class="font-mono text-small" style="color: var(--copper);">-£210</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px; border: 2px solid var(--copper);">
              <span class="text-small font-weight-600">Net profit/mo</span>
              <span class="font-mono text-small font-weight-600" style="color: var(--copper);">£490</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── MEDIA VAULT ────────────────────────────────────────────────────────────
  renderMediaVault() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Media Vault</h1>
      </div>

      <div class="jarvis-card" style="border: 2px solid var(--copper); margin-bottom: 32px;">
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">
            <strong style="color: var(--copper);">PHASE 2 PRODUCT</strong> — Digital asset library launching Q3 2028 (18 months into expedition). RAW photo/video access for Pioneer tier patrons + stock footage sales.
          </p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Assets</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Photos + videos in vault</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Countries Covered</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0/45</div>
            <p class="text-small text-tertiary">Geographic coverage</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Storage Used</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0TB</div>
            <p class="text-small text-tertiary">Google Drive backup</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Licensed Sales</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£0</div>
            <p class="text-small text-tertiary">Stock footage revenue</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Media Categories</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Landscape Photography</h4>
              <p class="text-tiny text-tertiary">RAW + edited versions, country-organized, GPS tagged</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Drone Footage (4K)</h4>
              <p class="text-tiny text-tertiary">Aerial cinematics, landscape flybys, truck shots</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">B-Roll Library</h4>
              <p class="text-tiny text-tertiary">Driving shots, campfire, cooking, family moments, wildlife</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Cultural Moments</h4>
              <p class="text-tiny text-tertiary">Local markets, festivals, border crossings, people</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Build Timelapse</h4>
              <p class="text-tiny text-tertiary">60-week truck build condensed, 4K timelapse sequences</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Stock Footage (Licensed)</h4>
              <p class="text-tiny text-tertiary">4K clips for sale on Pond5, Shutterstock (passive income)</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Access Tiers</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Pioneer Patrons (£15/mo)</h4>
              <p class="text-tiny text-tertiary">Full vault access, download RAW files, personal use license</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Commercial Licensing</h4>
              <p class="text-tiny text-tertiary">Stock footage sales via Pond5/Shutterstock, 30% royalty split</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Behind-the-Scenes Archive</h4>
              <p class="text-tiny text-tertiary">Outtakes, bloopers, deleted scenes (Pioneer tier exclusive)</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── BUILD TRACKER ACTIONS ──────────────────────────────────────────────────

  newBuildStage() {
    JARVIS_ACTIONS.showFormModal('+ New Build Stage', [
      { name: 'stage_name', label: 'Stage Name', type: 'text', required: true },
      { name: 'stage_number', label: 'Stage Number', type: 'number', required: true },
      { name: 'target_week', label: 'Target Week (1-60)', type: 'number', required: false },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, required: false }
    ], async (data) => {
      const stageData = {
        ...data,
        stage_number: parseInt(data.stage_number),
        target_week: data.target_week ? parseInt(data.target_week) : null,
        status: 'not_started'
      };

      const result = await JARVIS_ACTIONS.createRecord('cc_build_progress', stageData, 'Build stage created');
      if (result) {
        this.renderBuildTracker();
      }
    });
  },

  async viewBuildStageDetail(stageId, stageNumber) {
    if (!stageId) {
      JARVIS.Toast({ message: 'Stage not yet created in database', duration: 2000 });
      return;
    }

    try {
      const stage = await API.supabaseQuery('cc_build_progress', `id=eq.${stageId}&select=*`);
      if (!stage || stage.length === 0) {
        JARVIS.Toast({ message: 'Stage not found', duration: 2000 });
        return;
      }

      const s = stage[0];
      const statusColor = s.status === 'complete' ? '#4CAF50' :
                          s.status === 'in_progress' ? 'var(--copper)' :
                          s.status === 'blocked' ? '#f44336' : '#999';

      JARVIS_ACTIONS.showDetailView(`Stage ${s.stage_number}: ${s.stage_name}`, [
        {
          id: 'overview',
          label: 'Details',
          content: `
            <div style="display: grid; gap: 16px;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Stage Number</p>
                  <p class="text-small">${s.stage_number}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Status</p>
                  <span class="jarvis-pill" style="background: ${statusColor}; color: #fff;">${s.status.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Target Week</p>
                  <p class="text-small">${s.target_week ? `Week ${s.target_week}` : '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Actual Week</p>
                  <p class="text-small">${s.actual_week ? `Week ${s.actual_week}` : '—'}</p>
                </div>
              </div>

              ${s.notes ? `
                <div>
                  <p class="text-tiny text-tertiary">Notes</p>
                  <p class="text-small">${s.notes}</p>
                </div>
              ` : ''}

              ${s.completed_at ? `
                <div>
                  <p class="text-tiny text-tertiary">Completed At</p>
                  <p class="text-small">${new Date(s.completed_at).toLocaleDateString('en-GB')}</p>
                </div>
              ` : ''}

              <div style="display: flex; gap: 12px; margin-top: 16px;">
                ${s.status === 'not_started' ? `
                  <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm"
                          onclick="RBTR_MODULES.markBuildStageStatus('${s.id}', 'in_progress')">
                    ▶️ Start Stage
                  </button>
                ` : ''}
                ${s.status === 'in_progress' ? `
                  <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm"
                          onclick="RBTR_MODULES.markBuildStageComplete('${s.id}')">
                    ✓ Mark Complete
                  </button>
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="RBTR_MODULES.markBuildStageStatus('${s.id}', 'blocked')">
                    ⚠️ Mark Blocked
                  </button>
                ` : ''}
                ${s.status === 'blocked' ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="RBTR_MODULES.markBuildStageStatus('${s.id}', 'in_progress')">
                    ↩️ Unblock
                  </button>
                ` : ''}
              </div>
            </div>
          `
        }
      ]);
    } catch (error) {
      console.error('[RBTR] View build stage failed:', error);
      JARVIS.Toast({ message: 'Failed to load stage', duration: 2000 });
    }
  },

  async markBuildStageStatus(stageId, newStatus) {
    const result = await JARVIS_ACTIONS.updateRecord('cc_build_progress', stageId, { status: newStatus }, `Status: ${newStatus.replace(/_/g, ' ')}`);
    if (result) {
      this.viewBuildStageDetail(stageId);
    }
  },

  async markBuildStageComplete(stageId) {
    JARVIS_ACTIONS.showFormModal('Mark Stage Complete', [
      { name: 'actual_week', label: 'Actual Week Completed', type: 'number', required: false }
    ], async (data) => {
      const updates = {
        status: 'complete',
        completed_at: new Date().toISOString(),
        actual_week: data.actual_week ? parseInt(data.actual_week) : null
      };

      const result = await JARVIS_ACTIONS.updateRecord('cc_build_progress', stageId, updates, 'Stage marked complete');
      if (result) {
        this.viewBuildStageDetail(stageId);
      }
    });
  },

  // ── SPONSOR ACTIONS ────────────────────────────────────────────────────────

  newSponsor() {
    JARVIS_ACTIONS.showFormModal('+ New Sponsor', [
      { name: 'company_name', label: 'Company Name', type: 'text', required: true },
      { name: 'contact_name', label: 'Contact Name', type: 'text', required: false },
      { name: 'contact_email', label: 'Contact Email', type: 'email', required: false },
      {
        name: 'sponsor_type',
        label: 'Sponsor Type',
        type: 'select',
        required: true,
        options: [
          { value: 'product', label: 'Product Sponsorship' },
          { value: 'cash', label: 'Cash Sponsorship' },
          { value: 'service', label: 'Service Sponsorship' }
        ]
      },
      { name: 'value_estimate_gbp', label: 'Estimated Value (£k)', type: 'number', required: false },
      { name: 'package_details', label: 'Package Details', type: 'textarea', rows: 3, required: false }
    ], async (data) => {
      const sponsorData = {
        ...data,
        value_estimate_gbp: data.value_estimate_gbp ? parseFloat(data.value_estimate_gbp) : null,
        status: 'target'
      };

      const result = await JARVIS_ACTIONS.createRecord('rbtr_sponsors', sponsorData, 'Sponsor added');
      if (result) {
        this.renderSponsorSystem();
      }
    });
  },

  async viewSponsorDetail(sponsorId) {
    try {
      const sponsor = await API.supabaseQuery('rbtr_sponsors', `id=eq.${sponsorId}&select=*`);
      if (!sponsor || sponsor.length === 0) {
        JARVIS.Toast({ message: 'Sponsor not found', duration: 2000 });
        return;
      }

      const s = sponsor[0];
      const statusColor = s.status === 'signed' ? '#4CAF50' :
                          s.status === 'negotiating' ? 'var(--copper)' :
                          s.status === 'replied' ? '#2196F3' :
                          s.status === 'contacted' ? '#FFA726' : '#999';

      JARVIS_ACTIONS.showDetailView(`${s.company_name}`, [
        {
          id: 'overview',
          label: 'Details',
          content: `
            <div style="display: grid; gap: 16px;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Status</p>
                  <span class="jarvis-pill" style="background: ${statusColor}; color: #fff;">${s.status.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Sponsor Type</p>
                  <p class="text-small">${s.sponsor_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Estimated Value</p>
                  <p class="font-mono text-small">${s.value_estimate_gbp ? `£${parseFloat(s.value_estimate_gbp).toFixed(0)}k` : '—'}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Contact Name</p>
                  <p class="text-small">${s.contact_name || '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Contact Email</p>
                  <p class="text-small">${s.contact_email || '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Contact Phone</p>
                  <p class="text-small">${s.contact_phone || '—'}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Pitch Sent</p>
                  <p class="text-small">${s.pitch_sent_date ? new Date(s.pitch_sent_date).toLocaleDateString('en-GB') : '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Reply Date</p>
                  <p class="text-small">${s.reply_date ? new Date(s.reply_date).toLocaleDateString('en-GB') : '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Signed Date</p>
                  <p class="text-small">${s.signed_date ? new Date(s.signed_date).toLocaleDateString('en-GB') : '—'}</p>
                </div>
              </div>

              ${s.package_details ? `
                <div>
                  <p class="text-tiny text-tertiary">Package Details</p>
                  <p class="text-small">${s.package_details}</p>
                </div>
              ` : ''}

              ${s.notes ? `
                <div>
                  <p class="text-tiny text-tertiary">Notes</p>
                  <p class="text-small">${s.notes}</p>
                </div>
              ` : ''}

              <div style="display: flex; gap: 12px; margin-top: 16px;">
                ${s.status === 'target' ? `
                  <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm"
                          onclick="RBTR_MODULES.markSponsorStatus('${s.id}', 'contacted')">
                    📧 Mark Contacted
                  </button>
                ` : ''}
                ${s.status === 'contacted' ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="RBTR_MODULES.markSponsorStatus('${s.id}', 'replied')">
                    💬 Mark Replied
                  </button>
                ` : ''}
                ${['replied', 'contacted'].includes(s.status) ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="RBTR_MODULES.markSponsorStatus('${s.id}', 'negotiating')">
                    🤝 Mark Negotiating
                  </button>
                ` : ''}
                ${s.status === 'negotiating' ? `
                  <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm"
                          onclick="RBTR_MODULES.markSponsorSigned('${s.id}')">
                    ✓ Mark Signed
                  </button>
                ` : ''}
                <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm"
                        onclick="RBTR_MODULES.deleteSponsor('${s.id}')">
                  Decline
                </button>
              </div>
            </div>
          `
        }
      ]);
    } catch (error) {
      console.error('[RBTR] View sponsor failed:', error);
      JARVIS.Toast({ message: 'Failed to load sponsor', duration: 2000 });
    }
  },

  async markSponsorStatus(sponsorId, newStatus) {
    const updates = { status: newStatus };
    if (newStatus === 'contacted' && !updates.pitch_sent_date) {
      updates.pitch_sent_date = new Date().toISOString().split('T')[0];
    }
    if (newStatus === 'replied' && !updates.reply_date) {
      updates.reply_date = new Date().toISOString().split('T')[0];
    }

    const result = await JARVIS_ACTIONS.updateRecord('rbtr_sponsors', sponsorId, updates, `Status: ${newStatus.replace(/_/g, ' ')}`);
    if (result) {
      this.viewSponsorDetail(sponsorId);
    }
  },

  async markSponsorSigned(sponsorId) {
    const updates = {
      status: 'signed',
      signed_date: new Date().toISOString().split('T')[0]
    };

    const result = await JARVIS_ACTIONS.updateRecord('rbtr_sponsors', sponsorId, updates, 'Sponsor signed!');
    if (result) {
      this.viewSponsorDetail(sponsorId);
    }
  },

  async deleteSponsor(sponsorId) {
    JARVIS_ACTIONS.showConfirmModal(
      'Mark as Declined',
      'Are you sure? This will set the status to declined.',
      async () => {
        const result = await JARVIS_ACTIONS.updateRecord('rbtr_sponsors', sponsorId, { status: 'declined' }, 'Marked as declined');
        if (result) {
          history.back();
        }
      }
    );
  },

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
