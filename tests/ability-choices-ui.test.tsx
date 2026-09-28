// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CombatAbilities from '../src/campaign/CombatAbilities';
import { BASE_PACK as p } from '../src/data/base';
import { createGame, apply } from '../src/rules/game';
import { beginBattle } from '../src/rules/combat';
import { healthLoss } from '../src/rules/effects';
import { legalActions } from '../src/rules/legal';
import { hero } from '../src/rules/common';
import { view } from '../src/rules/view';
import type { Command } from '../src/rules/model';

afterEach(cleanup);
function priest(power: string, talent: string) {
 const id = 'wennu-bloodsinger', ally = 'grumbaz-crowsblood';
 const s = createGame(p, { seed: 2005, roster: [id, ally, 'brandon-lightstone', 'burbon-fang'], overlord: 'kelthuzad' });
 const h = hero(s, id); h.level = 5; h.learned = [power]; h.talents = [talent]; h.slots[0].card = power;
 s.enemies = [{ id: 'enemy', color: 'blue', creature: 'murloc', region: 'brill' }];
 beginBattle(s, 'pve', [id, ally], ['enemy'], 'horde', 'brill');
 return { s: apply(p, s, { type: 'attacker', hero: id }), id, ally };
}

it('renders and dispatches Inner Focus when the caster has no energy', () => {
 const { s, id } = priest('priest-smite', 'priest-inner-focus'); hero(s, id).energy = 0;
 const commands = legalActions(p, s).filter((c): c is Extract<Command, { type: 'ability' }> => c.type === 'ability' && c.card === 'priest-smite');
 const send = vi.fn(); render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={send} busy={false} />);
 expect(screen.getByText(/no energy cost/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button', { name: 'Activate' }));
 expect(send).toHaveBeenCalledWith(expect.objectContaining({ card: 'priest-smite', args: expect.objectContaining({ free: true }) }));
});

it('shows the secondary healing recipient and preserves that choice on Activate', () => {
 const { s, id, ally } = priest('priest-lesser-heal', 'priest-holy-specialization');
 hero(s, id).health = 1; healthLoss(s, hero(s, ally), 1);
 const commands = legalActions(p, s).filter((c): c is Extract<Command, { type: 'ability' }> => c.type === 'ability' && c.card === 'priest-lesser-heal');
 const selected = commands.findIndex(c => c.args?.secondaryTarget === id);
 expect(selected).toBeGreaterThanOrEqual(0);
 const send = vi.fn(); render(<CombatAbilities commands={commands} state={view(s)} dice={[]} send={send} busy={false} />);
 const select = screen.getByRole('combobox', { name: 'Ability choice Lesser Heal' });
 expect(screen.getByRole('option', { name: /also heal Wennu Bloodsinger/ })).toBeTruthy();
 fireEvent.change(select, { target: { value: String(selected) } }); fireEvent.click(screen.getByRole('button', { name: 'Activate' }));
 expect(send).toHaveBeenCalledWith(expect.objectContaining({ card: 'priest-lesser-heal', args: expect.objectContaining({ target: ally, secondaryTarget: id }) }));
});
