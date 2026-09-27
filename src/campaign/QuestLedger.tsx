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
const tierNames = { green: "Green", yellow: "Yellow", red: "Red" };
const tierLevels = { green: '2–3', yellow: '3–4', red: '4–5' };
export function QuestDecks({ state, side, legal = [], send }: { state: GameView; side: Faction; legal?: Command[]; send?: (c: Command) => void }) {
 const replacing = (state.reward?.replacementFaction ?? state.reward?.faction) === side;
 return <div className="quest-decks" aria-label={`Quest decks · ${factionLabel(side)}`}>{tiers.map(tier => {
  const count = state.deckCounts.quests[side][tier];
  const enabled = replacing && legal.some(c => c.type === 'quest' && c.tier === tier);
  return <button key={tier} className={`quest-deck ${tier} ${side}`} style={{backgroundPosition:`${tiers.indexOf(tier)*50}% ${side==='horde'?0:100}%`}} disabled={!enabled || !send} onClick={() => send?.({ type: 'quest', tier })} title={`${tierNames[tier]} deck: ${count} cards · level ${tierLevels[tier]}. Draw a replacement after completing a quest.`} aria-label={`${tierNames[tier]} quest deck · ${count} cards`}><b>{count}</b><span>{tierNames[tier]}<small>LEVEL {tierLevels[tier]}</small></span></button>;
 })}</div>;
}

export default function QuestLedger({ state, selected, onQuest, onInspect }: { state: GameView; selected?: string; onQuest: (id: string, region?: string) => void; onInspect: (id: string) => void }) {
 const root = useRef<HTMLElement>(null);
 const markers = questMarkers(p, state);
 useEffect(() => { root.current?.querySelector(`[data-quest="${selected}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [selected]);
 return <aside className="quest-ledger table-frame" ref={root}>
  <div className="ledger-heading"><Icon name="scroll"/><span>CALL TO ARMS<small>Quests and decks</small></span></div>
  {(['horde', 'alliance'] as const).map(side => {
   const quests = state.quests.map(id => p.quests.find(q => q.id === id)!).filter(q => q.faction === side);
   return <section className={`faction-quests ${side}`} key={side}>
    <header><FactionCrest faction={side}/><h3>{factionLabel(side)}</h3><span>{quests.length} ACTIVE</span></header>
    <QuestDecks state={state} side={side}/>
    {quests.map(q => {
     const active = markers.filter(m => m.quest.id === q.id), objective = q.spawns.find(s => s.color !== 'blue')!;
     return <article className={`table-quest ${q.tier} ${selected === q.id ? 'selected' : ''}`} key={q.id} data-quest={q.id}>
      <button className="quest-locate" onClick={() => onQuest(q.id, active[0]?.region ?? objective.region)} aria-label={`${questLabel(p,q.id)} · ${q.name} · show on map`}>
       <span className={`quest-reference ${side}`}>{questLabel(p,q.id)}</span><span><strong>{q.name}</strong><small>{active.map(m => regionName(m.region)).join(' · ') || regionName(objective.region)} · {active.reduce((n,m) => n + m.remaining,0)} objectives</small><em>{q.reward.xp} XP · {q.reward.gold} gold {q.reward.items.map(i => ` · ${i.draw}${deckSymbol[i.deck]}`).join('')}</em></span>
      </button>
      <button className="quest-inspect" aria-label={`Quest details: ${q.name}`} title="View quest card" onClick={() => onInspect(q.id)}><Icon name="book" size={13}/></button>
     </article>;
    })}
   </section>;
  })}
  <div className="ledger-foot"><Icon name="check" size={13}/>{state.completed.length} completed · grey deck is for setup only</div>
 </aside>;
}

export function QuestDetails({ quest, state, onClose, onLocate }: { quest: Quest; state: GameView; onClose: () => void; onLocate: (id: string) => void }) {
 const markers = questMarkers(p,state).filter(m => m.quest.id === quest.id);
 return <Modal title={quest.name} onClose={onClose} wide><div className="map-quest-detail"><QuestCard quest={quest}/><section>
  <span className={`quest-reference ${quest.faction}`}>{questLabel(p,quest.id)}</span><h3>{factionLabel(quest.faction)} · level {quest.level}</h3>
  <p>{rewardText(quest.reward)}</p><h4>Quest tokens on the map</h4>
  {markers.map(m => <button className="quiet-button" key={m.region} onClick={() => onLocate(m.region)}><Icon name="pin"/>{regionName(m.region)} · {m.remaining} remaining objectives</button>)}
  {!markers.length && <p>No objectives remain on the map for this quest.</p>}
  <h4>Creatures placed when drawn</h4>{quest.spawns.map((s,i) => <button className="quest-spawn" key={i} onClick={() => onLocate(s.region)}><CreatureGlyph type={s.creature}/><span className={`creature-dot ${s.color}`}/><span>{s.count} × {p.creatures.find(c => c.id === s.creature)!.name}<small>{regionName(s.region)} · {s.color === 'blue' ? "independent obstacle" : "quest objective"}</small></span><Icon name="pin" size={14}/></button>)}
  <p className="quest-note">Green and red objectives carry a faction token. Blue creatures stop travel and are not required to complete the quest. Completion awards rewards and a new quest from your chosen deck.</p>
 </section></div></Modal>;
}
