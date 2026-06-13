/**
 * static-highlight.js
 *
 * Applies VS Code Dark+ ASTRA syntax highlighting to all static
 * <pre><code> blocks across documentation pages.
 * Uses the SAME color palette as code-runner-highlight.js.
 *
 * Included on every page EXCEPT code.html (which uses the editor overlay).
 */
(() => {
  'use strict';

  /* ── VS Code Dark+ Color Map (identical to code-runner-highlight.js) ── */
  const C = {
    keyword:      '#569CD6',
    control:      '#C586C0',
    other:        '#569CD6',
    type:         '#4EC9B0',
    className:    '#4EC9B0',
    function:     '#DCDCAA',
    moduleAlias:  '#9CDCFE',
    moduleType:   '#4EC9B0',
    string:       '#CE9178',
    comment:      '#6A9955',
    number:       '#B5CEA8',
    constant:     '#569CD6',
    operator:     '#D4D4D4',
    goalOp:       '#569CD6',
    plain:        '#D4D4D4',
    fnSystem:     '#DCDCAA',
    fnConsole:    '#CE9178',
    fnDebug:      '#D7BA7D',
    fnFunctions:  '#C586C0',
    fnLogic:      '#B5CEA8',
    fnMath:       '#9CDCFE',
    fnMessaging:  '#F48771',
    fnObjAccess:  '#D4D4D4',
    fnPrelude:    '#569CD6',
    fnReflection: '#C586C0',
    fnStrings:    '#CE9178',
    fnExplanation:'#4FC1FF',
    fnCartago:    '#6A9955',
    fnUnitTest:   '#4EC9B0',
    fnHttp:       '#DCDCAA',
    // Shell / env colors
    shellCmd:     '#569CD6',
    shellVar:     '#9CDCFE',
  };

  /* ── Keyword lists ── */
  const DECL_KEYWORDS = new Set([
    'agent','extends','module','rule','initial','import','package',
    'types','formula','inference','constant','send','learn','goal','body'
  ]);
  const CTRL_KEYWORDS = new Set([
    'if','else','while','foreach','forall','when','wait','query',
    'try','recover','done','at_index','list_count'
  ]);
  const OTHER_KEYWORDS = new Set([
    'synchronized','atomic','return','super','new'
  ]);
  const PRIM_TYPES = new Set([
    'string','int','long','float','double','boolean','char','list','funct','Object'
  ]);
  const CONSTANTS = new Set(['true','false','null']);
  const MODULE_TYPES = new Set([
    'KnowledgeStore','JSONBuilder','Loader','XMLLiteralParser','URITemplating',
    'Strings','System','CoAP','Cartago','EIS','Http','Console','UnitTest',
    'TestSuite','ASTRAUnitTest','Debug','Functions','Logic','Math','Messaging',
    'ObjectAccess','Prelude','Reflection','ExplanationAccess','GL','AstraAdapter'
  ]);

  /* ── Per-module method→color lookup ── */
  const SYSTEM_METHODS = new Set(['addEvent','addOrReplaceRule','addRule','agentExists','agentRules','createAgent','currentTimeMillis','deconstruct','displayTimings','env','exit','fail','getAgent','getAgents','getAgentsOfType','getChildren','getNameFromState','getOwner','getType','hasChildren','hasOwner','hasType','name','reconstruct','setMainGoal','setSchedulePoolSize','setSchedulingStrategy','setSleepTime','skip','sleep','step','terminate','terminateAgent','trace']);
  const CONSOLE_METHODS = new Set(['print','printClassName','println','readDouble','readFloat','readInt','readLong','readString']);
  const DEBUG_METHODS = new Set(['dumpAgentRulesForEvent','dumpBeliefs','dumpBeliefsWithPredicate','dumpExplanations','printEventQueue','printStackTrace']);
  const FUNCTIONS_METHODS = new Set(['arity','functor','valueAsDouble','valueAsFloat','valueAsFunct','valueAsInt','valueAsList','valueAsLong','valueAsString','valueType']);
  const LOGIC_METHODS = new Set(['eval','toFunctor','toPredicate']);
  const MATH_METHODS = new Set(['abs','doubleValue','evaluate','floatValue','intValue','longValue','max','min','randomInt']);
  const MESSAGING_METHODS = new Set(['installService','setProperty','startService']);
  const OBJACCESS_METHODS = new Set(['create','getBoolean','getInt','getLong','getString','invoke','is','isType','set','toList','type']);
  const PRELUDE_METHODS = new Set(['add','addAt','booleanValueFor','charValueFor','contains','doubleValueFor','floatValueFor','fromASTRAList','fromMap','headAsDouble','headAsFloat','headAsInt','headAsLong','headAsString','intValueFor','isEmpty','longValueFor','mapToList','objectValueFor','remove','reverse','shuffle','size','sort_asc','sort_desc','stringValueFor','swap','tail','toASTRAList','toList','toMap','toString','valueAsBoolean','valueAsDouble','valueAsFloat','valueAsFunct','valueAsInt','valueAsList','valueAsLong','valueAsString']);
  const REFLECTION_METHODS = new Set(['addRole']);
  const STRINGS_METHODS = new Set(['charAt','contains','endsWith','equal','equalsIgnoreCase','replaceAll','split','startsWith']);
  const EXPLANATION_METHODS = new Set(['retrieveAllExplanations','latestExplanationUnitFor','latestExplanationFor','fullMatchingExplanation','sizeOfExplanations','newID','getID','getRule','hasRule','isEmpty','getDetail','hasRelationship','latest3ExplanationEventsForComponent']);
  const CARTAGO_METHODS = new Set(['startService','makeArtifact','lookupArtifact','focus','link','operation','disposeArtifact','stopService','params']);
  const UNITTEST_METHODS = new Set(['assertEquals','assertArrayEquals','assertTrue','assertBelief','injectBelief','extractBelief','success','fail']);
  const HTTP_METHODS = new Set(['register','createResponse','sendResponse','setStatus','setContent','setType','setLocation','setHeader','myAddress']);
  const GL_METHODS = new Set(['see','bind','call','result','candidate','check','get','judge','decide','accept','reject','knowledge','explain']);

  function getMethodColor(method) {
    if (SYSTEM_METHODS.has(method))      return C.fnSystem;
    if (CONSOLE_METHODS.has(method))     return C.fnConsole;
    if (DEBUG_METHODS.has(method))       return C.fnDebug;
    if (FUNCTIONS_METHODS.has(method))   return C.fnFunctions;
    if (LOGIC_METHODS.has(method))       return C.fnLogic;
    if (MATH_METHODS.has(method))        return C.fnMath;
    if (MESSAGING_METHODS.has(method))   return C.fnMessaging;
    if (OBJACCESS_METHODS.has(method))   return C.fnObjAccess;
    if (PRELUDE_METHODS.has(method))     return C.fnPrelude;
    if (REFLECTION_METHODS.has(method))  return C.fnReflection;
    if (STRINGS_METHODS.has(method))     return C.fnStrings;
    if (EXPLANATION_METHODS.has(method)) return C.fnExplanation;
    if (CARTAGO_METHODS.has(method))     return C.fnCartago;
    if (UNITTEST_METHODS.has(method))    return C.fnUnitTest;
    if (HTTP_METHODS.has(method))        return C.fnHttp;
    if (GL_METHODS.has(method))          return '#DCDCAA';
    return C.function;
  }

  /* ── Jason / AgentSpeak keywords ── */
  const JASON_KEYWORDS = new Set([
    'begin','end','true','false','not','div','mod','if','else','for',
    'while','include','register_function'
  ]);
  const JASON_ANNOTATIONS = new Set([
    'atomic','parallel','breakpoint'
  ]);

  /* ── Shell keywords ── */
  const SHELL_KEYWORDS = new Set([
    'export','set','source','cd','mkdir','git','clone','mvn','gradle',
    'java','javac','npm','npx','curl','wget','chmod','sudo','apt','brew','pip'
  ]);

  /* ── Tokenizer (ASTRA language) ── */
  function tokenize(source) {
    const tokens = [];
    let i = 0;
    const len = source.length;

    while (i < len) {
      // Block comment
      if (source[i] === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2);
        const close = end === -1 ? len : end + 2;
        tokens.push({ text: source.slice(i, close), color: C.comment });
        i = close;
        continue;
      }
      // Line comment
      if (source[i] === '/' && source[i + 1] === '/') {
        const nl = source.indexOf('\n', i);
        const end = nl === -1 ? len : nl;
        tokens.push({ text: source.slice(i, end), color: C.comment });
        i = end;
        continue;
      }
      // String (double quote)
      if (source[i] === '"') {
        let j = i + 1;
        while (j < len && source[j] !== '"') {
          if (source[j] === '\\') j++;
          j++;
        }
        if (j < len) j++;
        tokens.push({ text: source.slice(i, j), color: C.string });
        i = j;
        continue;
      }
      // String (single quote)
      if (source[i] === "'") {
        let j = i + 1;
        while (j < len && source[j] !== "'") {
          if (source[j] === '\\') j++;
          j++;
        }
        if (j < len) j++;
        tokens.push({ text: source.slice(i, j), color: C.string });
        i = j;
        continue;
      }
      // Inference operator :-
      if (source[i] === ':' && source[i + 1] === '-') {
        tokens.push({ text: ':-', color: C.operator });
        i += 2;
        continue;
      }
      // Module call: alias.method(
      const mcMatch = source.slice(i).match(/^([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)(\()/);
      if (mcMatch) {
        const alias = mcMatch[1];
        const method = mcMatch[2];
        if (!DECL_KEYWORDS.has(alias) && !CTRL_KEYWORDS.has(alias) && !OTHER_KEYWORDS.has(alias)) {
          const methodColor = getMethodColor(method);
          tokens.push({ text: alias, color: C.moduleAlias });
          tokens.push({ text: '.', color: C.plain });
          tokens.push({ text: method, color: methodColor });
          tokens.push({ text: '(', color: C.plain });
          i += mcMatch[0].length;
          continue;
        }
      }
      // Qualified type: pkg.pkg.ClassName
      const qtMatch = source.slice(i).match(/^([a-z]\w*(?:\.[a-z]\w*)*\.[A-Z]\w*)\b/);
      if (qtMatch) {
        const fqn = qtMatch[1];
        const parts = fqn.split('.');
        const className = parts.pop();
        const pkg = parts.join('.');
        if (MODULE_TYPES.has(className)) {
          tokens.push({ text: pkg + '.', color: C.plain });
          tokens.push({ text: className, color: C.moduleType });
        } else {
          tokens.push({ text: fqn, color: C.className });
        }
        i += qtMatch[0].length;
        continue;
      }
      // Word
      const wordMatch = source.slice(i).match(/^[a-zA-Z_]\w*/);
      if (wordMatch) {
        const word = wordMatch[0];
        if (DECL_KEYWORDS.has(word))       tokens.push({ text: word, color: C.keyword });
        else if (CTRL_KEYWORDS.has(word))  tokens.push({ text: word, color: C.control });
        else if (OTHER_KEYWORDS.has(word)) tokens.push({ text: word, color: C.other });
        else if (PRIM_TYPES.has(word))     tokens.push({ text: word, color: C.type });
        else if (CONSTANTS.has(word))      tokens.push({ text: word, color: C.constant });
        else if (MODULE_TYPES.has(word))   tokens.push({ text: word, color: C.moduleType });
        else                               tokens.push({ text: word, color: C.plain });
        i += word.length;
        continue;
      }
      // Number
      const numMatch = source.slice(i).match(/^\d+(\.\d+)?/);
      if (numMatch) {
        tokens.push({ text: numMatch[0], color: C.number });
        i += numMatch[0].length;
        continue;
      }
      // Goal operator !
      if (source[i] === '!' && (i === 0 || /[\s(+\-,{]/.test(source[i - 1]))) {
        tokens.push({ text: '!', color: C.goalOp });
        i++;
        continue;
      }
      // Everything else
      tokens.push({ text: source[i], color: C.plain });
      i++;
    }
    return tokens;
  }

  /* ── Jason tokenizer ── */
  function tokenizeJason(source) {
    const tokens = [];
    let i = 0;
    const len = source.length;

    while (i < len) {
      // Line comment
      if (source[i] === '/' && source[i + 1] === '/') {
        const nl = source.indexOf('\n', i);
        const end = nl === -1 ? len : nl;
        tokens.push({ text: source.slice(i, end), color: C.comment });
        i = end;
        continue;
      }
      // Block comment
      if (source[i] === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2);
        const close = end === -1 ? len : end + 2;
        tokens.push({ text: source.slice(i, close), color: C.comment });
        i = close;
        continue;
      }
      // String
      if (source[i] === '"') {
        let j = i + 1;
        while (j < len && source[j] !== '"') { if (source[j] === '\\') j++; j++; }
        if (j < len) j++;
        tokens.push({ text: source.slice(i, j), color: C.string });
        i = j;
        continue;
      }
      // Annotation @
      if (source[i] === '@') {
        const am = source.slice(i + 1).match(/^[a-zA-Z_]\w*/);
        if (am) {
          tokens.push({ text: '@' + am[0], color: '#C586C0' });
          i += am[0].length + 1;
          continue;
        }
      }
      // Plan operators: +! -! +? -?
      if ((source[i] === '+' || source[i] === '-') && (source[i + 1] === '!' || source[i + 1] === '?')) {
        tokens.push({ text: source.slice(i, i + 2), color: C.keyword });
        i += 2;
        continue;
      }
      // Inference :-
      if (source[i] === ':' && source[i + 1] === '-') {
        tokens.push({ text: ':-', color: C.operator });
        i += 2;
        continue;
      }
      // Module call: lib.method(
      const mc = source.slice(i).match(/^([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)(\()/);
      if (mc) {
        tokens.push({ text: mc[1], color: C.moduleAlias });
        tokens.push({ text: '.', color: C.plain });
        tokens.push({ text: mc[2], color: '#DCDCAA' });
        tokens.push({ text: '(', color: C.plain });
        i += mc[0].length;
        continue;
      }
      // Word
      const wm = source.slice(i).match(/^[a-zA-Z_]\w*/);
      if (wm) {
        const w = wm[0];
        if (JASON_KEYWORDS.has(w))          tokens.push({ text: w, color: C.keyword });
        else if (JASON_ANNOTATIONS.has(w))  tokens.push({ text: w, color: '#C586C0' });
        else if (CONSTANTS.has(w))          tokens.push({ text: w, color: C.constant });
        else                                tokens.push({ text: w, color: C.plain });
        i += w.length;
        continue;
      }
      // Number
      const nm = source.slice(i).match(/^\d+(\.\d+)?/);
      if (nm) {
        tokens.push({ text: nm[0], color: C.number });
        i += nm[0].length;
        continue;
      }
      // Goal !
      if (source[i] === '!' && (i === 0 || /[\s(+\-,{<]/.test(source[i - 1]))) {
        tokens.push({ text: '!', color: C.goalOp });
        i++;
        continue;
      }
      tokens.push({ text: source[i], color: C.plain });
      i++;
    }
    return tokens;
  }

  /* ── Shell tokenizer (for export lines) ── */
  function tokenizeShell(source) {
    const tokens = [];
    let i = 0;
    const len = source.length;

    while (i < len) {
      // Comment
      if (source[i] === '#') {
        const nl = source.indexOf('\n', i);
        const end = nl === -1 ? len : nl;
        tokens.push({ text: source.slice(i, end), color: C.comment });
        i = end;
        continue;
      }
      // String
      if (source[i] === '"' || source[i] === "'") {
        const q = source[i];
        let j = i + 1;
        while (j < len && source[j] !== q) { if (source[j] === '\\') j++; j++; }
        if (j < len) j++;
        tokens.push({ text: source.slice(i, j), color: C.string });
        i = j;
        continue;
      }
      // Environment variable (KEY=value)
      const envMatch = source.slice(i).match(/^([A-Z_][A-Z0-9_]*)=/);
      if (envMatch) {
        tokens.push({ text: envMatch[1], color: C.shellVar });
        tokens.push({ text: '=', color: C.plain });
        i += envMatch[0].length;
        continue;
      }
      // Word
      const wm = source.slice(i).match(/^[a-zA-Z_]\w*/);
      if (wm) {
        const w = wm[0];
        if (SHELL_KEYWORDS.has(w)) tokens.push({ text: w, color: C.shellCmd });
        else                       tokens.push({ text: w, color: C.plain });
        i += w.length;
        continue;
      }
      tokens.push({ text: source[i], color: C.plain });
      i++;
    }
    return tokens;
  }

  /* ── Renderer ── */
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderTokens(tokens) {
    let html = '';
    for (const t of tokens) {
      if (t.color === C.plain) {
        html += escapeHtml(t.text);
      } else {
        html += `<span style="color:${t.color}">${escapeHtml(t.text)}</span>`;
      }
    }
    return html;
  }

  /* ── XML Colors ── */
  const XML_COLORS = {
    tag:       '#569CD6',
    tagName:   '#4EC9B0',
    attr:      '#9CDCFE',
    attrValue: '#CE9178',
    comment:   '#6A9955',
    text:      '#D4D4D4',
  };

  function spanXml(color, text) {
    return `<span style="color:${color}">${escapeHtml(text)}</span>`;
  }

  function tokenizeXml(source) {
    let result = '';
    let i = 0;
    const len = source.length;
    while (i < len) {
      if (source.startsWith('<!--', i)) {
        const end = source.indexOf('-->', i + 4);
        const ce = end >= 0 ? end + 3 : len;
        result += spanXml(XML_COLORS.comment, source.slice(i, ce));
        i = ce;
        continue;
      }
      if (source[i] === '<') {
        const closeTag = source.indexOf('>', i);
        if (closeTag < 0) { result += spanXml(XML_COLORS.text, source.slice(i)); break; }
        const tagContent = source.slice(i, closeTag + 1);
        // Colorize tag
        let tr = '';
        const openMatch = tagContent.match(/^(<\/?)/);
        if (openMatch) {
          tr += spanXml(XML_COLORS.tag, openMatch[1]);
          let rest = tagContent.slice(openMatch[1].length);
          const nameMatch = rest.match(/^([a-zA-Z0-9_.:-]+)/);
          if (nameMatch) {
            tr += spanXml(XML_COLORS.tagName, nameMatch[1]);
            rest = rest.slice(nameMatch[1].length);
          }
          // Simplified: just color the rest as tag
          if (rest.endsWith('/>')) {
            tr += escapeHtml(rest.slice(0, -2)) + spanXml(XML_COLORS.tag, '/>');
          } else if (rest.endsWith('>')) {
            tr += escapeHtml(rest.slice(0, -1)) + spanXml(XML_COLORS.tag, '>');
          } else {
            tr += escapeHtml(rest);
          }
        } else {
          tr += spanXml(XML_COLORS.text, tagContent);
        }
        result += tr;
        i = closeTag + 1;
        continue;
      }
      const nextTag = source.indexOf('<', i);
      const textEnd = nextTag >= 0 ? nextTag : len;
      result += spanXml(XML_COLORS.text, source.slice(i, textEnd));
      i = textEnd;
    }
    return result;
  }

  /* ── Language detection ── */
  function detectLang(rawText) {
    const t = rawText.trim();
    // XML / Maven / pom.xml
    if (/^<[a-zA-Z]/.test(t) || /^\s*<(dependency|groupId|artifactId|version|project|build)/.test(t)) return 'xml';
    // Shell / env exports / $ prompts
    if (/^(\$\s+)?(export |set |source |git |mvn |gradle |java |chmod |sudo |curl |npm )/m.test(t)) return 'shell';
    // Gradle
    if (/^(implementation|api|compile|dependencies)\s/.test(t)) return 'shell';
    // Jason: AgentSpeak triggers like +! -! +? or :-
    if (/^[+\-][!?]/.test(t) || /^[a-z_]\w*\s*:-/.test(t)) return 'jason';
    // ASTRA: agent keyword, module keyword, rule keyword
    if (/\b(agent|module|rule)\b/.test(t)) return 'astra';
    // Check for gl. calls — ASTRA
    if (/\bgl\.\w+/.test(t)) return 'astra';
    // Check for bind/call — ASTRA
    if (/\b(bind|call)\b/.test(t)) return 'astra';
    // Default to ASTRA for most code blocks
    return 'astra';
  }

  /* ── Main: Highlight all static code blocks ── */
  function highlightAll() {
    // Skip code.html — it has its own editor overlay
    if (location.pathname.includes('code.html') ||
        location.pathname.includes('runner-astra') ||
        location.pathname.includes('runner-jason') ||
        location.pathname.includes('runner-jacamo')) return;

    const codeBlocks = document.querySelectorAll('pre code');

    codeBlocks.forEach(codeEl => {
      // Skip if already highlighted by this script
      if (codeEl.dataset.glHighlighted) return;
      codeEl.dataset.glHighlighted = '1';

      // Get raw text (strip any existing manual <span> tags)
      const rawText = codeEl.textContent;
      if (!rawText || !rawText.trim()) return;

      // Detect language
      const lang = detectLang(rawText);

      // Tokenize and render
      if (lang === 'xml') {
        codeEl.innerHTML = tokenizeXml(rawText);
      } else {
        let tokens;
        switch (lang) {
          case 'shell': tokens = tokenizeShell(rawText); break;
          case 'jason': tokens = tokenizeJason(rawText); break;
          default:      tokens = tokenize(rawText); break;
        }
        codeEl.innerHTML = renderTokens(tokens);
      }
    });
  }

  /* ── Boot ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', highlightAll);
  } else {
    highlightAll();
  }

  // Retry for dynamically generated content
  [200, 500, 1000, 2000].forEach(ms => setTimeout(highlightAll, ms));

  // Expose for manual re-highlighting
  window.__glStaticHighlight = highlightAll;
})();
