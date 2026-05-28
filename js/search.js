/* ================================================================
   Generative Layers — Search & Mobile Menu
   ================================================================ */

const searchIndex = [
  { title: 'Introduction', url: 'index.html', text: 'Generative Layers Java framework governed generative resource layers agent systems ASTRA Jason JaCaMo CArtAgO adapters integrations BDI languages MAS frameworks email' },
  { title: 'Framework', url: 'framework.html', text: 'request path adapter governance provider candidate material design rules beliefs plans actions LLM tools APIs services' },
  { title: 'Research', url: 'research.html', text: 'research problem questions contribution thesis BDI agents multi agent systems University College Dublin Rem Collier Dimitrios Kyriakidis ASTRA' },
  { title: 'Repositories', url: 'repositories.html', text: 'framework examples docs GitHub Java ASTRA Jason JaCaMo CArtAgO' }
];

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Search ---- */
  const input = document.querySelector('.search');
  if (input) {
    const wrapper = input.closest('.search-wrapper');
    const results = document.createElement('div');
    results.className = 'search-results';
    wrapper.appendChild(results);

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
        .slice(0, 5)
        .map(item => `<a href="${item.url}">${item.title}</a>`)
        .join('');
      results.style.display = 'block';
      return matches;
    }

    input.addEventListener('input', () => render(input.value));

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        const matches = render(input.value);
        if (matches.length > 0) window.location.href = matches[0].url;
      }
      if (event.key === 'Escape') {
        input.value = '';
        render('');
        input.blur();
      }
    });

    document.addEventListener('click', event => {
      if (!event.target.closest('.search-wrapper')) {
        results.style.display = 'none';
      }
    });
  }

  /* ---- Mobile sidebar toggle ---- */
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

    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    // Close on Escape
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeSidebar();
    });
  }
});
