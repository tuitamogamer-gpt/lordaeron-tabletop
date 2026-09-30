import { GameIcon } from './GameIcon';
import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { character } from '../rules/common';
import { classDeck, equipped } from '../rules/inventory';
import type { Card, Command, Hero } from '../rules/model';
import { CardThumbnail } from './parts';
import { cardEnergyText } from './card-energy';

const PAGE_SIZE = 6;
export function energyLabel(c: Card): string {
 if (c.kind === 'talent') return 'Permanent talent';
 if (c.type === 'active') return `${c.energy} energy to equip · constant benefit`;
 if (c.type === 'instant') return `${cardEnergyText(c)} per use`;
 return c.energy ? `${c.energy} energy to use` : 'No energy cost';
}

export default function ClassDeck({ hero: h, inspect, legal = [], onLearn, send, selected = [], toggle }: { hero: Hero; inspect: (id: string) => void; legal?: Command[]; onLearn?: () => void; send?: (c: Command) => void; selected?: string[]; toggle?: (id: string) => void }) {
 const [tab, setTab] = useState<'powers' | 'talents'>('powers'), [level, setLevel] = useState(0), [page, setPage] = useState(0);
 const cls = character(p, h.id).classId, deck = classDeck(p, h), active = equipped(p, h);
 const cards = p.cards.filter(c => c.classId === cls && !c.printed && c.kind === (tab === 'powers' ? 'power' : 'talent')).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
 const filtered = cards.filter(c => !level || c.level === level);
 const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), visiblePage = Math.min(page, pageCount - 1), first = visiblePage * PAGE_SIZE;
 const total = selected.reduce((n, id) => n + p.cards.find(c => c.id === id)!.price, 0), canTrain = legal.some(c => c.type === 'train' && c.hero === h.id);
 const deckSize = deck.powers.length + deck.talents.length + h.learned.length + h.talents.length;
 return <section className="class-deck compact-class-deck portrait-class-deck" aria-label={`${cls} class deck`}>
  <div className="class-deck-heading"><div><span className="sheet-eyebrow">CLASS DECK · {deckSize} CARDS</span><h3>{cls} arts & talents</h3></div><span className="deck-purse" role="status" aria-label={`${toggle ? h.gold - total : h.gold} gold ${toggle && selected.length ? 'remaining after training' : 'available'}`}><GameIcon name="gold" />{toggle ? h.gold - total : h.gold}<small>{toggle && selected.length ? 'gold remaining' : 'gold available'}</small></span></div>
  <div className="class-deck-piles" aria-label="Class deck piles">{(['powers', 'talents'] as const).map(kind => <button key={kind} aria-pressed={tab === kind} onClick={() => { setTab(kind); setLevel(0); setPage(0); }}><span className={`class-deck-back ${kind}`} aria-hidden="true"><GameIcon name={kind === 'powers' ? 'train' : 'experience'} size={20} /></span><span><strong>{kind === 'powers' ? 'Power deck' : 'Talent deck'}</strong><small>{deck[kind].length} in deck · {kind === 'powers' ? h.learned.length : h.talents.length} {kind === 'powers' ? 'learned' : 'chosen'}</small><em>{kind === 'powers' ? 'Purchase with a Train or Town action' : 'Choose for free when you gain a level'}</em></span><b>{deck[kind].length}</b></button>)}</div>
  <p className="sheet-help">{tab === 'powers' ? 'Hover to enlarge · train powers, then equip during management.' : 'Hover to enlarge · choose one free, permanent talent at each new level.'}</p>
  <div className="class-deck-toolbar"><nav aria-label="Filter cards by level">{[0, 1, 2, 3, 4, 5].map(n => <button key={n} aria-pressed={level === n} onClick={() => { setLevel(n); setPage(0); }}>{n ? `Level ${n}` : 'All levels'}</button>)}</nav>{!toggle && tab === 'powers' && onLearn && <button className="gold-button" disabled={!canTrain} onClick={onLearn}>Train powers · 1 action</button>}</div>
  <div className="class-deck-cards">{filtered.slice(first, first + PAGE_SIZE).map(c => {
   const owned = (c.kind === 'power' ? h.learned : h.talents).includes(c.id), chosen = selected.includes(c.id), cost = total + (chosen ? 0 : c.price), talent = legal.find(a => a.type === 'talent' && a.hero === h.id && a.card === c.id);
   const locked = c.level > (c.kind === 'talent' ? (h.talentChoices[0] ?? h.level) : h.level), state = active.includes(c.id) ? 'Equipped' : owned ? (c.kind === 'power' ? 'In spellbook' : 'Chosen talent') : chosen ? 'Selected for training' : locked ? `Requires level ${c.level}` : c.kind === 'talent' ? h.talentChoices.length ? 'Ready to choose' : 'Choose on level up' : 'Ready to learn';
   return <div className={`deck-card-entry ${owned ? 'owned' : ''} ${chosen ? 'selected' : ''} ${locked ? 'level-locked' : ''}`} key={c.id}><span className="deck-card-state">{state}</span><CardThumbnail card={c} onClick={() => inspect(c.id)} selected={chosen} footer={c.kind === 'talent' ? 'Free on level up' : `${c.price} gold`} /><div className="deck-card-action"><span>{energyLabel(c)}</span>{toggle && tab === 'powers' && <button className={chosen ? 'gold-button' : 'quiet-button'} aria-pressed={chosen} disabled={owned || locked || (!chosen && cost > h.gold)} onClick={() => toggle(c.id)}>{owned ? 'Already learned' : chosen ? 'Remove from training' : locked ? 'Level too low' : cost > h.gold ? 'Not enough gold' : 'Add to training'}</button>}{c.kind === 'talent' && send && h.talentChoices.length > 0 && <button className="gold-button" disabled={!talent} onClick={() => talent && send(talent)}>Choose talent</button>}</div></div>;
  })}{!filtered.length && <p className="deck-empty">No {tab} at level {level}. Choose another level.</p>}</div>
  <div className="class-deck-footer"><span aria-live="polite">{filtered.length ? `${first + 1}–${Math.min(first + PAGE_SIZE, filtered.length)} of ${filtered.length} ${tab}` : `0 ${tab}`}{toggle && selected.length > 0 && <b> · {selected.length} selected</b>}</span><nav className="catalog-pagination" aria-label="Class deck pages"><button className="quiet-button" aria-label="Previous class deck page" disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}>‹ Previous</button><span>{visiblePage + 1} / {pageCount}</span><button className="quiet-button" aria-label="Next class deck page" disabled={visiblePage === pageCount - 1} onClick={() => setPage(visiblePage + 1)}>Next ›</button></nav></div>
 </section>;
}
