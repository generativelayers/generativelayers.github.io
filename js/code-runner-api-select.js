/**
 * code-runner-api-select.js v9
 *
 * Dynamic API-key HUD for the hosted runners.
 *
 * Shows the HUD only when the current project actually uses Generative Layers
 * generation calls or provider configuration. If the user edits the code and
 * removes that usage, the HUD disappears and the Run button is free again.
 */
(() => {
  'use strict';

  if (window.__glApiSelectV9Initialized) return;
  window.__glApiSelectV9Initialized = true;

  const PROVIDERS = {
    cerebras: { label: 'Cerebras', env: 'CEREBRAS_API_KEY', color: '#38bdf8', icon: 'fa-microchip' },
    groq: { label: 'Groq', env: 'GROQ_API_KEY', color: '#f97316', icon: 'fa-bolt' },
    gemini: { label: 'Gemini', env: 'GEMINI_API_KEY', color: '#a78bfa', icon: 'fa-gem' },
    openai: { label: 'OpenAI', env: 'OPENAI_API_KEY', color: '#34d399', icon: 'fa-robot' },
    deepseek: { label: 'DeepSeek', env: 'DEEPSEEK_API_KEY', color: '#60a5fa', icon: 'fa-water' }
  };

  const DEFAULT_MODELS = {
    cerebras: 'gpt-oss-120b',
    groq: 'llama-3.3-70b-versatile',
    gemini: 'gemini-2.0-flash',
    openai: 'gpt-4o',
    deepseek: 'deepseek-chat'
  };

  const GENERATION_METHODS = [
    'call'
  ];

  const PROVIDER_CONFIG_METHODS = [
    'bind'
  ];

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
    .gl-keys-header { display:flex;align-items:center;gap:10px;margin:0 0 6px;font-size:15px;font-weight:800;color:var(--color-text,#111827); }
    .gl-keys-header i { color:#d97706; }
    .gl-keys-intro { margin:0 0 14px;color:#64748b;font-size:13px;line-height:1.55; }
    .gl-keys-grid { display:flex;flex-direction:column;gap:10px; }
    .gl-key-row { display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;transition:border-color .2s,box-shadow .2s; }
    .gl-key-row:focus-within { border-color:#059669;box-shadow:0 0 0 3px rgba(5,150,105,.1); }
    .gl-key-badge { display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:900;letter-spacing:.5px;color:#fff;white-space:nowrap;flex-shrink:0; }
    .gl-key-env { font-size:12px;font-weight:700;color:#64748b;font-family:'Fira Code',ui-monospace,SFMono-Regular,Menlo,monospace;min-width:140px;flex-shrink:0; }
    .gl-key-input { flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;font-size:13px;background:#f8fafc;color:#111827;transition:border-color .2s; }
    .gl-key-input:focus { outline:none;border-color:#059669;background:#fff; }
    .gl-key-input::placeholder { color:#94a3b8; }
    .gl-key-status { font-size:14px;flex-shrink:0;width:20px;text-align:center; }
    .gl-key-status.filled { color:#059669; }
    .gl-key-status.empty { color:#f59e0b; }
    .gl-keys-warn { display:flex;align-items:flex-start;gap:10px;margin:12px 0 0;padding:10px 14px;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:10px;background:#fffbeb;color:#92400e;font-size:13px;line-height:1.5; }
    .gl-keys-warn[hidden] { display:none !important; }
    .gl-keys-select-row { display:flex;align-items:center;gap:10px;margin:0 0 12px; }
    .gl-keys-select-row label { font-size:13px;font-weight:800;color:#334155;white-space:nowrap; }
    .gl-keys-select { flex:1;max-width:260px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:700;background:#fff;color:#111827;cursor:pointer;appearance:auto; }
    .gl-keys-select:focus { outline:none;border-color:#059669;box-shadow:0 0 0 3px rgba(5,150,105,.1); }
    .gl-custom-grid { display:grid;grid-template-columns:auto 1fr;gap:6px 10px;margin:10px 0 0;padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;background:#fff; }
    .gl-custom-grid[hidden] { display:none !important; }
    .gl-custom-grid label { font-size:12px;font-weight:700;color:#64748b;font-family:'Fira Code',ui-monospace,SFMono-Regular,Menlo,monospace;align-self:center; }
    .gl-custom-grid input { border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;font-size:13px;background:#f8fafc;color:#111827; }
    .gl-custom-grid input:focus { outline:none;border-color:#059669;background:#fff; }
  `;
  document.head.appendChild(style);

  let panelEl = null;
  let gridEl = null;
  let introEl = null;
  let warnEl = null;
  let selectEl = null;
  let customGridEl = null;
  let manualProvider = '';
  let lastKey = null;
  let scanTimer = null;
  let currentProviders = [];

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeAttr(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function stripComments(source) {
    const s = String(source || '');
    let out = '';
    let i = 0;
    let quote = '';
    while (i < s.length) {
      const ch = s[i];
      const next = s[i + 1];

      if (quote) {
        out += ch;
        if (ch === '\\' && i + 1 < s.length) {
          out += s[i + 1];
          i += 2;
          continue;
        }
        if (ch === quote) quote = '';
        i += 1;
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        out += ch;
        i += 1;
        continue;
      }

      if (ch === '/' && next === '/') {
        while (i < s.length && s[i] !== '\n') i += 1;
        out += '\n';
        if (s[i] === '\n') i += 1;
        continue;
      }

      if (ch === '/' && next === '*') {
        i += 2;
        while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) {
          if (s[i] === '\n') out += '\n';
          i += 1;
        }
        i += 2;
        continue;
      }

      out += ch;
      i += 1;
    }
    return out;
  }

  function getAllProjectText() {
    const editor = document.getElementById('fileEditor');
    const liveText = editor ? (editor.value || '') : '';

    if (typeof window.__glGetAllCode === 'function' && typeof window.__glCurrentPath === 'function') {
      const current = window.__glCurrentPath();
      const saved = typeof window.__glGetAllCodeExcept === 'function'
        ? window.__glGetAllCodeExcept(current)
        : window.__glGetAllCode();
      return saved + '\n' + liveText;
    }

    if (typeof window.__glGetAllCode === 'function') {
      return window.__glGetAllCode() + '\n' + liveText;
    }

    return liveText;
  }

  function detectAliases(source) {
    const aliases = new Set(['gl']);
    const moduleRe = /\bmodule\s+gl\.(?:astra\.GL|adapter\.astra\.AstraAdapter)\s+([A-Za-z_]\w*)\s*;/gi;
    let match;
    while ((match = moduleRe.exec(source)) !== null) aliases.add(match[1]);
    return [...aliases];
  }

  function hasAliasCall(source, aliases, methods) {
    return aliases.some(alias => {
      const a = escapeRegExp(alias);
      return methods.some(method => new RegExp(`\\b${a}\\.${method}\\s*\\(`, 'i').test(source));
    });
  }

  function usesGenerationLayer(source) {
    const aliases = detectAliases(source);

    if (hasAliasCall(source, aliases, GENERATION_METHODS)) return true;
    if (hasAliasCall(source, aliases, PROVIDER_CONFIG_METHODS)) return true;

    // Jason/JaCaMo direct references and artifact use.
    const directPatterns = [
      /\bgl\.jason\.GL\b/i,
      /\bgl\.jacamo\.GL\b/i,
      /\bmakeArtifact\s*\([^)]*gl\.jacamo\.GL/i,
      /\bbind\s*\(/i
    ];

    return directPatterns.some(re => re.test(source));
  }

  function detectProviders() {
    const raw = getAllProjectText();
    const clean = stripComments(raw);

    if (!usesGenerationLayer(clean)) return [];

    const aliases = detectAliases(clean);
    const found = [];

    Object.keys(PROVIDERS).forEach(key => {
      const p = PROVIDERS[key];
      const quoted = `["']${escapeRegExp(key)}["']`;
      const env = escapeRegExp(p.env);
      const patterns = [
        new RegExp(`\\bbind\\s*\\([^)]*${quoted}`, 'i'),
        new RegExp(`["']apiKeyEnv["']\\s*,\\s*["']${env}["']`, 'i'),
        new RegExp(`\\b${env}\\b`, 'i')
      ];

      aliases.forEach(alias => {
        const a = escapeRegExp(alias);
        patterns.push(new RegExp(`\\b${a}\\.bind\\s*\\([^)]*${quoted}`, 'i'));
      });

      if (patterns.some(re => re.test(clean))) found.push(key);
    });

    if (!found.includes('cerebras') && /\bgpt-oss(?:-[0-9a-z._-]+)?\b/i.test(clean)) found.push('cerebras');
    if (!found.includes('gemini') && /\bgemini-[a-z0-9._-]+\b/i.test(clean)) found.push('gemini');
    if (!found.includes('deepseek') && /\bdeepseek-[a-z0-9._-]+\b/i.test(clean)) found.push('deepseek');
    if (!found.includes('groq') && /\b(?:llama-3|llama3|mixtral|gemma)[a-z0-9._-]*\b/i.test(clean)) found.push('groq');
    if (!found.includes('openai') && /\bgpt-(?:3\.5|4|4o|4\.1|5)(?:[a-z0-9._-]*)\b/i.test(clean)) found.push('openai');

    // A generation call with no explicit provider still needs one. Default to Cerebras.
    if (found.length === 0) found.push('cerebras');

    return [...new Set(found)];
  }

  function activeProviders() {
    const detected = detectProviders();
    if (detected.length === 0) return [];
    if (manualProvider === 'custom') return ['custom'];
    if (manualProvider && PROVIDERS[manualProvider]) return [manualProvider];
    return detected;
  }

  function applyProviderToSource(providerKey) {
    const editor = document.getElementById('fileEditor');
    if (!editor || !PROVIDERS[providerKey]) return;

    const original = editor.value || '';
    const model = DEFAULT_MODELS[providerKey] || providerKey;
    let src = original;

    // v2: bind(agent, provider, model, config) — replace provider arg
    src = src.replace(/(bind\s*\([^,]*,\s*["'])[a-zA-Z0-9._-]+(["'])/g, `$1${providerKey}$2`);

    if (src !== original) {
      const pos = editor.selectionStart || 0;
      editor.value = src;
      editor.selectionStart = editor.selectionEnd = Math.min(pos, editor.value.length);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function applyCustomToSource() {
    const editor = document.getElementById('fileEditor');
    if (!editor) return;

    const providerName = (document.getElementById('glCustomProvider')?.value || 'chatcompletions').trim();
    const modelName = (document.getElementById('glCustomModel')?.value || 'grok-2').trim();
    const endpoint = (document.getElementById('glCustomEndpoint')?.value || '').trim();

    const original = editor.value || '';
    let src = original;

    // v2: bind(agent, provider, model, config) — replace provider arg
    src = src.replace(/(bind\s*\([^,]*,\s*["'])[a-zA-Z0-9._-]+(["'])/g, `$1${providerName}$2`);

    // v2: endpoint is part of the bind() config map — no source rewriting needed

    if (src !== original) {
      const pos = editor.selectionStart || 0;
      editor.value = src;
      editor.selectionStart = editor.selectionEnd = Math.min(pos, editor.value.length);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function init() {
    document.getElementById('glKeysPanel')?.remove();
    const oldPanel = document.getElementById('apiKeyPanel');
    const oldEditor = document.getElementById('apiProviderEditor');
    if (oldPanel) oldPanel.hidden = true;
    if (oldEditor) oldEditor.hidden = true;

    const toolbar = document.querySelector('.runner-toolbar');
    if (!toolbar) return;

    const providerOptions = Object.keys(PROVIDERS).map(key => {
      const p = PROVIDERS[key];
      return `<option value="${key}">${p.label}</option>`;
    }).join('');

    panelEl = document.createElement('div');
    panelEl.className = 'gl-keys-panel';
    panelEl.id = 'glKeysPanel';
    panelEl.hidden = true;
    panelEl.innerHTML = `
      <div class="gl-keys-header"><i class="fa-solid fa-key"></i><span>API Keys</span></div>
      <div class="gl-keys-select-row">
        <label for="glProviderSelect">LLM Provider:</label>
        <select class="gl-keys-select" id="glProviderSelect">
          <option value="">Auto-detect from code</option>
          ${providerOptions}
          <option value="custom">Custom / unlisted endpoint</option>
        </select>
      </div>
      <div class="gl-keys-intro" id="glKeysIntro">Select a provider or let it auto-detect from your code.</div>
      <div class="gl-keys-grid" id="glKeysGrid"></div>
      <div class="gl-custom-grid" id="glCustomGrid" hidden>
        <label>Provider</label><input id="glCustomProvider" value="chatcompletions" autocomplete="off">
        <label>Model</label><input id="glCustomModel" value="grok-2" autocomplete="off">
        <label>Endpoint</label><input id="glCustomEndpoint" value="https://api.x.ai/v1/chat/completions" autocomplete="off">
        <label>Key env</label><input id="glCustomEnv" value="XAI_API_KEY" autocomplete="off">
        <label>Key value</label><input id="glCustomKey" type="password" placeholder="Paste key for this run" autocomplete="off">
      </div>
      <div class="gl-keys-warn" id="glKeysWarn" hidden>
        <i class="fa-solid fa-triangle-exclamation"></i><span id="glKeysWarnText"></span>
      </div>
    `;

    toolbar.parentNode.insertBefore(panelEl, toolbar);

    gridEl = document.getElementById('glKeysGrid');
    introEl = document.getElementById('glKeysIntro');
    warnEl = document.getElementById('glKeysWarn');
    selectEl = document.getElementById('glProviderSelect');
    customGridEl = document.getElementById('glCustomGrid');

    selectEl?.addEventListener('change', () => {
      manualProvider = selectEl.value;
      lastKey = null;
      if (manualProvider && manualProvider !== 'custom') applyProviderToSource(manualProvider);
      if (manualProvider === 'custom') applyCustomToSource();
      scan();
    });

    customGridEl?.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        if (manualProvider === 'custom') {
          if (input.id !== 'glCustomKey') applyCustomToSource();
          updateWarning(currentProviders);
        }
      });
    });

    const editor = document.getElementById('fileEditor');
    if (editor) {
      editor.addEventListener('input', scheduleScan);
      editor.addEventListener('blur', scan);
    }

    const currentFileEl = document.getElementById('currentFile');
    if (currentFileEl) {
      new MutationObserver(() => { lastKey = null; scan(); })
        .observe(currentFileEl, { childList: true, characterData: true, subtree: true });
    }

    const fileTree = document.getElementById('fileTree');
    if (fileTree) {
      new MutationObserver(() => { lastKey = null; setTimeout(scan, 120); })
        .observe(fileTree, { childList: true, subtree: true });
    }

    document.addEventListener('click', event => {
      const btn = event.target.closest && event.target.closest('.runner-tree-btn, .runner-mini-button');
      if (btn) setTimeout(resetPanel, 180);
    });

    scan();
  }

  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 250);
  }

  function resetPanel() {
    manualProvider = '';
    lastKey = null;
    if (selectEl) selectEl.value = '';
    if (customGridEl) customGridEl.hidden = true;
    setTimeout(scan, 200);
  }
  window.__glResetApiPanel = resetPanel;

  function scan() {
    const providers = activeProviders();
    const key = providers.join(',') + '|' + manualProvider;
    if (key === lastKey) return;
    lastKey = key;
    currentProviders = providers;
    render(providers);
  }

  function render(providers) {
    if (!panelEl || !gridEl || !introEl || !warnEl) return;

    if (providers.length === 0) {
      panelEl.hidden = true;
      gridEl.innerHTML = '';
      if (warnEl) warnEl.hidden = true;
      return;
    }

    panelEl.hidden = false;
    if (customGridEl) customGridEl.hidden = (manualProvider !== 'custom');
    introEl.innerHTML = 'Detected Generative Layers provider usage. Get keys from <a href="providers.html#providers" style="color:#059669;font-weight:800;text-decoration:underline">Built-in Providers</a>.';

    if (providers[0] === 'custom') {
      gridEl.innerHTML = '';
      updateWarning(providers);
      return;
    }

    gridEl.innerHTML = providers.map(key => {
      const p = PROVIDERS[key];
      const existingInput = document.querySelector(`[data-gl-key="${key}"]`);
      const existingValue = existingInput ? existingInput.value : '';
      return `
        <div class="gl-key-row">
          <span class="gl-key-badge" style="background:${p.color}"><i class="fa-solid ${p.icon}"></i>${p.label}</span>
          <span class="gl-key-env">${p.env}</span>
          <input class="gl-key-input" data-gl-key="${key}" data-gl-env="${p.env}" type="password" autocomplete="off" placeholder="Paste ${p.label} key for this run" value="${escapeAttr(existingValue)}">
          <span class="gl-key-status ${existingValue ? 'filled' : 'empty'}"><i class="fa-solid ${existingValue ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i></span>
        </div>`;
    }).join('');

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

  function missingProviderLabels(providers) {
    if (providers.length === 0) return [];

    if (providers[0] === 'custom') {
      const env = (document.getElementById('glCustomEnv')?.value || 'CUSTOM_API_KEY').trim();
      const key = (document.getElementById('glCustomKey')?.value || '').trim();
      return key ? [] : [`Custom (${env})`];
    }

    return providers.filter(key => {
      const input = document.querySelector(`[data-gl-key="${key}"]`);
      return !input || !input.value.trim();
    }).map(key => `${PROVIDERS[key].label} (${PROVIDERS[key].env})`);
  }

  function updateWarning(providers) {
    if (!warnEl) return;
    const missing = missingProviderLabels(providers);
    if (missing.length === 0) {
      warnEl.hidden = true;
      return;
    }
    warnEl.hidden = false;
    const text = document.getElementById('glKeysWarnText');
    if (text) text.textContent = `Missing: ${missing.join(', ')}. Fill before running.`;
  }

  window.__glGetApiKeys = function () {
    const providers = activeProviders();
    const keys = {};

    if (providers[0] === 'custom') {
      const env = (document.getElementById('glCustomEnv')?.value || '').trim();
      const val = (document.getElementById('glCustomKey')?.value || '').trim();
      if (env && val) keys[env] = val;
      return keys;
    }

    document.querySelectorAll('[data-gl-key]').forEach(input => {
      const env = input.dataset.glEnv;
      const value = input.value.trim();
      if (env && value) keys[env] = value;
    });
    return keys;
  };

  window.__glGetMissingProviders = function () {
    const providers = activeProviders();
    currentProviders = providers;
    render(providers);
    return missingProviderLabels(providers);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
