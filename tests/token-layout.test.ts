import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { BOARD_SHAPE_BY_ID, pointInRegion } from '../src/data/board-geometry';
import { questMarkers } from '../src/campaign/map-state';
import { boardTokenPositions, clearance, labelBox, labelCover, layoutTokens, TOKEN_RADIUS } from '../src/campaign/token-layout';
import { createGame } from '../src/rules/game';
import { view } from '../src/rules/view';

const regionOf = (key: string, v: ReturnType<typeof view>) => key === 'overlord' ? v.overlord.region : key.startsWith('h:') ? v.heroes.find(h => `h:${h.id}` === key)!.location : key.split(':')[1];

describe('tokens stand inside their own region', () => {
 it('keeps the centre of every hero, creature, quest marker and the Overlord inside its region at the start of a campaign', () => {
  for (const overlord of ['kelthuzad', 'nefarian', 'kazzak']) for (const seed of [2005, 71, 99]) {
   const v = view(createGame(p, { ...DEFAULT_SETUP, seed, overlord })), at = boardTokenPositions(p, v, questMarkers(p, v));
   expect(Object.keys(at).length).toBeGreaterThan(20);
   for (const [key, point] of Object.entries(at)) expect(pointInRegion(point, BOARD_SHAPE_BY_ID[regionOf(key, v)].points), `${key} (${overlord}, seed ${seed})`).toBe(true);
  }
 });

 it('places a hero who travels into a small region inside it, not on the neighbouring region', () => {
  const s = createGame(p, DEFAULT_SETUP);
  s.heroes[0].location = 'nightmare';
  const v = view(s), at = boardTokenPositions(p, v, questMarkers(p, v)), hero = at[`h:${s.heroes[0].id}`];
  expect(pointInRegion(hero, BOARD_SHAPE_BY_ID.nightmare.points)).toBe(true);
  // Most of the token is inside too: its centre is at least half a radius from the border.
  expect(clearance(BOARD_SHAPE_BY_ID.nightmare, hero)).toBeGreaterThanOrEqual(TOKEN_RADIUS.hero * 0.45);
 });

 it('keeps tokens apart and off the region’s name where the region has room', () => {
  const shape = BOARD_SHAPE_BY_ID.hearthglen, [cx, cy] = shape.center, label = labelBox('Hearthglen', false);
  const at = layoutTokens(shape, [{ key: 'a', r: 20, prefer: [0, -36] }, { key: 'b', r: 20, prefer: [0, 36] }, { key: 'c', r: 20, prefer: [44, -14] }], label);
  const keys = Object.keys(at);
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) expect(Math.hypot(at[keys[i]][0] - at[keys[j]][0], at[keys[i]][1] - at[keys[j]][1]), `${keys[i]}/${keys[j]}`).toBeGreaterThanOrEqual(40);
  for (const key of keys) expect(labelCover(label, cx, cy, at[key][0], at[key][1], 20), key).toBeLessThanOrEqual(6);
 });

 it('gives the same placement for the same position', () => {
  const v = view(createGame(p, DEFAULT_SETUP)), markers = questMarkers(p, v);
  expect(boardTokenPositions(p, v, markers)).toEqual(boardTokenPositions(p, v, markers));
 });

 it('still places every token when a region is too small for them', () => {
  const at = layoutTokens(BOARD_SHAPE_BY_ID['aerie-valley'], Array.from({ length: 6 }, (_, i) => ({ key: `t${i}`, r: 20, prefer: [0, 0] as const })));
  expect(Object.keys(at)).toHaveLength(6);
  for (const point of Object.values(at)) expect(pointInRegion(point, BOARD_SHAPE_BY_ID['aerie-valley'].points)).toBe(true);
  expect(new Set(Object.values(at).map(point => point.join(','))).size).toBe(6);
 });
});
