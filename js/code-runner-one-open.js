/**
 * code-runner-one-open.js v6
 *
 * Patches the toolbar "Open" button.
 *
 * Desktop: directly opens native folder picker.
 * Mobile:  shows a bottom-sheet with two options:
 *          • Open Folder (tries webkitdirectory — gracefully degrades)
 *          • Open Files / ZIP
 *
 * Both pickers use pre-created hidden <input> elements clicked inside
 * the user-gesture handler to avoid browser blocking.
 *
 * The bottom-sheet is appended to document.body (not inside the toolbar)
 * so it is never clipped by overflow:hidden on parent containers.
 */
(() => {
  'use strict';

  const SHEET_ID = 'gl-open-sheet';

  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));

  const CFG = window.GL_PLATFORM_CONFIG || {};
  const srcExt = CFG.sourceExt || '.astra';
  const auxExt = CFG.auxExt || '.java';
  const extraExts = CFG.extraExts || [];
  const ACCEPT = [srcExt, auxExt, '.zip', '.xml', ...extraExts]
    .map(e => e.startsWith('.') ? e : '.' + e).join(',');

  /* ── Styles (injected once) ──────────────────────────── */
  function injectStyles() {
    if (document.getElementById('gl-open-sheet-styles')) return;
    const s = document.createElement('style');
    s.id = 'gl-open-sheet-styles';
    s.textContent = `
      .gl-sheet-backdrop {
        position: fixed; inset: 0; z-index: 99990;
        background: rgba(0,0,0,0.45);
        animation: gl-sheet-fade-in 0.15s ease;
      }
      .gl-sheet-backdrop[hidden] { display: none !important; }
      @keyframes gl-sheet-fade-in { from { opacity: 0 } to { opacity: 1 } }

      .gl-sheet {
        position: fixed; bottom: 0; left: 0; right: 0;
        z-index: 99991;
        background: #1e293b;
        border-top: 1px solid rgba(52,211,153,0.3);
        border-radius: 18px 18px 0 0;
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -8px 30px rgba(0,0,0,0.4);
        animation: gl-sheet-slide-up 0.2s ease;
      }
      @keyframes gl-sheet-slide-up {
        from { transform: translateY(100%) } to { transform: translateY(0) }
      }

      .gl-sheet-handle {
        width: 36px; height: 4px;
        background: #475569; border-radius: 2px;
        margin: 0 auto 14px;
      }

      .gl-sheet-title {
        color: #94a3b8; font-size: 12px; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.5px;
        padding: 0 4px 10px; margin: 0;
      }

      .gl-sheet-option {
        display: flex; align-items: center; gap: 14px;
        width: 100%; border: none; border-radius: 12px;
        background: transparent; color: #d1fae5;
        font-size: 15px; font-weight: 700;
        padding: 14px 16px; margin: 2px 0;
        cursor: pointer; text-align: left;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        transition: background 0.12s;
      }
      .gl-sheet-option:active { background: #059669; color: #fff; }
      .gl-sheet-option:hover { background: rgba(52,211,153,0.15); }

      .gl-sheet-option i {
        width: 22px; text-align: center;
        font-size: 17px; color: #34d399;
      }
      .gl-sheet-option:active i { color: #fff; }

      .gl-sheet-option .gl-sheet-sub {
        display: block; font-size: 11px; font-weight: 400;
        color: #64748b; margin-top: 2px;
      }

      .gl-sheet-cancel {
        display: block; width: 100%;
        border: 1px solid #334155; border-radius: 12px;
        background: transparent; color: #94a3b8;
        font-size: 14px; font-weight: 800;
        padding: 13px; margin-top: 10px;
        cursor: pointer; text-align: center;
        -webkit-tap-highlight-color: transparent;
      }
      .gl-sheet-cancel:active { background: #334155; color: #fff; }
    `;
    document.head.appendChild(s);
  }

  /* ── Hidden inputs (pre-created once) ────────────────── */
  let folderInput = null;
  let fileInput = null;

  function ensureInputs() {
    if (!folderInput) {
      folderInput = document.createElement('input');
      folderInput.type = 'file';
      folderInput.webkitdirectory = true;
      folderInput.style.display = 'none';
      document.body.appendChild(folderInput);

      folderInput.addEventListener('change', () => {
        if (!folderInput.files || folderInput.files.length === 0) return;
        if (typeof window.__glImportFolderFiles === 'function') {
          window.__glImportFolderFiles(folderInput.files);
        } else if (typeof window.__glImportFolder === 'function') {
          window.__glImportFolder();
        }
        folderInput.value = '';
      });
    }

    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = ACCEPT;
      fileInput.multiple = true;
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      fileInput.addEventListener('change', () => {
        if (!fileInput.files || fileInput.files.length === 0) return;
        // Check if first file is a ZIP — delegate to archive handler
        const name = (fileInput.files[0].name || '').toLowerCase();
        if (name.endsWith('.zip') || name.endsWith('.rar')) {
          if (typeof window.__glImportFileOrZip === 'function') {
            window.__glImportFileOrZip();
          }
        } else if (typeof window.__glImportFolderFiles === 'function') {
          window.__glImportFolderFiles(fileInput.files);
        }
        fileInput.value = '';
      });
    }
  }

  /* ── Bottom sheet (mobile) ───────────────────────────── */
  function closeSheet() {
    const el = document.getElementById(SHEET_ID);
    if (el) el.remove();
    const bg = document.getElementById(SHEET_ID + '-bg');
    if (bg) bg.remove();
  }

  function showSheet() {
    closeSheet();
    ensureInputs();
    injectStyles();

    // Backdrop
    const bg = document.createElement('div');
    bg.id = SHEET_ID + '-bg';
    bg.className = 'gl-sheet-backdrop';
    bg.addEventListener('pointerdown', (e) => { e.preventDefault(); closeSheet(); });
    document.body.appendChild(bg);

    // Sheet
    const sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'gl-sheet';
    sheet.innerHTML = `
      <div class="gl-sheet-handle"></div>
      <p class="gl-sheet-title">Open project</p>
      <button class="gl-sheet-option" data-action="folder" type="button">
        <i class="fa-solid fa-folder-open"></i>
        <span>Open Folder<span class="gl-sheet-sub">Select a project directory</span></span>
      </button>
      <button class="gl-sheet-option" data-action="file" type="button">
        <i class="fa-solid fa-file-zipper"></i>
        <span>Open Files / ZIP<span class="gl-sheet-sub">Import ${srcExt}, .java, or .zip files</span></span>
      </button>
      <button class="gl-sheet-cancel" type="button">Cancel</button>
    `;

    // Wire actions — inputs are clicked INSIDE the user gesture (pointerdown→click chain)
    sheet.querySelector('[data-action="folder"]').addEventListener('click', (e) => {
      e.preventDefault();
      closeSheet();
      folderInput.click();
    });
    sheet.querySelector('[data-action="file"]').addEventListener('click', (e) => {
      e.preventDefault();
      closeSheet();
      fileInput.click();
    });
    sheet.querySelector('.gl-sheet-cancel').addEventListener('click', (e) => {
      e.preventDefault();
      closeSheet();
    });

    document.body.appendChild(sheet);
  }

  /* ── Toolbar patching ────────────────────────────────── */
  function patchToolbar() {
    const toolbar = document.querySelector('.runner-tree-toolbar');
    if (!toolbar) return;

    const openBtn = toolbar.querySelector('.runner-tree-btn');
    if (!openBtn || openBtn.dataset.oneOpenPatched === '1') return;

    ensureInputs();

    const next = openBtn.cloneNode(true);
    next.dataset.oneOpenPatched = '1';
    next.className = openBtn.className;
    next.title = 'Open a project folder or files';
    next.innerHTML = '<i class="fa-solid fa-folder-open"></i> Open';

    if (isMobile) {
      next.style.minHeight = '44px';
      next.style.minWidth = '44px';
    }

    next.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();

      if (isMobile) {
        // Mobile: show bottom sheet with Folder / Files options
        showSheet();
      } else {
        // Desktop: directly open folder picker
        folderInput.click();
      }
    });

    openBtn.replaceWith(next);
  }

  function init() {
    patchToolbar();
    const observer = new MutationObserver(function() { window.setTimeout(patchToolbar, 0); });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
