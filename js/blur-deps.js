/**
 * blur-deps.js
 * When pom.xml is the active file in the code runner, covers the entire
 * editor area with an opaque overlay. No text is visible or selectable.
 * The textarea value is NOT modified — code runs exactly as before.
 */
(() => {
  if (!window.GL_UNDER_REVIEW) return;

  // On load, if pom.xml is selected, switch to the first source file
  let switched = false;
  function switchAwayFromPom() {
    if (switched) return;
    const pathEl = document.getElementById('currentFile');
    if (!pathEl) return;
    if (pathEl.textContent.trim().endsWith('pom.xml')) {
      const firstSource = document.querySelector('.runner-file[data-path]:not([data-path="/pom.xml"])');
      if (firstSource) { firstSource.click(); switched = true; }
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(switchAwayFromPom, 300);
    setTimeout(switchAwayFromPom, 800);
  });

  let coverOverlay = null;

  function update() {
    const pathEl = document.getElementById('currentFile');
    const editor = document.getElementById('fileEditor');
    if (!pathEl || !editor) return;

    const isPom = pathEl.textContent.trim().endsWith('pom.xml');
    const editorWrap = editor.closest('.runner-editor-wrap');
    if (!editorWrap) return;

    if (isPom) {
      // Completely hide editor content
      editor.readOnly = true;
      editor.blur();
      editor.style.visibility = 'hidden';
      editor.style.pointerEvents = 'none';
      editor.style.userSelect = 'none';

      // Also hide the syntax highlight overlay and clip the wrap
      const hlWrap = editor.closest('.hl-editor-wrap');
      const hlOverlay = editorWrap.querySelector('.hl-overlay');
      if (hlOverlay) {
        hlOverlay.style.visibility = 'hidden';
        hlOverlay.style.pointerEvents = 'none';
        hlOverlay.style.userSelect = 'none';
      }
      if (hlWrap) {
        hlWrap.style.overflow = 'hidden';
      }
      editorWrap.style.overflow = 'hidden';

      if (!editor.__blurCopyBlock) {
        editor.__blurCopyBlock = (e) => e.preventDefault();
        editor.addEventListener('copy', editor.__blurCopyBlock);
        editor.addEventListener('cut', editor.__blurCopyBlock);
        editor.addEventListener('selectstart', editor.__blurCopyBlock);
      }

      if (!coverOverlay) {
        coverOverlay = document.createElement('div');
        coverOverlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:10;background:#0b1220;display:flex;align-items:center;justify-content:center;border-radius:0 0 12px 12px;';
        coverOverlay.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fa-solid fa-lock" style="font-size:32px;color:#34d399;margin-bottom:12px;display:block;"></i><div style="color:#d1fae5;font-size:15px;font-weight:700;margin-bottom:6px;">Build file redacted during review</div><div style="color:#6b7280;font-size:12px;line-height:1.6;">Dependency coordinates are hidden.<br>Code execution is unaffected.</div></div>';
        editorWrap.style.position = 'relative';
        editorWrap.appendChild(coverOverlay);
      }
      coverOverlay.style.display = 'flex';
    } else {
      editor.readOnly = false;
      editor.style.visibility = '';
      editor.style.pointerEvents = '';
      editor.style.userSelect = '';

      const hlWrap = editor.closest('.hl-editor-wrap');
      const hlOverlay = editorWrap.querySelector('.hl-overlay');
      if (hlOverlay) {
        hlOverlay.style.visibility = '';
        hlOverlay.style.pointerEvents = '';
        hlOverlay.style.userSelect = '';
      }
      if (hlWrap) {
        hlWrap.style.overflow = '';
      }
      editorWrap.style.overflow = '';

      if (editor.__blurCopyBlock) {
        editor.removeEventListener('copy', editor.__blurCopyBlock);
        editor.removeEventListener('cut', editor.__blurCopyBlock);
        editor.removeEventListener('selectstart', editor.__blurCopyBlock);
        editor.__blurCopyBlock = null;
      }
      if (coverOverlay) coverOverlay.style.display = 'none';
    }
  }

  const obs = new MutationObserver(update);
  document.addEventListener('DOMContentLoaded', () => {
    const pathEl = document.getElementById('currentFile');
    if (pathEl) obs.observe(pathEl, { childList: true, characterData: true, subtree: true });
    setInterval(update, 500);
    update();
  });
})();
