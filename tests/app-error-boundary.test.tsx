// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AppErrorBoundary, { reloadForUpdate, staleChunk } from '../src/campaign/AppErrorBoundary';

afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); localStorage.clear(); });
function Broken({ message }: { message: string }): never { throw new Error(message); }

describe('crash screen', () => {
 it('replaces a blank page with a reload and the autosave download', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<AppErrorBoundary><Broken message="Cannot read properties of undefined"/></AppErrorBoundary>);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'The table could not be drawn' })).toBeTruthy();
  expect(screen.getByText(/saved after every move/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Download the autosave' }));
  expect(screen.getByText('No autosave was found in this browser.')).toBeTruthy();
 });

 it('recognises chunks that an older deployment no longer serves', () => {
  expect(staleChunk(new TypeError('Failed to fetch dynamically imported module: https://x/assets/Combat-abc.js'))).toBe(true);
  expect(staleChunk(new TypeError('Importing a module script failed.'))).toBe(true);
  expect(staleChunk(new Error('Unable to preload CSS for /assets/index.css'))).toBe(true);
  expect(staleChunk(new Error('Cannot read properties of undefined'))).toBe(false);
 });

 it('reloads for an update at most once a minute', () => {
  const reload = vi.fn();
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location);
  expect(reloadForUpdate(1_000_000)).toBe(true);
  expect(reloadForUpdate(1_030_000)).toBe(false);
  expect(reloadForUpdate(1_061_000)).toBe(true);
  expect(reload).toHaveBeenCalledTimes(2);
 });
});
