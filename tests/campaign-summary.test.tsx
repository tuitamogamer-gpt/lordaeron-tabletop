// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import type { Battle, State } from '../src/rules/model';
import { view } from '../src/rules/view';
import CampaignSummary, { endingText, turnsPlayed } from '../src/campaign/CampaignSummary';

afterEach(cleanup);
const finished = (battle: Partial<Battle>, winner: State['winner'] = 'alliance') => {
 const s = createGame(p, DEFAULT_SETUP);
 s.phase = 'finished'; s.winner = winner; s.turn = 10; s.lap = 3;
 s.battle = { kind: 'pve', region: s.overlord.region, participants: [], defeated: [], ...battle } as Battle;
 return s;
};

describe('campaign summary', () => {
 it('counts every lap of the track instead of only the current turn', () => {
  expect(turnsPlayed({ turn: 10, lap: 3 })).toBe(70);
  expect(turnsPlayed({ turn: 12 })).toBe(12);
  render(<CampaignSummary state={view(finished({}))} onNew={vi.fn()} onChronicle={vi.fn()} onHide={vi.fn()}/>);
  expect(screen.getByText('70')).toBeTruthy();
  expect(screen.getByText('Lap 3 · turn 10 of 30')).toBeTruthy();
 });

 it('names the heroes left standing when the Overlord falls', () => {
  const s = finished({}), alliance = s.heroes.filter(h => p.characters.find(c => c.id === h.id)?.faction === 'alliance').map(h => h.id);
  s.battle = { ...s.battle!, boss: s.overlord.id, first: 'alliance', participants: alliance, defeated: [alliance[0]] };
  const boss = p.overlords.find(o => o.id === s.overlord.id)!.name, [, b, c] = alliance.map(id => p.characters.find(x => x.id === id)!.name.split(' ')[0]);
  expect(endingText(view(s))).toBe(`${boss} falls in ${p.regions.find(r => r.id === s.overlord.region)!.name} to ${b} and ${c}.`);
 });

 it('tells the final battle and the Nefarian draw apart', () => {
  expect(endingText(view(finished({ kind: 'final' }, 'horde')))).toMatch(/^The Horde wins the final battle in /);
  const draw = finished({}, 'draw'); draw.nefarianFinal = ['horde', 'alliance'];
  expect(endingText(view(draw))).toMatch(/defeats both factions\. The campaign ends in a draw\.$/);
 });

 it('marks the victor and offers the chronicle, the table and a new campaign', () => {
  const onNew = vi.fn(), onChronicle = vi.fn(), onHide = vi.fn();
  render(<CampaignSummary state={view(finished({}))} onNew={onNew} onChronicle={onChronicle} onHide={onHide}/>);
  expect(screen.getByRole('heading', { name: 'Alliance wins!' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Alliance party' }).className).toContain('winner');
  expect(screen.getByRole('region', { name: 'Horde party' }).className).not.toContain('winner');
  fireEvent.click(screen.getByRole('button', { name: 'Read the chronicle' }));
  fireEvent.click(screen.getByRole('button', { name: 'View the table' }));
  fireEvent.click(screen.getByRole('button', { name: 'New campaign' }));
  expect([onChronicle, onHide, onNew].map(f => f.mock.calls.length)).toEqual([1, 1, 1]);
 });
});
