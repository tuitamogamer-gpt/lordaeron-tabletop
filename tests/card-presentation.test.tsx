// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BASE_PACK as p } from '../src/data/base';
import { card } from '../src/rules/common';
import CharacterSheet, { CardRules, startingHero } from '../src/campaign/CharacterSheet';
import EquipmentEditor from '../src/campaign/EquipmentEditor';
import { CardArt } from '../src/campaign/Art';
import { GameCard } from '../src/campaign/parts';
import RulesText from '../src/campaign/RulesText';
import { effectText, staticCardText } from '../src/campaign/rules-text';
import type { Effect } from '../src/rules/model';

afterEach(cleanup);

describe('consistent new card artwork', () => {
 it('keeps every learned power and talent reachable in six-card character pages', () => {
  const h=startingHero(p.characters.find(c=>c.classId==='mage')!.id);
  h.learned=p.cards.filter(c=>c.kind==='power'&&!c.printed&&c.classId==='mage').map(c=>c.id);
  const r=render(<CharacterSheet hero={h} inspect={()=>{}} preview/>);
  fireEvent.click(screen.getByRole('button',{name:/Spellbook/}));
  expect(r.container.querySelectorAll('.sheet-card-grid .card-thumbnail')).toHaveLength(6);
  const firstIds=[...r.container.querySelectorAll('.sheet-card-grid img.card-portrait-face')].map(e=>e.getAttribute('src'));
  fireEvent.click(within(screen.getByRole('navigation',{name:'Character card pages'})).getByRole('button',{name:'Next'}));
  const lastIds=[...r.container.querySelectorAll('.sheet-card-grid img.card-portrait-face')].map(e=>e.getAttribute('src'));
  expect(new Set([...firstIds,...lastIds]).size).toBe(h.learned.length);
  fireEvent.click(screen.getByRole('button',{name:/^Talents/}));
  fireEvent.click(screen.getByRole('button',{name:'Browse all talents'}));
  expect(r.container.querySelectorAll('.sheet-card-grid .card-thumbnail')).toHaveLength(6);
  expect(within(screen.getByRole('navigation',{name:'Character card pages'})).getByRole('button',{name:'Previous'}).hasAttribute('disabled')).toBe(true);
 });
 it('uses the new full-card illustration for every playable card, including printed and racial abilities', () => {
  const r = render(<>{p.cards.map(c => <CardArt key={c.id} card={c} />)}</>);
  const sources = [...r.container.querySelectorAll('.card-illustration image')].map(e => e.getAttribute('href'));
  expect(sources).toEqual(p.cards.map(c => `/assets/full-cards/${c.id}.webp`));
  for(const scene of r.container.querySelectorAll('.card-illustration')){
   expect(scene.getAttribute('viewBox')).toBe('22 60 340 294');
   expect(scene.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  }
  expect(r.container.querySelector('img[src*="/card-art/"]')).toBeNull();
 });

 it('updates the equipped art and full preview when a power is selected and starting equipment is restored', () => {
  const def = p.characters.find(c => c.classId === 'mage')!, h = startingHero(def.id), send = vi.fn();
  h.learned = ['mage-fireball'];
  const r = render(<EquipmentEditor hero={h} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Equip Fireball' }));
  const slot = screen.getByRole('button', { name: /^Slot 1:/ });
  expect(slot.querySelector('img.card-portrait-face')?.getAttribute('src')).toBe('/assets/card-faces/v9/mage-fireball.webp');
  const preview = screen.getByRole('region', { name: 'Selected card preview' });
  expect(preview.querySelector('img.card-portrait-face')?.getAttribute('src')).toBe('/assets/card-faces/v9/mage-fireball.webp');
  fireEvent.focus(within(preview).getByRole('button',{name:'Preview Fireball'}));
  expect(within(screen.getByRole('tooltip')).getByRole('img', { name: /Fireball.*blue dice/s })).toBeTruthy();
  expect(send).not.toHaveBeenCalled();

  const startingSlot = def.slots.findIndex(s => s.printed && s.types.includes('instant'));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Slot ${startingSlot + 1}:`) }));
  fireEvent.click(screen.getByRole('button', { name: 'Equip Fireball' }));
  const printed = card(p, def.slots[startingSlot].printed!);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${printed.name}.*Restore starting equipment`) }));
  const restored=screen.getByRole('region', { name: 'Selected card preview' });
  expect(restored.querySelector('img.card-portrait-face')?.getAttribute('src')).toBe(`/assets/card-faces/v9/${printed.id}.webp`);
  fireEvent.focus(within(restored).getByRole('button',{name:`Preview ${printed.name}`}));
  expect(screen.getByRole('tooltip').querySelector('.full-card-face')?.getAttribute('src')).toBe(`/assets/card-faces/v9/${printed.id}.webp`);
  expect(r.container.querySelector('img[src*="/card-art/"]')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm equipment' }));
  expect(send.mock.calls[0][0].slots[startingSlot].card).toBeUndefined();
 });

 it('keeps starting cards in their slots and reveals complete dice rules on focus', () => {
  const def = p.characters.find(c => c.classId === 'mage')!;
  const r = render(<CharacterSheet hero={startingHero(def.id)} inspect={() => {}} preview />);
  for (const slot of def.slots.filter(s => s.printed)) {
   expect(r.container.querySelector(`img.card-portrait-face[src="/assets/card-faces/v9/${slot.printed}.webp"]`)).toBeTruthy();
  }
  expect(r.container.querySelector('.character-slot .inscribed-rules')).toBeNull();
  const startingPower=def.slots.find(s=>s.printed&&s.types.includes('instant'))!.printed!;
  fireEvent.focus(screen.getByRole('button',{name:`Inspect ${card(p,startingPower).name}`}));
  expect(within(screen.getByRole('tooltip')).getByRole('img', { name: /dice/ })).toBeTruthy();
 });
});

describe('graphical dice in authoritative rules', () => {
 it('keeps every Execute strength and its energy cost visible on the card', () => {
  const r = render(<GameCard card={card(p, 'warrior-execute')} />);
  const face=screen.getByRole('img', { name: /Execute/ });
  const description=face.getAttribute('alt');
  for (let amount = 1; amount <= 5; amount++) {
   expect(description).toContain(`choose one (${amount}/5)`);
   expect(description).toContain(`${amount} energy`);
   expect(description).toContain(`+${amount} ranged hits`);
  }
  expect(description).toContain('1–5 energy');
  expect(r.container.querySelectorAll('.raster-card img')).toHaveLength(1);
  expect(r.container.querySelector('.folio-rules, .folio-title, .folio-footer, .power-strength-option, foreignObject')).toBeNull();
  expect(r.container.querySelector('.raster-card')?.textContent).toBe('');
 });

 it('renders triangular D8 faces without dropping the readable dice noun or accessible color', () => {
  const r = render(<RulesText>Roll 2 red/blue dice.</RulesText>);
  expect(screen.getByRole('img', { name: 'red/blue dice' })).toBeTruthy();
  expect(r.container.textContent).toContain('dice');
  expect([...r.container.querySelectorAll('.rule-die')].map(e => e.getAttribute('data-die-color'))).toEqual(['red', 'blue']);
  for(const die of r.container.querySelectorAll('.rule-die'))expect(die.querySelectorAll('.die-facet').length).toBeGreaterThan(0);
  expect(r.container.querySelector('.rule-die image')).toBeNull();
 });

 it('keeps counts, thresholds and both effect branches while illustrating each dice color', () => {
  const effect: Effect = { op: 'if', condition: { kind: 'no-color', color: 'green' }, then: [
   { op: 'spot', count: 2, filter: { colors: ['red', 'blue'], min: 7 }, effects: [{ op: 'dice', color: 'blue', amount: 3 }] },
  ], otherwise: [{ op: 'dice', color: 'green', amount: 1 }] };
  const r = render(<p><RulesText>{effectText(effect)}</RulesText></p>);
  expect(screen.getByRole('img', { name: 'red/blue dice' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'blue dice' })).toBeTruthy();
  expect(screen.getAllByRole('img', { name: 'green dice' })).toHaveLength(2);
  expect(r.container.textContent).toContain('Spot 2 (');
  expect(r.container.textContent).toContain('7+');
  expect(r.container.textContent).toContain('→ +3');
  expect(r.container.textContent).toContain('otherwise +1');
 });

 it('leaves creature colors and ability names intact and handles ordinary English dice explanations', () => {
  const r = render(<p><RulesText>Add one blue die. Spot a red or blue die showing 8. Defeat one blue creature. Red Dragon.</RulesText></p>);
  expect(screen.getByRole('img', { name: 'blue die' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'red or blue die' })).toBeTruthy();
  expect(r.container.textContent).toContain('Add one');
  expect(r.container.textContent).toContain('showing 8. Defeat one blue creature. Red Dragon.');
  expect(r.container.querySelectorAll('.rule-die')).toHaveLength(3);
 });

 it('renders talent enhancements and equipment penalties with accessible dice', () => {
  const talent = card(p, 'warlock-improved-shadow-bolt');
  const r = render(<CardRules value={talent} />);
  expect(screen.getByRole('img', { name: 'blue dice' })).toBeTruthy();
  expect(r.container.textContent).toContain('Shadow Bolt');
  const penalty = p.cards.find(c => !!c.poolPenalty)!;
  r.rerender(<>{staticCardText(penalty).map(t => <p key={t}><RulesText>{t}</RulesText></p>)}</>);
  for (const color of Object.keys(penalty.poolPenalty!)) expect(screen.getByRole('img', { name: `${color} dice` })).toBeTruthy();
 });

 it('keeps full-card accessible rules complete while detailed rules retain graphical dice', () => {
  const c = card(p, 'mage-fireball');
  const r = render(<GameCard card={c} />);
  const description = screen.getByRole('img', { name: /Fireball/ }).getAttribute('alt');
  for(const ability of c.abilities)for(const effect of ability.effects)expect(description).toContain(effectText(effect));
  r.rerender(<CardRules value={c} />);
  expect(screen.getAllByRole('img', { name: 'blue dice' }).length).toBeGreaterThan(0);
 });
});
