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

  // ── OTHER PSNM MODULES (STUBBED) ──────────────────────────────────────────

  renderWMSProspects() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">WMS Prospects</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">WMS Prospects module coming soon — full functionality available in WMS.</p>
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="window.open('/wms.html', '_blank')" style="margin-top: 12px;">
            Open WMS →
          </button>
        </div>
      </div>
    `;
  },

  renderWWEnquiries() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">WhichWarehouse Enquiries</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">WW Enquiries tracker coming soon — full functionality available in WMS.</p>
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="window.open('/wms.html#atlas3', '_blank')" style="margin-top: 12px;">
            Open WMS →
          </button>
        </div>
      </div>
    `;
  },

  renderCustomers() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Customer Pipeline</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Customer onboarding pipeline coming soon — schema ready (migration 61), UI in development.</p>
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="window.open('/wms.html', '_blank')" style="margin-top: 12px;">
            Open WMS →
          </button>
        </div>
      </div>
    `;
  },

  renderQuotesAgreements() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Quotes & Agreements</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Quote + Agreement generation coming soon — schema ready (migration 61), UI in development.</p>
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="window.open('/quote-doc.html', '_blank')" style="margin-top: 12px;">
            View Quote Template →
          </button>
        </div>
      </div>
    `;
  },

  renderInsurance() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Insurance Verification</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Insurance verification queue coming soon — schema ready (migration 61), Claude vision integration pending.</p>
        </div>
      </div>
    `;
  },

  renderIntelPipeline() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Intel Pipeline</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Intelligence pipeline monitor (harvest/enrich/classify) coming soon — full functionality available in WMS.</p>
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="window.open('/wms.html#atlas3', '_blank')" style="margin-top: 12px;">
            Open WMS →
          </button>
        </div>
      </div>
    `;
  },

  renderRevenueDashboard() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">PSNM Revenue Dashboard</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">PSNM-specific revenue dashboard coming soon — wire to psnm_customers + psnm_quotes revenue data.</p>
        </div>
      </div>
    `;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PSNM_MODULES;
}
