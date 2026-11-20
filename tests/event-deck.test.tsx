// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { addWorld, drawEvents } from '../src/rules/events';
import type { State } from '../src/rules/model';
import { view } from '../src/rules/view';
import CampaignSetup from '../src/campaign/CampaignSetup';
import EncounterPanel from '../src/campaign/EncounterPanel';

afterEach(cleanup);
/**
 * 20. 11. 2026: "the Events do not seem random, the same ones always come". The deck was shuffled all along: what repeats is
 * its make-up (six New Horizons, four each of three other cards). These tests hold the shuffle to that, and cover the one
 * place where the deck was not shuffled: once it ran out in a long campaign, the discard pile never became a new deck.
 */
const deckOf = (seed: number, overlord = DEFAULT_SETUP.overlord) => createGame(p, { ...DEFAULT_SETUP, seed, overlord }).eventDeck;
const all = (overlord: string) => p.events.filter(e => !e.overlord || e.overlord === overlord).map(e => e.id).sort();
const name = (id: string) => p.events.find(e => e.id === id)!.name;

describe('the Event deck at setup', () => {
 it('holds every card of the campaign once, in an order that depends on the seed alone', () => {
  for (const overlord of p.overlords.map(o => o.id)) expect([...deckOf(7, overlord)].sort()).toEqual(all(overlord));
  expect(deckOf(7)).toEqual(deckOf(7));
  const orders = new Set(Array.from({ length: 200 }, (_, i) => deckOf(i + 1).join()));
  expect(orders.size).toBe(200);
 });
 it('puts every card on top as often as any other', () => {
  const N = 3000, cards = all(DEFAULT_SETUP.overlord), top: Record<string, number> = {}, place: Record<string, number> = {};
  for (let seed = 1; seed <= N; seed++) { const deck = deckOf(seed * 7919); top[deck[0]] = (top[deck[0]] ?? 0) + 1; deck.forEach((id, i) => { place[id] = (place[id] ?? 0) + i; }); }
  const expected = N / cards.length;
  for (const id of cards) {
   // About 58 times each: five standard deviations either way leave room for chance and none for a card that leads or never does.
   expect(top[id] ?? 0).toBeGreaterThan(expected - 5 * Math.sqrt(expected)); expect(top[id] ?? 0).toBeLessThan(expected + 5 * Math.sqrt(expected));
   // And on average every card lies in the middle of the deck.
   expect(Math.abs(place[id] / N - (cards.length - 1) / 2)).toBeLessThan(1.5);
  }
 });
 it('is shuffled anew for every campaign that is set up: the setup draws a fresh seed each time it opens', () => {
  const seeds = new Set<string>();
  for (let i = 0; i < 5; i++) {
   const ui = render(<CampaignSetup onStart={() => {}} onCancel={() => {}} />);
   for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole('button', { name: /^Continue/ }));
   fireEvent.click(screen.getByRole('tab', { name: 'Shuffle' }));
   seeds.add((screen.getByLabelText('Game seed') as HTMLInputElement).value); ui.unmount();
  }
  expect(seeds.size).toBe(5);
  for (const seed of seeds) expect(Number(seed)).toBeGreaterThan(0);
 });
});

describe('an Event deck that has run out', () => {
 /** A campaign late in its laps: the deck is empty, a Boss and a War are on the board, and one Auction House item is held. */
 function spent(rules = 5) {
  const s: State = createGame(p, { ...DEFAULT_SETUP, seed: 11, variants: { overlordOnly: true, rules } });
  const boss = p.events.find(e => e.boss && !e.overlord)!.id, war = p.events.find(e => e.script === 'war')!, auction = p.events.find(e => e.effects.some(f => f.op === 'auction'))!;
  const item = auction.effects.flatMap(f => f.op === 'auction' ? [f.item] : [])[0];
  s.phase = 'event'; s.eventDiscard = [...s.eventDeck]; s.eventDeck = [];
  addWorld(s, boss); const fought = war.effects.find(f => f.op === 'war'); if (fought?.op === 'war') s.wars = [{ id: war.id, regions: fought.regions, reward: fought.reward }];
  s.heroes[0].auctionItems = [item];
  return { s, boss, war: war.id, auction: auction.id };
 }
 it('becomes a new shuffled deck made of the discard pile, without the cards still in play', () => {
  const { s, boss, war, auction } = spent(), before = s.eventDiscard.length;
  drawEvents(p, s);
  const drawn = s.eventDiscard.slice(before);
  expect(drawn.length).toBeGreaterThan(0);
  expect(s.eventShuffles).toBe(1); expect(s.eventRecycled).toBe(before);
  const deck = [...s.eventDeck, ...drawn];
  expect(deck).toHaveLength(all(DEFAULT_SETUP.overlord).length - 3);
  expect(new Set(deck).size).toBe(deck.length);
  for (const id of [boss, war, auction]) expect(deck).not.toContain(id);
  expect(s.log.some(l => /The Event deck has run out: the discard pile of \d+ cards is shuffled into a new deck\./.test(l.text))).toBe(true);
 });
 it('is shuffled differently in different campaigns', () => {
  const orders = new Set<string>();
  for (let rng = 1; rng <= 40; rng++) { const { s } = spent(); s.rng = rng * 104729; const before = s.eventDiscard.length; drawEvents(p, s); orders.add([...s.eventDiscard.slice(before), ...s.eventDeck].join()); }
  expect(orders.size).toBe(40);
 });
 it('stays empty in a campaign begun before rules revision 5, which is replayed as it was played', () => {
  const { s } = spent(4), before = s.eventDiscard.length;
  drawEvents(p, s);
  expect(s.eventDeck).toEqual([]); expect(s.eventDiscard).toHaveLength(before); expect(s.eventShuffles).toBeUndefined(); expect(s.phase).toBe('actions');
 });
});

describe('the Event deck in the Encounter panel', () => {
 it('says that the deck is shuffled, and lists the copies of each card with what has come up', () => {
  const s = createGame(p, { ...DEFAULT_SETUP, seed: 5 }), horizons = p.events.filter(e => e.name === 'New Horizons');
  s.eventDiscard = [horizons[0].id, horizons[1].id];
  const ui = render(<EncounterPanel state={view(s)} />);
  expect(ui.container.querySelector('.encounter-shuffle-note')?.textContent).toMatch(/^The deck of 52 cards was shuffled when this campaign was set up; when it runs out, the discard pile is shuffled into a new deck\./);
  fireEvent.click(screen.getByRole('button', { name: /^Deck contents/ }));
  const rows = [...ui.container.querySelectorAll('.encounter-deck-contents li')].map(li => li.textContent);
  expect(rows[0]).toBe(`${horizons.length} ×New Horizonsturned up 2 times`);
  expect(rows).toHaveLength(new Set(all(DEFAULT_SETUP.overlord).map(name)).size);
  expect(rows.filter(r => r!.endsWith('not yet'))).toHaveLength(rows.length - 1);
 });
});
