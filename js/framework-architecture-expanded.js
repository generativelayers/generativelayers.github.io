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
        <div class="concept-details"><ul><li><code>ask()</code> or <code>invoke()</code> returns a result id.</li><li><code>candidate()</code> resolves candidate id.</li><li><code>field()</code> reads structured values.</li><li><code>outcome()</code> reads failures and invalid output.</li></ul></div>
      </div>
    `;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restoreArchitectureInternals);
  else restoreArchitectureInternals();
})();
