// ═══════════════════════════════════════════════════════════════════════════
// JARVIS System Module
// ═══════════════════════════════════════════════════════════════════════════

window.SYSTEM_MODULES = {
  renderLanding() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-main-content">
        <div class="jarvis-module-header">
          <h1 class="jarvis-module-title">System</h1>
        </div>
        <div class="jarvis-card">
          <div class="jarvis-card__body">
            <p>System module — placeholder</p>
          </div>
        </div>
      </div>
    `;
  }
};
