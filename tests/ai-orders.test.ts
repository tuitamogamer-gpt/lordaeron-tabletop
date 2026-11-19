import { describe, expect, it } from 'vitest';
import { counsel } from '../src/ai/council';
import { committed, partyOrders, type OrderMode, type Orders } from '../src/ai/orders';
import { decide } from '../src/ai/planner';
import { createStrategy, ESCORT_WORTH } from '../src/ai/strategy';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { faction } from '../src/rules/common';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command, State } from '../src/rules/model';
import { view } from '../src/rules/view';

/**
 * What a bot and the player beside it agree before their turn (ai/orders.ts). Until 19. 11. 2026 a bot counted on the
 * player's character wherever he stood, so the bots walked to him turn after turn. Now the bot goes alone, comes with
 * him, or leads him, as agreed, and keeps to it.
 */
const [PLAYER, MAGE, SHAMAN] = DEFAULT_SETUP.roster, BOTS = DEFAULT_SETUP.roster.filter(id => id !== PLAYER);
const hero = (s: State, id: string) => s.heroes.find(h => h.id === id)!;
/** The player's character has walked to a quest creature of his faction and spent his actions; the bots still stand in the capital. */
function ahead(actions = 0) {
 const s = createGame(p, { ...DEFAULT_SETUP, seed: 77 });
 const target = s.enemies.find(e => e.faction === 'horde' && e.color !== 'blue')!;
 hero(s, PLAYER).location = target.region; hero(s, PLAYER).actions = actions;
 return { s, where: target.region };
}
/** A region beside the capital where nothing stands to be fought. */
const quiet = (s: State) => p.regions.find(r => r.neighbors.includes(hero(s, MAGE).location) && !s.enemies.some(e => e.region === r.id) && (!r.home || r.home === 'horde'))!.id;
const agreed = (s: State, mode: OrderMode, more: Partial<Record<string, OrderMode>> = {}) => partyOrders(p, s.heroes, BOTS, { [MAGE]: mode, [SHAMAN]: mode, ...more });
const plans = (s: State, orders: Orders) => { const strategy = createStrategy(p, view(s, BOTS), 1, [PLAYER], orders); return [MAGE, SHAMAN].map(id => strategy.plan(hero(s, id))); };
const own = (s: State) => legalActions(p, s).filter(c => 'hero' in c && [MAGE, SHAMAN].includes(c.hero));
const choose = (s: State, orders: Orders, legal = own(s), early = false) => decide(p, view(s, BOTS), legal, 'balanced', { independent: [PLAYER], orders, ...(early ? { early } : {}) });

describe('which bots have something to agree on', () => {
 it('gives an order to every bot with a player’s character on its side, and to no other', () => {
  const s = createGame(p, DEFAULT_SETUP), orders = partyOrders(p, s.heroes, BOTS, { [MAGE]: 'lead' });
  expect(Object.keys(orders).sort()).toEqual([MAGE, SHAMAN].sort());
  expect(orders[MAGE]).toEqual({ mode: 'lead', partners: [PLAYER] });
  // Nothing agreed yet: the bot goes its own way.
  expect(orders[SHAMAN]).toEqual({ mode: 'alone', partners: [PLAYER] });
  // A table without a player on that side has nothing to agree.
  expect(partyOrders(p, s.heroes, DEFAULT_SETUP.roster, { [MAGE]: 'lead' })).toEqual({});
  for (const id of Object.keys(orders)) expect(faction(p, id)).toBe('horde');
  expect(committed(orders, MAGE)).toBe(true); expect(committed(orders, SHAMAN)).toBe(false); expect(committed(orders, PLAYER)).toBe(false);
 });
});

describe('a bot without an order', () => {
 it('walks to wherever the player’s character stands: what the agreement replaces', () => {
  const { s, where } = ahead();
  for (const plan of plans(s, {})) { expect(plan!.objective.region).toBe(where); expect(plan!.party).toContain(PLAYER); }
 });
});

describe('a bot told to go alone', () => {
 it('never counts on the player’s character and leaves alone what stands where he is', () => {
  const { s, where } = ahead();
  for (const plan of plans(s, agreed(s, 'alone'))) {
   expect(plan).toBeDefined();
   expect(plan!.party).not.toContain(PLAYER);
   expect(plan!.objective.region).not.toBe(where);
  }
  const move = choose(s, agreed(s, 'alone'))!.command;
  expect(move.type).toBe('travel');
  expect((move as Extract<Command, { type: 'travel' }>).path.at(-1)).not.toBe(where);
 });

 it('does not ask the player’s character along when it stands beside him', () => {
  const { s, where } = ahead(2);
  hero(s, MAGE).location = where;
  const joint = legalActions(p, s).filter(c => c.type === 'challenge' && c.hero === MAGE && c.allies.includes(PLAYER));
  expect(joint.length).toBeGreaterThan(0);
  const offered = decide(p, view(s, BOTS), joint, 'balanced', { independent: [PLAYER], orders: agreed(s, 'alone') })!;
  expect(offered.score).toBeLessThan(-40);
  expect(offered.reason).toMatch(/Going its own way/);
 });

 it('makes no move while the player still has actions', () => {
  const { s } = ahead(2);
  expect(choose(s, agreed(s, 'alone'), own(s), true)).toBeUndefined();
 });

 it('is not counted on by a bot that goes with the player, nor counts on it', () => {
  const { s } = ahead(), orders = agreed(s, 'alone', { [SHAMAN]: 'follow' });
  const [mage, shaman] = plans(s, orders);
  expect(mage!.party).toEqual([MAGE]);
  expect(shaman!.party).not.toContain(MAGE);
 });
});

describe('a bot told to come with the player', () => {
 it('goes where his character is and fights there at his side', () => {
  const { s, where } = ahead();
  for (const plan of plans(s, agreed(s, 'follow'))) {
   expect(plan!.following).toBe(PLAYER);
   expect(plan!.objective.region).toBe(where);
   expect(plan!.party).toContain(PLAYER);
   expect(plan!.score).toBeGreaterThanOrEqual(ESCORT_WORTH);
  }
  const decision = choose(s, agreed(s, 'follow'))!;
  expect(decision.command).toMatchObject({ type: 'travel' });
  expect((decision.command as Extract<Command, { type: 'travel' }>).path.at(-1)).toBe(where);
  expect(decision.reason).toMatch(/Grumbaz/);
 });

 it('keeps him company where nothing stands to be fought', () => {
  const s = createGame(p, { ...DEFAULT_SETUP, seed: 77 });
  hero(s, PLAYER).location = quiet(s); hero(s, PLAYER).actions = 1;
  const [mage] = plans(s, agreed(s, 'follow'));
  expect(mage!.objective.escort).toBe(PLAYER);
  expect(mage!.objective.region).toBe(hero(s, PLAYER).location);
  expect(mage!.forecast.win).toBe(1);
 });

 it('waits for his first move, then follows at once', () => {
  const s = createGame(p, { ...DEFAULT_SETUP, seed: 77 }), empty = quiet(s);
  hero(s, PLAYER).location = empty;
  // He has not acted yet and stands where nothing is to be fought: the bot waits to see where he goes.
  expect(choose(s, agreed(s, 'follow'), own(s), true)).toBeUndefined();
  hero(s, PLAYER).actions = 1;
  const move = choose(s, agreed(s, 'follow'), own(s), true)!;
  expect(move.command).toMatchObject({ type: 'travel' });
  expect((move.command as Extract<Command, { type: 'travel' }>).path.at(-1)).toBe(empty);
 });

 it('comes at once when there is something to fight where he stands', () => {
  const { s, where } = ahead(2);
  const move = choose(s, agreed(s, 'follow'), own(s), true)!;
  expect((move.command as Extract<Command, { type: 'travel' }>).path.at(-1)).toBe(where);
 });

 it('does not begin a fight without him', () => {
  const { s, where } = ahead();
  hero(s, MAGE).location = where;
  const solo = legalActions(p, s).filter(c => c.type === 'challenge' && c.hero === MAGE && !c.allies.includes(PLAYER));
  expect(solo.length).toBeGreaterThan(0);
  const held = decide(p, view(s, BOTS), solo, 'balanced', { independent: [PLAYER], orders: agreed(s, 'follow') })!;
  expect(held.score).toBeLessThan(-40);
  expect(held.reason).toMatch(/only at Grumbaz’s side/);
  // With everything on offer the bot does something else instead.
  expect(choose(s, agreed(s, 'follow'), own(s).filter(c => 'hero' in c && c.hero === MAGE))!.command.type).not.toBe('challenge');
 });
});

describe('a bot told to lead', () => {
 it('plans for the player’s character as for its own, wherever he stands', () => {
  const s = createGame(p, { ...DEFAULT_SETUP, seed: 77 });
  for (const plan of plans(s, agreed(s, 'lead'))) {
   expect(plan!.party).toContain(PLAYER);
   expect(plan!.leading).toEqual(expect.arrayContaining([PLAYER]));
   // Nobody stands there yet: the bot counts on him to come.
   expect(plan!.objective.region).not.toBe(hero(s, PLAYER).location);
  }
 });

 it('sets off before the player moves and says where it leads', () => {
  const s = createGame(p, { ...DEFAULT_SETUP, seed: 77 }), orders = agreed(s, 'lead'), [mage] = plans(s, orders);
  const move = choose(s, orders, own(s), true)!;
  expect(move.command).toMatchObject({ type: 'travel' });
  expect(move.reason).toMatch(/^Leading the way/);
  expect(move.reason).toContain('Grumbaz');
  expect(p.regions.find(r => r.id === mage!.objective.region)).toBeDefined();
 });

 it('waits at the objective and calls the fight when the party stands together', () => {
  const { s, where } = ahead(2), orders = agreed(s, 'lead');
  hero(s, MAGE).location = where;
  const legal = legalActions(p, s).filter(c => 'hero' in c && c.hero === MAGE);
  const solo = legal.filter(c => c.type === 'challenge' && !c.allies.includes(PLAYER));
  expect(decide(p, view(s, BOTS), solo, 'balanced', { independent: [PLAYER], orders })!.reason).toMatch(/Waiting for Grumbaz to arrive/);
  // The call to the fight is the one move it makes while the player still has actions.
  const call = decide(p, view(s, BOTS), legal, 'balanced', { independent: [PLAYER], orders, early: true })!;
  expect(call.command).toMatchObject({ type: 'challenge', hero: MAGE });
  expect((call.command as Extract<Command, { type: 'challenge' }>).allies).toContain(PLAYER);
 });
});

describe('the council before the turn', () => {
 it('says for each ally what it would do alone, with the player, and leading him', () => {
  const s = createGame(p, { ...DEFAULT_SETUP, seed: 77 });
  const said = counsel(p, view(s, BOTS), [MAGE, SHAMAN], 'balanced', { independent: [PLAYER], orders: agreed(s, 'alone') });
  expect(said.map(c => c.hero)).toEqual([MAGE, SHAMAN]);
  for (const c of said) {
   expect(c.proposals.map(v => v.mode)).toEqual(['alone', 'follow', 'lead']);
   const [alone, follow, lead] = c.proposals;
   expect(alone.party).not.toContain(PLAYER);
   expect(alone.text).toMatch(/Travel away|already there|rests, trains or shops/);
   expect(follow.text).toMatch(/^Joins Grumbaz in /);
   expect(follow.region).toBe(hero(s, PLAYER).location);
   expect(lead.party).toContain(PLAYER);
   expect(lead.text).toMatch(/with Grumbaz · .*risk together$/);
   expect(lead.region).toBeDefined();
   expect(['alone', 'lead']).toContain(c.suggested);
  }
 });

 it('is what the bot then does', () => {
  const s = createGame(p, { ...DEFAULT_SETUP, seed: 77 }), orders = agreed(s, 'alone', { [MAGE]: 'lead' });
  const lead = counsel(p, view(s, BOTS), [MAGE], 'balanced', { independent: [PLAYER], orders })[0].proposals.find(v => v.mode === 'lead')!;
  const move = choose(s, orders, own(s).filter(c => 'hero' in c && c.hero === MAGE), true)!.command as Extract<Command, { type: 'travel' }>;
  const strategy = createStrategy(p, view(s, BOTS), 1, [PLAYER], orders), before = strategy.distance(hero(s, MAGE).location, lead.region!, 'horde'), after = strategy.distance(move.path.at(-1)!, lead.region!, 'horde');
  expect(after).toBeLessThan(before);
 });

 it('has nothing to say about a bot without an order', () => {
  const s = createGame(p, DEFAULT_SETUP);
  expect(counsel(p, view(s, BOTS), [MAGE], 'balanced', { independent: [PLAYER], orders: {} })).toEqual([]);
 });
});
