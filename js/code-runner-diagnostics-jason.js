/**
 * code-runner-diagnostics-jason.js  v1
 *
 * Client-side Jason/JaCaMo AgentSpeak syntax checking.
 * Ported from jason-diagnostics-vscode (jason-checks.ts).
 *
 * Checks run entirely in the browser — no server call needed.
 * Renders the same diagnostics panel as code-runner-diagnostics.js (ASTRA).
 *
 * SMART TRIGGERING (same as ASTRA):
 *   • Ctrl+S (save gesture)
 *   • Editor blur
 *   • File tab switch
 *   • 3s idle fallback
 */
(function () {
  'use strict';

  var PLATFORM = window.GL_PLATFORM || 'astra';
  if (PLATFORM !== 'jason' && PLATFORM !== 'jacamo') return;

  var IDLE_MS = 2000;

  /* ── Inject CSS (same as ASTRA diagnostics) ──────────────── */
  var css = document.createElement('style');
  css.textContent = [
    '.gl-diag-bar{',
    '  display:flex;align-items:center;gap:10px;',
    '  padding:9px 16px;cursor:pointer;user-select:none;',
    '  background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);',
    '  border:1px solid #1e3a5f;border-top:none;',
    '  border-radius:0 0 12px 12px;',
    '  font-family:\'Fira Code\',ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;',
    '  font-size:12px;font-weight:700;letter-spacing:.3px;',
    '  color:#94a3b8;transition:all .2s ease;',
    '}',
    '.gl-diag-bar:hover{background:linear-gradient(135deg,#1e293b 0%,#334155 100%);}',
    '.gl-diag-bar[data-state="ok"]{color:#6ee7b7;border-color:#065f46;}',
    '.gl-diag-bar[data-state="error"]{color:#fca5a5;border-color:#7f1d1d;}',
    '.gl-diag-bar[data-state="warn"]{color:#fde68a;border-color:#78350f;}',
    '.gl-diag-bar[data-state="checking"]{color:#7dd3fc;}',
    '.gl-diag-bar[data-state="stale"]{color:#94a3b8;border-color:#334155;}',
    '.gl-diag-icon{font-size:14px;flex-shrink:0;transition:transform .15s;}',
    '.gl-diag-summary{flex:1;}',
    '.gl-diag-hint{font-size:10px;color:#475569;font-weight:500;margin-left:4px;}',
    '.gl-diag-chevron{margin-left:auto;font-size:10px;color:#475569;transition:transform .25s ease;}',
    '.gl-diag-bar[data-open="1"] .gl-diag-chevron{transform:rotate(180deg);}',
    '.gl-diag-panel{',
    '  max-height:0;overflow:hidden;',
    '  background:#0a0f1e;',
    '  border:1px solid #1e3a5f;border-top:none;',
    '  border-radius:0 0 12px 12px;',
    '  transition:max-height .3s cubic-bezier(.4,0,.2,1);',
    '}',
    '.gl-diag-bar[data-open="1"]+.gl-diag-panel{max-height:280px;overflow-y:auto;}',
    '.gl-diag-bar[data-open="1"]{border-radius:0;}',
    '.gl-diag-item{',
    '  display:flex;align-items:flex-start;gap:10px;',
    '  padding:8px 16px;cursor:pointer;',
    '  font-family:\'Fira Code\',ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;',
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
    '.gl-diag-sev.h{color:#94a3b8;}',
    '.gl-diag-msg{flex:1;word-break:break-word;}',
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

  /* ── State ──────────────────────────────────────────────── */
  var editor, bar, panel, summaryEl, mainIcon, hintEl;
  var idleTimer = null;
  var lastCheckedSource = '';
  var dirty = false;

  /* ── Strip comments ─────────────────────────────────────── */
  function stripComments(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, function(m) { return m.replace(/[^\n]/g, ' '); })
              .replace(/\/\/.*$/gm, function(m) { return ' '.repeat(m.length); });
  }

  /* ── Diagnostic helpers ─────────────────────────────────── */
  function lineOfOffset(text, offset) {
    return text.substring(0, offset).split('\n').length;
  }

  /* ── Jason Diagnostic Checks ────────────────────────────── */

  /** Check unclosed brackets */
  function checkUnclosedBrackets(stripped, diags) {
    var stack = [];
    var pairs = { '(': ')', '{': '}', '[': ']' };
    var closing = { ')': '(', '}': '{', ']': '[' };
    for (var i = 0; i < stripped.length; i++) {
      var ch = stripped[i];
      if (ch in pairs) {
        stack.push({ ch: ch, offset: i });
      } else if (ch in closing) {
        if (stack.length === 0 || stack[stack.length - 1].ch !== closing[ch]) {
          diags.push({ startLine: lineOfOffset(stripped, i), severity: 'error', message: "Unmatched closing bracket '" + ch + "'" });
        } else {
          stack.pop();
        }
      }
    }
    for (var u = 0; u < stack.length; u++) {
      diags.push({ startLine: lineOfOffset(stripped, stack[u].offset), severity: 'error', message: "Unclosed bracket '" + stack[u].ch + "'" });
    }
  }

  /** Check for empty plan bodies: <- true. or <- . */
  function checkEmptyPlanBody(stripped, diags) {
    var re = /<-\s*(true\s*)?\.\s*$/gm;
    var m;
    while ((m = re.exec(stripped)) !== null) {
      var before = stripped.substring(Math.max(0, m.index - 200), m.index);
      if (/[+\-][!?]?\w+/.test(before)) {
        diags.push({ startLine: lineOfOffset(stripped, m.index), severity: 'info', message: 'Plan has an empty body — consider adding actions or removing the plan' });
      }
    }
  }

  /** Check duplicate initial beliefs */
  function checkDuplicateBelief(stripped, diags) {
    var lines = stripped.split('\n');
    var beliefs = {};
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^[+\-@]/.test(line) || /^\/\//.test(line) || line === '' || /<-/.test(line)) continue;
      var bm = line.match(/^([a-z_]\w*(?:\([^)]*\))?)\s*\.$/);
      if (bm) {
        var sig = bm[1].replace(/\s+/g, '');
        if (beliefs[sig] !== undefined) {
          diags.push({ startLine: i + 1, severity: 'warning', message: "Duplicate initial belief '" + bm[1] + "' (first at line " + beliefs[sig] + ")" });
        } else {
          beliefs[sig] = i + 1;
        }
      }
    }
  }

  /** Check goals dispatched without a corresponding plan */
  function checkGoalWithoutPlan(stripped, diags) {
    if (/\{\s*include\s*\(/.test(stripped)) return;
    var planTriggers = {};
    var triggerRe = /\+!([a-z_]\w*)\s*(?:\(|[^(])/g;
    var tm;
    while ((tm = triggerRe.exec(stripped)) !== null) {
      var lineStart = stripped.lastIndexOf('\n', tm.index);
      var prefix = stripped.substring(lineStart + 1, tm.index).trim();
      if (prefix === '' || /^@\w+$/.test(prefix)) {
        planTriggers[tm[1]] = true;
      }
    }
    var bodyRe = /<-[\s\S]*?\./g;
    var bm;
    while ((bm = bodyRe.exec(stripped)) !== null) {
      var body = bm[0];
      var goalRe = /!([a-z_]\w*)(?:\s*\(|\s*[;.])/g;
      var gm;
      while ((gm = goalRe.exec(body)) !== null) {
        if (!planTriggers[gm[1]]) {
          diags.push({ startLine: lineOfOffset(stripped, bm.index + gm.index), severity: 'warning', message: "Achievement goal '!" + gm[1] + "' has no applicable +!" + gm[1] + " plan" });
        }
      }
    }
  }

  /** Check for missing initial goal */
  function checkMissingInitialGoal(stripped, diags) {
    var hasPlan = /^\s*(?:@\w+\s+)?\+!/m.test(stripped);
    if (!hasPlan) return;
    var hasInitGoal = /^\s*![a-z_]\w*\s*(?:\([^)]*\))?\s*\./m.test(stripped);
    if (!hasInitGoal) {
      diags.push({ startLine: 1, severity: 'info', message: 'Agent has achievement goal plans but no initial goal (e.g., !start.)' });
    }
  }

  /** Check .send() without arguments */
  function checkSendMissingTarget(stripped, diags) {
    var re = /\.send\s*\(\s*\)/g;
    var m;
    while ((m = re.exec(stripped)) !== null) {
      diags.push({ startLine: lineOfOffset(stripped, m.index), severity: 'error', message: '.send() called without any arguments — requires (target, performative, content)' });
    }
  }

  /** Check .send() with invalid performative */
  function checkSendInvalidPerformative(stripped, diags) {
    var valid = { tell: 1, untell: 1, achieve: 1, unachieve: 1, askOne: 1, askAll: 1, tellHow: 1, untellHow: 1, askHow: 1 };
    var re = /\.send\s*\(\s*[^,]+,\s*([a-zA-Z_]\w*)\s*,/g;
    var m;
    while ((m = re.exec(stripped)) !== null) {
      if (!valid[m[1]]) {
        diags.push({ startLine: lineOfOffset(stripped, m.index), severity: 'warning', message: "Non-standard performative '" + m[1] + "' — expected: tell, untell, achieve, unachieve, askOne, askAll, tellHow, untellHow, askHow" });
      }
    }
  }

  /** Check for missing failure handlers */
  function checkMissingFailureHandler(stripped, diags) {
    var achieveGoals = {};
    var achieveRe = /^\s*(?:@\w+\s+)?\+!([a-z_]\w*)(?:\s*\(|\s|$)/gm;
    var failRe = /^\s*(?:@\w+\s+)?-!([a-z_]\w*)(?:\s*\(|\s|$)/gm;
    var failHandlers = {};
    var m;
    while ((m = achieveRe.exec(stripped)) !== null) {
      if (!achieveGoals[m[1]]) achieveGoals[m[1]] = lineOfOffset(stripped, m.index);
    }
    while ((m = failRe.exec(stripped)) !== null) {
      failHandlers[m[1]] = true;
    }
    for (var goal in achieveGoals) {
      if (!failHandlers[goal]) {
        diags.push({ startLine: achieveGoals[goal], severity: 'hint', message: "No failure handler -!" + goal + " for achievement goal +!" + goal });
      }
    }
  }

  /** Check for plan body missing terminating period */
  function checkMissingPeriod(stripped, diags) {
    var lines = stripped.split('\n');
    var inPlanBody = false;
    var lastNonEmpty = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/<-/.test(line)) inPlanBody = true;
      if (inPlanBody && line.length > 0) lastNonEmpty = i;
      if (inPlanBody && /\.\s*$/.test(line)) inPlanBody = false;
    }
    // Simple check: if file has <- but the last non-comment line doesn't end with .
    if (/<-/.test(stripped)) {
      var lastLine = '';
      for (var j = lines.length - 1; j >= 0; j--) {
        var l = lines[j].trim();
        if (l && !/^\/\//.test(l)) { lastLine = l; break; }
      }
      if (lastLine && !lastLine.endsWith('.') && !lastLine.endsWith('}')) {
        diags.push({ startLine: lines.length, severity: 'warning', message: 'Last statement may be missing a terminating period (.)' });
      }
    }
  }

  /** Check for contradictory contexts: X & not X */
  function checkContextContradiction(stripped, diags) {
    var planRe = /[+\-][!?]?[a-z_]\w*\s*\([^)]*\)\s*:\s*([^<]+?)\s*<-/g;
    var m;
    while ((m = planRe.exec(stripped)) !== null) {
      var context = m[1];
      var literals = context.split('&').map(function(l) { return l.trim(); });
      var positive = {};
      var negative = {};
      for (var i = 0; i < literals.length; i++) {
        var negMatch = literals[i].match(/^not\s+(.+)$/);
        if (negMatch) negative[negMatch[1].trim()] = true;
        else positive[literals[i]] = true;
      }
      for (var neg in negative) {
        if (positive[neg]) {
          diags.push({ startLine: lineOfOffset(stripped, m.index), severity: 'warning', message: "Contradictory context: '" + neg + "' and 'not " + neg + "' — plan can never fire" });
          break;
        }
      }
    }
  }

  /** Run all checks */
  function runChecks(source) {
    var diags = [];
    var stripped = stripComments(source);
    checkUnclosedBrackets(stripped, diags);
    checkEmptyPlanBody(stripped, diags);
    checkDuplicateBelief(stripped, diags);
    checkGoalWithoutPlan(stripped, diags);
    checkMissingInitialGoal(stripped, diags);
    checkSendMissingTarget(stripped, diags);
    checkSendInvalidPerformative(stripped, diags);
    checkMissingFailureHandler(stripped, diags);
    checkMissingPeriod(stripped, diags);
    checkContextContradiction(stripped, diags);
    return diags;
  }

  /* ── Build DOM ──────────────────────────────────────────── */
  function init() {
    editor = document.getElementById('fileEditor');
    if (!editor) return;

    var wrap = editor.closest('.runner-editor-wrap');
    if (!wrap) return;

    editor.style.borderRadius = '0';

    bar = document.createElement('div');
    bar.className = 'gl-diag-bar';
    bar.setAttribute('data-state', 'stale');
    bar.setAttribute('data-open', '0');
    bar.innerHTML = [
      '<i class="fa-solid fa-circle-check gl-diag-icon gl-diag-main-icon"></i>',
      '<span class="gl-diag-summary">Press Ctrl+S to check syntax</span>',
      '<span class="gl-diag-hint"></span>',
      '<i class="fa-solid fa-chevron-down gl-diag-chevron"></i>'
    ].join('');
    bar.addEventListener('click', function () {
      bar.setAttribute('data-open', bar.getAttribute('data-open') === '1' ? '0' : '1');
    });

    panel = document.createElement('div');
    panel.className = 'gl-diag-panel';

    wrap.appendChild(bar);
    wrap.appendChild(panel);

    summaryEl = bar.querySelector('.gl-diag-summary');
    mainIcon = bar.querySelector('.gl-diag-main-icon');
    hintEl = bar.querySelector('.gl-diag-hint');

    // Ctrl+S
    editor.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        requestCheck();
      }
    });

    // Blur
    editor.addEventListener('blur', function () {
      if (dirty) requestCheck();
    });

    // Input
    editor.addEventListener('input', function () {
      dirty = true;
      markStale();
      resetIdleTimer();
    });

    // File tab switch
    var currentFileEl = document.getElementById('currentFile');
    if (currentFileEl) {
      var obs = new MutationObserver(function () {
        lastCheckedSource = '';
        dirty = true;
        requestCheck();
      });
      obs.observe(currentFileEl, { childList: true, characterData: true, subtree: true });
    }

    // Before Run
    var runBtn = document.getElementById('runAstraButton');
    if (runBtn) {
      runBtn.addEventListener('click', function () {
        if (dirty) requestCheck();
      }, true);
    }

    dirty = true;
    setTimeout(function () { requestCheck(); }, 500);
  }

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (dirty) requestCheck();
    }, IDLE_MS);
  }

  function markStale() {
    hintEl.textContent = '(editing…)';
  }

  function requestCheck() {
    if (!editor || !bar) return;
    var source = editor.value || '';
    if (source === lastCheckedSource) {
      dirty = false;
      hintEl.textContent = '';
      return;
    }

    // Only check .asl files
    var fileEl = document.getElementById('currentFile');
    var filename = fileEl ? (fileEl.textContent || '').trim() : 'main.asl';
    if (!filename.endsWith('.asl')) {
      setState('ok', 'Not an ASL file');
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

    lastCheckedSource = source;
    dirty = false;
    var diags = runChecks(source);
    renderDiags(diags);
  }

  /* ── Render ─────────────────────────────────────────────── */
  function setState(state, text) {
    bar.setAttribute('data-state', state);
    summaryEl.textContent = text;
    var icons = {
      ok: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warn: 'fa-triangle-exclamation',
      stale: 'fa-clock'
    };
    mainIcon.className = 'fa-solid ' + (icons[state] || 'fa-circle-check') + ' gl-diag-icon gl-diag-main-icon';
  }

  function setEditorGlow(hasErrors) {
    if (hasErrors) editor.classList.add('has-errors');
    else editor.classList.remove('has-errors');
  }

  function renderDiags(diags) {
    var errors = diags.filter(function (d) { return d.severity === 'error'; });
    var warnings = diags.filter(function (d) { return d.severity === 'warning'; });
    var infos = diags.filter(function (d) { return d.severity === 'info' || d.severity === 'hint'; });

    if (diags.length === 0) {
      setState('ok', 'No issues ✓');
      hintEl.textContent = '';
      setEditorGlow(false);
      panel.innerHTML = '';
      bar.setAttribute('data-open', '0');
      return;
    }

    var parts = [];
    if (errors.length) parts.push(errors.length + ' error' + (errors.length > 1 ? 's' : ''));
    if (warnings.length) parts.push(warnings.length + ' warning' + (warnings.length > 1 ? 's' : ''));
    if (infos.length) parts.push(infos.length + ' hint' + (infos.length > 1 ? 's' : ''));
    setState(errors.length ? 'error' : 'warn', parts.join(', '));
    hintEl.textContent = '';
    setEditorGlow(errors.length > 0);

    if (errors.length) bar.setAttribute('data-open', '1');

    var sevIcons = {
      error: '<i class="fa-solid fa-circle-xmark gl-diag-sev e"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation gl-diag-sev w"></i>',
      info: '<i class="fa-solid fa-circle-info gl-diag-sev i"></i>',
      hint: '<i class="fa-solid fa-lightbulb gl-diag-sev h"></i>'
    };

    panel.innerHTML = diags.map(function (d) {
      var line = d.startLine || 1;
      return '<div class="gl-diag-item" data-line="' + line + '">' +
        '<span class="gl-diag-line">L' + line + '</span>' +
        (sevIcons[d.severity] || sevIcons.info) +
        '<span class="gl-diag-msg">' + esc(d.message) + '</span>' +
        '</div>';
    }).join('');

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

  /* ── Boot ───────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
