# Architecture

How the published pages come to exist, and which files you are allowed to edit.

- [The one rule](#the-one-rule)
- [Source of truth](#source-of-truth)
- [The build](#the-build)
- [What the build does](#what-the-build-does)
- [Failing loudly](#failing-loudly)
- [Replacing the design export](#replacing-the-design-export)
- [Where to change what](#where-to-change-what)

## The one rule

`index.html`, `nl.html`, `404.html` and everything under `assets/` except
`assets/brand/` are **generated**. Editing them by hand works until the next
`node tools/build.mjs`, which overwrites them without asking.

Everything that a human writes lives in exactly two places:

| Source | Holds |
|---|---|
| `src-bundles/index.html`, `src-bundles/nl.html` | The design-tool export of each page — layout, copy, artwork |
| `tools/build.mjs` | Metadata, the URL, the colour palette, the responsive layer, the site JavaScript, the AI-disclosure text |

## Source of truth

The repository is the source of truth for the live site. GitHub Pages serves
branch `main`, folder `/ (root)`, at **https://prashand.com** (`CNAME`).
`.nojekyll` stops Pages from running Jekyll over the output.

## The build

The design tool exports each page as a single ~1.6 MB HTML file that carries
every font and photo as base64 and only paints after React plus a 70 KB runtime
unpack it in the browser. `tools/build.mjs` does that unpacking once, at build
time, and writes plain HTML with real asset files:

```sh
node tools/build.mjs      # Node 18+, no dependencies
```

The build is deterministic: the same inputs produce byte-identical output, so
`git status` after a build is a reliable diff of what you actually changed.

## What the build does

Beyond unpacking the bundle, the build:

- resolves the design tool's own markup — `<x-dc>`, `<helmet>`, `<sc-if>`,
  `<image-slot>`, `style-hover` attributes and `{{ }}` bindings — into ordinary
  HTML and CSS, so no JavaScript is needed to see the page
- replaces React, ReactDOM and the design runtime (~276 KB) with a 5 KB
  vanilla script
- shares one copy of every font and photo between the two pages
- adds the metadata a published page needs: `lang`, description, canonical,
  `hreflang` pairing, Open Graph and Twitter cards, JSON-LD, favicon
- adds `<header>`/`<main>` landmarks, a skip link, `alt` text, intrinsic image
  dimensions, and `rel="noopener noreferrer"` on external links
- adds the responsive and `prefers-reduced-motion` layers the export ships
  without — see [Navigation and accessibility](navigation.md)
- adds the light theme: every colour literal in the export becomes a CSS
  custom property, dark stays the default — see [Theming](theming.md)
- swaps in the recompressed photographs and minifies the assets — see
  [Performance](performance.md)

## Failing loudly

The build fails rather than emitting a broken page if any of its markup
transforms stops matching (see the assertions near the end of `buildPage`), if
a colour literal survives the theme rewrite, or if an image override's
dimensions drift from the export's. A fresh design export that introduces
something unexpected lands in a stack trace, not in production.

## Replacing the design export

To publish a new design revision:

1. Replace the files in `src-bundles/` with the fresh export.
2. Reapply the three runtime patches, or the code-scanning alerts reopen —
   see [Code scanning](security.md#after-a-fresh-export).
3. Regenerate the image overrides — see
   [Performance](performance.md#photo-overrides).
4. `node tools/build.mjs`, then review `git diff` before committing.

## Where to change what

| To change | Edit |
|---|---|
| Page copy, layout, artwork | `src-bundles/*.html` (re-export from the design tool) |
| Title, description, social cards, JSON-LD | the `PAGES` metadata in `tools/build.mjs` |
| The public URL | `SITE` in `tools/build.mjs` — canonical, `hreflang`, Open Graph, the sitemap, `robots.txt` and the 404 links all follow |
| Colours, light/dark values | the `THEME` table in `tools/build.mjs` — see [Theming](theming.md) |
| Breakpoint behaviour, motion | `RESPONSIVE_CSS` in `tools/build.mjs` |
| Nav, headline rotation, theme toggle behaviour | `SITE_JS` in `tools/build.mjs` |
| AI-disclosure wording | each page's `ai` block in `tools/build.mjs` — see [AI disclosure](ai-disclosure.md) |
| Brand mark sizing | `MARK_PX` in `tools/build.mjs` — see [Brand assets](brand-assets.md) |

Then rebuild.
