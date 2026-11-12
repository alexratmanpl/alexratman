/* Ask, Write or Draw?: the job card (step 2) and the own-job card with its map (step 3).
   The text of each card sits in <script type="application/json" class="hub-data"> inside an element with data-hub="jobs | flow",
   next to a readable copy in .hub-static for readers without script. This file hides that copy and builds the live card from the data.
   Step 1 (the price list) needs no script. Plain JS, no libraries, no network, nothing stored.
   The page loads /assets/play.js first; this file borrows its small helpers (announce, copyText). */
(function (global) {
  'use strict';
  var P = global.Play || {};
  var uidN = 0;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function fmt(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); }
  function uid(p) { uidN += 1; return p + '-' + uidN; }
  function say(text) { if (P.announce) P.announce(text); }
  function calm() { return P.reduceMotion ? P.reduceMotion() : false; }
  /* markup-lite: [text](url) becomes a link, the same reading as play.js */
  function rich(node, text) {
    var s = String(text), re = /\[([^\]]+)\]\(([^)\s]+)\)/g, last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) node.appendChild(document.createTextNode(s.slice(last, m.index)));
      var a = el('a', null, m[1]); a.href = m[2];
      if (/^https?:/i.test(m[2])) { a.target = '_blank'; a.rel = 'noopener'; }
      node.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < s.length) node.appendChild(document.createTextNode(s.slice(last)));
    return node;
  }
  function reveal(node) {
    try { node.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' }); } catch (e) { node.scrollIntoView(false); }
  }
  function plain(text) { return String(text).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1'); }
  /* the live card goes where the readable copy is, so a caption after it stays last */
  function place(host, live) {
    var stat = host.querySelector('.hub-static');
    if (stat && stat.parentNode === host) host.insertBefore(live, stat.nextSibling); else host.appendChild(live);
  }
  function arrowIcon(back) {
    var NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', '18'); s.setAttribute('height', '18'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    var a = document.createElementNS(NS, 'path'), b = document.createElementNS(NS, 'path');
    a.setAttribute('d', back ? 'M19 12H5' : 'M5 12h14'); b.setAttribute('d', back ? 'M11 6l-6 6 6 6' : 'M13 6l6 6-6 6');
    s.appendChild(a); s.appendChild(b); return s;
  }

  /* ------------------------------------------------------------------ step 2: five jobs, one at a time */
  function jobs(host, d) {
    var ui = d.ui, N = d.jobs.length, cur = 0, picks = d.jobs.map(function () { return null; }), found = d.jobs.map(function () { return false; });
    var live = el('div', 'hub__live');

    /* the top bar: the card label on the left (moved in at the end), one dot per job on the right */
    var bar = el('div', 'jobs__bar'), dots = el('ol', 'jobs__dots');
    var dotBtns = d.jobs.map(function (j, i) {
      var li = el('li'), b = el('button', 'jdot'); b.type = 'button';
      b.appendChild(el('span', 'jdot__c', String(i + 1)));
      b.addEventListener('click', function () { go(i); });
      li.appendChild(b); dots.appendChild(li); return b;
    });
    bar.appendChild(dots); live.appendChild(bar);

    /* one block per job; only the current one is shown */
    var parts = d.jobs.map(function (j, i) {
      var id = uid('job'), sec = el('section', 'job');
      sec.setAttribute('role', 'group'); sec.setAttribute('aria-labelledby', id + '-t');
      sec.appendChild(el('p', 'job__n', fmt(ui.count, { i: i + 1, n: N })));
      var h = el('h3', 'job__title', j.title); h.id = id + '-t'; h.tabIndex = -1; sec.appendChild(h);
      sec.appendChild(el('p', 'job__text', j.text));
      var ul = el('ul', 'job__facts'); j.facts.forEach(function (f) { ul.appendChild(el('li', null, f)); }); sec.appendChild(ul);
      var fs = el('fieldset', 'job__q'); fs.appendChild(el('legend', null, ui.q));
      var opts = el('div', 'job__opts'), labs = {}, radios = {};
      d.starts.forEach(function (s) {
        var lab = el('label', 'opt'), inp = el('input'); inp.type = 'radio'; inp.name = id + '-start'; inp.value = s.id;
        lab.appendChild(inp); lab.appendChild(el('span', null, s.label)); opts.appendChild(lab); labs[s.id] = lab; radios[s.id] = inp;
        inp.addEventListener('change', function () { pick(i, s.id); });
      });
      fs.appendChild(opts); sec.appendChild(fs);
      var fb = el('div', 'job__fb'); fb.hidden = true; sec.appendChild(fb);
      live.appendChild(sec);
      return { sec: sec, title: h, labs: labs, radios: radios, fb: fb };
    });

    function focusNow(node) { try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); } }
    function stateText(i) { return found[i] ? ui.dotFound : ui.dotOpen; }
    function feedback(i) {
      var j = d.jobs[i], pt = parts[i], id = picks[i], s = d.starts.filter(function (x) { return x.id === id; })[0], best = id === j.best;
      pt.fb.textContent = '';
      var p = el('p', best ? 'fb' : 'fb fb--no');
      p.appendChild(el('b', null, best ? fmt(ui.best, { s: s.label }) : ui.wrong)); p.appendChild(document.createTextNode(' ' + j.says[id]));
      pt.fb.appendChild(p);
      var act = el('div', 'fb__act');
      if (best) {
        var why = el('p', 'fb__why'); why.appendChild(el('b', null, ui.why)); why.appendChild(document.createTextNode(' ')); rich(why, j.why); pt.fb.appendChild(why);
        if (i < N - 1) {
          var nb = el('button', 'btn jobs__go'); nb.type = 'button'; nb.appendChild(el('span', null, ui.next)); nb.appendChild(arrowIcon(false));
          nb.addEventListener('click', function () { go(i + 1); focusNow(parts[i + 1].title); if (P.ensureVisible) P.ensureVisible(bar); });
          act.appendChild(nb);
        } else {
          var gb = el('a', 'btn jobs__go', ui.last); gb.href = '#s4'; act.appendChild(gb);
        }
      } else {
        var sb = el('button', 'linkbtn', ui.show); sb.type = 'button';
        sb.addEventListener('click', function () { pt.radios[j.best].checked = true; pick(i, j.best); focusNow(pt.radios[j.best]); });
        act.appendChild(sb);
        if (i < N - 1) {
          var qb = el('button', 'linkbtn', ui.next); qb.type = 'button';
          qb.addEventListener('click', function () { go(i + 1); focusNow(parts[i + 1].title); if (P.ensureVisible) P.ensureVisible(bar); });
          act.appendChild(qb);
        } else {
          var qa = el('a', 'linkbtn', ui.last); qa.href = '#s4'; act.appendChild(qa);
        }
      }
      pt.fb.appendChild(act); pt.fb.hidden = false;
    }
    function paint() {
      parts.forEach(function (pt, i) {
        var j = d.jobs[i], p = picks[i];
        pt.sec.hidden = i !== cur;
        d.starts.forEach(function (s) {
          pt.labs[s.id].classList.toggle('is-best', p === s.id && s.id === j.best);
          pt.labs[s.id].classList.toggle('is-miss', p === s.id && s.id !== j.best);
        });
      });
      dotBtns.forEach(function (b, i) {
        b.classList.toggle('is-here', i === cur);
        b.classList.toggle('is-found', found[i]);
        b.setAttribute('aria-label', fmt(ui.dot, { i: i + 1, t: d.jobs[i].title }) + ', ' + stateText(i));
        if (i === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
    }
    function pick(i, id) {
      var j = d.jobs[i], s = d.starts.filter(function (x) { return x.id === id; })[0];
      picks[i] = id; if (id === j.best) found[i] = true;
      paint(); feedback(i);
      say(id === j.best ? fmt(ui.best, { s: s.label }) + ' ' + j.says[id] + ' ' + ui.why + ' ' + plain(j.why) : ui.wrong + ' ' + j.says[id]);
      reveal(parts[i].fb);
    }
    function go(i) {
      cur = i; paint();
      say(fmt(ui.count, { i: cur + 1, n: N }) + ': ' + d.jobs[cur].title);
    }
    paint();
    place(host, live);
    var lab = null; each(host.children, function (c) { if (!lab && c.classList && c.classList.contains('label')) lab = c; });
    if (lab) bar.insertBefore(lab, dots);
  }

  /* ------------------------------------------------------------------ step 3: three questions and the map */
  function flow(host, d) {
    var ui = d.ui, nodes = d.nodes, results = d.results, trail = [], at = d.start, res = null;
    var live = el('div', 'hub__live flow');
    var left = el('div', 'flow__left');

    /* the questions: only the current one is shown */
    var qbox = el('div', 'flow__q'), qs = {}, order = ['q1', 'q2', 'q3a', 'q3b'];
    order.forEach(function (k) {
      var n = nodes[k], q = el('div', 'fq'), num = k === 'q1' ? 1 : (k === 'q2' ? 2 : 3);
      q.appendChild(el('p', 'fq__n', fmt(ui.qn, { i: num })));
      var id = uid('fq'), qt = el('p', 'fq__t', n.q); qt.id = id; qt.tabIndex = -1; q.appendChild(qt);
      if (n.help) q.appendChild(el('p', 'fq__help', n.help));
      var btns = el('div', 'fq__btns'), by = el('button', 'btn btn--secondary', ui.yes), bn = el('button', 'btn btn--secondary', ui.no);
      by.type = bn.type = 'button';
      by.setAttribute('aria-describedby', id); bn.setAttribute('aria-describedby', id);
      by.addEventListener('click', function () { answer(k, true); }); bn.addEventListener('click', function () { answer(k, false); });
      btns.appendChild(by); btns.appendChild(bn); q.appendChild(btns);
      qbox.appendChild(q); qs[k] = { box: q, t: qt, yes: by, no: bn };
    });
    var ctl = el('div', 'flow__ctl');
    var back = el('button', 'btn btn--ghost', ui.back), again = el('button', 'btn btn--ghost', ui.again);
    back.type = again.type = 'button';
    back.addEventListener('click', function () { var t = trail.pop(); at = t.id; res = null; paint(); focusNow(qs[at].t); say(fmt(ui.qn, { i: depth(at) }) + '. ' + nodes[at].q); });
    again.addEventListener('click', function () { trail = []; at = d.start; res = null; paint(); focusNow(qs.q1.t); say(fmt(ui.qn, { i: 1 }) + '. ' + nodes[at].q); });
    ctl.appendChild(back); ctl.appendChild(again);
    left.appendChild(qbox); left.appendChild(ctl);

    /* the map: the same three questions, drawn */
    var map = el('div', 'map2'); map.setAttribute('aria-hidden', 'true');
    var strip = el('div', 'map2__strip'); strip.appendChild(el('span', null, d.strip)); strip.appendChild(el('b', null, 'Ask'));
    var grid = el('div', 'map2__grid');
    grid.appendChild(el('div', 'map2__colt', d.axes.cols));
    grid.appendChild(el('div', 'map2__colh', d.axes.no)); grid.appendChild(el('div', 'map2__colh', d.axes.yes));
    grid.appendChild(el('div', 'map2__rowt', d.axes.rows));
    var cells = {};
    d.cells.forEach(function (row, ri) {
      grid.appendChild(el('div', 'map2__rowh map2__rowh--' + ri, ri === 0 ? d.axes.no : d.axes.yes));
      row.forEach(function (key, ci) { var c = el('div', 'map2__cell map2__cell--' + ri + ci, d.cellnames[key]); grid.appendChild(c); cells[key] = c; });
    });
    map.appendChild(strip); map.appendChild(grid);

    /* the result: one block per result, shown when it is reached */
    var rbox = el('div', 'flow__r'), rs = {};
    var idle = el('div', 'fr fr--idle'); idle.appendChild(el('p', 'fr__h', ui.start)); idle.appendChild(el('p', 'fr__idle', ui.idle)); rbox.appendChild(idle); rs._idle = idle;
    Object.keys(results).forEach(function (k) {
      var r = results[k], b = el('div', 'fr');
      b.appendChild(el('p', 'fr__h', ui.start)); b.appendChild(el('p', 'fr__t', r.title));
      var tx = el('p', 'fr__p'); rich(tx, r.text); b.appendChild(tx);
      if (r.note) b.appendChild(el('p', 'fr__note', r.note));
      if (r.eg) {
        var eg = el('details', 'fr__eg'), hd = el('summary', null, ui.eg), lead = r.egfor ? el('p', 'fr__for', r.egfor) : null, q = el('blockquote', null, r.eg), cp = el('button', 'btn btn--secondary btn--sm', ui.copy);
        cp.type = 'button';
        cp.addEventListener('click', function () {
          if (!P.copyText) return;
          P.copyText(r.eg, function (ok) { cp.textContent = ok ? ui.copied : ui.copy; if (ok) { say(ui.copied); setTimeout(function () { cp.textContent = ui.copy; }, 2200); } });
        });
        eg.appendChild(hd); if (lead) eg.appendChild(lead); eg.appendChild(q); eg.appendChild(cp); b.appendChild(eg);
      }
      rbox.appendChild(b); rs[k] = b;
    });

    live.appendChild(left); live.appendChild(map); live.appendChild(rbox);

    function focusNow(node) { try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); } }
    function depth(k) { return k === 'q1' ? 1 : (k === 'q2' ? 2 : 3); }
    function answer(k, yes) {
      /* pressing an answer in a finished path changes that answer */
      if (res !== null) { while (trail.length && trail[trail.length - 1].id !== k) trail.pop(); trail.pop(); res = null; }
      trail.push({ id: k, ans: yes });
      var nx = nodes[k][yes ? 'yes' : 'no'];
      if (nodes[nx]) { at = nx; res = null; } else { res = nx; }
      paint();
      if (res !== null) { say(ui.start + ': ' + results[res].title + '. ' + plain(results[res].text) + (results[res].note ? ' ' + results[res].note : '')); reveal(rbox); }
      else { focusNow(qs[at].t); say(fmt(ui.qn, { i: depth(at) }) + '. ' + nodes[at].q); }
    }
    function paint() {
      var shown = res !== null ? trail[trail.length - 1].id : at;
      var last = trail.length ? trail[trail.length - 1] : null;
      order.forEach(function (k) {
        var q = qs[k], on = k === shown;
        q.box.classList.toggle('is-cur', on);
        var pressedYes = on && res !== null && last && last.id === k && last.ans === true, pressedNo = on && res !== null && last && last.id === k && last.ans === false;
        q.yes.classList.toggle('is-on', !!pressedYes); q.no.classList.toggle('is-on', !!pressedNo);
        if (on && res !== null) { q.yes.setAttribute('aria-pressed', pressedYes ? 'true' : 'false'); q.no.setAttribute('aria-pressed', pressedNo ? 'true' : 'false'); }
        else { q.yes.removeAttribute('aria-pressed'); q.no.removeAttribute('aria-pressed'); }
      });
      Object.keys(rs).forEach(function (k) { rs[k].hidden = k !== (res === null ? '_idle' : res); });
      rbox.classList.toggle('has-result', res !== null);
      ctl.classList.toggle('is-off', trail.length === 0);
      /* the map: what is still open, what is ruled out, and the answer */
      var looks = null, small = null;
      trail.forEach(function (t) { if (t.id === 'q1') small = t.ans; if (t.id === 'q2') looks = t.ans; });
      strip.classList.toggle('is-win', small === true); strip.classList.toggle('is-out', small === false);
      Object.keys(cells).forEach(function (k) {
        var c = cells[k], row = d.cells[0].indexOf(k) > -1 ? 0 : 1;
        var out = res !== k && (small === true || res !== null || (looks !== null && (looks ? 1 : 0) !== row));
        c.classList.toggle('is-win', res === k); c.classList.toggle('is-out', out);
      });
    }
    paint();
    place(host, live);
  }

  function init() {
    each(document.querySelectorAll('[data-hub]'), function (host) {
      if (host.getAttribute('data-hub-ready')) return;
      var dataEl = host.querySelector('script.hub-data'), stat = host.querySelector('.hub-static'), data;
      if (!dataEl) return;
      try { data = JSON.parse(dataEl.textContent); } catch (err) { if (global.console) console.error('Hub: bad data in the card', err); return; }
      var kind = host.getAttribute('data-hub');
      try { if (kind === 'jobs') jobs(host, data); else if (kind === 'flow') flow(host, data); else return; }
      catch (err2) { if (global.console) console.error('Hub: could not build the card', err2); var broken = host.querySelector('.hub__live'); if (broken) host.removeChild(broken); return; }
      if (stat) stat.hidden = true;
      host.setAttribute('data-hub-ready', '1');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
