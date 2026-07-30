/**
 * Regenerates tools/img-overrides/ from the design-tool export.
 *
 * The export carries the photographs at editing quality — 665 KB for a picture
 * displayed at 370 px. This script decodes them straight out of the bundle
 * manifest (never out of an already-compressed override, which would compound
 * artefacts) and writes two files per photo:
 *
 *   <id>.avif   AVIF q58   what modern browsers actually download
 *   <id>.jpg    mozjpeg q80  the <picture> fallback, and the og:image
 *
 * Both keep the export's exact pixel dimensions; `tools/build.mjs` asserts that
 * and refuses to ship an override that has drifted.
 *
 * Usage — sharp is a dev-time dependency only, deliberately never committed,
 * so the build itself stays dependency-free:
 *
 *   npm i --no-save sharp
 *   node tools/make-overrides.mjs            # writes files that don't exist
 *   node tools/make-overrides.mjs --force    # rewrites all of them
 *
 * Quality was chosen by measuring SSIM against the original export, not by
 * eye: at q58 AVIF scores a shade above the mozjpeg q80 it replaces while
 * costing 35–59% fewer bytes. Raising it is safe; lowering it is not, and
 * should be re-measured rather than guessed.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools/img-overrides');
const BUNDLE = path.join(ROOT, 'src-bundles/index.html');

const AVIF = { quality: 58, effort: 6 };
const JPEG = { quality: 80, progressive: true, mozjpeg: true };

const force = process.argv.includes('--force');

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('sharp is not installed. Run:  npm i --no-save sharp');
  process.exit(1);
}

/**
 * The image-slot ids the pages use, keyed by the dimensions the export ships
 * them at. Matching on size rather than on the bundle's uuids means a fresh
 * export — which renumbers every uuid — still lands the right file, and a
 * silently rescaled photo fails here instead of failing the build later.
 */
const BY_SIZE = {
  '1024x684': 'hero-portrait',
  '856x856': 'about-photo',
};

const html = fs.readFileSync(BUNDLE, 'utf8');
const manifest = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
if (!manifest) throw new Error('src-bundles/index.html: missing __bundler/manifest island');

fs.mkdirSync(OUT, { recursive: true });

let written = 0;
let skipped = 0;

for (const entry of Object.values(JSON.parse(manifest[1]))) {
  if (!entry.mime.startsWith('image/')) continue;

  let bytes = Buffer.from(entry.data, 'base64');
  if (entry.compressed) bytes = zlib.gunzipSync(bytes);

  const { width, height } = await sharp(bytes).metadata();
  const id = BY_SIZE[`${width}x${height}`];
  if (!id) {
    console.warn(`  skipped ${width}x${height} — no id mapped for that size`);
    continue;
  }

  for (const [ext, encode] of [
    ['avif', (img) => img.avif(AVIF).toBuffer()],
    ['jpg', (img) => img.jpeg(JPEG).toBuffer()],
  ]) {
    const file = path.join(OUT, `${id}.${ext}`);
    if (fs.existsSync(file) && !force) {
      skipped++;
      continue;
    }
    const out = await encode(sharp(bytes));
    const check = await sharp(out).metadata();
    if (check.width !== width || check.height !== height) {
      throw new Error(`${id}.${ext}: ${check.width}x${check.height} != export ${width}x${height}`);
    }
    fs.writeFileSync(file, out);
    written++;
    console.log(
      `  ${`${id}.${ext}`.padEnd(22)} ${width}x${height}` +
        `  ${(out.length / 1024).toFixed(1)} KB` +
        `  (${(100 - (out.length / bytes.length) * 100).toFixed(0)}% smaller than the export)`
    );
  }
}

console.log(`\n${written} written, ${skipped} left alone${force ? '' : ' (use --force to rewrite)'}`);
