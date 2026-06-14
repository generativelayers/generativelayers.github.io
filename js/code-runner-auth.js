/**
 * code-runner-auth.js
 *
 * Integrates Google Sign-In (using the Google Identity Services SDK)
 * and stores the ID token in sessionStorage for iframe runner pages to access.
 */
(() => {
  'use strict';

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

  function handleCredentialResponse(response) {
    const token = response.credential;
    const payload = parseJwt(token);
    if (payload) {
      sessionStorage.setItem('gl_user_token', token);
      sessionStorage.setItem('gl_user_profile', JSON.stringify({
        name: payload.name,
        email: payload.email,
        picture: payload.picture
      }));
      renderAuthPanel();
      showToast(`Signed in as ${payload.name}`, 'success');
    } else {
      showToast('Authentication failed', 'error');
    }
  }

  function signOut() {
    sessionStorage.removeItem('gl_user_token');
    sessionStorage.removeItem('gl_user_profile');
    renderAuthPanel();
    showToast('Signed out successfully', 'info');
  }

  function showToast(msg, type = 'info') {
    if (typeof window.showRunnerToast === 'function') {
      window.showRunnerToast(msg, type);
    } else {
      // Fallback if toast utility is not available on top window
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
      container.innerHTML = '<div id="googleSignInButton"></div>';
      if (window.google && window.google.accounts) {
        google.accounts.id.initialize({
          client_id: window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
          callback: handleCredentialResponse
        });
        google.accounts.id.renderButton(
          document.getElementById('googleSignInButton'),
          { theme: 'outline', size: 'medium', shape: 'pill' }
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
