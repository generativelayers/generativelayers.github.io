(() => {
  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'discovery', label: 'Discovery' },
    { id: 'invocation', label: 'Invocation' },
    { id: 'inspection', label: 'Inspection' },
    { id: 'assessment', label: 'Assessment' },
    { id: 'decision', label: 'Decision' },
    { id: 'knowledge', label: 'Knowledge / Audit' }
  ];

  const COMMAND_GROUPS = {
    see: 'discovery',
    bind: 'discovery',
    call: 'invocation',
    result: 'invocation',
    candidate: 'invocation',
    check: 'inspection',
    get: 'inspection',
    judge: 'assessment',
    decide: 'assessment',
    accept: 'decision',
    reject: 'decision',
    knowledge: 'knowledge',
    explain: 'knowledge'
  };

  function commandIdFromRow(row) {
    return (row.id || '').replace(/^row-/, '');
  }

  function closeDetailsFor(row) {
    const id = commandIdFromRow(row);
    const details = document.getElementById(`details-${id}`);
    const constraints = document.getElementById(`constraints-${id}`);

    row.classList.remove('expanded', 'constraints-open');

    [details, constraints].forEach(panel => {
      if (!panel) return;
      panel.classList.remove('open', 'filter-hidden');
      panel.hidden = true;
      panel.style.setProperty('display', 'none', 'important');
    });
  }

  function showRow(row, show) {
    row.classList.toggle('filter-hidden', !show);
    row.hidden = !show;

    if (show) {
      row.style.removeProperty('display');
    } else {
      row.style.setProperty('display', 'none', 'important');
      closeDetailsFor(row);
    }
  }

  function applyFilter(group) {
    const section = document.getElementById('canonical-commands');
    if (!section) return;

    section.querySelectorAll('.cmd-row').forEach(row => {
      const show = group === 'all' || row.dataset.group === group;
      showRow(row, show);
    });
  }

  function setGroups(section) {
    section.querySelectorAll('.cmd-row').forEach(row => {
      const id = commandIdFromRow(row);
      if (COMMAND_GROUPS[id]) row.dataset.group = COMMAND_GROUPS[id];
    });
  }

  function renderFilterButtons(container) {
    container.innerHTML = FILTERS.map(filter => (
      `<button class="filter-btn${filter.id === 'all' ? ' active' : ''}" type="button" data-group="${filter.id}">${filter.label}</button>`
    )).join('');
  }

  function install() {
    const section = document.getElementById('canonical-commands');
    if (!section || !section.querySelector('.commands-table')) return false;

    const filters = section.querySelector('.command-filters');
    if (!filters) return false;

    setGroups(section);
    renderFilterButtons(filters);

    filters.addEventListener('click', event => {
      const button = event.target.closest('.filter-btn[data-group]');
      if (!button) return;
      event.preventDefault();

      filters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      applyFilter(button.dataset.group || 'all');
    });

    applyFilter('all');
    return true;
  }

  function init() {
    if (install()) return;
    window.setTimeout(install, 100);
    window.setTimeout(install, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
