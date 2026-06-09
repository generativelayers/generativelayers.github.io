(() => {
  const RUN_URL = 'https://code.generativelayers.com/api/run-astra';

  const PRESETS = {
    cerebras: { label: 'Cerebras', provider: 'cerebras', model: 'gpt-oss-120b', env: 'CEREBRAS_API_KEY' },
    groq: { label: 'Groq', provider: 'groq', model: 'llama-3.3-70b-versatile', env: 'GROQ_API_KEY' },
    gemini: { label: 'Gemini', provider: 'gemini', model: 'gemini-2.5-flash', env: 'GEMINI_API_KEY' },
    openai: { label: 'OpenAI', provider: 'openai', model: 'gpt-4o-mini', env: 'OPENAI_API_KEY' },
    deepseek: { label: 'DeepSeek', provider: 'deepseek', model: 'deepseek-chat', env: 'DEEPSEEK_API_KEY' }
  };

  const CUSTOM_DEFAULT = {
    provider: 'chatcompletions',
    model: '',
    endpoint: '',
    env: 'CUSTOM_API_KEY'
  };

  const originalFetch = window.fetch.bind(window);

  function addStyle() {
    if (document.getElementById('gl-api-select-style')) return;
    const style = document.createElement('style');
    style.id = 'gl-api-select-style';
    style.textContent = `
      .runner-key-provider-row,
      .runner-custom-provider-grid {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin: 10px 0 12px;
      }
      .runner-key-provider-row label,
      .runner-custom-provider-grid label {
        font-size: 13px;
        font-weight: 800;
        color: var(--color-text,#111827);
      }
      .runner-key-provider-select,
      .runner-custom-provider-grid input {
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        padding: 9px 11px;
        font-size: 14px;
        font-weight: 700;
        background: #fff;
        color: #111827;
      }
      .runner-key-provider-select { min-width: 260px; }
      .runner-custom-provider-grid input { min-width: 220px; }
      .runner-custom-provider-grid .wide { min-width: 360px; flex: 1; }
      .runner-custom-field { display: flex; flex-direction: column; gap: 5px; }
      .runner-key-provider-note { font-size: 12px; color: #64748b; }
      .runner-custom-provider-grid[hidden] { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  function $(id) { return document.getElementById(id); }
  function editor() { return $('fileEditor'); }
  function panel() { return $('apiKeyPanel'); }
  function select() { return $('apiKeyProviderSelect'); }
  function customGrid() { return $('customProviderGrid'); }
  function customProvider() { return $('customProviderName'); }
  function customModel() { return $('customProviderModel'); }
  function customEndpoint() { return $('customProviderEndpoint'); }
  function customEnv() { return $('customProviderEnv'); }
  function customKey() { return $('customProviderKey'); }

  function safeEnvName(value) {
    return /^[A-Z][A-Z0-9_]{1,80}$/.test(String(value || '').trim());
  }

  function escapeString(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function customConfig() {
    return {
      provider: (customProvider()?.value || CUSTOM_DEFAULT.provider).trim(),
      model: (customModel()?.value || CUSTOM_DEFAULT.model).trim(),
      endpoint: (customEndpoint()?.value || CUSTOM_DEFAULT.endpoint).trim(),
      env: (customEnv()?.value || CUSTOM_DEFAULT.env).trim().toUpperCase()
    };
  }

  function setWarning(message, visible) {
    const warning = $('apiKeyWarning');
    const warningText = $('apiKeyWarningText');
    if (warning) warning.hidden = !visible;
    if (warningText) warningText.textContent = message || '';
  }

  function showKnownProvider(providerKey) {
    document.querySelectorAll('[data-provider-row]').forEach(row => {
      row.hidden = row.dataset.providerRow !== providerKey;
    });
  }

  function hideKnownProviders() {
    document.querySelectorAll('[data-provider-row]').forEach(row => { row.hidden = true; });
  }

  function forcePanelVisible() {
    if (panel()) panel().hidden = false;
  }

  function setIntro(text) {
    const intro = $('apiKeyIntro');
    if (intro) intro.textContent = text;
  }

  function replaceOrInsertBeforeUseProvider(source, regex, line) {
    if (regex.test(source)) return source.replace(regex, line);

    const match = source.match(/^([ \t]*)gl\.use_provider\s*\([^;]*\)\s*;.*$/m);
    if (match && typeof match.index === 'number') {
      return source.slice(0, match.index) + match[1] + line + '\n' + source.slice(match.index);
    }

    const main = source.match(/rule\s+\+!main\s*\([^)]*\)\s*\{/m);
    if (main && typeof main.index === 'number') {
      const insertAt = main.index + main[0].length;
      return source.slice(0, insertAt) + '\n        ' + line + source.slice(insertAt);
    }

    return source + '\n' + line + '\n';
  }

  function removeEndpointLine(source) {
    return source.replace(/^\s*gl\.configure\(\s*["']endpoint["']\s*,\s*["'][^"']*["']\s*\)\s*;\s*$/gmi, '');
  }

  function updateEditorForPreset(key) {
    const e = editor();
    const preset = PRESETS[key];
    if (!e || !preset) return;

    let source = e.value;
    source = removeEndpointLine(source);
    source = replaceOrInsertBeforeUseProvider(source, /gl\.configure\(\s*["']provider["']\s*,\s*["'][^"']*["']\s*\)\s*;/gi, `gl.configure("provider", "${preset.provider}");`);
    source = replaceOrInsertBeforeUseProvider(source, /gl\.configure\(\s*["']model["']\s*,\s*["'][^"']*["']\s*\)\s*;/gi, `gl.configure("model", "${preset.model}");`);
    source = replaceOrInsertBeforeUseProvider(source, /gl\.configure\(\s*["']apiKeyEnv["']\s*,\s*["'][^"']*["']\s*\)\s*;/gi, `gl.configure("apiKeyEnv", "${preset.env}");`);
    source = source.replace(/gl\.use_provider\s*\([^;]*\)\s*;/gi, `gl.use_provider("${preset.provider}");`);

    e.value = source.replace(/\n{3,}/g, '\n\n');
    e.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function updateEditorForCustom() {
    const e = editor();
    if (!e) return;
    const cfg = customConfig();

    let source = e.value;
    if (cfg.model) {
      source = replaceOrInsertBeforeUseProvider(source, /gl\.configure\(\s*["']model["']\s*,\s*["'][^"']*["']\s*\)\s*;/gi, `gl.configure("model", "${escapeString(cfg.model)}");`);
    }
    if (cfg.endpoint) {
      source = replaceOrInsertBeforeUseProvider(source, /gl\.configure\(\s*["']endpoint["']\s*,\s*["'][^"']*["']\s*\)\s*;/gi, `gl.configure("endpoint", "${escapeString(cfg.endpoint)}");`);
    } else {
      source = removeEndpointLine(source);
    }
    source = replaceOrInsertBeforeUseProvider(source, /gl\.configure\(\s*["']apiKeyEnv["']\s*,\s*["'][^"']*["']\s*\)\s*;/gi, `gl.configure("apiKeyEnv", "${escapeString(cfg.env)}");`);
    if (/gl\.use_provider\s*\(/i.test(source)) {
      source = source.replace(/gl\.use_provider\s*\([^;]*\)\s*;/gi, `gl.use_provider("${escapeString(cfg.provider)}");`);
    } else {
      source = replaceOrInsertBeforeUseProvider(source, /$a/, `gl.use_provider("${escapeString(cfg.provider)}");`);
    }

    e.value = source.replace(/\n{3,}/g, '\n\n');
    e.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function syncUi() {
    const s = select();
    if (!s) return;

    if (s.value === 'custom') {
      forcePanelVisible();
      hideKnownProviders();
      if (customGrid()) customGrid().hidden = false;
      const cfg = customConfig();
      setIntro(`Custom provider: ${cfg.provider || 'provider'} using ${cfg.env || 'API key env'}. The endpoint can be any URL supported by the framework.`);
      const keyValue = (customKey()?.value || '').trim();
      setWarning(keyValue ? '' : `Missing: ${cfg.env}.`, !keyValue);
      return;
    }

    const preset = PRESETS[s.value] || PRESETS.gemini;
    if (customGrid()) customGrid().hidden = true;
    showKnownProvider(s.value);
    setIntro(`This project uses ${preset.label} (${preset.env}). Fill the required key before running it.`);
  }

  function onSelectChange() {
    const s = select();
    if (!s) return;

    if (s.value === 'custom') {
      forcePanelVisible();
      if (customGrid()) customGrid().hidden = false;
      hideKnownProviders();
      updateEditorForCustom();
      window.setTimeout(syncUi, 0);
      return;
    }

    updateEditorForPreset(s.value);
    window.setTimeout(syncUi, 0);
  }

  function installSelector() {
    const p = panel();
    const intro = $('apiKeyIntro');
    if (!p || !intro || $('apiProviderEditor')) return;

    addStyle();

    const block = document.createElement('div');
    block.id = 'apiProviderEditor';
    block.innerHTML = `
      <div class="runner-key-provider-row">
        <label for="apiKeyProviderSelect">API key provider</label>
        <select id="apiKeyProviderSelect" class="runner-key-provider-select">
          <option value="cerebras">Cerebras — CEREBRAS_API_KEY</option>
          <option value="groq">Groq — GROQ_API_KEY</option>
          <option value="gemini">Gemini — GEMINI_API_KEY</option>
          <option value="openai">OpenAI — OPENAI_API_KEY</option>
          <option value="deepseek">DeepSeek — DEEPSEEK_API_KEY</option>
          <option value="custom">Custom / unlisted endpoint</option>
        </select>
        <span class="runner-key-provider-note">Presets are shortcuts only. Custom endpoint is free text.</span>
      </div>
      <div id="customProviderGrid" class="runner-custom-provider-grid" hidden>
        <div class="runner-custom-field"><label for="customProviderName">Provider</label><input id="customProviderName" value="chatcompletions" autocomplete="off"></div>
        <div class="runner-custom-field"><label for="customProviderModel">Model</label><input id="customProviderModel" placeholder="model name" autocomplete="off"></div>
        <div class="runner-custom-field"><label for="customProviderEndpoint">Endpoint</label><input id="customProviderEndpoint" class="wide" value="" placeholder="https://your-provider.example/v1/chat/completions" autocomplete="off"></div>
        <div class="runner-custom-field"><label for="customProviderEnv">Key env</label><input id="customProviderEnv" value="CUSTOM_API_KEY" autocomplete="off"></div>
        <div class="runner-custom-field"><label for="customProviderKey">Key value</label><input id="customProviderKey" type="password" placeholder="Paste the actual key for this run" autocomplete="off"></div>
      </div>
    `;
    intro.insertAdjacentElement('afterend', block);

    select().addEventListener('change', onSelectChange);
    [customProvider(), customModel(), customEndpoint(), customEnv()].forEach(input => {
      input.addEventListener('input', () => {
        if (select()) select().value = 'custom';
        updateEditorForCustom();
        syncUi();
      });
    });
    customKey().addEventListener('input', syncUi);
  }

  function validateCustomBeforeRun(event) {
    if (!select() || select().value !== 'custom') return;

    const cfg = customConfig();
    const keyValue = (customKey()?.value || '').trim();

    if (!safeEnvName(cfg.env)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      forcePanelVisible();
      syncUi();
      setWarning('Invalid key env. Use uppercase letters, numbers, underscore, for example CUSTOM_API_KEY.', true);
      return;
    }

    if (!keyValue) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      forcePanelVisible();
      syncUi();
      setWarning(`Missing: ${cfg.env}.`, true);
      return;
    }

    updateEditorForCustom();
  }

  function patchFetch() {
    if (window.__glCustomApiFetchPatched) return;
    window.__glCustomApiFetchPatched = true;

    window.fetch = function patchedFetch(resource, options = {}) {
      const url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
      const isRunner = url === RUN_URL || url.endsWith('/api/run-astra');
      if (!isRunner || !select() || select().value !== 'custom') return originalFetch(resource, options);

      const cfg = customConfig();
      const keyValue = (customKey()?.value || '').trim();
      if (cfg.env && keyValue) {
        try {
          const body = JSON.parse(options.body || '{}');
          body.api_keys = body.api_keys || {};
          body.api_keys[cfg.env] = keyValue;
          options = { ...options, body: JSON.stringify(body) };
        } catch (_) {}
      }
      return originalFetch(resource, options);
    };
  }

  function init() {
    installSelector();
    patchFetch();
    document.addEventListener('click', event => {
      const btn = event.target.closest && event.target.closest('#runAstraButton');
      if (btn) validateCustomBeforeRun(event);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
