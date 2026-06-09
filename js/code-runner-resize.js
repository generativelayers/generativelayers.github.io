/**
 * code-runner-resize.js  v9
 *
 * Custom green drag-bar resizers:
 *   1. File-tree horizontal splitter (between file tree and editor)
 *   2. Editor vertical splitter (below gl-diag-panel, changes editor height)
 *   3. Editor right-side splitter (changes editor-wrap width)
 *   4. Output bottom splitter (changes output height)
 *   5. Output right-side splitter (changes output width)
 */
(() => {
  'use strict';

  const MIN_FILES_W = 140;
  const MAX_FILES_W = 500;
  const MIN_EDITOR_H = 120;
  const MAX_EDITOR_H = 1200;
  const MIN_EDITOR_W = 300;
  const MIN_OUTPUT_W = 200;
  const MIN_OUTPUT_H = 80;
  const MAX_OUTPUT_H = 1200;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ── Shared splitter bar CSS ──────────────────────────── */
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
      .runner-project.resizable .hl-overlay {
        pointer-events: none;
      }

      /* ── Vertical splitter bar (drag up/down → height) ── */
      .gl-vsplitter {
        height: 8px;
        cursor: row-resize;
        background: transparent;
        position: relative;
        z-index: 12;
        border-radius: 4px;
        transition: background 0.15s;
        flex-shrink: 0;
      }
      .gl-vsplitter:hover, .gl-vsplitter.dragging {
        background: rgba(52,211,153,0.4);
      }
      .gl-vsplitter::after {
        content:''; position:absolute; left:50%; top:50%;
        transform:translate(-50%,-50%); height:2px; width:40px;
        border-radius:2px; background:rgba(52,211,153,0.35);
        transition: background 0.15s, width 0.15s;
      }
      .gl-vsplitter:hover::after, .gl-vsplitter.dragging::after {
        background:#34d399; width:70px;
      }

      /* ── Horizontal splitter bar (drag left/right → width) ── */
      .gl-hsplitter {
        cursor: col-resize;
        background: transparent;
        position: relative;
        z-index: 12;
        border-radius: 4px;
        transition: background 0.15s;
        align-self: stretch;
      }
      .gl-hsplitter:hover, .gl-hsplitter.dragging {
        background: rgba(52,211,153,0.4);
      }
      .gl-hsplitter::after {
        content:''; position:absolute; top:50%; left:50%;
        transform:translate(-50%,-50%); width:2px; height:30px;
        border-radius:2px; background:rgba(52,211,153,0.35);
        transition: background 0.15s, height 0.15s;
      }
      .gl-hsplitter:hover::after, .gl-hsplitter.dragging::after {
        background:#34d399; height:50px;
      }

      /* ── File-tree specific (sits in the grid) ── */
      .runner-hsplitter { width: 6px; }

      /* ── Right-side splitter (inline-flex alongside target) ── */
      .gl-right-splitter { width: 8px; flex-shrink: 0; }

      /* ── Wrappers for right-side splitter layout ── */
      .gl-hresizable-row {
        display: flex !important;
        flex-direction: row;
        align-items: stretch;
      }
      .gl-hresizable-row > :first-child {
        flex: 1;
        min-width: 0;
      }

      /* ── Output wrapping ── */
      .gl-output-vrow {
        display: flex;
        flex-direction: column;
        width: 100%;
        min-height: 230px;
      }
      .gl-output-hrow {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        width: 100%;
      }
      .gl-output-hrow .runner-output {
        flex: 1;
        min-width: 0;
        min-height: 230px;
        resize: none !important;
      }

      /* ── Drag states ── */
      body.gl-resizing { user-select:none!important; }
      body.gl-resizing-h { cursor:col-resize!important; }
      body.gl-resizing-v { cursor:row-resize!important; }
    `;
    document.head.appendChild(s);
  }

  /* ── Drag helper ─────────────────────────────────────── */
  function makeDrag(el, axis, onMove, onEnd) {
    let dragging = false, startPos = 0, startVal = 0;
    const isH = axis === 'h';
    const cursorClass = isH ? 'gl-resizing-h' : 'gl-resizing-v';

    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      startPos = isH ? e.clientX : e.clientY;
      startVal = onMove(null); // null = return current value
      el.classList.add('dragging');
      document.body.classList.add('gl-resizing', cursorClass);
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = (isH ? e.clientX : e.clientY) - startPos;
      onMove(startVal + delta);
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      document.body.classList.remove('gl-resizing', cursorClass);
      if (onEnd) onEnd();
    });
  }

  /* ── Create a splitter element ──────────────────────── */
  function makeSplitter(axis, title, extraClass) {
    const el = document.createElement('div');
    el.className = (axis === 'h' ? 'gl-hsplitter' : 'gl-vsplitter') + (extraClass ? ' ' + extraClass : '');
    el.title = title;
    return el;
  }

  /* ══════════════════════════════════════════════════════ */
  function init() {
    const project = document.querySelector('.runner-project');
    const filesPanel = project && project.querySelector('.runner-files');
    const editorWrap = project && project.querySelector('.runner-editor-wrap');
    if (!project || !filesPanel || !editorWrap || project.dataset.resizeReady === '1') return;

    project.dataset.resizeReady = '1';
    addStyles();

    // ── 1. File-tree horizontal splitter ──────────────
    const currentW = filesPanel.getBoundingClientRect().width || 195;
    project.style.setProperty('--files-w', currentW + 'px');

    const filesSplitter = makeSplitter('h', 'Drag to resize file tree', 'runner-hsplitter');
    project.insertBefore(filesSplitter, editorWrap);
    project.classList.add('resizable');

    makeDrag(filesSplitter, 'h', (v) => {
      if (v === null) return filesPanel.getBoundingClientRect().width;
      project.style.setProperty('--files-w', clamp(v, MIN_FILES_W, MAX_FILES_W) + 'px');
    });

    // ── 2. Editor vertical splitter + 3. Editor right splitter ──
    setupEditorResizers(editorWrap, project);

    // ── 4+5. Output bottom + right splitters ──
    setupOutputResizers();
  }

  /* ── Editor resizers ─────────────────────────────────── */
  function setupEditorResizers(editorWrap, project) {
    const trySetup = () => {
      const hlWrap = editorWrap.querySelector('.hl-editor-wrap');
      if (!hlWrap) { setTimeout(trySetup, 200); return; }

      // Set initial height
      const initialH = hlWrap.getBoundingClientRect().height || 460;
      project.style.setProperty('--editor-h', initialH + 'px');

      // ── Vertical splitter (height) ──
      const vSplit = makeSplitter('v', 'Drag to resize editor height');
      const insertAfter = () => editorWrap.querySelector('.gl-diag-panel') || hlWrap;
      const target = insertAfter();
      target.parentNode.insertBefore(vSplit, target.nextSibling);

      makeDrag(vSplit, 'v', (v) => {
        if (v === null) return hlWrap.getBoundingClientRect().height;
        project.style.setProperty('--editor-h', clamp(v, MIN_EDITOR_H, MAX_EDITOR_H) + 'px');
      });

      // Watch for gl-diag-panel appearing and reposition
      new MutationObserver(() => {
        const newTarget = insertAfter();
        if (vSplit.previousElementSibling !== newTarget) {
          newTarget.parentNode.insertBefore(vSplit, newTarget.nextSibling);
        }
      }).observe(editorWrap, { childList: true, subtree: true });

      // ── Right-side splitter (width) ──
      // Wrap the editor-wrap's grid cell content in a flex row
      // We wrap the ENTIRE runner-editor-wrap content with a horizontal row + splitter
      const rSplit = makeSplitter('h', 'Drag to resize editor width', 'gl-right-splitter');
      editorWrap.appendChild(rSplit);

      // Make editor-wrap a flex row with its content + right splitter? No—
      // Better: we wrap the grid cell. The editor-wrap is the 3rd grid child.
      // We insert a wrapper div in the grid that contains editor-wrap + right splitter.
      // But that changes the grid. Instead, let's just use an absolutely-positioned
      // right-edge splitter or make the editor-wrap overflow:visible.

      // Simpler: place the right splitter as the last child of runner-editor-wrap,
      // positioned absolutely on the right edge.
      rSplit.style.cssText = 'position:absolute;right:-4px;top:0;bottom:0;width:8px;';
      editorWrap.style.position = 'relative';

      makeDrag(rSplit, 'h', (v) => {
        if (v === null) return editorWrap.getBoundingClientRect().width;
        editorWrap.style.maxWidth = Math.max(MIN_EDITOR_W, v) + 'px';
      });
    };
    trySetup();
  }

  /* ── Output resizers ─────────────────────────────────── */
  function setupOutputResizers() {
    const trySetup = () => {
      const output = document.querySelector('.runner-output');
      if (!output) { setTimeout(trySetup, 300); return; }

      const card = output.closest('.runner-card');
      if (!card || card.dataset.resizeReady === '1') return;
      card.dataset.resizeReady = '1';

      // ── Bottom splitter (height) ──
      const bSplit = makeSplitter('v', 'Drag to resize output height');
      // Insert after the output element
      output.parentNode.insertBefore(bSplit, output.nextSibling);

      makeDrag(bSplit, 'v', (v) => {
        if (v === null) return output.getBoundingClientRect().height;
        output.style.height = Math.max(MIN_OUTPUT_H, v) + 'px';
        output.style.minHeight = Math.max(MIN_OUTPUT_H, v) + 'px';
      });

      // ── Right splitter (width) ──
      // Wrap output + bSplit in a container, then add right splitter
      const hRow = document.createElement('div');
      hRow.className = 'gl-output-hrow';
      // Wrap output in the hRow
      const vCol = document.createElement('div');
      vCol.className = 'gl-output-vrow';
      output.parentNode.insertBefore(hRow, output);
      hRow.appendChild(vCol);
      vCol.appendChild(output);
      vCol.appendChild(bSplit);

      const rSplit = makeSplitter('h', 'Drag to resize output width', 'gl-right-splitter');
      hRow.appendChild(rSplit);

      makeDrag(rSplit, 'h', (v) => {
        if (v === null) return output.getBoundingClientRect().width;
        output.style.width = Math.max(MIN_OUTPUT_W, v) + 'px';
      });
    };
    trySetup();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
