/**
 * blur-deps.js
 * When pom.xml is the active file in the code runner, blurs the entire
 * editor area and shows a "redacted during review" overlay.
 * The textarea value is NOT modified — code runs exactly as before.
 */
(() => {
  let overlay = null;

  function update() {
    const pathEl = document.getElementById('currentFile');
    const editor = document.getElementById('fileEditor');
    if (!pathEl || !editor) return;

    const isPom = pathEl.textContent.trim().endsWith('pom.xml');

    if (isPom) {
      editor.style.filter = 'blur(4px)';
      editor.style.pointerEvents = 'none';
      editor.style.userSelect = 'none';

      if (!overlay) {
        overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:5;pointer-events:none;';
        overlay.innerHTML = '<div style="background:rgba(11,18,32,0.85);border:1px solid #1f2937;border-radius:10px;padding:16px 24px;text-align:center;pointer-events:none;"><i class="fa-solid fa-lock" style="font-size:18px;color:#6ee7b7;margin-bottom:6px;display:block;"></i><div style="color:#d1fae5;font-size:13px;font-weight:700;">Build file redacted during review</div><div style="color:#6b7280;font-size:11px;margin-top:4px;">Dependency coordinates hidden — code execution is unaffected</div></div>';
        const wrap = editor.closest('.runner-editor-wrap');
        if (wrap) {
          wrap.style.position = 'relative';
          wrap.appendChild(overlay);
        }
      }
      overlay.style.display = 'flex';
    } else {
      editor.style.filter = '';
      editor.style.pointerEvents = '';
      editor.style.userSelect = '';
      if (overlay) overlay.style.display = 'none';
    }
  }

  // Watch for file switches
  const obs = new MutationObserver(update);
  document.addEventListener('DOMContentLoaded', () => {
    const pathEl = document.getElementById('currentFile');
    if (pathEl) obs.observe(pathEl, { childList: true, characterData: true, subtree: true });
    // Also poll as fallback
    setInterval(update, 500);
    update();
  });
})();
