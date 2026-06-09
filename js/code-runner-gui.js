/**
 * code-runner-gui.js  v1
 *
 * Detects GUI module usage in ASTRA code and shows a
 * "Show GUI" button that opens a noVNC viewer in a modal.
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
    // Check all project files
    let combined = '';
    if (typeof window.__glGetAllCode === 'function') {
      combined = window.__glGetAllCode();
    } else {
      // Fallback: read textarea
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
        background: rgba(0,0,0,0.35);
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
        width: 90vw;
        max-width: 1080px;
        height: 75vh;
        max-height: 820px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .gui-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #111827;
        border-bottom: 1px solid #333;
        color: #e5e7eb;
        font-weight: 800;
        font-size: 14px;
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
        background: #000;
      }

      .gui-status {
        padding: 8px 16px;
        background: #0f172a;
        border-top: 1px solid #333;
        color: #94a3b8;
        font-size: 12px;
        text-align: center;
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
      <div class="gui-modal">
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

  function toggleModal() {
    if (isOpen) closeModal();
    else openModal();
  }

  function openModal() {
    isOpen = true;
    modalEl.hidden = false;
    iframeEl.src = NOVNC_URL;
    document.getElementById('guiStatus').textContent = 'Connecting to ASTRA GUI…';
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

  /* ── Boot ────────────────────────────────────────────────── */
  function init() {
    createUI();
    // Button stays hidden until server confirms GUI via gui_port meta line
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // No auto-scan — button only shown when server sends gui_port
})();
