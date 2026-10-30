// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { view } from '../src/rules/view';
import { ExperienceTrack, TurnTrack } from '../src/campaign/BoardTracks';

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

 it('climbs each character counter up its faction lane by experience', () => {
  const s = createGame(p, DEFAULT_SETUP); s.heroes[0].xp = p.xp[4]; s.heroes[3].xp = p.xp[2];
  const { container } = render(<ExperienceTrack state={view(s)}/>);
  expect(screen.getByRole('img', { name: new RegExp(`Experience track: .*${p.xp[4]} XP`) })).toBeTruthy();
  const counters = [...container.querySelectorAll<HTMLElement>('.board-xp-counter')];
  expect(counters).toHaveLength(s.heroes.length);
  expect(counters.map(c => c.style.getPropertyValue('--at'))).toContain('1');
  expect(container.querySelectorAll('.board-xp-lane.horde .board-xp-counter')).toHaveLength(3);
  expect(container.querySelectorAll('.board-xp-level')).toHaveLength(4);
 });

 it('ships a green, red and blue plastic figure for every creature', () => {
  for (const c of p.creatures) for (const color of ['green', 'red', 'blue']) expect(existsSync(`public/assets/tokens/plastic/${c.id}-${color}.webp`), `${c.id}-${color}`).toBe(true);
 });
});
