/**
 * code-runner-gui.js  v5
 *
 * Detects GUI module usage in ASTRA / Jason / JaCaMo code and shows a
 * "Show GUI" button that opens a noVNC viewer in a draggable, resizable modal.
 *
 * The noVNC connection proxies through code.generativelayers.com/novnc/
 */
(() => {
  'use strict';

  const NOVNC_URL = 'https://code.generativelayers.com/novnc/vnc_lite.html?autoconnect=true&resize=scale&reconnect=true&reconnect_delay=3000&path=websockify';
  const PLATFORM = window.GL_PLATFORM || 'astra';
  const PLATFORM_LABEL = (window.GL_PLATFORM_CONFIG && window.GL_PLATFORM_CONFIG.label) || 'ASTRA';

  /* ── GUI detection ──────────────────────────────────────── */
  const GUI_PATTERNS = [
    // ASTRA patterns
    /\bastra\.gui\b/i,
    /\bmodule\s+.*GUI\b/,
    // Jason / JaCaMo patterns
    /\bgui\.create\b/,
    /\bgui\.yes_no\b/,
    /\bgui\.confirm\b/,
    /\bgui\.input\b/,
    /\bGridWorldView\b/,
    /\bGridWorldModel\b/,
    /\bMASConsoleGUI\b/,
    /\bExecutionControlGUI\b/,
    // Shared Java Swing patterns
    /\bJFrame\b/,
    /\bSwingUtilities\b/,
    /\bjavax\.swing\b/,
    /\bjava\.awt\b/,
  ];

  function detectGui() {
    let combined = '';
    if (typeof window.__glGetAllCode === 'function') {
      combined = window.__glGetAllCode();
    } else {
      const ta = document.getElementById('fileEditor');
      if (ta) combined = ta.value || '';
    }
    return GUI_PATTERNS.some(p => p.test(combined));
  }

  /* ── UI ─────────────────────────────────────────────────── */
  let btnEl = null;
  let modalEl = null;   // the .gui-modal div (NOT the backdrop)
  let backdropEl = null;
  let iframeEl = null;
  let dragOverlayEl = null;
  let isOpen = false;
  let guiWidth = 0;
  let guiHeight = 0;

  function addStyles() {
    const s = document.createElement('style');
    s.textContent = `
      .gui-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 2px solid #8b5cf6;
        border-radius: 10px;
        padding: 10px 16px;
        font-weight: 800;
        cursor: pointer;
        color: #8b5cf6;
        background: rgba(139,92,246,.08);
        font-size: 14px;
        transition: all 0.2s;
      }
      .gui-btn:hover {
        background: #8b5cf6;
        color: #fff;
      }
      .gui-btn[hidden] { display: none !important; }

      /* Backdrop: semi-transparent overlay */
      .gui-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.35);
        z-index: 9998;
      }
      .gui-backdrop[hidden] { display: none !important; }

      /* Modal: absolutely positioned, draggable */
      .gui-modal {
        position: fixed;
        z-index: 9999;
        background: #1e1e2e;
        border: 1px solid #444;
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        /* Default: centered */
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        /* Default size before we know the GUI dimensions */
        width: 90vw;
        max-width: 700px;
        height: 70vh;
        max-height: 820px;
        min-width: 260px;
        min-height: 180px;
      }
      .gui-modal[hidden] { display: none !important; }

      .gui-modal.gui-modal--sized {
        max-width: none;
        max-height: none;
      }
      .gui-modal.gui-modal--positioned {
        transform: none;
      }

      .gui-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        background: #111827;
        border-bottom: 1px solid #333;
        color: #e5e7eb;
        font-weight: 800;
        font-size: 14px;
        flex-shrink: 0;
        cursor: move;
        user-select: none;
      }
      .gui-modal-close {
        border: 0;
        background: transparent;
        color: #e5e7eb;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .gui-modal-close:hover { background: #333; }

      .gui-modal iframe {
        flex: 1;
        border: 0;
        width: 100%;
        background: #0b1220;
      }

      .gui-status {
        padding: 6px 16px;
        background: #0f172a;
        border-top: 1px solid #333;
        color: #94a3b8;
        font-size: 12px;
        text-align: center;
        flex-shrink: 0;
      }

      /* ── Resize handles ── */
      .gui-resize-handle {
        position: absolute;
        z-index: 10;
      }
      .gui-resize-handle--n  { top:-4px; left:8px; right:8px; height:8px; cursor:n-resize; }
      .gui-resize-handle--s  { bottom:-4px; left:8px; right:8px; height:8px; cursor:s-resize; }
      .gui-resize-handle--e  { right:-4px; top:8px; bottom:8px; width:8px; cursor:e-resize; }
      .gui-resize-handle--w  { left:-4px; top:8px; bottom:8px; width:8px; cursor:w-resize; }
      .gui-resize-handle--ne { top:-4px; right:-4px; width:14px; height:14px; cursor:ne-resize; }
      .gui-resize-handle--nw { top:-4px; left:-4px; width:14px; height:14px; cursor:nw-resize; }
      .gui-resize-handle--se { bottom:-4px; right:-4px; width:14px; height:14px; cursor:se-resize; }
      .gui-resize-handle--sw { bottom:-4px; left:-4px; width:14px; height:14px; cursor:sw-resize; }

      /* Transparent overlay shown ONLY during drag/resize to capture
         mouse events that go over the iframe */
      .gui-drag-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 10000;
        cursor: move;
      }
      .gui-drag-overlay[hidden] { display: none !important; }

      .gui-loading-overlay {
        position: absolute;
        inset: 42px 0 30px 0; /* between header and status bar */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #0b1220;
        z-index: 5;
        color: #94a3b8;
        font-size: 15px;
        gap: 12px;
        transition: opacity 0.3s;
      }
      .gui-loading-overlay[hidden] { display: none !important; }
      .gui-loading-spinner {
        width: 28px; height: 28px;
        border: 3px solid #334155;
        border-top-color: #8b5cf6;
        border-radius: 50%;
        animation: gui-spin 0.8s linear infinite;
      }
      @keyframes gui-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(s);
  }

  function createUI() {
    addStyles();

    // Button (inserted into toolbar)
    btnEl = document.createElement('button');
    btnEl.className = 'gui-btn';
    btnEl.type = 'button';
    btnEl.id = 'showGuiButton';
    btnEl.hidden = true;
    btnEl.innerHTML = '<i class="fa-solid fa-display"></i><span>Show GUI</span>';
    btnEl.addEventListener('click', toggleModal);

    const toolbar = document.querySelector('.runner-toolbar');
    if (toolbar) {
      toolbar.appendChild(btnEl);
    }

    // Backdrop (separate element — just a dark overlay, no children)
    backdropEl = document.createElement('div');
    backdropEl.className = 'gui-backdrop';
    backdropEl.hidden = true;
    backdropEl.addEventListener('click', closeModal);
    document.body.appendChild(backdropEl);

    // Drag overlay (shown only during drag to capture events over iframe)
    dragOverlayEl = document.createElement('div');
    dragOverlayEl.className = 'gui-drag-overlay';
    dragOverlayEl.hidden = true;
    document.body.appendChild(dragOverlayEl);

    // Modal (separate element — not inside backdrop)
    const HANDLES = ['n','s','e','w','ne','nw','se','sw'];
    const handleHtml = HANDLES.map(d => `<div class="gui-resize-handle gui-resize-handle--${d}" data-dir="${d}"></div>`).join('');

    modalEl = document.createElement('div');
    modalEl.className = 'gui-modal';
    modalEl.id = 'guiModal';
    modalEl.hidden = true;
    modalEl.innerHTML = `
      ${handleHtml}
      <div class="gui-modal-header" id="guiModalHeader">
        <span><i class="fa-solid fa-display" style="margin-right:8px"></i>${PLATFORM_LABEL} GUI Viewer</span>
        <button class="gui-modal-close" id="guiModalClose">&times;</button>
      </div>
      <iframe id="guiFrame" src="about:blank"></iframe>
      <div class="gui-loading-overlay" id="guiLoadingOverlay">
        <div class="gui-loading-spinner"></div>
        <span>Please wait…</span>
      </div>
      <div class="gui-status" id="guiStatus">Waiting for ${PLATFORM_LABEL} to start GUI…</div>
    `;
    document.body.appendChild(modalEl);

    // Close handlers
    document.getElementById('guiModalClose').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closeModal();
    });

    iframeEl = document.getElementById('guiFrame');

    // ── Drag to move ──
    setupDragToMove();

    // ── Resize handles ──
    setupResizeHandles();
  }

  /** Resize the modal to fit the GUI window dimensions. */
  function resizeModal(w, h) {
    if (!w || !h) return;
    guiWidth = w;
    guiHeight = h;

    if (!modalEl) return;

    const HEADER_HEIGHT = 42;   // header bar
    const STATUS_HEIGHT = 30;   // status bar
    const CHROME = HEADER_HEIGHT + STATUS_HEIGHT + 2; // borders

    // Compute max available space (with margin)
    const maxW = window.innerWidth * 0.92;
    const maxH = window.innerHeight * 0.90;

    // Scale the GUI to fit within the available viewport
    const contentMaxH = maxH - CHROME;
    const scale = Math.min(maxW / w, contentMaxH / h, 1.5); // cap upscale at 1.5x

    const modalW = Math.round(w * scale);
    const modalH = Math.round(h * scale) + CHROME;

    modalEl.classList.add('gui-modal--sized');
    modalEl.style.width = modalW + 'px';
    modalEl.style.height = modalH + 'px';

    const status = document.getElementById('guiStatus');
    if (status) status.textContent = 'Connected — drag header to move';

    // Hide loading overlay once we have real content
    const overlay = document.getElementById('guiLoadingOverlay');
    if (overlay) overlay.hidden = true;
  }

  function toggleModal() {
    if (isOpen) closeModal();
    else openModal();
  }

  function openModal() {
    isOpen = true;
    backdropEl.hidden = false;
    modalEl.hidden = false;
    iframeEl.src = NOVNC_URL;
    document.getElementById('guiStatus').textContent = 'Connecting to ' + PLATFORM_LABEL + ' GUI…';
    const overlay = document.getElementById('guiLoadingOverlay');
    if (overlay) overlay.hidden = false;
    // If we already have dimensions, apply them
    if (guiWidth && guiHeight) {
      resizeModal(guiWidth, guiHeight);
    }
  }

  function closeModal() {
    isOpen = false;
    backdropEl.hidden = true;
    modalEl.hidden = true;
    iframeEl.src = 'about:blank';
    // Reset position so it re-centers on next open
    modalEl.classList.remove('gui-modal--positioned');
    modalEl.style.left = '50%';
    modalEl.style.top = '50%';
    modalEl.style.transform = 'translate(-50%, -50%)';
  }

  /* ── Scan for GUI usage (internal only, does NOT show button) ── */
  function scan() {
    return detectGui();
  }

  // Expose for other scripts
  window.__glGuiScan = scan;
  window.__glGuiDetected = detectGui;

  // Called by code-runner.js when server sends gui_port in meta line
  window.__glGuiOpen = function() {
    if (btnEl) btnEl.hidden = false;
    openModal();
  };
  window.__glGuiClose = closeModal;

  // Allow server meta to show the button without opening modal
  window.__glGuiShowButton = function() {
    if (btnEl) btnEl.hidden = false;
  };

  // Called by code-runner.js when server sends gui_resize meta
  window.__glGuiResize = function(w, h) {
    resizeModal(w, h);
    // Auto-open if not already open
    if (!isOpen && btnEl) {
      btnEl.hidden = false;
      openModal();
    }
  };

  // Reset dimensions when a new run starts
  window.__glGuiReset = function() {
    guiWidth = 0;
    guiHeight = 0;
    if (modalEl) {
      modalEl.classList.remove('gui-modal--sized');
      modalEl.style.width = '';
      modalEl.style.height = '';
    }
  };

  // Handle viewport resize — re-fit modal if open
  window.addEventListener('resize', () => {
    if (isOpen && guiWidth && guiHeight) {
      resizeModal(guiWidth, guiHeight);
    }
  });

  /* ── Drag to move ───────────────────────────────────────── */
  function setupDragToMove() {
    const header = document.getElementById('guiModalHeader');
    if (!header || !modalEl) return;

    let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.gui-modal-close')) return;
      e.preventDefault();
      dragging = true;

      // Switch from centered transform to absolute positioning on first drag
      if (!modalEl.classList.contains('gui-modal--positioned')) {
        const rect = modalEl.getBoundingClientRect();
        modalEl.classList.add('gui-modal--positioned');
        modalEl.style.transform = 'none';
        modalEl.style.left = rect.left + 'px';
        modalEl.style.top = rect.top + 'px';
      }

      startX = e.clientX;
      startY = e.clientY;
      origLeft = parseInt(modalEl.style.left, 10) || 0;
      origTop = parseInt(modalEl.style.top, 10) || 0;

      // Show transparent overlay to capture mouse events over the iframe
      dragOverlayEl.hidden = false;
      dragOverlayEl.style.cursor = 'move';
    });

    // Listen on document (captures events even over the overlay)
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      modalEl.style.left = (origLeft + e.clientX - startX) + 'px';
      modalEl.style.top = (origTop + e.clientY - startY) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      dragOverlayEl.hidden = true;
    });

    // Also listen on parent window for cross-iframe drag support
    try {
      if (window.parent && window.parent !== window) {
        window.parent.addEventListener('mousemove', (e) => {
          if (!dragging) return;
          const iframe = window.frameElement;
          if (iframe) {
            const ir = iframe.getBoundingClientRect();
            const cx = e.clientX - ir.left;
            const cy = e.clientY - ir.top;
            modalEl.style.left = (origLeft + cx - startX) + 'px';
            modalEl.style.top = (origTop + cy - startY) + 'px';
          }
        });
        window.parent.addEventListener('mouseup', () => {
          if (!dragging) return;
          dragging = false;
          dragOverlayEl.hidden = true;
        });
      }
    } catch (e) { /* cross-origin — ignore */ }
  }

  /* ── Resize handles ────────────────────────────────────── */
  function setupResizeHandles() {
    if (!modalEl) return;
    const handles = modalEl.querySelectorAll('.gui-resize-handle');

    handles.forEach(handle => {
      const dir = handle.dataset.dir;
      let active = false, startX, startY, origRect;

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        active = true;

        // Ensure absolute positioning
        if (!modalEl.classList.contains('gui-modal--positioned')) {
          const rect = modalEl.getBoundingClientRect();
          modalEl.classList.add('gui-modal--positioned');
          modalEl.style.transform = 'none';
          modalEl.style.left = rect.left + 'px';
          modalEl.style.top = rect.top + 'px';
        }

        startX = e.clientX;
        startY = e.clientY;
        origRect = {
          left: parseInt(modalEl.style.left, 10),
          top: parseInt(modalEl.style.top, 10),
          width: modalEl.offsetWidth,
          height: modalEl.offsetHeight
        };

        // Show transparent overlay
        dragOverlayEl.hidden = false;
        dragOverlayEl.style.cursor = getComputedStyle(handle).cursor;
      });

      document.addEventListener('mousemove', (e) => {
        if (!active) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let { left, top, width, height } = origRect;

        if (dir.includes('e')) width = Math.max(260, width + dx);
        if (dir.includes('w')) { width = Math.max(260, width - dx); left = origRect.left + origRect.width - width; }
        if (dir.includes('s')) height = Math.max(180, height + dy);
        if (dir.includes('n')) { height = Math.max(180, height - dy); top = origRect.top + origRect.height - height; }

        modalEl.style.left = left + 'px';
        modalEl.style.top = top + 'px';
        modalEl.style.width = width + 'px';
        modalEl.style.height = height + 'px';
        modalEl.classList.add('gui-modal--sized');
      });

      document.addEventListener('mouseup', () => {
        if (!active) return;
        active = false;
        dragOverlayEl.hidden = true;
      });
    });
  }

  /* ── Boot ────────────────────────────────────────────────── */
  function init() {
    createUI();
    // Button stays hidden until server confirms GUI via gui_port meta line
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // No auto-scan — button only shown when server sends gui_port
})();
