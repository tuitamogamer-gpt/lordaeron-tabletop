// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Combat from '../src/campaign/Combat';
import { armorWords, outcome, outcomeNext, sceneWords, woundChoices, woundWords } from '../src/campaign/combat-report';
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

describe('who takes the wound', () => {
 it('offers every character with the Health the wound leaves him', () => {
  const s = apply(p, at(fight(), 0, 1, 0, 0), { type: 'advance' }), pr = props(s);
  render(<Combat {...pr} />);
  const group = screen.getByRole('group', { name: 'Who takes the wound' });
  expect(group.textContent).toContain('3 wounds to assign');
  const warrior = within(group).getByRole('button', { name: 'Grumbaz takes a wound' }), mage = within(group).getByRole('button', { name: 'Sofeea takes a wound' });
  expect(warrior.getAttribute('aria-description')).toBe(`Health ${hero(s, WARRIOR).health} → ${hero(s, WARRIOR).health - 1}`);
  expect(mage.getAttribute('aria-description')).toBe(`Health ${hero(s, MAGE).health} → ${hero(s, MAGE).health - 1}`);
  expect(warrior.querySelectorAll('.combat-wound-pips>.held')).toHaveLength(hero(s, WARRIOR).health - 1);
  expect(warrior.querySelectorAll('.combat-wound-pips>.lost')).toHaveLength(1);
  fireEvent.click(mage);
  expect(pr.send).toHaveBeenCalledExactlyOnceWith({ type: 'wound', hero: MAGE });
 });
 it('warns on the wound that takes a character’s last Health', () => {
  const s = apply(p, at(fight('crusader', state => { hero(state, MAGE).health = 1; }), 0, 1, 0, 0), { type: 'advance' });
  render(<Combat {...props(s)} />);
  const mage = screen.getByRole('button', { name: 'Sofeea takes a wound' });
  expect(mage.getAttribute('aria-description')).toBe('Last Health: Sofeea falls');
  expect(mage.classList.contains('falls')).toBe(true);
  expect(screen.getByRole('button', { name: 'Grumbaz takes a wound' }).classList.contains('falls')).toBe(false);
  const choice = woundChoices(p, view(s), legalActions(p, s)).find(w => w.hero === MAGE)!;
  expect(choice).toMatchObject({ health: 1, after: 0, falls: true, side: 'horde' });
  expect(woundWords(p, choice)).toBe('Last Health: Sofeea falls');
 });
 it('lets a pet take the wound for its owner, and says how many more it can take', () => {
  const pet = p.cards.find(c => c.petHealth)!;
  const s = apply(p, at(fight('crusader', state => { hero(state, WARRIOR).pets = { [pet.id]: 2 }; }), 0, 1, 0, 0), { type: 'advance' });
  const choice = woundChoices(p, view(s), legalActions(p, s)).find(w => w.pet)!;
  expect(choice).toMatchObject({ hero: WARRIOR, pet: pet.name, petLeft: 1, falls: false, after: hero(s, WARRIOR).health });
  expect(woundWords(p, choice)).toBe(`${pet.name} takes it · 1 more after this`);
  const pr = props(s);
  render(<Combat {...pr} />);
  const button = screen.getByRole('button', { name: 'Grumbaz takes a wound on the pet' });
  expect(button.getAttribute('aria-description')).toBe(`${pet.name} takes it · 1 more after this`);
  // The owner keeps his Health: no token of his is marked as lost.
  expect(button.querySelectorAll('.combat-wound-pips>.lost')).toHaveLength(0);
  fireEvent.click(button);
  expect(pr.send).toHaveBeenCalledExactlyOnceWith({ type: 'wound', hero: WARRIOR, pet: pet.id });
 });
 it('keeps each faction’s wounds with its own characters in a fight between the factions', () => {
  const { s, alliance } = duel();
  s.battle!.stage = 'wounds'; s.battle!.wounds = { horde: 2, alliance: 1 };
  render(<Combat {...props(s)} />);
  const sections = [...screen.getByRole('group', { name: 'Who takes the wound' }).querySelectorAll('section')];
  expect(sections.map(section => section.querySelector('h5')!.textContent)).toEqual(['2 wounds to assign · Horde', '1 wound to assign · Alliance']);
  expect(within(sections[0] as HTMLElement).getAllByRole('button').map(b => b.getAttribute('aria-label'))).toEqual(['Grumbaz takes a wound', 'Sofeea takes a wound']);
  expect(within(sections[1] as HTMLElement).getAllByRole('button')).toHaveLength(alliance.length);
 });
});

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
 it('puts every character’s Health and Energy on his tab', () => {
  const s = at(fight(), 0, 0, 0, 0);
  render(<Combat {...props(s)} />);
  const tab = screen.getByRole('button', { name: `Show ${p.characters.find(c => c.id === MAGE)!.name} character sheet` });
  expect(tab.querySelector('.combat-sheet-hero-vitals')!.textContent).toBe(`${hero(s, MAGE).health}/${hero(s, MAGE).health}${hero(s, MAGE).energy}`);
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

describe('the Armor step of a fight between the factions', () => {
 const armored = () => {
  const { s } = duel();
  s.battle!.stage = 'defense'; delete s.battle!.active; s.battle!.acted = [...s.battle!.participants];
  s.battle!.boxes = { horde: { damage: 1, defense: 2, armor: 0, attrition: 1 }, alliance: { damage: 0, defense: 1, armor: 1, attrition: 0 } };
  return s;
 };
 it('says in words what each faction’s armor cancels', () => {
  const s = armored(), pr = props(s);
  render(<Combat {...pr} />);
  expect(screen.getByRole('button', { name: 'Horde: no armor to use' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Alliance armor: cancel 1 ranged + 1 attrition' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Alliance armor: cancel 1 melee + 1 attrition' }));
  expect(pr.send).toHaveBeenCalledExactlyOnceWith({ type: 'armor', faction: 'alliance', damage: 0, defense: 1 });
  expect(screen.queryByText(/armor \(/)).toBeNull();
  const b = s.battle!;
  expect(armorWords(b, { type: 'armor', faction: 'alliance', damage: 1, defense: 0 })).toBe('Alliance armor: cancel 1 ranged + 1 attrition');
  b.boxes.horde = { damage: 0, defense: 0, armor: 0, attrition: 0 };
  expect(armorWords(b, { type: 'armor', faction: 'alliance', damage: 0, defense: 0 })).toBe('Alliance armor: nothing to cancel');
 });
 it('shows both Combat Areas and does not name a loser before the armor is used', () => {
  const s = armored();
  const ui = render(<Combat {...props(s)} />);
  expect(screen.getByRole('region', { name: 'Horde totals' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Alliance totals' })).toBeTruthy();
  expect(document.querySelector('.combat-board-row')!.classList.contains('versus')).toBe(true);
  expect(document.querySelector('.combat-versus')!.textContent).toBe('Melee + attrition: Horde 3 · Alliance 1before armor: Alliance 1');
  const used = apply(p, apply(p, s, { type: 'armor', faction: 'horde', damage: 0, defense: 0 }), { type: 'armor', faction: 'alliance', damage: 0, defense: 1 });
  ui.rerender(<Combat {...props(used)} />);
  expect(document.querySelector('.combat-versus')!.textContent).toBe('Melee + attrition: Horde 1 · Alliance 1level: no wounds');
  // Nothing to compare while both areas are empty.
  const { s: fresh } = duel();
  ui.rerender(<Combat {...props(fresh)} />);
  expect(document.querySelector('.combat-versus')).toBeNull();
  expect(document.querySelector('.combat-standing')).toBeNull();
 });
});

describe('what a finished fight came to', () => {
 const won = () => {
  const s = at(fight(), 0, 2, 1, 1);
  s.enemies = s.enemies.filter(e => e.id === 'enemy');
  return apply(p, apply(p, apply(p, s, { type: 'advance' }), { type: 'wound', hero: WARRIOR }), { type: 'advance' });
 };
 it('names who fell, what it cost and the quest it completed', () => {
  const s = won(), quest = p.quests.find(q => s.quests.includes(q.id) && q.faction === 'horde')!;
  expect(s.battle).toMatchObject({ stage: 'over', winner: 'horde' });
  const result = outcome(p, view(s))!;
  expect(result.title).toBe('Victory');
  expect(result.lines.slice(0, 2)).toEqual(['Crusader defeated in 1 round', 'Grumbaz −1 health']);
  expect(result.lines[2]).toContain(`Quest complete: ${quest.name} · reward `);
  expect(outcomeNext(p, view(s))).toBe('The battle is won. Finish combat to collect the quest reward.');
  render(<Combat {...props(s)} />);
  const card = screen.getByRole('status', { name: 'Combat outcome' });
  expect(within(card).getByText('Crusader defeated in 1 round')).toBeTruthy();
  expect(within(card).getByText('Grumbaz −1 health')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Finish combat & continue' })).toBeTruthy();
 });
 it('promises nothing after a fight that completes no quest, and says so plainly after a lost one', () => {
  const s = at(fight(), 0, 2, 1, 1), plain = apply(p, apply(p, apply(p, s, { type: 'advance' }), { type: 'wound', hero: WARRIOR }), { type: 'advance' });
  expect(outcome(p, view(plain))!.lines).toEqual(['Crusader defeated in 1 round', 'Grumbaz −1 health']);
  expect(outcomeNext(p, view(plain))).toBe('The battle is won. Finish combat to continue.');
  const lost = fight(); lost.battle!.stage = 'over'; lost.battle!.winner = 'alliance'; lost.battle!.defeated = [WARRIOR, MAGE]; lost.battle!.round = 2;
  expect(outcome(p, view(lost))).toEqual({ title: 'Defeat', lines: ['The party falls in round 2', 'Grumbaz fell · Sofeea fell'] });
  expect(outcomeNext(p, view(lost))).toBe('The party is defeated. Fallen characters return to a graveyard or their starting region.');
 });
 it('has no outcome while the fight goes on', () => {
  expect(outcome(p, view(fight()))).toBeUndefined();
  expect(outcomeNext(p, view(fight()))).toBe('');
 });
});
