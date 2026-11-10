import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../components';
import type { Battle, Faction } from '../rules/model';
import { FactionCrest } from './Art';
import { AnimatedValue } from './feedback';
import { factionLabel } from './parts';
import { SCANS } from './scan-assets';

/** How many tokens each circle draws before the rest is shown as "+n"; the count badge always has the exact number. */
const ROOM = { damage: 12, defense: 6, armor: 6, attrition: 5 } as const;

/** Tokens laid in a circle as on the printed board: a red hit token per hit, a green armor token per armor. */
function TokenPile({ count, kind, room }: { count: number; kind: 'hit' | 'armor'; room: number }) {
 const printed = SCANS.tokens[kind], shown = Math.min(count, room);
 return <span className={`combat-token-pile ${kind}`} aria-hidden="true">
  {Array.from({ length: shown }, (_, i) => printed
   ? <img key={i} src={printed} alt="" width={40} height={40} draggable={false} style={{ '--i': i } as CSSProperties} />
   : <i key={i} className="combat-token-dot" style={{ '--i': i } as CSSProperties} />)}
  {count > room && <b className="combat-token-more">+{count - room}</b>}
 </span>;
}

/** One printed field: its label plate, the dice colour that feeds it, its tokens and an exact count. */
function Field({ kind, name, label, children }: { kind: 'damage' | 'defense' | 'attrition'; name: string; label: string; children: ReactNode }) {
 return <section className={`combat-token-box ${kind}`} aria-label={`${name} ${kind} box`}>
  <h5>{label}</h5>
  {children}
 </section>;
}

function Count({ count, label, kind }: { count: number; label: string; kind: string }) {
 return <output className={`combat-token-count ${kind}`} aria-label={label}><AnimatedValue value={count} /></output>;
}

/**
 * The Combat Area printed on the board: three overlapping circles. Ranged hits (blue dice) go to Damage; melee hits (red dice) and armor
 * (green dice) to Defense; ability hits to Attrition. Each circle holds the tokens themselves, with the exact count on a badge.
 */
export default function CombatArea({ battle, side, deadlyPvp = false }: { battle: Battle; side: Faction; deadlyPvp?: boolean }) {
 const box = battle.boxes[side], name = factionLabel(side), pve = battle.kind === 'pve';
 const resolving = battle.stage === 'resolution';
 const note = battle.stage === 'over' ? 'Combat is complete. These tokens no longer affect the battle.'
  : battle.stage === 'round-end' || battle.stage === 'wounds' && battle.afterWounds === 'round-end'
   ? pve ? `${box.damage} damage ${box.damage === 1 ? 'token stays' : 'tokens stay'} for the next round.` : 'Both factions clear their hit tokens before the next round.'
  : resolving ? pve ? 'Move melee and attrition hits into Damage; discard armor.' : deadlyPvp ? 'Each faction takes wounds equal to the opposing melee and attrition hits.' : 'Compare melee + attrition. The difference becomes wounds for the weaker side.'
  : pve ? 'Ranged strikes first. Melee hits and armor then block surviving enemies.' : 'Armor removes opposing hits. Melee hits wait for resolution.';
 return <section className={`combat-token-area ${side} ${resolving ? 'resolving' : ''}`} aria-label={`${name} totals`}>
  <h4><FactionCrest faction={side} />{name}<span>COMBAT AREA · ROUND {battle.round}</span></h4>
  <div className="combat-board">
   <div className="combat-token-boxes">
    <Field kind="damage" name={name} label="Damage">
     <span className="combat-die-chip blue" title="Blue dice: ranged hits" />
     <TokenPile count={box.damage} kind="hit" room={ROOM.damage} />
     <Count count={box.damage} label={`${name} ranged hits`} kind="hit" />
    </Field>
    <Field kind="defense" name={name} label="Defense">
     <span className="combat-die-chip red" title="Red dice: melee hits" />
     <span className="combat-die-chip green" title="Green dice: armor" />
     <TokenPile count={box.defense} kind="hit" room={ROOM.defense} />
     <TokenPile count={box.armor} kind="armor" room={ROOM.armor} />
     <Count count={box.defense} label={`${name} melee hits`} kind="hit" />
     <Count count={box.armor} label={`${name} armor`} kind="armor" />
    </Field>
    <Field kind="attrition" name={name} label="Attrition">
     <TokenPile count={box.attrition} kind="hit" room={ROOM.attrition} />
     <Count count={box.attrition} label={`${name} attrition`} kind="hit" />
    </Field>
   </div>
   <dl className="combat-board-key">
    <div className="damage"><dt><span className="combat-die-chip blue" />Damage</dt><dd>{pve ? 'Ranged and carried hits' : 'Ranged hits'}</dd></div>
    <div className="defense"><dt><span className="combat-die-chip red" />Defense</dt><dd>Melee hits · <span className="combat-die-chip green" />armor</dd></div>
    <div className="attrition"><dt><span className="combat-die-chip hit" />Attrition</dt><dd>Hits from abilities</dd></div>
   </dl>
  </div>
  <p className="combat-token-flow"><Icon name={resolving ? 'arrow' : 'help'} size={14} /><span>{note}</span></p>
  {battle.wounds[side] > 0 && <div className="combat-wound-count"><Icon name="heart" /><strong>{battle.wounds[side]}</strong> wounds to assign</div>}
 </section>;
}
