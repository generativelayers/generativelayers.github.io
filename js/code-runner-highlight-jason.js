/**
 * code-runner-highlight-jason.js  v1
 *
 * Jason / JaCaMo AgentSpeak syntax highlighting for the web runner.
 * Uses the overlay technique: textarea stays for editing,
 * a <pre><code> overlay renders colored tokens on top.
 *
 * Colors match the TM grammar from jason-diagnostics-vscode.
 * Only loads for jason / jacamo platforms.
 */
(() => {
  'use strict';

  const PLATFORM = window.GL_PLATFORM || 'astra';
  if (PLATFORM !== 'jason' && PLATFORM !== 'jacamo') return;

  /* ── VS Code Dark+ Color Map for Jason ─────────────────── */
  const C = {
    comment:      '#6A9955',  // // comments, /* block */
    string:       '#CE9178',  // "strings"
    number:       '#B5CEA8',  // 42, 3.14
    annotation:   '#D7BA7D',  // [source(self)], [atomic]
    annotKw:      '#C586C0',  // source, atomic, priority inside []
    annotConst:   '#569CD6',  // self, percept, communicate inside []
    internalAct:  '#DCDCAA',  // .println, .send, .wait — function color
    dotPrefix:    '#D4D4D4',  // the leading dot
    trigger:      '#569CD6',  // + - in plan triggers
    goalOp:       '#C586C0',  // ! ? operators
    goalName:     '#4EC9B0',  // goal/predicate names in triggers
    planLabel:    '#9CDCFE',  // @label
    ruleOp:       '#569CD6',  // :-
    planBodyOp:   '#C586C0',  // <-
    keyword:      '#569CD6',  // if, else, while, for, not, div, mod
    constant:     '#569CD6',  // true, false
    variable:     '#9CDCFE',  // Uppercase variables
    anonVar:      '#569CD6',  // _ anonymous
    comparison:   '#D4D4D4',  // ==, \==, >=, <=, >, <, =..
    logical:      '#C586C0',  // &, |, ~
    arithmetic:   '#D4D4D4',  // +, -, *, /, **
    predicate:    '#DCDCAA',  // predicate calls name(
    directive:    '#C586C0',  // {include, {register_function, {namespace
    namespace:    '#4EC9B0',  // begin/end namespace
    plain:        '#D4D4D4',  // default text
    // GL framework
    glMethod:     '#DCDCAA',  // gl.bind, gl.call etc
    glAlias:      '#9CDCFE',  // gl module alias
  };

  /* ── Keyword sets ──────────────────────────────────────── */
  const KEYWORDS = new Set(['if', 'else', 'while', 'for', 'elif', 'not', 'div', 'mod']);
  const CONSTANTS = new Set(['true', 'false']);
  const ANNOT_KEYWORDS = new Set(['source', 'atomic', 'all_unifs', 'priority', 'breakpoint', 'verbose']);
  const ANNOT_CONSTS = new Set(['self', 'percept', 'communicate']);

  // Jason standard internal actions
  const INTERNAL_ACTIONS = new Set([
    'print', 'println', 'send', 'broadcast', 'wait', 'at', 'create_agent', 'kill_agent',
    'abolish', 'add_plan', 'relevant_plans', 'remove_plan', 'plan_label',
    'asserta', 'assertz', 'abolish',
    'count', 'findall', 'setof', 'min', 'max', 'sort',
    'member', 'nth', 'length', 'concat', 'union', 'intersection', 'difference', 'reverse', 'shuffle',
    'delete', 'sublist', 'suffix', 'prefix',
    'substring', 'term2string', 'string', 'type', 'ground', 'atom', 'number', 'list', 'structure',
    'random', 'math', 'floor', 'ceil',
    'date', 'time', 'nano_time',
    'my_name', 'all_names', 'df_register', 'df_deregister', 'df_search', 'df_subscribe',
    'succeed_goal', 'fail_goal', 'drop_all_desires', 'drop_all_events', 'drop_all_intentions',
    'drop_desire', 'drop_event', 'drop_intention',
    'current_intention', 'desire', 'intend', 'intention',
    'suspend', 'resume', 'suspended',
    'stopMAS', 'exit', 'perceive',
    'clone', 'eval', 'range', 'foreach',
    'log', 'verbose', 'set_verbose', 'literal', 'add_nested_source', 'list_rules', 'list_plans',
    'include'
  ]);

  // GL framework methods
  const GL_METHODS = new Set(['see', 'bind', 'call', 'result', 'candidate', 'check', 'get',
    'judge', 'decide', 'accept', 'reject', 'knowledge', 'explain']);

  /* ── Tokenizer ──────────────────────────────────────────── */
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
          if (source[j] === '\\') j++;
          j++;
        }
        if (j < len) j++;
        tokens.push({ text: source.slice(i, j), color: C.string });
        i = j;
        continue;
      }

      // ── Annotation [...] ──
      if (source[i] === '[') {
        let depth = 1, j = i + 1;
        while (j < len && depth > 0) {
          if (source[j] === '[') depth++;
          else if (source[j] === ']') depth--;
          j++;
        }
        const annot = source.slice(i, j);
        tokens.push({ text: annot, color: C.annotation });
        i = j;
        continue;
      }

      // ── Plan label @name ──
      if (source[i] === '@' && /[a-zA-Z_]/.test(source[i + 1] || '')) {
        const m = source.slice(i).match(/^@[a-zA-Z_]\w*/);
        if (m) {
          tokens.push({ text: m[0], color: C.planLabel });
          i += m[0].length;
          continue;
        }
      }

      // ── Plan body operator <- ──
      if (source[i] === '<' && source[i + 1] === '-') {
        tokens.push({ text: '<-', color: C.planBodyOp });
        i += 2;
        continue;
      }

      // ── Inference rule operator :- ──
      if (source[i] === ':' && source[i + 1] === '-') {
        tokens.push({ text: ':-', color: C.ruleOp });
        i += 2;
        continue;
      }

      // ── Internal action: .name( ──
      if (source[i] === '.' && /[a-z]/.test(source[i + 1] || '')) {
        const m = source.slice(i).match(/^\.([a-z][a-zA-Z_0-9]*)/);
        if (m) {
          const actName = m[1];
          tokens.push({ text: '.', color: C.dotPrefix });
          const color = INTERNAL_ACTIONS.has(actName) ? C.internalAct :
                        GL_METHODS.has(actName) ? C.glMethod : C.internalAct;
          tokens.push({ text: actName, color });
          i += m[0].length;
          continue;
        }
      }

      // ── Module call: gl.method( ──
      const mcMatch = source.slice(i).match(/^([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)\s*\(/);
      if (mcMatch && !KEYWORDS.has(mcMatch[1])) {
        const alias = mcMatch[1];
        const method = mcMatch[2];
        tokens.push({ text: alias, color: C.glAlias });
        tokens.push({ text: '.', color: C.plain });
        tokens.push({ text: method, color: GL_METHODS.has(method) ? C.glMethod : C.internalAct });
        tokens.push({ text: '(', color: C.plain });
        i += mcMatch[0].length;
        continue;
      }

      // ── Plan trigger: +!goal, -!goal, +?test, -?test, +belief, -belief ──
      // Only at line start or after whitespace
      if ((source[i] === '+' || source[i] === '-') && i === 0 || (source[i] === '+' || source[i] === '-') && (i === 0 || source[i - 1] === '\n' || /^\s*$/.test(source.slice(source.lastIndexOf('\n', i - 1) + 1, i)))) {
        const trigMatch = source.slice(i).match(/^([+-])([!?]?)([a-z_]\w*)/);
        if (trigMatch) {
          tokens.push({ text: trigMatch[1], color: C.trigger });
          if (trigMatch[2]) tokens.push({ text: trigMatch[2], color: C.goalOp });
          tokens.push({ text: trigMatch[3], color: C.goalName });
          i += trigMatch[0].length;
          continue;
        }
      }

      // ── Directive: {include, {register_function, {namespace ──
      if (source[i] === '{') {
        const dirMatch = source.slice(i).match(/^\{\s*(include|register_function|namespace)\b/);
        if (dirMatch) {
          tokens.push({ text: '{', color: C.plain });
          i++;
          // consume whitespace
          while (i < len && /\s/.test(source[i])) {
            tokens.push({ text: source[i], color: C.plain });
            i++;
          }
          tokens.push({ text: dirMatch[1], color: C.directive });
          i += dirMatch[1].length;
          continue;
        }
      }

      // ── begin/end namespace ──
      const nsMatch = source.slice(i).match(/^(begin|end)\s+(namespace)\b/);
      if (nsMatch) {
        tokens.push({ text: nsMatch[1], color: C.namespace });
        i += nsMatch[1].length;
        // whitespace
        while (i < len && /\s/.test(source[i])) {
          tokens.push({ text: source[i], color: C.plain });
          i++;
        }
        tokens.push({ text: 'namespace', color: C.namespace });
        i += 'namespace'.length;
        continue;
      }

      // ── Comparison operators ──
      const cmpOps = ['\\==', '==', '>=', '<=', '=..', '>', '<', '='];
      let foundCmp = false;
      for (const op of cmpOps) {
        if (source.slice(i, i + op.length) === op) {
          tokens.push({ text: op, color: C.comparison });
          i += op.length;
          foundCmp = true;
          break;
        }
      }
      if (foundCmp) continue;

      // ── Logical operators ──
      if ('&|~'.includes(source[i])) {
        tokens.push({ text: source[i], color: C.logical });
        i++;
        continue;
      }

      // ── Power operator ** ──
      if (source[i] === '*' && source[i + 1] === '*') {
        tokens.push({ text: '**', color: C.arithmetic });
        i += 2;
        continue;
      }

      // ── Goal operator ! or ? (not at line start) ──
      if (source[i] === '!' && /[a-z_]/.test(source[i + 1] || '')) {
        // Check if it's a subgoal dispatch (not at line start)
        tokens.push({ text: '!', color: C.goalOp });
        i++;
        continue;
      }

      // ── Word (identifier / keyword / variable) ──
      const wordMatch = source.slice(i).match(/^[a-zA-Z_]\w*/);
      if (wordMatch) {
        const word = wordMatch[0];
        if (KEYWORDS.has(word))         tokens.push({ text: word, color: C.keyword });
        else if (CONSTANTS.has(word))   tokens.push({ text: word, color: C.constant });
        else if (word === '_')          tokens.push({ text: word, color: C.anonVar });
        else if (/^[A-Z_]/.test(word))  tokens.push({ text: word, color: C.variable });
        else                            tokens.push({ text: word, color: C.plain });
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

      // ── Everything else ──
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
        html += `<span style="color:${t.color}">${escapeHtml(t.text)}</span>`;
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

    const parent = textarea.parentNode;
    const wrapper = document.createElement('div');
    wrapper.className = 'hl-editor-wrap';
    parent.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);

    overlay = document.createElement('pre');
    overlay.className = 'hl-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(overlay);

    textarea.addEventListener('scroll', syncScroll);
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
    } catch (_) {}

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => syncScroll()).observe(textarea);
    }

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
    const tokens = tokenize(source);
    overlay.innerHTML = renderTokens(tokens) + '\n';
    syncScroll();
  }

  // Expose for other scripts
  window.__glHighlight = function () {
    if (!overlay) setupOverlay();
    highlight();
  };

  /* ── Boot ────────────────────────────────────────────────── */
  function init() { setupOverlay(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  [100, 300, 600, 1200].forEach(ms => setTimeout(() => {
    if (!textarea) setupOverlay();
    else highlight();
  }, ms));
})();
