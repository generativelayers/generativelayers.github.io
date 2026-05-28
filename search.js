const searchIndex = [
  {
    title: 'Introduction and Overview',
    url: 'index.html',
    text: 'Generative Layers governed generative agent framework external models tools services APIs resources thesis origin academic context collaborators Dimitrios Kyriakidis Rem Collier UCD governance decision constraints BDI first'
  },
  {
    title: 'Repositories',
    url: 'repositories.html',
    text: 'framework examples docs GitHub repositories source guide reference material Jason ASTRA JaCaMo CArtAgO integrations'
  },
  {
    title: 'How it Works',
    url: 'how-it-works.html',
    text: 'execution model agent request adapter translation governance check provider call result normalisation agent adoption generated outputs beliefs tool calls policy denial'
  },
  {
    title: 'Generative Layers Concepts',
    url: 'concepts.html',
    text: 'agent layer governance layer resource layer goals decisions execution context policies checks logging failure handling LLM APIs tools services external systems'
  },
  {
    title: 'Getting Started',
    url: 'getting-started.html',
    text: 'getting started framework repository examples early development platform integrations installation future setup'
  },
  {
    title: 'Core Concepts',
    url: 'core-concepts.html',
    text: 'controlled invocation policy checks auditable boundaries provider abstraction platform specific adapters'
  },
  {
    title: 'API Library',
    url: 'api.html',
    text: 'API documentation library stable package structure future reference modules'
  },
  {
    title: 'Publications',
    url: 'publications.html',
    text: 'publications research material papers academic results thesis framework matures'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('.search');
  if (!input) return;

  const results = document.createElement('div');
  results.className = 'search-results';
  input.insertAdjacentElement('afterend', results);

  function render(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '';
      results.style.display = 'none';
      return [];
    }

    const matches = searchIndex
      .map(item => {
        const haystack = `${item.title} ${item.text}`.toLowerCase();
        let score = 0;
        if (item.title.toLowerCase().includes(q)) score += 3;
        if (haystack.includes(q)) score += 1;
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      results.innerHTML = '<div class="search-empty">No matching documentation page.</div>';
      results.style.display = 'block';
      return [];
    }

    results.innerHTML = matches
      .slice(0, 6)
      .map(item => `<a href="${item.url}">${item.title}</a>`)
      .join('');
    results.style.display = 'block';
    return matches;
  }

  input.addEventListener('input', () => render(input.value));

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      const matches = render(input.value);
      if (matches.length > 0) {
        window.location.href = matches[0].url;
      }
    }
    if (event.key === 'Escape') {
      input.value = '';
      render('');
    }
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.top')) {
      results.style.display = 'none';
    }
  });
});
