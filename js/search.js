/* ================================================================
   Generative Layers — Dynamic Content Search & Mobile Menu
   ================================================================ */

const PAGES = [
  'index.html',
  'getting-started.html',
  'framework.html',
  'patterns.html',
  'providers.html',
  'research.html',
  'repositories.html'
];

let searchIndex = null;

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

    body.sidebar-open {
      overflow: hidden;
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
        width: min(86vw, 280px);
        max-width: 86vw;
        z-index: 9998 !important;
      }

      .sidebar-backdrop {
        z-index: 9997 !important;
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

async function buildIndex() {
  const entries = [];

  for (const pageUrl of PAGES) {
    try {
      const resp = await fetch(pageUrl, { cache: 'no-cache' });
      if (!resp.ok) continue;
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const main = doc.querySelector('.main') || doc.querySelector('#page-content') || doc.body;
      if (!main) continue;

      const h1 = main.querySelector('h1');
      const pageTitle = h1 ? h1.textContent.trim() : (doc.title || pageUrl);
      const sections = [];
      let currentSection = { heading: pageTitle, id: '', texts: [] };

      for (const node of main.children) {
        if (node.tagName === 'FOOTER' || node.tagName === 'NAV') continue;
        if (node.classList && node.classList.contains('footer')) continue;
        if (node.classList && node.classList.contains('site-logo')) continue;

        const heading = (node.tagName === 'H2') ? node
          : (node.tagName === 'SECTION' || node.classList?.contains('info-panel'))
            ? node.querySelector('h2')
            : null;

        if (heading && currentSection.texts.length > 0) {
          sections.push({ ...currentSection });
          currentSection = {
            heading: heading.textContent.trim(),
            id: heading.id || node.id || '',
            texts: []
          };
        } else if (heading && currentSection.texts.length === 0) {
          currentSection.heading = heading.textContent.trim();
          currentSection.id = heading.id || node.id || '';
        }

        const text = node.textContent.trim();
        if (text && text.length > 1) currentSection.texts.push(text);
      }

      if (currentSection.texts.length > 0) sections.push(currentSection);

      for (const sec of sections) {
        entries.push({
          page: pageTitle,
          section: sec.heading,
          text: sec.texts.join(' '),
          url: pageUrl + (sec.id ? `#${sec.id}` : '')
        });
      }
    } catch (e) {
      // Skip pages that fail to load.
    }
  }

  return entries;
}

function tokenise(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s\-]/g, '').split(/\s+/).filter(Boolean);
}

function stemWord(word) {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && !word.endsWith('aes') && !word.endsWith('ees')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('is')) return word.slice(0, -1);
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('ed')) return word.slice(0, -2);
  if (word.endsWith('tional')) return word.slice(0, -5) + 'tion';
  if (word.endsWith('ation')) return word.slice(0, -5);
  if (word.endsWith('ness')) return word.slice(0, -4);
  if (word.endsWith('ment')) return word.slice(0, -4);
  return word;
}

function scoreEntry(entry, tokens) {
  const pageLower = entry.page.toLowerCase();
  const sectionLower = entry.section.toLowerCase();
  const textLower = entry.text.toLowerCase();
  const hay = `${pageLower} ${sectionLower} ${textLower}`;
  let score = 0;
  let matchesCount = 0;

  for (const t of tokens) {
    const stemmed = stemWord(t);
    let matched = false;

    if (hay.includes(t)) {
      matched = true;
      if (pageLower.includes(t)) score += 15;
      if (sectionLower.includes(t)) score += 10;
      if (textLower.includes(t)) score += 3;
    } else if (stemmed !== t && hay.includes(stemmed)) {
      matched = true;
      if (pageLower.includes(stemmed)) score += 10;
      if (sectionLower.includes(stemmed)) score += 6;
      if (textLower.includes(stemmed)) score += 2;
    }

    if (matched) matchesCount++;
  }

  if (matchesCount === 0) return 0;
  return matchesCount === tokens.length
    ? score * 2
    : score * (matchesCount / tokens.length) * 0.7;
}

function snippet(text, tokens) {
  const lower = text.toLowerCase();
  let bestPos = -1;

  for (const t of tokens) {
    let pos = lower.indexOf(t);
    if (pos === -1) pos = lower.indexOf(stemWord(t));
    if (pos !== -1) {
      bestPos = pos;
      break;
    }
  }

  if (bestPos === -1) return '';

  const start = Math.max(0, text.lastIndexOf(' ', bestPos - 45) + 1);
  const end = Math.min(text.length, text.indexOf(' ', bestPos + 55));
  let s = text.slice(start, end === -1 ? undefined : end).trim();
  if (start > 0) s = '…' + s;
  if ((end !== -1) && end < text.length) s += '…';

  const highlightTerms = new Set([...tokens, ...tokens.map(stemWord)]);
  for (const t of highlightTerms) {
    if (t.length < 3) continue;
    const re = new RegExp(`(${t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    s = s.replace(re, '<mark>$1</mark>');
  }
  return s;
}

document.addEventListener('DOMContentLoaded', () => {
  installMobileFixes();

  const input = document.querySelector('.search');
  let results = null;

  if (input) {
    const wrapper = input.closest('.search-wrapper');
    results = document.createElement('div');
    results.className = 'search-results';
    wrapper.appendChild(results);

    let activeIdx = -1;

    async function ensureIndex() {
      if (!searchIndex) searchIndex = await buildIndex();
      return searchIndex;
    }

    ensureIndex();

    async function render(query) {
      activeIdx = -1;
      const tokens = tokenise(query);
      if (tokens.length === 0) {
        results.innerHTML = '';
        results.style.display = 'none';
        return [];
      }

      const index = await ensureIndex();
      const matches = index
        .map(entry => ({ ...entry, _score: scoreEntry(entry, tokens) }))
        .filter(e => e._score > 0)
        .sort((a, b) => b._score - a._score);

      const seen = new Set();
      const unique = [];
      for (const m of matches) {
        if (!seen.has(m.url)) {
          seen.add(m.url);
          unique.push(m);
        }
      }

      if (unique.length === 0) {
        results.innerHTML = '<div class="search-empty">No results found. Try alternative keywords.</div>';
        results.style.display = 'block';
        return [];
      }

      results.innerHTML = unique.slice(0, 8).map((item, i) => {
        const ctx = snippet(item.text, tokens);
        return `<a href="${item.url}" class="search-hit" data-idx="${i}">
          <span class="search-hit-page">${item.page}</span>
          <span class="search-hit-section">${item.section}</span>
          ${ctx ? `<span class="search-hit-ctx">${ctx}</span>` : ''}
        </a>`;
      }).join('');
      results.style.display = 'block';
      return unique;
    }

    function setActive(idx) {
      const items = results.querySelectorAll('.search-hit');
      items.forEach(el => el.classList.remove('search-hit-active'));
      if (idx >= 0 && idx < items.length) {
        items[idx].classList.add('search-hit-active');
        items[idx].scrollIntoView({ block: 'nearest' });
      }
      activeIdx = idx;
    }

    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => render(input.value), 80);
    });

    input.addEventListener('keydown', event => {
      const items = results.querySelectorAll('.search-hit');
      const count = items.length;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive(activeIdx < count - 1 ? activeIdx + 1 : 0);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive(activeIdx > 0 ? activeIdx - 1 : count - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (activeIdx >= 0 && items[activeIdx]) {
          window.location.href = items[activeIdx].getAttribute('href');
        } else {
          render(input.value).then(matches => {
            if (matches.length > 0) window.location.href = matches[0].url;
          });
        }
      } else if (event.key === 'Escape') {
        input.value = '';
        results.innerHTML = '';
        results.style.display = 'none';
        input.blur();
      }
    });

    document.addEventListener('click', event => {
      if (!event.target.closest('.search-wrapper')) results.style.display = 'none';
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) render(input.value);
    });

    document.addEventListener('keydown', event => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      )) return;

      if (event.key === '/' || event.key === 's') {
        event.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  const toggle = document.querySelector('.menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (toggle && sidebar) {
    toggle.setAttribute('type', 'button');
    toggle.setAttribute('aria-controls', sidebar.id || 'sidebar');
    toggle.setAttribute('aria-expanded', 'false');

    function hideSearch() {
      if (results) {
        results.innerHTML = '';
        results.style.display = 'none';
      }
      if (input) input.blur();
    }

    function openSidebar() {
      hideSearch();
      sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
      document.body.classList.add('sidebar-open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
      document.body.classList.remove('sidebar-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    function toggleSidebar(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    }

    function tapWithinToggle(event) {
      const touch = event.touches ? event.touches[0] : event;
      if (!touch) return false;
      const rect = toggle.getBoundingClientRect();
      const padding = 12;
      const x = touch.clientX;
      const y = touch.clientY;
      return x >= rect.left - padding &&
             x <= rect.right + padding &&
             y >= rect.top - padding &&
             y <= rect.bottom + padding;
    }

    // Chrome mobile sometimes gives the first tap to the focused search input / keyboard.
    // Capture the physical tap by coordinates before blur/click retargeting can steal it.
    document.addEventListener('pointerdown', event => {
      if (tapWithinToggle(event)) toggleSidebar(event);
    }, { capture: true, passive: false });

    document.addEventListener('touchstart', event => {
      if (tapWithinToggle(event)) toggleSidebar(event);
    }, { capture: true, passive: false });

    toggle.addEventListener('click', toggleSidebar);

    if (backdrop) backdrop.addEventListener('click', closeSidebar);
    sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSidebar));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeSidebar();
    });
  }
});
