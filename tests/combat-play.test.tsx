// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Combat from '../src/campaign/Combat';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { beginBattle } from '../src/rules/combat';
import { hero } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import type { Command, State } from '../src/rules/model';

const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall', STRIKE = 'warrior-heroic-strike';
beforeEach(() => {
 localStorage.clear(); window.scrollTo = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLElement.prototype.scrollIntoView = vi.fn();
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function fight(participants = [WARRIOR, MAGE], change: (s: State) => void = () => {}) {
 const s = createGame(p, DEFAULT_SETUP), h = hero(s, WARRIOR);
 h.learned = [STRIKE]; h.slots[1].card = STRIKE;
 change(s);
 s.enemies = [{ id: 'enemy', creature: 'murloc', color: 'green', region: 'brill' }];
 beginBattle(s, 'pve', participants, ['enemy'], 'horde', 'brill');
 return s;
}
const props = (s: State) => ({ state: view(s), legal: legalActions(p, s), send: vi.fn(), busy: false, botReady: false, botStep: vi.fn(), auto: false, toggleBots: vi.fn() });
const sheet = () => screen.getByRole('article', { name: 'Grumbaz Crowsblood character sheet' });
const hand = () => within(sheet()).getByRole('region', { name: 'Powers to use now' });
const strike: Command = { type: 'ability', hero: WARRIOR, card: STRIKE, ability: 'pool', args: {} };

describe('choosing who attacks', () => {
 it('says on each button what the character brings, and on the sheet that Charge will pay for Heroic Strike', () => {
  const s = fight(), pr = props(s); render(<Combat {...pr} />);
  const grumbaz = screen.getByRole('button', { name: /^Grumbaz attacks/ }), sofeea = screen.getByRole('button', { name: /^Sofeea attacks/ });
  expect(grumbaz.textContent).toBe('Grumbaz attacks2 red, 1 green dice · 2 energy · Heroic Strike ready');
  expect(sofeea.textContent).toBe('Sofeea attacks1 red, 1 blue dice · 4 energy · Dire Wand ready');
  expect(screen.getByLabelText('Grumbaz energy').textContent).toBe('Grumbaz · energy 1 / 1Charge gives +1 when Grumbaz attacks: 2 to spend');
  expect(within(hand()).getByText('No power to use yet. Ready: Heroic Strike once Grumbaz attacks, Dire Wand once Sofeea attacks.')).toBeTruthy();
  const row = within(sheet()).getByText('Heroic Strike').closest('.combat-sheet-card')!;
  expect(row.className).toContain('soon');
  expect(row.querySelector('.combat-sheet-card-status')!.textContent).toBe('Ready when Grumbaz attacks · 2 energy with Charge');
  // The old sheet read "Needs 2 energy · 1 available" here, as if Charge gave nothing.
  expect(screen.queryByText(/Needs 2 energy/)).toBeNull();
  fireEvent.click(grumbaz);
  expect(pr.send).toHaveBeenCalledExactlyOnceWith({ type: 'attacker', hero: WARRIOR });
 });
});

describe('the hand and the table', () => {
 it('puts the playable power in the hand beside the energy it costs, and every other card on the sheet with its note', () => {
  const s = apply(p, fight([WARRIOR]), { type: 'attacker', hero: WARRIOR });
  render(<Combat {...props(s)} />);
  expect(within(hand()).getByRole('region', { name: 'Heroic Strike power' })).toBeTruthy();
  expect(within(hand()).getByRole('button', { name: 'Use Heroic Strike · 2 energy' })).toBeTruthy();
  expect(screen.getByLabelText('Grumbaz energy').textContent).toBe('Grumbaz · energy 2 / 1+1 from Charge this round · 1 above capacity is lost when combat ends');
  // The playable power is not listed twice.
  expect(sheet().querySelectorAll('.combat-sheet-card')).toHaveLength(5);
  expect([...sheet().querySelectorAll('.combat-sheet-card-name')].map(node => node.textContent)).toEqual(['Battle Stance', 'Charge', 'Rusty Sword', 'Slarkskin', 'Bloodfury']);
  expect(screen.getByText('Character sheet').parentElement!.textContent).toContain('1 power to use');
  // A solo fight has no tabs to switch between.
  expect(screen.queryByRole('navigation', { name: 'Battle character sheets' })).toBeNull();
 });
 it('lays each die by the card it was taken for', () => {
  const s = apply(p, fight([WARRIOR]), { type: 'attacker', hero: WARRIOR });
  const r = render(<Combat {...props(s)} />);
  expect([...r.container.querySelectorAll('.d8-source')].map(node => node.textContent)).toEqual(['Battle Stance', 'Rusty Sword', 'Slarkskin']);
  expect(screen.getAllByRole('button', { name: 'red D8 prepared, ready' }).map(die => die.getAttribute('aria-description'))).toEqual(['Die #0 · from Battle Stance', 'Die #1 · from Rusty Sword']);
  const used = apply(p, s, strike); r.rerender(<Combat {...props(used)} />);
  expect([...r.container.querySelectorAll('.d8-source')].map(node => node.textContent)).toEqual(['Battle Stance', 'Rusty Sword', 'Heroic Strike', 'Slarkskin']);
  // Rolled dice show their result instead.
  const rolled = apply(p, used, { type: 'roll' }); r.rerender(<Combat {...props(rolled)} />);
  expect(r.container.querySelectorAll('.d8-source')).toHaveLength(0);
  expect(screen.getAllByTitle(/from Heroic Strike/)).toHaveLength(1);
 });
 it('folds the sheet behind one line for a phone and unfolds it on request', () => {
  const s = apply(p, fight([WARRIOR]), { type: 'attacker', hero: WARRIOR });
  render(<Combat {...props(s)} />);
  const summary = screen.getByRole('button', { name: 'Show the cards on Grumbaz’s sheet' });
  expect(summary.getAttribute('aria-expanded')).toBe('false');
  expect(summary.textContent).toBe('Grumbaz4/42/1Sheet');
  expect(sheet().className).not.toContain('sheet-open');
  fireEvent.click(summary);
  expect(screen.getByRole('button', { name: 'Hide the cards on Grumbaz’s sheet' }).getAttribute('aria-expanded')).toBe('true');
  expect(sheet().className).toContain('sheet-open');
  // The dock with the hand and the main action is outside the folded part.
  const dock = sheet().querySelector('.combat-play-dock')!, reference = sheet().querySelector('.combat-sheet-reference')!;
  expect(dock.contains(screen.getByRole('button', { name: 'Use Heroic Strike · 2 energy' }))).toBe(true);
  expect(dock.contains(screen.getByRole('button', { name: 'Roll 3 D8' }))).toBe(true);
  expect(reference.contains(dock)).toBe(false);
 });
 it('names Stun and Curse on the folded line only when the character has them', () => {
  const s = apply(p, fight([WARRIOR], s => { hero(s, WARRIOR).stun = 1; hero(s, WARRIOR).curse = 2; }), { type: 'attacker', hero: WARRIOR });
  render(<Combat {...props(s)} />);
  expect(screen.getByRole('button', { name: 'Show the cards on Grumbaz’s sheet' }).textContent).toBe('Grumbaz4/42/1Stun 1Curse 2Sheet');
 });
});
