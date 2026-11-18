// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Combat from '../src/campaign/Combat';
import { sceneWords } from '../src/campaign/combat-report';
import { roundForecast } from '../src/campaign/combat-forecast';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { beginBattle } from '../src/rules/combat';
import { faction, hero } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import type { State } from '../src/rules/model';

const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall';
beforeEach(() => {
 localStorage.clear(); window.scrollTo = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLElement.prototype.scrollIntoView = vi.fn();
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

/** The Warrior and the Mage against one green creature; nobody has attacked yet. */
function fight(creature = 'crusader', change: (s: State) => void = () => {}) {
 const s = createGame(p, DEFAULT_SETUP);
 change(s);
 s.enemies = [{ id: 'enemy', creature, color: 'green', region: 'brill' }, ...s.quests.map((id, i) => ({ id: `elsewhere-${i}`, creature: 'gnoll', color: 'green' as const, region: 'andorhal', quest: id }))];
 beginBattle(s, 'pve', [WARRIOR, MAGE], ['enemy'], 'horde', 'brill');
 return s;
}
/** The same two against the first two Alliance characters. */
function duel() {
 const s = createGame(p, DEFAULT_SETUP), alliance = s.heroes.filter(h => faction(p, h.id) === 'alliance').slice(0, 2).map(h => h.id);
 beginBattle(s, 'pvp', [WARRIOR, MAGE, ...alliance], [], 'horde', 'brill');
 return { s, alliance };
}
const at = (s: State, damage: number, defense: number, armor: number, attrition: number) => { s.battle!.boxes.horde = { damage, defense, armor, attrition }; s.battle!.stage = 'defense'; return s; };
const props = (s: State) => ({ state: view(s), legal: legalActions(p, s), send: vi.fn(), busy: false, botReady: false, botStep: vi.fn(), auto: false, toggleBots: vi.fn() });
const rolled = (creature: string, values: number[]) => {
 const s = apply(p, apply(p, apply(p, apply(p, fight(creature), { type: 'attacker', hero: WARRIOR }), { type: 'roll' }), { type: 'advance' }), { type: 'advance' });
 s.battle!.active!.dice.forEach((d, i) => { d.value = values[i]; });
 return s;
};

describe('the round under the Combat Area', () => {
 it('shows the two sums the tokens come to', () => {
  render(<Combat {...props(at(fight(), 0, 2, 1, 1))} />);
  const standing = screen.getByLabelText('The round as it stands');
  expect([...standing.querySelectorAll('div')].map(row => [row.querySelector('dt')!.textContent, row.querySelector('dd>span')!.textContent, row.querySelector('dd>b')!.textContent])).toEqual([
   ['Enemy attack', '4 attack − 2 hits − 1 armor', '1 wound'],
   ['Party damage', '0 ranged + 2 melee + 1 attrition', '3 of 3 · falls'],
  ]);
  expect(standing.querySelector('.incoming')!.classList.contains('bad')).toBe(true);
  expect(standing.querySelector('.outgoing')!.classList.contains('good')).toBe(true);
  // One sentence of the same by the main action, for a screen where the Combat Area is out of sight.
  expect(document.querySelector('.combat-standing')!.textContent).toBe('1 wound incoming · 3 of 3 damage: Crusader falls');
 });
 it('says whose dice are counted while characters have still to roll', () => {
  render(<Combat {...props(rolled('crusader', [6, 6, 6]))} />);
  expect(screen.getByLabelText('The round as it stands').querySelector('p')!.textContent).toBe('with Grumbaz’s dice as they lie · Sofeea still to attack');
 });
 it('has the scene say where the round stands instead of one line for every step', () => {
  const s = at(fight(), 0, 2, 1, 1);
  expect(sceneWords(p, view(s), roundForecast(p, view(s)))).toEqual({ heading: 'Round 1 · Crusader strikes', detail: '1 wound incoming · 3 of 3 damage: Crusader falls' });
  const wounds = apply(p, s, { type: 'advance' });
  expect(sceneWords(p, view(wounds), roundForecast(p, view(wounds)))).toEqual({ heading: 'Crusader hits for 4 · 3 stopped', detail: '1 wound to assign' });
  render(<Combat {...props(wounds)} />);
  expect(screen.getByLabelText('Battle animation').textContent).toContain('Crusader hits for 4 · 3 stopped');
  expect(screen.queryByText('Ranged first. Hold the line. Strike back.')).toBeNull();
 });
 it('names the dice a Stun or a Curse takes', () => {
  const s = apply(p, fight('wraith', state => { hero(state, WARRIOR).curse = 1; hero(state, WARRIOR).stun = 1; }), { type: 'attacker', hero: WARRIOR });
  const penalty = apply(p, s, { type: 'roll' });
  expect(penalty.battle!.stage).toBe('penalty');
  expect(sceneWords(p, view(penalty), roundForecast(p, view(penalty)))).toEqual({ heading: 'Grumbaz gives up 3 dice', detail: 'Stun 1: two dice each · Curse 1: one die each, and −1 to rerolls and attrition' });
  render(<Combat {...props(s)} />);
  expect(screen.getByText(/Curse −1 on both/)).toBeTruthy();
 });
 it('labels the count of a lane so that it fits its column', () => {
  render(<Combat {...props(at(fight(), 0, 0, 0, 0))} />);
  expect(screen.getByLabelText('Ranged: 0 rolled hits').querySelector('small')!.textContent).toBe('HITS');
 });
});

describe('the step after the rerolls', () => {
 it('says what the opponent’s rule takes from the dice as they lie', () => {
  const s = rolled('murloc', [1, 6, 6]);
  render(<Combat {...props(s)} />);
  expect(screen.getByRole('heading', { name: 'Creature effect' })).toBeTruthy();
  expect(screen.getByText('Murloc: Grumbaz loses 1 health. Spot and other abilities can still change the dice.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Resolve creature effect' })).toBeTruthy();
 });
 it('does not announce an effect when the dice give the rule nothing', () => {
  const pr = props(rolled('murloc', [5, 6, 7]));
  render(<Combat {...pr} />);
  expect(screen.getByRole('heading', { name: 'After rerolls' })).toBeTruthy();
  expect(screen.getByText('These dice give the opponent’s rule nothing to take. Use Spot and other abilities, then place the hits.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to hits' }));
  expect(pr.send).toHaveBeenCalledExactlyOnceWith({ type: 'monster' });
  expect(screen.queryByRole('button', { name: 'Resolve creature effect' })).toBeNull();
 });
 it('has no creature to speak of in a fight between the factions', () => {
  const { s } = duel();
  let next = apply(p, apply(p, apply(p, apply(p, s, { type: 'attacker', hero: WARRIOR }), { type: 'roll' }), { type: 'advance' }), { type: 'advance' });
  expect(next.battle!.stage).toBe('after-reroll');
  render(<Combat {...props(next)} />);
  expect(screen.getByRole('heading', { name: 'After rerolls' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Continue to hits' })).toBeTruthy();
  expect(screen.queryByText(/creature/i)).toBeNull();
  next = apply(p, next, { type: 'monster' });
  expect(next.battle!.stage).toBe('tokens');
 });
});
