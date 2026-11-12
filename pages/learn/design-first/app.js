/* Draw It Before You Build It — the parts only this page has: the rough bakery boards, and the pick-comment-redraw-freeze demo.
   The progress bar and the stage pill come from /assets/play.js. Plain JS, no dependencies, no network. */
;(function () {
  'use strict';
  var Play = window.Play;
  if (!Play) return;
  var copyText = Play.copyText;

  /* Rough-board demos for a fictional bakery. One renderer (draw) serves both demos.
     Directions are data; the renderer reads them. No storage, no network. */

  /* ---------- 1. Content. Anything that would be a fact is a [placeholder]. ---------- */

  var SHOP = 'Crumb & Co.';
  var LOAF = {
    name: 'Rye & caraway',
    long: 'A dark rye with whole caraway seeds, baked once a week in small batches. [Two or three more lines from the baker: how it tastes, how to keep it, what to eat it with.]',
    short: 'Dark rye with caraway seeds.',
    inside: 'Rye flour, caraway, [full ingredient list]',
    allergens: '[allergens: to be confirmed]',
    tags: ['Rye', 'Caraway', 'Baked weekly', '[weight]'],
    next: 'Potato & rosemary'
  };
  var OTHERS = [
    { name: 'Seeded spelt', tags: ['Spelt', 'Seeds'] },
    { name: 'Plain sourdough', tags: ['Wheat'] },
    { name: 'Cardamom bun', tags: ['Sweet'] }
  ];
  var STEPS = ['Pick a loaf', 'Order for pickup', 'Collect at the counter'];
  // LATER items: [what the reader sees, what has to exist first]
  var LATER = {
    slot: ['Pick a pickup slot', 'a new pickup-time field'],
    filter: ['Allergen filter', 'allergen data for every item'],
    notify: ['Email me when it is back', 'a mailing feature'],
    usual: ['Save my usual order', 'customer accounts'],
    reserve: ["Reserve next week's loaf", 'pre-orders']
  };

  /* ---------- 2. Directions as data ----------
     hero: overlay | row | panel     list: cards | rows | numbered
     control: button | field | link  nav: tabs | icons | links
     bottom: what sits at the foot of the phone screen
     pages: blocks top to bottom; '|' starts the sidebar (a sidebar only shows on desktop) */

  var DIRS = {
    A: {
      name: 'Photo first',
      hero: 'overlay', list: 'cards', control: 'button', nav: 'tabs', bottom: 'tabs', thumbNext: true,
      type: { h1: 32, h2: 20, body: 16, small: 13 }, radius: 16, space: 20,
      pages: {
        home: ['hero', 'order', 'later:slot', 'others', 'later:usual', 'howto', 'visit'],
        loaf: ['hero', 'about', 'tags', 'order', 'later:slot', 'next', 'later:notify']
      },
      notes: {
        home: "The photo does the selling: this week's loaf is named right on top of it. On a phone the menu is a tab bar at the bottom, where a thumb can reach it.",
        loaf: 'The loaf photo fills the top of the screen and the name is written over it. One big rounded button orders it, and the LATER items show what this layout would need next.'
      }
    },
    B: {
      name: 'Order first',
      hero: 'row', list: 'rows', control: 'field', nav: 'icons', bottom: 'bar',
      type: { h1: 22, h2: 15, body: 14, small: 12 }, radius: 0, space: 12,
      pages: {
        home: ['later:filter', 'hero', 'others', '|', 'howto', 'visit'],
        loaf: ['hero', 'tags', 'about', 'next', '|', 'later:usual']
      },
      notes: {
        home: 'Every loaf is a short row with tags and a price, so a regular can order in a few taps. The order bar stays on screen while you scroll, and on a desktop it moves into a sidebar.',
        loaf: 'Price, weight and tags sit right next to the name, packed tight. The order bar never leaves the screen, so ordering is always one tap away.'
      }
    },
    C: {
      name: 'Story first',
      hero: 'panel', list: 'numbered', control: 'link', nav: 'links', numbered: true, panel: 'story panel',
      type: { h1: 48, h2: 26, body: 18, small: 14 }, radius: 2, space: 40,
      pages: {
        home: ['hero', 'order', 'others', 'howto', 'visit', 'next', 'later:reserve', 'later:notify'],
        loaf: ['hero', 'about', 'tags', 'order', 'later:notify', 'next', 'later:reserve']
      },
      notes: {
        home: 'There is no photo at all: a plain coloured panel with very large letters carries the page. Sections are numbered, every action is a text link, and there is a lot of white space.',
        loaf: 'The loaf name is the headline, set in big letters on a plain panel. Reading comes first, and ordering is a text link further down.'
      }
    }
  };

  /* ---------- 3. Small DOM helpers (textContent only, never innerHTML) ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  function joinAnd(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function keyLabel(parent, k) { return add(parent, el('span', 'cc-key', k), document.createTextNode(' ' + DIRS[k].name)); }
  function setPressed(b, on) {
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!b.classList.contains('cc-switch')) b.classList.toggle('is-on', on);
  }

  /* ---------- 4. The renderer ---------- */

  // c = { d: direction, page, opts, desktop, out: { outline, comps, later } }
  function say(c, text) {
    c.out.outline.push((c.inSide ? 'in the sidebar, ' : '') + text);
    c.inSide = false;
  }
  function uses(c, name) { if (c.out.comps.indexOf(name) < 0) c.out.comps.push(name); }
  function icon(name) { return el('span', 'cc-i cc-i--' + name); }

  function photo(c, label) {
    uses(c, 'photo block (grey box with a cross)');
    return add(el('div', 'cc-ph'), el('span', null, label || '[photo]'));
  }
  function tag(c, text, later) {
    uses(c, 'tag');
    return el('span', 'cc-tag' + (later ? ' cc-tag--later' : ''), text);
  }
  // an action is drawn, never a real control: a button shape, a select-like field, or a text link
  function act(c, text, main) {
    var kind = c.d.control === 'link' ? 'link' : (c.d.control === 'field' && !main ? 'field' : 'button');
    uses(c, { link: 'text link', field: 'select field', button: 'button' }[kind]);
    var n = el('span', 'cc-act cc-act--' + kind + (main ? ' cc-act--main' : ''), text);
    if (kind === 'field') add(n, icon('chev'));
    return n;
  }
  function sec(c, title) {
    var n = el('div', 'cc-sec');
    if (c.d.numbered) add(n, el('span', 'cc-sec__n', String(++c.secN).padStart(2, '0')));
    return add(n, el('span', null, title));
  }
  function later(c, key) {
    if (c.opts.hideLater) return null;
    var item = LATER[key];
    c.out.later.push(item[0] + ': needs ' + item[1]);
    say(c, '"' + item[0] + '" (LATER)');
    var n = add(el('div', 'cc-later'), act(c, item[0], false));
    if (c.opts.showTags !== false) add(n, tag(c, 'LATER', true));
    return n;
  }

  var BLOCKS = {
    top: function (c) {
      var d = c.d, links = d.nav === 'links' || c.desktop, parts = ['the shop name'];
      var n = add(el('div', 'cc-top'), el('span', 'cc-logo', SHOP));
      if (links) {
        var nav = add(n, el('span', 'cc-nav')).lastChild;
        ['Loaves', 'Order', 'Visit'].forEach(function (t) { add(nav, el('span', 'cc-nav__a', t)); });
        uses(c, 'text link');
        parts.push('text links');
      }
      if (d.nav === 'icons') { add(n, icon('search')); parts.push('a search icon'); }
      if (d.nav !== 'links') { add(n, icon('bag')); parts.push('a basket icon'); }
      say(c, (d.nav === 'icons' ? 'a compact top bar with ' : 'a top bar with ') + joinAnd(parts));
      return n;
    },
    hero: function (c) {
      var d = c.d, keepPhoto = d.hero !== 'panel' && !c.opts.photoTop;
      var n = el('div', 'cc-hero cc-hero--' + d.hero + (keepPhoto ? '' : ' cc-hero--nophoto'));
      say(c, {
        overlay: keepPhoto ? 'a full-width photo with the loaf name written over it' : 'the loaf name, price and weight',
        row: keepPhoto ? 'a compact row: small photo, loaf name, price and weight' : 'a compact row: loaf name, price and weight',
        panel: 'a plain coloured panel with the loaf name in large letters'
      }[d.hero]);
      if (keepPhoto) add(n, photo(c, d.hero === 'overlay' ? '[photo of the loaf]' : '[photo]'));
      if (d.hero === 'panel') uses(c, 'panel (plain colour, large type)');
      return add(n, add(el('div', 'cc-hero__txt'),
        el('div', 'cc-kicker', c.page === 'loaf' ? 'Loaf of the week' : "This week's loaf"),
        el('div', 'cc-h1', LOAF.name),
        el('div', 'cc-meta', '[price] · [weight]')));
    },
    photo: function (c) {   // only for the "Photo on top" comment
      say(c, 'a photo block above the title');
      return add(el('div', 'cc-toph'), photo(c, '[photo of the loaf]'));
    },
    order: function (c) {
      say(c, c.d.control === 'link' ? 'an "Order for pickup" text link' : 'a big "Order for pickup" button');
      return add(el('div', 'cc-order'), act(c, 'Order for pickup', true));
    },
    others: function (c) {
      var d = c.d, list = el('div', 'cc-list');
      var n = add(el('div', 'cc-others cc-others--' + d.list), sec(c, 'Also baking'), list);
      say(c, {
        cards: 'three cards for other loaves' + (c.desktop ? ', side by side' : ', in a row that scrolls sideways'),
        rows: 'three dense rows for other loaves, each with tags, a price and an add button',
        numbered: 'a numbered section listing three other loaves in large type'
      }[d.list]);
      uses(c, d.list === 'cards' ? 'card' : 'list row');
      OTHERS.forEach(function (o) {
        var item = add(list, el('div', 'cc-item')).lastChild;
        if (d.list !== 'numbered') add(item, photo(c));
        var txt = add(item, el('div', 'cc-item__txt')).lastChild;
        add(txt, el('div', 'cc-item__name', o.name));
        if (d.list === 'rows') {
          var tags = add(txt, el('div', 'cc-tags')).lastChild;
          o.tags.forEach(function (t) { add(tags, tag(c, t)); });
        }
        add(item, el('div', 'cc-item__price', '[price]'));
        if (d.list === 'rows') add(item, icon('plus'));
      });
      if (d.list === 'cards' && !c.desktop) add(n, el('div', 'cc-anno', 'scrolls sideways →'));
      if (d.list === 'numbered') add(n, act(c, 'All loaves', false));
      return n;
    },
    howto: function (c) {
      var steps = el('div', 'cc-steps');
      say(c, 'how to order, in three steps');
      STEPS.forEach(function (s, i) {
        add(steps, add(el('div', 'cc-step'), el('span', 'cc-step__n', String(i + 1)), el('span', null, s)));
      });
      return add(el('div', 'cc-howto'), sec(c, 'How to order'), steps);
    },
    visit: function (c) {
      say(c, 'visit details: [address] and [opening hours]');
      return add(el('div', 'cc-visit'), sec(c, 'Visit'),
        add(el('div', 'cc-line'), icon('pin'), el('span', null, '[address]')),
        add(el('div', 'cc-line'), icon('clock'), el('span', null, '[opening hours]')));
    },
    about: function (c) {
      say(c, (c.opts.short ? 'a one-line description' : 'a description of a few lines') + ', then what is in it, with [allergens: to be confirmed]');
      return add(el('div', 'cc-about'), sec(c, 'About this loaf'),
        el('div', 'cc-desc', c.opts.short ? LOAF.short : LOAF.long),
        el('div', 'cc-sub', 'What is in it'),
        el('div', null, LOAF.inside),
        el('div', 'cc-warn', LOAF.allergens));
    },
    tags: function (c) {
      var n = el('div', 'cc-tags cc-tagrow');
      say(c, 'a row of small tags');
      LOAF.tags.forEach(function (t) { add(n, tag(c, t)); });
      return n;
    },
    next: function (c) {
      var row = el('div', 'cc-next__row');
      say(c, "a teaser for next week's loaf");
      if (c.d.thumbNext) add(row, photo(c));
      add(row, el('div', 'cc-next__name', LOAF.next));
      return add(el('div', 'cc-next'), sec(c, 'Next week'), row);
    },
    bar: function (c) {
      say(c, c.desktop ? 'an order box with the price and an "Order for pickup" button'
                       : 'an "Order for pickup" bar with the price, pinned to the bottom of the screen');
      uses(c, c.desktop ? 'order box' : 'sticky bar');
      var bar = add(el('div', 'cc-bar'), later(c, 'slot'),
        add(el('div', 'cc-bar__row'), el('span', 'cc-bar__price', '[price]'), act(c, 'Order for pickup', true)));
      return c.desktop ? bar : add(el('div', 'cc-pin'), el('div', 'cc-anno', 'stays on screen while scrolling ↓'), bar);
    },
    tabs: function (c) {
      var n = el('div', 'cc-tabs');
      say(c, 'a tab bar at the bottom, in thumb reach');
      uses(c, 'tab bar');
      [['home', 'Home'], ['bun', 'Loaves'], ['bag', 'Order'], ['pin', 'Visit']].forEach(function (t, i) {
        var on = i === (c.page === 'home' ? 0 : 1);
        add(n, add(el('span', 'cc-tab' + (on ? ' cc-on' : '')), icon(t[0]), el('span', null, t[1])));
      });
      return n;
    }
  };

  // text sizes come from the data, so the drawing and the brief share one source
  function tokens(d, opts) {
    var k = opts.big ? 1.25 : 1, t = {};
    Object.keys(d.type).forEach(function (n) { t[n] = Math.round(d.type[n] * k); });
    return t;
  }

  // opts: size ('phone' | 'desktop'), showTags, hideLater, and the comment keys big, photoTop, calm, tagRow, short
  function draw(key, page, opts) {
    var d = DIRS[key], desktop = opts.size === 'desktop';
    var c = { d: d, page: page, opts: opts, desktop: desktop, secN: 0, inSide: false, out: { outline: [], comps: [], later: [] } };
    var canvas = el('div', 'cc-canvas cc-dir-' + key.toLowerCase() + (desktop ? ' cc-desk' : ' cc-phone') + (opts.calm ? ' cc-calm' : ''));
    var t = tokens(d, opts);
    Object.keys(t).forEach(function (n) { canvas.style.setProperty('--cc-' + n, t[n] + 'px'); });
    canvas.style.setProperty('--cc-r', d.radius + 'px');
    canvas.style.setProperty('--cc-gap', d.space + 'px');
    canvas.setAttribute('aria-hidden', 'true');

    var main = el('div', 'cc-main'), side = el('div', 'cc-side'), col = main;
    add(canvas, BLOCKS.top(c));
    d.pages[page].forEach(function (name) {
      if (name === '|') {
        col = side;
        if (desktop) { c.inSide = true; if (d.bottom === 'bar') add(side, BLOCKS.bar(c)); }
        return;
      }
      if (name === 'tags' && opts.tagRow === false) return;
      if (name === 'hero' && opts.photoTop) add(col, BLOCKS.photo(c));
      add(col, name.indexOf('later:') === 0 ? later(c, name.slice(6)) : BLOCKS[name](c));
    });
    var body = add(el('div', 'cc-body'), main);
    if (side.firstChild) { add(body, side); canvas.classList.add('cc-split'); }
    add(canvas, body);
    // On a phone, what sits at the foot of the screen (the tab bar or the order bar) is not part of the long page: the frame docks it.
    var dock = !desktop && d.bottom ? BLOCKS[d.bottom](c) : null;
    return { node: canvas, dock: dock, out: c.out };
  }

  function describe(key, page, opts, out, extra) {
    var first = ['Rough drawing of the ' + (page === 'home' ? 'Home' : 'Loaf of the week') + ' page, direction ' +
      key + ' (' + DIRS[key].name + '), ' + (opts.size === 'desktop' ? 'desktop' : 'phone') + ' size'];
    if (extra) first.push(extra);
    if (opts.hideLater) first.push('LATER items hidden');
    else if (opts.showTags === false) first.push('LATER tags hidden');
    return first.join(', ') + '. From top to bottom: ' + out.outline.join('; ') + '.';
  }

  /* ---------- 5. Scaling: a fixed-width canvas, shrunk to fit, never wider than its box ---------- */

  function fit(frame) {
    // The frame is the screen: an outline, a status strip, the scroller that holds the drawing, an optional dock and a home strip.
    var scroll = frame.querySelector('.cc-scroll'), canvas = (scroll || frame).firstElementChild, box = frame.parentNode;
    if (!canvas || !box) return;
    var edge = frame.offsetWidth - frame.clientWidth;                         // the outline, left and right
    var cap = parseFloat(getComputedStyle(box).getPropertyValue('--cc-maxw'));  // a board can ask for a narrower phone
    var cw = canvas.offsetWidth, avail = Math.min(box.clientWidth, cap > 0 ? cap : Infinity) - edge;
    if (!cw || !(avail > 0)) return;
    var s = Math.min(1, avail / cw), dock = frame.querySelector('.cc-dock'), shell = dock && dock.firstElementChild;
    canvas.style.transform = 'scale(' + s + ')';
    if (shell) {
      shell.style.transform = 'scale(' + s + ')';
      dock.style.height = Math.ceil(shell.offsetHeight * s) + 'px';
    }
    frame.style.width = (Math.floor(cw * s) + edge) + 'px';
    // Every screen has the same height (--cc-vh, set in the page's CSS) and a taller drawing scrolls inside it.
    // --cc-sh is the drawing's height after scaling: the scroller holds a spacer that tall, which is what makes it scrollable.
    frame.style.setProperty('--cc-sh', Math.ceil(canvas.offsetHeight * s) + 'px');
    box.style.setProperty('--cc-fw', frame.style.width);
    if (scroll && !scroll.hasAttribute('data-cc-scroll') && !frame.closest('[aria-hidden="true"]')) {
      scroll.setAttribute('data-cc-scroll', '');
      scroll.tabIndex = 0;                                                    // so the keyboard can scroll it
      scroll.addEventListener('scroll', function () { place(frame); }, { passive: true });
    }
    place(frame);
  }
  function place(frame) {                                   // the thumb: a short bar at the right edge, showing how far the page has scrolled
    var scroll = frame.querySelector('.cc-scroll'), thumb = frame.querySelector('.cc-cue');
    if (!scroll || !thumb) return;
    var max = scroll.scrollHeight - scroll.clientHeight, pad = 8, track = scroll.clientHeight - 2 * pad;
    frame.classList.toggle('is-scrollable', max > 1);       // the caption says "scrolls" only when it does
    if (max <= 1 || track <= 0) { thumb.style.display = 'none'; return; }
    var h = Math.max(32, Math.round(track * scroll.clientHeight / scroll.scrollHeight));
    thumb.style.display = '';
    thumb.style.height = h + 'px';
    thumb.style.transform = 'translateY(' + Math.round(pad + (track - h) * scroll.scrollTop / max) + 'px)';
  }
  function fitAll(root) { each(root.querySelectorAll('.cc-frame'), fit); }
  function watch(root) {
    var queued = false;
    function soon() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; fitAll(root); });
    }
    if ('ResizeObserver' in window) new ResizeObserver(soon).observe(root);
    else window.addEventListener('resize', soon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(soon);
  }
  function frameFor(r, label) {
    // A screen. The outline, the status strip and the home strip are fixed; the page scrolls between them. On a phone the tab bar (A)
    // and the order bar (B) are docked under the page, drawn at the same size, so they stay on screen as the page moves.
    var scroll = add(el('div', 'cc-scroll'), r.node), thumb = el('span', 'cc-cue');
    var screen = add(el('div', 'cc-screen'), scroll, thumb);
    var top = el('span', 'cc-device__bar'), home = el('span', 'cc-device__home'), parts = [top, screen];
    scroll.setAttribute('role', 'img');
    scroll.setAttribute('aria-label', label);
    [thumb, top, home].forEach(function (n) { n.setAttribute('aria-hidden', 'true'); });
    if (r.dock) {
      var shell = el('div', r.node.className);               // the same classes and sizes as the page, so the bar is drawn the same way
      shell.style.cssText = r.node.style.cssText;
      shell.setAttribute('aria-hidden', 'true');
      parts.push(add(el('div', 'cc-dock'), add(shell, r.dock)));
    }
    parts.push(home);
    var frame = el('div', 'cc-frame');
    parts.forEach(function (n) { add(frame, n); });
    return frame;
  }

  /* ---------- 6. Demo 1: three directions ---------- */

  function initBoards(root) {
    var basic = root.getAttribute('data-cc-basic') === 'true';
    var st = { dir: 'A', page: 'home', size: 'phone', tags: !basic, hideLater: basic };
    var stage = root.querySelector('[data-cc-part="stage"]');
    var hint = root.querySelector('[data-cc-part="hint"]');
    var allBtn = root.querySelector('[data-cc-dir="all"]');
    // Side by side from 760px: three phones about 190px wide or more fit across a card from there. Narrower, one board at a time, big enough to read.
    var wide = window.matchMedia('(min-width: 760px)');
    if (!basic && wide.matches) st.dir = 'all';             // the directions step opens on the three boards

    function paint() {
      var three = st.dir === 'all', keys = three ? ['A', 'B', 'C'] : [st.dir];
      var opts = { size: three ? 'phone' : st.size, showTags: st.tags, hideLater: st.hideLater };
      clear(stage);
      stage.classList.toggle('cc-stage--three', three);
      keys.forEach(function (k) {
        var r = draw(k, st.page, opts);
        var frame = frameFor(r, describe(k, st.page, opts, r.out));
        frame.classList.toggle('cc-frame--desk', opts.size === 'desktop');
        add(stage, add(el('figure', 'cc-board'),
          keyLabel(el('figcaption', 'cc-board__cap'), k),
          frame,
          add(el('p', 'cc-note'), el('strong', null, 'What to notice: '), document.createTextNode(DIRS[k].notes[st.page]))));
      });
      each(root.querySelectorAll('button[data-cc-dir]'), function (b) { setPressed(b, b.dataset.ccDir === st.dir); });
      each(root.querySelectorAll('button[data-cc-page]'), function (b) { setPressed(b, b.dataset.ccPage === st.page); });
      each(root.querySelectorAll('button[data-cc-size]'), function (b) { setPressed(b, b.dataset.ccSize === opts.size); b.disabled = three; });
      each(root.querySelectorAll('button[data-cc-opt]'), function (b) { setPressed(b, b.dataset.ccOpt === 'tags' ? st.tags : st.hideLater); });
      hint.textContent = three ? 'Side by side always shows the phone size.' : '';
      hint.hidden = !hint.textContent;
      fitAll(root);
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !root.contains(b)) return;
      var ds = b.dataset;
      if (ds.ccDir) st.dir = ds.ccDir;
      else if (ds.ccPage) st.page = ds.ccPage;
      else if (ds.ccSize) st.size = ds.ccSize;
      else if (ds.ccOpt === 'tags') st.tags = !st.tags;
      else if (ds.ccOpt === 'later') st.hideLater = !st.hideLater;
      else return;
      paint();
    });

    function onWidth() {
      if (!wide.matches && document.activeElement === allBtn) root.querySelector('[data-cc-dir="A"]').focus();
      allBtn.hidden = !wide.matches;
      if (!wide.matches && st.dir === 'all') st.dir = 'A';
      paint();
    }
    if (wide.addEventListener) wide.addEventListener('change', onWidth); else wide.addListener(onWidth);
    root.classList.add('cc-ready');
    watch(root);
    onWidth();
  }

  /* ---------- 7. Demo 2: pick, comment, redraw, freeze ---------- */

  var CHIPS = [['big', 'Bigger type'], ['photoTop', 'Photo on top'], ['calm', 'Calmer colours'], ['tagRow', 'Add a tag row'], ['short', 'Shorter text']];
  var MAX_VERSIONS = 8;

  function selectText(node) {
    var range = document.createRange(), sel = window.getSelection();
    range.selectNodeContents(node);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function initLoop(root) {
    function part(name) { return root.querySelector('[data-cc-part="' + name + '"]'); }
    var ui = {
      pick: part('pick'), pic: part('pic'), count: part('count'), chipNote: part('chipnote'), redraw: part('redraw'),
      versions: part('versions'), cap: part('cap'), log: part('log'), freeze: part('freeze'), freezeNote: part('freezenote'),
      again: part('again'), fold: part('brieffold'), briefText: part('brieftext'),
      copyLabel: part('copylabel'), copyNote: part('copynote'), live: part('live')
    };
    var chips = Array.prototype.slice.call(root.querySelectorAll('[data-cc-chip]'));
    var st, copyTimer;

    function reset() {
      st = { dir: null, versions: [], view: 0, pending: {}, comments: 0, frozen: false, log: [], out: null, canvas: null, dock: null };
    }
    function current() { return st.versions[st.view]; }
    function locked() { return st.versions.length > 1 || st.frozen; }
    function pendingCount() { return CHIPS.filter(function (ch) { return st.pending[ch[0]]; }).length; }
    function announce(msg) {
      ui.live.textContent = '';
      setTimeout(function () { ui.live.textContent = msg; }, 60);
    }

    // step 1: thumbnails drawn by the same renderer, as a radio group
    var radios = ['A', 'B', 'C'].map(function (k) {
      var frame = add(el('span', 'cc-frame cc-frame--thumb'), draw(k, 'loaf', { size: 'phone', tagRow: false }).node);
      frame.setAttribute('data-cc-max', '150');
      var pic = add(el('span', 'cc-thumb__pic'), frame);
      pic.setAttribute('aria-hidden', 'true'); // the radio's name is its label, "A Photo first", not the drawing's text
      var r = add(el('div', 'cc-thumb'), pic, keyLabel(el('span', 'cc-thumb__label'), k));
      r.setAttribute('role', 'radio');
      r.setAttribute('aria-label', 'Direction ' + k + ', ' + DIRS[k].name);
      r.dataset.ccPick = k;
      add(ui.pick, r);
      return r;
    });

    function render() {
      var v = current(), picked = !!st.dir, frozen = st.frozen;
      var capped = st.versions.length >= MAX_VERSIONS, open = picked && !frozen && !capped;

      // progress line
      var now = frozen ? 4 : !picked ? 1 : pendingCount() ? 3 : 2;
      each(root.querySelectorAll('[data-cc-step]'), function (li) {
        var i = Number(li.dataset.ccStep), done = i < now || (frozen && i === 4);
        li.classList.toggle('cc-done', done);
        if (i === now) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        li.querySelector('[data-cc-sr]').textContent = done ? ', done' : '';
      });

      // step 1
      radios.forEach(function (r, i) {
        var on = st.dir === r.dataset.ccPick;
        r.setAttribute('aria-checked', on ? 'true' : 'false');
        r.setAttribute('aria-disabled', locked() ? 'true' : 'false');
        r.tabIndex = on || (!picked && i === 0) ? 0 : -1;
      });

      // step 2: a comment already in the version on screen cannot be picked again
      var allIn = picked && CHIPS.every(function (ch) { return v.set[ch[0]]; });
      chips.forEach(function (b) {
        var applied = !!(v && v.set[b.dataset.ccChip]);
        b.disabled = !open || applied;
        setPressed(b, !!st.pending[b.dataset.ccChip]);
        b.querySelector('.cc-chip__note').hidden = !applied;
      });
      var n = pendingCount();
      ui.redraw.textContent = 'Redraw with my ' + plural(n, 'comment');
      ui.redraw.disabled = !open || n < 1;
      ui.chipNote.textContent = !picked ? 'Pick a direction first.'
        : frozen ? 'This version is frozen. Start again to change it.'
        : capped ? ''
        : allIn ? 'Every comment is already in this version. Freeze it, or press an earlier version and redraw from there.'
        : 'Comments apply to the version on screen, Version ' + v.n + '.';
      ui.chipNote.hidden = !ui.chipNote.textContent;

      // the drawing
      clear(ui.pic);
      clear(ui.count);
      if (!picked) {
        add(ui.pic, el('p', 'cc-empty', 'Version 1 appears here after you pick a direction.'));
        st.out = st.canvas = st.dock = null;
      } else {
        var opts = Object.assign({ size: 'phone', tagRow: false }, v.set);
        var r = draw(st.dir, 'loaf', opts);
        st.out = r.out;
        st.canvas = r.node;
        st.dock = r.dock;
        var frame = frameFor(r, describe(st.dir, 'loaf', opts, r.out, 'version ' + v.n + (frozen ? ', frozen' : '')));
        if (frozen) add(frame, el('span', 'cc-frozen', 'Frozen'));
        add(ui.pic, frame);
        add(ui.count,
          add(el('span', 'pill'), document.createTextNode('Version '), el('span', 'pill__num', String(v.n))),
          el('span', null, plural(st.comments, 'comment') + ', ' + plural(st.versions.length - 1, 'redraw')),
          st.view < st.versions.length - 1 ? el('span', 'cc-count__old', '(an earlier version; the newest is v' + st.versions.length + ')') : null);
      }

      // step 3: version buttons are kept, not rebuilt, so focus never drops
      while (ui.versions.children.length > st.versions.length) ui.versions.removeChild(ui.versions.lastChild);
      while (ui.versions.children.length < st.versions.length) {
        var i = ui.versions.children.length, b = el('button', 'toggle cc-ver', 'v' + (i + 1));
        b.type = 'button';
        b.dataset.ccView = String(i);
        add(ui.versions, b);
      }
      each(ui.versions.children, function (b, i) { setPressed(b, i === st.view); b.disabled = frozen; });
      ui.cap.hidden = !capped;
      clear(ui.log);
      st.log.forEach(function (line) { add(ui.log, el('li', null, line)); });

      // step 4
      ui.freeze.disabled = !picked || frozen;
      ui.again.disabled = !picked;
      ui.freezeNote.textContent = !picked ? 'Pick a direction first.'
        : frozen ? 'Version ' + v.n + ' is frozen. Start again to try another direction.'
        : 'This freezes the version on screen: Version ' + v.n + '.';
      ui.fold.hidden = !frozen;
      if (!frozen) ui.fold.open = false;
      fitAll(root);
    }

    function pick(k) {
      if (locked() || st.dir === k) return;
      st.dir = k;
      st.versions = [{ n: 1, set: {}, from: 0 }];
      st.view = 0;
      st.pending = {};
      st.comments = 0;
      st.log = ['v1: picked direction ' + k + ', ' + DIRS[k].name];
      render();
      announce('Version 1 drawn: direction ' + k + ', ' + DIRS[k].name + '. You can add comments now.');
    }

    function redraw() {
      var base = current(), set = Object.assign({}, base.set), names = [];
      CHIPS.forEach(function (ch) { if (st.pending[ch[0]]) { set[ch[0]] = true; names.push(ch[1]); } });
      if (!names.length) return;
      var v = { n: st.versions.length + 1, set: set, from: base.n };
      st.versions.push(v);
      st.view = st.versions.length - 1;
      st.pending = {};
      st.comments += names.length;
      var tally = plural(st.comments, 'comment') + ', ' + plural(v.n - 1, 'redraw');
      st.log.push('v' + v.n + (base.n !== v.n - 1 ? ' (from v' + base.n + ')' : '') + ': ' + names.join(', ') + ' (' + tally + ')');
      render();
      announce('Version ' + v.n + ' drawn: ' + names.join(', ') + '. ' + tally + ' so far.' +
        (st.versions.length >= MAX_VERSIONS ? ' That is the last version this demo keeps.' : ''));
      // the Redraw button is disabled now (no comments picked), so focus goes to the first chip that can be pressed
      var next = !ui.redraw.disabled ? ui.redraw : chips.filter(function (b) { return !b.disabled; })[0] || ui.freeze;
      next.focus();
    }

    function freeze() {
      st.frozen = true;
      render();
      ui.briefText.textContent = brief();
      ui.copyNote.hidden = true;
      ui.fold.querySelector('summary').focus();           // the brief is folded: focus the button that opens it
      announce('Version ' + current().n + ' frozen. The build brief is below. Open it to read it.');
    }

    function copy() {
      copyText(ui.briefText.textContent, function (ok) {
        if (!ok) selectText(ui.briefText);
        ui.copyLabel.textContent = ok ? 'Copied' : 'Press Ctrl+C or Cmd+C';
        ui.copyNote.hidden = ok;
        announce(ok ? 'Brief copied.' : 'Copying is blocked here. The brief is selected: press Ctrl+C or Cmd+C.');
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () { ui.copyLabel.textContent = 'Copy'; }, 2000);
      });
    }

    function again() {
      reset();
      clearTimeout(copyTimer);
      ui.copyLabel.textContent = 'Copy';
      ui.copyNote.hidden = true;
      render();
      radios[0].focus();
    }

    function brief() {
      var v = current(), d = DIRS[st.dir], t = tokens(d, v.set), calm = !!v.set.calm;
      var css = getComputedStyle(document.documentElement);
      function colour(name) { return css.getPropertyValue(name).trim() || name; }
      var rows = [
        ['text-heading', t.h1 + 'px'], ['text-section', t.h2 + 'px'], ['text-body', t.body + 'px'], ['text-small', t.small + 'px'],
        ['colour-text', colour('--ink') + ' (ink)'],
        ['colour-accent', calm ? colour('--ink') + ' (ink, calmer colours)' : colour('--red') + ' (the one red)'],
        ['colour-fill', calm ? colour('--ground-alt') + ' (light grey)' : colour('--line-strong') + ' (grey)']
      ];
      if (d.panel) rows.push(['colour-panel', (calm ? colour('--ground-alt') + ' (light grey)' : colour('--red') + ' (red)') + ', for the ' + d.panel]);
      rows.push(['spacing', d.space + 'px between blocks'], ['corner-radius', d.radius + 'px']);

      var placeholders = [];
      ((st.canvas.textContent + ' ' + (st.dock ? st.dock.textContent : '')).match(/\[[^\]]+\]/g) || []).forEach(function (p) { if (placeholders.indexOf(p) < 0) placeholders.push(p); });
      var applied = CHIPS.filter(function (ch) { return v.set[ch[0]]; }).map(function (ch) { return ch[1]; });
      function pad(s) { return (s + '                    ').slice(0, 18); }
      function list(items, numbered) { return items.map(function (s, i) { return '   ' + (numbered ? (i + 1) + '. ' : '- ') + capital(s); }); }

      return [].concat(
        ['BUILD BRIEF', SHOP + ', "Loaf of the week" page (a fictional bakery)', ''],
        ['1. Direction and version',
          '   Direction ' + st.dir + ', ' + d.name + '. Version ' + v.n + ' of ' + st.versions.length + ', frozen.',
          '   Comments in this version: ' + (applied.length ? applied.join(', ') : 'none, as first drawn') + '.', ''],
        ['2. Named values, or design tokens (phone, 390px wide)', '   ' + pad('name') + 'value'],
        rows.map(function (r) { return '   ' + pad(r[0]) + r[1]; }), [''],
        ['3. Page structure, top to bottom'], list(st.out.outline, true), [''],
        ['4. Components'], list(st.out.comps), [''],
        ['5. States to design'], list([
          'empty: no loaf this week. Say so plainly and show next week\'s teaser.',
          'very long text: a loaf name or description three times longer than expected wraps and never overlaps.',
          'not found: a link to a loaf that no longer exists. A short message and a way back to Home.']), [''],
        ['6. Accessibility notes'], list([
          'text contrast at least 4.5:1 against its background.',
          'tap targets at least 24 by 24px (the W3C minimum; bigger is easier).',
          'a visible focus outline on every link and button.',
          'do not rely on colour alone: every LATER item has the word LATER written on it.']), [''],
        ['7. Still open'], ['   Placeholders (not facts yet):'], list(placeholders),
        ['   LATER items (need something new first):'], list(st.out.later.length ? st.out.later : ['none']), [''],
        ['8. Decision log'], st.log.map(function (s) { return '   - ' + s; }) // kept as logged: "v2", not "V2"
      ).join('\n');
    }

    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-cc-pick], [data-cc-chip], [data-cc-view], [data-cc-act]');
      if (!t || !root.contains(t) || t.disabled) return;
      if (t.dataset.ccPick) { pick(t.dataset.ccPick); return; }
      if (t.dataset.ccChip) { st.pending[t.dataset.ccChip] = !st.pending[t.dataset.ccChip]; render(); return; }
      if (t.dataset.ccView) { st.view = Number(t.dataset.ccView); st.pending = {}; render(); return; }
      ({ redraw: redraw, freeze: freeze, copy: copy, again: again })[t.dataset.ccAct]();
    });

    // radio group keys: arrows move and select together; Space and Enter select
    ui.pick.addEventListener('keydown', function (e) {
      var i = radios.indexOf(e.target), step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (i < 0) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick(radios[i].dataset.ccPick); return; }
      if (!step) return;
      e.preventDefault();
      if (locked()) return;
      var next = radios[(i + step + radios.length) % radios.length];
      pick(next.dataset.ccPick);
      next.focus();
    });

    reset();
    root.classList.add('cc-ready');
    watch(root);
    render();
  }

  function start() {
    each(document.querySelectorAll('[data-cc="boards"]'), initBoards);
    each(document.querySelectorAll('[data-cc="loop"]'), initLoop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
