/**
 * blur-deps.js
 * When pom.xml is displayed in the code editor, overlays a small blur
 * on the GL dependency lines. The textarea value is NOT modified —
 * the code runs exactly as before. Purely cosmetic for review period.
 */
(() => {
  const BLUR_TEXT = 'com.generativelayers';
  let overlay = null;

  function getEditorAndPath() {
    const editor = document.getElementById('fileEditor');
    const pathEl = document.getElementById('currentFile');
    if (!editor || !pathEl) return null;
    return { editor, path: pathEl.textContent.trim() };
  }

  function updateOverlay() {
    const ctx = getEditorAndPath();
    if (!ctx) return;

    // Only show overlay when pom.xml is active
    if (!ctx.path.endsWith('pom.xml')) {
      if (overlay) overlay.style.display = 'none';
      return;
    }

    const val = ctx.editor.value;
    const lines = val.split('\n');
    let startLine = -1, endLine = -1;

    // Find the GL dependency block
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(BLUR_TEXT) && startLine === -1) {
        // Go back to find <dependency> opening
        for (let j = i; j >= 0; j--) {
          if (lines[j].includes('<dependency>')) { startLine = j; break; }
        }
        if (startLine === -1) startLine = i;
      }
      if (startLine !== -1 && lines[i].includes('</dependency>') && i >= startLine) {
        endLine = i;
        break;
      }
    }

    if (startLine === -1 || endLine === -1) {
      if (overlay) overlay.style.display = 'none';
      return;
    }

    // Calculate pixel positions
    const style = window.getComputedStyle(ctx.editor);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const top = paddingTop + (startLine * lineHeight) - ctx.editor.scrollTop;
    const height = (endLine - startLine + 1) * lineHeight;

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.style.cssText = 'position:absolute;left:0;right:0;backdrop-filter:blur(5px);background:rgba(11,18,32,0.6);pointer-events:none;z-index:5;display:flex;align-items:center;justify-content:center;transition:top 0.1s,height 0.1s;';
      overlay.innerHTML = '<span style="color:#6ee7b7;font-size:11px;font-weight:600;letter-spacing:0.5px;opacity:0.8;"><i class="fa-solid fa-lock" style="margin-right:5px;font-size:10px;"></i>REDACTED DURING REVIEW</span>';
      ctx.editor.parentElement.style.position = 'relative';
      ctx.editor.parentElement.appendChild(overlay);
    }

    overlay.style.display = 'flex';
    overlay.style.top = Math.max(0, top) + 'px';
    overlay.style.height = height + 'px';
  }

  // Run on file switch, scroll, and periodically
  document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateOverlay, 300);
    const editor = document.getElementById('fileEditor');
    if (editor) {
      editor.addEventListener('scroll', updateOverlay);
    }
  });
})();
