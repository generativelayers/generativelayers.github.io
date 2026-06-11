(() => {
  'use strict';

  const STYLE_ID = 'gl-tree-fixes-style';
  const STORAGE_KEY = 'gl-astra-project';
  const SIDEBAR_COLLAPSE_KEY = `gl-runner-files-collapsed-${window.GL_PLATFORM || 'default'}`;

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

      .runner-files-head {
        justify-content: space-between !important;
      }

      .runner-files-head span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .runner-files-collapse-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        margin-left: auto;
        border: 1px solid rgba(52, 211, 153, .35);
        border-radius: 8px;
        background: rgba(52, 211, 153, .10);
        color: #34d399;
        font-size: 14px;
        font-weight: 900;
        line-height: 1;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }

      .runner-files-collapse-toggle:hover {
        background: #059669;
        color: #ffffff;
        border-color: #059669;
      }

      .runner-project {
        position: relative;
      }

      .runner-project.files-collapsed {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      .runner-project.files-collapsed .runner-editor-wrap {
        grid-column: 1 / -1 !important;
        width: 100% !important;
        min-width: 0 !important;
      }

      .runner-project.files-collapsed .runner-files {
        position: absolute !important;
        top: 7px;
        left: 8px;
        z-index: 20;
        width: 28px !important;
        min-width: 28px !important;
        max-width: 28px !important;
        height: 28px !important;
        min-height: 28px !important;
        overflow: visible !important;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }

      .runner-project.files-collapsed .runner-files-head {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        width: 28px !important;
        height: 28px !important;
        padding: 0 !important;
        background: transparent !important;
        border: 0 !important;
      }

      .runner-project.files-collapsed .runner-files-head span,
      .runner-project.files-collapsed .runner-file-actions,
      .runner-project.files-collapsed #fileTree,
      .runner-project.files-collapsed .runner-tree-toolbar {
        display: none !important;
      }

      .runner-project.files-collapsed .runner-files-collapse-toggle {
        width: 28px;
        height: 28px;
        margin: 0 !important;
        border-radius: 8px;
        font-size: 14px;
        background: #059669;
        color: #ffffff;
        border-color: #059669;
        box-shadow: 0 4px 10px rgba(5, 150, 105, .28);
      }

      .runner-project.files-collapsed .runner-current-file {
        padding-left: 46px !important;
      }

      @media(max-width:900px) {
        .runner-project.files-collapsed {
          grid-template-columns: minmax(0, 1fr) !important;
        }

        .runner-project.files-collapsed .runner-editor-wrap {
          grid-column: 1 / -1 !important;
        }

        .runner-project.files-collapsed .runner-files {
          top: 7px;
          left: 8px;
        }
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

  function setFilesCollapsed(collapsed) {
    const project = document.querySelector('.runner-project');
    const toggle = document.querySelector('.runner-files-collapse-toggle');
    if (!project) return;

    project.classList.toggle('files-collapsed', collapsed);
    if (toggle) {
      toggle.textContent = collapsed ? '>' : '<';
      toggle.setAttribute('aria-label', collapsed ? 'Expand project files panel' : 'Collapse project files panel');
      toggle.setAttribute('title', collapsed ? 'Expand files' : 'Collapse files');
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }

    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch (_) {}

    window.dispatchEvent(new Event('resize'));
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'gl-runner-resize' }, '*');
    }
  }

  function patchFilesCollapseToggle() {
    const filesHead = document.querySelector('.runner-files-head');
    if (!filesHead || filesHead.querySelector('.runner-files-collapse-toggle')) return;

    const toggle = document.createElement('button');
    toggle.className = 'runner-files-collapse-toggle';
    toggle.type = 'button';
    toggle.textContent = '<';
    toggle.setAttribute('aria-label', 'Collapse project files panel');
    toggle.setAttribute('title', 'Collapse files');
    toggle.setAttribute('aria-expanded', 'true');

    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const project = document.querySelector('.runner-project');
      setFilesCollapsed(!project || !project.classList.contains('files-collapsed'));
    });

    filesHead.appendChild(toggle);

    let collapsed = false;
    try {
      collapsed = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
    } catch (_) {}
    setFilesCollapsed(collapsed);
  }

  function patchTree() {
    addStyle();
    patchDeleteFolder();
    patchRootActions();
    patchFilesCollapseToggle();
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