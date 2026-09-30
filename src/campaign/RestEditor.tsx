import { useMemo, useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character } from '../rules/common';
import { apply } from '../rules/game';
import type { Command, Hero, State } from '../rules/model';
import { GameIcon } from './GameIcon';

export default function RestEditor({ state, hero, legal, send }: { state: State; hero: Hero; legal: Command[]; send: (command: Command) => void }) {
 const cap = capacity(p, hero), town = ['both', state.faction].includes(p.regions.find(r => r.id === hero.location)?.town ?? '');
 const budget = hero.level * (town ? 3 : 2), maxHealth = Math.max(0, Math.min(cap.health - hero.health, budget));
 const [health, setHealth] = useState(maxHealth), [food, setFood] = useState('');
 const healthRecovery = Math.min(health, maxHealth);
 const foods = [...new Set(legal.flatMap(c => c.type === 'rest' && c.hero === hero.id && c.food ? [c.food] : []))];
 const selectedFood = foods.includes(food) ? food : '';
 const command = useMemo<Extract<Command, { type: 'rest' }>>(() => ({ type: 'rest', hero: hero.id, health: healthRecovery, ...(selectedFood ? { food: selectedFood } : {}) }), [hero.id, healthRecovery, selectedFood]);
 const allowed = legal.some(c => c.type === 'rest' && c.hero === hero.id);
 const preview = useMemo(() => {
  if (!allowed) return null;
  try { return apply(p, state, command).heroes.find(h => h.id === hero.id)!; }
  catch { return null; }
 }, [state, command, hero.id, allowed]);
 const cursesRemoved = preview ? hero.curse - preview.curse : 0;
 const noRecovery = preview && preview.health === hero.health && preview.energy === hero.energy && !cursesRemoved;
 return <div className="dialog-content rest-editor">
  <p><strong>{character(p, hero.id).name}</strong> · {town ? 'Friendly town' : 'Wilderness'} · {budget} recovery points</p>
  <label className="rest-slider">Health recovery: <b>{healthRecovery}</b><input aria-label="Health recovery" type="range" min={0} max={maxHealth} value={healthRecovery} disabled={!allowed || !maxHealth} onChange={e => setHealth(Number(e.target.value))} /></label>
  <p className="muted">Allocate points to health. Remaining points restore energy, up to capacity.</p>
  <label className="setting-row">Food<select value={selectedFood} disabled={!allowed || !foods.length} onChange={e => setFood(e.target.value)}><option value="">{foods.length ? 'No food' : 'No food in your bag'}</option>{foods.map(id => <option key={id} value={id}>{card(p, id).name}</option>)}</select></label>
  {selectedFood && <p className="muted">Food is consumed after recovery. Its effect is included below.</p>}
  {preview && <section className="rest-preview" aria-label="Recovery preview" aria-live="polite">
   {(['health', 'energy'] as const).map(type => <div key={type}><GameIcon name={type} size={28} /><span><small>{type === 'health' ? 'Health' : 'Energy'}</small><strong>{hero[type]} → {preview[type]} <em>/ {capacity(p, preview)[type]}</em></strong></span><b>+{preview[type] - hero[type]}</b></div>)}
  </section>}
  {cursesRemoved > 0 && <p className="rest-curse-note">Removes {cursesRemoved} {cursesRemoved === 1 ? 'Curse' : 'Curses'}{preview!.curse ? ` · ${preview!.curse} remaining` : ''}.</p>}
  {noRecovery && <p className="rest-notice" role="status">This rest restores no health or energy and removes no Curses. It still costs one action.</p>}
  {!allowed && <p role="status">Rest is no longer available. Close this panel to continue.</p>}
  <button className="gold-button full-width" disabled={!preview || !allowed} onClick={() => send(command)}>Rest · 1 action</button>
 </div>;
}
