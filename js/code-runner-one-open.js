/**
 * code-runner-one-open.js v4
 *
 * Patches the toolbar "Open" button to directly open the native folder picker.
 * File/ZIP import is handled separately by code-runner-archive-import.js.
 *
 * Key fix: the hidden <input webkitdirectory> is pre-created and clicked
 * directly inside the user gesture handler, avoiding the dropdown menu
 * that previously consumed the gesture and blocked input.click().
 */
(() => {
  'use strict';

  function patchToolbar() {
    const toolbar = document.querySelector('.runner-tree-toolbar');
    if (!toolbar) return;

    const openBtn = toolbar.querySelector('.runner-tree-btn');
    if (!openBtn || openBtn.dataset.oneOpenPatched === '1') return;

    // Create a persistent hidden folder input ONCE
    const folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.webkitdirectory = true;
    folderInput.style.display = 'none';
    document.body.appendChild(folderInput);

    // Wire up the change handler to the import function
    folderInput.addEventListener('change', () => {
      if (!folderInput.files || folderInput.files.length === 0) return;
      // Delegate to importFolder's change handler via __glImportFolderFiles
      if (typeof window.__glImportFolderFiles === 'function') {
        window.__glImportFolderFiles(folderInput.files);
      } else if (typeof window.__glImportFolder === 'function') {
        // Fallback: trigger the original importFolder which creates its own input
        window.__glImportFolder();
      }
      // Reset so the same folder can be re-selected
      folderInput.value = '';
    });

    // Replace the Open button with a direct folder picker trigger
    const next = openBtn.cloneNode(true);
    next.dataset.oneOpenPatched = '1';
    next.className = openBtn.className;
    next.title = 'Open a project folder';
    next.innerHTML = '<i class="fa-solid fa-folder-open"></i> Open';

    next.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      // Click the hidden input DIRECTLY in the user gesture — no dropdown delay
      folderInput.click();
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
