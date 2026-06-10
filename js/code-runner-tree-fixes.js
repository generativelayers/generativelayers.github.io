(() => {
  'use strict';

  const STYLE_ID = 'gl-tree-fixes-style';
  const CFG = window.GL_PLATFORM_CONFIG || {};
  const STORAGE_KEY = (CFG.storagePrefix || 'gl-astra-') + 'project';

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .runner-root-title {
        justify-content: flex-start !important;
      }

      .runner-root-actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
        margin-left: auto;
        flex-shrink: 0;
      }

      .runner-root-actions .runner-folder-add {
        margin-left: 0 !important;
      }

      .runner-folder-head {
        justify-content: flex-start !important;
        text-align: left !important;
      }

      .runner-folder-head > span {
        flex: 1 1 auto;
        min-width: 0;
        text-align: left !important;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .runner-folder-actions {
        margin-left: auto !important;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  function loadStoredProject() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveStoredProject(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function folderStillVisible(folderPath) {
    return !!document.querySelector(`.runner-folder[data-folder-path="${cssEscape(folderPath)}"]`);
  }

  function folderStorageState(folderPath) {
    const data = loadStoredProject();
    const files = data && data.files && typeof data.files === 'object' ? data.files : {};
    const emptyFolders = Array.isArray(data && data.emptyFolders) ? data.emptyFolders : [];
    const filePaths = Object.keys(files).filter(path => path.startsWith(folderPath + '/'));
    const folderPaths = emptyFolders.filter(path => path === folderPath || path.startsWith(folderPath + '/'));
    return { data, files, emptyFolders, filePaths, folderPaths };
  }

  function deleteEmptyFolderFromStorage(folderPath) {
    const state = folderStorageState(folderPath);
    if (!state.data || state.filePaths.length > 0 || state.folderPaths.length === 0) return false;

    const name = folderPath.split('/').pop() || folderPath;
    const nestedCount = state.folderPaths.length;
    const message = nestedCount > 1
      ? `Delete folder "${name}" and its ${nestedCount - 1} empty subfolder(s)?`
      : `Delete empty folder "${name}"?`;
    if (!window.confirm(message)) return true;

    const remove = new Set(state.folderPaths);
    state.data.emptyFolders = state.emptyFolders.filter(path => !remove.has(path));

    if (state.data.currentPath && state.data.currentPath.startsWith(folderPath + '/')) {
      const remaining = Object.keys(state.files).sort();
      state.data.currentPath = remaining[0] || '/astra/Main.astra';
    }

    saveStoredProject(state.data);
    window.location.reload();
    return true;
  }

  function patchDeleteFolder() {
    if (typeof window.__glDeleteFolder !== 'function') return false;
    if (window.__glDeleteFolder.__treeFixPatched) return true;

    const originalDeleteFolder = window.__glDeleteFolder;

    function patchedDeleteFolder(folderPath) {
      const stateBefore = folderStorageState(folderPath);
      if (stateBefore.filePaths.length === 0 && stateBefore.folderPaths.length > 0) {
        deleteEmptyFolderFromStorage(folderPath);
        return;
      }

      originalDeleteFolder(folderPath);

      window.setTimeout(() => {
        if (!folderStillVisible(folderPath)) return;
        const stateAfter = folderStorageState(folderPath);
        if (stateAfter.filePaths.length === 0 && stateAfter.folderPaths.length > 0) {
          deleteEmptyFolderFromStorage(folderPath);
        }
      }, 0);
    }

    patchedDeleteFolder.__treeFixPatched = true;
    window.__glDeleteFolder = patchedDeleteFolder;
    return true;
  }

  function patchRootActions() {
    document.querySelectorAll('.runner-root-title[data-tree-ui-patched="1"]').forEach(title => {
      if (title.querySelector('.runner-root-actions')) return;
      const buttons = Array.from(title.querySelectorAll(':scope > button.runner-folder-add'));
      if (buttons.length === 0) return;
      const actions = document.createElement('div');
      actions.className = 'runner-root-actions';
      buttons.forEach(button => actions.appendChild(button));
      title.appendChild(actions);
    });
  }

  function patchTree() {
    addStyle();
    patchDeleteFolder();
    patchRootActions();
  }

  function init() {
    patchTree();
    const tree = document.getElementById('fileTree');
    if (tree) {
      new MutationObserver(() => window.setTimeout(patchTree, 0)).observe(tree, { childList: true, subtree: true });
    }
    const retry = window.setInterval(() => {
      patchTree();
      if (patchDeleteFolder()) window.clearInterval(retry);
    }, 300);
    window.setTimeout(() => window.clearInterval(retry), 5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
