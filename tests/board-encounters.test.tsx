// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { addWorld } from '../src/rules/events';
import { legalActions } from '../src/rules/legal';
import type { State } from '../src/rules/model';
import { view } from '../src/rules/view';
import CampaignMap from '../src/campaign/Map';
import EncounterPanel from '../src/campaign/EncounterPanel';
import { questMarkers } from '../src/campaign/map-state';
import { setupBeats } from '../src/campaign/stage';
import { boardTokenPositions } from '../src/campaign/token-layout';

beforeEach(() => {
 vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
 Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
 Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
 HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600, width: 900, height: 600, toJSON: () => ({}) });
 vi.stubGlobal('PointerEvent', MouseEvent);
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const WAR = p.events.find(e => e.script === 'war')!, BOSS = p.events.find(e => e.boss && !e.overlord)!;
/** A campaign with a War being fought and a Boss on the board, both drawn earlier. */
function atWar() {
 const s: State = createGame(p, { ...DEFAULT_SETUP, seed: 9 }), fought = WAR.effects.find(f => f.op === 'war');
 if (fought?.op === 'war') s.wars = [{ id: WAR.id, regions: fought.regions, reward: fought.reward }];
 addWorld(s, BOSS.id);
 s.eventDiscard = [WAR.id, BOSS.id, p.events.find(e => e.script === 'professions')!.id];
 return s;
}
const board = (s: State, more: { veiled?: string[]; arriving?: string } = {}) => <CampaignMap state={view(s)} heroId={s.heroes[0].id} selected="brill" legal={legalActions(p, s)} focused={false} onToggleFocus={() => {}} onSelect={() => {}} onMove={() => {}} {...more} />;

describe('a War on the board', () => {
 it('lays a token of crossed swords in each of its two regions, and marks the pair', () => {
  const s = atWar(), [a, b] = s.wars[0].regions, at = boardTokenPositions(p, view(s), questMarkers(p, view(s)));
  expect(at[`w:${a}:${WAR.id}`]).toBeDefined(); expect(at[`w:${b}:${WAR.id}`]).toBeDefined();
  const ui = render(board(s));
  const tokens = [...ui.container.querySelectorAll('[data-war-token]')];
  expect(tokens.map(t => t.getAttribute('data-war-token')).sort()).toEqual([`${WAR.id}:${a}`, `${WAR.id}:${b}`].sort());
  for (const token of tokens) { expect(token.querySelector('image')?.getAttribute('href')).toBe('/assets/tokens/war.webp'); expect(token.getAttribute('aria-label')).toContain(`${WAR.name} · War token`); }
  // Both regions are outlined and joined by a line.
  const pair = ui.container.querySelector(`.map-wars [data-war="${WAR.id}"]`)!;
  expect(pair.querySelectorAll('polygon')).toHaveLength(2); expect(pair.querySelectorAll('path')).toHaveLength(1);
  // Pointing at one token shows the pair stronger and says where the other lies.
  fireEvent.pointerEnter(tokens[0]);
  expect(pair.getAttribute('class')).toContain('shown');
  expect(tokens[0].querySelector('desc')?.textContent).toMatch(/The other War token lies in /);
 });
 it('has no token once it is over', () => {
  const s = atWar(); s.wars = [];
  expect(render(board(s)).container.querySelector('[data-war-token]')).toBeNull();
 });
});

describe('a Boss that has come up as an encounter', () => {
 it('stands in its region as the painted Boss token', () => {
  const ui = render(board(atWar()));
  const boss = screen.getByRole('button', { name: `${BOSS.name} · ${p.regions.find(r => r.id === BOSS.boss!.region)!.name}` });
  expect(boss.querySelector('image')?.getAttribute('href')).toBe('/assets/tokens/boss-encounter.webp');
  expect(ui.container.querySelectorAll('.encounter-token-halo.boss')).toHaveLength(1);
 });
});

describe('the Encounter panel', () => {
 it('lists a War being fought and a Boss on the board as active, and leaves them out of the discard pile', () => {
  const s = atWar();
  render(<EncounterPanel state={view(s)} />);
  expect(screen.getByRole('button', { name: /^Active encounters/ }).textContent).toBe('Active encounters2');
  expect(screen.getByRole('button', { name: /^Discard pile/ }).textContent).toBe('Discard pile1');
  fireEvent.click(screen.getByRole('button', { name: /^Active encounters/ }));
  expect(screen.getByRole('button', { name: `Inspect ${WAR.name}` })).toBeTruthy();
  expect(screen.getByRole('button', { name: `Inspect ${BOSS.name}` })).toBeTruthy();
  // Won, the War leaves the board and its card lies in the discard pile.
  s.wars = []; cleanup();
  render(<EncounterPanel state={view(s)} />);
  expect(screen.getByRole('button', { name: /^Active encounters/ }).textContent).toBe('Active encounters1');
  expect(screen.getByRole('button', { name: /^Discard pile/ }).textContent).toBe('Discard pile2');
 });
});

describe('the starting quests are laid out one after another', () => {
 const s = createGame(p, { ...DEFAULT_SETUP, seed: 7 }), beats = setupBeats(p, view(s)), laid = beats.filter(b => b.quest);
 const side = (id: string) => p.quests.find(q => q.id === id)!.faction;
 it('turns up every starting quest once, the Horde’s first, then the Alliance’s, and ends with the first turn', () => {
  expect(laid.map(b => b.quest)).toEqual([...s.quests.filter(id => side(id) === 'horde'), ...s.quests.filter(id => side(id) === 'alliance')]);
  expect(beats[0]).toMatchObject({ kind: 'deploy', title: 'The Horde’s quests are laid out' });
  expect(beats.find(b => b.title === 'The Alliance’s quests are laid out')).toBeDefined();
  expect(beats.at(-1)).toMatchObject({ kind: 'turn', title: 'Horde · turn 1' });
  for (const beat of laid) {
   // Each names what it puts where, its blue creatures too, and lights a region where a figure of it stands.
   const figures = s.enemies.filter(e => e.quest === beat.quest || e.id.startsWith(`${beat.quest}:`));
   expect(figures.length).toBeGreaterThan(0);
   expect(figures.map(e => e.region)).toContain(beat.region);
   for (const e of figures) expect(beat.lines[0]).toContain(p.regions.find(r => r.id === e.region)!.name);
   expect(beat.size).toBe('banner');
  }
 });
 it('keeps the figures of a quest off the board until it is reached, then sets them down', () => {
  const [first, ...rest] = laid.map(b => b.quest!), own = (quest: string) => s.enemies.filter(e => e.quest === quest || e.id.startsWith(`${quest}:`));
  const count = (ui: ReturnType<typeof render>) => ui.container.querySelectorAll('.portrait-map-token.creature').length;
  // Before the first quest nothing stands on the board; with it, only its own figures, being set down.
  expect(count(render(board(s, { veiled: [first, ...rest] })))).toBe(0); cleanup();
  const ui = render(board(s, { veiled: rest, arriving: first }));
  const stacks = new Set(own(first).map(e => `${e.region}:${e.creature}:${e.color}`)).size;
  expect(count(ui)).toBe(stacks);
  expect(ui.container.querySelectorAll('.token-arrival')).toHaveLength(stacks);
  expect(ui.container.querySelectorAll('.map-arrival polygon')).toHaveLength(new Set(own(first).map(e => e.region)).size);
  cleanup();
  // When all have been laid out the board is as the game has it.
  const whole = render(board(s));
  expect(whole.container.querySelector('.token-arrival')).toBeNull();
  expect(count(whole)).toBeGreaterThan(stacks);
 });
});

describe('the painted Combat Area', () => {
 it('ships its trays, its mat and the map tokens, and the stylesheet uses them', () => {
  for (const file of ['combat/damage.webp', 'combat/defense.webp', 'combat/attrition.webp', 'combat/mat.webp', 'tokens/war.webp', 'tokens/boss-encounter.webp']) expect(existsSync(`public/assets/${file}`), file).toBe(true);
  const css = readFileSync('src/campaign/visible-choices.css', 'utf8');
  for (const file of ['damage', 'defense', 'attrition', 'mat']) expect(css).toContain(`/assets/combat/${file}.webp`);
 });
});
