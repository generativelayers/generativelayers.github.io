/**
 * code-runner-archive-import.js v1
 * Extends the runner Open button: Folder or ZIP archive.
 * ZIP is extracted locally in the browser. RAR is detected but not extracted.
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
    style.textContent = '.gl-import-options{display:grid;gap:10px}.gl-import-options button{border:1px solid rgba(52,211,153,.35);border-radius:10px;background:rgba(52,211,153,.10);color:#d1fae5;cursor:pointer;padding:12px 14px;text-align:left;font-weight:800}.gl-import-options button:hover{background:#059669;color:white}.gl-import-options small{display:block;color:#9ca3af;font-weight:500;margin-top:3px}.gl-import-options button:hover small{color:#ecfdf5}';
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
      const zip = document.createElement('button');
      zip.type = 'button';
      zip.innerHTML = '<i class="fa-solid fa-file-zipper"></i> ZIP / RAR file<small>ZIP is extracted in the browser. RAR shows a warning.</small>';
      const buttons = document.createElement('div');
      buttons.className = 'gl-dialog-buttons';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'gl-dialog-btn gl-dialog-btn-cancel';
      cancel.textContent = 'Cancel';
      opts.appendChild(folder);
      opts.appendChild(zip);
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
      zip.onclick = () => close('zip');
      cancel.onclick = () => close(null);
      overlay.onkeydown = e => { if (e.key === 'Escape') close(null); };
      document.body.appendChild(overlay);
      folder.focus();
    });
  }

  function chooseArchiveFile() {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip,.rar,application/zip,application/x-zip-compressed,application/vnd.rar,application/x-rar-compressed';
      input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
      input.click();
    });
  }

  const u16 = (dv, o) => dv.getUint16(o, true);
  const u32 = (dv, o) => dv.getUint32(o, true);
  const decoder = new TextDecoder('utf-8');

  function cleanPath(path) {
    return String(path || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  }

  function skipPath(path) {
    const p = cleanPath(path);
    if (!p || p.startsWith('__MACOSX/') || p.includes('/__MACOSX/')) return true;
    if (p.split('/').some(s => !s || s.startsWith('.'))) return true;
    if (/(^|\/)(target|build|bin|out|node_modules)(\/|$)/i.test(p)) return true;
    if (/\.(class|jar|war|png|jpg|jpeg|gif|ico|pdf|docx?|xlsx?|pptx?|mp3|mp4|woff2?|ttf)$/i.test(p)) return true;
    return false;
  }

  function findEndRecord(bytes) {
    const min = Math.max(0, bytes.length - 66000);
    for (let i = bytes.length - 22; i >= min; i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
    }
    return -1;
  }

  async function inflateRaw(data) {
    if (!('DecompressionStream' in window)) throw new Error('This browser cannot inflate ZIP entries. Use folder import or a modern Chromium browser.');
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function readZipEntries(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const eocd = findEndRecord(bytes);
    if (eocd < 0) throw new Error('ZIP directory not found.');
    const count = u16(dv, eocd + 10);
    let ptr = u32(dv, eocd + 16);
    const entries = [];
    for (let i = 0; i < count; i++) {
      if (u32(dv, ptr) !== 0x02014b50) break;
      const method = u16(dv, ptr + 10);
      const compSize = u32(dv, ptr + 20);
      const nameLen = u16(dv, ptr + 28);
      const extraLen = u16(dv, ptr + 30);
      const commentLen = u16(dv, ptr + 32);
      const local = u32(dv, ptr + 42);
      const name = cleanPath(decoder.decode(bytes.slice(ptr + 46, ptr + 46 + nameLen)));
      ptr += 46 + nameLen + extraLen + commentLen;
      if (!name || name.endsWith('/') || skipPath(name)) continue;
      if (u32(dv, local) !== 0x04034b50) continue;
      const lNameLen = u16(dv, local + 26);
      const lExtraLen = u16(dv, local + 28);
      const dataStart = local + 30 + lNameLen + lExtraLen;
      const data = bytes.slice(dataStart, dataStart + compSize);
      let out;
      if (method === 0) out = data;
      else if (method === 8) out = await inflateRaw(data);
      else continue;
      entries.push({ name, text: decoder.decode(out) });
    }
    return entries;
  }

  function isInteresting(rel) {
    const p = cleanPath(rel).toLowerCase();
    return p === 'pom.xml' || p.endsWith(SOURCE_EXT) || p.endsWith(AUX_EXT) || p.endsWith('.mas2j') || p.includes('src/main/astra/') || p.includes('src/main/asl/') || p.includes('src/agt/') || p.includes('src/main/java/');
  }

  function candidateRoots(paths) {
    const roots = new Map();
    paths.forEach(p => {
      const parts = cleanPath(p).split('/');
      for (let i = 0; i < Math.min(parts.length, 5); i++) {
        const root = i === 0 ? '' : parts.slice(0, i).join('/');
        const rel = root ? cleanPath(p).slice(root.length + 1) : cleanPath(p);
        if (isInteresting(rel)) roots.set(root, (roots.get(root) || 0) + 1);
      }
    });
    return [...roots.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(x => x[0]);
  }

  async function chooseRoot(entries) {
    const roots = candidateRoots(entries.map(e => e.name));
    if (roots.length <= 1) return roots[0] || '';
    const list = roots.map((r, i) => `${i + 1}. ${r || '(archive root)'}`).join('\n');
    const raw = await promptBox('Select folder inside the archive:\n\n' + list, '1');
    if (raw === null) return null;
    const n = Number(String(raw).trim());
    if (!Number.isInteger(n) || n < 1 || n > roots.length) {
      await alertBox('Invalid folder selection.');
      return null;
    }
    return roots[n - 1];
  }

  function removeRoot(path, root) {
    const p = cleanPath(path);
    if (!root) return p;
    return p.startsWith(root + '/') ? p.slice(root.length + 1) : '';
  }

  function mapPath(rel) {
    const p = cleanPath(rel);
    const low = p.toLowerCase();
    if (!p) return '';
    if (low === 'pom.xml') return BUILD_FILE || '/pom.xml';
    if (FLAT_ROOT) return '/' + p;
    if (PLATFORM === 'astra') {
      const a = p.match(/(?:^|\/)src\/main\/astra\/(.+\.astra)$/i);
      const j = p.match(/(?:^|\/)src\/main\/java\/(.+\.java)$/i);
      if (a) return '/astra/' + a[1];
      if (j) return '/java/' + j[1];
      if (low.endsWith('.astra')) return '/astra/' + p.split('/').pop();
      if (low.endsWith('.java')) return '/java/' + p.split('/').pop();
      return '';
    }
    if (low.startsWith('src/') || low.endsWith('.asl') || low.endsWith('.java') || low.endsWith('.mas2j')) return '/' + p;
    return '';
  }

  function existingPom() {
    try {
      if (typeof window.__glSaveProject === 'function') window.__glSaveProject();
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return state.files && state.files[BUILD_FILE] ? state.files[BUILD_FILE] : '';
    } catch (_) { return ''; }
  }

  async function importArchive() {
    const file = await chooseArchiveFile();
    if (!file) return;
    if (/\.rar$/i.test(file.name)) {
      await alertBox('RAR was detected, but this browser runner cannot extract RAR yet. Use a ZIP archive or Open → Folder.');
      return;
    }
    if (!/\.zip$/i.test(file.name)) {
      await alertBox('Please select a ZIP project archive.');
      return;
    }
    const entries = await readZipEntries(file);
    if (!entries.length) {
      await alertBox('No importable files were found in this ZIP.');
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
      await alertBox('No files matching this runner platform were found.');
      return;
    }
    const fallbackPom = existingPom();
    if (BUILD_FILE && !files[BUILD_FILE] && fallbackPom) files[BUILD_FILE] = fallbackPom;
    const currentPath = Object.keys(files).find(p => p.toLowerCase().endsWith(SOURCE_EXT)) || Object.keys(files)[0];
    const notice = `Imported ${Object.keys(files).length} files from ${file.name}${root ? ' / ' + root : ''}. Press Run Project to execute.`;
    if (typeof window.__glStopExecution === 'function') window.__glStopExecution();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ files, currentPath, emptyFolders: [] }));
    sessionStorage.setItem(STORAGE_KEY + '_notice', notice);
    window.location.reload();
  }

  function showNotice() {
    const notice = sessionStorage.getItem(STORAGE_KEY + '_notice');
    if (!notice) return;
    sessionStorage.removeItem(STORAGE_KEY + '_notice');
    const status = document.getElementById('runnerStatus');
    const meta = document.getElementById('metaStatus');
    const output = document.getElementById('runnerOutput');
    if (status) status.textContent = 'Archive imported';
    if (meta) meta.textContent = 'Imported';
    if (output) output.textContent = notice;
  }

  function install() {
    if (window.__glArchiveImportInstalled) return;
    window.__glArchiveImportInstalled = true;
    const original = window.__glImportFolder;
    window.__glImportArchive = importArchive;
    window.__glImportFolder = async () => {
      const mode = await chooseMode();
      if (mode === 'folder' && typeof original === 'function') original();
      if (mode === 'zip') await importArchive();
    };
    showNotice();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
