import type { State } from './model';
/** No RNG state, deck order or opponents' sealed auction bids crosses this boundary. */
export type GameView = Omit<State, 'rng' | 'questDecks' | 'itemDecks' | 'eventDeck' | 'auction'> & {
 deckCounts: { quests: Record<string, Record<string, number>>; items: Record<string, number>; events: number };
 auction?: { event: string; item: string; submitted: string[]; ownBids: Record<string, number> };
};
export function view(s: State, controlled: string[] = []): GameView {
 const { rng: _rng, questDecks, itemDecks, eventDeck, auction, ...publicState } = structuredClone(s);
 return { ...publicState, deckCounts: { quests: Object.fromEntries(Object.entries(questDecks).map(([f, decks]) => [f, Object.fromEntries(Object.entries(decks).map(([d, cards]) => [d, cards.length]))])), items: Object.fromEntries(Object.entries(itemDecks).map(([d, cards]) => [d, cards.length])), events: eventDeck.length }, ...(auction ? { auction: { event: auction.event, item: auction.item, submitted: Object.keys(auction.bids), ownBids: Object.fromEntries(Object.entries(auction.bids).filter(([id]) => controlled.includes(id))) } } : {}) };
}
