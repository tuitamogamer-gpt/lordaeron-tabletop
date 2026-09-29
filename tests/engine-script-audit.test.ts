import { describe, expect, it } from 'vitest';
import { BASE_PACK as p } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { beginBattle } from '../src/rules/combat';
import { capacity, card, faction, hero } from '../src/rules/common';
import { spawnQuest } from '../src/rules/rewards';
import type { ClassId, State } from '../src/rules/model';

function fixture(cls: ClassId) {
 const def = p.characters.find(c => c.classId === cls)!, roster = [def];
 for (const c of p.characters) if (!roster.some(r => r.classId === c.classId) && roster.filter(r => r.faction === c.faction).length < 2) roster.push(c);
 const s = createGame(p, { seed: 2005, roster: roster.map(c => c.id), overlord: 'kelthuzad' });
 const h = hero(s, def.id); h.level = 5; h.xp = 28; Object.assign(h, capacity(p, h));
 return { s, id: h.id };
}
function start(s: State, id: string) {
 s.enemies = [{ id: 'audit-enemy', creature: 'murloc', color: 'blue', region: 'brill' }];
 beginBattle(s, 'pve', [id], ['audit-enemy'], faction(p, id), 'brill');
 return apply(p, s, { type: 'attacker', hero: id });
}

describe('combat equipment and quest script regressions', () => {
 it.each(['printed', 'Ravenwood Bow'])('Vanish replaces the %s pool before adding Stealth', weapon => {
  let { s, id } = fixture('rogue'); const h = hero(s, id);
  h.learned = ['rogue-vanish', 'rogue-stealth']; h.slots[0].card = 'rogue-vanish';
  if (weapon !== 'printed') h.slots[3].card = p.cards.find(c => c.name === weapon)!.id;
  const old = h.slots[3].card ?? p.characters.find(c => c.id === id)!.slots[3].printed!;
  s = start(s, id);
  expect(s.battle!.active!.dice.some(d => d.source === old)).toBe(true);
  const next = apply(p, s, { type: 'ability', hero: id, card: 'rogue-vanish', ability: 'pool' });
  expect(hero(next, id).slots[3].card).toBe('rogue-stealth');
  expect(next.battle!.active!.dice.filter(d => !d.removed).map(d => d.color).sort()).toEqual(['green', 'red', 'red']);
  expect(Math.abs(next.battle!.active!.reroll)).toBe(0);
  if (weapon !== 'printed') expect(hero(next, id).bag).toContain(old);
  expect(next.battle!.active!.dice.some(d => d.source === old)).toBe(false);
  expect(card(p, old).kind).toBe('item');
 });

 it('Unholy Power removes the displaced Demon Armor bonus and applies the new pet once', () => {
  let { s, id } = fixture('warlock'); const h = hero(s, id);
  h.learned = ['warlock-demon-armor', 'warlock-imp']; h.slots[0].card = 'warlock-demon-armor'; h.talents = ['warlock-unholy-power'];
  s = start(s, id);
  const next = apply(p, s, { type: 'ability', hero: id, card: 'warlock-unholy-power', ability: 'pool', args: { target: 'warlock-imp', slot: 0 } });
  expect(next.battle!.active!.dice.some(d => d.source === 'warlock-demon-armor')).toBe(false);
  expect(next.battle!.active!.dice.filter(d => d.source === 'warlock-imp').map(d => d.color)).toEqual(['blue', 'green']);
  expect(next.battle!.active!.reroll).toBe(1); // Human Weapon Specialization only.
  expect(hero(next, id).pets['warlock-imp']).toBe(2);
 });

 it('cannot close the same battle again while its items await distribution', () => {
  const { s, id } = fixture('warrior');
  const q = p.quests.find(q => q.faction === faction(p, id) && q.reward.items.length)!;
  s.quests = [q.id]; s.enemies = [];
  beginBattle(s, 'pve', [id], [], faction(p, id), 'brill');
  s.battle!.stage = 'over'; s.battle!.winner = faction(p, id);
  const next = apply(p, s, { type: 'closeBattle' }), before = structuredClone(next);
  expect(next.phase).toBe('reward'); expect(next.reward!.offered.length).toBeGreaterThan(0);
  expect(() => apply(p, next, { type: 'closeBattle' })).toThrow(/combat/i);
  expect(next).toEqual(before);
 });

 it('keeps independent figure IDs unique when New Horizons recycles their quest', () => {
  const { s } = fixture('warrior'); s.enemies = []; s.quests = [];
  const q = p.quests.find(q => q.tier === 'green' && q.spawns.some(v => v.color === 'blue') && q.spawns.filter(v => v.color === 'blue').every(v => p.creatures.find(c => c.id === v.creature)!.stock.blue >= 2 * v.count))!;
  expect(q).toBeDefined(); expect(spawnQuest(p, s, q)).toBe(true);
  // New Horizons returns a quest to its deck but deliberately leaves its blue figures.
  s.quests = []; s.enemies = s.enemies.filter(e => !e.quest);
  const original = structuredClone(s.enemies);
  expect(spawnQuest(p, s, q)).toBe(true);
  expect(s.enemies.filter(e => e.color === 'blue')).toHaveLength(original.length * 2);
  expect(new Set(s.enemies.map(e => e.id)).size).toBe(s.enemies.length);
  for (const e of original) expect(s.enemies).toContainEqual(e);
 });
});
