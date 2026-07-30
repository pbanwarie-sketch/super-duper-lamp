# Theming

Dark is the design as exported. Light is a build-time transform of it. Both are
first-class; neither is a filter over the other.

- [How it works](#how-it-works)
- [Who decides which theme renders](#who-decides-which-theme-renders)
- [What the light palette does, and deliberately doesn't](#what-the-light-palette-does-and-deliberately-doesnt)
- [The build refuses to half-theme](#the-build-refuses-to-half-theme)
- [Editing the palette](#editing-the-palette)

See also: [Design system → Colour](design-system.md#colour) for the full token
table with measured contrast ratios.

## How it works

The design tool exported one hard-coded dark palette, spread across hundreds of
inline `style` attributes. The build themes it the same way it makes it
responsive: as a transform. Every colour literal — in the extracted CSS, the
generated hover classes, the build's own CSS layers and every inline style — is
rewritten to a CSS custom property. The `:root` defaults are byte-identical to
the literals they replaced, so the dark page renders exactly as before
(verified: a full-page screenshot diff against the pre-theme build differs only
where the toggle button now sits). A light block swaps the values.

SVG presentation attributes are deliberately left alone: `fill` cannot carry a
`var()`, and the pixel-art scene's colours are content, not chrome.

## Who decides which theme renders

In order:

1. **The visitor's explicit choice** — the sun/moon button at the end of the nav
   bar sets `data-theme` on `<html>` and remembers it in `localStorage`. A
   two-line script in `<head>` re-applies it before first paint, so a returning
   visitor never sees the other theme flash. The button is hidden without
   JavaScript, which is also what makes it work.
2. **`prefers-color-scheme`** otherwise.
3. **Dark** otherwise — the design as exported.

`<meta name="theme-color">` ships as a media-scoped pair and `site.js` keeps it
in step with an explicit choice, so the browser chrome follows.

## What the light palette does, and deliberately doesn't

- **The brand blue `#2E7DFF` survives untouched** on everything that is *paint* —
  buttons, hairlines, borders, the scroll progress bar. Wherever the accent is
  *text*, light mode darkens it to the same-hue `#1A5FD6`, because `#2E7DFF` on
  white is 3.82:1 — below WCAG AA. Every text token's light value clears AA
  (≥ 4.5:1) on the surfaces it appears against, with one 0.07 near-miss
  (`--muted-3` on `--chip`, 4.43:1); three of the dark theme's faintest labels
  miss by more, so the light theme is the more accessible of the two. The full
  matrix is in [Design system → Colour](design-system.md#text).
- **The pixel-art panel stays dark in both themes.** The scene was generated for
  a dark backdrop and its `AI GENERATED` badge is the Commission's white
  variant, correct only on dark. `.art-panel` re-declares every token at its
  dark value — a dark island, like a framed print on a gallery wall.
- **The footer's EU `AI` icon keeps its dark background too**: in light mode it
  sits on a small dark chip. Same reasoning as the badge — the white artwork is
  used unmodified, on the background it is published for, just a local one.

## The build refuses to half-theme

After the rewrite, any colour literal the theme table doesn't recognise — say,
from a fresh design export that introduces a new colour — throws, listing the
offenders. The one allowed literal is `#fff`, which only ever sits on the brand
blue and is identical in both themes.

## Editing the palette

The token table (`THEME` in `tools/build.mjs`) is the one place the palettes
live. Each row is `[token, matched literal, dark value, light value]`:

```js
['accent-text', null,      '#2E7DFF', '#1A5FD6'],
['bg',          '#05080F', '#05080F', '#FFFFFF'],
```

A `null` literal means the token is produced by a targeted split rather than a
plain find-and-replace — `--accent-text` shares its dark literal with
`--accent`, so the build first rewrites `color:#2E7DFF` specifically, then lets
the generic pass claim the rest.

Edit the value, rebuild, and check the result against
[`docs/styleguide.html`](styleguide.html) in both themes.
