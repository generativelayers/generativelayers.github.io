/* ================================================================
   Generative Layers — Dynamic Content Search & Mobile Menu
   ================================================================
   The search crawls all site pages at runtime, parses real DOM
   content into section-level entries, and searches against that.
   Nothing is hardcoded — if a page changes, search reflects it.
   ================================================================ */

const PAGES = [
  'index.html',
  'framework.html',
  'research.html',
  'repositories.html'
];

let searchIndex = null; // built lazily on first interaction

/* --- Crawl all pages and build search index --- */
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

      // Page title from <h1> or <title>
      const h1 = main.querySelector('h1');
      const pageTitle = h1 ? h1.textContent.trim() : (doc.title || pageUrl);

      // Walk through the main content and split into sections by headings
      const sections = [];
      let currentSection = { heading: pageTitle, id: '', texts: [] };

      for (const node of main.children) {
        // Skip footer, nav, non-content
        if (node.tagName === 'FOOTER' || node.tagName === 'NAV') continue;
        if (node.classList && node.classList.contains('footer')) continue;
        if (node.classList && node.classList.contains('site-logo')) continue;

        // New section boundary at <h2> or <section> with an <h2>
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

        // Extract all text content from this node
        const text = node.textContent.trim();
        if (text && text.length > 1) {
          currentSection.texts.push(text);
        }
      }

      // Push last section
      if (currentSection.texts.length > 0) {
        sections.push(currentSection);
      }

      // Create index entries
      for (const sec of sections) {
        const fullText = sec.texts.join(' ');
        const anchor = sec.id ? `#${sec.id}` : '';
        entries.push({
          page: pageTitle,
          section: sec.heading,
          text: fullText,
          url: pageUrl + anchor
        });
      }

    } catch (e) {
      // Silently skip pages that fail to load
    }
  }

  return entries;
}

/* --- Tokenise query into lowercase words --- */
function tokenise(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s\-]/g, '').split(/\s+/).filter(Boolean);
}

/* --- Stem a word to find its singular or base form --- */
function stemWord(word) {
  if (word.length <= 3) return word;
  
  // Plurals
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && !word.endsWith('aes') && !word.endsWith('ees')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('is')) return word.slice(0, -1);
  
  // Verbs / Adjectives
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('ed')) return word.slice(0, -2);
  
  // Suffixes
  if (word.endsWith('tional')) return word.slice(0, -5) + 'tion';
  if (word.endsWith('ation')) return word.slice(0, -5);
  if (word.endsWith('ness')) return word.slice(0, -4);
  if (word.endsWith('ment')) return word.slice(0, -4);
  
  return word;
}

/* --- Score an entry against query tokens (Soft-AND: exact & stemmed matching) --- */
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

    // 1. Exact token match
    if (hay.includes(t)) {
      matched = true;
      if (pageLower.includes(t)) score += 15;
      if (sectionLower.includes(t)) score += 10;
      if (textLower.includes(t)) score += 3;
    } 
    // 2. Stemmed/Fuzzy fallback match
    else if (stemmed !== t && hay.includes(stemmed)) {
      matched = true;
      if (pageLower.includes(stemmed)) score += 10;
      if (sectionLower.includes(stemmed)) score += 6;
      if (textLower.includes(stemmed)) score += 2;
    }

    if (matched) {
      matchesCount++;
    }
  }

  // Soft-AND boost: reward matching multiple query terms
  if (matchesCount > 0) {
    // If we matched all tokens, give a large multiplicative boost
    if (matchesCount === tokens.length) {
      score *= 2.0;
    } else {
      // Partial matches penalty to prioritize complete matches
      score *= (matchesCount / tokens.length) * 0.7;
    }
    return score;
  }

  return 0;
}

/* --- Extract a context snippet around the first matching token --- */
function snippet(text, tokens) {
  const lower = text.toLowerCase();
  let bestPos = -1;
  let matchedToken = '';

  for (const t of tokens) {
    let pos = lower.indexOf(t);
    if (pos === -1) {
      const stemmed = stemWord(t);
      pos = lower.indexOf(stemmed);
      if (pos !== -1) {
        bestPos = pos;
        matchedToken = stemmed;
        break;
      }
    } else {
      bestPos = pos;
      matchedToken = t;
      break;
    }
  }

  if (bestPos === -1) return '';

  // Find word boundaries around the match
  const start = Math.max(0, text.lastIndexOf(' ', bestPos - 45) + 1);
  const end = Math.min(text.length, text.indexOf(' ', bestPos + 55));
  let s = text.slice(start, end === -1 ? undefined : end).trim();
  if (start > 0) s = '…' + s;
  if ((end !== -1) && end < text.length) s += '…';

  // Highlight matching tokens (exact + stemmed)
  const highlightTerms = new Set([...tokens, ...tokens.map(stemWord)]);
  for (const t of highlightTerms) {
    if (t.length < 3) continue; // skip extremely short terms to avoid matching arbitrary chars
    const re = new RegExp(`(${t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    s = s.replace(re, '<mark>$1</mark>');
  }
  return s;
}


document.addEventListener('DOMContentLoaded', () => {

  /* ==== Search ==== */
  const input = document.querySelector('.search');
  if (input) {
    const wrapper = input.closest('.search-wrapper');
    const results = document.createElement('div');
    results.className = 'search-results';
    wrapper.appendChild(results);

    // Set premium placeholder
    input.setAttribute('placeholder', 'Search... (Press \'/\' to focus)');

    let activeIdx = -1;

    async function ensureIndex() {
      if (!searchIndex) {
        searchIndex = await buildIndex();
      }
      return searchIndex;
    }

    // Start building index immediately in background
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

      // Deduplicate by URL
      const seen = new Set();
      const unique = [];
      for (const m of matches) {
        if (!seen.has(m.url)) { seen.add(m.url); unique.push(m); }
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

    /* --- Keyboard navigation --- */
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
      if (!event.target.closest('.search-wrapper')) {
        results.style.display = 'none';
      }
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) render(input.value);
    });

    // Global "/" key shortcut to focus search
    document.addEventListener('keydown', event => {
      // Ignore if user is inside an input, textarea or contenteditable element
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      )) {
        return;
      }

      if (event.key === '/' || event.key === 's') {
        event.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  /* ==== Mobile sidebar toggle ==== */
  const toggle = document.querySelector('.menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (toggle && sidebar) {
    function openSidebar() {
      sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
    }
    toggle.addEventListener('click', () => {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    if (backdrop) backdrop.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeSidebar();
    });
  }
});
