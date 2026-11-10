import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BASE_PACK as p } from '../src/data/base';
import { BORDER, borderedCards, hasBorder } from '../scripts/card-border';

// The prepared scans are committed files (npm run scans:prepare). These checks look at the files themselves, not at the code that shows
// them, and are skipped when the scans were taken out of the repository.
const MANIFEST = 'src/data/scan-assets.json';
const prepared = existsSync(MANIFEST);
type Face = { src: string; width: number; height: number };
const manifest = (prepared ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { cards: {}, backs: {}, portraits: {} }) as Record<'cards' | 'backs' | 'portraits', Record<string, Face>>;

/** The run of black (or transparent) columns and rows along each edge (left, right, top, bottom), measured over the middle of the face. */
async function edges(face: Face) {
 const { data, info } = await sharp(`public${face.src}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
 const { width: w, height: h } = info, dark = (x: number, y: number) => { const i = (y * w + x) * 4; return data[i + 3] < 30 || data[i] + data[i + 1] + data[i + 2] < 70; };
 const column = (x: number) => { let n = 0; for (let y = Math.floor(h * 0.15); y < h * 0.85; y++) if (dark(x, y)) n++; return n / (h * 0.7); };
 const row = (y: number) => { let n = 0; for (let x = Math.floor(w * 0.15); x < w * 0.85; x++) if (dark(x, y)) n++; return n / (w * 0.7); };
 const run = (at: (i: number) => number, limit: number) => { let n = 0; while (n < limit && at(n) > 0.9) n++; return n; };
 const limit = Math.floor(Math.min(w, h) / 4);
 return { width: w, corner: data[3], bands: [run(column, limit), run(i => column(w - 1 - i), limit), run(row, limit), run(i => row(h - 1 - i), limit)] };
}

describe.skipIf(!prepared)('prepared scan files', () => {
 it('cuts every class card out of the scan instead of keeping its black margin', () => {
  // Class cards were scanned at 484×744 (the Warrior's at 531×791), with a black margin and crop marks around the card.
  const untrimmed = Object.entries(manifest.cards).filter(([, f]) => (f.width === 484 && f.height === 744) || (f.width === 531 && f.height === 791));
  expect(untrimmed.map(([id]) => id)).toEqual([]);
 });

 it('sets every class card, item and starting card in the same printed border, with no scanner margin beyond it', async () => {
  // The scans came cut three ways (whole border on white, inside a black scanner margin, cut inside the border); see card-border.ts.
  const faces = [...borderedCards(p)].filter(id => manifest.cards[id]);
  expect(faces.length).toBeGreaterThan(380);
  for (const id of faces) {
   const { width, corner, bands } = await edges(manifest.cards[id]), border = Math.round(width * BORDER);
   for (const band of bands) { expect(band, id).toBeGreaterThanOrEqual(border - 2); expect(band, id).toBeLessThanOrEqual(border + 5); }
   expect(corner, `${id} has rounded, transparent corners`).toBe(0);
   expect(hasBorder(await sharp(`public${manifest.cards[id].src}`).metadata()), `${id} carries the border mark`).toBe(true);
  }
 }, 60_000);

 it('keeps the printed cards of each class the same shape within a few percent', () => {
  const ratio = (id: string) => manifest.cards[id].width / manifest.cards[id].height;
  for (const id of ['warrior-battle-shout', 'warrior-cleave', 'warrior-rend']) expect(ratio(id), id).toBeGreaterThan(0.6), expect(ratio(id), id).toBeLessThan(0.7);
 });
});
