# Gold and Goblins Calculator Design Spec 5

The design specs record the evidence, decisions, and working process used to develop the calculator. They are not intended to form a deterministic sequence of implementation operations. Diagnostic UI may remain available even when it is not part of the primary presentation described by a later spec.

## Balance and Zone Selection

The layout of the balance selection menu should be slightly adjusted. First, change label "Schedule" to "Event Schedule" and label "All Balances" to "All Events". Then, remove Main Mines from the event list and make it its own full-width `list-group` button above Event Schedule and All Events, using the same visual format as the other balance selectors, like so:

| COL1                | COL2         |
| ------------------- | ------------ |
| Main Mines label    | (contd)      |
| Main Mines selector | (contd)      |
| Schedule label      | Events label |
| Schedule selector   | Events slctr |

The button at the navbar showing the current balance name should also include the date range if it is a schedule with the same smaller font. If not selected from the schedule, then no date shown.

For the events [arctic, candy, jungle, minicard, minielixir, minigem, pirate, volcano], there are two different variants (zones) loaded into the same balance file which are exactly identical in calculations, but basically flipped on the map. To differentiate them, we classify them as "Left" or "Right" depending on if their Amethyst mineshaft is on the left side or right side of the grid.

For these events, use the ExclusiveZoneNumber to identify which Zone will be queried. Use the following table to identify whether that zone is the Left or Right variant. It should show like "Into the Arctic (L)" or "Pirate Plunder (R)".

| Balance    | Zone 1 | Zone 2 |
| ---------- | ------ | ------ |
| arctic     | Left   | Right  |
| candy      | Left   | Right  |
| jungle     | Right  | Left   |
| minicard   | Left   | Right  |
| minielixir | Left   | Right  |
| minigem    | Left   | Right  |
| pirate     | Left   | Right  |
| volcano    | Left   | Right  |

### RankUpType

RankUpType will affect the Zone selector.

- If RankUpType=1 or 3, then the "Zone" label should be renamed to "Mine" and the dropdown menu should be changed to a numerical selector like the card level one. x/y means mine x out of y, which resolves to zone{x}.
- If RankUpType=2, show a selector labelled "Amethyst Left/Right Variant" with radio options "Left" and "Right". For a direct selection from All Events, the radio buttons are enabled and change the selected Zone according to the hardcoded table above. For a scheduled event, ExclusiveZoneNumber selects the Zone at the schedule-selection level; the same radio selector remains visible but is disabled and cannot change the scheduled variant.

## Summary Tab

Display HTML like this:

```
<strong>Balance ID</strong>: {balance_id}:{ExclusiveZoneNumber}
<strong>Rank Up Type</strong>: {RankUpType formatted string}
<h2>Income</h2>
{Income Table, but make this a React Component called IncomeTable.tsx.}
<h2>Global Effects</h2>
{Global Effects Table, but make this a React Component called GlobalEffectsTable.tsx.}
<h2>Derived Calculations</h2>
{Derived Calculations Table, but make this a React Component called DerivedCalculationsTable.tsx.}
```

Keep the Current Rank Multipliers table available for now as a diagnostic view. It does not need to be incorporated into the primary three-table Summary layout above.

### IncomeTable.tsx

Also include a column after mode called Description, and a column after that called Deliveries / Hour. Deliveries / Hour is the number of deliveries that could be received during a fresh one-hour period: start with claim index `i = 0`, add delays of `DeliveryDelaySecBase * DeliveryDelaySecGrowth ** i`, and count each delivery whose cumulative arrival time is less than or equal to 3600 seconds. This calculation starts from the 22-second base in balances that use 22 seconds and continues exponentiating upward; it does not begin from the player's current claim count. Idle has 0 deliveries per hour. The description for Idle should be "Offline or online without doing anything" and description for Active should be "Online; collecting deliveries and running mineshafts continuously".

### GlobalEffectsTable.tsx

It should be three columns: ID, Name, and Effect Value.

Make the following changes:

- GoblinLimit - ID should be GoblinLimitChange; Name should be Goblin Limit Change
- GoblinPurchaseLevel - ID should be GoblinPurchaseLevelChange; Name should be Goblin Purchase Level Change
- GoblinCannonTimer - ID should be GoblinCannonTimerChange
- RockCurrencyMult - Name should be Rock Currency Multiplier, and it should be shown as a (1 + n%) -> xn.nn.
- DeliveryCurrencyMult - Name should be Delivery Currency Multiplier, and it should be shown as a (1 + n%) -> xn.nn.

An effect should be visible in this table if and only if it is implicated anywhere in the entire selected balance file. An effect is implicated when a Card or CheckPoint entry maps to it, or when it is sourced from a relevant base balance field such as the base miner values. Visibility is determined from the balance itself, not from whether the player's current card levels make the effect non-identity. This prevents Evergreen-only effects from polluting event tables while keeping applicable effects visible at their identity values.

Values shown as x or / generally use two decimal points through the formatter in `format.ts`. `GoblinPurchasePrice` and `GeneratorCurrencyMult` are exceptions and use the regular `numberFormat`; `GoblinPurchasePrice` also deliberately uses `/` rather than the division symbol because the division glyph is too easily mistaken for a plus sign.

### DerivedCalculationsTable.tsx

Table should be exactly as follows:

| ID                  | Name                               | Current Value                                                                                                                   |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| GoblinLimit         | Goblin Limit                       | {Unchanged; total number of goblin in the mine}                                                                                 |
| GoblinPurchaseLevel | Goblin Purchase Level              | {This is the current input of Goblin Purchase Level; it must be greater than or equal to max(1, GoblinPurchaseLevelChange + 1)} |
| GoblinCannonLevel   | Goblin Spawn Level                 | {max(GoblinPurchaseLevel + BALANCE_ROOT["SpawningCart"][0]["SpawnLevelOffset"], 1)}                                             |
| GoblinCannonTimer   | Goblin Spawn Time                  | {Unchanged}                                                                                                                     |
| RawIncomePerSec     | Idle Income / Sec                  | {Same as idle income per second}                                                                                                |
| MineshaftsOpened    | Total number of mineshafts opened  | {count mineshafts opened}                                                                                                       |
| CheckpointsOpened   | Total number of checkpoints opened | {checkpointsOpened}                                                                                                             |
| RankMultiplierIndex | Index used for rank multipliers    | {rankMultiplierIndex}                                                                                                           |
| GlobalRank          | Index used for global rank         | {globalRank}                                                                                                                    |

Rename the editable ActiveState input `currentGoblinLevel` to `goblinPurchaseLevel`. `GoblinCannonLevel` is derived from `goblinPurchaseLevel`; it is not stored as another editable ActiveState input. After removing the goblin-level input from the Map tab, expose the Goblin Purchase Level input on the Goblins tab.

## Map Tab

### Map

- The Map itself should be a component MapDisplay.tsx.
- Checkpoints and Exits should show up with just the number.
- Mineshafts should show up with the mineshaft text, then the number below it (all bold).
- Forge should show up as just "Forge".

### Surrounding Inputs

Above the map, should be in this order:

- Dimensions: {w}x{h}
- Checkpoints Opened: input

Whenever Checkpoints Opened changes, reconcile the current-zone mineshaft list against map progression. All mineshafts in the segments made available by the selected number of checkpoints must be open. A newly opened mineshaft starts at level 1, while a mineshaft that was already open retains its existing level. Any mineshaft beyond the selected checkpoint boundary must be closed and set to level 0. Forge remains open.

A mineshaft that lies before an already-opened checkpoint is required open and its Open checkbox is disabled. The currently accessible segment after the latest opened checkpoint remains manually closable.

Remove the current goblin level and max goblin sections.

## Mineshafts Tab

- In the derived model, each mineshaft should have its idle and active income contribution percentage. This will be pretty simple: idle just counts the automated mineshafts and active counts all the unlocked mineshafts.
- Remove the CSS selector for graying out rows that are not present in the current zone, and replace the marking as disabled logic with entirely not rendering them.
- The table will therefre look like this:

| Mineshaft | Open | Automated | Level | Managers | Income/Cycle | Cycle Time | Idle Income % | Active Income % | Upgrade Cost | Idle Time to Upgrade | Active Time to Upgrade |
| --------- | ---- | --------- | ----- | -------- | ------------ | ---------- | ------------- | --------------- | ------------ | -------------------- | ---------------------- |

- The level input is always enabled. Entering a nonzero level opens the mineshaft. Closing a mineshaft sets its level to 0; opening it from level 0 sets it to level 1.
- The Automated checkbox is editable when the mineshaft has an automation manager. Checking it raises the relevant manager to at least the minimum automation level. Because automation is currently derived from manager level, unchecking it sets that manager to level 0. Forge remains intrinsically automated.
- For a mineshaft that is not open, every value to the right of the Managers column is blank.
- The Upgrade Table should be shown as zebra lines, and its multipliers will be subject to toLocaleString.

## Cards Tab

- The "Goblin King" card has some weird one-off behavior. In-game the level is shown as 1 less than the actual internal level (this means that the first internal level is shown as level 0). For manual player input, assume that the Goblin King has been unlocked and is therefore at least owned: displayed level 0 maps to internal level 1 and its effect applies. A future imported save may contain real internal level 0; that means the Goblin King is locked, is not present on the grid, and its effect does not apply. Manual input does not need to expose that locked state at this point.
- Add a column named "Unlocked At" between Card Name and Rarity. For RankUpType=1, display `Mine {x}`. For RankUpType=2, resolve `MineUnlock` through the first zone's bottom-to-top map progression and display either `{formatted mineshaft name} mineshaft` or `Checkpoint {one-based checkpoint number}`. For RankUpType=3, resolve the global unlock rank through each mine's map progression and display the same description prefixed with `Mine {x}: `. Forge is the first mineshaft entry. A card assigned to the separate zone-completion rank is presented as the following mine's Forge unlock.
- For the localized manager description `Automate and increase the profit of the {0} mineshaft.`, treat `{0}` as the target mineshaft ID. Look up `mineshaft.name.{targetId}` and substitute the localized value into the description. Do not insert the raw target ID or the literal localization key. For example, target ID `spawningcart` must render as `Automate and increase the profit of the Forge mineshaft.`

## Goblins Tab

- Remove the Max Goblins label.
- Add the editable Goblin Purchase Level input described in DerivedCalculationsTable.tsx. Use a text field with `inputMode="numeric"` and keep an unconstrained draft while the user is typing, then parse, clamp, and commit the integer on blur or Enter. This avoids native number-input editing behavior and allows a user to type `23` when the minimum is `6` without the intermediate `2` immediately snapping back to `6`.

## Deliveries Tab

- Remove the Barrel Cycle Resets Every and Barrel Time Derivative Resets Every labels.
- A delivery is unlocked when `globalRank >= RankUnlock`. If `globalRank < RankUnlock`, keep the row visible but render the entire row as greyed-out/muted text. The same unlock predicate must be used anywhere delivery eligibility is calculated, including the active-delivery simulation.
- Rename the "Weight" column to "Raw Weight" and add a "Next Delivery %" column immediately to its right. Raw Weight displays the unchanged balance `Weight`. Calculate Next Delivery % from the effective odds weights of unlocked deliveries and display it to one decimal place. For Dynamite rows, the effective odds weight is `round(RawWeight * DeliveryDynamiteMult)`, but this adjusted value is not displayed in the Raw Weight column. The percentages of the unlocked rows must sum to 100% before display rounding. Locked rows display 0% and do not contribute to the denominator. At least one delivery will always be unlocked, so no zero-denominator fallback is required. Apply the muted color directly to locked-row cells so Bootstrap's striped-table cell colors cannot override it.
- Goblin delivery values use `max(GoblinPurchaseLevel + QuantityBase, 1)`, not GoblinCannonLevel.
- Dynamite delivery odds use `round(Weight * DeliveryDynamiteMult)` internally while continuing to display the original `Weight` as Raw Weight.
- The Values for Elixir should be changed to "??"
- The values for Dynamite should be changed to 1 (this is not fully implemented yet as the true number depends on goblins on the map, which has not been implemented.)
- Any row with a total that appears as "-1" should be changed to an infinity symbol.
- The Table should be zebra striped.

## Rocks Tab (NEW)

- Create this tab, but keep it saying "TBD".

## Gacha Tab

- Keep the Unlocked Checkpoints and Shafts, but it shouldn't have a left margin/be in a smaller container.
- Modify the "Cards+ Lvl" to be "Cards+ Level" and the level input should be like it is in its respective "Booster Pack" card input, not a dropdown.
- For both gacha tables:
  - If a value is guaranteed 0, it should be blank rather than "0".
  - the two possibilities for how many cards to get (like card, card + 1 count) should be separated by a new line.
  - The list of cards for each gacha in the scripted table should be separated by a new line, not a comma.
- For evergreen tables:
  - no column "crowns" should appear in either table
  - in the scripted table, GachaLegendary currently appears twice. Only the one that reports "x1 Legendary Card" should appear.
- For event tables:
  - For the non-scripted table, the "Common" and "Rare" columns should appear, as well as Elixir and Crowns. Preserve the current Crowns calculation: use Gacha[n]["LeaderboardCurrency"] and multiply it by GachaLeaderboardCurrencyMultNormal (or GachaLeaderboardCurrencyMultPremium or GachaLeaderboardCurrencyMultRare depending on its type.)

## Other

- .gng-number-input should have its text right-aligned. Any pertaining labels or column headers should also be right-aligned.
- Any time "/" is used in the interface to mean division, it should normally be replaced with a division symbol (line with dot above and below). `GoblinPurchasePrice` is the explicit exception and remains `/` for legibility.
- The localization key should be fully normalized to lowercase both in input and lookup.
- Every time we have something like {input_level} / x, the "/ x" should be `.text-secondary`
