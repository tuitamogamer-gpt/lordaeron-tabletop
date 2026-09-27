import { assert, capacity, card, character, colors, emptyBoxes, faction, hero, integer, other, random } from './common.js';
import { defeat } from './combat.js';
import { bagSize, equipped, petCapacity, unequip } from './inventory.js';
import type { AbilityArgs, Condition, ContentPack, DiceFilter, Die, Effect, Hero, State, Timing } from './model.js';
export const matches = (die: Die, filter: DiceFilter) => !die.removed && (!filter.colors || filter.colors.includes(die.color)) && (!filter.values || filter.values.includes(die.value)) && (filter.min === undefined || die.value >= filter.min);
export function availableCards(p: ContentPack, h: Hero) {
 return [...new Set([...equipped(p, h), ...h.talents, ...h.auctionItems, ...h.bag.filter(id => card(p, id).type === 'bag'), ...[character(p, h.id).racial].filter((id): id is string => !!id)])];
}
export const opponents=(p:ContentPack,s:State,h:Hero)=>s.battle?.kind==='pve'?(s.battle.boss?1:s.battle.enemies.length):(s.battle?.participants.filter(id=>!s.battle!.defeated.includes(id)&&faction(p,id)!==faction(p,h.id)).length??0);
export const immune=(p:ContentPack,h:Hero,rule:string)=>availableCards(p,h).some(id=>card(p,id).immune?.some(v=>v===rule));
export function spendEnergy(s:State,h:Hero,amount:number){
 assert(h.energy>=amount,'Nema dovoljno energije.');h.energy-=amount;
 if(amount>0)s.energySpent=[...new Set([...(s.energySpent??[]),h.id])];
}
export function timing(s: State): Timing | undefined {
 const stage = s.battle?.stage;
 if (s.respawns.length) return 'wound';
 if (stage==='attacker')return 'round-start';
 if (stage === 'wounds') return 'wound';
 if (stage === 'pool' || stage === 'after-pool' || stage === 'reroll' || stage === 'after-reroll' || stage === 'after-tokens' || stage === 'tokens' || stage === 'defense' || stage === 'round-end') return stage;
 if (s.phase === 'actions') return 'action';
 return undefined;
}
export function condition(p: ContentPack, s: State, h: Hero, id: string, test: Condition): boolean {
 const b = s.battle, a = b?.active;
 switch (test.kind) {
  case 'previous-use': return !!b?.previous[h.id]?.cards.includes(test.cardId ?? id) && (!test.unharmed || !b.previous[h.id].harmed);
  case 'equipped': return equipped(p, h).includes(test.cardId);
  case 'dice': return (a?.dice.filter(d => matches(d, test.filter)).length ?? 0) >= test.atLeast;
  case 'no-color': return !a?.dice.some(d => !d.removed && d.color === test.color);
  case 'opponents':return opponents(p,s,h)>=test.min;
  case 'pvp': return !!b && b.kind !== 'pve';
  case 'reroll-at-least':return !!a&&a.reroll>=test.amount;
  case 'owned':return availableCards(p,h).includes(test.cardId);
  case 'used': return !!b?.current[h.id]?.cards.includes(test.cardId);
  case 'used-any': return test.cards.some(id=>b?.current[h.id]?.cards.includes(id));
  case 'first-round': return b?.round===1;
  case 'opponent-defeated': return !!b && !b.defeated.includes(h.id) && (b.report.some(v=>v.startsWith('killed:'))||b.defeated.some(id=>faction(p,id)!==faction(p,h.id)));
  case 'trait': return equipped(p,h).some(id=>test.traits.includes(card(p,id).trait??''));
  case 'has-damage': return !!b?.losses?.[h.id] && b.losses[h.id].amount>b.losses[h.id].prevented;
  case 'round': return !!b&&b.round>=test.min;
  case 'strong-enemy': return !!b&&(b.kind!=='pve'||!!b.boss||s.enemies.some(e=>b.enemies.includes(e.id)&&e.color==='red'));
 }
}
export function healthLoss(s: State, h: Hero, amount: number) {
 if (amount > 0 && s.battle) {
  const b=s.battle;b.current[h.id] ??= { cards: [], harmed: false };b.losses??={};
  b.losses[h.id]??={before:h.health,amount:0,prevented:0,harmedBefore:b.current[h.id].harmed,defense:['defense','wounds'].includes(b.stage)};
  if(['defense','wounds'].includes(b.stage)){b.defenseLosses??={};b.defenseLosses[h.id]=(b.defenseLosses[h.id]??0)+Math.min(h.health,amount);}
  b.damageTaken??={};b.damageTaken[h.id]=(b.damageTaken[h.id]??0)+Math.min(h.health,amount);b.losses[h.id].amount+=amount;b.current[h.id].harmed=true;
 }
 h.health = Math.max(0, h.health - amount);
 if (h.health === 0 && !s.respawns.includes(h.id)) s.respawns.push(h.id);
}
export function effects(p: ContentPack, s: State, h: Hero, id: string, list: Effect[], args: AbilityArgs) {
 const b = s.battle, a = b?.active;
 const select = (filter: DiceFilter, count: number,repeat=false) => {
  assert(a && args.dice && args.dice.length === count && (repeat||new Set(args.dice).size === count), 'Odaberi tačan broj kockica.');
  const dice = args.dice.map(id => a.dice.find(d => d.id === id));
  assert(dice.every((d): d is Die => !!d && matches(d, filter)), 'Kockice ne odgovaraju efektu.'); return dice;
 };
 const target = (kind?: 'self' | 'friendly' | 'pet') => {
  if (!kind || kind === 'self') return h;
  assert(kind !== 'pet', 'Za ljubimca koristi njegov poseban efekt.');
  const t = hero(s, args.target ?? h.id);
  assert(b && b.participants.includes(t.id) && !b.defeated.includes(t.id) && faction(p, t.id) === faction(p, h.id), 'Cilj mora biti prijateljski učesnik borbe.'); return t;
 };
 for (const e of list) {
  switch (e.op) {
   case 'dice': {
    assert(a && a.heroId === h.id && b, 'Kockice se dodaju samo aktivnom junaku.');
    if(b.stage==='after-pool'&&a.poolLimits?.[e.color]!==undefined)assert(a.dice.filter(d=>!d.removed&&d.color===e.color).length+e.amount<=a.poolLimits[e.color]!, 'Moć ograničava ovu boju u Dice Pool koraku.');
    const available = 7 - b.lostDice[e.color] - a.removed[e.color] - a.dice.filter(d => !d.removed && d.color === e.color).length;
    for (let i = 0; i < Math.min(e.amount, available); i++) a.dice.push({ source:id,id: Math.max(-1, ...a.dice.map(d => d.id)) + 1, color: e.color, value: b.stage === 'pool' ? 0 : random(s, 8) + 1, rerolled: false, spotted: false, removed: false });
    a.pool[e.color] += e.amount; break;
   }
   case 'resource': {
    const t = target(e.target);
    if (e.resource === 'gold') t.gold = Math.max(0, t.gold + e.amount);
    else if (e.resource === 'health' && e.amount < 0) {assert(t.health>=-e.amount,'Nema dovoljno zdravlja za ovaj trošak.');healthLoss(s, t, -e.amount);}
    else if (e.amount < 0) spendEnergy(s,t,-e.amount);
    else { const limit = capacity(p, t)[e.resource]; t[e.resource] = e.gain ? t[e.resource] + e.amount : Math.max(t[e.resource], Math.min(limit, t[e.resource] + e.amount)); if (t.health > 0) s.respawns = s.respawns.filter(id => id !== t.id); }
    break;
   }
   case 'stat': assert(a && a.heroId === h.id, 'Nema aktivnog napada.'); a[e.stat] += e.amount; break;
   case 'token': {
    assert(b, 'Nema borbe.'); const enemy = s.enemies.find(v => v.id === b.enemies[0]), rule = p.creatures.find(v => v.id === enemy?.creature)?.rule;
    if (immune(p,h,rule??'none')||(!(e.box === 'attrition' && (rule === 'spider' || rule === 'wraith')) && !(e.box === 'armor' && rule === 'drake'))) {
     let amount=e.amount;
     if(b.boss==='nefarian'&&a&&['tokens','after-tokens'].includes(b.stage)&&['damage','defense'].includes(e.box)&&amount>0){const cap=a.dice.filter(d=>matches(d,{colors:['red','blue'],values:[8]})).length,used=(a.placed?.damage??0)+(a.placed?.defense??0);amount=Math.min(amount,Math.max(0,cap-used));b.boxes[faction(p,h.id)].attrition+=e.amount-amount;}
     b.boxes[faction(p, h.id)][e.box] += amount;
     if(a?.heroId===h.id&&['tokens','after-tokens'].includes(b.stage)){a.placed??=emptyBoxes();a.placed[e.box]+=amount;}
    }
    break;
   }
   case 'condition': { const t = target(e.target); t[e.condition] = Math.max(0, t[e.condition] + e.amount); break; }
   case 'if': effects(p, s, h, id, condition(p, s, h, id, e.condition) ? e.then : e.otherwise ?? [], args); break;
   case 'spot': {
    const override=availableCards(p,h).map(c=>card(p,c).spotOverride).find(v=>v?.cards.includes(id));
    const dice = select(override?{...e.filter,min:override.min}:e.filter, e.count); assert(dice.every(d => !d.spotted), 'Kockica je već iskorištena za Spot.'); dice.forEach(d => d.spotted = true); effects(p, s, h, id, e.effects, args); break;
   }
   case 'remove': {
    assert(a, 'Nema aktivnog napada.'); const dice = select(e.filter, e.count); assert(dice.every(d => !d.spotted), 'Spotted kockica ne može se dobrovoljno ukloniti.');
    dice.forEach(d => { d.removed = true; a.removed[d.color]++; }); effects(p, s, h, id, e.effects, args); break;
   }
   case 'change': {
    assert(a && b, 'Nema aktivnog napada.');
    for (const d of select(e.filter, e.count,e.repeat)) {
     const color = e.color ?? d.color; assert(colors.includes(color), 'Nepoznata boja.');
     if (color !== d.color) assert(a.dice.filter(x => !x.removed && x.color === color).length < 7 - a.removed[color] - b.lostDice[color], 'Nema slobodne kockice nove boje.');
     d.color = color; if(e.value!==undefined)d.value = e.value;else if(e.delta!==undefined)d.value=Math.max(1,Math.min(8,d.value+e.delta));
    } break;
   }
   case 'discard-self': {
    const i = h.bag.indexOf(id); if (i >= 0) h.bag.splice(i, 1); else { unequip(p, h, id); const j = h.bag.indexOf(id); if (j >= 0) h.bag.splice(j, 1); } break;
   }
   case 'heal-pet': {
    assert(args.target && Object.hasOwn(h.pets, args.target), 'Odaberi svog opremljenog ljubimca.');
    h.pets[args.target] = Math.min(petCapacity(p,h,args.target), h.pets[args.target] + e.amount); break;
   }
   case 'judgement': {
    const seal=equipped(p,h).map(id=>card(p,id)).find(c=>c.unique==='Seal');
    assert(seal&&b&&a?.heroId===h.id,'Opremi Seal prije korištenja Judgementa.');
    const judgement=seal.abilities.find(v=>v.judgement);assert(judgement,'Seal nema Judgement efekat.');
    const key=`${seal.id}:${judgement.id}`;assert(!b.current[h.id].cards.includes(key),'Judgement je već iskorišten.');
    effects(p,s,h,seal.id,judgement.effects,args);b.current[h.id].cards.push(key);break;
   }
   case 'prevent': {
    const loss=b?.losses?.[h.id];assert(b&&loss&&loss.amount>loss.prevented,'Nema gubitka zdravlja koji se može spriječiti.');
    const before=Math.max(0,loss.before-loss.amount+loss.prevented);
    loss.prevented+=Math.min(e.amount,loss.amount-loss.prevented);
    const restored=Math.max(0,loss.before-loss.amount+loss.prevented)-before;
    h.health+=restored;if(b.damageTaken)b.damageTaken[h.id]=Math.max(0,(b.damageTaken[h.id]??0)-restored);
    if(loss.defense&&b.defenseLosses)b.defenseLosses[h.id]=Math.max(0,(b.defenseLosses[h.id]??0)-restored);
    if(loss.prevented===loss.amount)b.current[h.id].harmed=loss.harmedBefore;
    if(h.health>0)s.respawns=s.respawns.filter(id=>id!==h.id);break;
   }
   case 'restrict': {
    assert(a,'Nema aktivnog napada.');a.forbidden??={};
    if(e.scope==='reroll')assert(!a.dice.some(d=>d.rerolled&&e.colors.includes(d.color)),'Već si ponovio kockicu zabranjene boje.');
    else {a.poolLimits??={};for(const color of e.colors){a.poolLimits[color]=e.limit??0;const excess=a.dice.filter(d=>d.color===color).slice(e.limit??0).map(d=>d.id);a.dice=a.dice.filter(d=>!excess.includes(d.id));}}
    if(!e.limit)a.forbidden[e.scope]=[...new Set([...(a.forbidden[e.scope]??[]),...e.colors])];break;
   }
   case 'reroll-all': assert(a,'Nema aktivnog napada.');if(b?.stage==='reroll')a.rerollStarted=true;for(const d of a.dice.filter(d=>!d.removed))d.value=random(s,8)+1;break;
   case 'unequip-self': {
    if(b&&availableCards(p,h).some(c=>card(p,c).retainOnce?.includes(id))&&!b.once?.includes(`retain:${id}`)){b.once??=[];b.once.push(`retain:${id}`);break;}
    if(availableCards(p,h).some(c=>card(p,c).retainAfterUse?.includes(id)))break;
    unequip(p,h,id);
    if(bagSize(p,h.bag)>3){assert(args.discard&&h.bag.includes(args.discard)&&!card(p,args.discard).bagExempt,'Torba je puna. Odaberi predmet za trgovca.');h.bag.splice(h.bag.indexOf(args.discard),1);s.merchant.push(args.discard);}break;
   }
   case 'flag': assert(a&&a.heroId===h.id,'Nema aktivnog napada.');a.flags??={};a.flags[e.key]=e.amount;break;
   case 'damage-reserve': {
    assert(b,'Nema borbe.');const spent=e.scope==='defense'?(b.defenseSpent??={}):(b.damageSpent??={}),taken=e.scope==='defense'?b.defenseLosses:b.damageTaken,used=spent[h.id]??0;
    assert((taken?.[h.id]??0)-used>=e.amount,'Nema dovoljno sačuvanih tokena.');spent[h.id]=used+e.amount;break;
   }
   case 'damage-all': assert(b,'Nema borbe.');for(const id of b.participants.filter(id=>!b.defeated.includes(id)))healthLoss(s,hero(s,id),e.amount);break;
   case 'remove-all': {
    assert(a,'Nema aktivnog napada.');for(const d of a.dice.filter(d=>matches(d,e.filter))){d.removed=true;a.removed[d.color]++;}break;
   }
   case 'reroll-selected': {
    assert(a&&args.dice?.length&&args.dice.length<=(e.max==='level'?h.level:e.max),'Odaberi kockice za nezavisno ponovno bacanje.');
    if(b?.stage==='reroll')a.rerollStarted=true;for(const d of select(e.filter,args.dice.length))d.value=random(s,8)+1;break;
   }
   case 'unequip-choice': assert(args.target&&e.cards.includes(args.target)&&equipped(p,h).includes(args.target),'Odaberi opremljenu moć.');unequip(p,h,args.target);break;
   case 'defeat-independent': {
    assert(b&&args.target&&b.enemies.includes(args.target),'Odaberi nezavisno stvorenje u ovoj borbi.');
    const enemy=s.enemies.find(e=>e.id===args.target);assert(enemy?.color==='blue','Moć djeluje samo na nezavisno stvorenje.');
    (b.killed??=[]).push(structuredClone(enemy));s.enemies=s.enemies.filter(e=>e.id!==args.target);b.enemies=b.enemies.filter(id=>id!==args.target);b.report.push(`killed:${args.target}`);
    if(!b.enemies.length){b.winner=b.first;b.stage='over';}break;
   }
   case 'escape': {
    assert(b?.kind==='pve'&&a?.heroId===h.id,'Bijeg je moguć samo iz PvE borbe.');
    b.participants=b.participants.filter(id=>id!==h.id);b.report.push(`escaped:${h.id}`);delete b.active;
    if(!b.participants.some(id=>!b.defeated.includes(id))){b.winner=other(b.first);b.stage='over';}
    else b.stage=b.participants.some(id=>!b.defeated.includes(id)&&!b.acted.includes(id))?'attacker':'defense';break;
   }
   case 'preset': {
    assert(a&&b?.stage==='pool','Odabir vrijednosti ide prije bacanja.');
    const chosen=select({colors:[e.color]},e.values.length);assert(chosen.every(d=>!d.fixed),'Ove kockice već imaju zadate rezultate.');
    chosen.forEach((d,i)=>{d.fixed=true;d.value=e.values[i];});break;
   }
   case 'redirect-hits': {
    assert(a&&b?.stage==='tokens','Preusmjeravanje je dio postavljanja pogodaka.');
    for(const d of select({colors:[e.color],min:a.threat},e.count))d.hitBox=e.box;break;
   }
   case 'sacrifice-pet': {
    assert(args.target&&h.pets[args.target]>0,'Odaberi svog živog ljubimca.');
    effects(p,s,h,id,[{op:'token',box:e.box,amount:h.pets[args.target]*e.multiplier}],{});unequip(p,h,args.target);break;
   }
   case 'combo-add': {
    assert(b,'Nema borbe.');const finishers=equipped(p,h).filter(id=>card(p,id).finisher);if(!finishers.length)break;
    const bonus=availableCards(p,h).reduce((n,c)=>{const v=card(p,c).comboBonus;return n+(v?.card===id?v.amount:0);},0),amount=e.amount+bonus;
    const targets=args.targets??Array.from({length:amount},()=>args.target??finishers[0]);
    assert(targets.length===amount&&targets.every(id=>finishers.includes(id)),'Raspodijeli combo tokene na opremljene Finishing Move karte.');
    const multiplier=Math.max(1,...availableCards(p,h).map(id=>card(p,id).comboMultiplier??1));b.counters??={};
    for(const target of targets)b.counters[target]=(b.counters[target]??0)+multiplier;
    b.current[h.id]??={cards:[],harmed:false};if(!b.current[h.id].cards.includes('combo-added'))b.current[h.id].cards.push('combo-added');break;
   }
   case 'combo-spend': {
    assert(b&&(b.counters?.[id]??0)>=e.amount,'Nema dovoljno combo tokena na ovoj karti.');b.counters![id]-=e.amount;break;
   }
   case 'equip-power': {
    const at=e.slot??args.slot;assert(at!==undefined&&integer(at,0,h.slots.length-1),'Odaberi mjesto za moć.');
    const c=card(p,e.card),slot=h.slots[at],area=character(p,h.id).slots[at];
    assert(c.kind==='power'&&h.learned.includes(c.id)&&c.level<=h.level&&slot&&area.types.includes(c.type),'Moć nije naučena ili ne odgovara mjestu.');
    if(slot.card)unequip(p,h,slot.card);slot.card=c.id;
    if(bagSize(p,h.bag)>3){assert(args.discard&&h.bag.includes(args.discard)&&!card(p,args.discard).bagExempt,'Odaberi predmet za trgovca.');h.bag.splice(h.bag.indexOf(args.discard),1);s.merchant.push(args.discard);}break;
   }
   case 'group-resource': {
    assert(b,'Nema borbe.');for(const t of b.participants.filter(id=>!b.defeated.includes(id)&&faction(p,id)===faction(p,h.id)))effects(p,s,hero(s,t),id,[{op:'resource',resource:e.resource,amount:e.amount,gain:e.gain}],{});break;
   }
   case 'group-dice': assert(b,'Nema borbe.');effects(p,s,h,id,[{op:'dice',color:e.color,amount:e.amount*b.participants.filter(id=>!b.defeated.includes(id)&&faction(p,id)===faction(p,h.id)).length}],{});break;
   case 'creature-dice': {
    const enemy=s.enemies.find(e=>e.id===args.target);assert(b&&enemy&&b.enemies.includes(enemy.id),'Odaberi stvorenje iz ove borbe.');
    const stats=p.creatures.find(c=>c.id===enemy.creature)!.stats[enemy.color];effects(p,s,h,id,[{op:'dice',color:e.color,amount:Math.floor(stats.attack/e.divisor)}],{});break;
   }
   case 'active-effects': assert(a&&faction(p,a.heroId)===faction(p,h.id),'Nema prijateljskog napadača.');effects(p,s,hero(s,a.heroId),id,e.effects,args);break;
   case 'heal-reaction': {
    const t=target('friendly');assert(b?.losses?.[t.id],'Ovaj saveznik nije upravo izgubio zdravlje.');
    effects(p,s,t,id,[{op:'resource',resource:'health',amount:e.amount}],{});
    const splash=availableCards(p,h).map(c=>card(p,c).healSplash).find(v=>v?.cards.includes(id));
    if(splash&&args.secondaryTarget){assert(args.secondaryTarget!==t.id,'Dodatno liječenje bira drugog saveznika.');const extra=hero(s,args.secondaryTarget);assert(b.participants.includes(extra.id)&&!b.defeated.includes(extra.id)&&faction(p,extra.id)===faction(p,h.id),'Drugi cilj nije prijateljski učesnik.');effects(p,s,extra,id,[{op:'resource',resource:'health',amount:splash.amount}],{});}break;
   }
   case 'revive': {
    const targetId=e.self?h.id:args.target;assert(b&&targetId&&s.respawns.includes(targetId)&&(e.self||targetId!==h.id)&&faction(p,targetId)===faction(p,h.id),'Odaberi upravo poraženog saveznika.');
    const t=hero(s,targetId),amount=e.amount==='level'?h.level:e.amount,health=e.fixedHealth??args.health??amount;
    assert(!e.self||b.kind==='pve','Reincarnation nije dostupna u PvP borbi.');
    assert(integer(health,0,amount),'Raspodijeli oporavak uskrsnuća.');
    const location=t.location;defeat(p,s,t.id,location);const cap=capacity(p,t);t.health=Math.min(cap.health,1+health);t.energy=Math.min(cap.energy,1+amount-health);break;
   }
   case 'resource-level':effects(p,s,h,id,[{op:'resource',resource:e.resource,amount:h.level,gain:e.gain}],{});break;
   case 'clamp':h[e.resource]=Math.min(h[e.resource],capacity(p,h)[e.resource]);break;
   case 'remove-chosen': {
    assert(a&&args.removeDice?.length===e.count&&new Set(args.removeDice).size===e.count,'Odaberi kockice za uklanjanje.');
    for(const id of args.removeDice){const d=a.dice.find(d=>d.id===id);assert(d&&!d.removed&&!d.spotted,'Spotted kockica ne može se ukloniti.');d.removed=true;a.removed[d.color]++;}break;
   }
   case 'dice-choice': {
    const chosen=args.colors??Array.from({length:e.amount},()=>args.color??'red');assert(chosen.length===e.amount&&chosen.every(c=>colors.includes(c)),'Odaberi boju svake nove kockice.');
    for(const color of chosen)effects(p,s,h,id,[{op:'dice',color,amount:1}],{});break;
   }
   case 'opponent-tokens':effects(p,s,h,id,[{op:'token',box:e.box,amount:e.amount*opponents(p,s,h)}],{});break;
   case 'move-tokens': {
    assert(b&&b.boxes[faction(p,h.id)][e.from]>=e.amount,'Nema dovoljno pogodaka za premještanje.');
    b.boxes[faction(p,h.id)][e.from]-=e.amount;effects(p,s,h,id,[{op:'token',box:e.to,amount:e.amount}],{});break;
   }
   case 'equip-demon': {
    assert(!equipped(p,h).some(id=>card(p,id).trait==='Demon')&&args.target&&typeof args.slot==='number'&&integer(args.slot,0,h.slots.length-1),'Odaberi naučenog demona i mjesto za njega.');
    const c=card(p,args.target),slot=h.slots[args.slot!],area=character(p,h.id).slots[args.slot!];
    assert(c.trait==='Demon'&&h.learned.includes(c.id)&&c.level<=h.level&&area.types.includes('active'),'Demon nije dostupan u ovom mjestu.');
    if(slot.card){const old=card(p,slot.card);if(a&&b?.stage==='pool'){a.dice=a.dice.filter(d=>d.source!==old.id);for(const effect of old.abilities.filter(v=>v.automatic&&v.timing==='pool').flatMap(v=>v.effects))if(effect.op==='stat')a[effect.stat]-=effect.amount;}unequip(p,h,old.id);}
    slot.card=c.id;h.pets[c.id]=petCapacity(p,h,c.id);break;
   }
  }
 }
}
export function activate(p: ContentPack, s: State, heroId: string, cardId: string, abilityId: string, args: AbilityArgs = {}) {
 const h = hero(s, heroId), c = card(p, cardId), ability = c.abilities.find(a => a.id === abilityId), b = s.battle, a = b?.active;
 assert(availableCards(p, h).includes(cardId) && c.level <= h.level, 'Karta nije dostupna ovom junaku.');
 const friendlyReaction=ability?.reaction==='defeat'?s.respawns.some(id=>faction(p,id)===faction(p,h.id)):ability?.reaction==='friendly-damage'&&Object.keys(b?.losses??{}).some(id=>faction(p,id)===faction(p,h.id));
 const reaction=!!friendlyReaction||(ability?.timing==='energy-spent'?s.energySpent?.includes(heroId):ability?.timing==='wound'&&ability.condition?.kind==='has-damage'&&condition(p,s,h,cardId,ability.condition));
 assert(ability && (ability.timing === timing(s)||reaction), 'Sposobnost se ne koristi u ovoj fazi.');
 assert(!ability.startOnly||!a?.rerollStarted,'Ovu sposobnost koristi na početku Reroll koraka.');
 assert(!ability.automatic&&!ability.judgement,'Ova sposobnost se razrješava svojim okidačem.');
 assert(!ability.requires||!!b?.current[heroId]?.cards.includes(`${cardId}:${ability.requires}`),'Prvo aktiviraj primarnu sposobnost ove karte.');
 assert(!ability.condition||condition(p,s,h,cardId,ability.condition),'Uslov sposobnosti nije ispunjen.');
 if(!b){assert(reaction&&ability.timing==='energy-spent'&&c.type==='bag','Sposobnost zahtijeva borbu.');effects(p,s,h,cardId,ability.effects,args);return;}
 assert(b.participants.includes(heroId) && !b.defeated.includes(heroId), 'Junak nije aktivni učesnik borbe.');
 assert(['wound', 'energy-spent', 'defense', 'round-end','round-start'].includes(ability.timing) || a?.heroId === heroId || (!!ability.friendlyTiming&&!!a&&faction(p,a.heroId)===faction(p,heroId)), 'Drugi junak je trenutno aktivan.');
 b.current[heroId] ??= { cards: [], harmed: false };
 const useKey = `${cardId}:${abilityId}`;
 const groupKey=`${cardId}:group:${ability.usageGroup??abilityId}${ability.perAttacker?`:${a?.heroId}`:''}`;
 const repeats=c.type==='instant'?availableCards(p,h).map(id=>card(p,id).instantRepeat).find(Boolean):undefined;
 const extraRepeats=availableCards(p,h).map(id=>card(p,id).cardRepeat).find(v=>v?.card===cardId)?.uses??1;
 const uses=b.current[heroId].cards.filter(id=>id===groupKey).length;
 assert(uses<Math.max(repeats?.uses??1,extraRepeats),'Ovaj izbor sposobnosti je već iskorišten.');
 if(c.trait==='Scroll'||c.trait==='Potion')assert(!b.current[heroId].cards.includes(`limit:${c.trait}`),`Samo jedan ${c.trait} po borbenoj rundi.`);
 if (ability.requires) assert(b.current[heroId].cards.includes(`${cardId}:${ability.requires}`), 'Prvo aktiviraj primarnu sposobnost ove karte.');
 const paid = b.current[heroId].cards.includes(cardId);
 if(args.free){assert(c.type==='instant'&&availableCards(p,h).some(id=>card(p,id).freeInstantOnce)&&!b.once?.includes(`free:${h.id}`),'Besplatna moć nije dostupna.');b.once??=[];b.once.push(`free:${h.id}`);}
 const free=args.free||ability.freeIf&&condition(p,s,h,cardId,ability.freeIf);
 const discount=availableCards(p,h).reduce((n,id)=>{const d=card(p,id).discount;return n+(c.kind==='power'?(card(p,id).powerDiscount??0):0)+(d?.cards.includes(cardId)?d.amount:0)+(c.type==='instant'?(card(p,id).instantDiscount??0):0);},0);
 const cost = Math.max(0,(free?0:ability.cost ?? ((paid&&!uses) || c.type === 'active' || c.kind === 'talent' || c.kind === 'racial' ? 0 : c.energy))+(uses?(repeats?.surcharge??0):0)-discount);
 assert(integer(cost),'Nevažeći trošak.');spendEnergy(s,h,cost);
 effects(p, s, h, cardId, ability.effects, args);
 for(const id of availableCards(p,h))for(const v of card(p,id).enhance??[])if(v.card===cardId&&v.timing===ability.timing)effects(p,s,h,id,v.effects,args);
 b.current[heroId].cards.push(useKey); if (!paid) b.current[heroId].cards.push(cardId);
 b.current[heroId].cards.push(groupKey);if(c.trait==='Scroll'||c.trait==='Potion')b.current[heroId].cards.push(`limit:${c.trait}`);
 if (a?.heroId === heroId) { a.used.push(useKey); if (!a.paid.includes(cardId)) a.paid.push(cardId); }
}
/** Mandatory, choice-free hooks. Optional effects continue through the command reducer. */
export function automatic(p:ContentPack,s:State,id:string,when:Timing){
 const h=hero(s,id),b=s.battle;
 for(const cardId of availableCards(p,h))for(const ability of card(p,cardId).abilities){
  if(!ability.automatic||ability.timing!==when||ability.condition&&!condition(p,s,h,cardId,ability.condition)||ability.requires&&!b?.current[id]?.cards.includes(`${cardId}:${ability.requires}`))continue;
  const key=`${cardId}:${ability.id}`;
  if(b){b.current[id]??={cards:[],harmed:false};if(b.current[id].cards.includes(key)||b.defeated.includes(id))continue;}
  effects(p,s,h,cardId,ability.effects,{});
  if(b){b.current[id].cards.push(key);if(!b.current[id].cards.includes(cardId))b.current[id].cards.push(cardId);}
 }
}
export function settleAutomatic(p:ContentPack,s:State){
 if(s.phase==='actions'&&s.turnStarted!==s.turn){
  s.turnStarted=s.turn;
  for(const h of s.heroes.filter(h=>faction(p,h.id)===s.faction))automatic(p,s,h.id,'turn-start');
 }
 const b=s.battle;
 if(b?.stage==='attacker'&&!b.report.includes(`world-round:${b.round}`)){
  b.report.push(`world-round:${b.round}`);const boss=p.events.find(e=>e.id===b.boss)?.boss;
  if(boss?.combat==='boregore')b.boxes[b.first].damage=Math.max(0,b.boxes[b.first].damage-2);
  if(b.round===1&&b.boss==='kelthuzad'&&s.world?.some(e=>e.cleared&&p.events.find(c=>c.id===e.id)?.boss?.relic==='light-of-ages'&&e.tokens.some(id=>b.participants.includes(id))))b.boxes[b.first].damage+=4;
 }
 if(b?.stage==='round-end')for(const id of b.participants)automatic(p,s,id,'round-end');
 if(b?.stage==='attacker')for(const id of b.participants)automatic(p,s,id,'round-start');
 if(b?.active&&b.stage==='pool'){
  const id=b.active.heroId;b.current[id]??={cards:[],harmed:false};
  for(const owner of b.participants.filter(v=>!b.defeated.includes(v)&&faction(p,v)===faction(p,id)))for(const cardId of availableCards(p,hero(s,owner)))for(const [i,aura] of (card(p,cardId).aura??[]).entries()){
   const key=`aura:${owner}:${cardId}:${i}`;
   if(aura.timing!=='pool'||b.current[id].cards.includes(key)||aura.condition&&!condition(p,s,hero(s,owner),cardId,aura.condition))continue;
   effects(p,s,hero(s,id),cardId,aura.effects,{});b.current[id].cards.push(key);
  }
 }
 if(b?.active&&['pool','after-pool','reroll','after-reroll','tokens'].includes(b.stage))automatic(p,s,b.active.heroId,b.stage as Timing);
}
