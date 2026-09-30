// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import RestEditor from '../src/campaign/RestEditor';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { capacity } from '../src/rules/common';
import type { Command } from '../src/rules/model';

afterEach(cleanup);

describe('Rest recovery preview', () => {
 it('previews the selected recovery and curse removal without spending the action', () => {
  const state = createGame(p, DEFAULT_SETUP), hero = state.heroes[0], send = vi.fn();
  hero.health = 1; hero.energy = 0; hero.curse = 2;
  const original = structuredClone(state);
  render(<RestEditor state={state} hero={hero} legal={legalActions(p, state)} send={send} />);
  fireEvent.change(screen.getByRole('slider', { name: 'Health recovery' }), { target: { value: '1' } });
  const preview = within(screen.getByRole('region', { name: 'Recovery preview' }));
  expect(preview.getByText('1 → 2', { exact: false })).toBeTruthy();
  expect(preview.getByText('0 → 1', { exact: false })).toBeTruthy();
  expect(screen.getByText('Removes 2 Curses.')).toBeTruthy();
  expect(state).toEqual(original); expect(send).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Rest · 1 action' }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'rest', hero: hero.id, health: 1 });
 });

 it('includes food in the preview and sends the exact command whose outcome was shown', () => {
  const state = createGame(p, DEFAULT_SETUP), hero = state.heroes[0], send = vi.fn();
  hero.health = 1; hero.energy = 0;
  const food = p.cards.find(c => c.trait === 'Food')!; hero.bag = [food.id];
  render(<RestEditor state={state} hero={hero} legal={legalActions(p, state)} send={send} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Food' }), { target: { value: food.id } });
  expect(screen.getByText(/Food is consumed after recovery/)).toBeTruthy();
  const preview = within(screen.getByRole('region', { name: 'Recovery preview' })), cap = capacity(p, hero);
  expect(preview.getByText(`1 → ${cap.health}`, { exact: false })).toBeTruthy();
  expect(preview.getByText(`0 → ${cap.energy}`, { exact: false })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Rest · 1 action' }));
  const command = send.mock.calls[0][0] as Command;
  const result = apply(p, state, command).heroes[0];
  expect(result.health).toBe(cap.health); expect(result.energy).toBe(cap.energy);
  expect(result.bag).not.toContain(food.id); expect(hero.bag).toContain(food.id);
 });

 it('explains a rest with no recovery and stops submission when the action becomes unavailable', () => {
  const state = createGame(p, DEFAULT_SETUP), hero = state.heroes[0], send = vi.fn();
  const r = render(<RestEditor state={state} hero={hero} legal={legalActions(p, state)} send={send} />);
  expect(screen.getByRole('status').textContent).toContain('It still costs one action.');
  expect(screen.getByRole('slider').hasAttribute('disabled')).toBe(true);
  const next = structuredClone(state); next.heroes[0].actions = 0;
  r.rerender(<RestEditor state={next} hero={next.heroes[0]} legal={legalActions(p, next)} send={send} />);
  expect(screen.getByRole('button', { name: 'Rest · 1 action' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Rest · 1 action' }));
  expect(send).not.toHaveBeenCalled();
 });
});
