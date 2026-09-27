import type { State, Faction } from '../rules/model.js';
import type { GameView } from '../rules/view.js';

/** A sandbox for local rule previews, never a reconstruction of hidden information.
 * Empty decks deliberately prevent lookahead across draws. The caller must stop
 * before rewards, auctions or turn transitions. Seeds are planner-owned samples. */
export function publicState(view: GameView, seed = 0x51f15e): State {
 const { deckCounts: _counts, auction: _auction, kazzak, ...visible } = structuredClone(view);
 const decks = () => ({ grey: [], green: [], yellow: [], red: [] });
 return { ...visible, rng: seed, log: [], questDecks: { horde: decks(), alliance: decks() },
  itemDecks: { triangle: [], square: [], circle: [], special: [] }, eventDeck: [],
  // Unknown clues are not simulated as encounters. Only a known true clue can be previewed.
  kazzak: kazzak?.map(t => ({ ...t, real: t.real === true })) };
}

/** A local table may control bots on both sides. A bot must only use its own clues. */
export function factionView(view: GameView, side: Faction): GameView {
 return { ...view, kazzak: view.kazzak?.map(({ real, ...t }) =>
  ({ ...t, ...(t.revealed || t.known.includes(side) ? { real } : {}) })) };
}
