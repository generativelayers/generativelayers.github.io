/**
 * code-runner-diagnostics.js — Real-time ASTRA syntax checking via server-side compiler.
 *
 * Sends the editor source to /api/check-astra (the real ASTRA compiler),
 * receives JSON diagnostics [{file, severity, message, startLine, startCol, endLine, endCol}],
 * and renders them below the editor.
 *
 * Debounced at 600 ms after last keystroke to avoid hammering the server.
 */
(() => {
  'use strict';

  const CHECK_URL = 'https://code.generativelayers.com/api/check-astra';
  const DEBOUNCE_MS = 600;
  const STYLE_ID = 'gl-diagnostics-style';

  /* ── CSS ───────────────────────────────────────────────────── */
  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .diag-bar {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 14px; cursor: pointer; user-select: none;
        border: 1px solid #1f2937; border-top: 0;
        border-radius: 0 0 12px 12px;
        background: #0f172a; color: #94a3b8;
        font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
        font-size: 12px; font-weight: 700;
        transition: background .15s;
      }
      .diag-bar:hover { background: #1e293b; }
      .diag-bar.has-errors { color: #fca5a5; }
      .diag-bar.has-warnings { color: #fde68a; }
      .diag-bar.has-errors.has-warnings { color: #fca5a5; }
      .diag-bar.all-clear { color: #6ee7b7; }
      .diag-bar.checking { color: #94a3b8; }
      .diag-bar .diag-chevron { margin-left: auto; transition: transform .2s; font-size: 10px; color: #475569; }
      .diag-bar.expanded .diag-chevron { transform: rotate(180deg); }
      .diag-bar .diag-spinner { display: none; }
      .diag-bar.checking .diag-spinner { display: inline-block; animation: diag-spin .8s linear infinite; }
      @keyframes diag-spin { to { transform: rotate(360deg); } }

      .diag-list {
        max-height: 0; overflow: hidden;
        border: 1px solid #1f2937; border-top: 0;
        background: #0b1220;
        transition: max-height .25s ease;
        margin-top: -12px;
        border-radius: 0 0 12px 12px;
      }
      .diag-bar.expanded + .diag-list {
        max-height: 260px; overflow-y: auto;
        border-radius: 0 0 12px 12px;
      }
      .diag-bar.expanded { border-radius: 0; }

      .diag-item {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 7px 14px; cursor: pointer;
        font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
        font-size: 12px; line-height: 1.45;
        border-bottom: 1px solid #1e293b;
        color: #cbd5e1;
        transition: background .1s;
      }
      .diag-item:hover { background: #1e293b; }
      .diag-item:last-child { border-bottom: 0; }
      .diag-line { min-width: 42px; color: #64748b; font-weight: 800; text-align: right; flex-shrink: 0; }
      .diag-icon { flex-shrink: 0; width: 16px; text-align: center; }
      .diag-icon.sev-error { color: #f87171; }
      .diag-icon.sev-warning { color: #fbbf24; }
      .diag-icon.sev-info { color: #60a5fa; }
      .diag-msg { flex: 1; }
    `;
    document.head.appendChild(s);
  }

  /* ── DOM ───────────────────────────────────────────────────── */
  let bar, list, editor, currentFileEl;
  let timer = null;
  let abortCtrl = null;
  let lastSource = '';

  function build() {
    const editorWrap = document.querySelector('.runner-editor-wrap');
    editor = document.getElementById('fileEditor');
    currentFileEl = document.getElementById('currentFile');
    if (!editorWrap || !editor) return false;

    editor.style.borderRadius = '0';

    bar = document.createElement('div');
    bar.className = 'diag-bar all-clear';
    bar.innerHTML = '<i class="fa-solid fa-circle-check diag-main-icon"></i> <i class="fa-solid fa-spinner diag-spinner"></i> <span class="diag-summary">No issues</span> <i class="fa-solid fa-chevron-down diag-chevron"></i>';
    bar.addEventListener('click', () => bar.classList.toggle('expanded'));

    list = document.createElement('div');
    list.className = 'diag-list';

    editorWrap.appendChild(bar);
    editorWrap.appendChild(list);
    return true;
  }

  /* ── Server call ───────────────────────────────────────────── */

  function getCurrentFilename() {
    if (!currentFileEl) return 'Main.astra';
    return (currentFileEl.textContent || '').split('/').pop() || 'Main.astra';
  }

  async function checkOnServer() {
    if (!editor) return;

    const filename = getCurrentFilename();
    if (!filename.endsWith('.astra')) {
      renderClear('Not an ASTRA file');
      return;
    }

    const source = editor.value;
    if (source === lastSource) return;
    lastSource = source;

    if (!source.trim()) {
      renderClear('Empty file');
      return;
    }

    // Abort any in-flight request
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    setChecking(true);

    try {
      // Build the same files payload as the runner
      const files = {};
      // Get all project files from the code-runner's global state
      if (window.__glFiles) {
        Object.entries(window.__glFiles).forEach(([path, content]) => {
          if (path.startsWith('/astra/')) files['src/main/astra/' + path.slice(7)] = content;
          if (path.startsWith('/java/')) files['src/main/java/' + path.slice(6)] = content;
        });
      } else {
        files['src/main/astra/' + filename] = source;
      }

      const response = await fetch(CHECK_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, files }),
        signal: abortCtrl.signal
      });

      const data = await response.json();

      // Server returns: { diagnostics: [{file, severity, message, startLine, startCol, endLine, endCol}] }
      // or directly an array
      const diags = Array.isArray(data) ? data : (data.diagnostics || []);
      render(diags);
    } catch (err) {
      if (err.name === 'AbortError') return; // Superseded by newer request
      // Network error — don't show as a diagnostic, just note it
      renderClear('Offline — unable to check');
    } finally {
      setChecking(false);
    }
  }

  /* ── Render ────────────────────────────────────────────────── */

  function setChecking(active) {
    if (active) {
      bar.classList.add('checking');
      bar.querySelector('.diag-summary').textContent = 'Checking…';
    } else {
      bar.classList.remove('checking');
    }
  }

  function renderClear(msg) {
    bar.className = 'diag-bar all-clear';
    bar.querySelector('.diag-summary').textContent = msg || 'No issues';
    bar.querySelector('.diag-main-icon').className = 'fa-solid fa-circle-check diag-main-icon';
    list.innerHTML = '';
    bar.classList.remove('expanded');
  }

  function render(diags) {
    const errors = diags.filter(d => d.severity === 'error');
    const warnings = diags.filter(d => d.severity === 'warning');

    if (diags.length === 0) {
      renderClear('No issues — compiled OK');
      return;
    }

    const parts = [];
    if (errors.length) parts.push(`${errors.length} error${errors.length > 1 ? 's' : ''}`);
    if (warnings.length) parts.push(`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`);
    bar.querySelector('.diag-summary').textContent = parts.join(', ');

    let cls = 'diag-bar';
    if (errors.length) cls += ' has-errors';
    else if (warnings.length) cls += ' has-warnings';
    else cls += ' all-clear';
    if (bar.classList.contains('expanded')) cls += ' expanded';

    const icon = errors.length ? 'fa-circle-xmark' : 'fa-triangle-exclamation';
    bar.querySelector('.diag-main-icon').className = `fa-solid ${icon} diag-main-icon`;
    bar.className = cls;

    if (errors.length && !bar.classList.contains('expanded')) {
      bar.classList.add('expanded');
    }

    const sevIcon = {
      error: '<i class="fa-solid fa-circle-xmark diag-icon sev-error"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation diag-icon sev-warning"></i>',
      info: '<i class="fa-solid fa-circle-info diag-icon sev-info"></i>'
    };

    list.innerHTML = diags.map(d => `
      <div class="diag-item" data-line="${d.startLine || 1}">
        <span class="diag-line">L${d.startLine || 1}</span>
        ${sevIcon[d.severity] || sevIcon.error}
        <span class="diag-msg">${escapeHtml(d.message)}</span>
      </div>
    `).join('');

    list.querySelectorAll('.diag-item').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        jumpToLine(parseInt(item.dataset.line, 10));
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function jumpToLine(lineNum) {
    if (!editor) return;
    const lines = editor.value.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) pos += lines[i].length + 1;
    editor.focus();
    editor.setSelectionRange(pos, pos + (lines[lineNum - 1] || '').length);
    const lh = parseFloat(getComputedStyle(editor).lineHeight) || 20;
    editor.scrollTop = Math.max(0, (lineNum - 5) * lh);
  }

  /* ── Debounce ──────────────────────────────────────────────── */
  function scheduleLint() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(checkOnServer, DEBOUNCE_MS);
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    addStyle();
    if (!build()) return;

    editor.addEventListener('input', scheduleLint);
    editor.addEventListener('focus', scheduleLint);

    if (currentFileEl) {
      const obs = new MutationObserver(scheduleLint);
      obs.observe(currentFileEl, { childList: true, characterData: true, subtree: true });
    }

    setTimeout(checkOnServer, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
