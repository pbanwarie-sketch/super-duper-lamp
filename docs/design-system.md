# Design system

The system this site is actually built from — read out of the shipped page, not
invented for the document. Every value below is a value in `tools/build.mjs`,
`assets/site.css` or the design export, and every contrast ratio is measured.

**See it live:** [`docs/styleguide.html`](styleguide.html) renders the whole
system in both themes. Open it directly, or serve the repo and visit
`/docs/styleguide.html`.

---

- [Principles](#principles)
- [Colour](#colour)
- [Typography](#typography)
- [Space and layout](#space-and-layout)
- [Shape and edge](#shape-and-edge)
- [Elevation and glow](#elevation-and-glow)
- [Motion](#motion)
- [Components](#components)
- [States](#states)
- [Iconography and imagery](#iconography-and-imagery)
- [Accessibility rules](#accessibility-rules)
- [Governance](#governance)

---

## Principles

**1. Dark is the original, light is a peer.**
The palette was designed on near-black. Light mode is not a filter over it — it
is a second column in the same token table, with its own contrast obligations.
Neither theme is allowed to be the broken one.

**2. Edges, not shadows.**
Depth comes from 1px hairlines and a change of surface, almost never from a
drop shadow. There are exactly two shadows in the whole site, and one of them is
a glow.

**3. Square by default, round only for actions.**
Sections, cards and panels have no radius at all. A full pill (`999px`) is the
signal that something is pressable. The contrast is the affordance.

**4. Two voices.**
Space Grotesk speaks — headlines, prose, card titles. JetBrains Mono labels —
eyebrows, meta, buttons, counters, anything uppercase and tracked. If a piece of
text is *about* the content rather than the content itself, it is mono.

**5. Blue is a scarce resource.**
One accent. It appears as a 34 px rule before a section eyebrow, on the primary
button, on links, and as a low-alpha tint behind a chip. Spending it anywhere
else devalues the places it does appear.

**6. Motion acknowledges, never announces.**
One easing curve, short distances, and everything collapses to nothing under
`prefers-reduced-motion`.

**7. It works before JavaScript runs.**
Every enhancement — reveal, headline rotation, theme toggle, tab bar — is added
by script and is absent, not broken, without it.

---

## Colour

The palette lives in one place: the `THEME` table in `tools/build.mjs`. Each row
is `[token, matched literal, dark value, light value]`, and the build rewrites
every colour literal in the page to `var(--token)`. See
[Theming](theming.md) for the mechanism.

### Brand

| Token | Dark | Light | Role |
|---|---|---|---|
| `--accent` | `#2E7DFF` | `#2E7DFF` | Paint: button fills, the 34 px eyebrow rule, borders, the scroll progress bar. Identical in both themes on purpose. |
| `--accent-text` | `#2E7DFF` | `#1A5FD6` | The accent **as text**. Darkened on light because `#2E7DFF` on white is 3.82:1. |
| `--accent-hi` | `#4B90FF` | `#1D66E0` | Accent hover / emphasis |
| `--link` | `#63A2FF` | `#1A5FD6` | Link text |
| `--link-hover` | `#A8C8FF` | `#134DB8` | Link hover |

### Surfaces

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#05080F` | `#FFFFFF` | Page base, alternating sections |
| `--bg-2` | `#070B14` | `#EEF2F8` | The other alternating section |
| `--card` | `#0B1120` | `#F4F7FB` | Card fill |
| `--chip` | `#0B1B3A` | `#DCE9FF` | Chip / tag fill |
| `--frost` · `--frost-2` | `rgba(5,8,15,.82/.93)` | `rgba(255,255,255,.82/.93)` | Nav and tab bar behind `backdrop-filter: blur(14px)` |
| `--fade-85` · `--fade-0` | over `#05080F` | over `#EEF2F8` | Hero image fade stops |
| `--scrim-78` · `--scrim-05` · `--scrim-0` | over `#070B14` | over `#EEF2F8` | Overlay scrims |

Sections alternate `--bg` / `--bg-2` and are separated by a
`1px solid var(--edge-06)` top border — the whole of the section rhythm.

### Text

Measured contrast. **Dark** = against `--bg` `#05080F`; **Light** = against
`--bg` `#FFFFFF`. The value in brackets is the worst case across all four
surfaces (`bg`, `bg-2`, `card`, `chip`) — a deliberately pessimistic matrix that
includes pairings the page never actually renders. `--chip` is the worst surface
in every case.

| Token | Dark | Ratio (worst) | Light | Ratio (worst) | Role |
|---|---|---|---|---|---|
| `--ink` | `#F3F6FD` | 18.5 (15.7) | `#0B1526` | 18.3 (14.9) | Headings |
| `--text` | `#EDF1FA` | 17.7 (15.1) | `#16233A` | 15.7 (12.8) | Strong body, emphasis |
| `--body` | `#9AA3B8` | 7.9 (6.7) | `#3F4F6B` | 8.3 (6.7) | Body copy |
| `--body-2` | `#98A1B6` | 7.7 (6.6) | `#42526E` | 7.9 (6.4) | Secondary body |
| `--muted` | `#8B94AA` | 6.6 (5.6) | `#4A5872` | 7.2 (5.9) | Captions, meta |
| `--muted-2` | `#6E7994` | 4.60 (**3.92**) | `#56637D` | 6.04 (4.93) | Faint labels, eyebrows |
| `--muted-3` | `#5D6883` | **3.60 (3.06)** | `#5D6A85` | 5.43 (**4.43**) | Faintest labels |
| `--accent-text` | `#2E7DFF` | 5.24 (**4.46**) | `#1A5FD6` | 5.75 (4.69) | Accent as text |
| `--link` | `#63A2FF` | 7.77 (6.61) | `#1A5FD6` | 5.75 (4.69) | Links |
| `--link-hover` | `#A8C8FF` | 11.80 (10.04) | `#134DB8` | 7.55 (6.16) | Link hover |
| `--sep` | `#3A4358` | — | `#B6C2D4` | — | Separator glyphs, non-text |

Below AA in the worst case:

| Theme | Pairing | Ratio |
|---|---|---|
| Dark | `--muted-3` on any surface | 3.60 → 3.06 |
| Dark | `--muted-2` on `--chip` | 3.92 |
| Dark | `--accent-text` on `--chip` | 4.46 |
| Light | `--muted-3` on `--chip` | 4.43 |

All of these are small mono labels, all are inherited from the design export,
and the light theme is measurably the more forgiving of the two — its one miss
is 0.07 short. If the dark palette is ever revised, `--muted-3` is the first
token to lift: `#6E7994` would put it at 4.60:1 on `--bg`.

[`docs/styleguide.html`](styleguide.html) recomputes this whole matrix on load
in whichever theme you are viewing, so the numbers above cannot go quietly
stale.

### Edges

Hairlines and card strokes: white-alpha on dark, navy-alpha on light.

| Token | Dark | Light | Typical use |
|---|---|---|---|
| `--edge-05` … `--edge-08` | `rgba(255,255,255,.05–.08)` | `rgba(13,34,63,.07–.1)` | Section dividers, card borders (`--edge-08` is the default) |
| `--edge-10` … `--edge-16` | `rgba(255,255,255,.1–.16)` | `rgba(13,34,63,.13–.19)` | Interactive borders, hover states |
| `--edge-30` | `rgba(255,255,255,.3)` | `rgba(13,34,63,.34)` | Strongest hairline |
| `--shadow` | `rgba(0,0,0,.9)` | `rgba(23,43,77,.2)` | The one soft shadow |

### Tints

Brand blue at low alpha, for glows, chip fills and accent borders. Every light
value is nudged *up* by 2–5 points, because a tint reads weaker on white than on
near-black.

| Token | Dark | Light |
|---|---|---|
| `--tint-06` · `--tint-08` · `--tint-09` · `--tint-10` | `rgba(46,125,255,.06–.10)` | `.08–.13` |
| `--tint-14` · `--tint-20` · `--tint-28` · `--tint-30` | `rgba(46,125,255,.14–.30)` | `.17–.34` |
| `--tint-35` · `--tint-40` · `--tint-45` · `--tint-50` · `--tint-55` | `rgba(46,125,255,.35–.55)` | `.38–.60` |
| `--tint-85` | `rgba(46,125,255,.85)` | `rgba(46,125,255,.85)` | (the button glow — identical in both) |

### Rules

- Never write a colour literal. Every colour is a `var(--token)`; the build
  throws on anything it doesn't recognise. `#fff` is the single exception, and
  only on brand blue.
- Adding a colour means adding a **row** to `THEME` with both values decided —
  not just the one you are looking at.
- `--accent` for paint, `--accent-text` for text. `border-color:#2E7DFF` belongs
  in the first bucket, `color:#2E7DFF` in the second.
- SVG `fill` attributes stay literal. They are content, not chrome, and cannot
  carry `var()` anyway.

---

## Typography

Two self-hosted families, subset to woff2 and shared between both pages.

| Family | Role | Files |
|---|---|---|
| **Space Grotesk** | Display and prose — headlines, body, card titles, nav links | `assets/fonts/space-grotesk-*.woff2` |
| **JetBrains Mono** | Labels — eyebrows, meta, buttons, counters, captions, the wordmark | `assets/fonts/jetbrains-mono-*.woff2` |

Stacks: `'Space Grotesk', system-ui, sans-serif` and
`'JetBrains Mono', monospace`.

### Scale

| Role | Size | Weight | Line height | Tracking | Family |
|---|---|---|---|---|---|
| Hero `h1` | `clamp(38px, 4.4vw, 68px)` | 700 | 1.04 | `-.04em` | Space Grotesk |
| Hero rotator | `clamp(38px, 4vw, 60px)` | 700 | 1.05 | `-.035em` | Space Grotesk |
| Section `h2` | `clamp(34px, 3.4vw, 50px)` | 700 | 1.08 | `-.03em` | Space Grotesk |
| Lead paragraph | `clamp(16px, 1.7vw, 26px)` | 400 | 1.6 | — | Space Grotesk |
| Card title (`h2`/`h3`) | `22–23px` | 600 | 1.3 | `-.02em` | Space Grotesk |
| Sub-heading | `19px` | 600 | 1.3 | `-.02em` | Space Grotesk |
| Body | `17px` | 400 | 1.65–1.75 | — | Space Grotesk |
| Small body | `15px` | 400 | 1.7 | — | Space Grotesk |
| Fine print | `14px` | 400 | 1.6 | — | Space Grotesk |
| Nav link | `14px` | 400 | — | — | Space Grotesk |
| Button label | `12px` | 700 | — | `.16em` | JetBrains Mono |
| Eyebrow / meta | `10–11px` | 400 | — | `.14–.24em` | JetBrains Mono |
| Micro-label | `9px` | 400 | — | `.20em` | JetBrains Mono |
| Wordmark | `15px` | 700 | — | `.28em` | JetBrains Mono |

### Rules

- **Headings tighten, labels open.** Space Grotesk headings carry negative
  tracking (`-.02em` → `-.04em`, tighter as they get larger). JetBrains Mono
  labels carry positive tracking (`.12em` → `.28em`) and are always
  `text-transform: uppercase`.
- **Only three weights exist:** 400 (body), 600 (card and sub-headings), 700
  (hero, section headings, buttons, wordmark). There is no 500 in the system.
- **Prose is measured.** Long-form text is capped at `70ch`; intro and side
  paragraphs at `330–660px`. Nothing runs the full 1280.
- `text-wrap: pretty` on paragraphs, `text-wrap: balance` on card titles.
- Fluid sizes use `clamp()` only for the three largest roles. Everything at or
  below 23px is fixed — a mono label at 10px has nowhere useful to go.

---

## Space and layout

### Content width

| Container | Max width |
|---|---|
| Section content | `1280px`, centred |
| Wide prose block | `1080px` / `820px` |
| Paragraph measure | `660px` / `560px` / `520px` |
| Side note | `330px` |
| Disclosure prose | `70ch` |

### Section rhythm

| Breakpoint | Section padding |
|---|---|
| Desktop | `120px 72px` (contact: `130px 72px`) |
| ≤ 900px | `72px 20px` |
| ≤ 520px | `56px 20px` |

Sections alternate `--bg` / `--bg-2`, each with a `1px solid var(--edge-06)` top
border.

### Spacing steps

The scale in use, in px — a 2px-based ramp that coarsens as it grows:

```
6  7  8  10  12  14  16  18  20  22  24  26  30  40  44  56  72  88  120  130
```

The ones that carry most of the layout: **8** (icon/label gaps), **12** and
**14** (inline groups), **16** (component internals), **24** and **26** (card
padding), **40** (column gaps), **56** (heading → content), **72** (section
gutter), **120** (section vertical).

Common component paddings: `5px 10px` (tag), `8px 14px` (small pill),
`15px 32px` / `16px 34px` (button), `22px 26px` and `26px` (card),
`28px 24px` (story card), `36px 40px` (art panel).

### Grid

One-dimensional: flex rows and simple CSS grids, always with an explicit `gap`.
Under 900px **every** multi-column grid collapses to a single column via an
attribute selector — no per-component breakpoint logic.

---

## Shape and edge

| Radius | Where |
|---|---|
| `0` | Sections, cards, panels, the art panel, images — the default |
| `2px` | Scroll progress bar |
| `7px` | The dark chip behind the EU `AI` icon in light mode |
| `14px` | The certification card — the one soft rectangle, because it wraps a badge |
| `24px` | Story photo, mobile only |
| `999px` | Buttons, pill links, tags, the theme toggle |
| `50%` | Rotator arrows, avatar-scale circles |

Borders are always `1px solid var(--edge-*)`, or `var(--tint-*)` when the border
is meant to read as accent. There is no 2px border anywhere except the active
tab's top edge and the focus ring.

**The affordance rule:** if it is round, it is pressable. Applying `999px` to
something inert breaks the strongest signal in the system.

---

## Elevation and glow

There are two, and both are optional decoration:

| Shadow | Value | Where |
|---|---|---|
| Accent glow | `0 12px 34px -12px var(--tint-85)` | Under the primary button |
| Soft lift | `0 30px 70px -30px var(--shadow)` | Under the hero portrait |

Everything else separates by surface change plus a hairline. Reach for
`--bg-2` + `--edge-08` before reaching for a shadow.

---

## Motion

| Property | Value |
|---|---|
| Easing | `cubic-bezier(.2, .7, .2, 1)` — the only curve in the system |
| Hover | `.3s` (colour, border) |
| Transform | `.4s` |
| Reveal | `.7s` opacity + `translateY(22px)` |
| Headline rotation | type 165ms/char · hold 5.2s · erase 85ms/char |
| Pixel-art bob | `5.6s ease-in-out infinite` |

Rules:

- Reveal-on-scroll is class-gated on `.js`, so it never leaves a section
  permanently invisible without JavaScript.
- Under `prefers-reduced-motion: reduce`: `scroll-behavior: auto`, every
  animation and transition clamped to `.001ms`, reveals shown immediately, and
  the headline rotates only on an explicit button press.
- No motion is load-bearing. Every animated element is legible in its final
  state at frame zero.

---

## Components

### Nav bar

Sticky, `--frost` behind `backdrop-filter: blur(14px)`, one hairline
(`--edge-08`) at the bottom. 57px desktop / 52px phone — measured at runtime
into `--nav-h`, never trusted from CSS alone. Contents: wordmark (mono, 700,
`.28em`), section links (Space Grotesk 14px), EN/NL switch, theme toggle.

### Tab bar (≤ 900px)

Fixed to the bottom, `--frost-2`, `grid-auto-flow: column` with equal columns,
labels read out of the page's own nav so the Dutch build gets Dutch tabs.
Active tab: `--link` text, a 2px `--accent` top edge and a `--tint-09` fill.
Respects `env(safe-area-inset-bottom)`, and the footer's bottom padding accounts
for it.

### Buttons

| Variant | Fill | Border | Text | Radius |
|---|---|---|---|---|
| Primary | `--accent` | — | `#fff`, mono 12px/700, `.16em` | `999px` |
| Secondary | none | `1px solid var(--accent)` | `--accent-text` | `999px` |
| Pill link | `--tint-10` | `1px solid var(--tint-30)` | `--accent-text`, mono 11px | `999px` |
| Icon button | none | `1px solid var(--edge-12)` | `--muted-2` | `999px` / `50%` |

Padding `15px 32px` (primary/secondary), `8px 14px` (pill link).

### Eyebrow

The section-opening motif: a `34px × 1px` `--accent` rule, a 14px gap, then a
mono uppercase label at 11px / `.24em` in `--muted-2`. Used at the top of every
section and in the art panel's caption.

### Section header

Eyebrow → `h2` at `clamp(34px,3.4vw,50px)` → optional `330px` side note aligned
to the baseline, with `gap: 40px` and `flex-wrap`. Content starts `56px` below.

### Card

`--card` fill, `1px solid var(--edge-08)`, **no radius**, `26px` or `22px 26px`
padding. Title 22px/600, body 15px/1.7 in `--muted`. Hover lifts the border to
`--edge-14` and translates the card on the shared `.4s` curve.

### Certification card

The one 14px-radius component. `--tint-06` fill, `--tint-28` border, 56px badge
(46px on phones), `gap: 16px`, with a three-line text stack: mono kicker 9px,
name 16px/600 in `--ink`, and a mono `--link` verify line. Hover deepens both
tint and border. See [Brand assets](brand-assets.md#the-microsoft-certification-badge).

### Chip / tag

`--chip` fill or `--tint-08`, `5px 10px`, mono 10px uppercase, `999px`. Used for
skills and tools.

### Art panel

`--bg` fill on `--bg-2` section, `--edge-08` border, `36px 40px` padding, a
`radial-gradient` dot grid (`--tint-40`, `24px` cells, `.2` opacity) behind the
artwork. **Keeps the dark palette in both themes** — it re-declares every token
at its dark value. See [Theming](theming.md).

### AI badge, caption and disclosure

The `AI GENERATED` badge sits `16px` from the panel's top-right (10px on
phones), 28px tall, above the dot grid. The caption below is a mono 10px
`.14em` row with an underlined `--link`. The footer disclosure is a `<details>`
with a mono 11px `.18em` summary, a `▾/▴` marker in `--accent-text`, and `70ch`
prose. See [AI disclosure](ai-disclosure.md).

### Scroll progress

`2px` fixed hairline at the very top,
`linear-gradient(90deg, var(--accent), var(--link))`, width driven by scroll
position. Purely decorative — `pointer-events: none`.

### Theme toggle

A `30px` circle at the end of the nav's link row, `1px solid var(--edge-12)`,
`--muted-2` icon, sun in dark mode and moon in light. Negative block margin
(`-6px 0`) keeps it from changing the bar's height. Hidden entirely without
JavaScript.

### Footer

`--bg`, `--edge-06` top hairline, mono meta at 10–11px, and on phones a bottom
padding that clears the tab bar plus the safe-area inset.

---

## States

| State | Treatment |
|---|---|
| Hover (link) | `--link` → `--link-hover` |
| Hover (card) | border `--edge-08` → `--edge-14`, `translateY` on the `.4s` curve |
| Hover (tinted) | tint and border each step up one level (`--tint-06` → `--tint-10`, `--tint-28` → `--tint-55`) |
| Focus | `outline: 2px solid #63A2FF; outline-offset: 3px` via `:focus-visible` — never removed, never replaced by a colour change alone |
| Active section | `.is-active` **and** `aria-current="true"`, on both desktop links and tabs |
| Skip link | Off-canvas until focused, then `#2E7DFF` / `#fff`, mono 12px, `12px 20px` |
| Selection | `#2E7DFF` background, `#fff` text |
| No-JS | `.theme-toggle` and `.tabbar` hidden; reveals never applied |

---

## Iconography and imagery

- **Interface icons** are inline SVG, `24×24` viewBox, `stroke="currentColor"`,
  `stroke-width: 2`, round caps and joins, rendered at 16px. They inherit
  colour; they never carry a fill.
- **Photography** is the two real portraits, shipped from
  `tools/img-overrides/` at mozjpeg q80 with intrinsic `width`/`height`
  attributes so nothing shifts. See [Performance](performance.md).
- **Pixel art** uses `shape-rendering="crispEdges"` and literal `fill` values —
  deliberately outside the theme system. It carries `role="img"` and a real
  `aria-label`.
- **Third-party marks** (LinkedIn, Proton, Microsoft) are used exactly as
  supplied — never recoloured, redrawn or restretched. See
  [Brand assets](brand-assets.md).
- **EU AI icons** are the Commission's white variants and always sit on a dark
  background, in both themes.

---

## Accessibility rules

These are commitments, not aspirations — the build enforces the ones it can.

1. **Text contrast ≥ 4.5:1** against every surface the token can land on. The
   documented exceptions are the four faint-label pairings listed under
   [Colour → Text](#text), all inherited from the design export, plus the one
   below.
2. **Known deviation:** the primary button is white mono **12px/700** on
   `--accent` `#2E7DFF` = **3.82:1**, below AA for text under 18.66px bold. It
   passes as large text only if the label is enlarged. Two fixes, whenever the
   button is next touched: raise the label to 19px+, or introduce a
   `--accent-solid` token at `#1A5FD6` (5.75:1) / `#1D66E0` (5.21:1) used only
   as a fill behind white text, leaving `--accent` free to stay `#2E7DFF` as a
   hairline and glow.
3. **Non-text contrast:** borders and the progress bar are decorative; every
   control they belong to is also identified by text or an `aria-label`.
4. **Focus is always visible** and never traded for a hover-only cue.
5. **Heading order never skips** — the build promotes the story cards' `h3`s to
   `h2` to guarantee it.
6. **Every image is classified**: real `alt` if it carries meaning, `alt=""` if
   it repeats adjacent text.
7. **Motion is optional** — see [Motion](#motion).
8. **Nothing essential requires JavaScript.**
9. **Both languages are first-class**: `lang` on `<html>`, reciprocal
   `hreflang`, and no untranslated interface strings (the tab bar reads its
   labels out of the page).

---

## Governance

**One source per concern.**

| Concern | Single source |
|---|---|
| Colour | `THEME` in `tools/build.mjs` |
| Responsive + motion | `RESPONSIVE_CSS` in `tools/build.mjs` |
| Theme mechanics | `THEME_CSS` / `THEME_BOOT` in `tools/build.mjs` |
| Behaviour | `SITE_JS` in `tools/build.mjs` |
| Layout, copy, type sizes | the design export in `src-bundles/` |

**Adding to the system**

1. Prefer an existing token. A new one should name a *role*, not a value.
2. A colour needs **both** theme values, decided together, and a measured
   contrast ratio for anything that will ever be text.
3. A new radius, shadow or easing curve needs a reason the existing ones don't
   cover. There are three of each on purpose.
4. Rebuild, then check the change in
   [`docs/styleguide.html`](styleguide.html) in **both** themes and at **all
   three** breakpoints before committing.

**Keeping the styleguide honest**

`docs/styleguide.html` links `../assets/site.css` and reads every colour out of
it at runtime with `getComputedStyle`. It cannot drift: rebuild, reload, and the
swatches, hex values and contrast ratios are whatever the build just emitted —
including the pass/fail verdicts, which are computed live rather than typed in.

What it does *not* read automatically is the prose: the type scale, spacing
steps and component specs are written into the page. If you change one of those
in the export, update the styleguide and this document in the same commit.
