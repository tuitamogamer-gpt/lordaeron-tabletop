// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import CharacterSheet, { startingHero } from '../src/campaign/CharacterSheet';
import Chronicle, { CHRONICLE_PAGE } from '../src/campaign/Chronicle';
import RulesGuide from '../src/campaign/RulesGuide';
import { cardGist } from '../src/campaign/card-gist';
import { BASE_PACK as p } from '../src/data/base';
import { character } from '../src/rules/common';

/**
 * The design pass of 21. 11. 2026 (docs/DESIGN-POLISH-2026-11-21.md): the character dossier says what each equipped card
 * does, the chronicle is read by turn, the rules guide describes the table as it now plays.
 */
beforeEach(() => {
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const named = (name: string) => p.cards.find(c => c.name === name)!;

describe('what a card does, in a line', () => {
 it('reads as the card’s effect, with when it applies', () => {
  expect(cardGist(named('Scimitar'))).toBe('+2 red dice · +1 Reroll');
  expect(cardGist(named('Thunder Clap'))).toBe('Preparation: +2 blue dice');
  expect(cardGist(named('Battle Shout'))).toBe('All friendly participants: +1 Reroll.');
 });
 it('names at most two effects and marks that there is more', () => {
  const many = p.cards.find(c => c.abilities.length > 2)!;
  expect(cardGist(many).endsWith(' …')).toBe(true);
  expect(cardGist(many).split(' / ')).toHaveLength(2);
 });
 it('has something to say about every card that can be equipped', () => {
  for (const c of p.cards.filter(c => c.kind !== 'talent')) expect(cardGist(c).length, c.name).toBeGreaterThan(3);
 });
});

describe('the character dossier', () => {
 it('says under each equipped card what it is and does', () => {
  const hero = startingHero(p.characters.find(c => c.classId === 'warrior')!.id);
  const { container } = render(<CharacterSheet hero={hero} inspect={() => {}} />);
  const captions = [...container.querySelectorAll('.sheet-slot-gist')];
  // Every printed starting card has its caption: the name, and the same line the helper gives.
  const printed = character(p, hero.id).slots.flatMap(s => s.printed ? [named(p.cards.find(c => c.id === s.printed)!.name)] : []);
  expect(captions).toHaveLength(printed.length);
  expect(captions.map(c => c.querySelector('strong')!.textContent)).toEqual(printed.map(c => c.name));
  expect(captions.map(c => c.querySelector('span')!.textContent)).toEqual(printed.map(cardGist));
 });
});

describe('the chronicle', () => {
 const WARRIOR = p.characters[0], log = [
  { id: 1, turn: 1, text: 'The Horde begins faction turn 1.' },
  { id: 2, turn: 1, text: `${WARRIOR.id} travels to Brill.` },
  { id: 3, turn: 1, text: `${WARRIOR.id} challenges Ghoul in Brill.` },
  { id: 4, turn: 1, text: `${WARRIOR.id} is defeated and returns to Brill.` },
  { id: 5, turn: 2, text: 'Event: Bounty.' },
  { id: 6, turn: 2, text: `${WARRIOR.id}: +2 XP.` },
 ];
 it('is read by turn, newest first, each entry with the sign of its kind and the names set apart', () => {
  const { container } = render(<Chronicle log={log} />);
  const turns = screen.getAllByRole('region').filter(r => /^Turn \d+$/.test(r.getAttribute('aria-label') ?? ''));
  expect(turns.map(t => t.getAttribute('aria-label'))).toEqual(['Turn 2', 'Turn 1']);
  expect(within(turns[1]).getByRole('heading').textContent).toBe('Turn 14 entries');
  const kinds = [...container.querySelectorAll('.chronicle-entries article')].map(a => a.className);
  expect(kinds).toEqual(['chronicle-growth', 'chronicle-event', 'chronicle-defeat', 'chronicle-combat', 'chronicle-travel', 'chronicle-turn']);
  // The character is named, not left as an id, and stands out in the sentence.
  expect(container.querySelector('.chronicle-travel b')!.textContent).toBe(WARRIOR.name);
  expect(container.querySelector('.chronicle-travel p')!.textContent).toBe(`${WARRIOR.name} travels to Brill.`);
 });
 it('says when a turn runs on to the next page', () => {
  const long = Array.from({ length: CHRONICLE_PAGE + 3 }, (_, id) => ({ id, turn: 1, text: `entry ${id}` }));
  render(<Chronicle log={long} />);
  expect(screen.getByRole('heading', { name: /^Turn 1/ }).textContent).toBe(`Turn 1${CHRONICLE_PAGE} entries on this page`);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('heading', { name: /^Turn 1/ }).textContent).toBe('Turn 13 entries on this page');
 });
});

describe('the rules guide', () => {
 it('describes the table as it plays now: both endings, trading, who receives a reward', () => {
  const { container } = render(<RulesGuide onSetup={() => {}} onDesign={() => {}} />);
  const cards = [...container.querySelectorAll('.rules-grid > article')];
  expect(cards).toHaveLength(8);
  expect(cards.every(c => c.querySelectorAll('li').length === 3)).toBe(true);
  const ending = cards.find(c => c.querySelector('h3')!.textContent === 'How a campaign ends')!;
  expect(ending.textContent).toContain('Final battle: both factions meet in one last PvP battle.');
  expect(ending.textContent).toContain('Defeat the Overlord: the track begins another lap.');
  // The card that described the one ending every campaign used to have is gone.
  expect(container.textContent).not.toContain('The track repeats after turn 30 until the Overlord is defeated');
  expect(container.textContent).toContain('Each item drawn goes to any character who came through the fight.');
  expect(container.textContent).toContain('Open once a character of the faction has acted this turn.');
 });
});

describe('the stylesheet of this pass', () => {
 it('is loaded after the layers it corrects and before the one that must stay last', () => {
  const imports = [...readFileSync('src/main.tsx', 'utf8').matchAll(/import '\.\/campaign\/([\w-]+\.css)'/g)].map(m => m[1]);
  expect(imports.indexOf('design-polish.css')).toBeGreaterThan(imports.indexOf('party-items.css'));
  expect(imports.at(-1)).toBe('clean-layout.css');
 });
});
