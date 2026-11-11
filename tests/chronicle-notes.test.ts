import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { decide } from '../src/ai/planner';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';

// The Chronicle used to print internal ids: “grumbaz-crowsblood travels to pestilent.”, “alliance begins faction turn 16.”
describe('the chronicle is written in names, not ids', () => {
 it('names the character, the region and what was done', () => {
  let s = createGame(p, DEFAULT_SETUP);
  s.enemies = [];
  const id = s.heroes[0].id;
  s = apply(p, s, { type: 'travel', hero: id, path: ['stillwater'] });
  expect(s.log.at(-1)!.text).toBe('Grumbaz Crowsblood travels to Stillwater Pond.');
  s = structuredClone(s); s.heroes[0].health = 1;
  s = apply(p, s, { type: 'rest', hero: id, health: 2 });
  expect(s.log.at(-1)!.text).toBe('Grumbaz Crowsblood rests: +2 health.');
  const other = s.heroes[1], power = p.cards.find(c => c.kind === 'power' && !c.printed && c.classId === p.characters.find(c => c.id === other.id)!.classId && c.level === 1 && c.price <= other.gold)!;
  s = apply(p, s, { type: 'train', hero: other.id, cards: [power.id] });
  expect(s.log.at(-1)!.text).toBe(`${p.characters.find(c => c.id === other.id)!.name} learns ${power.name}.`);
 });

 it('says who challenges what and where', () => {
  let s = createGame(p, DEFAULT_SETUP);
  s.enemies = [{ id: 'a', creature: 'murloc', color: 'green', region: 'brill', quest: s.quests[0], faction: 'horde' }, { id: 'b', creature: 'murloc', color: 'green', region: 'brill', quest: s.quests[0], faction: 'horde' }];
  s = apply(p, s, { type: 'challenge', hero: s.heroes[0].id, target: 'a', allies: [s.heroes[1].id] });
  expect(s.log.at(-1)!.text).toBe('Grumbaz Crowsblood and Sofeea Icecall challenge 2 × Murloc in Brill.');
 });

 it('never prints a character or region id during an AI-played stretch of the campaign', () => {
  let s = createGame(p, DEFAULT_SETUP);
  const texts = new Set<string>();
  for (let n = 0; n < 260 && s.phase !== 'finished'; n++) {
   const d = decide(p, view(s, s.heroes.map(h => h.id)), legalActions(p, s)); if (!d) break;
   s = apply(p, s, d.command);
   for (const row of s.log) texts.add(row.text);
  }
  expect(texts.size).toBeGreaterThan(30);
  const ids = [...p.characters.map(c => c.id), ...p.regions.map(r => r.id)];
  for (const text of texts) for (const id of ids) expect(new RegExp(`(^|[^A-Za-z-])${id}([^A-Za-z-]|$)`).test(text), `“${text}” contains the id ${id}`).toBe(false);
  expect([...texts].some(t => /^The (Horde|Alliance) begins faction turn \d+\.$/.test(t))).toBe(true);
 }, 120_000);
});
