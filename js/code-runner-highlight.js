/**
 * code-runner-highlight.js  v1
 *
 * ASTRA syntax highlighting for the code.html editor.
 * Uses the overlay technique: textarea stays for editing,
 * a <pre><code> overlay renders colored tokens on top.
 *
 * Colors match the VS Code Dark+ theme from astra-diagnostics-vscode.
 */
(() => {
  'use strict';

  /* ── VS Code Dark+ Color Map ────────────────────────────── */
  const C = {
    keyword:      '#569CD6',  // agent, rule, module, initial, formula, inference
    control:      '#C586C0',  // if, else, while, foreach, forall, when, wait
    other:        '#569CD6',  // synchronized, atomic, return, new
    type:         '#4EC9B0',  // string, int, boolean, list, funct, Object
    className:    '#4EC9B0',  // Agent names, class references
    function:     '#DCDCAA',  // function/goal names
    moduleAlias:  '#9CDCFE',  // module aliases (gl, console, S)
    moduleType:   '#4EC9B0',  // module type names (Console, System, GL)
    string:       '#CE9178',  // "strings"
    comment:      '#6A9955',  // // comments, /* block */
    number:       '#B5CEA8',  // 42, 3.14
    constant:     '#569CD6',  // true, false, null
    operator:     '#D4D4D4',  // +, -, !, ~, &, |, :-
    goalOp:       '#569CD6',  // !
    plain:        '#D4D4D4',  // default text
    // Per-module function colors from package.json
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
  };

  /* ── Keyword lists ──────────────────────────────────────── */
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

  /* ── Per-module method→color lookup ─────────────────────── */
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

  // GL framework methods
  const GL_METHODS = new Set(['ask','configure','use_provider','accept','reject','field','candidate','valid','respond','multi_ask','ask_with_schema','parse_json']);

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

  /* ── Tokenizer ──────────────────────────────────────────── */
  // Each token: { text, color, bold?, italic? }
  function tokenize(source) {
    const tokens = [];
    let i = 0;
    const len = source.length;

    while (i < len) {
      // ── Block comment ──
      if (source[i] === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2);
        const close = end === -1 ? len : end + 2;
        tokens.push({ text: source.slice(i, close), color: C.comment });
        i = close;
        continue;
      }

      // ── Line comment ──
      if (source[i] === '/' && source[i + 1] === '/') {
        const nl = source.indexOf('\n', i);
        const end = nl === -1 ? len : nl;
        tokens.push({ text: source.slice(i, end), color: C.comment });
        i = end;
        continue;
      }

      // ── String (double quote) ──
      if (source[i] === '"') {
        let j = i + 1;
        while (j < len && source[j] !== '"') {
          if (source[j] === '\\') j++; // skip escape
          j++;
        }
        if (j < len) j++; // include closing quote
        tokens.push({ text: source.slice(i, j), color: C.string });
        i = j;
        continue;
      }

      // ── String (single quote / char) ──
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

      // ── Inference operator :- ──
      if (source[i] === ':' && source[i + 1] === '-') {
        tokens.push({ text: ':-', color: C.operator });
        i += 2;
        continue;
      }

      // ── Module call: alias.method( ──
      // Must come before word tokenization
      const mcMatch = source.slice(i).match(/^([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)(\()/);
      if (mcMatch) {
        const alias = mcMatch[1];
        const method = mcMatch[2];

        // Check if alias is a keyword or type — if so, don't treat as module call
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

      // ── Qualified type: pkg.pkg.ClassName ──
      const qtMatch = source.slice(i).match(/^([a-z]\w*(?:\.[a-z]\w*)*\.[A-Z]\w*)\b/);
      if (qtMatch) {
        const fqn = qtMatch[1];
        const parts = fqn.split('.');
        const className = parts.pop();
        const pkg = parts.join('.');

        // Is it a known module type at the end?
        if (MODULE_TYPES.has(className)) {
          tokens.push({ text: pkg + '.', color: C.plain });
          tokens.push({ text: className, color: C.moduleType });
        } else {
          tokens.push({ text: fqn, color: C.className });
        }
        i += qtMatch[0].length;
        continue;
      }

      // ── Word (identifier / keyword / type) ──
      const wordMatch = source.slice(i).match(/^[a-zA-Z_]\w*/);
      if (wordMatch) {
        const word = wordMatch[0];

        if (DECL_KEYWORDS.has(word))      tokens.push({ text: word, color: C.keyword });
        else if (CTRL_KEYWORDS.has(word)) tokens.push({ text: word, color: C.control });
        else if (OTHER_KEYWORDS.has(word))tokens.push({ text: word, color: C.other });
        else if (PRIM_TYPES.has(word))    tokens.push({ text: word, color: C.type });
        else if (CONSTANTS.has(word))     tokens.push({ text: word, color: C.constant });
        else if (MODULE_TYPES.has(word))  tokens.push({ text: word, color: C.moduleType });
        else                              tokens.push({ text: word, color: C.plain });

        i += word.length;
        continue;
      }

      // ── Number ──
      const numMatch = source.slice(i).match(/^\d+(\.\d+)?/);
      if (numMatch) {
        tokens.push({ text: numMatch[0], color: C.number });
        i += numMatch[0].length;
        continue;
      }

      // ── Operators ──
      if (source[i] === '!' && (i === 0 || /[\s(+\-,{]/.test(source[i - 1]))) {
        tokens.push({ text: '!', color: C.goalOp });
        i++;
        continue;
      }

      if ('==|!=|<=|>='.includes(source.slice(i, i + 2)) || '<>'.includes(source[i])) {
        if (source[i + 1] && '=!<>'.includes(source[i + 1]) && source.slice(i, i + 2).match(/^(==|!=|<=|>=)$/)) {
          tokens.push({ text: source.slice(i, i + 2), color: C.operator });
          i += 2;
          continue;
        }
      }

      if ('-+'.includes(source[i]) && source[i + 1] === '+') {
        tokens.push({ text: source.slice(i, i + 2), color: C.operator });
        i += 2;
        continue;
      }

      if ('~&|'.includes(source[i])) {
        tokens.push({ text: source[i], color: C.operator });
        i++;
        continue;
      }

      // ── Everything else (whitespace, punctuation, single chars) ──
      tokens.push({ text: source[i], color: C.plain });
      i++;
    }

    return tokens;
  }

  /* ── Renderer ───────────────────────────────────────────── */
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderTokens(tokens) {
    let html = '';
    for (const t of tokens) {
      if (t.color === C.plain) {
        html += escapeHtml(t.text);
      } else {
        const style = `color:${t.color}${t.bold ? ';font-weight:bold' : ''}${t.italic ? ';font-style:italic' : ''}`;
        html += `<span style="${style}">${escapeHtml(t.text)}</span>`;
      }
    }
    return html;
  }

  /* ── Overlay Setup ──────────────────────────────────────── */
  let textarea = null;
  let overlay = null;
  let rafId = null;

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .hl-editor-wrap {
        position: relative;
        background: #0b1220;
        border-radius: 0 0 12px 12px;
      }
      .hl-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        pointer-events: none;
        overflow: hidden;
        margin: 0;
        border: 1px solid transparent;
        border-radius: 0 0 12px 12px;
        padding: 16px;
        background: transparent;
        color: #D4D4D4;
        font-size: 13px;
        line-height: 1.55;
        font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        white-space: pre;
        tab-size: 4;
        word-wrap: normal;
        overflow-wrap: normal;
        z-index: 1;
      }
      .hl-editor-wrap .runner-editor {
        color: transparent !important;
        caret-color: #d1fae5;
        z-index: 2;
        position: relative;
        background: transparent !important;
        resize: vertical;
      }
    `;
    document.head.appendChild(style);
  }

  function setupOverlay() {
    textarea = document.getElementById('fileEditor');
    if (!textarea || textarea.dataset.hlReady) return;
    textarea.dataset.hlReady = '1';

    addStyles();

    // Wrap textarea in a relative container
    const parent = textarea.parentNode;
    const wrapper = document.createElement('div');
    wrapper.className = 'hl-editor-wrap';
    parent.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);

    // Create the highlight overlay
    overlay = document.createElement('pre');
    overlay.className = 'hl-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(overlay);

    // Sync scroll positions
    textarea.addEventListener('scroll', syncScroll);

    // Re-highlight on user input
    textarea.addEventListener('input', scheduleHighlight);

    // Intercept programmatic .value = ... from other scripts
    try {
      const proto = HTMLTextAreaElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) {
        const origSet = desc.set;
        Object.defineProperty(textarea, 'value', {
          get() { return desc.get.call(this); },
          set(v) {
            origSet.call(this, v);
            scheduleHighlight();
          },
          configurable: true
        });
      }
    } catch (_) { /* ignore if override fails */ }

    // Watch resize
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => syncScroll()).observe(textarea);
    }

    // Initial highlight
    highlight();
  }

  function syncScroll() {
    if (!overlay || !textarea) return;
    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  }

  function scheduleHighlight() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(highlight);
  }

  function highlight() {
    if (!overlay || !textarea) return;
    const source = textarea.value;
    if (!source) {
      overlay.innerHTML = '\n';
      return;
    }

    // Detect file type from the current file label
    const fileLabel = document.getElementById('currentFile');
    const filePath = fileLabel ? (fileLabel.textContent || '') : '';
    const isXml = filePath.endsWith('.xml') || filePath.endsWith('.pom');

    if (isXml) {
      overlay.innerHTML = tokenizeXml(source) + '\n';
    } else {
      const tokens = tokenize(source);
      overlay.innerHTML = renderTokens(tokens) + '\n';
    }
    syncScroll();
  }

  /* ── XML tokenizer (for pom.xml) ─────────────────────────── */
  const XML_COLORS = {
    tag:       '#569CD6',   // < > </ />
    tagName:   '#4EC9B0',   // element names
    attr:      '#9CDCFE',   // attribute names
    attrValue: '#CE9178',   // "attribute values"
    comment:   '#6A9955',   // <!-- ... -->
    text:      '#D4D4D4',   // text content
    entity:    '#B5CEA8',   // &amp; etc
  };

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function spanXml(color, text) {
    return `<span style="color:${color}">${esc(text)}</span>`;
  }

  function tokenizeXml(source) {
    let result = '';
    let i = 0;
    const len = source.length;

    while (i < len) {
      // XML comment
      if (source.startsWith('<!--', i)) {
        const end = source.indexOf('-->', i + 4);
        const commentEnd = end >= 0 ? end + 3 : len;
        result += spanXml(XML_COLORS.comment, source.slice(i, commentEnd));
        i = commentEnd;
        continue;
      }

      // Tag
      if (source[i] === '<') {
        const closeTag = source.indexOf('>', i);
        if (closeTag < 0) {
          result += spanXml(XML_COLORS.text, source.slice(i));
          break;
        }
        const tagContent = source.slice(i, closeTag + 1);
        result += colorizeTag(tagContent);
        i = closeTag + 1;
        continue;
      }

      // Text content between tags
      const nextTag = source.indexOf('<', i);
      const textEnd = nextTag >= 0 ? nextTag : len;
      const text = source.slice(i, textEnd);
      result += spanXml(XML_COLORS.text, text);
      i = textEnd;
      continue;
    }

    return result;
  }

  function colorizeTag(tag) {
    let result = '';
    // Match: < or </ at start
    const openMatch = tag.match(/^(<\/?)/);
    if (openMatch) {
      result += spanXml(XML_COLORS.tag, openMatch[1]);
      let rest = tag.slice(openMatch[1].length);

      // Tag name
      const nameMatch = rest.match(/^([a-zA-Z0-9_.:-]+)/);
      if (nameMatch) {
        result += spanXml(XML_COLORS.tagName, nameMatch[1]);
        rest = rest.slice(nameMatch[1].length);
      }

      // Attributes and closing
      let j = 0;
      while (j < rest.length) {
        // Whitespace
        if (/\s/.test(rest[j])) {
          let wsEnd = j;
          while (wsEnd < rest.length && /\s/.test(rest[wsEnd])) wsEnd++;
          result += esc(rest.slice(j, wsEnd));
          j = wsEnd;
          continue;
        }
        // /> or >
        if (rest.startsWith('/>', j)) {
          result += spanXml(XML_COLORS.tag, '/>');
          j += 2;
          continue;
        }
        if (rest[j] === '>') {
          result += spanXml(XML_COLORS.tag, '>');
          j++;
          continue;
        }
        // Attribute name
        const attrMatch = rest.slice(j).match(/^([a-zA-Z0-9_.:-]+)/);
        if (attrMatch) {
          result += spanXml(XML_COLORS.attr, attrMatch[1]);
          j += attrMatch[1].length;
          // = sign
          if (rest[j] === '=') {
            result += spanXml(XML_COLORS.tag, '=');
            j++;
            // Attribute value "..."
            if (rest[j] === '"') {
              const qEnd = rest.indexOf('"', j + 1);
              const valEnd = qEnd >= 0 ? qEnd + 1 : rest.length;
              result += spanXml(XML_COLORS.attrValue, rest.slice(j, valEnd));
              j = valEnd;
            }
          }
          continue;
        }
        // Fallback
        result += esc(rest[j]);
        j++;
      }
    } else {
      result += spanXml(XML_COLORS.text, tag);
    }
    return result;
  }

  // Expose for other scripts to call manually
  window.__glHighlight = function () {
    if (!overlay) setupOverlay();
    highlight();
  };

  /* ── Boot ────────────────────────────────────────────────── */
  function init() {
    setupOverlay();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Retry with increasing delays to catch late value assignments
  [100, 300, 600, 1200].forEach(ms => setTimeout(() => {
    if (!textarea) setupOverlay();
    else highlight();
  }, ms));
})();
