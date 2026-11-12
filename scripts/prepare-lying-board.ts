import sharp from 'sharp';
import { BOARD_VIEW as board } from '../src/data/board-geometry';
import { FLAT_RELIEF, LYING_BOX as box, LYING_RELIEF, under } from '../src/campaign/lying-board';

/**
 * Paints the terrain of the lying board (src/campaign/lying-board.ts): the flat relief redrawn as it is seen on the table.
 * Regions, borders, names and pieces are turned by moving their points; a painting has no points, so it is turned here once.
 *
 * Every row of the new picture shows one line of the flat board, more or less magnified (`under` gives the line and the
 * magnification), so a row is made by blending the four nearest rows of the source and then resampling that line along its
 * length, both with a Catmull-Rom curve. The picture is painted at twice its size and reduced, which keeps the far half,
 * where the board is drawn smaller than the source, free of shimmer. Outside the board the nearest edge colour is repeated:
 * the map cuts the picture along the board's outline, and nothing foreign may show in the cut.
 *
 * Run `npm run map:lying` after changing the view in lying-board.ts or replacing the flat relief; tests/lying-board.test.tsx
 * fails while the picture and the view disagree.
 */
const { data, info } = await sharp(`public${FLAT_RELIEF}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const sw = info.width, sh = info.height, density = sw / board.width, OVER = 2;
const width = Math.round(box.width * density), height = Math.round(box.height * density), W = width * OVER, H = height * OVER;
const out = Buffer.alloc(W * H * 3), line = new Float32Array(sw * 3);
const curve = (t: number) => [((-t + 2) * t - 1) * t / 2, ((3 * t - 5) * t * t + 2) / 2, ((-3 * t + 4) * t + 1) * t / 2, (t - 1) * t * t / 2];
const within = (n: number, max: number) => n < 0 ? 0 : n > max ? max : n;
for (let j = 0; j < H; j++) {
 const Y = box.y + (j + .5) / H * box.height, [left, y] = under([box.x, Y]), [right] = under([box.x + box.width, Y]);
 // The source row under this row of the picture, between pixel centres.
 const sy = (y - board.y) / board.height * sh - .5, row = Math.floor(sy), wy = curve(sy - row);
 line.fill(0);
 for (let k = 0; k < 4; k++) { const from = within(row - 1 + k, sh - 1) * sw * 3, w = wy[k]; for (let i = 0; i < sw * 3; i++) line[i] += data[from + i] * w; }
 const first = (left - board.x) * density - .5, step = (right - left) * density / W;
 for (let i = 0; i < W; i++) {
  const sx = first + (i + .5) * step, col = Math.floor(sx), wx = curve(sx - col), to = (j * W + i) * 3;
  for (let c = 0; c < 3; c++) {
   let sum = 0;
   for (let k = 0; k < 4; k++) sum += line[within(col - 1 + k, sw - 1) * 3 + c] * wx[k];
   out[to + c] = sum < 0 ? 0 : sum > 255 ? 255 : Math.round(sum);
  }
 }
}
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).resize(width, height, { kernel: 'lanczos3' }).webp({ quality: 90 }).toFile(`public${LYING_RELIEF}`);
console.log(`Lying board terrain ready: ${width} × ${height} for a box of ${box.width} × ${box.height} board units at ${box.x}, ${box.y}.`);
