(() => {
  const RUN_URL = 'https://code.generativelayers.com/api/run-astra';

  const PRESETS = {
    cerebras: { label: 'Cerebras', provider: 'cerebras', model: 'gpt-oss-120b', endpoint: '', env: 'CEREBRAS_API_KEY' },
    groq: { label: 'Groq', provider: 'groq', model: 'llama-3.3-70b-versatile', endpoint: '', env: 'GROQ_API_KEY' },
    gemini: { label: 'Gemini', provider: 'gemini', model: 'gemini-2.5-flash', endpoint: '', env: 'GEMINI_API_KEY' },
    openai: { label: 'OpenAI', provider: 'openai', model: 'gpt-4o-mini', endpoint: '', env: 'OPENAI_API_KEY' },
    deepseek: { label: 'DeepSeek', provider: 'deepseek', model: 'deepseek-chat', endpoint: '', env: 'DEEPSEEK_API_KEY' },
    custom: { label: 'Custom / unlisted', provider: 'chatcompletions', model: 'grok-2', endpoint: 'https://api.x.ai/v1/chat/completions', env: 'XAI_API_KEY' }
  };

  const KNOWN_KEYS = Object.keys(PRESETS).filter(key => key !== 'custom');
  const KNOWN_PROVIDERS = KNOWN_KEYS.map(key => PRESETS[key].provider);
  const KNOWN_ENVS = KNOWN_KEYS.map(key => PRESETS[key].env);

  const originalFetch = window.fetch.bind(window);
  let userChangedSelector = false;
  let internalChange = false;

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
      .runner-custom-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .runner-key-provider-note {
        font-size: 12px;
        color: #64748b;
      }
      .runner-custom-provider-grid[hidden] { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  function getEditor() { return document.getElementById('fileEditor'); }
  function getPanel() { return document.getElementById('apiKeyPanel'); }
  function getIntro() { return document.getElementById('apiKeyIntro'); }
  function getSelect() { return document.getElementById('apiKeyProviderSelect'); }
  function getCustomProvider() { return document.getElementById('customProviderName'); }
  function getCustomModel() { return document.getElementById('customProviderModel'); }
  function getCustomEndpoint() { return document.getElementById('customProviderEndpoint'); }
  function getCustomEnv() { return document.getElementById('customProviderEnv'); }
  function getCustomKey() { return document.getElementById('customProviderKey'); }

  function stripLineComments(source) {
    return String(source || '').replace(/\/\/.*$/gm, '');
  }

  function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function readFirst(source, regex) {
    const match = String(source || '').match(regex);
    return match ? match[1] : '';
  }

  function readSourceConfig(source) {
    const clean = stripLineComments(source);
    const provider =
      readFirst(clean, /gl\.use_provider\(\s*["']([^"']+)["']\s*\)/i) ||
      readFirst(clean, /gl\.configure\(\s*["']provider["']\s*,\s*["']([^"']+)["']\s*\)/i) ||
      readFirst(clean, /setting\(\s*["']provider["']\s*,\s*["']([^"']+)["']\s*\)/i);

    const model =
      readFirst(clean, /gl\.configure\(\s*["']model["']\s*,\s*["']([^"']+)["']\s*\)/i) ||
      readFirst(clean, /setting\(\s*["']model["']\s*,\s*["']([^"']+)["']\s*\)/i);

    const endpoint =
      readFirst(clean, /gl\.configure\(\s*["']endpoint["']\s*,\s*["']([^"']+)["']\s*\)/i) ||
      readFirst(clean, /setting\(\s*["']endpoint["']\s*,\s*["']([^"']+)["']\s*\)/i);

    const env =
      readFirst(clean, /gl\.configure\(\s*["']apiKeyEnv["']\s*,\s*["']([^"']+)["']\s*\)/i) ||
      readFirst(clean, /setting\(\s*["']apiKeyEnv["']\s*,\s*["']([^"']+)["']\s*\)/i);

    return { provider, model, endpoint, env };
  }

  function presetKeyForConfig(config) {
    for (const key of KNOWN_KEYS) {
      const preset = PRESETS[key];
      if (config.provider && config.provider.toLowerCase() === preset.provider) return key;
      if (config.env && config.env.toUpperCase() === preset.env) return key;
    }
    if (config.endpoint) return 'custom';
    if (config.provider && !KNOWN_PROVIDERS.includes(config.provider.toLowerCase())) return 'custom';
    if (config.env && !KNOWN_ENVS.includes(config.env.toUpperCase())) return 'custom';
    return 'gemini';
  }

  function isSafeEnvName(value) {
    return /^[A-Z][A-Z0-9_]{1,63}_(API_KEY|TOKEN)$/.test(String(value || '').trim());
  }

  function setPanelText(text) {
    const intro = getIntro();
    if (intro) intro.textContent = text;
  }

  function setWarning(text, show) {
    const warning = document.getElementById('apiKeyWarning');
    const warningText = document.getElementById('apiKeyWarningText');
    if (warning) warning.hidden = !show;
    if (warningText) warningText.textContent = text || '';
  }

  function showOnlyKnownProviderRow(key) {
    document.querySelectorAll('[data-provider-row]').forEach(row => {
      row.hidden = row.dataset.providerRow !== key;
    });
  }

  function hideKnownProviderRows() {
    document.querySelectorAll('[data-provider-row]').forEach(row => { row.hidden = true; });
  }

  function currentSelectionConfig() {
    const select = getSelect();
    const selected = select ? select.value : 'gemini';
    if (selected !== 'custom') return { ...PRESETS[selected] };
    return {
      label: 'Custom / unlisted',
      provider: (getCustomProvider()?.value || PRESETS.custom.provider).trim(),
      model: (getCustomModel()?.value || PRESETS.custom.model).trim(),
      endpoint: (getCustomEndpoint()?.value || PRESETS.custom.endpoint).trim(),
      env: (getCustomEnv()?.value || PRESETS.custom.env).trim().toUpperCase()
    };
  }

  function ensurePanelVisibleForCustom() {
    const panel = getPanel();
    if (panel) panel.hidden = false;
  }

  function setCustomFieldsVisible(visible) {
    const grid = document.getElementById('customProviderGrid');
    if (grid) grid.hidden = !visible;
  }

  function fillCustomFields(config) {
    const provider = getCustomProvider();
    const model = getCustomModel();
    const endpoint = getCustomEndpoint();
    const env = getCustomEnv();
    if (provider) provider.value = config.provider || PRESETS.custom.provider;
    if (model) model.value = config.model || PRESETS.custom.model;
    if (endpoint) endpoint.value = config.endpoint || PRESETS.custom.endpoint;
    if (env) env.value = (config.env || PRESETS.custom.env).toUpperCase();
  }

  function replaceOrInsertBeforeUseProvider(source, regex, line) {
    if (regex.test(source)) return source.replace(regex, line);

    const match = source.match(/^([ \t]*)gl\.use_provider\s*\([^;]*\)\s*;.*$/m);
    if (match && typeof match.index === 'number') {
      return source.slice(0, match.index) + `${match[1]}${line}\n` + source.slice(match.index);
    }

    const mainMatch = source.match(/rule\s+\+!main\s*\([^)]*\)\s*\{/m);
    if (mainMatch && typeof mainMatch.index === 'number') {
      const insertAt = mainMatch.index + mainMatch[0].length;
      return source.slice(0, insertAt) + `\n        ${line}` + source.slice(insertAt);
    }

    return source + `\n${line}\n`;
  }

  function removeEndpointLine(source) {
    return source.replace(/^\s*gl\.configure\(\s*["']endpoint["']\s*,\s*["'][^"']*["']\s*\)\s*;\s*$/gmi, '');
  }

  function updateInitialSetting(source, key, value) {
    const rx = new RegExp(`setting\\(\\s*["']${escapeRegex(key)}["']\\s*,\\s*["'][^"']*["']\\s*\\)`, 'gi');
    if (!rx.test(source)) return source;
    return source.replace(rx, `setting("${key}", "${value}")`);
  }

  function updateSourceProvider(source, cfg, customMode) {
    let updated = String(source || '');

    updated = updateInitialSetting(updated, 'provider', cfg.provider);
    updated = updateInitialSetting(updated, 'model', cfg.model);
    updated = updateInitialSetting(updated, 'apiKeyEnv', cfg.env);
    if (cfg.endpoint) updated = updateInitialSetting(updated, 'endpoint', cfg.endpoint);

    updated = replaceOrInsertBeforeUseProvider(
      updated,
      /gl\.configure\(\s*["']model["']\s*,\s*["'][^"']*["']\s*\)\s*;/gi,
      `gl.configure("model", "${cfg.model}");`
    );

    if (customMode) {
      updated = replaceOrInsertBeforeUseProvider(
        updated,
        /gl\.configure\(\s*["']endpoint["']\s*,\s*["'][^"']*["']\s*\)\s*;/gi,
        `gl.configure("endpoint", "${cfg.endpoint}");`
      );
    } else {
      updated = removeEndpointLine(updated);
      updated = updated.replace(
        /gl\.configure\(\s*["']provider["']\s*,\s*["'][^"']*["']\s*\)\s*;/gi,
        `gl.configure("provider", "${cfg.provider}");`
      );
    }

    updated = replaceOrInsertBeforeUseProvider(
      updated,
      /gl\.configure\(\s*["']apiKeyEnv["']\s*,\s*["'][^"']*["']\s*\)\s*;/gi,
      `gl.configure("apiKeyEnv", "${cfg.env}");`
    );

    if (customMode) {
      if (/gl\.use_provider\s*\(/i.test(updated)) {
        updated = updated.replace(/gl\.use_provider\s*\([^;]*\)\s*;/gi, `gl.use_provider("${cfg.provider}");`);
      } else {
        updated = replaceOrInsertBeforeUseProvider(updated, /$a/, `gl.use_provider("${cfg.provider}");`);
      }
    } else {
      if (/gl\.use_provider\s*\(\s*["'][^"']+["']\s*\)\s*;/i.test(updated)) {
        updated = updated.replace(/gl\.use_provider\s*\(\s*["'][^"']+["']\s*\)\s*;/gi, `gl.use_provider("${cfg.provider}");`);
      }
    }

    return updated.replace(/\n{3,}/g, '\n\n');
  }

  function syncUiForSelection() {
    const select = getSelect();
    if (!select) return;
    const customMode = select.value === 'custom';
    setCustomFieldsVisible(customMode);

    if (customMode) {
      ensurePanelVisibleForCustom();
      hideKnownProviderRows();
      const cfg = currentSelectionConfig();
      setPanelText(`This project uses ${cfg.provider} with ${cfg.env}. Paste the key value below before running it.`);
      const keyInput = getCustomKey();
      if (keyInput && !keyInput.value.trim()) setWarning(`Missing: ${cfg.env}.`, true);
      else setWarning('', false);
    } else {
      const cfg = PRESETS[select.value];
      showOnlyKnownProviderRow(select.value);
      setPanelText(`This project uses ${cfg.label} (${cfg.env}). Fill the required key before running it.`);
    }
  }

  function applySelectionToSource() {
    const select = getSelect();
    const editor = getEditor();
    if (!select || !editor) return;

    const customMode = select.value === 'custom';
    const cfg = currentSelectionConfig();
    const updated = updateSourceProvider(editor.value, cfg, customMode);

    if (updated !== editor.value) {
      const pos = editor.selectionStart || 0;
      internalChange = true;
      editor.value = updated;
      editor.selectionStart = editor.selectionEnd = Math.min(pos, editor.value.length);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      internalChange = false;
    }

    syncUiForSelection();
    window.setTimeout(syncUiForSelection, 0);
  }

  function syncSelectFromSource() {
    if (internalChange || userChangedSelector) return;
    const select = getSelect();
    const editor = getEditor();
    if (!select || !editor) return;

    const cfg = readSourceConfig(editor.value);
    const key = presetKeyForConfig(cfg);
    select.value = key;
    if (key === 'custom') fillCustomFields({ ...PRESETS.custom, ...cfg });
    syncUiForSelection();
  }

  function hasCustomNeed() {
    const select = getSelect();
    const editor = getEditor();
    if (select && select.value === 'custom') return true;
    if (!editor) return false;
    const cfg = readSourceConfig(editor.value);
    return presetKeyForConfig(cfg) === 'custom';
  }

  function validateCustomBeforeRun(event) {
    if (!hasCustomNeed()) return;
    const cfg = currentSelectionConfig();
    const keyValue = (getCustomKey()?.value || '').trim();

    if (!isSafeEnvName(cfg.env)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      ensurePanelVisibleForCustom();
      setWarning('Invalid environment variable name. Use something like XAI_API_KEY or MY_PROVIDER_TOKEN.', true);
      const output = document.getElementById('runnerOutput');
      if (output) output.textContent = 'Invalid custom API key environment name. Use uppercase letters, numbers, underscore, and end with _API_KEY or _TOKEN.';
      return;
    }

    if (!keyValue) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      ensurePanelVisibleForCustom();
      setWarning(`Missing: ${cfg.env}.`, true);
      const output = document.getElementById('runnerOutput');
      if (output) output.textContent = `This custom provider expects ${cfg.env}. Paste the key value before running.`;
      return;
    }

    applySelectionToSource();
  }

  function patchFetch() {
    if (window.__glCustomApiFetchPatched) return;
    window.__glCustomApiFetchPatched = true;

    window.fetch = function patchedFetch(resource, options = {}) {
      const value = typeof resource === 'string' ? resource : (resource && resource.url) || '';
      const isRun = value === RUN_URL || value.endsWith('/api/run-astra');
      if (!isRun) return originalFetch(resource, options);

      if (hasCustomNeed()) {
        const cfg = currentSelectionConfig();
        const keyValue = (getCustomKey()?.value || '').trim();
        if (cfg.env && keyValue) {
          try {
            const body = JSON.parse(options.body || '{}');
            body.api_keys = body.api_keys || {};
            body.api_keys[cfg.env] = keyValue;
            options = { ...options, body: JSON.stringify(body) };
          } catch (_) {
            // Let the original request fail normally if its body is malformed.
          }
        }
      }

      return originalFetch(resource, options);
    };
  }

  function installSelector() {
    const panel = getPanel();
    const intro = getIntro();
    if (!panel || !intro) return;

    addStyle();

    if (!getSelect()) {
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
          <span class="runner-key-provider-note">Presets are only shortcuts. Custom can be any OpenAI-compatible endpoint/provider supported by the framework.</span>
        </div>
        <div id="customProviderGrid" class="runner-custom-provider-grid" hidden>
          <div class="runner-custom-field"><label for="customProviderName">Provider</label><input id="customProviderName" value="chatcompletions" autocomplete="off"></div>
          <div class="runner-custom-field"><label for="customProviderModel">Model</label><input id="customProviderModel" value="grok-2" autocomplete="off"></div>
          <div class="runner-custom-field"><label for="customProviderEndpoint">Endpoint</label><input id="customProviderEndpoint" class="wide" value="https://api.x.ai/v1/chat/completions" autocomplete="off"></div>
          <div class="runner-custom-field"><label for="customProviderEnv">Key env</label><input id="customProviderEnv" value="XAI_API_KEY" autocomplete="off"></div>
          <div class="runner-custom-field"><label for="customProviderKey">Key value</label><input id="customProviderKey" type="password" placeholder="Paste the actual key for this run" autocomplete="off"></div>
        </div>
      `;
      intro.insertAdjacentElement('afterend', block);
    }

    const select = getSelect();
    if (select && select.dataset.installed !== '1') {
      select.addEventListener('change', () => {
        userChangedSelector = true;
        if (select.value === 'custom') fillCustomFields(readSourceConfig(getEditor()?.value || ''));
        applySelectionToSource();
      });
      select.dataset.installed = '1';
    }

    [getCustomProvider(), getCustomModel(), getCustomEndpoint(), getCustomEnv()].forEach(input => {
      if (!input || input.dataset.installed === '1') return;
      input.addEventListener('input', () => {
        userChangedSelector = true;
        const select = getSelect();
        if (select) select.value = 'custom';
        applySelectionToSource();
      });
      input.dataset.installed = '1';
    });

    const keyInput = getCustomKey();
    if (keyInput && keyInput.dataset.installed !== '1') {
      keyInput.addEventListener('input', syncUiForSelection);
      keyInput.dataset.installed = '1';
    }

    window.setTimeout(syncSelectFromSource, 100);
    window.setTimeout(syncSelectFromSource, 600);
  }

  function installRunInterception() {
    document.addEventListener('click', event => {
      const btn = event.target.closest && event.target.closest('#runAstraButton');
      if (!btn) return;
      validateCustomBeforeRun(event);
    }, true);
  }

  function init() {
    installSelector();
    patchFetch();
    installRunInterception();

    const editor = getEditor();
    if (editor) {
      editor.addEventListener('input', () => window.setTimeout(syncSelectFromSource, 0));
    }

    const observer = new MutationObserver(() => {
      installSelector();
      if (hasCustomNeed()) {
        ensurePanelVisibleForCustom();
        syncUiForSelection();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
