/**
 * code-runner-diagnostics.js
 *
 * Real-time ASTRA syntax checking via the server-side ASTRA compiler.
 * Calls POST /api/check-astra, receives diagnostics JSON, renders a
 * beautiful diagnostics panel below the editor with click-to-jump.
 *
 * SMART TRIGGERING — avoids hammering the server:
 *   • Ctrl+S (save gesture)
 *   • Editor blur (user clicked elsewhere)
 *   • File tab switch
 *   • Before "Run Project" (pre-flight)
 *   • 3s idle fallback (stopped typing for 3 seconds)
 *   • Rate-limited: max 1 check per 8 seconds
 */
(function () {
  'use strict';

  var CHECK_URL = 'https://code.generativelayers.com/api/check-astra';
  var IDLE_MS = 3000;       // check after 3s of no typing
  var RATE_LIMIT_MS = 8000; // minimum 8s between checks

  /* ── Inject CSS ─────────────────────────────────────────────── */
  var css = document.createElement('style');
  css.textContent = [
    /* Bar */
    '.gl-diag-bar{',
    '  display:flex;align-items:center;gap:10px;',
    '  padding:9px 16px;cursor:pointer;user-select:none;',
    '  background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);',
    '  border:1px solid #1e3a5f;border-top:none;',
    '  border-radius:0 0 12px 12px;',
    '  font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;',
    '  font-size:12px;font-weight:700;letter-spacing:.3px;',
    '  color:#94a3b8;transition:all .2s ease;',
    '}',
    '.gl-diag-bar:hover{background:linear-gradient(135deg,#1e293b 0%,#334155 100%);}',

    /* States */
    '.gl-diag-bar[data-state="ok"]{color:#6ee7b7;border-color:#065f46;}',
    '.gl-diag-bar[data-state="error"]{color:#fca5a5;border-color:#7f1d1d;}',
    '.gl-diag-bar[data-state="warn"]{color:#fde68a;border-color:#78350f;}',
    '.gl-diag-bar[data-state="checking"]{color:#7dd3fc;}',
    '.gl-diag-bar[data-state="offline"]{color:#94a3b8;}',
    '.gl-diag-bar[data-state="stale"]{color:#94a3b8;border-color:#334155;}',

    /* Icons */
    '.gl-diag-icon{font-size:14px;flex-shrink:0;transition:transform .15s;}',
    '.gl-diag-summary{flex:1;}',
    '.gl-diag-hint{font-size:10px;color:#475569;font-weight:500;margin-left:4px;}',
    '.gl-diag-chevron{margin-left:auto;font-size:10px;color:#475569;transition:transform .25s ease;}',
    '.gl-diag-bar[data-open="1"] .gl-diag-chevron{transform:rotate(180deg);}',

    /* Spinner */
    '.gl-diag-spin{display:none;animation:glDiagSpin .7s linear infinite;}',
    '.gl-diag-bar[data-state="checking"] .gl-diag-spin{display:inline-block;}',
    '.gl-diag-bar[data-state="checking"] .gl-diag-main-icon{display:none;}',
    '@keyframes glDiagSpin{to{transform:rotate(360deg);}}',

    /* Panel */
    '.gl-diag-panel{',
    '  max-height:0;overflow:hidden;',
    '  background:#0a0f1e;',
    '  border:1px solid #1e3a5f;border-top:none;',
    '  border-radius:0 0 12px 12px;',
    '  transition:max-height .3s cubic-bezier(.4,0,.2,1);',
    '}',
    '.gl-diag-bar[data-open="1"]+.gl-diag-panel{max-height:280px;overflow-y:auto;}',
    '.gl-diag-bar[data-open="1"]{border-radius:0;}',

    /* Items */
    '.gl-diag-item{',
    '  display:flex;align-items:flex-start;gap:10px;',
    '  padding:8px 16px;cursor:pointer;',
    '  font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;',
    '  font-size:12px;line-height:1.5;',
    '  color:#cbd5e1;border-bottom:1px solid rgba(30,58,95,.5);',
    '  transition:background .12s ease;',
    '}',
    '.gl-diag-item:hover{background:rgba(30,58,95,.6);}',
    '.gl-diag-item:last-child{border-bottom:none;}',
    '.gl-diag-line{min-width:38px;color:#64748b;font-weight:900;text-align:right;flex-shrink:0;}',
    '.gl-diag-sev{flex-shrink:0;width:18px;text-align:center;font-size:13px;}',
    '.gl-diag-sev.e{color:#f87171;}',
    '.gl-diag-sev.w{color:#fbbf24;}',
    '.gl-diag-sev.i{color:#60a5fa;}',
    '.gl-diag-msg{flex:1;word-break:break-word;}',

    /* Editor glow when errors */
    '.runner-editor.has-errors{',
    '  border-color:#7f1d1d !important;',
    '  box-shadow:0 0 0 2px rgba(239,68,68,.15),inset 0 0 30px rgba(239,68,68,.04) !important;',
    '}',
    '.runner-editor.has-errors:focus{',
    '  border-color:#dc2626 !important;',
    '  box-shadow:0 0 0 3px rgba(239,68,68,.25),inset 0 0 30px rgba(239,68,68,.06) !important;',
    '}',
  ].join('\n');
  document.head.appendChild(css);

  /* ── State ──────────────────────────────────────────────────── */
  var editor, bar, panel, summaryEl, mainIcon, hintEl;
  var idleTimer = null, abortCtrl = null;
  var lastCheckedSource = '';  // source that was last sent to server
  var lastCheckTime = 0;       // timestamp of last successful check
  var dirty = false;           // true = editor changed since last check

  /* ── Build DOM ──────────────────────────────────────────────── */
  function init() {
    editor = document.getElementById('fileEditor');
    if (!editor) return;

    var wrap = editor.closest('.runner-editor-wrap');
    if (!wrap) return;

    // Remove bottom radius from editor
    editor.style.borderRadius = '0';

    // Bar
    bar = document.createElement('div');
    bar.className = 'gl-diag-bar';
    bar.setAttribute('data-state', 'stale');
    bar.setAttribute('data-open', '0');
    bar.innerHTML = [
      '<i class="fa-solid fa-circle-check gl-diag-icon gl-diag-main-icon"></i>',
      '<i class="fa-solid fa-spinner gl-diag-spin gl-diag-icon"></i>',
      '<span class="gl-diag-summary">Press Ctrl+S to check syntax</span>',
      '<span class="gl-diag-hint"></span>',
      '<i class="fa-solid fa-chevron-down gl-diag-chevron"></i>'
    ].join('');
    bar.addEventListener('click', function () {
      bar.setAttribute('data-open', bar.getAttribute('data-open') === '1' ? '0' : '1');
    });

    // Panel
    panel = document.createElement('div');
    panel.className = 'gl-diag-panel';

    wrap.appendChild(bar);
    wrap.appendChild(panel);

    summaryEl = bar.querySelector('.gl-diag-summary');
    mainIcon = bar.querySelector('.gl-diag-main-icon');
    hintEl = bar.querySelector('.gl-diag-hint');

    // ── Smart triggers ──────────────────────────────────────

    // 1. Ctrl+S — immediate check
    editor.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        requestCheck('save');
      }
    });

    // 2. Editor blur — check when leaving
    editor.addEventListener('blur', function () {
      if (dirty) requestCheck('blur');
    });

    // 3. Input — mark dirty + start idle timer
    editor.addEventListener('input', function () {
      dirty = true;
      markStale();
      resetIdleTimer();
    });

    // 4. File tab switch — reset and check
    var currentFileEl = document.getElementById('currentFile');
    if (currentFileEl) {
      var obs = new MutationObserver(function () {
        lastCheckedSource = '';
        dirty = true;
        requestCheck('tab');
      });
      obs.observe(currentFileEl, { childList: true, characterData: true, subtree: true });
    }

    // 5. Before Run — intercept Run button for pre-flight check
    var runBtn = document.getElementById('runAstraButton');
    if (runBtn) {
      runBtn.addEventListener('click', function () {
        if (dirty) requestCheck('run');
      }, true); // capture phase, non-blocking
    }

    // Initial check after 1s
    dirty = true;
    setTimeout(function () { requestCheck('init'); }, 1000);
  }

  /* ── Idle timer (3s fallback) ───────────────────────────────── */
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (dirty) requestCheck('idle');
    }, IDLE_MS);
  }

  /* ── Mark stale (user is typing, last result may be outdated) ─ */
  function markStale() {
    if (bar.getAttribute('data-state') !== 'checking') {
      hintEl.textContent = '(editing…)';
    }
  }

  /* ── Rate-limited check ─────────────────────────────────────── */
  function requestCheck(trigger) {
    if (!editor || !bar) return;

    var now = Date.now();
    var source = editor.value || '';

    // Skip if source unchanged since last check
    if (source === lastCheckedSource) {
      dirty = false;
      hintEl.textContent = '';
      return;
    }

    // Rate limit: wait if too soon (unless it's a manual save or pre-run)
    var elapsed = now - lastCheckTime;
    if (elapsed < RATE_LIMIT_MS && trigger !== 'save' && trigger !== 'run' && trigger !== 'init' && trigger !== 'tab') {
      // Schedule a delayed check instead
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        requestCheck('deferred');
      }, RATE_LIMIT_MS - elapsed + 100);
      return;
    }

    doCheck(source);
  }

  /* ── Server call ────────────────────────────────────────────── */
  function doCheck(source) {
    // Only check .astra files
    var fileEl = document.getElementById('currentFile');
    var filename = fileEl ? (fileEl.textContent || '').trim() : 'Main.astra';
    if (!filename.endsWith('.astra')) {
      setState('ok', 'Not an ASTRA file');
      hintEl.textContent = '';
      dirty = false;
      return;
    }

    if (!source.trim()) {
      setState('ok', 'Empty');
      setEditorGlow(false);
      hintEl.textContent = '';
      dirty = false;
      return;
    }

    // Abort previous request
    if (abortCtrl) { try { abortCtrl.abort(); } catch (e) {} }
    abortCtrl = new AbortController();

    setState('checking', 'Checking…');
    hintEl.textContent = '';

    fetch(CHECK_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: source, filename: filename.split('/').pop() }),
      signal: abortCtrl.signal
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      lastCheckedSource = source;
      lastCheckTime = Date.now();
      dirty = false;
      var diags = Array.isArray(data) ? data : (data.diagnostics || []);
      renderDiags(diags);
    })
    .catch(function (err) {
      if (err.name === 'AbortError') return;
      setState('offline', 'Offline — unable to check');
      hintEl.textContent = '';
      setEditorGlow(false);
    });
  }

  /* ── Render ─────────────────────────────────────────────────── */
  function setState(state, text) {
    bar.setAttribute('data-state', state);
    summaryEl.textContent = text;
    var icons = {
      ok: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warn: 'fa-triangle-exclamation',
      checking: 'fa-spinner',
      offline: 'fa-wifi',
      stale: 'fa-clock'
    };
    mainIcon.className = 'fa-solid ' + (icons[state] || 'fa-circle-check') + ' gl-diag-icon gl-diag-main-icon';
  }

  function setEditorGlow(hasErrors) {
    if (hasErrors) {
      editor.classList.add('has-errors');
    } else {
      editor.classList.remove('has-errors');
    }
  }

  function renderDiags(diags) {
    var errors = diags.filter(function (d) { return d.severity === 'error'; });
    var warnings = diags.filter(function (d) { return d.severity === 'warning'; });

    if (diags.length === 0) {
      setState('ok', 'No issues — compiled OK ✓');
      hintEl.textContent = '';
      setEditorGlow(false);
      panel.innerHTML = '';
      bar.setAttribute('data-open', '0');
      return;
    }

    // Summary text
    var parts = [];
    if (errors.length) parts.push(errors.length + ' error' + (errors.length > 1 ? 's' : ''));
    if (warnings.length) parts.push(warnings.length + ' warning' + (warnings.length > 1 ? 's' : ''));
    setState(errors.length ? 'error' : 'warn', parts.join(', '));
    hintEl.textContent = '';
    setEditorGlow(errors.length > 0);

    // Auto-expand on errors
    if (errors.length) bar.setAttribute('data-open', '1');

    // Build items
    var sevIcons = {
      error: '<i class="fa-solid fa-circle-xmark gl-diag-sev e"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation gl-diag-sev w"></i>',
      info: '<i class="fa-solid fa-circle-info gl-diag-sev i"></i>'
    };

    panel.innerHTML = diags.map(function (d) {
      var line = d.startLine || 1;
      return '<div class="gl-diag-item" data-line="' + line + '">' +
        '<span class="gl-diag-line">L' + line + '</span>' +
        (sevIcons[d.severity] || sevIcons.error) +
        '<span class="gl-diag-msg">' + esc(d.message) + '</span>' +
        '</div>';
    }).join('');

    // Click-to-jump
    var items = panel.querySelectorAll('.gl-diag-item');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', (function (item) {
        return function (e) {
          e.stopPropagation();
          jumpToLine(parseInt(item.getAttribute('data-line'), 10));
        };
      })(items[i]));
    }
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function jumpToLine(lineNum) {
    if (!editor) return;
    var lines = editor.value.split('\n');
    var pos = 0;
    for (var i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
      pos += lines[i].length + 1;
    }
    editor.focus();
    var lineLen = (lines[lineNum - 1] || '').length;
    editor.setSelectionRange(pos, pos + lineLen);
    var lh = parseFloat(getComputedStyle(editor).lineHeight) || 20;
    editor.scrollTop = Math.max(0, (lineNum - 4) * lh);
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
