import { existsSync } from 'node:fs';
import sharp, { type Sharp } from 'sharp';
import { describe, expect, it } from 'vitest';
import { BASE_PACK as p } from '../src/data/base';

// The character counters are cut from a token sheet on which each lies at its own angle. They are shown everywhere as they are
// (the map, the experience track, the rosters), so the files themselves must be upright. "Upright" is how the same face stands in
// the character's painted portrait: every counter's art is the head of that painting. This table says where that head is in
// the portrait (public/assets/scans/portraits, 520×626): its middle, and how many portrait pixels one pixel of the 128px
// counter covers. Measured on 21 Nov 2026 (docs/XP-TRACK-AND-COUNTERS-2026-11-21.md).
const FACE: Record<string, [x: number, y: number, scale: number]> = {
 'alissi-quicksting': [230, 207, 2.407], 'artumnis-moondream': [240, 76, 1.717], 'brandon-lightstone': [222, 147, 1.908], 'brebo-bigshot': [195, 125, 2.407],
 'burbon-fang': [298, 200, 2.116], 'dongon-swiftblade': [154, 144, 1.813], 'grumbaz-crowsblood': [256, 74, 1.678], 'leeam-sagewind': [126, 112, 1.401],
 'meadowfrey': [275, 177, 1.553], 'sandrai-darkshine': [222, 93, 1.635], 'shailara-whitherblade': [256, 87, 1.635], 'sofeea-icecall': [269, 113, 2.339],
 'thundershot': [263, 186, 1.813], 'weefla-sorrowfall': [320, 127, 1.296], 'wennu-bloodsinger': [300, 96, 1.438], 'zowka-shattertusk': [243, 124, 1.296],
};
const SIZE = 96, R = 31, PAD = 200, CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }, counterFile = (id: string) => `public/assets/scans/counters/${id}.webp`;
const prepared = existsSync(counterFile('alissi-quicksting'));

/** A picture as SIZE×SIZE grey values, a little blurred so that the print's dots do not count. */
const grey = async (image: Sharp) => new Float64Array(await image.resize(SIZE, SIZE, { fit: 'fill' }).flatten({ background: '#777' }).greyscale().blur(1).raw().toBuffer());
/** The counter, turned clockwise by `turn` degrees about its middle: the largest square about the middle that every turn leaves whole. */
async function counter(id: string, turn: number) {
 const { width = 0, height = 0 } = await sharp(counterFile(id)).metadata(), side = Math.min(width, height) - 2;
 const turned = turn ? await sharp(counterFile(id)).rotate(turn, { background: CLEAR }).png().toBuffer() : await sharp(counterFile(id)).png().toBuffer(), m = await sharp(turned).metadata();
 return grey(sharp(turned).extract({ left: Math.round((m.width! - side) / 2), top: Math.round((m.height! - side) / 2), width: side, height: side }));
}
/** The square of the portrait that the counter's face was matched to. */
async function head(id: string) {
 const [x, y, scale] = FACE[id], { width = 0, height = 0 } = await sharp(counterFile(id)).metadata(), half = Math.round((Math.min(width, height) - 2) / 2 * scale);
 const wide = await sharp(`public/assets/scans/portraits/${id}.webp`).extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: '#777' }).png().toBuffer();
 return grey(sharp(wide).extract({ left: x + PAD - half, top: y + PAD - half, width: 2 * half, height: 2 * half }));
}
/** How alike two pictures are inside the disc of the face (the counter's coloured rim is left out): 1 is the same picture. */
function alike(a: Float64Array, b: Float64Array) {
 const inside: number[] = [];
 for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if ((x - SIZE / 2 + .5) ** 2 + (y - SIZE / 2 + .5) ** 2 <= R * R) inside.push(y * SIZE + x);
 const mean = (v: Float64Array) => inside.reduce((s, i) => s + v[i], 0) / inside.length, ma = mean(a), mb = mean(b);
 let ab = 0, aa = 0, bb = 0;
 for (const i of inside) { ab += (a[i] - ma) * (b[i] - mb); aa += (a[i] - ma) ** 2; bb += (b[i] - mb) ** 2; }
 return ab / Math.sqrt(aa * bb);
}

describe.skipIf(!prepared)('the printed character counters', () => {
 it('has a place in the portrait for every character in the box', () => {
  expect(Object.keys(FACE).sort()).toEqual(p.characters.map(c => c.id).sort());
 });

 it.each(Object.keys(FACE))('%s stands upright: its face matches the painted portrait as it is, and no longer when it is turned', async id => {
  const painted = await head(id), upright = alike(await counter(id, 0), painted);
  // Measured on 21 Nov 2026: 0.92 to 0.97 for fifteen counters and 0.86 for Thundershot, whose art sits off the middle of its counter.
  expect(upright, 'as it is').toBeGreaterThan(0.8);
  for (const turn of [20, 90, 180, 270, 340]) expect(alike(await counter(id, turn), painted), `turned ${turn}°`).toBeLessThan(upright - 0.1);
 });
});
