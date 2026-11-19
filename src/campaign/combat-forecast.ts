// What a combat round comes to with the tokens as they lie: the wounds the opponents deal and the damage they take.
// Nothing here predicts dice. Every number is what the rules give when the Defense Phase is resolved now, and it is the
// rules engine that gives it: the steps are played on a throw-away copy of the public state, so the forecast cannot drift
// from what the buttons then do. The dice of an attack in progress are counted as they lie, and say so.
import { publicState } from '../ai/public-state';
import { creatureRule, defense, finishAttack, monsterEffect, placeTokens, resolution, stats } from '../rules/combat';
import { card, character } from '../rules/common';
import { immune } from '../rules/effects';
import { eventBoss } from '../rules/world';
import type { BattleStage, Boxes, ContentPack, Faction, State } from '../rules/model';
import type { GameView } from '../rules/view';

/** What the opponent's rule does to the attacker when his dice stay as they lie. Losses are negative. */
export type RuleEffect = { hero: string; health: number; energy: number; stun: number; curse: number; dice: number; damage: number; powers: number; falls: boolean };
export type RoundForecast = {
 side: Faction;
 /** The attacker whose rolled dice are counted as if his hits were placed now. */
 rolling?: string;
 /** What the opponent's rule does to that attacker before his hits are placed. */
 effect?: RuleEffect;
 /** Living characters who have still to roll this round. */
 waiting: string[];
 /** The tokens the forecast is made from: the Combat Area, with the dice of the attack in progress. */
 boxes: Boxes;
 /** The Ranged Strike step: opponents that fall before they attack, and whether that ends the combat. */
 ranged: { kills: number; won: boolean };
 /** The Damage step: the combined Attack of the opponents left, the hits and the armor set against it. */
 attack: number; blocked: number; absorbed: number; wounds: number;
 /** The Damage step is already resolved: `left` of its wounds are still to be assigned. */
 defended: boolean; left: number;
 /**
  * The wounds still to fall take the last Health of everyone left in the fight: who then falls ("Grumbaz", "the party").
  * The fight is lost before the Resolution step unless someone is healed, so the party's damage is never struck.
  */
 wipe?: string;
 /** The Resolution step: the hit tokens that strike (ranged hits left, melee hits, attrition), the Health they strike against, and what falls. */
 strike: { ranged: number; melee: number; attrition: number }; damage: number; health: number; kills: number; won: boolean;
 /** Tokens the opponent's rule takes at the end of the round, and the damage that stays for the next one. */
 lost: number; carried: number;
 /** The round is over: only `carried` still means anything. */
 resolved: boolean;
 /** Opponents standing now, and the name they are called by. */
 opponents: number; foe: string;
};

const ROLLED: BattleStage[] = ['after-pool', 'reroll', 'after-reroll', 'tokens', 'after-tokens'];
const first = (p: ContentPack, id: string) => character(p, id).name.split(' ')[0];
const none = { horde: 0, alliance: 0 };

function foeName(p: ContentPack, s: Pick<State, 'battle' | 'enemies'>) {
 const b = s.battle!;
 if (b.boss) return p.overlords.find(o => o.id === b.boss)?.name ?? p.events.find(e => e.id === b.boss)?.name ?? 'The boss';
 const enemy = s.enemies.find(e => b.enemies.includes(e.id)) ?? b.killed?.[0];
 return p.creatures.find(c => c.id === enemy?.creature)?.name ?? 'The creature';
}

function forecast(p: ContentPack, view: GameView): RoundForecast | undefined {
 const live = view.battle;
 if (view.phase !== 'combat' || !live || live.kind !== 'pve' || live.stage === 'over') return;
 const side = live.first, active = live.active;
 let s = publicState(view), b = s.battle!, rolling: string | undefined, effect: RuleEffect | undefined;
 const vitals = (id: string) => { const h = s.heroes.find(h => h.id === id)!; return { health: h.health, energy: h.energy, stun: h.stun, curse: h.curse }; };
 const dice = () => b.active?.dice.filter(d => !d.removed).length ?? 0;
 // The attack in progress, played to its end with the dice as they lie: the opponent's rule, then the hits.
 if (active && ROLLED.includes(live.stage) && !s.respawns.length) try {
  const id = active.heroId, before = vitals(id), had = dice(), damage = b.boxes[side].damage;
  if (b.stage !== 'tokens' && b.stage !== 'after-tokens') {
   let powers = 0;
   b.stage = 'after-reroll';
   try { monsterEffect(p, s); } catch (error) {
    // The Wildkin's rule asks which powers to give up: how many is known, which ones is the player's choice.
    const h = s.heroes.find(h => h.id === id)!;
    if (creatureRule(p, s) !== 'wildkin' || immune(p, h, 'wildkin')) throw error;
    const held = h.slots.flatMap(slot => [slot.card, ...slot.addons].filter((cardId): cardId is string => !!cardId && card(p, cardId).kind === 'power'));
    powers = Math.min(held.length, b.active!.dice.filter(d => !d.removed && d.value === 1).length); b.stage = 'tokens';
   }
   const after = vitals(id);
   const found: RuleEffect = { hero: id, health: after.health - before.health, energy: after.energy - before.energy, stun: after.stun - before.stun, curse: after.curse - before.curse, dice: dice() - had, damage: b.boxes[side].damage - damage, powers, falls: after.health <= 0 };
   if (found.health || found.energy || found.stun || found.curse || found.dice || found.damage || found.powers) effect = found;
  }
  // A character who falls to the rule places no hits, unless he is healed first.
  if (s.respawns.includes(id)) { b.defeated.push(id); delete b.active; }
  else { if (b.stage === 'tokens') placeTokens(p, s); if (b.stage === 'after-tokens') finishAttack(p, s); }
  rolling = id;
 } catch { s = publicState(view); b = s.battle!; rolling = undefined; effect = undefined; }
 const waiting = live.participants.filter(id => !live.defeated.includes(id) && !live.acted.includes(id) && id !== rolling);
 const attackOf = () => b.boss ? stats(p, s).attack : b.enemies.reduce((n, id) => n + stats(p, s, id).attack, 0);
 const healthOf = () => b.boss ? stats(p, s).health : b.enemies.reduce((n, id) => n + stats(p, s, id).health, 0);
 const fallen = () => b.killed?.length ?? 0;
 const box = () => b.boxes[side], foe = foeName(p, s), opponents = b.boss ? 1 : b.enemies.length;
 const result: RoundForecast = { side, rolling, effect, waiting, boxes: { ...box() }, ranged: { kills: 0, won: false }, attack: 0, blocked: 0, absorbed: 0, wounds: 0, defended: false, left: 0, strike: { ranged: box().damage, melee: 0, attrition: 0 }, damage: 0, health: healthOf(), kills: 0, won: false, lost: 0, carried: 0, resolved: false, opponents, foe };
 if (live.stage === 'round-end') return { ...result, resolved: true, carried: box().damage, damage: box().damage };
 if (live.stage === 'wounds' || live.stage === 'resolution') {
  result.defended = true; result.left = live.wounds[side];
  result.attack = attackOf(); result.blocked = box().defense; result.absorbed = box().armor; result.wounds = Math.max(0, result.attack - result.blocked - result.absorbed);
 } else {
  const before = fallen();
  delete b.active; b.wounds = { ...none }; b.stage = 'defense';
  defense(p, s);
  result.ranged = { kills: b.boss ? Number(!!b.winner) : fallen() - before, won: !!b.winner };
  if (b.winner) return { ...result, damage: result.boxes.damage, kills: result.ranged.kills, won: true };
  result.attack = attackOf(); result.blocked = box().defense; result.absorbed = box().armor; result.wounds = b.wounds[side];
 }
 // Wounds that take the last Health of everyone left end the fight before the party strikes back: say so, instead of a win
 // that is never reached. (A lone character with 2 Health was told "2 wounds incoming · 3 of 3 damage: Crusader falls".)
 const standing = live.participants.filter(id => !b.defeated.includes(id)), pending = result.defended ? result.left : result.wounds;
 const stamina = standing.reduce((n, id) => { const h = s.heroes.find(h => h.id === id)!; return n + Math.max(0, h.health) + Object.values(h.pets ?? {}).reduce((a, v) => a + v, 0); }, 0);
 // While someone has still to roll, the wounds are not final: his hits and armor may yet stop them.
 // And when everyone left stands without Health (the choice where to return is open), the fight is lost unless a heal comes.
 if (standing.length && (pending > 0 && pending >= stamina && !waiting.length || !stamina)) result.wipe = standing.length === 1 ? first(p, standing[0]) : 'the party';
 // The Resolution step, as if every wound were assigned.
 const strike = { ranged: box().damage, melee: box().defense, attrition: eventBoss(p, s)?.combat === 'spilskin' ? 0 : box().attrition };
 const strikes = strike.ranged + strike.melee + strike.attrition, health = healthOf(), before = fallen();
 b.wounds = { ...none }; s.respawns = []; b.stage = 'resolution';
 resolution(p, s);
 result.strike = strike; result.damage = strikes; result.health = health; result.won = !!b.winner; result.kills = b.boss ? Number(!!b.winner) : fallen() - before;
 if (!b.winner) { result.carried = box().damage; result.lost = Math.max(0, strikes - (health - healthOf()) - result.carried); }
 return result;
}

const forecasts = new WeakMap<GameView, { value: RoundForecast | undefined }>();
/**
 * The round as it stands in a fight against creatures or a boss. `undefined` in a fight between the factions (see
 * `versus`), outside combat, and when the combat is over.
 */
export function roundForecast(p: ContentPack, view: GameView): RoundForecast | undefined {
 const known = forecasts.get(view);
 if (known) return known.value;
 let value: RoundForecast | undefined;
 try { value = forecast(p, view); } catch { value = undefined; }
 forecasts.set(view, { value });
 return value;
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const stays = (n: number) => `${count(n, 'damage token')} ${n === 1 ? 'stays' : 'stay'} for the next round`;
const group = (f: Pick<RoundForecast, 'foe'>, n: number) => n > 1 ? `${n} × ${f.foe}` : f.foe;

/** The opponent's rule on the attacker's dice, in words: "Sofeea loses 1 health". Empty when it does nothing. */
export function effectWords(p: ContentPack, effect?: RuleEffect): string {
 if (!effect) return '';
 const parts = [
  effect.health < 0 && `loses ${-effect.health} health`, effect.energy < 0 && `loses ${-effect.energy} energy`,
  effect.stun > 0 && `takes ${count(effect.stun, 'Stun token')}`, effect.curse > 0 && `takes ${count(effect.curse, 'Curse token')}`,
  effect.dice < 0 && `loses ${count(-effect.dice, 'die', 'dice')}`, effect.powers > 0 && `gives up ${count(effect.powers, 'power')}`,
 ].filter((part): part is string => !!part);
 const name = first(p, effect.hero), taken = effect.damage < 0 ? `${count(-effect.damage, 'damage token')} ${effect.damage === -1 ? 'is' : 'are'} removed` : '';
 const own = parts.length ? `${name} ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]}` : '';
 return [own, taken].filter(Boolean).join(' · ') + (effect.falls ? ` · ${name} falls unless healed` : '');
}

export type ForecastLine = { key: 'ranged' | 'incoming' | 'outgoing'; label: string; sum: string; result: string; tone: 'good' | 'bad' | 'plain' };
const falls = (f: RoundForecast, n: number) => `${group(f, n)} ${n > 1 ? 'fall' : 'falls'}`;
/**
 * The forecast as the lines under the Combat Area: what the opponents do to the party, and what the party does to them. The
 * labels name no "you": the same lines stand under a fight the bots are fighting.
 * `sum` is the arithmetic, `result` what it comes to.
 */
export function forecastLines(f: RoundForecast): ForecastLine[] {
 if (f.resolved) return [{ key: 'outgoing', label: 'Round over', sum: f.carried ? stays(f.carried) : 'No damage carries over', result: `${f.carried} of ${f.health}`, tone: 'plain' }];
 if (f.ranged.won) return [{ key: 'ranged', label: 'Ranged strike', sum: `${f.boxes.damage} ranged of ${f.health} health`, result: falls(f, f.opponents), tone: 'good' }];
 const lines: ForecastLine[] = [], standing = f.opponents - f.ranged.kills;
 if (f.ranged.kills) lines.push({ key: 'ranged', label: 'Ranged strike', sum: `${f.boxes.damage} ranged strike first`, result: `${f.ranged.kills} of ${f.opponents} ${f.ranged.kills === 1 ? 'falls' : 'fall'}`, tone: 'good' });
 const stopped = [f.blocked ? count(f.blocked, 'hit') : '', f.absorbed ? `${f.absorbed} armor` : ''].filter(Boolean);
 lines.push({
  key: 'incoming', label: 'Enemy attack', sum: [`${f.attack} attack`, ...stopped].join(' − '),
  result: (!f.wounds ? 'No wounds' : !f.defended ? count(f.wounds, 'wound') : f.left ? `${count(f.left, 'wound')} to assign` : `${count(f.wounds, 'wound')} taken`) + (f.wipe ? ` · ${f.wipe} falls` : ''),
  tone: f.wounds ? 'bad' : 'good',
 });
 lines.push({
  key: 'outgoing', label: 'Party damage', sum: `${f.strike.ranged} ranged + ${f.strike.melee} melee + ${f.strike.attrition} attrition`,
  // A party that falls to the wounds first never strikes: its damage is no promise.
  result: f.wipe ? `${f.damage} of ${f.health} · not struck` : `${f.damage} of ${f.health}${f.won ? ` · ${standing > 1 ? 'all fall' : 'falls'}` : f.kills ? ` · ${f.kills} of ${standing} ${f.kills === 1 ? 'falls' : 'fall'}` : ''}`,
  tone: f.wipe ? 'bad' : f.won ? 'good' : 'plain',
 });
 return lines;
}

/** One sentence for where the lines do not fit: "1 wound incoming · 3 of 3 damage: Crusader falls". */
export function forecastSentence(f: RoundForecast): string {
 if (f.resolved) return f.carried ? stays(f.carried) : 'No damage carries into the next round';
 if (f.ranged.won) return `Ranged strike: ${f.boxes.damage} damage, ${falls(f, f.opponents)}`;
 const standing = f.opponents - f.ranged.kills;
 const incoming = !f.wounds ? f.defended ? 'No wounds taken' : 'No wounds incoming' : !f.defended ? `${count(f.wounds, 'wound')} incoming` : f.left ? `${count(f.left, 'wound')} to assign` : `${count(f.wounds, 'wound')} taken`;
 if (f.wipe) return `${incoming}: ${f.wipe} falls unless healed · the fight is lost before the party strikes`;
 const outgoing = `${f.damage} of ${f.health} damage${f.won ? `: ${falls(f, standing)}` : f.kills ? `: ${f.kills} of ${standing} ${f.kills === 1 ? 'falls' : 'fall'}` : ''}`;
 return `${incoming} · ${outgoing}`;
}

/** What is left when the round ends without a win: "3 damage tokens stay for the next round", and what the opponent's rule takes of it. */
export function carryWords(f: RoundForecast): string {
 if (f.wipe) return `Unless ${f.wipe === 'the party' ? 'someone' : f.wipe} is healed, the wounds fall first and the fight is lost.`;
 if (f.resolved || f.ranged.won || f.won) return '';
 if (!f.lost) return f.carried ? stays(f.carried) : '';
 if (!f.carried) return `${f.foe}’s rule removes the last ${f.lost === 1 ? 'damage token' : `${f.lost} damage tokens`}`;
 return `${f.foe}’s rule removes ${count(f.lost, 'damage token')}: ${f.carried} of ${f.carried + f.lost} ${f.carried === 1 ? 'stays' : 'stay'} for the next round`;
}

/** Whose dice are counted and who has still to roll: "with Sofeea’s dice as they lie · Grumbaz still to attack". */
export function forecastNote(p: ContentPack, f: RoundForecast): string {
 // What ends the fight is said before whose dice are counted.
 if (f.wipe) return '';
 if (f.resolved || f.defended) return '';
 const names = f.waiting.map(id => first(p, id));
 return [f.rolling && `with ${first(p, f.rolling)}’s dice as they lie`, names.length && `${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]} still to attack`].filter(Boolean).join(' · ');
}

export type Versus = {
 boxes: Record<Faction, Boxes>;
 /** Hits that strike in the Resolution step: melee and attrition together. */
 strike: Record<Faction, number>;
 /** Armor tokens each faction has still to set against the other's hits. While any are left, `strike` is not final. */
 armor: Record<Faction, number>;
 /** With no armor left to use: the faction that takes wounds in the Resolution step, and how many. */
 loser?: Faction; wounds: number;
};
/**
 * A fight between the factions: both Combat Areas, and who is ahead in the Resolution step. Each armor token cancels one
 * opposing ranged or melee hit and one attrition hit (rulebook p. 34), so nobody is ahead until the armor is used.
 */
export function versus(view: GameView): Versus | undefined {
 const b = view.battle;
 if (view.phase !== 'combat' || !b || b.kind === 'pve' || b.stage === 'over') return;
 const strike = { horde: b.boxes.horde.defense + b.boxes.horde.attrition, alliance: b.boxes.alliance.defense + b.boxes.alliance.attrition };
 const armor = { horde: b.armorDone.includes('horde') ? 0 : b.boxes.horde.armor, alliance: b.armorDone.includes('alliance') ? 0 : b.boxes.alliance.armor };
 const difference = strike.horde - strike.alliance, settled = !armor.horde && !armor.alliance;
 return { boxes: b.boxes, strike, armor, loser: !settled ? undefined : difference > 0 ? 'alliance' : difference < 0 ? 'horde' : undefined, wounds: settled ? Math.abs(difference) : 0 };
}
