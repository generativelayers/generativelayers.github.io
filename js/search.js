/* ================================================================
   Generative Layers — Shared search, navigation, and copy updates
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

function currentPageName() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

function stripText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

function setTexts(selector, values) {
  const nodes = document.querySelectorAll(selector);
  values.forEach((value, index) => {
    if (nodes[index]) nodes[index].textContent = value;
  });
}

function replaceAllTextNodes(searchValue, replacement, root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (node.nodeValue && node.nodeValue.includes(searchValue)) {
      node.nodeValue = node.nodeValue.split(searchValue).join(replacement);
    }
  });
}

function installRunCodeNavigation() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || sidebar.querySelector('a[href="code.html"]')) return;

  const providersLink = sidebar.querySelector('a[href="providers.html"]');
  const runCodeLink = document.createElement('a');
  runCodeLink.href = 'code.html';

  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-code';
  const label = document.createElement('span');
  label.textContent = 'Run Code';
  runCodeLink.append(icon, label);

  if (currentPageName() === 'code.html') {
    runCodeLink.classList.add('active');
    sidebar.querySelectorAll('a.active').forEach(link => {
      if (link !== runCodeLink) link.classList.remove('active');
    });
  }

  if (providersLink) providersLink.insertAdjacentElement('afterend', runCodeLink);
  else sidebar.appendChild(runCodeLink);
}

function installMobileFixes() {
  if (document.getElementById('gl-mobile-fixes')) return;

  const style = document.createElement('style');
  style.id = 'gl-mobile-fixes';
  style.textContent = `
    html, body { width: 100%; max-width: 100%; overflow-x: hidden; }
    html.sidebar-open, body.sidebar-open { overflow: hidden !important; overscroll-behavior: none; }
    body.sidebar-open { position: fixed; left: 0; right: 0; width: 100%; }
    .top { left: 0; right: 0; width: 100vw; max-width: 100vw; box-sizing: border-box; overflow: visible; z-index: 10000 !important; }
    .header-inner { position: relative; z-index: 10001; }
    .header-inner, .search-wrapper, .main, .info-panel, .card, .repo-grid, .concept-card, .concept-header, .concept-details { min-width: 0; }
    .menu-toggle { width: 52px; height: 52px; min-width: 52px; min-height: 52px; align-items: center; justify-content: center; touch-action: manipulation; -webkit-tap-highlight-color: transparent; position: relative; z-index: 10003 !important; pointer-events: auto !important; }
    .menu-toggle i { pointer-events: none !important; }
    .search-wrapper { position: relative; z-index: 1; }
    @media (max-width: 900px) {
      .top { padding-left: 8px; padding-right: 10px; }
      .header-inner { max-width: none; gap: 8px; }
      .menu-toggle { display: flex !important; flex: 0 0 52px; }
      .search-wrapper { flex: 1 1 auto; max-width: none; }
      .side { position: fixed !important; top: var(--header-height) !important; left: 0 !important; width: min(82vw, 320px) !important; max-width: 320px !important; height: calc(100dvh - var(--header-height)) !important; max-height: calc(100dvh - var(--header-height)) !important; overflow-y: auto !important; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; z-index: 9998 !important; transform: translate3d(-100%, 0, 0); will-change: transform; }
      .side.open { transform: translate3d(0, 0, 0) !important; }
      .side a { touch-action: manipulation; -webkit-tap-highlight-color: rgba(52, 211, 153, 0.18); cursor: pointer; }
      .sidebar-backdrop { position: fixed !important; top: var(--header-height) !important; left: 0 !important; right: 0 !important; bottom: 0 !important; height: calc(100dvh - var(--header-height)) !important; z-index: 9997 !important; overscroll-behavior: none; }
      .search-results { z-index: 9999 !important; }
    }
    @media (max-width: 500px) {
      :root { --header-height: 68px; }
      .main { width: 100%; max-width: 100%; padding: 28px 18px 56px; }
      .info-panel { padding: 22px 18px; }
      .card, .concept-card { padding-left: 16px !important; padding-right: 16px !important; }
      .search-results { position: fixed; top: calc(var(--header-height) + 8px); left: 10px; right: 10px; width: auto; max-height: min(55vh, 420px); overflow-y: auto; }
      h1 { overflow-wrap: anywhere; }
    }
  `;

  document.head.appendChild(style);
}

function installMobileSidebarToggle() {
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!menuToggle || !sidebar || menuToggle.dataset.glBound) return;

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

  if (backdrop) {
    backdrop.addEventListener('click', () => setSidebarOpen(false));
    backdrop.addEventListener('touchend', event => {
      event.preventDefault();
      setSidebarOpen(false);
    }, { passive: false });
  }
}

function normalizeProviderFreeTierLabels() {
  if (currentPageName() !== 'providers.html') return;

  document.querySelectorAll('tr[onclick*="toggleProviderSetup"]').forEach(row => {
    const providerCell = row.querySelector('td:first-child');
    const freeTierCell = row.querySelector('td:nth-child(2)');
    if (!providerCell || !freeTierCell) return;
    const providerName = providerCell.textContent.trim().toLowerCase();
    if (providerName === 'groq') freeTierCell.textContent = 'Free (no credit card)';
    if (providerName === 'gemini') freeTierCell.textContent = 'Free tier';
  });

  const groqSetup = document.querySelector('#setup-groq div');
  if (groqSetup) replaceAllTextNodes('Sign up (free) →', 'Sign up (free, no credit card) →', groqSetup);
}

function installWebsiteCopyUpdates() {
  const page = currentPageName();

  if (page === 'index.html') {
    setText('#purpose p:nth-of-type(1)', "Generative Layers keeps external generation separate from the agent's reasoning loop.");
    setText('#purpose p:nth-of-type(2)', 'LLM, tool, API, and service outputs become candidate material: inspectable before the agent adopts, verifies, ignores, or rejects them.');
    setText('#inspirations .card p', 'BDI agent-oriented programming is about autonomous, goal-directed behaviour. These patterns are not hardcoded constraints; they emerge from agent programs composing lifecycle commands: binding resources, invoking them, inspecting candidates, recording judgements, computing admissibility, and accepting or rejecting outputs. The framework supplies the governed vocabulary; the agent program defines the architecture.');
  }

  if (page === 'framework.html') {
    setText('main > p.lead', 'The governed boundary between agent programs and external generative resources.');
    setText('#concept-agent-layer .concept-desc', 'The host agent platform and its native reasoning semantics.');
    setText('#concept-agent-layer li:nth-child(1)', 'Autonomous Control: Keeps belief revision, plan selection, intention execution, and action inside the host agent.');
    setText('#concept-agent-layer li:nth-child(2)', 'External Support: Lets plans request generative resources without changing host-agent semantics.');
    setText('#concept-agent-layer li:nth-child(3)', 'Context-Guarded Decision: Uses native plan conditions to govern candidate use.');
    setText('#concept-governance .concept-desc', 'Policy, limits, validation, audit, and admissibility checks.');
    setText('#concept-governance li:nth-child(2)', 'Assessment & Admissibility Gating: Verdicts recorded via judge() feed into an admissibility checker that gates accept().');
    setText('#concept-provider li:nth-child(2)', 'Resilience & Networking: Encapsulates HTTP requests, provider responses, retries, and backoff behind the invocation contract.');
    setText('#concept-material .concept-desc', 'External output held for inspection, assessment, adoption, or rejection.');
    setText('#concept-material li:nth-child(1)', 'Isolated State Container: Exposes generated values without automatically changing beliefs, plans, intentions, or actions.');
    setText('#canonical-commands > p', 'The framework establishes a canonical lifecycle contract across target platforms. The contract is defined in the Java ResourceActions interface, ensuring functional parity across integrations.');
  }

  if (page === 'patterns.html') {
    setText('main > p.lead', 'Acceptance is expressed in the agent program. The framework gives the agent governed candidate material; the agent decides whether to accept, reject, review, or refine it.');
    setText('#core-principle .card p', "The LLM is a tool, not the agent's reasoning procedure. Output becomes candidate material. These examples show agents validating, inspecting, reviewing, comparing, or refining candidates before use.");
  }

  if (page === 'research.html') {
    setText('main > p.lead', 'Governed generative resource layers for BDI agent systems.');
    setText('#problem p', 'BDI agents already provide disciplined practical reasoning. The research problem is how external generative outputs can be made available without silently becoming beliefs, intentions, plans, messages, or actions.');
    setText('#contribution p', 'A Java framework boundary where external outputs become governed candidate material before agent-level use.');
    setText('#research-questions > p.lead', 'The framework asks how governed generative resources can be integrated with BDI agency:');
    setTexts('#research-questions .card p', [
      'How can external outputs reach BDI agents without directly modifying agent state?',
      'What boundary makes resource access inspectable, assessable, and auditable?',
      'Can the same governed resource-layer model work across BDI and MAS frameworks?'
    ]);
    setText('#academic-context .card:first-child p', 'Author and principal maintainer of Generative Layers, developed as a research artefact for governed generative resource use in BDI agent systems.');
    setText('#scope-limitations > p:nth-of-type(1)', '1. Generative Layers can influence BDI reasoning, plan execution, intention flow, and behaviour when an agent program explicitly uses candidate material. It does not modify or extend the internal BDI reasoning cycle itself; GenAI plan generation is a different research direction. The role of Generative Layers is governed resource use: external outputs may be requested, inspected, validated, rejected, refined, adopted, or audited by the agent.');
    setText('#scope-limitations > p:nth-of-type(2)', "2. Consistent with the acceptance patterns, LLMs are tools, not the agent's reasoning procedure. The patterns are evaluation scenarios, not guarantees that generated outputs are correct, safe, or suitable for adoption. They demonstrate validation, inspection, confidence gating, cross-provider verification, peer review, belief-consistency checking, voting, and refinement before candidate material affects agent state or behaviour.");
    setText('#scope-limitations .card > div > span', '3. Design Boundary — Agent-level responsibilities');
    setTexts('#detail-missing-caps > div > p', [
      'Adaptive feedback, cost management, temporal validity, and deciding when to consult an LLM are left outside the core governance layer. They depend on the agent’s goals, beliefs, domain assumptions, and current context. Generative Layers provides governed access to external resources; the agent program decides when to use that access and how to respond after candidate material is accepted or rejected. The sketches below illustrate this boundary.',
      'Repeated rejection can be treated as agent experience: the agent records the pattern and may adopt a goal to rebind. The framework does not prescribe this policy.',
      'Budget control is domain-dependent. It may be represented as agent beliefs in plan contexts, or enforced separately through a custom GovernancePolicy.',
      'Freshness is domain-relative. The agent can use beliefs and plan contexts to decide whether existing information is sufficient or a new governed call is needed.',
      'Whether to consult an LLM is a practical-reasoning decision: one plan may use existing beliefs, while another may call Generative Layers when information is missing or insufficient.',
      'These examples are not complete solutions to adaptation, budgeting, temporal validity, or selective consultation. They show that such behaviours can be expressed in the agent program when they depend on domain context and practical reasoning. Generative Layers contributes the governed resource boundary: external output can be requested, inspected, assessed, traced, accepted, or rejected before use. Decisions about when to call a resource, rely on existing beliefs, or react to failure remain with the agent architecture.'
    ]);
  }

  if (page === 'getting-started.html') {
    setText('main > p.lead', 'Install Generative Layers from Maven Central and add governed generative resources to BDI agents.');
    setText('#quick-example > p', 'A governed invocation with the canonical lifecycle. See the full lifecycle in the Platform syntax comparison.');
    setText('#quick-example ol li:nth-child(5)', 'accept — recorded the candidate as accepted GL-side knowledge with a reason.');
    replaceAllTextNodes('Architecture, core concepts, the 13-command lifecycle, and platform syntax comparison.', 'Architecture, core concepts, lifecycle commands, and platform syntax comparison.');
  }

  if (page === 'providers.html') {
    setText('main > p.lead', 'Configure generative providers — built-in services, custom endpoints, and runtime switching.');
    setText('#providers > p', 'Generative Layers supports multiple providers out of the box. Call bind(agent, provider, model, config) to activate one — no framework changes needed. For unlisted providers, set the endpoint and API key environment variable.');
    setText('#detail-provider-custom p', 'Any Chat Completions-compatible service can be bound without framework changes. Provide the endpoint, model name, and API key environment variable.');
    replaceAllTextNodes('endpoint=https://api.your-provider.com/v1/chat/completions;apiKeyEnv=YOUR_API_KEY', 'endpoint=https://api.your-provider.com/v1/chat/completions,apiKeyEnv=YOUR_API_KEY');
    replaceAllTextNodes('endpoint=https://api.x.ai/v1/chat/completions;apiKeyEnv=GROK_API_KEY', 'endpoint=https://api.x.ai/v1/chat/completions,apiKeyEnv=GROK_API_KEY');
    replaceAllTextNodes('endpoint=https://api.mistral.ai/v1/chat/completions;apiKeyEnv=MISTRAL_API_KEY', 'endpoint=https://api.mistral.ai/v1/chat/completions,apiKeyEnv=MISTRAL_API_KEY');
  }
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
      resultsBox.textContent = '';
      return;
    }

    if (!items.length) {
      resultsBox.textContent = 'No results found';
      resultsBox.style.display = 'block';
      return;
    }

    resultsBox.textContent = '';
    items.slice(0, 8).forEach(item => {
      const link = document.createElement('a');
      link.className = 'search-hit';
      link.href = item.url;
      const page = document.createElement('span');
      page.className = 'search-hit-page';
      page.textContent = item.title;
      const section = document.createElement('span');
      section.className = 'search-hit-section';
      section.textContent = item.section;
      const context = document.createElement('span');
      context.className = 'search-hit-ctx';
      context.textContent = item.context || '';
      link.append(page, section, context);
      resultsBox.appendChild(link);
    });
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
  installWebsiteCopyUpdates();
  installSearch();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSharedPageScripts);
} else {
  initSharedPageScripts();
}
