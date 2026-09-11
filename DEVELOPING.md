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
    index.html              list of explainers
    from-thought-to-answer/
      index.html            the explainer (12 sections)
      page.css              its page-specific styles
      app.js                its widgets — plain JS, no dependencies
      sources/index.html    the 38 references, grouped by step
```

Every page links `/assets/fonts.css` and `/assets/site.css`, then adds page-specific rules in a `<style>` block or a `page.css` beside the page.
Nothing is fetched from a third-party host at runtime.

## Design system (v1)

Black, white, greys, and one red. See `assets/site.css` for the tokens.

- Red `#D7202E` **signals** — step labels, the reading-progress bar, hero rules, selected states, link hover. It never fills a button.
- Ink `#131416` **acts** — buttons, links (underlined), controls. Hover/pressed: `#3C3F44`. On dark surfaces the button is inverted (white).
- Red as text on dark surfaces uses `#F5474F` for contrast.
- Greys carry structure; no tints or pastels. Cards use hairline borders, not shadows.
- Type: Bricolage Grotesque for headings, Instrument Sans for everything else.
- Radii: 6px controls and chips, 10px cards, pills. Reading measure 680px, card grids 900px, landing 1100px.

## Adding an explainer

1. Create `pages/learn/<slug>/index.html` from the existing one: keep the `<head>` links, the nav, the progress bar + stage pill, and the footer.
2. Mark each section with `data-stage="N"` and `data-stage-name="…"`; add `class="reveal"` to the section's inner wrapper for the scroll-in effect.
3. Put widget logic in `app.js` and page styles in `page.css` next to it.
4. Add a card for it on `pages/learn/index.html` and `pages/index.html`.

## Conventions

- Icons are inline SVG (stroke, 24px grid) — no emoji.
- Buttons are real `<button>` elements; every control is at least 44px tall.
- Reduced-motion preferences are respected (`prefers-reduced-motion`).
- Hide SVG groups with a class, not the `hidden` attribute (browsers ignore it on SVG elements).
