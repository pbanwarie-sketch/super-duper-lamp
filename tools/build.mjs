#!/usr/bin/env node
/**
 * Rebuilds the static site from the two self-extracting design-tool bundles in
 * `src-bundles/`. The bundles ship every asset as base64 inside one 1.6 MB HTML
 * file that only renders after React + a 70 KB runtime unpack it client-side;
 * this script does that unpacking once, at build time, and emits plain HTML,
 * one shared stylesheet, one small vanilla script, and real asset files.
 *
 *   node tools/build.mjs
 *
 * Everything under the repo root that this writes is generated — edit the
 * bundles (or this script), never the output.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src-bundles');
const ASSETS = path.join(ROOT, 'assets');

/**
 * Public base URL of the site — the single source for canonical, hreflang,
 * og:url, the sitemap, robots.txt, the 404 page's root-relative links, and the
 * CNAME file that tells GitHub Pages which custom domain to answer on.
 *
 * Moving to the apex domain also removes the /super-duper-lamp/ path prefix the
 * project-site URL had, which is why the 404 page's links are derived from this
 * rather than written out.
 */
const SITE = 'https://prashand.com/';

const PAGES = [
  {
    bundle: 'index.html',
    out: 'index.html',
    lang: 'en',
    alt: { href: 'nl.html', lang: 'nl' },
    title: 'Prashand Banwarie — Power BI Developer',
    description:
      'Prashand Arthur Banwarie — Power BI developer at KPN in The Hague. Ten years of turning HR and operational data into dashboards people actually open.',
    ogLocale: 'en_GB',
    roles: ['Power BI dashboards', 'self-service analytics', 'data people trust'],
    skipLink: 'Skip to main content',
    navLabel: 'Main',
    sectionsLabel: 'Sections',
    prevLabel: 'Previous phrase',
    nextLabel: 'Next phrase',
    imgAlt: {
      'hero-portrait': 'Prashand Banwarie',
      'about-photo': 'Prashand Banwarie at work on a Power BI report',
    },
    cert: {
      kicker: 'Microsoft Certified',
      name: 'Power BI Data Analyst Associate',
      verify: 'Verify at Microsoft',
      alt: 'Microsoft Certified: Power BI Data Analyst Associate badge',
    },
    theme: {
      label: 'Theme',
      toLight: 'Switch to the light theme',
      toDark: 'Switch to the dark theme',
    },
    ai: {
      badgeAlt: 'AI generated',
      caption: 'Illustration generated with AI',
      summary: 'How AI was used on this site',
      intro: 'Parts of this site were made with AI, and parts were not.',
      items: [
        ['Photographs', 'real photographs of me — not AI-generated and not AI-retouched.'],
        ['Pixel-art illustration', 'generated with AI.'],
        ['Written text', 'drafted with AI, then edited and approved by me.'],
        ['Design and layout', 'produced with an AI design tool.'],
      ],
      note:
        'Labelled with the EU icons for labelling AI-generated content, published by the European Commission. Their use is voluntary.',
      noteLink: 'About the EU icons',
    },
  },
  {
    bundle: 'nl.html',
    out: 'nl.html',
    lang: 'nl',
    alt: { href: 'index.html', lang: 'en' },
    title: 'Prashand Banwarie — Power BI-ontwikkelaar',
    description:
      'Prashand Arthur Banwarie — Power BI-ontwikkelaar bij KPN in Den Haag. Tien jaar HR- en operationele data omzetten in dashboards die mensen daadwerkelijk openen.',
    ogLocale: 'nl_NL',
    roles: ['Power BI-dashboards', 'self-service analytics', 'data die klopt'],
    skipLink: 'Naar de hoofdinhoud',
    navLabel: 'Hoofdmenu',
    sectionsLabel: 'Secties',
    prevLabel: 'Vorige zin',
    nextLabel: 'Volgende zin',
    imgAlt: {
      'hero-portrait': 'Prashand Banwarie',
      'about-photo': 'Prashand Banwarie aan het werk aan een Power BI-rapport',
    },
    cert: {
      kicker: 'Microsoft Gecertificeerd',
      name: 'Power BI Gegevensanalist Associate',
      verify: 'Verifieer bij Microsoft',
      alt: 'Microsoft Gecertificeerd: Power BI Gegevensanalist Associate badge',
    },
    theme: {
      label: 'Thema',
      toLight: 'Naar het lichte thema',
      toDark: 'Naar het donkere thema',
    },
    ai: {
      badgeAlt: 'AI generated',
      caption: 'Illustratie gegenereerd met AI',
      summary: 'Hoe AI op deze site is gebruikt',
      intro: 'Delen van deze site zijn met AI gemaakt, andere delen niet.',
      items: [
        ["Foto's", 'echte foto’s van mij — niet door AI gegenereerd en niet door AI bewerkt.'],
        ['Pixelart-illustratie', 'gegenereerd met AI.'],
        ['Tekst', 'opgesteld met AI en daarna door mij geredigeerd en goedgekeurd.'],
        ['Ontwerp en opmaak', 'gemaakt met een AI-ontwerptool.'],
      ],
      note:
        'Gelabeld met de EU-iconen voor het labelen van door AI gegenereerde content, gepubliceerd door de Europese Commissie. Het gebruik ervan is vrijwillig.',
      noteLink: 'Over de EU-iconen',
    },
  },
];

/**
 * The Microsoft Learn credential, referenced straight from the issuer rather
 * than through a badge platform. Two reasons that matters here: the site keeps
 * making zero third-party requests, and Microsoft's page reflects the
 * credential's *live* status — so the site never hard-codes an issue or expiry
 * date that can quietly go stale.
 *
 * The share link is locale-aware, so each language links to its own version.
 * Badge artwork is Microsoft's official "Certified Associate" shield, self-hosted.
 */
const CERT = {
  shareUrl: (locale) =>
    `https://learn.microsoft.com/api/credentials/share/${locale}/BanwariePrashand-2093/` +
    `EE55F1D6C38B2C99?sharingId=CE268806D33A9946`,
  locale: { en: 'en-us', nl: 'nl-nl' },
  badge: { src: 'assets/badges/microsoft-certified-associate.svg', w: 300, h: 300 },
};

/** Where the EU icon set and its guidance are published. */
const EU_ICONS_URL =
  'https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content';

// ─────────────────────────────────────────────────────────────── bundle reader

function readBundle(file) {
  const html = fs.readFileSync(path.join(SRC, file), 'utf8');
  const island = (type) => {
    const m = html.match(
      new RegExp(`<script type="__bundler/${type}">([\\s\\S]*?)</script>`)
    );
    if (!m) throw new Error(`${file}: missing __bundler/${type} island`);
    return m[1];
  };
  const manifest = JSON.parse(island('manifest'));
  const assets = {};
  for (const [uuid, e] of Object.entries(manifest)) {
    let bytes = Buffer.from(e.data, 'base64');
    if (e.compressed) bytes = zlib.gunzipSync(bytes);
    assets[uuid] = { mime: e.mime, bytes };
  }
  // The committed bundles carry the template as an executable assignment —
  // same JSON-escaped payload, but program text rather than a data island the
  // runtime would re-read out of the DOM (see "Code scanning" in README.md).
  // A fresh design-tool export still arrives in island form; accept both, so
  // a new export builds before its runtime hardening has been reapplied.
  const assigned = html.match(
    /<script>window\.__BUNDLER_TEMPLATE__ =\n([\s\S]*?);\n\s*<\/script>/
  );
  return { template: JSON.parse(assigned ? assigned[1] : island('template')), assets };
}

// ─────────────────────────────────────────────────────────────── asset writing

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
/** sha256 -> public path, so the two bundles share one copy of every asset. */
const written = new Map();

function writeAsset(relPath, bytes) {
  const key = sha(bytes);
  if (written.has(key)) return written.get(key);
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, bytes);
  written.set(key, relPath);
  return relPath;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Fonts arrive as bare uuids inside @font-face blocks. Name each file from the
 * family + unicode-range subset comment that precedes its block, so the output
 * is `jetbrains-mono-latin.woff2` rather than an opaque uuid.
 */
function fontNames(template) {
  const map = new Map();
  const re =
    /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{[^}]*?font-family:\s*'([^']+)'[^}]*?url\("([0-9a-f-]{36})"\)/g;
  for (const m of template.matchAll(re)) {
    map.set(m[3], `assets/fonts/${slug(m[2])}-${m[1]}.woff2`);
  }
  return map;
}

// ──────────────────────────────────────────────────────── small HTML utilities

/** Slices out `<tag …> … </tag>` starting at `from`, counting nesting. */
function sliceElement(html, tag, from) {
  const open = new RegExp(`<${tag}(\\s[^>]*)?>`, 'g');
  open.lastIndex = from;
  const start = open.exec(html);
  if (!start) return null;
  const scan = new RegExp(`<${tag}(?:\\s[^>]*)?>|</${tag}>`, 'g');
  scan.lastIndex = start.index;
  let depth = 0;
  let m;
  while ((m = scan.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) {
      return {
        start: start.index,
        end: scan.lastIndex,
        inner: html.slice(start.index + start[0].length, m.index),
      };
    }
  }
  throw new Error(`unbalanced <${tag}>`);
}

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Adds a class to an already-serialised opening tag. */
function addClass(tag, cls) {
  const has = tag.match(/\sclass="([^"]*)"/);
  if (has) return tag.replace(has[0], ` class="${has[1]} ${cls}"`);
  return tag.replace(/^<([a-zA-Z][\w-]*)/, `<$1 class="${cls}"`);
}

/**
 * Whitespace/comment-level CSS minifier, quote-aware so `content: " ▾"` and
 * font names survive. No property rewriting, no shorthand games — the rules
 * stay byte-recognisable next to the source in this file, just ~25% smaller
 * on the wire. Strings copy verbatim; comments drop; runs of whitespace
 * become one space, or nothing when either neighbour is a structural
 * character that doesn't need it.
 */
function minifyCss(css) {
  let out = '';
  let i = 0;
  const structural = '{};:,>';
  while (i < css.length) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== ch) j += css[j] === '\\' ? 2 : 1;
      out += css.slice(i, j + 1);
      i = j + 1;
    } else if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 2;
    } else if (/\s/.test(ch)) {
      let j = i;
      while (j < css.length && /\s/.test(css[j])) j++;
      const prev = out[out.length - 1];
      const next = css[j];
      if (prev && next && !structural.includes(prev) && !structural.includes(next)) out += ' ';
      i = j;
    } else {
      out += ch;
      i++;
    }
  }
  return out.replace(/;}/g, '}');
}

/**
 * Conservative slimming for the generated site.js: drop the leading block
 * comment, full-line // comments and indentation. Nothing token-level — no
 * renaming, no ASI bets — so the shipped file stays line-for-line debuggable.
 */
function slimJs(js) {
  return js
    .replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')
    .split('\n')
    .map((line) => line.replace(/^\s+/, ''))
    .filter((line) => line !== '' && !line.startsWith('//'))
    .join('\n');
}

/**
 * Drops the bundler's own <script> elements — the text/x-dc data islands and
 * the empty uuid-src loaders — by walking elements and rebuilding the string,
 * never by regex replacement. Deleting a multi-character marker with
 * replace() can splice the surrounding text into a brand-new marker (CodeQL's
 * js/incomplete-multi-character-sanitization, and a real property of
 * replace-with-empty); a scan that copies or skips whole elements has nothing
 * to reassemble. Like the HTML parser, each element ends at the first
 * </script> after it opens.
 */
function dropRuntimeScripts(html) {
  let out = '';
  let i = 0;
  for (;;) {
    const at = html.indexOf('<script', i);
    if (at < 0) return out + html.slice(i);
    const openEnd = html.indexOf('>', at);
    const closeAt = html.indexOf('</script>', at);
    if (openEnd < 0 || closeAt < 0) return out + html.slice(i);
    const open = html.slice(at, openEnd + 1);
    const end = closeAt + '</script>'.length;
    const ours =
      /^<script\s+type="text\/x-dc"/.test(open) ||
      (/^<script\s+src="[0-9a-f-]{36}">$/.test(open) && closeAt === openEnd + 1);
    out += html.slice(i, at);
    if (!ours) out += html.slice(at, end);
    i = end;
  }
}

// ──────────────────────────────────────── style-hover -> real stylesheet rules

/**
 * The runtime turned every `style-hover="…"` attribute into a generated class
 * whose declarations it marked !important. Same thing, but at build time and
 * shared by both pages: identical declaration blocks collapse to one class.
 */
const hoverClasses = new Map(); // "hover|css" -> class name

function hoverClass(pseudo, css) {
  const key = `${pseudo}|${css}`;
  let cls = hoverClasses.get(key);
  if (!cls) {
    cls = `x${hoverClasses.size.toString(36)}`;
    hoverClasses.set(key, cls);
  }
  return cls;
}

function importantify(css) {
  return css
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => (/!\s*important$/i.test(d) ? d : `${d} !important`))
    .join(';');
}

function hoverSheet() {
  return [...hoverClasses]
    .map(([key, cls]) => {
      const [pseudo, css] = [key.slice(0, key.indexOf('|')), key.slice(key.indexOf('|') + 1)];
      return `.${cls}:${pseudo}{${importantify(css)}}`;
    })
    .join('\n');
}

// ───────────────────────────────────────────────────────────────── brand marks

/**
 * Official LinkedIn and Proton Mail artwork, used unmodified.
 *
 *   [in] bug   https://brand.linkedin.com/downloads  (in-logo.zip -> LI-In-Bug.png)
 *   Proton Mail badge
 *              https://proton.me/media/kit -> the same badge Proton serves on
 *              proton.me, mail-badge.svg
 *
 * The rules that shape the markup below:
 *  - LinkedIn requires the [in] bug to be at least 21 px tall on screen and
 *    forbids changing its colour or shape. So the mark is never recoloured, and
 *    display size is set with height + width:auto rather than by writing a
 *    rounded width into the attributes, which would squash it by ~1%.
 *  - The width/height attributes carry the artwork's true pixel ratio purely so
 *    the browser can reserve the right box before the image loads.
 *  - The marks sit next to a text label that already names the destination, so
 *    they are decorative: alt="" keeps a screen reader from saying "LinkedIn"
 *    twice.
 */
const MARK_PX = 21; // LinkedIn's stated on-screen minimum for the [in] bug

const MARKS = {
  linkedin: { src: 'assets/brand/linkedin-bug.png', w: 635, h: 540 },
  proton: { src: 'assets/brand/proton-mail-badge.svg', w: 36, h: 36 },
};

function mark(which, px = MARK_PX) {
  const m = MARKS[which];
  return (
    `<img src="${m.src}" alt="" width="${m.w}" height="${m.h}" ` +
    `style="height:${px}px;width:auto;flex:none">`
  );
}

// ────────────────────────────────────────────────────────────── navigation CSS

/**
 * --nav-h is the height of the sticky bar. scroll-padding-top on the scrolling
 * element is what makes a fragment link stop short of it instead of sliding the
 * section underneath; without it the browser puts the section's top edge at
 * y=0, which is precisely where the bar is. The values here are the fallback —
 * site.js measures the real bar and overwrites the variable, so a wrapped bar
 * or a different font metric can't reintroduce the overlap.
 */
const NAV_CSS = `
:root{--nav-h:57px;--tabbar-h:54px}
html{scroll-padding-top:calc(var(--nav-h) + 18px)}

/* Sticky lives on the landmark, not on the <nav> it wraps — see build.mjs. */
.site-header{position:sticky;top:0;z-index:50}

/* The page wrapper ships overflow-x:hidden inline to contain the marquee. But
   an element with overflow other than visible becomes the scroll container for
   its sticky descendants, and this one never scrolls — so the bar could not
   pin, and scrolled away with the page. overflow:clip clips exactly the same
   way without creating a scroll container. Browsers too old to know the
   keyword drop this declaration and keep today's behaviour. */
.page-wrap{overflow-x:clip !important}

.scroll-progress{position:fixed;top:0;left:0;right:0;height:2px;z-index:60;pointer-events:none}
.scroll-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2E7DFF,#63A2FF)}

.nav-link{position:relative}
.nav-link.is-active{color:#EDF1FA !important}
.nav-link.is-active::after{content:"";position:absolute;left:0;right:0;bottom:-7px;height:2px;border-radius:2px;background:#2E7DFF}

/* Desktop keeps the links in the top bar; the tab bar is a small-screen thing. */
.tabbar{display:none}

@media (max-width:900px){
  :root{--nav-h:52px}
  /* The four section links move to the bottom bar, which is what stops the top
     bar wrapping to two rows and reclaims ~35px of every phone viewport. */
  .site-nav .nav-link{display:none !important}
  .tabbar{
    display:grid;grid-auto-flow:column;grid-auto-columns:1fr;
    position:fixed;left:0;right:0;bottom:0;z-index:60;
    background:rgba(5,8,15,.93);backdrop-filter:blur(14px);
    border-top:1px solid rgba(255,255,255,.08);
    padding-bottom:env(safe-area-inset-bottom,0px);
  }
  .tab{
    display:flex;align-items:center;justify-content:center;
    min-height:var(--tabbar-h);padding:6px 4px;
    border-top:2px solid transparent;
    font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.08em;
    line-height:1.2;text-align:center;text-transform:uppercase;color:#6E7994;
  }
  .tab.is-active{color:#63A2FF;border-top-color:#2E7DFF;background:rgba(46,125,255,.09)}
  /* Nothing should end up permanently underneath the bar. */
  .site-footer{padding-bottom:calc(24px + var(--tabbar-h) + env(safe-area-inset-bottom,0px)) !important}
  html{scroll-padding-bottom:calc(var(--tabbar-h) + 12px)}
}
`.trim();

// ───────────────────────────────────────────────── EU AI-content labelling

/**
 * The European Commission's icons for labelling AI-generated content:
 * https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content
 * Published for anyone to use freely, no attribution required, and used here
 * unmodified (white variants, for a dark page).
 *
 * Nothing on this site falls inside Article 50's *mandatory* scope — the
 * photographs are real, the illustration is evidently an illustration rather
 * than a deepfake, and the text carries human editorial responsibility. The
 * icons are voluntary, so this is a transparency choice. It is deliberately
 * applied only to what is genuinely AI-made: labelling the real photographs
 * would be its own kind of misinformation.
 *
 * What the guidance asks of a label, and where each is handled:
 *  - perceivable at first exposure, embedded in the content, nothing overlaying
 *    it  -> the badge sits on the illustration itself, above the dot-grid
 *  - accompanied by a plain-language text label  -> the caption under it
 *  - alt text / readable by assistive technology  -> alt on the badge image
 *  - a navigable secondary information layer  -> the <details> disclosure that
 *    the caption links to, which itemises every asset either way
 */
const EU_AI_ICONS = {
  generated: { src: 'assets/eu-ai/ai-generated-white.svg', w: 1789.84, h: 566.93 },
  basic: { src: 'assets/eu-ai/ai-white.svg', w: 566.93, h: 566.93 },
};

function euIcon(which, px, alt) {
  const i = EU_AI_ICONS[which];
  return (
    `<img src="${i.src}" alt="${esc(alt)}" width="${Math.round(i.w)}" height="${Math.round(i.h)}" ` +
    `style="height:${px}px;width:auto;flex:none;display:block">`
  );
}

const CERT_CSS = `
/* Microsoft certification, linked to the issuer's own credential page. */
/* align-self keeps the card from being stretched to the full column width by
   its flex-column parent, which turns it into a banner. */
.cert-card{display:inline-flex;align-self:flex-start;align-items:center;gap:16px;
  margin-top:14px;padding:14px 20px 14px 16px;
  border:1px solid rgba(46,125,255,.28);border-radius:14px;background:rgba(46,125,255,.06);
  max-width:100%;text-decoration:none}
.cert-card:hover{border-color:rgba(46,125,255,.55);background:rgba(46,125,255,.1)}
.cert-card img{height:56px;width:auto;flex:none;display:block}
.cert-text{display:flex;flex-direction:column;gap:5px;min-width:0}
.cert-kicker{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.2em;color:#6E7994;text-transform:uppercase}
.cert-name{font-size:16px;font-weight:600;line-height:1.3;color:#F3F6FD;text-wrap:balance}
.cert-verify{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:#63A2FF;text-transform:uppercase}
.cert-card:hover .cert-verify{color:#A8C8FF}

@media (max-width:900px){
  .cert-card{gap:13px;padding:13px 16px}
  .cert-card img{height:46px}
  .cert-name{font-size:15px}
}
`.trim();

const EU_AI_CSS = `
/* Sits on the illustration, over the dot-grid but under nothing. */
.ai-badge{position:absolute;top:16px;right:16px;z-index:3}
.ai-caption{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin-top:14px;position:relative;
  font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8B94AA}
.ai-caption a{color:#63A2FF;text-decoration:underline;text-underline-offset:3px}

.ai-disclosure{padding:26px 72px 30px;background:#05080F;border-top:1px solid rgba(255,255,255,.06)}
.ai-disclosure-inner{display:flex;align-items:flex-start;gap:16px;max-width:1280px;margin:0 auto}
.ai-disclosure summary{cursor:pointer;list-style:none;
  font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#EDF1FA}
.ai-disclosure summary::-webkit-details-marker{display:none}
.ai-disclosure summary::after{content:" ▾";color:#2E7DFF}
.ai-disclosure details[open] summary::after{content:" ▴"}
.ai-disclosure p{margin:10px 0 0;font-size:14px;line-height:1.6;color:#98A1B6;max-width:70ch}
.ai-disclosure ul{margin:12px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.ai-disclosure li{font-size:14px;line-height:1.6;color:#98A1B6;max-width:70ch}
.ai-disclosure li b{color:#EDF1FA;font-weight:600}
.ai-disclosure .ai-source{margin-top:14px;font-size:12px;line-height:1.6;color:#6E7994;max-width:70ch}
.ai-disclosure .ai-source a{color:#63A2FF}

@media (max-width:900px){
  .ai-disclosure{padding:22px 20px 26px}
  .ai-badge{top:10px;right:10px}
}
`.trim();

const BRAND_CSS = `
/* Official LinkedIn / Proton Mail marks. The generous left padding the pills
   already had doubles as the clear space both brands ask for. */
.brand-link{display:inline-flex !important;align-items:center;gap:10px}
.brand-pair{display:flex;align-items:center;gap:14px}
`.trim();

// ─────────────────────────────────────────────── light theme (build-time layer)

/**
 * The design ships one hard-coded dark palette, written into hundreds of inline
 * style attributes and every CSS block above. Theming it by hand would mean a
 * second copy of the markup, so the build does it the same way it handles
 * responsiveness: as a transform. Every colour literal below is rewritten to a
 * CSS custom property whose default (`:root`) value is byte-identical to the
 * literal it replaced — so the dark page renders exactly as before — and a
 * light block swaps the values when the visitor prefers or picks light.
 *
 * Selection order: an explicit choice (`data-theme` on <html>, set by the nav
 * toggle and remembered in localStorage, applied pre-paint by a two-line head
 * script) wins; otherwise `prefers-color-scheme` decides; otherwise dark.
 *
 * Two deliberate exceptions:
 *  - `.art-panel` (the pixel-art illustration) re-declares every token at its
 *    dark value, unconditionally. The scene is AI-generated artwork drawn for a
 *    dark backdrop, and its white EU "AI GENERATED" badge is the Commission's
 *    white variant, correct only on dark — so the panel stays a dark island in
 *    both themes, like a framed print on a gallery wall.
 *  - the footer disclosure's small white EU icon sits on a dark chip in light
 *    mode (see lightOnly() below): the official white artwork, unmodified, on
 *    the dark background it is published for — just a local one.
 *
 * Contrast: every text token's light value clears WCAG AA (≥ 4.5:1) on the
 * surfaces it appears against; `--accent-text` exists because #2E7DFF is only
 * 3.7:1 on white, so wherever the accent is *text* (`color:`), light mode
 * darkens it to the same-hue #1A5FD6 while buttons and hairlines keep the
 * exact brand blue.
 */
const THEME = [
  // [token, matched literal (null = via the color: split), dark, light]
  ['accent-text', null, '#2E7DFF', '#1A5FD6'],
  ['accent', '#2E7DFF', '#2E7DFF', '#2E7DFF'],
  ['link', '#63A2FF', '#63A2FF', '#1A5FD6'],
  ['link-hover', '#A8C8FF', '#A8C8FF', '#134DB8'],
  ['accent-hi', '#4B90FF', '#4B90FF', '#1D66E0'],

  // surfaces
  ['bg', '#05080F', '#05080F', '#FFFFFF'],
  ['bg-2', '#070B14', '#070B14', '#EEF2F8'],
  ['card', '#0B1120', '#0B1120', '#F4F7FB'],
  ['chip', '#0B1B3A', '#0B1B3A', '#DCE9FF'],
  ['frost', 'rgba(5,8,15,.82)', 'rgba(5,8,15,.82)', 'rgba(255,255,255,.82)'],
  ['frost-2', 'rgba(5,8,15,.93)', 'rgba(5,8,15,.93)', 'rgba(255,255,255,.93)'],
  ['fade-85', 'rgba(5,8,15,.85)', 'rgba(5,8,15,.85)', 'rgba(238,242,248,.85)'],
  ['fade-0', 'rgba(5,8,15,0)', 'rgba(5,8,15,0)', 'rgba(238,242,248,0)'],
  ['scrim-78', 'rgba(7,11,20,.78)', 'rgba(7,11,20,.78)', 'rgba(238,242,248,.82)'],
  ['scrim-05', 'rgba(7,11,20,.05)', 'rgba(7,11,20,.05)', 'rgba(238,242,248,.05)'],
  ['scrim-0', 'rgba(7,11,20,0)', 'rgba(7,11,20,0)', 'rgba(238,242,248,0)'],

  // text (dark page: light-on-dark tiers; light page: AA-checked navies)
  ['ink', '#F3F6FD', '#F3F6FD', '#0B1526'],
  ['text', '#EDF1FA', '#EDF1FA', '#16233A'],
  ['body', '#9AA3B8', '#9AA3B8', '#3F4F6B'],
  ['body-2', '#98A1B6', '#98A1B6', '#42526E'],
  ['muted', '#8B94AA', '#8B94AA', '#4A5872'],
  ['muted-2', '#6E7994', '#6E7994', '#56637D'],
  ['muted-3', '#5D6883', '#5D6883', '#5D6A85'],
  ['sep', '#3A4358', '#3A4358', '#B6C2D4'],

  // hairlines and card strokes: white-alpha on dark, navy-alpha on light
  ['edge-05', 'rgba(255,255,255,.05)', 'rgba(255,255,255,.05)', 'rgba(13,34,63,.07)'],
  ['edge-06', 'rgba(255,255,255,.06)', 'rgba(255,255,255,.06)', 'rgba(13,34,63,.08)'],
  ['edge-07', 'rgba(255,255,255,.07)', 'rgba(255,255,255,.07)', 'rgba(13,34,63,.09)'],
  ['edge-08', 'rgba(255,255,255,.08)', 'rgba(255,255,255,.08)', 'rgba(13,34,63,.1)'],
  ['edge-10', 'rgba(255,255,255,.1)', 'rgba(255,255,255,.1)', 'rgba(13,34,63,.13)'],
  ['edge-12', 'rgba(255,255,255,.12)', 'rgba(255,255,255,.12)', 'rgba(13,34,63,.15)'],
  ['edge-14', 'rgba(255,255,255,.14)', 'rgba(255,255,255,.14)', 'rgba(13,34,63,.17)'],
  ['edge-16', 'rgba(255,255,255,.16)', 'rgba(255,255,255,.16)', 'rgba(13,34,63,.19)'],
  ['edge-30', 'rgba(255,255,255,.3)', 'rgba(255,255,255,.3)', 'rgba(13,34,63,.34)'],
  ['shadow', 'rgba(0,0,0,.9)', 'rgba(0,0,0,.9)', 'rgba(23,43,77,.2)'],

  // brand-blue tints (glows, chip fills, borders): nudged up on white, where a
  // tint reads weaker than on near-black
  ['tint-06', 'rgba(46,125,255,.06)', 'rgba(46,125,255,.06)', 'rgba(46,125,255,.08)'],
  ['tint-08', 'rgba(46,125,255,.08)', 'rgba(46,125,255,.08)', 'rgba(46,125,255,.1)'],
  ['tint-09', 'rgba(46,125,255,.09)', 'rgba(46,125,255,.09)', 'rgba(46,125,255,.12)'],
  ['tint-10', 'rgba(46,125,255,.1)', 'rgba(46,125,255,.1)', 'rgba(46,125,255,.13)'],
  ['tint-14', 'rgba(46,125,255,.14)', 'rgba(46,125,255,.14)', 'rgba(46,125,255,.17)'],
  ['tint-20', 'rgba(46,125,255,.2)', 'rgba(46,125,255,.2)', 'rgba(46,125,255,.22)'],
  ['tint-28', 'rgba(46,125,255,.28)', 'rgba(46,125,255,.28)', 'rgba(46,125,255,.32)'],
  ['tint-30', 'rgba(46,125,255,.3)', 'rgba(46,125,255,.3)', 'rgba(46,125,255,.34)'],
  ['tint-35', 'rgba(46,125,255,.35)', 'rgba(46,125,255,.35)', 'rgba(46,125,255,.38)'],
  ['tint-40', 'rgba(46,125,255,.4)', 'rgba(46,125,255,.4)', 'rgba(46,125,255,.42)'],
  ['tint-45', 'rgba(46,125,255,.45)', 'rgba(46,125,255,.45)', 'rgba(46,125,255,.5)'],
  ['tint-50', 'rgba(46,125,255,.5)', 'rgba(46,125,255,.5)', 'rgba(46,125,255,.55)'],
  ['tint-55', 'rgba(46,125,255,.55)', 'rgba(46,125,255,.55)', 'rgba(46,125,255,.6)'],
  ['tint-85', 'rgba(46,125,255,.85)', 'rgba(46,125,255,.85)', 'rgba(46,125,255,.85)'],
];

/** The two page backgrounds, for <meta name="theme-color"> and site.js. */
const THEME_COLOR = { dark: '#05080F', light: '#FFFFFF' };

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Rewrites every known colour literal in a CSS string to its var(). The
 * `color:` split runs first, because `--accent-text` shares its dark literal
 * with `--accent`: wherever #2E7DFF is the *text* colour it must become the
 * token that darkens on light. The guard before "color" keeps
 * `border-color:#2E7DFF` in the generic accent bucket.
 */
function themeifyCss(css) {
  let out = css.replace(
    /(^|[{;"'\s])color\s*:\s*#2E7DFF(?![0-9A-Fa-f])/gi,
    '$1color:var(--accent-text)'
  );
  for (const [token, literal] of THEME) {
    if (!literal) continue;
    const re = literal.startsWith('#')
      ? new RegExp(`${escRe(literal)}(?![0-9A-Fa-f])`, 'gi')
      : new RegExp(escRe(literal), 'gi');
    out = out.replace(re, `var(--${token})`);
  }
  return out;
}

/**
 * Same rewrite for a page, but scoped to style="…" attributes. SVG presentation
 * attributes (the pixel-art scene's fill="…") are deliberately left alone:
 * fill attributes cannot carry var(), and the artwork's colours are content,
 * not chrome — they should not follow the theme.
 */
function themeifyHtml(html) {
  return html.replace(/style="([^"]*)"/g, (all, css) => `style="${themeifyCss(css)}"`);
}

/**
 * The build's usual posture: fail loudly rather than ship a half-themed page.
 * Any colour literal that survives the rewrite is one the THEME table doesn't
 * know — a fresh design export with a new colour lands here, not in
 * production. #fff is the one allowed literal: it only ever sits on the brand
 * blue (buttons, ::selection, skip link), which is identical in both themes.
 */
function assertThemed(what, str) {
  const raw = str.match(/#(?!fff\b)[0-9a-fA-F]{3,8}\b|rgba?\(/g);
  if (raw) {
    throw new Error(`${what}: unthemed colour literal(s): ${[...new Set(raw)].join(', ')}`);
  }
}

function assertThemedHtml(what, html) {
  for (const m of html.matchAll(/style="([^"]*)"/g)) assertThemed(what, m[1]);
}

/** Every token at its dark value — :root, and the .art-panel dark island. */
const darkVars = THEME.map(([t, , d]) => `--${t}:${d}`).join(';');
const lightVars = THEME.map(([t, , , l]) => `--${t}:${l}`).join(';');

/**
 * Light-mode-only rules, emitted under both selectors that can mean "light".
 *  - the toggle shows the moon (i.e. "you are in light; click for dark")
 *  - the EU 'AI' footer icon is the white variant, so light mode gives it the
 *    dark chip it is designed for rather than swapping in artwork we don't have
 */
const lightOnly = (s) =>
  `
${s} .tt-sun{display:none}
${s} .tt-moon{display:block}
${s} .ai-disclosure-inner>img{background:#0B1B33;border-radius:7px;padding:4px}
`.trim();

const THEME_CSS = `
:root{${darkVars}}
html[data-theme="light"]{${lightVars}}
${lightOnly('html[data-theme="light"]')}
@media (prefers-color-scheme: light){
  html:not([data-theme="dark"]){${lightVars}}
${lightOnly('html:not([data-theme="dark"])')}
}

/* The pixel-art panel keeps the dark palette in both themes — see above. */
.art-panel{${darkVars}}

/* The sun/moon button, last in the nav's link row. Inert without JS. The
   negative block margin keeps its 30px circle from setting the row's height:
   the bar stays the 57px (52px on phones) it measured before the button
   existed, so the theme layer moves nothing in the dark rendering. */
.theme-toggle{display:inline-flex;align-items:center;justify-content:center;
  width:30px;height:30px;margin:-6px 0;padding:0;flex:none;cursor:pointer;
  border:1px solid var(--edge-12);border-radius:999px;background:none;color:var(--muted-2)}
.theme-toggle:hover{color:var(--accent-text);border-color:var(--tint-45)}
.theme-toggle .tt-sun{display:block}
.theme-toggle .tt-moon{display:none}
html:not(.js) .theme-toggle{display:none}
`.trim();

const TT_SUN =
  '<svg class="tt-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="4"/>' +
  '<path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2"/></svg>';
const TT_MOON =
  '<svg class="tt-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M20.4 14.2A8.5 8.5 0 0 1 9.8 3.6a8.5 8.5 0 1 0 10.6 10.6Z"/></svg>';

function themeToggle(page) {
  const th = page.theme;
  return (
    `<button type="button" class="theme-toggle" aria-label="${esc(th.label)}" ` +
    `data-to-light="${esc(th.toLight)}" data-to-dark="${esc(th.toDark)}">` +
    `${TT_SUN}${TT_MOON}</button>`
  );
}

/**
 * Applied before first paint so a remembered choice can't flash the other
 * theme. Kept to one statement; a storage failure (private mode) just means
 * the OS preference decides.
 */
const THEME_BOOT =
  `<script>(function(){try{var t=localStorage.getItem('theme');` +
  `if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()</script>`;

// ──────────────────────────────────────────────────────── responsive + a11y CSS

/**
 * The design ships zero media queries and zero reduced-motion handling: every
 * measurement is a hard-coded desktop pixel value in an inline style attribute.
 * Inline styles outrank any selector, so the only way to adapt them without
 * rewriting 800 lines of markup is a targeted !important layer. Attribute
 * selectors do the generic work (any multi-column grid collapses to one
 * column); build-injected classes handle the few one-off absolute positions.
 */
const RESPONSIVE_CSS = `
/* ── shared behaviour ─────────────────────────────────────────────────── */
.skip-link{position:absolute;left:-9999px;top:0;z-index:100;padding:12px 20px;background:#2E7DFF;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.16em}
.skip-link:focus{left:0}
:focus-visible{outline:2px solid #63A2FF;outline-offset:3px}
img{max-width:100%}

/* Reveal-on-scroll only exists once JS has confirmed it can undo it, so a
   no-JS visitor never meets a permanently invisible section. */
.js [data-reveal]{opacity:0;transform:translateY(22px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
.js [data-reveal].is-visible{opacity:1;transform:none}

/* ── phones and small tablets ─────────────────────────────────────────── */
@media (max-width:900px){
  [style*="grid-template-columns"]{grid-template-columns:minmax(0,1fr) !important}
  .site-nav{padding:14px 20px !important;gap:14px !important}
  .site-nav .nav-links{gap:18px !important;flex-wrap:wrap !important;justify-content:flex-end !important}
  .sec{padding-left:20px !important;padding-right:20px !important;padding-top:72px !important;padding-bottom:72px !important}
  .hero{min-height:0 !important}
  .hero-copy{padding:64px 20px !important;max-width:none !important}
  .hero-media{min-height:320px !important;height:62vw !important}
  .story-col{padding-bottom:0 !important}
  .story-photo{height:auto !important;aspect-ratio:1 !important;border-radius:24px !important}
  /* The skills card is pinned at left:101px;top:535px on desktop — on a phone
     it has to rejoin the flow or it lands on top of the paragraph below it. */
  .skills-card{position:static !important;width:auto !important;max-width:none !important;margin-top:20px !important;left:auto !important;top:auto !important}
  /* Longhands on purpose: the padding-bottom that keeps the footer clear of the
     bottom tab bar lives in the navigation layer, and a shorthand here would
     silently overwrite it. */
  .site-footer{padding-top:24px !important;padding-left:20px !important;padding-right:20px !important}
  .role-nav{padding-top:10px !important}
  .hero-cta{flex-wrap:wrap !important}
  .wrap-label{white-space:normal !important}
  .hero-fade-x{background:linear-gradient(180deg,#070B14 0%,rgba(7,11,20,0) 34%) !important}
}
@media (max-width:520px){
  .sec{padding-top:56px !important;padding-bottom:56px !important}
  .hero-copy{padding:48px 20px !important}
}

/* ── respect the OS motion setting ────────────────────────────────────── */
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
  .js [data-reveal]{opacity:1 !important;transform:none !important}
}
`.trim();

// ────────────────────────────────────────────────────────── the vanilla runtime

/**
 * Replaces React + ReactDOM + the 70 KB design runtime (≈276 KB of JavaScript)
 * with the two behaviours the page actually uses.
 */
const SITE_JS = `
/* Rotating headline + reveal-on-scroll. Progressive enhancement only: with
   JavaScript off the page keeps its server-rendered first phrase and every
   section stays visible. */
(function () {
  'use strict';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── rotating headline ───────────────────────────────────────────────────
  var typed = document.getElementById('typed');
  var counter = document.getElementById('role-counter');
  if (typed) {
    var roles = JSON.parse(typed.getAttribute('data-roles'));
    var i = 0, phase = 'hold', chars = roles[0].length, timer = null;

    function paint() {
      typed.textContent = roles[i].slice(0, chars);
      if (counter) counter.textContent = (i + 1) + ' / ' + roles.length;
    }

    function tick() {
      var full = roles[i], wait = 165;
      if (phase === 'type') {
        if (chars >= full.length) { phase = 'hold'; wait = 5200; }
        else chars++;
      } else if (phase === 'hold') {
        phase = 'erase'; wait = 120;
      } else if (chars <= 0) {
        i = (i + 1) % roles.length; phase = 'type'; wait = 700;
      } else {
        chars--; wait = 85;
      }
      paint();
      timer = setTimeout(tick, wait);
    }

    function jump(dir) {
      clearTimeout(timer);
      i = (i + dir + roles.length) % roles.length;
      chars = roles[i].length;
      phase = 'hold';
      paint();
      if (!reduced) timer = setTimeout(tick, 6000);
    }

    var prev = document.getElementById('role-prev');
    var next = document.getElementById('role-next');
    if (prev) prev.addEventListener('click', function () { jump(-1); });
    if (next) next.addEventListener('click', function () { jump(1); });
    if (!reduced) timer = setTimeout(tick, 1200);
  }

  // ── section navigation ──────────────────────────────────────────────────
  var nav = document.querySelector('.site-nav');
  var navLinks = [].slice.call(document.querySelectorAll('[data-nav]'));
  var bar = document.querySelector('.scroll-progress i');
  var ids = [];
  navLinks.forEach(function (a) {
    var id = a.getAttribute('data-nav');
    if (ids.indexOf(id) < 0 && document.getElementById(id)) ids.push(id);
  });

  // The CSS fallback for --nav-h is a guess; this is the measurement. Without
  // it a wrapped bar or a slow font would put the bar back over the heading a
  // fragment link just jumped to.
  function measureNav() {
    if (nav) {
      document.documentElement.style.setProperty('--nav-h', Math.round(nav.offsetHeight) + 'px');
    }
  }

  var queued = false;
  function paintNav() {
    queued = false;
    var y = window.pageYOffset;
    var doc = document.documentElement;

    if (bar) {
      var max = doc.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0) + '%';
    }

    // A section counts as current once its top passes just below the bar.
    var line = y + (nav ? nav.offsetHeight : 0) + 24;
    var current = null;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top + y <= line) current = id;
    });
    // The last section is usually too short to ever reach the line, so the
    // bottom of the page claims it.
    if (y + window.innerHeight >= doc.scrollHeight - 2 && ids.length) current = ids[ids.length - 1];

    navLinks.forEach(function (a) {
      var on = a.getAttribute('data-nav') === current;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  function onScroll() {
    if (!queued) { queued = true; window.requestAnimationFrame(paintNav); }
  }

  // After a fragment jump, hand focus to the section so keyboard and screen
  // reader users carry on from there rather than from the top of the document.
  // preventScroll keeps this from fighting the smooth scroll already running.
  function focusSection() {
    var id = location.hash.slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
  }

  // Following the illustration's label to the disclosure should reveal it, not
  // drop you next to a collapsed summary you then have to find and click.
  function openIfTargeted() {
    if (location.hash !== '#ai-disclosure') return;
    var box = document.querySelector('#ai-disclosure details');
    if (box) box.open = true;
  }

  measureNav();
  openIfTargeted();
  paintNav();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measureNav(); onScroll(); });
  window.addEventListener('hashchange', function () { openIfTargeted(); focusSection(); onScroll(); });
  if (location.hash) setTimeout(focusSection, 0);

  // ── theme toggle ────────────────────────────────────────────────────────
  // The stylesheet already resolves the theme (explicit data-theme beats the
  // OS preference, dark is the default); this only flips the attribute,
  // remembers the choice, and keeps the theme-color metas and the button's
  // label in step. The head script applied any stored choice before paint.
  var themeBtn = document.querySelector('.theme-toggle');
  var mqlLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
  var THEME_BG = { dark: '${THEME_COLOR.dark}', light: '${THEME_COLOR.light}' };

  function themeNow() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return mqlLight && mqlLight.matches ? 'light' : 'dark';
  }

  function paintTheme() {
    var t = themeNow();
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var m = 0; m < metas.length; m++) metas[m].setAttribute('content', THEME_BG[t]);
    if (themeBtn) {
      themeBtn.setAttribute(
        'aria-label',
        themeBtn.getAttribute(t === 'dark' ? 'data-to-light' : 'data-to-dark')
      );
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = themeNow() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (err) {}
      paintTheme();
    });
  }
  if (mqlLight && mqlLight.addEventListener) mqlLight.addEventListener('change', paintTheme);
  paintTheme();

  // ── reveal on scroll ────────────────────────────────────────────────────
  var els = [].slice.call(document.querySelectorAll('[data-reveal]'));
  function showAll() { els.forEach(function (el) { el.classList.add('is-visible'); }); }
  if (reduced || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
    // Failsafe: nothing stays hidden for longer than four seconds, whatever
    // the observer thinks.
    setTimeout(showAll, 4000);
  }
})();
`.trim();

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#05080F"/>
  <path d="M20 46V18h13a9 9 0 0 1 0 18h-6" fill="none" stroke="#2E7DFF" stroke-width="6" stroke-linecap="square"/>
</svg>
`;

// ──────────────────────────────────────────────────────────── page conversion

function buildPage(page, cssParts) {
  const { template, assets } = readBundle(page.bundle);
  const fonts = fontNames(template);

  // 1. Assets: fonts and images to disk, everything else (React, the design
  //    runtime, the image-slot component) is dropped outright.
  const assetPath = new Map();
  for (const [uuid, a] of Object.entries(assets)) {
    if (a.mime === 'font/woff2') {
      assetPath.set(uuid, writeAsset(fonts.get(uuid), a.bytes));
    } else if (a.mime.startsWith('image/')) {
      assetPath.set(uuid, null); // resolved below, named after its slot
    }
  }

  // 2. Lift <helmet> (the runtime's "move these into <head>" box) out of body.
  const helmet = sliceElement(template, 'helmet', 0);
  if (!helmet) throw new Error(`${page.bundle}: no <helmet>`);
  let body = template.slice(0, helmet.start) + template.slice(helmet.end);

  // The bundle self-hosts every font file, yet still preconnects to Google's
  // font CDN — a DNS + TLS round trip that can never be used, plus a
  // third-party request on a page that otherwise makes none.
  const css = [...helmet.inner.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => m[1])
    .join('\n')
    .replace(/url\("([0-9a-f-]{36})"\)/g, (all, uuid) => {
      const p = assetPath.get(uuid);
      if (!p) throw new Error(`unmapped font ${uuid}`);
      return `url("${path.posix.relative('assets', p)}")`;
    });
  cssParts.push(css.trim());

  // 3. Unwrap <x-dc> and drop the runtime's own script tags.
  const xdc = sliceElement(body, 'x-dc', 0);
  if (!xdc) throw new Error(`${page.bundle}: no <x-dc>`);
  body = xdc.inner;

  // 4. sc-if: the runtime picked a hero variant from the `heroMode` prop, whose
  //    default is "portrait". Bake that choice in — the branches are mutually
  //    exclusive, so shipping both would render two heroes.
  for (let guard = 0; guard < 10; guard++) {
    const el = sliceElement(body, 'sc-if', 0);
    if (!el) break;
    const tag = body.slice(el.start, el.start + body.slice(el.start).indexOf('>') + 1);
    const keep = /heroPortrait/.test(tag);
    body = body.slice(0, el.start) + (keep ? el.inner : '') + body.slice(el.end);
  }

  // 5. <image-slot> was a drag-and-drop placeholder for the design tool. In a
  //    published page it is just an image — and one that needs alt text,
  //    intrinsic dimensions (so it cannot shift layout) and lazy loading.
  body = body.replace(/<image-slot\b([^>]*)><\/image-slot>/g, (all, attrs) => {
    const get = (n) => (attrs.match(new RegExp(`${n}="([^"]*)"`)) || [])[1];
    const id = (get('id') || '').replace(/-nl$/, '');
    const uuid = get('src');
    const a = assets[uuid];
    if (!a) throw new Error(`image-slot ${id}: unknown src ${uuid}`);
    // The export carries the photos at editing quality (~680 KB for a photo
    // shown at 370 px) — the whole mobile LCP budget. tools/img-overrides/
    // holds the same pictures recompressed (mozjpeg q80, identical pixels
    // and dimensions — see "Performance" in README.md); when an override
    // exists it ships instead. Dimensions must match: the og:image size and
    // the intrinsic width/height attributes are derived from what ships.
    const overridePath = path.join(ROOT, 'tools/img-overrides', `${id}.jpg`);
    let bytes = a.bytes;
    if (fs.existsSync(overridePath)) {
      const override = fs.readFileSync(overridePath);
      const od = jpegSize(override);
      const bd = jpegSize(a.bytes);
      if (od.w !== bd.w || od.h !== bd.h) {
        throw new Error(
          `image override ${id}: ${od.w}x${od.h} does not match the export's ${bd.w}x${bd.h}`
        );
      }
      bytes = override;
    }
    const dim = jpegSize(bytes);
    const file = writeAsset(`assets/img/${id}.jpg`, bytes);
    assetPath.set(uuid, file);
    const alt = page.imgAlt[id];
    if (!alt) throw new Error(`no alt text configured for image slot "${id}"`);
    return (
      `<img src="${file}" alt="${esc(alt)}" width="${dim.w}" height="${dim.h}" ` +
      `${id === 'hero-portrait' ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'} ` +
      `style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
    );
  });

  // 6. style-hover -> generated classes in the shared stylesheet.
  body = body.replace(/\s+style-([a-z]+)="([^"]*)"/g, (all, pseudo, decls) => {
    const cls = hoverClass(pseudo, decls);
    return ` data-hover-class="${cls}"`;
  });
  // Fold the marker into a real class attribute (kept as two steps so an
  // element that already carries a class is merged rather than overwritten).
  body = body.replace(/<[a-zA-Z][^>]*\sdata-hover-class="[^"]*"[^>]*>/g, (tag) => {
    const cls = tag.match(/\sdata-hover-class="([^"]*)"/)[1];
    return addClass(tag.replace(/\sdata-hover-class="[^"]*"/, ''), cls);
  });

  // 7. Template bindings -> server-rendered text plus hooks for site.js.
  body = body
    .replace(/\s+sc-camel-view-box="([^"]*)"/g, ' viewBox="$1"')
    .replace(/\s+hint-placeholder-val="[^"]*"/g, '')
    .replace(/\s+data-screen-label="[^"]*"/g, '')
    // A <button> inside a <form>-less page still defaults to type="submit";
    // being explicit costs nothing and removes the footgun.
    .replace(
      /\s+sc-camel-on-click="\{\{ prevRole \}\}"/,
      ` type="button" id="role-prev" aria-label="${esc(page.prevLabel)}"`
    )
    .replace(
      /\s+sc-camel-on-click="\{\{ nextRole \}\}"/,
      ` type="button" id="role-next" aria-label="${esc(page.nextLabel)}"`
    )
    .replace(
      /(<span[^>]*?)>\{\{ typed \}\}<\/span>/,
      `$1 id="typed" data-roles="${esc(JSON.stringify(page.roles))}">${esc(page.roles[0])}</span>`
    )
    .replace(
      /(<span[^>]*?)>\{\{ roleCounter \}\}<\/span>/,
      `$1 id="role-counter">1 / ${page.roles.length}</span>`
    );

  // 8. Structural + security fixes on the markup itself.
  body = body
    .replace(/target="_blank"/g, 'target="_blank" rel="noopener noreferrer"')
    .replace(/<nav\b[^>]*>/, (t) => addClass(t, 'site-nav'))
    .replace(/<footer\b[^>]*>/, (t) => addClass(t, 'site-footer'))
    .replace(/<section\b[^>]*>/g, (t) => addClass(t, 'sec'));

  // 8b. Put the official LinkedIn and Proton Mail marks on the links that point
  //     at them. Buttons carry the mark inside the link, before their existing
  //     label.
  const isOurs = (href) =>
    href === 'mailto:mailprashand@pm.me'
      ? 'proton'
      : /^https:\/\/www\.linkedin\.com\/in\/prashandarthur$/.test(href)
        ? 'linkedin'
        : null;

  let marked = 0;
  body = body.replace(/<a\b[^>]*>[^<]*<\/a>/g, (all) => {
    const href = (all.match(/href="([^"]*)"/) || [])[1] || '';
    const which = isOurs(href);
    if (!which) return all;
    const open = all.match(/^<a\b[^>]*>/)[0];
    const text = all.slice(open.length, -4);
    // The contact-details block shows the address itself as the link text; its
    // mark goes beside the whole pair below, not inside the link.
    if (/^(mailprashand@pm\.me|in\/prashandarthur)$/.test(text.trim())) return all;
    marked++;
    return `${addClass(open, 'brand-link')}${mark(which)}${text}</a>`;
  });
  if (marked !== 4) throw new Error(`${page.out}: expected 4 marked buttons, marked ${marked}`);

  // In the contact-details block the mark sits to the left of the label/value
  // pair, where it is isolated from any wording.
  let paired = 0;
  body = body.replace(
    /<div style="(display:flex;flex-direction:column;gap:6px[^"]*)">\s*(<span\b[^>]*>[^<]*<\/span>)\s*(<a\b[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>)\s*<\/div>/g,
    (all, style, label, link, href) => {
      const which = isOurs(href);
      if (!which) return all;
      paired++;
      // padding-top belongs to the row, or the mark would sit above the text it
      // labels rather than centred against it.
      const pad = (style.match(/padding-top:\d+px/) || [''])[0];
      const rest = style.replace(/;?padding-top:\d+px/, '');
      return (
        `<div class="brand-pair" style="${pad}">${mark(which, 26)}` +
        `<div style="${rest}">${label}${link}</div></div>`
      );
    }
  );
  if (paired !== 2) throw new Error(`${page.out}: expected 2 marked contact rows, got ${paired}`);

  // 8c. Section navigation. Two problems to solve: fragment links landed the
  //     section's top edge at y=0, underneath a sticky bar that is 57 px on
  //     desktop and 83 px on a phone (where the links wrapped to a second row),
  //     so the heading you asked for was covered or entirely hidden; and that
  //     wrapped bar ate 11% of a phone viewport. The links are tagged here so
  //     the stylesheet and site.js can drive an active state, and the same set
  //     is mirrored into a bottom tab bar for small screens.
  // Scoped to the bar itself — the hero's "MY WORK" and "HOW I GOT HERE"
  // buttons point at #work and #story too, and they are not navigation.
  const navSlice = sliceElement(body, 'nav', 0);
  if (!navSlice) throw new Error(`${page.out}: no <nav> to wire up`);
  const navOpen = body.slice(navSlice.start, body.indexOf('>', navSlice.start) + 1);

  const sections = [];
  const navInner = navSlice.inner.replace(
    /<a\b([^>]*)href="#(story|work|experience|contact)"([^>]*)>([^<]*)<\/a>/g,
    (all, pre, id, post, text) => {
      sections.push({ id, text });
      return `${addClass(`<a${pre}href="#${id}"${post} data-nav="${id}">`, 'nav-link')}${text}</a>`;
    }
  );
  if (sections.length !== 4) {
    throw new Error(`${page.out}: expected 4 section links in the nav, found ${sections.length}`);
  }

  // The theme toggle goes in as the last child of the links row, after the
  // language switch — so it survives to phone widths, where the section links
  // leave the bar but this row stays. The row's last </div> is the row itself.
  const togglePoint = navInner.lastIndexOf('</div>');
  if (togglePoint < 0) throw new Error(`${page.out}: no links row to hold the theme toggle`);
  const navInnerToggled =
    navInner.slice(0, togglePoint) + themeToggle(page) + navInner.slice(togglePoint);

  // Two <nav> landmarks now exist (this bar and the tab bar), so both get a
  // name — otherwise a screen reader just announces "navigation" twice.
  body =
    body.slice(0, navSlice.start) +
    navOpen.replace(/^<nav/, `<nav aria-label="${esc(page.navLabel)}"`) +
    navInnerToggled +
    '</nav>' +
    body.slice(navSlice.end);

  // Labels come from the nav that is already on the page, so the Dutch build
  // gets Dutch tabs without a second copy of the translations.
  const tabs = sections
    .map(
      (s) =>
        `<a class="tab" href="#${s.id}" data-nav="${s.id}"><span>${s.text.trim()}</span></a>`
    )
    .join('');

  body =
    `<div class="scroll-progress" aria-hidden="true"><i></i></div>\n` +
    body +
    `\n<nav class="tabbar" aria-label="${esc(page.sectionsLabel)}">${tabs}</nav>`;

  // Hooks for the responsive layer, matched on the inline styles that make each
  // one a desktop-only measurement.
  body = body
    .replace(/<section class="sec" id="top"[^>]*>/, (t) => addClass(t, 'hero'))
    .replace(
      /<div style="position:relative;display:flex;flex-direction:column;justify-content:center;gap:26px;padding:80px 56px 80px 72px;max-width:660px">/,
      '<div class="hero-copy" style="position:relative;display:flex;flex-direction:column;justify-content:center;gap:26px;padding:80px 56px 80px 72px;max-width:660px">'
    )
    .replace(
      /<div style="position:relative;min-height:520px">/,
      '<div class="hero-media" style="position:relative;min-height:520px">'
    )
    .replace(
      /<div data-reveal="1" style="position:relative;padding-bottom:120px">/,
      '<div class="story-col" data-reveal="1" style="position:relative;padding-bottom:120px">'
    )
    .replace(
      /<div style="position:relative;height:520px;border:1px solid rgba\(255,255,255,\.08\);border-radius:50%;overflow:hidden">/,
      '<div class="story-photo" style="position:relative;height:520px;border:1px solid rgba(255,255,255,.08);border-radius:50%;overflow:hidden">'
    )
    .replace(/<div style="position: absolute; width: min\(360px,100%\);[^"]*">/, (t) =>
      addClass(t, 'skills-card')
    )
    .replace(
      /<div style="display:flex;align-items:center;gap:16px;padding-top:22px">/,
      '<div class="role-nav" style="display:flex;align-items:center;gap:16px;padding-top:22px">'
    )
    .replace(/<div style="display:flex;align-items:center;gap:30px">/, (t) =>
      addClass(t, 'nav-links')
    )
    .replace(/<div style="background:#05080F;min-height:100vh;overflow-x:hidden">/, (t) =>
      addClass(t, 'page-wrap')
    )
    // The hero's two call-to-action pills sit in a non-wrapping flex row and
    // run off the right edge below ~380px.
    .replace(/<div style="display:flex;gap:14px;padding-top:6px">/, (t) => addClass(t, 'hero-cta'))
    // A left-to-right fade that blends the portrait into the copy column
    // beside it. Once the hero stacks, the copy is above rather than beside,
    // so the same gradient just darkens one edge for no reason.
    .replace(
      /<div style="position:absolute;inset:0;background:linear-gradient\(90deg,#070B14 0%,rgba\(7,11,20,\.78\) 24%,rgba\(7,11,20,\.05\) 68%\);pointer-events:none"><\/div>/,
      (t) => addClass(t, 'hero-fade-x')
    )
    // Wide all-caps monospace labels are pinned with white-space:nowrap. The
    // typewriter's own wrapper also uses nowrap but carries letter-spacing:0,
    // so the tracked-out labels are the ones matched here — it must keep its
    // single line for the absolutely-positioned overlay to line up.
    .replace(/<span style="[^"]*letter-spacing:\.2em[^"]*white-space:nowrap[^"]*">/g, (t) =>
      addClass(t, 'wrap-label')
    );

  // Those hooks are matched against exact inline-style strings, so a tweak in
  // the design tool would silently stop one from landing and quietly take a
  // chunk of the mobile layout with it. Fail the build instead.
  for (const cls of [
    'site-nav', 'nav-links', 'hero', 'hero-copy', 'hero-media', 'hero-cta', 'hero-fade-x',
    'story-col', 'story-photo', 'skills-card', 'role-nav', 'wrap-label', 'site-footer',
    'page-wrap',
  ]) {
    if (!body.includes(`class="${cls}`) && !new RegExp(`class="[^"]*\\b${cls}\\b`).test(body)) {
      throw new Error(`${page.out}: responsive hook "${cls}" matched nothing`);
    }
  }

  // Landmarks: the design has a <nav> and a <footer> but no <header>/<main>, so
  // "skip to content" has nothing to skip to and screen-reader landmark
  // navigation has one big unlabelled region.
  const navEl = sliceElement(body, 'nav', 0);
  const footerAt = body.lastIndexOf('<footer');
  // The header must carry the sticky positioning, not the nav inside it: a
  // sticky element can only travel within its parent's box, and a <header> that
  // wraps nothing but the nav is exactly as tall as the nav — so the bar would
  // scroll away with the header instead of pinning to the top.
  body =
    body.slice(0, navEl.start) +
    '<header class="site-header">' +
    body.slice(navEl.start, navEl.end) +
    '</header>\n<main id="main">' +
    body.slice(navEl.end, footerAt) +
    '</main>\n' +
    body.slice(footerAt);

  // 8c-bis. The Microsoft certification, referenced from the issuer. The flat
  //     text pill that claimed it is replaced by the official badge plus a link
  //     to Microsoft's own credential page, so the claim is verifiable in one
  //     click instead of being an assertion the visitor has to take on trust.
  const cert = page.cert;
  const certCard =
    `<a class="cert-card" href="${CERT.shareUrl(CERT.locale[page.lang])}" ` +
    `target="_blank" rel="noopener noreferrer">` +
    `<img src="${CERT.badge.src}" alt="${esc(cert.alt)}" ` +
    `width="${CERT.badge.w}" height="${CERT.badge.h}" loading="lazy" decoding="async">` +
    `<span class="cert-text">` +
    `<span class="cert-kicker">${esc(cert.kicker)}</span>` +
    `<span class="cert-name">${esc(cert.name)}</span>` +
    `<span class="cert-verify">${esc(cert.verify)} <span aria-hidden="true">↗</span></span>` +
    `</span></a>`;

  const pillRow = '<div style="display:flex;flex-wrap:wrap;gap:10px;padding-top:8px">';
  if (!body.includes(pillRow)) throw new Error(`${page.out}: certification pill row not found`);

  // Drop the pill the card now supersedes; the other one stays.
  const oldPill =
    /<span style="padding:9px 15px;[^"]*">MICROSOFT CERTIFIED: POWER BI DATA ANALYST ASSOCIATE<\/span>\s*/;
  if (!oldPill.test(body)) throw new Error(`${page.out}: certification pill not found`);
  body = body.replace(oldPill, '');
  body = body.replace(pillRow, `${certCard}\n${pillRow}`);

  // 8c-ter. The four story cards open the page's heading outline with <h3>s
  //     before any <h2> exists — an h1→h3 jump, the one accessibility audit
  //     the page fails. Their inline styles carry every visual property, so
  //     promoting the tag changes nothing on screen; the outline becomes
  //     h1 → h2 ×4 → h2-led sections.
  {
    const firstH2 = body.indexOf('<h2');
    if (firstH2 < 0) throw new Error(`${page.out}: no <h2> anywhere`);
    let opened = 0;
    let closed = 0;
    const lead = body
      .slice(0, firstH2)
      .replace(/<h3(?=[\s>])/g, () => (opened++, '<h2'))
      .replace(/<\/h3>/g, () => (closed++, '</h2>'));
    if (opened !== 4 || closed !== 4) {
      throw new Error(`${page.out}: expected 4 leading story cards, got ${opened}/${closed}`);
    }
    body = lead + body.slice(firstH2);
  }

  // 8d. EU labelling of the AI-generated illustration, plus the disclosure it
  //     points at. Inserted after the landmark pass so the disclosure lands
  //     between </main> and the footer, where site-level meta belongs.
  body = labelAiContent(body, page);

  // 9. Drop everything the runtime used to consume — structurally, see
  //    dropRuntimeScripts. The leftovers assertion below then guards a
  //    property that holds by construction.
  body = dropRuntimeScripts(body).trim();

  const leftovers = body.match(
    /\{\{[^}]*\}\}|sc-if|sc-camel-[a-z-]+|<image-slot|style-[a-z]+="|<x-dc|<helmet|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
  );
  if (leftovers) {
    throw new Error(
      `${page.out}: bundler markup survived the conversion: ${[...new Set(leftovers)].join(', ')}`
    );
  }

  return renderPage(page, body);
}

/**
 * Puts the EU "AI generated" label on the one thing here that is AI-generated
 * imagery — the pixel-art scene — and appends the disclosure that explains, for
 * every asset, whether AI was involved.
 */
function labelAiContent(body, page) {
  const ai = page.ai;

  // The illustration's panel: position:relative, so the badge can sit on the
  // artwork rather than float somewhere near it.
  const marker = '<div data-reveal="1" style="position:relative;margin-top:56px;';
  const at = body.indexOf(marker);
  if (at < 0) throw new Error(`${page.out}: could not find the illustration panel to label`);
  const panel = sliceElement(body, 'div', at);
  const openEnd = body.indexOf('>', panel.start) + 1;
  const closeAt = panel.end - '</div>'.length;

  // 28px keeps the word "GENERATED" legible; the guidance asks for a size at
  // which the label is actually perceivable, not merely present.
  const badge = `<span class="ai-badge">${euIcon('generated', 28, ai.badgeAlt)}</span>`;
  const caption =
    `<div class="ai-caption"><span>${esc(ai.caption)}</span>` +
    `<a href="#ai-disclosure">${esc(ai.summary)}</a></div>`;

  // art-panel pins the panel's custom properties to their dark values, keeping
  // the artwork — and the white EU badge on it — on the backdrop it was made
  // for in both themes.
  body =
    body.slice(0, panel.start) +
    addClass(body.slice(panel.start, openEnd), 'art-panel') +
    badge +
    body.slice(openEnd, closeAt) +
    caption +
    body.slice(closeAt);

  // The secondary information layer. Collapsed by default so it stays a
  // footnote, but it is real markup in the page — not fetched, not behind JS.
  const items = ai.items
    .map(([term, rest]) => `<li><b>${esc(term)}</b> — ${esc(rest)}</li>`)
    .join('');
  const disclosure =
    `<section class="ai-disclosure" id="ai-disclosure">` +
    `<div class="ai-disclosure-inner">` +
    euIcon('basic', 22, '') +
    `<details><summary>${esc(ai.summary)}</summary>` +
    `<p>${esc(ai.intro)}</p><ul>${items}</ul>` +
    `<p class="ai-source">${esc(ai.note)} ` +
    `<a href="${EU_ICONS_URL}" target="_blank" rel="noopener noreferrer">${esc(ai.noteLink)}</a></p>` +
    `</details></div></section>\n`;

  const footerAt = body.lastIndexOf('<footer');
  if (footerAt < 0) throw new Error(`${page.out}: no footer to put the AI disclosure above`);
  return body.slice(0, footerAt) + disclosure + body.slice(footerAt);
}

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('not a JPEG');
}

function renderPage(page, body) {
  const canonical = SITE + (page.out === 'index.html' ? '' : page.out);
  const altUrl = SITE + (page.alt.href === 'index.html' ? '' : page.alt.href);
  return `<!DOCTYPE html>
<html lang="${page.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="author" content="Prashand Arthur Banwarie">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="${THEME_COLOR.light}">
<meta name="theme-color" content="${THEME_COLOR.dark}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${page.lang}" href="${canonical}">
<link rel="alternate" hreflang="${page.alt.lang}" href="${altUrl}">
<link rel="alternate" hreflang="x-default" href="${SITE}">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Prashand Arthur Banwarie">
<meta property="og:locale" content="${page.ogLocale}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:image" content="${SITE}assets/img/hero-portrait.jpg">
<meta property="og:image:width" content="1024">
<meta property="og:image:height" content="684">
<meta property="og:image:alt" content="${esc(page.imgAlt['hero-portrait'])}">
<meta name="twitter:card" content="summary_large_image">

<link rel="preload" href="assets/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/jetbrains-mono-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<script>document.documentElement.className+=" js"</script>
${THEME_BOOT}
<script type="application/ld+json">
${JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Prashand Arthur Banwarie',
    jobTitle: page.lang === 'nl' ? 'Power BI-ontwikkelaar' : 'Power BI Developer',
    worksFor: { '@type': 'Organization', name: 'KPN' },
    address: { '@type': 'PostalAddress', addressLocality: 'Den Haag', addressCountry: 'NL' },
    email: 'mailto:mailprashand@pm.me',
    url: canonical,
    image: `${SITE}assets/img/hero-portrait.jpg`,
    sameAs: ['https://www.linkedin.com/in/prashandarthur'],
  },
  null,
  2
)}
</script>
</head>
<body>
<a class="skip-link" href="#main">${esc(page.skipLink)}</a>
${body}
<script src="assets/site.js" defer></script>
</body>
</html>
`;
}

// ───────────────────────────────────────────────────────── extra Pages entries

function notFoundPage() {
  // GitHub Pages serves this file for a miss at any depth, so its own links
  // have to be root-relative — a relative href would resolve against whatever
  // bogus path the visitor typed.
  const base = new URL(SITE).pathname;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found — Prashand Banwarie</title>
<meta name="description" content="That page doesn't exist on Prashand Arthur Banwarie's site.">
<meta name="robots" content="noindex">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="${THEME_COLOR.light}">
<meta name="theme-color" content="${THEME_COLOR.dark}">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}assets/site.css">
${THEME_BOOT}
<style>${minifyCss(`
  /* Repeated from site.css rather than relied upon: this page is the one that
     renders when something is already wrong, so it should still look right if
     the stylesheet is the thing that failed to load. That now includes the
     theme tokens, resolved the same way site.css resolves them. */
  :root{${darkVars}}
  html[data-theme="light"]{${lightVars}}
  @media (prefers-color-scheme: light){html:not([data-theme="dark"]){${lightVars}}}

  html,body{background:var(--bg)}
  body{margin:0;color:var(--text);font-family:'Space Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  a{color:var(--link);text-decoration:none}
  *{box-sizing:border-box}

  body{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center}
  main{display:flex;flex-direction:column;align-items:center;gap:20px;max-width:520px}
  h1{margin:0;font-size:clamp(38px,7vw,68px);line-height:1.04;font-weight:700;letter-spacing:-.035em;color:var(--ink)}
  p{margin:0;font-size:17px;line-height:1.65;color:var(--body-2)}
  .code{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.24em;color:var(--muted-2);text-transform:uppercase}
  .home{padding:15px 32px;border-radius:999px;background:var(--accent);font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:.16em;color:#fff}
  .home:hover{background:var(--accent-hi);color:#fff}
`)}</style>
</head>
<body>
<main>
  <span class="code">Error 404</span>
  <h1>This page doesn't exist.</h1>
  <p>The link is broken or the page has moved. Everything else is still where you left it.</p>
  <a class="home" href="${base}">BACK TO HOME</a>
</main>
</body>
</html>
`;
}

function sitemap() {
  const links = PAGES.map(
    (p) => `    <xhtml:link rel="alternate" hreflang="${p.lang}" href="${SITE}${
      p.out === 'index.html' ? '' : p.out
    }"/>`
  ).join('\n');
  const urls = PAGES.map(
    (p) => `  <url>
    <loc>${SITE}${p.out === 'index.html' ? '' : p.out}</loc>
${links}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}"/>
    <changefreq>monthly</changefreq>
    <priority>${p.out === 'index.html' ? '1.0' : '0.8'}</priority>
  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

// ─────────────────────────────────────────────────────────────────────── main

const cssParts = [];
const pages = PAGES.map((p) => ({ p, html: buildPage(p, cssParts) }));

// Theme pass: every colour literal in the pages' style attributes becomes a
// token, and anything the THEME table doesn't recognise fails the build.
for (const pg of pages) {
  pg.html = themeifyHtml(pg.html);
  assertThemedHtml(pg.p.out, pg.html);
  for (const needle of ['theme-toggle', 'art-panel', 'data-theme']) {
    if (!pg.html.includes(needle)) {
      throw new Error(`${pg.p.out}: theme layer incomplete — "${needle}" missing`);
    }
  }
}

// Both bundles carry byte-identical fonts and the same base rules, so the
// design CSS only needs to ship once.
const uniqueCss = [...new Set(cssParts)];
if (uniqueCss.length !== 1) {
  throw new Error(`expected the two pages to share one stylesheet, got ${uniqueCss.length}`);
}

fs.mkdirSync(ASSETS, { recursive: true });
// The brand artwork is committed rather than generated — it comes from
// LinkedIn's and Proton's download pages, not from the design bundles — so the
// build only checks that it is still there.
for (const m of [...Object.values(MARKS), ...Object.values(EU_AI_ICONS)]) {
  if (!fs.existsSync(path.join(ROOT, m.src))) {
    throw new Error(`missing third-party asset ${m.src} — see README.md`);
  }
}

// The stylesheet gets the same theme pass as the markup: literals to tokens,
// then the token definitions (which legitimately hold raw colours) go on top,
// after the assertion has seen the rest.
const siteCss = themeifyCss(
  `${uniqueCss[0]}\n\n${hoverSheet()}\n\n${BRAND_CSS}\n\n${CERT_CSS}\n\n${EU_AI_CSS}\n\n${NAV_CSS}\n\n${RESPONSIVE_CSS}\n`
);
assertThemed('site.css', siteCss);
fs.writeFileSync(path.join(ASSETS, 'site.css'), minifyCss(`${THEME_CSS}\n\n${siteCss}`) + '\n');
fs.writeFileSync(path.join(ASSETS, 'site.js'), `${slimJs(SITE_JS)}\n`);
fs.writeFileSync(path.join(ASSETS, 'favicon.svg'), FAVICON);
for (const { p, html } of pages) fs.writeFileSync(path.join(ROOT, p.out), html);
fs.writeFileSync(path.join(ROOT, '404.html'), notFoundPage());
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap());
fs.writeFileSync(
  path.join(ROOT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`
);
fs.writeFileSync(path.join(ROOT, '.nojekyll'), '');

// GitHub Pages reads the custom domain from this file. The Pages UI writes it
// for you, but generating it keeps it tied to SITE — so the domain can't drift
// out of sync with the canonical tags, and it survives recreating the repo.
//
// Written with no trailing newline on purpose: that is byte-for-byte what the
// Pages settings UI writes, and the UI rewrites this file every time the custom
// domain is saved. Adding a newline here makes the two overwrite each other
// forever, so `git status` reports CNAME modified after every single build.
const host = new URL(SITE).hostname;
fs.writeFileSync(path.join(ROOT, 'CNAME'), host);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log('built:');
for (const { p } of pages) {
  console.log(`  ${p.out.padEnd(12)} ${kb(fs.statSync(path.join(ROOT, p.out)).size)}`);
}
for (const f of ['404.html', 'sitemap.xml', 'robots.txt']) {
  console.log(`  ${f.padEnd(12)} ${kb(fs.statSync(path.join(ROOT, f)).size)}`);
}
console.log(`  ${'assets/'.padEnd(12)} ${written.size} files, ${hoverClasses.size} hover classes`);
