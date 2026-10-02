import { Icon } from '../components';
import type { Battle, Faction } from '../rules/model';
import { FactionCrest } from './Art';
import { AnimatedValue } from './feedback';
import { factionLabel } from './parts';

function TokenCount({ count, label, kind, caption }: { count: number; label: string; kind: 'hit' | 'armor'; caption: string }) {
 return <div className={`combat-token-count ${kind}`}>
  <span className="combat-counter-token" aria-hidden="true"><Icon name={kind === 'armor' ? 'shield' : 'swords'} size={18} /></span>
  <output aria-label={label}><AnimatedValue value={count} /></output><small>{caption}</small>
 </div>;
}

/** The board has three boxes: armor and red hits share the Defense box. */
export default function CombatArea({ battle, side, deadlyPvp = false }: { battle: Battle; side: Faction; deadlyPvp?: boolean }) {
 const box = battle.boxes[side], name = factionLabel(side), pve = battle.kind === 'pve';
 const resolving = battle.stage === 'resolution';
 const note = battle.stage === 'over' ? 'Combat is complete. These tokens no longer affect the battle.'
  : battle.stage === 'round-end' || battle.stage === 'wounds' && battle.afterWounds === 'round-end'
   ? pve ? `${box.damage} damage ${box.damage === 1 ? 'token stays' : 'tokens stay'} for the next round.` : 'Both factions clear their hit tokens before the next round.'
  : resolving ? pve ? 'Move melee and attrition hits into Damage; discard armor.' : deadlyPvp ? 'Each faction takes wounds equal to the opposing melee and attrition hits.' : 'Compare melee + attrition. The difference becomes wounds for the weaker side.'
  : pve ? 'Ranged strikes first. Melee hits and armor then block surviving enemies.' : 'Armor removes opposing hits. Melee hits wait for resolution.';
 return <section className={`combat-token-area ${side} ${resolving ? 'resolving' : ''}`} aria-label={`${name} totals`}>
  <h4><FactionCrest faction={side} />{name}<span>COMBAT AREA</span></h4>
  <div className="combat-token-boxes">
   <section className="combat-token-box damage" aria-label={`${name} damage box`}>
    <h5><Icon name="target" size={13} />Damage</h5>
    <TokenCount count={box.damage} label={`${name} ranged hits`} kind="hit" caption={pve ? 'Ranged + carried hits' : 'Ranged hits'} />
   </section>
   <section className="combat-token-box defense" aria-label={`${name} defense box`}>
    <h5><Icon name="shield" size={13} />Defense</h5>
    <TokenCount count={box.defense} label={`${name} melee hits`} kind="hit" caption="Melee hits" />
    <TokenCount count={box.armor} label={`${name} armor`} kind="armor" caption="Armor tokens" />
   </section>
   <section className="combat-token-box attrition" aria-label={`${name} attrition box`}>
    <h5><Icon name="flame" size={13} />Attrition</h5>
    <TokenCount count={box.attrition} label={`${name} attrition`} kind="hit" caption="Ability hits" />
   </section>
  </div>
  <p className="combat-token-flow"><Icon name={resolving ? 'arrow' : 'help'} size={14} /><span>{note}</span></p>
  {battle.wounds[side] > 0 && <div className="combat-wound-count"><Icon name="heart" /><strong>{battle.wounds[side]}</strong> wounds to assign</div>}
 </section>;
}
