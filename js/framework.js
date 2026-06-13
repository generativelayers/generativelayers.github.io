(() => {
  const COMMANDS = [
    {
      id: 'see', group: 'lifecycle', command: 'see()', type: 'String',
      description: 'Discover available providers and their status.',
      astra: 'rule +!discover() {\n    console.println(gl.see());\n}',
      jason: '+!discover <-\n    gl.see(X);\n    .print("Providers: ", X).',
      jacamo: '+!discover <-\n    see(X);\n    .print("Providers: ", X).'
    },
    {
      id: 'bind', group: 'lifecycle', command: 'bind(agent, provider, model, config)', type: 'String',
      description: 'Bind an agent to a provider/model with configuration. Returns a binding ID.',
      astra: 'rule +!main(list args) {\n    !request_support(gl.bind("agent1", "gemini", "gemini-2.5-flash", ""));\n}',
      jason: '+!main <-\n    gl.bind("agent1", "gemini", "gemini-2.5-flash", "", Bid);\n    !request_support(Bid).',
      jacamo: '+!main <-\n    bind("agent1", "gemini", "gemini-2.5-flash", "", Bid);\n    !request_support(Bid).'
    },
    {
      id: 'call', group: 'invocation', command: 'call(bindingId, goal, body, affordance, prompt, fields, context)', type: 'String',
      description: 'Perform one governed LLM invocation. Returns a result ID.',
      astra: 'rule +!request_support(string bid) {\n    !decide_result(gl.call(bid, "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", ""));\n}',
      jason: '+!request_support(Bid) <-\n    gl.call(Bid, "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", "", Rid);\n    !decide_result(Rid).',
      jacamo: '+!request_support(Bid) <-\n    call(Bid, "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", "", Rid);\n    !decide_result(Rid).'
    },
    {
      id: 'result', group: 'invocation', command: 'result(resultId)', type: 'String',
      description: 'Inspect the invocation outcome: SUCCESS, INVALID_OUTPUT, PROVIDER_FAILED, or GOVERNANCE_DENIED.',
      astra: 'rule +!check_result(string rid) {\n    !process_outcome(gl.result(rid), rid);\n}',
      jason: '+!check_result(Rid) <-\n    gl.result(Rid, R);\n    .print("Result: ", R).',
      jacamo: '+!check_result(Rid) <-\n    result(Rid, R);\n    .print("Result: ", R).'
    },
    {
      id: 'candidate', group: 'decision', command: 'candidate(resultId)', type: 'String',
      description: 'Get the candidate ID from a result. Crosses the ontological boundary into governed material.',
      astra: 'rule +!decide_result(string rid) {\n    !decide_candidate(gl.candidate(rid));\n}',
      jason: '+!decide_result(Rid) <-\n    gl.candidate(Rid, Cid);\n    !decide_candidate(Cid).',
      jacamo: '+!decide_result(Rid) <-\n    candidate(Rid, Cid);\n    !decide_candidate(Cid).'
    },
    {
      id: 'check', group: 'decision', command: 'check(refId)', type: 'String',
      description: 'Check governance state of a result or candidate (validation status, lifecycle status).',
      astra: 'rule +!inspect(string rid) {\n    !verify_governance(gl.check(rid), rid);\n}',
      jason: '+!inspect(Rid) <-\n    gl.check(Rid, S);\n    .print("Status: ", S).',
      jacamo: '+!inspect(Rid) <-\n    check(Rid, S);\n    .print("Status: ", S).'
    },
    {
      id: 'get', group: 'decision', command: 'get(candidateId, field)', type: 'String',
      description: 'Extract a named field value from candidate material.',
      astra: 'rule +!extract_label(string cid) {\n    +label(gl.get(cid, "label"));\n}',
      jason: '+!inspect_field(Cid) <-\n    gl.get(Cid, "label", Label);\n    .print("Label: ", Label).',
      jacamo: '+!inspect_field(Cid) <-\n    get(Cid, "label", Label);\n    .print("Label: ", Label).'
    },
    {
      id: 'judge', group: 'decision', command: 'judge(candidateId, assessor, verdict, confidence, rationale)', type: 'String',
      description: 'Record evaluative evidence about a candidate. Returns an assessment ID.',
      astra: 'rule +!review(string cid) {\n    gl.judge(cid, "reviewer", "APPROVE", "0.9", "looks correct");\n}',
      jason: '+!review(Cid) <-\n    gl.judge(Cid, "reviewer", "APPROVE", "0.9", "looks correct", Aid);\n    .print("Assessment: ", Aid).',
      jacamo: '+!review(Cid) <-\n    judge(Cid, "reviewer", "APPROVE", "0.9", "looks correct", Aid);\n    .print("Assessment: ", Aid).'
    },
    {
      id: 'decide', group: 'decision', command: 'decide(candidateId)', type: 'String',
      description: 'Compute admissibility (read-only preview). Returns ADMISSIBLE, INADMISSIBLE:reason, or FINAL:status.',
      astra: 'rule +!check_admissibility(string cid) {\n    !route_decision(gl.decide(cid), cid);\n}',
      jason: '+!check_admissibility(Cid) <-\n    gl.decide(Cid, Adm);\n    .print("Admissibility: ", Adm).',
      jacamo: '+!check_admissibility(Cid) <-\n    decide(Cid, Adm);\n    .print("Admissibility: ", Adm).'
    },
    {
      id: 'accept', group: 'decision', command: 'accept(candidateId, reason)', type: 'String',
      description: 'Record a positive decision. Requires admissibility. Returns a decision ID.',
      astra: 'rule +!decide_candidate(string cid) {\n    gl.accept(cid, "valid classification");\n    +accepted(cid);\n}',
      jason: '+!decide_candidate(Cid) <-\n    gl.accept(Cid, "valid classification", Did);\n    +accepted(Cid).',
      jacamo: '+!decide_candidate(Cid) <-\n    accept(Cid, "valid classification", Did);\n    +accepted(Cid).'
    },
    {
      id: 'reject', group: 'decision', command: 'reject(candidateId, reason)', type: 'String',
      description: 'Record a negative decision. Always allowed. Returns a decision ID.',
      astra: 'rule +!decide_candidate(string cid) {\n    gl.reject(cid, "output is incorrect");\n    +rejected(cid);\n}',
      jason: '+!decide_candidate(Cid) <-\n    gl.reject(Cid, "output is incorrect", Did);\n    +rejected(Cid).',
      jacamo: '+!decide_candidate(Cid) <-\n    reject(Cid, "output is incorrect", Did);\n    +rejected(Cid).'
    },
    {
      id: 'knowledge', group: 'decision', command: 'knowledge(agentId)', type: 'String',
      description: 'Retrieve all accepted GL-side knowledge for an agent. Can be passed as context to future calls.',
      astra: 'rule +!recall(string agent) {\n    +context(gl.knowledge(agent));\n}',
      jason: '+!get_knowledge <-\n    gl.knowledge("agent1", K);\n    .print(K).',
      jacamo: '+!get_knowledge <-\n    knowledge("agent1", K);\n    .print(K).'
    },
    {
      id: 'explain', group: 'invocation', command: 'explain(refId)', type: 'String',
      description: 'Audit and trace any lifecycle object: result, candidate, assessment, decision, trace, or binding.',
      astra: 'rule +!audit(string ref) {\n    console.println(gl.explain(ref));\n}',
      jason: '+!audit(Ref) <-\n    gl.explain(Ref, E);\n    .print(E).',
      jacamo: '+!audit(Ref) <-\n    explain(Ref, E);\n    .print(E).'
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
    return `<div class="mini-code-block ${platform === 'astra' ? 'active' : ''}" id="code-${command.id}-${platform}"><pre data-gl-run-ready="1"><code><span class="comment">// ${label}</span>\n${escapeHtml(command[platform])}</code></pre></div>`;
  }

  function commandRow(command) {
    return `
      <tr class="cmd-row" id="row-${command.id}" data-group="${command.group}" onclick="toggleRow('${command.id}')">
        <td><code class="cmd-name">${escapeHtml(command.command)}</code></td>
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
          <col style="width:38%"><col style="width:90px"><col style="width:auto"><col style="width:70px">
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
    module System S;

    rule +!main(list args) {
        !decided(gl.call(gl.bind("agent1", "gemini", "gemini-2.5-flash", ""), "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", ""));
        !shutdown();
    }

    rule +!decided(string rid) {
        gl.accept(gl.candidate(rid), "valid classification");
        console.println("Accepted: " + gl.get(gl.candidate(rid), "label"));
    }

    rule +!shutdown() {
        S.exit();
    }
}</code></pre></div>
        <div class="tab-content" id="syntax-jason"><pre><code>+!start <-
    gl.bind("agent1", "gemini", "gemini-2.5-flash", "", Bid);
    gl.call(Bid, "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", "", Rid);
    gl.candidate(Rid, Cid);
    gl.get(Cid, "label", Label);
    gl.accept(Cid, "valid classification", Did);
    .print("Accepted: ", Label).</code></pre></div>
        <div class="tab-content" id="syntax-jacamo"><pre><code>+!start <-
    makeArtifact("gl", "gl.adapter.jacamo.JaCaMoAdapter", [], Id);
    focus(Id);
    bind("agent1", "gemini", "gemini-2.5-flash", "", Bid);
    call(Bid, "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", "", Rid);
    candidate(Rid, Cid);
    get(Cid, "label", Label);
    accept(Cid, "valid classification", Did);
    .print("Accepted: ", Label).</code></pre></div>
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