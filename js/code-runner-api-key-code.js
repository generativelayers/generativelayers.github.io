(() => {
  const PROVIDERS = {
    cerebras: { label: 'Cerebras', env: 'CEREBRAS_API_KEY' },
    groq: { label: 'Groq', env: 'GROQ_API_KEY' },
    gemini: { label: 'Gemini', env: 'GEMINI_API_KEY' },
    openai: { label: 'OpenAI', env: 'OPENAI_API_KEY' },
    deepseek: { label: 'DeepSeek', env: 'DEEPSEEK_API_KEY' }
  };

  function stripLineComments(source) {
    return String(source || '').replace(/\/\/.*$/gm, '');
  }

  function detectRequiredProvidersFromSource(source) {
    const clean = stripLineComments(source).toLowerCase();
    const found = [];

    Object.keys(PROVIDERS).forEach(provider => {
      // v2: gl.bind("agent", "provider", "model") or bind("provider", ...)
      const bindPattern = new RegExp(`\\bbind\\s*\\([^)]*["']${provider}["']`, 'i');
      const envName = PROVIDERS[provider].env.toLowerCase();

      if (bindPattern.test(clean) || clean.includes(envName)) {
        found.push(provider);
      }
    });

    if (!found.includes('gemini') && /gemini-[a-z0-9_.-]+/i.test(clean)) found.push('gemini');
    if (!found.includes('openai') && /gpt-(?:3|4|4o|5|o)/i.test(clean)) found.push('openai');
    if (!found.includes('deepseek') && /deepseek-[a-z0-9_.-]+/i.test(clean)) found.push('deepseek');
    if (!found.includes('groq') && /(llama-3|llama3|mixtral|gemma)/i.test(clean)) found.push('groq');
    if (!found.includes('cerebras') && /gpt-oss/i.test(clean)) found.push('cerebras');

    return [...new Set(found)];
  }

  // v2: No automatic code injection needed — bind() handles provider + API key env.
  // This file now only exposes detection for other scripts.

  window.__glDetectProviders = detectRequiredProvidersFromSource;

  function init() {
    // No-op in v2 — the API key panel (code-runner-api-select.js) handles everything.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
