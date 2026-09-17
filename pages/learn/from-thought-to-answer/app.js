/* From Thought to Answer — widget logic. Plain JS, no dependencies. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- today's date in the system-prompt example ---------- */
  var today = $('today');
  if (today) today.textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ---------- reading progress + stage pill ---------- */
  var progress = $('progress'), stageEl = $('stage'), stageNum = $('stage-num'), stageName = $('stage-name');
  var stages = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var currentStage = 0, raf = null;
  function updateScroll() {
    raf = null;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
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
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Step 2 · tokenizer toy ---------- */
  var COMMON = ["a","about","after","allow","an","and","answer","appear","at","be","became","because","before","begin","believe","between","birthday","bring","build","business","can","can't","cat","change","child","community","company","consider","continue","could","create","decide","did","didn't","dinner","do","doesn't","dog","don't","draft","education","eight","email","example","expect","explain","father","first","follow","for","force","friend","group","had","happen","has","he","health","hello","history","house","i","i'm","i've","in","include","information","is","isn't","issue","it","it's","learn","leave","let's","level","light","man","mat","me","meeting","member","minute","moment","money","month","morning","mother","my","not","number","of","offer","office","on","or","other","others","parent","party","people","person","place","please","point","power","president","problem","prompt","provide","question","raise","reach","reason","remain","remember","report","require","research","result","right","sat","sentence","serve","service","she","sky","so","speak","spend","stand","start","story","study","suggest","summary","sun","teacher","thanks","that","that's","the","their","there","there's","these","they","they're","think","this","three","to","tokens","under","understand","was","watch","water","we","we're","what's","which","with","woman","won't","words","world","would","write","you","you're","your"];
  var KNOWN = {"kočka":[2,3],"seděla":[3,3],"rohožce":[2,2,1,2],"ahoj":[3,1],"dobrý":[4,1],"dobrá":[4,1],"děkuji":[2,2,2],"prosím":[4,2],"jak":[3],"máš":[2,1],"umělá":[2,2,1],"inteligence":[7,4],"otázka":[4,2],"odpověď":[3,3,1],"protože":[7],"jsem":[4],"není":[4],"tady":[1,3],"dneska":[4,2],"zítra":[1,1,3],"počítač":[3,3,1],"slovo":[2,3],"věta":[2,2],"česky":[1,2,2],"čeština":[2,2,3],"myslím":[4,2],"pomoc":[5],"narozeniny":[4,3,3],"večeře":[2,2,2],"osm":[3],"lidí":[4]};
  var commonSet = {}; COMMON.forEach(function (w) { commonSet[w] = true; });

  function tokenize(text) {
    var out = [];
    text.split(/\s+/).filter(Boolean).forEach(function (raw) {
      var mm = raw.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u);
      var lead = mm ? mm[1] : '', w = mm ? mm[2] : raw, trail = mm ? mm[3] : '';
      if (lead) out.push(lead);
      if (w) {
        var clean = w.toLowerCase(), known = KNOWN[clean], chars = Array.from(w), i = 0;
        if (known) {
          known.forEach(function (n, k) { out.push((k ? '·' : '') + chars.slice(i, i + n).join('')); i += n; });
        } else if (chars.length <= 4 || commonSet[clean]) {
          out.push(w);
        } else {
          var first = true;
          while (i < chars.length) {
            var n = first ? Math.min(4, chars.length - i) : Math.min(3, chars.length - i);
            out.push((first ? '' : '·') + chars.slice(i, i + n).join(''));
            i += n; first = false;
          }
        }
      }
      if (trail) out.push(trail);
    });
    return out;
  }
  var tokInput = $('tok-input'), tokOut = $('tok-out'), tokCount = $('tok-count');
  function renderTokens() {
    var toks = tokenize(tokInput.value.slice(0, 240));
    tokOut.innerHTML = '';
    toks.forEach(function (t, i) {
      var s = document.createElement('span');
      s.className = 'chip chip--' + ((i % 3) + 1);
      s.textContent = t;
      tokOut.appendChild(s);
    });
    tokCount.textContent = toks.length;
  }
  if (tokInput) { tokInput.addEventListener('input', renderTokens); renderTokens(); }

  /* ---------- Step 3 · meaning map toggles ---------- */
  function toggle(btnId, groupId, onClass) {
    var b = $(btnId), g = $(groupId);
    if (!b || !g) return;
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('is-on', on); b.classList.toggle(onClass, on);
      g.classList.toggle('is-on', on);
    });
  }
  toggle('map-royal', 'map-royal-lines', 'is-on--red');
  toggle('map-geo', 'map-geo-lines', 'is-on');

  /* ---------- Step 4 · attention ---------- */
  var ATT_WORDS = ['The','cat','sat','on','the','mat','because','it','was','tired'];
  var ATT_MAP = { 0: [], 1: [[0,0.5]], 2: [[1,0.8],[0,0.2]], 3: [[2,0.6]], 4: [[3,0.4]], 5: [[2,0.5],[3,0.5],[1,0.3]], 6: [[2,0.4],[5,0.35]], 7: [[1,0.6],[5,0.5]], 8: [[7,0.6]], 9: [[1,0.75],[7,0.6]] };
  var attBox = $('att-box'), attSvg = $('att-svg'), attWords = $('att-words'), attCaption = $('att-caption');
  var attSel = 7, attChips = [];
  function renderAttention() {
    var rels = ATT_MAP[attSel] || [];
    attChips.forEach(function (chip, i) {
      var isTarget = rels.some(function (r) { return r[0] === i; });
      chip.className = 'chip-outline' + (i === attSel ? ' is-selected' : '') + (isTarget ? ' is-target' : '');
      chip.setAttribute('aria-pressed', i === attSel ? 'true' : 'false');
    });
    var selWord = ATT_WORDS[attSel], cap;
    if (rels.length === 0) cap = '"' + selWord + '" is the very first word — nothing earlier to look back at. Try "it" or "tired".';
    else {
      var strongest = ATT_WORDS[rels.slice().sort(function (a, b) { return b[1] - a[1]; })[0][0]];
      cap = '"' + selWord + '" pays the most attention to "' + strongest + '". Thicker line = stronger look.';
      if (attSel === 7) cap = '"it" can\'t see "tired" yet — so it keeps both "cat" and "mat" in mind. Now click "tired".';
      if (attSel === 9) cap = '"tired" looks back at "cat" and "it" and settles the question — cats get tired, mats don\'t.';
    }
    attCaption.textContent = cap;
    drawAttLines();
  }
  function drawAttLines() {
    if (!attBox) return;
    var bR = attBox.getBoundingClientRect();
    attSvg.setAttribute('width', Math.max(bR.width, 10)); attSvg.setAttribute('height', Math.max(bR.height, 10));
    while (attSvg.firstChild) attSvg.removeChild(attSvg.firstChild);
    var selEl = attChips[attSel]; if (!selEl) return;
    var sR = selEl.getBoundingClientRect(), sx = sR.left - bR.left + sR.width / 2, sy = sR.top - bR.top;
    (ATT_MAP[attSel] || []).forEach(function (rel) {
      var el = attChips[rel[0]]; if (!el) return;
      var r = el.getBoundingClientRect(), tx = r.left - bR.left + r.width / 2, ty = r.top - bR.top;
      var lift = 30 + Math.abs(tx - sx) * 0.18, cy = Math.min(sy, ty) - lift;
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M ' + sx + ' ' + sy + ' Q ' + ((sx + tx) / 2) + ' ' + cy + ' ' + tx + ' ' + ty);
      p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#D7202E'); p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-width', (2 + 7 * rel[1]).toFixed(1)); p.setAttribute('opacity', (0.3 + 0.6 * rel[1]).toFixed(2));
      attSvg.appendChild(p);
    });
  }
  if (attWords) {
    ATT_WORDS.forEach(function (w, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip-outline'; b.textContent = w;
      b.addEventListener('click', function () { attSel = i; renderAttention(); });
      attWords.appendChild(b); attChips.push(b);
    });
    renderAttention();
    window.addEventListener('resize', drawAttLines);
    setTimeout(drawAttLines, 400);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAttLines);
  }

  /* ---------- Step 5 · the weighted dice ---------- */
  var DICE = [
    { word: 'mat', p: 0.58, color: '#D7202E' },
    { word: 'floor', p: 0.22, color: '#131416' },
    { word: 'sofa', p: 0.12, color: '#5F6368' },
    { word: 'carpet', p: 0.079, color: '#8A8F96' },
    { word: 'banana', p: 0.001, color: '#C9CCD1' }
  ];
  var tempInput = $('temp'), tempLabel = $('temp-label'), barsEl = $('dice-bars'), rollWord = $('roll-word'), tallyEl = $('tally'), rollCaption = $('roll-caption');
  var tally = {}, rollCount = 0, lastRoll = 'mat', barFills = [], barValues = [];
  function getTemp() { return Math.max(0.05, parseFloat(tempInput.value) || 1); }
  function diceProbs() {
    var T = getTemp(), ws = DICE.map(function (d) { return Math.exp(Math.log(d.p) / T); });
    var sum = ws.reduce(function (a, b) { return a + b; }, 0);
    return ws.map(function (w) { return w / sum; });
  }
  function sample(probs) { var r = Math.random(); for (var i = 0; i < probs.length; i++) { r -= probs[i]; if (r <= 0) return i; } return probs.length - 1; }
  function renderDice() {
    var probs = diceProbs();
    DICE.forEach(function (d, i) {
      var pct = probs[i] * 100;
      barFills[i].style.width = Math.max(pct, 0.5).toFixed(2) + '%';
      barFills[i].style.opacity = lastRoll === d.word ? '1' : '0.75';
      barValues[i].textContent = pct >= 1 ? pct.toFixed(0) + '%' : pct.toFixed(2) + '%';
    });
    tempLabel.textContent = getTemp().toFixed(2);
    rollWord.textContent = lastRoll;
    tallyEl.innerHTML = '';
    Object.keys(tally).map(function (w) { return { word: w, count: tally[w] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .forEach(function (c) { var s = document.createElement('span'); s.className = 'tally__item'; s.textContent = c.word + ' × ' + c.count; tallyEl.appendChild(s); });
    rollCaption.textContent = rollCount > 0
      ? rollCount + (rollCount === 1 ? ' roll' : ' rolls') + ' so far. Same odds, different outcomes — that\'s the whole trick.'
      : 'Drag the temperature, then roll — low temp almost always lands on "mat"; high temp gets adventurous.';
  }
  function doRoll(n) {
    var probs = diceProbs();
    for (var k = 0; k < n; k++) { var i = sample(probs); lastRoll = DICE[i].word; tally[lastRoll] = (tally[lastRoll] || 0) + 1; }
    rollCount += n; renderDice();
  }
  if (barsEl) {
    DICE.forEach(function (d) {
      var row = document.createElement('div'); row.className = 'bar';
      row.innerHTML = '<div class="bar__label"></div><div class="bar__track"><div class="bar__fill"></div></div><div class="bar__value"></div>';
      row.querySelector('.bar__label').textContent = d.word;
      var fill = row.querySelector('.bar__fill'); fill.style.background = d.color;
      barFills.push(fill); barValues.push(row.querySelector('.bar__value'));
      barsEl.appendChild(row);
    });
    tempInput.addEventListener('input', renderDice);
    $('roll-1').addEventListener('click', function () { doRoll(1); });
    $('roll-20').addEventListener('click', function () { doRoll(20); });
    $('roll-reset').addEventListener('click', function () { tally = {}; rollCount = 0; lastRoll = 'mat'; renderDice(); });
    renderDice();
  }

  /* ---------- Step 6 · the loop (streaming answer) ---------- */
  var STREAM = ['Sun','light',' scat','ters',' off',' air',' molecules',',',' and',' short',' blue',' wavelengths',' scatter',' more',' than',' red',' ones',' —',' so',' the',' sky',' looks',' blue','.'];
  var streamEl = $('stream'), streamCaption = $('stream-caption'), streamIdx = 0, streamTimer = null;
  var STREAM_MS = reduceMotion ? 260 : 120;
  function renderStream() {
    streamEl.innerHTML = '';
    for (var i = 0; i < streamIdx; i++) {
      var s = document.createElement('span'); s.className = 'stream-token' + (i === streamIdx - 1 ? ' is-new' : ''); s.textContent = STREAM[i]; streamEl.appendChild(s);
    }
    streamCaption.textContent = streamIdx >= STREAM.length
      ? 'Done — ' + STREAM.length + ' little bets, each one reading all the previous ones.'
      : 'Bet ' + streamIdx + ' of ' + STREAM.length + ' — the newest piece just joined the context.';
  }
  function streamTick() {
    if (streamIdx < STREAM.length) { streamIdx++; renderStream(); streamTimer = setTimeout(streamTick, STREAM_MS); }
    else if (!reduceMotion) { streamTimer = setTimeout(function () { streamIdx = 0; renderStream(); streamTick(); }, 2600); }
  }
  if (streamEl) {
    if (reduceMotion) { streamIdx = STREAM.length; renderStream(); }
    else { renderStream(); streamTimer = setTimeout(streamTick, 600); }
    $('stream-replay').addEventListener('click', function () { clearTimeout(streamTimer); streamIdx = 0; renderStream(); streamTimer = setTimeout(streamTick, 200); });
  }

  /* ---------- Step 7 · training loop ---------- */
  var TRAIN_GUESSES = ['rug','floor','mat','chair'], trainStep = 0;
  var trainSteps = document.querySelectorAll('.train__step'), trainGuess = $('train-guess'), trainNudge = $('train-nudge');
  function renderTrain() {
    trainSteps.forEach(function (el, i) { el.classList.toggle('is-active', i === trainStep); });
    var g = TRAIN_GUESSES[trainStep];
    trainGuess.textContent = g;
    trainNudge.textContent = g === 'mat' ? 'right — still nudge the dials toward mat' : 'nudge the dials toward mat';
  }
  var trainTimer = null, trainToggle = $('train-toggle');
  function trainStart() { if (trainTimer) return; trainTimer = setInterval(function () { trainStep = (trainStep + 1) % 4; renderTrain(); }, 950); }
  function trainStop() { clearInterval(trainTimer); trainTimer = null; }
  if (trainSteps.length) {
    renderTrain();
    if (!reduceMotion) trainStart();
    if (trainToggle) {
      if (reduceMotion) { trainToggle.textContent = 'Play the loop'; trainToggle.setAttribute('aria-pressed', 'true'); }
      trainToggle.addEventListener('click', function () {
        if (trainTimer) { trainStop(); trainToggle.textContent = 'Play the loop'; trainToggle.setAttribute('aria-pressed', 'true'); }
        else { trainStart(); trainToggle.textContent = 'Pause the loop'; trainToggle.setAttribute('aria-pressed', 'false'); }
      });
    }
  }

  /* ---------- Closing · copy the prompt ---------- */
  var copyBtn = $('copy-prompt');
  if (copyBtn) {
    var PROMPT = "Summarise the attached report for a 15-minute management meeting in 5 bullet points: key results first, then risks, ending with one recommended next step. Plain language, no jargon — and flag anything the report doesn't clearly support. Think through what leadership needs to decide before you write.";
    var original = copyBtn.textContent;
    copyBtn.addEventListener('click', function () {
      var done = function () { copyBtn.textContent = '✓ Copied — attach your report, then paste it into any AI'; setTimeout(function () { copyBtn.textContent = original; }, 2400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(PROMPT).then(done, done); else done();
    });
  }
})();
