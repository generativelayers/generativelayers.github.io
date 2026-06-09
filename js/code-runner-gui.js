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
        transition: width 0.3s ease, height 0.3s ease;
        /* Default size before we know the GUI dimensions */
        width: 90vw;
        max-width: 700px;
        height: 70vh;
        max-height: 820px;
      }
      .gui-modal.gui-modal--sized {
        /* When we have exact dimensions, remove defaults */
        max-width: none;
        max-height: none;
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
    modalEl.innerHTML = `
      <div class="gui-modal" id="guiModal">
        <div class="gui-modal-header">
          <span><i class="fa-solid fa-display" style="margin-right:8px"></i>ASTRA GUI Viewer</span>
          <button class="gui-modal-close" id="guiModalClose">&times;</button>
        </div>
        <iframe id="guiFrame" src="about:blank"></iframe>
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
    if (status) status.textContent = `Connected — ${w}×${h}`;
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
    // If we already have dimensions, apply them
    if (guiWidth && guiHeight) {
      resizeModal(guiWidth, guiHeight);
    }
  }

  function closeModal() {
    isOpen = false;
    modalEl.hidden = true;
    iframeEl.src = 'about:blank';
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

  /* ── Boot ────────────────────────────────────────────────── */
  function init() {
    createUI();
    // Button stays hidden until server confirms GUI via gui_port meta line
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // No auto-scan — button only shown when server sends gui_port
})();
