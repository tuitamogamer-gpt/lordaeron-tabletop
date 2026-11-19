// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { BOARD, LEGACY_BOARD, pointInRegion } from '../src/data/board-geometry';
import { character, faction } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { steps } from '../src/rules/movement';
import type { Faction } from '../src/rules/model';
import { view } from '../src/rules/view';
import CampaignMap from '../src/campaign/Map';
import { questMarkers } from '../src/campaign/map-state';
import { flightsFrom, placeNames, SERVICE_BOX, serviceName, serviceRule, servicesOf, serves } from '../src/campaign/map-services';
import { boardTokenPositions, clearance, MARK_ROOM, serviceMarks, takenByServices } from '../src/campaign/token-layout';

/**
 * Whose a town and a flight path are (docs/MAP-OWNERSHIP-2026-11-17.md). The map drew them as one small glyph in one pale
 * colour and nothing named them; the printed board has a key for exactly these marks.
 */
const region = (id: string) => p.regions.find(r => r.id === id)!;
const TOWNS = { brill: 'horde', 'north-tide': 'horde', southshore: 'alliance', aerie: 'alliance', pestilent: 'both' } as const;
const FLIGHTS = { brill: 'horde', 'north-tide': 'horde', caer: 'horde', southshore: 'alliance', sorrow: 'alliance', aerie: 'alliance', pestilent: 'both' } as const;
const GRAVEYARDS = ['olsen', 'andorhal', 'quel-danil', 'corins'];

describe('what a region offers, in words', () => {
 it('names the faction of every town and flight path of the board', () => {
  expect(Object.fromEntries(p.regions.filter(r => r.town).map(r => [r.id, r.town]))).toEqual(TOWNS);
  expect(Object.fromEntries(p.regions.filter(r => r.flight).map(r => [r.id, r.flight]))).toEqual(FLIGHTS);
  expect(placeNames(region('brill'))).toEqual(['Horde starting region', 'Horde town', 'Horde flight path']);
  expect(placeNames(region('southshore'))).toEqual(['Alliance starting region', 'Alliance town', 'Alliance flight path']);
  expect(placeNames(region('caer'))).toEqual(['Horde flight path']);
  expect(placeNames(region('sorrow'))).toEqual(['Alliance flight path']);
  expect(placeNames(region('pestilent'))).toEqual(['Town of both factions', 'Flight path of both factions']);
  expect(placeNames(region('andorhal'))).toEqual(['Graveyard']);
  expect(placeNames(region('hearthglen'))).toEqual([]);
  expect(serviceName({ kind: 'graveyard' })).toBe('Graveyard');
 });

 it('says where a flight path leads exactly as the rules of Travel do', () => {
  const s = createGame(p, DEFAULT_SETUP);
  for (const f of ['horde', 'alliance'] as Faction[]) {
   const h = s.heroes.find(h => faction(p, h.id) === f)!;
   for (const from of p.regions) {
    const flown = steps(p, h, from.id).filter(id => !from.neighbors.includes(id)).sort(), told = flightsFrom(p.regions, from, f).map(r => r.id);
    // What Travel adds to a region's neighbours is what the map says the flight path leads to (a neighbour is walked to).
    expect(told.filter(id => !from.neighbors.includes(id)).sort(), `${from.id} for the ${f}`).toEqual(flown);
    expect(told.length > 0, `${from.id} for the ${f}`).toBe(serves(from.flight, f));
   }
  }
  expect(flightsFrom(p.regions, region('brill'), 'horde').map(r => r.name)).toEqual(['North Tide’s Hollow', 'Caer Darrow', 'Pestilent Scar']);
  expect(flightsFrom(p.regions, region('pestilent'), 'alliance').map(r => r.name)).toEqual(['Southshore', 'Sorrow Hill', 'Aerie Peak']);
  expect(flightsFrom(p.regions, region('brill'), 'alliance')).toEqual([]);
 });

 it('explains each mark in one sentence, and a flight path by its destinations', () => {
  const town = serviceRule({ kind: 'town', side: 'horde' }, p.regions, region('brill'));
  expect(town.summary).toMatch(/^Horde characters take the Town action here/);
  expect(town.summary).toContain('3 points per level instead of 2');
  expect(serviceRule({ kind: 'flight', side: 'alliance' }, p.regions, region('aerie')).details).toEqual(['Flies to Southshore, Sorrow Hill or Pestilent Scar']);
  const shared = serviceRule({ kind: 'flight', side: 'both' }, p.regions, region('pestilent'));
  expect(shared.summary).toMatch(/^Characters of both factions fly from here/);
  expect(shared.details).toEqual(['Horde: Brill, North Tide’s Hollow or Caer Darrow', 'Alliance: Southshore, Sorrow Hill or Aerie Peak']);
  expect(serviceRule({ kind: 'graveyard' }, p.regions, region('olsen')).summary).toContain('nearest graveyard');
 });

 it('gives a resting character in a friendly town the three points per level the mark promises', () => {
  // The sentence on the mark is the rule of the engine: level × 3 in a town of one's own faction, level × 2 elsewhere.
  const rest = (location: string) => {
   const s = createGame(p, DEFAULT_SETUP), h = s.heroes.find(h => faction(p, h.id) === 'horde')!;
   h.location = location; h.health = 1; h.energy = 0; s.enemies = [];
   const c = legalActions(p, s).filter(c => c.type === 'rest' && c.hero === h.id).sort((a, b) => (b.type === 'rest' ? b.health : 0) - (a.type === 'rest' ? a.health : 0))[0];
   const after = apply(p, s, c).heroes.find(x => x.id === h.id)!;
   return after.health - 1 + after.energy;
  };
  expect(rest('north-tide')).toBe(3);
  expect(rest('aerie')).toBe(2);
  expect(rest('pestilent')).toBe(3);
 });
});

describe('where the marks stand', () => {
 const corners = (shape: (typeof BOARD)['shapes'][number], name: string, services: ReturnType<typeof servicesOf>) => serviceMarks(shape, name, services).flatMap(m => {
  const [cx, cy] = shape.center, b = SERVICE_BOX[m.kind];
  return [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [cx + m.dx + sx * b.w / 2, cy + m.dy + sy * b.h / 2] as const);
 });
 it('keeps every mark inside its own region on both boards', () => {
  for (const board of [BOARD, LEGACY_BOARD]) for (const r of p.regions) {
   const services = servicesOf(r), shape = board.byId[r.id];
   if (!services.length) { expect(serviceMarks(shape, r.name, services)).toEqual([]); continue; }
   for (const m of serviceMarks(shape, r.name, services)) expect(pointInRegion([shape.center[0] + m.dx, shape.center[1] + m.dy], shape.points), `${r.id} ${m.kind}`).toBe(true);
   // Brill is the smallest of them: a wing tip may reach three units over its border, nothing more anywhere.
   expect(Math.min(...corners(shape, r.name, services).map(c => clearance(shape, c))), r.id).toBeGreaterThanOrEqual(-4);
  }
 });
 it('moves the row where there is no room under the name: the cross of Andorhal stood half on Sorrow Hill', () => {
  const andorhal = BOARD.byId.andorhal, [mark] = serviceMarks(andorhal, region('andorhal').name, servicesOf(region('andorhal')));
  expect(mark.dy).toBeLessThan(0);
  for (const c of corners(andorhal, region('andorhal').name, servicesOf(region('andorhal')))) { expect(pointInRegion(c, andorhal.points)).toBe(true); expect(pointInRegion(c, BOARD.byId.sorrow.points)).toBe(false); }
  // Where there is room the row is under the name, in the middle.
  const caer = serviceMarks(BOARD.byId.caer, region('caer').name, servicesOf(region('caer')));
  expect(caer).toEqual([{ kind: 'flight', side: 'horde', dx: 0, dy: 18 }]);
  // The same place every time: a mark does not move during a game.
  expect(serviceMarks(BOARD.byId.brill, 'Brill', servicesOf(region('brill')))).toBe(serviceMarks(BOARD.byId.brill, 'Brill', servicesOf(region('brill'))));
 });
 it('keeps tokens off the marks, at the size the overview draws them', () => {
  let tokens = 0, touching = 0;
  for (const seed of [2005, 7, 71, 99]) {
   let s = createGame(p, { ...DEFAULT_SETUP, seed });
   for (let step = 0; step < 40; step++) {
    const v = view(s), at = boardTokenPositions(p, v, questMarkers(p, v));
    for (const [key, point] of Object.entries(at)) {
     const id = key === 'overlord' ? v.overlord.region : key.startsWith('h:') ? v.heroes.find(h => `h:${h.id}` === key)!.location : key.split(':')[1], r = region(id);
     if (!servicesOf(r).length) continue;
     tokens++;
     // A quest's marker is a tag on its creature's counter since 19. 11. 2026 (token-layout.ts > TAG), 15 units across its half-width.
     const radius = key === 'overlord' ? 26 : key.startsWith('h:') ? 21 : key.startsWith('c:') ? 17 : key.startsWith('q:') ? 15 : 19;
     // A token's centre is never on a mark, and its edge reaches into the room of a mark by a few units at most.
     for (const mark of takenByServices(BOARD.byId[id], r.name, servicesOf(r))) {
      const gap = Math.hypot(point[0] - mark.x, point[1] - mark.y);
      expect(gap, `${key} at step ${step}, seed ${seed}`).toBeGreaterThan(mark.r);
      if (gap < mark.r + radius - 6) touching++;
     }
     expect(pointInRegion(point, BOARD.byId[id].points), key).toBe(true);
    }
    const legal = legalActions(p, s), travel = legal.filter(c => c.type === 'travel'), from = travel.length && step % 3 ? travel : legal;
    if (!from.length) break;
    s = apply(p, s, from[(seed * 31 + step * 17) % from.length]);
   }
  }
  expect(tokens).toBeGreaterThan(300);
  // Measured over 2,400 positions on 17. 11. 2026: placed as before, 23% of such tokens would stand on a mark of the overview's size.
  expect(touching / tokens).toBeLessThan(0.03);
  expect(MARK_ROOM).toBe(1.4);
 });
});

describe('the marks on the map', () => {
 beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
  HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600, width: 900, height: 600, toJSON: () => ({}) });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 });
 afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
 function Table({ hero = 0 }: { hero?: number }) {
  const [focused, setFocused] = useState(false), [selected, setSelected] = useState('brill');
  const s = createGame(p, DEFAULT_SETUP); s.enemies = []; const v = view(s), horde = s.heroes.filter(h => faction(p, h.id) === 'horde');
  return <CampaignMap state={v} heroId={horde[hero].id} selected={selected} legal={legalActions(p, s)} focused={focused} onToggleFocus={() => setFocused(v => !v)} onSelect={setSelected} onMove={vi.fn()} />;
 }
 const mark = (id: string) => document.querySelector<SVGGElement>(`.map-service[data-service="${id}"]`)!;
 const find = (id: string) => fireEvent.change(screen.getByLabelText('Find a region'), { target: { value: id } });

 it('draws a town and a flight path in the colour of their faction, and a graveyard in none', () => {
  render(<Table />);
  expect(document.querySelectorAll('.map-service')).toHaveLength(Object.keys(TOWNS).length + Object.keys(FLIGHTS).length + GRAVEYARDS.length);
  for (const [id, side] of Object.entries(TOWNS)) { expect(mark(`${id}:town`).dataset.side, id).toBe(side); expect(mark(`${id}:town`).querySelector(`.service-badge.town.${side}`), id).not.toBeNull(); }
  for (const [id, side] of Object.entries(FLIGHTS)) { expect(mark(`${id}:flight`).dataset.side, id).toBe(side); expect(mark(`${id}:flight`).querySelector(`.service-badge.flight.${side}`), id).not.toBeNull(); }
  for (const id of GRAVEYARDS) expect(mark(`${id}:graveyard`).querySelector('.service-badge.graveyard.neutral'), id).not.toBeNull();
  // A mark that both factions use is drawn in both colours: its second half is the other faction's.
  expect(mark('pestilent:town').querySelectorAll('.service-plate.second')).toHaveLength(1);
  expect(mark('brill:town').querySelector('.service-plate.second')).toBeNull();
  // The old glyph took its one colour from the flight path and gave it to the town beside it.
  expect(document.querySelector('.field-services')).toBeNull();
 });

 it('names the faction in a region’s accessible name and title', () => {
  render(<Table />);
  const name = (id: string) => document.querySelector(`polygon.map-field[data-region="${id}"]`)!.getAttribute('aria-label');
  expect(name('brill')).toBe('Brill · Horde starting region · Horde town · Horde flight path');
  expect(name('southshore')).toBe('Southshore · Alliance starting region · Alliance town · Alliance flight path');
  expect(name('caer')).toBe('Caer Darrow · reachable in 1 steps · Horde flight path');
  expect(name('pestilent')).toBe('Pestilent Scar · reachable in 1 steps · Town of both factions · Flight path of both factions');
  expect(name('olsen')).toBe('Olsen’s Farthing · Graveyard');
  expect(name('hearthglen')).toBe('Hearthglen');
  expect(document.querySelector('polygon.map-field[data-region="aerie"] title')!.textContent).toBe('Aerie Peak · Hinterlands · Alliance town · Alliance flight path');
 });

 it('has the board’s key in its legend', () => {
  render(<Table />);
  const key = screen.getByRole('group', { name: 'Key: towns, flight paths, quests and graveyards' });
  for (const f of ['Horde', 'Alliance']) {
   const group = within(key).getByRole('group', { name: `${f} marks` });
   expect(group.textContent).toBe(`${f}townflight pathquest`);
   expect(group.querySelector('svg.service-icon.town .service-badge.' + f.toLowerCase())).not.toBeNull();
   expect(group.querySelector('svg.service-icon.flight .service-badge.' + f.toLowerCase())).not.toBeNull();
  }
  expect(within(key).getByRole('group', { name: 'Marks of both factions' }).querySelectorAll('.service-badge.both')).toHaveLength(2);
  expect(key.textContent).toContain('Graveyard');
 });

 it('tells whose a mark is and whether the character in hand may use it, when the mark is pointed at', () => {
  render(<Table />);
  const mine = character(p, createGame(p, DEFAULT_SETUP).heroes.find(h => faction(p, h.id) === 'horde')!.id).name.split(' ')[0];
  fireEvent.pointerEnter(mark('brill:flight'));
  let tip = screen.getByRole('tooltip');
  expect(tip.textContent).toContain('Horde flight path');
  expect(tip.textContent).toContain('Flies to North Tide’s Hollow, Caer Darrow or Pestilent Scar');
  expect(tip.textContent).toContain(`Open to ${mine} (Horde).`);
  fireEvent.pointerLeave(mark('brill:flight'));
  expect(screen.queryByRole('tooltip')).toBeNull();
  fireEvent.pointerEnter(mark('aerie:town'));
  tip = screen.getByRole('tooltip');
  expect(tip.textContent).toContain('Alliance town');
  expect(tip.textContent).toContain(`Closed to ${mine} (Horde).`);
 });

 it('names the faction in the selected region’s line and details, and draws where its flight path leads', () => {
  render(<Table />);
  fireEvent.click(screen.getByRole('button', { name: /Interact with map/ }));
  const dialog = screen.getByRole('dialog', { name: 'Interact with map' }), line = () => dialog.querySelector('.region-places')!, network = () => [...dialog.querySelectorAll<SVGPathElement>('.map-flight-network path')].map(path => path.dataset.flight);
  expect([...line().querySelectorAll('.place-chip')].map(c => c.textContent)).toEqual(['Horde starting region', 'Horde town', 'Horde flight path']);
  expect([...line().querySelectorAll('.place-chip')].map(c => c.className)).toEqual(['place-chip horde', 'place-chip horde', 'place-chip horde']);
  expect(network()).toEqual(['horde:north-tide', 'horde:caer', 'horde:pestilent']);
  find('pestilent');
  expect([...line().querySelectorAll('.place-chip')].map(c => c.textContent)).toEqual(['Town of both factions', 'Flight path of both factions']);
  expect(network()).toEqual(['horde:brill', 'horde:north-tide', 'horde:caer', 'alliance:southshore', 'alliance:sorrow', 'alliance:aerie']);
  expect(dialog.querySelectorAll('.map-flight-network path.horde')).toHaveLength(3);
  expect(dialog.querySelectorAll('.map-flight-network path.alliance')).toHaveLength(3);
  // The flight the character in hand would take is drawn in his own faction's colour.
  expect(dialog.querySelector('.map-route .flight-route.horde')).not.toBeNull();
  fireEvent.click(within(dialog).getByRole('button', { name: /^Region details/ }));
  const offers = within(dialog).getByRole('list', { name: 'What this region offers' });
  expect(offers.textContent).toContain('Town of both factions');
  expect(offers.textContent).toContain('Horde: Brill, North Tide’s Hollow or Caer Darrow');
  expect(offers.textContent).toContain('Alliance: Southshore, Sorrow Hill or Aerie Peak');
  find('aerie');
  expect(within(dialog).getByRole('list', { name: 'What this region offers' }).textContent).toMatch(/Alliance town.*Closed to \w+ \(Horde\)\..*Alliance flight path.*Flies to Southshore, Sorrow Hill or Pestilent Scar/);
  find('andorhal');
  expect([...line().querySelectorAll('.place-chip')].map(c => `${c.className}:${c.textContent}`)).toEqual(['place-chip neutral:Graveyard']);
  expect(network()).toEqual([]);
  find('hearthglen');
  expect(line().querySelector('.place-chip')).toBeNull();
  expect(within(dialog).queryByRole('list', { name: 'What this region offers' })).toBeNull();
 });

 it('selects the region when a mark is clicked in the fullscreen map', () => {
  render(<Table />);
  fireEvent.click(screen.getByRole('button', { name: /Interact with map/ }));
  fireEvent.click(document.querySelector('dialog .map-service[data-service="caer:flight"]')!);
  expect((screen.getByLabelText('Find a region') as HTMLSelectElement).value).toBe('caer');
 });
});
