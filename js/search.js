/* ================================================================
   Generative Layers — Dynamic Content Search & Mobile Menu
   ================================================================ */

const PAGES = [
  'index.html',
  'getting-started.html',
  'framework.html',
  'patterns.html',
  'providers.html',
  'code.html',
  'research.html',
  'repositories.html'
];

let searchIndex = null;
let lockedScrollY = 0;
let isSidebarLocked = false;
let lastSidebarToggleAt = 0;

function installRunCodeNavigation() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || sidebar.querySelector('a[href="code.html"]')) return;

  const providersLink = sidebar.querySelector('a[href="providers.html"]');
  const runCodeLink = document.createElement('a');
  runCodeLink.href = 'code.html';
  runCodeLink.innerHTML = '<i class="fa-solid fa-code"></i><span>Run Code</span>';

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPage === 'code.html') {
    runCodeLink.classList.add('active');
    sidebar.querySelectorAll('a.active').forEach(link => {
      if (link !== runCodeLink) link.classList.remove('active');
    });
  }

  if (providersLink) {
    providersLink.insertAdjacentElement('afterend', runCodeLink);
  } else {
    sidebar.appendChild(runCodeLink);
  }
}

function installMobileFixes() {
  if (document.getElementById('gl-mobile-fixes')) return;

  const style = document.createElement('style');
  style.id = 'gl-mobile-fixes';
  style.textContent = `
    html,
    body {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }

    html.sidebar-open,
    body.sidebar-open {
      overflow: hidden !important;
      overscroll-behavior: none;
    }

    body.sidebar-open {
      position: fixed;
      left: 0;
      right: 0;
      width: 100%;
    }

    .top {
      left: 0;
      right: 0;
      width: 100vw;
      max-width: 100vw;
      box-sizing: border-box;
      overflow: visible;
      z-index: 10000 !important;
    }

    .header-inner {
      position: relative;
      z-index: 10001;
    }

    .header-inner,
    .search-wrapper,
    .main,
    .info-panel,
    .card,
    .repo-grid,
    .concept-card,
    .concept-header,
    .concept-details {
      min-width: 0;
    }

    .menu-toggle {
      width: 52px;
      height: 52px;
      min-width: 52px;
      min-height: 52px;
      align-items: center;
      justify-content: center;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      -webkit-appearance: none;
      appearance: none;
      position: relative;
      z-index: 10003 !important;
      pointer-events: auto !important;
      isolation: isolate;
      line-height: 1;
    }

    .menu-toggle::before {
      content: '';
      position: absolute;
      inset: -8px;
      z-index: -1;
    }

    .menu-toggle i {
      pointer-events: none !important;
    }

    .search-wrapper {
      position: relative;
      z-index: 1;
    }

    @media (max-width: 900px) {
      .top {
        padding-left: 8px;
        padding-right: 10px;
      }

      .header-inner {
        max-width: none;
        gap: 8px;
      }

      .menu-toggle {
        display: flex !important;
        flex: 0 0 52px;
      }

      .search-wrapper {
        flex: 1 1 auto;
        max-width: none;
      }

      .side {
        position: fixed !important;
        top: var(--header-height) !important;
        left: 0 !important;
        width: min(82vw, 320px) !important;
        max-width: 320px !important;
        height: calc(100dvh - var(--header-height)) !important;
        max-height: calc(100dvh - var(--header-height)) !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        z-index: 9998 !important;
        transform: translate3d(-100%, 0, 0);
        will-change: transform;
      }

      .side.open {
        transform: translate3d(0, 0, 0) !important;
      }

      .side a {
        touch-action: manipulation;
        -webkit-tap-highlight-color: rgba(52, 211, 153, 0.18);
        cursor: pointer;
      }

      .sidebar-backdrop {
        position: fixed !important;
        top: var(--header-height) !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        height: calc(100dvh - var(--header-height)) !important;
        z-index: 9997 !important;
        overscroll-behavior: none;
      }

      .search-results {
        z-index: 9999 !important;
      }
    }

    @media (max-width: 500px) {
      :root {
        --header-height: 68px;
      }

      .top {
        padding-left: 6px;
        padding-right: 8px;
      }

      .header-inner {
        gap: 6px;
      }

      .header-logo {
        width: 30px;
        height: 30px;
      }

      .search {
        min-width: 0;
        padding: 10px 14px 10px 38px;
        font-size: 16px;
      }

      .search-icon {
        left: 14px;
      }

      .search-results {
        position: fixed;
        top: calc(var(--header-height) + 8px);
        left: 10px;
        right: 10px;
        width: auto;
        max-height: min(55vh, 420px);
        overflow-y: auto;
      }

      .main {
        width: 100%;
        max-width: 100%;
        padding: 28px 18px 56px;
      }

      .info-panel {
        padding: 22px 18px;
      }

      .card,
      .concept-card {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }

      .concept-header {
        align-items: flex-start;
      }

      h1 {
        overflow-wrap: anywhere;
      }
    }
  `;

  document.head.appendChild(style);
}

function normalizeProviderFreeTierLabels() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPage !== 'providers.html') return;

  document.querySelectorAll('tr[onclick*="toggleProviderSetup"]').forEach(row => {
    const providerCell = row.querySelector('td:first-child');
    const freeTierCell = row.querySelector('td:nth-child(2)');
    if (!providerCell || !freeTierCell) return;

    const providerName = providerCell.textContent.trim().toLowerCase();
    if (providerName === 'groq') freeTierCell.textContent = 'Free (no credit card)';
    if (providerName === 'gemini') freeTierCell.textContent = 'Free tier';
  });

  const groqSetup = document.querySelector('#setup-groq div');
  if (groqSetup) {
    groqSetup.innerHTML = groqSetup.innerHTML.replace('Sign up (free) &rarr;', 'Sign up (free, no credit card) &rarr;');
  }
}

function installMobileSidebarToggle() {
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!menuToggle || !sidebar) return;

  if (menuToggle.dataset.glBound) return;
  menuToggle.dataset.glBound = '1';
  menuToggle.type = 'button';
  menuToggle.setAttribute('aria-controls', sidebar.id || 'sidebar');
  menuToggle.setAttribute('aria-expanded', 'false');

  function unlockBodyScroll() {
    document.body.style.top = '';
    document.documentElement.classList.remove('sidebar-open');
    document.body.classList.remove('sidebar-open');
    if (isSidebarLocked) window.scrollTo(0, lockedScrollY);
    isSidebarLocked = false;
  }

  function setSidebarOpen(isOpen) {
    sidebar.classList.toggle('open', isOpen);
    if (backdrop) backdrop.classList.toggle('open', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (isOpen) {
      lockedScrollY = window.scrollY;
      document.documentElement.classList.add('sidebar-open');
      document.body.classList.add('sidebar-open');
      document.body.style.top = `-${lockedScrollY}px`;
      isSidebarLocked = true;
    } else {
      unlockBodyScroll();
    }
  }

  function handleMenuActivation(event) {
    const now = Date.now();
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (now - lastSidebarToggleAt < 350) return;
    lastSidebarToggleAt = now;

    setSidebarOpen(!sidebar.classList.contains('open'));
  }

  menuToggle.addEventListener('click', handleMenuActivation, { passive: false });
  menuToggle.addEventListener('pointerup', handleMenuActivation, { passive: false });
  menuToggle.addEventListener('touchend', handleMenuActivation, { passive: false });

  document.addEventListener('pointerup', function (event) {
    const target = event.target && event.target.closest ? event.target.closest('.menu-toggle') : null;
    if (target === menuToggle) handleMenuActivation(event);
  }, { capture: true, passive: false });

  if (backdrop) {
    backdrop.addEventListener('click', function () {
      setSidebarOpen(false);
    });
    backdrop.addEventListener('touchend', function (event) {
      event.preventDefault();
      setSidebarOpen(false);
    }, { passive: false });
  }

  let sidebarNavigationStartedAt = 0;

  function navigateFromSidebar(link, event) {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || link.target === '_blank') return;

    const now = Date.now();
    if (now - sidebarNavigationStartedAt < 450) {
      if (event) event.preventDefault();
      return;
    }
    sidebarNavigationStartedAt = now;

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setSidebarOpen(false);
    window.location.assign(link.href);
  }

  sidebar.querySelectorAll('a[href]').forEach(link => {
    link.addEventListener('click', event => navigateFromSidebar(link, event), { passive: false });
    link.addEventListener('touchend', event => navigateFromSidebar(link, event), { passive: false });
    link.addEventListener('pointerup', event => {
      if (!event.pointerType || event.pointerType === 'touch' || event.pointerType === 'pen') {
        navigateFromSidebar(link, event);
      }
    }, { passive: false });
  });
}

function pageTitleFromFilename(page) {
  const map = {
    'index.html': 'Introduction',
    'getting-started.html': 'Getting Started',
    'framework.html': 'Framework',
    'patterns.html': 'Patterns',
    'providers.html': 'Providers',
    'code.html': 'Run Code',
    'research.html': 'Research',
    'repositories.html': 'Repositories'
  };
  return map[page] || page;
}

function stripText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

async function buildSearchIndex() {
  if (searchIndex) return searchIndex;

  const parser = new DOMParser();
  const results = [];

  await Promise.all(PAGES.map(async page => {
    try {
      const response = await fetch(page, { cache: 'force-cache' });
      if (!response.ok) return;
      const html = await response.text();
      const doc = parser.parseFromString(html, 'text/html');
      const pageTitle = stripText(doc.querySelector('h1')?.textContent) || pageTitleFromFilename(page);

      results.push({
        page,
        title: pageTitle,
        section: pageTitle,
        context: stripText(doc.querySelector('meta[name="description"]')?.getAttribute('content')),
        url: page
      });

      doc.querySelectorAll('h2, h3, .card h3, .info-panel h2').forEach(heading => {
        const section = stripText(heading.textContent);
        if (!section) return;
        const id = heading.id || heading.closest('[id]')?.id || '';
        const parent = heading.closest('.card, .info-panel, section, article') || heading.parentElement;
        const context = stripText(parent?.textContent).slice(0, 220);
        results.push({
          page,
          title: pageTitle,
          section,
          context,
          url: id ? `${page}#${id}` : page
        });
      });
    } catch (error) {
      /* Keep the page usable if a search source cannot be fetched. */
    }
  }));

  searchIndex = results;
  return searchIndex;
}

function installSearch() {
  const input = document.querySelector('.search');
  const wrapper = document.querySelector('.search-wrapper');
  if (!input || !wrapper || input.dataset.glSearchBound) return;

  input.dataset.glSearchBound = '1';

  let resultsBox = wrapper.querySelector('.search-results');
  if (!resultsBox) {
    resultsBox = document.createElement('div');
    resultsBox.className = 'search-results';
    wrapper.appendChild(resultsBox);
  }

  function renderSearchResults(items, query) {
    if (!query) {
      resultsBox.style.display = 'none';
      resultsBox.innerHTML = '';
      return;
    }

    if (!items.length) {
      resultsBox.innerHTML = '<span class="search-empty">No results found</span>';
      resultsBox.style.display = 'block';
      return;
    }

    resultsBox.innerHTML = items.slice(0, 8).map(item => `
      <a class="search-hit" href="${item.url}">
        <span class="search-hit-page">${item.title}</span>
        <span class="search-hit-section">${item.section}</span>
        <span class="search-hit-ctx">${item.context || ''}</span>
      </a>
    `).join('');
    resultsBox.style.display = 'block';
  }

  input.addEventListener('input', async () => {
    const query = stripText(input.value).toLowerCase();
    if (query.length < 2) {
      renderSearchResults([], '');
      return;
    }

    const index = await buildSearchIndex();
    const words = query.split(' ').filter(Boolean);
    const matches = index
      .map(item => {
        const haystack = `${item.title} ${item.section} ${item.context}`.toLowerCase();
        const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
        return { item, score };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);

    renderSearchResults(matches, query);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) input.dispatchEvent(new Event('input'));
  });

  document.addEventListener('click', event => {
    if (!wrapper.contains(event.target)) resultsBox.style.display = 'none';
  });
}

function initSharedPageScripts() {
  installRunCodeNavigation();
  installMobileFixes();
  installMobileSidebarToggle();
  normalizeProviderFreeTierLabels();
  installSearch();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSharedPageScripts);
} else {
  initSharedPageScripts();
}
