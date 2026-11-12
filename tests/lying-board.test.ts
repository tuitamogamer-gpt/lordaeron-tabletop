import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BOARD, BOARD_VIEW as board, LEGACY_BOARD } from '../src/data/board-geometry';
import { DISTANCE, FLAT_RELIEF, lie, LIFT, LYING_BOX as box, LYING_RELIEF, nearness, outline, seen, SIZE, sizeAt, TILT, under } from '../src/campaign/lying-board';

/**
 * The live board lies on the table and is seen a little from the front (src/campaign/lying-board.ts). The turn is worked
 * out point by point, so that names and counters stay as sharp as on the flat board; these tests pin the view itself and
 * the terrain picture that was painted for it.
 */
type Point = readonly number[];
const inside = ([x, y]: Point, polygon: Point[]) => polygon.reduce((within, [ax, ay], i) => {
 const [bx, by] = polygon[(i + 1) % polygon.length];
 return (ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax ? !within : within;
}, false);
const cx = board.x + board.width / 2, cy = board.y + board.height / 2;

describe('the view of the lying board', () => {
 it('is a mild one: 17 degrees, from 1.3 board widths, at nine tenths of the size', () => {
  expect([TILT, DISTANCE, SIZE, LIFT]).toEqual([17, 1.3, 0.9, 0.034]);
 });
 it('shows the far edge shorter than the near one, level and centred', () => {
  const [farLeft, farRight, nearRight, nearLeft] = outline();
  expect(farLeft[1]).toBe(farRight[1]); expect(nearLeft[1]).toBe(nearRight[1]); expect(farLeft[1]).toBeLessThan(nearLeft[1]);
  expect(farLeft[0] + farRight[0]).toBeCloseTo(2 * cx, 5); expect(nearLeft[0] + nearRight[0]).toBeCloseTo(2 * cx, 5);
  const taper = (farRight[0] - farLeft[0]) / (nearRight[0] - nearLeft[0]);
  expect(taper).toBeGreaterThan(0.86); expect(taper).toBeLessThan(0.89);
  // Seen from the front the board is also less deep than it is wide.
  expect(nearLeft[1] - farLeft[1]).toBeLessThan(board.height * SIZE);
 });
 it('keeps the board, its edge and its shadow inside the drawing', () => {
  const [farLeft, , nearRight, nearLeft] = outline(), edge = 15 * sizeAt(board.y + board.height), shadow = 4 + 30;
  expect(nearLeft[0]).toBeGreaterThan(board.x + 10); expect(nearRight[0]).toBeLessThan(board.x + board.width - 10);
  expect(farLeft[1]).toBeGreaterThan(board.y + 20);
  expect(nearLeft[1] + Math.max(edge, shadow)).toBeLessThan(board.y + board.height);
 });
 it('draws things larger the nearer they stand, and at nine tenths at the middle', () => {
  const steps = Array.from({ length: 21 }, (_, i) => nearness(board.y + board.height * i / 20));
  for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1]);
  expect(nearness(cy)).toBeCloseTo(SIZE, 10);
  expect(steps[0]).toBeGreaterThan(0.8); expect(steps[20]).toBeLessThan(1);
  expect(sizeAt(board.y)).toBe(0.843); expect(sizeAt(board.y + board.height)).toBe(0.965);
 });
 it('leaves straight borders straight', () => {
  for (const geo of [BOARD, LEGACY_BOARD]) for (const { a, b } of geo.borders) {
   const [ax, ay] = seen(a), [bx, by] = seen(b), [mx, my] = seen([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
   expect(Math.abs((bx - ax) * (my - ay) - (by - ay) * (mx - ax)) / Math.max(1, Math.hypot(bx - ax, by - ay))).toBeLessThan(1e-9);
  }
 });
 it('keeps every region whole: its middle stays inside its outline, on the present board and on the earlier one', () => {
  for (const geo of [BOARD, LEGACY_BOARD]) for (const shape of geo.shapes) {
   expect(inside(shape.center, shape.points), `${shape.id} flat`).toBe(true);
   expect(inside(seen(shape.center), shape.points.map(seen)), `${shape.id} lying`).toBe(true);
  }
 });
 it('finds the point of the board under a place of the drawing', () => {
  for (const { center } of BOARD.shapes) { const [x, y] = under(seen(center)); expect(x).toBeCloseTo(center[0], 8); expect(y).toBeCloseTo(center[1], 8); }
  const [x, y] = under(seen([board.x, board.y])); expect([x, y].map(n => Math.round(n * 1e6) / 1e6)).toEqual([board.x, board.y]);
 });
 it('writes places to a tenth of a board unit', () => {
  for (const { center } of BOARD.shapes) for (const n of lie(center)) expect(Math.abs(n * 10 - Math.round(n * 10))).toBeLessThan(1e-9);
  const [x, y] = seen([400, 300]); expect(lie([400, 300])).toEqual([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
 });
});

describe('the terrain painted for the lying board', () => {
 const raw = async (path: string) => { const { data, info } = await sharp(`public${path}`).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, width: info.width, height: info.height }; };
 type Picture = Awaited<ReturnType<typeof raw>>;
 /** The mean colour of a small patch around a place of a picture. */
 const patch = ({ data, width, height }: Picture, x: number, y: number, r = 4) => {
  const sum = [0, 0, 0]; let n = 0;
  for (let j = Math.round(y) - r; j <= Math.round(y) + r; j++) for (let i = Math.round(x) - r; i <= Math.round(x) + r; i++) {
   if (i < 0 || j < 0 || i >= width || j >= height) continue;
   for (let c = 0; c < 3; c++) sum[c] += data[(j * width + i) * 3 + c];
   n++;
  }
  return sum.map(v => v / n);
 };
 it('covers the box around the lying board with a margin', () => {
  const [farLeft, , nearRight, nearLeft] = outline();
  expect(box.x).toBeLessThanOrEqual(nearLeft[0] - 1); expect(box.y).toBeLessThanOrEqual(farLeft[1] - 1);
  expect(box.x + box.width).toBeGreaterThanOrEqual(nearRight[0] + 1); expect(box.y + box.height).toBeGreaterThanOrEqual(nearRight[1] + 1);
  for (const n of Object.values(box)) expect(Number.isInteger(n)).toBe(true);
 });
 it('was painted for this view: every region looks in it as it does on the flat relief (npm run map:lying)', async () => {
  const flat = await raw(FLAT_RELIEF), lying = await raw(LYING_RELIEF), density = flat.width / board.width;
  expect([lying.width, lying.height]).toEqual([Math.round(box.width * density), Math.round(box.height * density)]);
  /** How far the lying picture is from the flat one when the board is taken to be seen through `view`. */
  const distance = (view: (v: Point) => Point) => {
   let total = 0;
   for (const { center } of BOARD.shapes) {
    const here = patch(flat, (center[0] - board.x) * density, (center[1] - board.y) / board.height * flat.height);
    const [X, Y] = view(center), there = patch(lying, (X - box.x) / box.width * lying.width, (Y - box.y) / box.height * lying.height);
    total += here.reduce((sum, v, c) => sum + Math.abs(v - there[c]), 0) / 3;
   }
   return total / BOARD.shapes.length;
  };
  const right = distance(seen);
  expect(right).toBeLessThan(6);
  // A picture painted for another view would not pass: seen a twentieth of the board aside, or untilted, the same regions look different.
  expect(distance(v => { const [X, Y] = seen(v); return [X + 70, Y]; })).toBeGreaterThan(right * 3);
  expect(distance(([x, y]) => [cx + (x - cx) * SIZE, cy + (y - cy) * SIZE])).toBeGreaterThan(right * 3);
 });
});
