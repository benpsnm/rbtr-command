// ═══════════════════════════════════════════════════════════════════════════
// JARVIS Personal Module
// ═══════════════════════════════════════════════════════════════════════════

window.PERSONAL_MODULES = {
  renderLanding() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-main-content">
        <div class="jarvis-module-header">
          <h1 class="jarvis-module-title">Personal</h1>
        </div>
        <div class="jarvis-card">
          <div class="jarvis-card__body">
            <p>Personal module — placeholder</p>
          </div>
        </div>
      </div>
    `;
  }
};

window.SARAH_MODULES = {
  renderLanding() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-main-content">
        <div class="jarvis-module-header">
          <h1 class="jarvis-module-title">Sarah's Space</h1>
        </div>
        <div class="jarvis-card">
          <div class="jarvis-card__body">
            <p>Sarah's Space module — placeholder</p>
          </div>
        </div>
      </div>
    `;
  }
};
