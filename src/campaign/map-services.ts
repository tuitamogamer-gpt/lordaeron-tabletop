// What a region offers and to whom: its town, its flight path, its graveyard.
// The printed board has a key for exactly these marks (Alliance City, Horde City, Alliance Flight Path, Horde Flight Path,
// Graveyard). The map used to draw them as one small glyph under the region's name, in one pale colour for the whole group and
// without a key: it could not be told whose a town or a flight path was. This file says in words and in board units what each
// mark is; MapServices.tsx draws it.
import type { Faction, Region } from '../rules/model';

/** Whose a town or a flight path is: one faction's, or open to both. */
export type Side = Faction | 'both';
export type ServiceKind = 'town' | 'flight' | 'graveyard';
export interface Service { kind: ServiceKind; side?: Side }
type Place = Pick<Region, 'id' | 'name' | 'town' | 'flight' | 'graveyard' | 'home'>;

const FACTION = { horde: 'Horde', alliance: 'Alliance' } as const;
export const factionName = (f: Faction) => FACTION[f];
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
const listed = (names: string[]) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;

/** The marks a region carries, in the order they stand under its name. */
export function servicesOf(r: Pick<Region, 'town' | 'flight' | 'graveyard'>): Service[] {
 return [...(r.town ? [{ kind: 'town' as const, side: r.town }] : []), ...(r.flight ? [{ kind: 'flight' as const, side: r.flight }] : []), ...(r.graveyard ? [{ kind: 'graveyard' as const }] : [])];
}
/** "Horde town", "Alliance flight path", "Town of both factions", "Graveyard". */
export function serviceName({ kind, side }: Service) {
 if (kind === 'graveyard' || !side) return 'Graveyard';
 const what = kind === 'town' ? 'town' : 'flight path';
 return side === 'both' ? `${capital(what)} of both factions` : `${FACTION[side]} ${what}`;
}
/** What a region is to the factions, in words: for its accessible name, its title and its line under the map. */
export function placeNames(r: Place): string[] {
 return [...(r.home ? [`${FACTION[r.home]} starting region`] : []), ...servicesOf(r).map(serviceName)];
}
/** Whether a character of the faction may use a town or a flight path of this side. */
export const serves = (side: Side | undefined, f: Faction) => side === f || side === 'both';
/** Where a character of the faction flies from a region in one step of Travel: every other flight path of his faction (rules/movement.ts). */
export function flightsFrom<R extends Place>(regions: R[], from: Place, f: Faction): R[] {
 return serves(from.flight, f) ? regions.filter(r => r.id !== from.id && serves(r.flight, f) && (!r.home || r.home === f)) : [];
}
/** What a mark means in play: one sentence, and for a flight path where it leads. */
export function serviceRule(service: Service, regions: Place[], at: Place): { summary: string; details: string[] } {
 const { kind, side } = service, who = side === 'both' ? 'Characters of both factions' : side ? `${FACTION[side]} characters` : '';
 if (kind === 'town') return { summary: `${who} take the Town action here: buy, sell and train. A rest here restores 3 points per level instead of 2.`, details: [] };
 if (kind === 'flight') {
  const sides = (side === 'both' ? ['horde', 'alliance'] : [side!]) as Faction[];
  return {
   summary: `${who} fly from here to any other flight path of their faction as one step of Travel.`,
   details: sides.map(f => `${sides.length > 1 ? `${FACTION[f]}: ` : 'Flies to '}${listed(flightsFrom(regions, at, f).map(r => r.name))}`),
  };
 }
 return { summary: 'A defeated character returns to play at the nearest graveyard or in his faction’s starting region.', details: [] };
}

/** A mark's box in board units. */
export const SERVICE_BOX: Record<ServiceKind, { w: number; h: number }> = { town: { w: 24, h: 29 }, flight: { w: 46, h: 22 }, graveyard: { w: 19, h: 23 } };
const GAP = 4, UNDER_NAME = 7, LINE = 7;
/**
 * The row of marks under a region's name, relative to the region's centre: each mark's centre and the row's box. `lines` is the
 * number of lines the name takes (token-layout.ts), so that a name of two lines keeps its second line clear.
 */
export function serviceRow(services: Service[], lines = 1) {
 const width = services.reduce((n, s) => n + SERVICE_BOX[s.kind].w, 0) + GAP * Math.max(0, services.length - 1), height = Math.max(0, ...services.map(s => SERVICE_BOX[s.kind].h));
 const top = (lines - 1) * LINE + UNDER_NAME, dy = top + height / 2;
 let x = -width / 2;
 return { width, height, top, bottom: top + height, marks: services.map(s => { const w = SERVICE_BOX[s.kind].w, mark = { ...s, dx: x + w / 2, dy }; x += w + GAP; return mark; }) };
}
