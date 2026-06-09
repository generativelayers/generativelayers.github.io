(() => {
  /* ── Platform-aware run URL ─────────────────────────────── */
  const BASE = 'https://code.generativelayers.com/api';
  const PLATFORM = window.GL_PLATFORM || 'astra';
  const PLATFORM_LABEL = (window.GL_PLATFORM_CONFIG && window.GL_PLATFORM_CONFIG.label) || 'ASTRA';
  const RUN_URL = BASE + '/run-' + PLATFORM;
  const originalFetch = window.fetch.bind(window);
  let intervalId = null;
  let startTime = 0;

  function isRunnerRequest(resource) {
    const url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
    return url === RUN_URL || url.endsWith('/api/run-' + PLATFORM);
  }

  function text(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function getOutput() {
    const el = document.getElementById('runnerOutput');
    return el ? el.textContent || '' : '';
  }

  function setOutput(value) {
    const el = document.getElementById('runnerOutput');
    if (el) el.textContent = value;
  }

  function elapsedText() {
    const total = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m ? `${m}m ${s}s` : `${s}s`;
  }

  function message(elapsed) {
    return [
      'Request sent to hosted runner.',
      '',
      `Elapsed: ${elapsed}`,
      '',
      'Live log streaming is not enabled on this endpoint.',
      'The server output appears after the run finishes or reaches timeout.',
      '',
      'Expected stages:',
      '- prepare temporary project',
      '- compile ' + PLATFORM_LABEL + ' files',
      '- run agent',
      '- return final output'
    ].join('\n');
  }

  function start() {
    startTime = Date.now();
    text('metaStatus', 'Running');
    text('metaElapsed', '0s');
    text('runnerStatus', 'Running... 0s');
    setOutput(message('0s'));

    clearInterval(intervalId);
    intervalId = setInterval(() => {
      const elapsed = elapsedText();
      text('metaElapsed', elapsed);
      text('runnerStatus', `Running... ${elapsed}`);
      const current = getOutput();
      if (!current || current.startsWith('Request sent to hosted runner') || current.startsWith('Sending')) {
        setOutput(message(elapsed));
      }
    }, 1000);
  }

  function stop() {
    clearInterval(intervalId);
    intervalId = null;
  }

  if (!window.__glRunnerProgressPatched) {
    window.__glRunnerProgressPatched = true;
    window.fetch = async function(resource, options = {}) {
      if (!isRunnerRequest(resource)) return originalFetch(resource, options);
      start();
      try {
        return await originalFetch(resource, options);
      } finally {
        stop();
      }
    };
  }
})();
