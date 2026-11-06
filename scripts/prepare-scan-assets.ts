// Prepares the user's own scans of the printed game for use in the interface.
//   .local-data/scans/…  →  public/assets/scans/{cards,counters,backs,sheets,portraits,creatures,reference}/  +  src/data/scan-assets.json
// The originals stay out of Git (.local-data/); these resized copies and the manifest are committed, because the game shows them.
// Without the manifest the game falls back to its illustrated faces. Fetch the originals into .local-data/scans first
// (`npm run scans:fetch`, see docs/SCANS-2026-11-05.md), then run `npm run scans:prepare`.
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import sharp, { type OutputInfo } from 'sharp';
import { BASE_PACK as p } from '../src/data/base';

const ROOT = '.local-data/scans', OUT = 'public/assets/scans', MANIFEST = 'src/data/scan-assets.json';
const TOKENS = `${ROOT}/Tokens (will be edited and cleaned up at some point)`;
const pathOf = (reference?: string) => reference?.split(' · FAQ 1.4: ')[0];
const OVERLORD_FILE: Record<string, string> = { kazzak: 'kaz', kelthuzad: 'kel', nefarian: 'nef' };
/** The sixteen character counters, matched to their characters by their faces against the printed character sheets. */
const COUNTER: Record<string, number> = {
 'sofeea-icecall': 1, 'meadowfrey': 2, 'dongon-swiftblade': 3, 'alissi-quicksting': 4, 'wennu-bloodsinger': 5, 'weefla-sorrowfall': 6,
 'zowka-shattertusk': 7, 'shailara-whitherblade': 8, 'grumbaz-crowsblood': 9, 'brandon-lightstone': 10, 'brebo-bigshot': 11, 'artumnis-moondream': 12,
 'thundershot': 13, 'burbon-fang': 14, 'leeam-sagewind': 15, 'sandrai-darkshine': 16,
};
/** Other counters by layer: the hourglass turn marker and the Overlord counters. */
const TOKEN_LAYER = { hourglass: 17, nefarian: 26, kelthuzad: 27, kazzak: 36 } as const;

/**
 * Where things sit on a character sheet, as fractions of the scan (all eighteen are 3336×2556): the portrait on the left, then the racial
 * panel and three power slots across the top, and four equipment slots along the bottom. A character's slot k is the (k+1)th cell of the
 * top row for k < 3 and the (k−3)th of the bottom row from k = 3; the racial panel is taller than a card and starts higher.
 */
const SHEET_COLS = [[0.3255, 0.4685], [0.4976, 0.6405], [0.6697, 0.8122], [0.8378, 0.9804]] as const;
const SHEET_ROWS = [[0.2402, 0.5310], [0.6215, 0.9126]] as const;
const SHEET_RACIAL = [0.1794, 0.5310] as const;
const SHEET_PORTRAIT = { x: [0.007, 0.272], y: [0.088, 0.503] } as const;
/** On an Overlord sheet (2565×1660) the painting fills the left half. */
const SHEET_OVERLORD = { x: [0.035, 0.555], y: [0.04, 0.585] } as const;
type Region = { x: readonly [number, number]; y: readonly [number, number]; inset?: number };
/**
 * The monster reference sheet (2552×3510) shows every creature in a round portrait: the centre of each sky-blue disc, in pixels, fitted by
 * where the blue is. A disc is 336 px across and its name plate overlaps the top, so the cut-out is smaller and sits lower in the disc.
 */
const CREATURE_DISC: Record<string, readonly [number, number]> = {
 murloc: [332, 626], ghoul: [330, 1036], naga: [330, 1448], wraith: [328, 1862], wildkin: [328, 2272], drake: [322, 2690], infernal: [326, 3104],
 gnoll: [1492, 624], crusader: [1492, 1038], spider: [1490, 1458], worgen: [1490, 1866], ogre: [1490, 2274], doomguard: [1490, 2698],
};
const CREATURE_RADIUS = 136, CREATURE_DROP = 14;

type Size = { src: string; width: number; height: number };
const manifest = { cards: {} as Record<string, Size>, counters: {} as Record<string, string>, tokens: {} as Record<string, string>, backs: {} as Record<string, Size>, sheets: {} as Record<string, Size>, portraits: {} as Record<string, Size>, creatures: {} as Record<string, string>, reference: {} as Record<string, Size> };
const stats = new Map<string, { n: number; bytes: number }>(), missing: string[] = [];
const note = (group: string, file: string) => { const s = stats.get(group) ?? { n: 0, bytes: 0 }; s.n++; s.bytes += statSync(file).size; stats.set(group, s); };

/** Scans of quests and some items sit inside a wide black margin; the card itself is cropped out. */
function cardBox(data: Buffer, w: number, h: number) {
 let x0 = w, y0 = h, x1 = -1, y1 = -1;
 for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = (y * w + x) * 4;
  if (data[i + 3] > 16 && data[i] + data[i + 1] + data[i + 2] > 90) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
 }
 if (x1 < 0 || Math.min(x0, y0, w - 1 - x1, h - 1 - y1) < 6) return undefined;
 const pad = 3, left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad);
 return { left, top, width: Math.min(w, x1 + pad + 1) - left, height: Math.min(h, y1 + pad + 1) - top };
}

/** A character sheet is cut into many pieces in a row, so the decoded scan of the last file stays at hand. */
let decoded: { file: string; data: Buffer; info: OutputInfo } | undefined;
async function decode(file: string) {
 if (decoded?.file !== file) { const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); decoded = { file, data, info }; }
 return decoded;
}
/** The pixel box of a fractional region, pulled in by `inset` so that no neighbouring cell or frame shows at the edge. */
function regionBox(region: Region, w: number, h: number) {
 const inset = region.inset ?? 3, left = Math.round(region.x[0] * w) + inset, top = Math.round(region.y[0] * h) + inset;
 return { left, top, width: Math.round(region.x[1] * w) - left - inset, height: Math.round(region.y[1] * h) - top - inset };
}

/** Writes one WebP; `crop` trims a black scan margin, `region` cuts a piece out of a sheet, `rotate` turns upside-down table art upright. */
async function emit(group: keyof typeof manifest | string, dir: string, id: string, path: string, limit: number, options: { crop?: boolean; region?: Region; rotate?: number; quality?: number } = {}) {
 const file = path.startsWith(ROOT) ? path : `${ROOT}/${path}`;
 if (!existsSync(file)) { missing.push(`${id} ← ${path}`); return undefined; }
 mkdirSync(`${OUT}/${dir}`, { recursive: true });
 const { data, info } = await decode(file);
 const box = options.region ? regionBox(options.region, info.width, info.height) : options.crop ? cardBox(data, info.width, info.height) : undefined;
 let image = sharp(data, { raw: info });
 if (box) image = image.extract(box);
 if (options.rotate) image = image.rotate(options.rotate);
 if ((box ? box.width : info.width) > limit) image = image.resize({ width: limit });
 const target = `${OUT}/${dir}/${id}.webp`, out = await image.webp({ quality: options.quality ?? 88, alphaQuality: 100, smartSubsample: true, effort: 5 }).toFile(target);
 note(group, target);
 return { src: `/assets/scans/${dir}/${id}.webp`, width: out.width, height: out.height };
}

/** A round cut-out of `r` pixels around a centre, with everything outside the circle transparent. */
async function emitDisc(group: string, dir: string, id: string, path: string, [cx, cy]: readonly [number, number], r: number, size: number) {
 const file = `${ROOT}/${path}`;
 if (!existsSync(file)) { missing.push(`${id} ← ${path}`); return undefined; }
 mkdirSync(`${OUT}/${dir}`, { recursive: true });
 const { data, info } = await decode(file);
 const piece = await sharp(data, { raw: info }).extract({ left: Math.round(cx - r), top: Math.round(cy - r), width: 2 * r, height: 2 * r }).raw().toBuffer({ resolveWithObject: true });
 const round = await sharp(piece.data, { raw: piece.info }).composite([{ input: Buffer.from(`<svg width="${2 * r}" height="${2 * r}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`), blend: 'dest-in' }]).png().toBuffer();
 const target = `${OUT}/${dir}/${id}.webp`;
 await sharp(round).resize(size, size).webp({ quality: 88, alphaQuality: 100, smartSubsample: true, effort: 5 }).toFile(target);
 note(group, target);
 return `/assets/scans/${dir}/${id}.webp`;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Card faces: class cards and items, quests, events and the Overlord sheets (4 and 6 characters).
const cards: { id: string; path: string; crop: boolean; limit: number }[] = [];
for (const c of p.cards) { const path = pathOf(c.source?.reference); if (path && !path.startsWith('Character Sheets/')) cards.push({ id: c.id, path, crop: true, limit: 720 }); }
for (const q of p.quests) { const path = pathOf(q.source?.reference); if (path) cards.push({ id: q.id, path, crop: true, limit: 720 }); }
for (const e of p.events) { const path = pathOf(e.source?.reference); if (path) cards.push({ id: e.id, path, crop: true, limit: 720 }); }
for (const o of p.overlords) for (const n of [4, 6]) cards.push({ id: `overlord-${o.id}-${n}`, path: `Overlords/${OVERLORD_FILE[o.id]} ${n}.png`, crop: false, limit: 1700 });
for (const { id, path, crop, limit } of cards) { const face = await emit('cards', 'cards', id, path, limit, { crop }); if (face) manifest.cards[id] = face; }

// Character counters (upright) and the hourglass and Overlord counters.
for (const [id, layer] of Object.entries(COUNTER)) { const f = await emit('counters', 'counters', id, `${TOKENS}/Layer ${layer}.png`, 128, { rotate: 180 }); if (f) manifest.counters[id] = f.src; }
for (const [name, layer] of Object.entries(TOKEN_LAYER)) { const f = await emit('counters', 'counters', name, `${TOKENS}/Layer ${layer}.png`, 160); if (f) manifest.tokens[name] = f.src; }

// Deck backs: quest decks by faction and difficulty, the item decks, each class deck and the event deck.
const BACKS: Record<string, string> = {
 'quest-horde-green': 'Horde Quests/Green/back.png', 'quest-horde-yellow': 'Horde Quests/Yellow/back.png', 'quest-horde-red': 'Horde Quests/Red/back.png', 'quest-horde-grey': 'Horde Quests/Grey/back.png',
 'quest-alliance-green': 'Alliance Quests/Green/back.png', 'quest-alliance-yellow': 'Alliance Quests/Yellow/back.png', 'quest-alliance-red': 'Alliance Quests/Red/back.png', 'quest-alliance-grey': 'Alliance Quests/Grey/back.png',
 'item-triangle': 'White Triangle Items/back.png', 'item-square': 'Blue Square Items/back.png', 'item-circle': 'Purple Circle Items/back.png', 'item-special': 'Special Items/back.png', event: 'Event Cards/back.png',
};
for (const c of ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior']) BACKS[`class-${c.toLowerCase()}`] = `Classes/${c}/back.png`;
for (const [id, path] of Object.entries(BACKS)) { const f = await emit('backs', 'backs', id, path, 360, { crop: true }); if (f) manifest.backs[id] = f; }

// Printed character sheets (one per character; the Paladin and Shaman have single-sided sheets, their other side is blank), and the pieces
// printed on them: the portrait, the racial panel and the starting cards that no card deck holds (those face the scans of the sheet itself).
const SHEET: Record<string, string> = { alliance: 'A', horde: 'H' };
for (const c of p.characters) {
 const side = SHEET[c.faction], name = c.classId[0].toUpperCase() + c.classId.slice(1), path = `Character Sheets/${name} ${side}.png`;
 const f = await emit('sheets', 'sheets', c.id, path, 1900, { quality: 82 }); if (f) manifest.sheets[c.id] = f; else continue;
 // The cut-outs below assume the layout of the scans this was measured on; a different scan would give crooked cards.
 const { info } = await decode(`${ROOT}/${path}`);
 if (Math.abs(info.width / info.height - 3336 / 2556) > 0.01) { missing.push(`${c.id} ← ${path} has another layout (${info.width}×${info.height}), no cut-outs made`); continue; }
 const portrait = await emit('portraits', 'portraits', c.id, path, 520, { region: { ...SHEET_PORTRAIT, inset: 6 }, quality: 80 }); if (portrait) manifest.portraits[c.id] = portrait;
 const racial = await emit('cards', 'cards', `${c.id}-racial`, path, 720, { region: { x: SHEET_COLS[0], y: SHEET_RACIAL } }); if (racial) manifest.cards[`${c.id}-racial`] = racial;
 for (const [k, slot] of c.slots.entries()) {
  if (!slot.printed) continue;
  const cell = { x: SHEET_COLS[k < 3 ? k + 1 : k - 3], y: SHEET_ROWS[k < 3 ? 0 : 1] };
  const face = await emit('cards', 'cards', slot.printed, path, 720, { region: cell }); if (face) manifest.cards[slot.printed] = face;
 }
}
// The painted portraits of the Overlords: the upper left of their sheets, clear of the badge and the false-position tokens.
for (const o of p.overlords) {
 const f = await emit('portraits', 'portraits', o.id, `Overlords/${OVERLORD_FILE[o.id]} 6.png`, 640, { region: { ...SHEET_OVERLORD, inset: 0 }, quality: 82 }); if (f) manifest.portraits[o.id] = f;
}
// The creatures' round portraits, cut out of the monster reference sheet.
{
 const monsters = 'Reference Sheets/monster ref.png';
 if (existsSync(`${ROOT}/${monsters}`)) {
  const { info } = await decode(`${ROOT}/${monsters}`);
  if (info.width !== 2552 || info.height !== 3510) missing.push(`creatures ← ${monsters} has another layout (${info.width}×${info.height}), no cut-outs made`);
  else for (const [id, [cx, cy]] of Object.entries(CREATURE_DISC)) { const src = await emitDisc('creatures', 'creatures', id, monsters, [cx, cy + CREATURE_DROP], CREATURE_RADIUS, 192); if (src) manifest.creatures[id] = src; }
 } else missing.push(`creatures ← ${monsters}`);
}
for (const [id, path] of Object.entries({ rules: 'Reference Sheets/rules ref.png', monsters: 'Reference Sheets/monster ref.png' })) { const f = await emit('reference', 'reference', id, path, 1800, { quality: 84 }); if (f) manifest.reference[id] = f; }

const sorted = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([k, v]) => [k, sorted(v as Record<string, unknown>)])), null, 1) + '\n');
for (const [group, s] of stats) console.log(`${group.padEnd(10)} ${String(s.n).padStart(4)} files  ${(s.bytes / 1e6).toFixed(1)} MB`);
console.log(`manifest ${MANIFEST}`);
if (missing.length) { console.log(`${missing.length} scans not found under ${ROOT}:`); for (const m of missing.slice(0, 10)) console.log('  ', m); process.exitCode = 1; }
