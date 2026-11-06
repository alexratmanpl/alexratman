/* Write It Down Before You Build It — the parts only this page has: the four stages, the checks run, the example chat.
   The questions, the dial, the progress bar and the stage pill come from /assets/play.js. Plain JS, no dependencies, no network. */
(function () {
  'use strict';
  var Play = window.Play;
  if (!Play) return;
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = Play.reduceMotion();
  var el = Play.el, pressToggle = Play.pressToggle, noRepeat = Play.noRepeat, focusNear = Play.focusNear;
  var ghostBuild = Play.ghostBuild, fill = Play.fill, stepper = Play.stepper, copyText = Play.copyText;
  function icon(id) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '14'); svg.setAttribute('height', '14'); svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2.6');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use'); use.setAttribute('href', '#' + id); svg.appendChild(use);
    return svg;
  }
  /* ---------- Step 2 · four stages ---------- */
  var STAGES = [
    { who: 'You tell the AI the idea. It writes the spec and asks what\'s unclear.',
      out: 'A spec: a page of plain sentences.',
      eg: '"The app shows what each person pays, with cents, like 12.50."',
      check: 'Is this what I meant? Is anything missing?' },
    { who: 'The AI proposes how to build it. You read the plan.',
      out: 'A short plan of the pieces.',
      eg: 'Two boxes, a tip option, a place for the result, and a short message for bad input.',
      check: 'Does the plan cover every line of the spec?' },
    { who: 'The AI splits the plan into small tasks. You check the order.',
      out: 'A to-do list of small tasks, in order.',
      eg: '1. Two boxes and the result. 2. The tip. 3. Empty boxes and zero people.',
      check: 'Is the order sensible? Is any task too big to check on its own?' },
    { who: 'The AI does one task at a time. You try each result.',
      out: 'A working piece, one task at a time.',
      eg: 'After task 1, you can open the app, type 100 and 4 people, and see 25.00 each.',
      check: 'Does it do what its line of the spec says? If not, say so before the next task.' }
  ];
  function buildStage(node, s) {
    var who = el('p', 'stepper__who'); who.appendChild(el('b', null, 'Who does it')); who.appendChild(document.createTextNode(' ' + s.who));
    var cols = el('div', 'stepper__cols');
    var a = el('div', 'stepper__col');
    a.appendChild(el('div', 'label label--sm label--muted', 'What you get'));
    a.appendChild(el('p', null, s.out));
    var eg = el('p', 'stepper__eg'); eg.appendChild(el('span', null, 'For example')); eg.appendChild(document.createTextNode(' ' + s.eg)); a.appendChild(eg);
    var b = el('div', 'stepper__col stepper__col--check');
    b.appendChild(el('div', 'label label--sm', 'What you check'));
    b.appendChild(el('p', null, s.check));
    cols.appendChild(a); cols.appendChild(b);
    node.appendChild(who); node.appendChild(cols);
  }
  stepper($('stages'), STAGES, buildStage);

  /* ---------- Step 3 · run the checks ---------- */
  var checksCard = $('checks');
  if (checksCard) {
    var rows = Array.prototype.slice.call($('checks-list').children);
    var btn = $('checks-btn'), sum = $('checks-sum');
    var phase = 'idle', busy = false, readyAt = 0;
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
    noRepeat(btn);
    btn.addEventListener('click', function () {
      if (busy || Date.now() < readyAt) return;
      readyAt = Date.now() + 350;   /* with reduced motion the result is instant, so the second click of a double click must not count */
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

  /* ---------- Step 7 · the same idea, asked two ways (a scripted example chat) ---------- */
  var SPEC = [
    'I type the total bill and the number of people.',
    'The app shows what each person pays, with cents, like 12.50.',
    'I can add a tip as a percentage. The app then shows the new total and each person\'s share.',
    'If a box is empty, or the number of people is zero, the app shows a short message instead of a result.',
    'When I close the page and open it again, both boxes are empty.',
    'When I make the window narrow, like a phone screen, nothing is cut off.'
  ];
  function planOf(cent) {
    return { plan: [
      ['Two boxes and the result.', 'Type 100 and 4 people. You see 25.00 each.'],
      ['The tip.', 'Add 10%. You see 110.00 in total and 27.50 each.'],
      ['Empty boxes and zero people.', 'Clear the total box. A short message appears, not a number.'],
      ['The leftover cent.', cent],
      ['Nothing saved, and a narrow window.', 'Close the page and open it again: both boxes are empty. Make the window narrow: nothing is cut off.']
    ] };
  }
  /* each node is one message you can send (say) and the AI's answer (ai); next lists what you can send after it */
  var CHAT = {
    a1: { say: 'Build me an app that splits a restaurant bill.',
          ai: ['Done! I built a clean, modern bill splitter with tip options. It works on any device.'],
          next: ['a2', 'a3'] },
    a2: { say: 'Does it work?',
          ai: ['Yes! It should work well on any phone or laptop.'],
          next: ['a3'] },
    a3: { say: 'Did you decide anything I didn\'t ask for?',
          ai: ['Yes, three things. I set the tip to 10% unless you change it. I round each share up to the next whole number. I also made the app save your last 10 bills in your browser.'],
          next: [], done: 'A' },
    b1: { say: 'Here is my spec for an app that splits a restaurant bill.', spec: true, after: 'Ask me about anything unclear before you build.',
          ai: ['Thanks. Before I build anything, one thing is unclear. 100.00 shared by 3 people is 33.33 each, and that leaves 1 cent. What should the app do?'],
          next: ['b2a', 'b2b'] },
    b2a: { say: 'Round each share up, so everyone pays 33.34.',
           ai: ['Good. I added line 7: "If the bill doesn\'t divide evenly, the app rounds each share up to the next cent." Here is my plan. I grouped related lines into five tasks, and each task has a check you can run yourself.', planOf('Type 100 and 3 people. You see 33.34 each.')],
           next: ['b3'], done: 'B' },
    b2b: { say: 'Keep 33.33 each and show a note about the missing cent.',
           ai: ['Good. I added line 7: "If the bill doesn\'t divide evenly, the app shows each share rounded down, with a note about the missing cent." Here is my plan. I grouped related lines into five tasks, and each task has a check you can run yourself.', planOf('Type 100 and 3 people. You see 33.33 each and a note about 1 cent.')],
           next: ['b3'], done: 'B' },
    b3: { say: 'Start with task 1.',
          ai: ['Task 1 is done. Save the app as splitter.html and open that file in your browser. Run its check: type 100 and 4 people. What do you see?'],
          next: ['b4a', 'b4b', 'b3q'] },
    b3q: { say: 'Can you run that check for me?',
          ai: ['Not from a chat like this. I can\'t open the file on your computer or see your screen, so I can\'t try the app for you. Depending on which AI app you use, that may be possible if you give it access in its settings. Claude Desktop can work with the apps and files on your computer on some plans. That access carries risk, so for now please run the check and tell me what you see.'],
          next: ['b4a', 'b4b'] },
    b4a: { say: 'I see 25.00 each.', ai: ['Task 1 passes. Say "next" when you want task 2.'], next: [] },
    b4b: { say: 'I see 25 each.', ai: ['That fails line 2, which asks for cents. I\'ll fix it. Try the check again.'], next: ['b4c'] },
    b4c: { say: 'Now I see 25.00 each.', ai: ['Task 1 passes. Say "next" when you want task 2.'], next: [] }
  };
  var CHAT_START = ['a1', 'b1'];
  var CHAT_GREETING = 'What would you like to build?';
  var CHAT_END = 'Press Start over to play again.';   /* shown when both ways have been tried; after one way, a button offers the other */
  var CHAT_OTHER = 'Try the other way';
  var CHAT_LABEL = { play: 'Press a message to send it', end: 'The chat has ended' };
  var CHAT_FX = {
    A: { who: 'The AI', ask: '0', checks: '0' },
    B: { who: 'You', ask: '1', checks: String(planOf('').plan.length) }
  };
  CHAT_FX.A.say = 'Just ask: the AI decided the tip, the rounding and what is saved. It asked ' + CHAT_FX.A.ask + ' questions. You have ' + CHAT_FX.A.checks + ' checks to run.';
  CHAT_FX.B.say = 'Spec first: you decided the tip, the rounding and what is saved. The AI asked ' + CHAT_FX.B.ask + ' question. You have ' + CHAT_FX.B.checks + ' checks to run.';
  var CHAT_SUM = ['Try both ways to fill in the table.', 'Now try the other way.', 'The same idea and the same AI. With "Just ask", the AI made choices that might have suited you, but you never made them. With "Spec first", it asked before building, and you had checks to run.'];
  /* every set of buttons the chat can show, so the box can keep the height of the tallest */
  var CHAT_SETS = (function () {
    var seen = {}, out = [];
    function add(set) { var k = set.join(','); if (set.length && !seen[k]) { seen[k] = 1; out.push(set); } }
    add(CHAT_START);
    Object.keys(CHAT).forEach(function (id) { add(CHAT[id].next); });
    add(['a1']); add(['b1']);   /* after one way, the chat offers only the other */
    out.push('end1', 'end2');
    return out;
  })();
  var chatCard = $('chat');
  if (chatCard) {
    var chatApp = $('chat-app'), chatLog = $('chat-log'), chatChoices = $('chat-choices'), chatSum = $('chat-sum'), chatFx = $('chat-fx');
    var chatLabel = $('chat-send-label'), chatCopy = $('chat-copy'), chatCopyLabel = chatCopy.querySelector('span'), chatReset = $('chat-reset'), chatAnnounce = $('chat-announce'), chatStatic = $('chat-static');
    var chatDone = { A: false, B: false }, chatEpoch = 0, chatBusy = false, chatReadyAt = 0, copyTimer = 0;
    /* a status line for screen readers: cleared first, so the same sentence is read again if it comes twice */
    var announce = function (text) { chatAnnounce.textContent = ''; setTimeout(function () { chatAnnounce.textContent = text; }, 60); };
    var buildSet = function (node, set) {
      if (set === 'end2') { node.appendChild(el('p', 'chat__end', CHAT_END)); return; }
      if (set === 'end1') {   /* one way is done: this button keeps the table and starts the other way */
        var o = el('button', 'chat__choice'); o.type = 'button'; o.setAttribute('data-act', 'other');
        o.appendChild(el('span', null, CHAT_OTHER)); o.appendChild(icon('i-arrow-right'));
        node.appendChild(o); return;
      }
      set.forEach(function (id) {
        var b = el('button', 'chat__choice'); b.type = 'button'; b.setAttribute('data-id', id);
        b.appendChild(el('span', null, CHAT[id].say)); b.appendChild(icon('i-arrow-right'));
        node.appendChild(b);
      });
    };
    ghostBuild(chatChoices, CHAT_SETS.length, function (node, i) { buildSet(node, CHAT_SETS[i]); });
    ghostBuild(chatSum, CHAT_SUM.length, function (node, i) { node.textContent = CHAT_SUM[i]; });
    var setChoices = function (set) { chatChoices.textContent = ''; if (set) buildSet(chatChoices, set); };
    var bubble = function (you) {
      var b = el('div', you ? 'bubble bubble--user bubble--user-right' : 'bubble bubble--assistant');
      b.appendChild(el('span', 'visually-hidden', you ? 'You: ' : 'AI: '));
      return b;
    };
    var addYou = function (node) {
      var b = bubble(true);
      b.appendChild(el('p', null, node.say));
      if (node.spec) { var ol = el('ol', 'chat__spec'); ol.setAttribute('role', 'list'); SPEC.forEach(function (t) { ol.appendChild(el('li', null, t)); }); b.appendChild(ol); }
      if (node.after) b.appendChild(el('p', 'chat__after', node.after));
      chatLog.appendChild(b);
      return b;
    };
    var addAi = function (blocks) {
      var b = bubble(false);
      blocks.forEach(function (blk) {
        if (typeof blk === 'string') { b.appendChild(el('p', null, blk)); return; }
        var ol = el('ol', 'chat__plan'); ol.setAttribute('role', 'list');
        blk.plan.forEach(function (it) { var li = el('li'); li.appendChild(el('b', null, it[0])); li.appendChild(el('span', null, 'Check: ' + it[1])); ol.appendChild(li); });
        b.appendChild(ol);
      });
      chatLog.appendChild(b);
      return b;
    };
    var addTyping = function () {
      var b = el('div', 'bubble bubble--assistant chat__typing'); b.setAttribute('aria-hidden', 'true');
      b.appendChild(el('i')); b.appendChild(el('i')); b.appendChild(el('i'));
      chatLog.appendChild(b);
      return b;
    };
    /* scroll the box so the new exchange is read from its start: from your message if message and answer fit together, otherwise from the start of the answer */
    var showFrom = function (target) {
      var top = Math.max(0, Math.min(chatLog.scrollHeight - chatLog.clientHeight, target.offsetTop - 12));
      if (reduceMotion || !chatLog.scrollTo) chatLog.scrollTop = top; else chatLog.scrollTo({ top: top, behavior: 'smooth' });
    };
    var showExchange = function (you, answer) {
      var fits = answer.offsetTop + answer.offsetHeight - you.offsetTop + 24 <= chatLog.clientHeight;
      showFrom(fits ? you : answer);
    };
    var markDone = function (p) {
      chatDone[p] = true;
      ['who', 'ask', 'checks'].forEach(function (k) {
        var td = chatFx.querySelector('td[data-p="' + p + '"][data-k="' + k + '"]');
        td.textContent = CHAT_FX[p][k]; td.classList.add('is-set');
      });
      var line = CHAT_SUM[(chatDone.A ? 1 : 0) + (chatDone.B ? 1 : 0)];
      fill(chatSum, function (n) { n.textContent = line; });
      announce(CHAT_FX[p].say + ' ' + line);   /* the table is read out once, in one sentence, for screen readers */
    };
    var delayOf = function (node) { return Math.min(1500, 450 + JSON.stringify(node.ai).length * 2.2); };
    var send = function (id, viaKeyboard) {
      if (chatBusy || Date.now() < chatReadyAt) return;   /* the second click of a double click lands on the new button when the reply is instant */
      chatBusy = true;
      var node = CHAT[id], mine = chatEpoch;
      var gone = chatLog.querySelector('.chat__empty');
      if (gone) chatLog.removeChild(gone);
      var you = addYou(node);
      setChoices(null);
      var dots = reduceMotion ? null : addTyping();
      showExchange(you, dots || you);
      var reply = function () {
        if (mine !== chatEpoch) return;
        if (dots && dots.parentNode) dots.parentNode.removeChild(dots);
        showExchange(you, addAi(node.ai));
        if (node.done) markDone(node.done);
        var set = node.next.length ? node.next : (chatDone.A && chatDone.B ? 'end2' : 'end1');
        setChoices(set);
        chatBusy = false;
        chatReadyAt = Date.now() + 350;
        var ended = typeof set === 'string';
        if (ended) {   /* when both ways are done, the end message goes with the Start over button, which is where the focus lands; after one way, the focus lands on the button for the other way */
          chatLabel.textContent = CHAT_LABEL.end;
          var endP = chatChoices.querySelector('.chat__end');
          if (endP) { endP.id = 'chat-end'; chatReset.setAttribute('aria-describedby', 'chat-send-label chat-end'); }
        }
        /* move the focus to the new button only if the reader has not moved it somewhere else while the AI was typing */
        var here = document.activeElement, f = set === 'end2' ? chatReset : chatChoices.querySelector('button');
        if (viaKeyboard && f && (!here || here === document.body)) focusNear(f);
      };
      if (reduceMotion) reply(); else setTimeout(reply, delayOf(node));
    };
    var restart = function (set) {
      chatEpoch++; chatBusy = false; chatReadyAt = 0;   /* a new chat can be used at once */
      chatReset.removeAttribute('aria-describedby');
      chatLabel.textContent = CHAT_LABEL.play;
      chatLog.textContent = '';
      chatLog.appendChild(el('div', 'chat__empty', CHAT_GREETING));
      chatLog.scrollTop = 0;
      setChoices(set || CHAT_START);
    };
    /* "Try the other way": a new chat, with the table kept, that offers only the way not tried yet */
    var tryOther = function (viaKeyboard) {
      if (chatBusy || Date.now() < chatReadyAt) return;   /* the second click of a double click lands on this button when the last answer is instant */
      restart(chatDone.A ? ['b1'] : ['a1']);
      var f = chatChoices.querySelector('button');
      if (viaKeyboard && f) focusNear(f);   /* the button that was pressed is gone */
    };
    chatChoices.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || !chatChoices.contains(b)) return;
      if (b.hasAttribute('data-act')) tryOther(e.detail === 0);
      else if (b.hasAttribute('data-id')) send(b.getAttribute('data-id'), e.detail === 0);
    });
    /* "Start over" starts everything again, the table included */
    var clearTable = function () {
      chatDone.A = false; chatDone.B = false;
      Array.prototype.slice.call(chatFx.querySelectorAll('td[data-p]')).forEach(function (td) {
        td.textContent = ''; td.classList.remove('is-set');
        var dash = el('span', null, '–'); dash.setAttribute('aria-hidden', 'true');
        td.appendChild(dash); td.appendChild(el('span', 'visually-hidden', 'Not tried yet'));
      });
      fill(chatSum, function (n) { n.textContent = CHAT_SUM[0]; });
    };
    noRepeat(chatApp);
    chatReset.addEventListener('click', function () {
      var tried = chatDone.A || chatDone.B;
      if (tried) clearTable();
      restart();
      if (tried) announce('The table is empty again. ' + CHAT_SUM[0]);
    });
    var SPEC_TEXT = SPEC.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n');
    chatCopy.addEventListener('click', function () {
      copyText(SPEC_TEXT, function (ok) {
        if (!ok) {
          /* copying was refused: put the text in the box, selected, so the reader can press Ctrl+C or Cmd+C. Only one note at a time. */
          Array.prototype.slice.call(chatLog.querySelectorAll('.chat__note')).forEach(function (old) { chatLog.removeChild(old); });
          var note = el('div', 'chat__note'), text = el('p', 'chat__notetext', SPEC_TEXT);
          note.appendChild(el('p', 'chat__notehead', 'Copying was blocked. Select the text below, then press Ctrl+C or Cmd+C:'));
          note.appendChild(text);
          chatLog.appendChild(note); showFrom(note);
          var r = document.createRange(); r.selectNodeContents(text);
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
          return;
        }
        chatCopyLabel.textContent = 'Copied'; chatCopy.classList.add('is-done');
        announce('Spec copied.');
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () { chatCopyLabel.textContent = 'Copy the spec'; chatCopy.classList.remove('is-done'); }, 2200);
      });
    });
    restart();
    chatLog.setAttribute('role', 'log'); chatLog.setAttribute('aria-live', 'polite');   /* set after the first message, so the greeting is not read out on load */
    if (chatStatic) chatStatic.hidden = true;   /* the written-out copy of the chat is only for readers whose script does not run */
    chatApp.hidden = false;
  }
})();
