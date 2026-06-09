/**
 * code-runner-gui.js  v2
 *
 * Detects GUI module usage in ASTRA code and shows a
 * "Show GUI" button that opens a noVNC viewer in a modal.
 *
 * The modal dynamically resizes to match the actual ASTRA GUI
 * window dimensions (no black space, no cropping).
 *
 * The noVNC connection proxies through code.generativelayers.com/novnc/
 */
(() => {
  'use strict';

  const NOVNC_URL = 'https://code.generativelayers.com/novnc/vnc_lite.html?autoconnect=true&resize=scale&reconnect=true&reconnect_delay=2000&path=websockify';

  /* ── GUI detection ──────────────────────────────────────── */
  const GUI_PATTERNS = [
    /\bastra\.gui\b/i,
    /\bmodule\s+.*GUI\b/,
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
  let modalEl = null;
  let iframeEl = null;
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

      .gui-modal-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .gui-modal-backdrop[hidden] { display: none !important; }

      .gui-modal {
        background: #1e1e2e;
        border: 1px solid #444;
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        transition: width 0.3s ease, height 0.3s ease;
        /* Default size before we know the GUI dimensions */
        width: 90vw;
        max-width: 700px;
        height: 70vh;
        max-height: 820px;
        min-width: 220px;
        min-height: 150px;
      }
      .gui-modal.gui-modal--sized {
        max-width: none;
        max-height: none;
      }
      .gui-modal.gui-modal--dragged {
        position: absolute;
        transition: none;
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

      body.gui-dragging, body.gui-dragging * { user-select: none !important; }
      body.gui-dragging iframe { pointer-events: none !important; }

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

    // Modal
    modalEl = document.createElement('div');
    modalEl.className = 'gui-modal-backdrop';
    modalEl.hidden = true;
    const HANDLES = ['n','s','e','w','ne','nw','se','sw'];
    const handleHtml = HANDLES.map(d => `<div class="gui-resize-handle gui-resize-handle--${d}" data-dir="${d}"></div>`).join('');

    modalEl.innerHTML = `
      <div class="gui-modal" id="guiModal">
        ${handleHtml}
        <div class="gui-modal-header" id="guiModalHeader">
          <span><i class="fa-solid fa-display" style="margin-right:8px"></i>ASTRA GUI Viewer</span>
          <button class="gui-modal-close" id="guiModalClose">&times;</button>
        </div>
        <iframe id="guiFrame" src="about:blank"></iframe>
        <div class="gui-loading-overlay" id="guiLoadingOverlay">
          <div class="gui-loading-spinner"></div>
          <span>Please wait…</span>
        </div>
        <div class="gui-status" id="guiStatus">Waiting for ASTRA to start GUI…</div>
      </div>
    `;
    document.body.appendChild(modalEl);

    // Close handlers
    document.getElementById('guiModalClose').addEventListener('click', closeModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });
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

    const modal = document.getElementById('guiModal');
    if (!modal) return;

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

    modal.classList.add('gui-modal--sized');
    modal.style.width = modalW + 'px';
    modal.style.height = modalH + 'px';

    const status = document.getElementById('guiStatus');
    if (status) status.textContent = 'Connected';

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
    modalEl.hidden = false;
    iframeEl.src = NOVNC_URL;
    document.getElementById('guiStatus').textContent = 'Connecting to ASTRA GUI…';
    const overlay = document.getElementById('guiLoadingOverlay');
    if (overlay) overlay.hidden = false;
    // If we already have dimensions, apply them
    if (guiWidth && guiHeight) {
      resizeModal(guiWidth, guiHeight);
    }
  }

  function closeModal() {
    isOpen = false;
    modalEl.hidden = true;
    iframeEl.src = 'about:blank';
    // Reset position so it re-centers on next open
    const modal = document.getElementById('guiModal');
    if (modal) {
      modal.classList.remove('gui-modal--dragged');
      modal.style.left = '';
      modal.style.top = '';
    }
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
    const modal = document.getElementById('guiModal');
    if (modal) {
      modal.classList.remove('gui-modal--sized');
      modal.style.width = '';
      modal.style.height = '';
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
    const modal = document.getElementById('guiModal');
    if (!header || !modal) return;

    let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.gui-modal-close')) return;
      e.preventDefault();
      dragging = true;
      document.body.classList.add('gui-dragging');

      // Switch from flex-centered to absolute positioning on first drag
      if (!modal.classList.contains('gui-modal--dragged')) {
        const rect = modal.getBoundingClientRect();
        modal.classList.add('gui-modal--dragged');
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';
      }

      startX = e.clientX;
      startY = e.clientY;
      origLeft = parseInt(modal.style.left, 10) || 0;
      origTop = parseInt(modal.style.top, 10) || 0;
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      modal.style.left = (origLeft + e.clientX - startX) + 'px';
      modal.style.top = (origTop + e.clientY - startY) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('gui-dragging');
    });
  }

  /* ── Resize handles ────────────────────────────────────── */
  function setupResizeHandles() {
    const modal = document.getElementById('guiModal');
    if (!modal) return;
    const handles = modal.querySelectorAll('.gui-resize-handle');

    handles.forEach(handle => {
      const dir = handle.dataset.dir;
      let active = false, startX, startY, origRect;

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        active = true;
        document.body.classList.add('gui-dragging');

        // Ensure absolute positioning
        if (!modal.classList.contains('gui-modal--dragged')) {
          const rect = modal.getBoundingClientRect();
          modal.classList.add('gui-modal--dragged');
          modal.style.left = rect.left + 'px';
          modal.style.top = rect.top + 'px';
        }
        // Remove size transition while resizing
        modal.style.transition = 'none';

        startX = e.clientX;
        startY = e.clientY;
        origRect = {
          left: parseInt(modal.style.left, 10),
          top: parseInt(modal.style.top, 10),
          width: modal.offsetWidth,
          height: modal.offsetHeight
        };
      });

      document.addEventListener('mousemove', (e) => {
        if (!active) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let { left, top, width, height } = origRect;

        if (dir.includes('e')) width = Math.max(220, width + dx);
        if (dir.includes('w')) { width = Math.max(220, width - dx); left = origRect.left + origRect.width - width; }
        if (dir.includes('s')) height = Math.max(150, height + dy);
        if (dir.includes('n')) { height = Math.max(150, height - dy); top = origRect.top + origRect.height - height; }

        modal.style.left = left + 'px';
        modal.style.top = top + 'px';
        modal.style.width = width + 'px';
        modal.style.height = height + 'px';
        modal.classList.add('gui-modal--sized');
      });

      document.addEventListener('mouseup', () => {
        if (!active) return;
        active = false;
        document.body.classList.remove('gui-dragging');
        modal.style.transition = '';
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
