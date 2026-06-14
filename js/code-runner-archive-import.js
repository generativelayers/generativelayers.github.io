/**
 * code-runner-archive-import.js v7
 *
 * No custom dialog. The runner exposes separate native openers:
 * - Folder: native directory picker.
 * - File/ZIP: native file picker that routes .zip, .astra, .asl, and .rar.
 *
 * This avoids the mobile overlay/modal bug and keeps the logic explicit.
 */
(() => {
  'use strict';

  const CFG = window.GL_PLATFORM_CONFIG || {};
  const V = window.GL_VERSION || '0.2.1';
  const PLATFORM = window.GL_PLATFORM || CFG.id || 'astra';
  const FLAT_ROOT = !!CFG.flatRoot;
  const STORAGE_KEY = (CFG.storagePrefix || ('gl_runner_' + PLATFORM + '_')) + 'project';
  const BUILD_FILE = CFG.buildFile || '/pom.xml';
  const SOURCE_EXT = (CFG.sourceExt || (PLATFORM === 'astra' ? '.astra' : '.asl')).toLowerCase();
  const AUX_EXT = (CFG.auxExt || '.java').toLowerCase();
  const ZIP_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

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
      `    <version>${V}</version>`,
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
      `            <version>${V}</version>`,
      '        </dependency>',
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
      `    <version>${V}</version>`,
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
      `            <version>${V}</version>`,
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
      `    <version>${V}</version>`,
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
      `            <version>${V}</version>`,
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

  function alertBox(message) {
    if (typeof window.glAlert === 'function') return window.glAlert(message);
    window.alert(message);
    return Promise.resolve();
  }

  function cleanPath(path) {
    return String(path || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  }

  function baseName(path) {
    return cleanPath(path).split('/').pop();
  }

  function pathSegments(path) {
    return cleanPath(path).split('/').filter(Boolean);
  }

  function skipPath(path) {
    const p = cleanPath(path);
    if (!p || p.startsWith('__MACOSX/') || p.includes('/__MACOSX/')) return true;
    if (p.split('/').some(s => !s || s.startsWith('.'))) return true;
    if (/(^|\/)(target|build|bin|out|node_modules|__pycache__)(\/|$)/i.test(p)) return true;
    if (/\.(class|jar|war|ear|zip|gz|tar|7z|rar|png|jpg|jpeg|gif|ico|bmp|webp|pdf|docx?|xlsx?|pptx?|mp3|mp4|avi|mov|wav|woff2?|ttf|otf|exe|dll|so|dylib)$/i.test(p)) return true;
    return false;
  }

  function isInteresting(rel) {
    const p = cleanPath(rel).toLowerCase();
    return p === 'pom.xml'
      || p.endsWith(SOURCE_EXT)
      || p.endsWith(AUX_EXT)
      || p.endsWith('.mas2j')
      || p.includes('src/main/astra/')
      || p.includes('src/main/asl/')
      || p.includes('src/agt/')
      || p.includes('src/main/java/')
      || p.includes('src/main/resources/')
      || p.startsWith('astra/')
      || p.startsWith('java/')
      || p.startsWith('resources/');
  }

  function scoreRoot(paths, root) {
    const rootPath = cleanPath(root);
    const rootTail = baseName(rootPath).toLowerCase();
    const info = { root: rootPath, score: 0, count: 0, hasPom: false, hasAstra: false, hasJava: false, hasResources: false, hasAsl: false };

    paths.forEach(path => {
      const p = cleanPath(path);
      if (rootPath && !(p === rootPath || p.startsWith(rootPath + '/'))) return;
      const rel = rootPath ? p.slice(rootPath.length + 1) : p;
      const low = rel.toLowerCase();
      if (!rel || !isInteresting(rel)) return;
      info.count += 1;
      if (low === 'pom.xml') { info.score += 50; info.hasPom = true; }
      if (PLATFORM === 'astra') {
        if ((low.startsWith('astra/') || low.includes('src/main/astra/')) && low.endsWith('.astra')) { info.score += 30; info.hasAstra = true; }
        if ((low.startsWith('java/') || low.includes('src/main/java/')) && low.endsWith('.java')) { info.score += 20; info.hasJava = true; }
        if (low.startsWith('resources/') || low.includes('src/main/resources/')) { info.score += 12; info.hasResources = true; }
        if (low.endsWith('.astra')) info.score += 2;
      } else {
        if (low.endsWith('.asl')) { info.score += 24; info.hasAsl = true; }
        if (low.endsWith('.mas2j')) info.score += 12;
        if (low.endsWith('.java') || low.includes('src/main/java/')) info.score += 6;
        if (low.includes('src/main/resources/') || low.startsWith('resources/')) info.score += 4;
      }
    });

    if (PLATFORM === 'astra') {
      if (rootTail === 'astra' || rootTail === 'java' || rootTail === 'resources') info.score -= 35;
      if (/src\/main\/(astra|java|resources)$/i.test(rootPath)) info.score -= 35;
      if (info.hasPom && info.hasAstra) info.score += 30;
      if (info.hasAstra && info.hasJava) info.score += 20;
    }
    return info;
  }

  function bestRoot(entries) {
    const paths = entries.map(e => e.name);
    const candidates = new Set(['']);
    paths.forEach(path => {
      const parts = pathSegments(path);
      for (let i = 1; i < Math.min(parts.length, 6); i++) candidates.add(parts.slice(0, i).join('/'));
    });
    const ranked = [...candidates]
      .map(root => scoreRoot(paths, root))
      .filter(info => info.count > 0 && info.score > 0)
      .sort((a, b) => b.score - a.score || a.root.length - b.root.length);
    return ranked[0] ? ranked[0].root : '';
  }

  function removeRoot(path, root) {
    const p = cleanPath(path);
    if (!root) return p;
    return p.startsWith(root + '/') ? p.slice(root.length + 1) : '';
  }

  function mapPath(relPath) {
    const p = cleanPath(relPath);
    const low = p.toLowerCase();
    if (!p) return '';
    if (low === 'pom.xml') return BUILD_FILE || '/pom.xml';

    if (FLAT_ROOT) return '/' + p;

    if (PLATFORM === 'astra') {
      const astraMaven = p.match(/(?:^|\/)src\/main\/astra\/(.+\.astra)$/i);
      const javaMaven = p.match(/(?:^|\/)src\/main\/java\/(.+\.java)$/i);
      const resourcesMaven = p.match(/(?:^|\/)src\/main\/resources\/(.+)$/i);
      if (astraMaven) return '/astra/' + astraMaven[1];
      if (javaMaven) return '/java/' + javaMaven[1];
      if (resourcesMaven) return '/resources/' + resourcesMaven[1];
      if (low.startsWith('astra/') && low.endsWith('.astra')) return '/' + p;
      if (low.startsWith('java/') && low.endsWith('.java')) return '/' + p;
      if (low.startsWith('resources/')) return '/' + p;
      if (low.endsWith('.astra')) return '/astra/' + baseName(p);
      if (low.endsWith('.java')) return '/java/' + baseName(p);
      return '';
    }

    if (PLATFORM === 'jason' || PLATFORM === 'jacamo') {
      if (low.startsWith('src/') || low.endsWith('.asl') || low.endsWith('.java') || low.endsWith('.mas2j') || low.startsWith('resources/')) return '/' + p;
      return '';
    }

    return '/' + p;
  }

  function defaultPom() {
    return DEFAULT_POMS[PLATFORM] || DEFAULT_POMS.astra;
  }

  function writeProject(files, currentPath, notice) {
    if (typeof window.__glStopExecution === 'function') window.__glStopExecution();
    if (BUILD_FILE && !files[BUILD_FILE]) files[BUILD_FILE] = defaultPom();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ files, currentPath, emptyFolders: [] }));
    sessionStorage.setItem(STORAGE_KEY + '_notice', notice);
    window.location.reload();
  }

  function loadScript(id, src) {
    return new Promise((resolve, reject) => {
      if (window.JSZip) { resolve(); return; }
      const existing = document.getElementById(id);
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load ZIP library.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load ZIP library.'));
      document.head.appendChild(script);
    });
  }

  async function zipEntries(file) {
    await loadScript('gl-jszip-loader', ZIP_LIB_URL);
    const zip = await window.JSZip.loadAsync(file);
    const entries = [];
    const promises = [];
    zip.forEach((name, entry) => {
      if (entry.dir || skipPath(name)) return;
      promises.push(entry.async('text').then(text => entries.push({ name: cleanPath(name), text })).catch(() => null));
    });
    await Promise.all(promises);
    return entries;
  }

  async function importEntries(entries, label) {
    const root = bestRoot(entries);
    const files = {};
    entries.forEach(entry => {
      const mapped = mapPath(removeRoot(entry.name, root));
      if (mapped) files[mapped] = entry.text;
    });
    if (!Object.keys(files).length) {
      await alertBox('No files matching this runner were found.');
      return;
    }
    const currentPath = Object.keys(files).find(path => path.toLowerCase().endsWith(SOURCE_EXT)) || Object.keys(files)[0];
    writeProject(files, currentPath, `Imported ${Object.keys(files).length} files from ${label}. Press Run Project to execute.`);
  }

  function openFolderNative() {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.addEventListener('change', async () => {
      if (!input.files || input.files.length === 0) return;
      const entries = [];
      await Promise.all(Array.from(input.files)
        .filter(file => !skipPath(file.webkitRelativePath || file.name))
        .map(file => file.text()
          .then(text => entries.push({ name: cleanPath(file.webkitRelativePath || file.name), text }))
          .catch(() => null)));
      if (!entries.length) {
        await alertBox('No importable text files were found in this folder.');
        return;
      }
      await importEntries(entries, 'folder');
    });
    input.click();
  }

  async function openFileOrZipNative() {
    try {
      const file = await new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip,.rar,.astra,.asl,.java,.mas2j,application/zip,application/x-zip-compressed,application/vnd.rar,application/x-rar-compressed,text/plain';
        input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
        input.click();
      });
      if (!file) return;

      const name = file.name || '';
      const low = name.toLowerCase();
      if (low.endsWith('.rar')) {
        await alertBox('RAR was detected, but browser extraction is not supported. Use ZIP or folder import.');
        return;
      }
      if (low.endsWith('.zip')) {
        const entries = await zipEntries(file);
        if (!entries.length) {
          await alertBox('No importable text files were found in this ZIP.');
          return;
        }
        await importEntries(entries, name);
        return;
      }
      if (PLATFORM === 'astra') {
        if (!low.endsWith('.astra')) {
          await alertBox('ASTRA single-file import accepts only .astra files.');
          return;
        }
        const mapped = '/astra/' + baseName(name);
        writeProject({ [mapped]: await file.text(), [BUILD_FILE]: defaultPom() }, mapped, `Imported ${name} as ${mapped}. Default POM was used.`);
        return;
      }
      if (PLATFORM === 'jason' || PLATFORM === 'jacamo') {
        if (!low.endsWith('.asl') && !low.endsWith('.java') && !low.endsWith('.mas2j')) {
          await alertBox('Jason/JaCaMo single-file import accepts .asl, .java, and .mas2j files.');
          return;
        }
        const mapped = '/' + baseName(name);
        writeProject({ [mapped]: await file.text(), [BUILD_FILE]: defaultPom() }, mapped, `Imported ${name} as ${mapped}. Default POM was used.`);
      }
    } catch (err) {
      console.error('[GL] Import error:', err);
      await alertBox('Import failed: ' + (err.message || String(err)));
    }
  }

  function installResourceFetchPatch() {
    if (window.__glResourceFetchPatchInstalled || typeof window.fetch !== 'function') return;
    window.__glResourceFetchPatchInstalled = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = function patchedFetch(input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (init && init.body && /\/api\/run-(astra|jason|jacamo)/.test(url)) {
          const body = JSON.parse(init.body);
          const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          const storedFiles = state && state.files && typeof state.files === 'object' ? state.files : {};
          body.files = body.files || {};
          Object.entries(storedFiles).forEach(([path, content]) => {
            if (path === BUILD_FILE) return;
            if (path.startsWith('/resources/')) body.files['src/main/resources/' + path.slice('/resources/'.length)] = content;
          });
          init = Object.assign({}, init, { body: JSON.stringify(body) });
        }
      } catch (_) {}
      return originalFetch(input, init);
    };
  }

  function showNotice() {
    const notice = sessionStorage.getItem(STORAGE_KEY + '_notice');
    if (!notice) return;
    sessionStorage.removeItem(STORAGE_KEY + '_notice');
    const status = document.getElementById('runnerStatus');
    const meta = document.getElementById('metaStatus');
    const output = document.getElementById('runnerOutput');
    if (status) status.textContent = 'Project imported';
    if (meta) meta.textContent = 'Imported';
    if (output) output.textContent = notice;
  }

  function patchToolbar() {
    const toolbar = document.querySelector('.runner-tree-toolbar');
    if (!toolbar || toolbar.dataset.openersPatched === '1') return;
    toolbar.dataset.openersPatched = '1';
    // UI buttons are handled by code-runner-one-open.js.
    // This module only exposes __glImportFolder and __glImportFileOrZip.
  }

  function install() {
    installResourceFetchPatch();
    window.__glImportFolder = openFolderNative;
    window.__glImportFileOrZip = openFileOrZipNative;
    showNotice();
    patchToolbar();
    const observer = new MutationObserver(() => window.setTimeout(patchToolbar, 0));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
