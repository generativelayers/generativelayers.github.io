/**
 * code-runner-archive-import.js v2
 *
 * Extends the runner Open button with:
 * - Folder import: delegates to the original runner folder importer.
 * - ZIP import: extracts locally in the browser using JSZip and maps files as
 *   the selected platform expects.
 * - RAR import: detects and explains that RAR extraction is not supported.
 * - Single-file import: imports one .astra/.asl/.java/.mas2j/pom.xml file.
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
      single.innerHTML = '<i class="fa-regular fa-file-code"></i> Single file<small>Import one .astra, .asl, .java, .mas2j, or pom.xml file.</small>';

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

  function candidateRoots(paths) {
    const roots = new Map();
    paths.forEach(path => {
      const p = cleanPath(path);
      const parts = p.split('/');
      for (let i = 0; i < Math.min(parts.length, 5); i++) {
        const root = i === 0 ? '' : parts.slice(0, i).join('/');
        const rel = root ? p.slice(root.length + 1) : p;
        if (isInteresting(rel)) roots.set(root, (roots.get(root) || 0) + 1);
      }
    });
    return [...roots.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(entry => entry[0]);
  }

  async function chooseRoot(entries) {
    const roots = candidateRoots(entries.map(entry => entry.name));
    if (roots.length <= 1) return roots[0] || '';
    const list = roots.map((root, index) => `${index + 1}. ${root || '(archive root)'}`).join('\n');
    const raw = await promptBox('Select folder inside the ZIP archive:\n\n' + list, '1');
    if (raw === null) return null;
    const selected = Number(String(raw).trim());
    if (!Number.isInteger(selected) || selected < 1 || selected > roots.length) {
      await alertBox('Invalid folder selection.');
      return null;
    }
    return roots[selected - 1];
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
      if (low.endsWith('.astra')) return '/astra/' + p.split('/').pop();
      if (low.endsWith('.java')) return '/java/' + p.split('/').pop();
      return '';
    }

    if (PLATFORM === 'jason' || PLATFORM === 'jacamo') {
      if (low.startsWith('src/') || low.endsWith('.asl') || low.endsWith('.java') || low.endsWith('.mas2j')) return '/' + p;
      return '';
    }

    return '/' + p;
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
    const file = await chooseFile('.astra,.asl,.java,.mas2j,.xml,.properties,pom.xml,text/plain,text/xml,application/xml');
    if (!file) return;
    const mapped = mapPath(file.name);
    if (!mapped) {
      await alertBox('This file type is not mapped for the current runner platform.');
      return;
    }
    const files = readStoredProject();
    files[mapped] = await file.text();
    if (BUILD_FILE && !files[BUILD_FILE] && mapped !== BUILD_FILE) files[BUILD_FILE] = readStoredProject()[BUILD_FILE] || '';
    const currentPath = mapped;
    const notice = `Imported ${file.name} as ${mapped}. Press Run Project to execute.`;
    writeProject(files, currentPath, notice);
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
