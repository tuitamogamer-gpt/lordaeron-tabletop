import { useEffect, useRef, useState } from 'react';
import { Icon, Modal } from '../components';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character, faction } from '../rules/common';
import { stats } from '../rules/combat';
import { immune } from '../rules/effects';
import { commandLabel } from '../rules/legal';
import type { Attack, BattleStage, Color, Command, Die, Pool } from '../rules/model';
import type { GameView } from '../rules/view';
import CombatArea from './CombatArea';
import EnemyInfo from './CombatEnemyInfo';
import { type AbilityCommand } from './CombatAbilities';
import CombatCharacterSheet, { type TakeBack } from './CombatCharacterSheet';
import CombatLoadout from './CombatLoadout';
import { combatPool } from './combat-pool';
import { attackPreview, diceWords } from './combat-readiness';
import D8 from './D8';
import RulesText from './RulesText';
import CombatScene from './CombatScene';
import { AnimatedValue, ThreatLevel } from './feedback';
import { combatStep, combatSteps, lightCue, type CombatPresentation } from './combat-flow';
import { BossPortrait, CreatureGlyph, creatureRules } from './design-system';
import { bossRuleText, regionName } from './event-text';
import { ConditionToken, factionLabel, HeroPortrait, phaseLabel, pretty } from './parts';

const channels: { color: Color; title: string; icon: string; note: string; pvpNote: string }[] = [
 { color: 'blue', title: 'Ranged', icon: 'target', note: 'Strikes before the enemy attacks.', pvpNote: 'Deals wounds after armor is resolved.' },
 { color: 'red', title: 'Melee / Defense', icon: 'swords', note: 'Blocks now. Strikes again in resolution.', pvpNote: 'Joins attrition during resolution.' },
 { color: 'green', title: 'Armor', icon: 'shield', note: 'Absorbs incoming damage.', pvpNote: 'Removes opposing hit tokens.' },
];
const guidance: Record<BattleStage, string> = {
 attacker: 'Choose who attacks next. Each participant contributes to the shared totals.',
 pool: 'Use your powers if you wish, then roll. Each die meeting the threat adds one hit.',
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
const diceCount = (count: number) => `${count} ${count === 1 ? 'die' : 'dice'}`;
const DICE_STEPS: BattleStage[] = ['pool', 'penalty', 'after-pool', 'reroll', 'after-reroll', 'tokens', 'after-tokens'];
const BOARD_STEPS: BattleStage[] = ['defense', 'wounds', 'resolution', 'round-end'];
type RollRecord = { round: number; attack: Attack };
type CombatProps = {
 state: GameView; legal: Command[]; send: (c: Command) => void; busy: boolean;
 botStep: () => void; botReady: boolean; auto: boolean; toggleBots: () => void;
 open?: boolean; onClose?: () => void; bots?: string[];
 resolve?: boolean; toggleResolve?: () => void; automationPending?: boolean; presentation?: CombatPresentation;
 botResponsePending?:boolean; onPassHumanWindow?:()=>void;
 /** Bookkeeping steps with a single outcome continue on their own while this is on. */
 autoContinue?: boolean; toggleAutoContinue?: () => void; autoStep?: Command;
 /** The power a player just used, while it can still be taken back. */
 takeBack?: TakeBack;
};

export default function CampaignCombat({ state: liveState, legal, send, busy, botStep, botReady, open = true, onClose, bots = [], resolve = true, toggleResolve, automationPending = false, presentation, botResponsePending=false, onPassHumanWindow, autoContinue = false, toggleAutoContinue, autoStep, takeBack }: CombatProps) {
 // An exchange holds its outcome back until the blow lands. A power or a new attacker has nothing to hold back: it shows at once.
 const anticipating = presentation?.cue && !lightCue(presentation.cue) && ['anticipation', 'action'].includes(presentation.phase);
 const state = anticipating ? presentation.cue!.before : liveState;
 const locked = busy || !!presentation?.busy;
 const b = state.phase === 'combat' ? state.battle : undefined, a = b?.active;
 const [selected, setSelected] = useState<number[]>([]), [minimized, setMinimized] = useState(false);
 const [omit, setOmit] = useState<Pool>({ red: 0, blue: 0, green: 0 });
 // Rolling fewer dice than prepared is a rare choice: its controls stay folded until asked for.
 const [poolOpen,setPoolOpen]=useState(false);
 const [history, setHistory] = useState<RollRecord[]>([]);
 const tray=useRef<HTMLElement>(null),board=useRef<HTMLDivElement>(null),arena=useRef<HTMLDivElement>(null);
 const attackKey = a ? `${b!.round}:${JSON.stringify(a)}` : '';
 const availableDiceKey = a?.dice.filter(d => !d.removed).map(d => d.id).join(',') ?? '';
 const selectedIds = selected.filter(id => a?.dice.some(d => d.id === id && !d.removed));
 useEffect(() => { setSelected([]); setOmit({ red: 0, blue: 0, green: 0 });setPoolOpen(false); }, [b?.stage, a?.heroId, b?.round]);
 // A phone shows only part of the table above the docked sheet: bring the part this step is about into view.
 useEffect(() => {
  if (!b || typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width:800px)').matches) return;
  const target = DICE_STEPS.includes(b.stage) ? tray.current : BOARD_STEPS.includes(b.stage) ? board.current : undefined;
  if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  else arena.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
 }, [b?.stage, a?.heroId, b?.round, open, selected.length > 0]);
 useEffect(() => {
  const available = new Set(availableDiceKey ? availableDiceKey.split(',').map(Number) : []);
  setSelected(ids => ids.every(id => available.has(id)) ? ids : ids.filter(id => available.has(id)));
 }, [availableDiceKey]);
 useEffect(() => {
  if (!b) { setHistory([]); return; }
  if (!a?.dice.some(d => d.value)) return;
  setHistory(old => [...old.filter(r => r.round !== b.round || r.attack.heroId !== a.heroId), { round: b.round, attack: structuredClone(a) }].slice(-30));
 }, [attackKey, !!b]);
 const close = () => onClose ? onClose() : setMinimized(true);
 if (!open) return null;
 if (minimized && !onClose) return <button className="combat-reopen gold-button" onClick={() => setMinimized(false)}><Icon name="swords" />Combat</button>;

 const controls = <div className="combat-switches">
  <button type="button" role="switch" aria-checked={resolve} onClick={toggleResolve} className="combat-switch" disabled={!toggleResolve}><i /><span>Auto-play bots<small>Your characters always wait for you</small></span></button>
  <button type="button" role="switch" aria-checked={autoContinue} onClick={toggleAutoContinue} className="combat-switch" disabled={!toggleAutoContinue}><i /><span>Auto-continue steps<small>Steps with a single outcome advance on their own</small></span></button>
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
 const rule = boss ? bossRuleText(boss.combat) : event?.boss ? bossRuleText(event.boss.combat) : creature ? creatureRules[creature.rule] : '';
 const enemyStats = b.kind !== 'pve' ? [] : b.boss ? [stats(p, state)] : b.enemies.map(id => stats(p, state, id));
 const threat = a?.threat ?? (enemyStats.length ? Math.max(...enemyStats.map(s => s.threat)) : undefined);
 const attack = enemyStats.reduce((n, s) => n + s.attack, 0), health = enemyStats.reduce((n, s) => n + s.health, 0);
 const latest = history.filter(r => r.round === b.round).at(-1);
 const shown = a ?? latest?.attack;
 const shownHero = state.heroes.find(h => h.id === shown?.heroId);
 const greenEightOnly = creature?.rule === 'drake' && shownHero && !immune(p, shownHero, 'drake');
 const rerollsBlocked = creature?.rule === 'ghoul';
 const hit = (d: Die) => !d.removed && d.value >= (shown?.threat ?? 9) && !(d.color === 'green' && greenEightOnly && d.value !== 8);
 const selectedDice = a?.dice.filter(d => selectedIds.includes(d.id)) ?? [];
 const rerollable = (d: Die) => legal.some(c => c.type === 'reroll' && c.dice.includes(d.id));
 const selectable = (d: Die) => !d.removed && (usable('penalty') || rerollable(d) || skills.some(c => c.args?.dice !== undefined || c.args?.removeDice !== undefined));
 const canReroll = selectedDice.length > 0 && selectedDice.length <= (a?.reroll ?? 0) && selectedDice.every(rerollable);
 const penaltyCount = a ? Math.min(a.dice.filter(d => !d.removed).length, (state.heroes.find(h => h.id === a.heroId)?.stun ?? 0) * 2 + (state.heroes.find(h => h.id === a.heroId)?.curse ?? 0)) : 0;
 const step = combatStep(b.stage, b.afterWounds), actingBot = !!a && bots.includes(a.heroId);
 const stateText = busy ? 'Rolling D8s…' : presentation?.busy ? 'Battle in motion…' : autoStep ? 'Continuing automatically…' : botResponsePending?'Your reaction before the bot continues':b.stage === 'over' ? automationPending ? 'Result ready · closes by itself' : 'Result ready' : automationPending ? 'AI is playing…' : legal.length ? 'Your decision · waiting for you' : 'Waiting for another character';
 const activeHero=state.heroes.find(h=>h.id===a?.heroId),pool=a&&activeHero?combatPool(p,activeHero,a,omit):undefined;
 const rollCommand:Command|undefined=roll&&pool?Object.values(pool.omit).some(Boolean)?{type:'roll',omit:pool.omit}:{type:'roll'}:undefined;
 const powerCount=new Set(skills.map(c=>`${c.hero}:${c.card}`)).size;
 const impaired=!!activeHero&&(activeHero.stun||activeHero.curse)>0,poolShown=poolOpen||impaired||!!pool&&Object.values(pool.omit).some(Boolean);
 const sourceName=(d:Die)=>d.source?p.cards.find(c=>c.id===d.source)?.name:undefined;
 // A step with one way forward and nothing else to decide shows that way as the main action.
 const onlyStep=choices.length===1&&!roll&&!usable('reroll')&&!usable('penalty');
 // Choosing an attacker starts that character's Dice Pool step: say what he brings to it before the choice is made.
 const attackerBrings=(id:string)=>{const v=attackPreview(p,state,id);return v?<small>{diceWords(v.dice)} dice · {v.energy} energy{v.powers.length?` · ${v.powers.map(power=>card(p,power).name).join(', ')} ready`:''}</small>:null;};
 const actionLabel = (c: Command) => c.type === 'closeBattle' ? 'Finish combat & continue' : c.type === 'advance' ? advanceLabels[b.stage] ?? 'Continue' : c.type === 'tokens' ? 'Bank successful hits' : c.type === 'monster' ? 'Resolve creature effect'
  : c.type === 'wound' ? `${character(p, c.hero).name.split(' ')[0]} takes a wound${c.pet ? ' on the pet' : ''}`
  : c.type === 'respawn' ? `Revive ${character(p, c.hero).name.split(' ')[0]} at ${regionName(c.region)}` : commandLabel(p, c);
 const phaseGuidance = b.kind === 'pve' ? guidance[b.stage]
  : b.stage === 'attacker' ? 'Factions alternate attackers until every participant has contributed to their own Combat Area.'
  : b.stage === 'defense' ? 'Assign armor to opposing hits, then apply the remaining ranged damage.'
  : b.stage === 'resolution' ? state.variants?.deadlyPvp ? 'Each faction takes wounds equal to the opposing melee and attrition hits.' : 'Compare both factions’ melee and attrition hits. The difference becomes wounds for the weaker side.'
  : b.stage === 'round-end' ? 'Both Combat Areas are cleared. Prepare new dice for the next round.' : guidance[b.stage];

 return <Modal title="Combat" wide className="combat-room player-driven-combat" onClose={close}>
  <div className="combat-toolbar"><button className="combat-menu-toggle" aria-pressed="true" onClick={close}><Icon name="swords" />Combat <Icon name="x" size={14} /></button><span>{regionName(b.region)}<i />ROUND {String(b.round).padStart(2, '0')}</span><button className="quiet-button" onClick={close}><Icon name="map" size={15} />Back to map</button></div>
  <div className="combat-workbench">
   <div className="combat-arena">
    <div className="combat-arena-scroll" ref={arena}>
    <header className="combat-encounter"><EnemyInfo state={state}>{boss || event?.boss ? <BossPortrait id={b.boss!} /> : creature ? <CreatureGlyph type={creature.rule} name={creature.name} /> : <Icon name="swords" size={38} />}<div><span className="sheet-eyebrow">{b.kind === 'pve' ? b.boss ? 'BOSS ENCOUNTER' : `${b.enemies.length} ENEMIES REMAIN` : 'FACTION BATTLE'}</span><h3>{title}</h3><p>{b.stage === 'over' ? b.winner === 'draw' ? 'The battle ends in a draw.' : `${factionLabel(b.winner ?? '')} wins the battle.` : 'Prepare your hand. Let the dice decide.'}</p></div></EnemyInfo>{b.kind === 'pve' && <dl><div><dt>ATTACK</dt><dd><AnimatedValue value={attack} /></dd></div><div><dt>HEALTH</dt><dd><AnimatedValue value={health} /></dd></div></dl>}</header>
    <ol className="combat-timeline" aria-label="Combat sequence">{combatSteps.map((label, i) => <li key={label} className={`${i === step ? 'current' : ''} ${i < step ? 'complete' : ''}`} aria-current={i === step ? 'step' : undefined}><span>{i < step ? <Icon name="check" size={13} /> : `0${i + 1}`}</span><b>{b.kind !== 'pve' && i === 2 ? 'Armor & ranged' : label}</b></li>)}</ol>
    <div className="combat-phase-note"><div key={`${b.round}:${b.stage}`} className="phase-copy"><span className="sheet-eyebrow">{b.stage === 'over' ? 'BATTLE COMPLETE' : actingBot ? 'BOT TURN' : 'CURRENT STEP'}</span><h4>{b.stage==='over'?(b.winner==='draw'?'Draw':b.kind==='pve'?(b.winner===b.first?'Victory':'Defeat'):`${factionLabel(b.winner??'')} victory`):phaseLabel[b.stage]}</h4><p>{phaseGuidance}</p></div><span className={`combat-live-status ${automationPending || locked ? 'running' : ''}`} role="status"><i />{stateText}</span></div>
    <CombatScene state={state} busy={busy} presentation={presentation} />
    <section className="combat-dice-table" aria-label="Dice tray" aria-busy={locked} ref={tray}>
     <div className="combat-tray-heading"><span>{shown ? <><HeroPortrait id={shown.heroId} small /><strong>{character(p, shown.heroId).name.split(' ')[0]}</strong><small>{a ? bots.includes(a.heroId) ? 'BOT ROLL' : 'PLAYER ROLL' : 'LAST ROLL'}</small></> : <><Icon name="spark" /><strong>Ready for the next attacker</strong></>}</span><span className="combat-tray-meta">{threat !== undefined && <ThreatLevel value={threat} compact greenEightOnly={!!greenEightOnly} />}<em>{a&&pool&&b.stage==='pool'?`${pool.total} SELECTED · ${Object.values(pool.available).reduce((sum,n)=>sum+n,0)} AVAILABLE`:shown ? `${shown.dice.filter(d => !d.removed).length} D8 ${a ? 'IN PLAY' : 'ROLLED'}` : 'D8 DICE'}</em></span></div>
     {channels.map(channel => {
      const dice = shown?.dice.filter(d => d.color === channel.color) ?? [], hits = dice.filter(hit).length;
      return <div key={channel.color} className={`combat-dice-lane ${channel.color}`}><div className="dice-lane-label"><Icon name={channel.icon} size={19} /><strong>{channel.title}</strong><small>{b.kind === 'pve' ? channel.note : channel.pvpNote}</small></div><div className="dice-lane-roll">{dice.length ? dice.map((d, i) => <D8 key={`${shown!.heroId}:${b.round}:${d.id}`} die={d} hit={hit(d)} index={i} selected={!!a && selectedIds.includes(d.id)} selectionOrder={selectedIds.indexOf(d.id) + 1 || undefined} source={sourceName(d)} disabled={locked || !a || !selectable(d)} animate={!!a && busy} onSelect={() => setSelected(ids => ids.includes(d.id) ? ids.filter(id => id !== d.id) : [...ids, d.id])} />) : <span className="dice-lane-empty">{a ? `No ${channel.color} dice prepared` : 'Awaiting dice'}</span>}</div><div className="dice-lane-count" aria-label={`${channel.title}: ${busy ? 'rolling' : hits} rolled hits`}><b>{busy ? '…' : <AnimatedValue value={hits} />}</b><small>ROLLED HITS</small></div></div>;
     })}
     <div className="combat-tray-note"><span><Icon name="target" size={13} />{shown ? `${shown.threat}+ scores a hit${greenEightOnly ? ' · green needs 8' : ''}` : 'One success = one hit'}</span><span>{a ? `${rerollsBlocked?'Normal rerolls blocked by Ghoul':`Rerolls ${Math.max(0, a.reroll)}`} · Attrition ${Math.max(0, a.attrition)}` : 'Hits are counted automatically'}</span></div>
    </section>
    {state.respawns.length > 0 && <p className="combat-warning">A character has no health. Use any available healing or choose a starting region or graveyard.</p>}
   <aside className="combat-ledger" aria-label="Battle totals">
    <div className="combat-board-row" ref={board}>{(['horde', 'alliance'] as const).filter(f => b.kind !== 'pve' || f === b.first).map(f => {
     return <CombatArea key={f} battle={b} side={f} deadlyPvp={state.variants?.deadlyPvp} />;
    })}</div>
    <div className="combat-party"><h4>In this battle</h4>{b.participants.map(id => {
     const h = state.heroes.find(h => h.id === id)!, max = capacity(p, h);
     return <div key={id} className={`${a?.heroId === id ? 'active' : ''} ${b.defeated.includes(id) ? 'defeated' : ''}`}><HeroPortrait id={id} small /><span><strong>{character(p, id).name.split(' ')[0]}</strong><small>{factionLabel(faction(p, id))} · {bots.includes(id) ? 'BOT' : 'PLAYER'}{b.defeated.includes(id) ? ' · defeated' : b.acted.includes(id) ? ' · rolled' : ''}</small><span className="combat-hero-vitals"><i><Icon name="heart" size={11} /><AnimatedValue value={h.health} />/{max.health}</i><i><Icon name="bolt" size={11} /><AnimatedValue value={h.energy} /></i>{h.curse > 0 && <i><ConditionToken kind="curse" />Curse {h.curse}</i>}{h.stun > 0 && <i><ConditionToken kind="stun" />Stun {h.stun}</i>}</span></span>{a?.heroId === id && <i className="combat-turn-dot" />}</div>;
    })}</div>
    <CombatLoadout state={state}/>
    {rule && <details className="combat-enemy-rule"><summary>Encounter rule <Icon name="help" size={14} /></summary><p><RulesText>{rule}</RulesText></p></details>}
    {!!history.length && <details className="combat-roll-history"><summary>Roll history · {history.length}</summary>{[...history].reverse().map(r => <div key={`${r.round}:${r.attack.heroId}`}><strong>R{r.round} · {character(p, r.attack.heroId).name.split(' ')[0]}</strong><span>{r.attack.dice.map(d => <i key={d.id} className={`${d.color} ${d.removed ? 'removed' : ''}`}>{d.value || '—'}</i>)}</span></div>)}</details>}
   </aside>
    </div>
   </div>
    <section className="combat-decisions" aria-label="Combat decisions" aria-busy={locked}>
     <div className="combat-decision-heading"><h4>Character sheet</h4><span>{botResponsePending?'Your reaction':actingBot?'Bot turn':b.stage==='over'?'Review the outcome':'Your decision'}{powerCount?` · ${powerCount} ${powerCount===1?'power':'powers'} to use`:''}</span></div>
     <CombatCharacterSheet state={state} skills={skills} dice={selectedIds} send={send} busy={locked} bots={bots} takeBack={takeBack}>
     {a&&pool&&b.stage==='pool'&&roll&&poolShown&&<fieldset className="combat-pool-builder" disabled={locked}><legend>Choose your dice pool</legend><div>{channels.map(({color})=><label className={color} key={color}><span>{color}</span><input aria-label={`Roll ${color} dice`} type="number" min={0} max={pool.maximum[color]} value={pool.kept[color]} onChange={e=>setOmit(v=>({...v,[color]:pool.available[color]-Math.max(0,Math.min(pool.maximum[color],Math.floor(Number(e.target.value)||0)))}))}/><small>of {pool.available[color]}</small></label>)}</div><p><strong>{pool.total} D8 selected</strong> · Rerolls {Math.max(0,a.reroll)} · Attrition {Math.max(0,a.attrition)}</p>{!!pool.penalties.length&&<p>{pool.penalties.length} dice removed by equipment before this pool.</p>}{activeHero&&(activeHero.stun||activeHero.curse)>0&&(pool.total<activeHero.stun*2?<p className="combat-pool-danger" role="status">Stun requires {activeHero.stun*2} dice. Confirming this pool defeats {character(p,activeHero.id).name.split(' ')[0]} immediately.</p>:<p>Stun / Curse: choose {Math.min(pool.total,activeHero.stun*2+activeHero.curse)} dice to remove before rolling.</p>)}</fieldset>}
     <div className="combat-action-row">
      {rollCommand && <button className="gold-button combat-roll-button" disabled={locked} onClick={() => send(rollCommand)}><Icon name="spark" />{activeHero&&(activeHero.stun||activeHero.curse)>0?'Confirm pool · ':'Roll '}{pool?.total} D8 <Icon name="arrow" size={16} /></button>}
      {rollCommand&&!poolShown&&<button type="button" className="quiet-button combat-pool-toggle" disabled={locked} onClick={()=>setPoolOpen(true)}>Roll fewer dice</button>}
      {botResponsePending&&<button className="gold-button" disabled={locked||!onPassHumanWindow} onClick={onPassHumanWindow}>Pass · continue bot turn</button>}
      {usable('reroll') && <><button className="gold-button" disabled={!canReroll || locked} onClick={() => { send({ type: 'reroll', dice: selectedIds }); setSelected([]); }}><Icon name="reset" />Reroll selected ({selectedIds.length})</button><button className="quiet-button" disabled={locked} onClick={() => setSelected(a!.dice.filter(d => !hit(d) && rerollable(d)).slice(0, Math.max(0, a!.reroll)).map(d => d.id))}>Select misses</button></>}
      {usable('penalty') && <button className="gold-button" disabled={selectedDice.length !== penaltyCount || locked} onClick={() => send({ type: 'penalty', dice: selectedIds })}>Remove {selectedIds.length} / {penaltyCount} dice</button>}
      {!!selectedIds.length && <button className="quiet-button" disabled={locked} onClick={() => setSelected([])}>Clear selection</button>}
      {choices.map(c => <button key={JSON.stringify([state.turn, b.round, b.stage, c])} className={c.type === 'attacker' ? 'gold-button combat-attacker-choice' : c.type === 'closeBattle' || onlyStep ? 'gold-button' : 'quiet-button'} disabled={locked} onClick={() => send(c)}>{actionLabel(c)}{c.type === 'attacker' && attackerBrings(c.hero)}{c.type === 'tokens' && c.toAttrition && <small>To attrition: {c.toAttrition.map(id => `#${id}`).join(', ')}</small>}{c.type === 'advance' && c.targets && <small>{state.enemies.find(e => e.id === c.targets?.[0])?.color} enemies first</small>}{c.type === 'loot' && c.discard && <small>Discard {pretty(card(p, c.discard).name)}</small>}{c.type === 'monster' && !!c.unequip?.length && <small>{c.unequip.map(id => card(p, id).name).join(', ')}</small>}</button>)}
      {!legal.length && <p className="muted">{automationPending ? 'The bot is making its move.' : 'Waiting for the player or bot making this decision.'}</p>}
     </div>
     {usable('reroll') && !locked && <p className="dice-selection-help" role="status">{selectedIds.length > (a?.reroll ?? 0) ? `Choose at most ${a?.reroll ?? 0} dice. Deselect ${selectedIds.length - (a?.reroll ?? 0)} to reroll.` : selectedIds.length ? `${selectedIds.length} selected · up to ${Math.max(0, a?.reroll ?? 0)} rerolls available` : 'Click a die to select it, or use Select misses.'}</p>}
     {usable('penalty') && !locked && <p className="dice-selection-help" role="status">{selectedIds.length === penaltyCount ? `${diceCount(penaltyCount)} selected. Confirm removal to roll the remaining dice.` : selectedIds.length > penaltyCount ? `Deselect ${diceCount(selectedIds.length - penaltyCount)} to confirm Stun / Curse losses.` : `Select ${diceCount(penaltyCount - selectedIds.length)} to complete your Stun / Curse losses.`}</p>}
     </CombatCharacterSheet>
    </section>

  </div>
  <footer className="combat-room-footer">{controls}<div><span>{resolve ? 'Bots play automatically. Every player decision waits for confirmation.' : 'Bots paused. Your decisions remain manual.'}</span>{!resolve && <button className="quiet-button" disabled={!botReady || locked} onClick={botStep}>Step bot <Icon name="arrow" size={14} /></button>}</div></footer>
 </Modal>;
}
