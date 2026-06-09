(() => {
  const RUN_URL = 'https://code.generativelayers.com/api/run-astra';
  const CANCEL_URL = 'https://code.generativelayers.com/api/cancel-astra';

  let activeController = null;
  let activeRunId = null;
  let stopRequested = false;
  const nativeFetch = window.fetch.bind(window);

  function button() {
    return document.getElementById('runAstraButton');
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function output(value) {
    const el = document.getElementById('runnerOutput');
    if (el) el.textContent = value;
  }

  function makeRunId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'run-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function isRunRequest(resource) {
    const url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
    return url === RUN_URL || url.endsWith('/api/run-astra');
  }

  function addStyle() {
    if (document.getElementById('gl-runner-stop-style')) return;
    const style = document.createElement('style');
    style.id = 'gl-runner-stop-style';
    style.textContent = `
      #runAstraButton.runner-stop-mode {
        background: #dc2626 !important;
        color: #fff !important;
        opacity: 1 !important;
        cursor: pointer !important;
      }
      #runAstraButton.runner-stop-mode:hover {
        background: #b91c1c !important;
      }
    `;
    document.head.appendChild(style);
  }

  function setStopButton() {
    const btn = button();
    if (!btn || !activeController) return;
    btn.disabled = false;
    btn.classList.add('runner-stop-mode');
    btn.innerHTML = '<i class="fa-solid fa-stop"></i><span>STOP</span>';
    btn.title = 'Stop current execution';
  }

  function setRunButton() {
    const btn = button();
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('runner-stop-mode');
    btn.innerHTML = '<i class="fa-solid fa-play"></i><span>Run Project</span>';
    btn.title = '';
  }

  async function notifyCancel(runId) {
    if (!runId) return;
    try {
      await nativeFetch(CANCEL_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId })
      });
    } catch (_) {
      // Older backend may not implement /api/cancel-astra yet.
    }
  }

  function stopExecution() {
    if (!activeController) return;

    stopRequested = true;
    const runId = activeRunId;
    activeController.abort();
    notifyCancel(runId);

    setText('runnerStatus', 'Stopping…');
    setText('metaStatus', 'Stopping');
    setText('metaReturnCode', '—');
    setText('metaElapsed', '—');
    output('Stop requested. Waiting is cancelled. If the backend cancel endpoint is installed, the server process is also terminated.');
  }

  function patchFetch() {
    if (window.__glRunnerStopFetchPatched) return;
    window.__glRunnerStopFetchPatched = true;

    window.fetch = async function patchedFetch(resource, options = {}) {
      if (!isRunRequest(resource)) return nativeFetch(resource, options);

      activeController = new AbortController();
      activeRunId = makeRunId();
      stopRequested = false;

      let body = {};
      try { body = JSON.parse(options.body || '{}'); } catch (_) { body = {}; }
      body.run_id = activeRunId;

      const nextOptions = {
        ...options,
        signal: activeController.signal,
        body: JSON.stringify(body)
      };

      setStopButton();
      window.setTimeout(setStopButton, 0);
      window.setTimeout(setStopButton, 50);

      try {
        return await nativeFetch(resource, nextOptions);
      } catch (error) {
        if (stopRequested || error.name === 'AbortError') {
          return new Response(JSON.stringify({
            status: 'stopped',
            return_code: 'stopped',
            elapsed_seconds: null,
            output: 'Execution stopped by user.'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      } finally {
        activeController = null;
        activeRunId = null;
        stopRequested = false;
        window.setTimeout(setRunButton, 0);
      }
    };
  }

  function interceptStopClick() {
    document.addEventListener('click', event => {
      const btn = event.target.closest && event.target.closest('#runAstraButton');
      if (!btn || !btn.classList.contains('runner-stop-mode')) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      stopExecution();
    }, true);
  }

  function keepStopVisibleWhileRunning() {
    window.setInterval(() => {
      if (activeController) setStopButton();
    }, 250);
  }

  function init() {
    addStyle();
    patchFetch();
    interceptStopClick();
    keepStopVisibleWhileRunning();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
