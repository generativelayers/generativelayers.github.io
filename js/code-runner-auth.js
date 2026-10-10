/**
 * code-runner-auth.js
 *
 * Integrates Google Sign-In (using the Google Identity Services SDK)
 * and stores the ID token in localStorage and sessionStorage.
 */
(() => {
  'use strict';

  // Auth is disabled during review mode (controlled by js/review-config.js)
  const REQUIRE_LOGIN = !(window.GL_UNDER_REVIEW === true);

  const CLIENT_ID = '814105936155-1p1s8p59lobkb2ugjbsrmjc9fvulsj6e.apps.googleusercontent.com';

  // When auth is disabled, keep the panel hidden and make all auth functions no-ops
  if (!REQUIRE_LOGIN) {
    window.handleGoogleLogin = function() {};
    window.__glRefreshTokenIfNeeded = function() { return Promise.resolve(false); };
    window.glRenderAuthPanel = function() {};
    return;
  }

  // Auth is enabled — unhide the panel (starts hidden in HTML to prevent flash)
  document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('glAuthPanel');
    if (panel) panel.style.display = '';
  });

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
    const payload = parseJwt(response.credential);
    if (!payload) {
      showToast('Authentication failed', 'error');
      return;
    }

    localStorage.setItem("gl_google_user", JSON.stringify({
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    }));

    // Persist in both localStorage and sessionStorage
    localStorage.setItem('gl_user_token', response.credential);
    localStorage.setItem('gl_user_profile', JSON.stringify({
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

    renderAuthPanel();
    // Push token to runner iframes
    if (typeof window.__glPushTokenToFrames === 'function') window.__glPushTokenToFrames();
  };

  function signOut() {
    // Retrieve email before clearing storage (needed for revoke)
    let email = null;
    try {
      const profileStr = localStorage.getItem('gl_user_profile') || sessionStorage.getItem('gl_user_profile');
      if (profileStr) {
        const p = JSON.parse(profileStr);
        email = p.email;
      }
    } catch (_) {}

    localStorage.removeItem('gl_google_user');
    localStorage.removeItem('gl_user_token');
    localStorage.removeItem('gl_user_profile');
    sessionStorage.removeItem('gl_user_token');
    sessionStorage.removeItem('gl_user_profile');

    // Tell Google Identity Services to forget the session
    if (window.google && window.google.accounts && window.google.accounts.id) {
      google.accounts.id.disableAutoSelect();
      if (email) {
        google.accounts.id.revoke(email, () => {});
      }
    }

    renderAuthPanel();
    // Clear token in runner iframes
    if (typeof window.__glPushTokenToFrames === 'function') window.__glPushTokenToFrames();
    showToast('Signed out successfully', 'info');
  }

  function showToast(msg, type = 'info') {
    if (typeof window.showRunnerToast === 'function') {
      window.showRunnerToast(msg, type);
    }
  }

  // ── Concurrency guard: FedCM allows only one credentials.get at a time ──
  let _prompting = false;

  function silentTokenRefresh() {
    if (_prompting) return;
    if (!(window.google && window.google.accounts && window.google.accounts.id)) return;
    // Only attempt if the user has previously signed in
    const profile = localStorage.getItem('gl_user_profile') || sessionStorage.getItem('gl_user_profile');
    if (!profile) return;
    _prompting = true;
    try {
      google.accounts.id.prompt((notification) => {
        _prompting = false;
        // Silently ignore — user can click sign-in manually if needed
      });
    } catch (_) {
      _prompting = false;
    }
  }

  function renderAuthPanel() {
    const container = document.getElementById('glAuthPanel');
    if (!container) return;

    const token = localStorage.getItem('gl_user_token') || sessionStorage.getItem('gl_user_token');
    const profileStr = localStorage.getItem('gl_user_profile') || sessionStorage.getItem('gl_user_profile');
    let profile = null;

    if (profileStr) {
      try { profile = JSON.parse(profileStr); } catch (_) {}
    }

    if (token) {
      const payload = parseJwt(token);
      if (!payload || payload.exp * 1000 <= Date.now()) {
        // Clear the expired token but keep the profile so the user stays visually signed in
        localStorage.removeItem('gl_user_token');
        sessionStorage.removeItem('gl_user_token');
        // Try to silently get a fresh token
        silentTokenRefresh();
      }
    } else if (profile) {
      // Profile exists but no token — try silent refresh
      silentTokenRefresh();
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
      container.innerHTML = `
        <button class="gl-btn-signin" id="glSigninBtn" title="Sign in for unlimited runs and 20 min execution time">
          <i class="fa-solid fa-right-to-bracket"></i>
          <span>Login</span>
        </button>
      `;
      document.getElementById('glSigninBtn').addEventListener('click', () => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          let fallback = document.getElementById('glSigninFallback');
          if (!fallback) {
            fallback = document.createElement('div');
            fallback.id = 'glSigninFallback';
            fallback.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
            document.body.appendChild(fallback);
          }
          google.accounts.id.renderButton(fallback, {
            theme: 'outline', size: 'large', type: 'standard'
          });
          setTimeout(() => {
            const btn = fallback.querySelector('[role="button"]') || fallback.querySelector('div[style]');
            if (btn) btn.click();
          }, 100);
        }
      });
    }
  }

  // ── GIS initialization (runs exactly once) ──
  let _gisInitDone = false;
  let _monitorStarted = false;

  function initGIS() {
    if (_gisInitDone) return;
    if (!(window.google && window.google.accounts && window.google.accounts.id)) return;
    _gisInitDone = true;

    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: window.handleGoogleLogin,
      use_fedcm_for_prompt: true
    });

    renderAuthPanel();

    if (!_monitorStarted) {
      _monitorStarted = true;
      startTokenMonitor();
    }
  }

  // Periodically check JWT expiry and silently refresh before it expires
  function startTokenMonitor() {
    setInterval(() => {
      const token = localStorage.getItem('gl_user_token') || sessionStorage.getItem('gl_user_token');
      if (!token) return;
      const payload = parseJwt(token);
      if (!payload) return;
      const expiresIn = payload.exp * 1000 - Date.now();
      // Refresh 2 minutes before expiry (or if already expired)
      if (expiresIn < 120000) {
        silentTokenRefresh();
      }
    }, 30000); // Check every 30 seconds
  }

  // Exposed globally so the run handler can call it on 401
  window.__glRefreshTokenIfNeeded = function() {
    return new Promise(resolve => {
      const profile = localStorage.getItem('gl_user_profile') || sessionStorage.getItem('gl_user_profile');
      if (!profile || _prompting) { resolve(false); return; }
      if (!(window.google && window.google.accounts && window.google.accounts.id)) { resolve(false); return; }

      // Wrap callback to resolve promise on success
      const origCallback = window.handleGoogleLogin;
      window.handleGoogleLogin = function(response) {
        origCallback(response);
        resolve(true);
      };
      // Re-initialize is required by GIS when changing callback
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: window.handleGoogleLogin,
        use_fedcm_for_prompt: true
      });
      _prompting = true;
      try {
        google.accounts.id.prompt((notification) => {
          _prompting = false;
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            window.handleGoogleLogin = origCallback;
            resolve(false);
          }
        });
      } catch (_) {
        _prompting = false;
        window.handleGoogleLogin = origCallback;
        resolve(false);
      }
      // Timeout fallback
      setTimeout(() => { _prompting = false; window.handleGoogleLogin = origCallback; resolve(false); }, 5000);
    });
  };

  // ── Bootstrap: wait for GIS SDK to load, then init once ──
  function tryInit() {
    if (_gisInitDone) return;
    if (window.google && window.google.accounts && window.google.accounts.id) {
      initGIS();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryInit();
      if (!_gisInitDone) setTimeout(tryInit, 500);
      if (!_gisInitDone) setTimeout(tryInit, 1500);
    });
  } else {
    tryInit();
    if (!_gisInitDone) setTimeout(tryInit, 500);
    if (!_gisInitDone) setTimeout(tryInit, 1500);
  }

  // Render even before GIS loads (shows Login button)
  if (!_gisInitDone) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderAuthPanel);
    } else {
      renderAuthPanel();
    }
  }

  window.glRenderAuthPanel = renderAuthPanel;
})();
