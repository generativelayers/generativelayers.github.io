(() => {
  const COMMANDS = [
    {
      id: 'see', group: 'lifecycle', command: 'see()', type: 'String',
      description: 'Discover available providers and their status.',
      constraints: {
        pre: ['None — always callable.'],
        post: ['Returns <code>name=X,status=usable</code> per registered provider, or <code>EMPTY</code> if none exist.', 'Status resolved from env var <code>PROVIDER_API_KEY</code>.']
      },
      astra: 'rule +!discover() {\n    console.println(gl.see());\n}',
      jason: '+!discover <-\n    gl.see(X);\n    .print("Providers: ", X).',
      jacamo: '+!discover <-\n    see(X);\n    .print("Providers: ", X).'
    },
    {
      id: 'bind', group: 'lifecycle', command: 'bind(agent, provider, model, config)', type: 'String',
      description: 'Bind an agent to a provider/model with configuration. Returns a binding ID.',
      constraints: {
        pre: ['<code>agent</code> and <code>provider</code> must be non-blank.', 'Provider must exist in <code>ProviderRegistry</code>.'],
        post: ['Creates an isolated <code>ProviderBinding</code> with its own <code>GovernanceKernel</code> and standard body registry.', 'Returns <code>bind_*</code> ID.'],
        life: ['Creates new binding record. All 6 standard bodies are registered automatically.'],
        err: ['<code>ERROR:missing_agent_id</code>', '<code>ERROR:missing_provider</code>', '<code>ERROR:unknown_provider</code>']
      },
      astra: 'rule +!main(list args) {\n    !request_support(gl.bind("agent1", "gemini", "gemini-2.5-flash", ""));\n}',
      jason: '+!main <-\n    gl.bind("agent1", "gemini", "gemini-2.5-flash", "", Bid);\n    !request_support(Bid).',
      jacamo: '+!main <-\n    bind("agent1", "gemini", "gemini-2.5-flash", "", Bid);\n    !request_support(Bid).'
    },
    {
      id: 'call', group: 'invocation', command: 'call(bindingId, goal, body, affordance, prompt, fields, context)', type: 'String',
      description: 'Perform one governed LLM invocation. Returns a result ID.',
      constraints: {
        pre: ['<code>bindingId</code> must reference a valid binding.', '<code>affordance</code> must be a valid <code>BodyAffordance</code> enum: <code>ANSWER</code>, <code>CLASSIFY</code>, <code>SUMMARISE</code>, <code>GROUND_FACT</code>, <code>DECOMPOSE_GOAL</code>, <code>PROPOSE_TOOL_CALL</code>, <code>PROPOSE_ACTION</code>, <code>RETRIEVE_MEMORY</code>, <code>REFLECT</code>, <code>CRITIQUE</code>, <code>ASSESS</code>, <code>EXPLAIN</code>, <code>ESCALATE</code>.', '<code>body</code> must be registered in the binding\'s body registry AND support the requested affordance.'],
        post: ['Executes the full governance pipeline: <em>policy gate → provider call → output validation → candidate creation</em>.', 'Returns <code>res_*</code> ID. A matching <code>cand_*</code> is created on success.'],
        life: ['Creates <code>res_*</code>, <code>cand_*</code>, <code>trace_*</code>, and blob records.', 'Hidden policy gate: prompts &gt; 20,000 chars are denied by default policy.', 'Body → affordance mapping: <code>llm.answer</code> → ANSWER, CLASSIFY, SUMMARISE · <code>rag.ground</code> → GROUND_FACT, SUMMARISE, EXPLAIN · <code>planner.decompose</code> → DECOMPOSE_GOAL · <code>tool.propose</code> → PROPOSE_TOOL_CALL, PROPOSE_ACTION · <code>memory.retrieve</code> → RETRIEVE_MEMORY · <code>reflect.critique</code> → REFLECT, CRITIQUE, EXPLAIN.'],
        err: ['<code>ERROR:unknown_binding</code>', '<code>ERROR:invalid_affordance</code> — lists allowed values', '<code>ERROR:unknown_body</code> — lists registered bodies', '<code>ERROR:unsupported_affordance</code> — lists allowed affordances for that body']
      },
      astra: 'rule +!request_support(string bid) {\n    !decide_result(gl.call(bid, "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", ""));\n}',
      jason: '+!request_support(Bid) <-\n    gl.call(Bid, "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", "", Rid);\n    !decide_result(Rid).',
      jacamo: '+!request_support(Bid) <-\n    call(Bid, "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", "", Rid);\n    !decide_result(Rid).'
    },
    {
      id: 'result', group: 'invocation', command: 'result(resultId)', type: 'String',
      description: 'Inspect the invocation outcome: SUCCESS, INVALID_OUTPUT, PROVIDER_FAILED, or GOVERNANCE_DENIED.',
      constraints: {
        pre: ['<code>resultId</code> must exist in the result store.'],
        post: ['Returns the outcome enum name: <code>SUCCESS</code>, <code>INVALID_OUTPUT</code>, <code>PROVIDER_FAILED</code>, <code>GOVERNANCE_DENIED</code>, <code>GOVERNANCE_ESCALATED</code>, or <code>STORED_ONLY</code>.'],
        life: ['Read-only — no state mutation.'],
        err: ['<code>ERROR:not_found</code>']
      },
      astra: 'rule +!check_result(string rid) {\n    !process_outcome(gl.result(rid), rid);\n}',
      jason: '+!check_result(Rid) <-\n    gl.result(Rid, R);\n    .print("Result: ", R).',
      jacamo: '+!check_result(Rid) <-\n    result(Rid, R);\n    .print("Result: ", R).'
    },
    {
      id: 'candidate', group: 'decision', command: 'candidate(resultId)', type: 'String',
      description: 'Get the candidate ID from a result. Crosses the ontological boundary into governed material.',
      constraints: {
        pre: ['<code>resultId</code> must exist AND have produced a non-blank candidate ID.'],
        post: ['Returns <code>cand_*</code> ID.', 'A result without a candidate means the provider failed or governance denied <em>before</em> material was produced.'],
        life: ['Read-only — the candidate already exists from the <code>call()</code> pipeline.'],
        err: ['<code>ERROR:not_found</code> — result does not exist', '<code>ERROR:no_candidate</code> — result exists but has no candidate']
      },
      astra: 'rule +!decide_result(string rid) {\n    !decide_candidate(gl.candidate(rid));\n}',
      jason: '+!decide_result(Rid)\n   :  gl.candidate(Rid, Cid)\n   <- !decide_candidate(Cid).',
      jacamo: '+!decide_result(Rid)\n   :  candidate(Rid, Cid)\n   <- !decide_candidate(Cid).'
    },
    {
      id: 'check', group: 'decision', command: 'check(refId)', type: 'String',
      description: 'Check governance state of a result or candidate (validation status, lifecycle status).',
      constraints: {
        pre: ['<code>refId</code> must start with <code>res_</code> or <code>cand_</code>.'],
        post: ['For results: <code>RESULT:VALID</code>, <code>RESULT:INVALID:missing=field1,field2</code>, or <code>RESULT:UNKNOWN</code>.', 'For candidates: <code>CANDIDATE:STATUS=</code> + lifecycle status name.'],
        life: ['Read-only — reports current state without mutation.'],
        err: ['<code>ERROR:missing_reference</code>', '<code>ERROR:not_found</code>', '<code>ERROR:check_only_supports:res_*,cand_*</code>']
      },
      astra: 'rule +!inspect(string rid) {\n    !verify_governance(gl.check(rid), rid);\n}',
      jason: '+!inspect(Rid) <-\n    gl.check(Rid, S);\n    .print("Status: ", S).',
      jacamo: '+!inspect(Rid) <-\n    check(Rid, S);\n    .print("Status: ", S).'
    },
    {
      id: 'get', group: 'decision', command: 'get(candidateId, field)', type: 'String',
      description: 'Extract a named field value from candidate material.',
      constraints: {
        pre: ['<code>candidateId</code> must exist.', '<code>field</code> must be non-blank.'],
        post: ['3-level field resolution: exact match → case-insensitive → alias fallback.', 'Alias: <code>"answer"</code> maps to the first field if the candidate has exactly one field.'],
        life: ['Read-only — extracts but does not modify candidate.'],
        err: ['<code>ERROR:missing_candidate_id</code>', '<code>ERROR:missing_field_name</code>', '<code>ERROR:not_found</code>', '<code>ERROR:missing_field</code>']
      },
      astra: 'rule +!extract_label(string cid) {\n    +label(gl.get(cid, "label"));\n}',
      jason: '+!inspect_field(Cid) <-\n    gl.get(Cid, "label", Label);\n    .print("Label: ", Label).',
      jacamo: '+!inspect_field(Cid) <-\n    get(Cid, "label", Label);\n    .print("Label: ", Label).'
    },
    {
      id: 'judge', group: 'decision', command: 'judge(candidateId, assessor, verdict, confidence, rationale)', type: 'String',
      description: 'Record evaluative evidence about a candidate. Returns an assessment ID.',
      constraints: {
        pre: ['Candidate must exist and NOT be in a final state (<code>ACCEPTED_BY_AGENT</code> / <code>REJECTED_BY_AGENT</code>).', '<code>INVALID</code> candidates cannot be assessed — they must be rejected, not rehabilitated.', '<code>verdict</code> must be: <code>APPROVE</code>, <code>WARN</code>, <code>REJECT_VERDICT</code>, or <code>UNCERTAIN</code>.', '<code>confidence</code> must be in <code>[0.0, 1.0]</code>.', '<code>rationale</code> must be non-blank.'],
        post: ['Stores an <code>Assessment</code> record. Returns <code>assess_*</code> ID.'],
        life: ['Transitions candidate status: <code>VALIDATED → ASSESSED</code>.', 'Assessment evidence is used by <code>decide()</code> to compute admissibility.', '<em>A <code>REJECT_VERDICT</code> with confidence ≥ 0.5 will make the candidate inadmissible.</em>'],
        err: ['<code>ERROR:already_decided</code> — finality guard prevents post-decision assessment', '<code>ERROR:not_assessable:INVALID</code> — invalid candidates cannot be rehabilitated', '<code>ERROR:invalid_verdict</code> — lists allowed verdicts', '<code>ERROR:invalid_confidence</code> — must be 0.0–1.0']
      },
      astra: 'rule +!review(string cid) {\n    gl.judge(cid, "reviewer", "APPROVE", "0.9", "looks correct");\n}',
      jason: '+!review(Cid) <-\n    gl.judge(Cid, "reviewer", "APPROVE", "0.9", "looks correct", Aid);\n    .print("Assessment: ", Aid).',
      jacamo: '+!review(Cid) <-\n    judge(Cid, "reviewer", "APPROVE", "0.9", "looks correct", Aid);\n    .print("Assessment: ", Aid).'
    },
    {
      id: 'decide', group: 'decision', command: 'decide(candidateId)', type: 'String',
      description: 'Compute admissibility (read-only preview). Returns ADMISSIBLE, INADMISSIBLE:reason, or FINAL:status.',
      constraints: {
        pre: ['Candidate must exist.'],
        post: ['If undecided: returns <code>ADMISSIBLE</code> or <code>INADMISSIBLE:reason</code>.', 'If already decided: returns <code>FINAL:status:decisionId</code>.'],
        life: ['<em>Read-only — does not modify state.</em>', 'Admissibility rules: (1) candidate must be <code>VALIDATED</code> or <code>ASSESSED</code>, (2) any assessment with <code>REJECT_VERDICT</code> and confidence ≥ 0.5 blocks admissibility, (3) otherwise admissible.']
      },
      astra: 'rule +!check_admissibility(string cid) {\n    !route_decision(gl.decide(cid), cid);\n}',
      jason: '+!check_admissibility(Cid) <-\n    gl.decide(Cid, Adm);\n    .print("Admissibility: ", Adm).',
      jacamo: '+!check_admissibility(Cid) <-\n    decide(Cid, Adm);\n    .print("Admissibility: ", Adm).'
    },
    {
      id: 'accept', group: 'decision', command: 'accept(candidateId, reason)', type: 'String',
      description: 'Record a positive decision. Requires admissibility. Returns a decision ID.',
      constraints: {
        pre: ['Candidate must exist and NOT already be decided.', 'Candidate MUST be admissible — <em>enforced at both adapter and kernel level</em>.', '<code>reason</code> must be non-blank.'],
        post: ['Records an <code>ACCEPTED</code> decision. Returns <code>dec_*</code> ID.'],
        life: ['Transitions candidate to <code>ACCEPTED_BY_AGENT</code> — <em>terminal state, no reversal</em>.', 'Accepted candidate fields become available via <code>knowledge()</code>.'],
        err: ['<code>ERROR:already_decided</code> — includes the existing decision ID', '<code>ERROR:not_admissible:reason</code> — candidate failed admissibility check']
      },
      astra: 'rule +!decide_candidate(string cid) {\n    gl.accept(cid, "valid classification");\n    +accepted(cid);\n}',
      jason: '+!decide_candidate(Cid) <-\n    gl.accept(Cid, "valid classification", Did);\n    +accepted(Cid).',
      jacamo: '+!decide_candidate(Cid) <-\n    accept(Cid, "valid classification", Did);\n    +accepted(Cid).'
    },
    {
      id: 'reject', group: 'decision', command: 'reject(candidateId, reason)', type: 'String',
      description: 'Record a negative decision. Always allowed. Returns a decision ID.',
      constraints: {
        pre: ['Candidate must exist and NOT already be decided.', '<code>reason</code> must be non-blank.', '<em>No admissibility check — rejection is always permitted.</em>'],
        post: ['Records a <code>REJECTED</code> decision. Returns <code>dec_*</code> ID.'],
        life: ['Transitions candidate to <code>REJECTED_BY_AGENT</code> — <em>terminal state, no reversal</em>.'],
        err: ['<code>ERROR:already_decided</code> — includes the existing decision ID']
      },
      astra: 'rule +!decide_candidate(string cid) {\n    gl.reject(cid, "output is incorrect");\n    +rejected(cid);\n}',
      jason: '+!decide_candidate(Cid) <-\n    gl.reject(Cid, "output is incorrect", Did);\n    +rejected(Cid).',
      jacamo: '+!decide_candidate(Cid) <-\n    reject(Cid, "output is incorrect", Did);\n    +rejected(Cid).'
    },
    {
      id: 'knowledge', group: 'decision', command: 'knowledge(agentId)', type: 'String',
      description: 'Retrieve all accepted GL-side knowledge for an agent. Can be passed as context to future calls.',
      constraints: {
        pre: ['None — returns <code>EMPTY</code> for unknown or blank agent IDs.'],
        post: ['Returns semicolon-separated <code>key=value</code> pairs from all candidates with status <code>ACCEPTED_BY_AGENT</code> for the given agent.', 'Values are sanitized: semicolons, commas, and newlines replaced with spaces.'],
        life: ['Read-only — aggregates from the candidate store without mutation.']
      },
      astra: 'rule +!recall(string agent) {\n    +context(gl.knowledge(agent));\n}',
      jason: '+!get_knowledge <-\n    gl.knowledge("agent1", K);\n    .print(K).',
      jacamo: '+!get_knowledge <-\n    knowledge("agent1", K);\n    .print(K).'
    },
    {
      id: 'explain', group: 'invocation', command: 'explain(refId)', type: 'String',
      description: 'Audit and trace any lifecycle object: result, candidate, assessment, decision, trace, or binding.',
      constraints: {
        pre: ['<code>refId</code> must start with a known prefix.'],
        post: ['Routes by prefix: <code>res_</code> → result (with trace link), <code>cand_</code> → candidate (with assessments, admissibility, decisions), <code>assess_</code> → assessment, <code>dec_</code> → decision, <code>trace_</code> → trace (with provider provenance and blob hashes), <code>bind_</code> → binding (with config keys and registered bodies).'],
        life: ['Read-only — inspects stored records without mutation.'],
        err: ['<code>ERROR:unknown_reference</code> — unrecognised prefix', '<code>ERROR:not_found</code> — valid prefix but no matching record']
      },
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

  const CONSTRAINT_SECTIONS = [
    { key: 'pre',  label: 'PRE',  icon: 'fa-arrow-right-to-bracket', cls: 'c-pre' },
    { key: 'post', label: 'POST', icon: 'fa-arrow-right-from-bracket', cls: 'c-post' },
    { key: 'life', label: 'LIFE', icon: 'fa-rotate', cls: 'c-life' },
    { key: 'err',  label: 'ERR',  icon: 'fa-triangle-exclamation', cls: 'c-err' }
  ];

  function constraintPanel(command) {
    const c = command.constraints;
    if (!c || typeof c === 'string') return c || '';
    return CONSTRAINT_SECTIONS
      .filter(s => c[s.key] && c[s.key].length > 0)
      .map(s => `<div class="c-section"><div class="c-header"><span class="c-tag ${s.cls}"><i class="fa-solid ${s.icon}"></i> ${s.label}</span></div><ul>${c[s.key].map(item => `<li>${item}</li>`).join('')}</ul></div>`)
      .join('');
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
        <td style="text-align:center"><button class="view-constraints-btn" type="button" title="View constraints" onclick="event.stopPropagation();toggleConstraints('${command.id}')"><i class="fa-solid fa-shield-halved"></i></button></td>
      </tr>
      <tr class="cmd-details-row" id="details-${command.id}" style="display:none">
        <td colspan="5" style="padding:0">
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
      </tr>
      <tr class="cmd-constraints-row" id="constraints-${command.id}" style="display:none">
        <td colspan="5" style="padding:0">
          <div class="cmd-constraints-content">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <i class="fa-solid fa-shield-halved" style="color:#b45309;font-size:14px"></i>
              <span style="font-family:var(--font-heading);font-weight:700;font-size:12px;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.05em">Semantic constraints</span>
            </div>
            <div class="constraints-body">${constraintPanel(command)}</div>
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
          <col style="width:34%"><col style="width:80px"><col style="width:auto"><col style="width:65px"><col style="width:85px">
        </colgroup>
        <thead>
          <tr><th>Command</th><th>Return Type</th><th>Description</th><th style="text-align:center">Usage</th><th style="text-align:center">Constraints</th></tr>
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
        <div class="tab-content" id="syntax-jason"><pre><code>!start.

+!start
   <- gl.bind("agent1", "gemini", "gemini-2.5-flash", "", Bid);
      gl.call(Bid, "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", "", Rid);
      !decided(Rid).

+!decided(Rid)
   :  gl.candidate(Rid, Cid) & gl.get(Cid, "label", Label)
   <- gl.accept(Cid, "valid classification", _);
      .println("Accepted: ", Label);
      .stopMAS.</code></pre></div>
        <div class="tab-content" id="syntax-jacamo"><pre><code>!start.
+!start <-
    makeArtifact("gl", "gl.jacamo.GL", [], Id);
    focus(Id);
    bind("agent1", "gemini", "gemini-2.5-flash", "", Bid);
    call(Bid, "classify", "llm.answer", "ANSWER", "Classify: apple", "label,confidence", "", Rid);
    candidate(Rid, Cid);
    get(Cid, "label", Label);
    accept(Cid, "valid classification", Did);
    .print("Accepted: ", Label);
    .stopMAS.</code></pre></div>
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
          const constraints = document.getElementById(row.id.replace('row-', 'constraints-'));
          if (constraints && !show) constraints.style.display = 'none';
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

  window.toggleConstraints = function toggleConstraints(id) {
    const row = document.getElementById(`row-${id}`);
    const constraints = document.getElementById(`constraints-${id}`);
    if (!row || !constraints) return;
    const isOpen = constraints.style.display !== 'none';
    constraints.style.display = isOpen ? 'none' : 'table-row';
    constraints.classList.toggle('open', !isOpen);
    row.classList.toggle('constraints-open', !isOpen);
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