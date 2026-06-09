(() => {
  const ASTRA_RUN_URL = 'https://code.generativelayers.com/api/run-astra';

  const PROVIDERS = {
    cerebras: { label: 'Cerebras', env: 'CEREBRAS_API_KEY' },
    groq: { label: 'Groq', env: 'GROQ_API_KEY' },
    gemini: { label: 'Gemini', env: 'GEMINI_API_KEY' },
    openai: { label: 'OpenAI', env: 'OPENAI_API_KEY' },
    deepseek: { label: 'DeepSeek', env: 'DEEPSEEK_API_KEY' }
  };

  const DEFAULT_ASTRA_SOURCE = [
    'agent Main {',
    '    module Console C;',
    '    module System system;',
    '',
    '    // Generative Layers short ASTRA alias.',
    '    module gl.astra.GL gl;',
    '',
    '    // Old full path still works:',
    '    // module gl.adapter.astra.AstraAdapter gl;',
    '',
    '    rule +!main(list args) {',
    '        C.println("Hello from ASTRA on code.generativelayers.com");',
    '        C.println("Generative Layers ASTRA alias is loaded: module gl.astra.GL gl;");',
    '        system.exit();',
    '    }',
    '}'
  ].join('\n');
  const DEFAULT_POM = [
    '<project xmlns="http://maven.apache.org/POM/4.0.0"',
    '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">',
    '',
    '    <modelVersion>4.0.0</modelVersion>',
    '',
    '    <groupId>com.generativelayers.server</groupId>',
    '    <artifactId>gl-astra-smoke</artifactId>',
    '    <version>0.1.5</version>',
    '',
    '    <parent>',
    '        <groupId>com.astralanguage</groupId>',
    '        <artifactId>astra-base</artifactId>',
    '        <version>2.0.13</version>',
    '    </parent>',
    '',
    '    <properties>',
    '        <maven.compiler.release>17</maven.compiler.release>',
    '        <astra.main>Main</astra.main>',
    '    </properties>',
    '',
    '    <dependencies>',
    '        <dependency>',
    '            <groupId>com.generativelayers</groupId>',
    '            <artifactId>generative-layers-core</artifactId>',
    '            <version>0.1.5</version>',
    '        </dependency>',
    '',
    '        <!-- ASTRA extra modules -->',
    '        <dependency>',
    '            <groupId>com.astralanguage</groupId>',
    '            <artifactId>astra-gui</artifactId>',
    '            <version>2.0.13</version>',
    '        </dependency>',
    '        <dependency>',
    '            <groupId>com.astralanguage</groupId>',
    '            <artifactId>astra-protocols</artifactId>',
    '            <version>2.0.13</version>',
    '        </dependency>',
    '        <dependency>',
    '            <groupId>com.astralanguage</groupId>',
    '            <artifactId>astra-cartago</artifactId>',
    '            <version>2.0.13</version>',
    '        </dependency>',
    '        <dependency>',
    '            <groupId>com.astralanguage</groupId>',
    '            <artifactId>astra-eis-0.5</artifactId>',
    '            <version>2.0.13</version>',
    '        </dependency>',
    '        <dependency>',
    '            <groupId>com.astralanguage</groupId>',
    '            <artifactId>astra-eis-0.7</artifactId>',
    '            <version>2.0.13</version>',
    '        </dependency>',
    '        <dependency>',
    '            <groupId>com.astralanguage</groupId>',
    '            <artifactId>astra-langchain4j</artifactId>',
    '            <version>2.0.13</version>',
    '        </dependency>',
    '        <dependency>',
    '            <groupId>com.astralanguage</groupId>',
    '            <artifactId>astra-unittest</artifactId>',
    '            <version>2.0.13</version>',
    '        </dependency>',
    '    </dependencies>',
    '',
    '    <build>',
    '        <defaultGoal>clean compile astra:deploy</defaultGoal>',
    '        <plugins>',
    '            <plugin>',
    '                <groupId>com.astralanguage</groupId>',
    '                <artifactId>astra-maven-plugin</artifactId>',
    '                <version>2.0.13</version>',
    '            </plugin>',
    '        </plugins>',
    '    </build>',
    '</project>'
  ].join('\n');

  let files = {
    '/astra/Main.astra': DEFAULT_ASTRA_SOURCE,
    '/pom.xml': DEFAULT_POM
  };
  let currentPath = '/astra/Main.astra';

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function initElements() {
    els.fileTree = $('fileTree');
    els.editor = $('fileEditor');
    els.currentFile = $('currentFile');
    els.newAstra = $('newAstraFileButton');
    els.newJava = $('newJavaFileButton');
    els.rename = $('renameFileButton');
    els.delete = $('deleteFileButton');
    els.run = $('runAstraButton');
    els.loadExample = $('loadExampleButton');
    els.clearOutput = $('clearOutputButton');
    els.status = $('runnerStatus');
    els.output = $('runnerOutput');
    els.metaStatus = $('metaStatus');
    els.metaReturnCode = $('metaReturnCode');
    els.metaElapsed = $('metaElapsed');
    els.apiKeyPanel = $('apiKeyPanel');
    els.apiKeyIntro = $('apiKeyIntro');
    els.apiKeyWarning = $('apiKeyWarning');
    els.apiKeyWarningText = $('apiKeyWarningText');
  }

  function saveCurrentFile() {
    if (currentPath && Object.prototype.hasOwnProperty.call(files, currentPath)) {
      files[currentPath] = els.editor.value;
    }
  }

  function sortedPaths(root) {
    return Object.keys(files)
      .filter(path => path.startsWith(root + '/'))
      .sort((a, b) => a.localeCompare(b));
  }

  function renderTree() {
    saveCurrentFile();

    const astraFiles = sortedPaths('/astra');
    const javaFiles = sortedPaths('/java');
    const hasPom = Object.prototype.hasOwnProperty.call(files, '/pom.xml');

    let html = [
      renderRoot('/astra', astraFiles),
      renderRoot('/java', javaFiles)
    ].join('');

    // pom.xml as a standalone root-level file
    if (hasPom) {
      const active = currentPath === '/pom.xml' ? ' active' : '';
      html += `<div class="runner-root"><button type="button" class="runner-file${active}" data-path="/pom.xml"><i class="fa-regular fa-file-lines"></i><span>pom.xml</span></button></div>`;
    }

    els.fileTree.innerHTML = html;

    els.fileTree.querySelectorAll('[data-path]').forEach(button => {
      button.addEventListener('click', () => openFile(button.dataset.path));
    });
  }

  function renderRoot(root, paths) {
    const icons = { '/astra': 'fa-robot', '/java': 'fa-brands fa-java' };
    const icon = icons[root] || 'fa-folder';
    const empty = paths.length === 0 ? '<div class="runner-empty-folder">empty</div>' : '';
    const items = paths.map(path => {
      const active = path === currentPath ? ' active' : '';
      const shortName = path.slice(root.length + 1);
      return `<button type="button" class="runner-file${active}" data-path="${escapeHtml(path)}"><i class="fa-regular fa-file-code"></i><span>${escapeHtml(shortName)}</span></button>`;
    }).join('');

    return `<div class="runner-root"><div class="runner-root-title"><i class="fa-solid ${icon}"></i><span>${root}</span></div>${empty}${items}</div>`;
  }

  function openFile(path) {
    saveCurrentFile();
    if (!Object.prototype.hasOwnProperty.call(files, path)) return;
    currentPath = path;
    els.editor.value = files[path];
    els.currentFile.textContent = path;
    renderTreeNoSave();
    updateApiKeyUI();
  }

  function renderTreeNoSave() {
    const astraFiles = sortedPaths('/astra');
    const javaFiles = sortedPaths('/java');
    const hasPom = Object.prototype.hasOwnProperty.call(files, '/pom.xml');

    let html = [renderRoot('/astra', astraFiles), renderRoot('/java', javaFiles)].join('');
    if (hasPom) {
      const active = currentPath === '/pom.xml' ? ' active' : '';
      html += `<div class="runner-root"><button type="button" class="runner-file${active}" data-path="/pom.xml"><i class="fa-regular fa-file-lines"></i><span>pom.xml</span></button></div>`;
    }
    els.fileTree.innerHTML = html;
    els.fileTree.querySelectorAll('[data-path]').forEach(button => {
      button.addEventListener('click', () => openFile(button.dataset.path));
    });
  }

  function cleanPathName(kind, rawName) {
    let name = String(rawName || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    name = name.replace(/^astra\//i, '').replace(/^java\//i, '').replace(/^src\/main\/astra\//i, '').replace(/^src\/main\/java\//i, '');

    if (!name) throw new Error('Filename is empty.');
    if (name.includes('..') || name.startsWith('/') || name.split('/').some(part => !part)) throw new Error('Invalid path.');
    if (!/^[A-Za-z0-9_.$/-]+$/.test(name)) throw new Error('Use only letters, numbers, underscore, dash, dot, dollar sign, and slash.');

    if (kind === 'astra' && !name.endsWith('.astra')) name += '.astra';
    if (kind === 'java' && !name.endsWith('.java')) name += '.java';

    if (kind === 'astra' && !/^[A-Za-z0-9_.$-]+\.astra$/.test(name)) {
      throw new Error('ASTRA files must be directly inside /astra and end with .astra.');
    }

    return `/${kind}/${name}`;
  }

  function createFile(kind) {
    saveCurrentFile();
    const examples = { astra: 'Worker.astra', java: 'gl/MyHelper.java', resources: 'map.txt' };
    const example = examples[kind] || 'file.txt';
    const raw = window.prompt(`New ${kind.toUpperCase()} file inside /${kind}`, example);
    if (raw === null) return;

    try {
      const path = cleanPathName(kind, raw);
      if (Object.prototype.hasOwnProperty.call(files, path)) throw new Error('File already exists.');
      if (kind === 'astra') files[path] = astraTemplate(path);
      else if (kind === 'java') files[path] = javaTemplate(path);
      else files[path] = ''; // resources start empty
      currentPath = path;
      els.editor.value = files[path];
      els.currentFile.textContent = path;
      renderTree();
      updateApiKeyUI();
    } catch (error) {
      window.alert(error.message);
    }
  }

  // Expose for tree-ui resource button
  window.__glCreateResourceFile = function() { createFile('resources'); };

  function astraTemplate(path) {
    const agentName = path.split('/').pop().replace(/\.astra$/, '') || 'Worker';
    return [
      `agent ${agentName} {`,
      '    module Console C;',
      '    module System system;',
      '',
      '    rule +!main(list args) {',
      `        C.println("${agentName} started");`,
      '        system.exit();',
      '    }',
      '}'
    ].join('\n');
  }

  function javaTemplate(path) {
    const relative = path.replace(/^\/java\//, '');
    const parts = relative.split('/');
    const fileName = parts.pop() || 'MyHelper.java';
    const className = fileName.replace(/\.java$/, '') || 'MyHelper';
    const packageName = parts.length ? parts.join('.') : '';
    const packageLine = packageName ? `package ${packageName};\n\n` : '';
    return `${packageLine}public class ${className} {\n    public static String hello() {\n        return "Hello from Java";\n    }\n}\n`;
  }

  function renameCurrentFile() {
    saveCurrentFile();
    if (!currentPath) return;
    const kind = currentPath.startsWith('/astra/') ? 'astra' : 'java';
    const currentName = currentPath.replace(`/${kind}/`, '');
    const raw = window.prompt('Rename file', currentName);
    if (raw === null) return;

    try {
      const nextPath = cleanPathName(kind, raw);
      if (nextPath !== currentPath && Object.prototype.hasOwnProperty.call(files, nextPath)) throw new Error('File already exists.');
      files[nextPath] = files[currentPath];
      delete files[currentPath];
      currentPath = nextPath;
      els.currentFile.textContent = currentPath;
      renderTree();
    } catch (error) {
      window.alert(error.message);
    }
  }

  function deleteCurrentFile() {
    saveCurrentFile();
    if (!currentPath) return;
    if (!window.confirm(`Delete ${currentPath}?`)) return;

    delete files[currentPath];
    const remaining = Object.keys(files).sort();
    currentPath = remaining[0] || null;
    els.editor.value = currentPath ? files[currentPath] : '';
    els.currentFile.textContent = currentPath || 'No file selected';
    renderTree();
    updateApiKeyUI();
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function stripLineComments(source) {
    return String(source || '').replace(/\/\/.*$/gm, '');
  }

  function fullProjectText() {
    saveCurrentFile();
    return Object.values(files).join('\n');
  }

  function selectedProviderKey() {
    const selector = document.getElementById('apiKeyProviderSelect');
    if (!selector) return '';
    if (selector.value === 'custom') return '__custom__';
    return Object.prototype.hasOwnProperty.call(PROVIDERS, selector.value) ? selector.value : '';
  }

  function detectRequiredProvidersFallback() {
    const clean = stripLineComments(fullProjectText()).toLowerCase();
    const found = [];

    Object.keys(PROVIDERS).forEach(provider => {
      const exactProvider = new RegExp(`(?:use_provider|provider|set_provider|configure)\\s*\\(?.{0,80}["']${provider}["']`, 'i');
      const providerSetting = new RegExp(`["']provider["']\\s*,\\s*["']${provider}["']`, 'i');
      const envName = PROVIDERS[provider].env.toLowerCase();
      if (exactProvider.test(clean) || providerSetting.test(clean) || clean.includes(envName)) found.push(provider);
    });

    if (!found.includes('gemini') && /gemini-[a-z0-9_.-]+/i.test(clean)) found.push('gemini');
    if (!found.includes('deepseek') && /deepseek-[a-z0-9_.-]+/i.test(clean)) found.push('deepseek');
    if (!found.includes('groq') && /(llama-3|llama3|mixtral|gemma)/i.test(clean)) found.push('groq');
    if (!found.includes('cerebras') && /gpt-oss/i.test(clean)) found.push('cerebras');

    return [...new Set(found)];
  }

  function providerList(providers) {
    return providers.map(provider => `${PROVIDERS[provider].label} (${PROVIDERS[provider].env})`).join(', ');
  }

  function getProviderInput(provider) {
    return document.querySelector(`[data-provider-key="${provider}"]`);
  }

  function getApiKeyState() {
    // Use new smart panel if available
    if (typeof window.__glGetApiKeys === 'function') {
      const apiKeys = window.__glGetApiKeys();
      const missing = typeof window.__glGetMissingProviders === 'function' ? window.__glGetMissingProviders() : [];
      return { required: Object.keys(apiKeys).length > 0 || missing.length > 0 ? ['detected'] : [], apiKeys, missing };
    }
    // Fallback to old detection
    const required = detectRequiredProvidersFallback();
    const apiKeys = {};
    const missing = [];
    required.forEach(provider => {
      const input = getProviderInput(provider);
      const value = input ? input.value.trim() : '';
      if (value) apiKeys[PROVIDERS[provider].env] = value;
      else missing.push(provider);
    });
    return { required, apiKeys, missing };
  }

  function updateApiKeyUI() {
    // Always hide old panel — new smart panel handles everything
    if (els.apiKeyPanel) els.apiKeyPanel.hidden = true;
    if (els.apiKeyWarning) els.apiKeyWarning.hidden = true;
    return getApiKeyState();
  }

  function serverFilesPayload() {
    saveCurrentFile();
    const payload = {};

    Object.entries(files).forEach(([path, content]) => {
      if (path.startsWith('/astra/')) payload[`src/main/astra/${path.slice('/astra/'.length)}`] = content;
      if (path.startsWith('/java/')) payload[`src/main/java/${path.slice('/java/'.length)}`] = content;
    });

    return payload;
  }

  // Expose all code for external detectors (GUI, API keys)
  window.__glGetAllCode = function() {
    return Object.values(files).join('\n');
  };

  function validateProjectBeforeRun() {
    saveCurrentFile();
    if (!Object.prototype.hasOwnProperty.call(files, '/astra/Main.astra')) {
      return 'Main.astra is required. Create /astra/Main.astra because the hosted runner starts agent Main.';
    }
    if (!/agent\s+Main\b/.test(files['/astra/Main.astra'])) {
      return '/astra/Main.astra must contain agent Main.';
    }
    return '';
  }

  function setRunning(value) {
    els.loadExample.disabled = value;
    els.status.textContent = value ? 'Running…' : 'Ready';
  }

  function resetOutput() {
    els.metaStatus.textContent = 'Idle';
    els.metaReturnCode.textContent = '—';
    els.metaElapsed.textContent = '—';
    els.output.textContent = 'Create or edit files in /astra and /java, then press “Run Project”.';
  }

  function norm(output) {
    return output ? String(output).replace(/\\n/g, '\n') : '';
  }

  function renderResult(data) {
    els.metaStatus.textContent = data.status || 'unknown';
    els.metaReturnCode.textContent = data.return_code ?? '—';
    els.metaElapsed.textContent = data.elapsed_seconds ? `${data.elapsed_seconds}s` : '—';
    els.output.textContent = norm(data.output) || JSON.stringify(data, null, 2);
    els.status.textContent = data.status === 'completed' ? 'Completed' : 'Finished with problem';
  }

  async function runProject() {
    const validationError = validateProjectBeforeRun();
    if (validationError) {
      els.metaStatus.textContent = 'Project invalid';
      els.status.textContent = 'Project invalid';
      els.output.textContent = validationError;
      return;
    }

    const keyState = updateApiKeyUI();
    // Only block if there are detected providers with missing keys
    if (keyState.missing.length > 0) {
      const missingText = Array.isArray(keyState.missing) ? keyState.missing.join(', ') : String(keyState.missing);
      els.metaStatus.textContent = 'API key missing';
      els.metaReturnCode.textContent = '—';
      els.metaElapsed.textContent = '—';
      els.status.textContent = 'API key missing';
      els.output.textContent = `Missing API keys: ${missingText}. Fill them in the panel above, then try again.`;
      const keysPanel = document.getElementById('glKeysPanel');
      if (keysPanel) keysPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setRunning(true);
    els.metaStatus.textContent = 'Running';
    els.metaReturnCode.textContent = '—';
    els.metaElapsed.textContent = '—';
    els.output.textContent = 'Sending ASTRA project to the hosted runner…';

    try {
      const body = {
        source: files['/astra/Main.astra'],
        files: serverFilesPayload(),
        pom_xml: files['/pom.xml'] || null
      };
      if (Object.keys(keyState.apiKeys).length > 0) body.api_keys = keyState.apiKeys;

      const response = await fetch(ASTRA_RUN_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); }
      catch { data = { status: response.ok ? 'completed' : 'failed', return_code: response.status, elapsed_seconds: null, output: text }; }

      if (!response.ok) {
        data.status = data.status || 'failed';
        data.return_code = data.return_code || response.status;
      }

      renderResult(data);
    } catch (error) {
      els.metaStatus.textContent = 'Request failed';
      els.metaReturnCode.textContent = '—';
      els.metaElapsed.textContent = '—';
      els.status.textContent = 'Failed';
      els.output.textContent = 'The browser could not reach the hosted runner.\n\n' + error;
    } finally {
      setRunning(false);
    }
  }

  function loadDefaultProject() {
    files = { '/astra/Main.astra': DEFAULT_ASTRA_SOURCE };
    currentPath = '/astra/Main.astra';
    els.editor.value = files[currentPath];
    els.currentFile.textContent = currentPath;
    renderTree();
    resetOutput();
    updateApiKeyUI();
    els.status.textContent = 'Example loaded';
  }

  function installIncomingSource() {
    if (!window.location.hash.startsWith('#load=')) return;

    try {
      const payload = JSON.parse(decodeURIComponent(window.location.hash.slice(6)));
      if (!payload.source) return;
      files = { '/astra/Main.astra': payload.source };
      currentPath = '/astra/Main.astra';
      els.editor.value = payload.source;
      els.currentFile.textContent = currentPath;
      renderTree();
      updateApiKeyUI();
      els.output.textContent = `Loaded: ${payload.title || 'ASTRA example'}\nCheck required API keys if the example uses an LLM provider, then press “Run Project”.`;
      els.status.textContent = 'Example loaded';
      els.metaStatus.textContent = 'Loaded';
      els.metaReturnCode.textContent = '—';
      els.metaElapsed.textContent = '—';
      window.setTimeout(() => (document.getElementById('run-code') || els.editor).scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (error) {
      console.warn('Could not load ASTRA example into runner.', error);
    }
  }

  function installEvents() {
    els.editor.addEventListener('input', () => {
      saveCurrentFile();
      updateApiKeyUI();
    });

    els.editor.addEventListener('keydown', event => {
      if (event.key === 'Tab') {
        event.preventDefault();
        const start = els.editor.selectionStart;
        const end = els.editor.selectionEnd;
        els.editor.value = els.editor.value.substring(0, start) + '    ' + els.editor.value.substring(end);
        els.editor.selectionStart = els.editor.selectionEnd = start + 4;
        saveCurrentFile();
        updateApiKeyUI();
      }
    });

    document.querySelectorAll('[data-provider-key]').forEach(input => input.addEventListener('input', updateApiKeyUI));
    els.newAstra.addEventListener('click', () => createFile('astra'));
    els.newJava.addEventListener('click', () => createFile('java'));
    els.rename.addEventListener('click', renameCurrentFile);
    els.delete.addEventListener('click', deleteCurrentFile);
    els.run.addEventListener('click', runProject);
    els.loadExample.addEventListener('click', loadDefaultProject);
    els.clearOutput.addEventListener('click', resetOutput);
  }

  function init() {
    initElements();
    if (!els.editor) return;
    els.editor.value = files[currentPath];
    els.currentFile.textContent = currentPath;
    renderTree();
    installEvents();
    installIncomingSource();
    updateApiKeyUI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
