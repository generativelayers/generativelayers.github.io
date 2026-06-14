/**
 * code-runner-one-open.js v8
 *
 * Single "Open" button → fixed-position menu with:
 *   • Open Folder   → calls __glImportFolder  (from archive-import.js)
 *   • Open Files/ZIP → calls __glImportFileOrZip (from archive-import.js)
 *
 * All file-type handling, platform-specific logic, pom.xml generation,
 * and path mapping is in code-runner-archive-import.js. This module
 * only provides the UI trigger.
 *
 * Menu is appended to document.body so it is never clipped.
 * Same behavior on desktop and mobile.
 */
(() => {
  'use strict';

  const MENU_ID = 'gl-open-menu';
  const CFG = window.GL_PLATFORM_CONFIG || {};
  const srcExt = CFG.sourceExt || '.astra';

  /* ── Styles ──────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('gl-open-styles')) return;
    const s = document.createElement('style');
    s.id = 'gl-open-styles';
    s.textContent = `
      .gl-open-backdrop {
        position: fixed; inset: 0; z-index: 99990;
        background: rgba(0,0,0,0.25);
      }
      .gl-open-menu {
        position: fixed; z-index: 99991;
        background: #1e293b;
        border: 1px solid rgba(52,211,153,0.3);
        border-radius: 14px;
        padding: 6px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.45);
        min-width: 200px;
        animation: gl-open-pop 0.12s ease;
      }
      @keyframes gl-open-pop {
        from { opacity: 0; transform: scale(0.95) }
        to   { opacity: 1; transform: scale(1) }
      }
      .gl-open-option {
        display: flex; align-items: center; gap: 12px;
        width: 100%; border: none; border-radius: 10px;
        background: transparent; color: #d1fae5;
        font-size: 14px; font-weight: 700;
        padding: 12px 14px; margin: 0;
        cursor: pointer; text-align: left;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        transition: background 0.12s;
        min-height: 44px;
      }
      .gl-open-option:active,
      .gl-open-option:hover { background: #059669; color: #fff; }
      .gl-open-option:active i,
      .gl-open-option:hover i { color: #fff; }
      .gl-open-option i {
        width: 20px; text-align: center;
        font-size: 16px; color: #34d399; flex-shrink: 0;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Menu ─────────────────────────────────────────────── */
  function closeMenu() {
    const el = document.getElementById(MENU_ID);
    if (el) el.remove();
    const bg = document.getElementById(MENU_ID + '-bg');
    if (bg) bg.remove();
  }

  function showMenu(anchorBtn) {
    closeMenu();
    injectStyles();

    // Backdrop
    const bg = document.createElement('div');
    bg.id = MENU_ID + '-bg';
    bg.className = 'gl-open-backdrop';
    bg.addEventListener('pointerdown', (e) => { e.preventDefault(); closeMenu(); });
    document.body.appendChild(bg);

    // Menu
    const menu = document.createElement('div');
    menu.id = MENU_ID;
    menu.className = 'gl-open-menu';

    function makeOption(icon, label, action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gl-open-option';
      btn.innerHTML = '<i class="fa-solid ' + icon + '"></i> ' + label;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
        action();
      });
      return btn;
    }

    menu.appendChild(makeOption('fa-folder-open', 'Open Folder', () => {
      if (typeof window.__glImportFolder === 'function') window.__glImportFolder();
    }));

    menu.appendChild(makeOption('fa-file-zipper', 'Open Files / ZIP', () => {
      if (typeof window.__glImportFileOrZip === 'function') window.__glImportFileOrZip();
    }));

    document.body.appendChild(menu);

    // Position near anchor
    const rect = anchorBtn.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let top = rect.top - menuRect.height - 8;
    if (top < 8) top = rect.bottom + 8;
    let left = rect.left;
    if (left + menuRect.width > window.innerWidth - 8) left = window.innerWidth - menuRect.width - 8;
    if (left < 8) left = 8;
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
  }

  /* ── Toolbar patching ────────────────────────────────── */
  function patchToolbar() {
    const toolbar = document.querySelector('.runner-tree-toolbar');
    if (!toolbar) return;

    const openBtn = toolbar.querySelector('.runner-tree-btn');
    if (!openBtn || openBtn.dataset.oneOpenPatched === '1') return;

    const next = openBtn.cloneNode(true);
    next.dataset.oneOpenPatched = '1';
    next.className = openBtn.className;
    next.title = 'Open project folder, files, or ZIP';
    next.innerHTML = '<i class="fa-solid fa-folder-open"></i> Open';
    next.style.minHeight = '44px';

    next.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      if (document.getElementById(MENU_ID)) closeMenu();
      else showMenu(next);
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
