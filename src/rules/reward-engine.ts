import { assert, capacity, character, faction, hero, note, shuffle, unique } from './common.js';
import { receiveItem } from './inventory.js';
import type { ContentPack, Hero, Quest, Reward, RewardStep, State } from './model.js';

/** A serializable program, shared by the rules interpreter and the quest preview. */
export function rewardScript(reward: Reward, quest = false): RewardStep[] {
 return [
  { op: 'experience', amount: reward.xp, levelAdjusted: quest },
  { op: 'gold', amount: reward.gold },
  ...reward.items.map(i => ({ op: 'draw' as const, deck: i.deck, count: i.draw, keep: 1 as const })),
  ...(reward.special?.length ? [{ op: 'special' as const, cards: [...reward.special] }] : []),
  ...(quest ? [{ op: 'replace-quest' as const }] : []),
 ];
}
export function awardXP(p: ContentPack, h: Hero, amount: number) {
 h.xp = Math.min(p.xp[4], h.xp + Math.max(0, amount));
 while (h.level < 5 && h.xp >= p.xp[h.level]) { h.level++; h.talentChoices.push(h.level); const cap = capacity(p, h); h.health = cap.health; h.energy = cap.energy; }
}
export function shares(s: State, total: number, heroes: Hero[]): Record<string, number> {
 if (!heroes.length) return {};
 const sorted = shuffle(s, heroes).sort((a, b) => a.xp - b.xp);
 return Object.fromEntries(sorted.map((h, i) => [h.id, Math.floor(total / heroes.length) + (i < total % heroes.length ? 1 : 0)]));
}
export function startRewards(p: ContentPack, s: State, ids: string[], surviving: string[], reward: Reward, quest?: Quest) {
 assert(ids.length > 0 && unique(ids) && unique(surviving) && surviving.every(id => ids.includes(id)), 'Invalid reward recipients.');
 assert(!s.reward, 'Finish the current reward before starting another.');
 const all = ids.map(id => hero(s, id)), alive = surviving.map(id => hero(s, id));
 // Seeded sharing is calculated before levels change; replay preserves every tie-break.
 const xp = shares(s, reward.xp, all), gold = shares(s, reward.gold, alive);
 const bonus = quest ? shuffle(s, all.filter(h => h.level < quest.level)).sort((a, b) => a.xp - b.xp)[0]?.id : undefined;
 const grants = all.map(h => ({ hero: h.id, xp: Math.max(0, (xp[h.id] ?? 0) - (quest ? Math.max(0, h.level - quest.level) : 0) + (h.id === bonus && quest ? quest.level - h.level : 0)), gold: gold[h.id] ?? 0 }));
 s.reward = { faction: faction(p, ids[0]), quest: quest?.id, eligible: [...surviving], items: structuredClone(reward.items), special: [...reward.special ?? []], offered: [], replacement: !!quest,
  resolution: { script: rewardScript(reward, !!quest), cursor: 0, status: 'running', grants, receipts: [] } };
 advanceRewards(s, p);
}

/** Runs automatic instructions until a real player choice. Never uses Math.random. */
export function advanceRewards(s: State, p?: ContentPack) {
 const r = s.reward!;
 r.offered = []; delete r.offeredDeck;
 const flow = r.resolution;
 if (!flow) { // Existing event/test states can enter through the original queue format.
  while (r.items.length && !r.offered.length) { const i = r.items.shift()!; r.offeredDeck = i.deck; r.offered = s.itemDecks[i.deck].splice(0, i.draw); }
  if (!r.offered.length && r.extraItems?.length) { delete r.offeredDeck; r.offered = [r.extraItems.shift()!]; }
  if (!r.offered.length && r.special.length) { r.offeredDeck = 'special'; r.offered = r.special.filter(id => s.itemDecks.special.includes(id)); r.special = []; }
  return;
 }
 flow.status = 'running';
 while (flow.cursor < flow.script.length) {
  const step = flow.script[flow.cursor++];
  switch (step.op) {
   case 'experience':
    assert(p, 'Experience requires a content pack.');
    for (const g of flow.grants) {
     const h = hero(s, g.hero), before = h.xp, level = h.level;
     awardXP(p, h, g.xp);
     const text = `${character(p, h.id).name}: +${h.xp - before} XP${h.level > level ? ` · level ${h.level}` : ''}.`;
     flow.receipts.push({ kind: 'xp', hero: h.id, amount: h.xp - before, text }); note(s, text);
    }
    break;
   case 'gold':
    for (const g of flow.grants) {
     hero(s, g.hero).gold += g.gold;
     if (r.eligible.includes(g.hero)) flow.receipts.push({ kind: 'gold', hero: g.hero, amount: g.gold, text: `+${g.gold} gold` });
    }
    break;
   case 'draw': {
    r.items.shift();
    if (!r.eligible.length) { flow.receipts.push({ kind: 'skip', text: 'No surviving recipient for this item.' }); break; }
    r.offeredDeck = step.deck; r.offered = s.itemDecks[step.deck].splice(0, step.count);
    if (r.offered.length) { flow.status = 'choice'; return; }
    flow.receipts.push({ kind: 'skip', text: `${step.deck} deck is empty; this draw is skipped.` }); break;
   }
   case 'special':
    r.special = []; r.offeredDeck = 'special';
    r.offered = r.eligible.length ? step.cards.filter(id => s.itemDecks.special.includes(id)) : [];
    if (r.offered.length) { flow.status = 'choice'; return; }
    flow.receipts.push({ kind: 'skip', text: 'No named reward is available.' }); break;
   case 'replace-quest': flow.status = 'replacement'; return;
  }
 }
 // Event trophies and relics are appended by the world-event engine after base rewards.
 if (r.extraItems?.length && r.eligible.length) { delete r.offeredDeck; r.offered = [r.extraItems.shift()!]; flow.status = 'choice'; return; }
 flow.status = r.replacement ? 'replacement' : r.relic ? 'choice' : 'complete';
}

/** A single authoritative mutation for selection, bag limits and unchosen cards. */
export function claimReward(p: ContentPack, s: State, recipient: string, item: string, discard?: string) {
 const r = s.reward;
 assert(s.phase === 'reward' && r && r.eligible.includes(recipient) && r.offered.includes(item), 'This reward is unavailable.');
 receiveItem(p, s, hero(s, recipient), item, discard);
 if (r.offeredDeck === 'special') s.itemDecks.special = s.itemDecks.special.filter(id => id !== item);
 else if (r.offeredDeck) s.itemDecks[r.offeredDeck].push(...r.offered.filter(id => id !== item));
 const text = `${character(p, recipient).name} takes ${p.cards.find(c => c.id === item)!.name}${discard ? `; discards ${p.cards.find(c => c.id === discard)!.name}` : ''}.`;
 r.resolution?.receipts.push({ kind: 'item', hero: recipient, card: item, text }); note(s, text);
 advanceRewards(s);
}
