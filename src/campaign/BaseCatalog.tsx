import { useEffect, useState } from 'react';
import { BASE_PACK as p, CLASS_CARDS, BASE_ITEMS } from '../data/base';
import { Icon, Modal } from '../components';
import { CharacterCard, CardThumbnail } from './parts';
import { CreatureCard, EventCardView, OverlordCard, QuestCard } from './design-system';
import type { Character, Creature, EventCard, Overlord, Quest } from '../rules/model';

const tabs = [['powers', 'Powers', 108], ['talents', 'Talents', 108], ['items', 'Items', 120], ['quests', 'Quests', 80], ['events', 'Events', 52], ['heroes', 'Heroes', 16], ['creatures', 'Bestiary', 13], ['bosses', 'Overlords', 3]] as const;
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
type Reference = Character | Creature | EventCard | Overlord | Quest;

function ReferenceCard({ entry }: { entry: Reference }) {
 if ('spawns' in entry) return <QuestCard quest={entry} />;
 if ('fate' in entry) return <EventCardView event={entry} />;
 if ('capacities' in entry) return <CharacterCard id={entry.id} />;
 if ('combat' in entry) return <OverlordCard overlord={entry} />;
 return <CreatureCard creature={entry} />;
}

export default function BaseCatalog({ inspect }: { inspect: (id: string) => void }) {
 const [tab, setTab] = useState<string>('powers');
 const [query, setQuery] = useState(''), [filter, setFilter] = useState('');
 const [sort, setSort] = useState('collection'), [offset, setOffset] = useState(0);
 const [reference, setReference] = useState<Reference | null>(null);
 const [width, setWidth] = useState(() => typeof window === 'undefined' ? 1280 : window.innerWidth);
 useEffect(() => {
  const resize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', resize);
  return () => window.removeEventListener('resize', resize);
 }, []);
 const abilities = ['powers', 'talents', 'items'].includes(tab);
 // A page is one row. Store its first card so resizing keeps the same part of the collection.
 const pageSize = width <= 600 ? 2 : abilities && width >= 1000 ? 6 : 3;
 const items = tab === 'quests' ? p.quests : tab === 'events' ? p.events : tab === 'heroes' ? p.characters : tab === 'creatures' ? p.creatures : tab === 'bosses' ? p.overlords : tab === 'items' ? BASE_ITEMS : CLASS_CARDS.filter(c => c.kind === (tab === 'talents' ? 'talent' : 'power'));
 const filtered = items.filter(c => (`${c.name} ${'classId' in c ? c.classId : ''} ${'faction' in c ? c.faction : ''}`).toLowerCase().includes(query.trim().toLowerCase()) && (!filter || ('classId' in c && c.classId === filter) || ('faction' in c && c.faction === filter) || ('deck' in c && c.deck === filter)));
 filtered.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'level' ? (('level' in a ? Number(a.level) : 0) - ('level' in b ? Number(b.level) : 0)) || a.name.localeCompare(b.name) : ('classId' in a ? a.classId ?? '' : '').localeCompare('classId' in b ? b.classId ?? '' : '') || (('level' in a ? Number(a.level) : 0) - ('level' in b ? Number(b.level) : 0)) || a.name.localeCompare(b.name));
 const filters = tab === 'quests' || tab === 'heroes' ? ['horde', 'alliance'] : tab === 'items' ? ['triangle', 'square', 'circle', 'special'] : ['powers', 'talents'].includes(tab) ? ['warrior', 'mage', 'hunter', 'priest', 'rogue', 'warlock', 'paladin', 'druid', 'shaman'] : [];
 const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)), visiblePage = Math.min(Math.floor(offset / pageSize), pageCount - 1);
 const first = visiblePage * pageSize, visibleCards = filtered.slice(first, first + pageSize);
 return <section className={`base-catalog card-gallery catalog-flow ${abilities ? 'portrait-gallery' : 'reference-gallery'}`} aria-label="Card library">
  <div className="catalog-intro"><div><span className="eyebrow">THE COMPLETE COLLECTION · 2005 + FAQ</span><h2>The Lordaeron library</h2><p>Explore the powers, talents and treasures of Azeroth.</p></div><label className="catalog-search"><Icon name="search" /><input value={query} placeholder="Find a card…" aria-label="Search the library" onChange={e => { setQuery(e.target.value); setOffset(0); }} /></label></div>
  <nav className="catalog-tabs" aria-label="Card collections">{tabs.map(([id, label, count]) => <button className={tab === id ? 'active' : ''} aria-pressed={tab === id} key={id} onClick={() => { setTab(id); setFilter(''); setOffset(0); if (!['powers', 'talents', 'items'].includes(id) && sort === 'level') setSort('collection'); }}>{label}<b>{count}</b></button>)}</nav>
  <div className="catalog-filter"><span className="catalog-result-count"><strong>{filtered.length}</strong> {tabs.find(([id]) => id === tab)?.[1].toLowerCase()}</span>{filters.length > 0 && <select value={filter} aria-label="Filter the library" onChange={e => { setFilter(e.target.value); setOffset(0); }}><option value="">All {tab === 'items' ? 'decks' : tab === 'quests' || tab === 'heroes' ? 'factions' : 'classes'}</option>{filters.map(f => <option value={f} key={f}>{titleCase(f)}</option>)}</select>}<select value={sort} aria-label="Sort the library" onChange={e => { setSort(e.target.value); setOffset(0); }}><option value="collection">Collection order</option><option value="name">Name · A–Z</option>{abilities && <option value="level">Level · low to high</option>}</select><span className="gallery-browse-hint">{abilities ? 'Hover to enlarge · click to inspect' : 'Click a card to read its full rules'}</span></div>
  <div className="gallery-shelf"><div className="base-card-grid">{visibleCards.map(c => 'abilities' in c ? <CardThumbnail key={c.id} card={c} onClick={() => inspect(c.id)} footer={c.kind === 'talent' ? 'Permanent talent' : c.classId ? titleCase(c.classId) : `${c.price} gold`} /> : <div className="catalog-reference-entry" key={c.id}><div className="catalog-reference-face" aria-hidden="true"><ReferenceCard entry={c} /></div><button type="button" className="catalog-reference-open" aria-label={`Inspect ${c.name}`} onClick={() => setReference(c)}><span>Read full rules <Icon name="arrow" size={13} /></span></button></div>)}</div>{!filtered.length && <div className="gallery-empty"><Icon name="search" /><h3>No cards found</h3><p>Try another name or choose a different filter.</p><button className="quiet-button" onClick={() => { setQuery(''); setFilter(''); setOffset(0); }}>Clear search & filters</button></div>}</div>
  <div className="gallery-footer"><span className="gallery-range" aria-live="polite">{filtered.length ? `${first + 1}–${Math.min(first + pageSize, filtered.length)} of ${filtered.length} cards` : '0 cards'}</span><nav className="catalog-pagination" aria-label="Library card pages"><button className="quiet-button" disabled={visiblePage === 0} aria-label="Previous page" onClick={() => setOffset((visiblePage - 1) * pageSize)}>‹ Previous</button><span>Page <b>{visiblePage + 1}</b> of {pageCount}</span><button className="quiet-button" aria-label="Next page" disabled={visiblePage === pageCount - 1} onClick={() => setOffset((visiblePage + 1) * pageSize)}>Next ›</button></nav><span className="gallery-footer-note">{abilities ? 'Every card, in full view' : 'Browse the collection'}</span></div>
  {reference && <Modal title={reference.name} className="catalog-reference-modal" onClose={() => setReference(null)}><div className="catalog-reference-detail"><div className="catalog-detail-art" aria-hidden="true"><ReferenceCard entry={reference} /></div><div className="catalog-detail-rules"><ReferenceCard entry={reference} /><a className="source-link" href={reference.source.url} target="_blank" rel="noreferrer">Original card ↗</a></div></div></Modal>}
 </section>;
}
