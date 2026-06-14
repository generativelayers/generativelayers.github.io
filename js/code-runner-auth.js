/**
 * code-runner-auth.js
 *
 * Integrates Google Sign-In (using the Google Identity Services SDK)
 * and stores the ID token in sessionStorage for iframe runner pages to access.
 */
(() => {
  'use strict';

  const CLIENT_ID = '814105936155-1p1s8p59lobkb2ugjbsrmjc9fvulsj6e.apps.googleusercontent.com';

  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  // Global callback as requested
  window.handleGoogleLogin = function(response) {
    console.log("Google credential token:", response.credential);

    // TEST ONLY: decode for display.
    // Do not treat this as secure verification.
    const payload = parseJwt(response.credential);
    if (!payload) {
      showToast('Authentication failed', 'error');
      return;
    }

    console.log("Google user:", payload);

    localStorage.setItem("gl_google_user", JSON.stringify({
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    }));

    sessionStorage.setItem('gl_user_token', response.credential);
    sessionStorage.setItem('gl_user_profile', JSON.stringify({
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    }));

    alert("Logged in as " + payload.email);
    renderAuthPanel();
  };

  function signOut() {
    localStorage.removeItem('gl_google_user');
    sessionStorage.removeItem('gl_user_token');
    sessionStorage.removeItem('gl_user_profile');
    renderAuthPanel();
    showToast('Signed out successfully', 'info');
  }

  function showToast(msg, type = 'info') {
    if (typeof window.showRunnerToast === 'function') {
      window.showRunnerToast(msg, type);
    } else {
      console.log(`[Auth] ${type}: ${msg}`);
    }
  }

  function renderAuthPanel() {
    const container = document.getElementById('glAuthPanel');
    if (!container) return;

    const token = sessionStorage.getItem('gl_user_token');
    const profileStr = sessionStorage.getItem('gl_user_profile');
    let profile = null;

    if (token && profileStr) {
      const payload = parseJwt(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        try {
          profile = JSON.parse(profileStr);
        } catch (_) {}
      } else {
        localStorage.removeItem('gl_google_user');
        sessionStorage.removeItem('gl_user_token');
        sessionStorage.removeItem('gl_user_profile');
      }
    }

    if (profile) {
      container.innerHTML = `
        <div class="gl-user-profile">
          <img class="gl-user-avatar" src="${profile.picture || '/icon/logo.png'}" alt="${profile.name}" referrerpolicy="no-referrer">
          <span class="gl-user-name" title="${profile.email}">${profile.name}</span>
          <button class="gl-btn-signout" id="glSignoutBtn" title="Sign Out">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      `;
      document.getElementById('glSignoutBtn').addEventListener('click', signOut);
    } else {
      // Dynamic insertion of Google sign-in tags
      container.innerHTML = `
        <div id="g_id_onload"
             data-client_id="${CLIENT_ID}"
             data-callback="handleGoogleLogin"
             data-auto_prompt="false">
        </div>
        <div class="g_id_signin"
             data-type="standard"
             data-size="large"
             data-theme="outline"
             data-text="signin_with"
             data-shape="rectangular"
             data-logo_alignment="left">
        </div>
      `;
      if (window.google && window.google.accounts) {
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: window.handleGoogleLogin
        });
        google.accounts.id.renderButton(
          document.getElementById('glAuthPanel'),
          { theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with', logo_alignment: 'left' }
        );
      } else {
        setTimeout(renderAuthPanel, 200);
      }
    }
  }

  // Initial render
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAuthPanel);
  } else {
    renderAuthPanel();
  }

  window.glRenderAuthPanel = renderAuthPanel;
})();
