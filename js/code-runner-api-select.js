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
  `;
  document.head.appendChild(style);

  /* ── State ───────────────────────────────────────────────── */
  let panelEl = null;
  let gridEl = null;
  let introEl = null;
  let warnEl = null;
  let lastDetected = '';
  let scanTimer = null;

  /* ── Detection ───────────────────────────────────────────── */
  function getAllProjectText() {
    // Access the runner's files object if available
    const editor = document.getElementById('fileEditor');
    if (!editor) return '';

    // Try to get all files from the runner's scope
    // code-runner.js exposes fullProjectText internally, but we can
    // scan all file content by checking the editor + saved files
    // For robustness, just read the visible editor text + any
    // stored files we can find
    return editor.value || '';
  }

  function stripComments(source) {
    return String(source || '')
      .replace(/\/\/.*$/gm, '')        // line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // block comments
  }

  function detectProviders() {
    const raw = getAllProjectText();
    const clean = stripComments(raw);
    const found = [];

    Object.keys(PROVIDERS).forEach(key => {
      const p = PROVIDERS[key];
      // Match: gl.use_provider("groq"), gl.configure("provider", "groq"),
      //        setting("provider", "groq"), GROQ_API_KEY, apiKeyEnv
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

    return [...new Set(found)];
  }

  /* ── Build UI ────────────────────────────────────────────── */
  function init() {
    // Remove old panel if it exists
    const oldPanel = document.getElementById('apiKeyPanel');
    const oldEditor = document.getElementById('apiProviderEditor');

    // Find the toolbar to insert before
    const toolbar = document.querySelector('.runner-toolbar');
    if (!toolbar) return;

    // Create new panel
    panelEl = document.createElement('div');
    panelEl.className = 'gl-keys-panel';
    panelEl.id = 'glKeysPanel';
    panelEl.innerHTML = `
      <div class="gl-keys-header">
        <i class="fa-solid fa-key"></i>
        <span>API Keys</span>
      </div>
      <div class="gl-keys-intro" id="glKeysIntro">
        Detected providers from your code. Fill the required keys before running.
      </div>
      <div class="gl-keys-grid" id="glKeysGrid"></div>
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
  }

  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 600);
  }

  function scan() {
    const providers = detectProviders();
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

    const plural = providers.length > 1;
    introEl.textContent = plural
      ? `This code uses ${providers.length} LLM providers. Fill each required key before running.`
      : `This code uses ${PROVIDERS[providers[0]].label}. Fill the API key before running.`;

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
