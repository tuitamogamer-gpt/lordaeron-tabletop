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
  // Alone in earnest now, the mage takes on what it can by itself, or stays with the player when that is nothing.
  expect(mage!.party).not.toContain(SHAMAN);
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

/**
 * 20. 11. 2026: a player with a mage and a rogue beside him as his only ally found that the rogue never left town. Told to go
 * its own way (what a bot does until something else is agreed), a lone character of level 1 has no fight worth walking to, and
 * the agreement forbade it the player's company: it visited the market for nothing, turn after turn.
 */
describe('a bot that goes alone and can win nothing alone', () => {
 const ROGUE = 'dongon-swiftblade', WIZARD = 'sofeea-icecall', PAIR = [WIZARD, ROGUE, 'brandon-lightstone', 'burbon-fang'], SEATS = PAIR.filter(id => id !== WIZARD);
 /** Two against two: the player's mage and the rogue, the only bot on his side. The rogue is too hurt to fight anything by itself. */
 const pair = () => { const s = createGame(p, { ...DEFAULT_SETUP, seed: 7, roster: PAIR }); hero(s, ROGUE).health = 1; return s; };
 const orders = (s: State, mode: OrderMode = 'alone') => partyOrders(p, s.heroes, SEATS, { [ROGUE]: mode });
 const rogue = (s: State) => legalActions(p, s).filter(c => 'hero' in c && c.hero === ROGUE);
 const pick = (s: State, legal = rogue(s), early = false) => decide(p, view(s, SEATS), legal, 'balanced', { independent: [WIZARD], orders: orders(s), ...(early ? { early } : {}) });
 it('stays with the player’s character instead of standing still', () => {
  const s = pair(), away = quietFrom(s, hero(s, WIZARD).location);
  hero(s, WIZARD).location = away; hero(s, WIZARD).actions = 1;
  const plan = createStrategy(p, view(s, SEATS), 1, [WIZARD], orders(s)).plan(hero(s, ROGUE))!;
  expect(plan).toMatchObject({ following: WIZARD, joined: true });
  expect(plan.objective.region).toBe(away);
  // He has made his first move: the rogue is asked at once, and goes after him.
  const move = pick(s, rogue(s), true)!;
  expect(move.command).toMatchObject({ type: 'travel', hero: ROGUE }); expect((move.command as Extract<Command, { type: 'travel' }>).path.at(-1)).toBe(away);
  expect(move.reason).toContain('Sofeea'); expect(move.reason).toContain('nothing to win alone yet');
 });
 it('goes its own way again as soon as there is something it can win by itself', () => {
  const s = pair(); hero(s, ROGUE).health = 3;
  const strategy = createStrategy(p, view(s, SEATS), 1, [WIZARD], orders(s)), plan = strategy.plan(hero(s, ROGUE));
  // Whatever it finds, it is the rogue's own plan or the player's company, never a wait without either.
  expect(plan).toBeDefined();
  if (!plan!.joined) expect(plan!.party).toEqual([ROGUE]);
 });
 it('says in the council that it stays with the player, and suggests leading where the two can win together', () => {
  const s = pair(), said = counsel(p, view(s, SEATS), [ROGUE], 'balanced', { independent: [WIZARD], orders: orders(s) })[0];
  const alone = said.proposals.find(v => v.mode === 'alone')!, lead = said.proposals.find(v => v.mode === 'lead')!;
  expect(alone.joined).toBe(true); expect(alone.text).toMatch(/^Nothing it can win alone yet: stays with Sofeea/);
  expect(said.suggested).toBe(lead.joined || !Number.isFinite(lead.score) || lead.score < .5 ? 'alone' : 'lead');
 });
});

describe('an action that would change nothing', () => {
 const ROGUE = 'dongon-swiftblade', WIZARD = 'sofeea-icecall', PAIR = [WIZARD, ROGUE, 'brandon-lightstone', 'burbon-fang'], SEATS = PAIR.filter(id => id !== WIZARD);
 it('is never taken: a bot with nothing to do passes and says what it waits for', () => {
  const s = createGame(p, { ...DEFAULT_SETUP, seed: 7, roster: PAIR }); hero(s, ROGUE).health = 1; hero(s, ROGUE).gold = 0;
  // At full energy in town with no gold, beside the player's character who has not moved: nothing to buy, learn or recover but health.
  const legal = legalActions(p, s).filter(c => 'hero' in c && c.hero === ROGUE);
  const idle = legal.filter(c => c.type === 'town' && !c.operations.length && c.health === 0 || c.type === 'rest' && c.health === 0 && !c.food);
  expect(idle.length).toBeGreaterThan(0);
  const orders = partyOrders(p, s.heroes, SEATS, {});
  // Offered nothing but those and a pass, the bot passes.
  const choice = decide(p, view(s, SEATS), [...idle, { type: 'travel', hero: ROGUE, path: [] }], 'balanced', { independent: [WIZARD], orders })!;
  expect(choice.command).toEqual({ type: 'travel', hero: ROGUE, path: [] });
  expect(choice.reason).toBe('Staying beside Sofeea: nothing to fight here until Sofeea moves on.');
 });
});
/** A region next to `from` where nothing stands to be fought. */
function quietFrom(s: State, from: string) { return p.regions.find(r => r.neighbors.includes(from) && !s.enemies.some(e => e.region === r.id) && (!r.home || r.home === 'horde'))!.id; }
