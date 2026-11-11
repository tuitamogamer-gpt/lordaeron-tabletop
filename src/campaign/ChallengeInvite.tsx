// A bot asks the player's character, standing in the same region, to join its challenge.
import { BASE_PACK as p } from '../data/base';
import { Icon } from '../components';
import { character, listed } from '../rules/common';
import type { GameView } from '../rules/view';
import { challengeName } from './ChallengeDialog';
import { CreatureGlyph } from './design-system';
import { regionName } from './event-text';
import { challengeProfile, ThreatLevel } from './feedback';
import { foeName } from './hints';
import { invitedPlayers, type Challenge } from './invitations';
import { HeroPortrait } from './parts';

const first = (id: string) => character(p, id).name.split(' ')[0];

/** `reason` is the planner's expectation for the whole party, the invited characters included. */
export default function ChallengeInvite({ state, command, reason, bots, onJoin, onDecline }: { state: GameView; command: Challenge; reason: string; bots: string[]; onJoin: () => void; onDecline: () => void }) {
 const players = invitedPlayers(command, bots), others = command.allies.filter(id => bots.includes(id));
 const profile = challengeProfile(state, command), name = challengeName(state, command), title = `${profile && profile.count > 1 ? `${profile.count} × ` : ''}${name}`;
 const leader = state.heroes.find(h => h.id === command.hero)!, where = regionName(command.region ?? leader.location);
 const enemy = state.enemies.find(e => e.id === command.target), creature = p.creatures.find(a => a.id === enemy?.creature);
 const cost = players.map(id => { const h = state.heroes.find(v => v.id === id)!; return `${first(id)} (${h.actions} ${h.actions === 1 ? 'action' : 'actions'} left)`; });
 return <div className="dialog-content challenge-invite">
  <div className="invite-ask"><HeroPortrait id={command.hero} /><p><strong>{first(command.hero)}</strong> is about to challenge <strong>{foeName(p, state, command)}</strong> in {where} and asks <strong>{listed(players.map(first))}</strong> to join the fight.{others.length > 0 && ` ${listed(others.map(first))} ${others.length > 1 ? 'come' : 'comes'} along too.`}</p></div>
  <div className="invite-target">{creature ? <CreatureGlyph type={creature.rule} /> : <Icon name="swords" size={30} />}<div><strong>{title}</strong>
   {profile && <span className="challenge-stats"><ThreatLevel value={profile.threat} compact /><span><Icon name="swords" size={13} />{profile.attack} attack</span><span><Icon name="heart" size={13} />{profile.health} health</span></span>}</div></div>
  <p className="challenge-advice"><Icon name="compass" size={15} />{reason}</p>
  <p className="invite-cost">Joining spends one action of {listed(cost)}. If you decline, {first(command.hero)} decides again without {players.length > 1 ? 'them' : first(players[0])} and does not ask again this turn.</p>
  <div className="invite-actions"><button type="button" className="gold-button" onClick={onJoin}>Join the fight<Icon name="arrow" size={15} /></button><button type="button" className="quiet-button" onClick={onDecline}>Not this time</button></div>
 </div>;
}
