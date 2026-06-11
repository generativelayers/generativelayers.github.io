(() => {
  /* ── Platform config ───────────────────────────────────── */
  const CFG = window.GL_PLATFORM_CONFIG || {};
  const PLATFORM = window.GL_PLATFORM || 'astra';
  const FLAT_ROOT = !!CFG.flatRoot;
  const SOURCE_FOLDER = CFG.sourceFolder || (FLAT_ROOT ? null : '/astra');
  const AUX_FOLDER = CFG.auxFolder || (FLAT_ROOT ? null : '/java');
  const SOURCE_EXT = CFG.sourceExt || '.astra';
  const AUX_EXT = CFG.auxExt || '.java';
  const EXTRA_EXTS = CFG.extraExts || [];
  const SOURCE_ICON = CFG.sourceIcon || 'fa-robot';
  const AUX_ICON = CFG.auxIcon || 'fa-brands fa-java';
  const BUILD_FILE = CFG.buildFile || '/pom.xml';
  const DEFAULT_FILE = CFG.defaultFile || '/astra/Main.astra';
  const SERVER_ASL_DIR = CFG.serverAslDir || 'src/main/asl';
  const SERVER_JAVA_DIR = CFG.serverJavaDir || 'src/main/java';
  const STORAGE_KEY_CFG = (CFG.storagePrefix || 'gl-astra-') + 'project';

  const RUN_URLS = {
    astra: 'https://code.generativelayers.com/api/run-astra',
    jason: 'https://code.generativelayers.com/api/run-jason',
    jacamo: 'https://code.generativelayers.com/api/run-jacamo'
  };
  const RUN_URL = RUN_URLS[PLATFORM] || RUN_URLS.astra;

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

  /* ── Platform-specific defaults ──────────────────────── */
  const DEFAULT_SOURCES = {
    astra: [
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
      '        !shutdown();',
      '    }',
      '',
      '    rule +!shutdown() {',
      '        system.exit();',
      '    }',
      '}'
    ].join('\n'),
    jason: [
      '// Jason Hello World with Generative Layers',
      '',
      '!start.',
      '',
      '+!start',
      '   <- .println("Hello from Jason on code.generativelayers.com");',
      '      .println("Generative Layers Jason adapter loaded.");',
      '      .stopMAS.'
    ].join('\n'),
    jacamo: [
      '// JaCaMo Hello World with Generative Layers + CArtAgO',
      '// Agents + Artifacts + Organisation',
      '',
      '!start.',
      '',
      '+!start',
      '   <- .println("Hello from JaCaMo on code.generativelayers.com");',
      '      .println("[CArtAgO] Environment active");',
      '      .stopMAS.'
    ].join('\n')
  };
  const DEFAULT_SOURCE = DEFAULT_SOURCES[PLATFORM] || DEFAULT_SOURCES.astra;
  const DEFAULT_POMS = {
    astra: [
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
    ].join('\n'),
    jason: [
      '<project xmlns="http://maven.apache.org/POM/4.0.0">',
      '    <modelVersion>4.0.0</modelVersion>',
      '    <groupId>com.generativelayers.runner</groupId>',
      '    <artifactId>jason-runner</artifactId>',
      '    <version>0.1.5</version>',
      '',
      '    <properties>',
      '        <maven.compiler.source>17</maven.compiler.source>',
      '        <maven.compiler.target>17</maven.compiler.target>',
      '        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>',
      '    </properties>',
      '',
      '    <dependencies>',
      '        <dependency>',
      '            <groupId>com.generativelayers</groupId>',
      '            <artifactId>generative-layers-core</artifactId>',
      '            <version>0.1.5</version>',
      '        </dependency>',
      '        <dependency>',
      '            <groupId>io.github.jason-lang</groupId>',
      '            <artifactId>jason-interpreter</artifactId>',
      '            <version>3.2.0</version>',
      '        </dependency>',
      '    </dependencies>',
      '',
      '    <build>',
      '        <resources>',
      '            <resource>',
      '                <directory>src/main/asl</directory>',
      '                <targetPath>.</targetPath>',
      '            </resource>',
      '            <resource>',
      '                <directory>src/main/resources</directory>',
      '            </resource>',
      '        </resources>',
      '        <plugins>',
      '            <plugin>',
      '                <groupId>org.codehaus.mojo</groupId>',
      '                <artifactId>exec-maven-plugin</artifactId>',
      '                <version>3.1.0</version>',
      '                <configuration>',
      '                    <mainClass>gl.adapter.jason.MASLauncher</mainClass>',
      '                </configuration>',
      '            </plugin>',
      '        </plugins>',
      '    </build>',
      '</project>'
    ].join('\n'),
    jacamo: [
      '<project xmlns="http://maven.apache.org/POM/4.0.0">',
      '    <modelVersion>4.0.0</modelVersion>',
      '    <groupId>com.generativelayers.runner</groupId>',
      '    <artifactId>jacamo-runner</artifactId>',
      '    <version>0.1.5</version>',
      '',
      '    <properties>',
      '        <maven.compiler.source>17</maven.compiler.source>',
      '        <maven.compiler.target>17</maven.compiler.target>',
      '        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>',
      '    </properties>',
      '',
      '    <repositories>',
      '        <repository>',
      '            <id>jacamo-mvn-repo</id>',
      '            <url>https://raw.githubusercontent.com/jacamo-lang/mvn-repo/master</url>',
      '        </repository>',
      '    </repositories>',
      '',
      '    <dependencies>',
      '        <dependency>',
      '            <groupId>com.generativelayers</groupId>',
      '            <artifactId>generative-layers-core</artifactId>',
      '            <version>0.1.5</version>',
      '        </dependency>',
      '        <dependency>',
      '            <groupId>io.github.jason-lang</groupId>',
      '            <artifactId>jason-interpreter</artifactId>',
      '            <version>3.2.0</version>',
      '        </dependency>',
      '        <dependency>',
      '            <groupId>org.jacamo</groupId>',
      '            <artifactId>cartago</artifactId>',
      '            <version>3.1</version>',
      '        </dependency>',
      '        <dependency>',
      '            <groupId>org.jacamo</groupId>',
      '            <artifactId>jaca</artifactId>',
      '            <version>3.1</version>',
      '        </dependency>',
      '        <dependency>',
      '            <groupId>io.vertx</groupId>',
      '            <artifactId>vertx-core</artifactId>',
      '            <version>4.5.10</version>',
      '        </dependency>',
      '    </dependencies>',
      '',
      '    <build>',
      '        <resources>',
      '            <resource>',
      '                <directory>src/agt</directory>',
      '                <targetPath>.</targetPath>',
      '            </resource>',
      '        </resources>',
      '        <plugins>',
      '            <plugin>',
      '                <groupId>org.codehaus.mojo</groupId>',
      '                <artifactId>exec-maven-plugin</artifactId>',
      '                <version>3.1.0</version>',
      '                <configuration>',
      '                    <mainClass>gl.adapter.jason.MASLauncher</mainClass>',
      '                    <arguments>',
      '                        <argument>default_project.mas2j</argument>',
      '                    </arguments>',
      '                </configuration>',
      '            </plugin>',
      '        </plugins>',
      '    </build>',
      '</project>'
    ].join('\n')
  };

  let files = { [DEFAULT_FILE]: DEFAULT_SOURCE };
  if (BUILD_FILE) {
    files[BUILD_FILE] = DEFAULT_POMS[PLATFORM] || DEFAULT_POMS.astra;
  }
  let currentPath = DEFAULT_FILE;
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
    if (!root) return [];
    return Object.keys(files)
      .filter(path => path.startsWith(root + '/'))
      .sort((a, b) => a.localeCompare(b));
  }

  /** Get all project files (excluding build file) sorted */
  function allProjectFiles() {
    return Object.keys(files)
      .filter(p => p !== BUILD_FILE)
      .sort((a, b) => a.localeCompare(b));
  }

  function renderTree() {
    saveCurrentFile();
    const hasBuild = BUILD_FILE && Object.prototype.hasOwnProperty.call(files, BUILD_FILE);
    let html = '';

    if (FLAT_ROOT) {
      // Flat root: single "Project" section with all files
      const projectFiles = allProjectFiles();
      html = renderFlatRoot(projectFiles);
    } else {
      const sourceFiles = sortedPaths(SOURCE_FOLDER);
      const auxFiles = AUX_FOLDER ? sortedPaths(AUX_FOLDER) : [];
      html = [renderRoot(SOURCE_FOLDER, sourceFiles)];
      if (AUX_FOLDER) html.push(renderRoot(AUX_FOLDER, auxFiles));
      html = html.join('');
    }

    // Build file as standalone root-level file
    if (hasBuild) {
      const buildName = (BUILD_FILE || '').replace(/^\//, '');
      const active = currentPath === BUILD_FILE ? ' active' : '';
      html += `<div class="runner-root"><button type="button" class="runner-file${active}" data-path="${BUILD_FILE}"><i class="fa-regular fa-file-lines"></i><span>${buildName}</span></button></div>`;
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
    const icons = {};
    if (SOURCE_FOLDER) icons[SOURCE_FOLDER] = SOURCE_ICON;
    if (AUX_FOLDER) icons[AUX_FOLDER] = AUX_ICON;
    const icon = icons[root] || 'fa-folder';
    const contents = paths.length === 0
      ? '<div class="runner-empty-folder">empty</div>'
      : renderFolderContents(buildFolderTree(root, paths), root);
    const displayName = root.replace(/^\//, '');
    return `<div class="runner-root"><div class="runner-root-title"><i class="fa-solid ${icon}"></i><span>${displayName}</span></div>${contents}</div>`;
  }

  /** Render a flat root tree — all project files under a single "Project" heading */
  function renderFlatRoot(paths) {
    const tree = buildFolderTree('', paths);
    const contents = paths.length === 0
      ? '<div class="runner-empty-folder">empty</div>'
      : renderFolderContents(tree, '');
    return `<div class="runner-root"><div class="runner-root-title"><i class="fa-solid fa-folder-open"></i><span>Project</span></div>${contents}</div>`;
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
    const hasBuild = BUILD_FILE && Object.prototype.hasOwnProperty.call(files, BUILD_FILE);
    let html = '';

    if (FLAT_ROOT) {
      html = renderFlatRoot(allProjectFiles());
    } else {
      const sourceFiles = sortedPaths(SOURCE_FOLDER);
      const auxFiles = AUX_FOLDER ? sortedPaths(AUX_FOLDER) : [];
      html = [renderRoot(SOURCE_FOLDER, sourceFiles)];
      if (AUX_FOLDER) html.push(renderRoot(AUX_FOLDER, auxFiles));
      html = html.join('');
    }

    if (hasBuild) {
      const buildName = (BUILD_FILE || '').replace(/^\//, '');
      const active = currentPath === BUILD_FILE ? ' active' : '';
      html += `<div class="runner-root"><button type="button" class="runner-file${active}" data-path="${BUILD_FILE}"><i class="fa-regular fa-file-lines"></i><span>${buildName}</span></button></div>`;
    }
    els.fileTree.innerHTML = html;
    els.fileTree.querySelectorAll('[data-path]').forEach(button => {
      button.addEventListener('click', () => openFile(button.dataset.path));
    });
  }

  function cleanPathName(kind, rawName) {
    let name = String(rawName || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!FLAT_ROOT) {
      if (SOURCE_FOLDER) name = name.replace(new RegExp(`^${SOURCE_FOLDER.slice(1)}\\/`, 'i'), '');
      if (AUX_FOLDER) name = name.replace(new RegExp(`^${AUX_FOLDER.slice(1)}\\/`, 'i'), '');
    }
    name = name.replace(/^src\/main\/astra\//i, '').replace(/^src\/main\/java\//i, '').replace(/^src\/agt\//i, '').replace(/^src\/main\/asl\//i, '');

    if (!name) throw new Error('Filename is empty.');
    if (name.includes('..') || name.startsWith('/') || name.split('/').some(part => !part)) throw new Error('Invalid path.');
    if (!/^[A-Za-z0-9_.$/-]+$/.test(name)) throw new Error('Use only letters, numbers, underscore, dash, dot, dollar sign, and slash.');

    if (FLAT_ROOT) {
      // In flat mode: accept any filename as-is
      return `/${name}`;
    }

    const sourceKind = SOURCE_FOLDER ? SOURCE_FOLDER.slice(1) : null;
    const auxKind = AUX_FOLDER ? AUX_FOLDER.slice(1) : null;
    if (sourceKind && kind === sourceKind && !name.endsWith(SOURCE_EXT)) name += SOURCE_EXT;
    if (auxKind && kind === auxKind && !name.endsWith(AUX_EXT)) name += AUX_EXT;

    return `/${kind}/${name}`;
  }

  async function createFile(kind) {
    saveCurrentFile();
    let example, promptLabel;
    if (FLAT_ROOT) {
      example = 'agent' + SOURCE_EXT;
      promptLabel = 'new';
    } else {
      const examples = {};
      if (SOURCE_FOLDER) examples[SOURCE_FOLDER.slice(1)] = 'Agent' + SOURCE_EXT;
      if (AUX_FOLDER) examples[AUX_FOLDER.slice(1)] = 'artifacts/MyArtifact' + AUX_EXT;
      example = examples[kind] || 'file.txt';
      promptLabel = kind.toUpperCase();
    }
    const raw = await glPrompt('New file', example);
    if (raw === null) return;

    try {
      const path = cleanPathName(kind, raw);
      if (Object.prototype.hasOwnProperty.call(files, path)) throw new Error('File already exists.');
      if (FLAT_ROOT) {
        // Pick template by extension if recognized, otherwise empty
        if (path.endsWith(SOURCE_EXT)) files[path] = sourceTemplate(path);
        else if (path.endsWith(AUX_EXT)) files[path] = javaTemplate(path);
        else if (path.endsWith('.mas2j')) files[path] = mas2jTemplate();
        else files[path] = '';
      } else {
        if (SOURCE_FOLDER && kind === SOURCE_FOLDER.slice(1)) files[path] = sourceTemplate(path);
        else if (AUX_FOLDER && kind === AUX_FOLDER.slice(1)) files[path] = javaTemplate(path);
        else files[path] = '';
      }
      currentPath = path;
      els.editor.value = files[path];
      els.currentFile.textContent = path;
      renderTree();
      updateApiKeyUI();
    } catch (error) {
      await glAlert(error.message);
    }
  }

  function mas2jTemplate() {
    if (PLATFORM === 'jacamo') {
      return `MAS my_project {\n    environment: jaca.CartagoEnvironment\n    agents:\n        main  agentArchClass jaca.CAgentArch;\n    aslSourcePath: "${SERVER_ASL_DIR}";\n}\n`;
    }
    return `MAS my_project {\n    agents:\n        main;\n    aslSourcePath: "${SERVER_ASL_DIR}";\n}\n`;
  }

  function sourceTemplate(path) {
    const baseName = path.split('/').pop().replace(new RegExp('\\' + SOURCE_EXT + '$'), '') || 'Agent';
    if (PLATFORM === 'astra') {
      return [
        `agent ${baseName} {`,
        '    module Console C;',
        '    module System system;',
        '',
        '    rule +!main(list args) {',
        `        C.println("${baseName} started");`,
        '        !shutdown();',
        '    }',
        '',
        '    rule +!shutdown() {',
        '        system.exit();',
        '    }',
        '}'
      ].join('\n');
    }
    // Jason / JaCaMo AgentSpeak template
    return `// Agent: ${baseName}\n\n!start.\n\n+!start\n   <- .println("${baseName} started");\n      .stopMAS.\n`;
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

  async function renameCurrentFile() {
    saveCurrentFile();
    if (!currentPath) return;
    if (currentPath === BUILD_FILE) { await glAlert(`${(BUILD_FILE || '').replace(/^\//, '')} cannot be renamed.`); return; }
    let kind, currentName;
    if (FLAT_ROOT) {
      kind = currentPath.endsWith(AUX_EXT) ? 'aux' : 'source';
      currentName = currentPath.replace(/^\//, '');
    } else {
      kind = (SOURCE_FOLDER && currentPath.startsWith(SOURCE_FOLDER + '/')) ? SOURCE_FOLDER.slice(1) : (AUX_FOLDER ? AUX_FOLDER.slice(1) : (SOURCE_FOLDER ? SOURCE_FOLDER.slice(1) : ''));
      currentName = currentPath.replace(`/${kind}/`, '');
    }
    const raw = await glPrompt('Rename file', currentName);
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
      await glAlert(error.message);
    }
  }

  async function deleteCurrentFile() {
    saveCurrentFile();
    if (!currentPath) return;
    if (currentPath === BUILD_FILE) { await glAlert(`${(BUILD_FILE || '').replace(/^\//, '')} cannot be deleted.`); return; }
    if (!(await glConfirm(`Delete ${currentPath}?`))) return;

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
      if (path === BUILD_FILE) return; // pom.xml sent separately

      if (FLAT_ROOT) {
        // Flat root: map files to server-expected directories
        const rel = path.replace(/^\//, '');

        // If the file already has Maven/Gradle structure, send AS-IS
        // (e.g. imported from a project with src/main/asl/... layout)
        if (rel.startsWith('src/')) {
          payload[rel] = content;
        } else if (path.endsWith(SOURCE_EXT)) {
          payload[`${SERVER_ASL_DIR}/${rel}`] = content;
        } else if (path.endsWith(AUX_EXT)) {
          payload[`${SERVER_JAVA_DIR}/${rel}`] = content;
        } else if (path.endsWith('.mas2j')) {
          // .mas2j files go at the project root on the server
          payload[rel] = content;
        } else {
          // Any other file type (resources, configs, data):
          // send to src/main/resources/ so the server accepts them
          payload[`src/main/resources/${rel}`] = content;
        }
      } else if (PLATFORM === 'astra') {
        if (path.startsWith('/astra/')) payload[`src/main/astra/${path.slice('/astra/'.length)}`] = content;
        if (path.startsWith('/java/')) payload[`src/main/java/${path.slice('/java/'.length)}`] = content;

      } else if (PLATFORM === 'jason') {
        if (path.startsWith('/asl/')) payload[`src/main/asl/${path.slice('/asl/'.length)}`] = content;
        if (path.startsWith('/java/')) payload[`src/main/java/${path.slice('/java/'.length)}`] = content;
      } else if (PLATFORM === 'jacamo') {
        if (path.startsWith('/agt/')) payload[`src/agt/${path.slice('/agt/'.length)}`] = content;
        if (path.startsWith('/java/')) payload[`src/main/java/${path.slice('/java/'.length)}`] = content;
      }
    });

    return payload;
  }

  // Expose all code for external detectors (GUI, API keys)
  window.__glGetAllCode = function() {
    return Object.values(files).join('\n');
  };

  // ── Folder operations (for tree-ui) ────────────────────
  async function renameFolder(folderPath) {
    saveCurrentFile();
    let root, relative;
    if (FLAT_ROOT) {
      // In flat mode, find the parent path
      const lastSlash = folderPath.lastIndexOf('/');
      root = lastSlash > 0 ? folderPath.slice(0, lastSlash) : '';
      relative = folderPath.replace(/^\//, '');
    } else {
      root = (SOURCE_FOLDER && folderPath.startsWith(SOURCE_FOLDER)) ? SOURCE_FOLDER : (AUX_FOLDER || SOURCE_FOLDER || '');
      relative = folderPath.slice(root.length + 1);
    }
    const raw = await glPrompt('Rename folder', relative);
    if (raw === null) return;
    const cleaned = raw.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!cleaned || cleaned.includes('..') || !/^[A-Za-z0-9_.$/-]+$/.test(cleaned)) {
      await glAlert('Invalid folder name.'); return;
    }
    const newFolder = root + '/' + cleaned;
    if (newFolder === folderPath) return;
    const affected = Object.keys(files).filter(p => p.startsWith(folderPath + '/'));
    if (affected.length === 0) return;
    for (const old of affected) {
      const np = newFolder + old.slice(folderPath.length);
      if (Object.prototype.hasOwnProperty.call(files, np) && !affected.includes(np)) {
        await glAlert('Conflict: ' + np + ' already exists.'); return;
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

  async function deleteFolder(folderPath) {
    saveCurrentFile();
    const affected = Object.keys(files).filter(p => p.startsWith(folderPath + '/'));
    const isEmpty = affected.length === 0 && emptyFolders.has(folderPath);
    if (affected.length === 0 && !isEmpty) return;
    const name = folderPath.split('/').pop();
    if (!(await glConfirm(`Delete "${name}"${affected.length > 0 ? ` and its ${affected.length} file(s)` : ''}?`))) return;
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

  async function createFileInFolder(folderPath) {
    saveCurrentFile();
    let ext;
    if (FLAT_ROOT) {
      // In flat mode, ask what kind of file
      ext = SOURCE_EXT;
    } else {
      ext = (SOURCE_FOLDER && folderPath.startsWith(SOURCE_FOLDER)) ? SOURCE_EXT : (AUX_EXT || SOURCE_EXT);
    }
    const raw = await glPrompt(`New file in ${folderPath}`, 'Agent' + ext);
    if (raw === null) return;
    let name = raw.trim();
    if (!name) return;
    // Only auto-add extension if no recognized extension present
    if (!name.endsWith(SOURCE_EXT) && !name.endsWith(AUX_EXT) && !name.endsWith('.mas2j')) {
      name += ext;
    }
    if (!/^[A-Za-z0-9_.$/-]+$/.test(name)) {
      await glAlert('Invalid file name.'); return;
    }
    const path = folderPath + '/' + name;
    if (Object.prototype.hasOwnProperty.call(files, path)) {
      await glAlert('File already exists.'); return;
    }
    files[path] = name.endsWith(AUX_EXT) ? javaTemplate(path) : sourceTemplate(path);
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

  async function createFolder(parentPath) {
    const raw = await glPrompt('New folder name', 'newFolder');
    if (raw === null) return;
    const cleaned = raw.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!cleaned || cleaned.includes('..') || !/^[A-Za-z0-9_.$/-]+$/.test(cleaned)) {
      await glAlert('Invalid folder name.'); return;
    }
    const fp = parentPath + '/' + cleaned;
    const exists = Object.keys(files).some(p => p.startsWith(fp + '/'));
    if (exists || emptyFolders.has(fp)) {
      await glAlert('Folder already exists.'); return;
    }
    emptyFolders.add(fp);
    renderTree();
    saveToStorage();
  }
  window.__glCreateFolder = createFolder;

  function validateProjectBeforeRun() {
    saveCurrentFile();
    if (PLATFORM === 'astra') {
      if (!Object.prototype.hasOwnProperty.call(files, '/astra/Main.astra')) {
        return 'Main.astra is required. Create /astra/Main.astra because the hosted runner starts agent Main.';
      }
      if (!/agent\s+Main\b/.test(files['/astra/Main.astra'])) {
        return '/astra/Main.astra must contain agent Main.';
      }
    }
    // Jason/JaCaMo: just need at least one .asl file anywhere in the project
    if (PLATFORM === 'jason' || PLATFORM === 'jacamo') {
      const hasSource = Object.keys(files).some(p => p.endsWith(SOURCE_EXT) && p !== BUILD_FILE);
      if (!hasSource) return `At least one ${SOURCE_EXT} file is required.`;
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
      // Hide GUI button and close modal — program is no longer running
      const guiBtn = document.getElementById('showGuiButton');
      if (guiBtn) guiBtn.hidden = true;
      if (typeof window.__glGuiClose === 'function') window.__glGuiClose();
    }
  }

  function resetOutput() {
    els.metaStatus.textContent = 'Idle';
    els.metaReturnCode.textContent = '—';
    els.metaElapsed.textContent = '—';
    const folderDesc = FLAT_ROOT ? 'the project' : `${SOURCE_FOLDER}${AUX_FOLDER ? ' and ' + AUX_FOLDER : ''}`;
    els.output.textContent = `Create or edit files in ${folderDesc}, then press "Run Project".`;
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
        source: files[DEFAULT_FILE],
        files: serverFilesPayload(),
      };
      if (BUILD_FILE && files[BUILD_FILE]) body.pom_xml = files[BUILD_FILE];
      // Jason/JaCaMo: auto-generate mas2j (unless user provided one)
      if (PLATFORM === 'jason' || PLATFORM === 'jacamo') {
        const userMas2j = Object.keys(files).find(p => p.endsWith('.mas2j'));
        if (userMas2j) {
          // User provided a .mas2j file — send it explicitly
          body.mas2j = files[userMas2j];
          body.mas2j_name = userMas2j.replace(/^\//, '');
        } else {
          // Auto-generate from .asl files
          const agents = Object.keys(files)
            .filter(p => p.endsWith(SOURCE_EXT) && p !== BUILD_FILE)
            .map(p => p.replace(/^\//, '').replace(SOURCE_EXT, '').replace(/\//g, '.'));
          if (agents.length > 0) {
            const aslPath = SERVER_ASL_DIR;
            if (PLATFORM === 'jacamo') {
              const agentLines = agents.map(a => `        ${a}  agentArchClass jaca.CAgentArch;`).join('\n');
              body.mas2j = `MAS default_project {\n    environment: jaca.CartagoEnvironment\n    agents:\n${agentLines}\n    aslSourcePath: "${aslPath}";\n}\n`;
            } else {
              const agentLines = agents.map(a => `        ${a};`).join('\n');
              body.mas2j = `MAS default_project {\n    agents:\n${agentLines}\n    aslSourcePath: "${aslPath}";\n}\n`;
            }
          }
        }
      }
      if (Object.keys(keyState.apiKeys).length > 0) body.api_keys = keyState.apiKeys;

      const response = await fetch(RUN_URL, {
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
    const newFiles = { [DEFAULT_FILE]: DEFAULT_SOURCE };
    if (BUILD_FILE) newFiles[BUILD_FILE] = DEFAULT_POMS[PLATFORM] || DEFAULT_POMS.astra;
    files = newFiles;
    currentPath = DEFAULT_FILE;
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
      // Stop any running execution before loading
      if (typeof window.__glStopExecution === 'function') window.__glStopExecution();
      files = { [DEFAULT_FILE]: payload.source };
      if (BUILD_FILE && !files[BUILD_FILE]) files[BUILD_FILE] = DEFAULT_POMS[PLATFORM] || DEFAULT_POMS.astra;
      currentPath = DEFAULT_FILE;
      els.editor.value = payload.source;
      els.currentFile.textContent = currentPath;
      renderTree();
      updateApiKeyUI();
      els.output.textContent = `Loaded: ${payload.title || PLATFORM.toUpperCase() + ' example'}\nCheck required API keys if the example uses an LLM provider, then press "Run Project".`;
      els.status.textContent = 'Example loaded';
      els.metaStatus.textContent = 'Loaded';
      els.metaReturnCode.textContent = '—';
      els.metaElapsed.textContent = '—';
      window.setTimeout(() => (document.getElementById('run-code') || els.editor).scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (error) {
      console.warn('Could not load example into runner.', error);
    }
  }

  // ── Open folder (import local project) ──────────────────
  // Binary / build extensions to skip on import
  const SKIP_EXTS = new Set([
    '.class', '.jar', '.war', '.ear', '.zip', '.gz', '.tar', '.7z', '.rar',
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.bmp', '.webp', '.tiff',
    '.exe', '.dll', '.so', '.dylib', '.o', '.obj', '.lib',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.pyc', '.pyo', '.DS_Store',
  ]);
  // Directory segments to skip (matched anywhere in path)
  const SKIP_DIRS = ['/target/', '/build/', '/bin/', '/out/', '/node_modules/',
                     '/.gradle/', '/.idea/', '/.vscode/', '/.git/', '/__pycache__/'];

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
        // Skip hidden files and blocked directories
        if (relPath.includes('/.') || SKIP_DIRS.some(d => relPath.includes(d))) return;
        // Skip binary files by extension
        const dotIdx = relPath.lastIndexOf('.');
        if (dotIdx >= 0 && SKIP_EXTS.has(relPath.slice(dotIdx).toLowerCase())) return;

        // pom.xml at root
        const parts = relPath.split('/');
        if (parts.length === 2 && parts[1] === 'pom.xml') {
          readers.push(file.text().then(text => { newFiles['/pom.xml'] = text; pomFound = true; }));
          return;
        }

        if (FLAT_ROOT) {
          // Flat root: import ALL text files, preserving relative path from project root
          const name = parts.slice(1).join('/'); // remove top-level folder name
          if (name && !name.startsWith('.')) {
            readers.push(file.text().then(text => { newFiles[`/${name}`] = text; }));
          }
        } else {
          // ASTRA mode: structured import — map src/main/astra/ and src/main/java/
          const name = parts.slice(1).join('/'); // remove top-level folder name
          const astraMatch = relPath.match(/src\/main\/astra\/(.+\.astra)$/);
          if (astraMatch) {
            readers.push(file.text().then(text => { newFiles[`/astra/${astraMatch[1]}`] = text; }));
            return;
          }
          const javaMatch = relPath.match(/src\/main\/java\/(.+\.java)$/);
          if (javaMatch) {
            readers.push(file.text().then(text => { newFiles[`/java/${javaMatch[1]}`] = text; }));
            return;
          }

        }
      });

      Promise.all(readers).then(async () => {
        if (Object.keys(newFiles).length === 0) {
          await glAlert(`No ${SOURCE_EXT} files found in this folder.`);
          return;
        }
        // Stop any running execution before loading new project
        if (typeof window.__glStopExecution === 'function') window.__glStopExecution();
        if (!pomFound && BUILD_FILE) newFiles[BUILD_FILE] = DEFAULT_POMS[PLATFORM] || DEFAULT_POMS.astra;
        files = newFiles;
        currentPath = Object.keys(files).find(p => p.endsWith(SOURCE_EXT)) || Object.keys(files)[0];
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
  const STORAGE_KEY = STORAGE_KEY_CFG;

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
        currentPath = data.currentPath || Object.keys(files)[0] || DEFAULT_FILE;
        if (Array.isArray(data.emptyFolders)) emptyFolders = new Set(data.emptyFolders);
        return true;
      }
    } catch (e) { /* corrupted — ignore */ }
    return false;
  }

  // Expose for tree-ui buttons
  window.__glImportFolder = importFolder;
  window.__glSaveProject = saveToStorage;

  async function resetProject() {
    if (!(await glConfirm('Start a new project? This will erase all current files and restore the default template.'))) return;
    // Stop any running execution before resetting
    if (typeof window.__glStopExecution === 'function') window.__glStopExecution();
    const newFiles = { [DEFAULT_FILE]: DEFAULT_SOURCE };
    if (BUILD_FILE) newFiles[BUILD_FILE] = DEFAULT_POMS[PLATFORM] || DEFAULT_POMS.astra;
    files = newFiles;
    emptyFolders = new Set();
    currentPath = DEFAULT_FILE;
    els.editor.value = files[currentPath];
    els.currentFile.textContent = currentPath;
    renderTree();
    updateApiKeyUI();
    saveToStorage();
  }
  window.__glResetProject = resetProject;

  // Expose GLRunner API for iframe integration and run-code-links.js
  window.GLRunner = {
    loadSource: function(source, title) {
      if (typeof window.__glStopExecution === 'function') window.__glStopExecution();
      files = { [DEFAULT_FILE]: source };
      if (BUILD_FILE && !files[BUILD_FILE]) files[BUILD_FILE] = DEFAULT_POMS[PLATFORM] || DEFAULT_POMS.astra;
      currentPath = DEFAULT_FILE;
      els.editor.value = source;
      els.currentFile.textContent = currentPath;
      renderTree();
      updateApiKeyUI();
      els.output.textContent = `Loaded: ${title || PLATFORM.toUpperCase() + ' example'}\nCheck required API keys if the example uses an LLM provider, then press "Run Project".`;
      els.status.textContent = 'Example loaded';
      els.metaStatus.textContent = 'Loaded';
      els.metaReturnCode.textContent = '\u2014';
      els.metaElapsed.textContent = '\u2014';
      saveToStorage();
    },
    loadPayload: function(payload) {
      if (payload && payload.source) {
        this.loadSource(payload.source, payload.title);
      }
    }
  };

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
    els.newAstra.addEventListener('click', () => createFile(FLAT_ROOT ? 'source' : (SOURCE_FOLDER ? SOURCE_FOLDER.slice(1) : 'source')));
    if (els.newJava) els.newJava.addEventListener('click', () => createFile(FLAT_ROOT ? 'aux' : (AUX_FOLDER ? AUX_FOLDER.slice(1) : 'aux')));
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
    if (!restored && BUILD_FILE) {
      files[BUILD_FILE] = files[BUILD_FILE] || (DEFAULT_POMS[PLATFORM] || DEFAULT_POMS.astra);
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
