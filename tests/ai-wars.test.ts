import { describe, expect, it } from 'vitest';
import { decide } from '../src/ai/planner';
import { createStrategy } from '../src/ai/strategy';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { character, faction } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { State, War } from '../src/rules/model';
import { view } from '../src/rules/view';

const WAR: War = { id: 'event-25', regions: ['balnir', 'corrahn'], reward: { xp: 2, gold: 5, items: [] }, weakReward: { xp: 4, gold: 5, items: [] }, perHero: true };
const all = (s: State) => view(s, s.heroes.map(h => h.id));
const horde = (s: State) => s.heroes.filter(h => faction(p, h.id) === 'horde');
const name = (id: string) => p.regions.find(r => r.id === id)!.name;
/** The Domination War is on the table; no quest creature stands near enough to compete with it. */
function atWar(arrange: (s: State) => void = () => {}) {
 const s = createGame(p, DEFAULT_SETUP);
 s.wars = [structuredClone(WAR)]; s.enemies = [];
 arrange(s);
 return s;
}
const plans = (s: State, independent: string[] = []) => { const strategy = createStrategy(p, all(s), 1, independent); return horde(s).map(h => strategy.plan(h)); };

describe('a War as something to plan for', () => {
 it('tells off two characters, one for each of its regions', () => {
  const s = atWar(), [a, b, c] = plans(s), posts = [a, b, c].filter(v => v?.objective.war);
  expect(posts).toHaveLength(2);
  expect(posts.map(v => v!.objective.region).sort()).toEqual(['balnir', 'corrahn']);
  for (const v of posts) { expect(v!.objective.label).toBe('The Domination War'); expect(v!.forecast.win).toBe(1); expect(v!.party).toHaveLength(2); }
  // Each names the other as the one who holds the other region.
  const [first, second] = posts;
  expect(first!.objective.war!.other).toBe(second!.objective.region);
  expect(second!.objective.war!.partner).toBe(first!.party[0]);
 });

 it('sends the characters who are nearest', () => {
  const s = atWar(s => { const [x, y, z] = horde(s); x.location = 'balnir'; y.location = 'brill'; z.location = 'corrahn'; });
  const [x, y, z] = plans(s);
  expect(x!.objective).toMatchObject({ region: 'balnir', war: { other: 'corrahn' } });
  expect(z!.objective).toMatchObject({ region: 'corrahn', war: { other: 'balnir' } });
  expect(y?.objective.war).toBeUndefined();
 });

 it('is worth more to the faction that trails, and little to a faction at level 5', () => {
  const worth = (s: State) => plans(s).find(v => v?.objective.war)?.score ?? 0;
  // The weaker faction (less experience in total) receives the larger reward.
  const even = worth(atWar()), trailing = worth(atWar(s => { s.heroes.find(h => faction(p, h.id) === 'alliance')!.xp = 3; }));
  expect(trailing).toBeGreaterThan(even);
  expect(worth(atWar(s => { for (const h of horde(s)) h.level = 5; }))).toBeLessThan(even / 2);
 });

 it('does not count on a player’s character to walk to a region, only to stay in one', () => {
  const [x, y, z] = DEFAULT_SETUP.roster;
  const far = atWar(s => { horde(s)[1].location = 'brill'; horde(s)[2].location = 'brill'; horde(s)[0].location = 'balnir'; });
  // With both partners played by someone else and standing elsewhere, the bot has nobody to hold the other region with.
  expect(plans(far, [y, z])[0]?.objective.war).toBeUndefined();
  expect(plans(far, [])[0]?.objective.war).toBeDefined();
  const held = atWar(s => { horde(s)[0].location = 'balnir'; horde(s)[1].location = 'corrahn'; });
  expect(plans(held, [y])[0]?.objective).toMatchObject({ region: 'balnir', war: { partner: y, other: 'corrahn' } });
  expect(x).toBe(horde(held)[0].id);
 });
});

describe('a bot going to War', () => {
 it('walks to its region and says why', () => {
  const s = atWar(), [a] = horde(s), plan = createStrategy(p, all(s), 1).plan(a)!;
  expect(plan.objective.war).toBeDefined();
  const d = decide(p, all(s), legalActions(p, s).filter(c => c.type === 'travel' && c.hero === a.id))!;
  expect(d.command.type === 'travel' && d.command.path.length).toBeGreaterThan(0);
  const partner = character(p, plan.objective.war!.partner).name.split(' ')[0];
  expect(d.reason).toMatch(new RegExp(`^Going to hold ${name(plan.objective.region)} for The Domination War.*: with ${partner} in ${name(plan.objective.war!.other)} when the enemy’s turn ends, the whole faction is rewarded\\.$`));
 });

 it('stays in its region once there', () => {
  const s = atWar(s => { const [x, , z] = horde(s); x.location = 'balnir'; z.location = 'corrahn'; });
  const [x] = horde(s);
  const d = decide(p, all(s), legalActions(p, s).filter(c => 'hero' in c && c.hero === x.id && ['travel', 'rest'].includes(c.type)))!;
  expect(d.command.type === 'travel' ? d.command.path.length : 0).toBe(0);
 });

 it('wins the War for the whole faction when the bots play it out', () => {
  let s = atWar();
  const before = horde(s).map(h => h.xp);
  for (let i = 0; i < 400 && s.wars.length && s.phase !== 'finished'; i++) s = apply(p, s, decide(p, all(s), legalActions(p, s))!.command);
  expect(s.wars).toEqual([]);
  expect(s.log.some(e => e.text.startsWith('The Horde wins The Domination War'))).toBe(true);
  // Every character of the faction has the War's experience, wherever he stood.
  horde(s).forEach((h, i) => expect(h.xp).toBeGreaterThanOrEqual(before[i] + 2));
  expect(s.turn).toBeLessThan(12);
 }, 120_000);
});
