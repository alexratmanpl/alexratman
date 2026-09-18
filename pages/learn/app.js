/* /learn/ — filter the list by format tag. Plain JS, no dependencies, no network.
   Only the format axis is offered as a control: the disclosure tag is a statement rather
   than a category, and a topic every piece carries cannot narrow anything down. The bar
   ships hidden and is revealed here, so a browser without JS never sees a dead control. */
(function () {
  'use strict';
  var bar = document.getElementById('filters');
  var grid = document.getElementById('learn-grid');
  var status = document.getElementById('filter-status');
  if (!bar || !grid || !status) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-tags]'));
  var btns = Array.prototype.slice.call(bar.querySelectorAll('[data-filter]'));
  var current = 'all';

  /* Fill the rest of the row with placeholders so a filtered grid keeps the
     shape of a full one — one card must not stretch across the whole section. */
  function columns() {
    var t = getComputedStyle(grid).gridTemplateColumns;
    return t && t !== 'none' ? t.split(' ').filter(Boolean).length : 1;
  }
  function filler() {
    var d = document.createElement('div');
    d.className = 'card card--placeholder learn-card learn-card--soon is-filler';
    d.setAttribute('aria-hidden', 'true');
    var t = document.createElement('div'); t.className = 'learn-card--soon__t'; t.textContent = 'More coming soon';
    var s = document.createElement('div'); s.className = 'learn-card--soon__d'; s.textContent = 'The next one is being written.';
    d.appendChild(t); d.appendChild(s);
    return d;
  }
  function topUp(shown) {
    Array.prototype.slice.call(grid.querySelectorAll('.is-filler')).forEach(function (n) { n.remove(); });
    var cols = columns();
    if (shown === 0 || cols < 2) return;          // one column: no dead cards on a phone
    var gap = shown % cols === 0 ? 0 : cols - (shown % cols);
    for (var i = 0; i < gap; i++) grid.appendChild(filler());
  }
  var known = {};
  btns.forEach(function (b) { known[b.getAttribute('data-filter')] = true; });

  function count(tag) {
    return cards.filter(function (c) {
      return tag === 'all' || (c.getAttribute('data-tags') || '').split(/\s+/).indexOf(tag) !== -1;
    }).length;
  }
  function pieces(n) { return n === 1 ? '1 piece' : n + ' pieces'; }

  function apply(tag, remember) {
    if (!known[tag]) tag = 'all';                     // never trust the URL
    var shown = 0, name = '';
    cards.forEach(function (c) {
      var on = tag === 'all' || (c.getAttribute('data-tags') || '').split(/\s+/).indexOf(tag) !== -1;
      c.hidden = !on;
      if (on) shown++;
    });
    btns.forEach(function (b) {
      var sel = b.getAttribute('data-filter') === tag;
      b.classList.toggle('is-selected', sel);
      b.setAttribute('aria-pressed', sel ? 'true' : 'false');
      if (sel) name = b.getAttribute('data-name') || '';
    });
    current = tag;
    topUp(shown);
    status.textContent = tag === 'all'
      ? 'Showing all ' + pieces(shown) + '.'
      : 'Showing ' + pieces(shown) + ' tagged ' + name + '.';
    if (remember && window.history && history.replaceState) {
      try {
        history.replaceState(null, '', tag === 'all' ? location.pathname : location.pathname + '?tag=' + encodeURIComponent(tag));
      } catch (e) { /* sandboxed frame — filtering still works, the URL just does not follow */ }
    }
  }

  btns.forEach(function (b) {
    var n = b.querySelector('.filter__n');
    if (n) n.textContent = count(b.getAttribute('data-filter'));
    b.addEventListener('click', function () { apply(b.getAttribute('data-filter'), true); });
  });

  bar.hidden = false;
  var q = '';
  try { q = (new URLSearchParams(location.search).get('tag') || '').toLowerCase(); } catch (e) { q = ''; }
  apply(q || 'all', false);

  // the column count changes with the viewport, so the top-up has to follow it
  var rz = null;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () { apply(current, false); }, 120);
  });
})();
