# Performance

Lighthouse mobile: **99 / 100 / 100 / 100**. Three build-time measures carry it,
none of which change a rendered pixel.

- [Photo overrides](#photo-overrides)
- [Why AVIF and not WebP](#why-avif-and-not-webp)
- [Regenerating the photographs](#regenerating-the-photographs)
- [Heading outline](#heading-outline)
- [Minified CSS, slimmed JS](#minified-css-slimmed-js)
- [Known and accepted](#known-and-accepted)
- [Measuring it yourself](#measuring-it-yourself)

## Photo overrides

The design tool exports the photographs at editing quality — 665 KB for a
picture displayed at 370 px — which was the entire mobile LCP budget (4.1 s).
`tools/img-overrides/` holds the same pictures recompressed, and the build ships
an override whenever one exists, failing if its dimensions ever drift from the
export's.

Two formats per photograph, doing two different jobs:

| File | What it is | Who gets it |
|---|---|---|
| `<id>.avif` | AVIF q58 | Every browser that supports AVIF — Chrome/Edge 85+, Firefox 93+, Safari 16.4+, roughly 95% of visitors |
| `<id>.jpg` | mozjpeg q80, progressive | The `<picture>` fallback for the rest, and the file `og:image` points at, because social scrapers still expect JPEG |

The build emits:

```html
<picture style="display:contents">
  <source type="image/avif" srcset="assets/img/hero-portrait.avif">
  <img src="assets/img/hero-portrait.jpg" alt="…" width="1024" height="684" fetchpriority="high" …>
</picture>
```

`display:contents` keeps `<picture>` from contributing a box; the `<img>` is
absolutely positioned against its container either way, so nothing moves. A
browser that understands AVIF downloads only the `.avif` — the JPEG is never
requested.

What it buys, measured against the original export with SSIM rather than judged
by eye:

| | JPEG (fallback) | AVIF (shipped) | Saved |
|---|---|---|---|
| `hero-portrait` 1024×684 — the LCP image | 33.5 KB, SSIM 0.9880 | **13.8 KB**, SSIM 0.9881 | −59% |
| `about-photo` 856×856 | 41.0 KB, SSIM 0.9630 | **26.5 KB**, SSIM 0.9642 | −35% |

AVIF is a shade *above* the JPEG on both images while costing 34 KB less, about
20 KB of that on the LCP path.

## Why AVIF and not WebP

WebP is the obvious first thought and it is the wrong one here. It beats
libjpeg comfortably, but these JPEGs are mozjpeg q80, and against that WebP has
to spend roughly the same bytes to reach the same quality:

| | size | vs the JPEG | SSIM |
|---|---|---|---|
| `hero-portrait` webp q78 | 16.5 KB | −51% | 0.9830 — *below* the JPEG |
| `hero-portrait` webp q90 | 32.1 KB | −4% | 0.9884 |
| `about-photo` webp q78 | 28.3 KB | −31% | 0.9564 — *below* the JPEG |
| `about-photo` webp q86 | 49.7 KB | **+21%** | 0.9682 |

To actually beat the current quality on the square photo, WebP has to get
*bigger* than the JPEG it replaces. It buys smaller-or-better, not both. AVIF
buys both, so the fallback tier stays JPEG and there is no WebP in the pipeline
at all.

## Regenerating the photographs

`tools/make-overrides.mjs` reads the originals straight out of the bundle
manifest in `src-bundles/index.html` — never out of an existing override, which
would compound compression artefacts — and writes both formats at the export's
exact dimensions:

```sh
npm i --no-save sharp          # dev-time only; never committed
node tools/make-overrides.mjs  # writes what's missing
node tools/make-overrides.mjs --force   # rewrites everything
```

`sharp` is the one dependency in the project and it is deliberately transient:
there is no `package.json`, `node_modules/` is git-ignored, and the build itself
still runs on bare Node. The script matches photographs to slot ids **by their
pixel dimensions**, so a fresh export — which renumbers every asset uuid — still
lands the right file, and a silently rescaled photograph fails there rather than
three steps later.

Quality was chosen by measuring, not by eye. Raising it is safe; lowering it
should be re-measured. Re-running the script against the current export
reproduces the committed JPEGs byte for byte, which is the cheapest way to
confirm the settings recorded in it are the settings that produced what ships.

## Heading outline

The four story cards opened the outline `h1 → h3`, the one accessibility audit
the page failed. The build promotes them to `<h2>`; their inline styles carry
every visual property, so nothing moves.

## Minified CSS, slimmed JS

`site.css` passes through a quote-aware whitespace/comment minifier — no
property rewriting, so rules stay recognisable next to their source in
`build.mjs`. `site.js` loses comments and indentation but keeps its exact
tokens, so stack traces still make sense.

## Known and accepted

GitHub Pages caches with `max-age=600`, which PageSpeed flags as a short cache
lifetime. That header is not configurable on Pages, and a 10-minute TTL is also
what lets a push go live quickly.

## Measuring it yourself

The PageSpeed Insights API is not reachable from every environment. Run
Lighthouse locally against a local server of the repo instead:

```sh
npm i -g lighthouse
npx --yes http-server . -p 8080 -s &
lighthouse http://127.0.0.1:8080/index.html \
  --preset=desktop --chrome-flags="--headless" --view
```

Drop `--preset=desktop` for the mobile run the numbers above refer to. Note that
a local run will not reproduce the Pages cache-header finding.
