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

  // ── HABIT TRACKER ──────────────────────────────────────────────────────────
  renderHabits() {
    const today = new Date().toLocaleDateString('en-GB');

    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Habit Tracker</h1>
        <div class="jarvis-module-actions">
          <span class="text-small text-secondary">${today}</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Today's Streak</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Days completed</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Completion Rate (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0%</div>
            <p class="text-small text-tertiary">Avg. daily completion</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Longest Streak</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Personal best</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Today's Status</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0/8</div>
            <p class="text-small text-tertiary">Habits complete</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Daily Habits</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Training Session</h4>
                <p class="text-tiny text-tertiary">1h minimum — gym or home workout</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Protein Target</h4>
                <p class="text-tiny text-tertiary">180g minimum daily</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Build Work</h4>
                <p class="text-tiny text-tertiary">Truck progress or admin (30 min min)</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Content Creation</h4>
                <p class="text-tiny text-tertiary">Film, edit, or post (any platform)</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Family Time</h4>
                <p class="text-tiny text-tertiary">1h quality time (Hudson, Benson, Sarah, Peanut)</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">7+ Hours Sleep</h4>
                <p class="text-tiny text-tertiary">Sleep tracker or manual log</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">No Alcohol</h4>
                <p class="text-tiny text-tertiary">Zero units</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Morning Reflection</h4>
                <p class="text-tiny text-tertiary">5 min journal or voice memo</p>
              </div>
            </label>
          </div>

          <p class="text-tiny text-tertiary" style="margin-top: 16px; color: var(--copper);">
            Wire to rbtr_habits table. Track daily completion, streak logic, 30-day rolling average.
          </p>
        </div>
      </div>
    `;
  },

  // ── WELLNESS ───────────────────────────────────────────────────────────────
  async renderWellness() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Wellness</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Weight</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—kg</div>
            <p class="text-small text-tertiary">Current weight</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Sleep</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—h</div>
            <p class="text-small text-tertiary">Last 7 days</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Workouts (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—</div>
            <p class="text-small text-tertiary">Training sessions</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Mood/Energy</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—/10</div>
            <p class="text-small text-tertiary">Today's rating</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Wellness Categories</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Training</h4>
              <p class="text-tiny text-tertiary">Strength training 4x/week, cardio 2x/week, recovery protocols</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Nutrition</h4>
              <p class="text-tiny text-tertiary">180g protein daily, calorie target, macro tracking</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Sleep</h4>
              <p class="text-tiny text-tertiary">7-8h target, sleep tracker, quality score, bedtime routine</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Supplements</h4>
              <p class="text-tiny text-tertiary">Daily stack: protein, creatine, omega-3, vitamin D, multivitamin</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Bloods</h4>
              <p class="text-tiny text-tertiary">Quarterly blood panel: testosterone, vitamin levels, liver function</p>
            </div>
          </div>

          <p class="text-tiny text-tertiary" style="margin-top: 16px; color: var(--copper);">
            Wire to rbtr_wellness_daily table. Track weight, sleep, mood, energy, training sessions.
          </p>
        </div>
      </div>
    `;
  },

  // ── NOTES VAULT ────────────────────────────────────────────────────────────
  renderNotes() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Notes Vault</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="PERSONAL_MODULES.newNote()">
            + New Note
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Total Notes</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Quick notes saved</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Voice Memos</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Transcribed via Claude</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Tags</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Categories created</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Last Week</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">New notes added</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Recent Notes</h3>
          <div style="display: flex; gap: 12px; align-items: center; margin-top: 12px;">
            <input type="text" class="jarvis-input" placeholder="Search notes..." style="width: 240px;" />
            <select class="jarvis-input" style="width: 160px;">
              <option value="">All tags</option>
              <option value="build">Build</option>
              <option value="content">Content</option>
              <option value="personal">Personal</option>
              <option value="ideas">Ideas</option>
            </select>
          </div>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">No notes yet. Create your first note above.</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Voice memos automatically transcribed via Claude API. Store quick thoughts, build ideas, content plans, personal reflections.
          </p>
        </div>
      </div>
    `;
  },

  newNote() {
    JARVIS.Toast({ message: 'Note creation form coming soon', duration: 2000 });
  },

  // ── PLANNER ────────────────────────────────────────────────────────────────
  renderPlanner() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Planner</h1>
        <div class="jarvis-module-actions">
          <div class="jarvis-tabs" id="planner-view-tabs">
            <button class="jarvis-tab jarvis-tab--active" data-tab="daily" onclick="PERSONAL_MODULES.setPlannerView('daily')">Daily</button>
            <button class="jarvis-tab" data-tab="weekly" onclick="PERSONAL_MODULES.setPlannerView('weekly')">Weekly</button>
            <button class="jarvis-tab" data-tab="monthly" onclick="PERSONAL_MODULES.setPlannerView('monthly')">Monthly</button>
            <button class="jarvis-tab" data-tab="yearly" onclick="PERSONAL_MODULES.setPlannerView('yearly')">Yearly</button>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Daily View</h3>
          <span class="text-small text-secondary">${new Date().toLocaleDateString('en-GB')}</span>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 16px;">
            Day planner with hourly blocks, tasks from rbtr_tasks, calendar events, habit tracker integration.
          </p>

          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">06:00 - Morning Routine</h4>
              <p class="text-tiny text-tertiary">Wake, coffee, morning reflection, review today's plan</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">07:00 - Training</h4>
              <p class="text-tiny text-tertiary">Gym session or home workout</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">09:00 - PSNM Work</h4>
              <p class="text-tiny text-tertiary">Customer calls, quote generation, Atlas drafts</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">14:00 - Build Work</h4>
              <p class="text-tiny text-tertiary">Truck fabrication or admin tasks</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">18:00 - Family Time</h4>
              <p class="text-tiny text-tertiary">Dinner, Hudson/Benson activities, dog walk</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">21:00 - Evening Wind-Down</h4>
              <p class="text-tiny text-tertiary">Content editing, reading, plan tomorrow</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  plannerView: 'daily',

  setPlannerView(view) {
    this.plannerView = view;
    document.querySelectorAll('#planner-view-tabs .jarvis-tab').forEach(btn => {
      btn.classList.toggle('jarvis-tab--active', btn.dataset.tab === view);
    });
    JARVIS.Toast({ message: `${view.charAt(0).toUpperCase() + view.slice(1)} view coming soon`, duration: 2000 });
  },

  // ── SHARED CALENDAR ────────────────────────────────────────────────────────
  renderCalendar() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Shared Calendar</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="PERSONAL_MODULES.newCalendarEvent()">
            + New Event
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Today's Events</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Scheduled events</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">This Week</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Upcoming events</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Ben's Events</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">This month</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Sarah's Events</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">This month</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Month View</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Shared family calendar: Ben's work schedule, Sarah's Pilates + AirBnB bookings, Hudson + Benson school activities, vet appointments, etc.</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px; color: var(--copper);">
            Wire to Google Calendar API. Sync Ben + Sarah calendars, display merged view, color-coded by person.
          </p>

          <div style="background: var(--surface-deep); height: 300px; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-top: 16px;">
            <p class="text-small text-tertiary">Calendar grid coming soon — month view with day cells, event markers</p>
          </div>
        </div>
      </div>
    `;
  },

  newCalendarEvent() {
    JARVIS.Toast({ message: 'Calendar event form coming soon — wire to Google Calendar API', duration: 2000 });
  },

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────────
  renderNotifications() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Notifications</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="PERSONAL_MODULES.markAllRead()">
            Mark All Read
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Unread</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">New notifications</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Today</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Received today</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">High Priority</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Needs attention</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Archived</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Last 30 days</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Notification Types</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">System Alerts</h4>
              <p class="text-tiny text-tertiary">Cron failures, API errors, backup alerts</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Task Reminders</h4>
              <p class="text-tiny text-tertiary">Due date approaching, blocked tasks unblocked</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Business Updates</h4>
              <p class="text-tiny text-tertiary">New PSNM enquiry, Booking Proof signup, Forge booking</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Content Notifications</h4>
              <p class="text-tiny text-tertiary">YouTube comment, Patreon message, sponsor reply</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Calendar Events</h4>
              <p class="text-tiny text-tertiary">15-min reminder before scheduled event</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Recent Notifications</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">No notifications yet.</p>
        </div>
      </div>
    `;
  },

  markAllRead() {
    JARVIS.Toast({ message: 'All notifications marked as read', duration: 2000 });
  },
  renderBankruptcyWorkbook() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Bankruptcy Workbook</h1>
      </div>

      <div class="jarvis-card" style="border: 2px solid var(--copper); margin-bottom: 32px;">
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">
            <strong style="color: var(--copper);">BANKRUPTCY CONFIRMED 11 MAY 2026</strong> — PSNM + Eternal Kustoms in scope. Sarah's STR business (Forge + Booking Proof) kept separate. Conversation with Sarah due 15 May 2026 (see rbtr_tasks).
          </p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Documentation</h3>
          </div>
          <div class="jarvis-card__body">
            <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('file:///Users/bengreenwood/Documents/RBTR-Brain/03-Resources/Personal-Bankruptcy/', '_blank')" style="width: 100%;">
              Open Bankruptcy Docs Folder →
            </button>
            <p class="text-tiny text-tertiary" style="margin-top: 8px;">
              Contains: IVA paperwork, creditor list, asset declarations, legal correspondence
            </p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Three-Gate Check</h3>
          </div>
          <div class="jarvis-card__body">
            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
              <li class="text-small">✓ Asset separation gate</li>
              <li class="text-small">✓ Bankruptcy positioning gate</li>
              <li class="text-small">✓ Sarah's load gate</li>
            </ul>
            <p class="text-tiny text-tertiary" style="margin-top: 8px;">
              All agents run this check before any action affecting Ben or Sarah's businesses
            </p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Asset Ownership</h3>
          </div>
          <div class="jarvis-card__body">
            <div style="display: grid; gap: 8px;">
              <div style="padding: 8px; background: var(--surface-deep); border-radius: 4px;">
                <h4 class="text-tiny font-weight-600">Ben (In Scope)</h4>
                <p class="text-tiny text-tertiary">PSNM, Eternal Kustoms</p>
              </div>
              <div style="padding: 8px; background: var(--surface-deep); border-radius: 4px;">
                <h4 class="text-tiny font-weight-600">Sarah (Protected)</h4>
                <p class="text-tiny text-tertiary">Forge STR, Booking Proof SaaS, all AirBnB assets</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Key Dates</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Bankruptcy confirmed</span>
              <span class="font-mono text-small" style="color: var(--copper);">11 May 2026</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">Sarah conversation due</span>
              <span class="font-mono text-small" style="color: var(--copper);">15 May 2026</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <span class="text-small">RBTR departure</span>
              <span class="font-mono text-small" style="color: var(--copper);">1 Jul 2027</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── LEGAL REMINDER ─────────────────────────────────────────────────────────
  renderLegalReminder() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Legal Reminder</h1>
      </div>

      <div class="jarvis-card" style="border: 2px solid var(--copper);">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Narrative + Bankruptcy Context</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 16px;">
            <strong>Context widget for every session:</strong> Ben is going through personal bankruptcy (confirmed 11 May 2026). All decisions must pass three-gate check (asset separation, bankruptcy positioning, Sarah's load).
          </p>

          <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px; margin-bottom: 16px;">
            <h4 class="text-small font-weight-600" style="margin-bottom: 8px;">Bankruptcy-Aware Rule (LOCKED)</h4>
            <p class="text-tiny text-tertiary" style="line-height: 1.6;">
              <strong>Asset separation gate:</strong> Does this create paper trail suggesting Ben operates Sarah's assets? Route through Sarah's identity.<br><br>
              <strong>Bankruptcy positioning gate:</strong> Does this affect Ben's bankruptcy positioning? Stop and surface to Ben.<br><br>
              <strong>Sarah's load gate:</strong> Does this add operational load to Sarah? Redesign for single-click.<br><br>
              <strong>Sarah's STR business (Forge + Booking Proof):</strong> Sarah's in every dimension — director, shareholder, bank signatory, platform account holder, insurance named party, operator. Ben advises only.<br><br>
              <strong>PSNM + Eternal Kustoms:</strong> Ben's businesses, in scope for bankruptcy. Conversation with Sarah due 15 May 2026 (see rbtr_tasks).
            </p>
          </div>

          <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
            <h4 class="text-small font-weight-600" style="margin-bottom: 8px;">This Widget Appears On:</h4>
            <p class="text-tiny text-tertiary">Every JARVIS session start, every Claude Code prompt, every major decision point. Collapsible after read, but always visible.</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Legal Documents Access</h3>
        </div>
        <div class="jarvis-card__body">
          <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('file:///Users/bengreenwood/Documents/RBTR-Brain/03-Resources/Personal-Bankruptcy/', '_blank')" style="width: 100%;">
            Open Bankruptcy Docs →
          </button>
        </div>
      </div>
    `;
  },

  // ── FOUR GATES CHECK ───────────────────────────────────────────────────────
  renderFourGates() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Four Gates Check</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Decision Framework</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 16px;">
            Before any major decision (business pivot, large purchase, time commitment, relationship change), run through four gates:
          </p>

          <div style="display: grid; gap: 16px;">
            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px; border-left: 4px solid var(--copper);">
              <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 8px;">Gate 1: Alignment</h4>
              <p class="text-small text-secondary" style="margin-bottom: 8px;">Does this align with RBTR mission (July 1 2027 departure, 5-year expedition)?</p>
              <p class="text-tiny text-tertiary">Ask: Does this get us closer to departure or distract from it? Does it serve the expedition or delay it?</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px; border-left: 4px solid var(--copper);">
              <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 8px;">Gate 2: Resources</h4>
              <p class="text-small text-secondary" style="margin-bottom: 8px;">Can we afford this (time, money, energy) without compromising build progress?</p>
              <p class="text-tiny text-tertiary">Ask: What's the true cost? What do we sacrifice to do this? Is there a cheaper/faster way?</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px; border-left: 4px solid var(--copper);">
              <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 8px;">Gate 3: Family</h4>
              <p class="text-small text-secondary" style="margin-bottom: 8px;">Does Sarah agree? Does this work for Hudson + Benson?</p>
              <p class="text-tiny text-tertiary">Ask: Have I consulted Sarah properly? Are the kids on board? Does this add stress to the family unit?</p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px; border-left: 4px solid var(--copper);">
              <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 8px;">Gate 4: Reversibility</h4>
              <p class="text-small text-secondary" style="margin-bottom: 8px;">Can we undo this if it goes wrong? What's the exit cost?</p>
              <p class="text-tiny text-tertiary">Ask: If this fails, how bad is the downside? Can we walk away? Are we locked in?</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Decision Log</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-tertiary">Log major decisions with four-gate analysis. Track outcomes, learn from wins/failures.</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px;">
            Examples: Camera gear phased purchase (passed all 4), early sponsor outreach (failed Gate 2 — too early, deferred to Q4 2026), Booking Proof build (passed — Sarah's SaaS, aligned with RBTR timeline)
          </p>
        </div>
      </div>
    `;
  },

  // ── OWNERSHIP ──────────────────────────────────────────────────────────────
  renderOwnership() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Ownership</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Asset Protection Agreement (APA) Status</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 16px;">
            Post-bankruptcy asset ownership chain. Sarah owns all STR business + Booking Proof IP. Ben advises but does not operate.
          </p>

          <div style="display: grid; gap: 12px;">
            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px; border: 2px solid var(--copper);">
              <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 8px; color: var(--copper);">Sarah Jane Jones (Protected)</h4>
              <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
                <li class="text-small">✓ Forge STR business (4 Woodhead Mews AirBnB)</li>
                <li class="text-small">✓ Booking Proof SaaS (founder, sole director)</li>
                <li class="text-small">✓ All STR Ltd company shares (when formed)</li>
                <li class="text-small">✓ Bank account signatory (sole)</li>
                <li class="text-small">✓ Platform accounts (AirBnB, VRBO — in Sarah's name)</li>
                <li class="text-small">✓ Insurance named party</li>
              </ul>
              <p class="text-tiny text-tertiary" style="margin-top: 12px;">
                <strong>Ben's role:</strong> Advisor only. No operational control, no signatory rights, no ownership paper trail.
              </p>
            </div>

            <div style="padding: 16px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="font-display text-h2" style="font-size: 16px; margin-bottom: 8px;">Ben Greenwood (Bankruptcy Scope)</h4>
              <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
                <li class="text-small">✓ Pallet Storage Near Me (PSNM) — in bankruptcy scope</li>
                <li class="text-small">✓ Eternal Kustoms — in bankruptcy scope</li>
                <li class="text-small">✓ RBTR expedition — personal project (YouTube revenue post-departure not in scope)</li>
              </ul>
              <p class="text-tiny text-tertiary" style="margin-top: 12px;">
                <strong>Status:</strong> Conversation with Sarah due 15 May 2026 (see rbtr_tasks). Agree PSNM + EK wind-down or continuation plan.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Ownership Chain Verification</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Before any business action, verify ownership chain:</p>
          <div style="display: grid; gap: 8px; margin-top: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <p class="text-small">1. Who legally owns this asset?</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <p class="text-small">2. Who is the bank signatory?</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <p class="text-small">3. Who appears on platform accounts / insurance / contracts?</p>
            </div>
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <p class="text-small">4. Does this action create a paper trail suggesting Ben operates Sarah's asset?</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── FAMILY ─────────────────────────────────────────────────────────────────
  renderFamily() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Family</h1>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Hudson (10 years old)</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary" style="margin-bottom: 12px;">Oldest son, homeschooled, on-camera talent for RBTR content</p>

            <div style="display: grid; gap: 8px;">
              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Interests</h4>
              <p class="text-tiny text-tertiary">Photography, gaming, geography, science experiments</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Homeschool Focus</h4>
              <p class="text-tiny text-tertiary">Math, English, geography (45-country route study), Spanish</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">RBTR Role</h4>
              <p class="text-tiny text-tertiary">Kid's-eye-view photography, on-camera vlogs, cultural immersion ambassador</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Activities</h4>
              <p class="text-tiny text-tertiary">Football, swimming, gaming with friends, YouTube Kids</p>
            </div>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Benson (8 years old)</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary" style="margin-bottom: 12px;">Youngest son, homeschooled, RBTR on-camera talent</p>

            <div style="display: grid; gap: 8px;">
              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Interests</h4>
              <p class="text-tiny text-tertiary">Animals, building (Lego), outdoor adventures, dog training</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Homeschool Focus</h4>
              <p class="text-tiny text-tertiary">Reading, math, science (hands-on projects), Spanish basics</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">RBTR Role</h4>
              <p class="text-tiny text-tertiary">Animal spotter, campsite helper, daily chores (water fill, dog care)</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Activities</h4>
              <p class="text-tiny text-tertiary">Football, dog walks with Peanut, Lego building, family movie nights</p>
            </div>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Peanut (Dog)</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary" style="margin-bottom: 12px;">Family dog, expedition mascot, Instagram appeal gold</p>

            <div style="display: grid; gap: 8px;">
              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Breed</h4>
              <p class="text-tiny text-tertiary">Mixed breed (rescue), medium-sized, travel-friendly</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">RBTR Role</h4>
              <p class="text-tiny text-tertiary">Morale officer, campsite security, content gold (dog + truck shots)</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Daily Routine</h4>
              <p class="text-tiny text-tertiary">2x walks (morning + evening), feeding 2x daily, playtime with Hudson + Benson</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Travel Prep</h4>
              <p class="text-tiny text-tertiary">Vaccinations (rabies, distemper, parvo), microchip, pet passport, border crossing documents</p>
            </div>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Sarah (Wife)</h3>
          </div>
          <div class="jarvis-card__body">
            <p class="text-small text-secondary" style="margin-bottom: 12px;">Partner, homeschool lead, Booking Proof founder, Forge STR operator</p>

            <div style="display: grid; gap: 8px;">
              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Businesses</h4>
              <p class="text-tiny text-tertiary">Forge STR (4 Woodhead Mews AirBnB), Booking Proof SaaS (founder)</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">RBTR Role</h4>
              <p class="text-tiny text-tertiary">Homeschool lead, meal planning, family logistics, Patreon community, merch design</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Personal Goals (15-month plan)</h4>
              <p class="text-tiny text-tertiary">Pilates instructor cert, AirBnB co-host (with Ben), fitness journey, Booking Proof launch</p>

              <h4 class="text-tiny font-weight-600" style="margin-top: 8px;">Dedicated Module</h4>
              <p class="text-tiny text-tertiary">See "Sarah's Space" section for full dedicated modules (Plan, Habits, Mood/Energy, Voice Cloning, Resources)</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Family Calendar Sync</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Wire to Shared Calendar module. Track Hudson + Benson school activities, vet appointments (Peanut), Sarah's Pilates classes, family events.</p>
          <button class="jarvis-btn jarvis-btn--secondary jarvis-btn--sm" onclick="PERSONAL_MODULES.renderCalendar()" style="margin-top: 12px;">
            View Family Calendar →
          </button>
        </div>
      </div>
    `;
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

  // ── SARAH'S PLAN ───────────────────────────────────────────────────────────
  renderSarahsPlan() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Sarah's 15-Month Plan</h1>
        <div class="jarvis-module-actions">
          <span class="text-small text-secondary">May 2026 → Jul 2027</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Pilates</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">40%</div>
            <p class="text-small text-tertiary">Instructor cert progress</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">AirBnB</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">Live</div>
            <p class="text-small text-tertiary">4 Woodhead Mews (co-host)</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Fitness</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">On Track</div>
            <p class="text-small text-tertiary">Personal journey</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Booking Proof</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">Q3 2026</div>
            <p class="text-small text-tertiary">SaaS launch target</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">15-Month Timeline</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">May-Jun 2026: Pilates Cert Foundation</h4>
                <span class="jarvis-pill jarvis-pill--live font-mono text-pill">In Progress</span>
              </div>
              <p class="text-tiny text-tertiary">Complete online modules, attend in-person weekend workshop (Sheffield), practice teaching 2x/week</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Jul-Sep 2026: AirBnB Co-Host Role</h4>
                <span class="jarvis-pill jarvis-pill--live font-mono text-pill">Active</span>
              </div>
              <p class="text-tiny text-tertiary">Manage bookings, guest comms, cleaner coordination (with Ben). Revenue target: £4k/mo gross</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Jul-Sep 2026: Booking Proof MVP</h4>
                <span class="jarvis-pill font-mono text-pill">Pending</span>
              </div>
              <p class="text-tiny text-tertiary">Launch beta with 5 founding hosts, test AI damage detection, iterate on cleaner app UX</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Oct-Dec 2026: Fitness Focus</h4>
                <span class="jarvis-pill font-mono text-pill">Planned</span>
              </div>
              <p class="text-tiny text-tertiary">3x gym sessions/week, nutrition plan, visible progress for on-camera RBTR content</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Jan-Mar 2027: Pilates Cert Final</h4>
                <span class="jarvis-pill font-mono text-pill">Planned</span>
              </div>
              <p class="text-tiny text-tertiary">Complete assessment, receive instructor certification, teach 1-2 classes/week</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <h4 class="text-small font-weight-600">Apr-Jul 2027: RBTR Pre-Departure Sprint</h4>
                <span class="jarvis-pill font-mono text-pill">Planned</span>
              </div>
              <p class="text-tiny text-tertiary">Handover Booking Proof ops to virtual assistant, finalize homeschool curriculum for road, pack truck</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Sarah's Business Ownership</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 12px;">
            All STR + SaaS assets in Sarah's name (bankruptcy protection). Ben advises, Sarah operates + owns.
          </p>
          <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
            <li class="text-small">✓ Forge STR (4 Woodhead Mews) — Sarah sole director when Ltd formed</li>
            <li class="text-small">✓ Booking Proof SaaS — Sarah founder, sole shareholder</li>
            <li class="text-small">✓ Bank accounts — Sarah sole signatory</li>
            <li class="text-small">✓ Platform accounts (AirBnB, VRBO) — Sarah's name</li>
            <li class="text-small">✓ Insurance — Sarah named party</li>
          </ul>
        </div>
      </div>
    `;
  },

  // ── SARAH'S HABIT TRACKER ──────────────────────────────────────────────────
  renderHabits() {
    const today = new Date().toLocaleDateString('en-GB');

    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Sarah's Habit Tracker</h1>
        <div class="jarvis-module-actions">
          <span class="text-small text-secondary">${today}</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Today's Streak</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Days completed</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Completion Rate (30d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0%</div>
            <p class="text-small text-tertiary">Avg. daily completion</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Longest Streak</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0</div>
            <p class="text-small text-tertiary">Personal best</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Today's Status</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">0/7</div>
            <p class="text-small text-tertiary">Habits complete</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Daily Habits</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Pilates Practice</h4>
                <p class="text-tiny text-tertiary">30 min session or teaching practice</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Gym / Fitness</h4>
                <p class="text-tiny text-tertiary">3x weekly minimum</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Homeschooling (Hudson + Benson)</h4>
                <p class="text-tiny text-tertiary">2h structured learning daily</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">AirBnB Check</h4>
                <p class="text-tiny text-tertiary">Guest messages, booking confirmations, cleaner coordination</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Booking Proof Admin</h4>
                <p class="text-tiny text-tertiary">Check customer messages, monitor claims queue</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Family Time</h4>
                <p class="text-tiny text-tertiary">1h quality time with Hudson, Benson, Peanut</p>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <input type="checkbox" style="width: 20px; height: 20px;" />
              <div style="flex: 1;">
                <h4 class="text-small font-weight-600">Personal Time</h4>
                <p class="text-tiny text-tertiary">30 min reading, journaling, or self-care</p>
              </div>
            </label>
          </div>

          <p class="text-tiny text-tertiary" style="margin-top: 16px; color: var(--copper);">
            Wire to rbtr_habits table (sarah_habits). Track daily completion, streak logic, 30-day rolling average.
          </p>
        </div>
      </div>
    `;
  },

  // ── SARAH'S MOOD / ENERGY LOG ──────────────────────────────────────────────
  renderMoodEnergy() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Sarah's Mood / Energy Log</h1>
        <div class="jarvis-module-actions">
          <button class="jarvis-btn jarvis-btn--primary jarvis-btn--sm" onclick="SARAH_MODULES.logMoodToday()">
            Log Today
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Today's Mood</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—/10</div>
            <p class="text-small text-tertiary">Not yet logged</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Today's Energy</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—/10</div>
            <p class="text-small text-tertiary">Not yet logged</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Mood (7d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—</div>
            <p class="text-small text-tertiary">Last week avg.</p>
          </div>
        </div>

        <div class="jarvis-card">
          <div class="jarvis-card__header">
            <h3 class="font-display text-h2">Avg. Energy (7d)</h3>
          </div>
          <div class="jarvis-card__body">
            <div class="cockpit-money-value" style="color: var(--copper);">—</div>
            <p class="text-small text-tertiary">Last week avg.</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">30-Day Trend</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">Track daily mood + energy levels (1-10 scale). Identify patterns, correlate with stress/sleep/workload.</p>
          <p class="text-tiny text-tertiary" style="margin-top: 8px; color: var(--copper);">
            Wire to rbtr_wellness_daily table (sarah_mood, sarah_energy columns). Display line graph showing 30-day trend.
          </p>

          <div style="background: var(--surface-deep); height: 200px; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-top: 16px;">
            <p class="text-small text-tertiary">Line graph coming soon — mood (blue line) + energy (copper line) over 30 days</p>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Mood / Energy Factors</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Sleep Quality</h4>
              <p class="text-tiny text-tertiary">Track correlation between sleep hours + mood/energy next day</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Stress Levels</h4>
              <p class="text-tiny text-tertiary">AirBnB guest issues, Booking Proof support tickets, homeschool challenges</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Exercise</h4>
              <p class="text-tiny text-tertiary">Gym days correlate with higher energy scores</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Family Time</h4>
              <p class="text-tiny text-tertiary">Quality time with Ben, Hudson, Benson boosts mood</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  logMoodToday() {
    JARVIS.Toast({ message: 'Mood/energy log form coming soon — wire to rbtr_wellness_daily', duration: 2000 });
  },

  // ── VOICE CLONING ──────────────────────────────────────────────────────────
  renderVoiceCloning() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Voice Cloning (ElevenLabs)</h1>
      </div>

      <div class="jarvis-card" style="border: 2px solid var(--copper); margin-bottom: 32px;">
        <div class="jarvis-card__body">
          <p class="text-small text-secondary">
            <strong style="color: var(--copper);">SETUP REQUIRED</strong> — Ben needs to configure ElevenLabs API integration before Sarah can create voice clone. See ~/Documents/RBTR-Brain/00-Inbox/ for setup instructions.
          </p>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">ElevenLabs Voice Cloning</h3>
        </div>
        <div class="jarvis-card__body">
          <p class="text-small text-secondary" style="margin-bottom: 16px;">
            Clone Sarah's voice for automated voiceovers in RBTR content (e.g., Sarah reading blog post intros, narrating family updates).
          </p>

          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Step 1: Record Voice Sample</h4>
              <p class="text-tiny text-tertiary">Sarah reads 3-5 min script in quiet room, clear enunciation, natural tone</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Step 2: Upload to ElevenLabs</h4>
              <p class="text-tiny text-tertiary">Create voice clone via ElevenLabs dashboard, train model (~10 min processing)</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Step 3: Test & Refine</h4>
              <p class="text-tiny text-tertiary">Generate test audio clips, adjust pitch/speed/clarity settings</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Step 4: Integrate with RBTR Workflow</h4>
              <p class="text-tiny text-tertiary">Use Sarah's voice clone for blog narration, family updates, Patreon intros</p>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Use Cases</h3>
        </div>
        <div class="jarvis-card__body">
          <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
            <li class="text-small">✓ Blog post narration (Forge SEO content)</li>
            <li class="text-small">✓ Patreon monthly update intros</li>
            <li class="text-small">✓ Family vlog voice-overs when Sarah off-camera</li>
            <li class="text-small">✓ Booking Proof marketing videos</li>
            <li class="text-small">✓ Automated guest comms (AirBnB welcome messages)</li>
          </ul>
        </div>
      </div>
    `;
  },

  // ── SARAH'S RESOURCES ──────────────────────────────────────────────────────
  renderResources() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-module-header">
        <h1 class="jarvis-module-title">Sarah's Resources</h1>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Quick Links</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('https://www.airbnb.com/hosting', '_blank')" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-small">AirBnB Host Dashboard</span>
              <span class="text-tiny text-tertiary">4 Woodhead Mews</span>
            </button>

            <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('https://www.vrbo.com/owner', '_blank')" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-small">VRBO Owner Dashboard</span>
              <span class="text-tiny text-tertiary">Booking sync</span>
            </button>

            <button class="jarvis-btn jarvis-btn--secondary" onclick="BOOKING_PROOF.render()" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-small">Booking Proof Admin</span>
              <span class="text-tiny text-tertiary">Founder dashboard</span>
            </button>

            <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('https://www.pilates-studio-example.com', '_blank')" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-small">Pilates Certification Portal</span>
              <span class="text-tiny text-tertiary">Online learning</span>
            </button>

            <button class="jarvis-btn jarvis-btn--secondary" onclick="window.open('https://calendar.google.com', '_blank')" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-small">Family Calendar</span>
              <span class="text-tiny text-tertiary">Ben + Sarah + kids</span>
            </button>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Documents</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Sarah's 15-Month Plan</h4>
              <p class="text-tiny text-tertiary">Pilates cert timeline, AirBnB co-host ramp, Booking Proof launch, fitness goals</p>
              <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="SARAH_MODULES.renderSarahsPlan()" style="margin-top: 8px;">
                View Plan →
              </button>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Homeschool Curriculum</h4>
              <p class="text-tiny text-tertiary">Hudson + Benson lesson plans, resources, progress tracking</p>
              <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="window.open('file:///Users/bengreenwood/Documents/RBTR-Brain/03-Resources/Homeschool/', '_blank')" style="margin-top: 8px;">
                Open Folder →
              </button>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Forge STR Business Docs</h4>
              <p class="text-tiny text-tertiary">Insurance certificates, safety compliance, guest house manual</p>
              <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="window.open('file:///Users/bengreenwood/Documents/RBTR-Brain/03-Resources/Forge-STR/', '_blank')" style="margin-top: 8px;">
                Open Folder →
              </button>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Booking Proof Product Docs</h4>
              <p class="text-tiny text-tertiary">Founder pitch deck, pricing strategy, AI detection spec, cleaner app wireframes</p>
              <button class="jarvis-btn jarvis-btn--ghost jarvis-btn--sm" onclick="window.open('file:///Users/bengreenwood/Documents/RBTR-Brain/03-Resources/Booking-Proof/', '_blank')" style="margin-top: 8px;">
                Open Folder →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="jarvis-card">
        <div class="jarvis-card__header">
          <h3 class="font-display text-h2">Support Resources</h3>
        </div>
        <div class="jarvis-card__body">
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">AirBnB Host Community</h4>
              <p class="text-tiny text-tertiary">Local host meetups (Sheffield/Rotherham), online forums, best practice guides</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Pilates Teacher Network</h4>
              <p class="text-tiny text-tertiary">Instructor community, teaching resources, CPD courses</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">SaaS Founder Resources</h4>
              <p class="text-tiny text-tertiary">Indie Hackers, Product Hunt, pricing calculators, launch checklists</p>
            </div>

            <div style="padding: 12px; background: var(--surface-deep); border-radius: 6px;">
              <h4 class="text-small font-weight-600" style="margin-bottom: 4px;">Homeschool Support Groups</h4>
              <p class="text-tiny text-tertiary">Local homeschool groups (Yorkshire), online curriculum forums, activity ideas</p>
            </div>
          </div>
        </div>
      </div>
    `;
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
  module.exports = { PERSONAL_MODULES, SARAH_MODULES };
}
