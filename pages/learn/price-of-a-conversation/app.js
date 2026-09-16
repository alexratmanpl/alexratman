/* The Price of a Conversation — widget logic. Plain JS, no dependencies, no network. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var fmt = function (n) { return Math.round(n).toLocaleString('en-GB'); };
  var money = function (usd) { return usd < 0.001 ? '<$0.001' : usd < 0.01 ? '$' + usd.toFixed(3) : '$' + usd.toFixed(2); };

  /* List prices per million tokens, Anthropic public price list, 16 Sep 2026 (Claude Sonnet 5). */
  var PRICE = { read: 2, write: 10, cached: 0.2 };
  var perTok = function (tokens, rate) { return tokens * rate / 1e6; };

  /* ---------- reading progress + stage pill ---------- */
  var progress = $('progress'), stageEl = $('stage'), stageNum = $('stage-num'), stageName = $('stage-name');
  var stages = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var currentStage = 0, raf = null;
  function updateScroll() {
    raf = null;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    if (progress) progress.style.width = pct + '%';
    var mid = window.innerHeight * 0.5, stage = 1, name = 'Hello';
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
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateScroll();

  /* ---------- reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    reveals.forEach(function (n) { io.observe(n); });
  } else { reveals.forEach(function (n) { n.classList.add('is-visible'); }); }

  function pressToggle(btn, on) { btn.classList.toggle('is-on', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }

  /* ---------- Step 2 · one message, taken apart ---------- */
  var PARTS = [
    { id: 'sys',   name: 'Instructions the app adds', kind: 'read',  tokens: function () { return 3000; },                 color: '#5F6368' },
    { id: 'tools', name: 'Connectors switched on', kind: 'read', tokens: function (s) { return s.tools ? 12000 : 0; }, color: '#8A8F96' },
    { id: 'hist',  name: 'The conversation so far', kind: 'read',  tokens: function (s) { return s.long ? 20000 : 0; },   color: '#131416' },
    { id: 'doc',   name: 'The attached document', kind: 'read',    tokens: function (s) { return s.doc ? 20000 : 0; },    color: '#C9CCD1' },
    { id: 'you',   name: 'Your message', kind: 'read',             tokens: function () { return 100; },                  color: '#D7202E' },
    { id: 'think', name: 'Its thinking (written)', kind: 'write',  tokens: function (s) { return s.think ? 8000 : 0; },   color: '#3C3F44' },
    { id: 'ans',   name: 'Its answer (written)', kind: 'write',    tokens: function () { return 400; },                  color: '#131416' }
  ];
  var partsEl = $('parts'), partRows = {}, partState = { tools: false, doc: false, long: false, think: false };
  if (partsEl) {
    PARTS.forEach(function (p) {
      var row = el('div', 'part'); row.setAttribute('data-part', p.id);
      var name = el('div', 'part__name'); var dot = el('span', 'part__dot'); dot.style.background = p.color; name.appendChild(dot); name.appendChild(document.createTextNode(p.name));
      var track = el('div', 'part__track'); var fill = el('div', 'part__fill'); fill.style.background = p.color; track.appendChild(fill);
      var cost = el('div', 'part__cost');
      row.appendChild(name); row.appendChild(track); row.appendChild(cost);
      partsEl.appendChild(row); partRows[p.id] = { row: row, fill: fill, cost: cost };
    });
    function renderParts() {
      var costs = PARTS.map(function (p) { var t = p.tokens(partState); return { p: p, t: t, c: perTok(t, p.kind === 'write' ? PRICE.write : PRICE.read) }; });
      var maxC = Math.max.apply(null, costs.map(function (x) { return x.c; }));
      var read = 0, written = 0, total = 0;
      costs.forEach(function (x) {
        var r = partRows[x.p.id];
        r.row.classList.toggle('is-off', x.t === 0);
        r.fill.style.width = (x.t ? Math.max(1.5, 100 * x.c / maxC) : 0) + '%';
        r.cost.innerHTML = '';
        r.cost.appendChild(el('strong', null, x.t ? fmt(x.t) : '0')); r.cost.appendChild(document.createTextNode(x.t ? ' · ' + money(x.c) : ' · $0'));
        if (x.p.kind === 'write') written += x.t; else read += x.t; total += x.c;
      });
      $('parts-read').textContent = fmt(read); $('parts-written').textContent = fmt(written);
      var big = $('parts-price'); big.textContent = money(total); big.classList.toggle('is-hot', total > 0.05);
      var base = perTok(3100, PRICE.read) + perTok(400, PRICE.write);
      $('parts-multiple').textContent = total / base < 1.05 ? 'the plain message' : (total / base).toFixed(0) + '× the plain message';
      var cap = [];
      if (partState.long) cap.push('The conversation so far is the biggest reading cost — and it comes back with every message. A warm cache reads it at about a tenth of this price.');
      if (partState.doc) cap.push('The document is read again on every message that follows, whether or not the question is about it.');
      if (partState.think) cap.push('Thinking is billed at the writing rate, five times the reading rate: the 8,000 thinking tokens here cost twice what the 30-page document does. On current models the thinking also stays in the history and is re-read later.');
      if (partState.tools) cap.push('Every connector you switch on adds to what the model reads with every message, used or not.');
      if (!cap.length) cap.push('A plain message: instructions, your hundred tokens, a short answer. About a cent. Now switch things on.');
      $('parts-caption').textContent = cap.join(' ');
    }
    document.querySelectorAll('#pa-toggles [data-part]').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-part'); partState[k] = !partState[k]; pressToggle(b, partState[k]); renderParts(); });
    });
    renderParts();
  }

  /* ---------- Step 3 · the re-read meter ---------- */
  var SYS = 3000, PER_TURN = 500, DOC = 20000, YOU = 100, ANS = 400, FRESH_EVERY = 10;
  function turnCost(i, doc, historyTurns) {
    // i = position within this conversation (1-based); historyTurns = turns already in it
    var history = historyTurns * PER_TURN + (doc ? DOC : 0);
    var read = SYS + history + YOU;
    var cold = perTok(read, PRICE.read) + perTok(ANS, PRICE.write);
    // warm cache: from the second message on, everything except your new message is re-read at the cached rate
    var warm = i === 1 ? cold : perTok(YOU, PRICE.read) + perTok(SYS + history, PRICE.cached) + perTok(ANS, PRICE.write);
    return { read: read, cold: cold, warm: warm };
  }
  function series(n, doc, fresh) {
    var out = [], pos = 0;
    for (var t = 1; t <= n; t++) {
      if (fresh && (t - 1) % FRESH_EVERY === 0) pos = 0;
      pos++;
      out.push(turnCost(pos, doc, pos - 1));
    }
    return out;
  }
  var turnsEl = $('turns'), turnsLabel = $('turns-label'), meterSvg = $('meter-svg'), meterTip = $('meter-tip');
  var meterState = { doc: false };
  if (turnsEl) {
    var W = 640, H = 224, PADL = 54, PADR = 22, PADT = 24, PADB = 30, SVGNS = 'http://www.w3.org/2000/svg';
    function sizeChart() { var narrow = meterSvg.getBoundingClientRect().width < 480; W = narrow ? 360 : 640; H = narrow ? 210 : 224; PADL = narrow ? 42 : 54; PADR = narrow ? 16 : 22; meterSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); }
    function node(tag, attrs, text) { var e = document.createElementNS(SVGNS, tag); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (text != null) e.textContent = text; return e; }
    var lastSeries = null;
    function renderMeter() {
      sizeChart();
      var n = parseInt(turnsEl.value, 10);
      turnsLabel.textContent = n + ' messages';
      var A = series(n, meterState.doc, false), B = series(n, meterState.doc, true);
      lastSeries = { n: n, A: A, B: B };
      var maxRead = Math.max.apply(null, A.map(function (d) { return d.read; })) * 1.08;
      var x = function (t) { return PADL + (t - 1) / Math.max(1, n - 1) * (W - PADL - PADR); };
      var y = function (v) { return PADT + (1 - v / maxRead) * (H - PADT - PADB); };
      while (meterSvg.firstChild) meterSvg.removeChild(meterSvg.firstChild);
      // grid + axes
      [0, 0.5, 1].forEach(function (f) {
        var v = f * maxRead / 1.08, yy = y(v);
        meterSvg.appendChild(node('line', { x1: PADL, x2: W - PADR, y1: yy, y2: yy, stroke: '#E3E4E6', 'stroke-width': 1 }));
        meterSvg.appendChild(node('text', { x: PADL - 8, y: yy + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#8A8F96' }, f === 0 ? '0' : Math.round(v / 1000) + 'k'));
      });
      [[1, 'start'], [Math.round(n / 2), 'middle'], [n, 'end']].forEach(function (d) { meterSvg.appendChild(node('text', { x: x(d[0]), y: H - 10, 'text-anchor': d[1], 'font-size': 11, fill: '#8A8F96' }, 'message ' + d[0])); });
      meterSvg.appendChild(node('text', { x: 2, y: 10, 'text-anchor': 'start', 'font-size': 10.5, fill: '#8A8F96' }, 'tokens read per message'));
      var path = function (S, color) {
        var d = S.map(function (p, i) { return (i ? 'L' : 'M') + x(i + 1).toFixed(1) + ' ' + y(p.read).toFixed(1); }).join(' ');
        meterSvg.appendChild(node('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      };
      path(B, '#D7202E'); path(A, '#131416');
      // end markers + direct labels
      var aEnd = A[n - 1], bEnd = B[n - 1];
      meterSvg.appendChild(node('circle', { cx: x(n), cy: y(aEnd.read), r: 4, fill: '#131416' }));
      meterSvg.appendChild(node('circle', { cx: x(n), cy: y(bEnd.read), r: 4, fill: '#D7202E' }));
      var halo = { 'text-anchor': 'end', 'font-size': 11.5, 'font-weight': 700, 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round' };
      var lab = function (attrs, text) { var a = {}; Object.keys(halo).forEach(function (k) { a[k] = halo[k]; }); Object.keys(attrs).forEach(function (k) { a[k] = attrs[k]; }); meterSvg.appendChild(node('text', a, text)); };
      lab({ x: x(n) - 8, y: y(aEnd.read) - 9, fill: '#131416' }, 'one long chat · ' + fmt(aEnd.read));
      var lowest = 0; for (var k = Math.max(0, n - FRESH_EVERY); k < n; k++) lowest = Math.max(lowest, y(B[k].read));
      lab({ x: x(n) - 8, y: Math.min(H - PADB - 4, lowest + 15), fill: '#D7202E' }, 'fresh every ' + FRESH_EVERY + ' · ' + fmt(bEnd.read));
      // hover target
      var hit = node('rect', { x: PADL, y: 0, width: W - PADL - PADR, height: H, fill: 'transparent' });
      meterSvg.appendChild(hit);
      var sum = function (S, k) { return S.reduce(function (s, p) { return s + p[k]; }, 0); };
      var tokA = sum(A, 'read'), tokB = sum(B, 'read');
      $('tot-long-tokens').textContent = fmt(tokA); $('tot-fresh-tokens').textContent = fmt(tokB);
      $('tot-long-usd').textContent = money(sum(A, 'cold')) + ' at full price · ' + money(sum(A, 'warm')) + ' with a warm cache';
      $('tot-fresh-usd').textContent = money(sum(B, 'cold')) + ' at full price · ' + money(sum(B, 'warm')) + ' with a warm cache';
      var saving = 1 - tokB / tokA;
      $('tot-delta').textContent = saving > 0.005 ? '−' + Math.round(saving * 100) + '% for the same ' + n + ' messages' : 'no difference yet — keep going';
      $('meter-caption').textContent = meterState.doc
        ? 'The document is attached again in every fresh conversation, so it is read at least once each time. The gap shrinks — which is why the habits below say paste the paragraph, not the document.'
        : 'Both lines read the same instructions; the difference is history. The cache softens the money gap: unchanged history is re-read at a tenth of the price for minutes to an hour after your last message, and usage limits follow that discounted meter too.';
    }
    function onMove(evt) {
      if (!lastSeries) return;
      var r = meterSvg.getBoundingClientRect(); var px = (evt.clientX - r.left) / r.width * W;
      var n = lastSeries.n, t = Math.max(1, Math.min(n, Math.round(1 + (px - PADL) / (W - PADL - PADR) * (n - 1))));
      var a = lastSeries.A[t - 1], b = lastSeries.B[t - 1];
      meterTip.innerHTML = '';
      meterTip.appendChild(el('strong', null, 'Message ' + t));
      meterTip.appendChild(document.createElement('br'));
      meterTip.appendChild(document.createTextNode('one long chat reads ' + fmt(a.read) + ' · ' + money(a.cold) + ' (' + money(a.warm) + ' cached)'));
      meterTip.appendChild(document.createElement('br'));
      meterTip.appendChild(document.createTextNode('fresh every ' + FRESH_EVERY + ' reads ' + fmt(b.read) + ' · ' + money(b.cold) + ' (' + money(b.warm) + ' cached)'));
      meterTip.classList.add('is-on');
    }
    meterSvg.addEventListener('mousemove', onMove);
    meterSvg.addEventListener('mouseleave', function () { meterTip.classList.remove('is-on'); });
    turnsEl.addEventListener('input', renderMeter);
    var rsz = null; window.addEventListener('resize', function () { clearTimeout(rsz); rsz = setTimeout(renderMeter, 120); });
    var docBtn = $('mb-doc');
    docBtn.addEventListener('click', function () { meterState.doc = !meterState.doc; pressToggle(docBtn, meterState.doc); renderMeter(); });
    renderMeter();
  }

  /* ---------- Step 5 · the comparison: long sessions / short sessions ---------- */
  var EXP = [
    { name: 'Tokens per message', sub: 'what one message made the model read', before: 54000, after: 20000, unit: 'k', bLabel: '50–58k', aLabel: '~20k' },
    { name: 'Largest conversation', sub: 'the biggest single read of the day', before: 1250000, after: 250000, unit: 'M', bLabel: '0.9–1.6M', aLabel: '0.2–0.28M' },
    { name: 'Tokens per day', sub: 'cheaper messages × fewer of them', before: 56400000, after: 3200000, unit: 'M', bLabel: '51–62M', aLabel: '2.7–3.7M' }
  ];
  var expEl = $('exp');
  if (expEl) {
    EXP.forEach(function (m) {
      var row = el('div', 'cmp__row');
      var lab = el('div', 'cmp__label', m.name); lab.appendChild(el('small', null, m.sub)); row.appendChild(lab);
      var bars = el('div', 'cmp__bars');
      var pct = Math.round(100 * m.after / m.before);
      var b1 = el('div', 'cmp__bar cmp__bar--before'); var t1 = el('span', 'cmp__track'); var i1 = el('i'); i1.style.width = '100%'; t1.appendChild(i1); b1.appendChild(t1); b1.appendChild(el('span', 'cmp__val', 'long · ' + m.bLabel));
      var b2 = el('div', 'cmp__bar cmp__bar--after'); var t2 = el('span', 'cmp__track'); var i2 = el('i'); i2.style.width = pct + '%'; t2.appendChild(i2); b2.appendChild(t2); var v2 = el('span', 'cmp__val', 'short · ' + m.aLabel); v2.appendChild(el('span', 'cmp__delta', '−' + (100 - pct) + '%')); b2.appendChild(v2);
      b1.title = m.name + ', long sessions: ' + m.bLabel; b2.title = m.name + ', short sessions: ' + m.aLabel + ' (' + pct + '% of the long way)';
      bars.appendChild(b1); bars.appendChild(b2); row.appendChild(bars); expEl.appendChild(row);
    });
  }

  /* ---------- Step 6 · transcript vs handoff note ---------- */
  var hoBody = $('handoff-body'), hoFoot = $('handoff-foot'), hoHead = $('handoff-head');
  var NOTE = 'GOAL      Rewrite the FAQ page so a new customer can find refunds, delivery and returns in under a minute.\n\nDECIDED   Keep the current URL. Group by task, not by department. British spelling.\n\nDONE      Draft of 14 questions in faq-draft.md. Refunds section approved by Maria.\n\nNEXT      Delivery section: two questions still contradict the shipping page — check with logistics before writing.\n\nWATCH OUT The old page has 40 questions; the brief is to cut, not to merge. Do not re-read the old page — the list of what to keep is in the draft.';
  if (hoBody) {
    function showTranscript() {
      pressToggle($('ho-transcript'), true); pressToggle($('ho-note'), false);
      hoHead.innerHTML = ''; hoHead.appendChild(el('span', null, 'What the next conversation starts by reading')); var s = el('span'); s.appendChild(el('strong', null, 'the whole transcript')); hoHead.appendChild(s);
      hoBody.innerHTML = '';
      var t = el('div', 'transcript');
      var widths = [92, 70, 88, 45, 96, 80, 60, 90, 74, 52, 95, 68, 84, 40, 91, 77, 58, 89, 66, 48, 94, 72];
      widths.forEach(function (w, i) { var i_ = el('i'); if (i % 4 === 3) i_.className = 'is-user'; else i_.style.width = w + '%'; t.appendChild(i_); });
      t.appendChild(el('div', 'transcript__more', '… 38 messages, 4 documents, two dead ends and the answers to questions nobody will ask again.'));
      hoBody.appendChild(t);
      hoFoot.innerHTML = ''; var f = el('span'); f.appendChild(document.createTextNode('About ')); f.appendChild(el('strong', null, '40,000 tokens')); f.appendChild(document.createTextNode(' — read again with every message that follows.')); hoFoot.appendChild(f);
      hoFoot.appendChild(el('span', null, 'Most of it is history the next task does not need.'));
    }
    function showNote() {
      pressToggle($('ho-transcript'), false); pressToggle($('ho-note'), true);
      hoHead.innerHTML = ''; hoHead.appendChild(el('span', null, 'What the next conversation starts by reading')); var s = el('span'); s.appendChild(el('strong', null, 'a handoff note')); hoHead.appendChild(s);
      hoBody.innerHTML = '';
      var pre = el('pre', 'note');
      NOTE.split('\n').forEach(function (line, i) {
        var m = line.match(/^(GOAL|DECIDED|DONE|NEXT|WATCH OUT)(\s+)(.*)$/);
        if (m) { pre.appendChild(el('b', null, m[1])); pre.appendChild(document.createTextNode(m[2] + m[3])); } else pre.appendChild(document.createTextNode(line));
        pre.appendChild(document.createTextNode('\n'));
      });
      hoBody.appendChild(pre);
      hoFoot.innerHTML = ''; var f = el('span'); f.appendChild(document.createTextNode('About ')); f.appendChild(el('strong', null, '250 tokens')); f.appendChild(document.createTextNode(' — 99% less, on every message that follows.')); hoFoot.appendChild(f);
      hoFoot.appendChild(el('span', null, 'Goal, decisions, done, next, watch out. That is the whole template.'));
    }
    $('ho-transcript').addEventListener('click', showTranscript);
    $('ho-note').addEventListener('click', showNote);
    showTranscript();
  }
})();
