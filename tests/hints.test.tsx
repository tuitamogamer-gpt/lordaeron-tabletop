// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Campaign from '../src/Campaign';
import Tabletop from '../src/campaign/Tabletop';
import { hintCandidates, hintLabel, type Hint } from '../src/campaign/hints';
import { undoName } from '../src/campaign/undo';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { newSession } from '../src/rules/session';
import { view } from '../src/rules/view';
import type { Command, State } from '../src/rules/model';

beforeEach(() => {
 localStorage.clear();
 vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
 HTMLElement.prototype.scrollIntoView = vi.fn(); window.scrollTo = vi.fn();
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const start = () => { const s = createGame(p, DEFAULT_SETUP); return { s, id: s.heroes[0].id }; };

describe('the move advisor’s words', () => {
 it('chooses only among the actions of the character asked about', () => {
  const { s, id } = start(), legal = legalActions(p, s), mine = hintCandidates(legal, id);
  expect(mine.length).toBeGreaterThan(3);
  expect(mine.every(c => 'hero' in c && c.hero === id)).toBe(true);
  expect(new Set(mine.map(c => c.type))).toEqual(new Set(['travel', 'rest', 'train', 'town']));
  expect(legal.some(c => c.type === 'endActions')).toBe(false);
  expect(hintCandidates(legal, s.heroes.find(h => h.id !== id && legal.some(c => 'hero' in c && c.hero === h.id))!.id).some(c => 'hero' in c && c.hero === id)).toBe(false);
 });

 it('names a suggestion the way the action buttons do', () => {
  const { s, id } = start(), v = view(s);
  const label = (c: Command) => hintLabel(p, v, c);
  expect(label({ type: 'travel', hero: id, path: ['stillwater'] })).toBe('Travel to Stillwater Pond');
  expect(label({ type: 'travel', hero: id, path: ['stillwater', 'agamand'] })).toBe('Travel to Agamand Mills through Stillwater Pond');
  expect(label({ type: 'travel', hero: id, path: [] })).toBe('Stay here and pass this action');
  expect(label({ type: 'rest', hero: id, health: 2 })).toBe('Rest: 2 health, the rest to energy');
  expect(label({ type: 'rest', hero: id, health: 0 })).toBe('Rest: recover energy');
  const powers = p.cards.filter(c => c.kind === 'power' && !c.printed && c.classId === 'warrior').slice(0, 2);
  expect(label({ type: 'train', hero: id, cards: powers.map(c => c.id) })).toBe(`Train: learn ${powers[0].name} and ${powers[1].name}`);
  expect(label({ type: 'town', hero: id, health: 1, operations: [] })).toBe('Town: recover');
  expect(label({ type: 'town', hero: id, health: 0, operations: [{ op: 'buy', card: s.merchant[0] }] })).toBe(`Town: buy ${p.cards.find(c => c.id === s.merchant[0])!.name}`);
 });

 it('says what is challenged, where and with whom', () => {
  const { s, id } = start();
  s.enemies = [{ id: 'a', creature: 'murloc', color: 'green', region: 'brill', quest: s.quests[0], faction: 'horde' }, { id: 'b', creature: 'murloc', color: 'green', region: 'brill', quest: s.quests[0], faction: 'horde' }, { id: 'c', creature: 'ogre', color: 'blue', region: 'brill' }];
  const v = view(s);
  expect(hintLabel(p, v, { type: 'challenge', hero: id, target: 'a', allies: [] })).toBe('Challenge the 2 Murlocs in Brill');
  expect(hintLabel(p, v, { type: 'challenge', hero: id, target: 'c', allies: [s.heroes[1].id, s.heroes[2].id] })).toBe('Challenge the Ogre in Brill with Sofeea and Zowka');
  expect(hintLabel(p, v, { type: 'challenge', hero: id, target: s.overlord.id, allies: [] })).toBe('Challenge Kel’Thuzad in Brill');
 });
});

function table(s: State, extra: { hint?: Hint; onHint?: () => void; onUseHint?: () => void; onDismissHint?: () => void; bots?: string[]; send?: (c: Command) => void } = {}) {
 const bots = extra.bots ?? [];
 return <Tabletop state={view(s, s.heroes.map(h => h.id))} h={s.heroes[0]} legal={legalActions(p, s)} controlled={s.heroes.map(h => h.id).filter(id => !bots.includes(id))} bots={bots} auto={false} botReady={false} botReason="" hint={extra.hint} onHint={extra.onHint} onUseHint={extra.onUseHint} onDismissHint={extra.onDismissHint} selectHero={() => {}} selected="brill" selectRegion={() => {}} inspect={() => {}} open={() => {}} send={extra.send ?? (() => {})} botStep={() => {}} toggleBots={() => {}} focused={false} toggleFocus={() => {}} notify={() => {}} />;
}

describe('the move advisor on the table', () => {
 it('offers a hint while the character has actions, then shows the suggestion with its reason', () => {
  const { s } = start(), onHint = vi.fn(), onUseHint = vi.fn(), onDismissHint = vi.fn();
  const ui = render(table(s, { onHint }));
  const advisor = () => screen.getByRole('region', { name: 'Move advisor' });
  expect(within(advisor()).getByText('Need a hint for Grumbaz?')).toBeTruthy();
  fireEvent.click(within(advisor()).getByRole('button', { name: /^Hint/ }));
  expect(onHint).toHaveBeenCalledTimes(1);
  ui.rerender(table(s, { onHint, hint: { busy: true } }));
  expect(advisor().getAttribute('aria-busy')).toBe('true');
  expect((within(advisor()).getByRole('button', { name: /^Hint/ }) as HTMLButtonElement).disabled).toBe(true);
  ui.rerender(table(s, { onHint, onUseHint, onDismissHint, hint: { busy: false, label: 'Travel to Stillwater Pond', reason: 'Heading for Danger in Stillwater; this move arrives.' } }));
  expect(within(advisor()).getByText('Travel to Stillwater Pond')).toBeTruthy();
  expect(within(advisor()).getByText('Heading for Danger in Stillwater; this move arrives.')).toBeTruthy();
  fireEvent.click(within(advisor()).getByRole('button', { name: /^Do this/ }));
  expect(onUseHint).toHaveBeenCalledTimes(1);
  fireEvent.click(within(advisor()).getByRole('button', { name: 'Dismiss the suggestion' }));
  expect(onDismissHint).toHaveBeenCalledTimes(1);
 });

 it('stays out of the way when the character cannot act', () => {
  const { s } = start();
  const spent = structuredClone(s); spent.heroes[0].actions = 0;
  render(table(spent, { onHint: () => {} }));
  expect(screen.queryByRole('region', { name: 'Move advisor' })).toBeNull();
  cleanup();
  render(table(s, { onHint: () => {}, bots: s.heroes.map(h => h.id) }));
  expect(screen.queryByRole('region', { name: 'Move advisor' })).toBeNull();
  cleanup();
  render(table(s));
  expect(screen.queryByRole('region', { name: 'Move advisor' })).toBeNull();
 });
});

describe('passing', () => {
 it('spends the character’s remaining actions without doing anything, and can be undone as a pass', () => {
  const { s, id } = start(), send = vi.fn();
  s.enemies = [];
  render(table(s, { onHint: () => {}, send }));
  fireEvent.click(screen.getByRole('button', { name: 'Pass 2 actions' }));
  expect(send.mock.calls.map(call => call[0])).toEqual([{ type: 'travel', hero: id, path: [] }, { type: 'travel', hero: id, path: [] }]);
  expect(undoName({ type: 'travel', hero: id, path: [] })).toBe('pass');
  expect(undoName({ type: 'travel', hero: id, path: ['stillwater'] })).toBe('travel');
  expect(undoName({ type: 'rest', hero: id, health: 0 })).toBe('rest');
 });

 it('is not offered beside a blue creature, where the next action must be a Challenge', () => {
  const { s } = start();
  s.enemies = [{ id: 'c', creature: 'murloc', color: 'blue', region: 'brill' }];
  render(table(s, { onHint: () => {} }));
  expect(screen.getByRole('region', { name: 'Move advisor' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Pass/ })).toBeNull();
 });
});

describe('asking for a hint in a campaign', () => {
 it('suggests a move for the player’s character and plays it on request', async () => {
  localStorage.setItem('lordaeron-base-save-v7', JSON.stringify(newSession(p, DEFAULT_SETUP)));
  render(<Campaign />);
  const advisor = () => screen.getByRole('region', { name: 'Move advisor' });
  fireEvent.click(within(advisor()).getByRole('button', { name: /^Hint/ }));
  const take = await within(advisor()).findByRole('button', { name: /^Do this/ }, { timeout: 60_000 });
  const suggestion = advisor().querySelector('strong')!.textContent!;
  expect(suggestion).toMatch(/^(Travel to|Rest|Train|Town|Stay here)/);
  expect(advisor().querySelector('p')!.textContent!.length).toBeGreaterThan(20);
  fireEvent.click(take);
  const saved = JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!);
  expect(saved.commands).toHaveLength(1);
  expect(saved.commands[0].hero).toBe(DEFAULT_SETUP.roster[0]);
  // The suggestion belonged to the earlier position; the advisor waits to be asked again.
  expect(within(advisor()).getByRole('button', { name: /^Hint/ })).toBeTruthy();
 }, 90_000);
});
