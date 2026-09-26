import { assert, character, faction, hero, region } from './common';
import type { ContentPack, Hero, State } from './model';
export const independents = (s: State, at: string) => s.enemies.filter(e => e.region === at && e.color === 'blue');
export function steps(p: ContentPack, h: Hero, from: string): string[] {
 const r = region(p, from), f = faction(p, h.id);
 return [...new Set([...r.neighbors, ...(r.flight === f || r.flight === 'both' ? p.regions.filter(a => a.flight === f || a.flight === 'both').map(a => a.id) : [])])].filter(id => id !== from && (!region(p, id).home || region(p, id).home === f));
}
export function reachable(p: ContentPack, s: State, h: Hero): Record<string, string[]> {
 if (s.phase !== 'actions' || faction(p, h.id) !== s.faction || h.actions < 1 || independents(s, h.location).length) return {};
 const result: Record<string, string[]> = {}, queue = [{ at: h.location, path: [] as string[] }];
 while (queue.length) {
  const n = queue.shift()!;
  if (n.path.length === 2 || (n.path.length && independents(s, n.at).length)) continue;
  for (const next of steps(p, h, n.at)) if (next !== h.location && !result[next]) {
   result[next] = [...n.path, next]; queue.push({ at: next, path: result[next] });
  }
 }
 return result;
}
export function travel(p: ContentPack, s: State, h: Hero, path: string[]) {
 assert(path.length <= 2, 'Putovanje ima najviše dva koraka.');
 let at = h.location;
 for (const next of path) {
  assert(!independents(s, at).length, 'Nezavisno čudovište zaustavlja putovanje.');
  assert(steps(p, h, at).includes(next), 'Regije nisu povezane dozvoljenim putem.'); at = next;
 }
 h.location = at;
}
/** Graveyard distance ignores flight paths; a graveyard in the defeat region is excluded (p26). */
export function respawnRegions(p: ContentPack, s: State, id: string): string[] {
 const h = hero(s, id), f = character(p, id).faction;
 const home = p.regions.find(r => r.home === f)!.id;
 const distances = new Map([[h.location, 0]]), queue = [h.location]; let nearest = Infinity; const found: string[] = [];
 while (queue.length) {
  const at = queue.shift()!, d = distances.get(at)!;
  if (d > nearest) break;
  const r = region(p, at);
  if (d > 0 && r.graveyard) { nearest = d; found.push(at); continue; }
  for (const next of r.neighbors) if (!distances.has(next) && (!region(p, next).home || region(p, next).home === f)) { distances.set(next, d + 1); queue.push(next); }
 }
 return [...new Set([home, ...found])];
}
