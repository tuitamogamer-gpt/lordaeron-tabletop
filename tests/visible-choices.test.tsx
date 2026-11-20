// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { card, character, faction } from '../src/rules/common';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command, State } from '../src/rules/model';
import { view } from '../src/rules/view';
import CampaignMap from '../src/campaign/Map';
import WorldDecision from '../src/campaign/WorldDecision';
import RewardResolution from '../src/campaign/RewardResolution';
import { startRewards } from '../src/rules/reward-engine';
import { decisionPrompt, mapDecision } from '../src/campaign/map-decision';
import { apply } from '../src/rules/game';
import { beats } from '../src/campaign/stage';

beforeEach(() => {
 vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
 Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
 Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
 HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600, width: 900, height: 600, toJSON: () => ({}) });
 HTMLElement.prototype.scrollIntoView = vi.fn();
 vi.stubGlobal('PointerEvent', MouseEvent);
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const eventId = (script: string) => p.events.find(e => e.script === script)!.id;
const leader = (s: State, f: 'horde' | 'alliance') => s.heroes.find(h => faction(p, h.id) === f)!.id;
const items = p.cards.filter(c => c.kind === 'item' && !c.soulbound && !c.bagExempt && !c.printed && c.price > 1);
const [gnoll, other] = p.creatures.map(c => c.id);
type Choice = Extract<Command, { type: 'event-choice' }>;

/** The Beasts of Lordaeron with two blue groups on the board: one in Balnir Farmstead, one in Venomweb Vale. */
function beasts() {
 const s = createGame(p, DEFAULT_SETUP);
 s.enemies = [{ id: 'g1', creature: gnoll, color: 'blue', region: 'balnir' }, { id: 'g2', creature: gnoll, color: 'blue', region: 'balnir' }, { id: 'o1', creature: other, color: 'blue', region: 'venomweb' }];
 s.phase = 'event';
 s.eventFlow = { event: eventId('beasts'), started: true, moved: [], steps: (['horde', 'alliance', 'horde', 'alliance'] as const).map(f => ({ kind: 'beasts', hero: leader(s, f), faction: f })) };
 return s;
}
const world = (s: State, send = vi.fn()) => <WorldDecision state={view(s)} legal={legalActions(p, s)} send={send} inspect={vi.fn()} botStep={() => {}} botReady={false} auto={false} toggleBots={() => {}} />;

describe('decisions about places are read from the rules as places on the board', () => {
 it('offers each blue group that can move and, for it, exactly the regions the rules accept', () => {
  const s = beasts(), legal = legalActions(p, s), d = mapDecision(view(s), legal)!;
  expect(d.kind).toBe('beasts');
  expect(d.progress).toBe('Horde · group 1 of 2');
  expect(d.sources!.map(v => [v.key, v.count])).toEqual([[`${gnoll}:balnir`, 2], [`${other}:venomweb`, 1]]);
  const offered = d.targets.filter(t => t.source === `${gnoll}:balnir`);
  // Every target is one command of the rules, and every such command is a target: nothing is offered that would be refused.
  expect(offered.map(t => t.command)).toEqual(legal.filter(c => c.type === 'event-choice' && c.choice.enemy === 'g1'));
  expect(offered.some(t => p.regions.find(r => r.id === t.region)!.home)).toBe(false);
  expect(d.skip?.command).toEqual({ type: 'event-choice', hero: leader(s, 'horde'), choice: { mode: 'skip' } });
 });
 it('says what to do next: pick a group, then a region, then confirm', () => {
  const d = mapDecision(view(beasts()), legalActions(p, beasts()))!, group = d.sources![0];
  expect(decisionPrompt(d)).toMatch(/^Pick a group of blue creatures on the map/);
  expect(decisionPrompt(d, group)).toContain('Now pick where 2 × ');
  expect(decisionPrompt(d, group, 'venomweb')).toContain('Balnir Farmstead → Venomweb Vale');
 });
 it('puts the Goblin Zeppelin’s flight points and a defeated character’s graveyards on the board', () => {
  const s = createGame(p, DEFAULT_SETUP), hero = s.heroes[0];
  s.phase = 'event'; s.eventFlow = { event: eventId('zeppelin'), started: true, moved: [], steps: [{ kind: 'zeppelin', hero: hero.id }] };
  const flight = mapDecision(view(s), legalActions(p, s))!;
  expect(flight.kind).toBe('zeppelin'); expect(flight.from).toBe(hero.location);
  expect(flight.targets.length).toBeGreaterThan(0);
  for (const t of flight.targets) expect(['both', faction(p, hero.id)]).toContain(p.regions.find(r => r.id === t.region)!.flight);
  delete s.eventFlow; s.phase = 'actions'; hero.health = 0; s.respawns = [hero.id];
  const revival = mapDecision(view(s), legalActions(p, s))!;
  expect(revival.kind).toBe('respawn'); expect(revival.hero).toBe(hero.id);
  expect(revival.targets.map(t => t.command)).toEqual(legalActions(p, s).filter(c => c.type === 'respawn' && c.hero === hero.id));
 });
 it('leaves decisions that are not about places to their dialog', () => {
  const s = createGame(p, DEFAULT_SETUP);
  s.phase = 'event'; s.merchant = [items[0].id]; s.eventFlow = { event: eventId('merchants'), started: true, moved: [], steps: [{ kind: 'merchants', hero: s.heroes[0].id }] };
  expect(mapDecision(view(s), legalActions(p, s))).toBeUndefined();
  expect(mapDecision(view(createGame(p, DEFAULT_SETUP)), legalActions(p, createGame(p, DEFAULT_SETUP)))).toBeUndefined();
 });
});

describe('the map while a decision is made on it', () => {
 const board = (s: State, send = vi.fn(), focused = true) => {
  const v = view(s), legal = legalActions(p, s);
  return <CampaignMap state={v} heroId={s.heroes[0].id} selected="brill" legal={legal} focused={focused} onToggleFocus={() => {}} onSelect={() => {}} onMove={() => {}} decision={mapDecision(v, legal)} onDecide={send} />;
 };
 const field = (id: string) => document.querySelector(`.map-field[data-region="${id}"]`)!;
 it('lights the groups, then the regions of the group picked, and sends nothing before the button', () => {
  const s = beasts(), send = vi.fn();
  render(board(s, send));
  const bar = screen.getByRole('group', { name: 'Decision on the map: The Beasts of Lordaeron' });
  expect([...document.querySelectorAll('[data-decision-source]')].map(e => e.getAttribute('data-decision-source'))).toEqual(['balnir', 'venomweb']);
  expect(document.querySelectorAll('[data-decision-target]')).toHaveLength(0);
  expect(within(bar).getByRole('button', { name: 'Move the group here' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(field('balnir'));
  const legal = legalActions(p, s).filter((c): c is Choice => c.type === 'event-choice' && c.choice.enemy === 'g1');
  expect([...document.querySelectorAll('[data-decision-target]')].map(e => e.getAttribute('data-decision-target')).sort()).toEqual(legal.map(c => c.choice.region!).sort());
  expect(within(bar).getByRole('status').textContent).toContain('Now pick where 2 × ');
  // A region that is no choice is not taken for one.
  fireEvent.click(field('stratholme'));
  expect(within(bar).getByRole('button', { name: 'Move the group here' }).hasAttribute('disabled')).toBe(true);
  const target = legal.find(c => c.choice.region !== 'balnir')!;
  fireEvent.click(field(target.choice.region!));
  expect(send).not.toHaveBeenCalled();
  expect(document.querySelector('.decision-target.chosen')?.getAttribute('data-decision-target')).toBe(target.choice.region);
  fireEvent.click(within(bar).getByRole('button', { name: 'Move the group here' }));
  expect(send).toHaveBeenCalledExactlyOnceWith(target);
 });
 it('takes another group, or none, on request', () => {
  const s = beasts(), send = vi.fn();
  render(board(s, send));
  const bar = screen.getByRole('group', { name: /^Decision on the map/ });
  fireEvent.click(field('balnir'));
  fireEvent.click(within(bar).getByRole('button', { name: 'Pick another group' }));
  expect(document.querySelectorAll('[data-decision-target]')).toHaveLength(0);
  // The creature's own counter picks its group, too.
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^1 × ${p.creatures[1].name} · blue · Venomweb Vale`) }));
  expect(within(bar).getByRole('status').textContent).toContain(`Now pick where 1 × ${p.creatures[1].name} goes`);
  fireEvent.click(within(bar).getByRole('button', { name: 'Move no group' }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'event-choice', hero: leader(s, 'horde'), choice: { mode: 'skip' } });
 });
 it('takes a defeated character to the region picked, and no sooner than the button', () => {
  const s = createGame(p, DEFAULT_SETUP), hero = s.heroes[0], send = vi.fn();
  hero.health = 0; s.respawns = [hero.id];
  render(board(s, send));
  const bar = screen.getByRole('group', { name: 'Decision on the map: Hero revival' }), places = legalActions(p, s).filter(c => c.type === 'respawn');
  expect([...document.querySelectorAll('[data-decision-target]')].map(e => e.getAttribute('data-decision-target'))).toEqual(places.map(c => c.type === 'respawn' ? c.region : ''));
  fireEvent.click(field(places[0].type === 'respawn' ? places[0].region : ''));
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(within(bar).getByRole('button', { name: 'Revive here' }));
  expect(send).toHaveBeenCalledExactlyOnceWith(places[0]);
 });
 it('shows a bot’s move of a blue group where it happened: the region it went to, and the way from where it stood', () => {
  const s = beasts(), move = legalActions(p, s).find((c): c is Choice => c.type === 'event-choice' && c.choice.enemy === 'g1' && c.choice.region === 'venomweb')!;
  expect(beats(p, view(s), view(apply(p, s, move)), move, true)[0]).toMatchObject({ kind: 'choice', region: 'venomweb', from: 'balnir', path: ['venomweb'] });
 });
 it('asks nothing on the table overview: the decision is made on the open map', () => {
  render(board(beasts(), vi.fn(), false));
  expect(screen.queryByRole('group', { name: /^Decision on the map/ })).toBeNull();
  expect(document.querySelector('[data-decision-source]')).toBeNull();
 });
});

describe('items of an Event are chosen on their cards, with their prices', () => {
 const merchants = (gold: number, bag: string[] = []) => {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0];
  h.gold = gold; h.bag = bag; s.phase = 'event'; s.merchant = [items[0].id, items[1].id];
  s.eventFlow = { event: eventId('merchants'), started: true, moved: [], steps: [{ kind: 'merchants', hero: h.id }] };
  return s;
 };
 it('shows every merchant item as a card with the printed price struck and the halved price beside it', () => {
  const s = merchants(100), send = vi.fn(), ui = render(world(s, send));
  expect(ui.container.querySelector('.decision-options')).toBeNull();
  const shelf = screen.getByRole('region', { name: 'Items for sale at half price' });
  expect(shelf.querySelectorAll('.event-item .card-thumbnail')).toHaveLength(2);
  for (const c of items.slice(0, 2)) {
   const half = Math.ceil(c.price / 2);
   expect(within(shelf).getAllByLabelText(`${half} gold, printed price ${c.price}`)[0].querySelector('s')?.textContent).toBe(String(c.price));
   expect(within(shelf).getByRole('button', { name: `Buy ${c.name} for ${half} gold` }).textContent).toBe(`Buy · ${half} gold`);
  }
  fireEvent.click(within(shelf).getByRole('button', { name: `Buy ${items[1].name} for ${Math.ceil(items[1].price / 2)} gold` }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'event-choice', hero: s.heroes[0].id, choice: { card: items[1].id, discard: undefined } });
 });
 it('keeps an item the character cannot afford on the table, and says what it needs', () => {
  const s = merchants(0);
  render(world(s));
  const half = Math.ceil(items[0].price / 2), button = screen.getByRole('button', { name: `Buy ${items[0].name} for ${half} gold` });
  expect(button.hasAttribute('disabled')).toBe(true); expect(button.textContent).toBe(`Needs ${half} gold`);
  expect(screen.getByRole('button', { name: 'Buy nothing' })).toBeTruthy();
 });
 it('asks which card leaves a full bag by showing the cards', () => {
  const bag = items.slice(2, 5).map(c => c.id), s = merchants(100, bag), send = vi.fn();
  render(world(s, send));
  fireEvent.click(screen.getByRole('button', { name: `Buy ${items[0].name} for ${Math.ceil(items[0].price / 2)} gold` }));
  expect(send).not.toHaveBeenCalled();
  const picker = screen.getByRole('group', { name: 'Discard to make room' });
  expect(within(picker).getAllByRole('button').map(b => b.getAttribute('aria-label'))).toEqual(bag.map(id => `Discard ${card(p, id).name}`));
  fireEvent.click(within(picker).getByRole('button', { name: `Discard ${card(p, bag[2]).name}` }));
  expect(within(picker).getByRole('button', { name: `Discard ${card(p, bag[2]).name}` }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Buy for .* discard ${card(p, bag[2]).name}$`) }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'event-choice', hero: s.heroes[0].id, choice: { card: items[0].id, discard: bag[2] } });
 });
 it('shows what selling an item brings on the Goblin Merchant', () => {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0], send = vi.fn();
  h.bag = [items[0].id]; s.phase = 'event'; s.eventFlow = { event: eventId('sell'), started: true, moved: [], steps: [{ kind: 'sell', hero: h.id }] };
  render(world(s, send));
  const gain = Math.floor(items[0].price / 2);
  expect(screen.getByRole('region', { name: 'Items you can sell' }).querySelectorAll('.event-item .card-thumbnail')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: `Sell ${items[0].name} for ${gain} gold` }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'event-choice', hero: h.id, choice: { card: items[0].id } });
 });
});

describe('talents and recovery are shown as what they are', () => {
 it('lays the replacement talents out as cards and sends the talents chosen', () => {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0], classId = character(p, h.id).classId, send = vi.fn();
  const talents = p.cards.filter(c => c.kind === 'talent' && c.classId === classId).sort((a, b) => a.level - b.level);
  const own = talents.at(-1)!, next = talents.find(c => c.id !== own.id)!;
  h.level = own.level; h.talents = [own.id];
  s.phase = 'event'; s.eventFlow = { event: eventId('retrain'), started: true, moved: [], steps: [{ kind: 'retrain', hero: h.id }] };
  const ui = render(world(s, send));
  expect(ui.container.querySelector('select')).toBeNull();
  const options = screen.getByRole('radiogroup', { name: `Replacement for ${own.name}` });
  expect(options.querySelectorAll('.card-thumbnail')).toHaveLength(talents.filter(c => c.level <= own.level).length);
  expect(screen.getByRole('button', { name: /^Confirm .* talents$/ }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(within(options).getByRole('radio', { name: `Take ${next.name} as talent 1` }));
  fireEvent.click(screen.getByRole('button', { name: /^Confirm .* talents$/ }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'event-choice', hero: h.id, choice: { mode: 'talents', talents: [next.id] } });
 });
 it('says what gold or recovery leaves the character with', () => {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0], send = vi.fn();
  h.level = 2; h.health = 1; h.energy = 0; h.gold = 5;
  s.phase = 'event'; s.eventFlow = { event: eventId('professions'), started: true, moved: [], steps: [{ kind: 'professions', hero: h.id }] };
  render(world(s, send));
  expect(screen.getByRole('button', { name: 'Take 2 gold' }).textContent).toContain('Gold 5 → 7');
  fireEvent.click(screen.getByRole('button', { name: 'Recover 1 health and 1 energy' }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'event-choice', hero: h.id, choice: { mode: 'recover', health: 1 } });
 });
 it('asks which card leaves a full bag for a reward by showing the cards', () => {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0], send = vi.fn();
  h.bag = items.slice(0, 3).map(c => c.id); s.phase = 'reward';
  startRewards(p, s, [h.id], [h.id], { xp: 0, gold: 0, items: [{ deck: 'triangle', draw: 2 }] });
  // A potion needs no room in the bag: the question is asked for the offered card that does.
  const legal = legalActions(p, s), offered = s.reward!.offered.find(id => !card(p, id).bagExempt)!;
  const ui = render(<RewardResolution state={view(s)} legal={legal} send={send} inspect={() => {}} />);
  expect(ui.container.querySelector('select')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: `Select reward ${card(p, offered).name}` }));
  const picker = screen.getByRole('group', { name: 'Discard for reward' });
  fireEvent.click(within(picker).getByRole('button', { name: `Discard ${card(p, h.bag[1]).name}` }));
  fireEvent.click(screen.getByRole('button', { name: `Claim ${card(p, offered).name}` }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'reward', hero: h.id, card: offered, discard: h.bag[1] });
 });
});
