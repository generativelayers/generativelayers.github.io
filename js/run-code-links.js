(() => {
  const STYLE_ID = 'gl-run-link-style';

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tabs-container, .mini-code-container, .gl-run-shell { max-width:100%; background:#0b1220 !important; border-color:#1f2937 !important; }
      .tabs-container pre, .mini-code-block pre, .gl-run-shell pre, pre.gl-code-normalized { overflow-x:hidden !important; white-space:pre-wrap !important; overflow-wrap:anywhere !important; background:#0b1220 !important; }
      .tabs-container pre code, .mini-code-block pre code, .gl-run-shell pre code, pre.gl-code-normalized code { white-space:pre-wrap !important; overflow-wrap:anywhere !important; }
      .tabs-header, .gl-run-bar { background:#111827 !important; border-bottom:1px solid #1f2937 !important; }
      .tabs-header { gap:10px !important; }
      .tabs-header .tabs-buttons { margin-right:auto !important; }
      .tabs-header .gl-run-btn { margin-left:8px !important; }
      .mini-tabs .gl-run-btn { margin-left:8px !important; }
      .gl-run-shell { border:1px solid #1f2937; border-radius:10px; overflow:hidden; margin:0; }
      .tabs-container .gl-run-shell, .mini-code-container .gl-run-shell { border:0; border-radius:0; }
      .gl-run-bar { display:flex; justify-content:flex-end; align-items:center; gap:8px; padding:8px 12px; }
      .gl-run-btn { display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(52,211,153,.35); border-radius:999px; background:rgba(52,211,153,.12); color:#34d399; font-size:12px; font-weight:800; padding:6px 12px; cursor:pointer; }
      .gl-run-btn:hover { background:#059669; border-color:#059669; color:white; }
      .gl-key-warning { display:flex; gap:12px; align-items:flex-start; max-width:1100px; margin:0 0 18px; padding:14px 16px; border:1px solid #fde68a; border-left:4px solid #f59e0b; border-radius:10px; background:#fffbeb; color:#92400e; font-size:14px; line-height:1.55; }
      .gl-key-warning i { color:#d97706; margin-top:3px; }
      .gl-key-warning strong { color:#78350f; }
      .gl-key-warning a { font-weight:800; color:#0a7a50; text-decoration:underline; text-underline-offset:2px; }
    `;
    document.head.appendChild(style);
  }

  function textOf(pre) {
    const code = pre.querySelector('code');
    return (code ? code.textContent : pre.textContent).replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n').trim();
  }

  function isAstra(pre) {
    if (!pre || pre.dataset.glRunReady === '1' || pre.closest('.runner-card')) return false;
    const code = pre.querySelector('code');
    if (!code) return false;
    if (/\/astra\//i.test(code.dataset.source || '')) return true;
    const holder = pre.closest('.mini-code-block, .tab-content');
    const id = holder ? holder.id || '' : '';
    if (/(^|[-_])astra$/i.test(id) || /-ASTRA$/i.test(id)) return true;
    const t = textOf(pre);
    if (/^\s*(mvn|gradle|export|curl|npm|ssh|sudo|apt|git)\b/im.test(t)) return false;
    return /agent\s+[A-Za-z_][A-Za-z0-9_]*/.test(t) || (/rule\s+\+!main\s*\(/.test(t) && /(gl\.|module\s+|console\.|C\.println|system\.)/.test(t));
  }

  function indent(src, n) {
    const pad = ' '.repeat(n);
    return src.split('\n').map(line => line.trim() ? pad + line : '').join('\n');
  }

  function makeRunnable(src) {
    src = src.replace(/^\s*\/\/\s*ASTRA\s*\n?/i, '').replace(/module\s+gl-astra\.GL\s+gl\s*;/g, 'module gl.astra.GL gl;').trim();
    if (/agent\s+[A-Za-z_][A-Za-z0-9_]*/.test(src)) return src.replace(/agent\s+[A-Za-z_][A-Za-z0-9_]*/, 'agent Main');
    const modules = [];
    if (/\bgl\./.test(src) && !/module\s+gl\.astra\.GL\s+gl\s*;/.test(src)) modules.push('    module gl.astra.GL gl;');
    if (/\bconsole\./.test(src) && !/module\s+Console\s+console\s*;/.test(src)) modules.push('    module Console console;');
    if (/\bC\.println/.test(src) && !/module\s+Console\s+C\s*;/.test(src)) modules.push('    module Console C;');
    if (!/module\s+System\s+system\s*;/.test(src)) modules.push('    module System system;');
    if (/rule\s+\+!main\s*\(/.test(src)) return `agent Main {\n${modules.join('\n')}\n\n${indent(src, 4)}\n}`;
    return `agent Main {\n${modules.join('\n')}\n\n    rule +!main(list args) {\n${indent(src, 8)}\n        system.exit();\n    }\n}`;
  }

  function titleFor(pre) {
    const panel = pre.closest('.info-panel');
    const h = panel ? panel.querySelector('h2') : document.querySelector('h1');
    return h ? h.textContent.replace(/\s+/g, ' ').trim() : 'ASTRA example';
  }

  function openRunner(source, title) {
    const encoded = encodeURIComponent(JSON.stringify({ title, source }));
    window.location.href = new URL('code.html#load=' + encoded, window.location.href).toString();
  }

  function makeRunButton(pre) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gl-run-btn';
    button.innerHTML = '<i class="fa-solid fa-play"></i><span>Run</span>';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openRunner(makeRunnable(textOf(pre)), titleFor(pre));
    });
    return button;
  }

  function addButtonToTabsHeader(pre) {
    const tabs = pre.closest('.tabs-container');
    const header = tabs ? tabs.querySelector(':scope > .tabs-header') : null;
    if (!header || header.dataset.glRunReady === '1') return false;

    header.appendChild(makeRunButton(pre));
    header.dataset.glRunReady = '1';
    pre.classList.add('gl-code-normalized');
    pre.dataset.glRunReady = '1';
    return true;
  }

  function addButtonToMiniTabs(pre) {
    const details = pre.closest('.cmd-details-content');
    const miniTabs = details ? details.querySelector('.mini-tabs') : null;
    if (!miniTabs || miniTabs.dataset.glRunReady === '1') return false;

    miniTabs.appendChild(makeRunButton(pre));
    miniTabs.dataset.glRunReady = '1';
    pre.classList.add('gl-code-normalized');
    pre.dataset.glRunReady = '1';
    return true;
  }

  function addFallbackButton(pre) {
    const shell = document.createElement('div');
    shell.className = 'gl-run-shell';
    const bar = document.createElement('div');
    bar.className = 'gl-run-bar';
    bar.appendChild(makeRunButton(pre));
    pre.parentNode.insertBefore(shell, pre);
    shell.appendChild(bar);
    shell.appendChild(pre);
    pre.classList.add('gl-code-normalized');
    pre.dataset.glRunReady = '1';
  }

  function addButton(pre) {
    if (!isAstra(pre)) return;
    if (addButtonToTabsHeader(pre)) return;
    if (addButtonToMiniTabs(pre)) return;
    addFallbackButton(pre);
  }

  function scan() {
    document.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('code')) addButton(pre);
      else pre.classList.add('gl-code-normalized');
    });
  }

  function installIncomingSource() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    if (page !== 'code.html') return;
    const input = document.getElementById('astraSource');
    if (!input) return;

    if (!document.getElementById('gl-key-warning')) {
      const warning = document.createElement('div');
      warning.id = 'gl-key-warning';
      warning.className = 'gl-key-warning';
      warning.innerHTML = '<i class="fa-solid fa-key"></i><div><strong>Provider examples need the correct API key.</strong> Before running LLM/provider examples, check <a href="providers.html#providers">Built-in Providers and API key setup</a>.</div>';
      const h1 = document.querySelector('main.main h1');
      if (h1) h1.insertAdjacentElement('afterend', warning);
    }

    if (!window.location.hash.startsWith('#load=')) return;
    try {
      const payload = JSON.parse(decodeURIComponent(window.location.hash.slice(6)));
      if (!payload.source) return;
      input.value = payload.source;
      const output = document.getElementById('runnerOutput');
      const status = document.getElementById('runnerStatus');
      const metaStatus = document.getElementById('metaStatus');
      const metaReturnCode = document.getElementById('metaReturnCode');
      const metaElapsed = document.getElementById('metaElapsed');
      if (output) output.textContent = `Loaded: ${payload.title || 'ASTRA example'}\nCheck the API key warning above, then press “Run Source”.`;
      if (status) status.textContent = 'Example loaded';
      if (metaStatus) metaStatus.textContent = 'Loaded';
      if (metaReturnCode) metaReturnCode.textContent = '—';
      if (metaElapsed) metaElapsed.textContent = '—';
      window.setTimeout(() => (document.getElementById('run-code') || input).scrollIntoView({ behavior:'smooth', block:'start' }), 100);
    } catch (error) {
      console.warn('Could not load ASTRA example into runner.', error);
    }
  }

  function init() {
    addStyle();
    scan();
    installIncomingSource();
    const observer = new MutationObserver(() => window.setTimeout(scan, 80));
    observer.observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
