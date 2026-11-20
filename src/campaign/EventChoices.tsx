import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { card, character } from '../rules/common';
import { bagSize } from '../rules/inventory';
import type { Command, Hero } from '../rules/model';
import CardPortrait from './CardPortrait';
import { GameIcon } from './GameIcon';
import { CardThumbnail, HeroPortrait, pretty } from './parts';
import { byTouch } from './pointer';

/**
 * Choices among cards are made on the cards. A player who is offered "Rakzur Club" by name does not know what it is: every
 * choice here shows the card's face, and beside it what the choice costs or brings.
 */

/** An amount of gold with the game's gold token. `was` is the printed price that an Event has cut. */
export function GoldAmount({ amount, was, sign = '' }: { amount: number; was?: number; sign?: '' | '+' }) {
 return <span className="gold-amount" aria-label={`${sign}${amount} gold${was !== undefined && was !== amount ? `, printed price ${was}` : ''}`}>
  {was !== undefined && was !== amount && <s aria-hidden="true">{was}</s>}<GameIcon name="gold" size={18} /><b aria-hidden="true">{sign}{amount}</b>
 </span>;
}

/** Which card leaves a full bag: the cards themselves, one of them chosen. `none` is the way to keep everything. */
export function DiscardPicker({ label, caption = label, options, value, onChange, incoming, none, disabled = false }: { label: string; /** The words shown above the cards, where the full label is too long for the place. */caption?: string; options: string[]; value?: string; onChange: (id?: string) => void; /** The card being received: discarding it means not keeping it. */incoming?: string; none?: string; disabled?: boolean }) {
 return <div className="discard-picker" role="group" aria-label={label}>
  <span className="discard-picker-label">{caption}</span>
  <div className="discard-picker-cards">
   {none && <button type="button" aria-pressed={!value} className={`discard-none ${!value ? 'selected' : ''}`} disabled={disabled} onClick={() => onChange(undefined)}>{none}</button>}
   {options.map(id => <span key={id} className={`discard-option ${id === value ? 'selected' : ''}`}>
    <CardThumbnail card={card(p, id)} selected={id === value} pressed={id === value} disabled={disabled} actionLabel={id === incoming ? `Do not keep ${pretty(card(p, id).name)}` : `Discard ${pretty(card(p, id).name)}`} onClick={() => onChange(id)} footer={id === incoming ? 'The new item' : 'In your bag'} />
    <small>{id === incoming ? 'New item' : pretty(card(p, id).name)}</small>
   </span>)}
  </div>
 </div>;
}

type Choice = Extract<Command, { type: 'event-choice' }>;
/** Two rows of at most eight cards: a merchant's whole shelf is seen at once. */
const PAGE = 16;

/**
 * Traveling Merchants, Goblin Merchant and a Boss's tribute: the items lie on the table as cards, each with what it costs
 * (the printed price struck through beside the halved one) or what selling it brings.
 */
export function EventItemChoices({ kind, hero, merchant, choices, send, inspect }: { kind: 'merchants' | 'sell' | 'tribute'; hero: Hero; merchant: string[]; choices: Choice[]; send: (c: Command) => void; inspect: (id: string) => void }) {
 const [page, setPage] = useState(0), [pending, setPending] = useState<string>(), [discard, setDiscard] = useState<string>();
 const name = character(p, hero.id).name.split(' ')[0], shelf = kind === 'merchants' ? merchant : hero.bag;
 const skip = choices.find(c => c.choice.mode === 'skip');
 const price = (id: string) => kind === 'merchants' ? Math.ceil(card(p, id).price / 2) : Math.floor(card(p, id).price / 2);
 // Buying an item only to hand it straight back is no purchase: the overflow choices are the cards already in the bag.
 const optionsFor = (id: string) => choices.filter(c => c.choice.card === id && !(kind === 'merchants' && c.choice.discard === id));
 const pages = Math.max(1, Math.ceil(shelf.length / PAGE)), current = Math.min(page, pages - 1);
 const buying = pending && shelf.includes(pending) ? pending : undefined, overflow = buying ? optionsFor(buying) : [];
 const chosen = overflow.find(c => c.choice.discard === discard) ?? overflow[0];
 const act = (id: string) => { const options = optionsFor(id); if (options.length === 1 && !options[0].choice.discard) send(options[0]); else if (options.length) { setPending(id); setDiscard(options[0].choice.discard); } };
 return <section className={`event-items event-items-${kind}`} aria-label={kind === 'merchants' ? 'Items for sale at half price' : kind === 'sell' ? 'Items you can sell' : 'Items you can contribute'}>
  <header className="event-purse">
   <HeroPortrait id={hero.id} small />
   <span><strong>{character(p, hero.id).name}</strong><small>{kind === 'merchants' ? `Bag ${bagSize(p, hero.bag)} / 3 · one purchase` : kind === 'sell' ? 'One sale, for half the printed price' : 'One item goes to the Boss’s stash'}</small></span>
   <span className="event-purse-gold"><GameIcon name="gold" size={22} /><b>{hero.gold}</b> gold</span>
   <em>{byTouch() ? 'Tap' : 'Hover'} a card to read it in full.</em>
  </header>
  {buying && chosen ? <div className="event-overflow">
   <div className="event-item selected"><span className="event-overflow-card"><CardPortrait card={card(p, buying)} /></span><strong className="event-item-name">{pretty(card(p, buying).name)}</strong><GoldAmount amount={price(buying)} was={card(p, buying).price} /></div>
   <div className="event-overflow-choice">
    <h3>{name}’s bag is full</h3>
    <p>Buying {pretty(card(p, buying).name)} sends one item from the bag to the merchant. Choose which.</p>
    <DiscardPicker label="Discard to make room" options={overflow.map(c => c.choice.discard!).filter(Boolean)} value={chosen.choice.discard} onChange={setDiscard} />
    <div className="event-overflow-actions"><button className="quiet-button" onClick={() => setPending(undefined)}>← Back to the items</button><button className="gold-button" onClick={() => send(chosen)}>Buy for {price(buying)} gold · discard {pretty(card(p, chosen.choice.discard!).name)}</button></div>
   </div>
  </div> : <>
   <div className="event-item-grid" style={{ ['--event-items' as string]: shelf.length <= 6 ? Math.max(3, shelf.length) : Math.min(8, Math.ceil(Math.min(shelf.length - current * PAGE, PAGE) / 2)) }}>
    {shelf.slice(current * PAGE, (current + 1) * PAGE).map((id, i) => {
     const c = card(p, id), options = optionsFor(id), cost = price(id);
     const reason = options.length ? '' : kind === 'merchants' ? `Needs ${cost} gold` : c.soulbound ? 'Soulbound: stays with you' : 'Cannot be chosen';
     return <div key={`${id}-${i}`} className={`event-item ${options.length ? '' : 'unavailable'}`}>
      <CardThumbnail card={c} onClick={() => inspect(id)} footer={kind === 'merchants' ? `Half price: ${cost} gold` : kind === 'sell' ? `Sells for ${cost} gold` : 'Tribute'} />
      <strong className="event-item-name">{pretty(c.name)}</strong>
      {kind === 'merchants' ? <GoldAmount amount={cost} was={c.price} /> : kind === 'sell' ? <GoldAmount amount={cost} sign="+" /> : null}
      <button className="gold-button" disabled={!options.length} aria-label={`${kind === 'merchants' ? 'Buy' : kind === 'sell' ? 'Sell' : 'Contribute'} ${pretty(c.name)}${kind === 'tribute' ? '' : ` for ${cost} gold`}`} onClick={() => act(id)}>{reason || (kind === 'merchants' ? `Buy · ${cost} gold` : kind === 'sell' ? `Sell · +${cost} gold` : 'Contribute')}</button>
     </div>;
    })}
    {!shelf.length && <p className="event-items-empty">{kind === 'merchants' ? 'The merchant has nothing to sell.' : `${name}’s bag is empty.`}</p>}
   </div>
   {pages > 1 && <div className="catalog-pagination"><button className="quiet-button" aria-label="Previous items" disabled={!current} onClick={() => setPage(current - 1)}>←</button><span>{current + 1} / {pages}</span><button className="quiet-button" aria-label="Next items" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>→</button></div>}
   {skip && <button className="quiet-button event-items-skip" onClick={() => send(skip)}>{kind === 'merchants' ? 'Buy nothing' : 'Sell nothing'}</button>}
  </>}
 </section>;
}

/**
 * Another Path to Power: each talent slot shows the talent in it; the talents that may replace it are laid out as cards.
 * A talent already standing in another slot cannot be taken twice.
 */
export function RetrainChoices({ hero, gold, skip, send, inspect }: { hero: Hero; gold?: Command; skip?: Command; send: (c: Command) => void; inspect: (id: string) => void }) {
 const [talents, setTalents] = useState([...hero.talents]), [slot, setSlot] = useState(0);
 const name = character(p, hero.id).name.split(' ')[0], classId = character(p, hero.id).classId;
 const limit = card(p, hero.talents[slot]).level;
 const options = p.cards.filter(c => c.kind === 'talent' && c.classId === classId && c.level <= limit);
 const changed = talents.some((id, i) => id !== hero.talents[i]);
 return <div className="retrain-editor retrain-cards">
  <div className="retrain-slots" role="tablist" aria-label="Talents to replace">
   {hero.talents.map((id, i) => <button key={id} type="button" role="tab" aria-selected={i === slot} className={`retrain-slot ${i === slot ? 'selected' : ''} ${talents[i] !== id ? 'changed' : ''}`} onClick={() => setSlot(i)} aria-label={`Talent ${i + 1}: ${pretty(card(p, talents[i]).name)}${talents[i] !== id ? `, replacing ${pretty(card(p, id).name)}` : ''}`}>
    <span className="retrain-slot-card"><CardPortrait card={card(p, talents[i])} /></span>
    <span><small>Talent {i + 1} · level {card(p, id).level} or lower</small><strong>{pretty(card(p, talents[i]).name)}</strong>{talents[i] !== id && <em>replaces {pretty(card(p, id).name)}</em>}</span>
   </button>)}
  </div>
  <div className="retrain-options" role="radiogroup" aria-label={`Replacement for ${card(p, hero.talents[slot]).name}`}>
   {options.map(c => {
    const elsewhere = talents.some((id, i) => i !== slot && id === c.id), current = talents[slot] === c.id;
    return <div key={c.id} className={`retrain-option ${current ? 'selected' : ''} ${elsewhere ? 'unavailable' : ''}`}>
     <CardThumbnail card={c} selected={current} onClick={() => inspect(c.id)} footer={`Level ${c.level} talent`} />
     <button type="button" role="radio" aria-checked={current} className="quiet-button" disabled={elsewhere} onClick={() => setTalents(v => v.map((t, i) => i === slot ? c.id : t))} aria-label={`Take ${pretty(c.name)} as talent ${slot + 1}`}>{current ? (c.id === hero.talents[slot] ? 'Kept' : 'Chosen') : elsewhere ? 'In another slot' : c.id === hero.talents[slot] ? 'Keep' : 'Take'}</button>
    </div>;
   })}
  </div>
  <div className="retrain-actions">
   {skip && <button className="quiet-button" onClick={() => send(skip)}>Keep every talent</button>}
   {gold && <button className="quiet-button" onClick={() => send(gold)}>Take <GoldAmount amount={hero.level * 2} /> instead</button>}
   <button className="gold-button" disabled={!changed || new Set(talents).size !== talents.length} onClick={() => send({ type: 'event-choice', hero: hero.id, choice: { mode: 'talents', talents } })}>Confirm {name}’s talents</button>
  </div>
 </div>;
}
