// Phase 2.6 WS1 · client-side auth guard + portal_access gate.
// Include on every page that should require login (except /login.html and /public).
//
// Behaviour:
//   - If no session in localStorage → redirect to /login?r=<current>
//   - If session present → validates with /api/supabase-proxy {action:'auth_me'}
//     - If invalid → clear + redirect to /login
//     - If valid  → exposes window.RBTR_USER = {id, email, profile: {role, portal_access, display_name}}
//   - Dispatches CustomEvent 'rbtr-auth-ready' once resolved
//
// Portal-access gating: set <body data-portal="rbtr"> and this guard will
// 403-redirect to /403.html if the logged-in profile doesn't include that portal.

(function(){
  const LS_KEY = 'rbtr_auth';
  function raw() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch(e){ return null; } }
  function clearAll() { try { localStorage.removeItem(LS_KEY); } catch(e){} }
  function goLogin() {
    const r = encodeURIComponent(location.pathname + location.search);
    location.href = '/login.html?r=' + r;
  }

  async function bootstrap() {
    const s = raw();
    if (!s?.access_token) { goLogin(); return; }

    try {
      const r = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: {'Content-Type':'application/json', Authorization: 'Bearer ' + s.access_token},
        body: JSON.stringify({ action: 'auth_me' })
      });
      if (!r.ok) { clearAll(); goLogin(); return; }
      const j = await r.json();
      window.RBTR_USER = {
        id: j.user?.id,
        email: j.user?.email,
        profile: j.profile || null,
        access_token: s.access_token,
      };

      // Portal-access gate via <body data-portal="...">
      const requiredPortal = document.body.getAttribute('data-portal');
      if (requiredPortal) {
        const access = j.profile?.portal_access || [];
        if (!access.includes(requiredPortal)) {
          // Minimal 403 page; don't leak which portal
          document.body.innerHTML = '<div style="padding:80px;text-align:center;color:#8a8a8a;font-family:sans-serif;">'
            + '<h1 style="font-weight:400">403 · Not your portal</h1>'
            + '<p>Ask Ben to grant access if this is wrong.</p>'
            + '<a style="color:#fff" href="/">Back to landing</a></div>';
          return;
        }
      }
      document.dispatchEvent(new CustomEvent('rbtr-auth-ready', { detail: window.RBTR_USER }));
    } catch(e) {
      clearAll(); goLogin();
    }
  }

  // Expose a logout helper
  window.RBTR_logout = function() {
    clearAll();
    location.href = '/login.html';
  };

  bootstrap();
})();
