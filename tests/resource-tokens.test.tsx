// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ResourceBar } from '../src/components';

afterEach(cleanup);

const tokens = (container: HTMLElement) => ({
 held: container.querySelectorAll('.resource-tokens > i.held').length,
 spent: container.querySelectorAll('.resource-tokens > i.spent').length,
 row: container.querySelector('.resource-tokens')!,
});

describe('health and energy as tokens', () => {
 it('lays one token for each point held and an empty place for each point missing', () => {
  const { container } = render(<ResourceBar type="health" value={5} max={7} />), t = tokens(container);
  expect(t.held).toBe(5);
  expect(t.spent).toBe(2);
  expect(container.querySelector('.resource.health .resource-heading b')!.textContent).toBe('5 / 7');
 });

 it('keeps the exact number as the readable value: the tokens are decoration', () => {
  const { container } = render(<ResourceBar type="energy" value={3} max={4} />), t = tokens(container);
  expect(t.row.getAttribute('aria-hidden')).toBe('true');
  expect(container.querySelector('.resource.energy .resource-heading')!.textContent).toBe('Energy3 / 4');
 });

 it('shows only empty places when nothing is left', () => {
  const t = tokens(render(<ResourceBar type="energy" value={0} max={6} />).container);
  expect([t.held, t.spent]).toEqual([0, 6]);
 });

 it('never hides points above capacity', () => {
  const t = tokens(render(<ResourceBar type="health" value={9} max={7} />).container);
  expect([t.held, t.spent]).toEqual([9, 0]);
 });

 it('uses smaller tokens once there are more than twelve places', () => {
  const twelve = tokens(render(<ResourceBar type="health" value={12} max={12} />).container), fourteen = tokens(render(<ResourceBar type="health" value={12} max={14} />).container);
  expect(twelve.row.classList.contains('many')).toBe(false);
  expect(fourteen.row.classList.contains('many')).toBe(true);
  expect([fourteen.held, fourteen.spent]).toEqual([12, 2]);
 });

 it('redraws when the value changes', () => {
  const { container, rerender } = render(<ResourceBar type="health" value={4} max={5} />);
  rerender(<ResourceBar type="health" value={2} max={5} />);
  const t = tokens(container);
  expect([t.held, t.spent]).toEqual([2, 3]);
 });
});
