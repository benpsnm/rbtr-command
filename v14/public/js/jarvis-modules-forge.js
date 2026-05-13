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

  // ── BOOKINGS CALENDAR ──────────────────────────────────────────────────────
  async renderBookingsCalendar() {
    const now = new Date();
    const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Bookings Calendar</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="FORGE_MODULES.prevMonth()">
            ← Prev
          </button>
          <span class="font-mono text-small">${monthName}</span>
          <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="FORGE_MODULES.nextMonth()">
            Next →
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Occupancy (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">73%</div>
            <p class="text-small text-tertiary">Avg. occupancy rate</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Revenue (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£4.2k</div>
            <p class="text-small text-tertiary">Gross booking value</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Upcoming</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">8</div>
            <p class="text-small text-tertiary">Next 30 days</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Nightly</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£142</div>
            <p class="text-small text-tertiary">Average nightly rate</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Calendar View</h3>
          <div style="display: flex; gap: 16px; margin-top: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; background: #4CAF50; border-radius: 2px;"></div>
              <span class="text-tiny text-tertiary">AirBnB</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; background: #2196F3; border-radius: 2px;"></div>
              <span class="text-tiny text-tertiary">VRBO</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; background: var(--copper); border-radius: 2px;"></div>
              <span class="text-tiny text-tertiary">Direct</span>
            </div>
          </div>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Month view calendar with color-coded platform bookings. Wire to str_bookings table + iCal sync.</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Click booking → guest details panel (name, check-in/out dates, number of guests, special requests, house manual link)
          </p>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Upcoming Bookings (Next 14 days)</h3>
        </div>
        <div class="jarvis-card__body">
          <div id="upcoming-bookings-list">
            ${this.renderUpcomingBookingsPlaceholder()}
          </div>
        </div>
      </div>
    `;
  },

  renderUpcomingBookingsPlaceholder() {
    const bookings = [
      {
        guest: 'Sarah Thompson',
        platform: 'AirBnB',
        check_in: new Date(Date.now() + 2 * 86400000),
        check_out: new Date(Date.now() + 5 * 86400000),
        guests: 4,
        revenue: 426
      },
      {
        guest: 'Mark Johnson',
        platform: 'VRBO',
        check_in: new Date(Date.now() + 6 * 86400000),
        check_out: new Date(Date.now() + 9 * 86400000),
        guests: 2,
        revenue: 342
      }
    ];

    return bookings.map(b => {
      const platformColor = b.platform === 'AirBnB' ? '#4CAF50' : b.platform === 'VRBO' ? '#2196F3' : 'var(--copper)';
      return `
        <div class="jarvis-card" style="background: var(--surface-deep); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div style="flex: 1;">
              <h4 class="text-small" style="margin-bottom: 4px;">${b.guest}</h4>
              <p class="text-tiny text-tertiary">${b.check_in.toLocaleDateString('en-GB')} → ${b.check_out.toLocaleDateString('en-GB')}</p>
            </div>
            <span class="jarvis-pill font-mono text-pill" style="background: ${platformColor}; color: #fff;">
              ${b.platform}
            </span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px;">
            <div>
              <p class="text-tiny text-tertiary">Guests</p>
              <p class="text-small">${b.guests}</p>
            </div>
            <div>
              <p class="text-tiny text-tertiary">Revenue</p>
              <p class="font-mono text-small">£${b.revenue}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  prevMonth() { JARVIS.Toast({ message: 'Calendar navigation coming soon', duration: 2000 }); },
  nextMonth() { JARVIS.Toast({ message: 'Calendar navigation coming soon', duration: 2000 }); },

  async renderAtlasProspects() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Atlas Prospects (STR B2B)</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="FORGE_MODULES.newB2BProspect()">
            + New Prospect
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Active Prospects</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">12</div>
            <p class="text-small text-tertiary">In outreach pipeline</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Converted</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">3</div>
            <p class="text-small text-tertiary">Booked retreats</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">In Negotiation</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">5</div>
            <p class="text-small text-tertiary">Awaiting quotes</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Potential Value</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£18k</div>
            <p class="text-small text-tertiary">Pipeline value</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">B2B Categories</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Wellness Retreats</span>
              <span class="font-mono text-small" style="color: var(--copper);">4 prospects</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Sports Teams</span>
              <span class="font-mono text-small" style="color: var(--copper);">3 prospects</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Content Creators</span>
              <span class="font-mono text-small" style="color: var(--copper);">2 prospects</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Corporate Wellness</span>
              <span class="font-mono text-small" style="color: var(--copper);">3 prospects</span>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Prospect List</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">B2B outreach for wellness retreats, sports teams, influencer agencies, corporate off-sites. Wire to str_b2b_prospects table.</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Target: 3-7 night block bookings, £200-350/night premium pricing, direct contracts (no platform fees).
          </p>
        </div>
      </div>
    `;
  },

  newB2BProspect() {
    JARVIS.Toast({ message: 'B2B prospect form coming soon — wire to str_b2b_prospects table', duration: 2000 });
  },

  async renderGuestComms() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Guest Communications</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Unread Messages</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">2</div>
            <p class="text-small text-tertiary">Needs response</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Response Time</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">2.3h</div>
            <p class="text-small text-tertiary">Last 30 days</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Check-ins (Today)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">1</div>
            <p class="text-small text-tertiary">Send arrival info</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Satisfaction</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">4.9</div>
            <p class="text-small text-tertiary">Avg. guest rating</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Message Templates</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Booking Confirmation</h4>
              <p class="text-tiny text-tertiary">Sent immediately after booking confirmed</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Check-In Instructions (48h before)</h4>
              <p class="text-tiny text-tertiary">Door code, WiFi, parking, bin collection</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Mid-Stay Check-In</h4>
              <p class="text-tiny text-tertiary">Day 2 automated message: "Everything okay?"</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Check-Out Reminder (Day before)</h4>
              <p class="text-tiny text-tertiary">Check-out time 11am, bins, keys, dishwasher</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Review Request (24h after checkout)</h4>
              <p class="text-tiny text-tertiary">Thank you + review link</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">House Manual</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Digital house manual includes: WiFi password, heating controls, TV/Netflix, appliances, local info, emergency contacts.</p>
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="FORGE_MODULES.viewHouseManual()" style="margin-top: 12px;">
            View House Manual →
          </button>
        </div>
      </div>
    `;
  },

  viewHouseManual() {
    JARVIS.Toast({ message: 'House manual PDF viewer coming soon', duration: 2000 });
  },

  async renderCleanerOps() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Cleaner / Ops</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Turnovers (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">18</div>
            <p class="text-small text-tertiary">Completed cleans</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Turnover Time</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">2.8h</div>
            <p class="text-small text-tertiary">Clean + restock</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Issues Flagged</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">2</div>
            <p class="text-small text-tertiary">Needs attention</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Quality Score</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">98%</div>
            <p class="text-small text-tertiary">Checklist completion</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Standard Turnover Checklist</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 12px;">Non-Booking-Proof operational checklist (BP handles evidence capture separately).</p>
          <div style="display: grid; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" checked disabled />
              <span class="text-small">Strip all beds + wash all bedding</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" checked disabled />
              <span class="text-small">Vacuum all rooms</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" checked disabled />
              <span class="text-small">Mop hard floors (kitchen, bathrooms)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" checked disabled />
              <span class="text-small">Clean bathrooms (toilet, sink, shower, mirrors)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" checked disabled />
              <span class="text-small">Wipe down kitchen surfaces + appliances</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" checked disabled />
              <span class="text-small">Empty all bins + replace liners</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" checked disabled />
              <span class="text-small">Restock toiletries (toilet paper, hand soap, shampoo)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" checked disabled />
              <span class="text-small">Check heating/hot water functioning</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-deep); border-radius: 4px;">
              <input type="checkbox" checked disabled />
              <span class="text-small">Take final photo + upload to BP</span>
            </label>
          </div>
        </div>
      </div>
    `;
  },

  async renderHouseJobs() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">House Jobs (Barnsley AirBnB)</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Jobs</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">24</div>
            <p class="text-small text-tertiary">Renovation tasks</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Complete</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">16</div>
            <p class="text-small text-tertiary">67% progress</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">In Progress</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">3</div>
            <p class="text-small text-tertiary">Active now</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Budget Remaining</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£3.2k</div>
            <p class="text-small text-tertiary">Of £8k total</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Renovation Tracker</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 12px;">Track Barnsley property renovation for AirBnB launch. Target: ready for bookings Jun 2026.</p>

          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Bathroom refit</h4>
                <span class="jarvis-pill jarvis-pill--live font-mono text-pill">Complete</span>
              </div>
              <p class="text-tiny text-tertiary">Cost: £1,800</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Kitchen appliances + worktop</h4>
                <span class="jarvis-pill jarvis-pill--live font-mono text-pill">Complete</span>
              </div>
              <p class="text-tiny text-tertiary">Cost: £2,400</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Bedroom furniture (2 rooms)</h4>
                <span class="jarvis-pill font-mono text-pill">In Progress</span>
              </div>
              <p class="text-tiny text-tertiary">Estimated: £1,200</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Living room decor</h4>
                <span class="jarvis-pill font-mono text-pill">Pending</span>
              </div>
              <p class="text-tiny text-tertiary">Estimated: £800</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Garden tidy + patio</h4>
                <span class="jarvis-pill font-mono text-pill">Pending</span>
              </div>
              <p class="text-tiny text-tertiary">Estimated: £600</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async renderContent() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Forge Content Pipeline</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="FORGE_MODULES.newContentPiece()">
            + New Post
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Published</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">8</div>
            <p class="text-small text-tertiary">SEO blog posts</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Drafts</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">3</div>
            <p class="text-small text-tertiary">Awaiting review</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Traffic (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">1.2k</div>
            <p class="text-small text-tertiary">Organic visitors</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Direct Bookings</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">2</div>
            <p class="text-small text-tertiary">From blog traffic</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Content Topics (SEO Focus)</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 12px;">Blog posts for Forge direct booking site. Target: rank for "luxury retreat Yorkshire" / "wellness house Barnsley" / "yoga retreat South Yorkshire".</p>

          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Best yoga retreats in South Yorkshire</h4>
              <p class="text-tiny text-tertiary">Status: Published | Views: 320</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Luxury wellness house: What to expect</h4>
              <p class="text-tiny text-tertiary">Status: Published | Views: 280</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Planning a group retreat: Complete guide</h4>
              <p class="text-tiny text-tertiary">Status: Draft | ETA: May 20</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  newContentPiece() {
    JARVIS.Toast({ message: 'Content creation form coming soon', duration: 2000 });
  },

  async renderDirectBooking() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Direct Booking Pipeline</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Direct Bookings (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">4</div>
            <p class="text-small text-tertiary">Bypassed platform fees</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Direct Revenue</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£1.8k</div>
            <p class="text-small text-tertiary">Higher margin</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Fees Saved</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£270</div>
            <p class="text-small text-tertiary">vs AirBnB/VRBO</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Conversion Rate</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">18%</div>
            <p class="text-small text-tertiary">Site visitors → bookings</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Direct Booking Strategy</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 12px;">Bypass AirBnB/VRBO fees (15-20%) with direct bookings. Target: 30% of revenue from direct by end 2026.</p>

          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">1. SEO content</h4>
              <p class="text-tiny text-tertiary">Rank for "luxury retreat Yorkshire" keywords → blog traffic → booking page</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">2. Repeat guest incentive</h4>
              <p class="text-tiny text-tertiary">10% discount for direct rebookings (vs. platform rates)</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">3. B2B contracts</h4>
              <p class="text-tiny text-tertiary">Wellness retreats + sports teams book direct (no platform)</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">4. Email nurture</h4>
              <p class="text-tiny text-tertiary">Previous guests → quarterly newsletter → special offers</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async renderReviews() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Review Management</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Rating</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">4.9</div>
            <p class="text-small text-tertiary">Across all platforms</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Reviews</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">47</div>
            <p class="text-small text-tertiary">All-time</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Awaiting Response</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">2</div>
            <p class="text-small text-tertiary">New reviews</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Response Rate</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">100%</div>
            <p class="text-small text-tertiary">All reviews answered</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Recent Reviews</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Emma T. (AirBnB)</h4>
                <span class="font-mono text-small" style="color: var(--copper);">5.0 ⭐</span>
              </div>
              <p class="text-tiny text-tertiary">"Amazing property for our yoga retreat. Spacious, clean, perfect location. Sarah was a fantastic host!"</p>
              <p class="text-tiny text-tertiary" style="margin-top: 4px; opacity: 0.6;">2 days ago</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Mark J. (VRBO)</h4>
                <span class="font-mono text-small" style="color: var(--copper);">4.8 ⭐</span>
              </div>
              <p class="text-tiny text-tertiary">"Great house for family weekend. Only minor issue was hot water pressure in upstairs bathroom."</p>
              <p class="text-tiny text-tertiary" style="margin-top: 4px; opacity: 0.6;">5 days ago</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Response Templates</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 12px;">Quick response templates for common review scenarios.</p>

          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">5-star review</h4>
              <p class="text-tiny text-tertiary">"Thank you so much [NAME]! Delighted you enjoyed [PROPERTY]. We'd love to host you again!"</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">4-star review (minor issue)</h4>
              <p class="text-tiny text-tertiary">"Thanks [NAME]. Glad you enjoyed your stay. We've addressed [ISSUE] and hope to welcome you back!"</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">3-star or below</h4>
              <p class="text-tiny text-tertiary">"We're sorry to hear about [ISSUE]. We take feedback seriously and have [ACTION TAKEN]. Please contact us directly."</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FORGE_MODULES;
}
