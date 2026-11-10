// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { loadCampaign, PREVIOUS_SAVE_KEY, SAVE_KEY, SNAPSHOT_KEY, writeSnapshot } from '../src/campaign/saves';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { extendsSession, importSession, newSession, resumeSession } from '../src/rules/session';
import type { Command, State } from '../src/rules/model';

/** Plays `count` legal moves with a fixed pseudo-random choice, so the game passes through combat, rewards and events. */
function play(count: number, seed = 7) {
 let state = createGame(p, DEFAULT_SETUP), pick = seed; const commands: Command[] = [];
 for (let i = 0; i < count && state.phase !== 'finished'; i++) {
  const legal = legalActions(p, state); if (!legal.length) break;
  pick = (Math.imul(pick, 1664525) + 1013904223) >>> 0;
  const command = legal[pick % legal.length]; state = apply(p, state, command); commands.push(command);
 }
 return { state, session: { ...newSession(p, DEFAULT_SETUP), commands } };
}
const text = (game: { session: ReturnType<typeof newSession> }) => JSON.stringify(game.session);
/** States are compared by content: a restored object may list the same fields in another order. */
const content = (state: State) => JSON.parse(JSON.stringify(state)) as unknown;
const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY)!) as { setup: { seed: number }; commands: Command[] };
/** What another tab of the same browser does when it saves: the value changes and this tab is told. */
const otherTabSaves = (key: string, value: string) => { localStorage.setItem(key, value); act(() => { window.dispatchEvent(new StorageEvent('storage', { key, newValue: value })); }); };

beforeEach(() => {
 localStorage.clear();
 window.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('state snapshot next to the autosave', () => {
 const marked = (state: State) => ({ ...state, log: [...state.log, { id: 999999, turn: state.turn, text: 'from the snapshot' }] });
 const fromSnapshot = (state: State) => state.log.at(-1)?.text === 'from the snapshot';

 it('resumes a campaign from the snapshot without replaying its moves', () => {
  const game = play(60), json = text(game);
  localStorage.setItem(SAVE_KEY, json);
  // The marker proves which path produced the state: a replay could not contain it.
  writeSnapshot({ state: marked(game.state), session: game.session }, json, 'build-a');
  const loaded = loadCampaign('build-a');
  expect(fromSnapshot(loaded.state)).toBe(true);
  expect(loaded.session.commands).toEqual(game.session.commands);
  expect(loaded.needsSetup).toBeUndefined();
 });

 it('replays only the moves made after the snapshot was taken', () => {
  const game = play(60), earlier = { ...newSession(p, DEFAULT_SETUP), commands: game.session.commands.slice(0, 40) };
  let state = createGame(p, DEFAULT_SETUP); for (const c of earlier.commands) state = apply(p, state, c);
  writeSnapshot({ state, session: earlier }, JSON.stringify(earlier), 'build-a');
  localStorage.setItem(SAVE_KEY, text(game));
  const loaded = loadCampaign('build-a');
  expect(content(loaded.state)).toEqual(content(game.state));
  expect(JSON.stringify(loaded.session)).toBe(text(game));
 });

 it.each([
  ['another build', (game: ReturnType<typeof play>) => { writeSnapshot({ state: marked(game.state), session: game.session }, text(game), 'build-b'); }],
  ['a save whose moves differ', (_game: ReturnType<typeof play>) => { const other = play(60, 8); writeSnapshot({ state: marked(other.state), session: other.session }, text(other), 'build-a'); }],
  ['a save that was undone past the snapshot', (game: ReturnType<typeof play>) => { const longer = play(80); expect(longer.session.commands.slice(0, 60)).toEqual(game.session.commands); writeSnapshot({ state: marked(longer.state), session: longer.session }, text(longer), 'build-a'); }],
  ['unreadable snapshot text', (_game: ReturnType<typeof play>) => { localStorage.setItem(SNAPSHOT_KEY, '{broken'); }],
 ])('ignores a snapshot from %s and replays the save', (_name, prepare) => {
  const game = play(60);
  localStorage.setItem(SAVE_KEY, text(game)); prepare(game);
  const loaded = loadCampaign('build-a');
  expect(fromSnapshot(loaded.state)).toBe(false);
  expect(content(loaded.state)).toEqual(content(game.state));
  expect(JSON.stringify(loaded.session)).toBe(text(game));
 });

 it('never uses snapshots without a build of its own, as in development and tests', () => {
  const game = play(20), json = text(game);
  localStorage.setItem(SAVE_KEY, json);
  writeSnapshot({ state: marked(game.state), session: game.session }, json);
  expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull();
  writeSnapshot({ state: marked(game.state), session: game.session }, json, 'build-a');
  expect(fromSnapshot(loadCampaign().state)).toBe(false);
 });

 it('continues from a restored state exactly as from the replayed one', () => {
  const game = play(160), half = 80;
  let state = createGame(p, DEFAULT_SETUP); for (const c of game.session.commands.slice(0, half)) state = apply(p, state, c);
  const resumed = resumeSession(p, text(game), { state: JSON.parse(JSON.stringify(state)) as State, count: half });
  expect(content(resumed.state)).toEqual(content(game.state));
  expect(JSON.stringify(resumed.session)).toBe(text(game));
  expect(content(importSession(p, text(game)).state)).toEqual(content(game.state));
  expect(JSON.stringify(importSession(p, text(game)).session)).toBe(text(game));
 });

 it('drops the snapshot when it does not fit, without failing the save', () => {
  const game = play(10), json = text(game);
  localStorage.setItem(SNAPSHOT_KEY, 'old');
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) { if (key === SNAPSHOT_KEY) throw new DOMException('full', 'QuotaExceededError'); original.call(this, key, value); });
  expect(() => writeSnapshot(game, json, 'build-a')).not.toThrow();
  expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull();
 });
});

describe('recognising a continued save', () => {
 it('accepts the same game with more moves and nothing else', () => {
  const start = play(0), short = play(5), long = play(9), other = play(9, 8);
  expect(extendsSession(text(start), text(short))).toBe(true);
  expect(extendsSession(text(short), text(long))).toBe(true);
  expect(extendsSession(text(long), text(short))).toBe(false);
  expect(extendsSession(text(short), text(short))).toBe(false);
  expect(extendsSession(text(short), text(other))).toBe(false);
  const reseeded = JSON.stringify({ ...newSession(p, { ...DEFAULT_SETUP, seed: 99 }), commands: long.session.commands });
  expect(extendsSession(text(short), reseeded)).toBe(false);
 });

 it('writes the setup in one key order whatever order it was given in', () => {
  const shuffled = { variants: DEFAULT_SETUP.variants, overlord: DEFAULT_SETUP.overlord, roster: DEFAULT_SETUP.roster, seed: DEFAULT_SETUP.seed };
  expect(JSON.stringify(newSession(p, shuffled))).toBe(JSON.stringify(newSession(p, DEFAULT_SETUP)));
  expect(JSON.stringify(importSession(p, JSON.stringify(newSession(p, shuffled))).session)).toBe(JSON.stringify(newSession(p, DEFAULT_SETUP)));
 });
});

describe('two tabs of the same campaign', () => {
 const rest = (state: State, index: number): Command => ({ type: 'rest', hero: state.heroes[index].id, health: 0 });

 it('follows the moves another tab saves instead of overwriting them', () => {
  const start = play(0); localStorage.setItem(SAVE_KEY, text(start));
  render(<Campaign/>);
  // The other tab plays two moves with a hero of the active faction.
  const moves = [rest(start.state, 0), rest(start.state, 0)];
  otherTabSaves(SAVE_KEY, JSON.stringify({ ...start.session, commands: moves }));
  expect(document.querySelector('.toast')?.textContent).toContain('another tab');
  // This tab now plays on from the newer game: its own move is appended, nothing is lost.
  fireEvent.keyDown(document.body, { key: '1' });
  const dialog = document.querySelector('dialog.map-fullscreen-dialog[open]');
  expect(dialog).toBeNull(); // the first hero has no actions left after the other tab's moves
  expect(saved().commands).toEqual(moves);
 });

 it('appends its next move to the game it followed', () => {
  const start = play(0); localStorage.setItem(SAVE_KEY, text(start));
  render(<Campaign/>);
  const first = rest(start.state, 1);
  otherTabSaves(SAVE_KEY, JSON.stringify({ ...start.session, commands: [first] }));
  fireEvent.keyDown(document.body, { key: '1' });
  const dialog = document.querySelector('dialog.map-fullscreen-dialog[open]')!;
  fireEvent.click(dialog.querySelector('polygon.map-field.reachable')!);
  fireEvent.click(screen.getByRole('button', { name: /Travel here/ }));
  expect(saved().commands.map(c => c.type)).toEqual(['rest', 'travel']);
  expect(saved().commands[0]).toEqual(first);
 });

 it('clears its undo history when another tab moves, so it cannot undo into a stale game', () => {
  const start = play(0); localStorage.setItem(SAVE_KEY, text(start));
  render(<Campaign/>);
  fireEvent.keyDown(document.body, { key: '1' });
  const dialog = document.querySelector('dialog.map-fullscreen-dialog[open]')!;
  fireEvent.click(dialog.querySelector('polygon.map-field.reachable')!);
  fireEvent.click(screen.getByRole('button', { name: /Travel here/ }));
  fireEvent.keyDown(dialog.querySelector('.campaign-map-scroll')!, { key: 'Escape' });
  expect(screen.getByRole('button', { name: /Undo travel/ })).toBeTruthy();
  const mine = saved().commands;
  otherTabSaves(SAVE_KEY, JSON.stringify({ ...start.session, commands: [...mine, rest(start.state, 1)] }));
  expect(screen.queryByRole('button', { name: /Undo/ })).toBeNull();
  fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
  expect(saved().commands).toHaveLength(2);
 });

 it('shows the campaign another tab started and keeps that tab’s backup of the previous one', () => {
  const start = play(0); localStorage.setItem(SAVE_KEY, text(start));
  render(<Campaign/>);
  const other = { ...newSession(p, { ...DEFAULT_SETUP, seed: 4242 }), commands: [] as Command[] };
  otherTabSaves(PREVIOUS_SAVE_KEY, text(start));
  otherTabSaves(SAVE_KEY, JSON.stringify(other));
  expect(document.querySelector('.toast')?.textContent).toContain('Another tab changed the saved campaign');
  expect(saved().setup.seed).toBe(4242);
  expect(localStorage.getItem(PREVIOUS_SAVE_KEY)).toBe(text(start));
  // A move here continues the new campaign.
  fireEvent.keyDown(document.body, { key: '1' });
  const dialog = document.querySelector('dialog.map-fullscreen-dialog[open]')!;
  fireEvent.click(dialog.querySelector('polygon.map-field.reachable')!);
  fireEvent.click(screen.getByRole('button', { name: /Travel here/ }));
  expect(saved().setup.seed).toBe(4242);
  expect(saved().commands).toHaveLength(1);
  expect(localStorage.getItem(PREVIOUS_SAVE_KEY)).toBe(text(start));
 });

 it('does not write its own older game back while another tab replaces the campaign', () => {
  const start = play(0); localStorage.setItem(SAVE_KEY, text(start));
  render(<Campaign/>);
  const other = JSON.stringify({ ...newSession(p, { ...DEFAULT_SETUP, seed: 4242 }), commands: [] });
  // The other tab writes the backup and the new campaign in one go; this tab hears about them one after the other.
  localStorage.setItem(PREVIOUS_SAVE_KEY, text(start)); localStorage.setItem(SAVE_KEY, other);
  act(() => { window.dispatchEvent(new StorageEvent('storage', { key: PREVIOUS_SAVE_KEY, newValue: text(start) })); });
  expect(saved().setup.seed).toBe(4242);
  act(() => { window.dispatchEvent(new StorageEvent('storage', { key: SAVE_KEY, newValue: other })); });
  expect(saved().setup.seed).toBe(4242);
  expect(document.querySelector('.toast')?.textContent).toContain('Another tab changed the saved campaign');
 });

 it('takes over a newer save it has not heard about yet instead of overwriting it', () => {
  const start = play(0); localStorage.setItem(SAVE_KEY, text(start));
  render(<Campaign/>);
  // Another tab saved two moves, and the notification has not reached this tab when it makes a move of its own.
  const theirs = [rest(start.state, 1), rest(start.state, 1)];
  localStorage.setItem(SAVE_KEY, JSON.stringify({ ...start.session, commands: theirs }));
  fireEvent.keyDown(document.body, { key: '1' });
  const dialog = document.querySelector('dialog.map-fullscreen-dialog[open]')!;
  fireEvent.click(dialog.querySelector('polygon.map-field.reachable')!);
  fireEvent.click(screen.getByRole('button', { name: /Travel here/ }));
  expect(saved().commands).toEqual(theirs);
  expect(document.querySelector('.toast')?.textContent).toContain('Another tab changed the saved campaign');
 });

 it('takes the saved game when the other tab went back with Undo', () => {
  const start = play(0); const moves = [rest(start.state, 0), rest(start.state, 1)];
  localStorage.setItem(SAVE_KEY, JSON.stringify({ ...start.session, commands: moves }));
  render(<Campaign/>);
  otherTabSaves(SAVE_KEY, JSON.stringify({ ...start.session, commands: moves.slice(0, 1) }));
  fireEvent.keyDown(document.body, { key: '1' });
  const dialog = document.querySelector('dialog.map-fullscreen-dialog[open]')!;
  fireEvent.click(dialog.querySelector('polygon.map-field.reachable')!);
  fireEvent.click(screen.getByRole('button', { name: /Travel here/ }));
  expect(saved().commands.map(c => c.type)).toEqual(['rest', 'travel']);
 });

 it('ignores a save it cannot read and an identical save', () => {
  const start = play(0); localStorage.setItem(SAVE_KEY, text(start));
  render(<Campaign/>);
  act(() => { window.dispatchEvent(new StorageEvent('storage', { key: SAVE_KEY, newValue: text(start) })); });
  act(() => { window.dispatchEvent(new StorageEvent('storage', { key: SAVE_KEY, newValue: '{broken' })); });
  expect(document.querySelector('.toast')).toBeNull();
  expect(screen.getByRole('button', { name: /^Travel/ })).toBeTruthy();
 });
});
