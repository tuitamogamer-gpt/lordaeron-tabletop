import type { Overlord } from '../../rules/model.js';
import { scanSource } from './source.js';
export const BASE_OVERLORDS:Overlord[]=[
 {id:'kazzak',name:'Lord Kazzak',region:'deep-elem',combat:'kazzak',stats:{4:{threat:7,attack:16,health:22},6:{threat:7,attack:24,health:33}},source:scanSource('Overlords/kaz 6.png')},
 {id:'nefarian',name:'Nefarian',region:'overlook',combat:'nefarian',stats:{4:{threat:7,attack:12,health:26},6:{threat:7,attack:18,health:39}},source:scanSource('Overlords/nef 6.png')},
 {id:'kelthuzad',name:'Kel’Thuzad',region:'stratholme',combat:'kelthuzad',stats:{4:{threat:7,attack:14,health:18},6:{threat:7,attack:21,health:27}},source:scanSource('Overlords/kel 6.png')},
];
