import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon, Modal } from '../components';
import { BASE_PACK as p } from '../data/base';
import type { GameView } from '../rules/view';
import { FactionCrest } from './Art';
import { regionName } from './event-text';
import { questLabel } from './map-state';
import { factionLabel } from './parts';
import { questObjectives } from './quest-design';
import { placementTotals, questDrawReceipt, questReceipt, type QuestReceipt, type QuestState } from './quest-activity';

function QuestPlacementSummary({ receipt }: { receipt: QuestReceipt }) {
 const totals = placementTotals(receipt);
 return <div className="quest-placement-totals" aria-label="Actual quest placement">
  <span><b>{totals.quests}</b> {receipt.kind === 'overview' ? 'active quests' : 'quests drawn'}</span><span><b>{totals.objectives}</b> objectives</span><span><b>{totals.blue}</b> blue creatures</span><span><b>{totals.tokens}</b> faction markers</span>
 </div>;
}

/** Exact seeded setup preview; it exposes no unopened deck order. */
export function QuestSetupPreview({ state }: { state: QuestState }) {
 const receipt = questReceipt(state, 'setup');
 return <section className="quest-setup-preview" aria-label="Starting quests and creature placement">
  <header><Icon name="scroll" size={23}/><div><h4>Your starting quests</h4><p>These are the cards drawn by this setup. Their named creatures and markers appear when you begin.</p></div></header>
  <QuestPlacementSummary receipt={receipt}/>
  <div className="quest-preview-factions">{(['horde', 'alliance'] as const).map(side => <section className={side} key={side}>
   <h5><FactionCrest faction={side}/>{factionLabel(side)} <small>{placementTotals(receipt, side).quests} cards</small></h5>
   {receipt.quests.filter(id => p.quests.find(q => q.id === id)!.faction === side).map((id, index) => {
    const q = p.quests.find(q => q.id === id)!;
    return <details className="quest-preview-card" key={id} style={{ '--quest-delay': `${index * 65}ms` } as CSSProperties}>
     <summary><b className={`quest-reference ${side}`}>{questLabel(p, id)}</b><span><strong>{q.name}</strong><small>{q.tier} · level {q.level} · {receipt.placements[id].filter(row => row.color !== 'blue').map(row => regionName(row.region)).join(' / ')}</small></span><Icon name="down" size={14}/></summary>
     <ul>{receipt.placements[id].map((row, n) => <li key={n}><i className={`creature-dot ${row.color}`}/><strong>{row.placed} × {p.creatures.find(c => c.id === row.creature)!.name}</strong><span>{regionName(row.region)} · {row.color === 'blue' ? 'independent obstacle' : `${factionLabel(side)} objective`}{row.placed < row.requested ? ` · ${row.requested - row.placed} unavailable in supply` : ''}</span></li>)}</ul>
    </details>;
   })}
  </section>)}</div>
  <p className="quest-preview-note"><Icon name="flag" size={15}/>Faction markers identify the green and red quest objectives. Blue creatures stop travel; clearing them does not complete a quest.</p>
 </section>;
}

export function QuestReveal({ receipt, state, onClose, onLocate }: { receipt: QuestReceipt; state: QuestState; onClose: () => void; onLocate?: (region: string, quest: string) => void }) {
 const [selected, setSelected] = useState(receipt.quests[0]);
 const quest = p.quests.find(q => q.id === selected) ?? p.quests.find(q => q.id === receipt.quests[0])!;
 const placements = receipt.placements[quest.id];
 const objectives = questObjectives(quest, state);
 const heading = receipt.kind === 'setup' ? 'Your starting quests are on the map' : receipt.kind === 'draw' ? 'A new quest enters play' : 'Your active quests';
 const locate = (region: string) => { onClose(); onLocate?.(region, quest.id); };
 return <Modal title={heading} wide className="quest-reveal-modal" onClose={onClose}>
  <div className="quest-reveal">
   <QuestPlacementSummary receipt={receipt}/>
   <p className="quest-reveal-intro">{receipt.kind === 'overview' ? 'Select a card to see its remaining objectives and their exact regions.' : `The game placed these figures automatically${receipt.kind === 'draw' ? ` on turn ${receipt.turn}` : ''}. Select any card to follow its objectives.`}</p>
   <div className="quest-reveal-grid"><div className="quest-reveal-journals" aria-label="Drawn quest cards">{(['horde', 'alliance'] as const).map(side => {
    const ids = receipt.quests.filter(id => p.quests.find(q => q.id === id)!.faction === side);
    if (!ids.length) return null;
    return <section key={side} className={side}><header><FactionCrest faction={side}/><h3>{factionLabel(side)}</h3><b>{ids.length}</b></header><div>{ids.map((id, index) => {
     const q = p.quests.find(q => q.id === id)!;
     return <button key={id} aria-pressed={quest.id === id} className={`quest-reveal-choice ${q.tier}`} onClick={() => setSelected(id)} style={{ '--quest-delay': `${index * 65}ms` } as CSSProperties}><span className={`quest-reference ${side}`}>{questLabel(p, id)}</span><span><strong>{q.name}</strong><small>{q.tier} · level {q.level}</small></span><Icon name="right" size={14}/></button>;
    })}</div></section>;
   })}</div><section className={`quest-reveal-detail ${quest.faction}`} key={quest.id} aria-label={`${quest.name} placement`}>
    <div className="quest-reveal-title"><span className={`quest-reference ${quest.faction}`}>{questLabel(p, quest.id)}</span><div><small>{factionLabel(quest.faction)} · {quest.tier} · level {quest.level}</small><h3>{quest.name}</h3></div></div>
    <div className="quest-reveal-reward"><Icon name="trophy" size={17}/><b>{quest.reward.xp} XP</b><Icon name="coins" size={17}/><b>{quest.reward.gold} gold</b><span>shared by the participating party</span></div>
    <h4>{receipt.kind === 'overview' ? 'Figures remaining on the map' : 'Figures placed when drawn'}</h4><div className="quest-reveal-spawns">{placements.map((row, index) => {
     const creature = p.creatures.find(c => c.id === row.creature)!;
     const objective = objectives.find(o => o.creature === row.creature && o.color === row.color && o.region === row.region);
     return <article className={`quest-reveal-spawn ${row.color}`} key={`${row.creature}:${row.region}:${row.color}`} style={{ '--quest-delay': `${index * 80}ms` } as CSSProperties}>
      <span className="quest-reveal-figure"><img src={`/assets/tokens/${row.creature}.webp`} alt=""/><i className={`creature-dot ${row.color}`}/><b aria-label={`${row.placed} ${row.color} ${creature.name} ${receipt.kind === 'overview' ? 'remaining' : 'placed'}`}>{row.placed}</b></span>
      <div><strong>{creature.name}</strong><small>{row.color === 'blue' ? 'BLUE · INDEPENDENT OBSTACLE' : `${row.color.toUpperCase()} · QUEST OBJECTIVE`}</small><button type="button" className="quest-placement-region" disabled={!onLocate} onClick={() => locate(row.region)}><Icon name="pin" size={14}/>{regionName(row.region)}{onLocate && <Icon name="arrow" size={13}/>}</button>{row.placed < row.requested && receipt.kind !== 'overview' && <p>{row.requested - row.placed} blue figure{row.requested - row.placed === 1 ? '' : 's'} could not be placed: supply exhausted.</p>}{objective && <p className="quest-placement-progress">{state.quests.includes(quest.id) ? `${objective.remaining} of ${objective.total} objectives remain here` : 'This quest has left the active journal'}</p>}</div>
      {row.color !== 'blue' && row.placed > 0 && <span className="quest-placement-marker" title={`${questLabel(p, quest.id)} faction marker at ${regionName(row.region)}`}><Icon name="flag" size={17}/><b>{questLabel(p, quest.id)}</b></span>}
     </article>;
    })}</div><p className="quest-reveal-rule"><Icon name="help" size={18}/>{placements.some(row => row.color === 'blue') ? 'Defeat every green and red objective to complete this quest. Blue creatures are separate encounters and stop your travel.' : 'Defeat every green and red objective to complete this quest. The matching faction marker identifies its region on the map.'}</p>
   </section></div>
   <footer className="quest-reveal-footer"><p><Icon name="eye" size={16}/>Select a region to locate its objectives. Open Quests at any time for current progress.</p><button className="gold-button" onClick={onClose}>Return to the map<Icon name="arrow" size={15}/></button></footer>
  </div>
 </Modal>;
}

/** Keeps a placement receipt outside the quest workspace so automated draws stay visible. */
export default function QuestActivity({ state, onLocate, suspended = false, autoRevealSetup = false, onOpenChange }: { state: GameView; onLocate?: (region: string, quest: string) => void; suspended?: boolean; autoRevealSetup?: boolean; onOpenChange?: (visible: boolean) => void }) {
 const previous = useRef<QuestState>(state);
 const notifyVisibility = useRef(onOpenChange); notifyVisibility.current = onOpenChange;
 const [latest, setLatest] = useState<QuestReceipt>(() => questReceipt(state, state.revision === 0 ? 'setup' : 'overview'));
 const [open, setOpen] = useState(autoRevealSetup);
 const [notice, setNotice] = useState('');
 const [fresh, setFresh] = useState(autoRevealSetup);
 const [overview, setOverview] = useState(false);
 const visible = open && !suspended && state.quests.length > 0;
 useEffect(() => {
  notifyVisibility.current?.(visible);
  return () => { notifyVisibility.current?.(false); };
 }, [visible]);
 useEffect(() => {
  const receipt = questDrawReceipt(previous.current, state);
  const finished = state.completed.filter(id => !previous.current.completed.includes(id));
  previous.current = state;
  if (receipt) {
   setLatest(receipt); setFresh(true); setOverview(false);
   setNotice(`${receipt.quests.map(id => p.quests.find(q => q.id === id)!.name).join(', ')} drawn. ${placementTotals(receipt).creatures} creatures placed on the map.`);
   setOpen(true);
  } else if (finished.length) setNotice(`${finished.map(id => p.quests.find(q => q.id === id)!.name).join(', ')} completed. Resolve rewards, then choose a replacement quest.`);
 }, [state]);
 const close = () => { setOpen(false); setFresh(false); };
 return <div className={`quest-activity ${fresh ? 'fresh' : ''}`}>
  <button type="button" className="quest-activity-overview" onClick={() => { setOverview(true); setOpen(true); }} aria-label={`Quest overview · ${state.quests.length} active`}><Icon name="scroll" size={17}/><span><strong>{state.quests.length} active quests</strong><small>View cards, creatures and markers</small></span><Icon name="right" size={14}/></button>
  {latest.kind !== 'overview' && <button type="button" className="quest-activity-replay" onClick={() => { setOverview(false); setOpen(true); }} aria-label={latest.kind === 'setup' ? 'Review starting quest placement' : 'Review latest quest draw'} title={latest.kind === 'setup' ? 'Review starting quest placement' : 'Review latest quest draw'}><Icon name={fresh ? 'spark' : 'pin'} size={16}/><span>{latest.kind === 'setup' ? 'Starting quests' : `${latest.quests.length} new quest${latest.quests.length === 1 ? '' : 's'}`}</span>{fresh && <b>NEW</b>}</button>}
  {notice && <span className="quest-activity-status" role="status">{notice}</span>}
  {visible && <QuestReveal receipt={overview ? questReceipt(state) : latest} state={state} onClose={close} onLocate={onLocate}/>}
 </div>;
}
