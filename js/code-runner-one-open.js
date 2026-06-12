/**
 * code-runner-one-open.js v1
 *
 * Keeps a single visible Open button. The button opens files/ZIPs normally and
 * uses long-press or Shift-click for native folder picking because browsers do
 * not provide one native picker that can select both files and directories.
 */
(() => {
  'use strict';

  function folderOpen() {
    if (typeof window.__glImportFolder === 'function') window.__glImportFolder();
  }

  function fileOpen() {
    if (typeof window.__glImportFileOrZip === 'function') window.__glImportFileOrZip();
    else if (typeof window.__glImportArchive === 'function') window.__glImportArchive();
    else folderOpen();
  }

  function patchToolbar() {
    const toolbar = document.querySelector('.runner-tree-toolbar');
    if (!toolbar) return;

    Array.from(toolbar.querySelectorAll('.runner-tree-btn')).forEach((btn, index) => {
      const text = (btn.textContent || '').trim().toLowerCase();
      const html = (btn.innerHTML || '').toLowerCase();
      if (index > 0 && (text.includes('file/zip') || html.includes('file-zipper'))) btn.remove();
    });

    const openBtn = toolbar.querySelector('.runner-tree-btn');
    if (!openBtn || openBtn.dataset.oneOpenPatched === '1') return;

    const next = openBtn.cloneNode(true);
    next.dataset.oneOpenPatched = '1';
    next.className = openBtn.className;
    next.title = 'Open file, ZIP, or folder. Tap/click for file or ZIP; long-press or Shift-click for folder.';
    next.innerHTML = '<i class="fa-solid fa-folder-open"></i> Open';

    let timer = null;
    let longPressed = false;

    function clearTimer() {
      if (timer) clearTimeout(timer);
      timer = null;
    }

    next.addEventListener('pointerdown', event => {
      longPressed = false;
      clearTimer();
      timer = setTimeout(() => {
        longPressed = true;
        folderOpen();
      }, 650);
    });

    next.addEventListener('pointerup', clearTimer);
    next.addEventListener('pointercancel', clearTimer);
    next.addEventListener('pointerleave', clearTimer);

    next.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      clearTimer();
      if (longPressed) return;
      if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) folderOpen();
      else fileOpen();
    });

    openBtn.replaceWith(next);
  }

  function init() {
    patchToolbar();
    const observer = new MutationObserver(() => window.setTimeout(patchToolbar, 0));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
