// A bot never drafts a player's character into its challenge (multiplayer/ownership.ts > botOwns): joining spends that character's
// action, so the player is asked. These helpers find the challenges that need asking and remember who said no.
import type { Command, State } from '../rules/model';

export type Challenge = Extract<Command, { type: 'challenge' }>;
type Turn = Pick<State, 'lap' | 'turn' | 'faction'>;

/** A character who declines is not asked again during the same faction turn. */
export const inviteKey = (s: Turn, hero: string) => `${s.lap ?? 1}:${s.turn}:${s.faction}:${hero}`;
/** The characters a challenge would bring along who are not played by the bots. */
export const invitedPlayers = (c: Challenge, bots: string[]) => c.allies.filter(id => !bots.includes(id));
/** The bots' challenges that include a player's character, leaving out the characters who declined this turn. */
export function jointChallenges(s: Turn & Pick<State, 'phase'>, legal: Command[], bots: string[], declined: ReadonlySet<string>): Challenge[] {
 if (s.phase !== 'actions') return [];
 return legal.filter((c): c is Challenge => c.type === 'challenge' && bots.includes(c.hero) && invitedPlayers(c, bots).length > 0 && invitedPlayers(c, bots).every(id => !declined.has(inviteKey(s, id))));
}
