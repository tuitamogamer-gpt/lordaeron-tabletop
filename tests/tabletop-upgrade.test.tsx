// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import D8 from '../src/campaign/D8';
import { creatureStacks, MapPortraitToken } from '../src/campaign/MapTokens';
import { questObjectives } from '../src/campaign/quest-design';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { GameCard } from '../src/campaign/parts';
import { EventCardView } from '../src/campaign/design-system';
import { startRewards } from '../src/rules/reward-engine';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import RewardResolution from '../src/campaign/RewardResolution';
afterEach(cleanup);
describe('tabletop pieces and cards',()=>{
 it('renders a full raster card face with live rules for powers and events',()=>{
  const a=render(<GameCard card={p.cards.find(c=>c.id==='mage-fireball')!}/>);expect(a.container.querySelector('.full-card-face')?.getAttribute('src')).toContain('/full-cards/mage-fireball.webp');expect(a.container.querySelector('.folio-art svg')).toBeNull();expect(screen.getByText('Fireball')).toBeTruthy();a.unmount();
  const e=render(<EventCardView event={p.events[0]}/>);expect(e.container.querySelector('.full-card-face')).toBeTruthy();expect(e.container.querySelector('.folio-art svg')).toBeNull();
 });
 it('keeps species and colors separate when counting minions',()=>{
  const s=createGame(p,DEFAULT_SETUP),e=s.enemies[0];
  expect(creatureStacks([{...e,id:'1',creature:'gnoll',color:'red'},{...e,id:'2',creature:'gnoll',color:'red'},{...e,id:'3',creature:'gnoll',color:'blue'},{...e,id:'4',creature:'murloc',color:'red'}])).toEqual([{creature:'gnoll',color:'blue',count:1},{creature:'gnoll',color:'red',count:2},{creature:'murloc',color:'red',count:1}]);
 });
 it('exposes a keyboard-accessible named hero with a distinct portrait and level',()=>{
  const select=vi.fn();render(<svg><MapPortraitToken kind="hero" name="Grumbaz Crowsblood" x={10} y={20} src="/assets/portraits/grumbaz-crowsblood.webp" level={3} active onClick={select}/></svg>);
  fireEvent.keyDown(screen.getByRole('button',{name:'Grumbaz Crowsblood'}),{key:'Enter'});expect(select).toHaveBeenCalledOnce();expect(screen.getByText('3')).toBeTruthy();
 });
 it('preserves a d8 result and its selection, removal and reroll states',()=>{
  const click=vi.fn(),die={id:1,color:'blue' as const,value:8,removed:false,spotted:false,rerolled:true};const r=render(<D8 die={die} selected disabled={false} onSelect={click}/>);
  const button=screen.getByRole('button',{name:/blue D8 8, miss, rerolled/});expect(r.container.querySelectorAll('.d8-face')).toHaveLength(8);expect(r.container.querySelector('.d8-result')?.textContent).toContain('8');expect(button.getAttribute('aria-pressed')).toBe('true');fireEvent.click(button);expect(click).toHaveBeenCalledOnce();
  r.rerender(<D8 die={{...die,removed:true}} disabled={false} onSelect={click}/>);fireEvent.click(screen.getByRole('button'));expect(click).toHaveBeenCalledOnce();
 });
 it('counts only a quest’s own non-blue targets and preserves multi-spawn totals',()=>{
  const s=createGame(p,DEFAULT_SETUP),q=p.quests.find(q=>q.id===s.quests[0])!;const before=questObjectives(q,s);expect(before.reduce((n,o)=>n+o.total,0)).toBe(q.spawns.filter(v=>v.color!=='blue').reduce((n,o)=>n+o.count,0));
  const target=s.enemies.find(e=>e.quest===q.id)!;s.enemies=s.enemies.filter(e=>e.id!==target.id);expect(questObjectives(q,s).reduce((n,o)=>n+o.remaining,0)).toBe(before.reduce((n,o)=>n+o.remaining,0)-1);
 });
 it('sends the exact legal item and recipient chosen in the reward UI',()=>{
  const s=createGame(p,DEFAULT_SETUP),ids=[s.heroes[0].id],send=vi.fn();s.phase='reward';startRewards(p,s,ids,ids,{xp:0,gold:0,items:[{deck:'triangle',draw:2}]});const selected=s.reward!.offered[1];
  render(<RewardResolution state={view(s)} legal={legalActions(p,s)} send={send} inspect={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:new RegExp(p.cards.find(c=>c.id===selected)!.name)}));fireEvent.click(screen.getByRole('button',{name:`Claim ${p.cards.find(c=>c.id===selected)!.name}`}));
  expect(send).toHaveBeenCalledWith(expect.objectContaining({type:'reward',hero:ids[0],card:selected}));
 });
});
