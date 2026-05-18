/**
 * JARVIS Action Handlers
 * Reusable CRUD and status update patterns for all modules
 * Created: 2026-05-13
 */

const JARVIS_ACTIONS = {
  // ── GENERIC CRUD OPERATIONS ────────────────────────────────────────────────

  async createRecord(table, data, successMessage = 'Record created') {
    try {
      const result = await API.supabaseInsert(table, data);
      if (result) {
        JARVIS.Toast({ message: successMessage, duration: 2000 });
        return result;
      } else {
        throw new Error('Insert failed');
      }
    } catch (error) {
      console.error(`[JARVIS] Create ${table} failed:`, error);
      JARVIS.Toast({ message: `Failed to create: ${error.message}`, duration: 3000 });
      return null;
    }
  },

  async updateRecord(table, id, updates, successMessage = 'Updated successfully') {
    try {
      const result = await API.supabaseUpdate(table, id, updates);
      if (result) {
        JARVIS.Toast({ message: successMessage, duration: 2000 });
        return result;
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error(`[JARVIS] Update ${table} failed:`, error);
      JARVIS.Toast({ message: `Failed to update: ${error.message}`, duration: 3000 });
      return null;
    }
  },

  async deleteRecord(table, id, successMessage = 'Deleted successfully') {
    // Soft delete by default (status='deleted')
    return this.updateRecord(table, id, { status: 'deleted' }, successMessage);
  },

  async toggleStatus(table, id, currentStatus, statusMap, successMessage = 'Status updated') {
    // statusMap: { 'active': 'inactive', 'inactive': 'active' }
    const newStatus = statusMap[currentStatus];
    if (!newStatus) {
      JARVIS.Toast({ message: 'Invalid status transition', duration: 2000 });
      return null;
    }
    return this.updateRecord(table, id, { status: newStatus }, successMessage);
  },

  // ── MODAL HELPERS ────────────────────────────────────────────────────────

  showConfirmModal(title, message, onConfirm) {
    const modal = JARVIS.Modal({
      title,
      content: `<p class="text-small">${message}</p>`,
      actions: [
        {
          label: 'Cancel',
          variant: 'secondary',
          onClick: (closeModal) => closeModal()
        },
        {
          label: 'Confirm',
          variant: 'primary',
          onClick: async (closeModal) => {
            await onConfirm();
            closeModal();
          }
        }
      ]
    });
    document.body.appendChild(modal);
  },

  showFormModal(title, fields, onSubmit) {
    // fields: [{ name, label, type, required, options }]
    const formHTML = fields.map(field => {
      if (field.type === 'select') {
        return `
          <div style="margin-bottom: 16px;">
            <label class="text-small text-secondary" style="display: block; margin-bottom: 4px;">${field.label}</label>
            <select id="${field.name}" class="jarvis-input" ${field.required ? 'required' : ''}>
              ${field.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
            </select>
          </div>
        `;
      } else if (field.type === 'textarea') {
        return `
          <div style="margin-bottom: 16px;">
            <label class="text-small text-secondary" style="display: block; margin-bottom: 4px;">${field.label}</label>
            <textarea id="${field.name}" class="jarvis-input" rows="${field.rows || 4}" ${field.required ? 'required' : ''}></textarea>
          </div>
        `;
      } else {
        return `
          <div style="margin-bottom: 16px;">
            <label class="text-small text-secondary" style="display: block; margin-bottom: 4px;">${field.label}</label>
            <input type="${field.type || 'text'}" id="${field.name}" class="jarvis-input" ${field.required ? 'required' : ''} />
          </div>
        `;
      }
    }).join('');

    const modal = JARVIS.Modal({
      title,
      content: `<form id="dynamicForm">${formHTML}</form>`,
      actions: [
        {
          label: 'Cancel',
          variant: 'secondary',
          onClick: (closeModal) => closeModal()
        },
        {
          label: 'Submit',
          variant: 'primary',
          onClick: async (closeModal) => {
            const formData = {};
            fields.forEach(field => {
              const el = document.getElementById(field.name);
              if (el) formData[field.name] = el.value;
            });
            const success = await onSubmit(formData);
            if (success !== false) closeModal();
          }
        }
      ]
    });
    document.body.appendChild(modal);
  },

  // ── STATUS TRANSITIONS ─────────────────────────────────────────────────────

  async markComplete(table, id, completedAtField = 'completed_at') {
    const updates = {
      status: 'complete',
      [completedAtField]: new Date().toISOString()
    };
    return this.updateRecord(table, id, updates, 'Marked complete');
  },

  async markInProgress(table, id) {
    return this.updateRecord(table, id, { status: 'in_progress' }, 'Status: In Progress');
  },

  async markVerified(table, id, verifiedField = 'verified_at') {
    const updates = {
      verified: true,
      [verifiedField]: new Date().toISOString()
    };
    return this.updateRecord(table, id, updates, 'Verified');
  },

  // ── EMAIL / SEND ACTIONS ───────────────────────────────────────────────────

  async sendEmail(endpoint, payload, successMessage = 'Email sent') {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      JARVIS.Toast({ message: successMessage, duration: 2000 });
      return await response.json();
    } catch (error) {
      console.error('[JARVIS] Email send failed:', error);
      JARVIS.Toast({ message: `Failed to send: ${error.message}`, duration: 3000 });
      return null;
    }
  },

  // ── VIEW HELPERS ───────────────────────────────────────────────────────────

  showDetailView(title, tabs, onTabChange) {
    // tabs: [{ id, label, content }]
    const tabsHTML = tabs.map((tab, idx) => `
      <button class="jarvis-tab ${idx === 0 ? 'jarvis-tab--active' : ''}"
              data-tab="${tab.id}"
              onclick="JARVIS_ACTIONS.switchDetailTab('${tab.id}', ${JSON.stringify(tabs.map(t => t.id))})">
        ${tab.label}
      </button>
    `).join('');

    const contentHTML = tabs.map((tab, idx) => `
      <div id="detail-tab-${tab.id}" class="detail-tab-content" style="display: ${idx === 0 ? 'block' : 'none'};">
        ${tab.content}
      </div>
    `).join('');

    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">${title}</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="history.back()">
            ← Back
          </button>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <div class="jarvis-tabs">
            ${tabsHTML}
          </div>
        </div>
        <div class="jarvis-card__body">
          ${contentHTML}
        </div>
      </div>
    `;
  },

  switchDetailTab(tabId, allTabIds) {
    // Update tab active states
    document.querySelectorAll('.jarvis-tab').forEach(btn => {
      btn.classList.toggle('jarvis-tab--active', btn.dataset.tab === tabId);
    });

    // Show/hide tab content
    allTabIds.forEach(id => {
      const content = document.getElementById(`detail-tab-${id}`);
      if (content) {
        content.style.display = id === tabId ? 'block' : 'none';
      }
    });
  },

  // ── COPY TO CLIPBOARD ──────────────────────────────────────────────────────

  async copyToClipboard(text, successMessage = 'Copied to clipboard') {
    try {
      await navigator.clipboard.writeText(text);
      JARVIS.Toast({ message: successMessage, duration: 2000 });
    } catch (error) {
      console.error('[JARVIS] Clipboard copy failed:', error);
      JARVIS.Toast({ message: 'Failed to copy', duration: 2000 });
    }
  },

  // ── FILE / PDF ACTIONS ─────────────────────────────────────────────────────

  viewPDF(pdfUrl) {
    window.open(pdfUrl, '_blank');
  },

  async downloadFile(url, filename) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      JARVIS.Toast({ message: `Downloaded: ${filename}`, duration: 2000 });
    } catch (error) {
      console.error('[JARVIS] Download failed:', error);
      JARVIS.Toast({ message: 'Download failed', duration: 2000 });
    }
  },
};

// Export for global usage
window.JARVIS_ACTIONS = JARVIS_ACTIONS;
