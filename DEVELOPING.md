# Developing alexratman.com

Static HTML served by a Cloudflare Worker (Workers Static Assets); auto-deploys from `master` via Workers Builds.

## Layout

```
wrangler.jsonc              Worker config: name "alexratman", assets from ./pages, 404-page handling
pages/
  index.html                landing page
  404.html                  served for unknown paths
  favicon.svg
  assets/
    site.css                design system: tokens, base styles, shared components
    fonts.css               @font-face rules for the self-hosted fonts
    fonts/                  Bricolage Grotesque + Instrument Sans .woff2 subsets (OFL) + licence
  learn/
    index.html              list of pieces
    from-thought-to-answer/
      index.html            the explainer (12 sections)
      page.css              its page-specific styles
      app.js                its widgets — plain JS, no dependencies
      sources/index.html    the 38 references, grouped by step
    self-improving-skills/
      index.html            the page (8 stages)
      page.css              its page-specific styles
      app.js                its widgets + the live "where it stands" numbers
```

Every page links `/assets/fonts.css` and `/assets/site.css`, then adds page-specific rules in a `<style>` block or a `page.css` beside the page.

Nothing is fetched from a third-party host at runtime, with one deliberate exception: `/learn/self-improving-skills/` makes a read-only, unauthenticated request to GitHub's public REST API (`api.github.com/repos/alexratmanpl/business-agent-skills/pulls` and `/releases`) to refresh its "where it stands" numbers. No token is sent, every returned value is inserted with `textContent`, the request aborts after 7 s, and on any failure the page shows its dated snapshot instead. Rate limit for unauthenticated calls is 60/hour per visitor IP, which is plenty for a page.

## Design system (v1)

Black, white, greys, and one red. See `assets/site.css` for the tokens.

- Red `#D7202E` **signals** — step labels, the reading-progress bar, hero rules, selected states, link hover. It never fills a button.
- Ink `#131416` **acts** — buttons, links (underlined), controls. Hover/pressed: `#3C3F44`. On dark surfaces the button is inverted (white).
- Red as text on dark surfaces uses `#F5474F` for contrast.
- Greys carry structure; no tints or pastels. Cards use hairline borders, not shadows.
- Type: Bricolage Grotesque for headings, Instrument Sans for everything else.
- Radii: 6px controls and chips, 10px cards, pills.
- **One column per section: 740px** (`--measure`). Text, cards, tables and diagrams all fill it — nothing in a section is narrower or wider than the paragraphs, and every section shares the same left edge. A widget that does not fit in 740px gets a narrower layout, not a wider column. The landing page uses its own 1100px measure. `--measure-wide` still exists for older markup but equals `--measure` on purpose.
- Cards on the landing and `/learn` pages open with a `.steps` strip: one 4px segment per step, fixed height, never wraps.

## Adding a piece

1. Create `pages/learn/<slug>/index.html` from an existing one: keep the `<head>` links, the nav, the progress bar + stage pill, and the footer.
2. Mark each section with `data-stage="N"` and `data-stage-name="…"`; add `class="reveal"` to the section's inner wrapper for the scroll-in effect.
3. Put widget logic in `app.js` and page styles in `page.css` next to it.
4. Add a card for it on `pages/learn/index.html` and `pages/index.html` (with a `.steps` strip of one segment per step).

## Conventions

- Icons are inline SVG (stroke, 24px grid) — no emoji.
- Buttons are real `<button>` elements; every control is at least 44px tall.
- Reduced-motion preferences are respected (`prefers-reduced-motion`).
- Hide SVG groups with a class, not the `hidden` attribute (browsers ignore it on SVG elements).
- Anything inserted from outside the page (an API response, a URL parameter) goes in as text, never as HTML.
- Nothing about private repositories appears on the site — no names, no file layouts. Describe, don't show.
