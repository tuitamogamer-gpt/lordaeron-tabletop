import { DEVELOPMENT_PACK as p, DEFAULT_SETUP } from '../src/data/development-pack';
import { decide } from '../src/ai/planner';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
const seed=Number(process.argv[2]??2005);let s=createGame(p,{...DEFAULT_SETUP,seed});let count=0;
const start=Date.now();
while(s.phase!=='finished'&&count<12000){
 const legal=legalActions(p,s),decision=decide(p,view(s),legal);
 if(!decision){process.stdout.write(JSON.stringify({stalled:true,phase:s.phase,stage:s.battle?.stage,turn:s.turn,heroes:s.heroes.map(h=>({id:h.id,actions:h.actions,talents:h.talentChoices})),reward:s.reward,respawns:s.respawns})+'\n');process.exitCode=1;break;}
 s=apply(p,s,decision.command);count++;
 if(count%250===0)process.stdout.write(JSON.stringify({commands:count,turn:s.turn,phase:s.phase,round:s.battle?.round})+'\n');
}
process.stdout.write(JSON.stringify({seed,commands:count,turn:s.turn,winner:s.winner,phase:s.phase,seconds:(Date.now()-start)/1000})+'\n');

if(s.phase!=='finished')process.exitCode=1;
