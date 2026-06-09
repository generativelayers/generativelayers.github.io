/**
 * code-runner-resize.js  v7
 *
 * Horizontal splitter: resize file tree width (column-gap in the grid).
 * Vertical splitter: resize editor height (both columns grow together).
 *
 * IMPORTANT: Works WITH the existing CSS grid layout, not against it.
 * The grid already has align-items:stretch so both columns match height.
 */
(() => {
  'use strict';

  const MIN_FILES_W = 140;
  const MAX_FILES_W = 500;
  const MIN_EDITOR_H = 200;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function addStyles() {
    if (document.getElementById('gl-resize-style')) return;
    const s = document.createElement('style');
    s.id = 'gl-resize-style';
    s.textContent = `
      /* Keep the original grid but make columns resizable */
      .runner-project.resizable {
        grid-template-columns: var(--files-w, 195px) 6px minmax(0, 1fr) !important;
        column-gap: 0 !important;
      }

      /* Editor fills its grid cell vertically */
      .runner-project.resizable .runner-editor-wrap {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      /* hl-editor-wrap sits between runner-editor-wrap and runner-editor */
      .runner-project.resizable .hl-editor-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .runner-project.resizable .runner-editor {
        flex: 1;
        min-height: 0 !important;
        resize: both !important;
      }

      .runner-hsplitter {
        cursor: col-resize;
        background: transparent;
        position: relative;
        z-index: 12;
        border-radius: 4px;
        transition: background 0.15s;
        align-self: stretch;
      }
      .runner-hsplitter:hover, .runner-hsplitter.dragging {
        background: rgba(52,211,153,0.4);
      }
      .runner-hsplitter::after {
        content:''; position:absolute; top:50%; left:50%;
        transform:translate(-50%,-50%); width:2px; height:30px;
        border-radius:2px; background:rgba(52,211,153,0.35);
        transition: background 0.15s;
      }
      .runner-hsplitter:hover::after, .runner-hsplitter.dragging::after {
        background:#34d399; height:50px;
      }

      body.gl-resizing-h { user-select:none!important; cursor:col-resize!important; }
    `;
    document.head.appendChild(s);
  }

  function syncOverlay(editor) {
    const ov = editor.parentElement && editor.parentElement.querySelector('.hl-overlay');
    if (!ov) return;
    const r = editor.getBoundingClientRect();
    ov.style.width = r.width + 'px';
    ov.style.height = r.height + 'px';
  }

  function init() {
    const project = document.querySelector('.runner-project');
    const filesPanel = project && project.querySelector('.runner-files');
    const editorWrap = project && project.querySelector('.runner-editor-wrap');
    if (!project || !filesPanel || !editorWrap || project.dataset.resizeReady === '1') return;

    project.dataset.resizeReady = '1';
    addStyles();

    // Set initial width via CSS custom property
    const currentW = filesPanel.getBoundingClientRect().width || 195;
    project.style.setProperty('--files-w', currentW + 'px');

    // Insert splitter element into the grid (between files and editor)
    const hSplit = document.createElement('div');
    hSplit.className = 'runner-hsplitter';
    hSplit.title = 'Drag to resize file tree';
    project.insertBefore(hSplit, editorWrap);

    project.classList.add('resizable');

    // ── Horizontal splitter (file tree width) ─────────────
    let hDragging = false, hStartX = 0, hStartW = 0;

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
      const w = clamp(hStartW + (e.clientX - hStartX), MIN_FILES_W, MAX_FILES_W);
      project.style.setProperty('--files-w', w + 'px');
    });
    document.addEventListener('mouseup', () => {
      if (!hDragging) return;
      hDragging = false;
      hSplit.classList.remove('dragging');
      document.body.classList.remove('gl-resizing-h');
    });

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
