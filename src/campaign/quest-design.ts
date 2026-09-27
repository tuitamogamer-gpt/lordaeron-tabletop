import type { Quest } from '../rules/model';
import type { GameView } from '../rules/view';
import { BASE_PACK as p } from '../data/base';

const briefs:Record<string,string>={
 murloc:'The shallows are no longer safe. Murloc raiders have driven travellers from the water’s edge.',
 gnoll:'Gnoll raiders have claimed the old roads. Break their warband before another caravan disappears.',
 ghoul:'The dead are rising among the ruins. Cut down the ghouls before their hunger reaches the living.',
 crusader:'The Scarlet Crusade sees enemies on every road. Its zealots must be driven from their stronghold.',
 naga:'Something ancient stirs beneath the water. The naga have come ashore, and their foothold is growing.',
 spider:'Silk seals the paths and venom stains the leaves. Hunt the brood before the forest falls silent.',
 worgen:'Howls echo beyond the last torchlight. Track the cursed hunters and end their nightly raids.',
 wildkin:'The wildkin have turned on all who enter their domain. Face their fury deep in the wilderness.',
 ogre:'Ogre warbands are gathering among the broken stones. Their brutal advance threatens the surrounding settlements.',
 wraith:'Restless spirits haunt these lands. Confront the wraiths and give the road back to the living.',
 doomguard:'A servant of the Burning Legion stalks Lordaeron. Gather your allies before facing its fel-forged blade.',
 drake:'A dragon’s shadow passes over the highlands. Seek out its lair and bring the beast down.',
 infernal:'Fel fire has torn the earth apart. Destroy the infernal before it leaves nothing but ash.',
};
export function questBrief(q:Quest){return briefs[q.spawns.find(s=>s.color!=='blue')!.creature]??'Answer your faction’s call and secure the region.';}
export function questObjectives(q:Quest,state:Pick<GameView,'quests'|'enemies'|'completed'>){
 const groups=new Map<string,{creature:string;region:string;color:string;total:number}>();
 for(const s of q.spawns.filter(s=>s.color!=='blue')){const key=`${s.region}:${s.creature}:${s.color}`,g=groups.get(key);if(g)g.total+=s.count;else groups.set(key,{...s,total:s.count});}
 return [...groups.values()].map(g=>({...g,name:p.creatures.find(c=>c.id===g.creature)!.name,remaining:state.completed.includes(q.id)?0:state.quests.includes(q.id)?state.enemies.filter(e=>e.quest===q.id&&e.region===g.region&&e.creature===g.creature&&e.color===g.color).length:g.total}));
}
