// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { audio, useCombatAudio } from '../src/campaign/audio';
import type { CombatCue, CombatPresentation } from '../src/campaign/combat-flow';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { newSession } from '../src/rules/session';
import { view, type GameView } from '../src/rules/view';

/**
 * A combat was silent after its dice. Its exchanges are now heard in step with their staging (audio.tsx › combatSounds), its
 * outcome after the last of them, and a player's own action at the moment he takes it.
 */
const WARRIOR = 'grumbaz-crowsblood';
beforeEach(() => {
 localStorage.clear(); window.scrollTo = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLElement.prototype.scrollIntoView = vi.fn();
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const fighting = (stage = 'defense', more: object = {}) => {
 const v = view(createGame(p, DEFAULT_SETUP)) as GameView;
 return { ...v, phase: 'combat', battle: { kind: 'pve', region: 'brill', participants: [WARRIOR], defeated: [], enemies: ['e'], round: 1, stage, first: 'horde', ...more } } as unknown as GameView;
};
const exchange = (key: number, kind: CombatCue['kind'], kills?: number): CombatCue => ({ key, kind, title: '', anticipation: '', detail: '', heroId: WARRIOR, kills, before: fighting() });
const showing = (cue: CombatCue | undefined, phase: CombatPresentation['phase']): CombatPresentation => ({ cue, phase, busy: !!cue });
function Listener({ state, presentation }: { state: GameView; presentation: CombatPresentation }) { useCombatAudio(p, state, presentation); return null; }

describe('the sounds of a combat, in step with its staging', () => {
 it('plays each moment of an exchange once', () => {
  const cue = vi.spyOn(audio, 'cue').mockImplementation(() => {}), state = fighting(), defend = exchange(7, 'defend');
  const r = render(<Listener state={state} presentation={showing(defend, 'anticipation')} />);
  expect(cue.mock.calls).toEqual([[{ sfx: 'roar' }]]);
  // The same moment drawn again is not heard again.
  r.rerender(<Listener state={{ ...state }} presentation={showing(defend, 'anticipation')} />);
  r.rerender(<Listener state={state} presentation={showing(defend, 'action')} />);
  expect(cue).toHaveBeenCalledTimes(1);
  r.rerender(<Listener state={state} presentation={showing(defend, 'impact')} />);
  expect(cue.mock.calls).toEqual([[{ sfx: 'roar' }], [{ sfx: 'block' }]]);
  r.rerender(<Listener state={state} presentation={showing(defend, 'recovery')} />);
  r.rerender(<Listener state={state} presentation={showing(undefined, 'idle')} />);
  expect(cue).toHaveBeenCalledTimes(2);
  // The next exchange: a blow that fells an enemy.
  const melee = exchange(8, 'melee', 1);
  r.rerender(<Listener state={state} presentation={showing(melee, 'anticipation')} />);
  r.rerender(<Listener state={state} presentation={showing(melee, 'impact')} />);
  expect(cue.mock.calls.slice(2)).toEqual([[{ sfx: 'hit' }], [{ sfx: 'slain', delay: 0.28 }]]);
 });
 it('announces the outcome after the last exchange has been shown, and once', () => {
  vi.useFakeTimers();
  const cue = vi.spyOn(audio, 'cue').mockImplementation(() => {}), won = fighting('over', { winner: 'horde' }), last = exchange(9, 'melee', 1);
  const r = render(<Listener state={fighting()} presentation={showing(undefined, 'idle')} />);
  // The state says the fight is over a moment before its last exchange begins to show.
  r.rerender(<Listener state={won} presentation={showing(undefined, 'idle')} />);
  act(() => { vi.advanceTimersByTime(100); });
  r.rerender(<Listener state={won} presentation={showing(last, 'anticipation')} />);
  act(() => { vi.advanceTimersByTime(1000); });
  r.rerender(<Listener state={won} presentation={showing(last, 'impact')} />);
  act(() => { vi.advanceTimersByTime(1500); });
  expect(cue.mock.calls).toEqual([[{ sfx: 'hit' }], [{ sfx: 'slain', delay: 0.28 }]]);
  r.rerender(<Listener state={won} presentation={showing(undefined, 'idle')} />);
  act(() => { vi.advanceTimersByTime(159); });
  expect(cue).toHaveBeenCalledTimes(2);
  act(() => { vi.advanceTimersByTime(1); });
  expect(cue.mock.calls.at(-1)).toEqual([{ stinger: 'triumph', voice: 'battle-won' }]);
  // Rewards and other changes while the finished fight is still on the table do not announce it again.
  r.rerender(<Listener state={{ ...won, revision: won.revision + 1 }} presentation={showing(undefined, 'idle')} />);
  act(() => { vi.advanceTimersByTime(2000); });
  expect(cue).toHaveBeenCalledTimes(3);
  // The next fight is announced in its turn.
  r.rerender(<Listener state={fighting()} presentation={showing(undefined, 'idle')} />);
  r.rerender(<Listener state={fighting('over', { winner: 'alliance' })} presentation={showing(undefined, 'idle')} />);
  act(() => { vi.advanceTimersByTime(200); });
  expect(cue.mock.calls.at(-1)).toEqual([{ stinger: 'defeat', voice: 'battle-lost' }]);
 });
 it('is silent outside a combat', () => {
  vi.useFakeTimers();
  const cue = vi.spyOn(audio, 'cue').mockImplementation(() => {});
  render(<Listener state={view(createGame(p, DEFAULT_SETUP))} presentation={showing(undefined, 'idle')} />);
  act(() => { vi.advanceTimersByTime(1000); });
  expect(cue).not.toHaveBeenCalled();
 });
});

describe('a player’s own action', () => {
 it.each(['off', 'normal'])('is heard at the moment he takes it, with the pace %s', async pace => {
  localStorage.setItem('lordaeron-base-save-v7', JSON.stringify({ ...newSession(p, DEFAULT_SETUP), commands: [] }));
  localStorage.setItem('lordaeron-base-bots-v3', '[]'); localStorage.setItem('lordaeron-pace-v1', pace);
  const cue = vi.spyOn(audio, 'cue').mockImplementation(() => {});
  vi.spyOn(audio, 'play').mockResolvedValue(undefined); vi.spyOn(audio, 'stinger').mockImplementation(() => {});
  await act(async () => { render(<Campaign />); });
  fireEvent.click(screen.getByRole('button', { name: /^Rest.*Recover health/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Rest · 1 action' }));
  expect(JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands).toEqual([{ type: 'rest', hero: WARRIOR, health: 0 }]);
  expect(cue.mock.calls).toEqual([[{ stinger: 'heal' }]]);
 });
});
