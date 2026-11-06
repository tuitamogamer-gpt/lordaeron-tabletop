// Prepares the user's own scans of the printed game for use in the interface.
//   .local-data/scans/…  →  public/assets/scans/{cards,counters,backs,sheets,reference}/  +  src/data/scan-assets.json
// The originals stay out of Git (.local-data/); these resized copies and the manifest are committed, because the game shows them.
// Without the manifest the game falls back to its illustrated faces. Fetch the originals into .local-data/scans first
// (`npm run scans:fetch`, see docs/SCANS-2026-11-05.md), then run `npm run scans:prepare`.
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
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

type Size = { src: string; width: number; height: number };
const manifest = { cards: {} as Record<string, Size>, counters: {} as Record<string, string>, tokens: {} as Record<string, string>, backs: {} as Record<string, Size>, sheets: {} as Record<string, Size>, reference: {} as Record<string, Size> };
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

/** Writes one WebP; `crop` trims a black scan margin, `rotate` turns upside-down table art upright. */
async function emit(group: keyof typeof manifest | string, dir: string, id: string, path: string, limit: number, options: { crop?: boolean; rotate?: number; quality?: number } = {}) {
 const file = path.startsWith(ROOT) ? path : `${ROOT}/${path}`;
 if (!existsSync(file)) { missing.push(`${id} ← ${path}`); return undefined; }
 mkdirSync(`${OUT}/${dir}`, { recursive: true });
 const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
 const box = options.crop ? cardBox(data, info.width, info.height) : undefined;
 let image = sharp(data, { raw: info });
 if (box) image = image.extract(box);
 if (options.rotate) image = image.rotate(options.rotate);
 if ((box ? box.width : info.width) > limit) image = image.resize({ width: limit });
 const target = `${OUT}/${dir}/${id}.webp`, out = await image.webp({ quality: options.quality ?? 88, alphaQuality: 100, smartSubsample: true, effort: 5 }).toFile(target);
 note(group, target);
 return { src: `/assets/scans/${dir}/${id}.webp`, width: out.width, height: out.height };
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

// Printed character sheets (one per character; the Paladin and Shaman have single-sided sheets, their other side is blank) and the two reference sheets.
const SHEET: Record<string, string> = { alliance: 'A', horde: 'H' };
for (const c of p.characters) {
 const side = SHEET[c.faction], name = c.classId[0].toUpperCase() + c.classId.slice(1);
 const f = await emit('sheets', 'sheets', c.id, `Character Sheets/${name} ${side}.png`, 1900, { quality: 82 }); if (f) manifest.sheets[c.id] = f;
}
for (const [id, path] of Object.entries({ rules: 'Reference Sheets/rules ref.png', monsters: 'Reference Sheets/monster ref.png' })) { const f = await emit('reference', 'reference', id, path, 1800, { quality: 84 }); if (f) manifest.reference[id] = f; }

const sorted = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([k, v]) => [k, sorted(v as Record<string, unknown>)])), null, 1) + '\n');
for (const [group, s] of stats) console.log(`${group.padEnd(10)} ${String(s.n).padStart(4)} files  ${(s.bytes / 1e6).toFixed(1)} MB`);
console.log(`manifest ${MANIFEST}`);
if (missing.length) { console.log(`${missing.length} scans not found under ${ROOT}:`); for (const m of missing.slice(0, 10)) console.log('  ', m); process.exitCode = 1; }
