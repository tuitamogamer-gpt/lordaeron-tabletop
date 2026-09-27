import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { decide } from '../src/ai/planner';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import { importSession, newSession } from '../src/rules/session';
import { bagSize } from '../src/rules/inventory';
import type { Command } from '../src/rules/model';
import { isDeepStrictEqual } from 'node:util';
const seed=Number(process.argv[2]??2005),overlord=process.argv[3]??DEFAULT_SETUP.overlord;
const roster=process.argv[4]==='casters'?['dongon-swiftblade','wennu-bloodsinger','leeam-sagewind','shailara-whitherblade','artumnis-moondream','brebo-bigshot']:DEFAULT_SETUP.roster;
const setup={...DEFAULT_SETUP,seed,overlord,roster};let s=createGame(p,setup);let count=0;const commands:Command[]=[];
const start=Date.now();
while(s.phase!=='finished'&&count<12000){
 const legal=legalActions(p,s),decision=decide(p,view(s),legal);
 if(!decision){process.stdout.write(JSON.stringify({stalled:true,phase:s.phase,stage:s.battle?.stage,turn:s.turn,heroes:s.heroes.map(h=>({id:h.id,actions:h.actions,talents:h.talentChoices})),reward:s.reward,respawns:s.respawns})+'\n');process.exitCode=1;break;}
 s=apply(p,s,decision.command);commands.push(decision.command);count++;
 for(const h of s.heroes)if([h.health,h.energy,h.gold,h.xp,h.actions].some(n=>!Number.isInteger(n)||n<0)||bagSize(p,h.bag)>3||h.slots.length>8)throw new Error(`Invalid resources: ${h.id} after ${JSON.stringify(decision.command)}`);
 if(count%250===0)process.stdout.write(JSON.stringify({commands:count,turn:s.turn,phase:s.phase,round:s.battle?.round})+'\n');
}
const replay=importSession(p,JSON.stringify({...newSession(p,setup),commands}));
if(!isDeepStrictEqual(JSON.parse(JSON.stringify(replay.state)),JSON.parse(JSON.stringify(s))))throw new Error('Replay diverged');
process.stdout.write(JSON.stringify({seed,overlord,roster:process.argv[4]??'default',commands:count,quests:s.completed.length,levels:s.heroes.map(h=>h.level),turn:s.turn,winner:s.winner,phase:s.phase,replay:true,seconds:(Date.now()-start)/1000})+'\n');

if(s.phase!=='finished')process.exitCode=1;
