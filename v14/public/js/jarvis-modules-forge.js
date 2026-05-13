/**
 * JARVIS Forge / STR Modules
 * Created: 2026-05-13
 * STR (Short-Term Rental) modules for 4 Woodhead Mews + Booking Proof SaaS
 *
 * OWNER: Sarah Jane Jones (all STR business + Booking Proof)
 */

const FORGE_MODULES = {
  // ── FORGE LANDING MENU ─────────────────────────────────────────────────────
  renderLanding() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Forge / STR</h1>
        <div class="jarvis-module-actions">
          <span class="text-small text-secondary font-mono">4 Woodhead Mews, Blacker Hill</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <div class="jarvis-card" style="cursor: pointer; border: 2px solid var(--copper);" onclick="BOOKING_PROOF.render()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2" style="color: var(--copper);">✨ Booking Proof</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Sarah's AirBnB damage-detection SaaS — Admin dashboard</p>
            <p class="text-tiny text-tertiary" style="margin-top: 8px;">8-tab founder view: Overview, Customers, Properties, Cleaner Activity, Claims, Support, Marketing, Settings</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="FORGE_MODULES.renderBookingsCalendar()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📅 Bookings Calendar</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Forge property bookings (AirBnB, VRBO, Direct)</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="FORGE_MODULES.renderAtlasProspects()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🎯 Atlas Prospects</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">B2B outreach (wellness retreats, sports teams, content creators)</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="FORGE_MODULES.renderGuestComms()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">💬 Guest Comms</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Guest messaging + check-in instructions</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="FORGE_MODULES.renderCleanerOps()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🧹 Cleaner / Ops</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Turnover checklist + ops tracking</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="FORGE_MODULES.renderHouseJobs()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🏠 House Jobs</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Barnsley AirBnB renovation tracker</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="FORGE_MODULES.renderContent()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">✍️ Content</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Blog post pipeline for Forge SEO</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="FORGE_MODULES.renderDirectBooking()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🌐 Direct Booking</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Direct booking pipeline (bypass platform fees)</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="FORGE_MODULES.renderReviews()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">⭐ Reviews</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Review monitoring + response templates</p>
          </div>
        </div>
      </div>
    `;
  },

  // ── BOOKINGS CALENDAR (STUBBED) ────────────────────────────────────────────
  renderBookingsCalendar() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Bookings Calendar</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Bookings calendar coming soon — wire to str_bookings table + iCal sync</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Month view with AirBnB (green), VRBO (blue), Direct (copper) color-coded bookings. Click booking → guest details panel.
          </p>
        </div>
      </div>
    `;
  },

  renderAtlasProspects() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Atlas Prospects (STR B2B)</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">STR B2B outreach coming soon — wire to str_b2b_prospects table</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Categories: wellness retreats, sports teams, influencer agencies, corporate wellness, yoga retreats, breathwork groups, PT groups, content creators.
          </p>
        </div>
      </div>
    `;
  },

  renderGuestComms() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Guest Comms</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Guest messaging coming soon — check-in instructions, arrival info, house manual templates</p>
        </div>
      </div>
    `;
  },

  renderCleanerOps() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Cleaner / Ops</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Cleaner turnover checklist + ops tracker coming soon</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Note: Booking Proof handles turnover evidence. This is for non-BP operational checklists.
          </p>
        </div>
      </div>
    `;
  },

  renderHouseJobs() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">House Jobs (Barnsley AirBnB)</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Renovation tracker coming soon — port from V12 House Jobs module</p>
        </div>
      </div>
    `;
  },

  renderContent() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Forge Content Pipeline</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Blog post pipeline coming soon — SEO content for Forge direct booking site</p>
        </div>
      </div>
    `;
  },

  renderDirectBooking() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Direct Booking Pipeline</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Direct booking tracker coming soon — bypass platform fees, higher margin bookings</p>
        </div>
      </div>
    `;
  },

  renderReviews() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Review Management</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Review monitoring + response templates coming soon — AirBnB + VRBO review aggregation</p>
        </div>
      </div>
    `;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FORGE_MODULES;
}
