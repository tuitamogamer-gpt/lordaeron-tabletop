// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CampaignMap from '../src/campaign/Map';
import { questMarkers } from '../src/campaign/map-state';
import { creatureStacks } from '../src/campaign/MapTokens';
import { boardTokenPositions, clearance, FIGURE_MARGIN, HOLD, TAG, WEIGHTS } from '../src/campaign/token-layout';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { BOARD } from '../src/data/board-geometry';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { State } from '../src/rules/model';
import { view } from '../src/rules/view';

/**
 * Where a thing stands (19. 11. 2026). The request: "the enemy's tokens do not show which location they are on. I come to a
 * location that seems to hold the quest's creature, and it does not. It must be clear, and when I hover over a token I must
 * see which location it is on, so that I cannot be wrong."
 */
const CREATURE = 17, name = (id: string) => p.regions.find(r => r.id === id)!.name;
beforeEach(() => {
 vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
 Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
 Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
 HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600, width: 900, height: 600, toJSON: () => ({}) });
 HTMLElement.prototype.scrollIntoView = vi.fn(); HTMLElement.prototype.setPointerCapture = vi.fn(); HTMLElement.prototype.hasPointerCapture = () => false;
 vi.stubGlobal('PointerEvent', MouseEvent);
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

/** Every creature counter of sixty campaigns, with how far its centre is inside its region's border. */
function creatures(crowded: boolean) {
 const out: { key: string; clear: number }[] = [];
 for (let seed = 1; seed <= 60; seed++) {
  const s = createGame(p, { ...DEFAULT_SETUP, seed });
  // In the middle of a campaign the characters stand beside the creatures: that is where a region is fullest.
  if (crowded) { const held = [...new Set(s.enemies.map(e => e.region))]; s.heroes.forEach((h, i) => { h.location = held[(seed * 7 + i * 3) % held.length]; }); }
  const at = boardTokenPositions(p, s, questMarkers(p, view(s)));
  for (const [key, point] of Object.entries(at)) if (key.startsWith('c:')) out.push({ key, clear: clearance(BOARD.byId[key.split(':')[1]], point) });
 }
 return out;
}

describe('a creature’s counter', () => {
 it('stands inside its own region: at the start of a campaign hardly one reaches over the border', () => {
  const all = creatures(false), over = all.filter(c => c.clear < CREATURE);
  expect(all.length).toBeGreaterThan(900);
  // Measured on the layout before: 239 of 997 (24%) reached over the border, the worst with its centre 7 units inside.
  expect(over.length / all.length).toBeLessThan(0.04);
  for (const c of all) expect(c.clear, c.key).toBeGreaterThan(0);
 });

 it('stays inside when characters stand in the region too', () => {
  const all = creatures(true), over = all.filter(c => c.clear < CREATURE);
  // Before: 377 of 997 (38%).
  expect(over.length / all.length).toBeLessThan(0.08);
 });

 it('has the room in every region: none is narrower than a creature', () => {
  for (const r of p.regions) {
   const shape = BOARD.byId[r.id], xs = shape.points.map(v => v[0]), ys = shape.points.map(v => v[1]); let deepest = 0;
   for (let x = Math.min(...xs); x <= Math.max(...xs); x += 3) for (let y = Math.min(...ys); y <= Math.max(...ys); y += 3) deepest = Math.max(deepest, clearance(shape, [x, y]));
   expect(deepest, r.name).toBeGreaterThanOrEqual(CREATURE + 4);
  }
 });

 it('keeps inside before it keeps off the name, and off another counter before anything', () => {
  expect(WEIGHTS.border * HOLD.figure).toBeGreaterThan(WEIGHTS.label);
  expect(WEIGHTS.overlap).toBeGreaterThanOrEqual(WEIGHTS.border * HOLD.figure);
  expect(WEIGHTS.mark).toBeGreaterThan(WEIGHTS.margin);
  expect(HOLD.figure).toBeGreaterThan(HOLD.mark);
  expect(FIGURE_MARGIN).toBeGreaterThan(0);
 });
});

describe('a quest’s marker', () => {
 it('is a tag on the counter of the creatures it is about, inside the same region', () => {
  let tags = 0;
  for (const seed of [2005, 7, 71, 99, 31]) {
   const s = createGame(p, { ...DEFAULT_SETUP, seed }), v = view(s), at = boardTokenPositions(p, v, questMarkers(p, v));
   for (const m of questMarkers(p, v)) {
    const tag = at[`q:${m.region}:${m.quest.id}`];
    const own = creatureStacks(s.enemies.filter(e => e.region === m.region)).find(stack => stack.color !== 'blue' && s.enemies.some(e => e.region === m.region && e.quest === m.quest.id && e.creature === stack.creature && e.color === stack.color))!;
    const counter = at[`c:${m.region}:${own.creature}:${own.color}`];
    expect(tag, `${m.label} in ${name(m.region)}`).toBeDefined();
    // It touches its creature's counter: nobody has to guess which creature the marker belongs to.
    expect(Math.hypot(tag[0] - counter[0], tag[1] - counter[1])).toBeLessThanOrEqual(CREATURE + TAG.w / 2);
    expect(clearance(BOARD.byId[m.region], tag), `${m.label} in ${name(m.region)}`).toBeGreaterThan(0);
    tags++;
   }
  }
  expect(tags).toBeGreaterThan(40);
  expect(TAG.w).toBeLessThan(48); expect(TAG.h).toBeLessThan(38);
 });
});

describe('pointing at something on the map', () => {
 const game = () => { const s = createGame(p, DEFAULT_SETUP); return s; };
 const show = (s: State, focused = false) => render(<CampaignMap state={view(s)} heroId={s.heroes[0].id} selected={s.heroes[0].location} legal={legalActions(p, s)} focused={focused} onToggleFocus={() => {}} onSelect={() => {}} onMove={() => {}} />);
 const lit = (container: HTMLElement) => container.querySelector('.map-pointed .pointed-field');
 const fieldOf = (container: HTMLElement, id: string) => container.querySelector(`.map-field[data-region="${id}"]`)!;

 it('a creature says where it stands, and its whole region is lit with its name on a plate', () => {
  const s = game(), stack = s.enemies.find(e => e.color !== 'blue' && e.quest)!, { container } = show(s);
  const counter = [...container.querySelectorAll('.portrait-map-token.creature')].find(g => g.getAttribute('aria-label')!.endsWith(name(stack.region)))!;
  expect(lit(container)).toBeNull();
  fireEvent.pointerEnter(counter);
  const tip = screen.getByRole('tooltip');
  expect(tip.querySelector('.token-where')!.textContent).toBe(`Stands in ${name(stack.region)}`);
  // The lit shape is that region's own outline.
  expect(lit(container)!.getAttribute('points')).toBe(fieldOf(container, stack.region).getAttribute('points'));
  expect(container.querySelector('.pointed-name text')!.textContent).toBe(name(stack.region));
  // Every creature counter of the region is ringed, and no other.
  expect(container.querySelectorAll('.map-pointed-pieces > circle')).toHaveLength(creatureStacks(s.enemies.filter(e => e.region === stack.region)).length);
  fireEvent.pointerLeave(counter);
  expect(lit(container)).toBeNull(); expect(screen.queryByRole('tooltip')).toBeNull();
 });

 it('a quest’s tag and a character say the same of themselves', () => {
  const s = game(), v = view(s), m = questMarkers(p, v)[0], { container } = show(s);
  fireEvent.pointerEnter(screen.getByRole('button', { name: `${m.label} · ${m.quest.name} · ${m.remaining} objectives · ${name(m.region)}` }));
  expect(screen.getByRole('tooltip').querySelector('.token-where')!.textContent).toBe(`In ${name(m.region)}`);
  expect(lit(container)!.getAttribute('points')).toBe(fieldOf(container, m.region).getAttribute('points'));
  const hero = container.querySelector('.portrait-map-token.hero')!;
  fireEvent.pointerEnter(hero);
  expect(screen.getByRole('tooltip').querySelector('.token-where')!.textContent).toBe(`Stands in ${name(s.heroes[0].location)}`);
  expect(lit(container)!.getAttribute('points')).toBe(fieldOf(container, s.heroes[0].location).getAttribute('points'));
 });

 it('a region says exactly what stands in it, and says so when nothing does', () => {
  const s = game(), full = s.enemies.find(e => e.color !== 'blue' && e.quest)!.region, empty = p.regions.find(r => !s.enemies.some(e => e.region === r.id) && !s.heroes.some(h => h.location === r.id) && s.overlord.region !== r.id && BOARD.byId[r.id])!, { container } = show(s);
  fireEvent.pointerEnter(fieldOf(container, full), { pointerType: 'mouse' });
  let tip = screen.getByRole('tooltip');
  expect(tip.querySelector('strong')!.textContent).toBe(name(full));
  expect(tip.textContent).toMatch(/stands? here:/);
  for (const stack of creatureStacks(s.enemies.filter(e => e.region === full))) expect(tip.textContent).toContain(`${stack.count} × ${p.creatures.find(c => c.id === stack.creature)!.name} · ${stack.color}`);
  expect(tip.className).toContain('brief');
  expect(lit(container)!.getAttribute('points')).toBe(fieldOf(container, full).getAttribute('points'));
  fireEvent.pointerLeave(fieldOf(container, full));
  fireEvent.pointerEnter(fieldOf(container, empty.id), { pointerType: 'mouse' });
  tip = screen.getByRole('tooltip');
  expect(tip.querySelector('strong')!.textContent).toBe(empty.name);
  expect(tip.textContent).toContain('No creatures stand here.');
  expect(tip.querySelectorAll('li')).toHaveLength(0);
 });

 it('a single creature carries no count; two or more do', () => {
  const s = game(); s.enemies = [{ id: 'one', creature: 'ghoul', color: 'green', region: 'deathknell' }, { id: 'a', creature: 'gnoll', color: 'green', region: 'brightwater' }, { id: 'b', creature: 'gnoll', color: 'green', region: 'brightwater' }];
  const { container } = show(s), counters = [...container.querySelectorAll('.portrait-map-token.creature')];
  expect(counters).toHaveLength(2);
  const count = (label: string) => counters.find(g => g.getAttribute('aria-label')!.startsWith(label))!.querySelector('.portrait-token-count')?.textContent;
  expect(count('1 × Ghoul')).toBeUndefined();
  expect(count('2 × Gnoll')).toBe('2');
 });
});

describe('the journey in hand', () => {
 it('says what stands where it ends, beside the button that makes it', () => {
  const s = createGame(p, DEFAULT_SETUP), hero = s.heroes[0], legal = legalActions(p, s);
  const reach = legal.filter((c): c is Extract<(typeof legal)[number], { type: 'travel' }> => c.type === 'travel' && c.hero === hero.id && c.path.length > 0).map(c => c.path.at(-1)!);
  const full = reach.find(id => s.enemies.some(e => e.region === id))!, empty = reach.find(id => !s.enemies.some(e => e.region === id))!;
  expect(full).toBeDefined(); expect(empty).toBeDefined();
  const { rerender } = render(<CampaignMap state={view(s)} heroId={hero.id} selected={full} legal={legal} focused onToggleFocus={() => {}} onSelect={() => {}} onMove={() => {}} />);
  const dialog = () => screen.getByRole('dialog', { name: 'Interact with map' });
  const stack = creatureStacks(s.enemies.filter(e => e.region === full))[0], creature = p.creatures.find(c => c.id === stack.creature)!.name;
  expect(dialog().querySelector('.route-arrival')!.textContent).toContain(`In ${name(full)}: ${stack.count} × ${creature} · ${stack.color}`);
  expect([...dialog().querySelectorAll('.stands-chip')].map(c => c.textContent).join()).toContain(`${stack.count} × ${creature}`);
  rerender(<CampaignMap state={view(s)} heroId={hero.id} selected={empty} legal={legal} focused onToggleFocus={() => {}} onSelect={() => {}} onMove={() => {}} />);
  expect(dialog().querySelector('.route-arrival')!.textContent).toBe(`Nothing to fight in ${name(empty)}`);
  expect([...dialog().querySelectorAll('.stands-chip')].map(c => c.textContent)).toEqual(['No creatures stand here']);
 });
});
