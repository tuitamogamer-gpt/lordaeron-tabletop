import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BORDER, INK, frameBox, withPrintedBorder } from '../scripts/card-border';

const W = 200, H = 300;
/**
 * A stand-in for a card scan: an orange frame around a white text box, set inside the given margins. `black` margins are scanner black
 * (or the printed border); `paper` is a strip of white scanner background outside them, with a grey anti-aliased step into the black.
 */
function scan({ black = [0, 0, 0, 0], paper = 0 }: { black?: number[]; paper?: number }) {
 const data = Buffer.alloc(W * H * 4);
 const [left, top, right, bottom] = black.map(n => n + paper);
 for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4, edge = Math.min(x, y, W - 1 - x, H - 1 - y);
  let rgb = [205, 120, 45];
  if (x > W * .3 && x < W * .7 && y > H * .35 && y < H * .8) rgb = [238, 232, 216];
  if (x < left || y < top || x >= W - right || y >= H - bottom) rgb = [14, 13, 12];
  if (edge < paper) rgb = edge === paper - 1 ? [120, 120, 118] : [222, 222, 220];
  data.set([...rgb, 255], i);
 }
 return data;
}

describe('the printed border of the small cards', () => {
 it('finds the printed frame inside an uneven black scanner margin', () => {
  expect(frameBox(scan({ black: [9, 14, 6, 8] }), W, H)).toEqual({ left: 9, top: 14, width: W - 15, height: H - 22 });
 });

 it('passes over white scanner background and its grey step before the printed black border', () => {
  expect(frameBox(scan({ black: [12, 12, 12, 12], paper: 3 }), W, H)).toEqual({ left: 15, top: 15, width: W - 30, height: H - 30 });
 });

 it('keeps a card that was cut inside its border as it is', () => {
  expect(frameBox(scan({}), W, H)).toEqual({ left: 0, top: 0, width: W, height: H });
 });

 it('sets the frame in the same black border on every side, with transparent rounded corners', async () => {
  const { data, info } = await withPrintedBorder(scan({ black: [9, 14, 6, 8] }), { width: W, height: H, channels: 4 });
  const frame = W - 15, b = Math.round(frame * BORDER / (1 - 2 * BORDER));
  expect(info.width).toBe(frame + 2 * b);
  expect(info.height).toBe(H - 22 + 2 * b);
  const at = (x: number, y: number) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
  expect(at(0, 0)[3]).toBe(0);
  expect(at(info.width - 1, info.height - 1)[3]).toBe(0);
  for (const [x, y] of [[1, info.height >> 1], [info.width - 2, info.height >> 1], [info.width >> 1, 1], [info.width >> 1, info.height - 2]]) expect(at(x, y)).toEqual([INK.r, INK.g, INK.b, 255]);
  expect(at(b + 2, info.height >> 1).slice(0, 3)).toEqual([205, 120, 45]);
  expect(Math.abs(info.width / info.height - (frame + 2 * b) / (H - 22 + 2 * b))).toBeLessThan(1e-9);
  expect((await sharp(data, { raw: info }).png().toBuffer()).length).toBeGreaterThan(0);
 });
});
