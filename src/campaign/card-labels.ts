import type { Creature } from '../rules/model';

export const triggerLabels:Record<string,string>={'round-start':"Round start",'after-tokens':"After placing hits",'energy-spent':"After spending energy",rest:"On Rest",learn:"Choose a talent",'turn-start':"Turn start",'combat-end':"Combat end",pool:"Preparation", 'after-pool':"After rolling",reroll:'Reroll','after-reroll':"After rerolls",tokens:"Hits",defense:"Defense",wound:"Before defeat",'round-end':"Round end",action:"During an action",equip:"Equipping"};

export const creatureRules:Record<Creature['rule'],string>={
 murloc:"After rerolls: lose 1 health for each red or blue die showing 1.",
 gnoll:"After rerolls: lose 1 energy for each red or blue die showing 1.",
 ghoul:"Your Reroll value is 0. Independent rerolls from abilities remain available.",
 crusader:"At the end of resolution, remove 1 hit from the damage box per surviving Crusader.",
 naga:"After rerolls: lose 1 health for each red or blue die showing 1 or 2.",
 spider:"After rerolls: gain 1 Stun per die showing 1 or 2. Attrition produces no tokens.",
 worgen:"At the end of resolution, remove 2 hits from the damage box per surviving Worgen.",
 wildkin:"After rerolls: unequip one power per die showing 1. Return these cards to your spellbook.",
 ogre:"After rerolls: lose 2 health per red or blue die showing 1 or 2.",
 wraith:"After rerolls: gain 1 Curse per die showing 1. Attrition produces no tokens.",
 doomguard:"After rerolls: each red or blue die showing 1 or 2 costs 1 health and is removed from the shared supply until combat ends.",
 drake:"Only green dice showing 8 produce armor. Other results and extra effects produce no armor tokens.",
 infernal:"After rerolls: each red or blue die showing 1 costs 2 health and 2 energy. At the end of resolution, the group removes 3 hits from the damage box.",
 none:"No special ability.",
};
