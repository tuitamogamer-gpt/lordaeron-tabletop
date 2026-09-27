import type { Region, Source } from '../rules/model.js';
import { BOARD_NEIGHBORS, BOARD_SHAPE_BY_ID } from './board-geometry.js';
export const BOARD_SOURCE: Source = { url: 'https://worldofwarcraft.judgehype.com/image/16487/', reference: '2005 board photographs; shared polygon borders, with FFG rules pp. 9–10', status: 'community' };
// Names are printed on the original board; geometry and adjacency live in board-geometry.ts.
const rows: [string, string, string][] = [
 ['agamand','Agamand Mills','Tirisfal'], ['garrens-haunt','Garren’s Haunt','Tirisfal'], ['monastery','Scarlet Monastery','Tirisfal'],
 ['brightwater','Brightwater Lake','Tirisfal'], ['venomweb','Venomweb Vale','Tirisfal'], ['brill','Brill','Tirisfal'], ['stillwater','Stillwater Pond','Tirisfal'],
 ['deathknell','Deathknell','Tirisfal'], ['nightmare','Nightmare Vale','Tirisfal'], ['tirisfal-outpost','Tirisfal Outpost','Tirisfal'], ['balnir','Balnir Farmstead','Tirisfal'], ['undercity','The Undercity','Tirisfal'],
 ['north-tide','North Tide’s Hollow','Silverpine'], ['shining','Shining Strand','Silverpine'], ['fenris','Fenris Isle','Silverpine'], ['deep-elem','Deep Elem Mine','Silverpine'],
 ['sepulcher','The Sepulcher','Silverpine'], ['olsen','Olsen’s Farthing','Silverpine'], ['ambermill','Ambermill','Silverpine'], ['pyrewood','Pyrewood Village','Silverpine'],
 ['dalaran','Dalaran Ruins','Alterac'], ['corrahn','Corrahn’s Dagger','Alterac'], ['alterac','Ruins of Alterac','Alterac'], ['sohrans','Sofera’s Naze','Alterac'], ['chillwind','Chillwind Point','Alterac'], ['uplands','The Uplands','Alterac'],
 ['fields','Hillsbrad Fields','Hillsbrad'], ['tarren','Tarren Mill','Hillsbrad'], ['azure','Azurelode Mine','Hillsbrad'], ['southshore','Southshore','Hillsbrad'], ['durnholde','Durnholde Keep','Hillsbrad'], ['aerie-valley','Aerie Valley','Hillsbrad'], ['dun-garok','Dun Garok','Hillsbrad'], ['purgation','Purgation Isle','Hillsbrad'],
 ['bulwark','The Bulwark','Western Plaguelands'], ['hearthglen','Hearthglen','Western Plaguelands'], ['dalson','Dalson’s Tears','Western Plaguelands'], ['weeping','The Weeping Cave','Western Plaguelands'],
 ['gahrron','Gahrron’s Withering','Western Plaguelands'], ['andorhal','Ruins of Andorhal','Western Plaguelands'], ['sorrow','Sorrow Hill','Western Plaguelands'], ['caer','Caer Darrow','Western Plaguelands'],
 ['aerie','Aerie Peak','Hinterlands'], ['plaguemist','Plaguemist Ravine','Hinterlands'], ['quel-danil','Quel’Danil Lodge','Hinterlands'], ['shadra','Shadra’Alor','Hinterlands'],
 ['altar','Altar of Zul','Hinterlands'], ['skulk','Skulk Rock','Hinterlands'], ['seradane','Seradane','Hinterlands'], ['shaol','Shaol’watha','Hinterlands'], ['jintha','Jintha’Alor','Hinterlands'], ['overlook','Overlook Cliffs','Hinterlands'],
 ['stratholme','Stratholme','Eastern Plaguelands'], ['terrordale','Terrordale','Eastern Plaguelands'], ['northpass','Northpass Tower','Eastern Plaguelands'], ['plaguewood','Plaguewood','Eastern Plaguelands'],
 ['blackwood','Blackwood Lake','Eastern Plaguelands'], ['eastwall','Eastwall Tower','Eastern Plaguelands'], ['noxious','The Noxious Glade','Eastern Plaguelands'], ['fungal','Fungal Vale','Eastern Plaguelands'],
 ['marris','Marris Stead','Eastern Plaguelands'], ['crown','Crown Guard Tower','Eastern Plaguelands'], ['infectis','The Infectis Scar','Eastern Plaguelands'], ['pestilent','Pestilent Scar','Eastern Plaguelands'],
 ['darrowshire','Darrowshire','Eastern Plaguelands'], ['corins','Corin’s Crossing','Eastern Plaguelands'], ['tyrs','Tyr’s Hand','Eastern Plaguelands'],
];
export const BOARD_REGIONS: Region[] = rows.map(([id, name, zone]) => {
 const [x,y] = BOARD_SHAPE_BY_ID[id].center;
 return { id, name, zone, x:x/16, y:y/11.08, neighbors:BOARD_NEIGHBORS[id] };
});
for (const r of BOARD_REGIONS) {
 if (['brill', 'north-tide', 'caer', 'pestilent'].includes(r.id)) r.flight = 'horde';
 if (['southshore', 'sorrow', 'aerie'].includes(r.id)) r.flight = 'alliance';
 if (['brill', 'north-tide'].includes(r.id)) r.town = 'horde';
 if (['southshore', 'aerie'].includes(r.id)) r.town = 'alliance';
 if (['olsen', 'andorhal', 'quel-danil', 'corins'].includes(r.id)) r.graveyard = true;
 if (r.id === 'brill') r.home = 'horde'; if (r.id === 'southshore') r.home = 'alliance';
 if (r.id === 'pestilent') { r.flight = 'both'; r.town = 'both'; }
}
