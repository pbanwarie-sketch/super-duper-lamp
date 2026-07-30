# Navigation and accessibility

The design export ships zero media queries, zero reduced-motion handling and a
sticky bar that never sticks. This is the layer the build adds on top.

- [Fragment links used to land in the wrong place](#fragment-links-used-to-land-in-the-wrong-place)
- [Bottom tab bar under 900 px](#bottom-tab-bar-under-900px)
- [Active section, progress, focus](#active-section-progress-focus)
- [Measuring the bar](#measuring-the-bar)
- [The responsive layer](#the-responsive-layer)
- [Reduced motion](#reduced-motion)
- [Accessibility checklist](#accessibility-checklist)

## Fragment links used to land in the wrong place

Badly on desktop and worse on a phone. Three separate causes, all fixed:

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

## Bottom tab bar under 900 px

The four sections move out of the top bar into a fixed bar in the thumb zone;
the top bar keeps brand and language in one 49 px row, down from 83 px. Tab
labels are read out of the page's own nav, so the Dutch build gets Dutch tabs
with no second copy of the translations.

## Active section, progress, focus

- **Active section** is tracked on scroll and marked with `.is-active` plus
  `aria-current="true"` on both the desktop links and the tabs. A section counts
  as current once its top passes just below the bar; the bottom of the page
  claims the last section, which is usually too short to reach the line.
- **Scroll progress** hairline across the top of the viewport.
- **Focus follows the jump:** after a fragment navigation the target section
  takes focus (`tabindex="-1"`, `preventScroll`), so keyboard and screen-reader
  users continue from the section rather than from the top of the document.
- **`#ai-disclosure` opens on arrival:** following the illustration's caption
  link expands the `<details>` rather than dropping you beside a collapsed
  summary.

## Measuring the bar

`--nav-h` has a CSS fallback per breakpoint, but `site.js` measures the real bar
on load and on resize and overwrites it — a wrapped bar or a late-loading font
can't quietly reintroduce the overlap.

## The responsive layer

Every measurement in the export is a hard-coded desktop pixel value in an inline
`style` attribute, and inline styles outrank any selector. The only way to adapt
them without rewriting 800 lines of markup is a targeted `!important` layer
(`RESPONSIVE_CSS` in `tools/build.mjs`). Attribute selectors do the generic work
— any multi-column grid collapses to one column under 900 px — and
build-injected classes handle the few one-off absolute positions, such as the
skills card pinned at `left:101px;top:535px` on desktop, which has to rejoin the
flow on a phone or it lands on top of the paragraph below it.

Breakpoints: **900 px** (phones and small tablets) and **520 px** (small
phones). Nothing else.

## Reduced motion

Under `prefers-reduced-motion: reduce`, smooth scrolling is off, every animation
and transition collapses to 0.001 ms, and the reveal-on-scroll elements are
visible from the start. The headline still rotates on button press but never on
a timer.

Reveal-on-scroll is also gated on `.js`: it only exists once JavaScript has
confirmed it can undo it, so a visitor without JavaScript never meets a
permanently invisible section.

## Accessibility checklist

What the build guarantees, and what to re-check after a fresh design export:

- `<header>` / `<main>` landmarks and a skip link as the first focusable element
- heading order — the four story cards' `h3`s are promoted to `h2` so the
  outline never jumps `h1 → h3`
- `alt` on every meaningful image, `alt=""` on every decorative one
- intrinsic `width`/`height` on images, so nothing shifts as they load
- `rel="noopener noreferrer"` on external links
- a visible `:focus-visible` ring (2 px `#63A2FF`, 3 px offset)
- `aria-current="true"` on the active nav link and tab
- language pairing: `lang` on `<html>`, `hreflang` between `/` and `/nl.html`

Contrast is documented per token in
[Design system → Colour](design-system.md#colour), including the one known
deviation.
