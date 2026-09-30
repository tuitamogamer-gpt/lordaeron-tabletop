import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { decide } from '../src/ai/planner';
import { apply, createGame } from '../src/rules/game';
import { capacity, character, faction, hero } from '../src/rules/common';
import { legalActions } from '../src/rules/legal';
import { awardXP, startRewards } from '../src/rules/reward-engine';
import { importSession, newSession } from '../src/rules/session';
import { view } from '../src/rules/view';
import { assertState } from '../scripts/assert-state';
import type { Command } from '../src/rules/model';

describe('six-character campaigns', () => {
 it('starts all six heroes with complete powers, talents, equipment and faction quests', () => {
  const s = createGame(p, DEFAULT_SETUP);
  expect(s.heroes).toHaveLength(6);
  expect(s.variants?.overlordOnly).toBe(true);
  for (const side of ['horde', 'alliance'] as const) {
   const party = s.heroes.filter(h => faction(p, h.id) === side);
   expect(party).toHaveLength(3);
   expect(s.quests.filter(id => p.quests.find(q => q.id === id)!.faction === side)).toHaveLength(5);
   for (const h of party) {
    const c = character(p, h.id);
    expect(h).toMatchObject({ health: c.capacities[0].health, energy: c.capacities[0].energy, actions: 2, gold: 5 });
    expect(h.slots).toHaveLength(7);
    expect(p.cards.filter(card => card.classId === c.classId && card.kind === 'power' && !card.printed)).toHaveLength(12);
    expect(p.cards.filter(card => card.classId === c.classId && card.kind === 'talent')).toHaveLength(12);
    expect(p.cards.find(card => card.id === c.racial)?.abilities.length).toBeGreaterThan(0);
   }
  }
  expect(() => assertState(p, s)).not.toThrow();
 });

 it('AI uses all six seats, confirms all six loadouts, and exactly replays both faction turns', () => {
  const session = newSession(p, DEFAULT_SETUP);
  let s = createGame(p, session.setup);
  const acted = new Set<string>(), managed = new Set<string>();
  for (let i = 0; i < 160 && s.turn < 3; i++) {
   const legal = legalActions(p, s), decision = decide(p, view(s, s.heroes.map(h => h.id)), legal);
   expect(decision, `No AI command at ${s.phase}`).toBeDefined();
   const command = decision!.command;
   expect(legal).toContainEqual(command);
   const next = apply(p, s, command);
   for (const h of s.heroes) if (hero(next, h.id).actions < h.actions) acted.add(h.id);
   if (command.type === 'manage') managed.add(command.hero);
   assertState(p, next);
   session.commands.push(command); s = next;
  }
  expect(s.turn).toBe(3);
  expect([...acted].sort()).toEqual([...DEFAULT_SETUP.roster].sort());
  expect([...managed].sort()).toEqual([...DEFAULT_SETUP.roster].sort());
  expect(importSession(p, JSON.stringify(session)).state).toEqual(s);
 }, 60000);

 it.each(['horde', 'alliance'] as const)('allows the whole %s trio to challenge and share progression', side => {
  let s = createGame(p, DEFAULT_SETUP); s.faction = side;
  const party = s.heroes.filter(h => faction(p, h.id) === side), ids = party.map(h => h.id);
  const target = s.enemies.find(e => e.color !== 'blue' && e.faction === side)!;
  party.forEach(h => h.location = target.region);
  s.enemies = s.enemies.filter(e => e.color !== 'blue' || e.region !== target.region);
  const command: Command = { type: 'challenge', hero: ids[0], target: target.id, allies: ids.slice(1) };
  expect(legalActions(p, s)).toContainEqual(command);
  s = apply(p, s, command);
  expect(s.battle!.participants).toEqual(ids);
  expect(ids.map(id => hero(s, id).actions)).toEqual([1, 1, 1]);
  // The same reward program handles three recipients, including the third seat.
  delete s.battle; s.phase = 'reward';
  startRewards(p, s, ids, ids, { xp: 12, gold: 9, items: [] });
  for (const id of ids) {
   expect(hero(s, id)).toMatchObject({ xp: 4, level: 2, gold: 8, talentChoices: [2] });
   const talent = legalActions(p, s).find(c => c.type === 'talent' && c.hero === id)!;
   expect(talent).toBeDefined(); s = apply(p, s, talent);
   expect(hero(s, id).talents).toHaveLength(1);
  }
 });

 it.each([
  ['zowka-shattertusk', 'shaman-rockbiter-weapon', 0],
  ['artumnis-moondream', 'druid-bear-form', 4],
 ] as const)('trains and equips the third faction seat %s through actual commands', (id, power, slot) => {
  let s = createGame(p, DEFAULT_SETUP); s.faction = faction(p, id);
  s = apply(p, s, { type: 'train', hero: id, cards: [power] });
  for (const h of s.heroes.filter(h => faction(p, h.id) === s.faction)) while (hero(s, h.id).actions) s = apply(p, s, { type: 'rest', hero: h.id, health: 0 });
  s = apply(p, s, { type: 'endActions' });
  const slots = structuredClone(hero(s, id).slots); slots[slot].card = power;
  s = apply(p, s, { type: 'manage', hero: id, slots, discard: [] });
  expect(hero(s, id).slots[slot].card).toBe(power);
  awardXP(p, hero(s, id), 4);
  expect(hero(s, id).health).toBe(capacity(p, hero(s, id)).health);
 });
});

describe('fixed Overlord objective and independent PvP option', () => {
 it.each([false, true])('continues after turn 30 with Deadly PvP=%s', deadlyPvp => {
  let s = createGame(p, { ...DEFAULT_SETUP, variants: { overlordOnly: true, deadlyPvp } });
  s.turn = 30; s.faction = 'alliance'; s.phase = 'management'; s.wars = [];
  s.managed = s.heroes.filter(h => faction(p, h.id) === 'alliance').map(h => h.id);
  s = apply(p, s, { type: 'endManagement' });
  expect(s).toMatchObject({ phase: 'actions', turn: 1, lap: 2, faction: 'horde', variants: { overlordOnly: true, deadlyPvp } });
  expect(s.battle).toBeUndefined(); expect(s.winner).toBeUndefined();
  s.phase = 'management'; s.managed = s.heroes.filter(h => faction(p, h.id) === 'horde').map(h => h.id);
  const circle = s.itemDecks.circle[0];
  expect(apply(p, s, { type: 'endManagement' }).merchant.at(-1)).toBe(circle);
 });

 it.each([undefined, false])('replays legacy turn-30 final PvP without silently changing saved setup %s', overlordOnly => {
  const setup = { ...DEFAULT_SETUP, variants: overlordOnly === undefined ? undefined : { overlordOnly } };
  const session = newSession(p, setup), s = importSession(p, JSON.stringify(session)).state;
  expect(s.variants?.overlordOnly).toBe(overlordOnly);
  s.turn = 30; s.phase = 'management'; s.wars = [];
  s.managed = s.heroes.filter(h => faction(p, h.id) === s.faction).map(h => h.id);
  expect(apply(p, s, { type: 'endManagement' }).phase).toBe('final-management');
 });
});
