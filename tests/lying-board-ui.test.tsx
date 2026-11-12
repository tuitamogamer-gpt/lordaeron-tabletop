// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { BOARD, BOARD_VIEW as board } from '../src/data/board-geometry';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import CampaignMap from '../src/campaign/Map';
import { FLAT_RELIEF, lie, LYING_BOX, LYING_RELIEF, outline, sizeAt } from '../src/campaign/lying-board';
import { questMarkers } from '../src/campaign/map-state';
import { boardTokenPositions } from '../src/campaign/token-layout';

/**
 * In the overview the board lies on the table, seen a little from the front (src/campaign/lying-board.ts): every region,
 * border, name and counter is drawn where it is seen. The 3D button returns the flat board, and the fullscreen map is always
 * flat. The flat board must come out exactly as it did before the lying one existed.
 */
const KEY = 'lordaeron-board-raised', WARRIOR = 'grumbaz-crowsblood';
beforeEach(() => {
 localStorage.clear();
 vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
 Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
 Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
 HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600, width: 900, height: 600, toJSON: () => ({}) });
 HTMLElement.prototype.scrollIntoView = vi.fn();
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

const game = () => { const s = createGame(p, DEFAULT_SETUP); s.enemies = [{ id: 'gnoll', creature: 'gnoll', color: 'blue', region: 'brightwater' }]; return s; };
function Table({ state = game() }: { state?: ReturnType<typeof game> }) {
 const [focused, setFocused] = useState(false), [selected, setSelected] = useState('brill');
 return <CampaignMap state={view(state)} heroId={WARRIOR} selected={selected} legal={legalActions(p, state)} focused={focused} onToggleFocus={() => setFocused(v => !v)} onSelect={setSelected} onMove={() => {}} />;
}
const map = () => screen.getByRole('region', { name: 'Map of Lordaeron' });
const drawing = () => screen.getByRole('group', { name: '2D board with 67 bordered regions' });
const field = (id: string) => drawing().querySelector(`polygon.map-field[data-region="${id}"]`)!;
const flatPoints = (id: string) => BOARD.byId[id].points.map(v => v.join(',')).join(' ');
const lyingPoints = (id: string) => BOARD.byId[id].points.map(v => lie(v).join(',')).join(' ');
const numbers = (text: string | null) => (text ?? '').match(/-?\d+(\.\d+)?/g)!.map(Number);
const inside = ([x, y]: number[], polygon: number[][]) => polygon.reduce((within, [ax, ay], i) => {
 const [bx, by] = polygon[(i + 1) % polygon.length];
 return (ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax ? !within : within;
}, false);
const pairs = (points: string | null) => (points ?? '').split(' ').map(pair => pair.split(',').map(Number));
const hero = (name: RegExp) => screen.getByRole('button', { name });

describe('the board lying on the table', () => {
 it('lies in the overview from the start: regions, borders and the frame are drawn where they are seen', () => {
  render(<Table />);
  expect(map().className).toContain('raised');
  expect(screen.getByRole('button', { name: '3D' }).getAttribute('aria-pressed')).toBe('true');
  for (const id of ['brill', 'tyrs', 'purgation', 'stratholme']) expect(field(id).getAttribute('points'), id).toBe(lyingPoints(id));
  const border = BOARD.borders[0], drawn = drawing().querySelector('[data-border]')!.getAttribute('d');
  expect(drawn).toBe(`M${lie(border.a).join(',')} L${lie(border.b).join(',')}`);
  const frame = drawing().querySelector('.board-frame')!;
  expect(frame.tagName).toBe('polygon'); expect(frame.getAttribute('points')).toBe(outline(4).map(v => v.join(',')).join(' '));
  // The camera belongs to the fullscreen map; the lying board has none.
  expect(drawing().getAttribute('style')).toBeNull();
 });
 it('shows the board as an object: terrain painted for this view, an edge, a shadow on the table and light from the far side', () => {
  render(<Table />);
  const terrain = drawing().querySelector('image.board-terrain')!;
  expect(terrain.getAttribute('href')).toBe(LYING_RELIEF);
  expect(['x', 'y', 'width', 'height'].map(name => Number(terrain.getAttribute(name)))).toEqual([LYING_BOX.x, LYING_BOX.y, LYING_BOX.width, LYING_BOX.height]);
  expect(terrain.getAttribute('clip-path')).toBe('url(#board-outline)');
  expect(drawing().querySelector('#board-outline polygon')!.getAttribute('points')).toBe(outline().map(v => v.join(',')).join(' '));
  const [, , nearRight, nearLeft] = outline(), edge = drawing().querySelector('.board-slab .board-edge')!.getAttribute('d')!;
  expect(edge.startsWith(`M${nearLeft} L${nearRight} `)).toBe(true);
  expect(drawing().querySelector('.board-slab .board-cast')).toBeTruthy();
  expect(drawing().querySelector('polygon.board-light')!.getAttribute('fill')).toBe('url(#board-light)');
 });
 it('stands every counter where its place on the flat board is seen, at the size things have there, inside its own region', () => {
  const state = game(); render(<Table state={state} />);
  const places = boardTokenPositions(p, view(state), questMarkers(p, view(state)));
  for (const h of state.heroes) {
   const [x, y] = places[`h:${h.id}`], token = drawing().querySelector(`.portrait-map-token.hero[aria-label^="${p.characters.find(c => c.id === h.id)!.name} "]`)!;
   const [X, Y] = lie([x, Math.max(board.y + 40, y)]), size = sizeAt(Math.max(board.y + 40, y));
   expect(token.getAttribute('transform'), h.id).toBe(`translate(${X},${Y}) scale(${size})`);
   // The glide between regions repeats the same place and size (stage.css).
   expect((token as SVGGElement).style.transform).toBe(`translate(${X}px,${Y}px) scale(${size})`);
   expect(inside([X, Y], pairs(field(h.location).getAttribute('points'))), `${h.id} stands in ${h.location}`).toBe(true);
   expect(token.querySelector('.portrait-token-ground')).toBeTruthy();
  }
  const creature = drawing().querySelector('.portrait-map-token.creature')!, [cx, cy] = places['c:brightwater:gnoll:blue'];
  expect(creature.getAttribute('transform')).toBe(`translate(${lie([cx, cy]).join(',')}) scale(${sizeAt(cy)})`);
  expect(inside(lie([cx, cy]), pairs(field('brightwater').getAttribute('points')))).toBe(true);
  // Far counters are drawn smaller than near ones.
  const sizes = state.heroes.map(h => sizeAt(Math.max(board.y + 40, places[`h:${h.id}`][1])));
  expect(Math.min(...sizes)).toBeLessThan(Math.max(...sizes)); expect(Math.max(...sizes)).toBeLessThan(1);
 });
 it('moves and sizes names as one piece, so that they stay upright and sharp', () => {
  render(<Table />);
  const [x, y] = BOARD.byId.brill.center, name = [...drawing().querySelectorAll('text.field-name')].find(node => node.textContent === 'Brill')!;
  expect(name.getAttribute('transform')).toBe(`translate(${lie([x, y]).join(',')}) scale(${sizeAt(y)})`);
  expect(name.getAttribute('x')).toBeNull(); expect(name.querySelector('tspan')!.getAttribute('x')).toBe('0');
  const zone = [...drawing().querySelectorAll('.map-zone-titles text')].find(node => node.textContent === 'TIRISFAL GLADES')!;
  expect(zone.getAttribute('transform')).toBe(`translate(${lie([439, 176]).join(',')}) scale(${sizeAt(176)})`);
  expect(drawing().querySelector('.map-cartouche')!.getAttribute('transform')).toBe(`translate(${lie([1080, 965]).join(',')}) scale(${sizeAt(965)})`);
 });
});

describe('the flat board', () => {
 it('returns with the 3D button, is remembered, and comes out exactly as it was drawn before', () => {
  const state = game(); render(<Table state={state} />);
  fireEvent.click(screen.getByRole('button', { name: '3D' }));
  expect(map().className).not.toContain('raised'); expect(localStorage.getItem(KEY)).toBe('flat');
  expect(screen.getByRole('button', { name: '3D' }).getAttribute('aria-pressed')).toBe('false');
  for (const id of ['brill', 'tyrs', 'purgation', 'stratholme']) expect(field(id).getAttribute('points'), id).toBe(flatPoints(id));
  const terrain = drawing().querySelector('image.board-terrain')!;
  expect(terrain.getAttribute('href')).toBe(FLAT_RELIEF);
  expect(['x', 'y', 'width', 'height'].map(name => Number(terrain.getAttribute(name)))).toEqual([board.x, board.y, board.width, board.height]);
  expect(terrain.getAttribute('clip-path')).toBeNull();
  const frame = drawing().querySelector('.board-frame')!;
  expect(frame.tagName).toBe('rect'); expect(['x', 'y', 'width', 'height'].map(name => Number(frame.getAttribute(name)))).toEqual([board.x + 4, board.y + 4, board.width - 8, board.height - 8]);
  for (const gone of ['.board-slab', '.board-light', '#board-outline', '#board-light']) expect(drawing().querySelector(gone), gone).toBeNull();
  const places = boardTokenPositions(p, view(state), questMarkers(p, view(state))), [x, y] = places[`h:${WARRIOR}`];
  expect(hero(/^Grumbaz Crowsblood · level 1/).getAttribute('transform')).toBe(`translate(${x},${Math.max(board.y + 40, y)})`);
  const [bx, by] = BOARD.byId.brill.center, name = [...drawing().querySelectorAll('text.field-name')].find(node => node.textContent === 'Brill')!;
  expect([name.getAttribute('x'), name.getAttribute('y'), name.getAttribute('transform')]).toEqual([String(bx), String(by), null]);
  expect(drawing().querySelector('.map-cartouche')!.getAttribute('transform')).toBe('translate(1080,965)');
  expect(numbers(drawing().querySelector('.board-folds line')!.getAttribute('x1'))).toEqual([board.x + board.width / 3]);
  // The flat overview keeps its fixed camera: the wheel does not move it.
  expect(drawing().getAttribute('style')).toContain('translate(0px,0px) scale(1)');
  fireEvent.wheel(screen.getByRole('region', { name: 'Entire board overview' }), { deltaX: 100, deltaY: 100 });
  expect(drawing().getAttribute('style')).toContain('translate(0px,0px) scale(1)');
  // And the board lies down again on request.
  fireEvent.click(screen.getByRole('button', { name: '3D' }));
  expect(map().className).toContain('raised'); expect(localStorage.getItem(KEY)).toBe('raised');
  expect(field('brill').getAttribute('points')).toBe(lyingPoints('brill'));
 });
 it('is what a player who chose it finds on return', () => {
  localStorage.setItem(KEY, 'flat'); render(<Table />);
  expect(map().className).not.toContain('raised');
  expect(field('brill').getAttribute('points')).toBe(flatPoints('brill'));
  expect(screen.getByRole('button', { name: '3D' }).getAttribute('aria-pressed')).toBe('false');
 });
 it('is always what the fullscreen map shows, so that panning, zooming and picking a region stay exact', () => {
  render(<Table />);
  fireEvent.click(screen.getByRole('button', { name: /Interact with map/ }));
  expect(map().className).not.toContain('raised'); expect(screen.queryByRole('button', { name: '3D' })).toBeNull();
  expect(field('brill').getAttribute('points')).toBe(flatPoints('brill'));
  expect(drawing().querySelector('image.board-terrain')!.getAttribute('href')).toBe(FLAT_RELIEF);
  expect(drawing().getAttribute('style')).toContain('scale(');
  expect(hero(/^Grumbaz Crowsblood · level 1/).getAttribute('transform')).not.toContain('scale');
  // Back at the table the board lies again; the choice was never touched.
  fireEvent.click(screen.getByRole('button', { name: /Done interacting/ }));
  expect(map().className).toContain('raised'); expect(localStorage.getItem(KEY)).toBeNull();
 });
});
