import type { Card, EventBoss, EventCard, EventScript, Reward } from '../../rules/model.js';
import { ability, definedCard } from './builders.js';
import { scanSource } from './source.js';
const cards:EventCard[]=[];
const reward=(gold:number,xp:number,items:Reward['items']=[]):Reward=>({gold,xp,items});
const item=(deck:'triangle'|'square'|'circle',draw:number)=>({deck,draw});
const add=(n:number,name:string,script:EventScript,fate:0|1|2=0,bonus=true,extra:Partial<EventCard>={})=>cards.push({id:`event-${n}`,name,script,fate,bonus,effects:[],source:scanSource(`Event Cards/Layer ${n}.png`),...extra});
for(const n of [1,42,44])add(n,'Old Hatreds','hatreds',2,false);
for(const n of [2,37,50,51])add(n,'Professions and Crafts','professions');
for(const n of [5,15,18,23,28,43])add(n,'New Horizons','horizons');
for(const n of [6,20])add(n,'Goblin Zeppelin','zeppelin');
for(const n of [9,38])add(n,'Traveling Merchants','merchants');
for(const n of [13,14,26,27])add(n,'The Beasts of Lordaeron','beasts');
for(const n of [16,45])add(n,'Another Path to Power','retrain');
for(const n of [12,46])add(n,'Subterfuge','subterfuge',0,false);
for(const n of [36,47,48])add(n,'Bounty','bounty',1,false);
for(const n of [41,49])add(n,'Goblin Merchant','sell');
add(21,'Ears and Heads of the Wild','ears',0,false);
add(30,'Cleanse the Land','cleanse',2,false);
add(39,'Foul Plaguewinds','winds',0,false);
for(const [n,name,regions,strongXP,weakXP] of [
 [24,'The Andorhal War',['andorhal','hearthglen'],2,4],
 [25,'The Domination War',['balnir','corrahn'],2,4],
 [29,'The Two Towers War',['crown','eastwall'],2,4],
 [31,'The Hinterlands War',['seradane','shadra'],3,5],
 [34,'The Silverpine War',['ambermill','shining'],2,4],
] as const)add(n,name,'war',1,false,{effects:[{op:'war',regions:[...regions],reward:reward(5,strongXP),weakReward:reward(5,weakXP),perHero:true}]});
const boss=(n:number,name:string,region:string,stats:EventBoss['stats'],combat:EventBoss['combat'],strong:Reward,weak=strong,extra:Partial<EventBoss>={})=>add(n,name,'boss',1,false,{boss:{region,stats,combat,strong,weak,...extra}});
boss(7,'The Abomination of Darrowshire','darrowshire',{threat:5,attack:11,health:9},'dungin',reward(6,5,[item('square',2),item('circle',1)]),reward(10,9,[item('square',3),item('circle',1)]));
boss(17,'Zaeldarr the Outcast','noxious',{threat:5,attack:10,health:10},'zaeldarr',reward(3,4),reward(4,6),{tribute:'item'});
boss(22,'The Old Snake','shining',{threat:6,attack:9,health:10},'spilskin',reward(6,5,[item('square',1),item('square',1)]),reward(10,9,[item('triangle',2),item('square',2)]));
boss(40,'A Spectral Revenge','gahrron',{threat:7,attack:10,health:6},'spectral',reward(0,4),reward(0,6),{tribute:'gold'});
boss(52,'Daecris of the Many','skulk',{threat:5,attack:15,health:10},'daecris',reward(10,6,[item('square',2),item('square',2)]),reward(12,10,[item('triangle',3),item('square',3)]));
add(4,'Scourge Cauldrons','boss',0,false,{overlord:'kelthuzad',boss:{region:'weeping',stats:{threat:5,attack:8,health:9},combat:'cauldrons',strong:reward(4,3),weak:reward(4,3),perFaction:true}});
add(8,'Light of Ages','boss',0,false,{overlord:'kelthuzad',boss:{region:'noxious',stats:{threat:5,attack:11,health:9},combat:'boregore',strong:reward(8,2),weak:reward(8,2),relic:'light-of-ages'}});
add(10,'Soul Taint','soul-taint',0,false,{overlord:'kelthuzad'});
add(11,'Spread the Plague','plague',0,false,{overlord:'kelthuzad'});
add(35,'Arcane Corruption','arcane-corruption',0,false,{overlord:'kelthuzad'});
const auction=(n:number,id:string,name:string,extra:Partial<Card>)=>{add(n,'Auction House','auction',0,true,{effects:[{op:'auction',item:id}]});return definedCard(name,{id,kind:'item',printed:true,soulbound:true,source:scanSource(`Event Cards/Layer ${n}.png`),...extra});};
export const AUCTION_CARDS:Card[]=[
 auction(3,'auction-ring-of-agility','Ring of Agility',{abilities:[ability('after-tokens',[{op:'move-tokens',from:'damage',to:'defense',amount:1}])]}),
 auction(19,'auction-boots-of-endurance','Boots of Endurance',{travelEnergy:1}),
 auction(32,'auction-trusty-mount','Trusty Mount',{travelPower:{extra:1,unequip:false,oncePerTurn:true}}),
 auction(33,'auction-hood-of-shadow','Hood of Shadow',{extraInstantSlot:true}),
];
export const BASE_EVENTS=cards.sort((a,b)=>Number(a.id.slice(6))-Number(b.id.slice(6)));
