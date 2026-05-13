// ═══════════════════════════════════════════════════════════════════════════
// JARVIS Forge Module
// ═══════════════════════════════════════════════════════════════════════════

window.FORGE_MODULES = {
  renderLanding() {
    document.getElementById('mainStage').innerHTML = `
      <div class="jarvis-main-content">
        <div class="jarvis-module-header">
          <h1 class="jarvis-module-title">Forge / STR</h1>
        </div>
        <div class="jarvis-card">
          <div class="jarvis-card__body">
            <p>Forge module — placeholder</p>
          </div>
        </div>
      </div>
    `;
  }
};
