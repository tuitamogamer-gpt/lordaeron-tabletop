import { BASE_PACK as p } from '../data/base';
import type { EventCard, Overlord, Reward } from '../rules/model';
export const deckSymbol:Record<string,string>={triangle:'△',square:'□',circle:'○',special:'✦'};
export const regionName=(id:string)=>p.regions.find(r=>r.id===id)?.name??id;
export const rewardText=(r:Reward)=>[`${r.gold} gold`,`${r.xp} XP`,...r.items.map(i=>`${i.draw} ${deckSymbol[i.deck]}`),...(r.special??[]).map(id=>p.cards.find(c=>c.id===id)?.name??id)].join(' · ');
export const bossRules:Record<string,string>={
 kazzak:"Reroll −1. At the end of the token step, lose 1 health and reduce Attrition by 1 per red or blue die showing 1 or 2. Only one of the five hidden clues is the real Kazzak.",
 nefarian:"Halve Attrition, rounding up. Ranged and melee hits are limited by the number of red and blue dice showing 8; excess hits become attrition. Fate moves Nefarian toward the Bulwark. His arrival immediately triggers the final battles.",
 kelthuzad:"After rerolls, lose 2 health per red or blue die showing 1 or 2. Attrition is limited by unused red or blue results of 6+ marked with Spot. If he survives resolution, remove 4/6 ranged hits in a 4/6-character game.",
 dungin:"At the end of each combat round, remove 4 ranged hits.",
 zaeldarr:"At the end of each combat round, remove 2 ranged hits. When drawn, every character contributes one item from their bag; the victors share these items.",
 spilskin:"Before resolution, remove all attrition tokens.",
 spectral:"At the end of each combat round, every participant gains 2 Stun tokens. When drawn, each character contributes half their gold, rounding down; the victors share the stash.",
 daecris:"At the end of each combat round, every participant gains 1 Stun; remove 3 ranged hits per participant.",
 cauldrons:"After rerolls, remove 1 ranged hit per die showing 1. Each faction gets only one attempt. Victory awards tokens that cancel Kel’Thuzad’s extra +4 attack.",
 boregore:"At the start of each combat round, remove 2 ranged hits. One victor takes Light of Ages: +4 ranged hits at the start of combat against Kel’Thuzad.",
};
export function overlordText(o:Overlord){return bossRules[o.combat]??'';}
export function eventText(e:EventCard):string{
 if(e.boss)return `${regionName(e.boss.region)} · ${bossRules[e.boss.combat]} Stronger faction reward: ${rewardText(e.boss.strong)}. Weaker faction: ${rewardText(e.boss.weak)}.`;
 const descriptions:Record<string,string>={
  hatreds:"The first faction to win PvP rewards each victorious participant: 8 gold and 1 XP for the stronger faction; 4 gold and 2 XP for the weaker faction.",
  professions:"Each character chooses gold equal to their level or that many points of health and energy, divided as desired.",
  horizons:"Each faction may replace one quest with a new green, yellow or red quest. Blue creatures from the discarded quest remain on the map.",
  zeppelin:"Starting with the lowest total XP, each character may travel to a friendly flight point with no opposing characters.",
  merchants:"Starting with the lowest total XP, each character may buy one item for half its price, rounding up.",
  beasts:"Factions alternate moving two different groups of blue creatures up to two adjacent regions. A group cannot end with an opposing character or blue creatures of the same type.",
  retrain:"Each character chooses to replace their talents with talents of the same or lower level, or take gold equal to twice their level.",
  subterfuge:"Factions may attack creatures from opposing quests. The reward gives 1 less XP; the replacement quest belongs to the original faction.",
  bounty:"One random character in each faction is marked. When the first marked character is defeated, every character in the opposing faction gains 3 XP.",
  sell:"Starting with the lowest total XP, each character may sell one item from their bag for half its price, rounding down.",
  ears:"Until the next event draw, defeated blue creatures award 1 XP and gold equal to half their attack, rounding down. The reward is shared.",
  cleanse:"Collect defeated blue creatures. The first faction with a combined trophy attack of at least 10 rewards each of its characters with 4 gold and 2 XP.",
  winds:"Travel through the Western and Eastern Plaguelands costs 1 extra energy. Blue creatures in those zones award 2 XP. The event ends when no blue creatures remain there.",
  'soul-taint':"Characters within four regions of Kel’Thuzad lose half their health, rounding up. With Spread the Plague, the range is eight regions.",
  plague:"Place plague in Marris Stead, Hearthglen and Andorhal. Creatures in affected zones have +2 attack. After your action, you may spend 3 energy to clear a token and gain 1 XP.",
  'arcane-corruption':"Characters lose half their energy, rounding down, or rounding up if Spread the Plague is active.",
  auction:"Each character submits one secret bid. The highest bid wins the item; ties are broken by a roll. The item is lost upon defeat.",
 };
 if(e.script==='war'){const war=e.effects.find(a=>a.op==='war');if(war?.op==='war')return `Occupy ${war.regions.map(regionName).join(" and ")} and hold them through the end of the opposing faction’s turn. Each character in the winning faction receives ${rewardText(war.reward)}; weaker faction: ${rewardText(war.weakReward??war.reward)}.`;}
 return descriptions[e.script??'']??e.effects.map(a=>a.op==='gold'?`${a.amount} gold`:a.op==='merchant'?`${a.count} new items`:'').join(' · ');
}
