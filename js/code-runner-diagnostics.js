/**
 * code-runner-diagnostics.js  v5
 *
 * ASTRA diagnostics for the web runner.
 *
 * Two-layer architecture:
 *   1. CLIENT-SIDE LINT — instant checks ported from astra-diagnostics-vscode
 *      (runs on every edit, no server call needed)
 *   2. SERVER-SIDE COMPILER — calls POST /api/check-astra for the full
 *      ASTRA compiler check (rate-limited, debounced)
 *
 * Both layers' results are merged and deduplicated before rendering.
 *
 * SMART TRIGGERING:
 *   • Ctrl+S (save gesture)
 *   • Editor blur
 *   • File tab switch
 *   • Before "Run Project" (pre-flight)
 *   • 3s idle fallback
 *   • Rate-limited: max 1 server check per 8 seconds
 */
(function () {
  'use strict';

  var CHECK_URL = 'https://code.generativelayers.com/api/check-astra';
  var IDLE_MS = 3000;
  var RATE_LIMIT_MS = 8000;

  /* ── Inject CSS ─────────────────────────────────────────────── */
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
    '.gl-diag-bar[data-state="offline"]{color:#94a3b8;}',
    '.gl-diag-bar[data-state="stale"]{color:#94a3b8;border-color:#334155;}',
    '.gl-diag-icon{font-size:14px;flex-shrink:0;transition:transform .15s;}',
    '.gl-diag-summary{flex:1;}',
    '.gl-diag-hint{font-size:10px;color:#475569;font-weight:500;margin-left:4px;}',
    '.gl-diag-chevron{margin-left:auto;font-size:10px;color:#475569;transition:transform .25s ease;}',
    '.gl-diag-bar[data-open="1"] .gl-diag-chevron{transform:rotate(180deg);}',
    '.gl-diag-spin{display:none;animation:glDiagSpin .7s linear infinite;}',
    '.gl-diag-bar[data-state="checking"] .gl-diag-spin{display:inline-block;}',
    '.gl-diag-bar[data-state="checking"] .gl-diag-main-icon{display:none;}',
    '@keyframes glDiagSpin{to{transform:rotate(360deg);}}',
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

  /* ── State ──────────────────────────────────────────────────── */
  var editor, bar, panel, summaryEl, mainIcon, hintEl;
  var idleTimer = null, abortCtrl = null;
  var lastCheckedSource = '';
  var lastCheckTime = 0;
  var dirty = false;
  var lastClientDiags = [];   // client-side lint results
  var lastServerDiags = null; // server compiler results (null = not yet received)

  /* ═══════════════════════════════════════════════════════════════
   *  LAYER 1: CLIENT-SIDE LINT CHECKS
   *  Ported from astra-diagnostics-vscode (syntactic-checks.ts)
   * ═══════════════════════════════════════════════════════════════ */

  function stripComments(src) {
    // Strip block comments, line comments, and string literal contents
    // (preserving newlines so line numbers stay correct)
    return src.replace(/\/\*[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, ' '); })
              .replace(/\/\/.*$/gm, function (m) { return ' '.repeat(m.length); })
              .replace(/"[^"]*"/g, function (m) { return '"' + ' '.repeat(Math.max(0, m.length - 2)) + '"'; });
  }

  function lineOfOffset(text, offset) {
    return text.substring(0, offset).split('\n').length;
  }

  function isTypesOnlyAgent(stripped) {
    var m = stripped.match(/\bagent\s+\w+[^{]*\{/);
    if (!m || m.index === undefined) return false;
    var depth = 1, i = m.index + m[0].length;
    while (i < stripped.length && depth > 0) {
      if (stripped[i] === '{') depth++;
      else if (stripped[i] === '}') depth--;
      i++;
    }
    var body = stripped.substring(m.index + m[0].length, i - 1);
    return !/\brule\s+/.test(body) && !/\binitial\s+/.test(body) && !/\bmodule\s+/.test(body);
  }

  // ── Check: Missing +!main rule ──
  function checkMissingMain(stripped, diags) {
    var am = stripped.match(/\bagent\s+(\w+)/);
    if (!am) return;
    if (isTypesOnlyAgent(stripped)) return;
    if (/\bagent\s+\w+\s+extends\b/.test(stripped)) return;
    if (/\brule\s+@message\s*\(/.test(stripped)) return;
    if (/\brule\s+\$/.test(stripped)) return;
    if (/\brule\s+[+\-](?!!)\w+\s*\(/.test(stripped)) return;
    if (/\binitial\s+!\w+\s*\(/.test(stripped)) return;
    if (!/\brule\s+\+!main\s*\(/.test(stripped)) {
      diags.push({ startLine: lineOfOffset(stripped, am.index), severity: 'info', message: 'No +!main(...) rule — this agent will not start automatically' });
    }
  }

  // ── Check: Empty rule bodies { } ──
  function checkEmptyRuleBody(stripped, diags) {
    var triggers = {};
    var tp = /\brule\s+([+\-@!$]+\s*\w+)/g;
    var tm;
    while ((tm = tp.exec(stripped)) !== null) {
      var k = tm[1].replace(/\s+/g, '');
      triggers[k] = (triggers[k] || 0) + 1;
    }
    var re = /\brule\b([^{]*)\{\s*\}/g;
    var m;
    while ((m = re.exec(stripped)) !== null) {
      var header = m[1];
      if (header.indexOf(':') !== -1) continue;
      var trm = header.match(/([+\-@!$]+\s*\w+)/);
      if (trm) {
        var trig = trm[1].replace(/\s+/g, '');
        if ((triggers[trig] || 0) > 1) continue;
      }
      diags.push({ startLine: lineOfOffset(stripped, m.index), severity: 'warning', message: 'Empty rule body — this rule does nothing' });
    }
  }

  // ── Check: Unclosed braces ──
  function checkUnclosedBraces(stripped, diags) {
    var depth = 0, lastOpenLine = -1;
    var lines = stripped.split('\n');
    for (var i = 0; i < lines.length; i++) {
      for (var j = 0; j < lines[i].length; j++) {
        if (lines[i][j] === '{') { depth++; lastOpenLine = i + 1; }
        else if (lines[i][j] === '}') {
          depth--;
          if (depth < 0) {
            diags.push({ startLine: i + 1, severity: 'error', message: 'Unexpected closing brace — no matching opening brace' });
            depth = 0;
          }
        }
      }
    }
    if (depth > 0 && lastOpenLine >= 0) {
      diags.push({ startLine: lastOpenLine, severity: 'error', message: 'Unclosed brace — ' + depth + ' opening brace(s) without matching close' });
    }
  }

  // ── Check: Agent name ≠ file name ──
  function checkAgentNameMismatch(stripped, filename, diags) {
    var am = stripped.match(/\bagent\s+(\w+)/);
    if (!am) return;
    var expected = filename.replace(/\.astra$/, '');
    if (am[1] !== expected) {
      diags.push({ startLine: lineOfOffset(stripped, am.index), severity: 'warning', message: 'Agent name "' + am[1] + '" does not match file name "' + expected + '" — ASTRA requires these to match' });
    }
  }

  // ── Check: Duplicate module aliases ──
  function checkDuplicateModuleAliases(stripped, diags) {
    var re = /\bmodule\s+\S+\s+(\w+)\s*;/g;
    var seen = {};
    var m;
    while ((m = re.exec(stripped)) !== null) {
      var alias = m[1];
      var line = lineOfOffset(stripped, m.index);
      if (seen[alias] !== undefined) {
        diags.push({ startLine: line, severity: 'warning', message: 'Duplicate module alias "' + alias + '" — already declared on line ' + seen[alias] });
      } else {
        seen[alias] = line;
      }
    }
  }

  // ── Check: Subgoal without rule ──
  function checkSubgoalWithoutRule(stripped, diags) {
    var ruleGoals = {};
    var rp = /\brule\s+\+!(\w+)\s*\(/g;
    var rm;
    while ((rm = rp.exec(stripped)) !== null) ruleGoals[rm[1]] = true;
    // Find !goalName() in rule bodies
    var bodyRe = /\brule\s+[^{]*\{([\s\S]*?)\}/g;
    var bm;
    while ((bm = bodyRe.exec(stripped)) !== null) {
      var body = bm[1];
      var goalRe = /(?<!\+)!(\w+)\s*\(/g;
      var gm;
      while ((gm = goalRe.exec(body)) !== null) {
        if (!ruleGoals[gm[1]] && gm[1] !== 'main') {
          diags.push({ startLine: lineOfOffset(stripped, bm.index + gm.index + bm[0].indexOf(body)), severity: 'info', message: 'Subgoal !' + gm[1] + '() has no matching +!' + gm[1] + '() rule' });
        }
      }
    }
  }

  // ── Check: Orphaned else/else-if ──
  function checkOrphanedElse(stripped, diags) {
    var lines = stripped.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^\}\s*else\b/.test(line) || /^else\b/.test(line)) continue; // properly attached
      if (/^else\s*(if\s*)?\{/.test(line) || /^else\s*(if\s*)?\(/.test(line)) {
        // Check if previous non-empty line ends with }
        var prev = '';
        for (var k = i - 1; k >= 0; k--) {
          prev = lines[k].trim();
          if (prev.length > 0) break;
        }
        if (prev && !prev.endsWith('}')) {
          diags.push({ startLine: i + 1, severity: 'error', message: 'Orphaned else — not preceded by closing } from if block' });
        }
      }
    }
  }

  // ── Check: Non-atomic belief update (-b then +b instead of -+b) ──
  function checkNonAtomicBeliefUpdate(stripped, diags) {
    var bodyRe = /\brule\s+[^{]*\{([\s\S]*?)\}/g;
    var bm;
    while ((bm = bodyRe.exec(stripped)) !== null) {
      var body = bm[1];
      var retracted = {};
      var retRe = /-((?!\+)\w+)\s*\(/g;
      var rm;
      while ((rm = retRe.exec(body)) !== null) {
        retracted[rm[1]] = lineOfOffset(stripped, bm.index + body.indexOf(rm[0]) + bm[0].indexOf(body));
      }
      var addRe = /\+(\w+)\s*\(/g;
      var am;
      while ((am = addRe.exec(body)) !== null) {
        if (retracted[am[1]] !== undefined) {
          diags.push({ startLine: retracted[am[1]], severity: 'info', message: 'Non-atomic belief update: -' + am[1] + '() then +' + am[1] + '() — use -+' + am[1] + '() instead' });
        }
      }
    }
  }

  // ── Check: Recursion without base case ──
  function checkRecursionNoBase(stripped, diags) {
    var rules = {};
    var re = /\brule\s+(\+!\w+)\s*\([^)]*\)\s*(?::\s*[^{]*)?\{([\s\S]*?)\}/g;
    var m;
    while ((m = re.exec(stripped)) !== null) {
      var trigger = m[1];
      if (!rules[trigger]) rules[trigger] = [];
      rules[trigger].push({ body: m[2], line: lineOfOffset(stripped, m.index), hasContext: /:\s*[^{]/.test(m[0].substring(0, m[0].indexOf('{'))) });
    }
    for (var trig in rules) {
      var group = rules[trig];
      if (group.length < 1) continue;
      var hasRecursive = false, hasBase = false;
      var goalName = trig.replace('+!', '');
      for (var i = 0; i < group.length; i++) {
        if (group[i].body.indexOf('!' + goalName + '(') !== -1) hasRecursive = true;
        else hasBase = true;
      }
      if (hasRecursive && !hasBase) {
        diags.push({ startLine: group[0].line, severity: 'warning', message: 'Recursive rule ' + trig + '() has no base case — non-termination risk' });
      }
    }
  }

  // ── Check: Complex rule body (15+ statements) ──
  function checkComplexRuleBody(stripped, diags) {
    var re = /\brule\s+[^{]*\{([\s\S]*?)\}/g;
    var m;
    while ((m = re.exec(stripped)) !== null) {
      var body = m[1];
      var stmts = body.split(';').length;
      if (stmts >= 15) {
        diags.push({ startLine: lineOfOffset(stripped, m.index), severity: 'info', message: 'Rule body has ' + stmts + ' statements — consider decomposing into subgoals' });
      }
    }
  }

  // ── Check: Missing catch-all (all rules have contexts) ──
  function checkMissingCatchAll(stripped, diags) {
    var ruleGoals = {};
    var re = /\brule\s+(\+!\w+)\s*\([^)]*\)\s*(:\s*[^{]*)?\{/g;
    var m;
    while ((m = re.exec(stripped)) !== null) {
      var trigger = m[1];
      var hasCtx = m[2] && m[2].trim().length > 1; // ":" alone is empty
      if (!ruleGoals[trigger]) ruleGoals[trigger] = { total: 0, withCtx: 0, line: lineOfOffset(stripped, m.index) };
      ruleGoals[trigger].total++;
      if (hasCtx) ruleGoals[trigger].withCtx++;
    }
    for (var trig in ruleGoals) {
      var g = ruleGoals[trig];
      if (g.total >= 2 && g.total === g.withCtx) {
        diags.push({ startLine: g.line, severity: 'info', message: 'All rules for ' + trig + '() have contexts — no default fallback if all fail' });
      }
    }
  }

  // ── Check: Repeated string literals ──
  function checkRepeatedLiterals(stripped, diags) {
    var re = /"([^"]{4,})"/g;
    var counts = {};
    var m;
    while ((m = re.exec(stripped)) !== null) {
      var s = m[1];
      if (!counts[s]) counts[s] = { count: 0, line: lineOfOffset(stripped, m.index) };
      counts[s].count++;
    }
    for (var s in counts) {
      if (counts[s].count >= 3) {
        diags.push({ startLine: counts[s].line, severity: 'info', message: 'String "' + s + '" appears ' + counts[s].count + ' times — consider using a constant' });
      }
    }
  }

  // ── Check: Duplicate types block names ──
  function checkDuplicateTypesBlocks(stripped, diags) {
    var re = /\btypes\s+(\w+)\s*\{/g;
    var seen = {};
    var m;
    while ((m = re.exec(stripped)) !== null) {
      var name = m[1];
      var line = lineOfOffset(stripped, m.index);
      if (seen[name] !== undefined) {
        diags.push({ startLine: line, severity: 'warning', message: 'Duplicate types block "' + name + '" — compiler rejects as "Duplicate Ontology" (first at line ' + seen[name] + ')' });
      } else {
        seen[name] = line;
      }
    }
  }

  // ── Check: Empty types block ──
  function checkEmptyTypesBlock(stripped, diags) {
    var re = /\btypes\s+\w+\s*\{\s*\}/g;
    var m;
    while ((m = re.exec(stripped)) !== null) {
      diags.push({ startLine: lineOfOffset(stripped, m.index), severity: 'warning', message: 'Empty types block — declares no formulas' });
    }
  }

  // ── Check: Duplicate formula declarations ──
  function checkDuplicateFormulas(stripped, diags) {
    var re = /\bformula\s+(\w+)\s*\(([^)]*)\)/g;
    var seen = {};
    var m;
    while ((m = re.exec(stripped)) !== null) {
      var sig = m[1] + '/' + m[2].split(',').length;
      var line = lineOfOffset(stripped, m.index);
      if (seen[sig] !== undefined) {
        diags.push({ startLine: line, severity: 'warning', message: 'Duplicate formula "' + m[1] + '" with same arity (first at line ' + seen[sig] + ')' });
      } else {
        seen[sig] = line;
      }
    }
  }

  /** Run all client-side ASTRA lint checks */
  function runClientChecks(source, filename) {
    var diags = [];
    var stripped = stripComments(source);
    checkUnclosedBraces(stripped, diags);
    checkMissingMain(stripped, diags);
    checkEmptyRuleBody(stripped, diags);
    checkAgentNameMismatch(stripped, filename, diags);
    checkDuplicateModuleAliases(stripped, diags);
    checkOrphanedElse(stripped, diags);
    checkSubgoalWithoutRule(stripped, diags);
    checkNonAtomicBeliefUpdate(stripped, diags);
    checkRecursionNoBase(stripped, diags);
    checkComplexRuleBody(stripped, diags);
    checkMissingCatchAll(stripped, diags);
    checkRepeatedLiterals(stripped, diags);
    checkDuplicateTypesBlocks(stripped, diags);
    checkEmptyTypesBlock(stripped, diags);
    checkDuplicateFormulas(stripped, diags);
    return diags;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  MERGE & DEDUP
   * ═══════════════════════════════════════════════════════════════ */
  function mergeDiags(clientDiags, serverDiags) {
    // Server diags (compiler errors) always take precedence
    var all = (serverDiags || []).slice();
    var keys = {};
    for (var i = 0; i < all.length; i++) {
      keys[all[i].startLine + ':' + all[i].message.substring(0, 40)] = true;
    }
    // Add client diags that don't duplicate server ones
    for (var j = 0; j < clientDiags.length; j++) {
      var d = clientDiags[j];
      var key = d.startLine + ':' + d.message.substring(0, 40);
      if (!keys[key]) {
        all.push(d);
        keys[key] = true;
      }
    }
    // Sort by severity priority then line
    var sevOrder = { error: 0, warning: 1, info: 2, hint: 3 };
    all.sort(function (a, b) {
      var sa = sevOrder[a.severity] !== undefined ? sevOrder[a.severity] : 9;
      var sb = sevOrder[b.severity] !== undefined ? sevOrder[b.severity] : 9;
      if (sa !== sb) return sa - sb;
      return (a.startLine || 0) - (b.startLine || 0);
    });
    return all;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  UI
   * ═══════════════════════════════════════════════════════════════ */

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
      '<i class="fa-solid fa-spinner gl-diag-spin gl-diag-icon"></i>',
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
        requestCheck('save');
      }
    });

    // Blur
    editor.addEventListener('blur', function () {
      if (dirty) requestCheck('blur');
    });

    // Input — instant client-side lint + mark dirty for server
    editor.addEventListener('input', function () {
      dirty = true;
      runClientLintNow();
      resetIdleTimer();
    });

    // File tab switch
    var currentFileEl = document.getElementById('currentFile');
    if (currentFileEl) {
      var obs = new MutationObserver(function () {
        lastCheckedSource = '';
        lastServerDiags = null;
        dirty = true;
        requestCheck('tab');
      });
      obs.observe(currentFileEl, { childList: true, characterData: true, subtree: true });
    }

    // Before Run
    var runBtn = document.getElementById('runAstraButton');
    if (runBtn) {
      runBtn.addEventListener('click', function () {
        if (dirty) requestCheck('run');
      }, true);
    }

    dirty = true;
    setTimeout(function () { requestCheck('init'); }, 1000);
  }

  /** Run client-side lint immediately and render (no server wait) */
  function runClientLintNow() {
    if (!editor || !bar) return;
    var source = editor.value || '';
    var fileEl = document.getElementById('currentFile');
    var filename = fileEl ? (fileEl.textContent || '').trim() : 'Main.astra';
    if (!filename.endsWith('.astra') || !source.trim()) return;

    lastClientDiags = runClientChecks(source, filename.split('/').pop());

    // Render client-only diags immediately (server results merged when available)
    var merged = mergeDiags(lastClientDiags, lastServerDiags);
    renderDiags(merged, lastServerDiags !== null);
    hintEl.textContent = lastServerDiags === null ? '(awaiting compiler…)' : '(editing…)';
  }

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (dirty) requestCheck('idle');
    }, IDLE_MS);
  }

  function requestCheck(trigger) {
    if (!editor || !bar) return;
    var now = Date.now();
    var source = editor.value || '';
    if (source === lastCheckedSource) {
      dirty = false;
      hintEl.textContent = '';
      return;
    }
    var elapsed = now - lastCheckTime;
    if (elapsed < RATE_LIMIT_MS && trigger !== 'save' && trigger !== 'run' && trigger !== 'init' && trigger !== 'tab') {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        requestCheck('deferred');
      }, RATE_LIMIT_MS - elapsed + 100);
      return;
    }
    doCheck(source);
  }

  function doCheck(source) {
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

    // Run client checks immediately
    lastClientDiags = runClientChecks(source, filename.split('/').pop());

    // Render client-only results first
    var clientOnly = mergeDiags(lastClientDiags, null);
    if (clientOnly.length > 0) {
      renderDiags(clientOnly, false);
    }

    // Then call server
    if (abortCtrl) { try { abortCtrl.abort(); } catch (e) {} }
    abortCtrl = new AbortController();
    setState('checking', 'Compiling…');
    hintEl.textContent = '';

    var headers = { 'Content-Type': 'application/json' };
    var token = sessionStorage.getItem('gl_user_token');
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    fetch(CHECK_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers: headers,
      body: JSON.stringify({ source: source, filename: filename.split('/').pop() }),
      signal: abortCtrl.signal
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      lastCheckedSource = source;
      lastCheckTime = Date.now();
      dirty = false;
      lastServerDiags = Array.isArray(data) ? data : (data.diagnostics || []);
      var merged = mergeDiags(lastClientDiags, lastServerDiags);
      renderDiags(merged, true);
      hintEl.textContent = '';
    })
    .catch(function (err) {
      if (err.name === 'AbortError') return;
      // Server offline — show client-only results
      lastServerDiags = null;
      var merged = mergeDiags(lastClientDiags, null);
      if (merged.length > 0) {
        renderDiags(merged, false);
        hintEl.textContent = '(compiler offline)';
      } else {
        setState('offline', 'Compiler offline — lint OK ✓');
        hintEl.textContent = '';
        setEditorGlow(false);
      }
      lastCheckedSource = source;
      lastCheckTime = Date.now();
      dirty = false;
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
    if (hasErrors) editor.classList.add('has-errors');
    else editor.classList.remove('has-errors');
  }

  function renderDiags(diags, compilerDone) {
    var errors = diags.filter(function (d) { return d.severity === 'error'; });
    var warnings = diags.filter(function (d) { return d.severity === 'warning'; });
    var infos = diags.filter(function (d) { return d.severity === 'info' || d.severity === 'hint'; });

    if (diags.length === 0) {
      var msg = compilerDone ? 'No issues — compiled OK ✓' : 'No issues ✓';
      setState('ok', msg);
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
    setState(errors.length ? 'error' : warnings.length ? 'warn' : 'warn', parts.join(', '));
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

  /* ── Boot ───────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
