/**
 * JARVIS Booking Proof Admin Module
 * Created: 2026-05-13
 * Sarah J's AirBnB damage-detection SaaS — Admin/Founder dashboard
 *
 * OWNER: Sarah Jane Jones
 * SCOPE: Admin-only views. Customer-facing app lives at separate URL (TBD).
 */

const BOOKING_PROOF = {
  currentTab: 'overview',

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  async render() {
    const html = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Booking Proof</h1>
        <div class="jarvis-module-actions">
          <span class="text-small text-secondary font-mono">Admin Dashboard</span>
          <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="BOOKING_PROOF.refresh()">
            ↻ Refresh
          </button>
        </div>
      </div>

      <!-- Launch Banner -->
      <div style="background: var(--copper-faint); border: 1px solid var(--copper); border-radius: 8px; padding: 20px; margin-bottom: 32px; text-align: center;">
        <h2 class="font-display text-h2" style="color: var(--copper); margin-bottom: 8px;">
          🚧 Booking Proof Launches Soon
        </h2>
        <p class="text-small text-secondary">
          Admin dashboard wired and waiting. Customer-facing app (cleaner magic links + host portal) in development.
        </p>
        <p class="text-tiny text-tertiary" style="margin-top: 8px;">
          Launch target: TBD | Founding member slots: 0/50 | MRR: £0
        </p>
      </div>

      <!-- Tab Navigation -->
      <div id="bp-tabs" class="jarvis-tabs" style="margin-bottom: 24px;">
        <button class="jarvis-tab jarvis-tab--active" data-tab="overview" onclick="BOOKING_PROOF.setTab('overview')">Overview</button>
        <button class="jarvis-tab" data-tab="customers" onclick="BOOKING_PROOF.setTab('customers')">Customers</button>
        <button class="jarvis-tab" data-tab="properties" onclick="BOOKING_PROOF.setTab('properties')">Properties</button>
        <button class="jarvis-tab" data-tab="cleaner" onclick="BOOKING_PROOF.setTab('cleaner')">Cleaner Activity</button>
        <button class="jarvis-tab" data-tab="claims" onclick="BOOKING_PROOF.setTab('claims')">Claims</button>
        <button class="jarvis-tab" data-tab="support" onclick="BOOKING_PROOF.setTab('support')">Support</button>
        <button class="jarvis-tab" data-tab="marketing" onclick="BOOKING_PROOF.setTab('marketing')">Marketing</button>
        <button class="jarvis-tab" data-tab="settings" onclick="BOOKING_PROOF.setTab('settings')">Settings</button>
      </div>

      <!-- Tab Content -->
      <div id="bp-content"></div>
    `;

    document.getElementById('mainStage').innerHTML = html;
    await this.loadTabContent();
  },

  // ── TAB SWITCHING ──────────────────────────────────────────────────────────
  setTab(tab) {
    this.currentTab = tab;

    // Update active state
    document.querySelectorAll('#bp-tabs .jarvis-tab').forEach(btn => {
      btn.classList.toggle('jarvis-tab--active', btn.dataset.tab === tab);
    });

    this.loadTabContent();
  },

  async loadTabContent() {
    const container = document.getElementById('bp-content');
    if (!container) return;

    // Show loading state
    container.innerHTML = '<p class="text-small text-tertiary">Loading...</p>';

    // Route to tab renderer
    switch (this.currentTab) {
      case 'overview':
        await this.renderOverview(container);
        break;
      case 'customers':
        await this.renderCustomers(container);
        break;
      case 'properties':
        await this.renderProperties(container);
        break;
      case 'cleaner':
        await this.renderCleanerActivity(container);
        break;
      case 'claims':
        await this.renderClaims(container);
        break;
      case 'support':
        await this.renderSupport(container);
        break;
      case 'marketing':
        await this.renderMarketing(container);
        break;
      case 'settings':
        await this.renderSettings(container);
        break;
    }
  },

  // ── OVERVIEW TAB ───────────────────────────────────────────────────────────
  async renderOverview(container) {
    // TODO: Wire to bp_customers query for real data
    const data = {
      mrr: 0,
      customerCount: 0,
      churnRate: 0,
      foundingSlotsRemaining: 50
    };

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">MRR</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£${data.mrr}</div>
            <p class="text-small text-tertiary">Monthly Recurring Revenue</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Customers</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">${data.customerCount}</div>
            <p class="text-small text-tertiary">Active subscriptions</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Churn Rate</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">${data.churnRate}%</div>
            <p class="text-small text-tertiary">Last 30 days</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Founding Slots</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">${data.foundingSlotsRemaining}/50</div>
            <p class="text-small text-tertiary">Remaining (£90 one-time)</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Revenue Chart</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Revenue chart coming soon — wire to bp_customers subscription data + Stripe webhooks</p>
        </div>
      </div>
    `;
  },

  // ── CUSTOMERS TAB ──────────────────────────────────────────────────────────
  async renderCustomers(container) {
    container.innerHTML = `
      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Customer List</h3>
          <div style="display: flex; gap: 12px; align-items: center; margin-top: 12px;">
            <input type="text" class="jarvis-input" placeholder="Search customers..." style="width: 240px;" />
            <select class="jarvis-input" style="width: 160px;">
              <option value="">All statuses</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
              <option value="founding_member">Founding Member</option>
            </select>
          </div>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">No customers yet — table will populate on first signup</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Columns: Email, Name, Status, Properties, MRR, Last Activity, Actions
          </p>
        </div>
      </div>
    `;
  },

  // ── PROPERTIES TAB ─────────────────────────────────────────────────────────
  async renderProperties(container) {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Properties</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Protected by Booking Proof</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Baselines Complete</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Ready for turnover checking</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Baselines Pending</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Awaiting cleaner setup</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Properties by Platform</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Breakdown: AirBnB, VRBO, Booking.com, Direct — chart coming soon</p>
        </div>
      </div>
    `;
  },

  // ── CLEANER ACTIVITY TAB ───────────────────────────────────────────────────
  async renderCleanerActivity(container) {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Turnovers This Week</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Cleaner evidence captured</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Evidence Quality</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—</div>
            <p class="text-small text-tertiary">Avg AI confidence score</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Damages Flagged</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Awaiting host review</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Recent Turnovers</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Turnover activity log coming soon — wire to bp_turnovers table</p>
        </div>
      </div>
    `;
  },

  // ── CLAIMS TAB ─────────────────────────────────────────────────────────────
  async renderClaims(container) {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Claims Submitted</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Total AirCover claims</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Success Rate</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—</div>
            <p class="text-small text-tertiary">Claims approved by platform</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Average Payout</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£—</div>
            <p class="text-small text-tertiary">Per successful claim</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Claims Queue</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Claims list coming soon — wire to bp_claims table</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Columns: Customer, Property, Amount, Status (Draft/Submitted/Under Review/Approved/Rejected/Paid), Submitted Date
          </p>
        </div>
      </div>
    `;
  },

  // ── SUPPORT TAB ────────────────────────────────────────────────────────────
  async renderSupport(container) {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Open Tickets</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Awaiting response</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Response Time</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—</div>
            <p class="text-small text-tertiary">Avg first response (hours)</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Satisfaction</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—</div>
            <p class="text-small text-tertiary">Customer satisfaction score</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Support Queue</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Support tickets coming soon — wire to bp_support_tickets table</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Columns: Customer, Subject, Priority, Status, Assigned To, Created, Actions
          </p>
        </div>
      </div>
    `;
  },

  // ── MARKETING TAB ──────────────────────────────────────────────────────────
  async renderMarketing(container) {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Waitlist Signups</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Pre-launch interest</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Conversion Rate</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—</div>
            <p class="text-small text-tertiary">Waitlist → Trial</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Trial → Paid</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—</div>
            <p class="text-small text-tertiary">Trial conversion rate</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Conversion Funnel</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Funnel visualization coming soon — Waitlist → Invited → Trial → Paid</p>
        </div>
      </div>
    `;
  },

  // ── SETTINGS TAB ───────────────────────────────────────────────────────────
  async renderSettings(container) {
    container.innerHTML = `
      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Pricing Configuration</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label class="text-small text-secondary">Founding Member Price (one-time)</label>
              <input type="text" class="jarvis-input font-mono" value="£90" readonly style="margin-top: 8px;" />
            </div>
            <div>
              <label class="text-small text-secondary">Standard Monthly Price</label>
              <input type="text" class="jarvis-input font-mono" value="£14" readonly style="margin-top: 8px;" />
            </div>
            <div>
              <label class="text-small text-secondary">Founding Member Slots</label>
              <input type="number" class="jarvis-input font-mono" value="50" readonly style="margin-top: 8px;" />
            </div>
            <div>
              <label class="text-small text-secondary">Trial Period (days)</label>
              <input type="number" class="jarvis-input font-mono" value="30" readonly style="margin-top: 8px;" />
            </div>
          </div>
          <p class="text-tiny text-tertiary" style="margin-top: 12px;">Settings read-only in JARVIS — update via Stripe dashboard</p>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">AI Model Configuration</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
            <div>
              <label class="text-small text-secondary">Vision Model</label>
              <input type="text" class="jarvis-input font-mono" value="claude-sonnet-4-5" readonly style="margin-top: 8px;" />
            </div>
            <div>
              <label class="text-small text-secondary">Damage Detection Confidence Threshold</label>
              <input type="text" class="jarvis-input font-mono" value="0.75 (75%)" readonly style="margin-top: 8px;" />
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Stripe Webhook Status</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Webhook endpoint: <span class="font-mono">/api/booking-proof/stripe-webhook</span></p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">Status: Not configured — configure when Stripe account created</p>
        </div>
      </div>
    `;
  },

  // ── REFRESH ────────────────────────────────────────────────────────────────
  async refresh() {
    await this.loadTabContent();
    JARVIS.Toast({ message: 'Booking Proof refreshed', duration: 2000 });
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BOOKING_PROOF;
}
