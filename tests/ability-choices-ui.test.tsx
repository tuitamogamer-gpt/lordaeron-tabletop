// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import CombatAbilities, {type AbilityCommand} from '../src/campaign/CombatAbilities';
import { BASE_PACK as p } from '../src/data/base';
import { createGame, apply } from '../src/rules/game';
import { beginBattle } from '../src/rules/combat';
import { abilityEnergyCost, healthLoss, previewAbilityDice } from '../src/rules/effects';
import { legalActions } from '../src/rules/legal';
import { card, hero } from '../src/rules/common';
import { view } from '../src/rules/view';
import type { ClassId, State } from '../src/rules/model';

afterEach(cleanup);
function fighter(cls:ClassId,power?:string,talents:string[]=[]) {
 const def=p.characters.find(c=>c.classId===cls&&c.faction==='horde')!,id=def.id,allyDef=p.characters.find(c=>c.faction==='horde'&&c.id!==id)!,ally=allyDef.id;
 const s=createGame(p,{seed:2005,roster:[id,ally,...p.characters.filter(c=>c.faction==='alliance'&&c.classId!==cls&&c.classId!==allyDef.classId).slice(0,2).map(c=>c.id)],overlord:'kelthuzad'});
 const h=hero(s,id);h.level=5;h.energy=8;h.talents=talents;
 if(power){h.learned=[power];h.slots[def.slots.findIndex(slot=>slot.types.includes(card(p,power).type)&&!slot.stanceOnly)].card=power;}
 s.enemies=[{id:'enemy',color:'blue',creature:'murloc',region:'brill'}];
 beginBattle(s,'pve',[id,ally],['enemy'],'horde','brill');
 return {s:apply(p,s,{type:'attacker',hero:id}),id,ally};
}
const abilities=(s:State,id:string)=>legalActions(p,s).filter((c):c is AbilityCommand=>c.type==='ability'&&c.card===id);
const use=(name:string|RegExp)=>screen.getByRole('button',{name}) as HTMLButtonElement;
const strengths=(name:string)=>within(screen.getByRole('radiogroup',{name:`Strength ${name}`})).getAllByRole('radio');

describe('a power is played from its own row',()=>{
 it('previews the whole card on focus, lists every Execute strength on the row and plays nothing while the table is busy',()=>{
  const {s}=fighter('warrior','warrior-execute');s.battle!.stage='after-tokens';
  const commands=abilities(s,'warrior-execute'),send=vi.fn(),r=render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={send} busy={false}/>);
  const face=screen.getByRole('button',{name:'Preview Execute'});
  fireEvent.focus(face);
  const preview=screen.getByRole('tooltip',{name:'Execute full card'});
  const image=within(preview).getByRole('img',{name:/Execute/});
  for(let amount=1;amount<=5;amount++)expect(image.getAttribute('alt')).toContain(`${amount} energy`);
  expect(preview.querySelector('.power-strength-option, .folio-rules, foreignObject')).toBeNull();
  fireEvent.click(face);
  expect(send).not.toHaveBeenCalled();
  const options=strengths('Execute');
  expect(options.map(option=>option.textContent)).toEqual(['I · 1 energy','II · 2 energy','III · 3 energy','IV · 4 energy','V · 5 energy']);
  expect(options.map(option=>option.getAttribute('aria-checked'))).toEqual(['true','false','false','false','false']);
  expect(use('Use Execute · 1 energy').disabled).toBe(false);
  r.rerender(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={send} busy/>);
  expect(use('Use Execute · 1 energy').disabled).toBe(true);
  expect(strengths('Execute').every(option=>(option as HTMLButtonElement).disabled)).toBe(true);
  fireEvent.click(use('Use Execute · 1 energy'));fireEvent.click(strengths('Execute')[2]);
  expect(send).not.toHaveBeenCalled();
  expect(strengths('Execute')[0].getAttribute('aria-checked')).toBe('true');
 });
 it.each([
  ['warrior','warrior-heroic-strike','warrior-improved-heroic-strike','red',2],
  ['warlock','warlock-shadow-bolt','warlock-improved-shadow-bolt','blue',2],
 ] as const)('shows the applicable %s enhancement on the row and matches actual added dice', (cls,power,talent,color,gained)=>{
  const {s}=fighter(cls,power,[talent]),commands=abilities(s,power),send=vi.fn(),before=structuredClone(s);
  render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={send} busy={false}/>);
  const bonus=screen.getByText(card(p,talent).name).closest('p')!;
  expect(bonus.className).toBe('combat-power-bonus');
  expect(within(bonus).getByRole('img',{name:`${color} dice`})).toBeTruthy();
  expect(send).not.toHaveBeenCalled();expect(s).toEqual(before);
  const count=s.battle!.active!.dice.filter(die=>die.color===color).length;
  fireEvent.click(use(new RegExp(`^Use ${card(p,power).name} ·`)));
  expect(apply(p,s,send.mock.calls[0][0]).battle!.active!.dice.filter(die=>die.color===color)).toHaveLength(count+gained);
 });
 it('plays Heroic Strike with one click on its Use button, for the cost the button states',()=>{
  const {s,id}=fighter('warrior','warrior-heroic-strike'),before=structuredClone(s),commands=abilities(s,'warrior-heroic-strike'),send=vi.fn();
  render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={send} busy={false}/>);
  const row=screen.getByRole('region',{name:'Heroic Strike power'});
  expect(within(row).getByText(/\+1 Reroll/,{selector:'.combat-power-effect'})).toBeTruthy();
  expect(within(row).queryByRole('radiogroup')).toBeNull();
  expect(screen.getByLabelText('Heroic Strike energy after cost').textContent).toBe(`${hero(s,id).energy} → ${hero(s,id).energy-2}`);
  // Looking at the row spends nothing: energy leaves the sheet only on Use.
  expect(send).not.toHaveBeenCalled();expect(s).toEqual(before);
  fireEvent.click(use('Use Heroic Strike · 2 energy'));
  expect(send).toHaveBeenCalledExactlyOnceWith(commands[0]);
  expect(hero(apply(p,s,send.mock.calls[0][0]),id).energy).toBe(hero(s,id).energy-2);
 });
 it('names the character on the row where powers of several characters are listed together',()=>{
  const {s,id}=fighter('warrior','warrior-heroic-strike'),commands=abilities(s,'warrior-heroic-strike');
  const first=p.characters.find(c=>c.id===id)!.name.split(' ')[0];
  const r=render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={()=>{}} busy={false}/>);
  expect(r.container.querySelector('.combat-power-meta>b')).toBeNull();
  r.rerender(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={()=>{}} busy={false} owner/>);
  expect(r.container.querySelector('.combat-power-meta>b')!.textContent).toBe(first);
 });
 it('renders and dispatches Inner Focus when the caster has no energy',()=>{
  const {s,id}=fighter('priest','priest-smite',['priest-inner-focus']);hero(s,id).energy=0;
  const commands=abilities(s,'priest-smite'),send=vi.fn();render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={send} busy={false}/>);
  expect(screen.getByText(/no energy cost/)).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(use('Use Smite · 0 energy'));
  expect(send).toHaveBeenCalledWith(expect.objectContaining({card:'priest-smite',args:expect.objectContaining({free:true})}));
  expect(hero(apply(p,s,send.mock.calls[0][0]),id).energy).toBe(0);
 });
 it('lets the player choose paid or once-per-combat free casting without activating either early',()=>{
  const {s,id}=fighter('priest','priest-smite',['priest-inner-focus']),send=vi.fn();
  render(<CombatAbilities commands={abilities(s,'priest-smite')} state={view(s)} dice={[]} send={send} busy={false}/>);
  const payment=()=>within(screen.getByRole('radiogroup',{name:'Payment Smite'}));
  fireEvent.click(payment().getByRole('radio',{name:'Free cast · once per combat'}));
  expect(payment().getByRole('radio',{name:'Free cast · once per combat'}).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByLabelText('Smite energy after cost').textContent).toBe(`${hero(s,id).energy} → ${hero(s,id).energy}`);
  expect(use('Use Smite · 0 energy')).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(payment().getByRole('radio',{name:'Spend 2 energy'}));
  fireEvent.click(use('Use Smite · 2 energy'));
  expect(send.mock.calls[0][0].args?.free).not.toBe(true);
 });
 it('shows the chosen strength, its effect and the remaining energy before Execute is played',()=>{
  const {s,id}=fighter('warrior','warrior-execute');s.battle!.stage='after-tokens';hero(s,id).energy=5;
  const commands=abilities(s,'warrior-execute'),send=vi.fn();render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={send} busy={false}/>);
  fireEvent.click(strengths('Execute')[2]);
  expect(strengths('Execute')[2].getAttribute('aria-checked')).toBe('true');
  expect(screen.getByLabelText('Execute energy after cost').textContent).toBe('5 → 2');
  expect(screen.getByText(/\+3 ranged hits/,{selector:'.combat-power-effect'})).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(use('Use Execute · 3 energy'));
  expect(send).toHaveBeenCalledExactlyOnceWith(commands.find(command=>command.ability==='execute-3'));
  expect(hero(apply(p,s,send.mock.calls[0][0]),id).energy).toBe(2);
 });
 it('offers only the strengths the character can pay for',()=>{
  const {s,id}=fighter('warrior','warrior-execute');s.battle!.stage='after-tokens';hero(s,id).energy=2;
  render(<CombatAbilities commands={abilities(s,'warrior-execute')} state={view(s)} dice={[]} send={()=>{}} busy={false}/>);
  expect(strengths('Execute').map(option=>option.textContent)).toEqual(['I · 1 energy','II · 2 energy']);
 });
 it('shows the secondary healing recipient and preserves that selection when the power is played',()=>{
  const {s,id,ally}=fighter('priest','priest-lesser-heal',['priest-holy-specialization']);hero(s,id).health=1;healthLoss(s,hero(s,ally),1);
  const commands=abilities(s,'priest-lesser-heal'),send=vi.fn();render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={send} busy={false}/>);
  const choice=screen.getByRole('radiogroup',{name:'Ability choice Lesser Heal'});
  fireEvent.click(within(choice).getByRole('radio',{name:/Also heal Wennu Bloodsinger/}));
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(use('Use Lesser Heal · 1 energy'));
  expect(send).toHaveBeenCalledWith(expect.objectContaining({card:'priest-lesser-heal',args:expect.objectContaining({target:ally,secondaryTarget:id})}));
 });
 it('rejects ineligible tray dice and dispatches the matching legal choice after they are corrected',()=>{
  const {s,id}=fighter('mage',undefined,['mage-winters-chill']);
  s.battle!.active!.dice=[{id:7,color:'red',value:4,removed:false,spotted:false,rerolled:false},{id:8,color:'blue',value:2,removed:false,spotted:false,rerolled:false},{id:9,color:'green',value:6,removed:false,spotted:false,rerolled:false}];
  const commands=abilities(s,'mage-winters-chill'),send=vi.fn(),r=render(<CombatAbilities commands={commands} state={view(s)} dice={[9]} send={send} busy={false}/>);
  fireEvent.click(screen.getByRole('checkbox',{name:'Use selected tray dice (1)'}));
  expect(screen.getByText(/These dice do not match the effect/)).toBeTruthy();
  expect(use("Use Winter's Chill · 0 energy").disabled).toBe(true);
  fireEvent.click(use("Use Winter's Chill · 0 energy"));expect(send).not.toHaveBeenCalled();
  r.rerender(<CombatAbilities commands={commands} state={view(s)} dice={[8]} send={send} busy={false}/>);
  expect(screen.queryByText(/These dice do not match the effect/)).toBeNull();
  fireEvent.click(use("Use Winter's Chill · 0 energy"));
  const expected=commands.find(command=>command.ability===commands[0].ability&&command.args?.dice?.[0]===8)!;
  expect(send).toHaveBeenCalledExactlyOnceWith(expected);
  expect(apply(p,s,expected).battle!.active!.dice.find(die=>die.id===8)?.color).toBe('green');expect(hero(s,id).energy).toBeGreaterThan(0);
 });
 it('lists each kind of dice choice once and still accepts a tray selection beyond the first 64 listed examples',()=>{
  const {s}=fighter('warrior','warrior-shield-wall');s.battle!.stage='after-pool';
  s.battle!.active!.dice=Array.from({length:12},(_,id)=>({id,color:id<7?'red' as const:'blue' as const,value:5,removed:false,spotted:false,rerolled:false}));
  const commands=abilities(s,'warrior-shield-wall'),three=commands.filter(command=>command.ability==='after-pool-3');
  expect(three).toHaveLength(64);expect(three.some(command=>JSON.stringify(command.args?.dice)==='[9,10,11]')).toBe(false);
  const original=structuredClone(s),publicState=view(s),originalPublic=structuredClone(publicState),send=vi.fn();
  render(<CombatAbilities commands={commands} state={publicState} dice={[9,10,11]} send={send} busy={false}/>);
  fireEvent.click(strengths('Shield Wall')[2]);
  // Seven red and five blue dice all show 5: which red or which blue is taken makes no difference, so 64 listed examples are three kinds of choice.
  const kinds=within(screen.getByRole('radiogroup',{name:'Ability choice Shield Wall'})).getAllByRole('radio').map(option=>option.textContent!.replace(/ \(#\d+\)/g,''));
  expect(kinds).toEqual(['Dice: red 5, red 5, red 5','Dice: red 5, red 5, blue 5','Dice: red 5, blue 5, blue 5']);
  expect(screen.queryByRole('combobox')).toBeNull();
  fireEvent.click(screen.getByRole('checkbox',{name:'Use selected tray dice (3)'}));
  const confirm=use('Use Shield Wall · 0 energy');
  expect(confirm.disabled).toBe(false);expect(send).not.toHaveBeenCalled();
  expect(s).toEqual(original);expect(publicState).toEqual(originalPublic);
  fireEvent.click(confirm);
  expect(send.mock.calls[0][0].args.dice).toEqual([9,10,11]);
  const result=apply(p,s,send.mock.calls[0][0]);
  expect(result.battle!.active!.dice.filter(die=>die.color==='green').map(die=>die.id)).toEqual([9,10,11]);
 });
 it('lists many different dice choices in a menu instead of a row of buttons',()=>{
  const {s}=fighter('warrior','warrior-shield-wall');s.battle!.stage='after-pool';
  s.battle!.active!.dice=Array.from({length:12},(_,id)=>({id,color:id<7?'red' as const:'blue' as const,value:1+id%8,removed:false,spotted:false,rerolled:false}));
  const commands=abilities(s,'warrior-shield-wall'),send=vi.fn();
  render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={send} busy={false}/>);
  fireEvent.click(strengths('Shield Wall')[2]);
  const menu=screen.getByRole('combobox',{name:'Ability choice Shield Wall'}) as HTMLSelectElement,options=[...menu.querySelectorAll('option')];
  expect(options.length).toBeGreaterThan(6);
  expect(new Set(options.map(option=>option.textContent!.replace(/ \(#\d+\)/g,''))).size).toBe(options.length);
  fireEvent.change(menu,{target:{value:options[5].value}});
  fireEvent.click(use('Use Shield Wall · 0 energy'));
  expect(send).toHaveBeenCalledExactlyOnceWith(commands.find(command=>JSON.stringify(['grumbaz-crowsblood','warrior-shield-wall',command.ability,Object.entries(command.args??{})])===options[5].value));
  expect(()=>apply(p,s,send.mock.calls[0][0])).not.toThrow();
 });
});

describe('one authoritative activation cost for preview and reducer',()=>{
 it('quotes card-specific and instant discounts without mutating state',()=>{
  const {s,id,ally}=fighter('priest','priest-greater-heal',['priest-improved-healing','priest-mental-agility']);healthLoss(s,hero(s,ally),2);
  const commands=abilities(s,'priest-greater-heal'),command=commands[0],original=structuredClone(s),h=hero(s,id);
  expect(abilityEnergyCost(p,view(s),h,command.card,command.ability,command.args)).toBe(1);expect(s).toEqual(original);
  expect(hero(apply(p,s,command),id).energy).toBe(h.energy-1);
  render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={()=>{}} busy={false}/>);
  expect(screen.getByRole('button',{name:'Use Greater Heal · 1 energy'})).toBeTruthy();
 });
 it('quotes conditional free use and the later instant repeat surcharge exactly',()=>{
  const {s,id}=fighter('mage','mage-arcane-missiles',['mage-arcane-power']);s.battle!.round=2;s.battle!.previous[id]={cards:['mage-arcane-missiles'],harmed:false};hero(s,id).energy=5;
  const first=abilities(s,'mage-arcane-missiles')[0];
  expect(abilityEnergyCost(p,view(s),hero(s,id),first.card,first.ability,first.args)).toBe(0);
  const repeated=apply(p,s,first),second=abilities(repeated,'mage-arcane-missiles')[0];
  expect(abilityEnergyCost(p,view(repeated),hero(repeated,id),second.card,second.ability,second.args)).toBe(1);
  expect(hero(apply(p,repeated,second),id).energy).toBe(4);
  render(<CombatAbilities commands={[second]} state={view(repeated)} dice={[]} send={()=>{}} busy={false}/>);
  expect(screen.getByRole('button',{name:'Use Arcane Missiles · 1 energy'})).toBeTruthy();
  expect(screen.getByText('Condition met · 1 energy repeat cost')).toBeTruthy();
 });
 it('does not charge an instant card twice for its paid follow-up ability',()=>{
  const {s,id}=fighter('druid'),wrath=p.characters.find(value=>value.id===id)!.slots[3].printed!;
  const first=abilities(s,wrath)[0],paid=apply(p,s,first);paid.battle!.stage='after-reroll';
  paid.battle!.active!.dice=[{id:0,color:'blue',value:6,removed:false,spotted:false,rerolled:false}];
  const next=abilities(paid,wrath)[0];expect(next).toBeTruthy();
  expect(abilityEnergyCost(p,view(paid),hero(paid,id),next.card,next.ability,next.args)).toBe(0);
  expect(hero(apply(p,paid,next),id).energy).toBe(hero(paid,id).energy);
 });
 it('validates exact count, filter and spotted dice through the reducer without changing public state or RNG',()=>{
  const {s}=fighter('warrior',undefined,['warrior-impale']);s.battle!.stage='after-pool';
  s.battle!.active!.dice=[{id:0,color:'red',value:8,removed:false,spotted:false,rerolled:false},{id:1,color:'red',value:8,removed:false,spotted:true,rerolled:false},{id:2,color:'blue',value:3,removed:false,spotted:false,rerolled:false}];
  const base=abilities(s,'warrior-impale')[0],original=structuredClone(s),publicState=view(s),originalPublic=structuredClone(publicState);
  expect(previewAbilityDice(p,publicState,base,{dice:[]}).error).toMatch(/exact number/);
  expect(previewAbilityDice(p,publicState,base,{dice:[2]}).error).toMatch(/do not match/);
  expect(previewAbilityDice(p,publicState,base,{dice:[1]}).error).toMatch(/already been used for Spot/);
  expect(previewAbilityDice(p,publicState,base,{dice:[0]}).command).toEqual(base);
  expect(s).toEqual(original);expect(publicState).toEqual(originalPublic);
 });
 it('preserves chosen dice order for a preset that assigns different values',()=>{
  const {s}=fighter('hunter',undefined,['hunter-aimed-shot']);
  s.battle!.active!.dice=[{id:0,color:'blue',value:0,removed:false,spotted:false,rerolled:false},{id:1,color:'blue',value:0,removed:false,spotted:false,rerolled:false}];
  const base=abilities(s,'hunter-aimed-shot')[0],preview=previewAbilityDice(p,view(s),base,{dice:[1,0]});
  expect(preview.error).toBeUndefined();
  const result=apply(p,s,preview.command!);
  expect(result.battle!.active!.dice.map(die=>die.value)).toEqual([8,7]);
 });
});
