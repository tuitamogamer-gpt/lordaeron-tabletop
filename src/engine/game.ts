import { ABILITIES, ENEMIES, HEROES, ITEMS, QUESTS, REGIONS, heroDefinition, regionById } from '../data/content';
import type { Battle, Command, DiceColor, Effect, Faction, GameState, Hero, Pool } from './types';

export class RuleError extends Error {}
const check: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new RuleError(message); };
export const maxHealth = (hero: Hero) => heroDefinition(hero.id).health + (hero.level - 1) * 2;
export const maxEnergy = (hero: Hero) => heroDefinition(hero.id).energy + hero.level - 1;
export const factionName = (faction: Faction) => faction === 'horde' ? 'Horda' : 'Alijansa';
export const xpForLevel = (level: number) => (level - 1) * 2;
export const getHero = (s: GameState, id: string) => { const h = s.heroes.find(h => h.id === id); check(h, 'Junak nije u ovoj partiji.'); return h; };
const log = (s: GameState, text: string, kind: GameState['log'][number]['kind'] = 'system') => { s.log.push({id:(s.log.at(-1)?.id ?? 0) + 1,turn:s.turn,text,kind}); s.log = s.log.slice(-150); };
export const independentAt = (s: GameState, location: string) => s.enemies.filter(e => e.region === location && e.kind === 'independent' && e.count > 0);
export const restBudget = (hero: Hero) => hero.level * (regionById(hero.location).town === heroDefinition(hero.id).faction ? 3 : 2);
export function createGame(seed = 2005, roster = ['grom','lyra','karn','aldric','brann','elyra']): GameState {
  check(Number.isSafeInteger(seed) && seed > 0 && seed <= 0xffffffff, 'Neispravan seed.');
  check(roster.length >= 2 && roster.length <= 6 && new Set(roster).size === roster.length, 'Odaberi 2–6 različitih junaka.');
  const factions = roster.map(id => heroDefinition(id).faction);
  check(factions.includes('horde') && factions.includes('alliance'), 'Obje frakcije moraju imati junaka.');
  check(factions.filter(f => f === 'horde').length <= 3 && factions.filter(f => f === 'alliance').length <= 3, 'Najviše tri junaka po frakciji.');
  return {version:1,mode:'lordaeron-prototype',seed,turn:1,faction:'horde',status:'playing',heroes:roster.map(id => { const d = heroDefinition(id); return {id,location:d.faction==='horde'?'brill':'southshore',health:d.health,energy:d.energy,level:1,xp:0,gold:5,actions:2,learned:ABILITIES.filter(a=>a.classId===d.classId && a.price===0).map(a=>a.id),equipment:[]}; }),enemies:structuredClone(ENEMIES),quests:structuredClone(QUESTS),completedQuests:[],battle:null,event:{title:'Sjene nad Lordaeronom',description:'Dvije frakcije. Jedna prijetnja. Okupi družinu i porazi Kel’Thuzada prije kraja 30. poteza.'},log:[{id:1,turn:1,kind:'system',text:'Ekspedicija počinje. Horda je prva na potezu.'}]};
}

export function reachable(s: GameState, hero: Hero): Record<string, string[]> {
  if (s.status !== 'playing' || s.battle || hero.actions <= 0 || heroDefinition(hero.id).faction !== s.faction || independentAt(s,hero.location).length) return {};
  const faction = heroDefinition(hero.id).faction;
  const paths: Record<string,string[]> = {};
  const queue = [{id:hero.location,path:[] as string[]}];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.path.length >= 2 || (current.path.length > 0 && independentAt(s,current.id).length)) continue;
    const region = regionById(current.id);
    const neighbors = [...region.neighbors, ...(region.flight === faction ? REGIONS.filter(r=>r.flight===faction).map(r=>r.id) : [])];
    for (const next of new Set(neighbors)) {
      if (next === hero.location || paths[next] || (next==='brill' && faction==='alliance') || (next==='southshore' && faction==='horde')) continue;
      paths[next] = [...current.path,next]; queue.push({id:next,path:paths[next]});
    }
  }
  return paths;
}

function actionable(s: GameState,id: string,challenge = false) {
  check(!s.battle, 'Prvo dovrši trenutnu borbu.');
  const h = getHero(s,id);
  check(heroDefinition(id).faction===s.faction, 'Ova frakcija trenutno nije na potezu.');
  check(h.actions>0, 'Junak je iskoristio obje akcije.');
  check(challenge || !independentAt(s,h.location).length,'Nezavisno čudovište blokira ovu lokaciju. Prvo ga izazovi.');
  return h;
}
function die(s: GameState) { let x = s.seed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; s.seed = x >>> 0; return Math.floor((s.seed / 0x100000000) * 8) + 1; }
export function combatStats(hero: Hero, powers: string[] = []) {
  const d = heroDefinition(hero.id);
  const pool: Pool = {...d.pool};
  pool[d.pool.blue > d.pool.red ? 'blue' : 'red'] += Math.floor((hero.level - 1) / 2);
  const stats = {pool,armor:0,attrition:0,reroll:0,heal:0};
  const effects: Effect[] = [...hero.equipment.flatMap(id=>ITEMS.find(i=>i.id===id)?.effects??[]), ...powers.flatMap(id=>ABILITIES.find(a=>a.id===id)?.effects??[])];
  for (const effect of effects) { if(effect.op==='dice') stats.pool[effect.color] += effect.amount; else stats[effect.op] += effect.amount; }
  (Object.keys(stats.pool) as DiceColor[]).forEach(color=>stats.pool[color]=Math.min(7,stats.pool[color]));
  return stats;
}
function battleAt(s: GameState, stage?: Battle['stage']) { const b = s.battle; check(b, 'Nema aktivne borbe.'); check(!b.outcome,'Borba je već završena.'); check(!stage || b.stage===stage, 'Ta akcija nije dozvoljena u ovoj fazi borbe.'); return b; }
function defeat(s: GameState, h: Hero) { h.location=heroDefinition(h.id).faction==='horde'?'brill':'southshore'; h.gold=Math.max(0,h.gold-1); h.health=maxHealth(h); h.energy=maxEnergy(h); h.actions=0; log(s,`${heroDefinition(h.id).name} je poražen i vraćen kući. Izgubljeno je 1 zlato.`, 'combat'); }
function victory(s: GameState, b: Battle) {
  const enemy = s.enemies.find(e=>e.id===b.enemyId)!;
  enemy.count=0; b.outcome='victory';
  const quest = s.quests.find(q=>q.enemyId===enemy.id && q.faction===s.faction);
  if (quest && !s.completedQuests.includes(quest.id)) s.completedQuests.push(quest.id);
  const survivors = b.participants.map(id=>getHero(s,id)).filter(h=>h.health>0);
  for (const h of survivors) {
    h.xp += enemy.xp; h.gold += enemy.gold;
    const nextLevel = Math.min(5,1+Math.floor(h.xp/2));
    if (nextLevel>h.level) { h.level=nextLevel; h.health=maxHealth(h); h.energy=maxEnergy(h); log(s,`${heroDefinition(h.id).name} dostiže nivo ${h.level}.`, 'reward'); }
  }
  b.report.push(`Pobjeda! ${enemy.xp ? `Svaki preživjeli dobiva ${enemy.xp} XP i ${enemy.gold} zlata.` : 'Put je sada slobodan.'}`);
  log(s,`${enemy.name} je poražen. ${quest ? `Zadatak „${quest.name}” je završen.` : ''}`,'reward');
  if (enemy.kind==='boss') { s.status='victory'; s.winner=s.faction; log(s,`${factionName(s.faction)} je porazila Kel’Thuzada!`,'reward'); }
}

/** Pure command reducer: failed commands never mutate the supplied state. */
export function applyCommand(state: GameState, command: Command): GameState {
  check(state.status==='playing' || command.type==='closeBattle','Ova kampanja je završena.');
  const s = structuredClone(state);
  switch (command.type) {
    case 'travel': {
      const h=actionable(s,command.heroId); const path=reachable(s,h)[command.destination];
      check(path,'Lokacija nije dostupna u jednoj akciji putovanja.'); h.location=command.destination; h.actions--;
      log(s,`${heroDefinition(h.id).name} putuje: ${path.map(p=>regionById(p).name).join(' → ')}.`,'move'); break;
    }
    case 'rest': {
      const h=actionable(s,command.heroId); const budget=restBudget(h);
      check(Number.isInteger(command.health) && command.health>=0 && command.health<=budget,'Neispravna raspodjela odmora.');
      const hp=Math.min(maxHealth(h)-h.health,command.health); const energy=Math.min(maxEnergy(h)-h.energy,budget-hp);
      check(hp+energy>0,'Zdravlje i energija su već puni.'); h.health+=hp; h.energy+=energy; h.actions--;
      log(s,`${heroDefinition(h.id).name} odmara: +${hp} zdravlja, +${energy} energije.`); break;
    }
    case 'train': {
      const h=actionable(s,command.heroId); check(command.abilityIds.length>0 && new Set(command.abilityIds).size===command.abilityIds.length,'Odaberi različite sposobnosti.');
      const powers=command.abilityIds.map(id=>{const a=ABILITIES.find(a=>a.id===id); check(a && a.classId===heroDefinition(h.id).classId && a.level<=h.level && !h.learned.includes(id),'Ta sposobnost trenutno nije dostupna.');return a;});
      const price=powers.reduce((n,a)=>n+a.price,0); check(h.gold>=price,'Nema dovoljno zlata.'); h.gold-=price; h.learned.push(...command.abilityIds); h.actions--;
      log(s,`${heroDefinition(h.id).name} uči ${powers.map(a=>a.name).join(', ')}.`,'reward'); break;
    }
    case 'town': {
      const h=actionable(s,command.heroId); check(regionById(h.location).town===s.faction,'Posjeti prijateljski grad.');
      if(command.itemId) {const item=ITEMS.find(i=>i.id===command.itemId);check(item && item.level<=h.level,'Predmet nije dostupan na ovom nivou.');check(!h.equipment.includes(item.id),'Već imaš ovaj predmet.');check(h.gold>=item.price,'Nema dovoljno zlata.');h.gold-=item.price;h.equipment=h.equipment.filter(id=>ITEMS.find(i=>i.id===id)?.slot!==item.slot);h.equipment.push(item.id);log(s,`${heroDefinition(h.id).name} kupuje ${item.name}.`,'reward');}
      const heal=Math.min(maxHealth(h)-h.health,h.level);h.health+=heal;h.energy=Math.min(maxEnergy(h),h.energy+h.level-heal);h.actions--;break;
    }
    case 'challenge': {
      const h=actionable(s,command.heroId,true); const enemy=s.enemies.find(e=>e.id===command.enemyId && e.count>0 && e.region===h.location);
      check(enemy,'Na ovoj lokaciji nema tog protivnika.');check(!enemy.faction || enemy.faction===s.faction,'Taj protivnik pripada zadatku druge frakcije.');check(enemy.kind==='independent' || !independentAt(s,h.location).length,'Prvo porazi nezavisna čudovišta.');
      const ids=[h.id,...(command.allies??[])];check(new Set(ids).size===ids.length,'Junak može učestvovati samo jednom.');
      for(const id of ids){const ally=actionable(s,id,true);check(ally.location===h.location,'Saveznici moraju biti na istoj lokaciji.');}
      ids.forEach(id=>getHero(s,id).actions--);
      s.battle={enemyId:enemy.id,participants:ids,round:1,stage:'prepare',dice:[],remaining:enemy.count,damage:0,melee:0,armor:0,attrition:0,rerolls:{},used:{},report:[]};
      log(s,`${ids.map(id=>heroDefinition(id).name.split(' ')[0]).join(', ')} izazivaju ${enemy.name}.`,'combat');break;
    }
    case 'roll': {
      const b=battleAt(s,'prepare');b.report=[];b.dice=[];b.armor=0;b.melee=0;b.attrition=0;b.used={};b.rerolls={};
      check(Object.keys(command.powers).every(id=>b.participants.includes(id)),'Sposobnost pripada junaku izvan borbe.');
      for(const id of b.participants){ const h=getHero(s,id); if(h.health<=0)continue; const powers=command.powers[id]??[];check(new Set(powers).size===powers.length,'Ista sposobnost se ne može koristiti dvaput u rundi.');
        const cards=powers.map(pid=>{const a=ABILITIES.find(a=>a.id===pid);check(a && h.learned.includes(pid) && a.classId===heroDefinition(id).classId && a.level<=h.level,'Sposobnost nije naučena.');return a;});const cost=cards.reduce((n,a)=>n+a.cost,0);check(h.energy>=cost,'Nema dovoljno energije.');h.energy-=cost;
        const stats=combatStats(h,powers);h.health=Math.min(maxHealth(h),h.health+stats.heal);b.armor+=stats.armor;b.attrition+=stats.attrition;b.rerolls[id]=stats.reroll;b.used[id]=powers;
        for(const color of ['red','blue','green'] as const) for(let i=0;i<stats.pool[color];i++) b.dice.push({id:b.dice.length,color,value:die(s),heroId:id,rerolled:false});
      }
      b.stage='rolled';log(s,`Borba, runda ${b.round}: bačeno je ${b.dice.length} kockica.`,'combat');break;
    }
    case 'reroll': {
      const b=battleAt(s,'rolled');check(command.dieIds.length>0 && new Set(command.dieIds).size===command.dieIds.length,'Odaberi različite kockice.');const counts: Record<string,number>={};
      const selected=command.dieIds.map(id=>{const d=b.dice.find(d=>d.id===id);check(d && !d.rerolled,'Kockica je već ponovno bačena.');counts[d.heroId]=(counts[d.heroId]??0)+1;return d;});
      for(const [id,count] of Object.entries(counts))check((b.rerolls[id]??0)>=count,'Nema dovoljno ponovnih bacanja za tog junaka.');
      selected.forEach(d=>{d.value=die(s);d.rerolled=true;b.rerolls[d.heroId]--;});break;
    }
    case 'resolve': {
      const b=battleAt(s,'rolled');const enemy=s.enemies.find(e=>e.id===b.enemyId)!;
      for(const d of b.dice.filter(d=>d.value>=enemy.threat)){if(d.color==='blue')b.damage++;else if(d.color==='red')b.melee++;else b.armor++;}
      const rangedKills=Math.min(b.remaining,Math.floor(b.damage/enemy.health));b.remaining-=rangedKills;b.damage-=rangedKills*enemy.health;
      b.report.push(`Daljinski udar: ${rangedKills} poraženih. Preostala šteta: ${b.damage}.`);
      if(b.remaining===0){victory(s,b);b.stage='resolved';break;}
      let wounds=Math.max(0,b.remaining*enemy.attack-b.melee-b.armor);b.report.push(`Odbrana: ${b.melee+b.armor}. Protivnički udar: ${b.remaining*enemy.attack}. Primljena šteta: ${wounds}.`);
      // Prototype policy: spread wounds among the healthiest survivors, stable roster tie-break.
      while(wounds>0){const alive=b.participants.map(id=>getHero(s,id)).filter(h=>h.health>0).sort((a,c)=>c.health-a.health);if(!alive.length)break;alive[0].health--;wounds--;}
      const alive=b.participants.filter(id=>getHero(s,id).health>0);
      if(!alive.length){b.outcome='defeat';enemy.count=b.remaining;b.report.push('Družina je poražena. Junaci se vraćaju kući.');b.participants.forEach(id=>defeat(s,getHero(s,id)));}
      else {b.damage+=b.melee+b.attrition;const kills=Math.min(b.remaining,Math.floor(b.damage/enemy.health));b.remaining-=kills;b.damage-=kills*enemy.health;b.report.push(`Bliska borba i iscrpljivanje: još ${kills} poraženih.`);if(b.remaining===0)victory(s,b);}
      b.stage='resolved';log(s,b.report.join(' '),'combat');break;
    }
    case 'nextRound': {const b=battleAt(s,'resolved');b.stage='prepare';b.round++;b.dice=[];b.used={};break;}
    case 'flee': {const b=battleAt(s,'prepare');b.outcome='fled';s.enemies.find(e=>e.id===b.enemyId)!.count=b.remaining;b.participants.forEach(id=>defeat(s,getHero(s,id)));b.report=['Povlačenje: povratak kući uz gubitak 1 zlata.'];break;}
    case 'closeBattle': {check(s.battle?.outcome,'Borba još traje.');if(s.battle.outcome==='victory') s.battle.participants.map(id=>getHero(s,id)).filter(h=>h.health<=0).forEach(h=>defeat(s,h));s.battle=null;break;}
    case 'endTurn': {
      check(!s.battle,'Prvo dovrši borbu.');s.heroes.filter(h=>heroDefinition(h.id).faction===s.faction).forEach(h=>h.actions=0);
      if(s.turn===30){s.status='expired';s.event={title:'Tama je nadvladala',description:'Vrijeme ekspedicije je isteklo. U ovoj varijanti potrebno je poraziti Kel’Thuzada u 30 poteza.'};log(s,'Kraj 30. poteza: ekspedicija nije uspjela.','event');break;}
      s.turn++;s.faction=s.faction==='horde'?'alliance':'horde';s.heroes.filter(h=>heroDefinition(h.id).faction===s.faction).forEach(h=>h.actions=2);
      if(s.turn%5===0){const e=s.enemies.find(e=>e.id==='spider')!;e.count=Math.min(3,e.count+1);s.event={title:'Širenje kuge',description:'Na lokaciji The Bulwark pojavljuje se još jedan Plaguewood Spider.'};log(s,s.event.description,'event');}
      else if(s.turn%3===0){s.heroes.forEach(h=>h.gold++);s.event={title:'Zalihe s juga',description:'Trgovci su stigli. Svaki junak dobiva 1 zlato.'};log(s,s.event.description,'event');}
      else s.event={title:'Put se nastavlja',description:`${factionName(s.faction)} preuzima inicijativu. Svaki junak ima dvije akcije.`};
      log(s,`${factionName(s.faction)} je na potezu.`);break;
    }
    default: throw new RuleError('Nepoznata naredba.');
  }
  return s;
}

export interface SavedSession { format: 'lordaeron-save'; version: 1; seed: number; roster: string[]; commands: Command[]; }
export function parseSession(raw: string): {session: SavedSession; state: GameState} {
  check(raw.length<2_000_000,'Fajl je prevelik.');const input: unknown=JSON.parse(raw);check(input && typeof input==='object','Neispravan format partije.');const x=input as SavedSession;
  check(x.format==='lordaeron-save' && x.version===1 && Array.isArray(x.roster) && x.roster.every(id=>typeof id==='string' && HEROES.some(h=>h.id===id)) && Array.isArray(x.commands) && x.commands.length<=10000,'Ovaj fajl nije podržana sačuvana partija.');
  let state=createGame(x.seed,x.roster);
  // Replay through the same guards. Imported arbitrary state is never trusted.
  for(const c of x.commands){check(c && typeof c==='object' && typeof c.type==='string','Neispravna naredba u partiji.');state=applyCommand(state,c);}
  return {session:{format:x.format,version:1,seed:x.seed,roster:x.roster,commands:x.commands},state};
}
