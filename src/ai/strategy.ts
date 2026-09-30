import { card, faction } from '../rules/common.js';
import { beginBattle, poolPenalties, stats } from '../rules/combat.js';
import { apply } from '../rules/game.js';
import { abilityCommands } from '../rules/legal.js';
import { availableCards, immune } from '../rules/effects.js';
import { activeEvent } from '../rules/world.js';
import type { Boxes, ContentPack, Enemy, Faction, Hero, Reward, State } from '../rules/model.js';
import type { GameView } from '../rules/view.js';
import { abilityScore, chance, dieHazard, projectedBoxes } from './tactics.js';
import { factionView, publicState } from './public-state.js';

export interface Objective {
 id: string; region: string; label: string; enemies: Enemy[]; boss?: string;
 reward?: Reward; quest?: string; clue?: boolean; pvp?: string[];
}
export interface Forecast { win: number; wounds: number; rounds: number; damage: number; health: number; }
export interface Plan { objective: Objective; party: string[]; score: number; travelActions: number; forecast: Forecast; }
const sum = (n: number[]) => n.reduce((a, b) => a + b, 0);

/** Public map path cost includes flights, enemy homes and costly blue roadblocks. */
export function routeDistance(p: ContentPack, s: GameView, from: string, to: string, side: Faction): number {
 const costs = new Map([[from, 0]]), queue: [string, number][] = [[from, 0]];
 while (queue.length) {
  queue.sort((a, b) => a[1] - b[1]);
  const [at, cost] = queue.shift()!;
  if (at === to) return cost;
  if (cost !== costs.get(at)) continue;
  const r = p.regions.find(r => r.id === at)!;
  const next = [...r.neighbors, ...([side, 'both'].includes(r.flight ?? '') ? p.regions.filter(r => [side, 'both'].includes(r.flight ?? '')).map(r => r.id) : [])];
  for (const id of next) {
   const region = p.regions.find(r => r.id === id)!;
   if (region.home && region.home !== side) continue;
   const extra = s.enemies.some(e => e.region === id && e.color === 'blue') ? 3 : 0;
   const value = cost + 1 + extra;
   if (value < (costs.get(id) ?? Infinity)) { costs.set(id, value); queue.push([id, value]); }
  }
 }
 return 100;
}

export function objectives(p: ContentPack, v: GameView, side: Faction): Objective[] {
 const s = factionView(v, side), result: Objective[] = [], seen = new Set<string>();
 for (const e of s.enemies.filter(e => e.faction === side || !e.faction || !!activeEvent(p, s, 'subterfuge'))) {
  const group = s.enemies.filter(t => t.region === e.region && t.creature === e.creature && t.faction === e.faction && (t.color === 'blue') === (e.color === 'blue'));
  const key = group.map(e => e.id).sort().join('|');
  if (seen.has(key)) continue; seen.add(key);
  const quest = p.quests.find(q => q.id === e.quest);
  result.push({ id: e.id, region: e.region, enemies: group, label: quest?.name ?? p.creatures.find(c => c.id === e.creature)!.name, reward: quest?.reward, quest: quest?.id });
 }
 if (s.overlord.region) result.push({ id: s.overlord.id, region: s.overlord.region, enemies: [], boss: s.overlord.id, label: p.overlords.find(o => o.id === s.overlord.id)!.name });
 else for (const t of s.kazzak ?? []) if (t.real !== false) result.push({ id: s.overlord.id, region: t.region, enemies: [], boss: s.overlord.id, label: t.real ? 'Kazzak' : 'Kazzak clue', clue: t.real !== true });
 for (const w of s.world ?? []) {
  const e = p.events.find(e => e.id === w.id);
  if (e?.boss && !w.cleared && (!e.boss.perFaction || !w.attempts.includes(side))) result.push({ id: e.id, region: e.boss.region, enemies: [], boss: e.id, label: e.name, reward: e.boss.strong });
 }
 return result;
}

function encounterState(p: ContentPack, view: GameView, o: Objective, party: Hero[]): State {
 const s = publicState(view);
 for (const h of party) s.heroes[s.heroes.findIndex(v => v.id === h.id)] = structuredClone(h);
 s.respawns = []; delete s.reward; delete s.pendingPortal; delete s.energySpent;
 beginBattle(s, o.pvp ? 'pvp' : 'pve', [...party.map(h => h.id), ...o.pvp ?? []], o.enemies.map(e => e.id), faction(p, party[0].id), o.region, o.boss);
 return s;
}
interface Profile { box: Boxes; hazard: number; energy: number; }
const profileCaches = new WeakMap<ContentPack, Map<string, Profile>>();

function profile(p: ContentPack, frame: State, h: Hero): Profile {
 let cache=profileCaches.get(p);if(!cache){cache=new Map();profileCaches.set(p,cache);}
 const b=frame.battle!;
 const key=JSON.stringify([h.id,b.boss,b.region,b.kind,frame.overlord,frame.world,
  b.enemies.map(id=>{const e=frame.enemies.find(e=>e.id===id)!;return [e.creature,e.color];}),
  frame.heroes.filter(h=>b.participants.includes(h.id)).map(({location:_l,actions:_a,xp:_x,gold:_g,talentChoices:_t,...combat})=>combat)]);
 const cached=cache.get(key);if(cached)return cached;
 let s = apply(p, frame, { type: 'attacker', hero: h.id });
 // Forecast only: two passes over a bounded set of power choices. Live combat
 // separately evaluates every supplied legal command and its follow-up choices.
 for (let i = 0; i < 2; i++) {
  const candidates=abilityCommands(p,s).filter((c):c is Extract<import('../rules/model.js').Command,{type:'ability'}>=>c.type==='ability');
  const groups=new Map<string,typeof candidates>();
  for(const c of candidates){const group=groups.get(c.card)??[];group.push(c);groups.set(c.card,group);}
  let used=false;
  for(const group of groups.values()){
   const bounded=group.length<=4?group:Array.from({length:4},(_,i)=>group[Math.floor(i*(group.length-1)/3)]);
   let best: {command:typeof candidates[number];score:number}|undefined;
   for (const command of bounded) {
    const score = abilityScore(p, s, command);
    if (score > .02 && (!best || score > best.score)) best = { command, score };
   }
   if(best){s=apply(p,s,best.command);used=true;}
  }
  if(!used)break;
 }
 poolPenalties(p, s);
 const a = s.battle!.active!;
 const dice = a.dice.filter(d => !d.removed);
 for (const d of dice.filter(d => a.forbidden?.pool?.includes(d.color))) d.removed = true;
 for (const color of ['red', 'blue', 'green'] as const) {
  const excess = dice.filter(d => !d.removed && d.color === color).length - (a.poolLimits?.[color] ?? 7);
  for (const d of dice.filter(d => !d.removed && d.color === color).slice(0, Math.max(0, excess))) d.removed = true;
 }
 const remaining = dice.filter(d => !d.removed).sort((a, b) => (a.color === 'green' ? 0 : 1) - (b.color === 'green' ? 0 : 1));
 const stun = h.stun * 2;
 if (remaining.length < stun) return { box: { damage: 0, defense: 0, armor: 0, attrition: 0 }, hazard: h.health + 10, energy: h.energy };
 for (const d of remaining.slice(0, stun + h.curse)) d.removed = true;
 const box = projectedBoxes(p, s, faction(p, h.id));
 const rule = oRule(p, frame);
 const rerolls = rule === 'ghoul' ? 0 : Math.max(0, a.reroll);
 const hit = chance(a.threat), live = dice.filter(d => !d.removed), bonus = Math.min(rerolls, live.length * (1 - hit)) * hit;
 const redBlue = live.filter(d => d.color !== 'green').length;
 if (live.length) {
  box.damage += bonus * live.filter(d => d.color === 'blue').length / live.length;
  box.defense += bonus * live.filter(d => d.color === 'red').length / live.length;
  if (rule !== 'drake') box.armor += bonus * live.filter(d => d.color === 'green').length / live.length;
 }
 // Post-roll manipulation has value beyond a raw pool: an 8 converter can turn
 // a miss into a hit; conditional Spot effects are discounted by trigger chance.
 for (const id of availableCards(p, h)) for (const ability of card(p, id).abilities) {
  if (!['after-pool', 'after-reroll'].includes(ability.timing) || ability.cost || card(p, id).type === 'instant') continue;
  for (const e of ability.effects) {
   if (e.op === 'change' && (e.value === 8 || e.delta)) {
    const n = Math.min(e.count, live.filter(d => !e.filter.colors || e.filter.colors.includes(d.color)).length);
    const value = n * (e.value === 8 ? 1 - hit : .125);
    if (e.color === 'green') box.armor += value; else box.damage += value * .7;
   }
  }
 }
 let hazard = sum(live.map(d => dieHazard(p, s, h, d))) / 1.6;
 hazard *= 1 - Math.min(.7, rerolls / Math.max(1, live.length) * .7);
 if (immune(p, h, rule)) hazard = frame.battle?.boss ? hazard : 0;
 const result={ box, hazard, energy: Math.max(0, h.energy - s.heroes.find(v => v.id === h.id)!.energy) + (rule === 'gnoll' ? redBlue / 8 : 0) };
 if(cache.size>=768)cache.delete(cache.keys().next().value!);cache.set(key,result);return result;
}
function oRule(p: ContentPack, s: State) { return p.creatures.find(c => c.id === s.enemies.find(e => e.id === s.battle?.enemies[0])?.creature)?.rule ?? 'none'; }

export function createStrategy(p: ContentPack, s: GameView, risk: number) {
 const distances = new Map<string, number>(), forecasts = new Map<string, Forecast>(), plans = new Map<string, Plan | undefined>();
 const goals = new Map<Faction, Objective[]>();
 const distance = (from: string, to: string, side: Faction) => {
  const key = `${side}:${from}:${to}`;
  if (!distances.has(key)) distances.set(key, routeDistance(p, s, from, to, side));
  return distances.get(key)!;
 };
 const targets = (side: Faction) => { if (!goals.has(side)) goals.set(side, objectives(p, s, side)); return goals.get(side)!; };
 const forecast = (o: Objective, party: Hero[]): Forecast => {
  const key = JSON.stringify([o.id, o.region, party.map(h => [h.id, h.health, h.energy, h.curse, h.stun, h.slots, h.talents])]);
  if (forecasts.has(key)) return forecasts.get(key)!;
  const frame = encounterState(p, s, o, party), profiles = party.map(h => profile(p, frame, h));
  const hp = sum(party.map(h => h.health + sum(Object.values(h.pets)) * .8));
  let foes = o.boss ? [stats(p, frame)] : o.enemies.map(e => stats(p, frame, e.id));
  if (o.pvp) {
   const opponents = s.heroes.filter(h => o.pvp!.includes(h.id));
   foes = [{ health: sum(opponents.map(h => h.health)), attack: sum(opponents.map(h => h.level + 2)), threat: Math.max(...opponents.map(h => h.level)) + 2 }];
  }
  const rule = oRule(p, frame), initialHealth = sum(foes.map(e => e.health));
  const energy = party.map(h => h.energy);
  let stored = 0, wounds = 0, round = 0, totalDamage = 0;
  const kill = () => { foes = foes.filter(e => { if (stored + 1e-6 < e.health) return true; stored -= e.health; return false; }); };
  foes.sort((a, b) => a.health - b.health);
  while (foes.length && round < 7) {
   round++;
   const boxes = { damage: 0, defense: 0, armor: 0, attrition: 0 };
   profiles.forEach((a, i) => {
    const sustain = a.energy <= energy[i] ? 1 : .5;
    energy[i] = Math.max(0, energy[i] - a.energy);
    for (const k of Object.keys(boxes) as (keyof Boxes)[]) boxes[k] += a.box[k] * sustain;
    wounds += a.hazard;
   });
   totalDamage += boxes.damage + boxes.defense + boxes.attrition;
   stored += boxes.damage; kill();
   if (!foes.length) break;
   wounds += Math.max(0, sum(foes.map(e => e.attack)) - boxes.defense - boxes.armor);
   stored += boxes.defense + boxes.attrition; kill();
   const event = p.events.find(e => e.id === o.boss)?.boss?.combat;
   const heal = o.boss === 'kelthuzad' ? s.heroes.length : event === 'dungin' ? 4 : event === 'zaeldarr' ? 2 : event === 'daecris' ? 3 * party.length : rule === 'crusader' ? foes.length : rule === 'worgen' ? foes.length * 2 : rule === 'infernal' ? 3 : 0;
   if (foes.length) stored = Math.max(0, stored - heal);
  }
  const margin = hp - wounds;
  let win = (foes.length ? .02 : 1) / (1 + Math.exp(-margin / Math.max(1.5, hp * .22)));
  // A pooled party must not hide a fragile member likely to die to their own dice.
  if (profiles.some((v, i) => v.hazard >= party[i].health)) win *= .5;
  const result = { win, wounds, rounds: round, damage: totalDamage / Math.max(1, round), health: initialHealth };
  forecasts.set(key, result); return result;
 };
 const rewardValue = (o: Objective, party: Hero[]) => {
  if (o.clue) return party.some(h => h.level >= 3) ? 7 : 0;
  if (o.boss === s.overlord.id) return 65 + (!s.variants?.overlordOnly ? s.turn * .7 : 0);
  if (!o.reward) return o.enemies.some(e => e.color === 'blue') ? 3 : 5;
  const q = p.quests.find(q => q.id === o.quest), r = o.reward;
  const left = q ? s.enemies.filter(e => e.quest === q.id).length : o.enemies.length;
  const fraction = o.enemies.length ? Math.min(1, o.enemies.length / Math.max(1, left)) : 1;
  const xp = sum(party.map(h => h.level === 5 ? 0 : Math.max(0, r.xp / party.length - Math.max(0, h.level - (q?.level ?? h.level)))));
  const levelUp = party.some(h => h.level < 5 && h.xp + r.xp / party.length >= p.xp[h.level]) ? 3 : 0;
  return (5 + xp * 2.8 + r.gold * .45 + r.items.length * 3 + (r.special?.length ?? 0) * 3 + levelUp) * fraction;
 };
 const value = (o: Objective, party: Hero[], f = forecast(o, party)) => f.win * rewardValue(o, party) - (1 - f.win) * (18 + party.length * 5) * risk - f.wounds * .32 * risk - party.length * .8;
 const plan = (h: Hero): Plan | undefined => {
  const key = JSON.stringify([h.id, h.location, h.health, h.energy, h.actions]);
  if (plans.has(key)) return plans.get(key);
  const side = faction(p, h.id), friends = s.heroes.filter(a => faction(p, a.id) === side && a.id !== h.id && a.health > 0);
  let best: Plan | undefined;
  const nearby=targets(side).filter(o=>{
   if (o.boss && !o.reward && h.level < 3) return false;
   return o.enemies[0]?.color !== 'blue' || o.region === h.location || s.enemies.some(e => e.region === o.region && e.faction === side);
  }).sort((a,b)=>distance(h.location,a.region,side)-distance(h.location,b.region,side)).slice(0,5);
  for (const o of nearby) {
   const d = distance(h.location, o.region, side);
   for (let mask = 0; mask < 1 << friends.length; mask++) {
    const party = [h, ...friends.filter((_, i) => mask & (1 << i))];
    if (o.clue && party.length > 1) continue;
    const travels = party.map(a => Math.ceil(distance(a.location, o.region, side) / 2));
    if (travels.some((t,i) => t > 6 || (!s.variants?.overlordOnly && t+1>party[i].actions+2*Math.floor((30-s.turn)/2)))) continue;
    const wait = Math.max(...travels.map((t, i) => Math.max(0, t + 1 - party[i].actions)));
    const f = o.clue ? { win: 1, wounds: 0, rounds: 0, damage: 0, health: 0 } : forecast(o, party);
    const score = (value(o, party, f) - wait * .9) / (1 + sum(travels) * .65) - Math.max(0, d - 8) * .2;
    if (!best || score > best.score) best = { objective: o, party: party.map(h => h.id), score, travelActions: Math.ceil(d / 2), forecast: f };
   }
  }
  plans.set(key, best); return best;
 };
 return { distance, targets, forecast, rewardValue, value, plan };
}
