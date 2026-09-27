import type { ContentPack, Setup } from '../../rules/model.js';
import { BOARD_REGIONS } from '../board-2005.js';
import { BASE_CHARACTERS, STARTING_CARDS } from './characters.js';
import { BASE_CREATURES } from './creatures.js';
import { BASE_QUESTS } from './quests.js';
import { BASE_EVENTS, AUCTION_CARDS } from './events.js';
import { BASE_OVERLORDS } from './overlords.js';
import { TRIANGLE_ITEMS } from './triangle-items.js';
import { SQUARE_ITEMS } from './square-items.js';
import { CIRCLE_ITEMS } from './circle-items.js';
import { SPECIAL_ITEMS } from './special-items.js';
import { WARRIOR_CARDS } from './warrior.js';
import { MAGE_CARDS } from './mage.js';
import { HUNTER_CARDS } from './hunter.js';
import { ROGUE_CARDS } from './rogue.js';
import { PRIEST_CARDS } from './priest.js';
import { WARLOCK_CARDS } from './warlock.js';
import { PALADIN_CARDS } from './paladin.js';
import { DRUID_CARDS } from './druid.js';
import { SHAMAN_CARDS } from './shaman.js';
export const CLASS_CARDS=[...WARRIOR_CARDS,...MAGE_CARDS,...HUNTER_CARDS,...ROGUE_CARDS,...PRIEST_CARDS,...WARLOCK_CARDS,...PALADIN_CARDS,...DRUID_CARDS,...SHAMAN_CARDS];
export const BASE_ITEMS=[...TRIANGLE_ITEMS,...SQUARE_ITEMS,...CIRCLE_ITEMS,...SPECIAL_ITEMS];
export const BASE_PACK:ContentPack={
 id:'base-2005-faq-1.4-map-v4',name:'World of Warcraft · 2005 + FAQ 1.4',officialComplete:true,
 regions:BOARD_REGIONS,characters:BASE_CHARACTERS,creatures:BASE_CREATURES,quests:BASE_QUESTS,events:BASE_EVENTS,overlords:BASE_OVERLORDS,
 cards:[...STARTING_CARDS,...CLASS_CARDS,...BASE_ITEMS,...AUCTION_CARDS],xp:[0,4,10,18,28],
 track:{2:'triangle',4:'event',5:'triangle',7:'event',8:'triangle',10:'event',11:'triangle',13:'event',14:'square',16:'event',17:'square',19:'event',20:'square',22:'event',23:'circle',25:'event',26:'circle',29:'circle'},
};
export const DEFAULT_SETUP:Setup={seed:2005,roster:['grumbaz-crowsblood','sofeea-icecall','zowka-shattertusk','brandon-lightstone','burbon-fang','artumnis-moondream'],overlord:'kelthuzad'};
export const CONTENT_COVERAGE=[
 {name:'Likovi i početne karte',expected:16,note:'16 listova: rasne moći, početna oprema, kapaciteti i sedam mjesta.'},
 {name:'Power + Talent',expected:216,note:'108 moći i 108 talenata; svih devet klasa.'},
 {name:'Predmeti',expected:120,note:'46 triangle, 30 square, 16 circle i 28 special predmeta.'},
 {name:'Questovi',expected:80,note:'40 za svaku frakciju, sa spawnovima i nagradama.'},
 {name:'Događaji',expected:52,note:'47 osnovnih + 5 Kel’Thuzad događaja; izbori, aukcije i svjetski bossovi.'},
 {name:'Stvorenja',expected:13,note:'Vrijednosti i efekti provjereni na referentnom listu.'},
 {name:'Overlordi',expected:3,note:'Kazzak, Nefarian i Kel’Thuzad; profili za četiri i šest likova.'},
];
