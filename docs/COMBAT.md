# Combat room

Combat has its own toggle beside the other game panels. It opens automatically when a Challenge begins. The in-room Combat toggle, Back to map and Escape close the room; the map toggle and floating Return to combat button reopen the same battle. Outside combat, the panel explains the dice and resolution order.

The three dice lanes show actual D8 octahedra, with eight numbered triangular faces. The visible face is oriented to the reducer's result. Rolls and rerolls animate, including rerolls that land on the same value; the animation never generates or changes a result. Reduced-motion preferences disable the spin. Hit/miss text, labels and icons supplement color.

- Blue: ranged damage, applied before surviving creatures attack.
- Red: melee hits defend against the attack, then contribute damage in resolution.
- Green: armor blocks damage.
- Attrition: contributed by powers and other rules, then added to the resolution attack.

Each successful die is one hit, rather than the sum of its face value. The tray shows rolled successes separately from the banked faction totals. Creature effects, Spot, hit conversions, armor assignment and boss rules still pass through the shared reducer. Threat and enemy totals include the engine's world-event and Overlord modifiers. Banked totals display the remaining pool after damage is spent. The last roll stays visible after its hits are banked; the room retains a short roll history during the current battle.

Auto-resolve starts enabled. It advances a single unambiguous accounting step, including forced wounds, while preserving player powers, rerolls, attacker order, target ordering, armor choices and healing/respawn decisions. Bots play their own combat decisions automatically when no human decision is pending. Autoplay battle delegates the full battle to the existing AI policy and stops at the result. Campaign-wide Run AI can continue an all-bot result. Turning off Auto-resolve also stops autoplay; manual controls and Step bot remain available.

Automation runs in Campaign, so hiding the room does not stop it. A single revision-checked timer schedules combat commands, separate from the campaign AI timer. Dice have 1.25 seconds to settle before another automatic step is scheduled. Replays keep ordinary game commands and remain compatible with existing saves; this feature does not change content hashes or combat rules.

Verification covers legal bot encounters, the ranged/defense/resolution order, attrition accounting, player decision boundaries, reroll selection and limits, removed dice, retained rolls, Strict Mode timer cleanup, hiding/reopening, pausing, save replay, and all combat timeline stages. The complete app is also checked with the existing test suite, production build, render smoke check and a real browser playthrough.
