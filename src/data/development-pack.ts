/** Playable integration fixtures. NOT a transcription of the 2005 card decks.
 * User explicitly deferred scans. Keep this pack distinct from a future verified base pack.
 */
import original from './original-characters.json' with { type: 'json' };
import creatureData from './reference-creatures.json' with { type: 'json' };
import { BOARD_REGIONS } from './board-2005.js';
import type { Card, Character, ClassId, ContentPack, Creature, Effect, EventCard, Faction, Quest, Source, Tier } from '../rules/model.js';
export const FIXTURE: Source = { url: 'local:development-pack', reference: 'Integration fixture; not an original card', status: 'fixture' };
const originalSource: Source = { url: 'https://github.com/WarHatch/WoW-BG-app/tree/9a6a70d916a02182edcc7b261739a36bd0555d3d', reference: 'Character names and level capacities only; slots and starting cards are fixtures', status: 'community' };
const classes: ClassId[] = ['warrior','mage','hunter','druid','paladin','priest','rogue','shaman','warlock'];
const colors = ['red','blue','blue','red','red','blue','red','blue','blue'] as const;
const cards: Card[] = [];
function fixtureCard(id: string, name: string, options: Partial<Card>): Card {
 return { id, name, kind: 'item', type: 'melee', level: 1, price: 0, energy: 0, printed: id.includes('printed'), description: 'Probna karta za provjeru enginea.', abilities: [], source: FIXTURE, ...options };
}
const pool = (color: 'red' | 'blue' | 'green', amount: number): Effect => ({ op: 'dice', color, amount });
for (const [type, color] of [['melee','red'],['ranged','blue'],['armor','green']] as const) cards.push(fixtureCard(`printed-${type}`, `Početni ${type === 'melee' ? 'udar' : type === 'ranged' ? 'projektil' : 'oklop'} · probno`, { type, trait: 'all', abilities: [{ id: 'pool', timing: 'pool', effects: [pool(color, type === 'melee' ? 2 : 1)] }] }));
for (const [i, classId] of classes.entries()) {
 cards.push(fixtureCard(`${classId}-printed`, 'Osnovna vještina · probno', { kind: 'power', classId, type: 'instant', energy: 1, abilities: [{ id: 'pool', timing: 'pool', effects: [pool(colors[i], 2)] }] }));
 cards.push(fixtureCard(`${classId}-precision`, 'Preciznost · probno', { kind: 'power', classId, type: 'instant', price: 2, energy: 1, abilities: [{ id: 'reroll', timing: 'reroll', effects: [{ op: 'stat', stat: 'reroll', amount: 2 }] }] }));
 cards.push(fixtureCard(`${classId}-guard`, 'Pripremljena odbrana · probno', { kind: 'power', classId, type: 'active', price: 3, energy: 1, abilities: [{ id: 'pool', timing: 'pool', effects: [pool('green', 2)] }] }));
 cards.push(fixtureCard(`${classId}-mend`, 'Oporavak · probno', { kind: 'power', classId, type: 'instant', price: 4, energy: 2, abilities: [{ id: 'heal', timing: 'wound', effects: [{ op: 'resource', resource: 'health', amount: 3, target: 'friendly' }] }] }));
 for (let level = 2; level <= 5; level++) cards.push(fixtureCard(`${classId}-talent-${level}`, `Usavršavanje ${level} · probno`, { kind: 'talent', classId, type: 'general', level, abilities: [{ id: 'pool', timing: 'pool', effects: [pool(level % 2 ? 'green' : colors[i], 1)] }] }));
}
// Independent physical item IDs make ownership, bags and the merchant testable.
for (const [deck, count, level] of [['triangle',18,1],['square',12,2],['circle',8,3],['special',4,2]] as const) for (let i = 0; i < count; i++) {
 const type = (['melee','ranged','armor','bag'] as const)[i % 4];
 cards.push(fixtureCard(`${deck}-${i}`, `${type === 'bag' ? 'Napitak' : type === 'armor' ? 'Oklop' : type === 'ranged' ? 'Štap' : 'Mač'} ${i + 1} · probno`, { deck, type, level, price: level * 2 + i % 3, trait: 'all', abilities: type === 'bag' ? [{ id: 'heal', timing: 'wound', effects: [{ op: 'resource', resource: 'health', amount: level + 1 }, { op: 'discard-self' }] }] : [{ id: 'pool', timing: 'pool', effects: [pool(type === 'melee' ? 'red' : type === 'ranged' ? 'blue' : 'green', level + 1)] }] }));
}
cards.push(fixtureCard('auction-charm', 'Aukcijski talisman · probno', { type: 'general', abilities: [{ id: 'pool', timing: 'pool', effects: [{ op: 'stat', stat: 'reroll', amount: 1 }] }] }));
const characters: Character[] = (['Alliance','Horde'] as const).flatMap(f => original[f].map(raw => {
 const classId = raw.class.toLowerCase() as ClassId, portrait = classes.indexOf(classId), id = raw.name.toLowerCase().replace(/[^a-z]+/g, '-');
 return { id, name: raw.name, faction: f.toLowerCase() as Faction, classId, portrait, race: 'Rasna sposobnost čeka izvor', capacities: raw.levelCaps, slots: [
  { types: ['melee'], traits: ['all'], printed: 'printed-melee' }, { types: ['ranged'], traits: ['all'], printed: 'printed-ranged' }, { types: ['armor'], traits: ['all'], printed: 'printed-armor' },
  { types: ['instant'], traits: ['all'], printed: `${classId}-printed` }, { types: ['active','instant','general'], traits: ['all'] }, { types: ['active','instant','general'], traits: ['all'] }, { types: ['active','instant','general'], traits: ['all'] },
 ], source: originalSource } as Character;
}));
const quests: Quest[] = [];
const locations: Record<Faction, string[]> = { horde: ['stillwater','nightmare','brightwater','balnir','dalson','hearthglen','andorhal','weeping'], alliance: ['fields','tarren','durnholde','azure','altar','skulk','sorrow','corins'] };
for (const faction of ['horde','alliance'] as const) for (const [tier, count, level] of [['grey',4,1],['green',12,2],['yellow',12,3],['red',12,4]] as [Tier,number,number][]) for (let i = 0; i < count; i++) {
 const type = tier === 'grey' ? ['murloc','gnoll','crusader','ghoul'][i] : tier === 'green' ? ['murloc','gnoll','ghoul','naga','spider','worgen'][i%6] : tier === 'yellow' ? ['naga','spider','worgen','wildkin','ogre','wraith'][i%6] : ['wildkin','ogre','wraith','doomguard','drake','infernal'][i%6];
 quests.push({ id: `${faction}-${tier}-${i}`, name: `Patrola: ${type} · probni quest`, faction, tier, level, spawns: [{ creature: type, color: tier === 'red' ? 'red' : 'green', region: locations[faction][tier === 'grey' ? i : 2 + i % 6], count: 1 }], reward: { xp: level + 2, gold: level + 2, items: [{ deck: level < 3 ? 'triangle' : level === 3 ? 'square' : 'circle', draw: 2 }] }, source: FIXTURE });
}
const events: EventCard[] = [
 { id:'market-1',name:'Novi trgovci · probno',bonus:true,fate:1,effects:[{op:'merchant',deck:'triangle',count:2}],source:FIXTURE },
 { id:'market-2',name:'Novi trgovci · probno',bonus:true,fate:2,effects:[{op:'merchant',deck:'square',count:1}],source:FIXTURE },
 { id:'reinforcements',name:'Pojačanja slabijoj frakciji · probno',bonus:false,fate:0,effects:[{op:'gold',amount:2,faction:'weaker'}],source:FIXTURE },
 { id:'war-hillsbrad',name:'Bitka za Hillsbrad · probno',bonus:false,fate:1,effects:[{op:'war',regions:['fields','durnholde'],reward:{xp:6,gold:6,items:[]}}],source:FIXTURE },
 { id:'auction',name:'Aukcija · probno',bonus:true,fate:2,effects:[{op:'auction',item:'auction-charm'}],source:FIXTURE },
 { id:'spiders',name:'Pauci na putu · probno',bonus:false,fate:1,effects:[{op:'spawn',spawns:[{creature:'spider',color:'blue',count:1,region:'aerie-valley'},{creature:'gnoll',color:'blue',count:1,region:'decrepit'}]}],source:FIXTURE },
 { id:'gold',name:'Trgovački karavan · probno',bonus:false,fate:0,effects:[{op:'gold',amount:1,faction:'all'}],source:FIXTURE },
];
export const DEVELOPMENT_PACK: ContentPack = {
 id: 'development-2005-v2.1.0', name: 'Razvojna kampanja', officialComplete: false,
 regions: BOARD_REGIONS, characters, cards, creatures: creatureData as Creature[], quests, events,
 overlords: [{ id: 'training-overlord', name: 'Čuvar probne kampanje', region: 'stratholme', stats: { 4: { threat: 6, attack: 12, health: 18 }, 6: { threat: 6, attack: 18, health: 27 } }, combat: 'none', source: FIXTURE }],
 xp: [0,4,10,18,28],
 track: { 2:'triangle',4:'event',5:'triangle',7:'event',8:'triangle',10:'event',11:'triangle',13:'event',14:'square',16:'event',17:'square',19:'event',20:'square',22:'event',23:'circle',25:'event',26:'circle',29:'circle' },
};
export const DEFAULT_SETUP = { seed: 2005, roster: ['grumbaz-crowsblood','sofeea-icecall','zowka-shattertusk','brandon-lightstone','burbon-fang','artumnis-moondream'], overlord: 'training-overlord' };
export const CONTENT_COVERAGE = [
 { name:'Originalni likovi',expected:16,available:16,scripted:0,note:'Imena i kapaciteti postoje. Rasne moći, slotovi i početne karte čekaju skenove.' },
 { name:'Power + Talent',expected:216,available:0,scripted:0,note:'Probne moći koriste skriptni sistem; originalne klasne karte još nisu učitane.' },
 { name:'Predmeti osnovnog seta',expected:120,available:0,scripted:0,note:'273 referentna skena uključuju proširenja; izdanje i efekti čekaju provjeru.' },
 { name:'Questovi',expected:80,available:0,scripted:0,note:'Setup, spawn, nagrade i zamjena rade s probnim špilovima.' },
 { name:'Event + Kel’Thuzad karte',expected:52,available:0,scripted:0,note:'Aukcije, ratovi, bonus lanci i trgovac rade s probnim događajima.' },
 { name:'Vrste čudovišta',expected:13,available:13,scripted:13,note:'Efekti skriptirani iz community podataka; vrijednosti čekaju potvrdu originalnog lista.' },
 { name:'Overlord listovi',expected:3,available:0,scripted:0,note:'Podržani cilj kampanje i pobjeda. Originalna tri profila čekaju izvor.' },
];
