// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import BaseCatalog from '../src/campaign/BaseCatalog';
import { BASE_ITEMS, CLASS_CARDS } from '../src/data/base';

afterEach(cleanup);

describe('portrait card library', () => {
 it.each([['Powers', CLASS_CARDS.filter(c => c.kind === 'power')], ['Talents', CLASS_CARDS.filter(c => c.kind === 'talent')], ['Items', BASE_ITEMS]] as const)('keeps every %s card reachable in a bounded page', (tab, cards) => {
  const inspect = vi.fn(), result = render(<BaseCatalog inspect={inspect} />);
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Card collections' })).getByRole('button', { name: new RegExp(`^${tab}`) }));
  const next = screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement;
  do {
   const thumbnails = result.container.querySelectorAll('.base-card-grid>.card-thumbnail');
   expect(thumbnails.length).toBeGreaterThan(0);expect(thumbnails.length).toBeLessThanOrEqual(6);
   for (const thumbnail of thumbnails) fireEvent.click(thumbnail);
   if (next.disabled) break;
   fireEvent.click(next);
  } while (true);
  expect(inspect.mock.calls.map(([id]) => id).sort()).toEqual(cards.map(c => c.id).sort());
  expect(screen.getByText(`${cards.length - 5}–${cards.length} of ${cards.length} cards`)).toBeTruthy();
 });

 it('resets the page after filtering or sorting, inspects the correct card, and recovers from an empty search', () => {
  const inspect = vi.fn(), result = render(<BaseCatalog inspect={inspect} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter the library' }), { target: { value: 'mage' } });
  expect(screen.getByText('1–6 of 12 cards')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort the library' }), { target: { value: 'name' } });
  expect(screen.getByText('1–6 of 12 cards')).toBeTruthy();
  const expected = CLASS_CARDS.filter(c => c.kind === 'power' && c.classId === 'mage').sort((a, b) => a.name.localeCompare(b.name));
  fireEvent.click(result.container.querySelector('.base-card-grid>.card-thumbnail')!);
  expect(inspect).toHaveBeenCalledExactlyOnceWith(expected[0].id);
  fireEvent.change(screen.getByRole('textbox', { name: 'Search the library' }), { target: { value: 'no such ability here' } });
  expect(screen.getByText('No cards found')).toBeTruthy();
  expect(result.container.querySelectorAll('.base-card-grid>.card-thumbnail')).toHaveLength(0);
  expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Clear search & filters' }));
  expect(screen.getByText('1–6 of 108 cards')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled).toBe(true);
 });
});
