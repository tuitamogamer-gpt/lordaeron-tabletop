// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { MAX_SESSION_SIZE, newSession } from '../src/rules/session';
import { BOTS_KEY, loadBots, PREVIOUS_SAVE_KEY, RECOVERY_SAVE_KEY, SAVE_KEY } from '../src/campaign/saves';

const saved = (seed = 2005) => JSON.stringify(newSession(p, { ...DEFAULT_SETUP, seed }));
const settings = () => fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
const launch = () => {
 for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole('button', { name: /^Continue/ }));
 fireEvent.click(screen.getByRole('button', { name: /^Begin campaign/ }));
};
async function upload(container: HTMLElement, text: string, size = text.length) {
 const read = vi.fn().mockResolvedValue(text);
 await act(async () => { fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [{ size, text: read }] } }); });
 return read;
}

beforeEach(() => {
 localStorage.clear();
 window.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
 vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
 vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => 'blob:backup'), revokeObjectURL: vi.fn() }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('campaign save recovery', () => {
 it('cannot start or export a placeholder game after dismissing setup', () => {
  render(<Campaign/>);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  const management = screen.getByRole('button', { name: 'Management' });
  expect(management.hasAttribute('disabled')).toBe(true);
  fireEvent.click(management);
  expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  expect(screen.queryByRole('region', { name: 'Map of Lordaeron' })).toBeNull();
  settings();
  expect(screen.getByRole('button', { name: 'Export game' }).hasAttribute('disabled')).toBe(true);
 });

 it('preserves an unreadable save in one recovery slot across StrictMode and reloads', () => {
  const broken = '{"format":"lordaeron-rules-session",';
  localStorage.setItem(SAVE_KEY, broken);
  const first = render(<StrictMode><Campaign/></StrictMode>);
  expect(screen.getByRole('alert').textContent).toContain('saved game could not be opened');
  expect(localStorage.getItem(SAVE_KEY)).toBe(broken);
  expect(localStorage.getItem(RECOVERY_SAVE_KEY)).toBe(broken);
  first.unmount(); render(<StrictMode><Campaign/></StrictMode>);
  expect(Object.keys(localStorage).filter(key => key.startsWith(RECOVERY_SAVE_KEY))).toEqual([RECOVERY_SAVE_KEY]);
  fireEvent.click(screen.getByRole('button', { name: 'Open save recovery' }));
  fireEvent.click(screen.getByRole('button', { name: 'Download recovery file' }));
  expect((screen.getByRole('textbox', { name: 'Game backup' }) as HTMLTextAreaElement).value).toBe(broken);
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
 });

 it('makes earlier timestamped recovery files available without deleting them', () => {
  localStorage.setItem(SAVE_KEY, saved());
  localStorage.setItem(`${RECOVERY_SAVE_KEY}-100`, 'older');
  localStorage.setItem(`${RECOVERY_SAVE_KEY}-200`, 'latest');
  render(<Campaign/>); settings();
  fireEvent.click(screen.getByRole('button', { name: 'Download recovery file' }));
  expect((screen.getByRole('textbox', { name: 'Game backup' }) as HTMLTextAreaElement).value).toBe('latest');
  expect(localStorage.getItem(`${RECOVERY_SAVE_KEY}-100`)).toBe('older');
 });

 it('keeps the original autosave if storage cannot preserve its recovery copy', () => {
  const broken = '{broken'; localStorage.setItem(SAVE_KEY, broken);
  const setItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
   if (key === RECOVERY_SAVE_KEY) throw new DOMException('Storage full', 'QuotaExceededError');
   return setItem.call(this, key, value);
  });
  render(<Campaign/>); launch();
  expect(localStorage.getItem(SAVE_KEY)).toBe(broken);
  expect(screen.getByRole('button', { name: 'SAVE UNAVAILABLE' })).toBeTruthy();
  settings();
  expect(screen.getByText(/Autosave is unavailable. Export your game before closing/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Export game' }));
  expect(JSON.parse((screen.getByRole('textbox', { name: 'Game backup' }) as HTMLTextAreaElement).value).format).toBe('lordaeron-rules-session');
 });

 it('backs up an imported-over campaign, returns to the board and can restore it', async () => {
  const original = saved(71), replacement = saved(99); localStorage.setItem(SAVE_KEY, original);
  const { container } = render(<Campaign/>);
  fireEvent.click(screen.getByRole('button', { name: 'Rules' })); settings();
  fireEvent.click(screen.getByRole('button', { name: 'Export game' }));
  await upload(container, replacement);
  expect(localStorage.getItem(SAVE_KEY)).toBe(replacement);
  expect(localStorage.getItem(PREVIOUS_SAVE_KEY)).toBe(original);
  expect(screen.getByRole('region', { name: 'Map of Lordaeron' })).toBeTruthy();
  expect(localStorage.getItem(BOTS_KEY)).toBe('[]');
  settings();
  expect(screen.queryByRole('textbox', { name: 'Game backup' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Restore previous campaign' }));
  expect(localStorage.getItem(SAVE_KEY)).toBe(original);
  expect(localStorage.getItem(PREVIOUS_SAVE_KEY)).toBe(replacement);
 });

 it.each(['{invalid', 'null', '[]', '42'])('rejects %s without changing the current campaign or its backup', async text => {
  const original = saved(); localStorage.setItem(SAVE_KEY, original); localStorage.setItem(PREVIOUS_SAVE_KEY, saved(17));
  const { container } = render(<Campaign/>); settings();
  await upload(container, text);
  expect(localStorage.getItem(SAVE_KEY)).toBe(original);
  expect(localStorage.getItem(PREVIOUS_SAVE_KEY)).toBe(saved(17));
  expect(screen.getByRole('dialog', { name: 'Your game' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Import game' }).hasAttribute('disabled')).toBe(false);
 });

 it('rejects an oversized file before reading it', async () => {
  const original = saved(); localStorage.setItem(SAVE_KEY, original);
  const { container } = render(<Campaign/>); settings();
  const read = await upload(container, original, MAX_SESSION_SIZE + 1);
  expect(read).not.toHaveBeenCalled();
  expect(screen.getByText(/file is too large/)).toBeTruthy();
  expect(localStorage.getItem(SAVE_KEY)).toBe(original);
 });

 it('discards a late file read after a new campaign has been started', async () => {
  localStorage.setItem(SAVE_KEY, saved(99));
  const { container } = render(<Campaign/>); settings();
  let finish!: (value: string) => void;
  const text = new Promise<string>(resolve => { finish = resolve; });
  fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [{ size: 100, text: () => text }] } });
  expect(screen.getByRole('button', { name: 'Verifying game…' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'New campaign' })); launch();
  const newGame = localStorage.getItem(SAVE_KEY);
  await act(async () => { finish(saved(71)); });
  expect(localStorage.getItem(SAVE_KEY)).toBe(newGame);
  expect(screen.queryByText(/Game verified by replaying/)).toBeNull();
 });

 it('uses the restored roster for bot defaults and filters duplicate or unknown seats', () => {
  const roster = ['dongon-swiftblade', 'wennu-bloodsinger', 'shailara-whitherblade', 'artumnis-moondream'];
  expect(loadBots(roster)).toEqual(roster.slice(1));
  localStorage.setItem(BOTS_KEY, JSON.stringify([roster[0], roster[0], 'missing', null, 42]));
  expect(loadBots(roster)).toEqual([roster[0]]);
  localStorage.setItem(BOTS_KEY, '[]'); expect(loadBots(roster)).toEqual([]);
 });
});
