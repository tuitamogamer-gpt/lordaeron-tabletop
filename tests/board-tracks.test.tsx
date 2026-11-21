// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { view } from '../src/rules/view';
import { ExperienceTrack, TurnTrack, XP_SPACES, xpColumns } from '../src/campaign/BoardTracks';

afterEach(cleanup);

describe('the tracks printed on the board', () => {
 it('stamps all thirty turns with their Event and merchant symbols and puts the hourglass on the current one', () => {
  const s = createGame(p, DEFAULT_SETUP); s.turn = 22; s.lap = 2; s.faction = 'alliance';
  const { container } = render(<TurnTrack state={view(s)}/>);
  expect(screen.getByRole('img', { name: /turn 22 of 30, lap 2\. Next Event cards on turn 25\./ })).toBeTruthy();
  const spaces = container.querySelectorAll('li:not(.board-turns-end)');
  expect(spaces).toHaveLength(30);
  expect(spaces[21].className).toContain('current');
  expect(spaces[20].className).toContain('past');
  expect(spaces[21].querySelector('.board-turns-marker.alliance')).toBeTruthy();
  const icons = Object.values(p.track);
  for (const kind of ['event', 'triangle', 'square', 'circle']) expect(container.querySelectorAll(`.board-turns-icon.${kind}`)).toHaveLength(icons.filter(v => v === kind).length);
  expect(container.querySelector('.board-turns-end')!.textContent).toBe(s.variants?.overlordOnly ? 'Lap 2' : 'End');
 });

 it('prints one space for every experience point and stands each counter at its own', () => {
  const s = createGame(p, DEFAULT_SETUP); s.heroes[0].xp = p.xp[4]; s.heroes[0].level = 5; s.heroes[3].xp = 13; s.heroes[3].level = 3; s.heroes[4].xp = 99;
  const { container } = render(<ExperienceTrack state={view(s)}/>);
  const spaces = [...container.querySelectorAll('.board-xp-space')];
  expect(spaces.map(v => v.textContent)).toEqual(Array.from({ length: XP_SPACES + 1 }, (_, n) => String(n)));
  // The spaces that make a level are the green ones, and each level's stretch begins on its own.
  expect(spaces.filter(v => v.className.includes('level')).map(v => Number(v.textContent))).toEqual(p.xp.slice(1));
  expect([...container.querySelectorAll<HTMLElement>('.board-xp-level')].map(v => [v.textContent, v.style.getPropertyValue('--from'), v.style.getPropertyValue('--span')]))
   .toEqual([['1', '0', '4'], ['2', '4', '6'], ['3', '10', '8'], ['4', '18', '10'], ['5', '28', '1']]);
  // Every counter stands at the space of its experience, and never above the last.
  const counters = [...container.querySelectorAll<HTMLElement>('.board-xp-counter')], at = (id: string) => counters.find(c => c.title.startsWith(p.characters.find(c => c.id === id)!.name))!;
  expect(counters).toHaveLength(s.heroes.length);
  expect(at(s.heroes[0].id).style.getPropertyValue('--space')).toBe(String(XP_SPACES));
  expect(at(s.heroes[3].id).style.getPropertyValue('--space')).toBe('13');
  expect(at(s.heroes[4].id).style.getPropertyValue('--space')).toBe(String(XP_SPACES));
  expect(spaces.filter(v => v.className.includes('held')).map(v => Number(v.textContent))).toEqual([0, 13, XP_SPACES]);
  // Each counter is tied to its space by a line at the same height.
  expect([...container.querySelectorAll<HTMLElement>('.board-xp-tie')].map(v => v.style.getPropertyValue('--space')).sort()).toEqual(counters.map(v => v.style.getPropertyValue('--space')).sort());
 });

 it('says each character’s experience, level and what the next level takes', () => {
  const s = createGame(p, DEFAULT_SETUP); s.heroes[0].xp = p.xp[4]; s.heroes[0].level = 5; s.heroes[3].xp = 13; s.heroes[3].level = 3;
  const { container } = render(<ExperienceTrack state={view(s)}/>), name = (i: number) => p.characters.find(c => c.id === s.heroes[i].id)!.name;
  expect(container.querySelector<HTMLElement>(`.board-xp-counter[title^="${name(3)}"]`)!.title).toBe(`${name(3)} · 13 XP · level 3 · 5 XP to level 4`);
  expect(container.querySelector<HTMLElement>(`.board-xp-counter[title^="${name(0)}"]`)!.title).toBe(`${name(0)} · ${p.xp[4]} XP · level 5 · highest level`);
  const label = screen.getByRole('img', { name: /^Experience track, Start to 28 XP:/ }).getAttribute('aria-label')!;
  expect(label).toContain(`${name(3).split(' ')[0]} 13 XP, level 3, 5 XP to level 4`);
  expect(label).toContain(`${name(1).split(' ')[0]} 0 XP, level 1, ${p.xp[1]} XP to level 2`);
 });

 it('stands counters on the same space or on neighbouring ones side by side, and the Horde’s nearest the track', () => {
  const horde = p.characters.filter(c => c.faction === 'horde').map(c => c.id), alliance = p.characters.filter(c => c.faction === 'alliance').map(c => c.id);
  const column = (heroes: { id: string; xp: number }[]) => Object.fromEntries(xpColumns(heroes).map(v => [v.id, v.column]));
  // Far apart: every counter stands against the track.
  expect(column([{ id: horde[0], xp: 2 }, { id: horde[1], xp: 9 }, { id: alliance[0], xp: 20 }])).toEqual({ [horde[0]]: 0, [horde[1]]: 0, [alliance[0]]: 0 });
  // The same space: three columns; the Alliance's counter is listed first and still stands outside the Horde's.
  expect(column([{ id: alliance[0], xp: 7 }, { id: horde[0], xp: 7 }, { id: horde[1], xp: 7 }])).toEqual({ [horde[0]]: 0, [horde[1]]: 1, [alliance[0]]: 2 });
  // Neighbouring spaces would overlap, so they step aside; two spaces apart they do not.
  expect(column([{ id: horde[0], xp: 5 }, { id: horde[1], xp: 6 }, { id: horde[2], xp: 7 }])).toEqual({ [horde[0]]: 0, [horde[1]]: 1, [horde[2]]: 0 });
  // No two counters within one space of each other ever share a column, at the start of a campaign or later.
  for (const xps of [[0, 0, 0, 0, 0, 0], [3, 4, 5, 4, 3, 4], [27, 28, 40, 28, 12, 13]]) {
   const placed = xpColumns([...horde.slice(0, 3), ...alliance.slice(0, 3)].map((id, i) => ({ id, xp: xps[i] })));
   for (const a of placed) for (const b of placed) if (a !== b && Math.abs(a.space - b.space) <= 1) expect(a.column, `${a.id} and ${b.id}`).not.toBe(b.column);
   expect(Math.max(...placed.map(v => v.space))).toBeLessThanOrEqual(XP_SPACES);
  }
 });

 it('ships a green, red and blue plastic figure for every creature', () => {
  for (const c of p.creatures) for (const color of ['green', 'red', 'blue']) expect(existsSync(`public/assets/tokens/plastic/${c.id}-${color}.webp`), `${c.id}-${color}`).toBe(true);
 });
});
