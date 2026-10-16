/* Write It Down Before You Build It — widget logic. Plain JS, no dependencies, no network. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(id) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '14'); svg.setAttribute('height', '14'); svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2.6');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use'); use.setAttribute('href', '#' + id); svg.appendChild(use);
    return svg;
  }
  function pressToggle(btn, on) { btn.classList.toggle('is-on', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  /* text with links: an array of strings and { a: 'link text', href: '…' } */
  function rich(node, parts) {
    parts.forEach(function (p) {
      if (typeof p === 'string') { node.appendChild(document.createTextNode(p)); return; }
      var a = el('a', null, p.a); a.href = p.href; a.target = '_blank'; a.rel = 'noopener'; node.appendChild(a);
    });
  }
  /* A widget whose text changes must not change height, or the page jumps under the reader's finger.
     So the live element shares one grid cell with hidden copies of every other state; the cell is as tall as the tallest. */
  function ghostBuild(live, n, build) {
    var host = live.parentNode; host.classList.add('stab');
    for (var i = 0; i < n; i++) {
      var g = live.cloneNode(false);
      g.removeAttribute('id'); g.removeAttribute('aria-live');
      g.classList.add(host.classList.contains('stepper__stack') ? 'stepper__ghost' : 'stab__ghost');
      g.setAttribute('aria-hidden', 'true');
      build(g, i);
      host.appendChild(g);
    }
  }
  function fill(node, build, i) { node.textContent = ''; build(node, i); }

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

  /* ---------- tabs with one panel of fixed height (step 2 and step 7) ---------- */
  function stepper(card, data, build, after) {
    if (!card) return;
    var btns = Array.prototype.slice.call(card.querySelectorAll('.stepper__tabs .toggle'));
    var live = card.querySelector('.stepper__live');
    if (!live) return;
    ghostBuild(live, data.length, function (node, i) { build(node, data[i]); });
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

  /* ---------- Step 2 · four stages ---------- */
  var STAGES = [
    { who: 'You tell the AI the idea. It writes the spec and asks what\'s unclear.',
      out: 'A spec: a page of plain sentences.',
      eg: '"The last day can\'t be before the first day."',
      check: 'Is this what I meant? Is anything missing?' },
    { who: 'The AI proposes how to build it. You read the plan.',
      out: 'A short plan of the pieces.',
      eg: 'A form for staff, a list for managers, and a place to keep the requests.',
      check: 'Does the plan cover every line of the spec?' },
    { who: 'The AI splits the plan into small tasks. You check the order.',
      out: 'A to-do list of small tasks, in order.',
      eg: '1. Show the form. 2. Save a request. 3. Show managers their list. 4. Let them approve or refuse. 5. Tell the employee.',
      check: 'Is the order sensible? Is any task too big to check on its own?' },
    { who: 'The AI does one task at a time. You try each result.',
      out: 'A working piece, one task at a time.',
      eg: 'After task 1, you can open the form and pick two dates.',
      check: 'Does it do what its line of the spec says? If not, say so before the next task.' }
  ];
  function buildStage(node, s) {
    var who = el('p', 'stepper__who'); who.appendChild(el('b', null, 'Who does it')); who.appendChild(document.createTextNode(' ' + s.who));
    var cols = el('div', 'stepper__cols');
    var a = el('div', 'stepper__col');
    a.appendChild(el('div', 'label label--sm label--muted', 'What you get'));
    a.appendChild(el('p', null, s.out));
    var eg = el('p', 'stepper__eg'); eg.appendChild(el('span', null, 'For example')); eg.appendChild(document.createTextNode(s.eg)); a.appendChild(eg);
    var b = el('div', 'stepper__col stepper__col--check');
    b.appendChild(el('div', 'label label--sm', 'What you check'));
    b.appendChild(el('p', null, s.check));
    cols.appendChild(a); cols.appendChild(b);
    node.appendChild(who); node.appendChild(cols);
  }
  stepper($('stages'), STAGES, buildStage);

  /* ---------- Step 3 · lines added to the spec ---------- */
  var LINES = {
    see:   { on: 'Only the employee and their manager can open a request.',
             off: 'Not written down: who is allowed to see which request. The AI picks for itself, and nothing checks it.' },
    alarm: { on: 'If saving fails again and again, the person who looks after the app is told.',
             off: 'Not written down: who to warn when something breaks. If saving breaks, the app may fail without telling anyone.' }
  };
  var linesCard = $('lines');
  if (linesCard) {
    var lineState = { see: false, alarm: false };
    Object.keys(LINES).forEach(function (k) {
      var cur = linesCard.querySelector('[data-row="' + k + '"] .lines__cur');
      ghostBuild(cur, 2, function (node, i) { node.textContent = i ? LINES[k].off : LINES[k].on; });
    });
    var renderLines = function () {
      Object.keys(LINES).forEach(function (k) {
        var row = linesCard.querySelector('[data-row="' + k + '"]');
        var on = lineState[k];
        row.classList.toggle('is-off', !on);
        row.querySelector('.lines__cur').textContent = on ? LINES[k].on : LINES[k].off;
      });
    };
    Array.prototype.slice.call(linesCard.querySelectorAll('[data-line]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-line');
        lineState[k] = !lineState[k];
        pressToggle(b, lineState[k]);
        renderLines();
      });
    });
    renderLines();
  }

  /* ---------- Step 4 · what you could lose ---------- */
  var LOST = [
    { lose: ['A new chat usually starts from nothing, so everything you explained in the old one is gone.'],
      gives: ['You give the saved spec to a new chat, and it continues from there. Anthropic, the company behind Claude, gives ', { a: 'similar advice', href: 'https://code.claude.com/docs/en/best-practices' }, ': once the spec is complete, start a fresh chat to build from it.'],
      need: ['The spec saved as a file you can find again, not only inside the chat.'] },
    { lose: ['Nobody can use the app until someone builds it again.'],
      gives: ['A fresh AI chat reads your spec, plan and checks and builds a new copy. Expect it to differ from the old one, so run the checks on it.'],
      need: ['The spec, plan and checks, saved as files. A saved copy of the app itself is safer still.'] },
    { lose: ['Every request already sent is gone. People must send them again, and you can\'t show who was approved.'],
      gives: ['Nothing comes back, because the spec describes the app and doesn\'t contain the records.'],
      need: ['A saved copy kept somewhere else, set up before you need it. The end of this step explains how.'] }
  ];
  function buildLost(node, d) {
    [['If you lose it', 'label label--sm label--muted', d.lose], ['With spec-driven development', 'label label--sm', d.gives], ['What else you need', 'label label--sm label--muted', d.need]].forEach(function (r) {
      var sec = el('div', 'lanes__sec'); sec.appendChild(el('div', r[1], r[0]));
      var p = el('p'); rich(p, r[2]); sec.appendChild(p); node.appendChild(sec);
    });
  }
  var lanesCard = $('lanes');
  if (lanesCard) {
    var laneBtns = Array.prototype.slice.call(lanesCard.querySelectorAll('.lane'));
    var laneOut = $('lane-out');
    ghostBuild(laneOut, LOST.length, function (node, i) { buildLost(node, LOST[i]); });
    laneBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.getAttribute('data-i'), 10);
        laneBtns.forEach(function (x) { pressToggle(x, x === b); });
        fill(laneOut, function (node) { buildLost(node, LOST[i]); });
      });
    });
    fill(laneOut, function (node) { buildLost(node, LOST[0]); });
  }

  /* ---------- Step 5 · run the checks ---------- */
  var checksCard = $('checks');
  if (checksCard) {
    var rows = Array.prototype.slice.call($('checks-list').children);
    var btn = $('checks-btn'), sum = $('checks-sum');
    var phase = 'idle', busy = false;
    var total = rows.length;
    function setRow(row, state) {
      row.setAttribute('data-state', state);
      var res = row.querySelector('.check__res');
      res.innerHTML = '';
      if (state === 'pass') { res.appendChild(icon('i-check')); res.appendChild(el('span', 'check__txt', 'Passed')); }
      else if (state === 'fail') { res.appendChild(icon('i-cross')); res.appendChild(el('span', 'check__txt', 'Failed')); }
      else { res.appendChild(el('span', 'check__txt', 'Not run')); }
    }
    var SUMS = ['idle', 'running', 'failed', 'passed'];
    function buildSum(node, kind) {
      if (kind === 'idle') node.textContent = 'Not run yet.';
      else if (kind === 'running') node.textContent = 'Running…';
      else if (kind === 'failed') { node.appendChild(el('strong', null, (total - 1) + ' passed, 1 failed.')); node.appendChild(document.createTextNode(' The failed check shows which line broke. Ask the AI to fix it, then run again.')); }
      else { node.appendChild(el('strong', null, total + ' of ' + total + ' passed.')); }
    }
    ghostBuild(sum, SUMS.length, function (node, i) { buildSum(node, SUMS[i]); });
    function say(kind) { fill(sum, function (node) { buildSum(node, kind); }); }
    function runAll(fixed) {
      busy = true; btn.disabled = true;
      say('running');
      rows.forEach(function (row, i) {
        var willFail = row.getAttribute('data-fails') === 'true' && !fixed;
        var go = function () {
          setRow(row, willFail ? 'fail' : 'pass');
          if (i === rows.length - 1) {
            var failed = rows.filter(function (r) { return r.getAttribute('data-state') === 'fail'; }).length;
            say(failed ? 'failed' : 'passed');
            phase = failed ? 'failed' : 'passed';
            btn.textContent = failed ? 'Fix it and run again' : 'Start over';
            btn.disabled = false; busy = false;
          }
        };
        if (reduceMotion) go(); else setTimeout(go, 260 * (i + 1));
      });
    }
    btn.addEventListener('click', function () {
      if (busy) return;
      if (phase === 'idle') { runAll(false); }
      else if (phase === 'failed') { runAll(true); }
      else {
        rows.forEach(function (row) { setRow(row, 'idle'); });
        say('idle');
        btn.textContent = 'Run the checks';
        phase = 'idle';
      }
    });
  }

  /* ---------- Step 7 · how much spec does a project need ---------- */
  var PICK = [
    { title: 'One sentence.', text: ['Tell the AI what you want in one sentence, such as "Make the title blue", and check the result. Skip all six parts below. ', { a: 'Anthropic\'s docs', href: 'https://code.claude.com/docs/en/best-practices' }, ' say something similar: if you could describe the change in one sentence, skip the plan.'] },
    { title: 'A short spec and a few checks.', text: ['Plain sentences for the main rules, and a check or two for each. Use parts 1 to 5 below. Skip part 6, because a page that saves nothing has nothing to back up. A bill splitter or a packing checklist is about this size.'] },
    { title: 'The full spec, with safety rules.', text: ['Add rules for who is allowed to see what, where passwords and other secret codes are kept, and what happens when saving fails, with a check for each. Use parts 1 and 2 to write them, and ask the questions in part 2 again in a second chat, because one chat can miss things. The holiday form and any sign-up sheet belong here. A page on your own computer can\'t collect other people\'s answers, so use a ready-made form tool, such as Google Forms, instead.'] },
    { title: 'The full set.', text: ['Spec, plan, task list, checks, saved copies of the data, and a habit of checking regularly that it still works once people use it. That is more than a first project needs. If many people will rely on it, a ready-made service, such as an online form or booking tool, may be the safer choice.'] }
  ];
  function buildPick(node, d) {
    node.appendChild(el('strong', null, d.title));
    var p = el('p'); rich(p, d.text); node.appendChild(p);
  }
  var pickCard = $('pick');
  if (pickCard) {
    var pickBtns = Array.prototype.slice.call(pickCard.querySelectorAll('.toggle'));
    var pickOut = $('pick-out');
    ghostBuild(pickOut, PICK.length, function (node, i) { buildPick(node, PICK[i]); });
    pickBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.getAttribute('data-i'), 10);
        pickBtns.forEach(function (x) { pressToggle(x, x === b); });
        fill(pickOut, function (node) { buildPick(node, PICK[i]); });
      });
    });
    fill(pickOut, function (node) { buildPick(node, PICK[0]); });
  }

  /* ---------- Step 7 · six parts, with the words to paste ---------- */
  var RECIPE = [
    { f: 'Turns a rough idea into a clear list of rules. The AI asks you questions instead of guessing.',
      w: 'You have an idea but nothing written down yet. Start here.',
      where: 'Paste this, in a new chat',
      say: 'I have never built anything, so please use plain words and explain any technical word. I want to build [your idea, for example: a page that splits a restaurant bill between friends]. Interview me, one question at a time. Ask what it must do, what it must never do, and what should happen when something goes wrong. Don\'t build anything yet. When we\'re done, write the spec as short numbered sentences.',
      then: ['Answer in your own words. It\'s fine to say "I\'m not sure". When you have answered enough, say "That\'s enough, please write the spec." You get a spec like the one above. For bigger ideas, ', { a: 'Anthropic advises', href: 'https://code.claude.com/docs/en/best-practices' }, ' letting the AI interview you first.'] },
    { f: 'Finds the rules you forgot to write down. Every gap is a place where the AI would otherwise guess.',
      w: 'Your first spec is written, but nobody has checked it yet and nothing is built.',
      where: 'Paste this, in the same chat',
      say: 'Here\'s my spec: [paste the spec]. What\'s missing? Check it against these questions. Who is allowed to see or change what? Where are passwords and secret codes kept? Is any shortcut that was only for testing still open? When something goes wrong, what does the page show on screen, and who is told? How do I keep a copy of the data? Then show me an improved spec.',
      then: 'Read every line, and ask the AI to explain any new word. If a line is wrong, say so and ask for a new version. For a simple page, many answers will be "not applicable", and that is fine. When you\'re happy, copy the final spec into a file of your own (Word, Google Docs or Notepad), so you still have it when the chat ends.' },
    { f: 'Turns the spec into a short plan and a list of small tasks, with one check for every line. You see the whole plan before anything is built.',
      w: 'You\'re happy with the spec and want to see the steps before building starts.',
      where: 'Paste this, in the same chat',
      say: 'Here\'s my spec: [paste the spec]. Don\'t build anything yet. Give me a short plan, then a numbered list of small tasks. For each line of the spec, add one check I can do myself, written as a plain sentence. Then stop and wait for me.',
      then: 'Read the plan, the tasks and the checks. Does every line of the spec have a check? If you can\'t tell how you would do a check, ask the AI to rewrite it. If a task looks big, ask the AI to split it. Then copy all of it into the same file as your spec.' },
    { f: 'Builds one small piece at a time. You try each piece before the next starts, so a mistake shows up early, while it\'s easy to fix.',
      w: 'Your plan, tasks and checks are saved. Do one task at a time, in the chat that wrote the plan. If you lose that chat, start a new one and paste in your spec, plan and checks.',
      where: 'Paste this, in the same chat',
      say: 'Do task 1 only. Make it one file that opens in my web browser, with nothing to install. Tell me step by step how to open it, and which check proves it works. Then wait for me to say "next".',
      then: 'Open the page as the AI tells you (a short guide follows this box). Do its check and see whether the page passes. Say "next", or describe what you saw. When the last task is done, go through every check from part 3 once more. If you want something to work differently, change the spec first, then ask the AI to update the page.' },
    { f: 'Compares the finished page with your spec, line by line, and lists what is missing or different. A new chat hasn\'t seen the page being built, so it isn\'t biased toward it.',
      w: 'The page seems finished. Do this before you rely on it or show it to anyone, and again after any big change.',
      where: 'Paste this, in a new chat',
      say: 'Here\'s a spec: [paste the spec]. And here\'s what was built from it: [paste the latest full version of the page]. Go through the spec line by line. For each line, say yes, no or can\'t tell: does the work do what the line says? Explain why. Tell me what is missing, not how it looks.',
      then: 'Read the "no" and "can\'t tell" lines first. Take each one back to the chat that built the page, and ask it to fix that line. Not sure what to paste? Ask that chat: "Show the latest full version of the page in one message." Then run the review twice, each time in a new chat, because one review can miss things.' },
    { f: 'Saves what people enter in a spreadsheet file outside the page. If the page breaks, the spec can\'t bring that information back, but this file can.',
      w: 'Your page saves what people type, and real people are about to use it. Skip this if your page saves nothing.',
      where: 'Paste this, in the chat that built the page',
      say: 'Add a button that saves everything people enter as a spreadsheet file. Tell me how to use that file to load it back into the page.',
      then: 'Press it once and open the file. Keep copies in an online folder you already use and on a USB stick or external drive. A copy you\'ve never opened may not work. It holds people\'s details, so keep both copies private.' }
  ];
  function buildRecipe(node, s) {
    var cols = el('div', 'stepper__cols');
    var a = el('div', 'stepper__col');
    a.appendChild(el('div', 'label label--sm label--muted', 'What it\'s for'));
    var pa = el('p'); rich(pa, [].concat(s.f)); a.appendChild(pa);
    var b = el('div', 'stepper__col stepper__col--check');
    b.appendChild(el('div', 'label label--sm', 'Use it when'));
    var pb = el('p'); rich(pb, [].concat(s.w)); b.appendChild(pb);
    cols.appendChild(a); cols.appendChild(b);
    var say = el('div', 'recipe__say');
    var head = el('div', 'recipe__head');
    head.appendChild(el('div', 'label label--sm label--muted', s.where));
    var c = el('button', 'btn btn--secondary recipe__copy', 'Copy'); c.type = 'button'; c.setAttribute('aria-label', 'Copy this prompt');
    head.appendChild(c); say.appendChild(head);
    say.appendChild(el('p', 'prompt', s.say));
    var then = el('div', 'recipe__then'); then.appendChild(el('div', 'label label--sm', 'What you do next'));
    var pt = el('p'); rich(pt, [].concat(s.then)); then.appendChild(pt);
    node.appendChild(cols); node.appendChild(say); node.appendChild(then);
  }
  function copyText(text, done) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta); done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  }
  stepper($('recipe'), RECIPE, buildRecipe, function (live, s) {
    var b = live.querySelector('.recipe__copy'), prompt = live.querySelector('.prompt');
    if (!b) return;
    b.addEventListener('click', function () {
      copyText(s.say, function (ok) {
        if (!ok) {
          var r = document.createRange(); r.selectNodeContents(prompt);
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        }
        b.textContent = ok ? 'Copied' : 'Press Ctrl+C or Cmd+C';
        b.classList.add('is-done');
        setTimeout(function () { b.textContent = 'Copy'; b.classList.remove('is-done'); }, 2200);
      });
    });
  });
})();
