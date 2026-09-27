import { useState } from 'react';
import { Icon } from '../components';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character } from '../rules/common';
import { bagSize, equipped, fitsSlot, heroSlots, manage, petCapacity } from '../rules/inventory';
import type { Command, Equipped, Hero } from '../rules/model';
import { CardArt } from './Art';
import { CardRules, slotLabel } from './CharacterSheet';
import { energyLabel } from './ClassDeck';
import { HeroPortrait } from './parts';

export default function EquipmentEditor({ hero, send, busy }: { hero: Hero; send: (c: Command) => void; busy: boolean }) {
 const [slots, setSlots] = useState(() => structuredClone(hero.slots));
 const [selected, setSelected] = useState(0), [discard, setDiscard] = useState<string[]>([]), [reEquip, setReEquip] = useState<string[]>([]);
 const [announcement, setAnnouncement] = useState('Select a slot, then choose a card. Changes are saved when you confirm.');
 const areas = heroSlots(p, hero), def = character(p, hero.id);
 const owned = [...new Set([...hero.bag, ...hero.learned, ...hero.slots.flatMap(s => [s.card, ...s.addons].filter((id): id is string => !!id))])];
 const next = slots.flatMap(s => [s.card, ...s.addons].filter((id): id is string => !!id));
 const bag = owned.filter(id => card(p, id).kind === 'item' && !next.includes(id));
 const excess = Math.max(0, bagSize(p, bag) - 3);
 const bagAfter = bag.filter(id => !discard.includes(id));
 const preview = structuredClone(hero);
 let error = '';
 try { manage(p, { merchant: [] }, preview, slots, discard, reEquip); } catch (e) { error = (e as Error).message; }
 const changed = slots.filter((slot, i) => JSON.stringify(slot) !== JSON.stringify(hero.slots[i])).length;
 const dirty = changed > 0 || reEquip.length > 0 || discard.length > 0;
 const selectedId = slots[selected].card ?? areas[selected].printed;
 const previousId = hero.slots[selected].card ?? areas[selected].printed;
 const compatible = owned.filter(id => fitsSlot(p, hero, card(p, id), areas[selected]));
 const update = (value: Equipped[], message: string) => {
  setSlots(value); setDiscard([]);
  setReEquip(ids => ids.filter(id => value.some(slot => slot.card === id || slot.addons.includes(id))));
  setAnnouncement(message);
 };
 const equip = (id?: string) => {
  if (busy) return;
  const value = slots.map((slot, i) => i === selected ? { ...slot, card: id } : id && slot.card === id ? { ...slot, card: undefined } : slot);
  update(value, `${id ? card(p, id).name : areas[selected].printed ? card(p, areas[selected].printed!).name : 'Empty slot'} selected for slot ${selected + 1}. Confirm to save.`);
 };
 const attachment = (id: string) => {
  if (busy) return;
  const remove = slots[selected].addons.includes(id), fn = card(p, id).functionTrait;
  // Moving an attachment cannot duplicate it. Replacing its function returns the old item to the bag.
  update(slots.map((slot, i) => ({ ...slot, addons: i === selected
   ? [...slot.addons.filter(a => a !== id && (remove || card(p, a).functionTrait !== fn)), ...remove ? [] : [id]]
   : slot.addons.filter(a => a !== id) })), `${card(p, id).name} ${remove ? 'removed from' : 'attached to'} slot ${selected + 1}. Confirm to save.`);
 };
 const reset = () => { setSlots(structuredClone(hero.slots)); setDiscard([]); setReEquip([]); setAnnouncement('Changes reset. Your current equipment is restored.'); };

 return <div className="loadout-editor">
  <header className="loadout-heading"><HeroPortrait id={hero.id} small /><div><span className="sheet-eyebrow">PREPARE FOR THE NEXT ENCOUNTER</span><h3>{def.name.split(' ')[0]}’s loadout</h3><p>Choose a slot → equip a card → confirm your loadout.</p></div><span className="loadout-draft">{dirty ? `${changed} slot${changed === 1 ? '' : 's'} changed${reEquip.length ? ' · pet refresh' : ''}` : 'Current loadout'}</span></header>
  <div className="loadout-layout">
   <section className="loadout-slots" aria-label="Equipment slots">{slots.map((slot, i) => {
    const id = slot.card ?? areas[i].printed, c = id ? card(p, id) : undefined;
    const edited = JSON.stringify(slot) !== JSON.stringify(hero.slots[i]);
    return <button type="button" key={i} className={`loadout-slot ${edited ? 'changed' : ''}`} aria-label={`Slot ${i + 1}: ${slotLabel(areas[i])}, ${c?.name ?? 'empty'}`} aria-pressed={selected === i} disabled={busy} onClick={() => setSelected(i)}>
     <span className="loadout-slot-number">{String(i + 1).padStart(2, '0')}</span><span className="loadout-slot-type">{slotLabel(areas[i])}</span>
     <span className="loadout-slot-card" key={`${id}:${slot.addons.join(',')}`}>{c ? <CardArt card={c} /> : <span className="loadout-empty-icon"><Icon name="plus" size={24} /></span>}<strong>{c?.name ?? 'Open slot'}</strong><small>{c ? slot.card ? energyLabel(c) : 'Starting equipment' : 'Choose a compatible card'}</small></span>
     <span className="loadout-slot-bottom"><span>{slot.addons.length ? `${slot.addons.length} attachment${slot.addons.length === 1 ? '' : 's'}` : areas[i].traits.includes('all') ? 'All traits' : areas[i].traits.join(' / ')}</span>{edited && <span><Icon name="check" size={12} />Changed</span>}</span>
    </button>;
   })}</section>
   <aside className="loadout-picker" aria-label={`Cards for slot ${selected + 1}`}>
    <div className="loadout-picker-title"><span className="sheet-eyebrow">SLOT {String(selected + 1).padStart(2, '0')}</span><h4>{slotLabel(areas[selected])}</h4><p>Cards from your bag & spellbook that fit this slot.</p></div>
    {selectedId !== previousId && <p className="loadout-comparison"><span>{previousId ? card(p, previousId).name : 'Empty slot'}</span><Icon name="arrow" size={13} /><strong>{selectedId ? card(p, selectedId).name : 'Empty slot'}</strong></p>}
    <div className="loadout-choices">
     <button type="button" className="loadout-choice" aria-pressed={!slots[selected].card} disabled={busy} onClick={() => equip()}>{areas[selected].printed ? <CardArt card={card(p, areas[selected].printed!)} /> : <Icon name="minus" />}<span><strong>{areas[selected].printed ? card(p, areas[selected].printed!).name : 'Leave slot empty'}</strong><small>{areas[selected].printed ? 'Restore starting equipment · free' : 'Return the card to your bag or spellbook'}</small></span>{!slots[selected].card && <Icon name="check" size={16} />}</button>
     {compatible.filter(id => !card(p, id).addon).map(id => {
      const c = card(p, id), at = slots.findIndex(s => s.card === id), chosen = slots[selected].card === id;
      return <button type="button" key={id} className="loadout-choice" aria-label={`Equip ${c.name}`} aria-pressed={chosen} disabled={busy} onClick={() => equip(id)}><CardArt card={c} /><span><strong>{c.name}</strong><small>{energyLabel(c)}{at >= 0 && !chosen ? ` · move from slot ${at + 1}` : ''}</small></span>{chosen ? <Icon name="check" size={16} /> : <Icon name="plus" size={16} />}</button>;
     })}
    </div>
    {!compatible.filter(id => !card(p, id).addon).length && <p className="loadout-empty-note">No other compatible cards. Learn powers with Train, or collect items from quests and the merchant.</p>}
    {compatible.some(id => card(p, id).addon) && <div className="loadout-attachments"><h4>Attachments</h4>{compatible.filter(id => card(p, id).addon).map(id => <label key={id}><input type="checkbox" disabled={busy} checked={slots[selected].addons.includes(id)} onChange={() => attachment(id)} /><CardArt card={card(p, id)} /><span>{card(p, id).name}<small>{card(p, id).functionTrait} · one per function</small></span></label>)}</div>}
    {selectedId && <details className="loadout-card-rules" open><summary>Selected card · rules</summary><CardRules key={selectedId} value={card(p, selectedId)} /></details>}
   </aside>
  </div>
  <div className="loadout-announcement" role="status"><Icon name={dirty ? 'spark' : 'shield'} size={15} />{announcement}</div>
  <div className="equipment-refresh">{equipped(p, hero).filter(id => card(p, id).kind === 'power' && card(p, id).petHealth && next.includes(id)).map(id => <label className="addon-choice" key={id}><input type="checkbox" disabled={busy} checked={reEquip.includes(id)} onChange={e => setReEquip(v => e.target.checked ? [...v, id] : v.filter(x => x !== id))} /><span>Re-equip {card(p, id).name} · restore pet health ({hero.pets[id] ?? 0} / {petCapacity(p, hero, id)}) · pay equip cost again</span></label>)}</div>
  {excess > 0 && <section className="loadout-overflow" aria-label="Bag overflow"><h4>Make room in your bag</h4><p>Send {excess} item{excess === 1 ? '' : 's'} to the merchant · {discard.length} selected.</p><div className="discard-options">{bag.filter(id => !card(p, id).bagExempt).map(id => <label key={id}><input type="checkbox" disabled={busy || !discard.includes(id) && discard.length >= excess} checked={discard.includes(id)} onChange={e => setDiscard(v => e.target.checked ? [...v, id] : v.filter(a => a !== id))} />{card(p, id).name}</label>)}</div></section>}
  <footer className="loadout-footer">
   <div className="loadout-receipt" aria-live="polite"><span><Icon name="bolt" size={15} />{error ? `Energy available: ${hero.energy}` : `Energy: ${hero.energy} → ${preview.energy}`}<small>{error ? 'Resolve the selection below' : `After equipping · capacity ${capacity(p, preview).energy}`}</small></span><span><Icon name="layers" size={15} />Bag: {bagSize(p, bagAfter)} / 3<small>{bagAfter.length ? bagAfter.map(id => card(p, id).name).join(', ') : 'No stored items'}</small></span></div>
   {error && <p role="alert" className="loadout-error"><Icon name="help" size={15} />{error}</p>}
   <div className="loadout-confirm"><button type="button" className="quiet-button" disabled={!dirty || busy} onClick={reset}><Icon name="reset" size={14} />Reset changes</button><button type="button" className="gold-button" disabled={!!error || busy} onClick={() => send({ type: 'manage', hero: hero.id, slots, discard, reEquip })}><Icon name="check" size={16} />Confirm equipment</button></div>
  </footer>
 </div>;
}
