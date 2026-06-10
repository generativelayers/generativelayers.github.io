(() => {
  const STYLE_ID = 'gl-project-tree-action-style';

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .runner-file-actions {
        display: none !important;
      }

      .runner-files-head {
        justify-content: flex-start !important;
      }

      .runner-files-head span:last-child {
        display: none !important;
      }

      .runner-root-title {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
      }

      .runner-root-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .runner-folder-add,
      .runner-file-delete,
      .runner-file-rename {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        min-width: 24px;
        border: 1px solid rgba(52, 211, 153, 0.35);
        border-radius: 8px;
        background: rgba(52, 211, 153, 0.10);
        color: #34d399;
        cursor: pointer;
        font-size: 11px;
        padding: 0;
      }

      .runner-folder-add:hover,
      .runner-file-delete:hover,
      .runner-file-rename:hover {
        background: #059669;
        border-color: #059669;
        color: #fff;
      }

      .runner-file-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 2px 0;
        border-radius: 8px;
      }

      .runner-file-row .runner-file {
        flex: 1;
        width: auto !important;
        margin: 0 !important;
        min-width: 0;
      }

      .runner-file-row .runner-file span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .runner-file-row.active .runner-file {
        background: #1f2937 !important;
        color: #fff !important;
      }

      .runner-file-delete {
        color: #fca5a5;
        border-color: rgba(248, 113, 113, 0.35);
        background: rgba(248, 113, 113, 0.08);
      }

      .runner-file-delete:hover {
        background: #dc2626;
        border-color: #dc2626;
        color: #fff;
      }

      .runner-tree-toolbar {
        display: flex;
        gap: 4px;
        padding: 8px 6px;
        border-top: 1px solid #1f2937;
        background: #0f172a;
      }

      .runner-tree-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        flex: 1;
        border: 1px solid rgba(52, 211, 153, 0.3);
        border-radius: 8px;
        background: rgba(52, 211, 153, 0.08);
        color: #34d399;
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        padding: 6px 4px;
        transition: all 0.15s;
      }

      .runner-tree-btn:hover {
        background: #059669;
        border-color: #059669;
        color: #fff;
      }

      .runner-tree-btn i {
        font-size: 12px;
      }

      /* ── Subfolder tree ── */
      .runner-folder-head {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        border-radius: 6px;
        user-select: none;
        margin: 1px 0;
      }
      .runner-folder-head:hover {
        background: #1e293b;
        color: #e2e8f0;
      }
      .runner-folder-body {
        padding-left: 8px;
        margin-left: 9px;
        border-left: 1px solid rgba(52, 211, 153, 0.12);
      }
      .runner-chevron {
        font-size: 8px;
        transition: transform 0.15s;
        width: 10px;
        text-align: center;
        flex-shrink: 0;
      }
      .runner-folder.collapsed > .runner-folder-head .runner-chevron {
        transform: rotate(-90deg);
      }
      .runner-folder.collapsed > .runner-folder-body {
        display: none;
      }
      .runner-folder-ico {
        font-size: 11px;
        flex-shrink: 0;
        color: #34d399;
      }
      .runner-folder-actions {
        display: none;
        gap: 3px;
        margin-left: auto;
        align-items: center;
      }
      .runner-folder-head:hover .runner-folder-actions {
        display: flex;
      }
      .runner-folder-action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        min-width: 18px;
        border: 1px solid rgba(52, 211, 153, 0.3);
        border-radius: 5px;
        background: rgba(52, 211, 153, 0.08);
        color: #34d399;
        cursor: pointer;
        font-size: 9px;
        padding: 0;
      }
      .runner-folder-action-btn:hover {
        background: #059669;
        border-color: #059669;
        color: #fff;
      }
      .runner-folder-action-btn.delete {
        color: #fca5a5;
        border-color: rgba(248, 113, 113, 0.3);
        background: rgba(248, 113, 113, 0.06);
      }
      .runner-folder-action-btn.delete:hover {
        background: #dc2626;
        border-color: #dc2626;
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  function clickHidden(id) {
    const button = document.getElementById(id);
    if (button) button.click();
  }

  function patchHeader() {
    const extra = document.querySelector('.runner-files-head span:last-child');
    if (extra) extra.textContent = '';
  }

  function patchRootTitles() {
    document.querySelectorAll('.runner-root-title').forEach(title => {
      if (title.dataset.treeUiPatched === '1') return;

      const text = (title.textContent || '').trim().toLowerCase();
      
      const CFG = window.GL_PLATFORM_CONFIG || {};
      const sourceFolder = CFG.sourceFolder || '/astra';
      const auxFolder = CFG.auxFolder || '/java';
      
      const isSource = sourceFolder && text === sourceFolder.substring(1).toLowerCase();
      const isAux = auxFolder && text === auxFolder.substring(1).toLowerCase();
      
      if (!isSource && !isAux) return;

      const label = document.createElement('div');
      label.className = 'runner-root-label';

      while (title.firstChild) {
        label.appendChild(title.firstChild);
      }

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'runner-folder-add';
      add.title = isSource ? (CFG.newSourceLabel || '+ ASTRA') : (CFG.newAuxLabel || '+ Java');
      add.innerHTML = '<i class="fa-solid fa-plus"></i>';
      add.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        clickHidden(isSource ? 'newAstraFileButton' : 'newJavaFileButton');
      });

      const addFolder = document.createElement('button');
      addFolder.type = 'button';
      addFolder.className = 'runner-folder-add';
      addFolder.title = isSource ? `New folder in ${sourceFolder}` : `New folder in ${auxFolder}`;
      addFolder.innerHTML = '<i class="fa-solid fa-folder-plus"></i>';
      addFolder.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof window.__glCreateFolder === 'function') window.__glCreateFolder(isSource ? sourceFolder : auxFolder);
      });

      title.appendChild(label);
      title.appendChild(addFolder);
      title.appendChild(add);
      title.dataset.treeUiPatched = '1';
    });
  }

  function patchFileRows() {
    document.querySelectorAll('button.runner-file[data-path]:not([data-tree-ui-patched])').forEach(openButton => {
      const path = openButton.dataset.path || '';
      const name = path.split('/').pop() || path;
      const active = openButton.classList.contains('active');
      const isPom = path === '/pom.xml';

      const row = document.createElement('div');
      row.className = `runner-file-row${active ? ' active' : ''}`;

      if (!isPom) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'runner-file-delete';
        del.title = `Delete ${name}`;
        del.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        del.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          openButton.click();
          window.setTimeout(() => clickHidden('deleteFileButton'), 0);
        });
        row.appendChild(del);
      }

      openButton.dataset.treeUiPatched = '1';
      openButton.parentNode.insertBefore(row, openButton);
      row.appendChild(openButton);

      if (!isPom) {
        const rename = document.createElement('button');
        rename.type = 'button';
        rename.className = 'runner-file-rename';
        rename.title = `Rename ${name}`;
        rename.innerHTML = '<i class="fa-solid fa-pen"></i>';
        rename.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          openButton.click();
          window.setTimeout(() => clickHidden('renameFileButton'), 0);
        });
        row.appendChild(rename);
      }
    });
  }

  function addBottomToolbar() {
    const filesPanel = document.querySelector('.runner-files');
    if (!filesPanel || filesPanel.querySelector('.runner-tree-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'runner-tree-toolbar';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'runner-tree-btn';
    openBtn.title = 'Import local ASTRA project folder';
    openBtn.innerHTML = '<i class="fa-solid fa-folder-open"></i> Open';
    openBtn.addEventListener('click', () => {
      if (typeof window.__glImportFolder === 'function') window.__glImportFolder();
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'runner-tree-btn';
    saveBtn.title = 'Save project to browser storage';
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save';
    saveBtn.addEventListener('click', () => {
      if (typeof window.__glSaveProject === 'function') {
        window.__glSaveProject();
        saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
        setTimeout(() => { saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save'; }, 1500);
      }
    });

    const newBtn = document.createElement('button');
    newBtn.type = 'button';
    newBtn.className = 'runner-tree-btn';
    newBtn.title = 'New project (reset to default template)';
    newBtn.innerHTML = '<i class="fa-solid fa-file-circle-plus"></i> New';
    newBtn.addEventListener('click', () => {
      if (typeof window.__glResetProject === 'function') window.__glResetProject();
    });

    toolbar.appendChild(openBtn);
    toolbar.appendChild(saveBtn);
    toolbar.appendChild(newBtn);
    filesPanel.appendChild(toolbar);
  }

  function patchFolderHeads() {
    document.querySelectorAll('.runner-folder-head:not([data-tree-ui-patched])').forEach(head => {
      head.dataset.treeUiPatched = '1';
      const folderPath = head.dataset.folderPath;

      // Collapse/expand on click
      head.addEventListener('click', (e) => {
        if (e.target.closest('.runner-folder-actions')) return;
        const folder = head.closest('.runner-folder');
        if (!folder) return;
        folder.classList.toggle('collapsed');
        const ico = head.querySelector('.runner-folder-ico');
        if (ico) {
          ico.classList.toggle('fa-folder-open', !folder.classList.contains('collapsed'));
          ico.classList.toggle('fa-folder', folder.classList.contains('collapsed'));
        }
      });

      // Action buttons (appear on hover via CSS)
      const actions = document.createElement('div');
      actions.className = 'runner-folder-actions';

      const newFolderBtn = document.createElement('button');
      newFolderBtn.type = 'button';
      newFolderBtn.className = 'runner-folder-action-btn';
      newFolderBtn.title = 'New subfolder';
      newFolderBtn.innerHTML = '<i class="fa-solid fa-folder-plus"></i>';
      newFolderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.__glCreateFolder === 'function') window.__glCreateFolder(folderPath);
      });

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'runner-folder-action-btn';
      addBtn.title = 'New file';
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.__glCreateFileInFolder === 'function') window.__glCreateFileInFolder(folderPath);
      });

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'runner-folder-action-btn';
      renameBtn.title = 'Rename folder';
      renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.__glRenameFolder === 'function') window.__glRenameFolder(folderPath);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'runner-folder-action-btn delete';
      deleteBtn.title = 'Delete folder';
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.__glDeleteFolder === 'function') window.__glDeleteFolder(folderPath);
      });

      actions.appendChild(newFolderBtn);
      actions.appendChild(addBtn);
      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      head.appendChild(actions);
    });
  }

  function patchTree() {
    addStyle();
    patchHeader();
    patchRootTitles();
    patchFolderHeads();
    patchFileRows();
    addBottomToolbar();
  }

  function init() {
    patchTree();
    const tree = document.getElementById('fileTree');
    if (!tree) return;

    const observer = new MutationObserver(() => window.setTimeout(patchTree, 0));
    observer.observe(tree, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
