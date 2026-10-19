# Developing alexratman.com

Static HTML served by a Cloudflare Worker (Workers Static Assets); auto-deploys from `master` via Workers Builds.

## Layout

```
wrangler.jsonc              Worker config: name "alexratman", assets from ./pages, 404-page handling, workers.dev off
pages/
  _headers                  response headers: CSP, HSTS, nosniff, frame, referrer, permissions (parsed by Workers, never served)
  robots.txt                allow all + Sitemap line
  sitemap.xml               every page; bump <lastmod> when a page changes
  index.html                landing page
  404.html                  served for unknown paths
  favicon.svg
  assets/
    site.css                design system: tokens, base styles, shared components
    fonts.css               @font-face rules for the self-hosted fonts
    fonts/                  Bricolage Grotesque + Instrument Sans .woff2 subsets (OFL) + licence
    og/                     README.txt (the manifest) + 1200×630 social cards, one per page (PNG — upload via the GitHub web UI)
  learn/
    index.html              list of pieces, with a format filter
    app.js                  the filter (the buttons stay hidden until it runs) and the dashed "More coming soon" cards that keep the grid level
    from-thought-to-answer/
      index.html            the explainer (12 sections)
      page.css              its page-specific styles
      app.js                its widgets — plain JS, no dependencies
      sources/index.html    the 38 references, grouped by step
    self-improving-skills/
      index.html            the page (8 stages)
      page.css              its page-specific styles
      app.js                its widgets + the live "where it stands" numbers
    price-of-a-conversation/
      index.html            the page (6 steps): token prices, one message taken apart, the re-read, a comparison, eight habits
      page.css              its page-specific styles
      app.js                its four widgets — prices and sizes are constants at the top of the file
  blog/
    index.html              list of posts
    five-mistakes-learning-ai/
      index.html            the post: a reading page with no script, Sources at the end
      page.css              its page-specific styles
```

Every page links `/assets/fonts.css` and `/assets/site.css`, then adds page-specific rules in a `<style>` block or a `page.css` beside the page.

The site has two sections, **Learn** (`/learn/`, interactive pieces) and **Blog** (`/blog/`, reading pages). Every page carries the same nav: Learn, Blog, GitHub.

Nothing is fetched from a third-party host at runtime, with one deliberate exception: `/learn/self-improving-skills/` makes a read-only, unauthenticated request to GitHub's public REST API (`api.github.com/repos/alexratmanpl/business-agent-skills/pulls`, paged newest-first, and `/releases`) to refresh its "where it stands" numbers. Only the loop's own pull requests are counted (number ≥ 13 on a `claude/YYYY-MM-DD-…` branch). No token is sent, every returned value is inserted with `textContent`, the request aborts after 7 s, and on any failure the page shows its dated snapshot instead. It does mean each visitor's browser makes one request to GitHub. Rate limit for unauthenticated calls is 60/hour per visitor IP, which is plenty for a page.

## Headers

`pages/_headers` sets a strict Content-Security-Policy (`script-src 'self'`, `connect-src 'self' https://api.github.com`, `frame-ancestors 'none'`), HSTS, `nosniff`, `X-Frame-Options: DENY`, a referrer policy and a permissions policy. `style-src` allows `'unsafe-inline'` because pages carry `<style>` blocks and `style=""` attributes. If a page ever needs an inline `<script>` or a new external host, the CSP has to change first — the browser will silently block it otherwise.

## Design system (v1)

Black, white, greys, and one red. See `assets/site.css` for the tokens.

- Red `#D7202E` **signals** — step labels, the reading-progress bar, hero rules, selected states, link hover. It never fills a button.
- Ink `#131416` **acts** — buttons, links (underlined), controls. Hover/pressed: `#3C3F44`. On dark surfaces the button is inverted (white).
- Red as text on dark surfaces uses `#F5474F` for contrast.
- Greys carry structure; no tints or pastels. Cards use hairline borders, not shadows. **`--faint` `#8A8F96` is decorative only — bars, swatches, arrowheads, step segments. It never colours text, including SVG labels: on white it reaches only 3.26:1, under the 4.5:1 that small text needs. Use `--muted` `#5F6368` (6.05:1) for any text.**
- Type: Bricolage Grotesque for headings, Instrument Sans for everything else.
- Radii: 6px controls and chips, 10px cards, pills.
- **One column per section: 740px** (`--measure`). Text, cards, tables and diagrams all fill it — nothing in a section is narrower or wider than the paragraphs, and every section shares the same left edge. A widget that does not fit in 740px gets a narrower layout, not a wider column. The landing page uses its own 1100px measure. `--measure-wide` still exists for older markup but equals `--measure` on purpose.
- Cards for Learn pieces, on the landing and `/learn` pages, open with a `.steps` strip: one 4px segment per step, fixed height, never wraps. Blog cards have no strip: a post has no steps. The footer of every card is pinned to the bottom (`margin-top: auto`) so cards in a row end level.
- **Counting steps: the hero does not count, every section after it does.** So steps = `[data-stage]` sections − 1 = the pill total = the highest "Step N" label = the number on the cards = the number of `.steps` segments. Every section after the hero carries a "Step N · …" label, the closing recap included. The number appears in several places per piece (landing card, `/learn` card, the "Keep reading" row on each of the other pieces, the "Keep reading in Learn" row on every blog post, and the strip beside each) — change them together.
- Every piece ends with **Keep reading** navigation (`.related` + `.related__grid` of `.related-card`s in `site.css`). An Explainer ends with one **"Keep reading"** row: compact cards for the other pieces plus a dashed "The full list" card to `/learn/`. Explainers do not link to blog posts (decided 19 October 2026). The nav and the home page already do, and a back-link row on each Explainer would need updating with every new post. A blog post ends with **"Keep reading in Learn"**, one card for every Explainer, and, once a second post exists, with **"Keep reading on the blog"** above it: the other posts plus a dashed "All posts" card to `/blog/`. Each row on a post is a `role="group"` named by its own label (`aria-labelledby`), so a screen reader says which section the links belong to. A card carries a `.related-card__tie` line only where the two pages really overlap — "Goes deeper on mistakes 3 and 4: …" — and has none otherwise. The grid is three across on desktop, two across for a post's rows (`.related__grid--2`), four across with `.related__grid--4`, and one column under 720px. These rows replace cross-page CTA buttons: when a piece is added, update the rows on every page it goes with. They are the last *navigation* block; a sources list or a closing caption may follow them, because those are the piece's own footnotes.
- Every piece, and every card for it on `/learn/` and `/blog/`, carries a **tag row** (`.tags` + `.tag` in `site.css`): the AI disclosure first, then the format, then the topic — `Made with AI · Explainer · AI`. Only the disclosure takes the red dot (`.tag--made`), because red signals and that is the thing to notice. They are labels, not controls, so the 44px rule does not apply to them. The cards on the landing page are shorter and carry no tag row.
  - **Three axes, one chip each.** Disclosure: `Made with AI`, on everything, never a filter — it is a statement, not a category. A piece may say what the AI did: the first blog post's chip reads `Researched with AI`, because the words are the author's. The slug stays `made-with-ai`, so the tag vocabulary does not change. Format: `Explainer` for how something works, `Case study` for a real system and what happened when it ran, `Article` for a reading page on the blog (`Note` is still reserved for the blog). Topic: `AI` today, more as the subjects widen. One format tag and at least one topic tag per piece — add a new topic rather than stretching an existing one.
  - **The slug is the contract, the wording is not.** Each chip carries `data-tag="<slug>"`; each card link and each piece's `<main>` carries `data-tags="<slug> <slug> <slug>"`. Anything that filters or searches reads the slugs, so a label can be reworded without breaking it.
  - A topic that every piece carries cannot filter anything. Do not offer such a tag as a filter control until at least one piece does not have it.

## Adding a piece

1. Create `pages/learn/<slug>/index.html` from an existing one: keep the `<head>` links (including the `og:image` block — make a 1200×630 card for `assets/og/` and list it in that folder's `README.txt`), the nav, the progress bar + stage pill, and the footer.
2. Mark each section with `data-stage="N"` and `data-stage-name="…"` (the hero is stage 1; the pill shows `N−1 / total−1` so it matches the "Step N" labels); add `class="reveal"` to the section's inner wrapper for the scroll-in effect.
3. Add the tag row to the hero, under the lead, and put the slugs on `<main data-tags="…">`. Use the vocabulary above: one disclosure, one format, at least one topic.
4. Put widget logic in `app.js` and page styles in `page.css` next to it.
5. Add a card for it on `pages/learn/index.html` (with a `.steps` strip of one segment per step and the same tag row) and on `pages/index.html` (the strip, no tag row), update the "N so far" count on the landing page and on the dashed "The full list" card in every blog post's Learn row, and add a `<url>` to `sitemap.xml`. **Bump `<lastmod>` for every page you changed, in the same commit** — not as a follow-up.
6. Add it to the "Keep reading" row of every other piece and to the "Keep reading in Learn" row of every blog post, and give the new piece its own "Keep reading" row.
7. Numbers and prices on a page carry a date and a source; anything measured rather than looked up is labelled an estimate.

## Adding a blog post

1. Create `pages/blog/<slug>/index.html` and `page.css` from the existing post. Keep the `<head>` links (make a 1200×630 card named `<slug>.png` for `assets/og/` and list it in that folder's `README.txt`), the skip link and the footer.
2. Mark the nav's Blog link `class="is-active"`. Put `data-tags="… article …"` on `<main>` and the matching tag row under the heading. A post is a reading page: no script, no stage pill, one column.
3. Every source gets a Sources entry, with the date it was read. Wording is never stronger than the source.
4. Add a card on `pages/blog/index.html` and in the Blog section of `pages/index.html`, and update the "N so far" line in that section.
5. Add it to the "Keep reading on the blog" row of every other post — create that row on a post the first time a second post exists. Give the new post its own two rows: "Keep reading on the blog" for the other posts (leave it out while there are none) and "Keep reading in Learn" for the Explainers, with a `.related-card__tie` line only where the two pages really overlap. The Explainers do not link to posts (decided 19 October 2026).
6. Add a `<url>` to `sitemap.xml` and **bump `<lastmod>` for every page you changed, in the same commit.**

Some facts are written on more than one page, and nothing updates them for you. Change them together:

- A post's reading time and number of sources: in its hero label and its "Sources (N)" heading, on its card on `/blog/` and on the landing page.
- The "N so far" lines: the landing page's Blog section and every "All posts" card, and the landing page's Learn section and every "The full list" card.
- Each Explainer's step count and strip, on the post's "Keep reading in Learn" row.
- Section numbers. If a post numbers its sections, the numbers appear in the headings, in the `id` of each heading, in the Sources group labels and in any "Goes deeper on …" line on a card. Reordering the sections means changing all of them.

## Conventions

- UK English throughout (summarise, neighbour, flavour, maths). Dates as `11 September 2026`. Quoted product strings keep their own spelling.
- Icons are inline SVG (stroke, 24px grid) — no emoji.
- Buttons are real `<button>` elements; every control is at least 44px tall. Text inputs carry a `maxlength`.
- The nav marks the current section with `class="is-active"`; `aria-current="page"` only on the page the link actually points to.
- The nav is the brand and three links (Learn, Blog, GitHub). They fit on one line at 320px with little room to spare (about 16px between the brand and the links), so check the nav at that width before adding a link or lengthening a label.
- Reduced-motion preferences are respected (`prefers-reduced-motion`): no auto-advancing loops, no endless replays, no scroll-in animation. Anything that still moves by itself for more than five seconds also carries a pause control.
- Every page opens with a "Skip to content" link (`.skip-link` in `site.css`) pointing at `<main id="main">`.
- A control that stays selected says so: `aria-pressed` on the button, kept in step with the class that colours it. The result of using a control sits in an `aria-live="polite"` region, so it is announced.
- An icon that carries meaning gets a name or a hidden text label beside it (`.visually-hidden`); an icon repeating text next to it gets `aria-hidden="true"`. Nothing is distinguished by colour alone.
- Controls in the site chrome — nav links, the brand, footer links, disclosure summaries, widget buttons — are at least 44px tall. Links inside a sentence are exempt: WCAG 2.5.8 allows them, and padding them would break the line.
- A drawing that cannot shrink without its labels dropping under 8px keeps its natural width inside an `overflow-x: auto` box with `tabindex="0"` and a label, rather than scaling down. The meaning map on From Thought to Answer works this way below 720px.
- Hide SVG groups with a class, not the `hidden` attribute (browsers ignore it on SVG elements).
- Anything inserted from outside the page (an API response, a URL parameter) goes in as text, never as HTML.
- Nothing about private repositories or private working setups appears on the site — no names, no file layouts, no mechanisms. Describe, don't show.
