// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import CampaignMap from '../src/campaign/Map';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { BOARD, LEGACY_BOARD, pointInRegion, walkingLine, type Board } from '../src/data/board-geometry';
import { contentFor, hero, RULES_REVISION } from '../src/rules/common';
import { apply, createGame, validatePack } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { contentHash, importSession, newSession } from '../src/rules/session';
import { view } from '../src/rules/view';
import { decide } from '../src/ai/planner';
import type { Command, State } from '../src/rules/model';

afterEach(cleanup);
const name = (id: string) => p.regions.find(r => r.id === id)!.name;
const touches = (board: Board, a: string, b: string) => board.neighbors[a].includes(b) && board.neighbors[b].includes(a);
/** Checked against two photographs of the printed board at 6–9× on 12. 11. 2026 (docs/MAP-AUDIT-2026-11-12.md). */
const SEPARATED: [string, string][] = [['alterac', 'corrahn'], ['north-tide', 'fenris'], ['deep-elem', 'dalaran'], ['gahrron', 'marris'], ['fungal', 'infectis'], ['uplands', 'sohrans']];
const JOINED: [string, string][] = [['shining', 'deep-elem'], ['ambermill', 'dalaran'], ['ambermill', 'fenris']];
const game = (rules: number, place: Record<string, string> = {}) => {
 const s = createGame(p, { ...DEFAULT_SETUP, variants: { ...DEFAULT_SETUP.variants, rules } });
 // These tests are about borders: no creature stands in the way (a blue one would force a Challenge before any journey).
 if (Object.keys(place).length) s.enemies = [];
 for (const [id, at] of Object.entries(place)) hero(s, id).location = at;
 return s;
};
const walks = (s: State, id: string) => new Set(legalActions(p, s).flatMap(c => c.type === 'travel' && c.hero === id && c.path.length === 1 && !c.power ? [c.path[0]] : []));
const WARRIOR = 'grumbaz-crowsblood';

describe('the board of new campaigns', () => {
 it.each(SEPARATED)('keeps %s and %s apart, as the black border on the printed board does', (a, b) => {
  expect(touches(BOARD, a, b), `${name(a)} – ${name(b)}`).toBe(false);
  expect(touches(LEGACY_BOARD, a, b)).toBe(true);
 });
 it.each(JOINED)('joins %s and %s, which share a plain border on the printed board', (a, b) => {
  expect(touches(BOARD, a, b), `${name(a)} – ${name(b)}`).toBe(true);
  expect(touches(LEGACY_BOARD, a, b)).toBe(false);
 });
 it('changes nothing else', () => {
  const pairs = (board: Board) => new Set(Object.entries(board.neighbors).flatMap(([id, list]) => list.filter(n => id < n).map(n => `${id}–${n}`)));
  const now = pairs(BOARD), before = pairs(LEGACY_BOARD), key = ([a, b]: [string, string]) => a < b ? `${a}–${b}` : `${b}–${a}`;
  expect([...before].filter(edge => !now.has(edge)).sort()).toEqual(SEPARATED.map(key).sort());
  expect([...now].filter(edge => !before.has(edge)).sort()).toEqual(JOINED.map(key).sort());
  expect([before.size, now.size]).toEqual([118, 115]);
 });
 it.each([['corrected', BOARD], ['first tracing', LEGACY_BOARD]] as const)('is one connected board of 67 regions with every centre inside its border (%s)', (_label, board) => {
  expect(board.shapes).toHaveLength(67);
  for (const shape of board.shapes) expect(pointInRegion(shape.center, shape.points), shape.id).toBe(true);
  const seen = new Set(['brill']), queue = ['brill'];
  while (queue.length) for (const next of board.neighbors[queue.shift()!]) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  expect(seen.size).toBe(67);
  for (const [id, list] of Object.entries(board.neighbors)) for (const n of list) expect(board.neighbors[n], `${n} → ${id}`).toContain(id);
 });
 it('leaves the Ruins of Alterac and Fungal Vale with the single way in that the printed board gives them', () => {
  expect(BOARD.neighbors.alterac).toEqual(['sohrans']);
  expect(BOARD.neighbors.fungal).toEqual(['crown']);
  expect(BOARD.neighbors.uplands.sort()).toEqual(['chillwind', 'fenris']);
  // The Western and Eastern Plaguelands meet in one place only.
  const zone = (id: string) => p.regions.find(r => r.id === id)!.zone;
  const crossings = Object.entries(BOARD.neighbors).flatMap(([id, list]) => list.filter(n => zone(id) === 'Western Plaguelands' && zone(n) === 'Eastern Plaguelands').map(n => `${id}–${n}`));
  expect(crossings).toEqual(['weeping–marris']);
 });
 it('draws a walking line for every connection, inside the two regions it joins', () => {
  for (const [a, b] of JOINED) { const line = walkingLine(a, b); expect(line.length, `${a}–${b}`).toBeGreaterThanOrEqual(3); }
  for (const [a, b] of SEPARATED) expect(walkingLine(a, b)).toEqual([]);
  expect(walkingLine('alterac', 'corrahn', LEGACY_BOARD).length).toBeGreaterThanOrEqual(3);
 });
 it('is the map of the pack, with the first tracing kept for earlier campaigns', () => {
  expect(validatePack(p)).toEqual([]);
  expect(p.regions.find(r => r.id === 'alterac')!.neighbors).toEqual(['sohrans']);
  expect(p.earlierMaps).toHaveLength(1);
  expect(p.earlierMaps![0].before).toBe(4);
  expect(p.earlierMaps![0].regions.find(r => r.id === 'alterac')!.neighbors.sort()).toEqual(['corrahn', 'sohrans']);
  // Only the borders differ: names, zones, towns, flight paths and graveyards are the same on both.
  const plain = (list: typeof p.regions) => list.map(({ neighbors: _n, ...rest }) => rest);
  expect(plain(p.earlierMaps![0].regions)).toEqual(plain(p.regions));
 });
});

describe('which map a campaign is played on', () => {
 it('gives a new campaign the corrected board and an earlier one the board it began on', () => {
  expect(RULES_REVISION).toBeGreaterThanOrEqual(4);
  expect(contentFor(p, game(RULES_REVISION))).toBe(p);
  for (const rules of [1, 2, 3]) expect(contentFor(p, game(rules)).regions).toBe(p.earlierMaps![0].regions);
  expect(contentFor(p, { variants: {} }).regions).toBe(p.earlierMaps![0].regions);
  expect(contentFor(p, game(3))).toBe(contentFor(p, game(2)));
  expect(contentFor(p, game(3)).id).toBe(p.id);
 });
 it.each(SEPARATED)('lets only an earlier campaign walk from %s to %s', (a, b) => {
  expect(walks(game(4, { [WARRIOR]: a }), WARRIOR).has(b)).toBe(false);
  expect(walks(game(3, { [WARRIOR]: a }), WARRIOR).has(b)).toBe(true);
 });
 it.each(JOINED)('lets only a new campaign walk from %s to %s', (a, b) => {
  expect(walks(game(4, { [WARRIOR]: a }), WARRIOR).has(b)).toBe(true);
  expect(walks(game(3, { [WARRIOR]: a }), WARRIOR).has(b)).toBe(false);
 });
 it('refuses in a new campaign the journey an earlier campaign may still make', () => {
  const journey: Command = { type: 'travel', hero: WARRIOR, path: ['alterac'] };
  expect(hero(apply(p, game(3, { [WARRIOR]: 'corrahn' }), journey), WARRIOR).location).toBe('alterac');
  expect(() => apply(p, game(4, { [WARRIOR]: 'corrahn' }), journey)).toThrow();
 });
 it('plans a bot’s way on the campaign’s own map', () => {
  for (const rules of [3, 4]) {
   const s = game(rules, { [WARRIOR]: 'corrahn' }), legal = legalActions(p, s).filter(c => 'hero' in c && c.hero === WARRIOR);
   const choice = decide(p, view(s, [WARRIOR]), legal, 'balanced');
   expect(choice, `rules ${rules}`).toBeDefined();
   expect(() => apply(p, s, choice!.command)).not.toThrow();
  }
 });
});

describe('campaigns saved before the correction', () => {
 const BEFORE = 'c3affbac';
 const saved = (rules: number, commands: Command[], hash = BEFORE) => JSON.stringify({ ...newSession(p, { ...DEFAULT_SETUP, variants: { ...DEFAULT_SETUP.variants, rules } }), contentHash: hash, commands });
 it('still load, replay on their own map and are saved again with the present fingerprint', () => {
  // Walk the Mage from Brill to the Undercity and on to Fenris Isle, then try the lake shore of North Tide's Hollow.
  const loaded = importSession(p, saved(3, [{ type: 'travel', hero: 'sofeea-icecall', path: ['undercity', 'fenris'] }, { type: 'travel', hero: 'sofeea-icecall', path: ['north-tide'] }]));
  expect(hero(loaded.state, 'sofeea-icecall').location).toBe('north-tide');
  expect(loaded.state.variants?.rules).toBe(3);
  expect(loaded.session.contentHash).toBe(contentHash(p));
  expect(contentHash(p)).not.toBe(BEFORE);
  // Loaded again from what was saved, it is the same campaign.
  expect(importSession(p, JSON.stringify(loaded.session)).state).toEqual(loaded.state);
 });
 it('do not let a campaign under the present rules use the old fingerprint or the old borders', () => {
  expect(() => importSession(p, saved(RULES_REVISION, []))).toThrow(/different version/);
  expect(() => importSession(p, saved(RULES_REVISION, [{ type: 'travel', hero: 'sofeea-icecall', path: ['undercity', 'fenris'] }, { type: 'travel', hero: 'sofeea-icecall', path: ['north-tide'] }], contentHash(p)))).toThrow();
  expect(() => importSession(p, saved(3, [], 'deadbeef'))).toThrow(/different version/);
 });
});

describe('the map on screen', () => {
 const draw = (rules: number) => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const s = game(rules), r = render(<CampaignMap focused={false} onToggleFocus={() => {}} state={view(s)} selected="brill" heroId={WARRIOR} legal={legalActions(p, s)} onSelect={() => {}} onMove={() => {}} />);
  const borders = [...r.container.querySelectorAll('[data-border]')].map(node => node.getAttribute('data-border'));
  const outline = (id: string) => r.container.querySelector(`polygon.map-field[data-region="${id}"]`)!.getAttribute('points');
  return { passable: borders.filter(kind => kind === 'passable').length, impassable: borders.filter(kind => kind === 'impassable').length, deepElem: outline('deep-elem'), brill: outline('brill') };
 };
 it('draws the corrected borders for a new campaign and the earlier ones for an earlier campaign', () => {
  const now = draw(RULES_REVISION); cleanup(); const before = draw(3);
  const count = (board: Board, shared: boolean) => board.borders.filter(b => (b.regions.length === 2) === shared).length;
  expect([now.passable, now.impassable]).toEqual([count(BOARD, true), count(BOARD, false)]);
  expect([before.passable, before.impassable]).toEqual([count(LEGACY_BOARD, true), count(LEGACY_BOARD, false)]);
  expect(now.deepElem).not.toBe(before.deepElem);
  expect(now.brill).toBe(before.brill);
  vi.unstubAllGlobals();
 });
});
