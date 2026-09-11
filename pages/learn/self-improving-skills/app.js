/* Skills That Get Better From Being Used — widget logic. Plain JS, no dependencies.
   The only network call on this page is a read-only, unauthenticated request to GitHub's
   public API for the "where it stands" table. Everything it returns is inserted as text. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

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

  /* ---------- Step 1 · the SKILL.md card (real file, public repo) ---------- */
  var FRONT = [
    ['name', 'pay-check'],
    ['description', 'Work out what someone should be paid and what to say about it — comparing a salary, day rate or offer against the local market, converting between employment and contracting, and reopening a number already given. Use when someone mentions a salary, day rate, offer, pay rise, what to ask for, or a recruiter asking their expectations. Includes a calculator so the arithmetic is right. Money only — see company-research, role-fit, interview-prep.'],
    ['compatibility', 'Bundles a calculator script needing code execution. Without it, do the arithmetic explicitly and show every step.']
  ];
  var BODY = "# Pay Check\n\nWork out the number, and what to say about it.\n\n## Use the calculator\n\n`scripts/rate_calc.py` in this skill's directory. Run `--help` to see what it covers, and trust that over anything written here: the script is updated on its own and this file is not. Every subcommand repeats the inputs it used, so quote its numbers together with those assumptions.\n\nIt holds no market data and reaches no network. Rates, percentages and day counts all come from you, which is what makes a result reproducible and a wrong assumption visible rather than buried in the total.\n\n## Tax, and where the numbers come from\n\nThe calculator holds no rates for any country. For after-tax figures, look the parameters up and pass them in a rate file. `rates-example.json` in this skill's directory is a filled example — copy it and replace every figure, including the sources.\n\nLook them up rather than recalling them. Thresholds and percentages change every year, and a remembered figure is the one most likely to be a year out of date.\n\n… about 700 more words: asking, finding the range, saying where they stand, reopening a number, what to do if asked first, shares and options. The full file is in the public repo.";
  var front = $('skill-front'), body = $('skill-body'), skillCap = $('skill-caption');
  if (front) {
    front.appendChild(document.createTextNode('---\n'));
    FRONT.forEach(function (kv) { var k = el('span', 'k', kv[0] + ':'); front.appendChild(k); front.appendChild(document.createTextNode(' ' + kv[1] + '\n')); });
    front.appendChild(document.createTextNode('---'));
    body.textContent = BODY;
    var words = 1330;
    function showFirst() {
      body.classList.add('is-collapsed');
      $('skill-first').classList.add('is-on'); $('skill-first').setAttribute('aria-pressed', 'true');
      $('skill-full').classList.remove('is-on'); $('skill-full').setAttribute('aria-pressed', 'false');
      skillCap.textContent = 'This is the whole of what the agent reads when deciding: three front-matter fields, about 80 words. The body below stays closed unless the description matches the task.';
    }
    function showFull() {
      body.classList.remove('is-collapsed');
      $('skill-full').classList.add('is-on'); $('skill-full').setAttribute('aria-pressed', 'true');
      $('skill-first').classList.remove('is-on'); $('skill-first').setAttribute('aria-pressed', 'false');
      skillCap.textContent = 'Opened: about ' + words.toLocaleString('en-US') + ' words of instructions, plus a 500-line calculator script and an example rates file beside it. None of this is loaded until the description earns it.';
    }
    $('skill-first').addEventListener('click', showFirst);
    $('skill-full').addEventListener('click', showFull);
    showFirst();
  }

  /* ---------- Step 3 · routes out of the container ---------- */
  var ROUTES = [
    { id: 'push', name: 'git push', nodes: ['the container', 'git proxy', 'attached repos'], blockAt: 2, verdict: 'not attached', ok: false,
      caption: 'git push only knows the repositories attached when the session started. The public skills repo was not one of them, and nothing could add it mid-session.' },
    { id: 'curl', name: 'curl api.github.com', nodes: ['the container', 'egress proxy', 'allowlist'], blockAt: 2, verdict: 'host not allowed', ok: false,
      caption: 'Plain HTTPS from the container goes through a proxy with a domain allowlist. GitHub’s API is not on it. Same machine, same wall, different door.' },
    { id: 'mcp', name: 'GitHub connector', nodes: ['the container', 'GitHub connector', 'account grant', 'GitHub API'], blockAt: -1, verdict: 'reaches GitHub', ok: true,
      caption: 'The connector does not use the session’s network at all. Its traffic takes a different road to the GitHub API — bounded by what the account has granted, not by what the machine can reach.' }
  ];
  var routesEl = $('routes'), routeCap = $('route-caption'), routeTimers = [];
  if (routesEl) {
    ROUTES.forEach(function (r) {
      var row = el('div', 'route'); row.setAttribute('data-route', r.id);
      row.appendChild(el('div', 'route__name', r.name));
      r.nodes.forEach(function (n, i) { if (i) row.appendChild(el('div', 'link')); row.appendChild(el('div', 'node', n)); });
      row.appendChild(el('div', 'route__verdict', ''));
      routesEl.appendChild(row);
    });
    function runRoute(id) {
      routeTimers.forEach(clearTimeout); routeTimers = [];
      document.querySelectorAll('#route-btns .toggle').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-route') === id); });
      document.querySelectorAll('.route').forEach(function (row) {
        row.classList.toggle('is-active', row.getAttribute('data-route') === id);
        row.querySelectorAll('.node').forEach(function (n) { n.className = 'node'; });
        var v = row.querySelector('.route__verdict'); v.textContent = ''; v.className = 'route__verdict';
      });
      var r = ROUTES.filter(function (x) { return x.id === id; })[0];
      var row = routesEl.querySelector('[data-route="' + id + '"]'), nodes = row.querySelectorAll('.node'), verdict = row.querySelector('.route__verdict');
      var step = reduceMotion ? 0 : 320;
      r.nodes.forEach(function (_, i) {
        routeTimers.push(setTimeout(function () {
          if (i === r.blockAt) { nodes[i].classList.add('is-blocked'); verdict.textContent = '✗ ' + r.verdict; verdict.classList.add('is-bad'); }
          else if (r.ok && i === r.nodes.length - 1) { nodes[i].classList.add('is-ok'); verdict.textContent = '✓ ' + r.verdict; verdict.classList.add('is-good'); }
          else nodes[i].classList.add(i === 0 ? 'is-passed' : 'is-reached');
          if (i > 0 && i !== r.blockAt) nodes[i - 1].classList.add('is-passed');
        }, step * (i + 1)));
      });
      routeCap.textContent = r.caption;
    }
    document.querySelectorAll('#route-btns .toggle').forEach(function (b) { b.addEventListener('click', function () { runRoute(b.getAttribute('data-route')); }); });
    runRoute('push');
  }

  /* ---------- Step 4 · the loop ---------- */
  var LOOP = [
    ['Use', 'Alex uses a skill during real job research — company-research, role-fit, interview-prep or pay-check — with an agent that has it installed.'],
    ['Notice', 'The skill falls short in some specific way: a question it should have asked, a check it claimed, a section nobody could read.'],
    ['Capture', 'A 36-line skill writes a dated note into the private repo. It holds no rules of its own; it points at the file where the rules live.'],
    ['Summarise', 'A scheduled agent wakes on its own, reads its instructions, reads every note newer than the last one it processed, and decides what to change.'],
    ['Pull request', 'It opens a pull request against the public repo — one concern per pull request, never more than one skill — with a description that says what it ran and how many lines the skill gained or lost.'],
    ['Publish', 'GitHub Actions validates every skill and, on merge to master, publishes a rolling latest release with packaged .skill files.'],
    ['Install', 'The improved skill is installed back into the account, and is in play the next time step 1 happens.']
  ];
  var loopSteps = $('loop-steps'), loopDetail = $('loop-detail'), loopRing = $('loop-ring'), loopIdx = 0, loopTimer = null, loopEls = [];
  if (loopSteps) {
    var RX = 41, RY = 38, N = LOOP.length, SVGNS = 'http://www.w3.org/2000/svg';
    function angle(i) { return -Math.PI / 2 + (i / N) * Math.PI * 2; }
    // the ring and the arrowheads, in the same geometry as the pills (viewBox 400×300 ↔ percent of the box)
    if (loopRing) {
      var ring = document.createElementNS(SVGNS, 'ellipse');
      ring.setAttribute('cx', 200); ring.setAttribute('cy', 150); ring.setAttribute('rx', RX * 4); ring.setAttribute('ry', RY * 3);
      ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#E3E4E6'); ring.setAttribute('stroke-width', '2.5'); ring.setAttribute('stroke-dasharray', '6 7');
      loopRing.appendChild(ring);
      for (var k = 0; k < N; k++) {
        var am = angle(k) + Math.PI / N, px = 200 + RX * 4 * Math.cos(am), py = 150 + RY * 3 * Math.sin(am);
        var deg = Math.atan2(RY * 3 * Math.cos(am), -RX * 4 * Math.sin(am)) * 180 / Math.PI;
        var head = document.createElementNS(SVGNS, 'path');
        head.setAttribute('d', 'M-7,-5 L6,0 L-7,5 Z'); head.setAttribute('fill', '#8A8F96');
        head.setAttribute('transform', 'translate(' + px.toFixed(1) + ' ' + py.toFixed(1) + ') rotate(' + deg.toFixed(1) + ')');
        loopRing.appendChild(head);
      }
    }
    LOOP.forEach(function (s, i) {
      var a = angle(i);
      var b = el('button', 'loop__step', (i + 1) + ' · ' + s[0]); b.type = 'button';
      b.style.left = (50 + RX * Math.cos(a)) + '%'; b.style.top = (50 + RY * Math.sin(a)) + '%';
      b.addEventListener('click', function () { clearInterval(loopTimer); loopTimer = null; showLoop(i); });
      loopSteps.appendChild(b); loopEls.push(b);
    });
    function showLoop(i) {
      loopIdx = i;
      loopEls.forEach(function (b, k) { b.classList.toggle('is-active', k === i); });
      loopDetail.innerHTML = '';
      loopDetail.appendChild(el('strong', null, (i + 1) + ' · ' + LOOP[i][0]));
      loopDetail.appendChild(document.createTextNode(LOOP[i][1]));
    }
    showLoop(0);
    if (!reduceMotion) loopTimer = setInterval(function () { showLoop((loopIdx + 1) % LOOP.length); }, 3200);
  }

  /* ---------- Step 5 · the experiment: same finding, two runs ---------- */
  var SPOTS = [
    { where: 'Scope of the pull request', rules: ['one'],
      r1: { kind: 'add', text: 'Two concerns in one pull request: test the standards the skill already sets, and close the domain gap earlier.', meta: 'one pull request, two subjects' },
      r2: { kind: 'add', text: 'One concern each — one pull request tests the standards, a separate one closes the gap.', meta: 'two pull requests, each easy to review' } },
    { where: 'The list of sections', rules: [],
      r1: { kind: 'add', text: 'Anything derived rather than found goes after all of them, under its own heading, never inside one.', meta: '+18 words' },
      r2: { kind: 'add', text: 'Anything derived rather than found — suggestions, recommendations, questions to put to them — comes last, under a heading that says so, never inside a section above.', meta: '+27 words' } },
    { where: 'The “mark confidence” bullet', rules: ['cut'],
      r1: { kind: 'add', text: 'Anything not directly evidenced is marked as such wherever it appears.', meta: '+11 words · the rule stated a second time' },
      r2: { kind: 'none', text: 'Left alone. “Marking it in a second place would state one rule twice.”', meta: '' } },
    { where: 'The new bullet', rules: ['cut'],
      r1: { kind: 'add', text: 'Keep your own reasoning apart from the findings. Suggestions, recommendations, inferences and questions to put to the company are the one thing here with no source behind it, so it is the one thing that must not sit among the sourced sections or share their register. Put it under a final heading — What this suggests: our reading, not sourced — after the gaps. The test is whether someone skimming can tell which lines rest on a source and which are our own reasoning, without checking either. Material drawn from the company’s own published wording is derived, not found: it belongs here, however closely it follows the source.', meta: '+108 words' },
      r2: { kind: 'add', text: 'Keep your own reasoning apart. Anything reasoned from the material rather than found in it is derived, however closely it follows the source — reading a company’s own wording is still reading, not evidence. The test is whether someone skimming can tell which lines rest on a source and which are your reading, without checking either.', meta: '+56 words' } },
    { where: 'The sentence about why markdown', rules: ['cut'],
      r1: { kind: 'none', text: 'Untouched.', meta: '' },
      r2: { kind: 'del', text: 'it can be reread, quoted, extended as more is learned, and passed to whatever needs it next without conversion.', meta: '− 4 words · rewritten as “quotable, extendable as more is learned, and readable by whatever needs it next”' } },
    { where: 'The pull request description', rules: ['claim', 'cut'],
      r1: { kind: 'add', text: 'Three paragraphs on what changed and why. No line count. Nothing about what was run.', meta: '' },
      r2: { kind: 'add', text: '“One clause of self-justification about the file format was cut. Net +1 line and +77 words on a 1,330-word file.” … “Nothing here is executable, so nothing was run except scripts/build_skills.py --check-only, which passes.”', meta: 'the accounting, and the check that was actually run' } }
  ];
  var NOTES = {
    all: 'Every change both runs made to the company-research skill, side by side. GitHub counts the main change in each run as +3 −2 lines. Read the two new bullets.',
    one: 'Run 1 bundled two concerns into one pull request. Run 2 split them — which is why it opened four pull requests to run 1’s two, and why each was easier to review.',
    claim: 'Run 2 says what it checked and what it did not. Run 1’s description says nothing about checks at all, which leaves the reviewer to assume.',
    cut: 'Run 2 cut a clause, declined to restate a rule, wrote the new bullet in 56 words instead of 108, and reported the accounting: +1 line, +77 words. Run 1 added 136 words and removed none.'
  };
  var run1 = $('cmp-run1'), run2 = $('cmp-run2'), cmpNote = $('cmp-note');
  if (run1) {
    function spot(where, s, rules) {
      var d = el('div', 'spot'); d.setAttribute('data-rules', rules.join(' '));
      d.appendChild(el('div', 'spot__where', where));
      d.appendChild(el('div', 'spot__text' + (s.kind === 'del' ? ' is-del' : s.kind === 'none' ? ' is-none' : ''), s.text));
      if (s.meta) d.appendChild(el('div', 'spot__meta', s.meta));
      return d;
    }
    SPOTS.forEach(function (sp) { run1.appendChild(spot(sp.where, sp.r1, sp.rules)); run2.appendChild(spot(sp.where, sp.r2, sp.rules)); });
    function filterSpots(rule) {
      document.querySelectorAll('.rulechip').forEach(function (x) { var on = x.getAttribute('data-rule') === rule; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      document.querySelectorAll('.spot').forEach(function (s) {
        var mine = rule === 'all' || s.getAttribute('data-rules').split(' ').indexOf(rule) >= 0;
        s.classList.toggle('is-hidden', !mine); s.classList.toggle('is-hit', mine && rule !== 'all');
      });
      cmpNote.textContent = NOTES[rule];
    }
    document.querySelectorAll('.rulechip').forEach(function (b) { b.addEventListener('click', function () { filterSpots(b.getAttribute('data-rule')); }); });
    filterSpots('all');
  }

  /* ---------- Step 7 · where it stands: numbers from the snapshot, then the live API ---------- */
  var REPO = 'alexratmanpl/business-agent-skills';
  var SNAPSHOT = { date: new Date('2026-09-11T00:00:00Z'), firstLoopPr: 13 };   // the loop's first pull request; everything before it was set-up by hand
  var stPrs = $('st-prs'), stMerged = $('st-merged'), stOpen = $('st-open'), liveCap = $('state-live'), relLine = $('state-release'), snapDate = $('snapshot-date');
  var fmt = function (d, long) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' }); };
  if (snapDate) snapDate.textContent = fmt(SNAPSHOT.date, true);
  if (liveCap) liveCap.textContent = 'Snapshot of ' + fmt(SNAPSHOT.date);
  function isLoopPr(p) { return p && parseInt(p.number, 10) >= SNAPSHOT.firstLoopPr && /^claude\/\d{4}-\d{2}-\d{2}-/.test(String(p.head && p.head.ref || '')); }
  if (stPrs && window.fetch && window.AbortController) {
    // Read-only, unauthenticated, public data; every value goes in as text. Newest first, paged until the loop's first PR is passed.
    var ctrl = new AbortController(); var t = setTimeout(function () { ctrl.abort(); }, 7000);
    var opts = { signal: ctrl.signal, headers: { 'Accept': 'application/vnd.github+json' } };
    function getJson(url) { return fetch(url, opts).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }); }
    function pulls(page, acc) {
      return getJson('https://api.github.com/repos/' + REPO + '/pulls?state=all&per_page=100&sort=created&direction=desc&page=' + page).then(function (list) {
        if (!Array.isArray(list)) throw new Error('shape');
        acc = acc.concat(list);
        var last = list[list.length - 1];
        var more = list.length === 100 && last && parseInt(last.number, 10) >= SNAPSHOT.firstLoopPr && page < 5;
        return more ? pulls(page + 1, acc) : acc;
      });
    }
    Promise.all([pulls(1, []), getJson('https://api.github.com/repos/' + REPO + '/releases?per_page=5')]).then(function (res) {
      clearTimeout(t);
      var all = res[0], rels = Array.isArray(res[1]) ? res[1] : [];
      if (!all.length) throw new Error('empty');
      var opened = 0, merged = 0, open = 0;
      all.forEach(function (p) { if (!isLoopPr(p)) return; opened++; if (p.merged_at) merged++; else if (p.state === 'open') open++; });
      stPrs.textContent = String(opened); stMerged.textContent = String(merged); stOpen.textContent = String(open);
      var latest = rels.filter(function (r) { return r && r.tag_name === 'latest'; })[0] || rels[0];
      if (latest && latest.published_at) {
        var assets = Array.isArray(latest.assets) ? latest.assets.length : 0;
        relLine.textContent = 'Release: ' + String(latest.tag_name || '').slice(0, 40) + (assets ? ' · ' + assets + ' packaged skills' : '') + ' · ' + fmt(new Date(latest.published_at));
      }
      var now = new Date();
      liveCap.textContent = 'Checked live · ' + fmt(now) + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }).catch(function () {
      clearTimeout(t);
      liveCap.textContent = 'Live check unavailable — snapshot of ' + fmt(SNAPSHOT.date);
    });
  }
})();
