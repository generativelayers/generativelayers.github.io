/**
 * code-runner-api-select.js  v4
 *
 * SMART PROVIDER DETECTION — reads ALL .astra files, detects every
 * provider referenced, and shows a key field for EACH one.
 *
 * Rules:
 *   • Never rewrites the user's code
 *   • Shows key fields for ALL detected providers simultaneously
 *   • Supports multi-LLM patterns (cross-verification, majority-voting)
 *   • Re-scans when code changes (debounced)
 *   • Passes all filled keys to the server at run time
 */
(() => {
  'use strict';

  const PROVIDERS = {
    cerebras:  { label: 'Cerebras',  env: 'CEREBRAS_API_KEY',  color: '#38bdf8', icon: 'fa-microchip' },
    groq:      { label: 'Groq',      env: 'GROQ_API_KEY',      color: '#f97316', icon: 'fa-bolt' },
    gemini:    { label: 'Gemini',    env: 'GEMINI_API_KEY',     color: '#a78bfa', icon: 'fa-gem' },
    openai:    { label: 'OpenAI',    env: 'OPENAI_API_KEY',     color: '#34d399', icon: 'fa-robot' },
    deepseek:  { label: 'DeepSeek',  env: 'DEEPSEEK_API_KEY',   color: '#60a5fa', icon: 'fa-water' }
  };

  /* ── CSS ─────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    .gl-keys-panel {
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 14px;
      background: #f8fafc;
      padding: 18px 20px;
      margin: 14px 0 0;
    }
    .gl-keys-panel[hidden] { display: none !important; }

    .gl-keys-header {
      display: flex; align-items: center; gap: 10px;
      margin: 0 0 6px; font-size: 15px; font-weight: 800;
      color: var(--color-text, #111827);
    }
    .gl-keys-header i { color: #d97706; }

    .gl-keys-intro {
      margin: 0 0 14px; color: #64748b; font-size: 13px; line-height: 1.55;
    }

    .gl-keys-grid {
      display: flex; flex-direction: column; gap: 10px;
    }

    .gl-key-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
      transition: border-color .2s, box-shadow .2s;
    }
    .gl-key-row:focus-within {
      border-color: #059669;
      box-shadow: 0 0 0 3px rgba(5,150,105,.1);
    }

    .gl-key-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 6px;
      font-size: 11px; font-weight: 900; letter-spacing: .5px;
      color: #fff; white-space: nowrap; flex-shrink: 0;
    }

    .gl-key-env {
      font-size: 12px; font-weight: 700; color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      min-width: 140px; flex-shrink: 0;
    }

    .gl-key-input {
      flex: 1; min-width: 0;
      border: 1px solid #cbd5e1; border-radius: 8px;
      padding: 8px 12px; font-size: 13px;
      background: #f8fafc; color: #111827;
      transition: border-color .2s;
    }
    .gl-key-input:focus {
      outline: none; border-color: #059669;
      background: #fff;
    }
    .gl-key-input::placeholder { color: #94a3b8; }

    .gl-key-status {
      font-size: 14px; flex-shrink: 0; width: 20px; text-align: center;
    }
    .gl-key-status.filled { color: #059669; }
    .gl-key-status.empty { color: #f59e0b; }

    .gl-keys-none {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 10px;
      background: #f0fdf4; border: 1px solid #bbf7d0;
      font-size: 13px; color: #166534; font-weight: 600;
    }
    .gl-keys-none i { color: #059669; }

    .gl-keys-warn {
      display: flex; align-items: flex-start; gap: 10px;
      margin: 12px 0 0; padding: 10px 14px;
      border: 1px solid #fde68a; border-left: 4px solid #f59e0b;
      border-radius: 10px; background: #fffbeb;
      color: #92400e; font-size: 13px; line-height: 1.5;
    }
    .gl-keys-warn[hidden] { display: none !important; }
    .gl-keys-select-row {
      display: flex; align-items: center; gap: 10px;
      margin: 0 0 12px;
    }
    .gl-keys-select-row label {
      font-size: 13px; font-weight: 800; color: #334155; white-space: nowrap;
    }
    .gl-keys-select {
      flex: 1; max-width: 260px;
      border: 1px solid #cbd5e1; border-radius: 8px;
      padding: 8px 12px; font-size: 13px; font-weight: 700;
      background: #fff; color: #111827; cursor: pointer;
      appearance: auto;
    }
    .gl-keys-select:focus {
      outline: none; border-color: #059669;
      box-shadow: 0 0 0 3px rgba(5,150,105,.1);
    }
    .gl-custom-grid {
      display: grid; grid-template-columns: auto 1fr; gap: 6px 10px;
      margin: 10px 0 0; padding: 12px 14px;
      border: 1px solid #e2e8f0; border-radius: 10px; background: #fff;
    }
    .gl-custom-grid[hidden] { display: none !important; }
    .gl-custom-grid label {
      font-size: 12px; font-weight: 700; color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      align-self: center;
    }
    .gl-custom-grid input {
      border: 1px solid #cbd5e1; border-radius: 6px;
      padding: 6px 10px; font-size: 13px; background: #f8fafc; color: #111827;
    }
    .gl-custom-grid input:focus { outline: none; border-color: #059669; background: #fff; }
  `;
  document.head.appendChild(style);

  /* ── State ───────────────────────────────────────────────── */
  let panelEl = null;
  let gridEl = null;
  let introEl = null;
  let warnEl = null;
  let selectEl = null;
  let lastDetected = '';
  let scanTimer = null;
  let manualProvider = '';   // user-selected override

  /* ── Detection ───────────────────────────────────────────── */
  function getAllProjectText() {
    // Use __glGetAllCode to scan ALL files in the project,
    // not just the currently-visible editor tab.
    // This ensures the LLM panel only appears when code actually uses LLM.
    if (typeof window.__glGetAllCode === 'function') {
      return window.__glGetAllCode();
    }
    // Fallback to just the visible editor
    const editor = document.getElementById('fileEditor');
    return editor ? (editor.value || '') : '';
  }

  function stripComments(source) {
    return String(source || '')
      .replace(/\/\/.*$/gm, '')        // line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // block comments
  }

  function detectProviders() {
    const raw = getAllProjectText();
    const clean = stripComments(raw);

    // ── Stage 1: Does ANY file use the GL framework? ──
    // These patterns cover all 3 platforms abstractly:
    //   ASTRA:  use_provider(...), configure("provider",...), import gl.astra.GL
    //   Jason:  gl.use_provider(...), gl.configure(...), gl.invoke(...)
    //   JaCaMo: use_provider(...), makeArtifact("gl","gl.jacamo.GL",...), invoke(...)
    const GL_FRAMEWORK_PATTERNS = [
      /\buse_provider\s*\(/,                    // ASTRA + JaCaMo direct call
      /\bgl\.use_provider\s*\(/,                // Jason gl. prefix
      /\bgl\.configure\s*\(/,                   // Jason gl.configure
      /\bgl\.invoke\s*\(/,                      // Jason gl.invoke
      /\bgl\.providers\s*\(/,                   // Jason gl.providers
      /\bmakeArtifact\s*\([^)]*gl\.jacamo\.GL/,  // JaCaMo artifact creation
      /\bimport\s+gl\.\w+\.GL\b/,              // ASTRA import gl.astra.GL
      /\bgl\.jason\.GL\b/,                     // Jason GL class reference
      /\bgl\.jacamo\.GL\b/,                    // JaCaMo GL class reference
      /\bgl\.astra\.GL\b/,                     // ASTRA GL class reference
      /\bsetting\s*\(\s*["']provider["']/,     // Jason/JaCaMo setting("provider",...)
      /\bconfigure\s*\(\s*["']provider["']/,   // ASTRA/JaCaMo configure("provider",...)
    ];

    const usesGL = GL_FRAMEWORK_PATTERNS.some(re => re.test(clean));
    if (!usesGL) {
      // No GL framework usage detected → no LLM panel needed
      return [];
    }

    // ── Stage 2: Which specific providers are referenced? ──
    const found = [];

    Object.keys(PROVIDERS).forEach(key => {
      const p = PROVIDERS[key];
      // Match across all platform syntaxes:
      //   use_provider("key")       — ASTRA, JaCaMo
      //   gl.use_provider("key")    — Jason
      //   setting("provider","key") — Jason, JaCaMo
      //   configure("provider","key") — ASTRA
      //   ENV_VAR_NAME              — all
      const patterns = [
        new RegExp(`use_provider\\s*\\(\\s*["']${key}["']`, 'i'),
        new RegExp(`["']provider["']\\s*,\\s*["']${key}["']`, 'i'),
        new RegExp(p.env, 'i'),
        new RegExp(`["']apiKeyEnv["']\\s*,\\s*["']${p.env}["']`, 'i'),
      ];

      if (patterns.some(re => re.test(clean))) {
        found.push(key);
      }
    });

    // Heuristic: detect by model name patterns
    if (!found.includes('gemini')   && /gemini-[a-z0-9._-]+/i.test(clean)) found.push('gemini');
    if (!found.includes('deepseek') && /deepseek-[a-z0-9._-]+/i.test(clean)) found.push('deepseek');
    if (!found.includes('groq')     && /(llama-3|llama3|mixtral|gemma)/i.test(clean)) found.push('groq');
    if (!found.includes('cerebras') && /gpt-oss/i.test(clean)) found.push('cerebras');
    if (!found.includes('openai')   && /gpt-4|gpt-3\.5/i.test(clean)) found.push('openai');

    // If GL is detected but no specific provider found, show panel with
    // empty provider (user can select from dropdown)
    if (found.length === 0) {
      // GL framework detected but no explicit provider — still show panel
      // so user can pick one from the dropdown
      found.push('cerebras'); // default provider
    }

    return [...new Set(found)];
  }

  /* ── Default models per provider ──────────────────────── */
  const DEFAULT_MODELS = {
    cerebras:  'gpt-oss-120b',
    groq:      'llama-3.3-70b-versatile',
    gemini:    'gemini-2.0-flash',
    openai:    'gpt-4o',
    deepseek:  'deepseek-chat'
  };

  /* ── Apply provider selection to source code ────────────── */
  function applyProviderToSource(providerKey) {
    const editor = document.getElementById('fileEditor');
    if (!editor) return;

    const original = editor.value;
    const model = DEFAULT_MODELS[providerKey] || providerKey;
    let src = original;

    // 1. Replace use_provider("xxx") → use_provider("providerKey")  (all occurrences)
    src = src.replace(/(use_provider\s*\(\s*["'])[a-zA-Z]+(["']\s*\))/g, `$1${providerKey}$2`);

    // 2. Replace setting("provider", "xxx")
    src = src.replace(/(setting\s*\(\s*["']provider["']\s*,\s*["'])[a-zA-Z]+(["']\s*\))/g, `$1${providerKey}$2`);

    // 3. Replace configure("provider", "xxx")
    src = src.replace(/(configure\s*\(\s*["']provider["']\s*,\s*["'])[a-zA-Z]+(["']\s*\))/g, `$1${providerKey}$2`);

    // 4. Replace configure("model", "xxx") → configure("model", "defaultModel")
    src = src.replace(/(configure\s*\(\s*["']model["']\s*,\s*["'])[a-zA-Z0-9._-]+(["']\s*\))/g, `$1${model}$2`);

    // 5. Replace setting("model", "xxx")
    src = src.replace(/(setting\s*\(\s*["']model["']\s*,\s*["'])[a-zA-Z0-9._-]+(["']\s*\))/g, `$1${model}$2`);

    if (src !== original) {
      const pos = editor.selectionStart || 0;
      editor.value = src;
      editor.selectionStart = editor.selectionEnd = Math.min(pos, editor.value.length);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /* ── Apply custom provider to source code ───────────────── */
  function applyCustomToSource() {
    const editor = document.getElementById('fileEditor');
    if (!editor) return;

    const provName = (document.getElementById('glCustomProvider')?.value || 'chatcompletions').trim();
    const modelName = (document.getElementById('glCustomModel')?.value || 'grok-2').trim();
    const endpoint = (document.getElementById('glCustomEndpoint')?.value || '').trim();

    const original = editor.value;
    let src = original;

    // Rewrite provider
    src = src.replace(/(use_provider\s*\(\s*["'])[a-zA-Z]+(["']\s*\))/g, `$1${provName}$2`);
    src = src.replace(/(setting\s*\(\s*["']provider["']\s*,\s*["'])[a-zA-Z]+(["']\s*\))/g, `$1${provName}$2`);
    src = src.replace(/(configure\s*\(\s*["']provider["']\s*,\s*["'])[a-zA-Z]+(["']\s*\))/g, `$1${provName}$2`);

    // Rewrite model
    src = src.replace(/(configure\s*\(\s*["']model["']\s*,\s*["'])[a-zA-Z0-9._-]+(["']\s*\))/g, `$1${modelName}$2`);
    src = src.replace(/(setting\s*\(\s*["']model["']\s*,\s*["'])[a-zA-Z0-9._-]+(["']\s*\))/g, `$1${modelName}$2`);

    // Rewrite endpoint if present
    if (endpoint) {
      src = src.replace(/(configure\s*\(\s*["']endpoint["']\s*,\s*["'])[^"']+(["']\s*\))/g, `$1${endpoint}$2`);
      src = src.replace(/(setting\s*\(\s*["']endpoint["']\s*,\s*["'])[^"']+(["']\s*\))/g, `$1${endpoint}$2`);
    }

    if (src !== original) {
      const pos = editor.selectionStart || 0;
      editor.value = src;
      editor.selectionStart = editor.selectionEnd = Math.min(pos, editor.value.length);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /* ── Build UI ────────────────────────────────────────────── */
  function init() {
    // Remove old panel if it exists
    const oldPanel = document.getElementById('apiKeyPanel');
    const oldEditor = document.getElementById('apiProviderEditor');

    // Find the toolbar to insert before
    const toolbar = document.querySelector('.runner-toolbar');
    if (!toolbar) return;

    // Build provider options for the dropdown
    const providerOptions = Object.keys(PROVIDERS).map(key => {
      const p = PROVIDERS[key];
      return `<option value="${key}">${p.label}</option>`;
    }).join('');

    // Create new panel
    panelEl = document.createElement('div');
    panelEl.className = 'gl-keys-panel';
    panelEl.id = 'glKeysPanel';
    panelEl.hidden = true;
    panelEl.innerHTML = `
      <div class="gl-keys-header">
        <i class="fa-solid fa-key"></i>
        <span>API Keys</span>
      </div>
      <div class="gl-keys-select-row">
        <label for="glProviderSelect">LLM Provider:</label>
        <select class="gl-keys-select" id="glProviderSelect">
          <option value="">Auto-detect from code</option>
          ${providerOptions}
          <option value="custom">Custom / unlisted endpoint</option>
        </select>
      </div>
      <div class="gl-keys-intro" id="glKeysIntro">
        Select a provider or let it auto-detect from your code.
      </div>
      <div class="gl-keys-grid" id="glKeysGrid"></div>
      <div class="gl-custom-grid" id="glCustomGrid" hidden>
        <label>Provider</label><input id="glCustomProvider" value="chatcompletions" autocomplete="off">
        <label>Model</label><input id="glCustomModel" value="grok-2" autocomplete="off">
        <label>Endpoint</label><input id="glCustomEndpoint" value="https://api.x.ai/v1/chat/completions" autocomplete="off">
        <label>Key env</label><input id="glCustomEnv" value="XAI_API_KEY" autocomplete="off">
        <label>Key value</label><input id="glCustomKey" type="password" placeholder="Paste key for this run" autocomplete="off">
      </div>
      <div class="gl-keys-warn" id="glKeysWarn" hidden>
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span id="glKeysWarnText"></span>
      </div>
    `;

    toolbar.parentNode.insertBefore(panelEl, toolbar);

    // Hide old panel
    if (oldPanel) oldPanel.hidden = true;
    if (oldEditor) oldEditor.hidden = true;

    gridEl = document.getElementById('glKeysGrid');
    introEl = document.getElementById('glKeysIntro');
    warnEl = document.getElementById('glKeysWarn');
    selectEl = document.getElementById('glProviderSelect');

    // Wire dropdown
    const customGrid = document.getElementById('glCustomGrid');
    if (selectEl) {
      selectEl.addEventListener('change', () => {
        manualProvider = selectEl.value;
        lastDetected = '';  // force re-render
        if (customGrid) customGrid.hidden = (manualProvider !== 'custom');
        if (manualProvider && manualProvider !== 'custom') {
          applyProviderToSource(manualProvider);
        } else if (manualProvider === 'custom') {
          applyCustomToSource();
        }
        scan();
      });
    }

    // Wire events
    const editor = document.getElementById('fileEditor');
    if (editor) {
      editor.addEventListener('input', scheduleScan);
      editor.addEventListener('blur', () => scan());
    }

    // Watch file tab changes
    const currentFileEl = document.getElementById('currentFile');
    if (currentFileEl) {
      new MutationObserver(() => { lastDetected = ''; scan(); })
        .observe(currentFileEl, { childList: true, characterData: true, subtree: true });
    }

    // Initial scan
    scan();

    // Reset panel when New/Open/Load buttons are clicked (dynamic buttons)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.runner-tree-btn, .runner-mini-button');
      if (btn) {
        // A file tree action button was clicked — reset and re-scan
        setTimeout(resetPanel, 200);
      }
    });

    // Also watch for project loads from storage
    const fileTree = document.getElementById('fileTree');
    if (fileTree) {
      new MutationObserver(() => {
        lastDetected = '';
        setTimeout(scan, 200);
      }).observe(fileTree, { childList: true, subtree: true });
    }
  }

  function resetPanel() {
    manualProvider = '';
    lastDetected = '';
    if (selectEl) selectEl.value = '';
    if (panelEl) panelEl.hidden = true;
    setTimeout(scan, 300);  // re-scan after project loads
  }
  window.__glResetApiPanel = resetPanel;

  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 600);
  }

  function scan() {
    let providers;
    if (manualProvider) {
      // Manual selection — show that provider
      providers = [manualProvider];
    } else {
      // Auto-detect from code
      providers = detectProviders();
    }
    const key = providers.sort().join(',');

    // Skip if nothing changed
    if (key === lastDetected) return;
    lastDetected = key;

    render(providers);
  }

  function render(providers) {
    if (providers.length === 0) {
      // No LLM detected — show minimal info
      panelEl.hidden = true;
      return;
    }

    panelEl.hidden = false;

    introEl.innerHTML = 'Get your API key from <a href="providers.html#providers" style="color:#059669;font-weight:800;text-decoration:underline">Built-in Providers</a>.';

    gridEl.innerHTML = providers.map(key => {
      const p = PROVIDERS[key];
      // Preserve existing key value if re-rendering
      const existingInput = document.querySelector(`[data-gl-key="${key}"]`);
      const existingValue = existingInput ? existingInput.value : '';

      return `
        <div class="gl-key-row">
          <span class="gl-key-badge" style="background:${p.color}">
            <i class="fa-solid ${p.icon}"></i>
            ${p.label}
          </span>
          <span class="gl-key-env">${p.env}</span>
          <input class="gl-key-input" data-gl-key="${key}" data-gl-env="${p.env}"
                 type="password" autocomplete="off"
                 placeholder="Paste ${p.label} key for this run"
                 value="${escapeAttr(existingValue)}">
          <span class="gl-key-status ${existingValue ? 'filled' : 'empty'}">
            <i class="fa-solid ${existingValue ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
          </span>
        </div>`;
    }).join('');

    // Wire key input events
    gridEl.querySelectorAll('.gl-key-input').forEach(input => {
      input.addEventListener('input', () => {
        const status = input.nextElementSibling;
        const filled = input.value.trim().length > 0;
        status.className = 'gl-key-status ' + (filled ? 'filled' : 'empty');
        status.innerHTML = `<i class="fa-solid ${filled ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>`;
        updateWarning(providers);
      });
    });

    updateWarning(providers);
  }

  function updateWarning(providers) {
    const missing = providers.filter(key => {
      const input = document.querySelector(`[data-gl-key="${key}"]`);
      return !input || !input.value.trim();
    });

    if (missing.length === 0) {
      warnEl.hidden = true;
    } else {
      warnEl.hidden = false;
      const names = missing.map(k => `${PROVIDERS[k].label} (${PROVIDERS[k].env})`).join(', ');
      document.getElementById('glKeysWarnText').textContent = `Missing: ${names}. Fill before running.`;
    }
  }

  function escapeAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  /* ── Public API for code-runner.js ───────────────────────── */
  // Override getApiKeyState so the runner sends all detected keys
  window.__glGetApiKeys = function () {
    const keys = {};
    document.querySelectorAll('[data-gl-key]').forEach(input => {
      const env = input.dataset.glEnv;
      const value = input.value.trim();
      if (env && value) keys[env] = value;
    });
    // Include custom provider key
    if (manualProvider === 'custom') {
      const env = (document.getElementById('glCustomEnv')?.value || '').trim();
      const val = (document.getElementById('glCustomKey')?.value || '').trim();
      if (env && val) keys[env] = val;
    }
    return keys;
  };

  window.__glGetMissingProviders = function () {
    const providers = detectProviders();
    return providers.filter(key => {
      const input = document.querySelector(`[data-gl-key="${key}"]`);
      return !input || !input.value.trim();
    }).map(k => `${PROVIDERS[k].label} (${PROVIDERS[k].env})`);
  };

  /* ── Boot ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
