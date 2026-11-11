import { describe, expect, it } from 'vitest';
import { warNews } from '../src/campaign/war-news';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { faction } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { view } from '../src/rules/view';
import type { State } from '../src/rules/model';

const WAR = 'event-24';
/** The Horde ends turn 3 (space 4 draws an Event card); returns the table before and after its last command. */
function hordeEnds(arrange: (s: State) => void) {
 const s = createGame(p, DEFAULT_SETUP); s.turn = 3;
 for (const h of s.heroes) h.actions = 0;
 arrange(s);
 let last = apply(p, s, { type: 'endActions' });
 for (const h of last.heroes.filter(h => faction(p, h.id) === last.faction)) last = apply(p, last, { type: 'manage', hero: h.id, slots: h.slots, discard: [] });
 return { last, next: apply(p, last, { type: 'endManagement' }) };
}
const allianceHolds = (s: State) => { const [a, b] = s.heroes.filter(h => faction(p, h.id) === 'alliance'); a.location = 'andorhal'; b.location = 'hearthglen'; };
const onTable = (s: State) => { s.wars = [{ id: WAR, regions: ['andorhal', 'hearthglen'], reward: { xp: 2, gold: 5, items: [] }, weakReward: { xp: 4, gold: 5, items: [] }, perHero: true }]; s.eventDeck = []; };
const NEWS = 'The Alliance wins The Andorhal War, holding Ruins of Andorhal and Hearthglen: 5 gold and 2 XP for each of its characters.';

describe('the notice of a War won', () => {
 it('tells the players which faction won a War on the table, where and for what', () => {
  const { last, next } = hordeEnds(s => { allianceHolds(s); onTable(s); });
  expect(warNews(p, view(last), view(next))).toBe(NEWS);
 });

 it('also when the War is drawn and won within the same step', () => {
  const { last, next } = hordeEnds(s => { allianceHolds(s); s.eventDeck = [WAR, ...s.eventDeck.filter(id => id !== WAR)]; });
  expect(warNews(p, view(last), view(next))).toBe(NEWS);
 });

 it('says nothing while the War goes on', () => {
  const { last, next } = hordeEnds(onTable);
  expect(next.wars.map(w => w.id)).toEqual([WAR]);
  expect(warNews(p, view(last), view(next))).toBeUndefined();
 });

 it('reads the chronicle, so a War drawn in one step and won in the next is still told', () => {
  // With Nefarian, the Event card can wait for his move; the War is then resolved, and perhaps won, by the following command.
  const { last, next } = hordeEnds(s => { allianceHolds(s); onTable(s); });
  const waiting = { ...view(last), eventDiscard: [WAR], wars: [] };
  expect(warNews(p, waiting, { ...view(next), eventDiscard: [WAR] })).toBe(NEWS);
 });

 it('says nothing for a loaded campaign, an undo or another campaign', () => {
  const { last, next } = hordeEnds(s => { allianceHolds(s); onTable(s); });
  expect(warNews(p, undefined, view(next))).toBeUndefined();
  expect(warNews(p, view(next), view(last))).toBeUndefined();
  expect(warNews(p, view(last), { ...view(next), revision: last.revision + 500 })).toBeUndefined();
 });
});
