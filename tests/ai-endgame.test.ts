import { describe, expect, it } from 'vitest';
import { decide } from '../src/ai/planner';
import { createStrategy, PEAK_FLOOR, PEAK_QUESTS, PEAK_URGENCY } from '../src/ai/strategy';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { capacity, card, faction } from '../src/rules/common';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command, Hero, State } from '../src/rules/model';
import { view } from '../src/rules/view';

const all = (s: State) => view(s, s.heroes.map(h => h.id));
const side = (s: State, f = 'horde') => s.heroes.filter(h => faction(p, h.id) === f);
const full = (h: Hero) => Object.assign(h, capacity(p, h));
/** The Horde's three characters, all of the given levels and rested, stand in the Overlord's region. */
function atTheGates(levels = [5, 5, 5]) {
 const s = createGame(p, DEFAULT_SETUP), horde = side(s);
 horde.forEach((h, i) => { h.level = levels[i]; full(h); h.location = s.overlord.region; });
 s.enemies = s.enemies.filter(e => e.region !== s.overlord.region);
 return { s, horde };
}
const score = (s: State, command: Command) => decide(p, all(s), [command])!;
const challenge = (s: State, leader: string) => legalActions(p, s).find((c): c is Extract<Command, { type: 'challenge' }> => c.type === 'challenge' && c.hero === leader && c.target === s.overlord.id && c.allies.length === 2)!;

describe('what gold is worth to a bot', () => {
 const learner = (gold: number) => {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0]; h.level = 3; full(h); h.gold = gold;
  const command = legalActions(p, s).filter((c): c is Extract<Command, { type: 'train' }> => c.type === 'train' && c.hero === h.id && c.cards.length === 1).sort((a, b) => card(p, b.cards[0]).price - card(p, a.cards[0]).price)[0];
  return { s, command, price: command ? card(p, command.cards[0]).price : 0 };
 };
 it('weighs a price in full when it empties the purse and not at all when a reserve is left', () => {
  const rich = learner(200), { price } = rich;
  expect(price).toBeGreaterThan(3);
  const poor = learner(price);
  expect(poor.command.cards).toEqual(rich.command.cards);
  expect(score(rich.s, rich.command).score - score(poor.s, poor.command).score).toBeCloseTo(price * .3, 1);
  // Halfway into the reserve, half the price counts.
  const between = learner(price + 10);
  expect(score(rich.s, rich.command).score - score(between.s, between.command).score).toBeCloseTo(price * .3 * .5, 1);
 });
});

describe('a trip to town', () => {
 /** A level 3 character with gold, far from any objective worth the walk, and a Merchant's row holding the best item this character can use. */
 function shopper(gold: number) {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0]; h.level = 3; full(h); h.gold = gold; s.enemies = []; s.quests = [];
  s.overlord.region = 'stratholme'; h.location = 'tirisfal-outpost';
  const items = p.cards.filter(c => c.kind === 'item' && c.level <= 3 && c.price <= 20 && c.price >= 8 && !s.merchant.includes(c.id));
  let best = { id: '', gain: 0 };
  // What a Town action would make of each item, were the character in Brill.
  for (const c of items) {
   const inTown = structuredClone(s); inTown.merchant = [c.id]; inTown.heroes.find(v => v.id === h.id)!.location = 'brill';
   const d = decide(p, all(inTown), legalActions(p, inTown).filter(c => c.type === 'town' && c.hero === h.id && c.operations[0]?.op === 'buy'));
   if (d && d.score > best.gain) best = { id: c.id, gain: d.score };
  }
  s.merchant = [best.id];
  return { s, h, item: card(p, best.id), worth: best.gain };
 }
 it('is taken for an item that improves the character’s equipment when the gold is in hand', () => {
  const { s, h, item, worth } = shopper(60);
  expect(worth).toBeGreaterThan(4);
  const d = decide(p, all(s), legalActions(p, s).filter(c => c.type === 'travel' && c.hero === h.id))!;
  expect(d.reason).toBe(`Going to town for ${item.name}: it improves this character’s equipment, and the gold is there.`);
  expect(d.command.type === 'travel' && d.command.path.length).toBeGreaterThan(0);
  expect(d.score).toBeGreaterThan(4);
 });
 it('is not taken by a character who cannot pay', () => {
  const { s, h } = shopper(60); h.gold = 2;
  const d = decide(p, all(s), legalActions(p, s).filter(c => c.type === 'travel' && c.hero === h.id))!;
  expect(d.reason).not.toMatch(/^Going to town/);
 });
});

describe('a faction at its peak', () => {
 it('is the whole faction at level 5, no smaller party and no lower level', () => {
  const { s, horde } = atTheGates(), strategy = createStrategy(p, all(s), 1), overlord = strategy.targets('horde').find(o => o.boss === s.overlord.id)!;
  expect(strategy.lastStand(overlord, horde)).toBe(true);
  expect(strategy.lastStand(overlord, horde.slice(0, 2))).toBe(false);
  const young = atTheGates([5, 5, 4]), other = createStrategy(p, all(young.s), 1);
  expect(other.lastStand(other.targets('horde').find(o => o.boss === young.s.overlord.id)!, young.horde)).toBe(false);
 });

 it('is drawn to the Overlord and counts on a fair chance whatever the forecast says', () => {
  const { s, horde } = atTheGates(), strategy = createStrategy(p, all(s), 1), overlord = strategy.targets('horde').find(o => o.boss === s.overlord.id)!;
  const young = atTheGates([5, 5, 4]), other = createStrategy(p, all(young.s), 1), same = other.targets('horde').find(o => o.boss === young.s.overlord.id)!;
  expect(strategy.rewardValue(overlord, horde) - other.rewardValue(same, young.horde)).toBeCloseTo(PEAK_URGENCY);
  // Starting equipment at level 5: the forecast gives next to nothing, the faction still values the attempt.
  const forecast = strategy.forecast(overlord, horde);
  expect(forecast.win).toBeLessThan(PEAK_FLOOR);
  expect(strategy.value(overlord, horde, forecast)).toBeGreaterThan(10);
  expect(other.value(same, young.horde)).toBeLessThan(0);
 });

 it('counts on less when it plays cautiously', () => {
  const { s, horde } = atTheGates(), overlord = (risk: number) => { const strategy = createStrategy(p, all(s), risk); return strategy.value(strategy.targets('horde').find(o => o.boss === s.overlord.id)!, horde); };
  expect(overlord(1.5)).toBeLessThan(overlord(1));
 });

 it('values a quest at a fraction: it brings gold and items, no growth', () => {
  const { s, horde } = atTheGates(), strategy = createStrategy(p, all(s), 1);
  const quest = strategy.targets('horde').find(o => o.quest && o.reward && o.enemies.length === s.enemies.filter(e => e.quest === o.quest).length)!, r = quest.reward!;
  expect(strategy.rewardValue(quest, horde)).toBeCloseTo((5 + r.gold * .45 + r.items.length * 3 + (r.special?.length ?? 0) * 3) * PEAK_QUESTS);
 });

 it('fights the Overlord rested: a worn member rests first', () => {
  const { s, horde } = atTheGates(), fight = challenge(s, horde[0].id);
  expect(fight).toBeDefined();
  expect(score(s, fight).reason).toMatch(/^Fighting Kel’Thuzad with 3 characters/);
  horde[1].energy = Math.floor(capacity(p, horde[1]).energy * .4);
  const worn = score(s, challenge(s, horde[0].id));
  expect(worn.reason).toBe('Resting first: the party is not at full strength for the Overlord.');
  expect(worn.score).toBeLessThan(0);
  const rest = legalActions(p, s).filter(c => c.type === 'rest' && c.hero === horde[1].id);
  const choice = decide(p, all(s), [challenge(s, horde[0].id), ...rest])!;
  expect(choice.command).toMatchObject({ type: 'rest', hero: horde[1].id });
 });

 it('attacks once everyone is rested', () => {
  const { s, horde } = atTheGates();
  const choice = decide(p, all(s), legalActions(p, s).filter(c => 'hero' in c && faction(p, c.hero) === 'horde' && ['challenge', 'rest', 'travel', 'train'].includes(c.type)))!;
  expect(choice.command).toMatchObject({ type: 'challenge', target: s.overlord.id });
  expect(choice.command.type === 'challenge' && choice.command.allies.length).toBe(2);
  expect(horde.every(h => h.level === 5)).toBe(true);
 });
});
