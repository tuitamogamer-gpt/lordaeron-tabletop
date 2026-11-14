// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { audio } from '../src/campaign/audio';
import { AuctionChoices } from '../src/campaign/Interactions';
import { CardThumbnail } from '../src/campaign/parts';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { card, faction } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command } from '../src/rules/model';
import { newSession } from '../src/rules/session';

/**
 * What an audit of every screen found broken on 14. 11. 2026 and what keeps it repaired (docs/PREMIUM-FINISH-2026-11-14.md).
 * The repairs that are only layout live in finish.css and were checked in a browser at three sizes; these are the ones a
 * test can hold.
 */
const planner = vi.hoisted(() => ({ plan: vi.fn(), dispose: vi.fn() }));
vi.mock('../src/ai/client', () => ({ PlannerClient: class { plan = planner.plan; dispose = planner.dispose; } }));
const WARRIOR = 'grumbaz-crowsblood', ROSTER = DEFAULT_SETUP.roster;
beforeEach(() => {
 localStorage.clear(); planner.plan.mockReset();
 window.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
 vi.spyOn(audio, 'play').mockResolvedValue(undefined); vi.spyOn(audio, 'stinger').mockImplementation(() => {}); vi.spyOn(audio, 'cue').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function seat(commands: Command[], bots: string[], seed = DEFAULT_SETUP.seed) {
 localStorage.setItem('lordaeron-base-save-v7', JSON.stringify({ ...newSession(p, { ...DEFAULT_SETUP, seed }), commands }));
 localStorage.setItem('lordaeron-base-bots-v3', JSON.stringify(bots));
}
/** Passes and empty equipment for everyone until an Event card asks each character in turn for a choice (seed 7). */
function untilDecision() {
 let s = createGame(p, { ...DEFAULT_SETUP, seed: 7 }); const commands: Command[] = [];
 for (let guard = 0; guard < 2000 && !s.eventFlow?.steps.length; guard++) {
  const legal = legalActions(p, s), acting = s.heroes.find(h => faction(p, h.id) === s.faction && h.actions > 0);
  const c: Command = s.phase === 'actions' ? acting ? { type: 'travel', hero: acting.id, path: [] } : { type: 'endActions' } : legal.find(c => c.type === 'endManagement') ?? legal.find(c => c.type === 'manage') ?? legal[0];
  s = apply(p, s, c); commands.push(c);
 }
 return commands;
}

describe('the turn’s own controls', () => {
 it('stand on the table only: on another page a stray click cannot end a phase', async () => {
  // Everyone has passed: "Management" would end the Horde's actions.
  const done = ROSTER.filter(id => faction(p, id) === 'horde').flatMap(id => [{ type: 'travel', hero: id, path: [] }, { type: 'travel', hero: id, path: [] }] as Command[]);
  seat(done, []);
  await act(async () => { render(<Campaign />); });
  expect(screen.getByRole('button', { name: /^Management/ })).toBeTruthy();
  for (const page of ['Card library', 'Heroes', 'Chronicle', 'Rules']) {
   fireEvent.click(screen.getByRole('button', { name: page }));
   expect(screen.queryByRole('button', { name: /^Management/ }), page).toBeNull();
   expect(screen.queryByRole('button', { name: /^End turn/ }), page).toBeNull();
   expect(screen.queryByRole('button', { name: /^Undo/ }), page).toBeNull();
   expect(screen.getByRole('button', { name: /^Back to the table/ }), page).toBeTruthy();
  }
  // Nothing was sent meanwhile, and the way back restores the control.
  expect(JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands).toHaveLength(done.length);
  fireEvent.click(screen.getByRole('button', { name: /^Back to the table/ }));
  expect(screen.getByRole('button', { name: /^Management/ })).toBeTruthy();
 });
});

describe('the bots’ controls', () => {
 it('are not shown where no character is played by the AI', async () => {
  const commands = untilDecision();
  seat(commands, [], 7);
  await act(async () => { render(<Campaign />); });
  const dialog = screen.getByRole('dialog', { name: 'Professions and Crafts' });
  expect(within(dialog).queryByRole('button', { name: /^Bot move/ })).toBeNull();
  expect(within(dialog).queryByRole('button', { name: /Automatic bots|Pause automatic moves/ })).toBeNull();
  expect(document.querySelector('.bot-status')).toBeNull();
 });
 it('are shown where one is', async () => {
  const commands = untilDecision();
  seat(commands, ROSTER.filter(id => id !== WARRIOR), 7);
  await act(async () => { render(<Campaign />); });
  const dialog = screen.getByRole('dialog', { name: 'Professions and Crafts' });
  expect(within(dialog).getByRole('button', { name: /^Bot move/ })).toBeTruthy();
  expect(within(dialog).getByRole('button', { name: 'Automatic bots' })).toBeTruthy();
  expect(document.querySelector('.bot-status')).not.toBeNull();
 });
 it('leave a fight without the switch for bots that are not there', { timeout: 20000 }, async () => {
  let s = createGame(p, DEFAULT_SETUP); const commands: Command[] = [];
  const go = (c: Command) => { s = apply(p, s, c); commands.push(c); };
  go({ type: 'travel', hero: WARRIOR, path: ['brightwater'] });
  go(legalActions(p, s).find((c): c is Extract<Command, { type: 'challenge' }> => c.type === 'challenge' && c.hero === WARRIOR && !c.allies.length)!);
  seat(commands, []);
  await act(async () => { render(<Campaign />); });
  // The combat window is loaded when it is first needed.
  const room = await screen.findByRole('dialog', { name: 'Combat' }, { timeout: 8000 });
  expect(within(room).getByRole('switch', { name: /Auto-continue steps/ })).toBeTruthy();
  expect(within(room).queryByRole('switch', { name: /Auto-play bots/ })).toBeNull();
  expect(room.textContent).toContain('Every decision is yours and waits for confirmation.');
  cleanup();
  seat(commands, ROSTER.filter(id => id !== WARRIOR));
  await act(async () => { render(<Campaign />); });
  expect(within(await screen.findByRole('dialog', { name: 'Combat' }, { timeout: 8000 })).getByRole('switch', { name: /Auto-play bots/ })).toBeTruthy();
 });
});

describe('a bidder at the auction', () => {
 it('is named by a first name that fits on one line, with the full name kept for the controls and the tooltip', () => {
  const heroes = createGame(p, DEFAULT_SETUP).heroes.slice(0, 2);
  render(<AuctionChoices heroes={heroes} send={vi.fn()} busy={false} />);
  for (const h of heroes) {
   const full = p.characters.find(c => c.id === h.id)!.name, name = screen.getByText(full.split(' ')[0]);
   expect(name.tagName).toBe('STRONG'); expect(name.getAttribute('title')).toBe(full);
   expect(screen.getByRole('spinbutton', { name: `Bid: ${full}` })).toBeTruthy();
  }
 });
});

describe('a hint on a screen worked with a finger', () => {
 const pointer = (coarse: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: coarse && query.includes('pointer: coarse'), media: query, addEventListener() {}, removeEventListener() {} }));
 const hint = () => { fireEvent.click(screen.getByRole('button', { name: 'Preview Fireball' })); return screen.getByRole('tooltip').querySelector('.card-preview-hint')!.textContent!; };
 it('names a tap where a mouse is told to hover, click or press Esc', () => {
  pointer(true);
  render(<CardThumbnail card={card(p, 'mage-fireball')} />);
  const touch = hint();
  expect(touch).toContain('Tap outside to close');
  expect(touch).not.toMatch(/Click|Esc|Hover/);
  cleanup(); pointer(false);
  render(<CardThumbnail card={card(p, 'mage-fireball')} />);
  expect(hint()).toContain('Click outside or press Esc to close');
 });
});
