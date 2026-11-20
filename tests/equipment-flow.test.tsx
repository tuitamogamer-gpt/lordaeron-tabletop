// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import EquipmentEditor from '../src/campaign/EquipmentEditor';
import { TownEditor, TradeEditor } from '../src/campaign/Interactions';
import { startingHero } from '../src/campaign/CharacterSheet';
import { BASE_PACK as p } from '../src/data/base';
import { card, character } from '../src/rules/common';
import { fitsSlot, heroSlots } from '../src/rules/inventory';

afterEach(cleanup);
const heroFor = (classId: string) => startingHero(p.characters.find(c => c.classId === classId)!.id);

describe('bounded equipment flows', () => {
 it('keeps attachment selections when browsing its compact pages and resets paging for another slot', () => {
  const hero = heroFor('warrior'); hero.level = 5;
  const attachments = p.cards.filter(c => c.addon && !c.printed && fitsSlot(p, hero, c, heroSlots(p, hero)[6]));
  expect(attachments.length).toBeGreaterThan(2);
  hero.bag = attachments.map(c => c.id);
  render(<EquipmentEditor hero={hero} send={() => {}} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: /^Slot 7:/ }));
  expect(screen.getAllByRole('checkbox', { name: /one per function/ })).toHaveLength(2);
  const chosen = attachments[0];
  fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(`${chosen.name}.*one per function`) }));
  const pager = within(screen.getByRole('navigation', { name: 'Attachment pages' }));
  fireEvent.click(pager.getByRole('button', { name: 'Next' }));
  expect(screen.queryByLabelText(`${chosen.name} rules`)).toBeNull();
  fireEvent.click(pager.getByRole('button', { name: 'Previous' }));
  expect((screen.getByRole('checkbox', { name: new RegExp(`${chosen.name}.*one per function`) }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(pager.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: /^Slot 1:/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Slot 7:/ }));
  expect((within(screen.getByRole('navigation', { name: 'Attachment pages' })).getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true);
 });

 it('shows an empty shelf after the last power is learned, with confirmation still available', () => {
  const hero = heroFor('mage'); hero.level = 5;
  hero.learned = p.cards.filter(c => c.kind === 'power' && !c.printed && c.classId === character(p, hero.id).classId).map(c => c.id);
  render(<TownEditor hero={hero} merchant={[]} send={() => {}} busy={false} />);
  expect(screen.getByText('You’ve learned every available power')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Confirm · 0 transactions · 1 action' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Buy items' }));
  expect(screen.getByText('The merchant’s shelf is empty')).toBeTruthy();
 });

 it('lays both bags open as cards, keeps what is offered and clears the previous ally’s side when switching partners', () => {
  const hero = heroFor('mage'), allies = p.characters.filter(c => c.faction === character(p, hero.id).faction && c.id !== hero.id).slice(0, 2).map(c => startingHero(c.id));
  const exempt = p.cards.filter(c => c.kind === 'item' && !c.soulbound && c.bagExempt && !c.printed);
  const normal = p.cards.filter(c => c.kind === 'item' && !c.soulbound && !c.bagExempt && !c.printed);
  expect(exempt.length).toBeGreaterThan(1);
  hero.bag = [...normal.slice(0, 3), ...exempt.slice(0, 2)].map(c => c.id);
  allies[0].bag = [exempt[2].id];
  hero.gold = 10; allies[0].gold = 8;
  const send = vi.fn(); const ui = render(<TradeEditor hero={hero} heroes={[hero, ...allies]} send={send} busy={false} bots={[allies[1].id]} />);
  // Every item is a card to press, never a name in a list.
  expect(ui.container.querySelector('select')).toBeNull();
  expect(within(screen.getByRole('group', { name: 'You give: items' })).getAllByRole('button')).toHaveLength(5);
  const give = (id: string) => { const same = hero.bag.filter(v => card(p, v).name === card(p, id).name); return screen.getAllByRole('button', { name: `You give: ${card(p, id).name}` })[same.indexOf(id)]; };
  fireEvent.click(give(hero.bag[0])); fireEvent.click(give(hero.bag[4]));
  expect(give(hero.bag[0]).getAttribute('aria-pressed')).toBe('true');
  fireEvent.change(screen.getByRole('spinbutton', { name: 'You give: gold' }), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'You give: more gold' }));
  fireEvent.click(screen.getByRole('button', { name: `Ally gives: ${card(p, allies[0].bag[0]).name}` }));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Ally gives: gold' }), { target: { value: '2' } });
  // The other ally is named as the AI's; choosing him empties what the first one was asked for and keeps the player's offer.
  const partners = within(screen.getByRole('radiogroup', { name: 'Trade ally' })).getAllByRole('radio');
  expect(partners[1].textContent).toContain('AI ally');
  fireEvent.click(partners[1]);
  expect((screen.getByRole('spinbutton', { name: 'Ally gives: gold' }) as HTMLInputElement).value).toBe('0');
  fireEvent.click(screen.getByRole('button', { name: `Trade with ${character(p, allies[1].id).name.split(' ')[0]}` }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'trade', hero: hero.id, to: allies[1].id, items: [hero.bag[0], hero.bag[4]], receiveItems: [], gold: 3, receiveGold: 0 });
 });

 it('says under each card what it is worth to the one who would receive it', () => {
  const hero = heroFor('mage'), ally = startingHero(p.characters.find(c => c.faction === character(p, hero.id).faction && c.classId === 'warrior')!.id);
  const mail = p.cards.find(c => c.kind === 'item' && c.trait === 'Mail' && !c.printed && !c.addon && c.level === 1)!;
  const later = p.cards.find(c => c.kind === 'item' && c.trait === 'Mail' && !c.printed && !c.addon && c.level > 1)!;
  const cloth = p.cards.find(c => c.kind === 'item' && c.trait === 'Cloth' && !c.printed && !c.addon && c.level === 1)!;
  const potion = p.cards.find(c => c.kind === 'item' && c.trait === 'Potion' && !c.soulbound)!;
  hero.bag = [mail.id, later.id, potion.id]; ally.bag = [cloth.id];
  render(<TradeEditor hero={hero} heroes={[hero, ally]} send={() => {}} busy={false} />);
  const mine = screen.getByRole('group', { name: 'You give: items' }), theirs = screen.getByRole('group', { name: 'Ally gives: items' });
  const first = (id: string) => character(p, id).name.split(' ')[0];
  expect(mine.textContent).toContain(`${first(ally.id)}: Can equip now`);
  expect(mine.textContent).toContain(`${first(ally.id)}: Can equip at level ${later.level}`);
  expect(mine.textContent).toContain(`${first(ally.id)}: Used from the bag`);
  expect(theirs.textContent).toContain(`${first(hero.id)}: Can equip now`);
  // A warrior's mail is of no use to the mage, and the table says so before it is taken.
  ally.bag = [mail.id]; cleanup();
  render(<TradeEditor hero={hero} heroes={[hero, ally]} send={() => {}} busy={false} />);
  expect(screen.getByRole('group', { name: 'Ally gives: items' }).textContent).toContain(`${first(hero.id)}: Cannot equip Mail`);
 });

 it('will not send a trade that overfills a bag, and names whose bag it is', () => {
  const hero = heroFor('mage'), ally = startingHero(p.characters.find(c => c.faction === character(p, hero.id).faction && c.id !== hero.id)!.id);
  const normal = p.cards.filter(c => c.kind === 'item' && !c.soulbound && !c.bagExempt && !c.printed);
  hero.bag = normal.slice(0, 3).map(c => c.id); ally.bag = [normal[3].id];
  const send = vi.fn(); render(<TradeEditor hero={hero} heroes={[hero, ally]} send={send} busy={false} />);
  expect((screen.getByRole('button', { name: 'Choose what changes hands' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: `Ally gives: ${normal[3].name}` }));
  const confirm = screen.getByRole('button', { name: `Trade with ${character(p, ally.id).name.split(' ')[0]}` }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  expect(screen.getByRole('status').textContent).toContain(`${character(p, hero.id).name.split(' ')[0]} must hand one over`);
  // Handing one back makes room.
  fireEvent.click(screen.getByRole('button', { name: `You give: ${normal[0].name}` }));
  expect(confirm.disabled).toBe(false);
  fireEvent.click(confirm);
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'trade', hero: hero.id, to: ally.id, items: [normal[0].id], receiveItems: [normal[3].id], gold: 0, receiveGold: 0 });
 });

 it('locks the trade table while a trade cannot be made, and the cards can still be read', () => {
  const hero = heroFor('mage'), ally = startingHero(p.characters.find(c => c.faction === character(p, hero.id).faction && c.id !== hero.id)!.id);
  const item = p.cards.find(c => c.kind === 'item' && !c.soulbound && !c.printed)!;
  hero.bag = [item.id];
  const send = vi.fn(); render(<TradeEditor hero={hero} heroes={[hero, ally]} send={send} busy />);
  expect(screen.getAllByRole('radio').every(b => (b as HTMLButtonElement).disabled)).toBe(true);
  expect(screen.getAllByRole('spinbutton').every(input => (input as HTMLInputElement).disabled)).toBe(true);
  const thumbnail = screen.getByRole('button', { name: `You give: ${item.name}` });
  fireEvent.click(thumbnail);
  expect(thumbnail.getAttribute('aria-pressed')).toBe('false');
  // Focus still opens the full card.
  fireEvent.focus(thumbnail);
  expect(screen.getByRole('tooltip', { name: `${item.name} full card` })).toBeTruthy();
 });
});
