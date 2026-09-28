import { capacity, card, character, faction, hero, other } from './common.js';
import { creatureRule, eligibleAttackers, living } from './combat.js';
import { availableCards, condition, immune, matches, timing } from './effects.js';
import { eventCommands } from './legal-events.js';
import { apply } from './game.js';
import { bagSize, classDeck, equipped, heroSlots } from './inventory.js';
import { loadouts } from '../ai/loadout.js';
import { reachable, respawnRegions } from './movement.js';
import type { AbilityArgs, Command, ContentPack, Effect, Hero, State } from './model.js';

export function combinations<T>(values: T[], count: number, limit = 64): T[][] {
 const result: T[][] = [];
 const visit = (start: number, chosen: T[]) => { if (result.length >= limit) return; if (chosen.length === count) { result.push(chosen); return; } for (let i = start; i <= values.length - (count - chosen.length); i++) visit(i + 1, [...chosen, values[i]]); };
 if (count >= 0 && count <= values.length) visit(0, []); return result;
}
function argsFor(p: ContentPack, s: State, h: Hero, effects: Effect[],cardId:string): AbilityArgs[] {
 const expand=(list:Effect[]):Effect[]=>list.flatMap(e=>e.op==='if'?expand(condition(p,s,h,cardId,e.condition)?e.then:e.otherwise??[]):('effects'in e?[e,...expand(e.effects)]:[e]));effects=expand(effects);
 const diceEffect = effects.find(e => e.op === 'spot' || e.op === 'remove' || e.op === 'change');
 let args: AbilityArgs[] = [{}];
 if (diceEffect && (diceEffect.op === 'spot' || diceEffect.op === 'remove' || diceEffect.op === 'change')) {
  const choices = (s.battle?.active?.dice ?? []).filter(d => matches(d, diceEffect.filter) && (diceEffect.op === 'change' || !d.spotted));
  args = combinations(choices.map(d => d.id), diceEffect.count).map(dice => ({ dice }));
 }
 if (effects.some(e => e.op === 'resource' && e.target === 'friendly')) args = args.flatMap(a => (s.battle?.participants ?? [h.id]).filter(id => faction(p, id) === faction(p, h.id)).map(target => ({ ...a, target })));
 if (effects.some(e => e.op === 'heal-pet'||e.op==='sacrifice-pet')) args = args.flatMap(a => Object.keys(h.pets).map(target => ({ ...a, target })));
 for(const e of effects){
  if(e.op==='change'&&e.colorChoice)args=args.flatMap(a=>(['red','blue','green'] as const).map(color=>({...a,color})));
  if(e.op==='equip-power'&&e.slot===undefined)args=args.flatMap(a=>heroSlots(p,h).flatMap((s,slot)=>s.types.includes(card(p,e.card).type)?[{...a,slot}]:[]));
  if(e.op==='remove-chosen')args=args.flatMap(a=>combinations((s.battle?.active?.dice??[]).filter(d=>!d.removed&&!d.spotted&&!a.dice?.includes(d.id)).map(d=>d.id),e.count).map(removeDice=>({...a,removeDice})));
  if(e.op==='dice-choice')args=args.flatMap(a=>{const result:AbilityArgs[]=[];for(let red=0;red<=e.amount;red++)for(let blue=0;blue<=e.amount-red;blue++)result.push({...a,colors:[...Array(red).fill('red'),...Array(blue).fill('blue'),...Array(e.amount-red-blue).fill('green')]});return result;});
  if(e.op==='preset')args=combinations((s.battle?.active?.dice??[]).filter(d=>!d.removed&&!d.fixed&&d.color===e.color).map(d=>d.id),e.values.length).map(dice=>({dice}));
  if(e.op==='redirect-hits')args=combinations((s.battle?.active?.dice??[]).filter(d=>matches(d,{colors:[e.color],min:s.battle?.active?.threat})).map(d=>d.id),e.count).map(dice=>({dice}));
  if(e.op==='change'&&e.repeat&&e.count===2)args.push(...(s.battle?.active?.dice??[]).filter(d=>matches(d,e.filter)).map(d=>({dice:[d.id,d.id]})));
  if(e.op==='reroll-selected')args=args.flatMap(a=>Array.from({length:e.max==='level'?h.level:e.max},(_,i)=>combinations((s.battle?.active?.dice??[]).filter(d=>matches(d,e.filter)).map(d=>d.id),i+1)).flat().map(dice=>({...a,dice})));
  if(e.op==='unequip-choice')args=args.flatMap(a=>e.cards.filter(id=>equipped(p,h).includes(id)).map(target=>({...a,target})));
  if(e.op==='defeat-independent')args=args.flatMap(a=>s.enemies.filter(e=>s.battle?.enemies.includes(e.id)&&e.color==='blue').map(e=>({...a,target:e.id})));
  if(e.op==='creature-dice')args=args.flatMap(a=>(s.battle?.enemies??[]).map(target=>({...a,target})));
  if(e.op==='heal-reaction'){
   args=args.flatMap(a=>Object.keys(s.battle?.losses??{}).filter(id=>faction(p,id)===faction(p,h.id)).map(target=>({...a,target})));
   if(availableCards(p,h).some(id=>card(p,id).healSplash?.cards.includes(cardId)))args=args.flatMap(a=>[a,...(s.battle?.participants??[]).filter(id=>id!==a.target&&!s.battle?.defeated.includes(id)&&faction(p,id)===faction(p,h.id)).map(secondaryTarget=>({...a,secondaryTarget}))]);
  }
  if(e.op==='revive')args=args.flatMap(a=>s.respawns.filter(id=>(e.self?id===h.id:id!==h.id)&&faction(p,id)===faction(p,h.id)).flatMap(target=>Array.from({length:(e.amount==='level'?h.level:e.amount)+1},(_,health)=>({...a,target,health}))));
  if(e.op==='combo-add'){const cards=equipped(p,h).filter(id=>card(p,id).finisher);if(cards.length)args=args.flatMap(a=>cards.map(target=>({...a,target})));}
  if(e.op==='equip-demon')args=args.flatMap(a=>h.learned.filter(id=>card(p,id).trait==='Demon').flatMap(target=>heroSlots(p,h).flatMap((s,slot)=>s.types.includes('active')?[{...a,target,slot}]:[])));
 }
 if(effects.some(e=>e.op==='unequip-self'||e.op==='equip-power')&&bagSize(p,h.bag)>=3)args=args.flatMap(a=>[undefined,...[...h.bag,...equipped(p,h).filter(id=>card(p,id).kind==='item')].filter(id=>!card(p,id).bagExempt)].map(discard=>({...a,discard})));
 if(s.battle&&card(p,cardId).kind==='power'&&card(p,cardId).type==='instant'&&availableCards(p,h).some(id=>card(p,id).freeInstantOnce)&&!s.battle.once?.includes(`free:${h.id}`))args=args.flatMap(a=>[a,{...a,free:true}]);
 return args;
}
export function abilityCommands(p: ContentPack, s: State): Command[] {
 if (!s.battle&&!s.energySpent?.length) return [];
 return (s.battle?.participants??s.energySpent??[]).flatMap(id => {
  const h = hero(s, id);
  return availableCards(p, h).flatMap(id => card(p, id).abilities.filter(a => !a.automatic&&!a.judgement&&(a.timing === timing(s)||((a.reaction==='defeat'&&s.respawns.length)||(a.reaction==='friendly-damage'&&Object.keys(s.battle?.losses??{}).length))||(a.timing==='energy-spent'&&s.energySpent?.includes(h.id))||(a.timing==='wound'&&a.condition?.kind==='has-damage'&&!!s.battle?.losses?.[h.id]))).flatMap(a => argsFor(p, s, h, a.effects.map(e=>{const v=availableCards(p,h).map(c=>card(p,c).spotOverride).find(v=>v?.cards.includes(id));return e.op==='spot'&&v?{...e,filter:{...e.filter,min:v.min}}:e;}),id).map(args => ({ type: 'ability' as const, hero: h.id, card: id, ability: a.id, args }))));
 });
}
function discards(p: ContentPack, h: Hero, incoming: string): (string | undefined)[] { return bagSize(p, [...h.bag, incoming]) > 3 ? [...h.bag, incoming].filter(id => !card(p, id).bagExempt) : [undefined]; }
export function legalActions(p: ContentPack, s: State): Command[] {
 const list: Command[] = [];
 if (s.phase === 'finished') return list;
 for(const h of s.heroes)for(const token of s.kazzak??[])if(h.location===token.region)list.push({type:'peek',hero:h.id,region:token.region});
 if(!s.battle)list.push(...abilityCommands(p,s));
 const talent = s.heroes.find(h => h.talentChoices.length);
 if (s.respawns.length) { for (const id of s.respawns) for (const r of respawnRegions(p, s, id)) list.push({ type: 'respawn', hero: id, region: r }); list.push(...abilityCommands(p, s)); }
 else if (talent) { for (const c of p.cards.filter(c => c.kind === 'talent')) list.push({ type: 'talent', hero: talent.id, card: c.id }); }
 else if (s.phase === 'actions') {
  for(const id of s.lastActions??(s.lastAction?[s.lastAction]:[]))list.push({type:'purify',hero:id});
  for (const h of s.heroes.filter(h => faction(p, h.id) === s.faction && h.actions > 0)) {
   for(const cardId of equipped(p,h).filter(id=>['prayer','lay-on-hands'].includes(card(p,id).actionPower??'')))list.push({type:'power-action',hero:h.id,card:cardId});
   for (const path of Object.values(reachable(p, s, h))) list.push({ type: 'travel', hero: h.id, path });
   for(const power of [...equipped(p,h),...h.auctionItems].filter(id=>!!card(p,id).travelPower))for(const path of Object.values(reachable(p,s,h,2+card(p,power).travelPower!.extra)))list.push({type:'travel',hero:h.id,path,power});
   for(const power of equipped(p,h).filter(id=>card(p,id).actionPower==='teleport')){
    const reached=new Set([h.location]),queue=[{at:h.location,path:[] as string[]}];
    while(queue.length){const node=queue.shift()!;if(node.path.length>=h.energy)continue;for(const r of p.regions.find(r=>r.id===node.at)!.neighbors)if(!reached.has(r)){
     reached.add(r);const path=[...node.path,r];list.push({type:'travel',hero:h.id,path,power});queue.push({at:r,path});
    }}
   }
   if(equipped(p,h).some(id=>card(p,id).actionPower==='portal')){
    const allies=s.heroes.filter(a=>a.id!==h.id&&a.location===h.location&&faction(p,a.id)===s.faction).map(a=>a.id);
    for(let n=0;n<=allies.length;n++)for(const group of combinations(allies,n)){list.push({type:'portal',hero:h.id,allies:group});if(group.length)list.push({type:'portal',hero:h.id,allies:group,self:false});}
   }
   if(equipped(p,h).some(id=>card(p,id).actionPower==='summon'))for(const t of s.heroes.filter(t=>t.id!==h.id&&faction(p,t.id)===s.faction))list.push({type:'summon',hero:h.id,target:t.id});
   list.push({ type: 'travel', hero: h.id, path: [] });
   const town = p.regions.find(r => r.id === h.location)?.town;
   for (let health = 0; health <= Math.min(h.level * (town === s.faction || town === 'both' ? 3 : 2), Math.max(0, capacity(p, h).health - h.health)); health++) {
    list.push({ type: 'rest', hero: h.id, health });
    for(const food of h.bag.filter(id=>card(p,id).trait==='Food'))list.push({type:'rest',hero:h.id,health,food});
   }
   const training=classDeck(p,h).powers.filter(c=>c.level<=h.level&&c.price<=h.gold);
   const bundles=Array.from({length:Math.min(3,training.length)},(_,i)=>combinations(training,i+1,40)).flat().filter(cs=>cs.reduce((n,c)=>n+c.price,0)<=h.gold);
   for(const bundle of bundles)list.push({type:'train',hero:h.id,cards:bundle.map(c=>c.id)});
   if (town === s.faction || town === 'both') {
    const health = Math.min(h.level, Math.max(0, capacity(p, h).health - h.health));
    list.push({ type: 'town', hero: h.id, health, operations: [] });
    for(const bundle of bundles)list.push({type:'town',hero:h.id,health,operations:bundle.map(c=>({op:'train',card:c.id}))});
    for (const id of s.merchant) for (const discard of discards(p, h, id)) list.push({ type: 'town', hero: h.id, health, operations: [{ op: 'buy', card: id, discard }] });
    for (const id of [...h.bag, ...equipped(p, h)]) list.push({ type: 'town', hero: h.id, health, operations: [{ op: 'sell', card: id }] });
   }
   const allies = s.heroes.filter(a => a.id !== h.id && a.location === h.location && faction(p, a.id) === s.faction && a.actions > 0).map(a => a.id);
   const groups = Array.from({ length: allies.length + 1 }, (_, n) => combinations(allies, n)).flat();
   const targets = [...new Set(s.enemies.filter(e => e.region === h.location).map(e => e.id)), 'pvp', s.overlord.id,...(s.world??[]).filter(e=>p.events.find(c=>c.id===e.id)?.boss).map(e=>e.id)];
   for (const target of targets) for (const allies of groups) list.push({ type: 'challenge', hero: h.id, target, allies });
   if(equipped(p,h).some(id=>card(p,id).intercept))for(const region of p.regions.find(r=>r.id===h.location)!.neighbors){
    const allies=s.heroes.filter(a=>a.id!==h.id&&a.location===region&&faction(p,a.id)===s.faction&&a.actions>0).map(a=>a.id);
    for(const target of [...s.enemies.filter(e=>e.region===region).map(e=>e.id),'pvp',s.overlord.id,...(s.world??[]).filter(e=>p.events.find(c=>c.id===e.id)?.boss).map(e=>e.id)])for(let n=0;n<=allies.length;n++)for(const group of combinations(allies,n))list.push({type:'challenge',hero:h.id,target,allies:group,region});
   }
  }
  if(s.tradeWindow)for(const h of s.heroes.filter(h=>faction(p,h.id)===s.faction))for(const to of s.heroes.filter(a=>a.id!==h.id&&faction(p,a.id)===s.faction&&a.location===h.location)){
   for(const id of h.bag.filter(id=>!card(p,id).soulbound))list.push({type:'trade',hero:h.id,to:to.id,items:[id],receiveItems:[],gold:0,receiveGold:0});
  }
  list.push({ type: 'endActions' });
 } else if (s.phase === 'management' || s.phase === 'final-management') {
  for (const h of s.heroes) {
   if (s.phase === 'management' && s.managed.includes(h.id)) continue;
   list.push({ type: 'manage', hero: h.id, slots: structuredClone(h.slots), discard: [] });
   if((s.phase==='management'&&faction(p,h.id)===s.faction)||(s.phase==='final-management'&&!s.finalReady.includes(h.id)))list.push(...loadouts(p,h));
   for (const id of [...h.bag, ...h.learned].filter(id => !equipped(p, h).includes(id))) for (let i = 0; i < h.slots.length; i++) {
    const slots = structuredClone(h.slots); if (card(p, id).addon) slots[i].addons.push(id); else slots[i].card = id;
    list.push({ type: 'manage', hero: h.id, slots, discard: [] });
   }
  }
  list.push({ type: 'endManagement' });
 } else if (s.phase === 'combat') {
  const b = s.battle!, a = b.active;
  list.push(...abilityCommands(p, s));
  if (b.stage === 'attacker') for (const id of eligibleAttackers(p, s)) list.push({ type: 'attacker', hero: id });
  if (b.stage === 'pool') {list.push({ type: 'roll' });if(a?.forbidden?.pool?.length)list.push({type:'roll',omit:{red:a.forbidden.pool.includes('red')?a.dice.filter(d=>!d.removed&&d.color==='red').length:0,blue:a.forbidden.pool.includes('blue')?a.dice.filter(d=>!d.removed&&d.color==='blue').length:0,green:a.forbidden.pool.includes('green')?a.dice.filter(d=>!d.removed&&d.color==='green').length:0}});}
  if (b.stage === 'penalty') {
   const h = hero(s, a!.heroId), dice = a!.dice.filter(d => !d.removed);
   for (const ids of combinations(dice.map(d => d.id), Math.min(dice.length, h.stun * 2 + h.curse))) list.push({ type: 'penalty', dice: ids });
  }
  if (b.stage === 'reroll') for (const die of a!.dice.filter(d => !d.removed && !d.rerolled)) list.push({ type: 'reroll', dice: [die.id] });
  if (b.stage === 'after-reroll') {
   const h = hero(s, a!.heroId), powers = h.slots.flatMap(a => [a.card, ...a.addons].filter((id): id is string => !!id && card(p, id).kind === 'power'));
   const count = creatureRule(p,s)==='wildkin'&&!immune(p,h,'wildkin') ? Math.min(powers.length, a!.dice.filter(d => !d.removed && d.value === 1).length) : 0;
   list.push({ type: 'monster' }); if (count) for (const unequip of combinations(powers, count)) list.push({ type: 'monster', unequip });
  }
  if (b.stage === 'tokens') {
   const hits = a!.dice.filter(d => !d.removed && d.value >= a!.threat && d.color !== 'green');
   const eights = Math.max(0,a!.dice.filter(d => !d.removed && d.value === 8 && d.color !== 'green').length-(a!.placed?.damage??0)-(a!.placed?.defense??0));
   list.push({ type: 'tokens' }); if (hits.length > eights) for (const toAttrition of combinations(hits.map(d => d.id), hits.length - eights)) list.push({ type: 'tokens', toAttrition });
  }
  if (b.stage === 'defense' && b.kind !== 'pve') for (const f of ['horde','alliance'] as const) {
   const own = b.boxes[f], enemy = b.boxes[other(f)], total = Math.min(own.armor, enemy.damage + enemy.defense);
   for (let damage = Math.max(0, total - enemy.defense); damage <= Math.min(total, enemy.damage); damage++) list.push({ type: 'armor', faction: f, damage, defense: total - damage });
  }
  if (b.stage === 'wounds') for (const id of living(s, b)) { list.push({ type: 'wound', hero: id }); for (const pet of Object.keys(hero(s, id).pets)) list.push({ type: 'wound', hero: id, pet }); }
  if (b.stage === 'over') {
   if (b.kind === 'pvp' && b.winner && b.winner !== 'draw') for (const id of living(s,b,b.winner,p)) for (const from of b.defeated.filter(id => faction(p,id) !== b.winner)) for (const item of hero(s,from).bag) for (const discard of discards(p,hero(s,id),item)) list.push({type:'loot',hero:id,from,card:item,discard});
   list.push({ type: 'closeBattle' });
  }
  if (b.kind === 'pve' && !b.boss && ['defense','resolution'].includes(b.stage) && new Set(s.enemies.filter(e => b.enemies.includes(e.id)).map(e => e.color)).size > 1) {
   for (const color of ['green','red'] as const) list.push({type:'advance',targets:[...b.enemies].sort((x,y) => Number(s.enemies.find(e=>e.id===y)?.color===color)-Number(s.enemies.find(e=>e.id===x)?.color===color))});
  } else list.push({ type: 'advance' });
 } else if (s.phase === 'reward' && s.reward) {
  if(s.reward.relic)for(const id of s.reward.eligible)list.push({type:'claim-relic',hero:id});
  for (const id of s.reward.eligible) for (const c of s.reward.offered) for (const discard of discards(p, hero(s, id), c)) list.push({ type: 'reward', hero: id, card: c, discard });
  for (const tier of ['green','yellow','red'] as const) list.push({ type: 'quest', tier });
 } else if(s.eventFlow?.steps.length)list.push(...eventCommands(p,s));
 else if (s.auction) for (const h of s.heroes) for (let amount = 0; amount <= Math.min(h.gold, 50); amount++) list.push({ type: 'bid', hero: h.id, amount });
 const bonus:Command[]=[];for(const cmd of list){if(cmd.type!=='ability')continue;const h=hero(s,cmd.hero),c=card(p,cmd.card);if(c.type==='instant'&&availableCards(p,h).some(id=>card(p,id).freeInstantOnce))bonus.push({...cmd,args:{...cmd.args,free:true}});if(c.abilities.some(a=>a.effects.some(e=>e.op==='heal-reaction'))&&availableCards(p,h).some(id=>card(p,id).healSplash?.cards.includes(c.id)))for(const id of s.battle?.participants??[])if(faction(p,id)===faction(p,h.id)&&id!==cmd.args?.target)bonus.push({...cmd,args:{...cmd.args,secondaryTarget:id}});}list.push(...bonus);
 const seen = new Set<string>();
 return list.filter(c => { const key = JSON.stringify(c); if (seen.has(key)) return false; seen.add(key); try { apply(p, s, c); return true; } catch { return false; } });
}
export function commandLabel(p: ContentPack, c: Command): string {
 const name = 'hero' in c ? character(p, c.hero).name.split(' ')[0] : '';
 switch (c.type) {
  case 'event-choice':{const a=c.choice;return `${name}: ${a.mode==='skip'?"skip":a.mode==='gold'?"take gold":a.mode==='recover'?`recover (${a.health??0} health)`:a.region?p.regions.find(r=>r.id===a.region)?.name:a.card?card(p,a.card).name:a.quest?`${p.quests.find(q=>q.id===a.quest)?.name} → ${a.tier}`:"replace talents"}`;}
  case 'peek':return `${name}: investigate Kazzak clue`;
  case 'purify':return `${name}: cleanse plague (3 energy, +1 XP)`;
  case 'claim-relic':return `${name}: take Light of Ages`;
  case 'power-action':return `${name}: ${card(p,c.card).name}`;
  case 'portal':return `${name}: Portal · ${[...(c.self===false?[]:[name]),...c.allies.map(id=>character(p,id).name.split(' ')[0])].join(', ')}${c.self===false?" (you stay)":''}`;
  case 'summon':return `${name}: summon ${character(p,c.target).name}`;
  case 'travel': return c.path.length ? `${name}: ${p.regions.find(r => r.id === c.path.at(-1))!.name}` : `${name}: stay here`;
  case 'rest': return `${name}: ${c.food?card(p,c.food).name:`rest (+${c.health} health)`}`;
  case 'train': return `${name}: ${card(p, c.cards[0]).name}`;
  case 'town': return `${name}: ${c.operations.length ? c.operations.map(o => `${o.op === 'buy' ? "buy" : o.op === 'sell' ? "sell" : "learn"} ${card(p, o.card).name}`).join(', ') : "town recovery"}`;
  case 'ability': return `${name}: ${card(p, c.card).name}${c.args?.target ? ` → ${p.characters.find(h => h.id === c.args?.target)?.name ?? c.args.target}` : ''}`;
  case 'challenge': return `${name}: Challenge${c.allies.length ? ` (+${c.allies.length} allies)` : ''}`;
  case 'attacker': return `${name} attacks`;
  case 'wound': return `${name}: wound${c.pet ? " to pet" : ''}`;
  case 'respawn': return `${name}: ${p.regions.find(r => r.id === c.region)?.name}`;
  case 'talent': return `${name}: ${card(p, c.card).name}`;
  case 'reward': return `${name}: take ${card(p, c.card).name}`;
  case 'quest': return `New ${c.tier} quest`;
  case 'bid': return `${name}: bid ${c.amount} gold`;
  case 'manage': return `${name}: confirm equipment`;
  case 'roll': return "Roll dice"; case 'reroll': return "Reroll selected die"; case 'penalty': return "Remove selected dice";
  case 'tokens': return "Place hits"; case 'monster': return "Apply creature ability";
  case 'armor': return `${c.faction}: armor (${c.damage} ranged / ${c.defense} melee)`;
  case 'endActions': return "Go to management"; case 'endManagement': return "End management"; case 'advance': return "Next phase"; case 'closeBattle': return "End combat";
  case 'trade': return "Confirm trade"; case 'loot': return `${name}: loot ${card(p,c.card).name} from ${character(p,c.from).name.split(' ')[0]}`;
 }
}
