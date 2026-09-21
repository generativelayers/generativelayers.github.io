/**
 * blur-deps.js
 * When pom.xml is the active file in the code runner, blurs the entire
 * editor area (including syntax highlight overlay) and shows a
 * "redacted during review" overlay.
 * The textarea value is NOT modified — code runs exactly as before.
 */
(() => {
  // Only active during review mode
  if (!window.GL_UNDER_REVIEW) return;

  let blurOverlay = null;

  function update() {
    const pathEl = document.getElementById('currentFile');
    const editor = document.getElementById('fileEditor');
    if (!pathEl || !editor) return;

    const isPom = pathEl.textContent.trim().endsWith('pom.xml');

    // Find the hl-editor-wrap (syntax highlight container) or fall back to the editor itself
    const hlWrap = editor.closest('.hl-editor-wrap');
    const blurTarget = hlWrap || editor;

    if (isPom) {
      blurTarget.style.filter = 'blur(10px)';
      blurTarget.style.pointerEvents = 'none';
      blurTarget.style.userSelect = 'none';
      editor.readOnly = true;
      editor.blur();

      if (!editor.__blurCopyBlock) {
        editor.__blurCopyBlock = (e) => e.preventDefault();
        editor.addEventListener('copy', editor.__blurCopyBlock);
        editor.addEventListener('cut', editor.__blurCopyBlock);
      }

      if (!blurOverlay) {
        blurOverlay = document.createElement('div');
        blurOverlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:5;pointer-events:none;';
        blurOverlay.innerHTML = '<div style="background:rgba(11,18,32,0.85);border:1px solid #1f2937;border-radius:10px;padding:16px 24px;text-align:center;pointer-events:none;"><i class="fa-solid fa-lock" style="font-size:18px;color:#6ee7b7;margin-bottom:6px;display:block;"></i><div style="color:#d1fae5;font-size:13px;font-weight:700;">Build file redacted during review</div><div style="color:#6b7280;font-size:11px;margin-top:4px;">Dependency coordinates hidden — code execution is unaffected</div></div>';
        const wrap = editor.closest('.runner-editor-wrap');
        if (wrap) {
          wrap.style.position = 'relative';
          wrap.appendChild(blurOverlay);
        }
      }
      blurOverlay.style.display = 'flex';
    } else {
      blurTarget.style.filter = '';
      blurTarget.style.pointerEvents = '';
      blurTarget.style.userSelect = '';
      editor.readOnly = false;

      if (editor.__blurCopyBlock) {
        editor.removeEventListener('copy', editor.__blurCopyBlock);
        editor.removeEventListener('cut', editor.__blurCopyBlock);
        editor.__blurCopyBlock = null;
      }
      if (blurOverlay) blurOverlay.style.display = 'none';
    }
  }

  // Watch for file switches
  const obs = new MutationObserver(update);
  document.addEventListener('DOMContentLoaded', () => {
    const pathEl = document.getElementById('currentFile');
    if (pathEl) obs.observe(pathEl, { childList: true, characterData: true, subtree: true });
    setInterval(update, 500);
    update();
  });
})();
