(() => {
  const STORAGE_PREFIX = 'gl-runner-payload:';

  function getLoadToken() {
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('load');
    if (queryToken) return queryToken;

    if (window.location.hash.startsWith('#load=')) {
      return decodeURIComponent(window.location.hash.slice(6));
    }

    return '';
  }

  function readPayload(token) {
    if (!token) return null;

    // New path: URL contains only a short token. The source is stored in sessionStorage.
    const storageKey = STORAGE_PREFIX + token;
    const stored = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    if (stored) {
      try {
        sessionStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey);
        return JSON.parse(stored);
      } catch (_) {
        return null;
      }
    }

    // Backwards compatibility for old long #load={...} links.
    // This is only for old links already in browser history; new links do not use this.
    if (token.trim().startsWith('{')) {
      try { return JSON.parse(token); }
      catch (_) { return null; }
    }

    return null;
  }

  function cleanAddressBar() {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState(null, '', cleanUrl);
  }

  function loadIntoRunner(payload) {
    if (!payload || !payload.source) return false;

    const editor = document.getElementById('fileEditor');
    const currentFile = document.getElementById('currentFile');
    const output = document.getElementById('runnerOutput');
    const status = document.getElementById('runnerStatus');
    const metaStatus = document.getElementById('metaStatus');
    const metaReturnCode = document.getElementById('metaReturnCode');
    const metaElapsed = document.getElementById('metaElapsed');

    if (!editor) return false;

    editor.value = payload.source;
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    if (currentFile) currentFile.textContent = '/astra/Main.astra';
    if (output) output.textContent = `Loaded: ${payload.title || 'ASTRA example'}\nCheck required API keys if the example uses an LLM provider, then press “Run Project”.`;
    if (status) status.textContent = 'Example loaded';
    if (metaStatus) metaStatus.textContent = 'Loaded';
    if (metaReturnCode) metaReturnCode.textContent = '—';
    if (metaElapsed) metaElapsed.textContent = '—';

    window.setTimeout(() => (document.getElementById('run-code') || editor).scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    return true;
  }

  function init() {
    const token = getLoadToken();
    if (!token) return;

    const payload = readPayload(token);
    if (loadIntoRunner(payload)) cleanAddressBar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
