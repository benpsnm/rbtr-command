/**
 * JARVIS Personal + Sarah Modules
 * Created: 2026-05-13
 * Personal productivity + Sarah's dedicated space
 */

const PERSONAL_MODULES = {
  // ── PERSONAL LANDING ───────────────────────────────────────────────────────
  renderLanding() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Personal</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <div class="jarvis-card" style="cursor: pointer; border: 2px solid var(--copper);" onclick="PERSONAL_MODULES.renderTasks()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2" style="color: var(--copper);">✓ Tasks</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Full task management (rbtr_tasks table)</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderHabits()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📅 Habit Tracker</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Ben's daily habit checklist</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderWellness()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">💪 Wellness</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Training, nutrition, sleep, supplements, bloods</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderNotes()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📝 Notes Vault</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Quick notes + voice memo transcripts</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderPlanner()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🗓 Planner</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Daily / Weekly / Monthly / Yearly views</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderCalendar()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📆 Shared Calendar</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Ben + Sarah + family events</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderNotifications()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🔔 Notifications</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">System alerts + reminders</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderBankruptcyWorkbook()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📊 Bankruptcy Workbook</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Personal bankruptcy docs + checklist</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderLegalReminder()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">⚖️ Legal Reminder</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Narrative + bankruptcy context widget</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderFourGates()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🚪 Four Gates Check</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Decision framework (port from V12)</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderOwnership()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📜 Ownership</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">APA status, ownership chain</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="PERSONAL_MODULES.renderFamily()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">👨‍👩‍👦‍👦 Family</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Hudson + Benson + Peanut activities</p>
          </div>
        </div>
      </div>
    `;
  },

  // ── TASKS (FULL IMPLEMENTATION) ────────────────────────────────────────────
  async renderTasks() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Tasks</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="PERSONAL_MODULES.newTask()">
            + New Task
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Open</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="tasks-open-count">—</div>
            <p class="text-small text-tertiary">Not started</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">In Progress</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="tasks-inprogress-count">—</div>
            <p class="text-small text-tertiary">Currently working</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Blocked</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);" id="tasks-blocked-count">—</div>
            <p class="text-small text-tertiary">Awaiting unblock</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Task List</h3>
          <div style="display: flex; gap: 12px; align-items: center; margin-top: 12px;">
            <select class="jarvis-input" style="width: 160px;" onchange="PERSONAL_MODULES.filterTasks(this.value)">
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="complete">Complete</option>
            </select>
            <select class="jarvis-input" style="width: 160px;" onchange="PERSONAL_MODULES.filterTasks(null, this.value)">
              <option value="">All projects</option>
              <option value="psnm">PSNM</option>
              <option value="rbtr">RBTR</option>
              <option value="forge">Forge</option>
              <option value="personal">Personal</option>
            </select>
          </div>
        </div>
        <div class="jarvis-card__body">
          <div id="tasks-list">
            <p class="text-small text-tertiary">Loading tasks...</p>
          </div>
        </div>
      </div>
    `;

    await this.loadTasks();
  },

  async loadTasks(statusFilter, projectFilter) {
    try {
      let url = '/api/tasks?status=open,in_progress,blocked';
      if (statusFilter) url += `&status=${statusFilter}`;
      if (projectFilter) url += `&project=${projectFilter}`;

      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load tasks');

      const data = await response.json();
      const tasks = data.tasks || [];

      // Update counts
      const counts = {
        open: tasks.filter(t => t.status === 'open').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        blocked: tasks.filter(t => t.status === 'blocked').length
      };

      const openCount = document.getElementById('tasks-open-count');
      const inProgressCount = document.getElementById('tasks-inprogress-count');
      const blockedCount = document.getElementById('tasks-blocked-count');

      if (openCount) openCount.textContent = counts.open;
      if (inProgressCount) inProgressCount.textContent = counts.in_progress;
      if (blockedCount) blockedCount.textContent = counts.blocked;

      // Render task list
      const listContainer = document.getElementById('tasks-list');
      if (!listContainer) return;

      if (tasks.length === 0) {
        listContainer.innerHTML = '<p class="text-small text-tertiary">No tasks found</p>';
        return;
      }

      const taskCards = tasks.map(task => `
        <div class="jarvis-card" style="background: var(--surface-deep); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div style="flex: 1;">
              <h4 class="text-small" style="margin-bottom: 4px;">${task.description}</h4>
              <div style="display: flex; gap: 8px; align-items: center;">
                <span class="jarvis-pill jarvis-pill--${task.status === 'in_progress' ? 'live' : 'default'} font-mono text-pill">${task.status}</span>
                ${task.project ? `<span class="jarvis-pill font-mono text-pill">${task.project}</span>` : ''}
                ${task.priority ? `<span class="jarvis-pill font-mono text-pill">P${task.priority}</span>` : ''}
              </div>
            </div>
          </div>
          ${task.blocked_reason ? `<p class="text-tiny text-tertiary" style="margin-bottom: 8px;">⚠ ${task.blocked_reason}</p>` : ''}
          <div style="display: flex; gap: 8px;">
            ${task.status !== 'complete' ? `
              <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="PERSONAL_MODULES.markComplete('${task.id}')">
                ✓ Complete
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');

      listContainer.innerHTML = taskCards;

    } catch (err) {
      console.error('Failed to load tasks:', err);
      const listContainer = document.getElementById('tasks-list');
      if (listContainer) {
        listContainer.innerHTML = `<p class="text-small text-red">Failed to load tasks: ${err.message}</p>`;
      }
    }
  },

  filterTasks(statusFilter, projectFilter) {
    this.loadTasks(statusFilter, projectFilter);
  },

  async markComplete(taskId) {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: taskId, status: 'complete' })
      });

      if (!response.ok) throw new Error('Failed to update task');

      JARVIS.Toast({ message: 'Task marked complete', variant: 'live', duration: 2000 });
      await this.loadTasks();

    } catch (err) {
      JARVIS.Toast({ message: `Failed to complete task: ${err.message}`, duration: 3000 });
    }
  },

  newTask() {
    JARVIS.Toast({ message: 'New task form coming soon — use /api/tasks POST for now', duration: 2000 });
  },

  // ── STUBBED PERSONAL MODULES ───────────────────────────────────────────────
  renderHabits() { this._stubModule('Habit Tracker', 'Ben\'s daily habit checklist. Port from V12.'); },
  renderWellness() { this._stubModule('Wellness', 'Training, nutrition, sleep, supplements, bloods. Wire to rbtr_wellness_daily tables.'); },
  renderNotes() { this._stubModule('Notes Vault', 'Quick notes + voice memo transcripts. Port from V12.'); },
  renderPlanner() { this._stubModule('Planner', 'Daily / Weekly / Monthly / Yearly views. Port from V12.'); },
  renderCalendar() { this._stubModule('Shared Calendar', 'Ben + Sarah + family events. Port from V12.'); },
  renderNotifications() { this._stubModule('Notifications', 'System alerts + reminders. Port from V12.'); },
  renderBankruptcyWorkbook() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Bankruptcy Workbook</h1>
      </div>
      <div class="jarvis-card">
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Personal bankruptcy documentation:</p>
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="window.open('file:///Users/bengreenwood/Documents/RBTR-Brain/03-Resources/Personal-Bankruptcy/', '_blank')" style="margin-top: 12px;">
            Open Docs Folder →
          </button>
        </div>
      </div>
    `;
  },
  renderLegalReminder() { this._stubModule('Legal Reminder', 'Narrative + bankruptcy context widget. Port from V12.'); },
  renderFourGates() { this._stubModule('Four Gates Check', 'Decision framework. Port from V12.'); },
  renderOwnership() { this._stubModule('Ownership', 'APA status, ownership chain. Port from V12.'); },
  renderFamily() { this._stubModule('Family', 'Hudson + Benson + Peanut activities. Port from V12.'); },

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

// ── SARAH'S SPACE ────────────────────────────────────────────────────────────
const SARAH_MODULES = {
  renderLanding() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Sarah's Space</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <div class="jarvis-card" style="cursor: pointer; border: 2px solid var(--copper);" onclick="SARAH_MODULES.renderSarahsPlan()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2" style="color: var(--copper);">📋 Sarah's Plan</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">15-month plan: Pilates, AirBnB co-host, fitness, Booking Proof</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="SARAH_MODULES.renderHabits()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📅 Habit Tracker</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Sarah's daily habit checklist</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="SARAH_MODULES.renderMoodEnergy()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">💭 Mood / Energy Log</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Sarah's daily tracking</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="SARAH_MODULES.renderVoiceCloning()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">🎙 Voice Cloning</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">ElevenLabs voice cloning session (STUB — setup required)</p>
          </div>
        </div>

        <div class="jarvis-card" style="cursor: pointer;" onclick="SARAH_MODULES.renderResources()">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">📚 Resources</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary">Sarah's docs, links, references</p>
          </div>
        </div>
      </div>
    `;
  },

  renderSarahsPlan() { this._stubModule('Sarah\'s Plan', 'Full module with 15-month plan. Port from V12.'); },
  renderHabits() { this._stubModule('Habit Tracker (Sarah)', 'Sarah\'s daily habit checklist. Port from V12.'); },
  renderMoodEnergy() { this._stubModule('Mood / Energy Log', 'Sarah\'s daily tracking. Port from V12.'); },
  renderVoiceCloning() { this._stubModule('Voice Cloning', 'ElevenLabs voice cloning session (STUB — setup required). Port from V12.'); },
  renderResources() { this._stubModule('Resources', 'Sarah\'s docs, links, references. Port from V12.'); },

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
  module.exports = { PERSONAL_MODULES, SARAH_MODULES };
}
