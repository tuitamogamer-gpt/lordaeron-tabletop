// Choosing a challenge: whom to fight, and which allies standing in the same region join.
// The legal moves hold one challenge for every combination of allies; this dialog shows one card per opponent and lets the player
// build the party on it, instead of a row per combination that differed only in a line of small print.
import { useEffect, useRef, useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { Icon } from '../components';
import { character, faction, listed } from '../rules/common';
import type { Command } from '../rules/model';
import type { GameView } from '../rules/view';
import { CreatureGlyph } from './design-system';
import { regionName } from './event-text';
import { challengeProfile, challengeTarget, ThreatLevel } from './feedback';
import { HeroPortrait } from './parts';

type Challenge = Extract<Command, { type: 'challenge' }>;
const first = (id: string) => character(p, id).name.split(' ')[0];
const same = (a: string[], b: string[]) => a.length === b.length && a.every(id => b.includes(id));

/** What the opponent of a challenge is called. */
export function challengeName(state: GameView, c: Challenge) {
 const enemy = state.enemies.find(e => e.id === c.target), creature = p.creatures.find(a => a.id === enemy?.creature);
 return creature?.name ?? p.events.find(e => e.id === c.target)?.name ?? p.overlords.find(o => o.id === c.target)?.name ?? (c.target === 'pvp' ? 'Enemy party' : 'Kazzak clue');
}

/**
 * `assess` asks the move advisor what it expects of one exact challenge (rounds, wounds, risk); the answer appears under the party.
 * `bots` marks the allies the AI plays, who join when invited like anyone else.
 */
export default function ChallengeDialog({ state, hero, legal, bots = [], send, assess }: { state: GameView; hero: string; legal: Command[]; bots?: string[]; send: (c: Command) => void; assess?: (c: Challenge) => Promise<string | undefined> }) {
 const mine = legal.filter((c): c is Challenge => c.type === 'challenge' && c.hero === hero);
 const targets = [...new Map(mine.map(c => [challengeTarget(state, c), c])).keys()];
 const [invited, setInvited] = useState<Record<string, string[]>>({}), [advice, setAdvice] = useState<Record<string, string>>({});
 const asked = useRef(0);
 const options = (key: string) => mine.filter(c => challengeTarget(state, c) === key);
 const chosen = (key: string) => { const party = (invited[key] ?? []); return options(key).find(c => same(c.allies, party)); };
 const signature = targets.map(key => `${key}:${[...(invited[key] ?? [])].sort().join(',')}`).join('|');
 // The advisor's expectation for the party chosen on each card; an answer for an earlier choice is dropped.
 useEffect(() => {
  if (!assess) return;
  const request = ++asked.current;
  for (const key of targets) {
   const command = chosen(key), tag = `${key}:${[...(invited[key] ?? [])].sort().join(',')}`;
   if (!command || advice[tag] !== undefined) continue;
   void assess(command).then(text => { if (asked.current === request && text) setAdvice(v => ({ ...v, [tag]: text })); }).catch(() => {});
  }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [signature, state.revision]);
 if (!targets.length) return <div className="dialog-content"><p>Nothing here can be challenged now.</p></div>;
 return <div className="dialog-content challenge-dialog">
  <p>Choose whom to fight and who fights beside {first(hero)}. An ally standing in the same region with an action left can be invited; each invited ally spends one action. Blue creatures take priority.</p>
  <div className="challenge-list">{targets.map(key => {
   const solo = options(key).find(c => !c.allies.length) ?? options(key)[0], profile = challengeProfile(state, solo), name = challengeName(state, solo);
   const enemy = state.enemies.find(e => e.id === solo.target), creature = p.creatures.find(a => a.id === enemy?.creature);
   const where = solo.region ?? state.heroes.find(h => h.id === hero)!.location;
   const present = state.heroes.filter(h => h.id !== hero && h.location === where && faction(p, h.id) === faction(p, hero));
   const able = new Set(options(key).flatMap(c => c.allies)), party = (invited[key] ?? []).filter(id => able.has(id));
   const command = options(key).find(c => same(c.allies, party)), tag = `${key}:${[...party].sort().join(',')}`;
   const toggle = (id: string) => setInvited(v => ({ ...v, [key]: party.includes(id) ? party.filter(a => a !== id) : [...party, id] }));
   const title = `${profile && profile.count > 1 ? `${profile.count} × ` : ''}${name}`;
   return <section className="challenge-card" key={key} aria-label={`Challenge ${title}`}>
    <header>{creature ? <CreatureGlyph type={creature.rule} /> : <Icon name="swords" size={30} />}<div><strong>{title}</strong>
     {profile && <span className="challenge-stats"><ThreatLevel value={profile.threat} compact /><span><Icon name="swords" size={13} />{profile.attack} attack</span><span><Icon name="heart" size={13} />{profile.health} health</span></span>}
     {solo.region && <small>{regionName(solo.region)} · Intercept</small>}</div></header>
    <div className="challenge-party" role="group" aria-label={`Party against ${title}`}>
     <span className="challenge-member leader"><HeroPortrait id={hero} small /><span><b>{first(hero)}</b><small>leads the challenge</small></span></span>
     {present.map(a => {
      const can = able.has(a.id), on = party.includes(a.id), note = !can ? 'no action left' : on ? 'joins · spends 1 action' : `can join · ${a.actions} ${a.actions === 1 ? 'action' : 'actions'} left`;
      return <button type="button" key={a.id} className={`challenge-member ${on ? 'invited' : ''}`} aria-pressed={on} disabled={!can} aria-label={`${on ? 'Leave out' : 'Invite'} ${first(a.id)}${can ? '' : ': no action left'}`} onClick={() => toggle(a.id)}>
       <HeroPortrait id={a.id} small /><span><b>{first(a.id)}{bots.includes(a.id) && <i>AI</i>}</b><small>{note}</small></span><Icon name={on ? 'check' : can ? 'plus' : 'x'} size={14} />
      </button>;
     })}
     {!present.length && <span className="challenge-alone">No ally stands in {regionName(where)}. Allies who travel here can be invited.</span>}
    </div>
    <div className="challenge-confirm">
     <p className="challenge-advice" role="status">{assess && (advice[tag] ? <><Icon name="compass" size={15} />{advice[tag]}</> : 'The advisor is weighing this party…')}</p>
     <button type="button" className="gold-button" disabled={!command} onClick={() => command && send(command)}>{party.length ? `Challenge with ${listed(party.map(first))}` : 'Challenge alone'}<Icon name="arrow" size={15} /></button>
    </div>
   </section>;
  })}</div>
 </div>;
}
