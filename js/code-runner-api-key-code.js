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
      const directUseProvider = new RegExp(`\\buse_provider\\s*\\(\\s*["']${provider}["']`, 'i');
      const configuredProvider = new RegExp(`["']provider["']\\s*,\\s*["']${provider}["']`, 'i');
      const configureProvider = new RegExp(`configure\\s*\\(\\s*["']provider["']\\s*,\\s*["']${provider}["']`, 'i');
      const envName = PROVIDERS[provider].env.toLowerCase();

      if (directUseProvider.test(clean) || configuredProvider.test(clean) || configureProvider.test(clean) || clean.includes(envName)) {
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

  function hasApiKeyEnvFor(source, provider) {
    const env = PROVIDERS[provider].env;
    const quotedEnv = new RegExp(`["']${env}["']`);
    const apiKeyEnv = /["']apiKeyEnv["']/;
    return apiKeyEnv.test(source) && quotedEnv.test(source);
  }

  function insertApiKeyEnvBeforeUseProvider(source, provider) {
    if (hasApiKeyEnvFor(source, provider)) return source;

    const env = PROVIDERS[provider].env;
    const lineMatcher = /^([ \t]*)gl\.use_provider\s*\([^;]*\)\s*;.*$/m;
    const match = source.match(lineMatcher);

    if (!match) return source;

    const indent = match[1] || '';
    const commandLine = `${indent}gl.configure("apiKeyEnv", "${env}");`;

    // Do not duplicate any nearby apiKeyEnv command.
    const beforeUseProvider = source.slice(0, match.index);
    const nearby = beforeUseProvider.slice(Math.max(0, beforeUseProvider.length - 300));
    if (nearby.includes('"apiKeyEnv"') || nearby.includes("'apiKeyEnv'")) return source;

    return source.slice(0, match.index) + commandLine + '\n' + source.slice(match.index);
  }

  function ensureProviderCommands(source) {
    let updated = String(source || '');
    const providers = detectRequiredProvidersFromSource(updated);

    providers.forEach(provider => {
      updated = insertApiKeyEnvBeforeUseProvider(updated, provider);
    });

    return updated;
  }

  function currentFileIsAstra() {
    const current = document.getElementById('currentFile');
    const path = current ? current.textContent || '' : '';
    return path.endsWith('.astra');
  }

  function syncEditorSource() {
    const editor = document.getElementById('fileEditor');
    if (!editor || !currentFileIsAstra()) return;

    const updated = ensureProviderCommands(editor.value);
    if (updated !== editor.value) {
      const cursor = editor.selectionStart;
      editor.value = updated;
      editor.selectionStart = editor.selectionEnd = Math.min(cursor, editor.value.length);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function init() {
    // After examples are loaded from patterns/framework into /astra/Main.astra,
    // make the provider API-key environment command visible in the actual source.
    window.setTimeout(syncEditorSource, 150);
    window.setTimeout(syncEditorSource, 600);

    const runButton = document.getElementById('runAstraButton');
    if (runButton) {
      runButton.addEventListener('click', syncEditorSource, true);
    }

    const editor = document.getElementById('fileEditor');
    if (editor) {
      let timer = null;
      editor.addEventListener('input', () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(syncEditorSource, 900);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
