import { useEffect, useRef } from 'react';
import { Icon, Modal } from '../components';
import { BASE_PACK as p } from '../data/base';
import type { Command, Faction, Quest, Tier } from '../rules/model';
import type { GameView } from '../rules/view';
import { FactionCrest } from './Art';
import { CreatureGlyph, QuestCard } from './design-system';
import { deckSymbol, regionName, rewardText } from './event-text';
import { factionLabel } from './parts';
import { questLabel, questMarkers } from './map-state';

const tiers: Exclude<Tier, 'grey'>[] = ['green', 'yellow', 'red'];
const tierNames = { green: 'Zeleni', yellow: 'Žuti', red: 'Crveni' };
const tierLevels = { green: '2–3', yellow: '3–4', red: '4–5' };
export function QuestDecks({ state, side, legal = [], send }: { state: GameView; side: Faction; legal?: Command[]; send?: (c: Command) => void }) {
 const replacing = (state.reward?.replacementFaction ?? state.reward?.faction) === side;
 return <div className="quest-decks" aria-label={`Quest špilovi · ${factionLabel(side)}`}>{tiers.map(tier => {
  const count = state.deckCounts.quests[side][tier];
  const enabled = replacing && legal.some(c => c.type === 'quest' && c.tier === tier);
  return <button key={tier} className={`quest-deck ${tier}`} disabled={!enabled || !send} onClick={() => send?.({ type: 'quest', tier })} title={`${tierNames[tier]} špil: ${count} karata · nivo ${tierLevels[tier]}. Zamjena nakon dovršenog questa.`} aria-label={`${tierNames[tier]} quest špil · ${count} karata`}><Icon name="scroll" size={17}/><b>{count}</b><span>{tierNames[tier]}<small>NIVO {tierLevels[tier]}</small></span></button>;
 })}</div>;
}

export default function QuestLedger({ state, selected, onQuest, onInspect }: { state: GameView; selected?: string; onQuest: (id: string, region?: string) => void; onInspect: (id: string) => void }) {
 const root = useRef<HTMLElement>(null);
 const markers = questMarkers(p, state);
 useEffect(() => { root.current?.querySelector(`[data-quest="${selected}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [selected]);
 return <aside className="quest-ledger table-frame" ref={root}>
  <div className="ledger-heading"><Icon name="scroll"/><span>POZIV NA ORUŽJE<small>Questovi i špilovi</small></span></div>
  {(['horde', 'alliance'] as const).map(side => {
   const quests = state.quests.map(id => p.quests.find(q => q.id === id)!).filter(q => q.faction === side);
   return <section className={`faction-quests ${side}`} key={side}>
    <header><FactionCrest faction={side}/><h3>{factionLabel(side)}</h3><span>{quests.length} AKTIVNIH</span></header>
    <QuestDecks state={state} side={side}/>
    {quests.map(q => {
     const active = markers.filter(m => m.quest.id === q.id), objective = q.spawns.find(s => s.color !== 'blue')!;
     return <article className={`table-quest ${q.tier} ${selected === q.id ? 'selected' : ''}`} key={q.id} data-quest={q.id}>
      <button className="quest-locate" onClick={() => onQuest(q.id, active[0]?.region ?? objective.region)} aria-label={`${questLabel(p,q.id)} · ${q.name} · pokaži na mapi`}>
       <span className={`quest-reference ${side}`}>{questLabel(p,q.id)}</span><span><strong>{q.name}</strong><small>{active.map(m => regionName(m.region)).join(' · ') || regionName(objective.region)} · {active.reduce((n,m) => n + m.remaining,0)} meta</small><em>{q.reward.xp} XP · {q.reward.gold} zlata {q.reward.items.map(i => ` · ${i.draw}${deckSymbol[i.deck]}`).join('')}</em></span>
      </button>
      <button className="quest-inspect" aria-label={`Detalji questa ${q.name}`} title="Pogledaj quest kartu" onClick={() => onInspect(q.id)}><Icon name="book" size={13}/></button>
     </article>;
    })}
   </section>;
  })}
  <div className="ledger-foot"><Icon name="check" size={13}/>{state.completed.length} dovršenih · sivi špil samo pri postavljanju</div>
 </aside>;
}

export function QuestDetails({ quest, state, onClose, onLocate }: { quest: Quest; state: GameView; onClose: () => void; onLocate: (id: string) => void }) {
 const markers = questMarkers(p,state).filter(m => m.quest.id === quest.id);
 return <Modal title={quest.name} onClose={onClose} wide><div className="map-quest-detail"><QuestCard quest={quest}/><section>
  <span className={`quest-reference ${quest.faction}`}>{questLabel(p,quest.id)}</span><h3>{factionLabel(quest.faction)} · nivo {quest.level}</h3>
  <p>{rewardText(quest.reward)}</p><h4>Quest tokeni na mapi</h4>
  {markers.map(m => <button className="quiet-button" key={m.region} onClick={() => onLocate(m.region)}><Icon name="pin"/>{regionName(m.region)} · {m.remaining} preostalih meta</button>)}
  {!markers.length && <p>Na mapi nema preostalih ciljeva ovog questa.</p>}
  <h4>Stvorenja pri izvlačenju karte</h4>{quest.spawns.map((s,i) => <button className="quest-spawn" key={i} onClick={() => onLocate(s.region)}><CreatureGlyph type={s.creature}/><span className={`creature-dot ${s.color}`}/><span>{s.count} × {p.creatures.find(c => c.id === s.creature)!.name}<small>{regionName(s.region)} · {s.color === 'blue' ? 'nezavisna prepreka' : 'quest cilj'}</small></span><Icon name="pin" size={14}/></button>)}
  <p className="quest-note">Zeleni i crveni ciljevi nose token frakcije. Plava stvorenja zaustavljaju putovanje; nisu potrebna za dovršetak questa. Po završetku slijede nagrade i novi quest iz izabranog špila.</p>
 </section></div></Modal>;
}
