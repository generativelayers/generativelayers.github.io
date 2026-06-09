(() => {
  const STORAGE_PREFIX = 'gl-runner-payload:';

  function textOf(pre) {
    const code = pre.querySelector('code');
    return (code ? code.textContent : pre.textContent).replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n').trim();
  }

  function titleFor(pre) {
    const panel = pre.closest('.info-panel');
    const h = panel ? panel.querySelector('h2') : document.querySelector('h1');
    return h ? h.textContent.replace(/\s+/g, ' ').trim() : 'ASTRA example';
  }

  function patchExistingRunButtons() {
    document.querySelectorAll('.gl-run-btn').forEach(button => {
      if (button.dataset.storagePatched === '1') return;
      button.dataset.storagePatched = '1';
      button.addEventListener('click', event => {
        const holder = button.closest('.tabs-container, .cmd-details-content, .gl-run-shell');
        if (!holder) return;

        const pre = holder.querySelector('.tab-content.active pre, .mini-code-block.active pre, pre');
        if (!pre) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const token = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2);
        sessionStorage.setItem(STORAGE_PREFIX + token, JSON.stringify({
          title: titleFor(pre),
          source: textOf(pre)
        }));

        window.location.href = new URL('code.html?load=' + encodeURIComponent(token), window.location.href).toString();
      }, true);
    });
  }

  function init() {
    patchExistingRunButtons();
    const observer = new MutationObserver(() => window.setTimeout(patchExistingRunButtons, 50));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
