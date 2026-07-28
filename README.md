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
| `assets/brand/` | Official LinkedIn and Proton Mail marks — see below |
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

## Navigation

Section links used to drop you in the wrong place, badly on desktop and worse on
a phone. Three separate causes, all fixed:

1. **No `scroll-padding-top`.** A fragment link puts the target's top edge at
   y=0 — exactly where the sticky bar is. 57 px of every section was buried on
   desktop; on mobile the bar wrapped to two rows at 83 px and the `#work` and
   `#experience` headings landed at y=64, completely hidden. `html` now carries
   `scroll-padding-top: calc(var(--nav-h) + 18px)`.
2. **`position: sticky` never worked.** The page wrapper ships
   `overflow-x: hidden` inline, which makes it the scroll container for its
   sticky descendants — and it never scrolls, so the bar scrolled away with the
   page instead of pinning. `.page-wrap` overrides it with `overflow-x: clip`,
   which clips identically without creating a scroll container. Browsers that
   don't know the keyword drop the declaration and keep the old behaviour.
3. **The mobile bar wrapped.** Four section links plus brand plus language would
   not fit one row.

On top of that:

- **Bottom tab bar under 900 px.** The four sections move out of the top bar into
  a fixed bar in the thumb zone; the top bar keeps brand and language in one
  49 px row, down from 83 px. Tab labels are read out of the page's own nav, so
  the Dutch build gets Dutch tabs with no second copy of the translations.
- **Active section** is tracked on scroll and marked with `.is-active` plus
  `aria-current="true"` on both the desktop links and the tabs.
- **Scroll progress** hairline across the top of the viewport.
- **Focus follows the jump:** after a fragment navigation the target section
  takes focus (`tabindex="-1"`, `preventScroll`), so keyboard and screen-reader
  users continue from the section rather than from the top of the document.

`--nav-h` has a CSS fallback per breakpoint, but `site.js` measures the real bar
on load and on resize and overwrites it — a wrapped bar or a late-loading font
can't quietly reintroduce the overlap.

## Brand assets

The LinkedIn and Proton Mail links carry each company's own mark. Both are used
as supplied — never recoloured, redrawn or restretched. Unlike everything else
under `assets/`, these are committed rather than generated; the build only
checks they are still present.

| File | Source | Terms |
|---|---|---|
| `assets/brand/linkedin-bug.png` | [brand.linkedin.com/downloads](https://brand.linkedin.com/downloads) → `in-logo.zip` → `LI-In-Bug.png` | [LinkedIn Brand Guidelines](https://brand.linkedin.com/in-logo) |
| `assets/brand/linkedin-bug-white.png` | same pack, `InBug-White.png` — the reverse variant, kept for use on lighter or busier backgrounds | as above |
| `assets/brand/proton-mail-badge.svg` | [proton.me/media/kit](https://proton.me/media/kit) → Proton Mail; identical to the `mail-badge.svg` Proton serves on proton.me | "may be freely used, provided the accompanying media refers back to [proton.me](https://proton.me)" |

The rules that shaped the markup:

- **Minimum size.** LinkedIn requires the [in] bug to be at least **21 px tall**
  on screen. `MARK_PX` in `tools/build.mjs` is set to exactly that; the contact
  details block uses 26 px. Do not go below 21.
- **No distortion.** The `width`/`height` attributes carry the artwork's true
  pixel ratio so the browser can reserve the right box; the display size comes
  from `height` + `width:auto` in CSS. Writing a rounded pixel width into the
  attributes would squash the mark by about 1%.
- **Clear space.** LinkedIn asks for 2× the stroke width of the "I". The pills'
  existing padding plus a 10 px gap covers it.
- **Adjacent wording.** LinkedIn asks that the bug not be combined with other
  words into a lockup. Here each mark sits inside a button beside a label that
  names the destination, with clear space between — the conventional social-link
  treatment rather than a composite mark. If you would rather be stricter, the
  marks can stand alone with the label dropped and an `aria-label` on the link.
- **Decorative.** Every mark has `alt=""`, because the adjacent text already
  names the destination and a screen reader should not say "LinkedIn" twice.

### Changing the URL

`SITE` at the top of `tools/build.mjs` is the one place the public URL is
written. Change it there and rebuild; canonical tags, `hreflang`, Open Graph,
the sitemap, `robots.txt` and the 404 page's links all follow.
