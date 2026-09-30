// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { newSession } from '../src/rules/session';

const planner = vi.hoisted(() => ({ plan: vi.fn(), dispose: vi.fn() }));
vi.mock('../src/ai/client', () => ({ PlannerClient: class { plan = planner.plan; dispose = planner.dispose; } }));

beforeEach(() => {
 localStorage.clear();
 localStorage.setItem('lordaeron-base-save-v7', JSON.stringify(newSession(p, DEFAULT_SETUP)));
 planner.plan.mockReset(); planner.dispose.mockReset();
 window.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Campaign panel polish', () => {
 it('inspects training cards independently and preserves the draft when returning', () => {
  render(<Campaign />);
  fireEvent.click(screen.getByRole('button', { name: /^Train.*Learn class powers/ }));
  const train = screen.getByRole('dialog', { name: 'Train' });
  fireEvent.click(within(train).getByRole('button', { name: 'Level 1' }));
  const entry = [...train.querySelectorAll<HTMLElement>('.deck-card-entry')].find(el => within(el).queryByRole('button', { name: 'Add to training' })?.hasAttribute('disabled') === false)!;
  const inspect = within(entry).getByRole('button', { name: /^Inspect / });
  fireEvent.click(inspect);
  expect(screen.getByRole('dialog', { name: 'Train' })).toBe(train);
  fireEvent.click(screen.getByRole('button', { name: /Back to training/ }));
  expect(within(train).getByRole('button', { name: 'Level 1' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('0 powers selected')).toBeTruthy();
  const selection = screen.getAllByRole('button', { name: 'Add to training' }).find(button => !button.hasAttribute('disabled'))!;
  fireEvent.click(selection);
  const selectedEntry = screen.getByRole('button', { name: 'Remove from training' }).closest('.deck-card-entry') as HTMLElement;
  fireEvent.click(within(selectedEntry).getByRole('button', { name: /^Inspect / }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
  expect(screen.getByText('1 power selected')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Remove from training' })).toBeTruthy();
  const saved = JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!);
  expect(saved.commands).toEqual([]);
 });

 it('suspends automatic moves in Settings and resumes after closing', async () => {
  render(<Campaign />); vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Run AI' }));
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { vi.advanceTimersByTime(2000); });
  expect(planner.plan).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await act(async () => { vi.advanceTimersByTime(600); });
  expect(planner.plan).toHaveBeenCalledOnce();
 });

 it('cancels a plan already in flight when the player opens a panel', async () => {
  let finish: (() => void) | undefined;
  planner.plan.mockImplementation((_state, legal) => new Promise(resolve => { finish = () => resolve({ command: legal[0], reason: 'Test move' }); }));
  render(<Campaign />); vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Run AI' }));
  await act(async () => { vi.advanceTimersByTime(600); });
  expect(planner.plan).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { finish!(); });
  expect(JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands).toEqual([]);
 });

 it('returns to the board when starting bots from Party controls', async () => {
  render(<Campaign />); vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: /^Party controls/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Run bots' }));
  expect(screen.queryByRole('dialog', { name: 'Party controls' })).toBeNull();
  await act(async () => { vi.advanceTimersByTime(600); });
  expect(planner.plan).toHaveBeenCalledOnce();
 });
});
