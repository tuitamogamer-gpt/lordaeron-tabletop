// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { character } from '../src/rules/common';
import { createGame } from '../src/rules/game';
import type { Command, State } from '../src/rules/model';
import { view } from '../src/rules/view';
import WorldDecision from '../src/campaign/WorldDecision';
import { BossPortrait } from '../src/campaign/design-system';

afterEach(cleanup);
const decision = (s: State, legal: Command[], send = vi.fn()) => <WorldDecision state={view(s)} legal={legal} send={send} inspect={vi.fn()} botStep={() => {}} botReady={false} auto={false} toggleBots={() => {}}/>;

describe('auction house', () => {
 const auction = () => {
  const s = createGame(p, DEFAULT_SETUP), item = p.cards.find(c => c.id.startsWith('auction-'))!.id;
  const event = p.events.find(e => e.effects.some(f => f.op === 'auction'))!.id;
  s.phase = 'event'; s.auction = { event, item, bids: { [s.heroes[5].id]: 3 } };
  s.heroes[0].gold = 4;
  const legal: Command[] = s.heroes.slice(0, 5).map(h => ({ type: 'bid', hero: h.id, amount: 0 }));
  return { s, legal };
 };
 it('keeps each bid between zero and the bidder’s gold and seals the chosen amount', () => {
  const { s, legal } = auction(), send = vi.fn(), name = character(p, s.heroes[0].id).name;
  render(decision(s, legal, send));
  const lower = screen.getByRole('button', { name: `Lower bid: ${name}` }), raise = screen.getByRole('button', { name: `Raise bid: ${name}` });
  expect((lower as HTMLButtonElement).disabled).toBe(true);
  for (let i = 0; i < 6; i++) fireEvent.click(raise);
  expect((screen.getByRole('spinbutton', { name: `Bid: ${name}` }) as HTMLInputElement).value).toBe('4');
  expect((raise as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(lower);
  fireEvent.click(screen.getAllByRole('button', { name: 'Seal bid' })[0]);
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'bid', hero: s.heroes[0].id, amount: 3 });
 });
 it('shows who has already bid without revealing the amount', () => {
  const { s, legal } = auction();
  const r = render(decision(s, legal));
  const sealed = r.container.querySelector('.auction-bidder.sealed')!;
  expect(sealed.textContent).toContain(character(p, s.heroes[5].id).name);
  expect(sealed.textContent).toContain('Bid sealed');
  expect(sealed.textContent).not.toContain('3');
  expect(r.container.querySelectorAll('form.auction-bidder')).toHaveLength(5);
 });
});

describe('quest replacement events', () => {
 it('groups every active quest with one button per replacement deck and a clear skip', () => {
  const s = createGame(p, DEFAULT_SETUP), hero = s.heroes[0].id;
  const quests = s.quests.filter(id => p.quests.find(q => q.id === id)!.faction === 'horde');
  const swaps: Command[] = quests.flatMap(quest => (['green', 'yellow', 'red'] as const).map(tier => ({ type: 'event-choice', hero, choice: { quest, tier } }) as Command));
  const skip: Command = { type: 'event-choice', hero, choice: { mode: 'skip' } };
  const send = vi.fn(), r = render(decision(s, [skip, ...swaps], send));
  expect(r.container.querySelectorAll('.quest-swap-row')).toHaveLength(quests.length);
  expect(screen.queryByRole('textbox', { name: 'Filter decisions' })).toBeNull();
  const q = p.quests.find(q => q.id === quests[1])!;
  fireEvent.click(screen.getByRole('button', { name: `Replace ${q.name} with a yellow quest` }));
  expect(send).toHaveBeenLastCalledWith({ type: 'event-choice', hero, choice: { quest: q.id, tier: 'yellow' } });
  fireEvent.click(screen.getByRole('button', { name: 'Keep every quest' }));
  expect(send).toHaveBeenLastCalledWith(skip);
 });
});

describe('boss portraits', () => {
 it('names event bosses and uses the boss encounter art, while Overlords keep their portraits', () => {
  const event = p.events.find(e => e.boss)!;
  render(<><BossPortrait id={event.id}/><BossPortrait id="kazzak"/></>);
  const eventPortrait = screen.getByRole('img', { name: event.name }) as HTMLElement;
  expect(eventPortrait.style.backgroundImage).toContain('/assets/event-art/boss.webp');
  expect((screen.getByRole('img', { name: 'Lord Kazzak' }) as HTMLElement).style.backgroundImage).toContain('/assets/portraits/kazzak.webp');
 });
});
