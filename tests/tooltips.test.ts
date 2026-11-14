// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installTooltips } from '../src/campaign/tooltips';

/**
 * A control's `title` is shown in the game's own style instead of the browser's system label, and put back afterwards,
 * so the markup and what assistive technology reads stay as they were.
 */
const hover = (fine: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: fine && query.includes('hover: hover'), media: query, addEventListener() {}, removeEventListener() {} }));
const tip = () => document.querySelector<HTMLElement>('.game-tooltip');
const over = (el: Element) => el.dispatchEvent(new Event('pointerover', { bubbles: true }));
let remove = () => {};
beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = '<button id="a" title="Undo the last move"><span id="in">Undo</span></button><button id="b">Plain</button><dialog open><button id="c" title="Close this window">×</button></dialog>'; });
afterEach(() => { remove(); remove = () => {}; vi.useRealTimers(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

describe('the game’s own tooltip', () => {
 it('shows a control’s title a moment after the pointer rests on it, and holds the browser’s own label back meanwhile', () => {
  hover(true); remove = installTooltips();
  const a = document.getElementById('a')!;
  over(document.getElementById('in')!);
  // The title is held back at once, so the system label never appears beside the game's.
  expect(a.hasAttribute('title')).toBe(false);
  expect(tip()).toBeNull();
  vi.advanceTimersByTime(349);
  expect(tip()).toBeNull();
  vi.advanceTimersByTime(1);
  expect(tip()!.textContent).toBe('Undo the last move');
  expect(tip()!.getAttribute('role')).toBe('tooltip');
  // Moving within the same control keeps it up.
  over(a);
  expect(tip()).not.toBeNull();
 });
 it('puts the title back when the pointer leaves, a button is pressed or a key is used', () => {
  hover(true); remove = installTooltips();
  const a = document.getElementById('a')!, b = document.getElementById('b')!;
  over(a); vi.advanceTimersByTime(400);
  over(b);
  expect(tip()).toBeNull();
  expect(a.getAttribute('title')).toBe('Undo the last move');
  for (const event of ['pointerdown', 'keydown']) {
   over(a); vi.advanceTimersByTime(400);
   expect(tip()).not.toBeNull();
   document.dispatchEvent(new Event(event, { bubbles: true }));
   expect(tip()).toBeNull();
   expect(a.getAttribute('title')).toBe('Undo the last move');
  }
  // Left before the moment had passed: nothing is ever shown.
  over(a); vi.advanceTimersByTime(200); over(b); vi.advanceTimersByTime(1000);
  expect(tip()).toBeNull();
 });
 it('keeps a title that was changed while it was held back', () => {
  hover(true); remove = installTooltips();
  const a = document.getElementById('a')!;
  over(a); vi.advanceTimersByTime(400);
  a.setAttribute('title', 'Undo travel');
  over(document.getElementById('b')!);
  expect(a.getAttribute('title')).toBe('Undo travel');
 });
 it('joins an open window, which is drawn above the rest of the page', () => {
  hover(true); remove = installTooltips();
  over(document.getElementById('c')!); vi.advanceTimersByTime(400);
  // Without the top layer of a popover (as here), the tooltip is placed inside the open window.
  expect(tip()!.parentElement).toBe(document.querySelector('dialog'));
  expect(tip()!.textContent).toBe('Close this window');
 });
 it('leaves everything to the browser where nothing can hover, and when it is removed', () => {
  hover(false); remove = installTooltips();
  const a = document.getElementById('a')!;
  over(a); vi.advanceTimersByTime(1000);
  expect(tip()).toBeNull();
  expect(a.getAttribute('title')).toBe('Undo the last move');
  remove();
  hover(true); remove = installTooltips();
  over(a); vi.advanceTimersByTime(400);
  expect(tip()).not.toBeNull();
  remove(); remove = () => {};
  expect(tip()).toBeNull();
  expect(a.getAttribute('title')).toBe('Undo the last move');
  over(a); vi.advanceTimersByTime(1000);
  expect(tip()).toBeNull();
 });
});
