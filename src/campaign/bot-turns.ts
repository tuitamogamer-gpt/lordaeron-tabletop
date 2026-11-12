import { faction } from '../rules/common';
import type { Command, ContentPack } from '../rules/model';
import type { GameView } from '../rules/view';

/**
 * When the bots act by themselves. Until 12. 11. 2026 they did nothing until the player found "Run AI", and with it off every
 * step of theirs (a move, a reward, the next quest, the end of their fight) waited for a click. They now play on their own
 * from the start, and the choice is remembered. Two things still wait for the player: his own characters move first in
 * their faction's turn, and while a decision dialog is open for a choice of his own (a reward he may claim, his talent)
 * the bots do not act.
 */
const KEY = 'lordaeron-bots-auto-v1';
// Tests of the rest of the table run with the bots waiting unless they ask otherwise, as they run without announcements.
const DEFAULT_AUTO = import.meta.env?.MODE !== 'test';
export function loadAuto(): boolean { try { const saved = localStorage.getItem(KEY); return saved === 'on' ? true : saved === 'off' ? false : DEFAULT_AUTO; } catch { return DEFAULT_AUTO; } }
export function saveAuto(on: boolean) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* the choice lasts until the tab closes */ } }

/** The five actions of a turn: each costs a character one of his two actions. */
const ACTIONS: Command['type'][] = ['travel', 'rest', 'train', 'town', 'challenge'];
/** One faction's turn. The bots' leave to act before the player ("Allies first") lasts until it ends. */
export const turnKey = (s: Pick<GameView, 'lap' | 'turn' | 'faction'>) => `${s.lap ?? 1}:${s.turn}:${s.faction}`;
/**
 * Whether a character of the player can still take an action in this faction turn. While one can, the bots of his faction
 * wait: the player moves first, can take an ally along on a Challenge, and is not made to watch before he plays. `legal` is
 * what the player himself may do now, so a step that only a bot can take (its talent, its revival) never waits on this.
 */
export function playerToAct(p: ContentPack, state: Pick<GameView, 'phase' | 'faction' | 'heroes'>, legal: Command[], controlled: string[]): boolean {
 if (state.phase !== 'actions') return false;
 return legal.some(c => 'hero' in c && ACTIONS.includes(c.type) && controlled.includes(c.hero) && faction(p, c.hero) === state.faction && (state.heroes.find(h => h.id === c.hero)?.actions ?? 0) > 0);
}
/** A quest reward that one of the player's characters may claim is the player's to give: the bots do not take it first. */
export const playerClaims = (state: Pick<GameView, 'phase'>, legal: Command[]) => state.phase === 'reward' && legal.some(c => c.type === 'reward');
/** What a decision dialog asks of a player. A power he could use meanwhile (a potion for a fallen ally) is not among them: it is an offer, not a question. */
const CHOICES: Command['type'][] = ['reward', 'talent', 'bid', 'respawn', 'event-choice', 'quest', 'skip-quest', 'claim-relic'];
/**
 * Whether a decision dialog is open for a choice of the player's own. While it is, the bots wait: a reward he may claim is
 * his to give, and their own choices of the same moment (a talent after a level gained together, a bid) follow his instead
 * of being announced over what he is reading.
 */
export const playerDecides = (state: Pick<GameView, 'phase'>, legal: Command[]) => state.phase !== 'combat' && legal.some(c => CHOICES.includes(c.type));

/**
 * How long the bots wait after an action of the player that can still be taken back (ms). Without it his allies would set off
 * half a second after his last action, and Undo would be gone before he could reach for it.
 */
export const UNDO_GRACE_MS = 2500;

/** How long the result of a fight the bots fought stays up before the bots close it (ms, at the normal pace). */
export const RESULT_HOLD_MS = 3000;
/**
 * How long the bots wait before their next step in a combat. Closing a fight they fought is the one step that takes longer:
 * its result is what the people watching want to read. Step by step it is not closed for them at all (`undefined`).
 */
export function botCombatDelay(candidates: Command[], stepMs: number, tempo: number, stepByStep: boolean): number | undefined {
 const closing = candidates.length > 0 && candidates.every(c => c.type === 'closeBattle');
 return closing ? stepByStep ? undefined : RESULT_HOLD_MS * tempo : stepMs * tempo;
}

/** How long the bots may take over a decision of their own before its dialog is shown after all (ms). */
export const BOT_PATIENCE_MS = 6000;
/**
 * Whether a pending decision (a reward, a talent, an Event's choice, a revival) is the bots' alone while they play by
 * themselves. Its dialog then stays away: they decide, and the stage shows what they chose.
 */
export const botsDecide = (decision: boolean, auto: boolean, botReady: boolean, legal: Command[]) => decision && auto && botReady && !legal.length;
