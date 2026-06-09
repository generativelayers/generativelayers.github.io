(() => {
  const ASTRA_RUN_URL = 'https://code.generativelayers.com/api/run-astra';

  // ── Toast notification utility ─────────────────────────
  function showRunnerToast(message, type = 'info') {
    // Ensure styles exist
    if (!document.getElementById('gl-toast-style')) {
      const s = document.createElement('style');
      s.id = 'gl-toast-style';
      s.textContent = `
        .gl-toast-container {
          position: fixed; top: 16px; right: 16px; z-index: 10000;
          display: flex; flex-direction: column; gap: 8px; pointer-events: none;
        }
        .gl-toast {
          pointer-events: auto;
          display: flex; align-items: center; gap: 10px;
          padding: 12px 18px; border-radius: 10px;
          font-size: 14px; font-weight: 600;
          color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          animation: glToastIn 0.35s ease-out, glToastOut 0.35s ease-in forwards;
          animation-delay: 0s, 3.5s;
          max-width: 380px;
        }
        .gl-toast.info { background: #1e40af; }
        .gl-toast.warning { background: #b45309; }
        .gl-toast.error { background: #dc2626; }
        .gl-toast.success { background: #059669; }
        .gl-toast i { font-size: 16px; }
        @keyframes glToastIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes glToastOut {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(40px); }
        }
      `;
      document.head.appendChild(s);
    }
    // Ensure container
    let container = document.querySelector('.gl-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'gl-toast-container';
      document.body.appendChild(container);
    }
    const icons = { info: 'fa-circle-info', warning: 'fa-triangle-exclamation', error: 'fa-circle-xmark', success: 'fa-circle-check' };
    const toast = document.createElement('div');
    toast.className = `gl-toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
  window.showRunnerToast = showRunnerToast;

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
  let emptyFolders = new Set();

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

  function buildFolderTree(basePath, paths) {
    const tree = { folders: {}, files: [] };
    paths.forEach(fullPath => {
      const relative = fullPath.slice(basePath.length + 1);
      const slashIdx = relative.indexOf('/');
      if (slashIdx === -1) {
        tree.files.push({ name: relative, fullPath });
      } else {
        const folder = relative.slice(0, slashIdx);
        if (!tree.folders[folder]) tree.folders[folder] = [];
        tree.folders[folder].push(fullPath);
      }
    });
    const built = {};
    Object.entries(tree.folders).forEach(([name, sub]) => {
      built[name] = buildFolderTree(basePath + '/' + name, sub);
    });
    // Merge empty folders
    emptyFolders.forEach(fp => {
      if (!fp.startsWith(basePath + '/')) return;
      const rel = fp.slice(basePath.length + 1);
      const seg = rel.indexOf('/') === -1 ? rel : rel.slice(0, rel.indexOf('/'));
      if (!built[seg]) built[seg] = buildFolderTree(basePath + '/' + seg, []);
    });
    tree.folders = built;
    return tree;
  }

  function renderFolderContents(tree, basePath) {
    let html = '';
    Object.keys(tree.folders).sort().forEach(name => {
      const fp = basePath + '/' + name;
      html += `<div class="runner-folder" data-folder-path="${escapeHtml(fp)}">`;
      html += `<div class="runner-folder-head" data-folder-path="${escapeHtml(fp)}">`;
      html += `<i class="fa-solid fa-chevron-down runner-chevron"></i>`;
      html += `<i class="fa-solid fa-folder-open runner-folder-ico"></i>`;
      html += `<span>${escapeHtml(name)}</span>`;
      html += `</div><div class="runner-folder-body">`;
      html += renderFolderContents(tree.folders[name], fp);
      html += `</div></div>`;
    });
    tree.files.sort((a, b) => a.name.localeCompare(b.name)).forEach(f => {
      const active = f.fullPath === currentPath ? ' active' : '';
      html += `<button type="button" class="runner-file${active}" data-path="${escapeHtml(f.fullPath)}"><i class="fa-regular fa-file-code"></i><span>${escapeHtml(f.name)}</span></button>`;
    });
    if (Object.keys(tree.folders).length === 0 && tree.files.length === 0) {
      html += '<div class="runner-empty-folder">empty</div>';
    }
    return html;
  }

  function renderRoot(root, paths) {
    const icons = { '/astra': 'fa-robot', '/java': 'fa-brands fa-java' };
    const icon = icons[root] || 'fa-folder';
    const contents = paths.length === 0
      ? '<div class="runner-empty-folder">empty</div>'
      : renderFolderContents(buildFolderTree(root, paths), root);
    const displayName = root.replace(/^\//, '');
    return `<div class="runner-root"><div class="runner-root-title"><i class="fa-solid ${icon}"></i><span>${displayName}</span></div>${contents}</div>`;
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


    return `/${kind}/${name}`;
  }

  function createFile(kind) {
    saveCurrentFile();
    const examples = { astra: 'Worker.astra', java: 'artifacts/MyArtifact.java' };
    const example = examples[kind] || 'file.txt';
    const raw = window.prompt(`New ${kind.toUpperCase()} file inside /${kind}`, example);
    if (raw === null) return;

    try {
      const path = cleanPathName(kind, raw);
      if (Object.prototype.hasOwnProperty.call(files, path)) throw new Error('File already exists.');
      if (kind === 'astra') files[path] = astraTemplate(path);
      else if (kind === 'java') files[path] = javaTemplate(path);
      else files[path] = '';
      currentPath = path;
      els.editor.value = files[path];
      els.currentFile.textContent = path;
      renderTree();
      updateApiKeyUI();
    } catch (error) {
      window.alert(error.message);
    }
  }

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
    if (currentPath === '/pom.xml') { window.alert('pom.xml cannot be renamed.'); return; }
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
    if (currentPath === '/pom.xml') { window.alert('pom.xml cannot be deleted.'); return; }
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

  // ── Folder operations (for tree-ui) ────────────────────
  function renameFolder(folderPath) {
    saveCurrentFile();
    const root = folderPath.startsWith('/astra') ? '/astra' : '/java';
    const relative = folderPath.slice(root.length + 1);
    const raw = window.prompt('Rename folder', relative);
    if (raw === null) return;
    const cleaned = raw.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!cleaned || cleaned.includes('..') || !/^[A-Za-z0-9_.$/-]+$/.test(cleaned)) {
      window.alert('Invalid folder name.'); return;
    }
    const newFolder = root + '/' + cleaned;
    if (newFolder === folderPath) return;
    const affected = Object.keys(files).filter(p => p.startsWith(folderPath + '/'));
    if (affected.length === 0) return;
    for (const old of affected) {
      const np = newFolder + old.slice(folderPath.length);
      if (Object.prototype.hasOwnProperty.call(files, np) && !affected.includes(np)) {
        window.alert('Conflict: ' + np + ' already exists.'); return;
      }
    }
    const moved = {};
    affected.forEach(p => { moved[newFolder + p.slice(folderPath.length)] = files[p]; delete files[p]; });
    Object.assign(files, moved);
    // Update empty folders
    const efRemove = [], efAdd = [];
    emptyFolders.forEach(fp => {
      if (fp.startsWith(folderPath + '/') || fp === folderPath) {
        efRemove.push(fp); efAdd.push(newFolder + fp.slice(folderPath.length));
      }
    });
    efRemove.forEach(fp => emptyFolders.delete(fp));
    efAdd.forEach(fp => emptyFolders.add(fp));
    if (currentPath && currentPath.startsWith(folderPath + '/')) {
      currentPath = newFolder + currentPath.slice(folderPath.length);
      els.editor.value = files[currentPath] || '';
      els.currentFile.textContent = currentPath;
    }
    renderTree();
    saveToStorage();
  }

  function deleteFolder(folderPath) {
    saveCurrentFile();
    const affected = Object.keys(files).filter(p => p.startsWith(folderPath + '/'));
    if (affected.length === 0) return;
    const name = folderPath.split('/').pop();
    if (!window.confirm(`Delete "${name}" and its ${affected.length} file(s)?`)) return;
    affected.forEach(p => delete files[p]);
    // Clean up empty folders within
    emptyFolders.forEach(fp => {
      if (fp.startsWith(folderPath + '/') || fp === folderPath) emptyFolders.delete(fp);
    });
    if (currentPath && currentPath.startsWith(folderPath + '/')) {
      const remaining = Object.keys(files).sort();
      currentPath = remaining[0] || null;
      els.editor.value = currentPath ? files[currentPath] : '';
      els.currentFile.textContent = currentPath || 'No file selected';
    }
    renderTree();
    updateApiKeyUI();
    saveToStorage();
  }

  function createFileInFolder(folderPath) {
    saveCurrentFile();
    const kind = folderPath.startsWith('/astra') ? 'astra' : 'java';
    const ext = kind === 'astra' ? '.astra' : '.java';
    const raw = window.prompt(`New file in ${folderPath}`, kind === 'astra' ? 'Agent.astra' : 'MyClass.java');
    if (raw === null) return;
    let name = raw.trim();
    if (!name) return;
    if (!name.endsWith(ext)) name += ext;
    if (!/^[A-Za-z0-9_.$/-]+$/.test(name)) {
      window.alert('Invalid file name.'); return;
    }
    const path = folderPath + '/' + name;
    if (Object.prototype.hasOwnProperty.call(files, path)) {
      window.alert('File already exists.'); return;
    }
    files[path] = kind === 'astra' ? astraTemplate(path) : javaTemplate(path);
    currentPath = path;
    els.editor.value = files[path];
    els.currentFile.textContent = path;
    renderTree();
    updateApiKeyUI();
    saveToStorage();
  }

  window.__glRenameFolder = renameFolder;
  window.__glDeleteFolder = deleteFolder;
  window.__glCreateFileInFolder = createFileInFolder;

  function createFolder(parentPath) {
    const raw = window.prompt('New folder name', 'newFolder');
    if (raw === null) return;
    const cleaned = raw.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!cleaned || cleaned.includes('..') || !/^[A-Za-z0-9_.$/-]+$/.test(cleaned)) {
      window.alert('Invalid folder name.'); return;
    }
    const fp = parentPath + '/' + cleaned;
    const exists = Object.keys(files).some(p => p.startsWith(fp + '/'));
    if (exists || emptyFolders.has(fp)) {
      window.alert('Folder already exists.'); return;
    }
    emptyFolders.add(fp);
    renderTree();
    saveToStorage();
  }
  window.__glCreateFolder = createFolder;

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
    // When execution ends, ensure the button returns to play mode
    if (!value) {
      const btn = document.getElementById('runAstraButton');
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('runner-stop-mode');
        btn.innerHTML = '<i class="fa-solid fa-play"></i><span>Run Project</span>';
        btn.title = '';
      }
    }
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
    els.metaElapsed.textContent = '0.0s';
    els.output.textContent = '';
    els.status.textContent = 'Compiling…';
    const guiBtn = document.getElementById('showGuiButton');
    if (guiBtn) guiBtn.hidden = true;
    if (typeof window.__glGuiReset === 'function') window.__glGuiReset();

    // Live stopwatch — exposed globally so Stop button can freeze it
    if (window.__glElapsedTimer) clearInterval(window.__glElapsedTimer);
    const startTime = Date.now();
    window.__glRunStartTime = startTime;
    window.__glElapsedTimer = setInterval(() => {
      const secs = ((Date.now() - startTime) / 1000).toFixed(1);
      els.metaElapsed.textContent = `${secs}s`;
    }, 100);

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

      if (!response.ok) {
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { output: text }; }
        renderResult({ status: 'failed', return_code: response.status, elapsed_seconds: null, output: data.message || data.output || text });
        return;
      }

      // Stream response line by line
      els.status.textContent = 'Running…';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process all complete lines in the buffer
        let nlIdx;
        while ((nlIdx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);

          const trimmed = line.trim();
          if (trimmed.startsWith('{') && trimmed.includes('"meta"')) {
            try {
              const meta = JSON.parse(trimmed);
              if (meta.type === 'meta') {
                if (meta.gui_port) {
                  const showBtn = () => {
                    const guiBtn = document.getElementById('showGuiButton');
                    if (guiBtn) {
                      guiBtn.hidden = false;
                      if (typeof window.__glGuiShowButton === 'function') {
                        window.__glGuiShowButton();
                      }
                    }
                  };
                  showBtn();
                  setTimeout(showBtn, 500);
                  setTimeout(showBtn, 1500);
                }
                if (meta.gui_resize && meta.gui_width && meta.gui_height) {
                  if (typeof window.__glGuiResize === 'function') {
                    window.__glGuiResize(meta.gui_width, meta.gui_height);
                  }
                }
                if (meta.killed_previous) {
                  showRunnerToast('Previous execution terminated', 'info');
                }
                // Do not output this meta JSON line
                continue;
              }
            } catch (e) {
              console.error('Failed to parse meta line:', line, e);
            }
          }

          // Append regular output line (with newline)
          els.output.textContent += line + '\n';
        }

        // Auto-scroll output to bottom
        els.output.scrollTop = els.output.scrollHeight;
      }

      // Handle any remainder in the buffer
      if (buffer) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('{') && trimmed.includes('"meta"')) {
          try {
            const meta = JSON.parse(trimmed);
            if (meta.type === 'meta') {
              if (meta.gui_port) {
                const guiBtn = document.getElementById('showGuiButton');
                if (guiBtn) guiBtn.hidden = false;
              }
              buffer = '';
            }
          } catch {}
        }
        if (buffer) {
          els.output.textContent += buffer;
        }
        els.output.scrollTop = els.output.scrollHeight;
      }

      // Parse the last line for status (--- Completed/Failed/Timed out ---)
      const outputText = els.output.textContent;
      if (outputText.includes('--- Completed')) {
        els.metaStatus.textContent = 'Completed';
        els.metaReturnCode.textContent = '0';
        els.status.textContent = 'Completed';
      } else if (outputText.includes('--- Timed out')) {
        els.metaStatus.textContent = 'Timeout';
        els.status.textContent = 'Timed out';
      } else if (outputText.includes('--- Exited with code')) {
        const m = outputText.match(/Exited with code (\S+)/);
        els.metaStatus.textContent = 'Failed';
        els.metaReturnCode.textContent = m ? m[1] : '?';
        els.status.textContent = 'Failed';
      } else {
        els.metaStatus.textContent = 'Finished';
        els.status.textContent = 'Finished';
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        els.metaStatus.textContent = 'Stopped';
        els.status.textContent = 'Stopped';
        els.output.textContent += '\n\nExecution stopped by user.';
      } else {
        els.metaStatus.textContent = 'Request failed';
        els.metaReturnCode.textContent = '—';
        els.status.textContent = 'Failed';
        els.output.textContent = 'The browser could not reach the hosted runner.\n\n' + error;
      }
    } finally {
      if (window.__glElapsedTimer) { clearInterval(window.__glElapsedTimer); window.__glElapsedTimer = null; }
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      els.metaElapsed.textContent = `${elapsed}s`;
      setRunning(false);
    }
  }

  function loadDefaultProject() {
    files = { '/astra/Main.astra': DEFAULT_ASTRA_SOURCE, '/pom.xml': DEFAULT_POM };
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

  // ── Open folder (import local ASTRA project) ──────────
  function importFolder() {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.addEventListener('change', () => {
      if (!input.files || input.files.length === 0) return;
      saveCurrentFile();
      const newFiles = {};
      let pomFound = false;
      const readers = [];

      Array.from(input.files).forEach(file => {
        // Get path relative to the selected folder
        const relPath = file.webkitRelativePath || file.name;
        // Skip hidden and target dirs
        if (relPath.includes('/.') || relPath.includes('/target/')) return;

        // pom.xml at root
        const parts = relPath.split('/');
        if (parts.length === 2 && parts[1] === 'pom.xml') {
          readers.push(file.text().then(text => { newFiles['/pom.xml'] = text; pomFound = true; }));
          return;
        }

        // src/main/astra/**/*.astra
        const astraMatch = relPath.match(/src\/main\/astra\/(.+\.astra)$/);
        if (astraMatch) {
          readers.push(file.text().then(text => { newFiles[`/astra/${astraMatch[1]}`] = text; }));
          return;
        }

        // src/main/java/**/*.java
        const javaMatch = relPath.match(/src\/main\/java\/(.+\.java)$/);
        if (javaMatch) {
          readers.push(file.text().then(text => { newFiles[`/java/${javaMatch[1]}`] = text; }));
          return;
        }
      });

      Promise.all(readers).then(() => {
        if (Object.keys(newFiles).length === 0) {
          window.alert('No ASTRA/Java/pom.xml files found in this folder.\nExpected structure: src/main/astra/*.astra and src/main/java/**/*.java');
          return;
        }
        if (!pomFound) newFiles['/pom.xml'] = DEFAULT_POM;
        files = newFiles;
        currentPath = Object.keys(files).find(p => p.endsWith('.astra')) || Object.keys(files)[0];
        els.editor.value = files[currentPath] || '';
        els.currentFile.textContent = currentPath;
        renderTree();
        updateApiKeyUI();
        resetOutput();
        els.status.textContent = 'Folder imported';
        els.output.textContent = `Imported ${Object.keys(files).length} files. Press "Run Project" to execute.`;
        saveToStorage();
      });
    });
    input.click();
  }

  // ── localStorage persistence ──────────────────────────
  const STORAGE_KEY = 'gl-astra-project';

  function saveToStorage() {
    saveCurrentFile();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ files, currentPath, emptyFolders: [...emptyFolders] }));
    } catch (e) { /* quota exceeded — ignore */ }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data && data.files && typeof data.files === 'object') {
        files = data.files;
        currentPath = data.currentPath || Object.keys(files)[0] || '/astra/Main.astra';
        if (Array.isArray(data.emptyFolders)) emptyFolders = new Set(data.emptyFolders);
        return true;
      }
    } catch (e) { /* corrupted — ignore */ }
    return false;
  }

  // Expose for tree-ui buttons
  window.__glImportFolder = importFolder;
  window.__glSaveProject = saveToStorage;

  function resetProject() {
    if (!window.confirm('Start a new project? This will erase all current files and restore the default template.')) return;
    files = {
      '/astra/Main.astra': DEFAULT_ASTRA_SOURCE,
      '/pom.xml': DEFAULT_POM
    };
    emptyFolders = new Set();
    currentPath = '/astra/Main.astra';
    els.editor.value = files[currentPath];
    els.currentFile.textContent = currentPath;
    renderTree();
    updateApiKeyUI();
    saveToStorage();
  }
  window.__glResetProject = resetProject;

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

    // Auto-save on changes
    els.editor.addEventListener('input', () => setTimeout(saveToStorage, 300));
  }

  function init() {
    initElements();
    if (!els.editor) return;

    // Try to restore from localStorage first
    const restored = loadFromStorage();
    if (!restored) {
      // Default project
      files['/pom.xml'] = files['/pom.xml'] || DEFAULT_POM;
    }

    els.editor.value = files[currentPath] || '';
    els.currentFile.textContent = currentPath;
    renderTree();
    installEvents();
    installIncomingSource();
    updateApiKeyUI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
