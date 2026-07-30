# Brand assets

The LinkedIn and Proton Mail links carry each company's own mark. Both are used
as supplied — never recoloured, redrawn or restretched. Unlike everything else
under `assets/`, these are committed rather than generated; the build only
checks they are still present.

- [Files and terms](#files-and-terms)
- [The rules that shaped the markup](#the-rules-that-shaped-the-markup)
- [The Microsoft certification badge](#the-microsoft-certification-badge)

## Files and terms

| File | Source | Terms |
|---|---|---|
| `assets/brand/linkedin-bug.png` | [brand.linkedin.com/downloads](https://brand.linkedin.com/downloads) → `in-logo.zip` → `LI-In-Bug.png` | [LinkedIn Brand Guidelines](https://brand.linkedin.com/in-logo) |
| `assets/brand/linkedin-bug-white.png` | same pack, `InBug-White.png` — the reverse variant, kept for use on lighter or busier backgrounds | as above |
| `assets/brand/proton-mail-badge.svg` | [proton.me/media/kit](https://proton.me/media/kit) → Proton Mail; identical to the `mail-badge.svg` Proton serves on proton.me | "may be freely used, provided the accompanying media refers back to [proton.me](https://proton.me)" |

## The rules that shaped the markup

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

## The Microsoft certification badge

`assets/badges/microsoft-certified-associate.svg` is the *Microsoft Certified:
Power BI Data Analyst Associate* credential badge. It sits in the contact
section inside `.cert-card`, a link that carries the badge artwork, the
credential name, and a "Verify at Microsoft" affordance pointing at the official
`learn.microsoft.com/api/credentials/share/…` record.

Same rules apply: used as issued, never recoloured or restretched, and always
next to the verification link — the badge claims a credential, so it should
always be one click from the issuer's own proof of it. The `alt` text names the
credential in full, because unlike the LinkedIn and Proton marks it is not
decorative: it is the content.
