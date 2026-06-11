(() => {
  'use strict';

  // Disable the old JS forwarding path. Native scrolling inside the iframe is smoother.
  window.__glParentHorizontalSwipeInstalled = true;

  const STYLE_ID = 'gl-mobile-native-runner-scroll-style';

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @media (max-width: 900px) {
        html,
        body {
          width: 920px !important;
          min-width: 920px !important;
          max-width: none !important;
          overflow-x: auto !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior-x: contain;
          touch-action: pan-x pan-y;
        }

        .layout,
        body .main,
        #run-code {
          width: 920px !important;
          min-width: 920px !important;
          max-width: none !important;
          overflow: visible !important;
        }

        .runner-card {
          width: 900px !important;
          min-width: 900px !important;
          max-width: none !important;
          overflow: visible !important;
        }

        .runner-project,
        .runner-project.resizable {
          grid-template-columns: var(--files-w, 195px) 6px minmax(0, 1fr) !important;
          column-gap: 0 !important;
        }

        .runner-editor-wrap {
          min-width: 0 !important;
        }

        .runner-current-file,
        .runner-editor,
        .runner-output,
        .hl-editor-wrap {
          touch-action: pan-x pan-y;
        }
      }
    `;

    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addStyle);
  } else {
    addStyle();
  }
})();
