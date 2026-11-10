// The printed black border of the small cards (class powers and talents, items and the starting cards of the character sheets).
// The scans came cut three ways: some with the whole printed border and white scanner background in the corners, some inside a black
// scanner margin that is wider on one side than the other, and many cut inside the border, so the frame runs to the edge. Shown side by
// side (a merchant row, a spellbook) they looked like cards from different printings. Every such face is now cut to its printed frame and
// set in the same black border with rounded corners, so they read as one deck.
import sharp from 'sharp';
import type { ContentPack } from '../src/rules/model';

/** Share of the finished card's width taken by the black border, and the radius of its corners, measured on the item scans that show the whole printed card. */
export const BORDER = 0.035, RADIUS = 0.065;
/** The black of the printed border in the scans. */
export const INK = { r: 16, g: 15, b: 14, alpha: 1 };
/** Scan folders whose cards get the border; the starting cards cut from the character sheets get it as well. */
const FOLDERS = ['Classes/', 'White Triangle Items/', 'Blue Square Items/', 'Purple Circle Items/', 'Special Items/'];

/** The class cards, the items of the four merchant decks and the printed starting cards: the faces that are set in the printed border. */
export function borderedCards(p: ContentPack): Set<string> {
 const ids = new Set<string>();
 for (const c of p.cards) { const path = c.source?.reference?.split(' · FAQ 1.4: ')[0]; if (path && FOLDERS.some(f => path.startsWith(f))) ids.add(c.id); }
 for (const c of p.characters) for (const slot of c.slots) if (slot.printed) ids.add(slot.printed);
 return ids;
}

type Box = { left: number; top: number; width: number; height: number };
/**
 * The black must begin this close to the edge: before it there may be a strip of white scanner background and the grey anti-aliased
 * pixels where it meets the border. It must also run at least `RUN` lines, so a thin dark outline of a frame that reaches the edge is
 * not mistaken for it.
 */
const REACH = 12, RUN = 4;

/** A pixel of the black border or of a black scanner margin. */
function black(data: Uint8Array, i: number) {
 const r = data[i], g = data[i + 1], b = data[i + 2], high = Math.max(r, g, b);
 return high < 60 && high - Math.min(r, g, b) < 30;
}

/**
 * The printed frame of a card, inside its black border or black scanner margin and any white scanner background around them. Each side
 * is measured over the middle of the card, clear of the rounded corners, as rows or columns that are mostly black. A side without black
 * (the card was cut inside its border) stays as it is, and no side gives up more than an eighth of the card.
 */
export function frameBox(data: Uint8Array, w: number, h: number, channels = 4): Box {
 const xa = Math.floor(w * 0.18), xb = Math.ceil(w * 0.82), ya = Math.floor(h * 0.18), yb = Math.ceil(h * 0.82);
 const column = (x: number) => { let n = 0; for (let y = ya; y < yb; y++) if (black(data, (y * w + x) * channels)) n++; return n / (yb - ya) >= 0.5; };
 const row = (y: number) => { let n = 0; for (let x = xa; x < xb; x++) if (black(data, (y * w + x) * channels)) n++; return n / (xb - xa) >= 0.5; };
 const inset = (line: (k: number) => boolean, size: number, fromEnd: boolean) => {
  const at = (k: number) => line(fromEnd ? size - 1 - k : k), limit = Math.floor(size / 8);
  const begins = (k: number) => { for (let i = k; i < k + RUN; i++) if (!at(i)) return false; return true; };
  let k = 0;
  while (k < REACH && !begins(k)) k++;
  if (k === REACH) return 0;
  while (k < limit && at(k)) k++;
  return k;
 };
 const left = inset(column, w, false), right = inset(column, w, true), top = inset(row, h, false), bottom = inset(row, h, true);
 return { left, top, width: w - left - right, height: h - top - bottom };
}

/** Written into each bordered face (EXIF image description), so the border is never added twice; some scans have transparent corners of their own. */
export const MARK = 'Lordaeron printed border';
export const exif = { IFD0: { ImageDescription: MARK } };
/** True when a prepared face already carries the border. */
export const hasBorder = (metadata: { exif?: Buffer }) => !!metadata.exif?.toString('latin1').includes(MARK);

/** The card cut to its printed frame and set in the black border with rounded corners, as raw RGBA. */
export async function withPrintedBorder(data: Buffer, info: { width: number; height: number; channels: 1 | 2 | 3 | 4 }) {
 const box = frameBox(data, info.width, info.height, info.channels);
 const b = Math.round(box.width * BORDER / (1 - 2 * BORDER)), width = box.width + 2 * b, height = box.height + 2 * b, r = Math.round(width * RADIUS);
 const corners = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
 const framed = await sharp(data, { raw: info }).ensureAlpha().extract(box).extend({ top: b, bottom: b, left: b, right: b, background: INK }).png().toBuffer();
 return sharp(framed).composite([{ input: corners, blend: 'dest-in' }]).raw().toBuffer({ resolveWithObject: true });
}
