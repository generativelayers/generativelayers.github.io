/**
 * code-runner-resize.js  v4
 *
 * Adds drag-to-resize between the file tree and editor (horizontal splitter),
 * and a bottom handle for editor height (vertical splitter).
 * The editor width fills the remaining space automatically via flex.
 */
(() => {
  'use strict';

  const MIN_FILES_W = 140;
  const MAX_FILES_W = 500;
  const MIN_EDITOR_H = 200;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function addStyles() {
    if (document.getElementById('gl-resize-style')) return;

    const s = document.createElement('style');
    s.id = 'gl-resize-style';
    s.textContent = `
      .runner-project.resizable {
        display: flex !important;
        align-items: stretch !important;
        gap: 0 !important;
        max-width: 100%;
        overflow: hidden;
      }

      .runner-project.resizable .runner-files {
        flex-shrink: 0;
        overflow-y: auto;
      }

      .runner-project.resizable .runner-editor-wrap {
        position: relative;
        flex: 1 1 0;
        min-width: 0;
        overflow: hidden;
      }

      .runner-project.resizable .hl-editor-wrap,
      .runner-project.resizable .runner-editor {
        width: 100%;
        box-sizing: border-box;
      }

      .runner-hsplitter {
        width: 6px;
        cursor: col-resize;
        background: transparent;
        position: relative;
        z-index: 12;
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

      .runner-vsplitter {
        height: 6px;
        cursor: row-resize;
        background: transparent;
        position: relative;
        z-index: 12;
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

      body.gl-resizing-h {
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

  function syncOverlay(editor) {
    const overlay = editor.parentElement && editor.parentElement.querySelector('.hl-overlay');
    if (!overlay) return;

    const rect = editor.getBoundingClientRect();
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }

  function init() {
    const project = document.querySelector('.runner-project');
    const filesPanel = project && project.querySelector('.runner-files');
    const editorWrap = project && project.querySelector('.runner-editor-wrap');
    if (!project || !filesPanel || !editorWrap || project.dataset.resizeReady === '1') return;

    project.dataset.resizeReady = '1';
    addStyles();

    const currentW = filesPanel.getBoundingClientRect().width || 195;
    filesPanel.style.width = currentW + 'px';
    project.classList.add('resizable');

    // ── Horizontal splitter (file tree ↔ editor) ──────────
    const hSplit = document.createElement('div');
    hSplit.className = 'runner-hsplitter';
    hSplit.title = 'Drag to resize file tree';
    project.insertBefore(hSplit, editorWrap);

    let hDragging = false;
    let hStartX = 0;
    let hStartW = 0;

    hSplit.addEventListener('mousedown', (e) => {
      e.preventDefault();
      hDragging = true;
      hStartX = e.clientX;
      hStartW = filesPanel.getBoundingClientRect().width;
      hSplit.classList.add('dragging');
      document.body.classList.add('gl-resizing-h');
    });

    document.addEventListener('mousemove', (e) => {
      if (!hDragging) return;
      const nextW = clamp(hStartW + (e.clientX - hStartX), MIN_FILES_W, MAX_FILES_W);
      filesPanel.style.width = nextW + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!hDragging) return;
      hDragging = false;
      hSplit.classList.remove('dragging');
      document.body.classList.remove('gl-resizing-h');
    });

    // ── Vertical splitter (editor height) ─────────────────
    const editor = editorWrap.querySelector('.runner-editor');
    if (!editor) return;

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
      const nextH = Math.max(MIN_EDITOR_H, vStartH + (e.clientY - vStartY));
      editor.style.height = nextH + 'px';
      editor.style.minHeight = nextH + 'px';
      editor.style.flex = 'none';
      syncOverlay(editor);
    });

    document.addEventListener('mouseup', () => {
      if (!vDragging) return;
      vDragging = false;
      vSplit.classList.remove('dragging');
      document.body.classList.remove('gl-resizing-v');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
