import { BASE_PACK as p } from '../data/base';
import type { Counsel } from '../ai/council';
import { ORDER_MODES, type OrderMode, type Orders } from '../ai/orders';
import { Icon } from '../components';
import { capacity, character, listed } from '../rules/common';
import type { GameView } from '../rules/view';
import { regionName } from './event-text';
import { factionLabel, HeroPortrait } from './parts';
import { ORDER_WORDS } from './party-plan';

const first = (id: string) => character(p, id).name.split(' ')[0];

/**
 * The council before a faction's turn. Each bot beside the player says what it would do if it went its own way, if it came
 * with the player's character, and if the player came with it; the player chooses one for each, and the bots keep to it
 * (ai/orders.ts). The lines are the planner's own plans under each agreement (ai/council.ts), and looking at one shows
 * its region on the map behind the panel.
 */
export default function PartyPlan({ state, orders, counsel, ask, holding, onChoose, onLook, onAsk, onPlay, onAlliesFirst }: {
 state: GameView; orders: Orders; counsel?: Counsel[];
 /** Whether the council opens by itself before every turn. */
 ask: boolean; onAsk: (on: boolean) => void;
 /** The player's own characters still have actions: the allies wait for them unless told to go first. */
 holding: boolean;
 onChoose: (heroes: string[], mode: OrderMode) => void;
 /** The region and the character an option is about, for the map; nothing when the pointer leaves. */
 onLook: (look?: { region: string; hero: string }) => void;
 onPlay: () => void; onAlliesFirst?: () => void;
}) {
 const allies = state.heroes.filter(h => orders[h.id] && character(p, h.id).faction === state.faction);
 const partners = [...new Set(allies.flatMap(h => orders[h.id].partners))];
 const you = listed(partners.map(first));
 return <div className="dialog-content party-plan">
  <header className="party-plan-intro"><span className="sheet-eyebrow">{factionLabel(state.faction)} · turn {state.turn} · before you play</span><h3>Who goes where?</h3>
   <p>Agree with your {allies.length === 1 ? 'ally' : 'allies'} before you play. The plan holds until you change it under <b>Party plan</b>.</p></header>
  {allies.length > 1 && <div className="party-plan-presets" role="group" aria-label="One plan for every ally">{ORDER_MODES.map(mode => <button key={mode} type="button" className="quiet-button" aria-pressed={allies.every(h => orders[h.id].mode === mode)} onClick={() => onChoose(allies.map(h => h.id), mode)}><Icon name={ORDER_WORDS[mode].icon} size={14} />{mode === 'alone' ? 'All alone' : mode === 'follow' ? 'All with me' : 'They lead'}</button>)}</div>}
  <ul className="party-plan-allies">{allies.map(h => {
   const d = character(p, h.id), cap = capacity(p, h), said = counsel?.find(c => c.hero === h.id), chosen = orders[h.id].mode;
   return <li key={h.id}>
    <div className="party-plan-ally"><HeroPortrait id={h.id} small /><span><strong>{d.name}</strong><small>{d.classId} · level {h.level} · {regionName(h.location)}</small></span>
     <span className="party-plan-vitals"><i><Icon name="heart" size={12} />{h.health}/{cap.health}</i><i><Icon name="bolt" size={12} />{h.energy}/{cap.energy}</i><i><Icon name="coins" size={12} />{h.gold}</i></span></div>
    <div className="party-plan-options" role="radiogroup" aria-label={`Plan for ${first(h.id)}`}>{ORDER_MODES.map(mode => {
     const words = ORDER_WORDS[mode], proposal = said?.proposals.find(v => v.mode === mode), look = () => onLook(proposal?.region ? { region: proposal.region, hero: h.id } : undefined);
     return <button key={mode} type="button" role="radio" aria-checked={chosen === mode} className={`party-plan-option ${mode} ${chosen === mode ? 'chosen' : ''}`}
      onClick={() => onChoose([h.id], mode)} onPointerEnter={look} onPointerLeave={() => onLook()} onFocus={look} onBlur={() => onLook()}>
      <span className="party-plan-mark" aria-hidden="true"><Icon name={words.icon} size={16} /></span>
      <span className="party-plan-words"><strong>{mode === 'follow' ? `Come with ${partners.length > 1 ? you : 'me'}` : mode === 'lead' ? `Lead, ${partners.length > 1 ? 'we follow' : 'I follow'}` : words.label}{said?.suggested === mode && <em>{first(h.id)} suggests</em>}</strong>
       <small>{proposal ? proposal.text : counsel ? words.note : `${first(h.id)} is thinking it over…`}</small></span>
     </button>;
    })}</div>
   </li>;
  })}</ul>
  <footer className="party-plan-foot">
   <label className="party-plan-ask"><input type="checkbox" checked={ask} onChange={e => onAsk(e.target.checked)} />Ask me before every turn</label>
   <span className="party-plan-actions">{holding && onAlliesFirst && <button type="button" className="quiet-button" title="Your allies act before your own characters this turn" onClick={onAlliesFirst}>Allies first</button>}
    <button type="button" className="gold-button" autoFocus onClick={onPlay}>Play the turn<Icon name="arrow" size={15} /></button></span>
  </footer>
 </div>;
}
