/**
 * code-runner-resize.js  v8
 *
 * Three custom resizers:
 *   1. Horizontal splitter: resize file-tree column width.
 *   2. Vertical splitter: resize editor height (below gl-diag-panel).
 *   3. Output resizer: bottom-right corner handle on .runner-output.
 */
(() => {
  'use strict';

  const MIN_FILES_W = 140;
  const MAX_FILES_W = 500;
  const MIN_EDITOR_H = 120;
  const MAX_EDITOR_H = 1200;
  const MIN_OUTPUT_W = 200;
  const MIN_OUTPUT_H = 100;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function addStyles() {
    if (document.getElementById('gl-resize-style')) return;
    const s = document.createElement('style');
    s.id = 'gl-resize-style';
    s.textContent = `
      /* ── Grid tweaks ─────────────────────────── */
      .runner-project.resizable {
        grid-template-columns: var(--files-w, 195px) 6px minmax(0, 1fr) !important;
        column-gap: 0 !important;
      }
      .runner-project.resizable .runner-editor-wrap {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .runner-project.resizable .hl-editor-wrap {
        flex: none;
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: var(--editor-h, 460px);
        overflow: hidden;
      }
      .runner-project.resizable .runner-editor {
        flex: 1;
        min-height: 0 !important;
        resize: none !important;
      }
      /* Ensure overlay doesn't block anything */
      .runner-project.resizable .hl-overlay {
        pointer-events: none;
      }

      /* ── Horizontal splitter (file tree ↔ editor) ── */
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
        transition: background 0.15s, height 0.15s;
      }
      .runner-hsplitter:hover::after, .runner-hsplitter.dragging::after {
        background:#34d399; height:50px;
      }

      /* ── Vertical splitter (editor height) ── */
      .runner-vsplitter {
        height: 8px;
        cursor: row-resize;
        background: transparent;
        position: relative;
        z-index: 12;
        border-radius: 4px;
        transition: background 0.15s;
        flex-shrink: 0;
      }
      .runner-vsplitter:hover, .runner-vsplitter.dragging {
        background: rgba(52,211,153,0.4);
      }
      .runner-vsplitter::after {
        content:''; position:absolute; left:50%; top:50%;
        transform:translate(-50%,-50%); height:2px; width:40px;
        border-radius:2px; background:rgba(52,211,153,0.35);
        transition: background 0.15s, width 0.15s;
      }
      .runner-vsplitter:hover::after, .runner-vsplitter.dragging::after {
        background:#34d399; width:70px;
      }

      /* ── Output corner resizer ── */
      .runner-output-resizer {
        position: absolute;
        right: 0; bottom: 0;
        width: 18px; height: 18px;
        cursor: nwse-resize;
        z-index: 14;
        background: transparent;
        transition: background 0.15s;
      }
      .runner-output-resizer:hover, .runner-output-resizer.dragging {
        background: rgba(52,211,153,0.25);
        border-radius: 4px 0 12px 0;
      }
      .runner-output-resizer::after {
        content: '';
        position: absolute;
        right: 4px; bottom: 4px;
        width: 8px; height: 8px;
        border-right: 2px solid rgba(52,211,153,0.5);
        border-bottom: 2px solid rgba(52,211,153,0.5);
        transition: border-color 0.15s;
      }
      .runner-output-resizer:hover::after, .runner-output-resizer.dragging::after {
        border-color: #34d399;
      }
      .runner-output-wrap {
        position: relative;
      }
      .runner-output-wrap .runner-output {
        resize: none !important;
      }

      /* ── Drag states ── */
      body.gl-resizing { user-select:none!important; }
      body.gl-resizing-h { cursor:col-resize!important; }
      body.gl-resizing-v { cursor:row-resize!important; }
      body.gl-resizing-nwse { cursor:nwse-resize!important; }
    `;
    document.head.appendChild(s);
  }

  function init() {
    const project = document.querySelector('.runner-project');
    const filesPanel = project && project.querySelector('.runner-files');
    const editorWrap = project && project.querySelector('.runner-editor-wrap');
    if (!project || !filesPanel || !editorWrap || project.dataset.resizeReady === '1') return;

    project.dataset.resizeReady = '1';
    addStyles();

    // ── Set initial widths ──
    const currentW = filesPanel.getBoundingClientRect().width || 195;
    project.style.setProperty('--files-w', currentW + 'px');

    // ── Insert horizontal splitter (file tree ↔ editor) ──
    const hSplit = document.createElement('div');
    hSplit.className = 'runner-hsplitter';
    hSplit.title = 'Drag to resize file tree';
    project.insertBefore(hSplit, editorWrap);
    project.classList.add('resizable');

    // ── Horizontal splitter drag ──
    let hDragging = false, hStartX = 0, hStartW = 0;
    hSplit.addEventListener('mousedown', (e) => {
      e.preventDefault();
      hDragging = true;
      hStartX = e.clientX;
      hStartW = filesPanel.getBoundingClientRect().width;
      hSplit.classList.add('dragging');
      document.body.classList.add('gl-resizing', 'gl-resizing-h');
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
      document.body.classList.remove('gl-resizing', 'gl-resizing-h');
    });

    // ── Insert vertical splitter (below diag panel / below editor) ──
    setupVerticalSplitter(editorWrap);

    // ── Output resizer ──
    setupOutputResizer();
  }

  function setupVerticalSplitter(editorWrap) {
    // Wait for hl-editor-wrap to exist (highlight.js creates it)
    const trySetup = () => {
      const hlWrap = editorWrap.querySelector('.hl-editor-wrap');
      if (!hlWrap) {
        setTimeout(trySetup, 200);
        return;
      }

      // Set initial editor height from current size
      const initialH = hlWrap.getBoundingClientRect().height || 460;
      hlWrap.closest('.runner-project').style.setProperty('--editor-h', initialH + 'px');

      // Find insert point: after gl-diag-panel if it exists, otherwise after hl-editor-wrap
      const insertAfter = () => {
        const diagPanel = editorWrap.querySelector('.gl-diag-panel');
        return diagPanel || hlWrap;
      };

      // Create splitter
      const vSplit = document.createElement('div');
      vSplit.className = 'runner-vsplitter';
      vSplit.title = 'Drag to resize editor height';

      // Insert after the target element
      const target = insertAfter();
      target.parentNode.insertBefore(vSplit, target.nextSibling);

      // Drag logic
      let vDragging = false, vStartY = 0, vStartH = 0;
      vSplit.addEventListener('mousedown', (e) => {
        e.preventDefault();
        vDragging = true;
        vStartY = e.clientY;
        vStartH = hlWrap.getBoundingClientRect().height;
        vSplit.classList.add('dragging');
        document.body.classList.add('gl-resizing', 'gl-resizing-v');
      });
      document.addEventListener('mousemove', (e) => {
        if (!vDragging) return;
        const h = clamp(vStartH + (e.clientY - vStartY), MIN_EDITOR_H, MAX_EDITOR_H);
        hlWrap.closest('.runner-project').style.setProperty('--editor-h', h + 'px');
      });
      document.addEventListener('mouseup', () => {
        if (!vDragging) return;
        vDragging = false;
        vSplit.classList.remove('dragging');
        document.body.classList.remove('gl-resizing', 'gl-resizing-v');
      });

      // Watch for gl-diag-panel appearing later and reposition splitter
      const observer = new MutationObserver(() => {
        const newTarget = insertAfter();
        if (vSplit.previousElementSibling !== newTarget) {
          newTarget.parentNode.insertBefore(vSplit, newTarget.nextSibling);
        }
      });
      observer.observe(editorWrap, { childList: true, subtree: true });
    };

    trySetup();
  }

  function setupOutputResizer() {
    const trySetup = () => {
      const output = document.querySelector('.runner-output');
      if (!output) {
        setTimeout(trySetup, 300);
        return;
      }

      // Wrap output in a relative container if not already done
      if (!output.parentElement.classList.contains('runner-output-wrap')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'runner-output-wrap';
        output.parentNode.insertBefore(wrapper, output);
        wrapper.appendChild(output);
      }

      const wrapper = output.parentElement;

      // Create corner resizer handle
      const handle = document.createElement('div');
      handle.className = 'runner-output-resizer';
      handle.title = 'Drag to resize output';
      wrapper.appendChild(handle);

      let oDragging = false, oStartX = 0, oStartY = 0, oStartW = 0, oStartH = 0;
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        oDragging = true;
        oStartX = e.clientX;
        oStartY = e.clientY;
        const rect = output.getBoundingClientRect();
        oStartW = rect.width;
        oStartH = rect.height;
        handle.classList.add('dragging');
        document.body.classList.add('gl-resizing', 'gl-resizing-nwse');
      });
      document.addEventListener('mousemove', (e) => {
        if (!oDragging) return;
        const w = Math.max(MIN_OUTPUT_W, oStartW + (e.clientX - oStartX));
        const h = Math.max(MIN_OUTPUT_H, oStartH + (e.clientY - oStartY));
        output.style.width = w + 'px';
        output.style.height = h + 'px';
      });
      document.addEventListener('mouseup', () => {
        if (!oDragging) return;
        oDragging = false;
        handle.classList.remove('dragging');
        document.body.classList.remove('gl-resizing', 'gl-resizing-nwse');
      });
    };

    trySetup();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
