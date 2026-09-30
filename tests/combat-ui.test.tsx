// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Campaign from '../src/Campaign';
import Combat from '../src/campaign/Combat';
import { COMBAT_BEATS, DICE_SETTLE_MS, COMBAT_STEP_MS, REDUCED_COMBAT_MS, useCombatPresentation } from '../src/campaign/combat-flow';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { beginBattle, chooseAttacker } from '../src/rules/combat';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { importSession, newSession } from '../src/rules/session';
import { view } from '../src/rules/view';
import type { Command, State } from '../src/rules/model';

beforeEach(() => {
 localStorage.clear(); window.scrollTo = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLElement.prototype.scrollIntoView = vi.fn();
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function battle() {
 const s = createGame(p, DEFAULT_SETUP), id = s.heroes[0].id;
 s.enemies = [{ id: 'enemy', creature: 'murloc', color: 'green', region: 'brill' }];
 beginBattle(s, 'pve', [id], ['enemy'], 'horde', 'brill'); chooseAttacker(p, s, id);
 const a = s.battle!.active!; a.threat = 5; a.reroll = 1; a.attrition = 2;
 a.dice = [2, 8, 1].map((value, id) => ({ id, value, color: id === 0 ? 'red' : id === 1 ? 'blue' : 'green', removed: id === 2, spotted: false, rerolled: false }));
 s.battle!.stage = 'reroll';
 return s;
}
const props = (s: State) => ({ state: view(s), legal: legalActions(p, s), send: vi.fn(), busy: false, botReady: false, botStep: vi.fn(), auto: false, toggleBots: vi.fn() });
function PresentedCombat({ state }: { state: State }) {
 const presentation = useCombatPresentation(view(state));
 return <Combat {...props(state)} presentation={presentation} />;
}
function saveAtPool() {
 let s = createGame(p, DEFAULT_SETUP); const session = newSession(p, DEFAULT_SETUP), hero = s.heroes[0].id;
 const send = (c: Command) => { s = apply(p, s, c); session.commands.push(c); };
 send({ type: 'travel', hero, path: ['brightwater'] });
 const challenge = legalActions(p, s).find(c => c.type === 'challenge' && c.hero === hero)!;
 send(challenge); send({ type: 'attacker', hero });
 localStorage.setItem('lordaeron-base-save-v7', JSON.stringify(session));
 return session;
}

describe('combat room controls and dice', () => {
 it('holds the result through anticipation and strike, reveals impact, then unlocks decisions', () => {
  vi.useFakeTimers();
  const s = battle(); s.battle!.stage = 'defense'; delete s.battle!.active; s.battle!.boxes.horde.damage = 20;
  const r = render(<StrictMode><PresentedCombat state={s} /></StrictMode>);
  const next = apply(p, s, { type: 'advance' }); r.rerender(<StrictMode><PresentedCombat state={next} /></StrictMode>);
  expect(screen.getByLabelText('Battle animation: anticipation')).toBeTruthy();
  expect(screen.queryAllByText('Victory')).toHaveLength(0);
  expect(screen.getByLabelText('Horde ranged hits').textContent).toBe('20');
  const finish = () => screen.getByRole('button', { name: 'Finish combat & continue' }) as HTMLButtonElement;
  expect(finish().disabled).toBe(true);
  act(() => vi.advanceTimersByTime(COMBAT_BEATS.action));
  expect(screen.getByLabelText('Battle animation: action')).toBeTruthy(); expect(finish().disabled).toBe(true);
  act(() => vi.advanceTimersByTime(COMBAT_BEATS.impact - COMBAT_BEATS.action));
  expect(screen.getByLabelText('Battle animation: impact')).toBeTruthy(); expect(screen.queryAllByText('Victory').length).toBeGreaterThan(0);
  expect(finish().disabled).toBe(true);
  act(() => vi.advanceTimersByTime(COMBAT_BEATS.complete - COMBAT_BEATS.impact));
  expect(screen.getByLabelText('Ready for your decision')).toBeTruthy(); expect(finish().disabled).toBe(false);
 });
 it('uses a brief static result when reduced motion is requested and cleans up a pending exchange', () => {
  vi.useFakeTimers(); vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const s = battle(); s.battle!.stage = 'defense'; delete s.battle!.active; s.battle!.boxes.horde.damage = 20;
  const r = render(<PresentedCombat state={s} />), next = apply(p, s, { type: 'advance' });
  r.rerender(<PresentedCombat state={next} />);
  expect(screen.getByLabelText('Battle animation: impact')).toBeTruthy();
  act(() => vi.advanceTimersByTime(REDUCED_COMBAT_MS));
  expect(screen.getByLabelText('Ready for your decision')).toBeTruthy();
  r.unmount(); act(() => vi.runOnlyPendingTimers());
  expect(screen.queryByRole('dialog')).toBeNull();
 });
 it('explains that Ghoul blocks normal rerolls even when equipment grants a reroll value', () => {
  const s = battle(); s.enemies[0].creature = 'ghoul'; s.battle!.active!.reroll = 4;
  render(<Combat {...props(s)} />);
  expect(screen.getByText(/Normal rerolls blocked by Ghoul/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Select misses' })).toBeNull();
 });
 it.each(['murloc', 'ghoul', 'kelthuzad'])('does not offer Wildkin power removal against %s', creature => {
  const s = battle(), h = s.heroes[0];
  h.learned.push('warrior-battle-shout'); h.slots[1].card = 'warrior-battle-shout';
  if (creature === 'kelthuzad') { s.battle!.boss = creature; s.battle!.enemies = []; }
  else s.enemies[0].creature = creature;
  s.battle!.stage = 'after-reroll'; s.battle!.active!.dice[0].value = 1;
  expect(legalActions(p, s).filter(c => c.type === 'monster')).toEqual([{ type: 'monster' }]);
 });
 it('still requires the actual Wildkin power removal choice', () => {
  const s = battle(), h = s.heroes[0];
  s.enemies[0].creature = 'wildkin'; h.learned.push('warrior-battle-shout'); h.slots[1].card = 'warrior-battle-shout';
  s.battle!.stage = 'after-reroll'; s.battle!.active!.dice[0].value = 1;
  const choices = legalActions(p, s).filter(c => c.type === 'monster');
  expect(choices.length).toBeGreaterThan(0);
  expect(choices.every(c => c.unequip?.length === 1)).toBe(true);
  const command = choices.find(c => c.unequip?.includes('warrior-battle-shout'))!;
  const after = apply(p, s, command);
  expect(after.heroes[0].slots[1].card).toBeUndefined();
 });
 it('shows eight physical faces per D8, hit labels and removed dice', () => {
  const r = render(<Combat {...props(battle())} />);
  expect(r.container.querySelectorAll('.d8-face')).toHaveLength(24);
  expect(screen.getByRole('button', { name: 'blue D8 8, hit' })).toBeTruthy();
  expect((screen.getByRole('button', { name: 'green D8 1, removed' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByLabelText('Ranged: 1 rolled hits')).toBeTruthy();
  expect(screen.getByLabelText('Armor: 0 rolled hits')).toBeTruthy();
 });
 it('selects only legal misses and sends one reroll with the selected IDs', () => {
  const s = battle(), pr = props(s); render(<Combat {...pr} />);
  fireEvent.click(screen.getByRole('button', { name: 'Select misses' }));
  expect(screen.getByRole('button', { name: 'red D8 2, miss' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Reroll selected (1)' }));
  expect(pr.send).toHaveBeenCalledExactlyOnceWith({ type: 'reroll', dice: [0] });
  expect((screen.getByRole('button', { name: 'Reroll selected (0)' }) as HTMLButtonElement).disabled).toBe(true);
 });
 it('blocks excessive selections and interaction during a roll', () => {
  const pr = props(battle()), r = render(<Combat {...pr} />);
  fireEvent.click(screen.getByRole('button', { name: 'red D8 2, miss' }));
  fireEvent.click(screen.getByRole('button', { name: 'blue D8 8, hit' }));
  expect((screen.getByRole('button', { name: 'Reroll selected (2)' }) as HTMLButtonElement).disabled).toBe(true);
  r.rerender(<Combat {...pr} busy />);
  expect(screen.getByLabelText('Dice tray').getAttribute('aria-busy')).toBe('true');
  expect((screen.getByRole('button', { name: 'Keep results' }) as HTMLButtonElement).disabled).toBe(true);
 });
 it('does not turn a pending defense click into a wound choice when combat advances', () => {
  const s = battle(); s.battle!.participants = s.heroes.slice(0, 2).map(h => h.id);
  s.battle!.stage = 'defense'; delete s.battle!.active;
  const send = vi.fn(), r = render(<Combat {...props(s)} send={send} automationPending />);
  const defense = screen.getByRole('button', { name: 'Resolve ranged & defense' });
  fireEvent.mouseDown(defense);
  const next = apply(p, s, { type: 'advance' });
  expect(next.battle!.stage).toBe('wounds');
  r.rerender(<Combat {...props(next)} send={send} />);
  fireEvent.mouseUp(defense); fireEvent.click(defense);
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Grumbaz: wound' }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'wound', hero: s.heroes[0].id });
 });
 it('retains the last roll when hits are banked and displays authoritative totals', () => {
  const s = battle(); s.battle!.stage = 'tokens'; const pr = props(s), r = render(<Combat {...pr} />);
  const next = apply(p, s, { type: 'tokens' }); r.rerender(<Combat {...props(next)} />);
  expect(screen.getByText('LAST ROLL')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'blue D8 8, hit' })).toBeTruthy();
  expect(screen.getByLabelText('Horde ranged hits').textContent).toBe('1');
  expect(screen.getByLabelText('Horde attrition').textContent).toBe('2');
 });
 it('opens the idle guide through its own menu and returns with the same close control', async () => {
  localStorage.setItem('lordaeron-base-save-v7', JSON.stringify(newSession(p, DEFAULT_SETUP)));
  await act(async () => { render(<Campaign />); }); fireEvent.click(screen.getByRole('button', { name: /^Combat\s*D8$/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Combat' });
  expect(within(dialog).getByText('Every roll has a role.')).toBeTruthy();
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: /^Combat\s*D8$/ }).getAttribute('aria-pressed')).toBe('false');
 });
 it('automates a real saved battle, waits for the dice, and continues while the room is hidden', async () => {
  const saved = saveAtPool(); render(<StrictMode><Campaign /></StrictMode>);
  await screen.findByRole('dialog', { name: 'Combat' });
  vi.useFakeTimers(); fireEvent.click(screen.getByRole('button', { name: /Roll \d+ D8/ }));
  const commands = () => JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands as Command[];
  expect(commands().length).toBe(saved.commands.length + 1);
  await act(async () => { vi.advanceTimersByTime(DICE_SETTLE_MS - 1); });
  expect(commands().length).toBe(saved.commands.length + 1);
  fireEvent.click(screen.getByRole('button', { name: 'Back to map' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  await act(async () => { vi.advanceTimersByTime(1); });
  await act(async () => { vi.advanceTimersByTime(COMBAT_STEP_MS); });
  expect(commands().filter(c => c.type === 'roll')).toHaveLength(1);
  expect(commands().filter(c => c.type === 'advance')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: /Return to combat/ }));
  expect(screen.getByRole('dialog', { name: 'Combat' })).toBeTruthy();
  fireEvent.click(screen.getByRole('switch', { name: /^Auto-resolve/ }));
  const count = commands().length;
  await act(async () => { vi.advanceTimersByTime(5000); });
  expect(commands()).toHaveLength(count);
  expect(importSession(p, localStorage.getItem('lordaeron-base-save-v7')!).state.battle?.stage).toBe('reroll');
 });
 it('applies a rapid repeated click once instead of skipping the next combat decision', async () => {
  saveAtPool();
  await act(async () => { render(<Campaign />); });
  await screen.findByRole('dialog', { name: 'Combat' });
  fireEvent.click(screen.getByRole('switch', { name: /^Auto-resolve/ }));
  vi.useFakeTimers(); fireEvent.click(screen.getByRole('button', { name: /Roll \d+ D8/ }));
  await act(async () => { vi.advanceTimersByTime(DICE_SETTLE_MS); });
  const advance = screen.getByRole('button', { name: 'Continue to rerolls' });
  const before = importSession(p, localStorage.getItem('lordaeron-base-save-v7')!);
  act(() => { fireEvent.click(advance); fireEvent.click(advance); });
  const after = importSession(p, localStorage.getItem('lordaeron-base-save-v7')!);
  expect(after.session.commands).toHaveLength(before.session.commands.length + 1);
  expect(after.state.battle?.stage).toBe('reroll');
 });
 it('waits for every defense and wound animation before sending the next automated command', async () => {
  const saved = saveAtPool(); let current = importSession(p, JSON.stringify(saved)).state;
  for (const type of ['roll', 'advance', 'advance', 'monster', 'tokens']) {
   const command = legalActions(p, current).find(c => c.type === type)!;
   current = apply(p, current, command); saved.commands.push(command);
  }
  expect(current.battle!.stage).toBe('defense');
  localStorage.setItem('lordaeron-base-save-v7', JSON.stringify(saved));
  vi.useFakeTimers(); await act(async () => { render(<Campaign />); });
  const commands = () => JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands as Command[];
  const start = commands().length;
  await act(async () => { vi.advanceTimersByTime(COMBAT_STEP_MS); });
  expect(commands()).toHaveLength(start + 1);
  expect(screen.getByLabelText('Battle animation: anticipation')).toBeTruthy();
  await act(async () => { vi.advanceTimersByTime(COMBAT_BEATS.complete - 1); });
  expect(commands()).toHaveLength(start + 1);
  await act(async () => { vi.advanceTimersByTime(1); });
  await act(async () => { vi.advanceTimersByTime(COMBAT_STEP_MS - 1); });
  expect(commands()).toHaveLength(start + 1);
  await act(async () => { vi.advanceTimersByTime(1); });
  expect(commands()).toHaveLength(start + 2); expect(commands().at(-1)?.type).toBe('wound');
  expect(screen.getByLabelText('Battle animation: anticipation')).toBeTruthy();
  await act(async () => { vi.advanceTimersByTime(COMBAT_BEATS.complete - 1); });
  expect(commands()).toHaveLength(start + 2);
  fireEvent.click(screen.getByRole('switch', { name: /^Auto-resolve/ }));
  await act(async () => { vi.advanceTimersByTime(COMBAT_BEATS.complete + COMBAT_STEP_MS); });
  expect(commands()).toHaveLength(start + 2);
 }, 15000);
});
