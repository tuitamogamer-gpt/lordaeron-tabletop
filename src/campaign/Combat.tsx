import { useEffect, useState } from 'react';
import { Icon, Modal } from '../components';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character, faction } from '../rules/common';
import { stats } from '../rules/combat';
import { immune } from '../rules/effects';
import { commandLabel } from '../rules/legal';
import type { Attack, BattleStage, Color, Command, Die, Pool } from '../rules/model';
import type { GameView } from '../rules/view';
import { FactionCrest } from './Art';
import CombatAbilities, { type AbilityCommand } from './CombatAbilities';
import D8 from './D8';
import RulesText from './RulesText';
import CombatScene from './CombatScene';
import { AnimatedValue, ThreatLevel } from './feedback';
import { combatStep, combatSteps } from './combat-flow';
import { BossPortrait, CreatureGlyph, creatureRules } from './design-system';
import { bossRules, regionName } from './event-text';
import { factionLabel, HeroPortrait, phaseLabel, pretty } from './parts';

const channels: { color: Color; title: string; icon: string; note: string }[] = [
 { color: 'blue', title: 'Ranged', icon: 'target', note: 'Strikes before the enemy attacks.' },
 { color: 'red', title: 'Melee / Defense', icon: 'swords', note: 'Blocks now. Strikes again in resolution.' },
 { color: 'green', title: 'Armor', icon: 'shield', note: 'Absorbs incoming damage.' },
];
const guidance: Record<BattleStage, string> = {
 attacker: 'Choose who attacks next. Each participant contributes to the shared totals.',
 pool: 'Activate your powers, then roll. Each die meeting the threat adds one hit.',
 penalty: 'Select the dice lost to Stun and Curse before the roll.',
 'after-pool': 'Your dice have landed. Use any after-roll abilities before rerolls.',
 reroll: 'Select dice to reroll, or keep the results. A die can be rerolled once.',
 'after-reroll': 'Use Spot and other abilities before the creature effect resolves.',
 tokens: 'Successful dice and abilities are added to the faction totals.',
 'after-tokens': 'Hits are banked. Resolve any remaining abilities.',
 defense: 'Ranged hits remove defeated enemies first. Melee and armor block the survivors.',
 wounds: 'Assign the remaining wounds. Healing abilities can still save a character.',
 resolution: 'Melee and attrition become damage and join the remaining ranged hits.',
 'round-end': 'Unspent damage carries into the next round in PvE. Prepare a new roll.',
 over: 'Combat is complete. Review the result, then collect any rewards.',
};
const advanceLabels: Partial<Record<BattleStage, string>> = { 'after-pool': 'Continue to rerolls', reroll: 'Keep results', 'after-tokens': 'Finish this attack', defense: 'Resolve ranged & defense', resolution: 'Resolve melee + attrition', 'round-end': 'Start next round' };
type RollRecord = { round: number; attack: Attack };
type CombatProps = {
 state: GameView; legal: Command[]; send: (c: Command) => void; busy: boolean;
 botStep: () => void; botReady: boolean; auto: boolean; toggleBots: () => void;
 open?: boolean; onClose?: () => void; bots?: string[];
 resolve?: boolean; toggleResolve?: () => void; play?: boolean; togglePlay?: () => void; automationPending?: boolean;
};

export default function CampaignCombat({ state, legal, send, busy, botStep, botReady, open = true, onClose, bots = [], resolve = true, toggleResolve, play = false, togglePlay, automationPending = false }: CombatProps) {
 const b = state.phase === 'combat' ? state.battle : undefined, a = b?.active;
 const [selected, setSelected] = useState<number[]>([]), [minimized, setMinimized] = useState(false);
 const [omit, setOmit] = useState<Pool>({ red: 0, blue: 0, green: 0 });
 const [history, setHistory] = useState<RollRecord[]>([]);
 const attackKey = a ? `${b!.round}:${JSON.stringify(a)}` : '';
 useEffect(() => { setSelected([]); setOmit({ red: 0, blue: 0, green: 0 }); }, [b?.stage, a?.heroId, b?.round]);
 useEffect(() => {
  if (!b) { setHistory([]); return; }
  if (!a?.dice.some(d => d.value)) return;
  setHistory(old => [...old.filter(r => r.round !== b.round || r.attack.heroId !== a.heroId), { round: b.round, attack: structuredClone(a) }].slice(-30));
 }, [attackKey, !!b]);
 const close = () => onClose ? onClose() : setMinimized(true);
 if (!open) return null;
 if (minimized && !onClose) return <button className="combat-reopen gold-button" onClick={() => setMinimized(false)}><Icon name="swords" />Combat</button>;

 const controls = <div className="combat-switches">
  <button type="button" role="switch" aria-checked={resolve} onClick={toggleResolve} className="combat-switch" disabled={!toggleResolve}><i /><span>Auto-resolve<small>Count hits & advance clear steps</small></span></button>
  <button type="button" role="switch" aria-checked={play} onClick={togglePlay} className="combat-switch" disabled={!b || !togglePlay}><i /><span>Autoplay battle<small>Let AI choose & roll for everyone</small></span></button>
 </div>;
 if (!b) return <Modal title="Combat" wide className="combat-room" onClose={close}><div className="combat-idle">
  <span className="sheet-eyebrow">YOUR DICE. ONE CLEAR BATTLEFIELD.</span><h3>Every roll has a role.</h3><p>Start a Challenge on the map. This room opens automatically when combat begins.</p>
  <div className="combat-guide-dice">{channels.map((c, i) => <article key={c.color} className={c.color}><D8 die={{ id: i, color: c.color, value: 8, removed: false, spotted: false, rerolled: false }} hit animate={false} /><h4><Icon name={c.icon} />{c.title}</h4><p>{c.note}</p></article>)}</div>
  <div className="combat-idle-order"><span>01 · Ranged strikes</span><Icon name="arrow" /><span>02 · Defend & take wounds</span><Icon name="arrow" /><span>03 · Melee + attrition</span></div>
  <p>Attrition comes from abilities and joins the attack during resolution. Dice values are compared with threat; each success counts as one hit.</p>{controls}<button className="gold-button" onClick={close}>Back to map <Icon name="arrow" /></button>
 </div></Modal>;

 const skills = legal.filter((c): c is AbilityCommand => c.type === 'ability');
 const choices = legal.filter(c => !['ability', 'reroll', 'penalty', 'roll'].includes(c.type));
 const usable = (type: Command['type']) => legal.some(c => c.type === type);
 const roll = legal.find(c => c.type === 'roll');
 const enemy = state.enemies.find(e => b.enemies.includes(e.id)) ?? b.killed?.[0];
 const creature = p.creatures.find(c => c.id === enemy?.creature);
 const boss = p.overlords.find(o => o.id === b.boss), event = p.events.find(e => e.id === b.boss);
 const title = b.kind === 'final' ? 'Final showdown' : b.kind === 'pvp' ? 'Horde versus Alliance' : creature?.name ?? boss?.name ?? event?.name ?? 'Encounter';
 const rule = boss ? bossRules[boss.combat] : event?.boss ? bossRules[event.boss.combat] : creature ? creatureRules[creature.rule] : '';
 const enemyStats = b.kind !== 'pve' ? [] : b.boss ? [stats(p, state)] : b.enemies.map(id => stats(p, state, id));
 const threat = a?.threat ?? (enemyStats.length ? Math.max(...enemyStats.map(s => s.threat)) : undefined);
 const attack = enemyStats.reduce((n, s) => n + s.attack, 0), health = enemyStats.reduce((n, s) => n + s.health, 0);
 const latest = history.filter(r => r.round === b.round).at(-1);
 const shown = a ?? latest?.attack;
 const shownHero = state.heroes.find(h => h.id === shown?.heroId);
 const greenEightOnly = creature?.rule === 'drake' && shownHero && !immune(p, shownHero, 'drake');
 const rerollsBlocked = creature?.rule === 'ghoul';
 const hit = (d: Die) => !d.removed && d.value >= (shown?.threat ?? 9) && !(d.color === 'green' && greenEightOnly && d.value !== 8);
 const selectedDice = a?.dice.filter(d => selected.includes(d.id) && !d.removed) ?? [];
 const rerollable = (d: Die) => legal.some(c => c.type === 'reroll' && c.dice.includes(d.id));
 const selectable = (d: Die) => !d.removed && (usable('penalty') || rerollable(d) || skills.some(c => c.args?.dice?.includes(d.id) || c.args?.removeDice?.includes(d.id)));
 const canReroll = selectedDice.length > 0 && selectedDice.length <= (a?.reroll ?? 0) && selectedDice.every(rerollable);
 const penaltyCount = a ? Math.min(a.dice.filter(d => !d.removed).length, (state.heroes.find(h => h.id === a.heroId)?.stun ?? 0) * 2 + (state.heroes.find(h => h.id === a.heroId)?.curse ?? 0)) : 0;
 const step = combatStep(b.stage, b.afterWounds), actingBot = !!a && bots.includes(a.heroId);
 const stateText = busy ? 'Rolling D8s…' : automationPending ? actingBot || play ? 'AI is playing…' : 'Resolving automatically…' : b.stage === 'over' ? 'Result ready' : legal.length ? 'Your decision' : 'Waiting for another character';
 const actionLabel = (c: Command) => c.type === 'closeBattle' ? 'Finish combat & continue' : c.type === 'advance' ? advanceLabels[b.stage] ?? 'Continue' : c.type === 'tokens' ? 'Bank successful hits' : c.type === 'monster' ? 'Resolve creature effect' : commandLabel(p, c);

 return <Modal title="Combat" wide className="combat-room" onClose={close}>
  <div className="combat-toolbar"><button className="combat-menu-toggle" aria-pressed="true" onClick={close}><Icon name="swords" />Combat <Icon name="x" size={14} /></button><span>{regionName(b.region)}<i />ROUND {String(b.round).padStart(2, '0')}</span><button className="quiet-button" onClick={close}><Icon name="map" size={15} />Back to map</button></div>
  <div className="combat-workbench">
   <div className="combat-arena">
    <div className="combat-arena-scroll">
    <header className="combat-encounter">{boss ? <BossPortrait id={boss.id} /> : creature ? <CreatureGlyph type={creature.rule} name={creature.name} /> : <Icon name="swords" size={38} />}<div><span className="sheet-eyebrow">{b.kind === 'pve' ? b.boss ? 'BOSS ENCOUNTER' : `${b.enemies.length} ENEMIES REMAIN` : 'FACTION BATTLE'}</span><h3>{title}</h3><p>{b.stage === 'over' ? b.winner === 'draw' ? 'The battle ends in a draw.' : `${factionLabel(b.winner ?? '')} wins the battle.` : 'Prepare your hand. Let the dice decide.'}</p></div>{b.kind === 'pve' && <dl><div><dt>ATTACK</dt><dd><AnimatedValue value={attack} /></dd></div><div><dt>HEALTH</dt><dd><AnimatedValue value={health} /></dd></div></dl>}</header>
    <ol className="combat-timeline" aria-label="Combat sequence">{combatSteps.map((label, i) => <li key={label} className={`${i === step ? 'current' : ''} ${i < step ? 'complete' : ''}`} aria-current={i === step ? 'step' : undefined}><span>{i < step ? <Icon name="check" size={13} /> : `0${i + 1}`}</span><b>{label}</b></li>)}</ol>
    <div className="combat-phase-note"><div key={`${b.round}:${b.stage}`} className="phase-copy"><span className="sheet-eyebrow">{b.stage === 'over' ? 'BATTLE COMPLETE' : actingBot ? 'BOT TURN' : 'CURRENT STEP'}</span><h4>{b.stage==='over'?(b.winner==='draw'?'Draw':b.kind==='pve'?(b.winner===b.first?'Victory':'Defeat'):`${factionLabel(b.winner??'')} victory`):phaseLabel[b.stage]}</h4><p>{b.kind !== 'pve' && b.stage === 'defense' ? 'Assign armor to opposing hits, then apply the remaining ranged damage.' : b.kind !== 'pve' && b.stage === 'round-end' ? 'Both factions prepare new dice for the next round.' : guidance[b.stage]}</p></div><span className={`combat-live-status ${automationPending || busy ? 'running' : ''}`} role="status"><i />{stateText}</span></div>
    <section className="combat-dice-table" aria-label="Dice tray" aria-busy={busy}>
     <div className="combat-tray-heading"><span>{shown ? <><HeroPortrait id={shown.heroId} small /><strong>{character(p, shown.heroId).name.split(' ')[0]}</strong><small>{a ? bots.includes(a.heroId) ? 'BOT ROLL' : 'PLAYER ROLL' : 'LAST ROLL'}</small></> : <><Icon name="spark" /><strong>Ready for the next attacker</strong></>}</span><span>{shown ? `${shown.dice.filter(d => !d.removed).length} / 21 D8` : 'D8 DICE'}</span></div>
     {channels.map(channel => {
      const dice = shown?.dice.filter(d => d.color === channel.color) ?? [], hits = dice.filter(hit).length;
      return <div key={channel.color} className={`combat-dice-lane ${channel.color}`}><div className="dice-lane-label"><Icon name={channel.icon} size={19} /><strong>{channel.title}</strong><small>{channel.note}</small></div><div className="dice-lane-roll">{dice.length ? dice.map((d, i) => <D8 key={`${shown!.heroId}:${b.round}:${d.id}`} die={d} hit={hit(d)} index={i} selected={!!a && selected.includes(d.id)} disabled={busy || play || !a || !selectable(d)} animate={!!a && busy} onSelect={() => setSelected(ids => ids.includes(d.id) ? ids.filter(id => id !== d.id) : [...ids, d.id])} />) : <span className="dice-lane-empty">{a ? `No ${channel.color} dice prepared` : 'Awaiting dice'}</span>}</div><div className="dice-lane-count" aria-label={`${channel.title}: ${busy ? 'rolling' : hits} rolled hits`}><b>{busy ? '…' : <AnimatedValue value={hits} />}</b><small>ROLLED HITS</small></div></div>;
     })}
     <div className="combat-tray-note"><span><Icon name="target" size={13} />{shown ? `${shown.threat}+ scores a hit${greenEightOnly ? ' · green needs 8' : ''}` : 'One success = one hit'}</span><span>{a ? `${rerollsBlocked?'Normal rerolls blocked by Ghoul':`Rerolls ${Math.max(0, a.reroll)}`} · Attrition ${Math.max(0, a.attrition)}` : 'Hits are counted automatically'}</span></div>
    </section>
    {state.respawns.length > 0 && <p className="combat-warning">A character has no health. Use any available healing or choose a starting region or graveyard.</p>}
    </div>
    <section className="combat-decisions" aria-label="Combat decisions">
     <div className="combat-decision-heading"><h4>{skills.length ? 'Powers at this step' : b.stage === 'over' ? 'Ready to move on' : 'Next move'}</h4><span>{skills.length ? `${new Set(skills.map(c => c.card)).size} available` : 'All totals use the game rules'}</span></div>
     {!!skills.length && <div className="combat-skill-list">{[...new Set(skills.map(c => `${c.hero}:${c.card}`))].map(key => <CombatAbilities key={`${b.round}:${b.stage}:${key}`} commands={skills.filter(c => `${c.hero}:${c.card}` === key)} state={state} dice={selected} send={send} busy={busy || play} />)}</div>}
     <div className="combat-action-row">
      {roll && <button className="gold-button combat-roll-button" disabled={busy || play} onClick={() => send(roll)}><Icon name="spark" />Roll {a?.dice.filter(d => !d.removed).length ?? 0} D8 <Icon name="arrow" size={16} /></button>}
      {usable('reroll') && <><button className="gold-button" disabled={!canReroll || busy || play} onClick={() => { send({ type: 'reroll', dice: selected }); setSelected([]); }}><Icon name="reset" />Reroll selected ({selected.length})</button><button className="quiet-button" disabled={busy || play} onClick={() => setSelected(a!.dice.filter(d => !hit(d) && rerollable(d)).slice(0, Math.max(0, a!.reroll)).map(d => d.id))}>Select misses</button></>}
      {usable('penalty') && <button className="gold-button" disabled={selectedDice.length !== penaltyCount || busy || play} onClick={() => send({ type: 'penalty', dice: selected })}>Remove {selected.length} / {penaltyCount} dice</button>}
      {choices.map(c => <button key={JSON.stringify([state.turn, b.round, b.stage, c])} className={c.type === 'closeBattle' ? 'gold-button' : 'quiet-button'} disabled={busy || play && b.stage !== 'over'} onClick={() => send(c)}>{actionLabel(c)}{c.type === 'tokens' && c.toAttrition && <small>To attrition: {c.toAttrition.map(id => `#${id}`).join(', ')}</small>}{c.type === 'advance' && c.targets && <small>{state.enemies.find(e => e.id === c.targets?.[0])?.color} enemies first</small>}{c.type === 'loot' && c.discard && <small>Discard {pretty(card(p, c.discard).name)}</small>}{c.type === 'monster' && !!c.unequip?.length && <small>{c.unequip.map(id => card(p, id).name).join(', ')}</small>}</button>)}
      {!legal.length && <p className="muted">{automationPending ? 'The bot is making its move.' : 'Waiting for the player or bot making this decision.'}</p>}
     </div>
     {usable('reroll') && !busy && <p className="dice-selection-help" role="status">{selected.length > (a?.reroll ?? 0) ? `Choose at most ${a?.reroll ?? 0} dice. Deselect ${selected.length - (a?.reroll ?? 0)} to reroll.` : selected.length ? `${selected.length} selected · up to ${Math.max(0, a?.reroll ?? 0)} rerolls available` : 'Click a die to select it, or use Select misses.'}</p>}
     {a && b.stage === 'pool' && usable('roll') && <details className="combat-advanced"><summary>Advanced · omit dice</summary><p>Choose dice to leave out. Equipment restrictions still apply.</p><div>{channels.map(({ color }) => <label key={color}>{color}<input type="number" min={0} max={a.dice.filter(d => !d.removed && d.color === color).length} value={omit[color]} onChange={e => setOmit(v => ({ ...v, [color]: Math.max(0, Math.min(a.dice.filter(d => !d.removed && d.color === color).length, Math.floor(Number(e.target.value) || 0))) }))} /></label>)}<button className="quiet-button" disabled={busy || play} onClick={() => send({ type: 'roll', omit })}>Roll remaining dice</button></div></details>}
    </section>
   </div>
   <aside className="combat-ledger" aria-label="Battle totals">
    <CombatScene state={state} busy={busy} />
    {threat !== undefined && <div className="combat-threat-bar"><ThreatLevel value={threat} greenEightOnly={!!greenEightOnly} /><span>{a ? `${character(p, a.heroId).name.split(' ')[0]}’s current threshold` : 'Encounter threshold'}<small>Roll this number or higher to score one hit.</small></span></div>}
    <div className="combat-ledger-heading"><span className="sheet-eyebrow">THE SHARED POOL</span><h3>Battle totals</h3><p>Banked after abilities and creature effects.</p></div>
    {(['horde', 'alliance'] as const).filter(f => b.kind !== 'pve' || f === b.first).map(f => {
     const box = b.boxes[f];
     return <section key={f} className={`combat-faction-pool ${f}`} aria-label={`${factionLabel(f)} totals`}><h4><FactionCrest faction={f} />{factionLabel(f)}</h4>
      <div className="combat-total blue"><Icon name="target" /><span>Ranged<small>First strike / carried damage</small></span><output aria-label={`${factionLabel(f)} ranged hits`}><AnimatedValue value={box.damage} /></output></div>
      <div className="combat-total red"><Icon name="swords" /><span>Melee / Defense<small>Defend, then attack</small></span><output aria-label={`${factionLabel(f)} melee hits`}><AnimatedValue value={box.defense} /></output></div>
      <div className="combat-total green"><Icon name="shield" /><span>Armor<small>Damage blocked</small></span><output aria-label={`${factionLabel(f)} armor`}><AnimatedValue value={box.armor} /></output></div>
      <div className="combat-total amber"><Icon name="flame" /><span>Attrition<small>Added in resolution</small></span><output aria-label={`${factionLabel(f)} attrition`}><AnimatedValue value={box.attrition} /></output></div>
      <div className="combat-equation"><span>Defense available</span><strong>{box.defense} <i>+</i> {box.armor} <i>=</i> {box.defense + box.armor}</strong><span>Damage at resolution</span><strong>{box.damage} <i>+</i> {box.defense} <i>+</i> {box.attrition} <i>=</i> {box.damage + box.defense + box.attrition}</strong><small>Remaining hits · special effects may change totals.</small></div>
      {b.wounds[f] > 0 && <div className="combat-wound-count"><Icon name="heart" /><strong>{b.wounds[f]}</strong> wounds to assign</div>}
     </section>;
    })}
    <div className="combat-party"><h4>In this battle</h4>{b.participants.map(id => {
     const h = state.heroes.find(h => h.id === id)!, max = capacity(p, h);
     return <div key={id} className={`${a?.heroId === id ? 'active' : ''} ${b.defeated.includes(id) ? 'defeated' : ''}`}><HeroPortrait id={id} small /><span><strong>{character(p, id).name.split(' ')[0]}</strong><small>{factionLabel(faction(p, id))} · {bots.includes(id) ? 'BOT' : 'PLAYER'}{b.defeated.includes(id) ? ' · defeated' : b.acted.includes(id) ? ' · rolled' : ''}</small><span className="combat-hero-vitals"><i><Icon name="heart" size={11} /><AnimatedValue value={h.health} />/{max.health}</i><i><Icon name="bolt" size={11} /><AnimatedValue value={h.energy} /></i>{h.curse > 0 && <i>Curse {h.curse}</i>}{h.stun > 0 && <i>Stun {h.stun}</i>}</span></span>{a?.heroId === id && <i className="combat-turn-dot" />}</div>;
    })}</div>
    {rule && <details className="combat-enemy-rule"><summary>Encounter rule <Icon name="help" size={14} /></summary><p><RulesText>{rule}</RulesText></p></details>}
    {!!history.length && <details className="combat-roll-history"><summary>Roll history · {history.length}</summary>{[...history].reverse().map(r => <div key={`${r.round}:${r.attack.heroId}`}><strong>R{r.round} · {character(p, r.attack.heroId).name.split(' ')[0]}</strong><span>{r.attack.dice.map(d => <i key={d.id} className={`${d.color} ${d.removed ? 'removed' : ''}`}>{d.value || '—'}</i>)}</span></div>)}</details>}
   </aside>
  </div>
  <footer className="combat-room-footer">{controls}<div><span>{play ? 'Autoplay stops at the result.' : resolve ? 'Bots roll automatically. You choose your powers.' : 'Automatic steps paused.'}</span>{!resolve && !play && <button className="quiet-button" disabled={!botReady || busy} onClick={botStep}>Step bot <Icon name="arrow" size={14} /></button>}</div></footer>
 </Modal>;
}
