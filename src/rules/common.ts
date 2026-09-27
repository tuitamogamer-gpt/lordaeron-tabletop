import type { ContentPack, Faction, Hero, State } from './model.js';
export class RuleError extends Error { constructor(message: string) { super(message); this.name = 'RuleError'; } }
export const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new RuleError(message); };
export const integer = (n: number, min = 0, max = 10000) => Number.isSafeInteger(n) && n >= min && n <= max;
export const other = (f: Faction): Faction => f === 'horde' ? 'alliance' : 'horde';
export const hero = (s: State, id: string) => { const h = s.heroes.find(h => h.id === id); assert(h, "Unknown hero."); return h; };
export const character = (p: ContentPack, id: string) => { const h = p.characters.find(h => h.id === id); assert(h, "Unknown character."); return h; };
export const faction = (p: ContentPack, id: string) => character(p, id).faction;
export const card = (p: ContentPack, id: string) => { const c = p.cards.find(c => c.id === id); assert(c, `Unknown card: ${id}`); return c; };
export const region = (p: ContentPack, id: string) => { const r = p.regions.find(r => r.id === id); assert(r, "Unknown region."); return r; };
export const capacity = (p: ContentPack, h: Hero) => {
 const def=character(p,h.id),base={...def.capacities[h.level-1]};
 const ids=[...h.talents,...h.auctionItems,...h.slots.flatMap((s,i)=>[s.card??def.slots[i]?.printed,...s.addons])];
 for(const id of new Set(ids)){const modifier=p.cards.find(c=>c.id===id)?.capacity;if(modifier){base.health+=modifier.health??0;base.energy+=modifier.energy??0;}}
 return base;
};
export const note = (s: State, text: string) => { s.log.push({ id: (s.log.at(-1)?.id ?? 0) + 1, turn: s.turn, text }); if (s.log.length > 250) s.log.shift(); };
export function random(s: { rng: number }, n: number): number { assert(integer(n, 1), "Invalid range."); let x = s.rng; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; s.rng = x >>> 0; return Math.floor(s.rng / 0x100000000 * n); }
export function shuffle<T>(s: { rng: number }, values: T[]): T[] { const a = [...values]; for (let i = a.length - 1; i > 0; i--) { const j = random(s, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const emptyPool = () => ({ red: 0, blue: 0, green: 0 });
export const emptyBoxes = () => ({ damage: 0, defense: 0, armor: 0, attrition: 0 });
export const colors = ['red', 'blue', 'green'] as const;
export function unique(values: unknown[]): boolean { return new Set(values).size === values.length; }
