import reference from '../reference-creatures.json' with {type:'json'};
import type { Creature } from '../../rules/model.js';
import { scanSource } from './source.js';
// Green, red, blue columns; each triplet is threat / attack / health. Visually checked.
const rows:Record<string,number[][]>={
 murloc:[[5,3,2],[5,5,4],[6,4,2]],gnoll:[[4,3,3],[4,5,5],[5,4,4]],ghoul:[[6,3,2],[6,5,4],[6,4,3]],
 crusader:[[5,4,3],[5,5,5],[6,4,4]],naga:[[4,5,6],[4,6,8],[5,5,7]],spider:[[4,4,8],[4,5,10],[5,4,9]],
 wraith:[[6,5,8],[6,7,9],[7,6,8]],worgen:[[5,7,8],[5,9,9],[6,7,8]],wildkin:[[5,8,10],[5,9,12],[6,8,11]],
 ogre:[[4,9,10],[4,11,11],[5,10,10]],drake:[[6,9,13],[6,11,15],[7,10,14]],doomguard:[[7,10,12],[7,12,14],[7,11,13]],infernal:[[7,11,13],[7,12,16],[7,12,14]],
};
export const BASE_CREATURES:Creature[]=reference.map(c=>({...c,
 stats:Object.fromEntries(['green','red','blue'].map((color,i)=>{const [threat,attack,health]=rows[c.id][i];return [color,{threat,attack,health}];})) as Creature['stats'],
 description:c.id==='gnoll'?'End of each Reroll step: lose 1 Energy for each red or blue result of 1.':c.id==='ogre'?'End of each Reroll step: lose 2 Health for each red or blue result of 1 or 2.':c.description,
 source:scanSource('Reference Sheets/monster ref.png'),
})) as Creature[];
