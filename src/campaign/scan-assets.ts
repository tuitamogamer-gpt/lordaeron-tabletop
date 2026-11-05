import { BASE_PACK as p } from '../data/base';

export interface ScanSize { src: string; width: number; height: number }
export interface ScanAssets {
 cards: Record<string, ScanSize>;
 /** Character counters by character id, upright. */
 counters: Record<string, string>;
 /** The hourglass turn marker and the Overlord counters. */
 tokens: Record<string, string>;
 /** Deck backs: quest-<faction>-<tier>, item-<deck>, class-<class> and event. */
 backs: Record<string, ScanSize>;
 sheets: Record<string, ScanSize>;
 reference: Record<string, ScanSize>;
}
const none: ScanAssets = { cards: {}, counters: {}, tokens: {}, backs: {}, sheets: {}, reference: {} };

// The manifest is written by `npm run scans:prepare` from the user's own scans and is untracked (`*.local.*`), so a checkout
// without scans builds and runs with the illustrated faces. Tests always use the illustrated faces.
let prepared: Record<string, Partial<ScanAssets>> = {};
// Scripts such as check:render import the interface under plain Node, where there is no bundler and no import.meta.glob.
try { prepared = import.meta.glob('../data/scan-assets.local.json', { eager: true, import: 'default' }) as typeof prepared; } catch { /* not running under Vite */ }
export const SCANS: ScanAssets = import.meta.env?.MODE === 'test' ? none : { ...none, ...Object.values(prepared)[0] };
export const hasScans = Object.keys(SCANS.cards).length > 0;

/** The real scan when one was prepared for this card, otherwise the illustrated face. */
export function pickFace<T extends ScanSize>(baked: T, scan?: ScanSize): T & { scanned: boolean } {
 return scan ? { ...baked, src: scan.src, width: scan.width, height: scan.height, scanned: true } : { ...baked, scanned: false };
}

const MARK = ' · FAQ 1.4: ';
let notes: Map<string, string> | undefined;
/**
 * Printed text the FAQ later corrected. The scan shows the card as printed, so these few cards carry the correction
 * from the rules data; the illustrated faces already have the corrected text.
 */
export function faqNote(id: string): string | undefined {
 if (!notes) {
  notes = new Map();
  for (const item of [...p.cards, ...p.quests, ...p.events, ...p.overlords]) {
   const reference = item.source?.reference ?? '';
   const at = reference.indexOf(MARK);
   if (at >= 0) notes.set(item.id, reference.slice(at + MARK.length));
  }
 }
 return notes.get(id);
}
