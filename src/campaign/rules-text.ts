import type { Card, Condition, DiceFilter, Effect } from '../rules/model';
import { BASE_PACK } from '../data/base';
const names=new Map(BASE_PACK.cards.map(c=>[c.id,c.name]));
const readable=(text:string)=>text.replace(/\b[a-z]+(?:-[a-z0-9]+)+\b/g,id=>names.get(id)??id);
export const colorName={red:"red",blue:"blue",green:"green"};
export const boxName={damage:"ranged hits",defense:"melee hits",attrition:"attrition",armor:"armor"};
export function filterText(f:DiceFilter){return `${f.colors?.map(c=>colorName[c]).join('/')??"any color"}${f.values?` · ${f.values.join('/')}`:f.min?` · ${f.min}+`:''}`;}
export const conditionText=(c:Condition):string=>readable(rawConditionText(c));
function rawConditionText(c:Condition):string{
 switch(c.kind){
  case 'previous-use':return `used in the previous round${c.unharmed?", without losing health":''}`;
  case 'equipped':return `equipped: ${c.cardId}`;
  case 'dice':return `at least ${c.atLeast} (${filterText(c.filter)})`;
  case 'no-color':return `no ${colorName[c.color]} dice`;
  case 'opponents':return `at least ${c.min} opponents`;
  case 'pvp':return "PvP combat";case 'first-round':return "first combat round";
  case 'opponent-defeated':return "you survived combat and at least one opponent was defeated";
  case 'trait':return `equipped: ${c.traits.join(' / ')}`;case 'has-damage':return "just lost health";
  case 'round':return `round ${c.min} or later`;case 'strong-enemy':return "red creature, Overlord or PvP";
  case 'reroll-at-least':return `Reroll value at least ${c.amount}`;
  case 'owned':return `you own ${c.cardId}`;
  case 'used':return `used this round: ${c.cardId}`;case 'used-any':return `used this round: ${c.cards.join(' / ')}`;
 }
}
export const effectText=(e:Effect):string=>readable(rawEffectText(e));
function rawEffectText(e:Effect):string{
 switch(e.op){
  case 'dice':return `+${e.amount} ${colorName[e.color]} dice`;
  case 'stat':return `${e.amount>=0?'+':''}${e.amount} ${e.stat==='reroll'?'Reroll':e.stat==='attrition'?'Attrition':e.stat==='armor'?'Armor':'Threat'}`;
  case 'resource':return `${e.amount<0?"Spend":e.gain?"Gain":"Recover"} ${Math.abs(e.amount)} ${e.resource==='health'?"health":e.resource==='energy'?"energy":"gold"}${e.target==='friendly'?" for an ally":''}${e.gain?" (may exceed capacity)":''}`;
  case 'spot':return `Spot ${e.count} (${filterText(e.filter)}) → ${e.effects.map(effectText).join('; ')}`;
  case 'remove':return `Remove ${e.count} (${filterText(e.filter)}) → ${e.effects.map(effectText).join('; ')}`;
  case 'change':return `Change ${e.count} (${filterText(e.filter)}) → ${e.delta?`value +${e.delta}, up to 8`:e.value??"same value"}${e.colorChoice?', any available color':e.color?`, ${colorName[e.color]}`:''}`;
  case 'discard-self':return "Discard this card";case 'condition':return `${e.amount>=0?'+':''}${e.amount} ${e.condition}`;
  case 'heal-pet':return `Pet: recover ${e.amount} health`;
  case 'if':return `If ${conditionText(e.condition)}: ${e.then.map(effectText).join('; ')}${e.otherwise?`; otherwise ${e.otherwise.map(effectText).join('; ')}`:''}`;
  case 'token':return `+${e.amount} ${boxName[e.box]}`;
  case 'judgement':return "Resolve the equipped Seal’s Judgement without unequipping the Seal";
  case 'prevent':return `Prevent the loss of ${e.amount} health`;
  case 'restrict':return `${e.scope==='pool'?"Do not roll":"Do not reroll"} ${e.colors.map(c=>colorName[c]).join('/')} dice`;
  case 'reroll-all':return "Independently reroll all remaining dice";case 'unequip-self':return "Unequip this card";
  case 'flag':return e.key==='revenge'?"Each of your armor tokens in this step also adds 1 attrition":e.key==='adrenaline'?"Every 2 of your ranged hits in this step recover 1 energy":e.key==='ice-barrier'?"Each of your ranged hits in this step also adds 1 armor":"At the end of the ranged attack, clear your own three hit boxes";
  case 'damage-reserve':return `Spend ${e.amount} Enrage tokens stored from lost health`;
  case 'damage-all':return `Each combat participant loses ${e.amount} health`;
  case 'remove-all':return `Remove all (${filterText(e.filter)})`;
  case 'reroll-selected':return `Independently reroll up to ${e.max==='level'?"your level in":e.max} dice (${filterText(e.filter)})`;
  case 'unequip-choice':return `Unequip one power: ${e.cards.join(' / ')}`;
  case 'defeat-independent':return "Defeat one blue creature in this combat";
  case 'resource-level':return `${e.gain?"Gain":"Recover"} ${e.resource==='health'?"health":"energy"} equal to your level`;
  case 'clamp':return `Lose ${e.resource==='health'?"health":"energy"} above capacity`;
  case 'remove-chosen':return `Remove ${e.count} other unused dice of your choice`;
  case 'dice-choice':return `Roll ${e.amount} new dice in your chosen colors`;
  case 'move-tokens':return `Move ${e.amount}: ${boxName[e.from]} → ${boxName[e.to]}`;
  case 'opponent-tokens':return `+${e.amount} ${boxName[e.box]} per opponent`;
  case 'equip-demon':return "If you have no Demon equipped, equip a learned Demon in the chosen slot";
  case 'group-resource':return `All friendly participants ${e.gain?"gain":"recover"} ${e.amount} ${e.resource==='health'?"health":"energy"}`;
  case 'group-dice':return `+${e.amount} ${colorName[e.color]} dice per friendly participant`;
  case 'creature-dice':return `Add ${colorName[e.color]} dice: selected creature’s Attack / ${e.divisor}, rounding down`;
  case 'active-effects':return `Active ally: ${e.effects.map(effectText).join('; ')}`;
  case 'heal-reaction':return `An ally who just lost health recovers up to ${e.amount} health`;
  case 'revive':return `${e.self?"Your character":"A defeated ally"} stays in the region and recovers ${e.amount==='level'?"your level in":e.amount} health/energy as chosen. They still count as defeated.`;
  case 'combo-add':return `Place ${e.amount} tokens on an equipped Finishing Move`;
  case 'combo-spend':return `Spend ${e.amount} combo tokens from this card`;
  case 'equip-power':return `Equip the learned power ${e.card}`;
  case 'preset':return `Before rolling, set ${e.color} dice to ${e.values.join(" and ")}`;
  case 'redirect-hits':return `Up to ${e.count} ${colorName[e.color]} dice that hit give ${boxName[e.box]}`;
  case 'sacrifice-pet':return `Unequip your pet; for each of its remaining health, gain ${e.multiplier} ${boxName[e.box]}`;
  case 'escape':return "Leave PvE combat and remain in the same region";
 }
}
export function staticCardText(c:Card):string[]{
 const result:string[]=[];
 if(c.powerDiscount)result.push(`All your powers cost ${c.powerDiscount} less energy, to a minimum of 0.`);
 if(c.equipFreeTraits)result.push(`No energy cost to equip: ${c.equipFreeTraits.join(', ')}.`);
 if(c.retainOnce)result.push(`Retain on first use in combat: ${c.retainOnce.join(', ')}.`);
 if(c.actionPower==='lay-on-hands')result.push("Immediately before your action, fully recover health.");
 if(c.enhance)for(const e of c.enhance)result.push(`${e.card}: ${e.effects.map(effectText).join('; ')} on every use.`);
 if(c.petCapacity)result.push(`${c.petCapacity.trait}: health capacity +${c.petCapacity.amount}.`);
 if(c.actionPower==='summon')result.push("Before your action, move a chosen friendly character from any region to yours.");
 if(c.freeInstantOnce)result.push("Once per combat, use an instant power without spending energy.");
 if(c.instantDiscount)result.push(`Instant powers cost ${c.instantDiscount} less energy, to a minimum of 0.`);
 if(c.healSplash)result.push(`${c.healSplash.cards.join(', ')} also heal another ally for up to ${c.healSplash.amount}.`);
 if(c.actionPower==='prayer')result.push("One action: all allies in your region fully recover health. Then unequip this power.");
 if(c.finisher)result.push("Finishing Move: combo tokens last until this combat ends.");
 if(c.spotOverride)result.push(`For ${c.spotOverride.cards.join(', ')} the Spot threshold is ${c.spotOverride.min}+.`);
 if(c.comboBonus)result.push(`${c.comboBonus.card} adds +${c.comboBonus.amount} combo token.`);
 if(c.comboMultiplier)result.push(`Each placement of combo tokens gives ${c.comboMultiplier} times as many tokens.`);
 if(c.retainAfterUse)result.push(`Retain when used: ${c.retainAfterUse.join(', ')}.`);
 if(c.description&&!c.abilities.length)result.push(c.description);
 if(c.cardRepeat)result.push(`${c.cardRepeat.card} may be used ${c.cardRepeat.uses} times per round.`);
 if(c.discount)result.push(`Energy −${c.discount.amount}: ${c.discount.cards.join(', ')}.`);
 if(c.travelPower)result.push(`Travel: ${c.travelPower.unequip?"unequip this power for ":''}+${c.travelPower.extra} region.`);
 if(c.capacity?.health)result.push(`Health capacity +${c.capacity.health}`);
 if(c.capacity?.energy)result.push(`Energy capacity +${c.capacity.energy}`);
 if(c.travelThroughBlue)result.push(`Continue through regions with blue creatures during Travel.${c.leaveBlue?" You may also begin Travel in such a region.":''}`);
 if(c.travelLimit)result.push(`At most ${c.travelLimit} Travel actions per faction turn.`);
 if(c.immune)result.push(`Immune to special ability: ${c.immune.join(', ')}.`);
 if(c.equipOverride)result.push(`The ${c.equipOverride.slot} slot accepts ${c.equipOverride.traits.join('/')} up to level ${c.equipOverride.maxLevel}.`);
 if(c.poolPenalty)result.push(`Before rolling, remove if possible: ${Object.entries(c.poolPenalty).map(([c,n])=>`${n} ${c}`).join(', ')}.`);
 if(c.intercept)result.push("Challenge in an adjacent region: move there immediately. You may leave blue creatures; allies at your destination may join.");
 if(c.actionPower==='teleport')result.push("One action: spend X energy to move through X adjacent regions, without stopping when entering regions with blue creatures.");
 if(c.actionPower==='portal')result.push("Immediately before your action: you and chosen allies in your region return to your faction’s starting region.");
 if(c.instantRepeat)result.push(`Instant powers can be used ${c.instantRepeat.uses} times per round; each repeat use costs +${c.instantRepeat.surcharge} energy.`);
 for(const a of c.aura??[])result.push(`All friendly participants: ${a.effects.map(effectText).join('; ')}${a.condition?` if ${conditionText(a.condition)}`:''}.`);
 if(c.bagExempt)result.push("Does not occupy a bag slot.");if(c.trait==='Scroll'||c.trait==='Potion')result.push(`At most one ${c.trait} per combat round.`);
 if(c.travelEnergy)result.push(`After a Travel action, recover ${c.travelEnergy} energy.`);
 if(c.extraInstantSlot)result.push("Gain an extra Instant power slot. This item is lost upon defeat.");
 return result.map(readable);
}
