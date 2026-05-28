async function loadLayout() {
  const layoutTarget = document.getElementById('site-layer');
  const contentTarget = document.getElementById('page-content');
  if (!layoutTarget || !contentTarget) return;

  const response = await fetch('layout.html', { cache: 'no-cache' });
  const html = await response.text();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  const headerTemplate = wrapper.querySelector('#gl-header');
  const navTemplate = wrapper.querySelector('#gl-nav');

  const header = headerTemplate.content.cloneNode(true);
  const nav = navTemplate.content.cloneNode(true);

  const activePage = document.body.dataset.page;
  nav.querySelectorAll('a').forEach(link => {
    if (link.dataset.page === activePage) link.classList.add('active');
  });

  const layout = document.createElement('div');
  layout.className = 'layout';

  const side = document.createElement('aside');
  side.className = 'side';
  side.appendChild(nav);

  const main = document.createElement('main');
  main.className = 'main';
  main.append(...Array.from(contentTarget.childNodes));

  layout.appendChild(side);
  layout.appendChild(main);

  layoutTarget.appendChild(header);
  layoutTarget.appendChild(layout);
  contentTarget.remove();

  if (window.initSearch) window.initSearch();
}

document.addEventListener('DOMContentLoaded', loadLayout);
