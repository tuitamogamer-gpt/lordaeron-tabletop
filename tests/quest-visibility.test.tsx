// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { spawnQuest } from '../src/rules/rewards';
import { view } from '../src/rules/view';
import QuestActivity, { QuestReveal, QuestSetupPreview } from '../src/campaign/QuestReveal';
import QuestLedger from '../src/campaign/QuestLedger';
import { placementTotals, questDrawReceipt, questReceipt } from '../src/campaign/quest-activity';
import { questLabel } from '../src/campaign/map-state';
import { regionName } from '../src/campaign/event-text';

beforeEach(() => {
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('actual quest placement receipts', () => {
 it('explains every seeded setup card and counts actual figures and distinct quest markers', () => {
  const s = createGame(p, DEFAULT_SETUP), receipt = questReceipt(s, 'setup'), totals = placementTotals(receipt);
  expect(receipt.quests).toEqual(s.quests);
  expect(totals.creatures).toBe(s.enemies.length);
  expect(totals.objectives).toBe(s.enemies.filter(e => e.color !== 'blue').length);
  expect(totals.tokens).toBe(new Set(s.enemies.filter(e => e.quest).map(e => `${e.quest}:${e.region}`)).size);
  render(<QuestSetupPreview state={s}/>);
  for (const id of s.quests) expect(screen.getByText(p.quests.find(q => q.id === id)!.name)).toBeTruthy();
  const q = p.quests.find(q => q.id === s.quests[0])!;
  const card = screen.getByText(q.name).closest('details')!;
  expect(card.textContent).toContain(regionName(q.spawns[0].region));
  expect(screen.getByText(/Blue creatures stop travel/)).toBeTruthy();
 });

 it('does not invent independent creatures when their shared supply is exhausted', () => {
  const s = createGame(p, DEFAULT_SETUP); s.quests = []; s.enemies = [];
  const q = p.quests.find(q => q.spawns.some(row => row.color === 'blue'))!;
  for (const creature of new Set(q.spawns.filter(row => row.color === 'blue').map(row => row.creature))) {
   const count = p.creatures.find(c => c.id === creature)!.stock.blue;
   for (let n = 0; n < count; n++) s.enemies.push({ id: `existing:${creature}:${n}`, creature, color: 'blue', region: 'brill' });
  }
  const before = structuredClone(s);
  expect(spawnQuest(p, s, q)).toBe(true); s.revision++;
  const receipt = questDrawReceipt(before, s)!;
  expect(receipt.quests).toEqual([q.id]);
  expect(receipt.placements[q.id].filter(row => row.color === 'blue').every(row => row.placed === 0)).toBe(true);
  expect(placementTotals(receipt).creatures).toBe(s.enemies.length - before.enemies.length);
  render(<QuestReveal receipt={receipt} state={s} onClose={() => {}}/>);
  expect(screen.getAllByText(/supply exhausted/).length).toBeGreaterThan(0);
 });

 it('ignores action-only state changes and reports one replacement card from its live spawn delta', () => {
  const before = createGame(p, DEFAULT_SETUP), action = structuredClone(before);
  action.heroes[0].health--; action.revision++;
  expect(questDrawReceipt(before, action)).toBeUndefined();
  const after = structuredClone(before), q = p.quests.find(q => !before.quests.includes(q.id) && q.faction === 'horde' && q.tier === 'green')!;
  expect(spawnQuest(p, after, q)).toBe(true); after.revision++;
  const receipt = questDrawReceipt(before, after)!;
  expect(receipt.quests).toEqual([q.id]);
  expect(placementTotals(receipt).creatures).toBe(after.enemies.length - before.enemies.length);
 });
});

describe('quest discovery without changing the game', () => {
 it('animates setup, can dismiss and reopen it, and locates the selected objective', () => {
  vi.useFakeTimers();
  const s = createGame(p, DEFAULT_SETUP), original = structuredClone(s), locate = vi.fn(), visibility = vi.fn();
  const r = render(<QuestActivity state={view(s)} autoRevealSetup onLocate={locate} onOpenChange={visibility}/>);
  expect(visibility).toHaveBeenLastCalledWith(true);
  expect(screen.getByRole('dialog', { name: 'Your starting quests are on the map' })).toBeTruthy();
  expect(r.container.querySelector('.quest-reveal')?.className).toContain('stage-0');
  act(() => { vi.advanceTimersByTime(1100); });
  expect(r.container.querySelector('.quest-reveal')?.className).toContain('stage-2');
  fireEvent.click(screen.getByRole('button', { name: 'Begin the first turn' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(visibility).toHaveBeenLastCalledWith(false);
  fireEvent.click(screen.getByRole('button', { name: 'Replay starting quest placement' }));
  const q = p.quests.find(q => q.id === s.quests[0])!;
  fireEvent.click(screen.getAllByRole('button', { name: regionName(q.spawns[0].region) })[0]);
  expect(locate).toHaveBeenCalledWith(q.spawns[0].region, q.id);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(s).toEqual(original);
 }, 15000);

 it('establishes a quiet resumed baseline and queues a live draw while another decision is open', () => {
  const s = createGame(p, DEFAULT_SETUP); s.revision = 5;
  const r = render(<QuestActivity state={view(s)} autoRevealSetup={false} suspended/>);
  expect(screen.queryByRole('dialog')).toBeNull();
  const next = structuredClone(s), q = p.quests.find(q => !s.quests.includes(q.id) && q.faction === 'horde' && q.tier === 'green')!;
  spawnQuest(p, next, q); next.revision++;
  r.rerender(<QuestActivity state={view(next)} autoRevealSetup={false} suspended/>);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('status').textContent).toContain(`${q.name} drawn`);
  r.rerender(<QuestActivity state={view(next)} autoRevealSetup={false}/>);
  expect(screen.getByRole('dialog', { name: 'A new quest enters play' })).toBeTruthy();
  expect(screen.getByRole('button', { name: new RegExp(`${questLabel(p, q.id)}.*${q.name}`) })).toBeTruthy();
 });

 it('shows complete placement immediately when reduced motion is requested', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const s = createGame(p, DEFAULT_SETUP);
  const r = render(<QuestReveal receipt={questReceipt(s, 'setup')} state={s} onClose={() => {}}/>);
  expect(r.container.querySelector('.quest-reveal')?.className).toContain('stage-2');
 });

 it('renders live remaining objectives in the persistent journal', () => {
  const s = createGame(p, DEFAULT_SETUP), q = p.quests.find(q => q.id === s.quests[0])!;
  const enemy = s.enemies.find(e => e.quest === q.id)!;
  s.enemies = s.enemies.filter(e => e.id !== enemy.id);
  const locate = vi.fn();
  render(<QuestLedger state={view(s)} onQuest={locate} onInspect={() => {}}/>);
  expect(screen.getByRole('complementary', { name: 'Active quest journal' })).toBeTruthy();
  const progress = screen.getByRole('progressbar', { name: `${q.name} progress` });
  expect(progress.getAttribute('aria-valuenow')).toBe('1');
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${questLabel(p, q.id)}.*show on map`) }));
  expect(locate).toHaveBeenCalledWith(q.id, expect.any(String));
 });
});
