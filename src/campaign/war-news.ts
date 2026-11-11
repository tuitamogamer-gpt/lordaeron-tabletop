// A War is won at the end of a faction turn, and its reward (gold and XP, with nothing to choose) is handed out at once: on the table
// only some numbers change. The chronicle line the engine writes for it is therefore also shown to the players as a notice.
import type { ContentPack } from '../rules/model';
import type { GameView } from '../rules/view';

/** The chronicle line of a War won by the step from `prev` to `next`, if that step is a move forward in the same campaign. */
export function warNews(p: ContentPack, prev: GameView | undefined, next: GameView): string | undefined {
 if (!prev || next.pack !== prev.pack || next.revision <= prev.revision || next.revision - prev.revision > 30) return undefined;
 const from = prev.log.at(-1)?.id ?? 0, wars = p.events.filter(e => e.script === 'war');
 return next.log.find(e => e.id > from && wars.some(w => e.text.includes(` wins ${w.name},`)))?.text;
}
