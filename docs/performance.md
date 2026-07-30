# Performance

Lighthouse mobile: **99 / 100 / 100 / 100**. Three build-time measures carry it,
none of which change a rendered pixel.

- [Photo overrides](#photo-overrides)
- [Heading outline](#heading-outline)
- [Minified CSS, slimmed JS](#minified-css-slimmed-js)
- [Known and accepted](#known-and-accepted)
- [Measuring it yourself](#measuring-it-yourself)

## Photo overrides

The design tool exports the photographs at editing quality — 680 KB for a
picture displayed at 370 px — which was the entire mobile LCP budget (4.1 s).
`tools/img-overrides/` holds the same pictures recompressed with mozjpeg
(quality 80, progressive, identical pixels and dimensions; ~90% smaller), and
the build ships an override whenever one exists, failing if its dimensions ever
drift from the export's.

To regenerate after a new export:

```sh
npx sharp-cli --input assets/img/<name>.jpg --output tools/img-overrides/ \
  --format jpeg --quality 80 --progressive
```

Or any mozjpeg-q80 equivalent — then rebuild and compare by eye at 1:1.

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
