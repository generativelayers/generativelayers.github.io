(() => {
  function cleanStarterText() {
    const editor = document.getElementById('fileEditor');
    if (!editor) return;

    let updated = editor.value;
    updated = updated.replace('    // Generative Layers short ASTRA alias.\n', '');
    updated = updated.replace('    // Old full path still works:\n', '');
    updated = updated.replace('    // module gl.adapter.astra.AstraAdapter gl;\n', '');
    updated = updated.replace('        C.println("Generative Layers ASTRA alias is loaded: module gl.astra.GL gl;");\n', '');
    updated = updated.replace('// Jason Hello World with Generative Layers\n', '');
    updated = updated.replace('      .println("Generative Layers Jason adapter loaded.");\n', '');
    updated = updated.replace('// JaCaMo Hello World with Generative Layers + CArtAgO\n', '');
    updated = updated.replace('// Agents + Artifacts + Organisation\n', '');
    updated = updated.replace('      .println("[CArtAgO] Environment active");\n', '');
    updated = updated.replace(/\n\n+/g, '\n');

    if (updated !== editor.value) {
      const start = editor.selectionStart || 0;
      const end = editor.selectionEnd || start;
      editor.value = updated.trimEnd();
      editor.selectionStart = Math.min(start, editor.value.length);
      editor.selectionEnd = Math.min(end, editor.value.length);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function init() {
    window.setTimeout(cleanStarterText, 100);
    window.setTimeout(cleanStarterText, 600);
    window.setTimeout(cleanStarterText, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
