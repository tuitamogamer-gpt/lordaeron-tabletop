import { assert, capacity, faction, hero, note, random, shuffle } from './common.js';
import { retainedFigures } from './world.js';
import type { ContentPack, Faction, Hero, Quest, Reward, State, Tier } from './model.js';
export function awardXP(p: ContentPack, h: Hero, amount: number) {
 h.xp = Math.min(p.xp[4], h.xp + Math.max(0, amount));
 while (h.level < 5 && h.xp >= p.xp[h.level]) { h.level++; h.talentChoices.push(h.level); const cap = capacity(p, h); h.health = cap.health; h.energy = cap.energy; }
}
export function shares(s: State, total: number, heroes: Hero[]): Record<string, number> {
 if (!heroes.length) return {};
 const sorted = shuffle(s, heroes).sort((a, b) => a.xp - b.xp);
 return Object.fromEntries(sorted.map((h, i) => [h.id, Math.floor(total / heroes.length) + (i < total % heroes.length ? 1 : 0)]));
}
export function rewards(p: ContentPack, s: State, ids: string[], surviving: string[], reward: Reward, quest?: Quest) {
 const all = ids.map(id => hero(s, id)), alive = surviving.map(id => hero(s, id));
 const xp = shares(s, reward.xp, all), gold = shares(s, reward.gold, alive);
 const bonus = quest ? shuffle(s, all.filter(h => h.level < quest.level)).sort((a, b) => a.xp - b.xp)[0]?.id : undefined;
 const amounts = all.map(h => ({ h, amount: Math.max(0, (xp[h.id] ?? 0) - (quest ? Math.max(0, h.level - quest.level) : 0) + (h.id === bonus && quest ? quest.level - h.level : 0)) }));
 for (const { h, amount } of amounts) { awardXP(p, h, amount); h.gold += gold[h.id] ?? 0; note(s, `${h.id}: +${amount} XP, +${gold[h.id] ?? 0} gold.`); }
 s.reward = { faction: faction(p, ids[0]), quest: quest?.id, eligible: surviving, items: structuredClone(reward.items), special: [...reward.special ?? []], offered: [], replacement: !!quest };
 nextItem(s);
}
export function nextItem(s: State) {
 const r = s.reward!; r.offered = []; delete r.offeredDeck;
 if (r.items.length) { const item = r.items.shift()!; r.offeredDeck = item.deck; r.offered = s.itemDecks[item.deck].splice(0, item.draw); if (!r.offered.length) nextItem(s); }
 else if(r.extraItems?.length){r.offered=[r.extraItems.shift()!];}
 else if (r.special.length) { r.offered = r.special.filter(id => s.itemDecks.special.includes(id)); r.offeredDeck = 'special'; r.special = []; }
}
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
  for (let n = 0; n < Math.min(available, spawn.count); n++) s.enemies.push({ id: `${q.id}:${spawn.creature}:${spawn.region}:${n}:${spawn.color}`, creature: spawn.creature, color: spawn.color, region: spawn.region, ...(spawn.color !== 'blue' ? { quest: q.id, faction: q.faction } : {}) });
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
