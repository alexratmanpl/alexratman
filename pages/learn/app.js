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
})();
