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
    }

    .header-inner {
      position: relative;
      z-index: 1;
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
      width: 48px;
      height: 48px;
      min-width: 48px;
      min-height: 48px;
      align-items: center;
      justify-content: center;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      position: relative;
      z-index: 10000 !important;
      pointer-events: auto !important;
      isolation: isolate;
    }

    .menu-toggle,
    .menu-toggle * {
      pointer-events: auto !important;
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
        flex: 0 0 48px;
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    installRunCodeNavigation();
    installMobileFixes();
  });
} else {
  installRunCodeNavigation();
  installMobileFixes();
}
