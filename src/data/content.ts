import type { Ability, Enemy, HeroDefinition, Item, Quest, Region } from '../engine/types';

export const CLASS_NAMES = { warrior: 'Ratnik', mage: 'Mag', hunter: 'Lovac', druid: 'Druid', paladin: 'Paladin', priest: 'Svećenik', rogue: 'Odmetnik', shaman: 'Šaman', warlock: 'Vještac' };
// Original prototype hero names and tuning. These are not a transcription of FFG character sheets.
export const HEROES: HeroDefinition[] = [
  {id:'grom',name:'Gorak Bloodfury',classId:'warrior',race:'Ork',faction:'horde',portrait:0,health:8,energy:4,pool:{red:3,blue:0,green:2},color:'#d28b5a',role:'Bliska borba · odbrana'},
  {id:'lyra',name:'Lyra Frostveil',classId:'mage',race:'Nemrtvi',faction:'horde',portrait:1,health:5,energy:7,pool:{red:0,blue:4,green:1},color:'#74bee0',role:'Daljinska borba · kontrola'},
  {id:'brann',name:'Borin Ironshot',classId:'hunter',race:'Patuljak',faction:'alliance',portrait:2,health:6,energy:6,pool:{red:1,blue:3,green:1},color:'#9ac87b',role:'Daljinska borba · preciznost'},
  {id:'elyra',name:'Elyra Moonwhisper',classId:'druid',race:'Noćni vilenjak',faction:'alliance',portrait:3,health:6,energy:6,pool:{red:2,blue:1,green:2},color:'#d08e50',role:'Preobrazba · iscjeljivanje'},
  {id:'aldric',name:'Aldric Dawnshield',classId:'paladin',race:'Čovjek',faction:'alliance',portrait:4,health:8,energy:4,pool:{red:2,blue:1,green:2},color:'#e7b3bc',role:'Odbrana · sveto svjetlo'},
  {id:'zul',name:'Zul’Rahan',classId:'priest',race:'Trol',faction:'horde',portrait:5,health:5,energy:7,pool:{red:0,blue:3,green:2},color:'#e3ddc8',role:'Iscjeljivanje · podrška'},
  {id:'valeera',name:'Vera Nightblade',classId:'rogue',race:'Čovjek',faction:'alliance',portrait:6,health:6,energy:6,pool:{red:4,blue:1,green:0},color:'#e1d887',role:'Bliska borba · iscrpljivanje'},
  {id:'karn',name:'Karn Stormhoof',classId:'shaman',race:'Tauren',faction:'horde',portrait:7,health:7,energy:5,pool:{red:1,blue:2,green:2},color:'#709bda',role:'Elementi · zaštita'},
  {id:'nyx',name:'Nyx Emberhex',classId:'warlock',race:'Gnom',faction:'alliance',portrait:8,health:5,energy:7,pool:{red:0,blue:4,green:1},color:'#b79de2',role:'Kletve · iscrpljivanje'},
];
export const REGIONS: Region[] = [
 {id:'brill',name:'Brill',zone:'TIRISFAL GLADES',x:24,y:20,neighbors:['monastery','undercity','bulwark'],town:'horde',flight:'horde',description:'Tiho zvono odjekuje iznad domova Forsakena. Ovdje počinje put Horde.',level:1},
 {id:'monastery',name:'Scarlet Monastery',zone:'TIRISFAL GLADES',x:36,y:13,neighbors:['brill','bulwark'],description:'Iza crvenih zastava samostana, fanatični križari čuvaju svoje tajne.',level:2},
 {id:'undercity',name:'Ruins of Lordaeron',zone:'TIRISFAL GLADES',x:18,y:34,neighbors:['brill','sepulcher','bulwark'],town:'horde',description:'Nekadašnja prijestolnica skriva novi grad duboko ispod svojih ruševina.',level:1},
 {id:'sepulcher',name:'The Sepulcher',zone:'SILVERPINE FOREST',x:25,y:49,neighbors:['undercity','shadowfang','tarren'],town:'horde',description:'Maglovito utočište na rubu šume pune nemirnih sjena.',level:1},
 {id:'shadowfang',name:'Shadowfang Keep',zone:'SILVERPINE FOREST',x:20,y:65,neighbors:['sepulcher','hillsbrad'],description:'Zavijanje se spušta sa zidina tvrđave. Vukodlaci više nisu samo priča.',level:2},
 {id:'hillsbrad',name:'Hillsbrad Fields',zone:'HILLSBRAD FOOTHILLS',x:39,y:68,neighbors:['shadowfang','tarren','southshore'],description:'Zlatna polja i napušteni mlinovi. Gnollovi vrebaju duž starih puteva.',level:1},
 {id:'southshore',name:'Southshore',zone:'HILLSBRAD FOOTHILLS',x:41,y:83,neighbors:['hillsbrad','durnholde'],town:'alliance',flight:'alliance',description:'Luka pod plavim zastavama. Siguran dom junaka Alijanse.',level:1},
 {id:'tarren',name:'Tarren Mill',zone:'HILLSBRAD FOOTHILLS',x:43,y:51,neighbors:['sepulcher','hillsbrad','alterac','durnholde'],town:'horde',flight:'horde',description:'Stari mlin postao je uporište Horde i mjesto za pripremu naredne ekspedicije.',level:1},
 {id:'alterac',name:'Alterac Mountains',zone:'ALTERAC MOUNTAINS',x:51,y:35,neighbors:['tarren','bulwark','chillwind','durnholde'],description:'Zaleđeni prolazi čuvaju ostatke kraljevstva i opasne skupine ogrova.',level:3},
 {id:'bulwark',name:'The Bulwark',zone:'WESTERN PLAGUELANDS',x:44,y:23,neighbors:['brill','undercity','monastery','alterac','andorhal'],description:'Posljednja barikada prije zaraženih zemalja. Stražari nikada ne spavaju.',level:2},
 {id:'andorhal',name:'Ruins of Andorhal',zone:'WESTERN PLAGUELANDS',x:59,y:17,neighbors:['bulwark','chillwind','stratholme'],description:'Kuga je odnijela grad, ali njegovi mrtvi odbijaju počinuti.',level:3},
 {id:'chillwind',name:'Chillwind Camp',zone:'WESTERN PLAGUELANDS',x:64,y:37,neighbors:['andorhal','alterac','aerie','lights'],town:'alliance',flight:'alliance',description:'Malo utvrđenje pruža predah putnicima na putu prema Plaguelandsu.',level:2},
 {id:'durnholde',name:'Durnholde Keep',zone:'HILLSBRAD FOOTHILLS',x:59,y:61,neighbors:['southshore','tarren','alterac','aerie'],description:'Prazni tornjevi podsjećaju na vrijeme zatočeništva i pobune.',level:2},
 {id:'aerie',name:'Aerie Peak',zone:'THE HINTERLANDS',x:76,y:67,neighbors:['durnholde','chillwind','jintha'],town:'alliance',flight:'alliance',description:'Gnijezda grifona krune planinu. Wildhammer patuljci dočekuju saveznike.',level:2},
 {id:'jintha',name:'Jintha’Alor',zone:'THE HINTERLANDS',x:86,y:51,neighbors:['aerie','lights'],description:'Drevni terasasti hram skriva trolovske ratnike i zabranjene obrede.',level:3},
 {id:'lights',name:'Light’s Hope Chapel',zone:'EASTERN PLAGUELANDS',x:79,y:31,neighbors:['chillwind','jintha','stratholme'],town:'alliance',description:'Slabo svjetlo kapele prkosi tami i pokazuje put prema posljednjoj bici.',level:3},
 {id:'stratholme',name:'Stratholme',zone:'EASTERN PLAGUELANDS',x:83,y:14,neighbors:['andorhal','lights'],description:'Iznad mrtvog grada lebdi prijetnja Naxxramasa. Kel’Thuzad čeka.',level:5},
];
// Scripted powers use a finite effect vocabulary; no executable code is imported.
export const ABILITIES: Ability[] = [
 {id:'heroic-strike',name:'Heroic Strike',classId:'warrior',icon:'sword',description:'Dodaj 2 crvene kockice u ovoj rundi.',cost:1,price:0,level:1,effects:[{op:'dice',color:'red',amount:2}],color:'ember'},
 {id:'shield-block',name:'Shield Block',classId:'warrior',icon:'shield',description:'Dodaj 2 oklopa. Zaustavi udar prije nego što stigne.',cost:1,price:3,level:1,effects:[{op:'armor',amount:2}],color:'steel'},
 {id:'mortal-strike',name:'Mortal Strike',classId:'warrior',icon:'swords',description:'Dodaj 2 crvene kockice i 2 iscrpljivanja.',cost:2,price:5,level:2,effects:[{op:'dice',color:'red',amount:2},{op:'attrition',amount:2}],color:'ember'},
 {id:'frostbolt',name:'Frostbolt',classId:'mage',icon:'snow',description:'Dodaj 2 plave kockice u ovoj rundi.',cost:1,price:0,level:1,effects:[{op:'dice',color:'blue',amount:2}],color:'frost'},
 {id:'ice-barrier',name:'Ice Barrier',classId:'mage',icon:'shield',description:'Dodaj 2 oklopa od arktičkog leda.',cost:1,price:3,level:1,effects:[{op:'armor',amount:2}],color:'frost'},
 {id:'blizzard',name:'Blizzard',classId:'mage',icon:'snow',description:'Dodaj 3 plave kockice i 1 iscrpljivanje.',cost:3,price:5,level:2,effects:[{op:'dice',color:'blue',amount:3},{op:'attrition',amount:1}],color:'frost'},
 {id:'aimed-shot',name:'Aimed Shot',classId:'hunter',icon:'target',description:'Dodaj 2 plave kockice. Naciljaj slabu tačku.',cost:1,price:0,level:1,effects:[{op:'dice',color:'blue',amount:2}],color:'nature'},
 {id:'tracking',name:'Hunter’s Mark',classId:'hunter',icon:'eye',description:'Ponovo baci do 2 svoje kockice.',cost:1,price:3,level:1,effects:[{op:'reroll',amount:2}],color:'nature'},
 {id:'multishot',name:'Multi-Shot',classId:'hunter',icon:'target',description:'Dodaj 3 plave kockice i 1 iscrpljivanje.',cost:2,price:5,level:2,effects:[{op:'dice',color:'blue',amount:3},{op:'attrition',amount:1}],color:'nature'},
 {id:'wrath',name:'Wrath',classId:'druid',icon:'leaf',description:'Dodaj 2 plave kockice snagom prirode.',cost:1,price:0,level:1,effects:[{op:'dice',color:'blue',amount:2}],color:'nature'},
 {id:'rejuvenation',name:'Rejuvenation',classId:'druid',icon:'heart',description:'Vrati 3 zdravlja prije bacanja kockica.',cost:1,price:3,level:1,effects:[{op:'heal',amount:3}],color:'nature'},
 {id:'bear-form',name:'Bear Form',classId:'druid',icon:'shield',description:'Dodaj 2 crvene i 2 zelene kockice.',cost:2,price:5,level:2,effects:[{op:'dice',color:'red',amount:2},{op:'dice',color:'green',amount:2}],color:'nature'},
 {id:'holy-strike',name:'Holy Strike',classId:'paladin',icon:'sun',description:'Dodaj 2 crvene kockice svetom snagom.',cost:1,price:0,level:1,effects:[{op:'dice',color:'red',amount:2}],color:'holy'},
 {id:'holy-light',name:'Holy Light',classId:'paladin',icon:'heart',description:'Vrati 3 zdravlja prije bacanja kockica.',cost:1,price:3,level:1,effects:[{op:'heal',amount:3}],color:'holy'},
 {id:'divine-shield',name:'Divine Shield',classId:'paladin',icon:'shield',description:'Dodaj 4 oklopa i 1 crvenu kockicu.',cost:2,price:5,level:2,effects:[{op:'armor',amount:4},{op:'dice',color:'red',amount:1}],color:'holy'},
 {id:'smite',name:'Smite',classId:'priest',icon:'sun',description:'Dodaj 2 plave kockice u ovoj rundi.',cost:1,price:0,level:1,effects:[{op:'dice',color:'blue',amount:2}],color:'holy'},
 {id:'renew',name:'Renew',classId:'priest',icon:'heart',description:'Vrati 4 zdravlja prije bacanja kockica.',cost:1,price:3,level:1,effects:[{op:'heal',amount:4}],color:'holy'},
 {id:'mind-blast',name:'Mind Blast',classId:'priest',icon:'spark',description:'Dodaj 2 plave kockice i 2 iscrpljivanja.',cost:2,price:5,level:2,effects:[{op:'dice',color:'blue',amount:2},{op:'attrition',amount:2}],color:'arcane'},
 {id:'sinister',name:'Sinister Strike',classId:'rogue',icon:'sword',description:'Dodaj 2 crvene kockice u ovoj rundi.',cost:1,price:0,level:1,effects:[{op:'dice',color:'red',amount:2}],color:'ember'},
 {id:'evasion',name:'Evasion',classId:'rogue',icon:'eye',description:'Ponovo baci do 2 svoje kockice.',cost:1,price:3,level:1,effects:[{op:'reroll',amount:2}],color:'arcane'},
 {id:'envenom',name:'Envenom',classId:'rogue',icon:'flask',description:'Dodaj 3 iscrpljivanja na kraju runde.',cost:2,price:5,level:2,effects:[{op:'attrition',amount:3}],color:'nature'},
 {id:'lightning',name:'Lightning Bolt',classId:'shaman',icon:'bolt',description:'Dodaj 2 plave kockice munje.',cost:1,price:0,level:1,effects:[{op:'dice',color:'blue',amount:2}],color:'frost'},
 {id:'earth-shield',name:'Earth Shield',classId:'shaman',icon:'shield',description:'Dodaj 2 oklopa u ovoj rundi.',cost:1,price:3,level:1,effects:[{op:'armor',amount:2}],color:'nature'},
 {id:'stormstrike',name:'Stormstrike',classId:'shaman',icon:'bolt',description:'Dodaj 2 crvene i 2 plave kockice.',cost:2,price:5,level:2,effects:[{op:'dice',color:'red',amount:2},{op:'dice',color:'blue',amount:2}],color:'frost'},
 {id:'shadow-bolt',name:'Shadow Bolt',classId:'warlock',icon:'flame',description:'Dodaj 2 plave kockice sjenke.',cost:1,price:0,level:1,effects:[{op:'dice',color:'blue',amount:2}],color:'arcane'},
 {id:'drain-life',name:'Drain Life',classId:'warlock',icon:'heart',description:'Vrati 2 zdravlja i dodaj 1 iscrpljivanje.',cost:1,price:3,level:1,effects:[{op:'heal',amount:2},{op:'attrition',amount:1}],color:'nature'},
 {id:'corruption',name:'Corruption',classId:'warlock',icon:'skull',description:'Dodaj 3 iscrpljivanja u ovoj rundi.',cost:2,price:5,level:2,effects:[{op:'attrition',amount:3}],color:'arcane'},
];
export const ITEMS: Item[] = [
 {id:'steel-blade',name:'Forged Steel Blade',description:'+1 crvena kockica',price:3,level:1,slot:'weapon',effects:[{op:'dice',color:'red',amount:1}],icon:'sword',color:'steel'},
 {id:'oak-staff',name:'Runed Oak Staff',description:'+1 plava kockica',price:3,level:1,slot:'weapon',effects:[{op:'dice',color:'blue',amount:1}],icon:'spark',color:'arcane'},
 {id:'chainmail',name:'Guard’s Chainmail',description:'+1 zelena kockica',price:3,level:1,slot:'armor',effects:[{op:'dice',color:'green',amount:1}],icon:'shield',color:'steel'},
 {id:'ranger-charm',name:'Ranger’s Talisman',description:'+1 ponovno bacanje po rundi',price:4,level:1,slot:'trinket',effects:[{op:'reroll',amount:1}],icon:'eye',color:'nature'},
 {id:'runeblade',name:'Runeblade of the North',description:'+2 crvene i +1 plava kockica',price:6,level:2,slot:'weapon',effects:[{op:'dice',color:'red',amount:2},{op:'dice',color:'blue',amount:1}],icon:'swords',color:'frost'},
 {id:'aegis',name:'Aegis of Lordaeron',description:'+2 zelene kockice i +1 oklop',price:6,level:2,slot:'armor',effects:[{op:'dice',color:'green',amount:2},{op:'armor',amount:1}],icon:'shield',color:'holy'},
];
export const ENEMIES: Enemy[] = [
 {id:'scarlet',name:'Scarlet Crusader',region:'monastery',threat:4,attack:2,health:2,count:2,kind:'quest',faction:'horde',xp:2,gold:2,icon:'swords'},
 {id:'worgen',name:'Shadowfang Worgen',region:'shadowfang',threat:4,attack:3,health:3,count:1,kind:'quest',faction:'horde',xp:2,gold:2,icon:'skull'},
 {id:'gnoll',name:'Riverpaw Gnoll',region:'hillsbrad',threat:3,attack:2,health:2,count:2,kind:'quest',faction:'alliance',xp:2,gold:2,icon:'swords'},
 {id:'murloc',name:'Murloc Tidehunter',region:'durnholde',threat:3,attack:3,health:2,count:2,kind:'quest',faction:'alliance',xp:2,gold:2,icon:'fish'},
 {id:'ogre',name:'Crushridge Ogre',region:'alterac',threat:5,attack:4,health:4,count:1,kind:'independent',xp:0,gold:0,icon:'skull'},
 {id:'spider',name:'Plaguewood Spider',region:'bulwark',threat:4,attack:2,health:2,count:1,kind:'independent',xp:0,gold:0,icon:'bug'},
 {id:'ghoul-h',name:'Ravenous Ghoul',region:'andorhal',threat:5,attack:3,health:3,count:2,kind:'quest',faction:'horde',xp:3,gold:3,icon:'skull'},
 {id:'troll-a',name:'Vilebranch Berserker',region:'jintha',threat:5,attack:3,health:3,count:2,kind:'quest',faction:'alliance',xp:3,gold:3,icon:'swords'},
 {id:'lich',name:'Kel’Thuzad',region:'stratholme',threat:6,attack:9,health:18,count:1,kind:'boss',xp:8,gold:10,icon:'skull'},
];
export const QUESTS: Quest[] = [
 {id:'q-scarlet',name:'Crvene zastave',description:'Zaustavi križare u Scarlet Monasteryju.',faction:'horde',enemyId:'scarlet',region:'monastery',xp:2,gold:2,tier:1},
 {id:'q-worgen',name:'Zavijanje u tami',description:'Porazi vukodlaka koji čuva Shadowfang Keep.',faction:'horde',enemyId:'worgen',region:'shadowfang',xp:2,gold:2,tier:1},
 {id:'q-ghoul',name:'Mrtvi ne spavaju',description:'Oslobodi Andorhal od nemrtvih.',faction:'horde',enemyId:'ghoul-h',region:'andorhal',xp:3,gold:3,tier:2},
 {id:'q-gnoll',name:'Nevolje u poljima',description:'Otjeraj gnollove iz Hillsbradskih polja.',faction:'alliance',enemyId:'gnoll',region:'hillsbrad',xp:2,gold:2,tier:1},
 {id:'q-murloc',name:'Nemir uz rijeku',description:'Očisti put prema Durnholde Keepu.',faction:'alliance',enemyId:'murloc',region:'durnholde',xp:2,gold:2,tier:1},
 {id:'q-troll',name:'Zaboravljeni hram',description:'Porazi čuvare Jintha’Alora.',faction:'alliance',enemyId:'troll-a',region:'jintha',xp:3,gold:3,tier:2},
];
export const heroDefinition = (id: string) => { const h = HEROES.find(h => h.id === id); if (!h) throw new Error('Nepoznat junak.'); return h; };
export const regionById = (id: string) => { const r = REGIONS.find(r => r.id === id); if (!r) throw new Error('Nepoznata lokacija.'); return r; };
