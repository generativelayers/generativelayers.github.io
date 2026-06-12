/**
 * code-runner-archive-import.js v4
 *
 * Extends the runner Open button with:
 * - Folder import: delegates to the original runner folder importer.
 * - ZIP import: extracts locally in the browser using JSZip and maps files as
 *   the selected platform expects.
 * - ASTRA ZIP root detection: finds the project root that contains astra/, java/,
 *   src/main/astra, src/main/java, and/or pom.xml, then injects those files into
 *   the ASTRA runner's /astra, /java, and /pom.xml locations.
 * - RAR import: detects and explains that RAR extraction is not supported.
 * - Single-file import: language-specific clean import.
 *   ASTRA accepts only .astra and imports it as /astra/<file>.
 *   Jason/JaCaMo accept only .asl and import it as /<file>.
 *   Single-file import replaces the whole current project state.
 */
(() => {
  'use strict';

  const CFG = window.GL_PLATFORM_CONFIG || {};
  const PLATFORM = window.GL_PLATFORM || CFG.id || 'astra';
  const FLAT_ROOT = !!CFG.flatRoot;
  const STORAGE_KEY = (CFG.storagePrefix || ('gl_runner_' + PLATFORM + '_')) + 'project';
  const BUILD_FILE = CFG.buildFile || '/pom.xml';
  const SOURCE_EXT = (CFG.sourceExt || (PLATFORM === 'astra' ? '.astra' : '.asl')).toLowerCase();
  const AUX_EXT = (CFG.auxExt || '.java').toLowerCase();
  const ZIP_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

  function alertBox(message) {
    if (typeof window.glAlert === 'function') return window.glAlert(message);
    window.alert(message);
    return Promise.resolve();
  }

  function promptBox(message, value) {
    if (typeof window.glPrompt === 'function') return window.glPrompt(message, value || '');
    return Promise.resolve(window.prompt(message, value || ''));
  }

  function addStyle() {
    if (document.getElementById('gl-archive-import-style')) return;
    const style = document.createElement('style');
    style.id = 'gl-archive-import-style';
    style.textContent = `
      .gl-import-options{display:grid;gap:10px}
      .gl-import-options button{border:1px solid rgba(52,211,153,.35);border-radius:10px;background:rgba(52,211,153,.10);color:#d1fae5;cursor:pointer;padding:12px 14px;text-align:left;font-weight:800}
      .gl-import-options button:hover{background:#059669;color:white}
      .gl-import-options small{display:block;color:#9ca3af;font-weight:500;margin-top:3px}
      .gl-import-options button:hover small{color:#ecfdf5}
    `;
    document.head.appendChild(style);
  }

  function singleFileLabel() {
    if (PLATFORM === 'astra') return 'Import one .astra file. Existing files are deleted.';
    if (PLATFORM === 'jason' || PLATFORM === 'jacamo') return 'Import one .asl file. Existing files are deleted.';
    return 'Import one source file. Existing files are deleted.';
  }

  function chooseMode() {
    return new Promise(resolve => {
      addStyle();
      const overlay = document.createElement('div');
      overlay.className = 'gl-dialog-overlay';
      const box = document.createElement('div');
      box.className = 'gl-dialog-box';
      const msg = document.createElement('div');
      msg.className = 'gl-dialog-message';
      msg.textContent = 'Open project';

      const opts = document.createElement('div');
      opts.className = 'gl-import-options';

      const folder = document.createElement('button');
      folder.type = 'button';
      folder.innerHTML = '<i class="fa-solid fa-folder-open"></i> Folder<small>Select an unpacked local project directory.</small>';

      const archive = document.createElement('button');
      archive.type = 'button';
      archive.innerHTML = '<i class="fa-solid fa-file-zipper"></i> ZIP / RAR file<small>ZIP is extracted in the browser. RAR shows a warning.</small>';

      const single = document.createElement('button');
      single.type = 'button';
      single.innerHTML = '<i class="fa-regular fa-file-code"></i> Single file<small>' + singleFileLabel() + '</small>';

      const buttons = document.createElement('div');
      buttons.className = 'gl-dialog-buttons';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'gl-dialog-btn gl-dialog-btn-cancel';
      cancel.textContent = 'Cancel';

      opts.appendChild(folder);
      opts.appendChild(archive);
      opts.appendChild(single);
      buttons.appendChild(cancel);
      box.appendChild(msg);
      box.appendChild(opts);
      box.appendChild(buttons);
      overlay.appendChild(box);

      function close(value) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity .12s';
        setTimeout(() => overlay.remove(), 120);
        resolve(value);
      }

      folder.onclick = () => close('folder');
      archive.onclick = () => close('archive');
      single.onclick = () => close('single');
      cancel.onclick = () => close(null);
      overlay.onkeydown = e => { if (e.key === 'Escape') close(null); };
      document.body.appendChild(overlay);
      folder.focus();
    });
  }

  function chooseFile(accept) {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
      input.click();
    });
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
    if (/\.(class|jar|war|ear|png|jpg|jpeg|gif|ico|bmp|webp|pdf|docx?|xlsx?|pptx?|mp3|mp4|avi|mov|wav|woff2?|ttf|otf|exe|dll|so|dylib)$/i.test(p)) return true;
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
      || p.startsWith('astra/')
      || p.startsWith('java/');
  }

  function scoreRootForPlatform(paths, root) {
    const rootPath = cleanPath(root);
    const rootTail = baseName(rootPath).toLowerCase();
    const seen = new Set();
    const info = {
      root: rootPath,
      score: 0,
      count: 0,
      hasPom: false,
      hasAstraFolder: false,
      hasJavaFolder: false,
      hasMavenAstra: false,
      hasMavenJava: false,
      hasJasonSource: false
    };

    paths.forEach(path => {
      const p = cleanPath(path);
      if (rootPath && !(p === rootPath || p.startsWith(rootPath + '/'))) return;
      const rel = rootPath ? p.slice(rootPath.length + 1) : p;
      const low = rel.toLowerCase();
      if (!rel || seen.has(rel) || !isInteresting(rel)) return;
      seen.add(rel);
      info.count += 1;

      if (PLATFORM === 'astra') {
        if (low === 'pom.xml') { info.score += 50; info.hasPom = true; }
        if (low.startsWith('astra/') && low.endsWith('.astra')) { info.score += 30; info.hasAstraFolder = true; }
        if (low.startsWith('java/') && low.endsWith('.java')) { info.score += 24; info.hasJavaFolder = true; }
        if (low.includes('src/main/astra/') && low.endsWith('.astra')) { info.score += 30; info.hasMavenAstra = true; }
        if (low.includes('src/main/java/') && low.endsWith('.java')) { info.score += 24; info.hasMavenJava = true; }
        if (low.endsWith('.astra')) info.score += 3;
        if (low.endsWith('.java')) info.score += 2;
      } else if (PLATFORM === 'jason' || PLATFORM === 'jacamo') {
        if (low === 'pom.xml') { info.score += 20; info.hasPom = true; }
        if (low.endsWith('.asl')) { info.score += 20; info.hasJasonSource = true; }
        if (low.endsWith('.mas2j')) info.score += 12;
        if (low.includes('src/main/asl/') || low.includes('src/agt/')) info.score += 12;
        if (low.endsWith('.java') || low.includes('src/main/java/')) info.score += 4;
      } else {
        info.score += 1;
      }
    });

    // The ASTRA project root is the folder above astra/ and java/, not the
    // astra/ or java/ folder itself. Penalise too-deep roots so ZIP import
    // keeps /astra, /java, and /pom.xml together.
    if (PLATFORM === 'astra') {
      if (rootTail === 'astra' || rootTail === 'java') info.score -= 35;
      if (/src\/main\/?$/i.test(rootPath)) info.score -= 10;
      if (/src\/main\/(astra|java)$/i.test(rootPath)) info.score -= 35;
      if ((info.hasAstraFolder || info.hasMavenAstra) && (info.hasJavaFolder || info.hasMavenJava)) info.score += 30;
      if (info.hasPom && (info.hasAstraFolder || info.hasMavenAstra)) info.score += 30;
    }

    return info;
  }

  function candidateRoots(paths) {
    const candidates = new Set(['']);
    paths.forEach(path => {
      const parts = pathSegments(path);
      for (let i = 1; i < Math.min(parts.length, 6); i++) {
        candidates.add(parts.slice(0, i).join('/'));
      }
    });

    return [...candidates]
      .map(root => scoreRootForPlatform(paths, root))
      .filter(info => info.count > 0 && info.score > 0)
      .sort((a, b) => b.score - a.score || a.root.length - b.root.length)
      .slice(0, 12);
  }

  async function chooseRoot(entries) {
    const roots = candidateRoots(entries.map(entry => entry.name));
    if (roots.length === 0) return '';
    if (roots.length === 1) return roots[0].root;

    const top = roots[0];
    const second = roots[1];
    if (PLATFORM === 'astra') {
      const topLooksLikeProjectRoot = top.hasPom && (top.hasAstraFolder || top.hasMavenAstra || top.hasJavaFolder || top.hasMavenJava);
      const topLooksLikeTwoFolderRoot = (top.hasAstraFolder || top.hasMavenAstra) && (top.hasJavaFolder || top.hasMavenJava);
      if (topLooksLikeProjectRoot || topLooksLikeTwoFolderRoot || top.score >= second.score + 40) return top.root;
    }

    const list = roots.map((info, index) => `${index + 1}. ${info.root || '(archive root)'}`).join('\n');
    const raw = await promptBox('Select folder inside the ZIP archive:\n\n' + list, '1');
    if (raw === null) return null;
    const selected = Number(String(raw).trim());
    if (!Number.isInteger(selected) || selected < 1 || selected > roots.length) {
      await alertBox('Invalid folder selection.');
      return null;
    }
    return roots[selected - 1].root;
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
      if (astraMaven) return '/astra/' + astraMaven[1];
      if (javaMaven) return '/java/' + javaMaven[1];
      if (low.startsWith('astra/') && low.endsWith('.astra')) return '/' + p;
      if (low.startsWith('java/') && low.endsWith('.java')) return '/' + p;
      if (low.endsWith('.astra')) return '/astra/' + baseName(p);
      if (low.endsWith('.java')) return '/java/' + baseName(p);
      return '';
    }

    if (PLATFORM === 'jason' || PLATFORM === 'jacamo') {
      if (low.startsWith('src/') || low.endsWith('.asl') || low.endsWith('.java') || low.endsWith('.mas2j')) return '/' + p;
      return '';
    }

    return '/' + p;
  }

  function mapSingleFilePath(filename) {
    const name = baseName(filename);
    const low = name.toLowerCase();

    if (PLATFORM === 'astra') {
      if (!low.endsWith('.astra')) return '';
      return '/astra/' + name;
    }

    if (PLATFORM === 'jason' || PLATFORM === 'jacamo') {
      if (!low.endsWith('.asl')) return '';
      return '/' + name;
    }

    return '';
  }

  function readStoredProject() {
    try {
      if (typeof window.__glSaveProject === 'function') window.__glSaveProject();
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return state && state.files && typeof state.files === 'object' ? state.files : {};
    } catch (_) {
      return {};
    }
  }

  function writeProject(files, currentPath, notice) {
    if (typeof window.__glStopExecution === 'function') window.__glStopExecution();
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

  async function importArchive() {
    const file = await chooseFile('.zip,.rar,application/zip,application/x-zip-compressed,application/vnd.rar,application/x-rar-compressed');
    if (!file) return;

    if (/\.rar$/i.test(file.name)) {
      await alertBox('RAR was detected, but this browser runner cannot extract RAR yet. Use a ZIP archive or Open → Folder.');
      return;
    }
    if (!/\.zip$/i.test(file.name)) {
      await alertBox('Please select a ZIP project archive.');
      return;
    }

    const entries = await zipEntries(file);
    if (!entries.length) {
      await alertBox('No importable text files were found in this ZIP.');
      return;
    }

    const root = await chooseRoot(entries);
    if (root === null) return;

    const files = {};
    entries.forEach(entry => {
      const rel = removeRoot(entry.name, root);
      const mapped = mapPath(rel);
      if (mapped) files[mapped] = entry.text;
    });

    if (!Object.keys(files).length) {
      await alertBox('No files matching this runner platform were found inside the selected ZIP folder.');
      return;
    }

    const previous = readStoredProject();
    if (BUILD_FILE && !files[BUILD_FILE] && previous[BUILD_FILE]) files[BUILD_FILE] = previous[BUILD_FILE];

    const currentPath = Object.keys(files).find(path => path.toLowerCase().endsWith(SOURCE_EXT)) || Object.keys(files)[0];
    const notice = `Imported ${Object.keys(files).length} files from ${file.name}${root ? ' / ' + root : ''}. Press Run Project to execute.`;
    writeProject(files, currentPath, notice);
  }

  async function importSingleFile() {
    const accept = PLATFORM === 'astra' ? '.astra,text/plain' : '.asl,text/plain';
    const file = await chooseFile(accept);
    if (!file) return;

    const mapped = mapSingleFilePath(file.name);
    if (!mapped) {
      if (PLATFORM === 'astra') {
        await alertBox('ASTRA runner accepts only a single .astra file here. Use ZIP or Folder for full projects.');
      } else if (PLATFORM === 'jason' || PLATFORM === 'jacamo') {
        await alertBox('Jason/JaCaMo runners accept only a single .asl file here. Use ZIP or Folder for full projects.');
      } else {
        await alertBox('This single-file type is not supported for the current runner.');
      }
      return;
    }

    const files = {};
    files[mapped] = await file.text();
    const notice = `Imported ${file.name} as ${mapped}. Existing files were removed. Press Run Project to execute.`;
    writeProject(files, mapped, notice);
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

  function install() {
    if (window.__glArchiveImportInstalled) return;
    window.__glArchiveImportInstalled = true;

    const originalFolderImport = window.__glImportFolder;
    window.__glImportArchive = importArchive;
    window.__glImportSingleFile = importSingleFile;
    window.__glImportFolder = async () => {
      const mode = await chooseMode();
      if (mode === 'folder' && typeof originalFolderImport === 'function') originalFolderImport();
      if (mode === 'archive') await importArchive();
      if (mode === 'single') await importSingleFile();
    };

    showNotice();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
