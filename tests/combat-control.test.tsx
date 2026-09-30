// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { newSession } from '../src/rules/session';
import type { Command } from '../src/rules/model';
import type { GameView } from '../src/rules/view';
import type { Decision } from '../src/ai/planner';
import { COMBAT_STEP_MS } from '../src/campaign/combat-flow';

const planner = vi.hoisted(() => ({ plan: vi.fn<(state: GameView, legal: Command[]) => Promise<Decision | undefined>>(), dispose: vi.fn() }));
vi.mock('../src/ai/client', () => ({ PlannerClient: class { plan = planner.plan; dispose = planner.dispose; } }));
vi.mock('../src/campaign/Tabletop', () => ({ default: ({ state, takeControl }: { state: GameView; takeControl: (id: string) => void }) => <button onClick={() => takeControl(state.heroes[0].id)}>Take control of warrior</button> }));
vi.mock('../src/campaign/Combat', () => ({ default: ({ open, botStep, toggleResolve }: { open?: boolean; botStep: () => void; toggleResolve: () => void }) => open && <div><button onClick={toggleResolve}>Pause bot automation</button><button onClick={botStep}>Step bot</button></div> }));

function saveAtPool(bot: boolean) {
 let state = createGame(p, DEFAULT_SETUP);
 const session = newSession(p, DEFAULT_SETUP), hero = state.heroes[0].id;
 const send = (command: Command) => { state = apply(p, state, command); session.commands.push(command); };
 send({ type: 'travel', hero, path: ['brightwater'] });
 send(legalActions(p, state).find(c => c.type === 'challenge' && c.hero === hero)!);
 send({ type: 'attacker', hero });
 localStorage.setItem('lordaeron-base-save-v7', JSON.stringify(session));
 localStorage.setItem('lordaeron-base-bots-v3', JSON.stringify(bot ? [hero] : []));
 return session;
}
const savedCommands = () => JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands as Command[];

beforeEach(() => { localStorage.clear(); planner.plan.mockReset(); planner.dispose.mockReset(); window.scrollTo = vi.fn(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Campaign combat ownership', () => {
 it('keeps a restored human battle manual even with bot automation enabled', async () => {
  const session = saveAtPool(false);
  await act(async () => { render(<Campaign />); });
  await screen.findByRole('button', { name: 'Step bot' });
  vi.useFakeTimers(); await act(async () => { vi.advanceTimersByTime(COMBAT_STEP_MS * 6); });
  fireEvent.click(screen.getByRole('button', { name: 'Step bot' }));
  expect(planner.plan).not.toHaveBeenCalled();
  expect(savedCommands()).toEqual(session.commands);
 });

 it('discards a pending Step bot plan when the player takes control', async () => {
  const session = saveAtPool(true);
  let finish: (() => void) | undefined;
  planner.plan.mockImplementation((_state, legal) => new Promise(resolve => { finish = () => resolve({ command: legal[0], reason: 'Test bot move', score: 0, alternatives: legal.length, considered: [] }); }));
  await act(async () => { render(<Campaign />); });
  await screen.findByRole('button', { name: 'Step bot' });
  fireEvent.click(screen.getByRole('button', { name: 'Pause bot automation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Step bot' }));
  expect(planner.plan).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Take control of warrior' }));
  await act(async () => { finish!(); });
  expect(savedCommands()).toEqual(session.commands);
  expect(JSON.parse(localStorage.getItem('lordaeron-base-bots-v3')!)).toEqual([]);
 });
});
