# Prashand Banwarie — Personal Website

Portfolio site of **Prashand Arthur Banwarie** — Power BI Developer & Data Professional, The Hague (NL). English and Dutch, static, no runtime dependencies.

## Live site

**https://pbanwarie-sketch.github.io/super-duper-lamp/**

| | |
|---|---|
| English | [`/`](https://pbanwarie-sketch.github.io/super-duper-lamp/) |
| Nederlands | [`/nl.html`](https://pbanwarie-sketch.github.io/super-duper-lamp/nl.html) |

## Enable GitHub Pages

1. Repository → **Settings** → **Pages**
2. **Build and deployment** → Source: *Deploy from a branch*
3. Branch **main**, folder **/ (root)** → **Save**

## Structure

| Path | Purpose |
|---|---|
| `index.html`, `nl.html` | The two pages. **Generated — do not edit by hand.** |
| `404.html` | Not-found page, served by Pages for any missing path |
| `assets/site.css` | Fonts, design CSS, hover rules, responsive + reduced-motion layer |
| `assets/site.js` | Rotating headline and reveal-on-scroll (progressive enhancement) |
| `assets/fonts/`, `assets/img/` | Self-hosted JetBrains Mono + Space Grotesk subsets, photos |
| `robots.txt`, `sitemap.xml`, `.nojekyll` | Crawler and Pages plumbing |
| `src-bundles/` | The design-tool exports the pages are built from |
| `tools/build.mjs` | Build script |
| `Profile.pdf` | CV |

## Building

The design tool exports each page as a single ~1.6 MB HTML file that carries
every font and photo as base64 and only paints after React plus a 70 KB runtime
unpack it in the browser. `tools/build.mjs` does that unpacking once, at build
time, and writes plain HTML with real asset files:

```sh
node tools/build.mjs      # Node 18+, no dependencies
```

To publish a new design revision, replace the files in `src-bundles/` with the
fresh export and re-run the build.

What the build does, beyond unpacking:

- resolves the design tool's own markup — `<x-dc>`, `<helmet>`, `<sc-if>`,
  `<image-slot>`, `style-hover` attributes and `{{ }}` bindings — into ordinary
  HTML and CSS, so no JavaScript is needed to see the page
- replaces React, ReactDOM and the design runtime (~276 KB) with a 2.8 KB
  vanilla script
- shares one copy of every font and photo between the two pages
- adds the metadata a published page needs: `lang`, description, canonical,
  `hreflang` pairing, Open Graph and Twitter cards, JSON-LD, favicon
- adds `<header>`/`<main>` landmarks, a skip link, `alt` text, intrinsic image
  dimensions, and `rel="noopener noreferrer"` on external links
- adds the responsive and `prefers-reduced-motion` layers the export ships
  without

The build fails rather than emitting a broken page if any of its markup
transforms stops matching — see the assertions near the end of `buildPage`.

### Changing the URL

`SITE` at the top of `tools/build.mjs` is the one place the public URL is
written. Change it there and rebuild; canonical tags, `hreflang`, Open Graph,
the sitemap, `robots.txt` and the 404 page's links all follow.
