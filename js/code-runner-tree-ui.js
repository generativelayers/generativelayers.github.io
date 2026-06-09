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

      const text = title.textContent || '';
      const isAstra = text.includes('/astra');
      const isJava = text.includes('/java');
      const isResources = text.includes('/resources');
      if (!isAstra && !isJava && !isResources) return;

      const label = document.createElement('div');
      label.className = 'runner-root-label';

      while (title.firstChild) {
        label.appendChild(title.firstChild);
      }

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'runner-folder-add';
      add.title = isAstra ? 'New ASTRA file' : isJava ? 'New Java file' : 'New resource file';
      add.innerHTML = '<i class="fa-solid fa-plus"></i>';
      add.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (isAstra) clickHidden('newAstraFileButton');
        else if (isJava) clickHidden('newJavaFileButton');
        else if (isResources && typeof window.__glCreateResourceFile === 'function') window.__glCreateResourceFile();
      });

      title.appendChild(label);
      title.appendChild(add);
      title.dataset.treeUiPatched = '1';
    });
  }

  function patchFileRows() {
    document.querySelectorAll('button.runner-file[data-path]:not([data-tree-ui-patched])').forEach(openButton => {
      const path = openButton.dataset.path || '';
      const name = path.split('/').pop() || path;
      const active = openButton.classList.contains('active');

      const row = document.createElement('div');
      row.className = `runner-file-row${active ? ' active' : ''}`;

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

      openButton.dataset.treeUiPatched = '1';
      openButton.parentNode.insertBefore(row, openButton);
      row.appendChild(del);
      row.appendChild(openButton);
      row.appendChild(rename);
    });
  }

  function patchTree() {
    addStyle();
    patchHeader();
    patchRootTitles();
    patchFileRows();
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
