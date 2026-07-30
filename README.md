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
| `assets/eu-ai/` | European Commission icons for labelling AI-generated content |
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
- adds the light theme: every colour literal in the export becomes a CSS
  custom property, dark stays the default — see **Theming** below

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

## Theming

The design tool exported one hard-coded dark palette, spread across hundreds of
inline `style` attributes. The build themes it the same way it makes it
responsive: as a transform. Every colour literal — in the extracted CSS, the
generated hover classes, the build's own CSS layers and every inline style —
is rewritten to a CSS custom property. The `:root` defaults are byte-identical
to the literals they replaced, so the dark page renders exactly as before
(verified: a full-page screenshot diff against the pre-theme build differs only
where the toggle button now sits). A light block swaps the values.

Who decides which theme renders, in order:

1. **The visitor's explicit choice** — the sun/moon button at the end of the
   nav bar sets `data-theme` on `<html>` and remembers it in `localStorage`.
   A two-line script in `<head>` re-applies it before first paint, so a
   returning visitor never sees the other theme flash. The button is hidden
   without JavaScript, which is also what makes it work.
2. **`prefers-color-scheme`** otherwise.
3. **Dark** otherwise — the design as exported.

`<meta name="theme-color">` ships as a media-scoped pair and `site.js` keeps it
in step with an explicit choice, so the browser chrome follows.

What the light palette does, and deliberately doesn't do:

- **The brand blue #2E7DFF survives untouched** on everything that is *paint* —
  buttons, hairlines, borders, the scroll progress bar. Wherever the accent is
  *text*, light mode darkens it to the same-hue `#1A5FD6`, because #2E7DFF on
  white is 3.7:1 — below WCAG AA. Every text token's light value clears
  AA (≥ 4.5:1) on every surface it appears against; several of the dark
  theme's faint labels don't, so the light theme is the more accessible one.
- **The pixel-art panel stays dark in both themes.** The scene was generated
  for a dark backdrop and its `AI GENERATED` badge is the Commission's white
  variant, correct only on dark. `.art-panel` re-declares every token at its
  dark value — a dark island, like a framed print on a gallery wall.
- **The footer's EU `AI` icon keeps its dark background too**: in light mode it
  sits on a small dark chip. Same reasoning as the badge — the white artwork is
  used unmodified, on the background it is published for, just a local one.

The build fails rather than half-themes: after the rewrite, any colour literal
the theme table doesn't recognise — say, from a fresh design export that
introduces a new colour — throws, listing the offenders. The one allowed
literal is `#fff`, which only ever sits on the brand blue and is identical in
both themes. The pixel-art scene's `fill` attributes are exempt by
construction: the transform only touches `style` attributes and stylesheets,
and the artwork's colours are content, not chrome.

The token table (`THEME` in `tools/build.mjs`) is the one place the palettes
live. Each row is `[token, matched literal, dark value, light value]`; edit the
light column and rebuild.

## Code scanning

CodeQL runs on every push. Four hardening measures keep it at zero open
alerts, all chosen so the built pages stay byte-identical:

- **`tools/build.mjs` strips the bundler's script tags structurally**
  (`dropRuntimeScripts`: walk elements, copy or skip) rather than with a
  regex replace. Deleting a multi-character marker with `replace()` can
  splice the surrounding text into a brand-new marker — CodeQL's "incomplete
  multi-character sanitization", which it flags per call, so even a
  replace-until-fixpoint loop stays flagged. A scan that copies or skips
  whole elements has nothing to reassemble.
- **The bundles' resource map becomes a DOM node after parsing**, not markup
  spliced into the HTML string before it. The manifest-derived
  `window.__resources` script is created with `createElement` +
  `textContent` and inserted first in `<head>` — the same slot, so the
  script re-creation pass executes it at the same point — but text set via
  `textContent` is never re-read as HTML, which is the flow CodeQL flags as
  "DOM text reinterpreted as HTML".
- **The bundles' template ships as an executable assignment**
  (`window.__BUNDLER_TEMPLATE__ = "…"`) instead of a
  `<script type="__bundler/template">` data island. Identical payload, but
  program text sits in the same trust class as the runtime that consumes it,
  rather than being document text re-parsed into markup.
- **The bundles' nested-page relay never posts to `'*'`.** Where the document
  has a real origin it addresses that origin (as before); in opaque contexts
  the target is now `'/'` — same-origin-as-sender, which every legitimate hop
  is — instead of a wildcard. The published pages never run any of this
  (the build replaces the runtime), and these single-page bundles carry no
  nested pages, so nothing observable changes.

One editing hazard the first pass here tripped over, preserved as a warning:
the bundle runtime lives inside an inline `<script>` element, so nothing in
it — not even a comment — may contain a literal script-closing tag. The HTML
parser ends the element at the first one it sees, whatever the JavaScript
context, and the truncated runtime then fails with "Unexpected end of input".

**After replacing `src-bundles/` with a fresh design-tool export:** the build
still works — `readBundle` accepts both template forms — but the export
arrives with the unhardened runtime, so expect the `src-bundles/` alerts to
reopen until the three runtime patches above are reapplied (search the
previous bundle for `__BUNDLER_TEMPLATE__`, `resourcesInit` and `OWN_TARGET`
and mirror the edits).

## Labelling AI-generated content

The site uses the European Commission's
[EU icons for labelling AI-generated content](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content),
downloaded from that page and used unmodified (the white variants, for a dark
background). The Commission publishes them for anyone to use freely, with no
attribution required.

**This is voluntary, not compliance.** Nothing here falls inside the *mandatory*
scope of AI Act Article 50, which covers deepfakes and AI-generated text
published to inform the public on matters of public interest without human
editorial review:

- the two photographs are real photographs, neither AI-generated nor AI-retouched;
- the pixel-art illustration is evidently an illustration, not content that would
  falsely appear authentic, and creative works are excepted in any case;
- the written text carries human editorial responsibility, which is exactly the
  exception Article 50 provides, and a personal portfolio is not a matter of
  public interest.

The Commission is explicit that "the use of these EU icons is optional, but the
labelling requirements under Article 50 AI Act are not." So the labelling here is
a transparency choice, applied only to what is genuinely AI-made. Labelling the
real photographs would be its own kind of misinformation, which is why the
disclosure states positively that they are real.

| Where | What |
|---|---|
| On the pixel-art illustration | `AI GENERATED` badge, 28 px, top-right, over the artwork with nothing above it |
| Under the illustration | Plain-language caption plus a link to the disclosure |
| Above the footer | `AI` icon and a collapsed `<details>` itemising every asset either way |

Both icons are the white variants and stay on dark backgrounds in both themes:
the badge because its panel is a deliberate dark island (see **Theming**), the
footer icon on a small dark chip in light mode.

How the guidance's requirements are met:

- *Perceivable at first exposure, embedded in the content, no intervening
  overlay* — the badge sits on the illustration itself, above the dot-grid.
- *Accompanied by a plain-language text label* — the caption beneath it.
- *Alt text, readable by assistive technology* — the badge carries real `alt`
  text; the footer icon is decorative next to its own heading, so it has `alt=""`.
- *A navigable secondary information layer* — the `<details>` disclosure, which
  is real markup in the page rather than something fetched or JS-rendered. The
  caption link opens it rather than dropping you beside a collapsed summary.

### Changing the wording

Each page's `ai` block in `tools/build.mjs` holds the badge alt text, the
caption, the summary, the itemised list and the source note, per language. Edit
there and rebuild — nothing about the labelling is written in the HTML by hand.
If what is AI-made ever changes, that list is the thing to keep honest.

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
