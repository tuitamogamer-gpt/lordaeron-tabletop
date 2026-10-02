// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import CombatArea from '../src/campaign/CombatArea';
import { combatCue } from '../src/campaign/combat-flow';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { beginBattle } from '../src/rules/combat';
import { apply, createGame } from '../src/rules/game';
import { view } from '../src/rules/view';

afterEach(cleanup);

describe('the three tabletop combat boxes', () => {
 it('keeps melee and armor together for defense, then carries only hit tokens into the next round', () => {
  let s = createGame(p, DEFAULT_SETUP);
  s.enemies = [{ id: 'ogre', creature: 'ogre', color: 'green', region: 'brill' }];
  beginBattle(s, 'pve', [s.heroes[0].id], ['ogre'], 'horde', 'brill');
  s.battle!.stage = 'defense';
  s.battle!.boxes.horde = { damage: 1, defense: 2, armor: 7, attrition: 1 };
  const ui = render(<CombatArea battle={s.battle!} side="horde" />);
  const defense = screen.getByRole('region', { name: 'Horde defense box' });
  expect(within(defense).getByLabelText('Horde melee hits').textContent).toBe('2');
  expect(within(defense).getByLabelText('Horde armor').textContent).toBe('7');
  expect(within(defense).queryByLabelText('Horde ranged hits')).toBeNull();
  s = apply(p, s, { type: 'advance' });
  expect(s.battle!.stage).toBe('resolution');
  expect(s.battle!.wounds.horde).toBe(0);
  ui.rerender(<CombatArea battle={s.battle!} side="horde" />);
  expect(screen.getByText('Move melee and attrition hits into Damage; discard armor.')).toBeTruthy();
  expect(screen.getByLabelText('Horde melee hits').textContent).toBe('2');
  s = apply(p, s, { type: 'advance' });
  ui.rerender(<CombatArea battle={s.battle!} side="horde" />);
  expect(screen.getByLabelText('Horde ranged hits').textContent).toBe('4');
  expect(screen.getByLabelText('Horde armor').textContent).toBe('0');
  expect(screen.getByLabelText('Horde melee hits').textContent).toBe('0');
  expect(screen.getByLabelText('Horde attrition').textContent).toBe('0');
  expect(screen.getByText('4 damage tokens stay for the next round.')).toBeTruthy();
 });

 it.each([false, true])('explains actual PvP wounds and clears both sides without promising carried damage (deadly: %s)', deadly => {
  const s = createGame(p, { ...DEFAULT_SETUP, variants: { deadlyPvp: deadly } });
  beginBattle(s, 'pvp', s.heroes.map(h => h.id), [], 'horde', 'brill');
  s.battle!.stage = 'resolution';
  s.battle!.boxes.horde = { damage: 0, defense: 3, armor: 0, attrition: 1 };
  s.battle!.boxes.alliance = { damage: 0, defense: 1, armor: 0, attrition: 1 };
  const ui = render(<CombatArea battle={s.battle!} side="horde" deadlyPvp={deadly} />);
  expect(screen.getByText(deadly ? 'Each faction takes wounds equal to the opposing melee and attrition hits.' : 'Compare melee + attrition. The difference becomes wounds for the weaker side.')).toBeTruthy();
  const after = apply(p, s, { type: 'advance' });
  expect(after.battle!.wounds).toEqual(deadly ? { horde: 2, alliance: 4 } : { horde: 0, alliance: 2 });
  const cue = combatCue(view(s), view(after));
  expect(cue?.detail).toBe(deadly ? 'Horde: 2 wounds to assign · Alliance: 4 wounds to assign' : 'Alliance: 2 wounds to assign');
  ui.rerender(<CombatArea battle={after.battle!} side="horde" deadlyPvp={deadly} />);
  expect(screen.getByLabelText('Horde ranged hits').textContent).toBe('0');
  expect(screen.getByText('Both factions clear their hit tokens before the next round.')).toBeTruthy();
 });
});
