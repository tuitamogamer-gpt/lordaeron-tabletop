import type { Region, Source } from '../rules/model.js';
export const BOARD_SOURCE: Source = { url: 'https://worldofwarcraft.judgehype.com/image/16487/', reference: 'Board photograph; manually traced topology, pending flat-scan review', status: 'community' };
// Coordinates are percentages of the reference photograph, not the decorative prototype map.
const rows: [string, string, string, number, number][] = [
 ['agamand','Agamand Mills','Tirisfal',23,23], ['scarlet-watch','Scarlet Watch Post','Tirisfal',30,24], ['monastery','Scarlet Monastery','Tirisfal',39,21],
 ['brightwater','Brightwater Lake','Tirisfal',35,27], ['venomweb','Venomweb Vale','Tirisfal',41,30], ['brill','Brill','Tirisfal',28,31], ['stillwater','Stillwater Pond','Tirisfal',20,31],
 ['deathknell','Deathknell','Tirisfal',16,37], ['nightmare','Nightmare Vale','Tirisfal',23,37], ['tirisfal-grove','Tirisfal Grove','Tirisfal',33,35], ['balnir','Balnir Farmstead','Tirisfal',36,38], ['decrepit','The Decrepit Ferry','Tirisfal',28,42],
 ['north-tide','North Tide’s Hollow','Silverpine',14,51], ['shining','Shining Strand','Silverpine',21,47], ['fenris','Fenris Isle','Silverpine',27,52], ['deep-elem','Deep Elem Mine','Silverpine',20,59],
 ['sepulcher','The Sepulcher','Silverpine',14,61], ['olsen','Olsen’s Farthing','Silverpine',15,68], ['ambermill','Ambermill','Silverpine',20,71], ['pyrewood','Pyrewood Village','Silverpine',15,76],
 ['dalaran','Dalaran Ruins','Alterac',28,62], ['corrahn','Corrahn’s Dagger','Alterac',32,68], ['alterac','Ruins of Alterac','Alterac',35,59], ['sohrans','Sofera’s Naze','Alterac',40,63], ['chillwind','Chillwind Point','Alterac',46,59], ['uplands','The Uplands','Alterac',40,50],
 ['fields','Hillsbrad Fields','Hillsbrad',32,74], ['tarren','Tarren Mill','Hillsbrad',40,72], ['azure','Azurelode Mine','Hillsbrad',29,80], ['southshore','Southshore','Hillsbrad',38,79], ['durnholde','Durnholde Keep','Hillsbrad',47,75], ['aerie-valley','Aerie Valley','Hillsbrad',50,71], ['dun-garok','Dun Garok','Hillsbrad',43,83], ['purgation','Purgation Isle','Hillsbrad',26,89],
 ['bulwark','The Bulwark','Western Plaguelands',43,41], ['hearthglen','Hearthglen','Western Plaguelands',48,24], ['dalson','Dalson’s Tears','Western Plaguelands',49,34], ['weeping','The Weeping Cave','Western Plaguelands',56,36],
 ['gahrron','Gahrron’s Withering','Western Plaguelands',51,42], ['andorhal','Ruins of Andorhal','Western Plaguelands',47,45], ['sorrow','Sorrow Hill','Western Plaguelands',48,50], ['caer','Caer Darrow','Western Plaguelands',59,47],
 ['aerie','Aerie Peak','Hinterlands',55,65], ['plaguemist','Plaguemist Ravine','Hinterlands',59,58], ['quel-danil','Quel’Danil Lodge','Hinterlands',65,64], ['shadra','Shadra’Alor','Hinterlands',62,71],
 ['altar','Altar of Zul','Hinterlands',70,70], ['skulk','Skulk Rock','Hinterlands',74,61], ['seradane','Seradane','Hinterlands',78,53], ['shaol','Shaol’watha','Hinterlands',80,66], ['jintha','Jintha’Alor','Hinterlands',75,75], ['overlook','Overlook Cliffs','Hinterlands',84,72],
 ['stratholme','Stratholme','Eastern Plaguelands',67,13], ['terrordale','Terrordale','Eastern Plaguelands',62,19], ['northpass','Northpass Tower','Eastern Plaguelands',74,19], ['plaguewood','Plaguewood','Eastern Plaguelands',68,22],
 ['blackwood','Blackwood Lake','Eastern Plaguelands',77,25], ['eastwall','Eastwall Tower','Eastern Plaguelands',83,23], ['noxious','The Noxious Glade','Eastern Plaguelands',88,24], ['fungal','Fungal Vale','Eastern Plaguelands',71,29],
 ['marris','Marris Stead','Eastern Plaguelands',61,33], ['crown','Crown Guard Tower','Eastern Plaguelands',68,36], ['infectis','The Infectis Scar','Eastern Plaguelands',77,32], ['pestilent','Pestilent Scar','Eastern Plaguelands',84,32],
 ['darrowshire','Darrowshire','Eastern Plaguelands',70,41], ['corins','Corin’s Crossing','Eastern Plaguelands',80,40], ['tyrs','Tyr’s Hand','Eastern Plaguelands',89,41],
];
const links = [
 'agamand:stillwater,brill,scarlet-watch', 'scarlet-watch:brill,brightwater,monastery', 'monastery:brightwater,venomweb', 'brightwater:brill,tirisfal-grove,venomweb',
 'brill:stillwater,nightmare,decrepit,tirisfal-grove', 'stillwater:deathknell,nightmare', 'deathknell:nightmare', 'nightmare:decrepit', 'tirisfal-grove:decrepit,balnir,venomweb', 'balnir:venomweb,bulwark,decrepit',
 'decrepit:shining,uplands', 'north-tide:shining,deep-elem,sepulcher', 'shining:deep-elem,fenris', 'fenris:deep-elem', 'deep-elem:sepulcher,olsen,ambermill,dalaran', 'sepulcher:olsen', 'olsen:ambermill,pyrewood', 'ambermill:pyrewood,dalaran,fields', 'pyrewood:azure',
 'dalaran:corrahn,alterac,fields', 'corrahn:alterac,sohrans,tarren,fields', 'alterac:sohrans,uplands', 'sohrans:uplands,chillwind,tarren', 'chillwind:uplands,tarren,aerie-valley', 'uplands:bulwark,sorrow',
 'fields:tarren,southshore,azure', 'tarren:durnholde,aerie-valley,southshore', 'azure:southshore,purgation', 'southshore:dun-garok,durnholde,purgation', 'durnholde:dun-garok,aerie-valley', 'aerie-valley:aerie',
 'bulwark:dalson,andorhal,balnir', 'hearthglen:dalson,weeping', 'dalson:weeping,gahrron,andorhal', 'weeping:gahrron', 'gahrron:andorhal,sorrow,caer', 'andorhal:sorrow', 'sorrow:caer', 'caer:plaguemist',
 'aerie:plaguemist,quel-danil,shadra', 'plaguemist:quel-danil', 'quel-danil:shadra,altar,skulk', 'shadra:altar', 'altar:skulk,jintha', 'skulk:seradane,shaol,jintha', 'shaol:jintha,overlook', 'jintha:overlook',
 'marris:crown,darrowshire', 'terrordale:stratholme,plaguewood,northpass', 'stratholme:northpass', 'northpass:plaguewood,blackwood,eastwall', 'plaguewood:blackwood', 'eastwall:blackwood,noxious,pestilent',
 'blackwood:fungal,infectis,pestilent', 'fungal:infectis,crown', 'crown:infectis,darrowshire,corins', 'infectis:pestilent,corins', 'pestilent:noxious,corins,tyrs', 'corins:darrowshire,tyrs',
 // The orange/yellow regional border has one traversable opening at the road.
 'caer:darrowshire',
];
export const BOARD_REGIONS: Region[] = rows.map(([id, name, zone, x, y]) => ({ id, name, zone, x, y, neighbors: [] }));
for (const link of links) { const [from, to] = link.split(':'); for (const id of to.split(',')) {
 const a = BOARD_REGIONS.find(r => r.id === from)!, b = BOARD_REGIONS.find(r => r.id === id)!;
 if (!a.neighbors.includes(id)) a.neighbors.push(id); if (!b.neighbors.includes(from)) b.neighbors.push(from);
} }
for (const r of BOARD_REGIONS) {
 if (['brill', 'north-tide', 'caer', 'pestilent'].includes(r.id)) r.flight = 'horde';
 if (['southshore', 'sorrow', 'aerie'].includes(r.id)) r.flight = 'alliance';
 if (['brill', 'north-tide'].includes(r.id)) r.town = 'horde';
 if (['southshore', 'aerie'].includes(r.id)) r.town = 'alliance';
 if (['olsen', 'andorhal', 'quel-danil', 'corins'].includes(r.id)) r.graveyard = true;
 if (r.id === 'brill') r.home = 'horde'; if (r.id === 'southshore') r.home = 'alliance';
 if (r.id === 'pestilent') { r.flight = 'both'; r.town = 'both'; }
}
