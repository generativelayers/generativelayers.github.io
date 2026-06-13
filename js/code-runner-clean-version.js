(() => {
  function cleanVersionText() {
    const editor = document.getElementById('fileEditor');
    if (!editor) return;

    let updated = editor.value;
    // Strip any "vX.Y.Z" version from GL comments and println statements
    updated = updated.replace(
      /\/\/ Generative Layers v[\d.]+ short ASTRA alias\./g,
      '// Generative Layers short ASTRA alias.'
    );
    updated = updated.replace(
      /C\.println\("Generative Layers v[\d.]+ ASTRA alias is loaded: module gl\.astra\.GL gl;"\);/g,
      'C.println("Generative Layers ASTRA alias is loaded: module gl.astra.GL gl;");'
    );

    if (updated !== editor.value) {
      const start = editor.selectionStart || 0;
      const end = editor.selectionEnd || start;
      editor.value = updated;
      editor.selectionStart = Math.min(start, editor.value.length);
      editor.selectionEnd = Math.min(end, editor.value.length);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function init() {
    window.setTimeout(cleanVersionText, 100);
    window.setTimeout(cleanVersionText, 600);
    window.setTimeout(cleanVersionText, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
