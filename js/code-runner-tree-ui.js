(() => {
  const STYLE_ID = 'gl-project-tree-action-style';

  const PROVIDER_TEMPLATES = {
    fake: {
      label: 'Fake / no API key',
      provider: 'fake',
      model: '',
      env: ''
    },
    gemini: {
      label: 'Gemini',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      env: 'GEMINI_API_KEY'
    },
    groq: {
      label: 'Groq',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      env: 'GROQ_API_KEY'
    },
    cerebras: {
      label: 'Cerebras',
      provider: 'cerebras',
      model: 'gpt-oss-120b',
      env: 'CEREBRAS_API_KEY'
    },
    openai: {
      label: 'OpenAI',
      provider: 'openai',
      model: 'gpt-4o-mini',
      env: 'OPENAI_API_KEY'
    },
    deepseek: {
      label: 'DeepSeek',
      provider: 'deepseek',
      model: 'deepseek-chat',
      env: 'DEEPSEEK_API_KEY'
    }
  };

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .runner-file-actions {
        display: none !important;
      }

      .runner-files-head {
        justify-content: flex-start !important;
      }

      .runner-files-head span:last-child {
        display: none !important;
      }

      .runner-root-title {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
      }

      .runner-root-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .runner-folder-add,
      .runner-file-delete,
      .runner-file-rename {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        min-width: 24px;
        border: 1px solid rgba(52, 211, 153, 0.35);
        border-radius: 8px;
        background: rgba(52, 211, 153, 0.10);
        color: #34d399;
        cursor: pointer;
        font-size: 11px;
        padding: 0;
      }

      .runner-folder-add:hover,
      .runner-file-delete:hover,
      .runner-file-rename:hover {
        background: #059669;
        border-color: #059669;
        color: #fff;
      }

      .runner-file-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 2px 0;
        border-radius: 8px;
      }

      .runner-file-row .runner-file {
        flex: 1;
        width: auto !important;
        margin: 0 !important;
        min-width: 0;
      }

      .runner-file-row .runner-file span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .runner-file-row.active .runner-file {
        background: #1f2937 !important;
        color: #fff !important;
      }

      .runner-file-delete {
        color: #fca5a5;
        border-color: rgba(248, 113, 113, 0.35);
        background: rgba(248, 113, 113, 0.08);
      }

      .runner-file-delete:hover {
        background: #dc2626;
        border-color: #dc2626;
        color: #fff;
      }

      .runner-provider-panel {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        margin: 0 0 10px;
        padding: 10px 12px;
        border: 1px solid #1f2937;
        border-radius: 12px;
        background: #0f172a;
        color: #d1fae5;
      }

      .runner-provider-panel-left {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 900;
        color: #34d399;
      }

      .runner-provider-controls {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .runner-provider-select {
        min-width: 190px;
        border: 1px solid #1f2937;
        border-radius: 9px;
        background: #0b1220;
        color: #d1fae5;
        font-size: 12px;
        font-weight: 800;
        padding: 8px 10px;
      }

      .runner-provider-apply,
      .runner-provider-clear {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border: 1px solid rgba(52, 211, 153, 0.35);
        border-radius: 999px;
        background: rgba(52, 211, 153, 0.10);
        color: #34d399;
        cursor: pointer;
        font-size: 12px;
        font-weight: 900;
        padding: 7px 12px;
      }

      .runner-provider-apply:hover,
      .runner-provider-clear:hover {
        background: #059669;
        border-color: #059669;
        color: #fff;
      }

      .runner-provider-clear {
        color: #fbbf24;
        border-color: rgba(251, 191, 36, 0.35);
        background: rgba(251, 191, 36, 0.08);
      }
    `;
    document.head.appendChild(style);
  }

  function clickHidden(id) {
    const button = document.getElementById(id);
    if (button) button.click();
  }

  function patchHeader() {
    const extra = document.querySelector('.runner-files-head span:last-child');
    if (extra) extra.textContent = '';
  }

  function patchRootTitles() {
    document.querySelectorAll('.runner-root-title').forEach(title => {
      if (title.dataset.treeUiPatched === '1') return;

      const text = title.textContent || '';
      const isAstra = text.includes('/astra');
      const isJava = text.includes('/java');
      if (!isAstra && !isJava) return;

      const label = document.createElement('div');
      label.className = 'runner-root-label';

      while (title.firstChild) {
        label.appendChild(title.firstChild);
      }

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'runner-folder-add';
      add.title = isAstra ? 'New ASTRA file' : 'New Java file';
      add.innerHTML = '<i class="fa-solid fa-plus"></i>';
      add.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        clickHidden(isAstra ? 'newAstraFileButton' : 'newJavaFileButton');
      });

      title.appendChild(label);
      title.appendChild(add);
      title.dataset.treeUiPatched = '1';
    });
  }

  function patchFileRows() {
    document.querySelectorAll('button.runner-file[data-path]:not([data-tree-ui-patched])').forEach(openButton => {
      const path = openButton.dataset.path || '';
      const name = path.split('/').pop() || path;
      const active = openButton.classList.contains('active');

      const row = document.createElement('div');
      row.className = `runner-file-row${active ? ' active' : ''}`;

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'runner-file-delete';
      del.title = `Delete ${name}`;
      del.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      del.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openButton.click();
        window.setTimeout(() => clickHidden('deleteFileButton'), 0);
      });

      const rename = document.createElement('button');
      rename.type = 'button';
      rename.className = 'runner-file-rename';
      rename.title = `Rename ${name}`;
      rename.innerHTML = '<i class="fa-solid fa-pen"></i>';
      rename.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openButton.click();
        window.setTimeout(() => clickHidden('renameFileButton'), 0);
      });

      openButton.dataset.treeUiPatched = '1';
      openButton.parentNode.insertBefore(row, openButton);
      row.appendChild(del);
      row.appendChild(openButton);
      row.appendChild(rename);
    });
  }

  function getCurrentFilePath() {
    const current = document.getElementById('currentFile');
    return current ? (current.textContent || '') : '';
  }

  function getEditor() {
    return document.getElementById('fileEditor');
  }

  function isAstraFile() {
    return getCurrentFilePath().endsWith('.astra');
  }

  function dispatchEditorChange(editor) {
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function removeGeneratedProviderBlock(source) {
    return String(source || '').replace(
      /\n?\s*\/\/ Generative Layers provider configuration[\s\S]*?\/\/ End Generative Layers provider configuration\n?/g,
      '\n'
    );
  }

  function updateInitialSettings(source, template) {
    let updated = source;

    updated = updated.replace(
      /initial\s+setting\(\s*"model"\s*,\s*"[^"]*"\s*\)\s*,\s*setting\(\s*"provider"\s*,\s*"[^"]*"\s*\)\s*;/,
      `initial setting("model", "${template.model}"), setting("provider", "${template.provider}");`
    );

    updated = updated.replace(
      /initial\s+setting\(\s*"provider"\s*,\s*"[^"]*"\s*\)\s*,\s*setting\(\s*"model"\s*,\s*"[^"]*"\s*\)\s*;/,
      `initial setting("model", "${template.model}"), setting("provider", "${template.provider}");`
    );

    return updated;
  }

  function ensureApiKeyEnvBeforeUseProvider(source, template) {
    if (!template.env) return source;
    if (source.includes(`"apiKeyEnv", "${template.env}"`)) return source;

    const lineMatcher = /^([ \t]*)gl\.use_provider\s*\([^;]*\)\s*;.*$/m;
    const match = source.match(lineMatcher);
    if (!match) return source;

    const indent = match[1] || '';
    return source.slice(0, match.index) + `${indent}gl.configure("apiKeyEnv", "${template.env}");\n` + source.slice(match.index);
  }

  function providerBlock(template) {
    if (template.provider === 'fake') {
      return [
        '        // Generative Layers provider configuration',
        '        gl.configure("provider", "fake");',
        '        gl.use_provider();',
        '        // End Generative Layers provider configuration'
      ].join('\n');
    }

    return [
      '        // Generative Layers provider configuration',
      `        gl.configure("provider", "${template.provider}");`,
      `        gl.configure("model", "${template.model}");`,
      `        gl.configure("apiKeyEnv", "${template.env}");`,
      '        gl.use_provider();',
      '        // End Generative Layers provider configuration'
    ].join('\n');
  }

  function insertProviderBlockInMain(source, template) {
    const clean = removeGeneratedProviderBlock(source).trimEnd();
    const mainRule = /rule\s+\+!main\s*\([^)]*\)\s*\{/m;
    const match = clean.match(mainRule);

    if (!match || typeof match.index !== 'number') return clean + '\n\n' + providerBlock(template) + '\n';

    const insertAt = match.index + match[0].length;
    return clean.slice(0, insertAt) + '\n' + providerBlock(template) + clean.slice(insertAt);
  }

  function applyProviderToSource(source, providerKey) {
    const template = PROVIDER_TEMPLATES[providerKey] || PROVIDER_TEMPLATES.gemini;
    let updated = removeGeneratedProviderBlock(source);

    updated = updateInitialSettings(updated, template);

    if (/gl\.use_provider\s*\(/.test(updated)) {
      updated = ensureApiKeyEnvBeforeUseProvider(updated, template);
      if (template.provider !== 'fake') {
        updated = updated.replace(/gl\.use_provider\s*\(\s*"(?:gemini|groq|cerebras|openai|deepseek|fake)"\s*\)\s*;/g, `gl.use_provider("${template.provider}");`);
        updated = updated.replace(/gl\.configure\s*\(\s*"provider"\s*,\s*"(?:gemini|groq|cerebras|openai|deepseek|fake)"\s*\)\s*;/g, `gl.configure("provider", "${template.provider}");`);
        updated = updated.replace(/gl\.configure\s*\(\s*"model"\s*,\s*"[^"]*"\s*\)\s*;/g, `gl.configure("model", "${template.model}");`);
      }
      return updated;
    }

    return insertProviderBlockInMain(updated, template);
  }

  function detectProvider(source) {
    const text = String(source || '').toLowerCase();
    for (const key of Object.keys(PROVIDER_TEMPLATES)) {
      if (key !== 'fake' && text.includes(`"${key}"`)) return key;
      if (PROVIDER_TEMPLATES[key].env && text.includes(PROVIDER_TEMPLATES[key].env.toLowerCase())) return key;
    }
    return 'fake';
  }

  function applySelectedProvider() {
    const editor = getEditor();
    const select = document.getElementById('runnerProviderSelect');
    if (!editor || !select) return;

    if (!isAstraFile()) {
      window.alert('Provider code can only be inserted into an ASTRA file. Open /astra/Main.astra first.');
      return;
    }

    const updated = applyProviderToSource(editor.value, select.value);
    editor.value = updated;
    dispatchEditorChange(editor);
  }

  function clearGeneratedProviderCode() {
    const editor = getEditor();
    if (!editor || !isAstraFile()) return;
    editor.value = removeGeneratedProviderBlock(editor.value).trimEnd() + '\n';
    dispatchEditorChange(editor);
  }

  function syncProviderSelect() {
    const editor = getEditor();
    const select = document.getElementById('runnerProviderSelect');
    if (!editor || !select || !isAstraFile()) return;
    select.value = detectProvider(editor.value);
  }

  function installProviderChooser() {
    if (document.getElementById('runnerProviderPanel')) return;

    const editorWrap = document.querySelector('.runner-editor-wrap');
    if (!editorWrap) return;

    const panel = document.createElement('div');
    panel.id = 'runnerProviderPanel';
    panel.className = 'runner-provider-panel';

    const options = Object.entries(PROVIDER_TEMPLATES).map(([key, value]) =>
      `<option value="${key}">${value.label}${key === 'groq' ? ' (not Grok)' : ''}</option>`
    ).join('');

    panel.innerHTML = `
      <div class="runner-provider-panel-left"><i class="fa-solid fa-key"></i><span>Provider code</span></div>
      <div class="runner-provider-controls">
        <select id="runnerProviderSelect" class="runner-provider-select" aria-label="Provider code selector">${options}</select>
        <button id="runnerProviderApply" class="runner-provider-apply" type="button"><i class="fa-solid fa-code"></i><span>Apply code</span></button>
        <button id="runnerProviderClear" class="runner-provider-clear" type="button"><i class="fa-solid fa-eraser"></i><span>Clear generated</span></button>
      </div>
    `;

    editorWrap.insertBefore(panel, editorWrap.firstChild);

    document.getElementById('runnerProviderApply').addEventListener('click', applySelectedProvider);
    document.getElementById('runnerProviderClear').addEventListener('click', clearGeneratedProviderCode);

    const editor = getEditor();
    if (editor) {
      editor.addEventListener('input', () => window.setTimeout(syncProviderSelect, 0));
    }

    const tree = document.getElementById('fileTree');
    if (tree) {
      tree.addEventListener('click', () => window.setTimeout(syncProviderSelect, 20));
    }

    window.setTimeout(syncProviderSelect, 200);
    window.setTimeout(syncProviderSelect, 700);
  }

  function patchTree() {
    addStyle();
    patchHeader();
    patchRootTitles();
    patchFileRows();
    installProviderChooser();
  }

  function init() {
    patchTree();
    const tree = document.getElementById('fileTree');
    if (!tree) return;

    const observer = new MutationObserver(() => window.setTimeout(patchTree, 0));
    observer.observe(tree, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
