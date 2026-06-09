(() => {
  /* ── Platform-aware run/cancel URLs ─────────────────────── */
  const BASE = 'https://code.generativelayers.com/api';
  const PLATFORM = window.GL_PLATFORM || 'astra';
  const RUN_URL = BASE + '/run-' + PLATFORM;
  const CANCEL_URL = BASE + '/cancel-' + PLATFORM;

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
    return url === RUN_URL || url.endsWith('/api/run-' + PLATFORM);
  }

  function addStyle() {
    if (document.getElementById('gl-runner-stop-style')) return;
    const style = document.createElement('style');
    style.id = 'gl-runner-stop-style';
    style.textContent = `
      #runAstraButton {
        min-width: 150px;
        text-align: center;
        justify-content: center;
      }
      #runAstraButton.runner-stop-mode {
        background: #dc2626 !important;
        color: #fff !important;
        opacity: 1 !important;
        cursor: pointer !important;
        min-width: 150px;
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
      // Backend may not implement cancel yet.
    }
  }

  function stopExecution() {
    if (!activeController) return;

    stopRequested = true;
    const runId = activeRunId;
    const ctrl = activeController;

    // Null immediately so keepStopVisibleWhileRunning() won't re-set stop mode
    activeController = null;
    activeRunId = null;

    ctrl.abort();
    notifyCancel(runId);
    setRunButton();

    // Freeze the elapsed timer at its current value
    if (window.__glElapsedTimer) {
      clearInterval(window.__glElapsedTimer);
      window.__glElapsedTimer = null;
    }
    if (window.__glRunStartTime) {
      const secs = ((Date.now() - window.__glRunStartTime) / 1000).toFixed(1);
      setText('metaElapsed', `${secs}s`);
    }

    setText('runnerStatus', 'Stopped');
    setText('metaStatus', 'Stopped');
    setText('metaReturnCode', '—');
    output('Execution stopped by user.');

    // Hide GUI button and close modal
    const guiBtn = document.getElementById('showGuiButton');
    if (guiBtn) guiBtn.hidden = true;
    if (typeof window.__glGuiClose === 'function') window.__glGuiClose();
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
        const response = await nativeFetch(resource, nextOptions);

        // Wrap the response so that when the stream is fully consumed,
        // we reset the button. Monkey-patch the body so the reader
        // signals when done.
        const origBody = response.body;
        if (origBody) {
          const origGetReader = origBody.getReader.bind(origBody);
          origBody.getReader = function() {
            const reader = origGetReader();
            const origRead = reader.read.bind(reader);
            reader.read = async function() {
              const result = await origRead();
              if (result.done) {
                // Stream finished — reset to Run button
                activeController = null;
                activeRunId = null;
                stopRequested = false;
                window.setTimeout(setRunButton, 0);
              }
              return result;
            };
            return reader;
          };
        }

        return response;
      } catch (error) {
        const wasStopped = stopRequested;
        activeController = null;
        activeRunId = null;
        stopRequested = false;
        window.setTimeout(setRunButton, 0);

        if (wasStopped || error.name === 'AbortError') {
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
    // Expose globally so New/Load project can stop running execution
    window.__glStopExecution = stopExecution;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
