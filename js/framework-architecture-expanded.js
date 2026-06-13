(() => {
  function restoreArchitectureInternals() {
    const section = document.getElementById('architecture-internals');
    if (!section) return;
    section.innerHTML = `
      <h2>Architecture internals</h2>
      <p>The public commands are backed by the full framework architecture: native adapters, resource bodies, provider registry, request pipeline, candidate store, audit trace, and explicit agent adoption.</p>
      <div class="concept-card card" id="concept-platform-adapters" onclick="toggleConcept('platform-adapters')">
        <div class="concept-header"><div class="concept-title-group"><h3 class="concept-title">Platform Integration Adapters</h3><p class="concept-desc">ASTRA, Jason, and JaCaMo expose the same contract through native platform mechanisms.</p></div><button class="concept-toggle-btn" type="button"><i class="fa-solid fa-eye"></i></button></div>
        <div class="concept-details"><ul><li>ASTRA uses a Java module imported as <code>module gl.astra.GL gl;</code>.</li><li>Jason uses AgentSpeak internal actions with the <code>gl.</code> prefix.</li><li>JaCaMo uses a CArtAgO artifact focused by the agent.</li></ul></div>
      </div>
      <div class="concept-card card" id="concept-bodies" onclick="toggleConcept('bodies')">
        <div class="concept-header"><div class="concept-title-group"><h3 class="concept-title">Generative Bodies &amp; Affordances</h3><p class="concept-desc">Registered body ids, affordance types, and candidate type mapping.</p></div><button class="concept-toggle-btn" type="button"><i class="fa-solid fa-eye"></i></button></div>
        <div class="concept-details"><p><code>llm.answer</code>, <code>rag.ground</code>, <code>planner.decompose</code>, <code>tool.propose</code>, <code>memory.retrieve</code>, and <code>reflect.critique</code> are internal body examples.</p></div>
      </div>
      <div class="concept-card card" id="concept-provider-registry" onclick="toggleConcept('provider-registry')">
        <div class="concept-header"><div class="concept-title-group"><h3 class="concept-title">Provider Registry</h3><p class="concept-desc">Built-in and custom providers are selected without changing the agent program structure.</p></div><button class="concept-toggle-btn" type="button"><i class="fa-solid fa-eye"></i></button></div>
        <div class="concept-details"><ul><li>Gemini has a native provider.</li><li>Groq, Cerebras, OpenAI, DeepSeek, and compatible endpoints use the Chat Completions provider.</li><li>Custom endpoints are configured by endpoint, model, provider name, and key environment name.</li></ul></div>
      </div>
      <div class="concept-card card" id="concept-governance-pipeline" onclick="toggleConcept('governance-pipeline')">
        <div class="concept-header"><div class="concept-title-group"><h3 class="concept-title">Governance Pipeline</h3><p class="concept-desc">Request check, provider call, validation, candidate exposure, and decision.</p></div><button class="concept-toggle-btn" type="button"><i class="fa-solid fa-eye"></i></button></div>
        <div class="concept-details"><ol><li>Check request admissibility.</li><li>Invoke the configured provider.</li><li>Validate schema and active rules.</li><li>Expose candidate material through result ids and fields.</li><li>Let the agent explicitly accept, reject, escalate, or ignore the candidate.</li></ol></div>
      </div>
      <div class="concept-card card" id="concept-candidate-store" onclick="toggleConcept('candidate-store')">
        <div class="concept-header"><div class="concept-title-group"><h3 class="concept-title">Candidate Store &amp; Inspection</h3><p class="concept-desc">Generated output stays isolated until the agent explicitly adopts it.</p></div><button class="concept-toggle-btn" type="button"><i class="fa-solid fa-eye"></i></button></div>
        <div class="concept-details"><ul><li><code>call()</code> returns a result id.</li><li><code>candidate()</code> resolves candidate id.</li><li><code>get()</code> reads structured values.</li><li><code>result()</code> reads invocation outcome and failures.</li></ul></div>
      </div>
    `;
  }

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
      panel.classList.remove('open');
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

  function installCommandFilters() {
    const section = document.getElementById('canonical-commands');
    if (!section || !section.querySelector('.commands-table')) return false;

    const filters = section.querySelector('.command-filters');
    if (!filters) return false;

    section.querySelectorAll('.cmd-row').forEach(row => {
      const id = commandIdFromRow(row);
      if (COMMAND_GROUPS[id]) row.dataset.group = COMMAND_GROUPS[id];
    });

    filters.innerHTML = FILTERS.map(filter => (
      `<button class="filter-btn${filter.id === 'all' ? ' active' : ''}" type="button" data-group="${filter.id}">${filter.label}</button>`
    )).join('');

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
    restoreArchitectureInternals();
    if (installCommandFilters()) return;
    window.setTimeout(installCommandFilters, 100);
    window.setTimeout(installCommandFilters, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
