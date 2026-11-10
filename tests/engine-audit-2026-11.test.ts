import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { beginBattle } from '../src/rules/combat';
import { capacity, hero } from '../src/rules/common';
import { manage } from '../src/rules/inventory';
import { legalActions } from '../src/rules/legal';
import { startRewards } from '../src/rules/reward-engine';
import { spawnQuest } from '../src/rules/rewards';
import { loadouts, scoreLoadout } from '../src/ai/loadout';
import { decide } from '../src/ai/planner';
import { faction } from '../src/rules/common';
import { view } from '../src/rules/view';
import type { Command, State } from '../src/rules/model';

const roster = ['grumbaz-crowsblood', 'sofeea-icecall', 'brandon-lightstone', 'artumnis-moondream'];
const quest = (id: string) => p.quests.find(q => q.id === id)!;

describe('engine audit, November 2026', () => {
 it('returns an item to the bag when retraining removes the talent that let it be equipped', () => {
  let s: State = createGame(p, { seed: 11, roster, overlord: 'nefarian' });
  const send = (c: Command) => { s = apply(p, s, c); };
  const w = s.heroes[0];
  w.level = 4; w.xp = 18; w.talents = ['warrior-improved-heroic-strike', 'warrior-piercing-howl', 'warrior-dual-wield-specialization'];
  const sword = s.itemDecks.triangle.find(id => p.cards.find(c => c.id === id)!.name === 'Scimitar')!;
  s.itemDecks.triangle = s.itemDecks.triangle.filter(id => id !== sword); w.bag.push(sword);
  for (const h of s.heroes.slice(0, 2)) { send({ type: 'rest', hero: h.id, health: 0 }); send({ type: 'rest', hero: h.id, health: 0 }); }
  send({ type: 'endActions' });
  // Dual Wield Specialization lets the sword sit in the general slot.
  const slots = structuredClone(s.heroes[0].slots); slots[5].card = sword;
  send({ type: 'manage', hero: w.id, slots, discard: [] });
  expect(s.heroes[0].slots[5].card).toBe(sword);
  // "Another Path to Power" comes up as the next event.
  s = structuredClone(s); s.eventDeck = ['event-16', ...s.eventDeck.filter(id => id !== 'event-16')]; s.turn = 3;
  send({ type: 'manage', hero: 'sofeea-icecall', slots: s.heroes[1].slots, discard: [] }); send({ type: 'endManagement' });
  expect(s.eventFlow?.event).toBe('event-16');
  while (s.phase === 'event') {
   const step = s.eventFlow!.steps[0];
   send({ type: 'event-choice', hero: step.hero, choice: step.hero === w.id ? { mode: 'talents', talents: ['warrior-improved-heroic-strike', 'warrior-piercing-howl', 'warrior-enrage'] } : { mode: 'skip' } });
  }
  expect(s.heroes[0].slots[5].card).toBeUndefined();
  expect(s.heroes[0].bag).toContain(sword);
  // The sheet stays legal: the next management phase enumerates and accepts the unchanged equipment.
  for (const id of ['brandon-lightstone', 'artumnis-moondream']) { send({ type: 'rest', hero: id, health: 0 }); send({ type: 'rest', hero: id, health: 0 }); }
  send({ type: 'endActions' });
  for (const id of ['brandon-lightstone', 'artumnis-moondream']) send({ type: 'manage', hero: id, slots: hero(s, id).slots, discard: [] });
  send({ type: 'endManagement' });
  for (const id of ['grumbaz-crowsblood', 'sofeea-icecall']) { send({ type: 'rest', hero: id, health: 0 }); send({ type: 'rest', hero: id, health: 0 }); }
  send({ type: 'endActions' });
  expect(s.phase).toBe('management');
  expect(legalActions(p, s).length).toBeGreaterThan(0);
  expect(() => apply(p, s, { type: 'manage', hero: w.id, slots: s.heroes[0].slots, discard: [] })).not.toThrow();
 });

 it('still proposes loadouts when the unchanged sheet is illegal', () => {
  const s = createGame(p, { seed: 11, roster, overlord: 'nefarian' }), h = s.heroes[0];
  // Four items after a forced unequip: the unchanged sheet is illegal, so every proposal equips or discards one.
  h.bag = s.itemDecks.triangle.splice(0, 4);
  expect(() => manage(p, { merchant: [] }, structuredClone(h), h.slots, [])).toThrow('at most three items');
  const options = loadouts(p, h);
  expect(options.length).toBeGreaterThan(0);
  for (const c of options) expect(() => manage(p, { merchant: [] }, structuredClone(h), c.slots, c.discard, c.reEquip)).not.toThrow();
 });

 it('lets the faction continue when its remaining quests need figures that are already on the map', () => {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0];
  // "Monsters on the March" holds the only red Ogre; the last card in the Horde decks needs it as well.
  s.questDecks.horde.yellow = s.questDecks.horde.yellow.filter(id => id !== 'quest-horde-monsters-on-the-march');
  expect(spawnQuest(p, s, quest('quest-horde-monsters-on-the-march'))).toBe(true);
  s.questDecks.horde = { grey: [], green: [], yellow: [], red: ['quest-horde-brutes-in-the-barrows'] };
  const done = quest(s.quests.find(id => quest(id).faction === 'horde' && quest(id).tier === 'grey')!);
  s.enemies = s.enemies.filter(e => e.quest !== done.id); s.quests = s.quests.filter(id => id !== done.id); s.completed.push(done.id);
  beginBattle(s, 'pve', [h.id], [], 'horde', h.location); s.battle!.stage = 'over'; s.battle!.winner = 'horde'; s.phase = 'reward';
  startRewards(p, s, [h.id], [h.id], { xp: 0, gold: 0, items: [] }, done);
  expect(s.reward?.replacement).toBe(true);
  expect(() => apply(p, s, { type: 'quest', tier: 'red' })).toThrow('cannot currently be placed');
  expect(legalActions(p, s)).toEqual([{ type: 'skip-quest' }]);
  const next = apply(p, s, { type: 'skip-quest' });
  expect(next.phase).toBe('actions');
  expect(next.log.at(-1)?.text).toContain('can be placed');
  expect(next.questDecks.horde.red).toEqual(['quest-horde-brutes-in-the-barrows']);
 });

 it('still requires a draw while any remaining quest can be placed', () => {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0];
  const done = quest(s.quests.find(id => quest(id).faction === 'horde' && quest(id).tier === 'grey')!);
  s.enemies = s.enemies.filter(e => e.quest !== done.id); s.quests = s.quests.filter(id => id !== done.id); s.completed.push(done.id);
  beginBattle(s, 'pve', [h.id], [], 'horde', h.location); s.battle!.stage = 'over'; s.battle!.winner = 'horde'; s.phase = 'reward';
  startRewards(p, s, [h.id], [h.id], { xp: 0, gold: 0, items: [] }, done);
  expect(() => apply(p, s, { type: 'skip-quest' })).toThrow('still available');
 });

 it('clears Stun and extra energy when a mage leaves the battle with Ice Block', () => {
  let s: State = createGame(p, { seed: 19, roster, overlord: 'nefarian' });
  const m = hero(s, 'sofeea-icecall');
  m.level = 3; m.xp = 10; m.talents = ['mage-arcane-focus', 'mage-ice-block']; Object.assign(m, capacity(p, m));
  s.enemies = [{ id: 'audit-enemy', creature: 'murloc', color: 'blue', region: m.location }];
  beginBattle(s, 'pve', [m.id], ['audit-enemy'], 'horde', m.location);
  s = apply(p, s, { type: 'attacker', hero: m.id }); s = apply(p, s, { type: 'roll' });
  expect(s.battle!.stage).toBe('after-pool');
  // A creature effect left a Stun, and a power lifted energy above the sheet's capacity for this battle.
  const cap = capacity(p, hero(s, m.id)).energy; hero(s, m.id).stun = 1; hero(s, m.id).energy = cap + 2;
  s = apply(p, s, { type: 'ability', hero: m.id, card: 'mage-ice-block', ability: 'after-pool' });
  expect(s.battle!.stage).toBe('over');
  expect(hero(s, m.id).stun).toBe(0);
  expect(hero(s, m.id).energy).toBe(cap);
  s = apply(p, s, { type: 'closeBattle' });
  expect(hero(s, m.id).stun).toBe(0);
 });

 it('defeats an attacker once when Bloodrage kills them in front of Lord Kazzak', () => {
  let s: State = createGame(p, { seed: 7, roster, overlord: 'kazzak' });
  const w = s.heroes[0];
  w.level = 3; w.xp = 10; w.learned = ['warrior-bloodrage']; w.slots[1].card = 'warrior-bloodrage'; w.health = 3; w.energy = 2; w.talents = ['warrior-improved-heroic-strike', 'warrior-cruelty'];
  w.location = s.kazzak!.find(t => t.real)!.region; s.heroes[1].location = w.location;
  s = apply(p, s, { type: 'challenge', hero: w.id, target: 'kazzak', allies: ['sofeea-icecall'] });
  s = apply(p, s, { type: 'attacker', hero: w.id });
  s = apply(p, s, { type: 'ability', hero: w.id, card: 'warrior-bloodrage', ability: 'pool-3' });
  expect(s.respawns).toEqual([w.id]);
  s = apply(p, s, legalActions(p, s).find(c => c.type === 'respawn')!);
  // Kazzak's end-of-step penalty no longer treats the unrolled dice as 1s and 2s of a hero who has already fallen.
  expect(s.respawns).toEqual([]);
  expect(s.battle!.defeated).toEqual([w.id]);
  expect(hero(s, w.id).health).toBe(1);
  expect(legalActions(p, s).some(c => c.type === 'respawn')).toBe(false);
 });

 it('rejects attack-step commands with a rule error while no attack is active', () => {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0];
  s.enemies = [{ id: 'audit-enemy', creature: 'murloc', color: 'blue', region: h.location }];
  beginBattle(s, 'pve', [h.id], ['audit-enemy'], 'horde', h.location); s.phase = 'combat';
  expect(s.battle!.active).toBeUndefined();
  for (const c of [{ type: 'tokens' }, { type: 'monster' }, { type: 'penalty', dice: [] }] as Command[])
   expect(() => apply(p, s, c)).toThrow(expect.objectContaining({ name: 'RuleError' }));
 });

 it('names the faction in the turn log', () => {
  let s: State = createGame(p, { seed: 11, roster, overlord: 'nefarian' });
  for (const h of s.heroes.slice(0, 2)) { s = apply(p, s, { type: 'rest', hero: h.id, health: 0 }); s = apply(p, s, { type: 'rest', hero: h.id, health: 0 }); }
  s = apply(p, s, { type: 'endActions' });
  for (const h of s.heroes.slice(0, 2)) s = apply(p, s, { type: 'manage', hero: h.id, slots: h.slots, discard: [] });
  s = apply(p, s, { type: 'endManagement' });
  expect(s.log.at(-1)?.text).toBe('The Alliance begins faction turn 2.');
 });
});

describe('AI audit, November 2026', () => {
 it('declines a pointless trade when it is the only move a bot owns', () => {
  const s = createGame(p, DEFAULT_SETUP), [giver, ally] = s.heroes.filter(h => faction(p, h.id) === 'horde');
  // A level-5 item neither level-1 hero can equip: handing it over improves nothing.
  const item = p.cards.find(c => c.kind === 'item' && c.level === 5 && !c.addon)!.id;
  giver.bag = [item]; ally.location = giver.location; s.tradeWindow = true;
  const trade: Command = { type: 'trade', hero: giver.id, to: ally.id, items: [item], receiveItems: [], gold: 0, receiveGold: 0 };
  expect(() => apply(p, s, trade)).not.toThrow();
  expect(decide(p, view(s, s.heroes.map(h => h.id)), [trade])).toBeUndefined();
  // With a real alternative the bot still acts.
  expect(decide(p, view(s, s.heroes.map(h => h.id)), [trade, { type: 'endActions' }])?.command).toEqual({ type: 'endActions' });
 });

 it('rates the replacement quest for the faction that draws it', () => {
  const pick = (horde: number, alliance: number) => {
   const s = createGame(p, DEFAULT_SETUP);
   for (const h of s.heroes) { h.level = faction(p, h.id) === 'horde' ? horde : alliance; h.xp = p.xp[h.level - 1]; }
   s.phase = 'reward';
   // Subterfuge: the Horde completed an Alliance quest, so the Alliance draws the replacement.
   s.reward = { faction: 'horde', replacementFaction: 'alliance', eligible: s.heroes.filter(h => faction(p, h.id) === 'horde').map(h => h.id), items: [], special: [], offered: [], replacement: true };
   return decide(p, view(s, s.heroes.map(h => h.id)), [{ type: 'quest', tier: 'green' }, { type: 'quest', tier: 'yellow' }, { type: 'quest', tier: 'red' }])!.command;
  };
  expect(pick(2, 4)).toEqual({ type: 'quest', tier: 'red' });
  expect(pick(4, 2)).toEqual({ type: 'quest', tier: 'green' });
 });

 it('returns loadouts best first', () => {
  const s = createGame(p, { seed: 11, roster, overlord: 'nefarian' }), h = s.heroes[0];
  h.level = 3; h.bag = s.itemDecks.triangle.splice(0, 3); h.learned = p.cards.filter(c => c.kind === 'power' && c.classId === 'warrior' && !c.printed && c.level <= 3).map(c => c.id).slice(0, 4);
  const scores = loadouts(p, h).map(c => scoreLoadout(p, h, c));
  expect(scores.length).toBeGreaterThan(1);
  expect(scores).toEqual([...scores].sort((a, b) => b - a));
 });
});

