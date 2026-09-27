import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { BOARD_BORDERS, BOARD_SHAPES, BOARD_SHAPE_BY_ID, pointInRegion, segmentInRegion, walkingLine } from '../src/data/board-geometry';
import { apply, createGame } from '../src/rules/game';
import { reachable, steps } from '../src/rules/movement';
import { legalActions } from '../src/rules/legal';
import { spawnQuest } from '../src/rules/rewards';
import { view } from '../src/rules/view';
import { questMarkers, questLabel, clampCamera, zoomCamera } from '../src/campaign/map-state';
const empty=()=>{const s=createGame(p,DEFAULT_SETUP);s.enemies=[];return s;};

describe('2005 board geometry and printed movement examples',()=>{
 it('covers every region with an interior anchor and one connected walking graph',()=>{
  expect(BOARD_SHAPES).toHaveLength(67);expect(new Set(BOARD_SHAPES.map(s=>s.id)).size).toBe(67);
  for(const shape of BOARD_SHAPES)expect(pointInRegion(shape.center,shape.points),shape.id).toBe(true);
  for(const b of BOARD_BORDERS)expect(new Set(b.regions).size).toBe(b.regions.length);
  const found=new Set(['brill']),queue=['brill'];while(queue.length){const at=queue.shift();for(const n of p.regions.find(r=>r.id===at)?.neighbors??[])if(!found.has(n)){found.add(n);queue.push(n);}}
  expect(found.size).toBe(67);
 });
 it('keeps walking previews inside the two connected polygons, including narrow concave passes',()=>{
  for(const r of p.regions)for(const n of r.neighbors){
   const route=walkingLine(r.id,n),a=BOARD_SHAPE_BY_ID[r.id],b=BOARD_SHAPE_BY_ID[n];
   expect(route[0]).toEqual(a.center);expect(route.at(-1)).toEqual(b.center);
   for(let i=1;i<route.length;i++)expect(segmentInRegion(route[i-1],route[i],a.points)||segmentInRegion(route[i-1],route[i],b.points),`${r.id} → ${n}`).toBe(true);
  }
 });
 it('uses one action for two regions and rejects a third',()=>{
  const s=empty(),h=s.heroes[0],c={type:'travel' as const,hero:h.id,path:['stillwater','agamand']};
  const next=apply(p,s,c);expect(next.heroes[0]).toMatchObject({location:'agamand',actions:1});
  expect(s.heroes[0]).toMatchObject({location:'brill',actions:2});
  expect(()=>apply(p,s,{...c,path:[...c.path,'stillwater']})).toThrow(/koraka/);
 });
 it('matches the rulebook Southshore → Sorrow Hill flight followed by a ground step',()=>{
  const s=empty();s.faction='alliance';const h=s.heroes.find(h=>h.location==='southshore')!;
  const next=apply(p,s,{type:'travel',hero:h.id,path:['sorrow','chillwind']});
  expect(next.heroes.find(a=>a.id===h.id)).toMatchObject({location:'chillwind',actions:1});
  expect(p.regions.find(r=>r.id==='sorrow')!.neighbors).toContain('andorhal');
  expect(p.regions.find(r=>r.id==='sorrow')!.neighbors).toContain('caer');
 });
 it('has four flight regions per faction and blocks hostile flights and home regions',()=>{
  const s=empty(),h=s.heroes[0];
  for(const f of ['horde','alliance'])expect(p.regions.filter(r=>r.flight===f||r.flight==='both')).toHaveLength(4);
  expect(steps(p,h,'brill')).toContain('pestilent');expect(steps(p,h,'pestilent')).not.toContain('southshore');
  h.location='azure';expect(()=>apply(p,s,{type:'travel',hero:h.id,path:['southshore']})).toThrow();
 });
 it.each([['agamand','brill'],['agamand','garrens-haunt'],['undercity','uplands'],['pyrewood','azure'],['purgation','southshore'],['caer','darrowshire'],['altar','jintha'],['skulk','jintha'],['plaguewood','fungal'],['noxious','eastwall']])('does not cross black terrain or cut corners from %s to %s',(from,to)=>{
  const s=empty(),h=s.heroes[0];h.location=from;
  expect(()=>apply(p,s,{type:'travel',hero:h.id,path:[to]})).toThrow(/povezane/);
  expect(walkingLine(from,to)).toEqual([]);
 });
 it('stops on blue creatures, then requires a challenge, including blue creatures at a flight destination',()=>{
  for(const [first,second] of [['stillwater','agamand'],['caer','plaguemist']]){
   const s=empty(),h=s.heroes[0];s.enemies.push({id:'blocking-blue',creature:'gnoll',color:'blue',region:first});
   expect(()=>apply(p,s,{type:'travel',hero:h.id,path:[first,second]})).toThrow(/zaustavlja/);
   const next=apply(p,s,{type:'travel',hero:h.id,path:[first]});
   expect(reachable(p,next,next.heroes[0])).toEqual({});
   expect(()=>apply(p,next,{type:'rest',hero:h.id,health:0})).toThrow(/izazov/);
   expect(legalActions(p,next).some(c=>c.type==='challenge'&&c.hero===h.id)).toBe(true);
  }
 });
 it('does not stop Travel for green or red quest creatures',()=>{
  for(const color of ['green','red'] as const){const s=empty();s.enemies.push({id:color,creature:'gnoll',color,region:'stillwater',faction:'alliance'});
   expect(()=>apply(p,s,{type:'travel',hero:s.heroes[0].id,path:['stillwater','agamand']})).not.toThrow();}
 });
});

describe('quest tokens and deck lifecycle',()=>{
 it('places one faction token per live objective region and none for independent blue spawns',()=>{
  const s=createGame(p,DEFAULT_SETUP),markers=questMarkers(p,view(s));
  expect(markers).toHaveLength(10);
  for(const m of markers){expect(m.remaining).toBe(s.enemies.filter(e=>e.quest===m.quest.id&&e.region===m.region&&e.color!=='blue').length);expect(m.remaining).toBeGreaterThan(0);}
  expect(view(s)).not.toHaveProperty('questDecks');
  for(const side of ['horde','alliance'])expect(view(s).deckCounts.quests[side]).toEqual({grey:0,green:11,yellow:10,red:10});
 });
 it('moves tokens with their actual creatures, keeps references stable, and removes completed objectives',()=>{
  const s=createGame(p,DEFAULT_SETUP),q=p.quests.find(q=>q.id===s.quests[0])!,label=questLabel(p,q.id);
  s.enemies.filter(e=>e.quest===q.id).forEach(e=>e.region='brill');
  expect(questMarkers(p,view(s)).find(m=>m.quest.id===q.id)).toMatchObject({label,region:'brill'});
  s.quests.reverse();expect(questLabel(p,q.id)).toBe(label);
  s.enemies=s.enemies.filter(e=>e.quest!==q.id);expect(questMarkers(p,view(s)).some(m=>m.quest.id===q.id)).toBe(false);
 });
 it('draws a replacement, decrements its deck, spawns targets and exposes the new token',()=>{
  const s=empty(),old=s.quests.find(id=>p.quests.find(q=>q.id===id)?.faction==='horde')!;
  s.quests=s.quests.filter(id=>id!==old);s.completed.push(old);s.phase='reward';
  s.reward={faction:'horde',eligible:[s.heroes[0].id],quest:old,offered:[],items:[],special:[],replacement:true};
  const next=apply(p,s,{type:'quest',tier:'green'}),drawn=next.quests.find(id=>!s.quests.includes(id))!;
  expect(next.questDecks.horde.green.length).toBe(s.questDecks.horde.green.length-1);
  expect(next.quests).toHaveLength(s.quests.length+1);expect(questMarkers(p,view(next)).some(m=>m.quest.id===drawn)).toBe(true);
  expect(questMarkers(p,view(next)).some(m=>m.quest.id===old)).toBe(false);
 });
 it('groups different colors of one quest under the same token and excludes its blue creature',()=>{
  const s=empty();s.quests=[];const q=p.quests.find(q=>q.name==='Crusade Against the Crusaders')!;
  expect(spawnQuest(p,s,q)).toBe(true);const markers=questMarkers(p,view(s));
  expect(markers).toHaveLength(1);expect(markers[0]).toMatchObject({region:'hearthglen',remaining:2});
 });
});

describe('bounded map camera',()=>{
 it('keeps the map in view, respects zoom limits, and resets panning when fully zoomed out',()=>{
  expect(clampCamera({zoom:0,x:999,y:999},900,600,1.5)).toEqual({zoom:1,x:0,y:0});
  expect(clampCamera({zoom:9,x:99999,y:-99999},900,600,1.5)).toEqual({zoom:4,x:1350,y:-900});
 });
 it('zooms around the pointer instead of moving its map coordinate',()=>{
  const c={zoom:2,x:20,y:-30},cursor={x:50,y:80},next=zoomCamera(c,3,cursor,900,600,1.5);
  expect((cursor.x-next.x)/next.zoom).toBe((cursor.x-c.x)/c.zoom);
  expect((cursor.y-next.y)/next.zoom).toBe((cursor.y-c.y)/c.zoom);
 });
});
