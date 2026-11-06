/* Play: the questions kit for the explainers on alexratman.com. Plain JS, no libraries, no network, nothing stored.
   A page puts the content of each widget in <script type="application/json" class="pl-data"> inside an element with
   data-pl="quiz | rows | dial | explorer | flow", next to a readable copy in .pl-static for readers without script.
   This file hides that copy and builds the live widget from the data. The same file holds a few helpers the pages share. */
(function (global) {
  'use strict';

  var reduceMotion = false;
  try {
    var mq = global.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = !!mq.matches;
    if (mq.addEventListener) mq.addEventListener('change', function (e) { reduceMotion = !!e.matches; });
  } catch (err) { reduceMotion = false; }

  /* ---------- the words the kit says itself (one place, so the language checks can read them) ---------- */
  var UI = {
    check: 'Check my answer',
    checkMany: 'Check my answers',
    pickFirst: 'Pick {what} first.',
    pickRows: 'Choose for every line first.',
    next: 'Next {unit}',
    seeResult: 'See how you did',
    again: 'Try another answer',
    retry: 'Try again',
    restart: 'Start again',
    prevArrow: 'Previous {unit}',
    nextArrow: 'Next {unit}',
    count: '{unit} {i} of {n}',
    dotNone: 'not tried yet',
    dotRight: 'right the first time',
    dotMissed: 'missed the first time',
    here: 'you are here',
    right1: 'Right.',
    wrong1: 'Not this one.',
    rightRight: 'Right {a}, right {b}.',
    rightWrong: 'Right {a}, wrong {b}.',
    wrongRight: 'Wrong {a}, right {b}.',
    wrongWrong: 'Not this time.',
    score: 'You got {k} of {n} right the first time.',
    scoreRows: '{k} of {n} right.',
    allRows: 'All {n} right.',
    facts: 'What you know',
    sayChip: 'How the best start begins',
    dialRight: 'Right setting.',
    dialLow: 'Not enough.',
    dialHigh: 'More than this job needs.',
    dialBetter: 'The better setting',
    dialAt: 'At this setting',
    dialFor: 'For this job',
    dialBack: 'Put the dial back',
    dialMinus: 'Turn the dial down one setting',
    dialPlus: 'Turn the dial up one setting',
    dialRest: 'The dial is back at rest. Pick a setting to try this job again.',
    dialNow: 'The dial is at {label}.',
    rowYes: 'Right',
    rowNo: 'Not this one',
    better: 'The better choice',
    yes: 'Yes',
    no: 'No',
    back: 'Back one question',
    qOf: 'Question {i}',
    youSaid: 'You said',
    flowResult: 'Your start',
    barText: '{label}: {v} of {max}',
    pickedMark: 'your pick',
    rightMark: 'the right answer'
  };
  /* the word the widget uses for one item (Job, Problem, Case), in lower case, for the Next and Previous buttons */
  function unitWord(d) { return String((d && d.unit) || 'job').toLowerCase(); }
  function fmt(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); }

  /* ---------- small helpers ---------- */
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function indexOfId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return -1; }
  var PATHS = {
    check: 'M5 12.5l4.5 4.5L19 7.5', cross: 'M6 6l12 12M18 6L6 18', half: 'M5 12h14',
    right: 'M5 12h14M13 6l6 6-6 6', left: 'M19 12H5M11 6l-6 6 6 6', minus: 'M5 12h14', plus: 'M12 5v14M5 12h14',
    replay: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5', copy: 'M9 9h10v10H9zM5 15V5h10'
  };
  function icon(name, size) {
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    svg.setAttribute('width', size || 14); svg.setAttribute('height', size || 14); svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2.6');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    p.setAttribute('d', PATHS[name]); svg.appendChild(p);
    return svg;
  }
  var uidN = 0;
  function uid(p) { uidN += 1; return (p || 'pl') + '-' + uidN; }
  function pressToggle(btn, on) { btn.classList.toggle('is-on', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  /* A held-down Enter key repeats, and every repeat would press the button again. One press should do one thing. */
  function noRepeat(node) { node.addEventListener('keydown', function (e) { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }); }
  /* Put the keyboard focus on a node without a big jump of the page: scroll only as far as needed to show it. */
  function focusNear(node) {
    try { node.focus({ preventScroll: true }); } catch (err) { node.focus(); return; }
    if (node.scrollIntoView) node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  /* Bring a block into view if it sits above the screen or too far down; leave the page alone if the reader can already see it. */
  function ensureVisible(node) {
    var r = node.getBoundingClientRect(), vh = global.innerHeight || document.documentElement.clientHeight;
    if (r.top < 8) global.scrollTo({ top: global.pageYOffset + r.top - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
    else if (r.top > vh * 0.7) global.scrollTo({ top: global.pageYOffset + r.top - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  var sayNode = null, sayTimer = 0;
  function announce(text) {
    if (!sayNode) {
      sayNode = el('div', 'visually-hidden'); sayNode.setAttribute('role', 'status'); sayNode.setAttribute('aria-live', 'polite'); sayNode.setAttribute('aria-atomic', 'true');
      document.body.appendChild(sayNode);
    }
    clearTimeout(sayTimer); sayNode.textContent = '';
    sayTimer = setTimeout(function () { sayNode.textContent = text; }, 60);
  }

  /* ---------- markup-lite: [text](url), **bold**, `code`. The build script reads it the same way. ---------- */
  var MARK = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  function rich(node, text) {
    var s = String(text), last = 0, m;
    MARK.lastIndex = 0;
    while ((m = MARK.exec(s))) {
      if (m.index > last) node.appendChild(document.createTextNode(s.slice(last, m.index)));
      if (m[1] != null) node.appendChild(el('strong', null, m[1]));
      else if (m[2] != null) node.appendChild(el('code', 'pl__code', m[2]));
      else {
        var a = el('a', null, m[3]); a.href = m[4];
        if (/^https?:/.test(m[4])) { a.target = '_blank'; a.rel = 'noopener'; }
        node.appendChild(a);
      }
      last = m.index + m[0].length;
    }
    if (last < s.length) node.appendChild(document.createTextNode(s.slice(last)));
    return node;
  }
  /* a label that already ends in . ! or ? must not get a second full stop when a sentence follows it */
  function stop(text) { var t = String(text); return /[.!?]["\u201d\u2019')\]]*$/.test(t) ? t : t + '.'; }
  function plain(text) { return String(text).replace(MARK, function (m, b, c, l) { return b != null ? b : (c != null ? c : l); }); }
  function rp(cls, text) { return rich(el('p', cls), text); }   /* a paragraph from markup-lite */

  /* A widget whose text changes must not change height, or the page jumps under the reader's finger.
     So the live element shares one grid cell with hidden copies of every other state; the cell is as tall as the tallest. */
  function ghostBuild(live, n, build) {
    var host = live.parentNode; host.classList.add('stab');
    for (var i = 0; i < n; i++) {
      var g = live.cloneNode(false);
      g.removeAttribute('id'); g.removeAttribute('aria-live'); g.removeAttribute('role');
      g.classList.add(host.classList.contains('stepper__stack') ? 'stepper__ghost' : 'stab__ghost');
      g.setAttribute('aria-hidden', 'true');
      build(g, i);
      host.appendChild(g);
    }
  }
  function fill(node, build, i) { node.textContent = ''; build(node, i); }

  /* tabs with one panel of fixed height (stages, the six parts, the starts) */
  function stepper(card, data, build, after, variants) {
    if (!card) return;
    var btns = Array.prototype.slice.call(card.querySelectorAll('.stepper__tabs .toggle'));
    var live = card.querySelector('.stepper__live');
    if (!live) return;
    variants = variants || [null];   /* other looks of the same panel that must fit too, such as a longer button label */
    ghostBuild(live, data.length * variants.length, function (node, i) { build(node, data[i % data.length], variants[Math.floor(i / data.length)]); });
    function show(i) { fill(live, function (node) { build(node, data[i]); }); if (after) after(live, data[i]); }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.getAttribute('data-i'), 10);
        btns.forEach(function (x) { pressToggle(x, x === b); });
        show(i);
      });
    });
    show(0);
  }

  function copyText(text, done) {
    function fallback() {
      var prev = document.activeElement;   /* selecting the helper box takes the focus; give it back afterwards */
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (prev && prev !== document.body && prev.focus) { try { prev.focus({ preventScroll: true }); } catch (e2) { prev.focus(); } }
      done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  }

  /* ---------- parts every widget shares ---------- */
  function head(d) {
    var h = el('div', 'pl__head');
    h.appendChild(el('p', 'label label--muted', d.label));
    h.appendChild(rp('pl__title', d.title));
    return h;
  }
  function jobBlock(job, idBase, factsHead) {
    var box = el('div', 'pl__job'); box.id = idBase; box.tabIndex = -1;
    box.setAttribute('role', 'group'); box.setAttribute('aria-labelledby', idBase + '-t');
    var t = el('p', 'pl__jobtitle'); t.id = idBase + '-t'; rich(t, job.title); box.appendChild(t);
    if (job.text) box.appendChild(rp('pl__jobtext', job.text));
    if (job.facts && job.facts.length) {
      var fh = el('p', 'pl__sech', factsHead || UI.facts); box.appendChild(fh);
      var ul = el('ul', 'pl__facts');
      job.facts.forEach(function (f) { var li = el('li'); rich(li, f); ul.appendChild(li); });
      box.appendChild(ul);
    }
    return box;
  }
  function section(headText, parts) {
    var s = el('div', 'pl__sec');
    if (headText) s.appendChild(el('p', 'pl__sech', headText));
    var p = el('p'); parts.forEach(function (x) { if (typeof x === 'string') rich(p, x); else p.appendChild(x); }); s.appendChild(p);
    return s;
  }
  function verdictLine(kind, text) {
    var v = el('p', 'pl__verdict');
    var i = el('span', 'pl__vicon'); i.appendChild(icon(kind === 'ok' ? 'check' : (kind === 'no' ? 'cross' : 'half'), 14)); v.appendChild(i);
    v.appendChild(el('span', null, text));
    return v;
  }
  function mark(label, kind) {   /* a tick or a cross after an option once the answer is checked */
    var m = el('span', 'pl__mark'); m.appendChild(icon(kind === 'right' ? 'check' : 'cross', 14));
    m.appendChild(el('span', 'visually-hidden', ' (' + (kind === 'right' ? UI.rightMark : UI.pickedMark) + ')'));
    label.appendChild(m);
  }
  /* one set of radio buttons drawn as buttons (segs) or as a list (list). Native radios: arrow keys and screen readers work for free. */
  function optionSet(name, layout, options, picked, locked, rightId, labelledBy) {
    var wrap = el('div', 'pl__' + (layout === 'list' ? 'list' : 'segs'));
    wrap.setAttribute('role', 'radiogroup');
    if (labelledBy) wrap.setAttribute('aria-labelledby', labelledBy);   /* a group of radio buttons needs a name that says what the choice is about */
    options.forEach(function (o, k) {
      var lab = el('label', 'pl__opt');
      var inp = el('input'); inp.type = 'radio'; inp.name = name; inp.value = o.id; inp.id = name + '-' + k;
      if (picked === o.id) inp.checked = true;
      if (locked) inp.disabled = true;
      var span = el('span'); rich(span, o.label);
      lab.appendChild(inp); lab.appendChild(span);
      if (locked) {
        if (o.id === rightId) { lab.setAttribute('data-mark', 'right'); mark(span, 'right'); }
        else if (picked === o.id) { lab.setAttribute('data-mark', 'wrong'); mark(span, 'wrong'); }
      }
      wrap.appendChild(lab);
    });
    return wrap;
  }

  /* ======================================================================
     quiz: jobs with one or two answer parts and a check
     ====================================================================== */
  function quiz(host, d) {
    var N = d.jobs.length, P = d.parts.length, base = host.id || uid('quiz');
    var S = d.jobs.map(function () { var p = []; for (var i = 0; i < P; i++) p.push(null); return { picked: p, checked: false, first: null, res: null }; });
    var cur = 0;
    var live = el('div', 'pl-live');
    var count = el('p', 'pl__count'), dots = el('ol', 'pl__dots'), arrows = el('div', 'pl__arrows');
    var prevB = el('button', 'pl__arrow'); prevB.type = 'button'; prevB.setAttribute('aria-label', fmt(UI.prevArrow, { unit: unitWord(d) })); prevB.appendChild(icon('left', 16));
    var nextB = el('button', 'pl__arrow'); nextB.type = 'button'; nextB.setAttribute('aria-label', fmt(UI.nextArrow, { unit: unitWord(d) })); nextB.appendChild(icon('right', 16));
    arrows.appendChild(prevB); arrows.appendChild(nextB);
    var bar = el('div', 'pl__bar');
    var left = el('div', 'pl__barleft'); left.appendChild(count); left.appendChild(dots); bar.appendChild(left);
    if (N > 1) bar.appendChild(arrows); else bar.hidden = true;
    var body = el('div', 'pl__body'), sum = el('div', 'pl__sum'); sum.hidden = true;
    live.appendChild(head(d)); live.appendChild(bar); live.appendChild(body); live.appendChild(sum);
    host.appendChild(live);

    function allDone() { return S.every(function (s) { return s.first !== null; }); }
    function drawDots() {
      dots.textContent = '';
      S.forEach(function (s, i) {
        var li = el('li', 'pl__dot' + (s.first === 'right' ? ' is-right' : (s.first === 'missed' ? ' is-missed' : '')) + (i === cur ? ' is-now' : ''));
        var t = el('span', 'visually-hidden', d.unit + ' ' + (i + 1) + ': ' + (s.first === 'right' ? UI.dotRight : (s.first === 'missed' ? UI.dotMissed : UI.dotNone)) + (i === cur ? ', ' + UI.here : ''));
        li.appendChild(t); dots.appendChild(li);
      });
      count.textContent = fmt(UI.count, { unit: d.unit, i: cur + 1, n: N });
      prevB.disabled = cur === 0; nextB.disabled = cur === N - 1;
    }
    function verdictText(res) {
      var names = d.parts.map(function (p) { return p.name; });
      if (P === 1) return res[0] ? UI.right1 : UI.wrong1;
      if (res[0] && res[1]) return fmt(UI.rightRight, { a: names[0], b: names[1] });
      if (res[0]) return fmt(UI.rightWrong, { a: names[0], b: names[1] });
      if (res[1]) return fmt(UI.wrongRight, { a: names[0], b: names[1] });
      return UI.wrongWrong;
    }
    function nextTarget() {   /* the next job nobody has answered yet, or -1 when all are done */
      for (var k = 1; k <= N; k++) { var j = (cur + k) % N; if (S[j].first === null) return j; }
      return -1;
    }
    function feedback(i) {
      var job = d.jobs[i], st = S[i], res = st.res, all = res.every(Boolean);
      var kind = all ? 'ok' : (res.some(Boolean) ? 'part' : 'no');
      var fb = el('div', 'pl__fb pl__fb--' + kind); fb.tabIndex = -1; fb.setAttribute('role', 'group');
      var v = verdictLine(kind, verdictText(res)); v.id = base + '-v'; fb.setAttribute('aria-labelledby', v.id); fb.appendChild(v);
      job.answers.forEach(function (a, gi) {
        var part = d.parts[gi], picked = byId(a.options, st.picked[gi]), right = byId(a.options, a.right);
        fb.appendChild(section(part.sayHead || '', [picked.says]));
        if (!res[gi] && part.bestHead) fb.appendChild(section(part.bestHead, ['**' + stop(plain(right.label)) + '** ' + right.says]));
      });
      if (job.chip) {
        var cs = el('div', 'pl__sec'); cs.appendChild(el('p', 'pl__sech', job.chipHead || UI.sayChip));
        cs.appendChild(rich(el('p', 'pl__chip'), job.chip)); fb.appendChild(cs);
      }
      var acts = el('div', 'pl__fbacts');
      var tgt = nextTarget();
      var nx = el('button', 'btn pl__next'); nx.type = 'button';
      nx.appendChild(el('span', null, tgt === -1 ? UI.seeResult : fmt(UI.next, { unit: unitWord(d) }))); nx.appendChild(icon('right'));
      var ag = el('button', 'btn btn--secondary pl__again'); ag.type = 'button'; ag.appendChild(el('span', null, UI.again));
      acts.appendChild(nx); acts.appendChild(ag); fb.appendChild(acts);
      nx.addEventListener('click', function (e) {
        var t = nextTarget();
        if (t === -1) { showSum(true); } else { show(t, e.detail === 0); }
      });
      ag.addEventListener('click', function (e) {
        S[i].checked = false; S[i].res = null; for (var g = 0; g < P; g++) S[i].picked[g] = null;
        show(i, false); var f = body.querySelector('input'); if (f) focusNear(f);
      });
      return fb;
    }
    function show(i, moveFocus) {
      cur = i; var job = d.jobs[i], st = S[i];
      body.textContent = '';
      var jb = jobBlock(job, base + '-j' + i, d.factsHead); body.appendChild(jb);
      var inputs = [];
      job.answers.forEach(function (a, gi) {
        var part = d.parts[gi];
        var g = el('fieldset', 'pl__group'); var lg = el('legend', 'pl__legend');
        if (P > 1) { lg.appendChild(el('span', 'pl__gnum', String(gi + 1))); lg.appendChild(document.createTextNode(' ')); }
        lg.appendChild(el('span', null, part.head)); g.appendChild(lg);
        var set = optionSet(base + '-j' + i + '-g' + gi, part.layout, a.options, st.picked[gi], st.checked, a.right);
        each(set.querySelectorAll('input'), function (inp) {
          inputs.push(inp);
          inp.addEventListener('change', function () { st.picked[gi] = inp.value; update(); });
        });
        g.appendChild(set); body.appendChild(g);
      });
      var actions = el('div', 'pl__actions');
      var chk = el('button', 'btn pl__check'); chk.type = 'button'; chk.appendChild(el('span', null, UI.check)); chk.appendChild(icon('right'));
      var hint = el('p', 'pl__hint'); hint.id = base + '-h' + i; chk.setAttribute('aria-describedby', hint.id);
      actions.appendChild(chk); actions.appendChild(hint);
      if (!st.checked) body.appendChild(actions);
      function update() {
        var missing = [];
        job.answers.forEach(function (a, gi) { if (st.picked[gi] === null) missing.push(d.parts[gi].pick || 'an answer'); });
        chk.disabled = missing.length > 0;
        hint.textContent = missing.length ? fmt(UI.pickFirst, { what: missing.join(' and ') }) : '';
      }
      noRepeat(chk);
      chk.addEventListener('click', function () {
        if (chk.disabled || st.checked) return;
        st.res = job.answers.map(function (a, gi) { return st.picked[gi] === a.right; });
        st.checked = true;
        if (st.first === null) st.first = st.res.every(Boolean) ? 'right' : 'missed';
        show(i, false);
        var fb2 = body.querySelector('.pl__fb'); if (fb2) { focusNear(fb2); }
      });
      if (st.checked) { var fb = feedback(i); body.appendChild(fb); } else update();
      drawDots();
      if (allDone()) showSum(false); else sum.hidden = true;
      if (moveFocus) { ensureVisible(live); focusNear(jb); }
    }
    function showSum(scroll) {
      var k = S.filter(function (s) { return s.first === 'right'; }).length;
      sum.textContent = '';
      sum.appendChild(el('p', 'pl__sumscore', fmt(UI.score, { k: k, n: N })));
      if (d.summary) {
        if (d.summary.head) sum.appendChild(el('p', 'pl__sech', d.summary.head));
        sum.appendChild(rp('pl__sumtext', d.summary.text));
      }
      var rs = el('button', 'btn btn--secondary pl__restart'); rs.type = 'button';
      rs.appendChild(icon('replay')); rs.appendChild(el('span', null, UI.restart));
      rs.addEventListener('click', function () {
        S.forEach(function (s) { s.checked = false; s.first = null; s.res = null; for (var g = 0; g < P; g++) s.picked[g] = null; });
        sum.hidden = true; show(0, true);
      });
      sum.appendChild(rs); sum.hidden = false;
      if (scroll) { sum.tabIndex = -1; sum.setAttribute('role', 'group'); sum.setAttribute('aria-label', fmt(UI.score, { k: k, n: N })); focusNear(sum); }
    }
    prevB.addEventListener('click', function (e) { if (cur > 0) show(cur - 1, e.detail === 0); });
    nextB.addEventListener('click', function (e) { if (cur < N - 1) show(cur + 1, e.detail === 0); });
    show(0, false);
  }

  /* ======================================================================
     rows: a list of lines, a choice for each, one check
     ====================================================================== */
  function rows(host, d) {
    var base = host.id || uid('rows'), picked = [], checked = false;
    d.rows.forEach(function () { picked.push(null); });
    var live = el('div', 'pl-live'); live.appendChild(head(d));
    var list = el('ol', 'pl-rows'); live.appendChild(list);
    var actions = el('div', 'pl__actions'), chk = el('button', 'btn pl__check'), hint = el('p', 'pl__hint');
    chk.type = 'button'; chk.appendChild(el('span', null, UI.checkMany)); chk.appendChild(icon('right'));
    hint.id = base + '-h'; chk.setAttribute('aria-describedby', hint.id); chk.disabled = true; hint.textContent = UI.pickRows;
    actions.appendChild(chk); actions.appendChild(hint); live.appendChild(actions);
    var out = el('div', 'pl__fb pl__fb--ok'); out.hidden = true; out.tabIndex = -1; out.setAttribute('role', 'group');
    live.appendChild(out); host.appendChild(live);
    function draw() {
      list.textContent = '';
      d.rows.forEach(function (r, i) {
        var li = el('li', 'pl-row'); var line = el('div', 'pl-row__line'); line.id = base + '-r' + i + '-t'; rich(line, r.text); li.appendChild(line);
        var set = optionSet(base + '-r' + i, 'segs', d.choices, picked[i], checked, r.right, line.id);
        set.classList.add('pl-row__set');
        each(set.querySelectorAll('input'), function (inp) { inp.addEventListener('change', function () { picked[i] = inp.value; update(); }); });
        li.appendChild(set);
        if (checked) {
          var ok = picked[i] === r.right; li.classList.add(ok ? 'is-ok' : 'is-no');
          var why = el('div', 'pl-row__why');
          var tag = el('p', 'pl-row__verdict'); tag.appendChild(icon(ok ? 'check' : 'cross', 14)); tag.appendChild(el('span', null, ok ? UI.rowYes : UI.rowNo));
          why.appendChild(tag);
          var lab = byId(d.choices, r.right).label;
          if (!ok) { var b = el('p'); rich(b, '**' + UI.better + ': ' + stop(plain(lab)) + '** ' + r.says); why.appendChild(b); } else why.appendChild(rp(null, r.says));
          if (r.fix) { var fx = el('p', 'pl-row__fix'); fx.appendChild(el('span', 'pl__sech', r.fixHead || 'Try this')); fx.appendChild(rp(null, r.fix)); why.appendChild(fx); }
          li.appendChild(why);
        }
        list.appendChild(li);
      });
    }
    function update() {
      var all = picked.every(function (p) { return p !== null; });
      chk.disabled = !all || checked; hint.textContent = all || checked ? '' : UI.pickRows;
    }
    noRepeat(chk);
    chk.addEventListener('click', function () {
      if (chk.disabled || checked) return;
      checked = true; draw();
      var k = 0; d.rows.forEach(function (r, i) { if (picked[i] === r.right) k++; });
      out.textContent = ''; out.hidden = false;
      var kind = k === d.rows.length ? 'ok' : (k > 0 ? 'part' : 'no'); out.className = 'pl__fb pl__fb--' + kind;
      var v = verdictLine(kind, k === d.rows.length ? fmt(UI.allRows, { n: k }) : fmt(UI.scoreRows, { k: k, n: d.rows.length }));
      v.id = base + '-v'; out.setAttribute('aria-labelledby', v.id); out.appendChild(v);
      if (d.summary) out.appendChild(rp('pl__sumtext', d.summary));
      var rt = el('button', 'btn btn--secondary pl__again'); rt.type = 'button'; rt.appendChild(icon('replay')); rt.appendChild(el('span', null, UI.retry));
      var acts = el('div', 'pl__fbacts'); acts.appendChild(rt); out.appendChild(acts);
      rt.addEventListener('click', function () {
        checked = false; for (var i = 0; i < picked.length; i++) picked[i] = null;
        out.hidden = true; draw(); update(); var f = list.querySelector('input'); if (f) focusNear(f);
      });
      update(); focusNear(out);
    });
    draw(); update();
  }

  /* ======================================================================
     dial: turn it to the setting you would choose; the first turn counts
     ====================================================================== */
  var NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]); return e; }
  function dial(host, d) {
    var N = d.jobs.length, K = d.stops.length, base = host.id || uid('dial');
    var S = d.jobs.map(function () { return { cur: -1, first: -1 }; });
    var cur = 0, REST = -90, ANG = function (k) { return K === 1 ? 0 : -55 + (110 * k) / (K - 1); };
    var live = el('div', 'pl-live');
    var count = el('p', 'pl__count'), dots = el('ol', 'pl__dots'), arrows = el('div', 'pl__arrows');
    var prevB = el('button', 'pl__arrow'); prevB.type = 'button'; prevB.setAttribute('aria-label', fmt(UI.prevArrow, { unit: unitWord(d) })); prevB.appendChild(icon('left', 16));
    var nextB = el('button', 'pl__arrow'); nextB.type = 'button'; nextB.setAttribute('aria-label', fmt(UI.nextArrow, { unit: unitWord(d) })); nextB.appendChild(icon('right', 16));
    arrows.appendChild(prevB); arrows.appendChild(nextB);
    var bar = el('div', 'pl__bar'), left = el('div', 'pl__barleft'); left.appendChild(count); left.appendChild(dots); bar.appendChild(left); if (N > 1) bar.appendChild(arrows); else bar.hidden = true;
    var body = el('div', 'pl__body'), sum = el('div', 'pl__sum'); sum.hidden = true;
    live.appendChild(head(d)); live.appendChild(bar); live.appendChild(body); live.appendChild(sum); host.appendChild(live);

    function drawDots() {
      dots.textContent = '';
      S.forEach(function (s, i) {
        var res = s.first < 0 ? null : (d.stops[s.first].id === d.jobs[i].right ? 'right' : 'missed');
        var li = el('li', 'pl__dot' + (res === 'right' ? ' is-right' : (res === 'missed' ? ' is-missed' : '')) + (i === cur ? ' is-now' : ''));
        li.appendChild(el('span', 'visually-hidden', d.unit + ' ' + (i + 1) + ': ' + (res === 'right' ? UI.dotRight : (res === 'missed' ? UI.dotMissed : UI.dotNone)) + (i === cur ? ', ' + UI.here : '')));
        dots.appendChild(li);
      });
      count.textContent = fmt(UI.count, { unit: d.unit, i: cur + 1, n: N });
      prevB.disabled = cur === 0; nextB.disabled = cur === N - 1;
    }
    function done() { return S.every(function (s) { return s.first >= 0; }); }
    function nextTarget() { for (var k = 1; k <= N; k++) { var j = (cur + k) % N; if (S[j].first < 0) return j; } return -1; }
    function show(i, moveFocus) {
      cur = i; var job = d.jobs[i], st = S[i], rightIdx = indexOfId(d.stops, job.right);
      body.textContent = '';
      var jb = jobBlock(job, base + '-j' + i, d.factsHead); body.appendChild(jb);
      /* the dial: a half circle with one tick for every setting and a needle; the buttons below do the real work */
      var wrap = el('div', 'pl-dial');
      var minus = el('button', 'pl__arrow pl-dial__step'); minus.type = 'button'; minus.setAttribute('aria-label', UI.dialMinus); minus.appendChild(icon('minus', 16));
      var plus = el('button', 'pl__arrow pl-dial__step'); plus.type = 'button'; plus.setAttribute('aria-label', UI.dialPlus); plus.appendChild(icon('plus', 16));
      var svg = svgEl('svg', { viewBox: '0 0 220 120', class: 'pl-dial__svg', 'aria-hidden': 'true', focusable: 'false' });
      svg.appendChild(svgEl('path', { d: 'M30.5 67.7 A90 90 0 0 1 189.5 67.7', class: 'pl-dial__arc', fill: 'none' }));
      for (var k = 0; k < K; k++) {
        var a = ANG(k) * Math.PI / 180, x1 = 110 + Math.sin(a) * 80, y1 = 110 - Math.cos(a) * 80, x2 = 110 + Math.sin(a) * 100, y2 = 110 - Math.cos(a) * 100;
        svg.appendChild(svgEl('line', { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), class: 'pl-dial__tick', 'data-k': k }));
      }
      var needle = svgEl('line', { x1: 110, y1: 110, x2: 110, y2: 38, class: 'pl-dial__needle' });
      svg.appendChild(needle); svg.appendChild(svgEl('circle', { cx: 110, cy: 110, r: 7, class: 'pl-dial__hub' }));
      wrap.appendChild(minus); wrap.appendChild(svg); wrap.appendChild(plus); body.appendChild(wrap);
      var stops = el('div', 'pl-dial__stops'); stops.setAttribute('role', 'radiogroup'); stops.setAttribute('aria-label', d.dialName || '');
      var radios = [];
      d.stops.forEach(function (s, k2) {
        var lab = el('label', 'pl__opt'); var inp = el('input'); inp.type = 'radio'; inp.name = base + '-j' + i; inp.value = s.id; inp.id = base + '-j' + i + '-' + k2;
        var span = el('span'); rich(span, s.label); lab.appendChild(inp); lab.appendChild(span); stops.appendChild(lab); radios.push(inp);
        inp.addEventListener('change', function () { turn(k2); });
      });
      body.appendChild(stops);
      var info = el('div', 'pl-dial__info'); info.setAttribute('aria-live', 'polite'); info.setAttribute('aria-atomic', 'true'); body.appendChild(info);
      var acts = el('div', 'pl__fbacts'), nx = el('button', 'btn pl__next'), rs = el('button', 'btn btn--secondary pl-dial__back');
      nx.type = 'button'; rs.type = 'button'; rs.appendChild(icon('replay')); rs.appendChild(el('span', null, UI.dialBack));
      acts.appendChild(nx); acts.appendChild(rs); acts.hidden = true; body.appendChild(acts);
      var hintEl = el('p', 'pl__hint pl-dial__hint', d.hint); body.appendChild(hintEl);

      function paint() {
        var c = st.cur;
        needle.style.transform = 'rotate(' + (c < 0 ? REST : ANG(c)) + 'deg)';
        each(svg.querySelectorAll('.pl-dial__tick'), function (t) { t.classList.toggle('is-on', parseInt(t.getAttribute('data-k'), 10) === c); });
        radios.forEach(function (r, k3) { r.checked = k3 === c; });
        minus.disabled = c <= 0; plus.disabled = c < 0 || c >= K - 1;   /* at rest, only a setting button starts the dial, so the first turn is never a guess */
        var first = st.first;
        info.textContent = '';
        if (first < 0) { hintEl.hidden = false; acts.hidden = true; return; }
        hintEl.hidden = true;
        var fbKind = first === rightIdx ? 'ok' : 'no';
        var fb = el('div', 'pl__fb pl__fb--' + fbKind);
        var vt = first === rightIdx ? UI.dialRight : (first < rightIdx ? UI.dialLow : UI.dialHigh);
        fb.appendChild(verdictLine(fbKind, vt));
        if (first !== rightIdx) fb.appendChild(section(UI.dialBetter, ['**' + stop(plain(d.stops[rightIdx].label)) + '** ' + job.says[job.right]]));
        else if (job.takeaway) fb.appendChild(rp('pl__sumtext', job.takeaway));
        info.appendChild(fb);
        if (c >= 0) {
          var now = el('div', 'pl-dial__now');
          now.appendChild(el('p', 'pl__sech', UI.dialAt + ': ' + plain(d.stops[c].label)));
          now.appendChild(rp(null, d.stops[c].means));
          var fr = el('p', 'pl-dial__for'); fr.appendChild(el('span', 'pl__sech', UI.dialFor)); fr.appendChild(document.createTextNode(' ')); fr.appendChild(rp(null, job.says[d.stops[c].id])); now.appendChild(fr);
          info.appendChild(now);
        }
        var t = nextTarget(); nx.textContent = ''; nx.appendChild(el('span', null, t === -1 ? UI.seeResult : fmt(UI.next, { unit: unitWord(d) }))); nx.appendChild(icon('right'));
        acts.hidden = false;
      }
      function turn(k4) {
        if (k4 < 0 || k4 >= K) return;
        st.cur = k4; if (st.first < 0) st.first = k4;
        paint(); drawDots();
        if (done()) showSum(false);
      }
      minus.addEventListener('click', function () { if (st.cur > 0) { turn(st.cur - 1); } });
      plus.addEventListener('click', function () { if (st.cur >= 0 && st.cur < K - 1) { turn(st.cur + 1); } });
      noRepeat(minus); noRepeat(plus);
      /* "Put the dial back" starts this job again: the needle goes to rest, and the verdict, the first answer and its dot are cleared */
      rs.addEventListener('click', function () { st.cur = -1; st.first = -1; sum.hidden = true; paint(); drawDots(); announce(UI.dialRest); focusNear(radios[0]); });
      nx.addEventListener('click', function (e) { var t = nextTarget(); if (t === -1) showSum(true); else show(t, e.detail === 0); });
      paint(); drawDots();
      if (moveFocus) { ensureVisible(live); focusNear(jb); }
    }
    function showSum(scroll) {
      var k = 0; S.forEach(function (s, i) { if (s.first >= 0 && d.stops[s.first].id === d.jobs[i].right) k++; });
      sum.textContent = ''; sum.appendChild(el('p', 'pl__sumscore', fmt(UI.score, { k: k, n: N })));
      if (d.summary) { if (d.summary.head) sum.appendChild(el('p', 'pl__sech', d.summary.head)); sum.appendChild(rp('pl__sumtext', d.summary.text)); }
      var rs = el('button', 'btn btn--secondary pl__restart'); rs.type = 'button'; rs.appendChild(icon('replay')); rs.appendChild(el('span', null, UI.restart));
      rs.addEventListener('click', function () { S.forEach(function (s) { s.cur = -1; s.first = -1; }); sum.hidden = true; show(0, true); });
      sum.appendChild(rs); sum.hidden = false;
      if (scroll) { sum.tabIndex = -1; sum.setAttribute('role', 'group'); sum.setAttribute('aria-label', fmt(UI.score, { k: k, n: N })); focusNear(sum); }
    }
    prevB.addEventListener('click', function (e) { if (cur > 0) show(cur - 1, e.detail === 0); });
    nextB.addEventListener('click', function (e) { if (cur < N - 1) show(cur + 1, e.detail === 0); });
    show(0, false);
  }

  /* ======================================================================
     explorer: switch between settings and compare; bars are a rough guide
     ====================================================================== */
  function explorer(host, d) {
    var base = host.id || uid('ex');
    var live = el('div', 'pl-live'); live.appendChild(head(d));
    var tabs = el('div', 'pl-ex__tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', plain(d.title));
    var btns = [];
    d.tabs.forEach(function (t, i) {
      var b = el('button', 'toggle'); b.type = 'button'; b.setAttribute('data-i', i); rich(b, t.label); b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-controls', base + '-panel');
      tabs.appendChild(b); btns.push(b);
    });
    var stack = el('div', 'pl-ex__stack');
    var panel = el('div', 'pl-ex__panel'); panel.id = base + '-panel'; panel.setAttribute('aria-live', 'polite');
    stack.appendChild(panel);
    live.appendChild(tabs); live.appendChild(stack); host.appendChild(live);
    function build(node, t) {
      node.appendChild(rp('pl-ex__lead', t.lead));
      var dl = el('dl', 'pl-ex__rows');
      t.rows.forEach(function (r) { var row = el('div', 'pl-ex__row'); var dt = el('dt', 'pl__sech', r[0]); var dd = el('dd'); rich(dd, r[1]); row.appendChild(dt); row.appendChild(dd); dl.appendChild(row); });
      node.appendChild(dl);
      if (d.bars && d.bars.length) {
        var bars = el('div', 'pl-bars');
        d.bars.forEach(function (label, bi) {
          var v = t.values[bi], row = el('div', 'pl-bar');
          row.appendChild(el('p', 'pl-bar__label', label));
          var track = el('div', 'pl-bar__track'); track.setAttribute('role', 'img'); track.setAttribute('aria-label', fmt(UI.barText, { label: label, v: v, max: d.max || 5 }));
          for (var s = 0; s < (d.max || 5); s++) track.appendChild(el('span', 'pl-bar__seg' + (s < v ? ' is-on' : '')));
          row.appendChild(track); bars.appendChild(row);
        });
        node.appendChild(bars);
        if (d.note) node.appendChild(el('p', 'pl-ex__note', d.note));
      }
      if (t.takeaway) { var tk = el('p', 'pl-ex__take'); tk.appendChild(icon('right', 14)); var tx = el('span'); tx.appendChild(el('strong', null, (d.takeawayHead || 'Takeaway') + ': ')); rich(tx, t.takeaway); tk.appendChild(tx); node.appendChild(tk); }
      if (t.link) { var lk = el('p', 'pl-ex__link'); rich(lk, '[' + t.link.text + '](' + t.link.href + ')'); node.appendChild(lk); }
    }
    ghostBuild(panel, d.tabs.length, function (node, i) { build(node, d.tabs[i]); });
    function showTab(i) { btns.forEach(function (b, k) { pressToggle(b, k === i); }); fill(panel, function (node) { build(node, d.tabs[i]); }); }
    btns.forEach(function (b) { b.addEventListener('click', function () { showTab(parseInt(b.getAttribute('data-i'), 10)); }); });
    showTab(0);
  }

  /* ======================================================================
     flow: a few yes or no questions that end in one answer
     ====================================================================== */
  function flow(host, d) {
    var base = host.id || uid('flow'), trail = [], at = d.start;
    var live = el('div', 'pl-live'); live.appendChild(head(d)); var box = el('div', 'pl-flow'); live.appendChild(box); host.appendChild(live);
    function draw(moveFocus) {
      box.textContent = '';
      if (trail.length) {
        var tr = el('ol', 'pl-flow__trail');
        trail.forEach(function (t) { var li = el('li'); li.appendChild(el('span', 'pl__sech', UI.youSaid + ': ')); li.appendChild(el('strong', null, t.ans ? UI.yes : UI.no)); li.appendChild(document.createTextNode(' · ' + plain(d.nodes[t.id].q))); tr.appendChild(li); });
        box.appendChild(tr);
      }
      var node = d.nodes[at], focusMe;
      if (node) {
        var q = el('div', 'pl-flow__q'); q.tabIndex = -1; q.setAttribute('role', 'group'); var qt = el('p', 'pl-flow__qt'); qt.id = base + '-q' + trail.length; rich(qt, node.q); q.setAttribute('aria-labelledby', qt.id);
        q.appendChild(el('p', 'pl__sech', fmt(UI.qOf, { i: trail.length + 1 }))); q.appendChild(qt);
        if (node.help) q.appendChild(rp('pl__hint', node.help));
        var row = el('div', 'pl__fbacts'), y = el('button', 'btn btn--secondary'), n = el('button', 'btn btn--secondary');
        y.type = 'button'; n.type = 'button'; y.textContent = UI.yes; n.textContent = UI.no;
        y.addEventListener('click', function (e) { trail.push({ id: at, ans: true }); at = node.yes; draw(e.detail === 0); });
        n.addEventListener('click', function (e) { trail.push({ id: at, ans: false }); at = node.no; draw(e.detail === 0); });
        row.appendChild(y); row.appendChild(n);
        if (trail.length) {
          var bk = el('button', 'btn btn--ghost'); bk.type = 'button'; bk.textContent = UI.back;
          bk.addEventListener('click', function (e) { var t = trail.pop(); at = t.id; draw(e.detail === 0); });
          row.appendChild(bk);
        }
        q.appendChild(row); box.appendChild(q); focusMe = q;
      } else {
        var res = d.results[at];
        var r = el('div', 'pl__fb pl__fb--ok'); r.tabIndex = -1; r.setAttribute('role', 'group');
        r.appendChild(el('p', 'pl__sech', UI.flowResult));
        var rt = el('p', 'pl-flow__result'); rt.id = base + '-res'; rich(rt, res.title); r.appendChild(rt); r.setAttribute('aria-labelledby', rt.id);
        r.appendChild(rp('pl__sumtext', res.text));
        if (res.link) { var lk = el('p', 'pl-ex__link'); rich(lk, '[' + res.link.text + '](' + res.link.href + ')'); r.appendChild(lk); }
        var acts = el('div', 'pl__fbacts'), rs = el('button', 'btn btn--secondary'); rs.type = 'button'; rs.appendChild(icon('replay')); rs.appendChild(el('span', null, UI.restart));
        rs.addEventListener('click', function (e) { trail = []; at = d.start; draw(e.detail === 0); });
        var bk2 = el('button', 'btn btn--ghost'); bk2.type = 'button'; bk2.textContent = UI.back;
        bk2.addEventListener('click', function (e) { var t = trail.pop(); at = t.id; draw(e.detail === 0); });
        acts.appendChild(rs); acts.appendChild(bk2); r.appendChild(acts); box.appendChild(r); focusMe = r;
      }
      if (moveFocus && focusMe) focusNear(focusMe);
    }
    draw(false);
  }

  /* ---------- start the widgets on a page ---------- */
  var KINDS = { quiz: quiz, rows: rows, dial: dial, explorer: explorer, flow: flow };
  function init(root) {
    each((root || document).querySelectorAll('[data-pl]'), function (host) {
      if (host.getAttribute('data-pl-ready')) return;
      var fn = KINDS[host.getAttribute('data-pl')], dataEl = host.querySelector('script.pl-data');
      if (!fn || !dataEl) return;
      var data;
      try { data = JSON.parse(dataEl.textContent); } catch (err) { if (global.console) console.error('Play: bad data in #' + host.id, err); return; }
      var stat = host.querySelector('.pl-static');
      try { fn(host, data); } catch (err2) { if (global.console) console.error('Play: could not build #' + host.id, err2); var broken = host.querySelector('.pl-live'); if (broken) host.removeChild(broken); return; }
      if (stat) stat.hidden = true;
      host.setAttribute('data-pl-ready', '1');
    });
  }

  /* ---------- reading progress, the stage pill and reveal on scroll (every explainer has them) ---------- */
  function chrome() {
    var $ = function (id) { return document.getElementById(id); };
    var progress = $('progress'), stageEl = $('stage'), stageNum = $('stage-num'), stageName = $('stage-name');
    var stages = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
    var currentStage = 0, raf = null;
    function updateScroll() {
      raf = null;
      var max = document.documentElement.scrollHeight - global.innerHeight;
      var pct = max > 0 ? Math.min(100, Math.max(0, (global.scrollY / max) * 100)) : 0;
      if (progress) progress.style.width = pct + '%';
      var mid = global.innerHeight * 0.5, stage = 1, name = 'Hello';
      for (var i = 0; i < stages.length; i++) {
        if (stages[i].getBoundingClientRect().top < mid) { stage = parseInt(stages[i].getAttribute('data-stage'), 10); name = stages[i].getAttribute('data-stage-name') || ''; }
      }
      if (stage !== currentStage) {
        currentStage = stage;
        if (stageNum) stageNum.textContent = Math.max(1, stage - 1) + ' / ' + (stages.length - 1);
        if (stageName) stageName.textContent = name;
        if (stageEl) stageEl.classList.toggle('is-on', stage !== 1);
      }
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(updateScroll); }
    global.addEventListener('scroll', onScroll, { passive: true });
    global.addEventListener('resize', onScroll);
    updateScroll();
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in global && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
      each(reveals, function (n) { io.observe(n); });
    } else { each(reveals, function (n) { n.classList.add('is-visible'); }); }
  }

  global.Play = {
    UI: UI, stop: stop, init: init, chrome: chrome, el: el, icon: icon, rich: rich, plain: plain, fmt: fmt,
    ghostBuild: ghostBuild, fill: fill, stepper: stepper, copyText: copyText, pressToggle: pressToggle,
    noRepeat: noRepeat, focusNear: focusNear, announce: announce, ensureVisible: ensureVisible,
    reduceMotion: function () { return reduceMotion; }
  };
  /* The page's own script (loaded after this one) may add its widgets first, so the kit starts when the page has been read. */
  function go() { init(document); chrome(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})(window);
