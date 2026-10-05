/* Dev helper: simulate a campaign with the AI and export session files at
 * interesting decision points so the UI can be reviewed at those states. */
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { decide } from '../src/ai/planner';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import { newSession } from '../src/rules/session';
import type { Command, State } from '../src/rules/model';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? '/tmp/claude-0/-home-user-lordaeron-tabletop/5540366e-93c8-52be-a4e5-549dcaed0c43/scratchpad/states';
const seed = Number(process.argv[3] ?? 2005), max = Number(process.argv[4] ?? 2500);
mkdirSync(out, { recursive: true });
const setup = { ...DEFAULT_SETUP, seed, overlord: 'kelthuzad' };
let s: State = createGame(p, setup);
const commands: Command[] = [];
const taken = new Set<string>();
const save = (name: string, state: State, extra: Record<string, unknown> = {}) => {
 if (taken.has(name)) return; taken.add(name);
 writeFileSync(`${out}/${name}.json`, JSON.stringify({ ...newSession(p, setup), commands: [...commands] }));
 writeFileSync(`${out}/${name}.meta.json`, JSON.stringify({ name, count: commands.length, turn: state.turn, phase: state.phase, stage: state.battle?.stage, ...extra }, null, 1));
 console.log('saved', name, 'commands', commands.length, 'turn', state.turn, 'phase', state.phase, JSON.stringify(extra));
};
let count = 0;
while (s.phase !== 'finished' && count < max) {
 const legal = legalActions(p, s);
 // Snapshot before applying the next command, when a human-relevant decision is pending.
 const types = new Set(legal.map(c => c.type));
 const hero = (c: Command) => ('hero' in c ? (c as { hero: string }).hero : undefined);
 if (s.phase === 'reward' && types.has('reward')) save('reward', s, { hero: hero(legal.find(c => c.type === 'reward')!) , legal: [...types] });
 if (types.has('quest')) save('quest-replacement', s, { legal: [...types] });
 if (s.heroes.some(h => h.talentChoices.length)) save('talent', s, { hero: s.heroes.find(h => h.talentChoices.length)!.id });
 if (s.auction) save('auction', s, { item: s.auction.item });
 if (s.eventFlow?.steps.length) save(`event-${s.eventFlow.steps[0].kind}`, s, { event: s.eventFlow.event, hero: s.eventFlow.steps[0].hero });
 if (s.respawns.length && s.phase !== 'combat') save('respawn', s, { hero: s.respawns[0] });
 if (s.phase === 'management' && types.has('manage')) save('management', s, { hero: hero(legal.find(c => c.type === 'manage')!) });
 if (s.phase === 'final-management') save('final-management', s, {});
 if (s.phase === 'combat' && s.battle?.kind === 'pvp') save('pvp-combat', s, { stage: s.battle.stage });
 if (s.phase === 'combat' && s.battle?.boss) save('boss-combat', s, { boss: s.battle.boss, stage: s.battle.stage });
 if (s.phase === 'combat' && s.battle && s.battle.participants.length >= 2 && s.battle.stage === 'attacker') save('group-combat', s, { participants: s.battle.participants });
 if (s.phase === 'combat' && s.battle?.stage === 'penalty') save('combat-penalty', s, { hero: s.battle.active?.heroId });
 if (s.phase === 'combat' && s.battle?.stage === 'reroll' && (s.battle.active?.reroll ?? 0) > 0) save('combat-reroll', s, { hero: s.battle.active?.heroId, reroll: s.battle.active?.reroll });
 if (s.phase === 'combat' && types.has('ability')) save('combat-ability', s, { hero: hero(legal.find(c => c.type === 'ability')!), stage: s.battle?.stage });
 if (s.phase === 'combat' && s.battle?.stage === 'wounds' && legal.filter(c => c.type === 'wound').length > 1) save('combat-wounds-choice', s, { options: legal.filter(c => c.type === 'wound').length });
 if (s.phase === 'actions' && s.heroes.some(h => h.level >= 2 && h.learned.length > 0)) save('midgame-actions', s, { levels: s.heroes.map(h => h.level) });
 if (s.phase === 'actions' && s.turn >= 8) save('turn-8', s, {});
 if (s.phase === 'actions' && s.turn >= 16) save('turn-16', s, {});
 if (s.phase === 'actions' && s.heroes.some(h => h.bag.length >= 2)) save('bag-items', s, { hero: s.heroes.find(h => h.bag.length >= 2)!.id });
 if (s.phase === 'actions' && s.heroes.some(h => h.curse > 0 || h.stun > 0)) save('conditions', s, { hero: s.heroes.find(h => h.curse > 0 || h.stun > 0)!.id });
 if ((s.world ?? []).some(w => !w.cleared)) save('world-event', s, { world: s.world });
 const decision = decide(p, view(s, s.heroes.map(h => h.id)), legal);
 if (!decision) { console.log('stalled', s.phase, s.battle?.stage); break; }
 s = apply(p, s, decision.command); commands.push(decision.command); count++;
}
save('final', s, { winner: s.winner });
console.log('done', count, 'commands; turn', s.turn, 'phase', s.phase);
