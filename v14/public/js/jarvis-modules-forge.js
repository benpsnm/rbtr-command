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
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="FORGE_MODULES.newBooking()">
            + New Booking
          </button>
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
            Loading bookings...
          </div>
        </div>
      </div>
    `;

    // Load real bookings after render
    this.loadUpcomingBookings();
  },

  async loadUpcomingBookings() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const fourteenDaysOut = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

      const bookings = await API.supabaseQuery(
        'str_bookings',
        `check_in=gte.${today}&check_in=lte.${fourteenDaysOut}&status=neq.cancelled&order=check_in.asc&select=*`
      );

      const listEl = document.getElementById('upcoming-bookings-list');
      if (!listEl) return;

      if (!bookings || bookings.length === 0) {
        listEl.innerHTML = '<p class="text-small text-tertiary">No upcoming bookings in the next 14 days.</p>';
        return;
      }

      listEl.innerHTML = bookings.map(b => {
        const platformColor = b.platform === 'airbnb' ? '#4CAF50' :
                              b.platform === 'vrbo' ? '#2196F3' :
                              'var(--copper)';
        const platformLabel = b.platform === 'airbnb' ? 'AirBnB' :
                              b.platform === 'vrbo' ? 'VRBO' :
                              b.platform === 'booking_com' ? 'Booking.com' :
                              b.platform === 'direct' ? 'Direct' : 'Manual';

        const checkIn = new Date(b.check_in);
        const checkOut = new Date(b.check_out);

        return `
          <div class="jarvis-card" style="background: var(--surface-deep); margin-bottom: 12px; cursor: pointer;"
               onclick="FORGE_MODULES.viewBookingDetail('${b.id}')">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div style="flex: 1;">
                <h4 class="text-small" style="margin-bottom: 4px;">${b.guest_name || 'Guest'}</h4>
                <p class="text-tiny text-tertiary">${checkIn.toLocaleDateString('en-GB')} → ${checkOut.toLocaleDateString('en-GB')}</p>
              </div>
              <span class="jarvis-pill font-mono text-pill" style="background: ${platformColor}; color: #fff;">
                ${platformLabel}
              </span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px;">
              <div>
                <p class="text-tiny text-tertiary">Guests</p>
                <p class="text-small">${b.party_size || '—'}</p>
              </div>
              <div>
                <p class="text-tiny text-tertiary">Revenue</p>
                <p class="font-mono text-small">£${parseFloat(b.gross_revenue || 0).toFixed(0)}</p>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('[FORGE] Load upcoming bookings failed:', error);
      const listEl = document.getElementById('upcoming-bookings-list');
      if (listEl) {
        listEl.innerHTML = '<p class="text-small text-tertiary">Failed to load bookings.</p>';
      }
    }
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
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="FORGE_MODULES.runB2BEnrichment()">
            🔍 Enrich All
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Active Prospects</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="atlas-active-count">—</div>
            <p class="text-small text-tertiary">In outreach pipeline</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Converted</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="atlas-booked-count">—</div>
            <p class="text-small text-tertiary">Booked retreats</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">In Negotiation</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="atlas-negotiation-count">—</div>
            <p class="text-small text-tertiary">Call booked / replied</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Quality Score</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="atlas-avg-score">—</div>
            <p class="text-small text-tertiary">Pipeline quality</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card" style="margin-bottom: 24px;">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">B2B Categories</h3>
        </div>
        <div class="jarvis-card__body" id="atlas-categories">
          Loading categories...
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Prospect List</h3>
        </div>
        <div class="jarvis-card__body" id="atlas-prospect-list">
          Loading prospects...
        </div>
      </div>
    `;

    this.loadAtlasData();
  },

  async loadAtlasData() {
    try {
      const prospects = await API.supabaseQuery('str_b2b_prospects', 'select=*&order=quality_score.desc');

      if (!prospects || prospects.length === 0) {
        document.getElementById('atlas-active-count').textContent = '0';
        document.getElementById('atlas-booked-count').textContent = '0';
        document.getElementById('atlas-negotiation-count').textContent = '0';
        document.getElementById('atlas-avg-score').textContent = '—';
        document.getElementById('atlas-categories').innerHTML = '<p class="text-small text-tertiary">No prospects yet. Click "+ New Prospect" to add one.</p>';
        document.getElementById('atlas-prospect-list').innerHTML = '<p class="text-small text-tertiary">No prospects yet.</p>';
        return;
      }

      // Calculate stats
      const activeCount = prospects.filter(p => ['not_contacted', 'drafted', 'sent'].includes(p.status)).length;
      const bookedCount = prospects.filter(p => p.status === 'booked').length;
      const negotiationCount = prospects.filter(p => ['replied', 'call_booked'].includes(p.status)).length;
      const avgScore = Math.round(prospects.reduce((sum, p) => sum + (p.quality_score || 0), 0) / prospects.length);

      document.getElementById('atlas-active-count').textContent = activeCount;
      document.getElementById('atlas-booked-count').textContent = bookedCount;
      document.getElementById('atlas-negotiation-count').textContent = negotiationCount;
      document.getElementById('atlas-avg-score').textContent = avgScore;

      // Categories breakdown
      const categories = {};
      prospects.forEach(p => {
        const cat = p.category || 'uncategorized';
        categories[cat] = (categories[cat] || 0) + 1;
      });

      document.getElementById('atlas-categories').innerHTML = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => `
          <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px; margin-bottom: 8px;">
            <span class="text-small">${cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            <span class="font-mono text-small" style="color: var(--copper);">${count} prospect${count !== 1 ? 's' : ''}</span>
          </div>
        `).join('');

      // Prospect list
      document.getElementById('atlas-prospect-list').innerHTML = prospects.slice(0, 20).map(p => {
        const statusColor = p.status === 'booked' ? '#4CAF50' :
                            p.status === 'call_booked' ? 'var(--copper)' :
                            p.status === 'replied' ? '#2196F3' :
                            p.status === 'sent' ? '#FFA726' : '#999';

        return `
          <div class="jarvis-card" style="background: var(--surface-deep); margin-bottom: 12px; cursor: pointer;"
               onclick="FORGE_MODULES.viewB2BProspectDetail('${p.id}')">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div style="flex: 1;">
                <h4 class="text-small" style="margin-bottom: 4px;">${p.company}</h4>
                <p class="text-tiny text-tertiary">${p.category ? p.category.replace(/_/g, ' ') : '—'}</p>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="font-mono text-tiny" style="color: var(--copper);">Score: ${p.quality_score || 0}</span>
                <span class="jarvis-pill text-pill" style="background: ${statusColor}; color: #fff;">
                  ${p.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
              <div>
                <p class="text-tiny text-tertiary">Contact</p>
                <p class="text-small">${p.decision_maker_name || '—'}</p>
              </div>
              <div>
                <p class="text-tiny text-tertiary">Approach</p>
                <p class="text-small">${p.approach ? p.approach.replace(/_/g, ' ') : '—'}</p>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('[FORGE] Load Atlas data failed:', error);
      document.getElementById('atlas-active-count').textContent = 'ERR';
      document.getElementById('atlas-prospect-list').innerHTML = '<p class="text-small text-tertiary">Failed to load prospects.</p>';
    }
  },

  newB2BProspect() {
    JARVIS_ACTIONS.showFormModal('+ New B2B Prospect', [
      { name: 'company', label: 'Company Name', type: 'text', required: true },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: [
          { value: 'wellness_retreat', label: 'Wellness Retreat' },
          { value: 'sports_team', label: 'Sports Team' },
          { value: 'influencer_agency', label: 'Influencer Agency' },
          { value: 'corporate_wellness', label: 'Corporate Wellness' },
          { value: 'yoga_retreat', label: 'Yoga Retreat' },
          { value: 'breathwork', label: 'Breathwork' },
          { value: 'pt_group', label: 'PT Group' },
          { value: 'content_creator', label: 'Content Creator' },
          { value: 'wedding_planner', label: 'Wedding Planner' }
        ]
      },
      { name: 'website', label: 'Website', type: 'url', required: false },
      { name: 'instagram_handle', label: 'Instagram Handle', type: 'text', required: false },
      { name: 'decision_maker_name', label: 'Decision Maker Name', type: 'text', required: false },
      { name: 'email', label: 'Email', type: 'email', required: false },
      { name: 'phone', label: 'Phone', type: 'tel', required: false },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, required: false }
    ], async (data) => {
      const prospectData = {
        ...data,
        status: 'not_contacted',
        quality_score: 50
      };

      const result = await JARVIS_ACTIONS.createRecord('str_b2b_prospects', prospectData, 'Prospect added');
      if (result) {
        this.renderAtlasProspects();
      }
    });
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
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="FORGE_MODULES.newCleanerJob()">
            + New Clean Job
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Turnovers (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="cleaner-completed-count">—</div>
            <p class="text-small text-tertiary">Completed cleans</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Turnover Time</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="cleaner-avg-time">—</div>
            <p class="text-small text-tertiary">Clean + restock</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Issues Flagged</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="cleaner-issues-count">—</div>
            <p class="text-small text-tertiary">Needs attention</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Cost (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="cleaner-total-cost">—</div>
            <p class="text-small text-tertiary">Cleaning expenses</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card" style="margin-bottom: 24px;">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Upcoming Cleans</h3>
        </div>
        <div class="jarvis-card__body" id="cleaner-upcoming-list">
          Loading upcoming cleans...
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

    this.loadCleanerData();
  },

  async loadCleanerData() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const [allJobs, upcomingJobs] = await Promise.all([
        API.supabaseQuery('cleaner_jobs', `scheduled_date=gte.${thirtyDaysAgo}&select=*&order=scheduled_date.desc`),
        API.supabaseQuery('cleaner_jobs', `scheduled_date=gte.${today}&status=neq.complete&select=*&order=scheduled_date.asc&limit=10`)
      ]);

      // Stats
      const completedCount = allJobs ? allJobs.filter(j => j.status === 'complete').length : 0;
      const issuesCount = allJobs ? allJobs.filter(j => j.status === 'issue').length : 0;
      const totalCost = allJobs ? allJobs.reduce((sum, j) => sum + (parseFloat(j.cost_gbp) || 0), 0) : 0;
      const avgTime = allJobs && allJobs.filter(j => j.duration_mins).length > 0
        ? Math.round(allJobs.filter(j => j.duration_mins).reduce((sum, j) => sum + j.duration_mins, 0) / allJobs.filter(j => j.duration_mins).length / 60 * 10) / 10
        : 0;

      document.getElementById('cleaner-completed-count').textContent = completedCount;
      document.getElementById('cleaner-avg-time').textContent = avgTime > 0 ? `${avgTime}h` : '—';
      document.getElementById('cleaner-issues-count').textContent = issuesCount;
      document.getElementById('cleaner-total-cost').textContent = `£${totalCost.toFixed(0)}`;

      // Upcoming list
      const upcomingEl = document.getElementById('cleaner-upcoming-list');
      if (!upcomingEl) return;

      if (!upcomingJobs || upcomingJobs.length === 0) {
        upcomingEl.innerHTML = '<p class="text-small text-tertiary">No upcoming cleans scheduled.</p>';
        return;
      }

      upcomingEl.innerHTML = upcomingJobs.map(j => {
        const statusColor = j.status === 'complete' ? '#4CAF50' :
                            j.status === 'in_progress' ? 'var(--copper)' :
                            j.status === 'issue' ? '#f44336' : '#999';

        const date = new Date(j.scheduled_date);
        return `
          <div class="jarvis-card" style="background: var(--surface-deep); margin-bottom: 12px; cursor: pointer;"
               onclick="FORGE_MODULES.viewCleanerJobDetail('${j.id}')">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div style="flex: 1;">
                <h4 class="text-small" style="margin-bottom: 4px;">${date.toLocaleDateString('en-GB')} — ${j.cleaner_name || 'Unassigned'}</h4>
                <p class="text-tiny text-tertiary">${j.deep_clean ? 'Deep Clean' : 'Standard Turnover'}</p>
              </div>
              <span class="jarvis-pill text-pill" style="background: ${statusColor}; color: #fff;">
                ${j.status.replace(/_/g, ' ')}
              </span>
            </div>
            ${j.notes ? `<p class="text-tiny text-tertiary">${j.notes}</p>` : ''}
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('[FORGE] Load cleaner data failed:', error);
      document.getElementById('cleaner-completed-count').textContent = 'ERR';
    }
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
    JARVIS_ACTIONS.showFormModal('+ New Content Piece', [
      { name: 'title', label: 'Title', type: 'text', required: true },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'blog_post', label: 'Blog Post (SEO)' },
          { value: 'social_post', label: 'Social Media Post' },
          { value: 'email', label: 'Email Campaign' },
          { value: 'landing_page', label: 'Landing Page' }
        ]
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'idea', label: 'Idea' },
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' }
        ]
      },
      { name: 'target_keywords', label: 'Target Keywords', type: 'text', required: false },
      { name: 'notes', label: 'Notes / Content', type: 'textarea', rows: 8, required: false }
    ], async () => {
      JARVIS.Toast({ message: 'Content tracking (Phase 4: add forge_content table)', duration: 3000 });
      // Phase 4 TODO: Create forge_content table in migration, wire to Supabase
      // For now, this demonstrates the wiring pattern
      return true;
    });
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
  },

  // ── BOOKINGS ACTIONS ───────────────────────────────────────────────────────

  newBooking() {
    JARVIS_ACTIONS.showFormModal('+ New Booking', [
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        required: true,
        options: [
          { value: 'manual', label: 'Manual Entry' },
          { value: 'airbnb', label: 'AirBnB' },
          { value: 'vrbo', label: 'VRBO' },
          { value: 'booking_com', label: 'Booking.com' },
          { value: 'direct', label: 'Direct Booking' }
        ]
      },
      { name: 'guest_name', label: 'Guest Name', type: 'text', required: true },
      { name: 'guest_email', label: 'Guest Email', type: 'email', required: false },
      { name: 'check_in', label: 'Check-In Date', type: 'date', required: true },
      { name: 'check_out', label: 'Check-Out Date', type: 'date', required: true },
      { name: 'party_size', label: 'Number of Guests', type: 'number', required: false },
      { name: 'gross_revenue', label: 'Total Revenue (£)', type: 'number', required: false },
      { name: 'special_requests', label: 'Special Requests', type: 'textarea', rows: 3, required: false }
    ], async (data) => {
      const bookingData = {
        ...data,
        status: 'confirmed',
        party_size: data.party_size ? parseInt(data.party_size) : null,
        gross_revenue: data.gross_revenue ? parseFloat(data.gross_revenue) : null
      };

      const result = await JARVIS_ACTIONS.createRecord('str_bookings', bookingData, 'Booking created');
      if (result) {
        this.renderBookingsCalendar();
      }
    });
  },

  async viewBookingDetail(bookingId) {
    try {
      const booking = await API.supabaseQuery('str_bookings', `id=eq.${bookingId}&select=*`);
      if (!booking || booking.length === 0) {
        JARVIS.Toast({ message: 'Booking not found', duration: 2000 });
        return;
      }

      const b = booking[0];
      const checkIn = new Date(b.check_in);
      const checkOut = new Date(b.check_out);
      const platformLabel = b.platform === 'airbnb' ? 'AirBnB' :
                            b.platform === 'vrbo' ? 'VRBO' :
                            b.platform === 'booking_com' ? 'Booking.com' :
                            b.platform === 'direct' ? 'Direct' : 'Manual';

      const statusColor = b.status === 'confirmed' ? 'var(--copper)' :
                          b.status === 'checked_in' ? '#4CAF50' :
                          b.status === 'completed' ? '#2196F3' : '#999';

      JARVIS_ACTIONS.showDetailView(`Booking: ${b.guest_name || 'Guest'}`, [
        {
          id: 'overview',
          label: 'Overview',
          content: `
            <div style="display: grid; gap: 16px;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Platform</p>
                  <p class="text-small">${platformLabel}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Status</p>
                  <span class="jarvis-pill" style="background: ${statusColor}; color: #fff;">${b.status}</span>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">External ID</p>
                  <p class="font-mono text-small">${b.external_id || '—'}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Check-In</p>
                  <p class="text-small">${checkIn.toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Check-Out</p>
                  <p class="text-small">${checkOut.toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Nights</p>
                  <p class="text-small">${b.nights || '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Guests</p>
                  <p class="text-small">${b.party_size || '—'}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Gross Revenue</p>
                  <p class="font-mono text-small">£${parseFloat(b.gross_revenue || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Platform Fee</p>
                  <p class="font-mono text-small">£${parseFloat(b.platform_fee || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Net Revenue</p>
                  <p class="font-mono text-small">£${parseFloat(b.net_revenue || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Cleaning Fee</p>
                  <p class="font-mono text-small">£${parseFloat(b.cleaning_fee || 0).toFixed(2)}</p>
                </div>
              </div>

              ${b.special_requests ? `
                <div>
                  <p class="text-tiny text-tertiary">Special Requests</p>
                  <p class="text-small">${b.special_requests}</p>
                </div>
              ` : ''}

              ${b.notes ? `
                <div>
                  <p class="text-tiny text-tertiary">Internal Notes</p>
                  <p class="text-small">${b.notes}</p>
                </div>
              ` : ''}

              <div style="display: flex; gap: 12px; margin-top: 16px;">
                <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm"
                        onclick="FORGE_MODULES.sendGuestMessage('${b.id}', '${b.guest_email || ''}', '${b.guest_name || 'Guest'}')">
                  📧 Send Message
                </button>
                ${b.status === 'confirmed' ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markBookingCheckedIn('${b.id}')">
                    ✓ Mark Checked In
                  </button>
                ` : ''}
                ${b.status === 'checked_in' ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markBookingCompleted('${b.id}')">
                    ✓ Mark Completed
                  </button>
                ` : ''}
                <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm"
                        onclick="FORGE_MODULES.deleteBooking('${b.id}')">
                  Cancel Booking
                </button>
              </div>
            </div>
          `
        },
        {
          id: 'guest',
          label: 'Guest Info',
          content: `
            <div style="display: grid; gap: 16px;">
              <div>
                <p class="text-tiny text-tertiary">Name</p>
                <p class="text-small">${b.guest_name || '—'}</p>
              </div>
              <div>
                <p class="text-tiny text-tertiary">Email</p>
                <p class="text-small">${b.guest_email || '—'}</p>
              </div>
              <div>
                <p class="text-tiny text-tertiary">Party Size</p>
                <p class="text-small">${b.party_size || '—'} guests</p>
              </div>
              ${b.review_left ? `
                <div>
                  <p class="text-tiny text-tertiary">Review Rating</p>
                  <p class="text-small">${b.review_rating || '—'} ⭐</p>
                </div>
              ` : '<p class="text-small text-tertiary">No review left yet.</p>'}
            </div>
          `
        }
      ]);
    } catch (error) {
      console.error('[FORGE] View booking detail failed:', error);
      JARVIS.Toast({ message: 'Failed to load booking', duration: 2000 });
    }
  },

  sendGuestMessage(bookingId, guestEmail, guestName) {
    if (!guestEmail) {
      JARVIS.Toast({ message: 'No email address for this guest', duration: 2000 });
      return;
    }

    JARVIS_ACTIONS.showFormModal('Send Guest Message', [
      { name: 'subject', label: 'Subject', type: 'text', required: true },
      { name: 'message', label: 'Message', type: 'textarea', rows: 8, required: true }
    ], async (data) => {
      const payload = {
        to: guestEmail,
        to_name: guestName,
        subject: data.subject,
        body: data.message,
        booking_id: bookingId
      };

      const result = await JARVIS_ACTIONS.sendEmail('/api/forge/send-guest-email', payload, 'Message sent to guest');
      return result !== null;
    });
  },

  async markBookingCheckedIn(bookingId) {
    const result = await JARVIS_ACTIONS.updateRecord('str_bookings', bookingId, { status: 'checked_in' }, 'Marked as checked in');
    if (result) {
      this.viewBookingDetail(bookingId);
    }
  },

  async markBookingCompleted(bookingId) {
    const result = await JARVIS_ACTIONS.updateRecord('str_bookings', bookingId, { status: 'completed' }, 'Marked as completed');
    if (result) {
      this.viewBookingDetail(bookingId);
    }
  },

  async deleteBooking(bookingId) {
    JARVIS_ACTIONS.showConfirmModal(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This will set the status to cancelled.',
      async () => {
        const result = await JARVIS_ACTIONS.updateRecord('str_bookings', bookingId, { status: 'cancelled' }, 'Booking cancelled');
        if (result) {
          history.back();
        }
      }
    );
  },

  // ── B2B ATLAS ACTIONS ──────────────────────────────────────────────────────

  async viewB2BProspectDetail(prospectId) {
    try {
      const prospect = await API.supabaseQuery('str_b2b_prospects', `id=eq.${prospectId}&select=*`);
      if (!prospect || prospect.length === 0) {
        JARVIS.Toast({ message: 'Prospect not found', duration: 2000 });
        return;
      }

      const p = prospect[0];
      const statusColor = p.status === 'booked' ? '#4CAF50' :
                          p.status === 'call_booked' ? 'var(--copper)' :
                          p.status === 'replied' ? '#2196F3' :
                          p.status === 'sent' ? '#FFA726' : '#999';

      JARVIS_ACTIONS.showDetailView(`${p.company}`, [
        {
          id: 'overview',
          label: 'Overview',
          content: `
            <div style="display: grid; gap: 16px;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Category</p>
                  <p class="text-small">${p.category ? p.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Status</p>
                  <span class="jarvis-pill" style="background: ${statusColor}; color: #fff;">${p.status.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Quality Score</p>
                  <p class="font-mono text-small" style="color: var(--copper);">${p.quality_score || 0}/100</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">City</p>
                  <p class="text-small">${p.city || '—'}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Website</p>
                  <p class="text-small">${p.website ? `<a href="${p.website}" target="_blank">${p.website}</a>` : '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Instagram</p>
                  <p class="text-small">${p.instagram_handle || '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">LinkedIn</p>
                  <p class="text-small">${p.linkedin_url ? `<a href="${p.linkedin_url}" target="_blank">View</a>` : '—'}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Decision Maker</p>
                  <p class="text-small">${p.decision_maker_name || '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Role</p>
                  <p class="text-small">${p.decision_maker_role || '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Email</p>
                  <p class="text-small">${p.email || '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Phone</p>
                  <p class="text-small">${p.phone || '—'}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Approach</p>
                  <p class="text-small">${p.approach ? p.approach.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Outreach Date</p>
                  <p class="text-small">${p.outreach_date ? new Date(p.outreach_date).toLocaleDateString('en-GB') : '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Follow-Up Date</p>
                  <p class="text-small">${p.follow_up_date ? new Date(p.follow_up_date).toLocaleDateString('en-GB') : '—'}</p>
                </div>
              </div>

              ${p.notes ? `
                <div>
                  <p class="text-tiny text-tertiary">Notes</p>
                  <p class="text-small">${p.notes}</p>
                </div>
              ` : ''}

              <div style="display: flex; gap: 12px; margin-top: 16px;">
                <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm"
                        onclick="FORGE_MODULES.sendB2BOutreach('${p.id}')">
                  📧 Send Outreach
                </button>
                ${p.status === 'not_contacted' ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markB2BStatus('${p.id}', 'drafted')">
                    ✏️ Mark Drafted
                  </button>
                ` : ''}
                ${p.status === 'drafted' ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markB2BStatus('${p.id}', 'sent')">
                    ✓ Mark Sent
                  </button>
                ` : ''}
                ${p.status === 'sent' ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markB2BStatus('${p.id}', 'replied')">
                    💬 Mark Replied
                  </button>
                ` : ''}
                ${['replied', 'sent'].includes(p.status) ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markB2BStatus('${p.id}', 'call_booked')">
                    📞 Call Booked
                  </button>
                ` : ''}
                ${p.status === 'call_booked' ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markB2BStatus('${p.id}', 'booked')">
                    🎉 Mark Booked
                  </button>
                ` : ''}
                <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm"
                        onclick="FORGE_MODULES.deleteB2BProspect('${p.id}')">
                  Decline
                </button>
              </div>
            </div>
          `
        }
      ]);
    } catch (error) {
      console.error('[FORGE] View B2B prospect failed:', error);
      JARVIS.Toast({ message: 'Failed to load prospect', duration: 2000 });
    }
  },

  sendB2BOutreach(prospectId) {
    JARVIS_ACTIONS.showFormModal('Send B2B Outreach', [
      { name: 'subject', label: 'Subject', type: 'text', required: true },
      { name: 'message', label: 'Message', type: 'textarea', rows: 10, required: true }
    ], async (data) => {
      // This would call /api/forge/send-b2b-outreach endpoint (Phase 4 TODO)
      JARVIS.Toast({ message: 'B2B outreach sending (endpoint TBD)', duration: 2000 });
      // Once endpoint exists, mark as sent
      await JARVIS_ACTIONS.updateRecord('str_b2b_prospects', prospectId, {
        status: 'sent',
        outreach_date: new Date().toISOString().split('T')[0]
      });
      this.viewB2BProspectDetail(prospectId);
      return true;
    });
  },

  async markB2BStatus(prospectId, newStatus) {
    const updates = { status: newStatus };
    if (newStatus === 'sent' && !updates.outreach_date) {
      updates.outreach_date = new Date().toISOString().split('T')[0];
    }
    const result = await JARVIS_ACTIONS.updateRecord('str_b2b_prospects', prospectId, updates, `Status: ${newStatus.replace(/_/g, ' ')}`);
    if (result) {
      this.viewB2BProspectDetail(prospectId);
    }
  },

  async deleteB2BProspect(prospectId) {
    JARVIS_ACTIONS.showConfirmModal(
      'Mark as Declined',
      'Are you sure? This will set the status to declined.',
      async () => {
        const result = await JARVIS_ACTIONS.updateRecord('str_b2b_prospects', prospectId, { status: 'declined' }, 'Marked as declined');
        if (result) {
          history.back();
        }
      }
    );
  },

  async runB2BEnrichment() {
    JARVIS.Toast({ message: 'B2B enrichment pipeline (endpoint TBD)', duration: 2000 });
    // Phase 4 TODO: POST /api/forge/enrich-b2b-prospects
    // Similar to PSNM Intel pipeline, enrich decision maker details, company info, etc
  },

  // ── CLEANER / OPS ACTIONS ──────────────────────────────────────────────────

  newCleanerJob() {
    JARVIS_ACTIONS.showFormModal('+ New Clean Job', [
      { name: 'scheduled_date', label: 'Scheduled Date', type: 'date', required: true },
      { name: 'cleaner_name', label: 'Cleaner Name', type: 'text', required: false },
      {
        name: 'deep_clean',
        label: 'Clean Type',
        type: 'select',
        required: true,
        options: [
          { value: 'false', label: 'Standard Turnover' },
          { value: 'true', label: 'Deep Clean' }
        ]
      },
      { name: 'cost_gbp', label: 'Cost (£)', type: 'number', required: false },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, required: false }
    ], async (data) => {
      const jobData = {
        ...data,
        deep_clean: data.deep_clean === 'true',
        cost_gbp: data.cost_gbp ? parseFloat(data.cost_gbp) : null,
        status: 'scheduled'
      };

      const result = await JARVIS_ACTIONS.createRecord('cleaner_jobs', jobData, 'Clean job scheduled');
      if (result) {
        this.renderCleanerOps();
      }
    });
  },

  async viewCleanerJobDetail(jobId) {
    try {
      const job = await API.supabaseQuery('cleaner_jobs', `id=eq.${jobId}&select=*`);
      if (!job || job.length === 0) {
        JARVIS.Toast({ message: 'Job not found', duration: 2000 });
        return;
      }

      const j = job[0];
      const statusColor = j.status === 'complete' ? '#4CAF50' :
                          j.status === 'in_progress' ? 'var(--copper)' :
                          j.status === 'issue' ? '#f44336' : '#999';

      const date = new Date(j.scheduled_date);

      JARVIS_ACTIONS.showDetailView(`Clean Job — ${date.toLocaleDateString('en-GB')}`, [
        {
          id: 'overview',
          label: 'Details',
          content: `
            <div style="display: grid; gap: 16px;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Scheduled Date</p>
                  <p class="text-small">${date.toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Cleaner</p>
                  <p class="text-small">${j.cleaner_name || 'Unassigned'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Status</p>
                  <span class="jarvis-pill" style="background: ${statusColor}; color: #fff;">${j.status.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Type</p>
                  <p class="text-small">${j.deep_clean ? 'Deep Clean' : 'Standard Turnover'}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                  <p class="text-tiny text-tertiary">Duration</p>
                  <p class="text-small">${j.duration_mins ? `${j.duration_mins} mins` : '—'}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Cost</p>
                  <p class="font-mono text-small">£${parseFloat(j.cost_gbp || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p class="text-tiny text-tertiary">Completed At</p>
                  <p class="text-small">${j.completed_at ? new Date(j.completed_at).toLocaleString('en-GB') : '—'}</p>
                </div>
              </div>

              ${j.notes ? `
                <div>
                  <p class="text-tiny text-tertiary">Notes</p>
                  <p class="text-small">${j.notes}</p>
                </div>
              ` : ''}

              <div style="display: flex; gap: 12px; margin-top: 16px;">
                ${j.status === 'scheduled' ? `
                  <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markCleanerJobStatus('${j.id}', 'in_progress')">
                    ▶️ Start Clean
                  </button>
                ` : ''}
                ${j.status === 'in_progress' ? `
                  <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markCleanerJobComplete('${j.id}')">
                    ✓ Mark Complete
                  </button>
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markCleanerJobStatus('${j.id}', 'issue')">
                    ⚠️ Flag Issue
                  </button>
                ` : ''}
                ${j.status === 'issue' ? `
                  <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm"
                          onclick="FORGE_MODULES.markCleanerJobStatus('${j.id}', 'in_progress')">
                    ↩️ Resume
                  </button>
                ` : ''}
                <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm"
                        onclick="FORGE_MODULES.deleteCleanerJob('${j.id}')">
                  Delete
                </button>
              </div>
            </div>
          `
        }
      ]);
    } catch (error) {
      console.error('[FORGE] View cleaner job failed:', error);
      JARVIS.Toast({ message: 'Failed to load job', duration: 2000 });
    }
  },

  async markCleanerJobStatus(jobId, newStatus) {
    const result = await JARVIS_ACTIONS.updateRecord('cleaner_jobs', jobId, { status: newStatus }, `Status: ${newStatus.replace(/_/g, ' ')}`);
    if (result) {
      this.viewCleanerJobDetail(jobId);
    }
  },

  async markCleanerJobComplete(jobId) {
    JARVIS_ACTIONS.showFormModal('Mark Clean Complete', [
      { name: 'duration_mins', label: 'Duration (minutes)', type: 'number', required: false }
    ], async (data) => {
      const updates = {
        status: 'complete',
        completed_at: new Date().toISOString(),
        duration_mins: data.duration_mins ? parseInt(data.duration_mins) : null
      };

      const result = await JARVIS_ACTIONS.updateRecord('cleaner_jobs', jobId, updates, 'Clean marked complete');
      if (result) {
        this.viewCleanerJobDetail(jobId);
      }
    });
  },

  async deleteCleanerJob(jobId) {
    JARVIS_ACTIONS.showConfirmModal(
      'Delete Clean Job',
      'Are you sure you want to delete this clean job?',
      async () => {
        const result = await JARVIS_ACTIONS.updateRecord('cleaner_jobs', jobId, { status: 'deleted' }, 'Job deleted');
        if (result) {
          history.back();
        }
      }
    );
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FORGE_MODULES;
}
