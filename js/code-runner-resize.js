/**
 * code-runner-resize.js  v1
 *
 * Adds drag-to-resize between the file tree and editor (horizontal),
 * and makes the editor vertically resizable via a bottom drag handle.
 */
(() => {
  'use strict';

  const MIN_FILES_W = 140;
  const MAX_FILES_W = 500;
  const MIN_EDITOR_H = 200;

  function addStyles() {
    const s = document.createElement('style');
    s.id = 'gl-resize-style';
    s.textContent = `
      /* Horizontal splitter between file tree and editor */
      .runner-hsplitter {
        width: 6px;
        cursor: col-resize;
        background: transparent;
        position: relative;
        z-index: 10;
        flex-shrink: 0;
        border-radius: 4px;
        transition: background 0.15s;
      }
      .runner-hsplitter:hover,
      .runner-hsplitter.dragging {
        background: rgba(52, 211, 153, 0.4);
      }
      .runner-hsplitter::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 2px;
        height: 30px;
        border-radius: 2px;
        background: rgba(52, 211, 153, 0.35);
        transition: background 0.15s;
      }
      .runner-hsplitter:hover::after,
      .runner-hsplitter.dragging::after {
        background: #34d399;
        height: 50px;
      }

      /* Vertical resize handle at the bottom of editor */
      .runner-vsplitter {
        height: 6px;
        cursor: row-resize;
        background: transparent;
        position: relative;
        z-index: 10;
        border-radius: 4px;
        transition: background 0.15s;
        margin-top: -1px;
      }
      .runner-vsplitter:hover,
      .runner-vsplitter.dragging {
        background: rgba(52, 211, 153, 0.4);
      }
      .runner-vsplitter::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        height: 2px;
        width: 30px;
        border-radius: 2px;
        background: rgba(52, 211, 153, 0.35);
        transition: background 0.15s;
      }
      .runner-vsplitter:hover::after,
      .runner-vsplitter.dragging::after {
        background: #34d399;
        width: 50px;
      }

      /* Override grid layout to use flex for resize support */
      .runner-project.resizable {
        display: flex !important;
        align-items: stretch !important;
        gap: 0 !important;
      }

      .runner-project.resizable .runner-files {
        flex-shrink: 0;
        overflow-y: auto;
      }

      .runner-project.resizable .runner-editor-wrap {
        flex: 1;
        min-width: 0;
      }

      /* Prevent text selection during drag */
      body.gl-resizing {
        user-select: none !important;
        cursor: col-resize !important;
      }
      body.gl-resizing-v {
        user-select: none !important;
        cursor: row-resize !important;
      }
    `;
    document.head.appendChild(s);
  }

  function init() {
    const project = document.querySelector('.runner-project');
    const filesPanel = project && project.querySelector('.runner-files');
    const editorWrap = project && project.querySelector('.runner-editor-wrap');
    if (!project || !filesPanel || !editorWrap) return;

    addStyles();

    // ─── Switch from grid to flex ───
    const currentW = filesPanel.getBoundingClientRect().width || 195;
    filesPanel.style.width = currentW + 'px';
    project.classList.add('resizable');

    // ─── Horizontal splitter ───
    const hSplit = document.createElement('div');
    hSplit.className = 'runner-hsplitter';
    hSplit.title = 'Drag to resize file tree';
    project.insertBefore(hSplit, editorWrap);

    let dragging = false;
    let startX = 0;
    let startW = 0;

    hSplit.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      startX = e.clientX;
      startW = filesPanel.getBoundingClientRect().width;
      hSplit.classList.add('dragging');
      document.body.classList.add('gl-resizing');
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      const newW = Math.max(MIN_FILES_W, Math.min(MAX_FILES_W, startW + delta));
      filesPanel.style.width = newW + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      hSplit.classList.remove('dragging');
      document.body.classList.remove('gl-resizing');
    });

    // ─── Vertical splitter (below editor) ───
    const editor = editorWrap.querySelector('.runner-editor');
    if (editor) {
      // Remove native CSS resize since we have our own handle
      editor.style.resize = 'none';

      const vSplit = document.createElement('div');
      vSplit.className = 'runner-vsplitter';
      vSplit.title = 'Drag to resize editor height';
      editorWrap.appendChild(vSplit);

      let vDragging = false;
      let vStartY = 0;
      let vStartH = 0;

      vSplit.addEventListener('mousedown', (e) => {
        e.preventDefault();
        vDragging = true;
        vStartY = e.clientY;
        vStartH = editor.getBoundingClientRect().height;
        vSplit.classList.add('dragging');
        document.body.classList.add('gl-resizing-v');
      });

      document.addEventListener('mousemove', (e) => {
        if (!vDragging) return;
        const delta = e.clientY - vStartY;
        const newH = Math.max(MIN_EDITOR_H, vStartH + delta);
        editor.style.height = newH + 'px';
        editor.style.minHeight = newH + 'px';
        editor.style.flex = 'none';

        // Also resize the highlight overlay if present
        const overlay = editor.parentElement && editor.parentElement.querySelector('.gl-highlight-overlay');
        if (overlay) {
          overlay.style.height = newH + 'px';
        }
      });

      document.addEventListener('mouseup', () => {
        if (!vDragging) return;
        vDragging = false;
        vSplit.classList.remove('dragging');
        document.body.classList.remove('gl-resizing-v');
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
