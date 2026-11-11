// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChallengeDialog from '../src/campaign/ChallengeDialog';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { character, faction } from '../src/rules/common';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command, State } from '../src/rules/model';
import { view } from '../src/rules/view';

afterEach(cleanup);

const first = (id: string) => character(p, id).name.split(' ')[0];
/** The Horde's three characters stand together beside one of their quest's creatures. */
function together(arrange: (s: State, horde: State['heroes']) => void = () => {}) {
 const s = createGame(p, DEFAULT_SETUP), horde = s.heroes.filter(h => faction(p, h.id) === 'horde');
 const enemy = s.enemies.find(e => e.faction === 'horde' && e.color !== 'blue')!;
 for (const h of horde) h.location = enemy.region;
 s.enemies = s.enemies.filter(e => e.region !== enemy.region || e.creature === enemy.creature);
 arrange(s, horde);
 return { s, leader: horde[0].id, allies: horde.slice(1).map(h => h.id), region: enemy.region };
}
const dialog = (s: State, leader: string, send = vi.fn(), extra: Partial<Parameters<typeof ChallengeDialog>[0]> = {}) => render(<ChallengeDialog state={view(s)} hero={leader} legal={legalActions(p, s)} send={send} {...extra} />);

describe('choosing a challenge', () => {
 it('shows one card for an opponent, however many allies could come along', () => {
  const { s, leader } = together();
  expect(legalActions(p, s).filter(c => c.type === 'challenge' && c.hero === leader).length).toBeGreaterThan(3);
  dialog(s, leader);
  expect(screen.getAllByRole('region')).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: /^Challenge / })).toHaveLength(1);
 });

 it('fights alone unless an ally is invited', () => {
  const { s, leader } = together(), send = vi.fn();
  dialog(s, leader, send);
  fireEvent.click(screen.getByRole('button', { name: 'Challenge alone' }));
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0][0]).toMatchObject({ type: 'challenge', hero: leader, allies: [] });
 });

 it('invites the allies the player picks and names them on the button', () => {
  const { s, leader, allies } = together(), send = vi.fn();
  dialog(s, leader, send);
  const invite = screen.getByRole('button', { name: `Invite ${first(allies[0])}` });
  expect(invite.getAttribute('aria-pressed')).toBe('false');
  expect(invite.textContent).toContain('can join · 2 actions left');
  fireEvent.click(invite);
  expect(screen.getByRole('button', { name: `Leave out ${first(allies[0])}` }).textContent).toContain('joins · spends 1 action');
  fireEvent.click(screen.getByRole('button', { name: `Invite ${first(allies[1])}` }));
  fireEvent.click(screen.getByRole('button', { name: `Challenge with ${first(allies[0])} and ${first(allies[1])}` }));
  const sent = send.mock.calls[0][0] as Extract<Command, { type: 'challenge' }>;
  expect(sent.hero).toBe(leader);
  expect([...sent.allies].sort()).toEqual([...allies].sort());
 });

 it('lets an invitation be taken back', () => {
  const { s, leader, allies } = together(), send = vi.fn();
  dialog(s, leader, send);
  fireEvent.click(screen.getByRole('button', { name: `Invite ${first(allies[0])}` }));
  fireEvent.click(screen.getByRole('button', { name: `Leave out ${first(allies[0])}` }));
  fireEvent.click(screen.getByRole('button', { name: 'Challenge alone' }));
  expect(send.mock.calls[0][0]).toMatchObject({ allies: [] });
 });

 it('says why an ally standing there cannot be invited', () => {
  const { s, leader, allies } = together((_s, horde) => { horde[1].actions = 0; });
  dialog(s, leader);
  const spent = screen.getByRole('button', { name: `Invite ${first(allies[0])}: no action left` }) as HTMLButtonElement;
  expect(spent.disabled).toBe(true);
  expect(spent.textContent).toContain('no action left');
  expect((screen.getByRole('button', { name: `Invite ${first(allies[1])}` }) as HTMLButtonElement).disabled).toBe(false);
 });

 it('says so when no ally stands in the region', () => {
  const { s, leader, region } = together((_s, horde) => { horde[1].location = 'brill'; horde[2].location = 'brill'; if (horde[0].location === 'brill') { horde[1].location = 'undercity'; horde[2].location = 'undercity'; } });
  dialog(s, leader);
  expect(screen.getByText(new RegExp(`No ally stands in ${p.regions.find(r => r.id === region)!.name}`))).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Invite / })).toBeNull();
 });

 it('marks the allies the AI plays; they are invited like anyone else', () => {
  const { s, leader, allies } = together(), send = vi.fn();
  dialog(s, leader, send, { bots: [allies[0]] });
  expect(within(screen.getByRole('button', { name: `Invite ${first(allies[0])}` })).getByText('AI')).toBeTruthy();
  expect(within(screen.getByRole('button', { name: `Invite ${first(allies[1])}` })).queryByText('AI')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: `Invite ${first(allies[0])}` }));
  fireEvent.click(screen.getByRole('button', { name: `Challenge with ${first(allies[0])}` }));
  expect(send.mock.calls[0][0]).toMatchObject({ allies: [allies[0]] });
 });

 it('asks the advisor about the exact party chosen and shows its expectation', async () => {
  const { s, leader, allies } = together();
  const assess = vi.fn(async (c: Extract<Command, { type: 'challenge' }>) => `expectation for ${1 + c.allies.length}`);
  dialog(s, leader, vi.fn(), { assess });
  await waitFor(() => expect(screen.getByText('expectation for 1')).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: `Invite ${first(allies[0])}` }));
  await waitFor(() => expect(screen.getByText('expectation for 2')).toBeTruthy());
  expect(assess.mock.calls.map(([c]) => c.allies.length)).toEqual([0, 1]);
  fireEvent.click(screen.getByRole('button', { name: `Leave out ${first(allies[0])}` }));
  await waitFor(() => expect(screen.getByText('expectation for 1')).toBeTruthy());
  expect(assess).toHaveBeenCalledTimes(2);
 });

 it('gives each opponent in the region its own card and its own party', () => {
  // The Overlord stands in the same region as the quest's creature.
  const { s, leader, allies } = together((s, horde) => { s.overlord.region = horde[0].location; });
  const send = vi.fn();
  dialog(s, leader, send);
  const cards = screen.getAllByRole('region');
  expect(cards).toHaveLength(2);
  expect(cards.map(c => c.getAttribute('aria-label')).some(label => label === 'Challenge Kel’Thuzad')).toBe(true);
  fireEvent.click(within(cards[0]).getByRole('button', { name: `Invite ${first(allies[0])}` }));
  expect(within(cards[1]).getByRole('button', { name: 'Challenge alone' })).toBeTruthy();
  expect(within(cards[0]).getByRole('button', { name: `Challenge with ${first(allies[0])}` })).toBeTruthy();
 });

 it('has nothing to offer where nothing can be challenged', () => {
  const s = createGame(p, DEFAULT_SETUP), leader = s.heroes[0].id;
  render(<ChallengeDialog state={view(s)} hero={leader} legal={[]} send={vi.fn()} />);
  expect(screen.getByText('Nothing here can be challenged now.')).toBeTruthy();
 });
});
