import { BOARD_VIEW as board } from '../data/board-geometry';

/**
 * The live board lies on the table and is seen a little from the front, the way a player sees it from his chair: the far edge
 * is shorter than the near one, and the board has an edge and a shadow. The view is the one of an eye that looks at the
 * board's middle from 1.3 board widths away, after the board has been turned 17 degrees about its middle line, drawn at nine
 * tenths of its size and lifted a little, so that its near edge and its shadow stay inside the frame.
 *
 * The turn is worked out here, point by point, and the regions, borders, names and pieces are then drawn where they are seen.
 * Leaving it to the browser (a CSS 3D transform of the whole board) was tried first and measured on 12. 11. 2026: a browser
 * draws a turned element through a picture of it, and that picture came out at half the flat board's sharpness on an ordinary
 * screen and at a seventh of it on one with twice the pixel density. Points placed by this file are as sharp as the flat board.
 * Only the painted terrain cannot be turned by moving points; it is turned once, ahead of time, into a picture of its own
 * (scripts/prepare-lying-board.ts), which a test compares with this file.
 */
export const TILT = 17, DISTANCE = 1.3, SIZE = 0.9, LIFT = 0.034;

type Point = readonly number[];
const sin = Math.sin(TILT * Math.PI / 180), cos = Math.cos(TILT * Math.PI / 180);
const cx = board.x + board.width / 2, cy = board.y + board.height / 2, eye = DISTANCE * board.width, lift = LIFT * board.height;
const tenth = (n: number) => Math.round(n * 10) / 10;

/** How large something at height y of the board is drawn, compared with the flat board: least at the far edge, most at the near one. */
export const nearness = (y: number) => SIZE * eye / (eye - SIZE * (y - cy) * sin);
/** The same to three places, as it is written into the drawing. */
export const sizeAt = (y: number) => Math.round(nearness(y) * 1000) / 1000;
/** Where a point of the flat board is seen. */
export const seen = ([x, y]: Point): [number, number] => { const k = nearness(y); return [cx + (x - cx) * k, cy + (y - cy) * cos * k - lift]; };
/** The same to a tenth of a board unit, as it is written into the drawing. */
export const lie = (v: Point): [number, number] => { const [x, y] = seen(v); return [tenth(x), tenth(y)]; };
/** The point of the flat board that is seen at a place of the drawing: the way back from `seen`. */
export const under = ([X, Y]: Point): [number, number] => {
 const h = Y + lift - cy, y = cy + h * eye / (SIZE * (eye * cos + h * sin));
 return [cx + (X - cx) / nearness(y), y];
};

/** The corners of the board, or of a frame inset from its edge, as they are seen: far left, far right, near right, near left. */
export const outline = (inset = 0): [number, number][] => [
 [board.x + inset, board.y + inset], [board.x + board.width - inset, board.y + inset],
 [board.x + board.width - inset, board.y + board.height - inset], [board.x + inset, board.y + board.height - inset],
].map(lie);

/**
 * The upright box around the lying board, with a margin of one unit. The terrain picture of the lying board covers exactly
 * this box: the script that paints it and the map that shows it both read it from here.
 */
export const LYING_BOX = (() => {
 const [farLeft, , nearRight, nearLeft] = outline(), x = Math.floor(nearLeft[0]) - 1, y = Math.floor(farLeft[1]) - 1;
 return { x, y, width: Math.ceil(nearRight[0]) + 1 - x, height: Math.ceil(nearRight[1]) + 1 - y };
})();
export const FLAT_RELIEF = '/assets/warcraft/lordaeron-relief-v3.webp', LYING_RELIEF = '/assets/warcraft/lordaeron-relief-v3-lying.webp';
