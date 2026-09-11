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
      if (stageNum) stageNum.textContent = stage + ' / ' + stages.length;
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
    { id: 'push', name: 'git push', nodes: ['the container', 'git proxy', 'authorized repo set'], blockAt: 2, verdict: 'not in the session’s set', ok: false,
      caption: 'git push goes through a git proxy that swaps in its own credentials — and only for repositories attached when the session started. The public skills repo was not one of them, and nothing could add it mid-session.' },
    { id: 'curl', name: 'curl api.github.com', nodes: ['the container', 'egress proxy', 'domain allowlist'], blockAt: 2, verdict: 'host not allowed', ok: false,
      caption: 'Plain HTTPS from the container goes through an egress proxy with a domain allowlist. GitHub’s API is not on it. Same machine, same wall, different door.' },
    { id: 'mcp', name: 'GitHub connector', nodes: ['the container', 'GitHub connector', 'Anthropic’s servers', 'account grant', 'GitHub API'], blockAt: -1, verdict: 'reaches GitHub', ok: true,
      caption: 'The connector does not use the session’s network at all. Its traffic leaves through Anthropic’s servers and reaches the GitHub REST API by a different road — bounded by what the account has granted, not by what the machine can reach.' }
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
  }

  /* ---------- Step 3 · the two walls ---------- */
  var WALLS = { scope: { code: '403', hit: true, note: 'Forbidden. The GitHub App is installed on exactly two repositories; a write anywhere else is refused before it reaches a branch.' },
                ruleset: { code: '409', hit: true, note: 'Conflict. A branch ruleset protects master; a direct commit is refused. Pull requests are the only way in.' },
                pr: { code: 'opened', hit: false, note: 'A pull request, in one of the two repositories, reviewed by a person before it merges. That is the whole surface the agent has.' } };
  var wallBtns = document.querySelectorAll('#wall-btns [data-wall]');
  wallBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-wall'), w = WALLS[id];
      document.querySelectorAll('.wall').forEach(function (x) {
        var mine = x.getAttribute('data-wall') === id;
        x.classList.toggle('is-hit', mine && w.hit); x.classList.toggle('is-open', mine && !w.hit);
        if (mine) x.querySelector('.wall__code').textContent = w.code;
      });
      b.parentNode.parentNode.querySelector('.caption').textContent = w.note + ' 403 and 409 are the status codes actually observed.';
    });
  });

  /* ---------- Step 4 · the loop ---------- */
  var LOOP = [
    ['Use', 'Alex uses a skill during real job research — company-research, role-fit, interview-prep or pay-check — with an agent that has it installed.'],
    ['Notice', 'The skill falls short in some specific way: a question it should have asked, a check it claimed, a section nobody could read.'],
    ['Capture', 'A 36-line account-level skill, log-finding, writes a dated markdown file into the private repo’s feedback/ folder. It holds no rules of its own; it points at CAPTURE.md, where the rules live.'],
    ['Summarise', 'A scheduled agent wakes on its own, reads AGENT.md, reads every finding newer than the watermark, and decides what to change.'],
    ['Pull request', 'It opens a pull request against the public repo — one concern per pull request, never more than one skill — with a description that says what it ran and how many lines the skill gained or lost.'],
    ['Publish', 'GitHub Actions validates every skill and, on merge to master, publishes a rolling latest release with packaged .skill files.'],
    ['Install', 'The improved skill is installed back into the account, and is in play the next time step 1 happens.']
  ];
  var loopSteps = $('loop-steps'), loopDetail = $('loop-detail'), loopIdx = 0, loopTimer = null, loopEls = [];
  if (loopSteps) {
    LOOP.forEach(function (s, i) {
      var a = -Math.PI / 2 + (i / LOOP.length) * Math.PI * 2;
      var b = el('button', 'loop__step', (i + 1) + ' · ' + s[0]); b.type = 'button';
      b.style.left = (50 + 35.5 * Math.cos(a)) + '%'; b.style.top = (50 + 35.5 * Math.sin(a)) + '%';
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
    { where: 'The list of sections',
      r1: { kind: 'add', text: 'Anything derived rather than found goes after all of them, under its own heading, never inside one.', meta: '+18 words' },
      r2: { kind: 'add', text: 'Anything derived rather than found — suggestions, recommendations, questions to put to them — comes last, under a heading that says so, never inside a section above.', meta: '+27 words' } },
    { where: 'The “mark confidence” bullet',
      r1: { kind: 'add', text: 'Anything not directly evidenced is marked as such wherever it appears.', meta: '+11 words · the rule stated a second time', rules: [] },
      r2: { kind: 'none', text: 'Left alone. “Marking it in a second place would state one rule twice.”', meta: '', rules: ['cut'] } },
    { where: 'The new bullet',
      r1: { kind: 'add', text: 'Keep your own reasoning apart from the findings. Suggestions, recommendations, inferences and questions to put to the company are the one thing here with no source behind it, so it is the one thing that must not sit among the sourced sections or share their register. Put it under a final heading — What this suggests: our reading, not sourced — after the gaps. The test is whether someone skimming can tell which lines rest on a source and which are our own reasoning, without checking either. Material drawn from the company’s own published wording is derived, not found: it belongs here, however closely it follows the source.', meta: '+108 words' },
      r2: { kind: 'add', text: 'Keep your own reasoning apart. Anything reasoned from the material rather than found in it is derived, however closely it follows the source — reading a company’s own wording is still reading, not evidence. The test is whether someone skimming can tell which lines rest on a source and which are your reading, without checking either.', meta: '+56 words', rules: ['cut'] } },
    { where: 'The sentence about why markdown',
      r1: { kind: 'none', text: 'Untouched.', meta: '' },
      r2: { kind: 'del', text: 'it can be reread, quoted, extended as more is learned, and passed to whatever needs it next without conversion.', meta: '− 4 words · rewritten as “quotable, extendable as more is learned, and readable by whatever needs it next”', rules: ['cut'] } },
    { where: 'The pull request description',
      r1: { kind: 'add', text: 'Three paragraphs on what changed and why. No line count. Nothing about what was run.', meta: '', rules: [] },
      r2: { kind: 'add', text: '“One clause of self-justification about the file format was cut. Net +1 line and +77 words on a 1,330-word file.” … “Nothing here is executable, so nothing was run except scripts/build_skills.py --check-only, which passes.”', meta: 'the accounting, and the check that was actually run', rules: ['cut', 'claim'] } }
  ];
  var NOTES = {
    none: 'Both pull requests answer the same finding about the company-research skill: material the agent reasoned was sitting next to material it found, in the same register. Both change the same file, and GitHub counts both as +3 −2 lines. Read the two new bullets.',
    one: 'Run 1’s other pull request, #14, bundled two concerns: test the standards interview-prep already sets, and close the domain gap earlier. Run 2 split them into #16 and #18. That is why run 2 opened four pull requests to run 1’s two — and why each was easier to review.',
    claim: 'Run 2 says what it checked and what it did not: “nothing was run except scripts/build_skills.py --check-only, which passes.” Run 1’s description says nothing about checks at all — which leaves the reviewer to assume.',
    date: 'Both runs happened on 20 August 2026, so both branch names carry the right date; this rule cost nothing here. Its flaw surfaced later: it reads the control repo’s last commit, and two pull requests opened on 4 September sit on branches named claude/2026-08-25-… — see the failures below.',
    cut: 'Run 2 cut a clause, left the confidence bullet alone rather than restate a rule, wrote the new bullet in 56 words instead of 108, and reported the accounting: +1 line and +77 words. Run 1 added 136 words and removed none.'
  };
  var run1 = $('cmp-run1'), run2 = $('cmp-run2'), cmpNote = $('cmp-note');
  if (run1) {
    function spot(where, s) {
      var d = el('div', 'spot'); d.setAttribute('data-rules', (s.rules || []).join(' '));
      d.appendChild(el('div', 'spot__where', where));
      d.appendChild(el('div', 'spot__text' + (s.kind === 'del' ? ' is-del' : s.kind === 'none' ? ' is-none' : ''), s.text));
      if (s.meta) d.appendChild(el('div', 'spot__meta', s.meta));
      return d;
    }
    SPOTS.forEach(function (sp) { run1.appendChild(spot(sp.where, sp.r1)); run2.appendChild(spot(sp.where, sp.r2)); });
    var activeRule = null;
    document.querySelectorAll('.rulechip').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-rule');
        activeRule = activeRule === id ? null : id;
        document.querySelectorAll('.rulechip').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-rule') === activeRule); });
        document.querySelectorAll('.spot').forEach(function (s) { s.classList.toggle('is-hit', !!activeRule && s.getAttribute('data-rules').split(' ').indexOf(activeRule) >= 0); });
        cmpNote.textContent = NOTES[activeRule || 'none'];
      });
    });
  }

  /* ---------- Step 7 · where it stands: snapshot, then the live API ---------- */
  var SNAPSHOT = [
    { n: 21, what: 'Run 3 · interview-prep: add a reload to the record’s pre-delivery check', st: 'open' },
    { n: 20, what: 'Run 3 · interview-prep: persist the record page with localStorage', st: 'open' },
    { n: 18, what: 'Run 2 · ask how far the domain is from the candidate, and close it before the brief', st: 'merged' },
    { n: 17, what: 'Run 2 · keep derived material out of a dossier’s sourced sections', st: 'merged' },
    { n: 16, what: 'Run 2 · check the two standards interview-prep sets and never tests', st: 'merged' },
    { n: 15, what: 'Run 2 · make the record’s controls work in the viewer, not just from a local file', st: 'merged' },
    { n: 14, what: 'Run 1 · two concerns in one — closed unmerged as the experiment’s reset', st: 'closed' },
    { n: 13, what: 'Run 1 · derived material — closed unmerged as the experiment’s reset', st: 'closed' }
  ];
  var REPO = 'alexratmanpl/business-agent-skills';
  var tbody = $('state-body'), liveCap = $('state-live'), relLine = $('state-release');
  var rows = {};
  function badge(st) { var b = el('span', 'st st--' + st, st === 'merged' ? 'merged' : st === 'open' ? 'open' : 'closed'); return b; }
  if (tbody) {
    SNAPSHOT.forEach(function (p) {
      var tr = el('tr'), td1 = el('td'), a = el('a', null, '#' + p.n); a.href = 'https://github.com/' + REPO + '/pull/' + p.n; a.rel = 'noopener';
      td1.appendChild(a); tr.appendChild(td1);
      tr.appendChild(el('td', null, p.what));
      var td3 = el('td'); td3.appendChild(badge(p.st)); tr.appendChild(td3);
      tbody.appendChild(tr); rows[p.n] = td3;
    });
    // Live refresh. Read-only, unauthenticated, public data; every value goes in as text.
    if (window.fetch && window.AbortController) {
      var ctrl = new AbortController(); var t = setTimeout(function () { ctrl.abort(); }, 7000);
      var opts = { signal: ctrl.signal, headers: { 'Accept': 'application/vnd.github+json' } };
      Promise.all([
        fetch('https://api.github.com/repos/' + REPO + '/pulls?state=all&per_page=30&sort=created&direction=desc', opts).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
        fetch('https://api.github.com/repos/' + REPO + '/releases?per_page=5', opts).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      ]).then(function (res) {
        clearTimeout(t);
        var pulls = Array.isArray(res[0]) ? res[0] : [], rels = Array.isArray(res[1]) ? res[1] : [];
        var open = 0, newer = [];
        pulls.forEach(function (p) {
          var n = parseInt(p.number, 10); if (!isFinite(n)) return;
          var st = p.merged_at ? 'merged' : (p.state === 'open' ? 'open' : 'closed');
          if (st === 'open') open++;
          if (rows[n]) { rows[n].innerHTML = ''; rows[n].appendChild(badge(st)); }
          else if (n > 21 && String(p.title || '').length) newer.push({ n: n, title: String(p.title).slice(0, 120), st: st });
        });
        newer.sort(function (a, b) { return b.n - a.n; }).reverse().forEach(function (p) {
          var tr = el('tr'), td1 = el('td'), a = el('a', null, '#' + p.n); a.href = 'https://github.com/' + REPO + '/pull/' + p.n; a.rel = 'noopener';
          td1.appendChild(a); tr.appendChild(td1); tr.appendChild(el('td', null, 'New since the snapshot · ' + p.title));
          var td3 = el('td'); td3.appendChild(badge(p.st)); tr.appendChild(td3);
          tbody.insertBefore(tr, tbody.firstChild);
        });
        var latest = rels.filter(function (r) { return r && r.tag_name === 'latest'; })[0] || rels[0];
        if (latest) {
          var when = latest.published_at ? new Date(latest.published_at) : null;
          relLine.textContent = 'Release: ' + String(latest.tag_name || '').slice(0, 40) + (when ? ', published ' + when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '') + (latest.prerelease ? ', still marked prerelease' : ', no longer marked prerelease');
        }
        var now = new Date();
        liveCap.textContent = 'Checked live · ' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' · ' + open + ' open';
      }).catch(function () {
        clearTimeout(t);
        liveCap.textContent = 'Live check unavailable — showing the snapshot of 11 Sep 2026';
      });
    }
  }
})();
