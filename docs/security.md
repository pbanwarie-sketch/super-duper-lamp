# Code scanning

CodeQL (GitHub default setup) runs on every push. **0 open alerts / 13 closed.**
Four hardening measures keep it there, all chosen so the built pages stay
byte-identical.

- [The four measures](#the-four-measures)
- [An editing hazard](#an-editing-hazard)
- [After a fresh export](#after-a-fresh-export)

## The four measures

**`tools/build.mjs` strips the bundler's script tags structurally.**
`dropRuntimeScripts` walks elements and copies or skips them, rather than doing
a regex `replace()`. Deleting a multi-character marker with `replace()` can
splice the surrounding text into a brand-new marker — CodeQL's
[incomplete multi-character sanitization](https://codeql.github.com/codeql-query-help/javascript/js-incomplete-multi-character-sanitization/),
which it flags *per call*, so even a replace-until-fixpoint loop stays flagged.
A scan that copies or skips whole elements has nothing to reassemble.

**The bundles' resource map becomes a DOM node after parsing**, not markup
spliced into the HTML string before it. The manifest-derived `window.__resources`
script is created with `createElement` + `textContent` and inserted first in
`<head>` — the same slot, so the script re-creation pass executes it at the same
point — but text set via `textContent` is never re-read as HTML, which is the
flow CodeQL flags as
[DOM text reinterpreted as HTML](https://codeql.github.com/codeql-query-help/javascript/js-xss-through-dom/).

**The bundles' template ships as an executable assignment**
(`window.__BUNDLER_TEMPLATE__ = "…"`) instead of a
`<script type="__bundler/template">` data island. Identical payload, but program
text sits in the same trust class as the runtime that consumes it, rather than
being document text re-parsed into markup.

**The bundles' nested-page relay never posts to `'*'`.** Where the document has
a real origin it addresses that origin (as before); in opaque contexts the
target is now `'/'` — same-origin-as-sender, which every legitimate hop is —
instead of a wildcard. The published pages never run any of this (the build
replaces the runtime), and these single-page bundles carry no nested pages, so
nothing observable changes.

## An editing hazard

The bundle runtime lives inside an inline `<script>` element, so **nothing in it
— not even a comment — may contain a literal script-closing tag.** The HTML
parser ends the element at the first one it sees, whatever the JavaScript
context, and the truncated runtime then fails with "Unexpected end of input".
This cost a full debugging session the first time; it is preserved here as a
warning.

## After a fresh export

Replacing `src-bundles/` with a fresh design-tool export still builds —
`readBundle` accepts both template forms — but the export arrives with the
*unhardened* runtime, so expect the `src-bundles/` alerts to reopen until the
three runtime patches above are reapplied.

Search the previous bundle for `__BUNDLER_TEMPLATE__`, `resourcesInit` and
`OWN_TARGET`, and mirror the edits into the new one.
