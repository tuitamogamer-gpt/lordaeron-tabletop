import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

// The prepared scans are committed files (npm run scans:prepare). These checks look at the files themselves, not at the code that shows
// them, and are skipped when the scans were taken out of the repository.
const MANIFEST = 'src/data/scan-assets.json';
const prepared = existsSync(MANIFEST);
type Face = { src: string; width: number; height: number };
const manifest = (prepared ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { cards: {}, backs: {}, portraits: {} }) as Record<'cards' | 'backs' | 'portraits', Record<string, Face>>;

/** The widest run of scan-black rows or columns along any edge, measured over the middle of the face (a printed outline is a few pixels). */
async function blackBand(face: Face) {
 const { data, info } = await sharp(`public${face.src}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
 const { width: w, height: h } = info, dark = (x: number, y: number) => { const i = (y * w + x) * 4; return data[i + 3] < 30 || data[i] + data[i + 1] + data[i + 2] < 70; };
 const column = (x: number) => { let n = 0; for (let y = Math.floor(h * 0.15); y < h * 0.85; y++) if (dark(x, y)) n++; return n / (h * 0.7); };
 const row = (y: number) => { let n = 0; for (let x = Math.floor(w * 0.15); x < w * 0.85; x++) if (dark(x, y)) n++; return n / (w * 0.7); };
 const run = (at: (i: number) => number, limit: number) => { let n = 0; while (n < limit && at(n) > 0.9) n++; return n; };
 const limit = Math.floor(Math.min(w, h) / 4);
 return Math.max(run(column, limit), run(i => column(w - 1 - i), limit), run(row, limit), run(i => row(h - 1 - i), limit));
}

describe.skipIf(!prepared)('prepared scan files', () => {
 it('cuts every class card out of the scan instead of keeping its black margin', () => {
  // Class cards were scanned at 484×744 (the Warrior's at 531×791), with a black margin and crop marks around the card.
  const untrimmed = Object.entries(manifest.cards).filter(([, f]) => (f.width === 484 && f.height === 744) || (f.width === 531 && f.height === 791));
  expect(untrimmed.map(([id]) => id)).toEqual([]);
 });

 it('leaves no black scan margin or crop marks around sampled cards', async () => {
  const samples = ['warrior-battle-shout', 'warrior-cleave', 'paladin-devotion-aura', 'priest-starshards', 'mage-arcane-explosion', 'circle-5-crackling-staff', 'druid-ferocious-bite'];
  for (const id of samples) expect(await blackBand(manifest.cards[id]), id).toBeLessThan(8);
 });

 it('keeps the printed cards of each class the same shape within a few percent', () => {
  const ratio = (id: string) => manifest.cards[id].width / manifest.cards[id].height;
  for (const id of ['warrior-battle-shout', 'warrior-cleave', 'warrior-rend']) expect(ratio(id), id).toBeGreaterThan(0.6), expect(ratio(id), id).toBeLessThan(0.7);
 });
});
