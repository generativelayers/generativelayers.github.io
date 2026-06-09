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
      .gl-run-btn[hidden] { display:none !important; }
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

  // ── Platform detection ──────────────────────────────────────

  function detectPlatform(pre) {
    if (!pre || pre.dataset.glRunReady === '1' || pre.closest('.runner-card')) return null;
    const code = pre.querySelector('code');
    if (!code) return null;

    // Check data-source attribute for path hints
    const src = code.dataset.source || '';

    // Check container id (tab-content or mini-code-block)
    const holder = pre.closest('.mini-code-block, .tab-content');
    const holderId = holder ? (holder.id || '') : '';

    // Explicit platform markers from id or data-source
    if (/jacamo/i.test(holderId) || /jacamo\//i.test(src)) return 'jacamo';
    if (/jason/i.test(holderId) || /jason\//i.test(src)) return 'jason';
    if (/(^|[-_])astra$/i.test(holderId) || /astra\//i.test(src)) return 'astra';

    // Content-based detection
    const t = textOf(pre);

    // Skip shell / build commands
    if (/^\s*(mvn|gradle|export|curl|npm|ssh|sudo|apt|git)\b/im.test(t)) return null;

    // ASTRA detection: agent keyword + module/rule syntax
    if (/agent\s+[A-Za-z_][A-Za-z0-9_]*/.test(t) || (/rule\s+\+!main\s*\(/.test(t) && /(gl\.|module\s+|console\.|C\.println|system\.)/.test(t))) {
      return 'astra';
    }

    // Jason/JaCaMo detection: AgentSpeak syntax
    if (/^\s*[+\-!]\s*[!?]?\w/.test(t) || /\s*<-\s/.test(t) || /\.stopMAS\b/.test(t) || /\.println?\b/.test(t)) {
      // JaCaMo uses CArtAgO artifact syntax
      if (/makeArtifact\s*\(/.test(t) || /focus\s*\(/.test(t) || /jaca\./.test(t) || /CartagoEnvironment/.test(t)) {
        return 'jacamo';
      }
      // Jason uses gl. prefix internal actions
      if (/gl\.\w+\(/.test(t)) return 'jason';
      // Plain AgentSpeak -> Jason
      if (/\+!\w/.test(t)) return 'jason';
    }

    return null;
  }

  // ── Source wrapping ──────────────────────────────────────────

  function indent(src, n) {
    const pad = ' '.repeat(n);
    return src.split('\n').map(line => line.trim() ? pad + line : '').join('\n');
  }

  function makeRunnableAstra(src) {
    src = src.replace(/^\s*\/\/\s*ASTRA\s*\n?/i, '').replace(/module\s+gl-astra\.GL\s+gl\s*;/g, 'module gl.astra.GL gl;').trim();
    if (/agent\s+[A-Za-z_][A-Za-z0-9_]*/.test(src)) return src.replace(/agent\s+[A-Za-z_][A-Za-z0-9_]*/, 'agent Main');
    const modules = [];
    if (/\bgl\./.test(src) && !/module\s+gl\.astra\.GL\s+gl\s*;/.test(src)) modules.push('    module gl.astra.GL gl;');
    if (/\bconsole\./.test(src) && !/module\s+Console\s+console\s*;/.test(src)) modules.push('    module Console console;');
    if (/\bC\.println/.test(src) && !/module\s+Console\s+C\s*;/.test(src)) modules.push('    module Console C;');
    if (!/module\s+System\s+system\s*;/.test(src)) modules.push('    module System system;');
    if (/rule\s+\+!main\s*\(/.test(src)) {
      let wrapped = indent(src, 4);
      if (!/system\.exit\(\)|S\.exit\(\)/.test(wrapped)) {
        wrapped = wrapped.replace(/(rule\s+\+!main\s*\([^)]*\)\s*\{)([\s\S]*?\n)((\s*)\})/, (m, head, body, close, pad) => {
          return head + body + pad + '    !shutdown();\n' + close;
        });
      }
      const shutdownRule = '\n\n    rule +!shutdown() {\n        system.exit();\n    }';
      return `agent Main {\n${modules.join('\n')}\n\n${wrapped}${shutdownRule}\n}`;
    }
    return `agent Main {\n${modules.join('\n')}\n\n    rule +!main(list args) {\n${indent(src, 8)}\n        !shutdown();\n    }\n\n    rule +!shutdown() {\n        system.exit();\n    }\n}`;
  }

  function makeRunnableJason(src) {
    // Jason code is mostly ready to run as-is; just clean up comment headers
    src = src.replace(/^\s*\/\/\s*Jason\s*\n?/i, '').trim();
    // Ensure it has .stopMAS if missing
    if (!/\.stopMAS\b/.test(src) && /\+!main\b/.test(src)) {
      // Add .stopMAS to the main plan if not present
      src = src.replace(/(\+!main[\s\S]*?)(\.)\s*$/, '$1\n      .stopMAS$2');
    }
    return src;
  }

  function makeRunnableJaCaMo(src) {
    // JaCaMo code runs as-is
    src = src.replace(/^\s*\/\/\s*JaCaMo\s*\n?/i, '').trim();
    return src;
  }

  function makeRunnable(src, platform) {
    if (platform === 'jason') return makeRunnableJason(src);
    if (platform === 'jacamo') return makeRunnableJaCaMo(src);
    return makeRunnableAstra(src);
  }

  // ── Navigation ──────────────────────────────────────────────

  function titleFor(pre) {
    const panel = pre.closest('.info-panel');
    const h = panel ? panel.querySelector('h2') : document.querySelector('h1');
    return h ? h.textContent.replace(/\s+/g, ' ').trim() : 'Example';
  }

  function openRunner(source, title, platform) {
    const hashKey = platform === 'jason' ? 'load-jason'
                  : platform === 'jacamo' ? 'load-jacamo'
                  : 'load';
    const encoded = encodeURIComponent(JSON.stringify({ title, source }));
    window.location.href = new URL('code.html#' + hashKey + '=' + encoded, window.location.href).toString();
  }

  // ── Button creation ─────────────────────────────────────────

  function makeRunButton(pre, scope, platform) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gl-run-btn';
    button.dataset.glRunScope = scope || 'fallback';
    button.dataset.glPlatform = platform || 'astra';
    button.innerHTML = '<i class="fa-solid fa-play"></i><span>Run</span>';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const activePre = getActivePreInScope(pre, scope);
      const activePlatform = activePre ? (detectPlatform(activePre) || platform) : platform;
      openRunner(makeRunnable(textOf(activePre || pre), activePlatform), titleFor(activePre || pre), activePlatform);
    });
    return button;
  }

  /** For tabbed containers, find the currently active tab's <pre> */
  function getActivePreInScope(fallbackPre, scope) {
    if (scope === 'tabs') {
      const tabs = fallbackPre.closest('.tabs-container');
      if (tabs) {
        const activePanel = tabs.querySelector(':scope > .tab-content.active');
        if (activePanel) {
          const pre = activePanel.querySelector('pre');
          if (pre) return pre;
        }
      }
    }
    if (scope === 'mini') {
      const details = fallbackPre.closest('.cmd-details-content');
      if (details) {
        const activeBlock = details.querySelector('.mini-code-block.active');
        if (activeBlock) {
          const pre = activeBlock.querySelector('pre');
          if (pre) return pre;
        }
      }
    }
    return fallbackPre;
  }

  // ── Visibility: Run button is always visible for all platforms ──

  function updateRunButtonVisibility() {
    // Run buttons are now always visible for all platforms
    document.querySelectorAll('.gl-run-btn').forEach(button => {
      button.hidden = false;
    });
  }

  // ── Adding buttons ──────────────────────────────────────────

  function addButtonToTabsHeader(pre, platform) {
    const tabs = pre.closest('.tabs-container');
    const header = tabs ? tabs.querySelector(':scope > .tabs-header') : null;
    if (!header || header.dataset.glRunReady === '1') return false;

    header.appendChild(makeRunButton(pre, 'tabs', platform));
    header.dataset.glRunReady = '1';
    pre.classList.add('gl-code-normalized');
    pre.dataset.glRunReady = '1';
    return true;
  }

  function addButtonToMiniTabs(pre, platform) {
    const details = pre.closest('.cmd-details-content');
    const miniTabs = details ? details.querySelector('.mini-tabs') : null;
    if (!miniTabs || miniTabs.dataset.glRunReady === '1') return false;

    miniTabs.appendChild(makeRunButton(pre, 'mini', platform));
    miniTabs.dataset.glRunReady = '1';
    pre.classList.add('gl-code-normalized');
    pre.dataset.glRunReady = '1';
    return true;
  }

  function addFallbackButton(pre, platform) {
    const shell = document.createElement('div');
    shell.className = 'gl-run-shell';
    const bar = document.createElement('div');
    bar.className = 'gl-run-bar';
    bar.appendChild(makeRunButton(pre, 'fallback', platform));
    pre.parentNode.insertBefore(shell, pre);
    shell.appendChild(bar);
    shell.appendChild(pre);
    pre.classList.add('gl-code-normalized');
    pre.dataset.glRunReady = '1';
  }

  function addButton(pre) {
    const platform = detectPlatform(pre);
    if (!platform) return;
    if (addButtonToTabsHeader(pre, platform)) return;
    if (addButtonToMiniTabs(pre, platform)) return;
    addFallbackButton(pre, platform);
  }

  function scan() {
    document.querySelectorAll('pre').forEach(pre => {
      if (pre.dataset.glRunReady === '1') return;
      if (pre.querySelector('code')) addButton(pre);
      else pre.classList.add('gl-code-normalized');
    });
    updateRunButtonVisibility();
  }

  // ── Incoming source (code.html / runner pages) ──────────────

  function installIncomingSource() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    // Works on code.html and runner-*.html (iframes)
    if (page !== 'code.html' && !page.startsWith('runner-')) return;

    if (!document.getElementById('gl-key-warning')) {
      const warning = document.createElement('div');
      warning.id = 'gl-key-warning';
      warning.className = 'gl-key-warning';
      warning.innerHTML = '<i class="fa-solid fa-key"></i><div><strong>Provider examples need the correct API key.</strong> Before running LLM/provider examples, check <a href="providers.html#providers">Built-in Providers and API key setup</a>.</div>';
      const h1 = document.querySelector('main.main h1');
      if (h1) h1.insertAdjacentElement('afterend', warning);
    }

    if (!window.location.hash.startsWith('#load')) return;
    try {
      // Parse hash: #load=, #load-jason=, #load-jacamo=
      const hash = window.location.hash;
      let payload;
      if (hash.startsWith('#load-jason=')) {
        payload = JSON.parse(decodeURIComponent(hash.slice('#load-jason='.length)));
        payload._platform = 'jason';
      } else if (hash.startsWith('#load-jacamo=')) {
        payload = JSON.parse(decodeURIComponent(hash.slice('#load-jacamo='.length)));
        payload._platform = 'jacamo';
      } else if (hash.startsWith('#load=')) {
        payload = JSON.parse(decodeURIComponent(hash.slice('#load='.length)));
        payload._platform = 'astra';
      } else {
        return;
      }

      if (!payload.source) return;

      // New iframe architecture: load into the file-based editor
      if (typeof window.GLRunner !== 'undefined' && window.GLRunner.loadSource) {
        window.GLRunner.loadSource(payload.source, payload.title);
        return;
      }

      // Legacy: direct element access (code.html with inline runner)
      const input = document.getElementById('astraSource');
      if (input) input.value = payload.source;
      const output = document.getElementById('runnerOutput');
      const status = document.getElementById('runnerStatus');
      const metaStatus = document.getElementById('metaStatus');
      const metaReturnCode = document.getElementById('metaReturnCode');
      const metaElapsed = document.getElementById('metaElapsed');
      if (output) output.textContent = `Loaded: ${payload.title || 'Example'}\nCheck the API key warning above, then press "Run Source".`;
      if (status) status.textContent = 'Example loaded';
      if (metaStatus) metaStatus.textContent = 'Loaded';
      if (metaReturnCode) metaReturnCode.textContent = '\u2014';
      if (metaElapsed) metaElapsed.textContent = '\u2014';
      window.setTimeout(() => (document.getElementById('run-code') || input).scrollIntoView({ behavior:'smooth', block:'start' }), 100);
    } catch (error) {
      console.warn('Could not load example into runner.', error);
    }
  }

  // ── Init ────────────────────────────────────────────────────

  function init() {
    addStyle();
    scan();
    installIncomingSource();

    document.addEventListener('click', () => window.setTimeout(updateRunButtonVisibility, 0), true);
    document.addEventListener('change', () => window.setTimeout(updateRunButtonVisibility, 0), true);

    const observer = new MutationObserver(() => window.setTimeout(scan, 80));
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  }

  // Expose scan for dynamic content (patterns.html)
  window.GLRunCodeLinks = { scan };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
