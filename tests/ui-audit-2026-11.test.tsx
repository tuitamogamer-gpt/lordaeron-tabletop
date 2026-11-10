// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { Modal } from '../src/components';
import { CardThumbnail } from '../src/campaign/parts';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import * as saves from '../src/campaign/saves';
import { SAVE_KEY } from '../src/campaign/saves';
import { apply, createGame } from '../src/rules/game';
import { importSession, newSession, OWN_SAVE } from '../src/rules/session';
import type { Command } from '../src/rules/model';

const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY)!) as { commands: Command[] };
const start = () => { localStorage.setItem(SAVE_KEY, JSON.stringify(newSession(p, DEFAULT_SETUP))); return render(<Campaign/>); };
const travelInMap = () => {
 fireEvent.keyDown(document.body, { key: '1' });
 const dialog = document.querySelector('dialog.map-fullscreen-dialog[open]')!;
 fireEvent.click(dialog.querySelector('polygon.map-field.reachable')!);
 fireEvent.click(screen.getByRole('button', { name: /Travel here/ }));
 return dialog;
};

beforeEach(() => {
 localStorage.clear();
 window.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
 vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
 vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => 'blob:backup'), revokeObjectURL: vi.fn() }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('interface audit, November 2026', () => {
 it('shows a notice inside the open dialog, where it is not covered by the backdrop', async () => {
  const view = start();
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  const dialog = document.querySelector('dialog.modal[open]')!;
  await act(async () => { fireEvent.change(view.container.querySelector('input[type=file]')!, { target: { files: [{ size: 9, text: vi.fn().mockResolvedValue('not json') }] } }); });
  const notice = document.querySelector('.toast')!;
  expect(notice.getAttribute('role')).toBe('status');
  expect(notice.textContent).toContain('not valid JSON');
  expect(dialog.contains(notice)).toBe(true);
  // With every dialog closed the notice returns to the page.
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(document.querySelector('dialog[open]')).toBeNull();
  expect(view.container.querySelector('.toast')?.textContent).toContain('not valid JSON');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(document.querySelector('.toast')).toBeNull();
 });

 it('undoes a Travel with Ctrl+Z from the fullscreen map that confirmed it', () => {
  start();
  const dialog = travelInMap();
  expect(saved().commands.map(c => c.type)).toEqual(['travel']);
  expect(document.querySelector('dialog.map-fullscreen-dialog[open]')).toBeTruthy();
  fireEvent.keyDown(dialog.querySelector('.campaign-map-scroll')!, { key: 'z', ctrlKey: true });
  expect(saved().commands).toHaveLength(0);
 });

 it('still ignores Ctrl+Z while another dialog is open', () => {
  start();
  const dialog = travelInMap();
  fireEvent.keyDown(dialog.querySelector('.campaign-map-scroll')!, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
  expect(saved().commands).toHaveLength(1);
 });

 it('drops the exported backup text once the game moves on', () => {
  start();
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('button', { name: 'Export game' }));
  expect(screen.getByRole('textbox', { name: 'Game backup' })).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
  const dialog = travelInMap();
  fireEvent.keyDown(dialog.querySelector('.campaign-map-scroll')!, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(screen.queryByRole('textbox', { name: 'Game backup' })).toBeNull();
 });

 it('keeps overview regions out of the tab order until the map is interactive', () => {
  const view = start();
  const overview = [...view.container.querySelectorAll('polygon.map-field')];
  expect(overview).toHaveLength(67);
  expect(overview.every(region => region.getAttribute('tabindex') === '-1')).toBe(true);
  fireEvent.keyDown(document.body, { key: 'f' });
  const interactive = [...document.querySelectorAll('dialog.map-fullscreen-dialog[open] polygon.map-field')];
  expect(interactive).toHaveLength(67);
  expect(interactive.every(region => region.getAttribute('tabindex') === '0')).toBe(true);
 });

 it('keeps the zoom keys working after a toolbar button took focus in the map', () => {
  start();
  fireEvent.keyDown(document.body, { key: 'f' });
  const dialog = document.querySelector('dialog.map-fullscreen-dialog[open]')!, svg = dialog.querySelector('.campaign-map-scroll>svg') as SVGElement;
  Object.defineProperties(dialog.querySelector('.campaign-map-scroll')!, { clientWidth: { value: 1200 }, clientHeight: { value: 800 } });
  const before = svg.style.transform;
  fireEvent.keyDown(dialog.querySelector('.map-toolbar button')!, { key: '+' });
  expect(svg.style.transform).not.toBe(before);
  fireEvent.keyDown(dialog.querySelector('.map-toolbar button')!, { key: '0' });
  expect(svg.style.transform).toContain('scale(1)');
 });

 it('does not reopen a card preview when a closing dialog hands focus back to the card', () => {
  const card = p.cards.find(c => c.kind === 'power')!;
  function Fixture() {
   const [open, setOpen] = useState(false);
   return <>
    <CardThumbnail card={card} onClick={() => setOpen(true)}/>
    {open && <Modal title="Inspector" onClose={() => setOpen(false)}><p>Rules</p></Modal>}
   </>;
  }
  render(<Fixture/>);
  const thumbnail = screen.getByRole('button', { name: /^Inspect/ });
  // Keyboard focus still opens the preview.
  act(() => thumbnail.focus());
  expect(screen.getByRole('tooltip')).toBeTruthy();
  fireEvent.click(thumbnail);
  expect(screen.queryByRole('tooltip')).toBeNull();
  act(() => { (document.activeElement as HTMLElement).blur(); });
  thumbnail.focus(); fireEvent.click(thumbnail);
  // A real dialog moves focus inside itself; closing it hands focus back to the card.
  const close = screen.getByRole('button', { name: 'Close' });
  act(() => close.focus());
  expect(screen.queryByRole('tooltip')).toBeNull();
  fireEvent.click(close);
  expect(document.activeElement).toBe(thumbnail);
  expect(screen.queryByRole('tooltip')).toBeNull();
 });

 it('takes the page behind a pending decision out of reach and puts focus inside it', () => {
  const view = start();
  expect(view.container.querySelector('header.topbar')!.hasAttribute('inert')).toBe(false);
  cleanup();
  // An auction is a pending party decision: the overlay covers the table.
  const state = createGame(p, DEFAULT_SETUP); state.auction = { event: p.events[0].id, item: p.cards.find(c => c.kind === 'item')!.id, bids: {} };
  vi.spyOn(saves, 'loadCampaign').mockReturnValue({ state, session: newSession(p, DEFAULT_SETUP) });
  const pending = render(<Campaign/>);
  const decision = screen.getByRole('dialog');
  expect(pending.container.querySelector('header.topbar')!.hasAttribute('inert')).toBe(true);
  expect(pending.container.querySelector('main.campaign-main')!.hasAttribute('inert')).toBe(true);
  expect(decision.closest('[inert]')).toBeNull();
  expect(decision.contains(document.activeElement)).toBe(true);
  // F cannot open the map over the decision.
  fireEvent.keyDown(document.body, { key: 'f' });
  expect(document.querySelector('dialog.map-fullscreen-dialog[open]')).toBeNull();
 });

 it('names the faction whose turn it is while an event at the start of that turn resolves', () => {
  // The engine keeps the previous faction until the event ends; the marker already stands on the Horde's turn 7.
  const state = createGame(p, DEFAULT_SETUP); state.turn = 7; state.faction = 'alliance'; state.phase = 'event';
  state.eventFlow = { event: p.events[0].id, steps: [], seen: [] } as unknown as NonNullable<typeof state.eventFlow>;
  state.auction = { event: p.events[0].id, item: p.cards.find(c => c.kind === 'item')!.id, bids: {} };
  vi.spyOn(saves, 'loadCampaign').mockReturnValue({ state, session: newSession(p, DEFAULT_SETUP) });
  const view = render(<Campaign/>), turn = view.container.querySelector('.campaign-turn')!;
  expect(turn.textContent).toContain('Horde');
  expect(turn.textContent).not.toContain('Alliance');
  expect(turn.textContent).toContain('7');
 });

 it('loads its own autosave without the limits that apply to imported files', () => {
  const setup = DEFAULT_SETUP; let state = createGame(p, setup); const commands: Command[] = [];
  for (const hero of state.heroes.slice(0, 2)) { const c: Command = { type: 'rest', hero: hero.id, health: 0 }; state = apply(p, state, c); commands.push(c); }
  const text = JSON.stringify({ ...newSession(p, setup), commands });
  expect(() => importSession(p, text, { commands: 1 })).toThrow('Too many commands');
  expect(() => importSession(p, text, { size: 10 })).toThrow('too large');
  expect(importSession(p, text).session.commands).toHaveLength(2);
  expect(importSession(p, text, OWN_SAVE).session.commands).toHaveLength(2);
 });
});
