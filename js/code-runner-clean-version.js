(() => {
  function cleanVersionText() {
    const editor = document.getElementById('fileEditor');
    if (!editor) return;

    const replacements = [
      ['// Generative Layers v0.1.2 short ASTRA alias.', '// Generative Layers short ASTRA alias.'],
      ['// Generative Layers v0.1.3 short ASTRA alias.', '// Generative Layers short ASTRA alias.'],
      ['// Generative Layers v0.1.4 short ASTRA alias.', '// Generative Layers short ASTRA alias.'],
      ['// Generative Layers v0.1.5 short ASTRA alias.', '// Generative Layers short ASTRA alias.'],
      ['C.println("Generative Layers v0.1.2 ASTRA alias is loaded: module gl.astra.GL gl;");', 'C.println("Generative Layers ASTRA alias is loaded: module gl.astra.GL gl;");'],
      ['C.println("Generative Layers v0.1.3 ASTRA alias is loaded: module gl.astra.GL gl;");', 'C.println("Generative Layers ASTRA alias is loaded: module gl.astra.GL gl;");'],
      ['C.println("Generative Layers v0.1.4 ASTRA alias is loaded: module gl.astra.GL gl;");', 'C.println("Generative Layers ASTRA alias is loaded: module gl.astra.GL gl;");'],
      ['C.println("Generative Layers v0.1.5 ASTRA alias is loaded: module gl.astra.GL gl;");', 'C.println("Generative Layers ASTRA alias is loaded: module gl.astra.GL gl;");']
    ];

    let updated = editor.value;
    for (const [oldText, newText] of replacements) {
      updated = updated.split(oldText).join(newText);
    }

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
