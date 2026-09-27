# UI interaction pass · September 2026

Equipment management now opens a slot grid beside a compatible-card picker. Changes stay in a draft until confirmation. The picker shows the previous and selected cards, the validated energy balance and bag contents. Moving a power removes its previous slot assignment; replacing an attachment returns the old item to the bag. Overflow requires an explicit merchant discard. Pet re-equipping keeps its explicit energy cost. Reset restores the original draft.

The campaign gives a direct next step after actions and during management. Opening an action from a character sheet or merchant closes that workspace, and stacked dialogs retain the scroll lock until the last one closes.

Threat level is visible on the map, Overlord summary, challenge preview and in combat. The full indicator shows the successful D8 faces and explains the threshold. Challenge previews total the entire matching enemy group. World effects, Overlord modifiers and the cauldron penalty are included; threat is not presented as a prediction of winning the battle.

Combat shows brief cues for powers, health changes, banked hits and defeated enemies. Numeric values remain the engine's current values throughout the animation. The actor shown for wounds is the character who lost health. Dice selection is limited to legal rerolls, penalties or ability targets. Dice settling completes before automatic advancement; reopening a settled roll does not replay its animation. Combat commands and the dice area scroll separately so abilities do not cover the tray. All decorative motion respects `prefers-reduced-motion`.

Validation:

- `npm test`: 308 tests across 19 files, including 14 new equipment, encounter-preview, feedback and dialog regressions.
- `npm run build`: TypeScript, server typecheck and Vite production build.
- `npm run check:render`: 621 renders, no invalid text.
- Chrome desktop inspection: training two powers, management entry, equipping active/instant powers, energy preview, confirmation, travel and challenge preview, AI combat, manual ability activation and D8 roll. Checked the compact desktop window at 1536 × 695.

Existing build notices remain: Vite's bundle-size advisory and dependency PURE-comment warnings. This pass adds no dependencies and does not change save format or combat rules.
