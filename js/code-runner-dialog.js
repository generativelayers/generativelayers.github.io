/**
 * code-runner-dialog.js
 *
 * Custom modal dialogs to replace window.prompt / window.confirm / window.alert
 * which are silently blocked by browsers inside nested iframes.
 */
(() => {
  'use strict';

  const STYLE_ID = 'gl-dialog-style';

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .gl-dialog-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.55);
        z-index: 11000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        animation: gl-dialog-bg 0.15s ease-out;
      }
      @keyframes gl-dialog-bg {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .gl-dialog-box {
        background: #1e1e2e;
        border: 1px solid #444;
        border-radius: 14px;
        padding: 22px 24px;
        width: 92%;
        max-width: 420px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        color: #e5e7eb;
        display: flex;
        flex-direction: column;
        gap: 16px;
        animation: gl-dialog-pop 0.2s ease-out;
      }
      @keyframes gl-dialog-pop {
        from { transform: scale(0.92); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .gl-dialog-message {
        font-size: 14px;
        line-height: 1.5;
        word-break: break-word;
        color: #e5e7eb;
      }
      .gl-dialog-input {
        background: #111827;
        border: 1px solid #0d9462;
        border-radius: 8px;
        padding: 10px 12px;
        color: #e5e7eb;
        font-size: 14px;
        width: 100%;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .gl-dialog-input:focus {
        border-color: #34d399;
        box-shadow: 0 0 0 3px rgba(13, 148, 98, 0.22);
      }
      .gl-dialog-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .gl-dialog-btn {
        border: 0;
        border-radius: 8px;
        padding: 9px 20px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
      }
      .gl-dialog-btn:active { transform: scale(0.96); }
      .gl-dialog-btn-cancel {
        background: rgba(255, 255, 255, 0.06);
        color: #94a3b8;
        border: 1px solid #333;
      }
      .gl-dialog-btn-cancel:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #e5e7eb;
      }
      .gl-dialog-btn-ok {
        background: #0d9462;
        color: #fff;
      }
      .gl-dialog-btn-ok:hover { background: #0a7a50; }
      .gl-dialog-btn-danger {
        background: #dc2626;
        color: #fff;
      }
      .gl-dialog-btn-danger:hover { background: #b91c1c; }
    `;
    document.head.appendChild(style);
  }

  function build(type, message, defaultValue) {
    addStyle();
    const overlay = document.createElement('div');
    overlay.className = 'gl-dialog-overlay';

    const box = document.createElement('div');
    box.className = 'gl-dialog-box';

    const msg = document.createElement('div');
    msg.className = 'gl-dialog-message';
    msg.textContent = message;
    box.appendChild(msg);

    let input = null;
    if (type === 'prompt') {
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'gl-dialog-input';
      input.value = defaultValue || '';
      box.appendChild(input);
    }

    const btns = document.createElement('div');
    btns.className = 'gl-dialog-buttons';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'gl-dialog-btn gl-dialog-btn-cancel';
    cancel.textContent = 'Cancel';

    const ok = document.createElement('button');
    ok.type = 'button';
    const isDanger = type === 'confirm' && /delete|erase|remove/i.test(message);
    ok.className = `gl-dialog-btn ${isDanger ? 'gl-dialog-btn-danger' : 'gl-dialog-btn-ok'}`;
    ok.textContent = isDanger ? 'Delete' : 'OK';

    if (type !== 'alert') btns.appendChild(cancel);
    btns.appendChild(ok);
    box.appendChild(btns);
    overlay.appendChild(box);

    return { overlay, ok, cancel, input };
  }

  function show(overlay) {
    document.body.appendChild(overlay);
  }

  function hide(overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.12s';
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 120);
  }

  // ── Public API ──

  window.glAlert = function(message) {
    return new Promise(resolve => {
      const { overlay, ok } = build('alert', message);
      show(overlay);
      ok.focus();
      ok.addEventListener('click', () => { hide(overlay); resolve(); });
      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') { hide(overlay); resolve(); }
      });
    });
  };

  window.glConfirm = function(message) {
    return new Promise(resolve => {
      const { overlay, ok, cancel } = build('confirm', message);
      show(overlay);
      ok.focus();
      ok.addEventListener('click', () => { hide(overlay); resolve(true); });
      cancel.addEventListener('click', () => { hide(overlay); resolve(false); });
      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { hide(overlay); resolve(false); }
        if (e.key === 'Enter') { hide(overlay); resolve(true); }
      });
    });
  };

  window.glPrompt = function(message, defaultValue) {
    return new Promise(resolve => {
      const { overlay, ok, cancel, input } = build('prompt', message, defaultValue);
      show(overlay);
      input.focus();
      input.select();
      ok.addEventListener('click', () => { hide(overlay); resolve(input.value); });
      cancel.addEventListener('click', () => { hide(overlay); resolve(null); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); hide(overlay); resolve(input.value); }
        if (e.key === 'Escape') { e.preventDefault(); hide(overlay); resolve(null); }
      });
    });
  };
})();
