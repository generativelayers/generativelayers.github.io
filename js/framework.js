(() => {
  const COMMANDS = [
    {
      id: 'configure', group: 'lifecycle', command: 'configure(key, value)', type: 'boolean',
      description: 'Set a configuration key-value pair before provider activation.',
      astra: 'rule +!main(list args) {\n    gl.configure("provider", "gemini");\n    gl.configure("model", "gemini-2.5-flash");\n    gl.use_provider();\n}',
      jason: '+!main <-\n    gl.configure("provider", "gemini");\n    gl.configure("model", "gemini-2.5-flash");\n    gl.use_provider().',
      jacamo: '+!main <-\n    configure("provider", "gemini");\n    configure("model", "gemini-2.5-flash");\n    use_provider().'
    },
    {
      id: 'use_provider', group: 'lifecycle', command: 'use_provider()', type: 'boolean',
      description: 'Activate the configured provider, or activate a named provider with optional model.',
      astra: 'rule +!main(list args) {\n    gl.use_provider("gemini");\n    gl.use_provider("gemini", "gemini-2.5-flash");\n}',
      jason: '+!main <-\n    gl.use_provider("gemini");\n    gl.use_provider("gemini", "gemini-2.5-flash").',
      jacamo: '+!main <-\n    use_provider("gemini");\n    use_provider("gemini", "gemini-2.5-flash").'
    },
    {
      id: 'providers', group: 'lifecycle', command: 'providers()', type: 'String',
      description: 'Return the available provider names as a comma-separated string.',
      astra: 'rule +!check_providers() {\n    string list = gl.providers();\n    console.println("Available: " + list);\n}',
      jason: '+!check_providers <-\n    gl.providers(List);\n    .print("Available: ", List).',
      jacamo: '+!check_providers <-\n    providers(List);\n    .print("Available: ", List).'
    },
    {
      id: 'invoke', group: 'invocation', command: 'invoke(agent, goal, body, affordance, prompt, requiredCsv)', type: 'String',
      description: 'Invoke a generative body and return a result identifier.',
      astra: 'rule +!request_support(string prompt) {\n    string rid = gl.invoke("agent1", "classify", "llm.answer", "ANSWER", prompt, "label");\n    !decide_result(rid);\n}',
      jason: '+!request_support(Prompt) <-\n    gl.invoke("agent1", "classify", "llm.answer", "ANSWER", Prompt, "label", Rid);\n    !decide_result(Rid).',
      jacamo: '+!request_support(Prompt) <-\n    invoke("agent1", "classify", "llm.answer", "ANSWER", Prompt, "label", Rid);\n    !decide_result(Rid).'
    },
    {
      id: 'invoke_with_beliefs', group: 'invocation', command: 'invoke_with_beliefs(...)', type: 'String',
      description: 'Invoke a generative body with selected agent beliefs prepended as grounded context.',
      astra: 'rule +!request_grounded(string prompt) {\n    string rid = gl.invoke_with_beliefs("agent1", "classify", "llm.answer", "ANSWER", prompt, "label", "known(fruit)");\n    !decide_result(rid);\n}',
      jason: '+!request_grounded(Prompt) <-\n    gl.invoke_with_beliefs("agent1", "classify", "llm.answer", "ANSWER", Prompt, "label", "known(fruit)", Rid);\n    !decide_result(Rid).',
      jacamo: '+!request_grounded(Prompt) <-\n    invoke_with_beliefs("agent1", "classify", "llm.answer", "ANSWER", Prompt, "label", "known(fruit)", Rid).'
    },
    {
      id: 'ask', group: 'invocation', command: 'ask(agent, goal, prompt)', type: 'String',
      description: 'Shorthand LLM request. It returns a result identifier for later validation and adoption.',
      astra: 'rule +!main(list args) {\n    string rid = gl.ask("agent1", "classify", "Classify: apple");\n    !validated(rid);\n}',
      jason: '+!main <-\n    gl.ask("agent1", "classify", "Classify: apple", Rid);\n    !validated(Rid).',
      jacamo: '+!main <-\n    ask("agent1", "classify", "Classify: apple", Rid);\n    !validated(Rid).'
    },
    {
      id: 'valid', group: 'decision', command: 'valid(resultId)', type: 'boolean',
      description: 'Check whether a result passed schema and governance validation.',
      astra: 'rule +!validated(string rid) : gl.valid(rid) == true {\n    gl.accept(gl.candidate(rid));\n}',
      jason: '+!validated(Rid)\n    : gl.valid(Rid, true)\n    <- gl.candidate(Rid, Cid);\n       gl.accept(Cid).',
      jacamo: '+!validated(Rid) <-\n    valid(Rid, IsValid);\n    !validated_branch(Rid, IsValid).'
    },
    {
      id: 'field', group: 'decision', command: 'field(resultId, name)', type: 'String',
      description: 'Extract a named field from a validated candidate result.',
      astra: 'rule +!validated(string rid) {\n    string label = gl.field(rid, "label");\n    console.println("Label: " + label);\n}',
      jason: '+!validated(Rid) <-\n    gl.field(Rid, "label", Label);\n    .print("Label: ", Label).',
      jacamo: '+!validated(Rid) <-\n    field(Rid, "label", Label);\n    .print("Label: ", Label).'
    },
    {
      id: 'candidate', group: 'decision', command: 'candidate(resultId)', type: 'String',
      description: 'Resolve the concrete candidate id associated with a result id.',
      astra: 'rule +!validated(string rid) {\n    string cid = gl.candidate(rid);\n    !decide_candidate(cid);\n}',
      jason: '+!validated(Rid) <-\n    gl.candidate(Rid, Cid);\n    !decide_candidate(Cid).',
      jacamo: '+!validated(Rid) <-\n    candidate(Rid, Cid);\n    !decide_candidate(Cid).'
    },
    {
      id: 'trace', group: 'invocation', command: 'trace(resultId)', type: 'String',
      description: 'Return the audit trace identifier associated with a request/result.',
      astra: 'rule +!audit(string rid) {\n    console.println("Trace: " + gl.trace(rid));\n}',
      jason: '+!audit(Rid) <-\n    gl.trace(Rid, Trace);\n    .print("Trace: ", Trace).',
      jacamo: '+!audit(Rid) <-\n    trace(Rid, Trace);\n    .print("Trace: ", Trace).'
    },
    {
      id: 'outcome', group: 'decision', command: 'outcome(resultId)', type: 'String',
      description: 'Read the raw or summarized outcome attached to a result.',
      astra: 'rule +!inspect(string rid) {\n    console.println(gl.outcome(rid));\n}',
      jason: '+!inspect(Rid) <-\n    gl.outcome(Rid, Outcome);\n    .print(Outcome).',
      jacamo: '+!inspect(Rid) <-\n    outcome(Rid, Outcome);\n    .print(Outcome).'
    },
    {
      id: 'knowledge', group: 'decision', command: 'knowledge(resultId)', type: 'String',
      description: 'Read generated knowledge material associated with a result.',
      astra: 'rule +!inspect(string rid) {\n    string k = gl.knowledge(rid);\n    console.println(k);\n}',
      jason: '+!inspect(Rid) <-\n    gl.knowledge(Rid, K);\n    .print(K).',
      jacamo: '+!inspect(Rid) <-\n    knowledge(Rid, K);\n    .print(K).'
    },
    {
      id: 'admissible', group: 'decision', command: 'admissible(candidateId)', type: 'boolean',
      description: 'Check whether a candidate may be adopted under the active governance rules.',
      astra: 'rule +!decide_candidate(string cid) : gl.admissible(cid) == true {\n    gl.accept(cid);\n}',
      jason: '+!decide_candidate(Cid)\n    : gl.admissible(Cid, true)\n    <- gl.accept(Cid).',
      jacamo: '+!decide_candidate(Cid) <-\n    admissible(Cid, IsAdmissible);\n    !admissible_branch(Cid, IsAdmissible).'
    },
    {
      id: 'accept', group: 'decision', command: 'accept(candidateId)', type: 'boolean',
      description: 'Promote candidate material to accepted material according to agent deliberation.',
      astra: 'rule +!decide_candidate(string cid) {\n    gl.accept(cid);\n    +accepted(cid);\n}',
      jason: '+!decide_candidate(Cid) <-\n    gl.accept(Cid);\n    +accepted(Cid).',
      jacamo: '+!decide_candidate(Cid) <-\n    accept(Cid);\n    +accepted(Cid).'
    },
    {
      id: 'reject', group: 'decision', command: 'reject(candidateId)', type: 'boolean',
      description: 'Reject candidate material and record the decision boundary.',
      astra: 'rule +!decide_candidate(string cid) {\n    gl.reject(cid);\n    +rejected(cid);\n}',
      jason: '+!decide_candidate(Cid) <-\n    gl.reject(Cid);\n    +rejected(Cid).',
      jacamo: '+!decide_candidate(Cid) <-\n    reject(Cid);\n    +rejected(Cid).'
    },
    {
      id: 'assess', group: 'decision', command: 'assess(candidateId, criterion)', type: 'String',
      description: 'Ask the governance layer to assess a candidate against a named criterion.',
      astra: 'rule +!review(string cid) {\n    string verdict = gl.assess(cid, "safety");\n    console.println(verdict);\n}',
      jason: '+!review(Cid) <-\n    gl.assess(Cid, "safety", Verdict);\n    .print(Verdict).',
      jacamo: '+!review(Cid) <-\n    assess(Cid, "safety", Verdict);\n    .print(Verdict).'
    }
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function badge(type) {
    const lower = String(type).toLowerCase();
    const cls = lower === 'boolean' ? 'badge-bool' : 'badge-str';
    return `<span class="${cls}">${escapeHtml(type)}</span>`;
  }

  function codeBlock(command, platform, label) {
    return `<div class="mini-code-block ${platform === 'astra' ? 'active' : ''}" id="code-${command.id}-${platform}"><pre><code><span class="comment">// ${label}</span>\n${escapeHtml(command[platform])}</code></pre></div>`;
  }

  function commandRow(command) {
    return `
      <tr class="cmd-row" id="row-${command.id}" data-group="${command.group}" onclick="toggleRow('${command.id}')">
        <td><code class="cmd-name">${escapeHtml(command.command)}</code><i class="fa-solid fa-chevron-down chevron-icon"></i></td>
        <td>${badge(command.type)}</td>
        <td>${command.description}</td>
        <td style="text-align:center"><button class="view-example-btn" type="button" title="View examples"><i class="fa-solid fa-eye"></i></button></td>
      </tr>
      <tr class="cmd-details-row" id="details-${command.id}" style="display:none">
        <td colspan="4" style="padding:0">
          <div class="cmd-details-content">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap">
              <span style="font-family:var(--font-heading);font-weight:700;font-size:12px;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.05em">Syntax & usage examples</span>
              <div class="mini-tabs">
                <button class="mini-tab-btn active" type="button" onclick="switchMiniTab(event,'${command.id}','astra')">ASTRA</button>
                <button class="mini-tab-btn" type="button" onclick="switchMiniTab(event,'${command.id}','jason')">Jason</button>
                <button class="mini-tab-btn" type="button" onclick="switchMiniTab(event,'${command.id}','jacamo')">JaCaMo</button>
              </div>
            </div>
            <div class="mini-code-container">
              ${codeBlock(command, 'astra', 'ASTRA')}
              ${codeBlock(command, 'jason', 'Jason')}
              ${codeBlock(command, 'jacamo', 'JaCaMo')}
            </div>
          </div>
        </td>
      </tr>`;
  }

  function renderCommands() {
    const section = document.getElementById('canonical-commands');
    if (!section || section.querySelector('.commands-table')) return;

    const note = section.querySelector('.note');
    const table = document.createElement('div');
    table.className = 'table-container';
    table.innerHTML = `
      <table class="commands-table">
        <colgroup>
          <col style="width:28%"><col style="width:12%"><col style="width:50%"><col style="width:10%">
        </colgroup>
        <thead>
          <tr><th>Command</th><th>Return Type</th><th>Description</th><th style="text-align:center">Usage</th></tr>
        </thead>
        <tbody>${COMMANDS.map(commandRow).join('')}</tbody>
      </table>`;

    if (note) section.insertBefore(table, note);
    else section.appendChild(table);
  }

  function renderSyntaxComparison() {
    if (document.getElementById('platform-syntax')) return;
    const main = document.querySelector('main.main');
    if (!main) return;

    const section = document.createElement('section');
    section.className = 'info-panel';
    section.id = 'platform-syntax';
    section.innerHTML = `
      <h2>Platform syntax comparison</h2>
      <p>The same governance lifecycle is expressed through each target platform's native extension style.</p>
      <div class="tabs-container">
        <div class="tabs-header">
          <div class="tabs-buttons">
            <button class="tab-btn active" type="button" data-target="syntax-astra">ASTRA</button>
            <button class="tab-btn" type="button" data-target="syntax-jason">Jason</button>
            <button class="tab-btn" type="button" data-target="syntax-jacamo">JaCaMo</button>
          </div>
        </div>
        <div class="tab-content active" id="syntax-astra"><pre><code>agent Main {
    module gl.astra.GL gl;
    module Console console;
    module astra.lang.System S;

    rule +!main(list args) {
        gl.configure("provider", "gemini");
        gl.configure("model", "gemini-2.5-flash");
        gl.use_provider();

        string rid = gl.ask("agent1", "classify", "Classify: apple");
        !decide_result(rid);
        S.exit();
    }

    rule +!decide_result(string rid) : gl.valid(rid) == true {
        string cid = gl.candidate(rid);
        gl.accept(cid);
        console.println("Accepted: " + gl.field(rid, "label"));
    }
}</code></pre></div>
        <div class="tab-content" id="syntax-jason"><pre><code>+!main <-
    gl.configure("provider", "gemini");
    gl.configure("model", "gemini-2.5-flash");
    gl.use_provider();
    gl.ask("agent1", "classify", "Classify: apple", Rid);
    !decide_result(Rid);
    .stopMAS.

+!decide_result(Rid)
   : gl.valid(Rid, true)
   <- gl.candidate(Rid, Cid);
      gl.accept(Cid);
      gl.field(Rid, "label", Label);
      .print("Accepted: ", Label).</code></pre></div>
        <div class="tab-content" id="syntax-jacamo"><pre><code>+!main <-
    makeArtifact("gl", "gl.jacamo.GL", [], Id);
    focus(Id);
    configure("provider", "gemini");
    configure("model", "gemini-2.5-flash");
    use_provider();
    ask("agent1", "classify", "Classify: apple", Rid);
    !decide_result(Rid);
    .stopMAS.

+!decide_result(Rid) <-
    valid(Rid, IsValid);
    !valid_branch(Rid, IsValid).</code></pre></div>
      </div>`;

    main.appendChild(section);
  }

  function renderArchitectureInternals() {
    if (document.getElementById('architecture-internals')) return;
    const main = document.querySelector('main.main');
    if (!main) return;

    const section = document.createElement('section');
    section.className = 'info-panel';
    section.id = 'architecture-internals';
    section.innerHTML = `
      <h2>Architecture internals</h2>
      <p>The public commands are backed by a small layered pipeline. These internals stay behind the adapter boundary.</p>
      <div class="concept-card card" id="concept-bodies" onclick="toggleConcept('bodies')">
        <div class="concept-header"><div class="concept-title-group"><h3 class="concept-title"><i class="fa-solid fa-cubes"></i> Generative Bodies &amp; Affordances</h3><p class="concept-desc">Registered body ids, affordance types, and candidate type mapping.</p></div><button class="concept-toggle-btn" type="button"><i class="fa-solid fa-eye"></i></button></div>
        <div class="concept-details" onclick="event.stopPropagation()"><p><code>llm.answer</code>, <code>rag.ground</code>, <code>planner.decompose</code>, <code>tool.propose</code>, <code>memory.retrieve</code>, and <code>reflect.critique</code> are examples of internal bodies that can produce governed candidate material.</p></div>
      </div>
      <div class="concept-card card" id="concept-pipeline" onclick="toggleConcept('pipeline')">
        <div class="concept-header"><div class="concept-title-group"><h3 class="concept-title"><i class="fa-solid fa-arrows-spin"></i> Governance Pipeline</h3><p class="concept-desc">Policy gate, provider call, validation, candidate material, and audit trace.</p></div><button class="concept-toggle-btn" type="button"><i class="fa-solid fa-eye"></i></button></div>
        <div class="concept-details" onclick="event.stopPropagation()"><ol><li>Policy/admissibility check.</li><li>Provider invocation.</li><li>Schema and rule validation.</li><li>Candidate material exposure.</li><li>Explicit accept/reject by the agent.</li></ol></div>
      </div>`;

    main.appendChild(section);
  }

  function installTabHandlers() {
    document.addEventListener('click', event => {
      const tab = event.target.closest('.tab-btn[data-target]');
      if (!tab) return;
      const container = tab.closest('.tabs-container');
      if (!container) return;
      container.querySelectorAll('.tab-btn').forEach(button => button.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(panel => panel.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.add('active');
    });
  }

  function installFilters() {
    document.querySelectorAll('.filter-btn').forEach(button => {
      button.addEventListener('click', () => {
        const group = button.dataset.group || 'all';
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        document.querySelectorAll('.cmd-row').forEach(row => {
          const show = group === 'all' || row.dataset.group === group;
          row.style.display = show ? '' : 'none';
          const details = document.getElementById(row.id.replace('row-', 'details-'));
          if (details && !show) details.style.display = 'none';
        });
      });
    });
  }

  window.toggleRow = function toggleRow(id) {
    const row = document.getElementById(`row-${id}`);
    const details = document.getElementById(`details-${id}`);
    if (!row || !details) return;
    const isOpen = details.style.display !== 'none';
    details.style.display = isOpen ? 'none' : 'table-row';
    details.classList.toggle('open', !isOpen);
    row.classList.toggle('expanded', !isOpen);
  };

  window.switchMiniTab = function switchMiniTab(event, id, platform) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const details = document.getElementById(`details-${id}`);
    if (!details) return;
    details.querySelectorAll('.mini-tab-btn').forEach(btn => btn.classList.remove('active'));
    details.querySelectorAll('.mini-code-block').forEach(block => block.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    const block = document.getElementById(`code-${id}-${platform}`);
    if (block) block.classList.add('active');
  };

  window.scrollToCommand = function scrollToCommand(rowId) {
    const target = document.getElementById(rowId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('flash-highlight');
    window.setTimeout(() => target.classList.remove('flash-highlight'), 3000);
  };

  window.toggleConcept = function toggleConcept(id) {
    const card = document.getElementById(`concept-${id}`);
    if (!card) return;
    card.classList.toggle('expanded');
  };

  function init() {
    renderCommands();
    renderSyntaxComparison();
    renderArchitectureInternals();
    installFilters();
    installTabHandlers();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
