// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import BaseCatalog from '../src/campaign/BaseCatalog';
import { BASE_PACK as p } from '../src/data/base';

const originalWidth = window.innerWidth;
beforeEach(() => {
 Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
 HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
 HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
});
afterEach(() => {
 cleanup();
 Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
 vi.restoreAllMocks();
});
const collection = (name: string) => within(screen.getByRole('navigation', { name: 'Card collections' })).getByRole('button', { name: new RegExp(`^${name}`) });

describe('one-row reference collections', () => {
 it.each([['Quests', p.quests], ['Events', p.events], ['Heroes', p.characters], ['Bestiary', p.creatures], ['Overlords', p.overlords]] as const)('keeps every %s entry reachable with at most three cards per page', (name, entries) => {
  const result = render(<BaseCatalog inspect={() => {}} />);
  fireEvent.click(collection(name));
  const names: string[] = [];
  const next = screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement;
  do {
   const visible = result.container.querySelectorAll('.catalog-reference-open');
   expect(visible.length).toBeGreaterThan(0);
   expect(visible.length).toBeLessThanOrEqual(3);
   names.push(...[...visible].map(node => node.getAttribute('aria-label')!.replace(/^Inspect /, '')));
   if (next.disabled) break;
   fireEvent.click(next);
  } while (true);
  expect(names.sort()).toEqual(entries.map(entry => entry.name).sort());
 });

 it('opens the selected reference with complete readable rules and restores its opener when closed', () => {
  const inspect = vi.fn(), result = render(<BaseCatalog inspect={inspect} />);
  fireEvent.click(collection('Bestiary'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search the library' }), { target: { value: 'infernal' } });
  const opener = screen.getByRole('button', { name: 'Inspect Infernal' });
  opener.focus();fireEvent.click(opener);
  const dialog = screen.getByRole('dialog', { name: 'Infernal' });
  const face=within(dialog).getByRole('img',{name:/Infernal/});
  expect(face.getAttribute('alt')).toContain('costs 2 health and 2 energy');
  expect(face.getAttribute('alt')).toContain('removes 3 hits from the damage box');
  expect(dialog.querySelector('.catalog-detail-rules, .folio-rules, foreignObject')).toBeNull();
  expect(within(dialog).getByRole('link', { name: 'Original card ↗' }).getAttribute('href')).toBe(p.creatures.find(entry => entry.name === 'Infernal')!.source.url);
  expect(dialog.querySelector('.catalog-detail-art .full-card-face')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(opener);
  expect(result.container.querySelectorAll('.catalog-reference-entry')).toHaveLength(1);
  expect(inspect).not.toHaveBeenCalled();
 });
});

describe('responsive collection paging', () => {
 it('keeps the current part of the collection while narrowing from six to three to two cards', () => {
  const result = render(<BaseCatalog inspect={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  const firstName = result.container.querySelector('.base-card-grid>.card-thumbnail')!.getAttribute('aria-label');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 900 });
  fireEvent(window, new Event('resize'));
  expect(result.container.querySelectorAll('.base-card-grid>.card-thumbnail')).toHaveLength(3);
  expect(screen.getByText('7–9 of 108 cards')).toBeTruthy();
  expect(result.container.querySelector('.base-card-grid>.card-thumbnail')!.getAttribute('aria-label')).toBe(firstName);
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 520 });
  fireEvent(window, new Event('resize'));
  expect(result.container.querySelectorAll('.base-card-grid>.card-thumbnail')).toHaveLength(2);
  expect(screen.getByText('7–8 of 108 cards')).toBeTruthy();
  expect(result.container.querySelector('.base-card-grid>.card-thumbnail')!.getAttribute('aria-label')).toBe(firstName);
 });

 it('starts reference filters on the first page and recovers an empty collection without stale paging', () => {
  render(<BaseCatalog inspect={() => {}} />);
  fireEvent.click(collection('Quests'));
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter the library' }), { target: { value: 'horde' } });
  expect(screen.getByText('1–3 of 40 cards')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search the library' }), { target: { value: 'missing quest' } });
  expect(screen.getByText('No cards found')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Clear search & filters' }));
  expect(screen.getByText('1–3 of 80 cards')).toBeTruthy();
 });
});
