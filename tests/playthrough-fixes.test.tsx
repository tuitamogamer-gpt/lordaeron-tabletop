// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import ClassDeck from '../src/campaign/ClassDeck';
import CombatArea from '../src/campaign/CombatArea';
import CombatScene from '../src/campaign/CombatScene';
import Tabletop from '../src/campaign/Tabletop';
import WorldDecision from '../src/campaign/WorldDecision';
import { startingHero } from '../src/campaign/CharacterSheet';
import { beginBattle } from '../src/rules/combat';
import { faction, hero } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import type { State } from '../src/rules/model';

beforeEach(() => {
 vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
 Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
 Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
 HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600, width: 900, height: 600, toJSON: () => ({}) });
 HTMLElement.prototype.scrollIntoView = vi.fn();
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// Defects found by playing the game through in the browser (docs/PLAYTHROUGH-2026-11-11.md).
describe('playing a turn', () => {
 it('returns from the full-screen map to the table once Travel is confirmed', () => {
  const s = createGame(p, DEFAULT_SETUP); s.enemies = [];
  const send = vi.fn(), toggleFocus = vi.fn();
  function Table() {
   const [selected, setSelected] = useState('brill');
   return <Tabletop state={view(s, s.heroes.map(h => h.id))} h={s.heroes[0]} legal={legalActions(p, s)} controlled={s.heroes.map(h => h.id)} bots={[]} auto={false} botReady={false} botReason="" selectHero={() => {}} selected={selected} selectRegion={setSelected} inspect={() => {}} open={() => {}} send={send} botStep={() => {}} toggleBots={() => {}} focused toggleFocus={toggleFocus} notify={() => {}} />;
  }
  render(<Table />);
  fireEvent.click(screen.getByRole('button', { name: /^Stillwater Pond · reachable/ }));
  fireEvent.click(screen.getByRole('button', { name: /Travel here/ }));
  expect(send).toHaveBeenCalledWith({ type: 'travel', hero: s.heroes[0].id, path: ['stillwater'] });
  expect(toggleFocus).toHaveBeenCalledTimes(1);
 });

 it('does not call a power “Ready to learn” when the character cannot pay for it', () => {
  const h = startingHero(p.characters.find(c => c.classId === 'paladin')!.id);
  h.level = 2; h.gold = 2;
  const powers = p.cards.filter(c => c.kind === 'power' && !c.printed && c.classId === 'paladin' && c.level <= 2);
  const cheap = powers.find(c => c.price <= 2)!, dear = powers.find(c => c.price > 2)!;
  const { container } = render(<ClassDeck hero={h} inspect={() => {}} toggle={() => {}} />);
  const state = (id: string) => [...container.querySelectorAll('.deck-card-entry')].find(e => e.querySelector(`img[src*="${id}"]`))?.querySelector('.deck-card-state')?.textContent;
  expect(state(cheap.id)).toBe('Ready to learn');
  expect(state(dear.id)).toBe(`Needs ${dear.price} gold`);
 });
});

describe('combat wording', () => {
 const fight = () => {
  const s = createGame(p, DEFAULT_SETUP);
  s.enemies = [{ id: 'ogre', creature: 'ogre', color: 'green', region: 'brill' }];
  beginBattle(s, 'pve', [s.heroes[0].id], ['ogre'], 'horde', 'brill');
  return s;
 };
 it('counts one wound in the singular', () => {
  const s = fight();
  s.battle!.wounds.horde = 1;
  const { rerender } = render(<CombatArea battle={s.battle!} side="horde" />);
  expect(screen.getByText('wound to assign')).toBeTruthy();
  s.battle!.wounds.horde = 2;
  rerender(<CombatArea battle={structuredClone(s.battle!)} side="horde" />);
  expect(screen.getByText('wounds to assign')).toBeTruthy();
 });
 it('promises rewards only after a won battle', () => {
  const lost = fight(); lost.battle!.stage = 'over'; lost.battle!.winner = 'alliance';
  const { unmount } = render(<CombatScene state={view(lost)} busy={false} />);
  expect(screen.getByText('The party is defeated. Fallen characters return to a graveyard or their starting region.')).toBeTruthy();
  expect(screen.queryByText(/Collect your rewards/)).toBeNull();
  unmount();
  const won = fight(); won.battle!.stage = 'over'; won.battle!.winner = 'horde';
  render(<CombatScene state={view(won)} busy={false} />);
  expect(screen.getByText('The battle is won. Collect your rewards below.')).toBeTruthy();
 });
});

describe('the last chance to heal, on screen', () => {
 it('offers the healing potion beside the graveyards when an event takes a character’s last Health', () => {
  const side = (s: State) => s.heroes.filter(h => faction(p, h.id) === s.faction);
  const pass = (s: State, end = true) => {
   for (const h of side(s)) while (hero(s, h.id).actions > 0) s = apply(p, s, { type: 'travel', hero: h.id, path: [] });
   s = apply(p, s, { type: 'endActions' });
   for (const h of side(s)) s = apply(p, s, { type: 'manage', hero: h.id, slots: structuredClone(h.slots), discard: [] });
   return end ? apply(p, s, { type: 'endManagement' }) : s;
  };
  let s = structuredClone(pass(pass(pass(createGame(p, { ...DEFAULT_SETUP, overlord: 'kelthuzad' }))), false));
  const potion = p.cards.find(c => c.name === 'Minor Healing Potion')!;
  s.world = [{ id: 'event-11', tokens: ['marris', 'hearthglen', 'andorhal'], attempts: [], gold: 0, items: [], trophies: { horde: [], alliance: [] } }];
  s.eventDeck = ['event-10', ...s.eventDeck.filter(id => id !== 'event-10' && id !== 'event-11')];
  Object.assign(hero(s, 'burbon-fang'), { health: 1, location: 'corins' }); hero(s, 'burbon-fang').bag.push(potion.id);
  s = apply(p, s, { type: 'endManagement' });
  const send = vi.fn(), ids = s.heroes.map(h => h.id);
  render(<WorldDecision state={view(s, ids)} legal={legalActions(p, s)} send={send} inspect={() => {}} botStep={() => {}} botReady={false} auto={false} toggleBots={() => {}} />);
  const dialog = screen.getByRole('dialog', { name: 'Hero revival' });
  expect(within(dialog).getByText(/A healing potion can still save this character/)).toBeTruthy();
  expect(within(dialog).getAllByRole('button', { name: /revive at/ }).length).toBeGreaterThan(0);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Burbon: use Minor Healing Potion and stay' }));
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'ability', hero: 'burbon-fang', card: potion.id }));
 });
});
