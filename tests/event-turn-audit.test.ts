import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { beginBattle, stats } from '../src/rules/combat';
import { faction, hero } from '../src/rules/common';
import { addWorld, drawEvents } from '../src/rules/events';
import { legalActions } from '../src/rules/legal';
import { activeEvent, distances, plagued } from '../src/rules/world';
import { decisionOwners } from '../src/multiplayer/ownership';
import type { Command, State } from '../src/rules/model';

function fresh(count = 6) {
 return createGame(p, { ...DEFAULT_SETUP, roster: count === 6 ? DEFAULT_SETUP.roster : DEFAULT_SETUP.roster.filter((_, i) => i !== 2 && i !== 5) });
}
function endTurn(s: State) {
 s = apply(p, s, { type: 'endActions' });
 for (const h of s.heroes.filter(h => faction(p, h.id) === s.faction)) s = apply(p, s, { type: 'manage', hero: h.id, slots: h.slots, discard: [] });
 return apply(p, s, { type: 'endManagement' });
}
function decisions(state: State, preferRewards = false): State {
 let s = state;
 for (let i = 0; i < 100 && (s.phase === 'event' || s.phase === 'reward' || s.heroes.some(h => h.talentChoices.length)); i++) {
  const legal = legalActions(p, s);
  const cmd = (preferRewards ? legal.find(c => c.type === 'event-choice' && c.choice.mode === 'gold') : undefined)
   ?? legal.find(c => c.type === 'event-choice' && c.choice.mode === 'skip')
   ?? legal.find(c => ['event-choice', 'bid', 'talent', 'respawn', 'reward', 'quest', 'claim-relic'].includes(c.type));
  expect(cmd, `No decision at ${s.eventFlow?.event ?? s.phase}`).toBeDefined();
  s = apply(p, s, cmd!);
 }
 expect(['event', 'reward']).not.toContain(s.phase);
 return s;
}

describe('every event card completes its turn transition', () => {
 it.each(p.events)('$id · $name', event => {
  const before = fresh(); before.turn = 3; before.turnStarted = 3;
  before.heroes.forEach((h, i) => { h.actions = 0; h.bag = [before.itemDecks.triangle.shift()!]; h.gold = 10 + i; });
  before.eventDeck = [event.id];
  const next = decisions(endTurn(before), true);
  expect(next.phase).toBe('actions'); expect(next.faction).toBe('alliance'); expect(next.turn).toBe(4);
  expect(next.eventDiscard).toEqual([event.id]); expect(next.eventDeck).toEqual([]);
  expect(next.eventFlow).toBeUndefined(); expect(next.auction).toBeUndefined();
  for (const h of next.heroes) expect(h.actions).toBe(faction(p, h.id) === 'alliance' ? 2 : 0);
  if (event.script === 'professions') for (const h of next.heroes) expect(h.gold).toBe(hero(before, h.id).gold + h.level);
  if (event.script === 'retrain') for (const h of next.heroes) expect(h.gold).toBe(hero(before, h.id).gold + 2 * h.level);
  if (['hatreds', 'subterfuge', 'bounty', 'cleanse', 'plague', 'boss'].includes(event.script!)) expect(next.world?.some(w => w.id === event.id)).toBe(true);
  if (event.script === 'war') expect(next.wars.map(w => w.id)).toContain(event.id);
  if (event.boss?.tribute === 'item') { expect(next.world!.find(w => w.id === event.id)!.items).toHaveLength(6); expect(next.heroes.every(h => !h.bag.length)).toBe(true); }
  if (event.boss?.tribute === 'gold') expect(next.world!.find(w => w.id === event.id)!.gold).toBe(36);
  if (event.script === 'auction') expect(next.heroes.flatMap(h => h.auctionItems)).toHaveLength(1);
 });
});

describe('faction turns cannot overlap or skip a side', () => {
 it.each([4, 6])('plays all 30 alternating faction turns with %i heroes and real event decisions', count => {
  let s = fresh(count); const turns: string[] = [];
  for (let turn = 1; turn <= 30; turn++) {
   expect(s.phase).toBe('actions'); expect(s.turn).toBe(turn);
   expect(s.faction).toBe(turn % 2 ? 'horde' : 'alliance'); turns.push(s.faction);
   const own = s.heroes.filter(h => faction(p, h.id) === s.faction), enemy = s.heroes.find(h => faction(p, h.id) !== s.faction)!;
   const snapshot = structuredClone(s);
   expect(() => apply(p, s, { type: 'rest', hero: enemy.id, health: 0 })).toThrow();
   expect(() => apply(p, s, { type: 'endActions' })).toThrow(); expect(s).toEqual(snapshot);
   // Interleave characters, while preserving both actions inside the same faction turn.
   for (let action = 0; action < 2; action++) for (const h of own) {
    s = apply(p, s, { type: 'rest', hero: h.id, health: 0 });
    expect(s.faction).toBe(turns.at(-1)); expect(s.turn).toBe(turn);
   }
   expect(() => apply(p, s, { type: 'rest', hero: own[0].id, health: 0 })).toThrow();
   s = decisions(endTurn(s));
  }
  expect(turns.filter(f => f === 'horde')).toHaveLength(15);
  expect(turns.filter(f => f === 'alliance')).toHaveLength(15);
  expect(s.phase).toBe('final-management'); expect(s.turn).toBe(30);
 });

 it('rejects all ordinary actions and preparatory spells from the inactive faction', () => {
  const s = fresh(), id = s.heroes.find(h => faction(p, h.id) === 'alliance')!.id;
  const attempts: Command[] = [
   { type: 'travel', hero: id, path: ['tarren-mill'] }, { type: 'rest', hero: id, health: 0 },
   { type: 'train', hero: id, cards: ['paladin-holy-light'] }, { type: 'town', hero: id, health: 0, operations: [] },
   { type: 'challenge', hero: id, target: 'pvp', allies: [] }, { type: 'portal', hero: id, allies: [] },
   { type: 'summon', hero: id, target: s.heroes[0].id }, { type: 'power-action', hero: id, card: 'paladin-lay-on-hands' },
   { type: 'manage', hero: id, slots: hero(s, id).slots, discard: [] },
  ];
  for (const cmd of attempts) { const before = structuredClone(s); expect(() => apply(p, s, cmd)).toThrow(); expect(s).toEqual(before); }
 });

 it('holds the outgoing faction until every auction bid and bonus event is resolved', () => {
  const s = fresh(); s.turn = 3; s.heroes.forEach(h => h.actions = 0); s.eventDeck = ['event-3', 'event-2', 'event-1'];
  let next = endTurn(s);
  for (const h of s.heroes) {
   expect(next.faction).toBe('horde'); expect(next.phase).toBe('event');
   expect(() => apply(p, next, { type: 'rest', hero: h.id, health: 0 })).toThrow();
   next = apply(p, next, { type: 'bid', hero: h.id, amount: 1 });
  }
  expect(next.faction).toBe('horde'); expect(next.eventFlow?.event).toBe('event-2');
  next = decisions(next, true);
  expect(next.eventDiscard).toEqual(['event-3', 'event-2', 'event-1']);
  expect(next.faction).toBe('alliance'); expect(next.turn).toBe(4);
 });

 it('war rewards and a level-up interrupt management without giving either faction another turn', () => {
  const s = fresh(4); s.heroes.forEach(h => h.actions = 0); s.eventDeck = [];
  const allies = s.heroes.filter(h => faction(p, h.id) === 'alliance');
  allies[0].location = 'andorhal'; allies[1].location = 'hearthglen';
  s.wars = [{ id: 'event-24', regions: ['andorhal', 'hearthglen'], reward: { xp: 2, gold: 5, items: [] }, weakReward: { xp: 4, gold: 5, items: [] }, perHero: true }];
  hero(s, DEFAULT_SETUP.roster[0]).xp = 1; // Alliance receives the weaker-faction reward.
  let next = endTurn(s);
  expect(next.phase).toBe('reward'); expect(next.faction).toBe('horde'); expect(next.turn).toBe(1);
  next = decisions(next);
  expect(next.faction).toBe('alliance'); expect(next.turn).toBe(2);
  for (const h of allies) expect(hero(next, h.id)).toMatchObject({ gold: 10, xp: 4, level: 2, actions: 2 });
  expect(next.wars).toEqual([]);
 });

 it('Defeat the Overlord wraps turn 30 to a Horde turn, with fresh turn-start effects', () => {
  const s = fresh(); s.variants = { overlordOnly: true }; s.turn = 30; s.turnStarted = 30; s.faction = 'alliance';
  s.heroes.forEach(h => h.actions = 0);
  const next = endTurn(s);
  expect(next).toMatchObject({ turn: 1, lap: 2, faction: 'horde', phase: 'actions', turnStarted: 1 });
  expect(next.heroes.filter(h => faction(p, h.id) === 'horde').every(h => h.actions === 2)).toBe(true);
 });
});

describe('event effects and exceptional decisions', () => {
 it('Professions and Crafts recovers the chosen split without spending a character action', () => {
  const s = fresh(); s.heroes.forEach(h => { h.level = 3; h.health = 1; h.energy = 0; }); s.eventDeck = ['event-2']; drawEvents(p, s);
  const id = s.eventFlow!.steps[0].hero, next = apply(p, s, { type: 'event-choice', hero: id, choice: { mode: 'recover', health: 1 } });
  expect(hero(next, id)).toMatchObject({ health: 2, energy: 2, actions: 2 });
 });

 it.each(['event-9', 'event-41'])('%s buys/sells a real item at the correct rounded price', event => {
  const s = fresh(); s.heroes.forEach(h => { h.gold = 100; }); s.eventDeck = [event]; drawEvents(p, s);
  const id = s.eventFlow!.steps[0].hero, item = s.merchant.find(id => p.cards.find(c => c.id === id)!.price % 2)!;
  const price = p.cards.find(c => c.id === item)!.price;
  if (event === 'event-41') { s.merchant = s.merchant.filter(v => v !== item); hero(s, id).bag.push(item); }
  const next = apply(p, s, { type: 'event-choice', hero: id, choice: { card: item } });
  expect(hero(next, id).gold).toBe(100 + (event === 'event-9' ? -Math.ceil(price / 2) : Math.floor(price / 2)));
  expect(hero(next, id).bag.includes(item)).toBe(event === 'event-9'); expect(next.merchant.includes(item)).toBe(event === 'event-41');
  expect(hero(next, id).actions).toBe(2);
 });

 it('Goblin Zeppelin allows a friendly flight point and rejects one occupied by the enemy', () => {
  const s = fresh(); s.eventDeck = ['event-6']; drawEvents(p, s);
  const id = s.eventFlow!.steps[0].hero, side = faction(p, id);
  const dest = p.regions.find(r => r.flight === side && r.id !== hero(s, id).location)!.id;
  const next = apply(p, s, { type: 'event-choice', hero: id, choice: { region: dest } });
  expect(hero(next, id).location).toBe(dest); expect(hero(next, id).actions).toBe(2);
  s.heroes.find(h => faction(p, h.id) !== side)!.location = dest;
  expect(() => apply(p, s, { type: 'event-choice', hero: id, choice: { region: dest } })).toThrow();
 });

 it('Another Path to Power replaces talents, clamps the lost capacity, and rejects a higher-level replacement', () => {
  const s = fresh(), h = s.heroes[0]; h.level = 3; h.talents = ['warrior-anger-management']; h.energy = 20;
  s.eventDeck = ['event-16']; drawEvents(p, s);
  while (s.eventFlow!.steps[0].hero !== h.id) s.eventFlow!.steps.shift();
  expect(() => apply(p, s, { type: 'event-choice', hero: h.id, choice: { mode: 'talents', talents: ['warrior-dual-wield-specialization'] } })).toThrow();
  const next = apply(p, s, { type: 'event-choice', hero: h.id, choice: { mode: 'talents', talents: ['warrior-cruelty'] } });
  expect(hero(next, h.id).talents).toEqual(['warrior-cruelty']);
  expect(hero(next, h.id).energy).toBe(p.characters.find(c => c.id === h.id)!.capacities[2].energy);
 });

 it.each([
  ['event-21', 'ogre', 1, 5], ['event-39', 'ogre', 2, 0], ['event-30', 'ogre', 4, 8],
 ] as const)('%s pays its blue-creature reward and expires when its condition is met', (event, creature, totalXP, totalGold) => {
  const s = fresh(4), own = s.heroes.filter(h => faction(p, h.id) === 'horde').map(h => h.id);
  s.quests = []; s.enemies = []; addWorld(s, event);
  beginBattle(s, 'pve', own, [], 'horde', 'andorhal'); s.battle!.stage = 'over'; s.battle!.winner = 'horde';
  s.battle!.killed = [{ id: 'trophy', creature, color: 'blue', region: 'andorhal' }];
  const next = apply(p, s, { type: 'closeBattle' });
  expect(own.reduce((sum, id) => sum + hero(next, id).xp, 0)).toBe(totalXP);
  expect(own.reduce((sum, id) => sum + hero(next, id).gold - 5, 0)).toBe(totalGold);
  expect(next.world!.some(w => w.id === event)).toBe(event === 'event-21');
 });

 it('Bounty and Old Hatreds pay after PvP and are not paid twice', () => {
  const s = fresh(4), own = s.heroes.filter(h => faction(p, h.id) === 'horde').map(h => h.id);
  const target = s.heroes.find(h => faction(p, h.id) === 'alliance')!.id;
  addWorld(s, 'event-36').tokens = [own[0], target]; addWorld(s, 'event-1');
  beginBattle(s, 'pvp', [own[0], target], [], 'horde', 'andorhal');
  s.battle!.stage = 'over'; s.battle!.winner = 'horde'; s.battle!.defeated = [target];
  const next = apply(p, s, { type: 'closeBattle' });
  expect(hero(next, own[0])).toMatchObject({ xp: 4, gold: 13 }); expect(hero(next, own[1])).toMatchObject({ xp: 3, gold: 5 });
  expect(next.world).toEqual([]); expect(() => apply(p, next, { type: 'closeBattle' })).toThrow();
 });

 it.each(['event-10', 'event-35'])('%s rounds down normally and up only with Spread the Plague', event => {
  for (const plague of [false, true]) {
   const s = fresh(), h = s.heroes[0]; h.location = s.overlord.region; h.health = 5; h.energy = 5;
   if (plague) addWorld(s, 'event-11');
   s.eventDeck = [event]; drawEvents(p, s);
   expect(h[event === 'event-10' ? 'health' : 'energy']).toBe(plague ? 2 : 3);
  }
 });

 it('unplagued Soul Taint leaves a hero at one health alive; plagued defeat resumes the chain once', () => {
  const s = fresh(), h = s.heroes[0]; h.location = s.overlord.region; h.health = 1; s.eventDeck = ['event-10'];
  drawEvents(p, s); expect(h.health).toBe(1); expect(s.respawns).toEqual([]);
  const infected = fresh(), victim = infected.heroes[0]; victim.location = infected.overlord.region; victim.health = 1;
  addWorld(infected, 'event-11'); infected.eventDeck = ['event-10']; drawEvents(p, infected);
  expect(infected.phase).toBe('event'); expect(infected.respawns).toEqual([victim.id]);
  const next = decisions(infected);
  expect(next.faction).toBe('alliance'); expect(next.eventDiscard).toEqual(['event-10']);
  expect(hero(next, victim.id)).toMatchObject({ health: 1, energy: 1, actions: 0 });
 });

 it('moving the last Plaguelands blue group removes Foul Plaguewinds before the next event', () => {
  const s = fresh(); s.enemies = [{ id: 'blue', color: 'blue', creature: 'murloc', region: 'andorhal' }];
  addWorld(s, 'event-39'); s.eventDeck = ['event-13', 'event-21']; drawEvents(p, s);
  const step = s.eventFlow!.steps[0];
  const destination = Object.entries(distances(p, 'andorhal')).find(([r, n]) => n <= 2 && !plagued(p, r) && !p.regions.find(v => v.id === r)?.home)![0];
  const next = decisions(apply(p, s, { type: 'event-choice', hero: step.hero, choice: { enemy: 'blue', region: destination } }));
  expect(activeEvent(p, next, 'winds')).toBeUndefined(); expect(activeEvent(p, next, 'ears')).toBeDefined();
 });

 it('Subterfuge gives the replacement quest decision to the original faction', () => {
  const s = fresh(), attacker = s.heroes[0].id;
  const stolen = p.quests.find(q => q.faction === 'alliance' && s.quests.includes(q.id))!;
  addWorld(s, 'event-12');
  s.enemies = s.enemies.filter(e => e.quest !== stolen.id);
  beginBattle(s, 'pve', [attacker], [], 'horde', 'brill'); s.battle!.stage = 'over'; s.battle!.winner = 'horde';
  let next = apply(p, s, { type: 'closeBattle' });
  // Distribute the thieves' rewards before the original owners choose the replacement.
  for (let i = 0; i < 20 && !legalActions(p, next).some(c => c.type === 'quest'); i++) {
   const cmd = legalActions(p, next).find(c => c.type === 'talent' || c.type === 'reward')!; next = apply(p, next, cmd);
  }
  const replacement = legalActions(p, next).find(c => c.type === 'quest')!;
  expect(replacement).toBeDefined(); expect(next.reward?.replacementFaction).toBe('alliance');
  expect(decisionOwners(p, next, replacement)).toEqual(s.heroes.filter(h => faction(p, h.id) === 'alliance').map(h => h.id));
  const done = apply(p, next, replacement);
  expect(done.phase).toBe('actions'); expect(done.faction).toBe('horde'); expect(done.turn).toBe(1);
  expect(activeEvent(p, done, 'subterfuge')).toBeUndefined();
 });

 it.each(p.events.filter(e => e.boss))('$name can be challenged and defeated without winning the campaign', event => {
  const s = fresh(), id = s.heroes[0].id; s.eventDeck = [event.id]; drawEvents(p, s);
  let next = decisions(s); next.faction = faction(p, id); hero(next, id).location = event.boss!.region;
  next.enemies = next.enemies.filter(e => e.region !== event.boss!.region);
  next = apply(p, next, { type: 'challenge', hero: id, target: event.id, allies: [] });
  expect(stats(p, next)).toMatchObject(event.boss!.stats);
  next.battle!.stage = 'defense'; next.battle!.boxes[next.faction].damage = event.boss!.stats.health;
  next = apply(p, next, { type: 'advance' }); expect(next.battle!.stage).toBe('over'); expect(next.winner).toBeUndefined();
  next = decisions(apply(p, next, { type: 'closeBattle' }));
  expect(next.phase).toBe('actions'); expect(next.faction).toBe(faction(p, id)); expect(hero(next, id).actions).toBe(1);
  if (!event.boss!.perFaction && !event.boss!.relic) expect(next.world?.some(w => w.id === event.id)).toBe(false);
 });
});
