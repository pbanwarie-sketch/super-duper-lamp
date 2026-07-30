# Labelling AI-generated content

The site uses the European Commission's
[EU icons for labelling AI-generated content](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content),
downloaded from that page and used unmodified (the white variants, for a dark
background). The Commission publishes them for anyone to use freely, with no
attribution required.

- [This is voluntary, not compliance](#this-is-voluntary-not-compliance)
- [Where the labels appear](#where-the-labels-appear)
- [How the guidance's requirements are met](#how-the-guidances-requirements-are-met)
- [Changing the wording](#changing-the-wording)

## This is voluntary, not compliance

Nothing here falls inside the *mandatory* scope of AI Act Article 50, which
covers deepfakes and AI-generated text published to inform the public on matters
of public interest without human editorial review:

- the two photographs are real photographs, neither AI-generated nor
  AI-retouched;
- the pixel-art illustration is evidently an illustration, not content that
  would falsely appear authentic, and creative works are excepted in any case;
- the written text carries human editorial responsibility, which is exactly the
  exception Article 50 provides, and a personal portfolio is not a matter of
  public interest.

The Commission is explicit that "the use of these EU icons is optional, but the
labelling requirements under Article 50 AI Act are not." So the labelling here
is a transparency choice, applied only to what is genuinely AI-made. Labelling
the real photographs would be its own kind of misinformation, which is why the
disclosure states positively that they are real.

## Where the labels appear

| Where | What |
|---|---|
| On the pixel-art illustration | `AI GENERATED` badge, 28 px, top-right, over the artwork with nothing above it |
| Under the illustration | Plain-language caption plus a link to the disclosure |
| Above the footer | `AI` icon and a collapsed `<details>` itemising every asset either way |

Both icons are the white variants and stay on dark backgrounds in both themes:
the badge because its panel is a deliberate dark island, the footer icon on a
small dark chip in light mode. See [Theming](theming.md#what-the-light-palette-does-and-deliberately-doesnt).

## How the guidance's requirements are met

- *Perceivable at first exposure, embedded in the content, no intervening
  overlay* — the badge sits on the illustration itself, above the dot-grid.
- *Accompanied by a plain-language text label* — the caption beneath it.
- *Alt text, readable by assistive technology* — the badge carries real `alt`
  text; the footer icon is decorative next to its own heading, so it has
  `alt=""`.
- *A navigable secondary information layer* — the `<details>` disclosure, which
  is real markup in the page rather than something fetched or JS-rendered. The
  caption link opens it rather than dropping you beside a collapsed summary.

## Changing the wording

Each page's `ai` block in `tools/build.mjs` holds the badge alt text, the
caption, the summary, the itemised list and the source note, per language. Edit
there and rebuild — nothing about the labelling is written in the HTML by hand.

**If what is AI-made ever changes, that list is the thing to keep honest.**
