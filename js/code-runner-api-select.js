(() => {
  const PROVIDERS = {
    cerebras: { label: 'Cerebras', env: 'CEREBRAS_API_KEY', model: 'gpt-oss-120b' },
    groq: { label: 'Groq', env: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile' },
    gemini: { label: 'Gemini', env: 'GEMINI_API_KEY', model: 'gemini-2.5-flash' },
    openai: { label: 'OpenAI', env: 'OPENAI_API_KEY', model: 'gpt-4o-mini' },
    deepseek: { label: 'DeepSeek', env: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' }
  };

  const PROVIDER_NAMES = Object.keys(PROVIDERS);
  const PROVIDER_RE = '(gemini|groq|cerebras|openai|deepseek)';
  const ENV_RE = '(GEMINI_API_KEY|GROQ_API_KEY|CEREBRAS_API_KEY|OPENAI_API_KEY|DEEPSEEK_API_KEY)';

  function addStyle() {
    if (document.getElementById('gl-api-select-style')) return;
    const style = document.createElement('style');
    style.id = 'gl-api-select-style';
    style.textContent = `
      .runner-key-provider-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin: 10px 0 12px;
      }
      .runner-key-provider-row label {
        font-size: 13px;
        font-weight: 800;
        color: var(--color-text,#111827);
      }
      .runner-key-provider-select {
        min-width: 240px;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        padding: 9px 11px;
        font-size: 14px;
        font-weight: 800;
        background: #fff;
        color: #111827;
      }
      .runner-key-provider-note {
        font-size: 12px;
        color: #64748b;
      }
    `;
    document.head.appendChild(style);
  }

  function stripLineComments(source) {
    return String(source || '').replace(/\/\/.*$/gm, '');
  }

  function detectProviderFromSource(source) {
    const clean = stripLineComments(source).toLowerCase();

    for (const provider of PROVIDER_NAMES) {
      const info = PROVIDERS[provider];
      if (clean.includes(`"provider", "${provider}"`)) return provider;
      if (clean.includes(`'provider', '${provider}'`)) return provider;
      if (clean.includes(`use_provider("${provider}"`)) return provider;
      if (clean.includes(`use_provider('${provider}'`)) return provider;
      if (clean.includes(info.env.toLowerCase())) return provider;
    }

    if (/gemini-[a-z0-9_.-]+/i.test(clean)) return 'gemini';
    if (/gpt-oss/i.test(clean)) return 'cerebras';
    if (/(llama-3|llama3|mixtral|gemma)/i.test(clean)) return 'groq';
    if (/deepseek-[a-z0-9_.-]+/i.test(clean)) return 'deepseek';
    if (/gpt-(?:3|4|4o|5|o)/i.test(clean)) return 'openai';

    return 'gemini';
  }

  function getEditor() {
    return document.getElementById('fileEditor');
  }

  function getSelect() {
    return document.getElementById('apiKeyProviderSelect');
  }

  function visibleProviderRows() {
    return Array.from(document.querySelectorAll('[data-provider-row]')).filter(row => !row.hidden);
  }

  function showOnlyProvider(provider) {
    document.querySelectorAll('[data-provider-row]').forEach(row => {
      row.hidden = row.dataset.providerRow !== provider;
    });
  }

  function providerListText(provider) {
    const info = PROVIDERS[provider];
    return `${info.label} (${info.env})`;
  }

  function updateKeyPanelText(provider) {
    const info = PROVIDERS[provider];
    const intro = document.getElementById('apiKeyIntro');
    const warningText = document.getElementById('apiKeyWarningText');
    const input = document.querySelector(`[data-provider-key="${provider}"]`);

    if (intro) intro.textContent = `This project uses ${providerListText(provider)}. Fill the required key before running it.`;
    if (input) input.placeholder = `Paste ${info.label} key for this run`;
    if (warningText && input && !input.value.trim()) warningText.textContent = `Missing: ${providerListText(provider)}.`;
  }

  function updateSourceProvider(source, provider) {
    const info = PROVIDERS[provider];
    let updated = String(source || '');

    updated = updated.replace(
      new RegExp(`setting\\(\\s*["']provider["']\\s*,\\s*["']${PROVIDER_RE}["']\\s*\\)`, 'gi'),
      `setting("provider", "${provider}")`
    );
    updated = updated.replace(
      new RegExp(`gl\\.configure\\(\\s*["']provider["']\\s*,\\s*["']${PROVIDER_RE}["']\\s*\\)`, 'gi'),
      `gl.configure("provider", "${provider}")`
    );
    updated = updated.replace(
      new RegExp(`gl\\.use_provider\\(\\s*["']${PROVIDER_RE}["']\\s*\\)`, 'gi'),
      `gl.use_provider("${provider}")`
    );

    updated = updated.replace(
      /setting\(\s*["']model["']\s*,\s*["'][^"']*["']\s*\)/gi,
      `setting("model", "${info.model}")`
    );
    updated = updated.replace(
      /gl\.configure\(\s*["']model["']\s*,\s*["'][^"']*["']\s*\)/gi,
      `gl.configure("model", "${info.model}")`
    );

    updated = updated.replace(
      new RegExp(`setting\\(\\s*["']apiKeyEnv["']\\s*,\\s*["']${ENV_RE}["']\\s*\\)`, 'gi'),
      `setting("apiKeyEnv", "${info.env}")`
    );
    updated = updated.replace(
      new RegExp(`gl\\.configure\\(\\s*["']apiKeyEnv["']\\s*,\\s*["']${ENV_RE}["']\\s*\\)`, 'gi'),
      `gl.configure("apiKeyEnv", "${info.env}")`
    );

    // If the source uses a provider but has no explicit apiKeyEnv, add it before use_provider.
    if (!new RegExp(info.env, 'i').test(updated) && /gl\.use_provider\s*\(/.test(updated)) {
      const match = updated.match(/^([ \t]*)gl\.use_provider\s*\([^;]*\)\s*;.*$/m);
      if (match && typeof match.index === 'number') {
        updated = updated.slice(0, match.index) + `${match[1]}gl.configure("apiKeyEnv", "${info.env}");\n` + updated.slice(match.index);
      }
    }

    return updated;
  }

  function applySelectedProvider() {
    const select = getSelect();
    const editor = getEditor();
    if (!select || !editor) return;

    const provider = select.value;
    showOnlyProvider(provider);
    updateKeyPanelText(provider);

    const updated = updateSourceProvider(editor.value, provider);
    if (updated !== editor.value) {
      const pos = editor.selectionStart || 0;
      editor.value = updated;
      editor.selectionStart = editor.selectionEnd = Math.min(pos, editor.value.length);
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    // code-runner.js recalculates rows from source on input; force the selected row again after it runs.
    window.setTimeout(() => {
      showOnlyProvider(provider);
      updateKeyPanelText(provider);
    }, 0);
  }

  function syncSelectFromSource() {
    const select = getSelect();
    const editor = getEditor();
    if (!select || !editor) return;

    // Do not override the user while he has manually chosen a visible provider row.
    const visible = visibleProviderRows();
    if (visible.length === 1 && visible[0].dataset.providerRow && select.dataset.userChanged === '1') {
      return;
    }

    const provider = detectProviderFromSource(editor.value);
    select.value = provider;
    updateKeyPanelText(provider);
  }

  function installSelector() {
    const panel = document.getElementById('apiKeyPanel');
    const intro = document.getElementById('apiKeyIntro');
    if (!panel || !intro) return;

    addStyle();

    let select = getSelect();
    if (!select) {
      const row = document.createElement('div');
      row.className = 'runner-key-provider-row';
      row.innerHTML = `
        <label for="apiKeyProviderSelect">API key provider</label>
        <select id="apiKeyProviderSelect" class="runner-key-provider-select">
          <option value="cerebras">Cerebras — CEREBRAS_API_KEY</option>
          <option value="groq">Groq — GROQ_API_KEY</option>
          <option value="gemini">Gemini — GEMINI_API_KEY</option>
          <option value="openai">OpenAI — OPENAI_API_KEY</option>
          <option value="deepseek">DeepSeek — DEEPSEEK_API_KEY</option>
        </select>
        <span class="runner-key-provider-note">Choose which provider key this run will use.</span>
      `;
      intro.insertAdjacentElement('afterend', row);
      select = getSelect();
    }

    if (select && select.dataset.installed !== '1') {
      select.addEventListener('change', () => {
        select.dataset.userChanged = '1';
        applySelectedProvider();
      });
      select.dataset.installed = '1';
    }

    window.setTimeout(syncSelectFromSource, 100);
    window.setTimeout(syncSelectFromSource, 600);
  }

  function init() {
    installSelector();

    const editor = getEditor();
    if (editor) {
      editor.addEventListener('input', () => window.setTimeout(syncSelectFromSource, 0));
    }

    // The key panel can appear after code-runner.js detects provider code.
    const observer = new MutationObserver(() => installSelector());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
