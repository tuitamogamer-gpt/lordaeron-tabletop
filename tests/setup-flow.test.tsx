// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CampaignSetup from '../src/campaign/CampaignSetup';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { character } from '../src/rules/common';

afterEach(cleanup);
const next = () => fireEvent.click(screen.getByRole('button', { name: /^Continue/ }));
const ready = () => { next(); next(); next(); };

describe('compact campaign setup', () => {
 it('navigates the review with arrow keys and keeps launch outside the selected panel', () => {
  const start = vi.fn(), { container } = render(<CampaignSetup onStart={start} onCancel={() => {}}/>);
  ready();
  const overview = screen.getByRole('tab', { name: 'Overview' });
  overview.focus();
  fireEvent.keyDown(overview, { key: 'ArrowRight' });
  const quests = screen.getByRole('tab', { name: 'Starting quests' });
  expect(document.activeElement).toBe(quests);
  expect(quests.getAttribute('aria-selected')).toBe('true');
  expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(quests.id);
  expect(screen.getByRole('region', { name: 'Starting quests and creature placement' })).toBeTruthy();
  fireEvent.keyDown(quests, { key: 'End' });
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Shuffle' }));
  fireEvent.keyDown(document.activeElement!, { key: 'Home' });
  expect(document.activeElement).toBe(overview);
  const launch = screen.getByRole('button', { name: /^Begin campaign/ });
  expect(container.querySelector('.setup-footer')?.contains(launch)).toBe(true);
  expect(screen.getByRole('tabpanel').contains(launch)).toBe(false);
  expect(start).not.toHaveBeenCalled();
 });

 it('keeps the shuffle editable after an invalid seed and launches with the corrected setup', () => {
  const start = vi.fn();
  render(<CampaignSetup onStart={start} onCancel={() => {}}/>);
  ready();
  fireEvent.click(screen.getByRole('tab', { name: 'Shuffle' }));
  const seed = screen.getByLabelText('Game seed');
  fireEvent.change(seed, { target: { value: '0' } });
  expect(seed.getAttribute('aria-invalid')).toBe('true');
  const launch = screen.getByRole('button', { name: /^Begin campaign/ }) as HTMLButtonElement;
  expect(launch.disabled).toBe(true);
  fireEvent.change(seed, { target: { value: '42' } });
  expect(seed.getAttribute('aria-invalid')).toBe('false');
  expect(launch.disabled).toBe(false);
  fireEvent.click(launch);
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ seed: 42, roster: DEFAULT_SETUP.roster }), DEFAULT_SETUP.roster[0], true);
 });

 it('preserves a drafted hero when revisiting the same table size', () => {
  render(<CampaignSetup onStart={() => {}} onCancel={() => {}}/>);
  next();
  const removed = character(p, DEFAULT_SETUP.roster[0]);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${removed.name}`) }));
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  fireEvent.click(screen.getByRole('button', { name: /^6 characters/ }));
  next();
  expect(screen.getByRole('button', { name: new RegExp(`^${removed.name}`) }).getAttribute('aria-pressed')).toBe('false');
  expect((screen.getByRole('button', { name: /^Continue/ }) as HTMLButtonElement).disabled).toBe(true);
 });

 it('moves focus to the new step heading without changing selected rules', () => {
  const start = vi.fn();
  render(<CampaignSetup onStart={start} onCancel={() => {}}/>);
  fireEvent.click(screen.getByRole('checkbox', { name: /^Deadly PvP/ }));
  next();
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Gather your characters.' }));
  next(); next();
  fireEvent.click(screen.getByRole('button', { name: /^Begin campaign/ }));
  expect(start.mock.calls[0][0].variants).toEqual({ overlordOnly: true, deadlyPvp: true });
 });
});
