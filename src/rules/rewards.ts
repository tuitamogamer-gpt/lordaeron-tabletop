import { assert, faction, random } from './common.js';
import { retainedFigures } from './world.js';
import type { ContentPack, Faction, Quest, State, Tier } from './model.js';
export { awardXP, shares, startRewards as rewards, advanceRewards as nextItem } from './reward-engine.js';
/** Check ALL quest figures before spawning anything. Blue shortages are simply skipped. */
export function spawnQuest(p: ContentPack, s: State, q: Quest): boolean {
 const needed = new Map<string, number>();
 for (const spawn of q.spawns.filter(a => a.color !== 'blue')) { const k = `${spawn.creature}:${spawn.color}`; needed.set(k, (needed.get(k) ?? 0) + spawn.count); }
 for (const [key, n] of needed) {
  const [type, color] = key.split(':'); const c = p.creatures.find(c => c.id === type)!;
  assert(c, "This quest uses an unknown creature.");
  if (s.enemies.filter(e => e.creature === type && e.color === color).length + n > c.stock[color as 'green' | 'red']) return false;
 }
 for (const spawn of q.spawns) {
  const c = p.creatures.find(c => c.id === spawn.creature)!;
  const available = c.stock[spawn.color] - retainedFigures(s,spawn.creature,spawn.color) - s.enemies.filter(e => e.creature === spawn.creature && e.color === spawn.color).length;
  for (let n = 0; n < Math.min(available, spawn.count); n++) {
   // New Horizons can recycle a quest while its independent figures remain.
   let serial=n,id=`${q.id}:${spawn.creature}:${spawn.region}:${serial}:${spawn.color}`;
   while(s.enemies.some(e=>e.id===id))id=`${q.id}:${spawn.creature}:${spawn.region}:${++serial}:${spawn.color}`;
   s.enemies.push({ id, creature: spawn.creature, color: spawn.color, region: spawn.region, ...(spawn.color !== 'blue' ? { quest: q.id, faction: q.faction } : {}) });
  }
 }
 s.quests.push(q.id); return true;
}
export function drawQuest(p: ContentPack, s: State, f: Faction, tier: Tier): boolean {
 const deck = s.questDecks[f][tier]; const attempts = deck.length;
 for (let i = 0; i < attempts; i++) { const id = deck.shift()!, q = p.quests.find(q => q.id === id)!; if (spawnQuest(p, s, q)) return true; deck.push(id); }
 return false;
}
export function stronger(p: ContentPack, s: State): Faction[] {
 const total = (f: Faction) => s.heroes.filter(h => faction(p, h.id) === f).reduce((n, h) => n + h.xp, 0);
 const difference = total('horde') - total('alliance'); return difference === 0 ? ['horde', 'alliance'] : [difference > 0 ? 'horde' : 'alliance'];
}
export const finalAttacker = (p: ContentPack, s: State) => { const f = stronger(p, s); return f.length === 1 ? f[0] : f[random(s, 2)]; };
