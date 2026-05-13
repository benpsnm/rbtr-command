/**
 * JARVIS PSNM Modules
 * Created: 2026-05-13
 * PSNM-specific module views for JARVIS cockpit
 */

const PSNM_MODULES = {
  // ── ATLAS V3 DRAFT QUEUE ──────────────────────────────────────────────────
  async renderAtlasV3() {
    const html = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Atlas v3</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="PSNM_MODULES.refreshAtlas()">
            ↻ Refresh
          </button>
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="PSNM_MODULES.openFullWMS()">
            Open Full WMS →
          </button>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Draft Queue</h3>
          <div id="atlas-tabs" class="jarvis-tabs" style="margin-top: 16px;">
            <button class="jarvis-tab jarvis-tab--active" data-tab="pending" onclick="PSNM_MODULES.atlasSetTab('pending')">Pending</button>
            <button class="jarvis-tab" data-tab="needs_revision" onclick="PSNM_MODULES.atlasSetTab('needs_revision')">⚠ Needs Revision</button>
            <button class="jarvis-tab" data-tab="approved" onclick="PSNM_MODULES.atlasSetTab('approved')">Approved</button>
          </div>
        </div>
        <div class="jarvis-card__body">
          <div id="atlas-queue-content">
            <p class="text-small text-tertiary">Loading drafts...</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">📬 Enquiries Pipeline</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Enquiries pipeline view coming soon — full functionality available in WMS.</p>
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="PSNM_MODULES.openFullWMS()" style="margin-top: 12px;">
            View in WMS →
          </button>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">🔍 Prospect Intelligence Engine</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Intelligence pipeline (harvest/enrich/dispatch) available in full WMS.</p>
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="PSNM_MODULES.openFullWMS()" style="margin-top: 12px;">
            View in WMS →
          </button>
        </div>
      </div>
    `;

    document.getElementById('mainStage').innerHTML = html;
    await this.loadAtlasDrafts();
  },

  atlasCurrentTab: 'pending',

  async loadAtlasDrafts() {
    try {
      const response = await fetch('/api/atlas?action=list_drafts', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load Atlas drafts');
      }

      const data = await response.json();
      const drafts = data.drafts || [];

      // Filter by current tab
      const filtered = drafts.filter(d => {
        if (this.atlasCurrentTab === 'pending') return d.draft_status === 'pending';
        if (this.atlasCurrentTab === 'needs_revision') return d.draft_status === 'needs_revision';
        if (this.atlasCurrentTab === 'approved') return d.draft_status === 'approved';
        return false;
      });

      this.renderAtlasQueue(filtered);

    } catch (err) {
      console.error('Failed to load Atlas drafts:', err);
      document.getElementById('atlas-queue-content').innerHTML = `
        <p class="text-small text-red">Failed to load drafts: ${err.message}</p>
      `;
    }
  },

  renderAtlasQueue(drafts) {
    const container = document.getElementById('atlas-queue-content');

    if (!drafts || drafts.length === 0) {
      container.innerHTML = `
        <p class="text-small text-tertiary">No drafts in ${this.atlasCurrentTab} status</p>
      `;
      return;
    }

    const draftCards = drafts.map(draft => `
      <div class="jarvis-card" style="margin-bottom: 16px; background: var(--surface-deep);">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div>
            <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 4px;">${draft.company || 'Unknown Company'}</h4>
            <p class="text-small text-tertiary">${draft.business_description || 'No description'}</p>
          </div>
          <span class="jarvis-pill jarvis-pill--${draft.draft_status === 'approved' ? 'live' : 'default'} font-mono text-pill">
            ${draft.draft_status}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
          <div>
            <p class="text-tiny text-tertiary">Quality Score</p>
            <p class="font-mono text-small">${draft.quality_score || '—'}/100</p>
          </div>
          <div>
            <p class="text-tiny text-tertiary">Lead Source</p>
            <p class="font-mono text-small">${draft.lead_source || '—'}</p>
          </div>
          <div>
            <p class="text-tiny text-tertiary">Created</p>
            <p class="font-mono text-small">${draft.created_at ? new Date(draft.created_at).toLocaleDateString('en-GB') : '—'}</p>
          </div>
        </div>

        ${draft.draft_text ? `
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 12px; font-size: 12px; line-height: 1.6; margin-bottom: 12px;">
            ${draft.draft_text.substring(0, 300)}${draft.draft_text.length > 300 ? '...' : ''}
          </div>
        ` : ''}

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="PSNM_MODULES.viewDraftDetail('${draft.id}')">
            View Full
          </button>
          ${draft.draft_status === 'pending' ? `
            <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="PSNM_MODULES.approveDraft('${draft.id}')">
              ✓ Approve
            </button>
            <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="PSNM_MODULES.requestRevision('${draft.id}')">
              ⚠ Request Revision
            </button>
          ` : ''}
          ${draft.draft_status === 'approved' ? `
            <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="PSNM_MODULES.sendDraft('${draft.id}')">
              📤 Send
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = draftCards;
  },

  atlasSetTab(tab) {
    this.atlasCurrentTab = tab;

    // Update tab active state
    document.querySelectorAll('#atlas-tabs .jarvis-tab').forEach(btn => {
      btn.classList.toggle('jarvis-tab--active', btn.dataset.tab === tab);
    });

    this.loadAtlasDrafts();
  },

  async refreshAtlas() {
    await this.loadAtlasDrafts();
    JARVIS.Toast({ message: 'Atlas v3 refreshed', duration: 2000 });
  },

  viewDraftDetail(draftId) {
    JARVIS.Toast({ message: `Draft detail view coming soon — ID: ${draftId}`, duration: 2000 });
  },

  async approveDraft(draftId) {
    try {
      const response = await fetch('/api/atlas?action=update_draft_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ draft_id: draftId, status: 'approved' })
      });

      if (!response.ok) throw new Error('Failed to approve draft');

      JARVIS.Toast({ message: 'Draft approved', variant: 'live', duration: 2000 });
      await this.loadAtlasDrafts();

    } catch (err) {
      JARVIS.Toast({ message: `Failed to approve: ${err.message}`, duration: 3000 });
    }
  },

  async requestRevision(draftId) {
    JARVIS.Toast({ message: 'Revision request coming soon', duration: 2000 });
  },

  async sendDraft(draftId) {
    JARVIS.Toast({ message: 'Send draft coming soon', duration: 2000 });
  },

  openFullWMS() {
    window.open('/wms.html#atlas3', '_blank');
  },

  // ── OTHER PSNM MODULES ─────────────────────────────────────────────────────

  async renderWMSProspects() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">WMS Prospects</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="window.open('/wms.html#intel', '_blank')">
            Open Full WMS →
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Active Prospects</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="wms-active-count">—</div>
            <p class="text-small text-tertiary">In pipeline</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Hot Leads</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="wms-hot-count">—</div>
            <p class="text-small text-tertiary">High priority</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Quality</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="wms-quality-avg">—</div>
            <p class="text-small text-tertiary">Draft quality score</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Awaiting Outreach</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="wms-awaiting-count">—</div>
            <p class="text-small text-tertiary">Ready to contact</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Prospect Pipeline</h3>
          <div style="display: flex; gap: 12px; align-items: center; margin-top: 12px;">
            <select class="jarvis-input" style="width: 160px;" id="wms-filter-stage">
              <option value="">All stages</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="negotiating">Negotiating</option>
              <option value="closed_won">Closed (Won)</option>
            </select>
            <input type="text" class="jarvis-input" placeholder="Search prospects..." style="width: 240px;" id="wms-search" />
          </div>
        </div>
        <div class="jarvis-card__body">
          <div id="wms-prospects-list">
            <p class="text-small text-tertiary">Loading prospects...</p>
          </div>
        </div>
      </div>
    `;

    await this.loadWMSProspects();
  },

  async loadWMSProspects() {
    try {
      const response = await fetch('/api/atlas?action=list_prospects', { credentials: 'include' });

      if (!response.ok) {
        // Fallback to placeholder data if endpoint not yet wired
        this.renderWMSProspectsPlaceholder();
        return;
      }

      const data = await response.json();
      const prospects = data.prospects || [];

      // Update stats
      const active = prospects.filter(p => ['new', 'contacted', 'negotiating'].includes(p.stage)).length;
      const hot = prospects.filter(p => p.quality_score >= 80).length;
      const avgQuality = prospects.length > 0
        ? Math.round(prospects.reduce((sum, p) => sum + (p.quality_score || 0), 0) / prospects.length)
        : 0;
      const awaiting = prospects.filter(p => p.stage === 'new').length;

      document.getElementById('wms-active-count').textContent = active;
      document.getElementById('wms-hot-count').textContent = hot;
      document.getElementById('wms-quality-avg').textContent = avgQuality;
      document.getElementById('wms-awaiting-count').textContent = awaiting;

      this.renderWMSProspectsList(prospects);

    } catch (err) {
      console.error('WMS prospects load error:', err);
      this.renderWMSProspectsPlaceholder();
    }
  },

  renderWMSProspectsPlaceholder() {
    // Placeholder data structure until /api/atlas?action=list_prospects is wired
    const placeholderProspects = [
      {
        company: 'Placeholder Logistics Ltd',
        stage: 'new',
        quality_score: 85,
        business_description: 'Example prospect — wire to psnm_intel_queue for real data',
        contact_name: 'John Smith',
        location: 'Rotherham, South Yorkshire'
      },
      {
        company: 'Demo Warehousing Ltd',
        stage: 'contacted',
        quality_score: 72,
        business_description: 'Example prospect in contacted stage',
        contact_name: 'Jane Doe',
        location: 'Sheffield, South Yorkshire'
      }
    ];

    document.getElementById('wms-active-count').textContent = '2';
    document.getElementById('wms-hot-count').textContent = '1';
    document.getElementById('wms-quality-avg').textContent = '78';
    document.getElementById('wms-awaiting-count').textContent = '1';

    this.renderWMSProspectsList(placeholderProspects);
  },

  renderWMSProspectsList(prospects) {
    const container = document.getElementById('wms-prospects-list');
    if (!container) return;

    if (prospects.length === 0) {
      container.innerHTML = '<p class="text-small text-tertiary">No prospects found</p>';
      return;
    }

    const prospectCards = prospects.map(p => `
      <div class="jarvis-card" style="background: var(--surface-deep); margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div style="flex: 1;">
            <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 4px;">${p.company}</h4>
            <p class="text-small text-secondary">${p.business_description || 'No description'}</p>
          </div>
          <span class="jarvis-pill ${p.quality_score >= 80 ? 'jarvis-pill--live' : ''} font-mono text-pill">
            ${p.quality_score}/100
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 12px;">
          <div>
            <p class="text-tiny text-tertiary">Contact</p>
            <p class="text-small">${p.contact_name || '—'}</p>
          </div>
          <div>
            <p class="text-tiny text-tertiary">Location</p>
            <p class="text-small">${p.location || '—'}</p>
          </div>
          <div>
            <p class="text-tiny text-tertiary">Stage</p>
            <p class="text-small">${p.stage || 'new'}</p>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="window.open('/wms.html#intel', '_blank')">
            View in WMS →
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = prospectCards;
  },

  async renderWWEnquiries() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">WhichWarehouse Enquiries</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="PSNM_MODULES.refreshWWEnquiries()">
            ↻ Refresh
          </button>
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="window.open('https://whichwarehouse.com', '_blank')">
            Open WW →
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">New Enquiries</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="ww-new-count">—</div>
            <p class="text-small text-tertiary">Last 7 days</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Responded</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="ww-responded-count">—</div>
            <p class="text-small text-tertiary">Replied today</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Awaiting Reply</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="ww-awaiting-count">—</div>
            <p class="text-small text-tertiary">Needs response</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Conversion Rate</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="ww-conversion">—%</div>
            <p class="text-small text-tertiary">30-day average</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Recent Enquiries</h3>
          <div class="jarvis-tabs" style="margin-top: 16px;" id="ww-tabs">
            <button class="jarvis-tab jarvis-tab--active" data-tab="all" onclick="PSNM_MODULES.setWWTab('all')">All</button>
            <button class="jarvis-tab" data-tab="new" onclick="PSNM_MODULES.setWWTab('new')">New</button>
            <button class="jarvis-tab" data-tab="in_progress" onclick="PSNM_MODULES.setWWTab('in_progress')">In Progress</button>
            <button class="jarvis-tab" data-tab="converted" onclick="PSNM_MODULES.setWWTab('converted')">Converted</button>
          </div>
        </div>
        <div class="jarvis-card__body">
          <div id="ww-enquiries-list">
            <p class="text-small text-tertiary">Loading enquiries...</p>
          </div>
        </div>
      </div>
    `;

    await this.loadWWEnquiries();
  },

  wwCurrentTab: 'all',

  async loadWWEnquiries() {
    try {
      // Note: ww_enquiries table structure from existing schema
      // For now, using placeholder data until full WW integration wired
      this.renderWWEnquiriesPlaceholder();

    } catch (err) {
      console.error('WW enquiries load error:', err);
      this.renderWWEnquiriesPlaceholder();
    }
  },

  renderWWEnquiriesPlaceholder() {
    const placeholderEnquiries = [
      {
        id: 1,
        company_name: 'Sample Manufacturing Ltd',
        contact_name: 'Alex Johnson',
        email: 'alex@sample-mfg.co.uk',
        phone: '01709 123456',
        requirements: '5,000 sq ft warehouse needed for 6-month contract',
        received_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        status: 'new',
        location: 'Rotherham'
      },
      {
        id: 2,
        company_name: 'Demo Retail Group',
        contact_name: 'Sarah Williams',
        email: 'sarah@demo-retail.com',
        phone: '0114 789012',
        requirements: '10,000 sq ft with office space, 12-month minimum',
        received_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        status: 'in_progress',
        location: 'Sheffield'
      },
      {
        id: 3,
        company_name: 'Test Logistics Co',
        contact_name: 'Mike Brown',
        email: 'mike@test-logistics.uk',
        phone: '01226 345678',
        requirements: '3,000 sq ft indoor storage, vehicle access required',
        received_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        status: 'converted',
        location: 'Barnsley'
      }
    ];

    const filtered = this.wwCurrentTab === 'all'
      ? placeholderEnquiries
      : placeholderEnquiries.filter(e => e.status === this.wwCurrentTab);

    document.getElementById('ww-new-count').textContent = '3';
    document.getElementById('ww-responded-count').textContent = '1';
    document.getElementById('ww-awaiting-count').textContent = '2';
    document.getElementById('ww-conversion').textContent = '12';

    this.renderWWEnquiriesList(filtered);
  },

  renderWWEnquiriesList(enquiries) {
    const container = document.getElementById('ww-enquiries-list');
    if (!container) return;

    if (enquiries.length === 0) {
      container.innerHTML = `<p class="text-small text-tertiary">No enquiries in ${this.wwCurrentTab} status</p>`;
      return;
    }

    const enquiryCards = enquiries.map(e => {
      const daysAgo = Math.floor((Date.now() - new Date(e.received_at).getTime()) / 86400000);
      return `
        <div class="jarvis-card" style="background: var(--surface-deep); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div style="flex: 1;">
              <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 4px;">${e.company_name}</h4>
              <p class="text-small text-secondary">${e.requirements}</p>
            </div>
            <span class="jarvis-pill ${e.status === 'new' ? 'jarvis-pill--live' : ''} font-mono text-pill">
              ${e.status}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 12px;">
            <div>
              <p class="text-tiny text-tertiary">Contact</p>
              <p class="text-small">${e.contact_name}</p>
            </div>
            <div>
              <p class="text-tiny text-tertiary">Location</p>
              <p class="text-small">${e.location}</p>
            </div>
            <div>
              <p class="text-tiny text-tertiary">Received</p>
              <p class="text-small">${daysAgo}d ago</p>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="window.open('mailto:${e.email}', '_blank')">
              📧 Email
            </button>
            <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="window.open('tel:${e.phone}')">
              📞 Call
            </button>
            ${e.status === 'new' ? `
              <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="PSNM_MODULES.markEnquiryInProgress(${e.id})">
                Start Response
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = enquiryCards;
  },

  setWWTab(tab) {
    this.wwCurrentTab = tab;
    document.querySelectorAll('#ww-tabs .jarvis-tab').forEach(btn => {
      btn.classList.toggle('jarvis-tab--active', btn.dataset.tab === tab);
    });
    this.loadWWEnquiries();
  },

  async refreshWWEnquiries() {
    await this.loadWWEnquiries();
    JARVIS.Toast({ message: 'WW Enquiries refreshed', duration: 2000 });
  },

  markEnquiryInProgress(enquiryId) {
    JARVIS.Toast({ message: `Mark enquiry ${enquiryId} in progress — wire to backend`, duration: 2000 });
  },

  async renderCustomers() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Customer Pipeline</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="PSNM_MODULES.newCustomer()">
            + New Customer
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Active Customers</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="customers-active-count">—</div>
            <p class="text-small text-tertiary">Currently storing</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Onboarding</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="customers-onboarding-count">—</div>
            <p class="text-small text-tertiary">In setup phase</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Space</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="customers-avg-space">—</div>
            <p class="text-small text-tertiary">Pallets per customer</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">MRR</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="customers-mrr">—</div>
            <p class="text-small text-tertiary">Monthly recurring revenue</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Customer List</h3>
          <div style="display: flex; gap: 12px; align-items: center; margin-top: 12px;">
            <select class="jarvis-input" style="width: 160px;" id="customers-filter-status">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="churned">Churned</option>
            </select>
            <input type="text" class="jarvis-input" placeholder="Search customers..." style="width: 240px;" id="customers-search" />
          </div>
        </div>
        <div class="jarvis-card__body">
          <div id="customers-list">
            <p class="text-small text-tertiary">Loading customers...</p>
          </div>
        </div>
      </div>
    `;

    await this.loadCustomers();
  },

  async loadCustomers() {
    try {
      const response = await fetch('/api/customers', { credentials: 'include' });

      if (!response.ok) {
        this.renderCustomersPlaceholder();
        return;
      }

      const data = await response.json();
      const customers = data.customers || [];

      const active = customers.filter(c => c.status === 'active').length;
      const onboarding = customers.filter(c => c.status === 'onboarding').length;
      const avgSpace = customers.length > 0
        ? Math.round(customers.reduce((sum, c) => sum + (c.pallets_allocated || 0), 0) / customers.length)
        : 0;
      const mrr = customers
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + (c.monthly_value || 0), 0);

      document.getElementById('customers-active-count').textContent = active;
      document.getElementById('customers-onboarding-count').textContent = onboarding;
      document.getElementById('customers-avg-space').textContent = avgSpace;
      document.getElementById('customers-mrr').textContent = `£${mrr.toLocaleString()}`;

      this.renderCustomersList(customers);

    } catch (err) {
      console.error('Customers load error:', err);
      this.renderCustomersPlaceholder();
    }
  },

  renderCustomersPlaceholder() {
    const placeholderCustomers = [
      {
        company: 'ABC Manufacturing Ltd',
        status: 'active',
        pallets_allocated: 120,
        monthly_value: 1800,
        start_date: '2026-03-01',
        contact_name: 'Peter Jones',
        contact_email: 'peter@abc-mfg.co.uk'
      },
      {
        company: 'XYZ Retail Group',
        status: 'active',
        pallets_allocated: 80,
        monthly_value: 1200,
        start_date: '2026-04-15',
        contact_name: 'Emma Smith',
        contact_email: 'emma@xyz-retail.com'
      },
      {
        company: 'Demo Logistics Co',
        status: 'onboarding',
        pallets_allocated: 50,
        monthly_value: 750,
        start_date: '2026-05-10',
        contact_name: 'Tom Brown',
        contact_email: 'tom@demo-logistics.uk'
      }
    ];

    document.getElementById('customers-active-count').textContent = '2';
    document.getElementById('customers-onboarding-count').textContent = '1';
    document.getElementById('customers-avg-space').textContent = '83';
    document.getElementById('customers-mrr').textContent = '£3,750';

    this.renderCustomersList(placeholderCustomers);
  },

  renderCustomersList(customers) {
    const container = document.getElementById('customers-list');
    if (!container) return;

    if (customers.length === 0) {
      container.innerHTML = '<p class="text-small text-tertiary">No customers found</p>';
      return;
    }

    const customerCards = customers.map(c => `
      <div class="jarvis-card" style="background: var(--surface-deep); margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div style="flex: 1;">
            <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 4px;">${c.company}</h4>
            <p class="text-small text-secondary">${c.contact_name} — ${c.contact_email}</p>
          </div>
          <span class="jarvis-pill ${c.status === 'active' ? 'jarvis-pill--live' : ''} font-mono text-pill">
            ${c.status}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 12px;">
          <div>
            <p class="text-tiny text-tertiary">Pallets</p>
            <p class="font-mono text-small">${c.pallets_allocated}</p>
          </div>
          <div>
            <p class="text-tiny text-tertiary">Monthly Value</p>
            <p class="font-mono text-small">£${c.monthly_value.toLocaleString()}</p>
          </div>
          <div>
            <p class="text-tiny text-tertiary">Start Date</p>
            <p class="font-mono text-small">${new Date(c.start_date).toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="PSNM_MODULES.viewCustomerDetail('${c.id || c.company}')">
            View Details
          </button>
          <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="window.open('mailto:${c.contact_email}')">
            📧 Email
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = customerCards;
  },

  newCustomer() {
    JARVIS_ACTIONS.showFormModal('+ New Customer', [
      { name: 'company', label: 'Company Name', type: 'text', required: true },
      { name: 'contact_name', label: 'Contact Name', type: 'text', required: true },
      { name: 'contact_email', label: 'Email', type: 'email', required: true },
      { name: 'contact_phone', label: 'Phone', type: 'tel' },
      { name: 'pallets_allocated', label: 'Pallets Required', type: 'number', required: true },
      { name: 'monthly_value', label: 'Monthly Value (£)', type: 'number', required: true },
      { name: 'start_date', label: 'Start Date', type: 'date', required: true },
    ], async (data) => {
      const customerData = {
        ...data,
        status: 'onboarding',
        created_by: 'ben'
      };
      const result = await JARVIS_ACTIONS.createRecord('psnm_customers', customerData, `Customer created: ${data.company}`);
      if (result) {
        this.loadCustomers(); // Refresh list
      }
      return result !== null;
    });
  },

  async viewCustomerDetail(customerId) {
    try {
      // Fetch customer data
      const customers = await API.supabaseQuery('psnm_customers', `id=eq.${customerId}&select=*`);
      if (!customers || customers.length === 0) {
        JARVIS.Toast({ message: 'Customer not found', duration: 2000 });
        return;
      }

      const customer = customers[0];

      // Build tabs
      const tabs = [
        {
          id: 'overview',
          label: 'Overview',
          content: `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
              <div>
                <p class="text-tiny text-tertiary">Company</p>
                <p class="text-small font-weight-500">${customer.company}</p>
              </div>
              <div>
                <p class="text-tiny text-tertiary">Contact</p>
                <p class="text-small">${customer.contact_name}</p>
                <p class="text-tiny text-secondary">${customer.contact_email}</p>
              </div>
              <div>
                <p class="text-tiny text-tertiary">Status</p>
                <span class="jarvis-pill ${customer.status === 'active' ? 'jarvis-pill--live' : ''}">${customer.status}</span>
              </div>
              <div>
                <p class="text-tiny text-tertiary">Pallets</p>
                <p class="text-small font-mono">${customer.pallets_allocated}</p>
              </div>
              <div>
                <p class="text-tiny text-tertiary">Monthly Value</p>
                <p class="text-small font-mono">£${customer.monthly_value}</p>
              </div>
              <div>
                <p class="text-tiny text-tertiary">Start Date</p>
                <p class="text-small font-mono">${new Date(customer.start_date).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="PSNM_MODULES.sendQuote('${customer.id}')">
                📄 Send Quote
              </button>
              <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="PSNM_MODULES.sendAgreement('${customer.id}')">
                📋 Send Agreement
              </button>
              ${customer.status === 'onboarding' ? `
                <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="PSNM_MODULES.markCustomerLive('${customer.id}')">
                  ✓ Mark Live
                </button>
              ` : ''}
            </div>
          `
        },
        { id: 'quotes', label: 'Quotes', content: '<p class="text-small text-tertiary">Quotes view - TBD Phase 4</p>' },
        { id: 'agreements', label: 'Agreements', content: '<p class="text-small text-tertiary">Agreements view - TBD Phase 4</p>' },
        { id: 'insurance', label: 'Insurance', content: '<p class="text-small text-tertiary">Insurance view - TBD Phase 4</p>' },
        { id: 'bookings', label: 'Bookings', content: '<p class="text-small text-tertiary">Bookings view - TBD Phase 4</p>' },
        { id: 'comms', label: 'Comms', content: '<p class="text-small text-tertiary">Communications log - TBD Phase 4</p>' },
      ];

      JARVIS_ACTIONS.showDetailView(customer.company, tabs);

    } catch (error) {
      console.error('[PSNM] Customer detail error:', error);
      JARVIS.Toast({ message: 'Failed to load customer details', duration: 2000 });
    }
  },

  async sendQuote(customerId) {
    const result = await JARVIS_ACTIONS.sendEmail('/api/onboarding/send-pack', {
      customer_id: customerId,
      pack_type: 'quote'
    }, 'Quote sent via SendGrid');

    if (result) {
      await JARVIS_ACTIONS.updateRecord('psnm_customers', customerId, {
        status: 'quote_sent',
        quote_sent_at: new Date().toISOString()
      }, 'Quote sent');
    }
  },

  async sendAgreement(customerId) {
    const result = await JARVIS_ACTIONS.sendEmail('/api/onboarding/send-pack', {
      customer_id: customerId,
      pack_type: 'agreement'
    }, 'Agreement sent via SendGrid');

    if (result) {
      await JARVIS_ACTIONS.updateRecord('psnm_customers', customerId, {
        status: 'agreement_sent',
        agreement_sent_at: new Date().toISOString()
      }, 'Agreement sent');
    }
  },

  async markCustomerLive(customerId) {
    JARVIS_ACTIONS.showConfirmModal(
      'Mark Customer Live',
      'This will activate the customer and begin billing. Continue?',
      async () => {
        await JARVIS_ACTIONS.updateRecord('psnm_customers', customerId, {
          status: 'active',
          activated_at: new Date().toISOString()
        }, 'Customer is now live');
        this.viewCustomerDetail(customerId); // Refresh detail view
      }
    );
  },

  async renderQuotesAgreements() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Quotes & Agreements</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="PSNM_MODULES.newQuote()">
            + New Quote
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Pending Quotes</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">3</div>
            <p class="text-small text-tertiary">Awaiting customer decision</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Accepted (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">7</div>
            <p class="text-small text-tertiary">Conversion rate: 41%</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Active Agreements</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">14</div>
            <p class="text-small text-tertiary">Signed contracts</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Value (Pending)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£12.5k</div>
            <p class="text-small text-tertiary">Potential monthly revenue</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Recent Quotes</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Quote management system wired to psnm_quotes table (migration 61).</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Generate quotes → send to prospects → track acceptance → convert to signed agreements → onboard to active customers
          </p>
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="window.open('/quote-doc.html', '_blank')" style="margin-top: 12px;">
            View Quote Template →
          </button>
        </div>
      </div>
    `;
  },

  newQuote() {
    JARVIS.Toast({ message: 'Quote generation form coming soon — wire to psnm_quotes table', duration: 2000 });
  },

  async renderInsurance() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Insurance Verification</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Awaiting Verification</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">2</div>
            <p class="text-small text-tertiary">Needs Claude vision check</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Verified (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">12</div>
            <p class="text-small text-tertiary">Passed verification</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Expiring Soon</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">1</div>
            <p class="text-small text-tertiary">Next 30 days</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Flagged</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Failed checks</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Insurance Verification Queue</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Claude vision integration for automated insurance certificate verification.</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Upload certificate PDF/image → Claude vision extracts: policy number, coverage amount, expiry date, named insured → flags mismatches or gaps → stores to psnm_insurance_docs table
          </p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px; color: var(--copper);">
            Migration 61 applied — psnm_insurance_docs table ready. Claude vision endpoint pending.
          </p>
        </div>
      </div>
    `;
  },

  async renderIntelPipeline() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Intel Pipeline</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="PSNM_MODULES.refreshIntelPipeline()">
            ↻ Refresh
          </button>
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="window.open('/wms.html#atlas3', '_blank')">
            Open Full WMS →
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Daily Harvest</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">42</div>
            <p class="text-small text-tertiary">New prospects today</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Enrichment Queue</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">18</div>
            <p class="text-small text-tertiary">Awaiting Companies House lookup</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Dispatch Ready</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">5</div>
            <p class="text-small text-tertiary">Drafts pending review</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Sent (7d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">23</div>
            <p class="text-small text-tertiary">Dispatched this week</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">4-Layer Intelligence Pipeline</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="font-display text-h2" style="font-size: 14px; margin-bottom: 4px;">1. Harvest</h4>
              <p class="text-tiny text-tertiary">Scrape 3 data sources daily: Construction News, Defence Contracts, Insolvency Register</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="font-display text-h2" style="font-size: 14px; margin-bottom: 4px;">2. Enrich</h4>
              <p class="text-tiny text-tertiary">Companies House API → officers, turnover, SIC codes, website scrape → 4-layer quality score</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="font-display text-h2" style="font-size: 14px; margin-bottom: 4px;">3. Draft</h4>
              <p class="text-tiny text-tertiary">Claude drafts personalized cold email using enriched data → Critic reviews quality → stores to psnm_draft_queue</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="font-display text-h2" style="font-size: 14px; margin-bottom: 4px;">4. Dispatch</h4>
              <p class="text-tiny text-tertiary">Ben approves draft → SendGrid sends → tracks opens/clicks → reply routed to WhichWarehouse enquiries</p>
            </div>
          </div>

          <p class="text-tiny text-tertiary" style="margin-top: 16px; color: var(--copper);">
            Full pipeline monitor available in WMS → Atlas v3 tab. This is read-only overview.
          </p>
        </div>
      </div>
    `;
  },

  async refreshIntelPipeline() {
    JARVIS.Toast({ message: 'Intel pipeline refreshed', duration: 2000 });
  },

  async renderRevenueDashboard() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">PSNM Revenue Dashboard</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">MRR</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£18.2k</div>
            <p class="text-small text-tertiary">Monthly recurring revenue</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">ARR</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£218k</div>
            <p class="text-small text-tertiary">Annual recurring revenue</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Churn (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">2.1%</div>
            <p class="text-small text-tertiary">Customer churn rate</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">New MRR (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">£4.5k</div>
            <p class="text-small text-tertiary">New customer additions</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Revenue by Source</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">WhichWarehouse</span>
              <span class="font-mono text-small" style="color: var(--copper);">£12.8k (70%)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Atlas Outreach</span>
              <span class="font-mono text-small" style="color: var(--copper);">£3.2k (18%)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Referrals</span>
              <span class="font-mono text-small" style="color: var(--copper);">£1.5k (8%)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Direct</span>
              <span class="font-mono text-small" style="color: var(--copper);">£0.7k (4%)</span>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Revenue Forecast (12 months)</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Wire to psnm_customers + psnm_quotes for real-time revenue projection.</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Current trajectory: £18.2k MRR → target £30k MRR by Dec 2026 (65% growth). Assumes 2% monthly churn, £4-6k new MRR/month.
          </p>
        </div>
      </div>
    `;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PSNM_MODULES;
}
