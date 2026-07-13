# Gold and Goblins Calculator Design Spec 3

## Definitions

- Evergreen: Main "world" of the game. Always present from account genesis
- LTE/Event: Temporary "world" of the game. May or may not be present in save data
- Balance: A single JSON data file describing all configuration and properties of a specific "world" (Evergreen or LTE)
- BALANCE_ROOT: The object representation of the JSON balance file.
- SAVE_ROOT: The object representation of the protobuf-decoded JSON save file.
- "spawningcart" or "SpawningCart" is the internal name for the "Forge". Always use its associated localization value to the user.
- World_Type refers to ether "Evergreen" or "Lte" in the SAVE_ROOT.

## Objectives

The objectives for Part 3 of the design spec are as follows:

- Tighten up data specifications to be as closely aligned, both in naming conventions and in logic, to the game itself as possible.
- Finalize what tabs will be exposed in the UI and what information will be exposed in those tabs.
- Expand the testing suite to cover more categories.

## Data Management

### Specifications/Types

- sourceTypes: Raw data types directly from BALANCE_ROOT or SAVE_ROOT.
- activeStateTypes: Input, either manually entered by the player or autofilled from a parsed save file.
- derivedTypes: Uses sourceTypes and activeStateTypes to perform calculations/interpretations which will be displayed in the browser.

### StatModifierType

- derivedTypes should have a data type containing every single stat modifier. For every calculation that involves a formula, constants can be found in the sourceTypes and the input value is from activeStateTypes.
- There are four possible formula types: Quadratic, Exponential, Raw Exponential, Inverse Expo Rounded.
  - (0) Quadratic = growth\*level^2 + multiplier\*level + baseValue
  - (1) Exponential = multiplier * growth^level + baseValue
  - (2) RawExponential = baseValue * growth^level
  - (3) InverseExpoRounded = Math.floor((baseValue + multiplier * (1 - Math.exp(-growth * level^power))) / round) * round
- Instead of having custom logic for each formula, every single calculation will be piped through these four formulae in JS form. A non-exhaustive list is provided below.

Note that these are the base values, so StatModifierTypes effects are applied after these initial formulae.

StatModifierTypes should be collected into effect pools keyed by StatModifierType. Each effect is either global or target-specific, such as a mineshaft-specific card effect. The formula output gives the raw modifier value. That value is then interpreted according to the localization format for that StatModifierType:

- percentage increase: VALUE * (1 + modifier)
- percentage decrease: VALUE * (1 - modifier)
- raw delta: VALUE + modifier, or VALUE - modifier depending on the effect
- multiplier: VALUE * modifier

When multiple effects apply to the same target and StatModifierType, combine them in the same pool first, then apply the pooled value to the base calculation.

Note that the Variable Prefix will be followed by "Base, Multiplier, Growth, FormulaType, or Round"

| Root Key               | Description                                                                                                                                                           | Input                                                                                               | Variable Prefix                          | Round in Post-Processing                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| BalanceProperties      | Delivery cycle timing. Note that the timing cycle resets every DeliveryClaimCountResetSec and the list of collected deliveries resets every DeliveryMaxDupesResetSec. | Number within cycle (resets whenever DeliveryClaimCountResetSec criterion is met)                   | DeliveryDelay                            | No                                                                    |
| Miners[0]              | Goblin default crit chance (related to StatModifierType=5)                                                                                                            | Always 0                                                                                            | CritChance                               | No                                                                    |
| Miners[0]              | Goblin default crit power (related to StatModifierType=6)                                                                                                             | Always 0                                                                                            | CritPower                                | No                                                                    |
| Miners[0]              | Goblin damage when mining                                                                                                                                             | Level of the goblin                                                                                 | Damage                                   | No                                                                    |
| Rocks[n]               | LEAVE UNIMPLEMENTED. This part of the game is poorly documented and hard/not very fun to test.                                                                        | X                                                                                                   | X                                        | X                                                                     |
| MineShafts[n]          | Income base coefficient                                                                                                                                               | Always 0                                                                                            | CurrencyOutput                           | To nearest int                                                        |
| MineShafts[n]          | Base cycle time for mineshaft                                                                                                                                         | Always 0                                                                                            | GenerationDelaySec                       | No                                                                    |
| MineShafts[n]          | Upgrade Cost for next level                                                                                                                                           | Current Mineshaft Level - 1                                                                         | UpgradeCost                              | No                                                                    |
| GeneratorObjectives[n] | Amount of elixir from reaching a mineshaft objective                                                                                                                  | Unknown, just use "xth cumulative upgrade" for now                                                  | SoftCurrencyReward                       | To nearest int                                                        |
| Reinforcements[0]      | base Cost to purchase a goblin                                                                                                                                        | Total "reinforcements" index SAVE_ROOT[World_Type]["Zone"]["ReinforcementsLevel"]                   | Cost                                     | No                                                                    |
| Reinforcements[0]      | goblin level from purchasing it                                                                                                                                       | Total "reinforcements" index SAVE_ROOT[World_Type]["Zone"]["ReinforcementsLevel"]                   | Level                                    | To nearest int                                                        |
| SpawningCart[0]        | Base interval which a goblin delivery emanates from the cannon attached to the spawning cart/forge                                                                    | 0                                                                                                   | SpawnDelaySec                            | No                                                                    |
| SpawningCart[0]        | DIRECTIVE: INHERIT OTHER PROPERTIES FROM MINESHAFTS.                                                                                                                  | X                                                                                                   | X                                        | X                                                                     |
| CheckPoint[0]          | Definitely not confusing. This one has the values in separate arrays, position-indexed by by their StatModifierType in ELEMENT[StatModifierType].                     | Number of Checkpoints unlocked/opened                                                               | Indexed by position in Modifier\* arrays | No                                                                    |
| Cards[n]               | Researcher effect. Note that if TargetIds is array of len 0, it is global, else it only affects the listed mineshafts.                                                | Card Level                                                                                          | Modifier                                 | Depends, but do not round any for now we will clean this all up soon. |
| Deliveries[n]          | Value from a delivery. Note this is the only place in the game that uses QuantityFormulaType=3 and some values may not be 100% proven yet.                            | Depends on ELEMENT["RewardModel"]["DetailedType"]. See section "Delivery reward type" for more info | Quantity                                 | This uses InverseExpoRounded.                                         |
| Spells[0]              | Dynamite default crit chance (related to StatModifierType=5)                                                                                                          | Always 0                                                                                            | CritChance                               | No                                                                    |
| Spells[0]              | Dynamite default crit power (related to StatModifierType=6)                                                                                                           | Always 0                                                                                            | CritPower                                | No                                                                    |
| Spells[0]              | Dynamite damage inflicted on an object                                                                                                                                | Level of the dynamite (aka spell)                                                                   | Effect                                   | No                                                                    |

#### Amount of elixir from reaching a mineshaft objective

Input Unknown. Here are known outputs:

- GeneratorId=moonstone
- SoftCurrencyRewardBase=8
- SoftCurrencyRewardFormulaType=0
- SoftCurrencyRewardGrowth=0
- SoftCurrencyRewardMultiplier=16

| Mineshaft Level | Upgrade # | Output |
| --------------- | --------- | ------ |
| 280             | 14        | 1320   |
| 260             | 13        | 1240   |
| 240             | 12        | 1160   |
| 220             | 11        | 1080   |
| 200             | 10        | 1000   |
| 180             | 9         | 920    |
| 160             | 8         | 840    |
| 140             | 7         | 760    |
| 120             | 6         | 680    |
| 100             | 5         | 600    |
| 80              | 4         | 520    |
| 60              | 3         | 440    |
| 40              | 2         | 360    |
| 20              | 1         | 280    |

#### Delivery reward type

- tinygoblin - Value of goblin from the cannon which is always max(1, current goblin level from purchasing it - 1)
- Soft (AKA elixir) - THE INPUT IS UNKNOWN. We will leave this "unknown" until I can figure it out.
- Core (AKA currency) - The idle income rate per second, after all modifers.
- Dynamite - value of highest goblin physically on the map. If this is not available, display should say "Highest Goblin Level"

#### What each stat modifier affects

- MinerUnitCapAddition - Goblin Limit in the mine
- ReinforcementsCostDivider - Divides cost to purchase goblins
- ReinforcementsCostDividerPerCheckPoint - Divides cost to purchase goblins PER number of checkpoint opened (multiplies on each other)
- ReinforcementsLevelAddition - Adds 1 to the base goblin level.
- MinerCritChanceAddition - Adds to the chance that a critical hit occurs.
- MinerCritPowerMult - The power coefficient when a critical hit occurs.
- MinerSpawnTimeReduction - Decreases the time for another goblin to spawn from its base
- MinerSpawnTimeReductionPerCheckPoint - Decreases the time for another goblin to spawn from its base per number of checkpoints opened (additive)
- CoreCurrencyMultTargetGenerators - Multiplies the income of a SPECIFIC generator.
- CoreCurrencyMultAllGenerators - Multiplies the income of ALL generators.
- CoreCurrencyMultAllGenPerCheckPoint - Multiplies the income of ALL generators EVERY TIME a checkpoint is opened (multiplicative)
- CoreCurrencyPercentAllRocks - Percentage increase for currency output (just "Core" or currency) when a rock yields currency.
- CoreCurrencyPercentDeliveries - Percentage increase for currency output (just "Core" or currency) when a delivery yields currency.
- ProductionTimeDividerAllGenerators - UNUSED, please delete all references from code
- ProdTimeInversePercentAllGenerators - Decreases the cycle time of generators by this percentage.
- CardsMultAllGacha - Percentage increase the number of cards in all gacha of type 0, 1, or 3.
- SoftCurrencyMultAllRocks - UNUSED, please delete all references from code
- SoftCurrencyMultTargetGenObjective - UNUSED, please delete all references from code
- LteRewardsMult - Percentage increase event rewards
- DynamiteDropChanceAddition - Increase the odds of dynamites appearing from the deliveries (don't actually modify delivery calcs yet)
- HardCurrencyDoubledDropChanceAddition - Increase the odds of rocks dropping gems (or currency "Hard")
- DynamitePowerMult - increase the power (or effect) from dynamite sticks,
- RockLegendaryChestDropChanceAddition - increase the odds of a rock dropping a legendary chest.
- CrusherSpeedAddition - increase the speed of the crusher minigame (not worrying about this)
- CrusherBombReduction - increase the rate of bombs in the crusher minigame (not worrying about this)
- GoblinKing - this is the "y" character on the map, each goblin (or miner) in its perimeter has a power boost by that percentage.
- AncestralPowerMult - global percentage boost to goblins and dynamite stick power.

### Map

I will introduce the way the map is stored in save file so you can start to construct a better mental model of it.

- It is an array of length RxC SAVE_ROOT[World_Type]["Zone"]["Grid"], starting from the bottom left and going right, then up.
- If it is blank, the cell is NOT a root. (It is not necessarily blank though, as a larger object may allocate its space.)
- If it is a root object, the one-letter type identifier will be in "Key". More information is here but again, this is just to keep in mind for Spec 04.

Based on the contents of the SAVE_ROOT and BALANCE_ROOT, the derivedTypes will at least include the list of unlocked mineshafts e.g., {"amethyst": true, "citrine": false, ...}, list of checkpoints by if they're unlocked e.g., [true, false, false], total rank, an array of all goblin levels, and total power remaining in the entire map.

## UI

### General

- Any numerical input should have a much more minimal appearance. It must still be input type number, but it should have no background, a thin, grey bottom border, and no "up/down" selector adding unnecessary room. If specified, the "/x" (out of) text next to it will be the same style, just not editable and without the border.

### Summary Tab

- Remove the input section and replace it by the value of RankUpType formatted as "Rank Up Type: %s".
- Add a table at the bottom that displays all global effects (col1 = ID, col2 = effect value). Remember, if the global effect appears twice (from both a card and a checkpoint modifier), the two will be added to each other.

### Map Tab

- We want to make the map stuff as least confusing as possible when we start to add interactivity.
- The map should be represented as a grid with individual objects allowed to span from [1, GRID_COL_COUNT] cols and [1, GRID_ROW_COUNT] rows.
- When an object is hovered over (desktop) or tapped (desktop/mobile) a black 1px border must surround the object and a bootstrap native tooltip will appear showing the grid ID and position (if it's greater than 1x1 size just use where it appeared initially on the grid.) Example:
  - r:rockhardcurrencysmall:70 \n (Col 1, Row 48)
  - p:checkpoint:57:GachaForged \n (Col 2, Row 38)
- Obstructions (x) and blank cells will have no action when hovered or clicked over.
- We should begin to implement other objects. These ones will never appear in BALANCE_ROOT but may appear in SAVE_ROOT. This is NOT a final determinant of their contents, just kind of putting this out there.
  - "b" is a goblin barrel from the cannon. It should have a dark brown bg in the map.
  - "d" is a delivery barrel from the cannon. It should have a light brown bg in the map.
  - "l" is a dynamite from teh cannon. It should have a light red bg in the map.
  - "m" is a goblin on the map. It should have a Shrek green bg in the map.
  - "w" is a reward from a rock. It should have a gold bg in the map.
  - "y" is the "Goblin King". It should have a light purple bg in the map.
- Also all background should be stored as constants/in CSS somewhere with the css class "gng-map-cell-%s" where %s is the one-digit key.
- Besides the map itself, include the input for number of checkpoints unlocked (default 0, editable, shows "/NUMBER_OF_CHECKPOINTS" right after it), current goblin level (editable), and max goblin count. (Max goblin count will be a derived stat which is BalanceProperties["BaseUnitCap"] + cumulative value of MinerUnitCapAddition)

#### Coordinate Conversion

SAVE_ROOT grid index is zero-based. For index i:

- saveCol = (i % GRID_COL_COUNT) + 1
- saveRowFromBottom = Math.floor(i / GRID_COL_COUNT) + 1

CSS grid rows start at the top, so:

- cssColStart = saveCol
- cssRowStart = GRID_ROW_COUNT - saveRowFromBottom - rowSpan + 2
- grid-column: cssColStart / span colSpan
- grid-row: cssRowStart / span rowSpan

The transform from SAVE_ROOT to CSS GRID will take place in one common function.

For a 7x50 grid:

index 0 -> col 1, row 1
index 6 -> col 7, row 1
index 7 -> col 1, row 2
index 13 -> col 7, row 2
index 349 -> col 7, row 50

### Mineshafts Tab

The table should adhere to the following format:

| Mineshaft      | Open     | Level                                                                                                               | Managers      | Income per Cycle | Cycle Time    | Upgrade Cost  | Idle Time to Upgrade                      | Active Time to Upgrade                      |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------- | ------------- | ------------- | ----------------------------------------- | ------------------------------------------- |
| Mineshaft Name | Checkbox | Level input (include a nbsp because the formatting is getting screwed up with nothing besides a input box in there) | keep the same | keep the same    | keep the same | keep the same | Time to upgrade based on idle income rate | time to upgrade based on active income rate |

- "Spawning Cart" should be relabeled to Forge
- If a mineshaft is not available in this zone, the entire row text is to be dimmed out (slightly darker gray but not invisible on the bg).
- The Upgrade table should have this format:

| Objective | Multiplier | Cost | Elixir Gained |
| --------- | ---------- | ---- | ------------- |

And the elixir gained number can be calculated (formula still isn't known for sure, let's see if you can help withi that.)

Also stop the objective table when the AntiCheat max currency is hit.

### Cards Tab

The table should adhere to the following format:

| Card      | Rarity      | Level                                    | Effect           | Elixir Allocated                                                                                                                                                                                             | Elixir Remaining          | Description                    |
| --------- | ----------- | ---------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------ |
| Card Name | rarity Name | Input box with a "/MAX_LEVEL" next to it | Formatted effect | The cost to upgrade to level x + 2 is available at array index x of SAVE_ROOT["CardUpgradeCosts"]["Rarity"=RARITY]["SoftCurrency"]. Sum values up to index x + 1 for that has what's already been allocated. | Sum the REMAINING values. | Description from localization. |

- A more specific example of elixir allocated is, let's say SoftCurrency is [100, 200, 300, 400, 800, 1500, 3000, 6000]. When you get a card, it's automatically at level 1. Upgrading it to level 2, or index 0, is 100. Upgrading it to level 3, or index 1, is 200. Therefore if a card is at level 3, then you've spent 300 elixir. The remaining values are the rest of the cost, or 300 + 400 + 800 + 1500 + 3000 + 6000 = 12000.
- If it's a manager, fill in the {0} from the description localization with the value of mineshaft.name.{MineshaftId}
- Get the effect format string from statbonus.{StatModifierType}.value. Remove any HTML. Then you can tell how to format it from the string.

| Modifier Code | How to format        | Example                       |
| ------------- | -------------------- | ----------------------------- |
| +\{0\}%       | ROUND(INPUT * 100)   | 0.125 -> +13%; 10.8 -> +1080% |
| +\{0\}        | ROUND(INPUT)         | 5 -> +5                       |
| -\{0\}        | TIME_FORMAT(INPUT)   | 270 -> 4m 30s                 |
| \{0\}s        | ROUND(INPUT)         | 15 -> 15s                     |
| x{0}          | NUMBER_FORMAT(INPUT) | 1048576 -> x1.05 M            |

### Goblins Tab

- Table should be zebra striped (same common css as other tables)
- shift the first reinforcement number up by 1. So right now, the goblin price appearing in the "Goblin 2" column should be pushed to "Goblin 1". Therefore, every single cell will be in one position earlier.

On top have:

- "Max Goblins: %s" where %s is BalanceProperties["BaseUnitCap"] + whatever the goblin limit/count effect is.

### Deliveries Tab

The table should look like this

| Reward | Value | Weight | Collected | Total |
| ------ | ----- | ------ | --------- | ----- |

Keep the all deliveries total row but remove the "Active Delivery Income / Sec" row.

Above the table, have this:

- Barrel Cycle Resets Every {Time Formatted Seconds}
- Barrel Time Derivative Resets Every {Time Formatted Seconds}

### Gacha

Needs major improvements. Basically, the "rank multiplier row" shouldn't even be displaying. Instead, the gacha contents should be getting sourced from that value in "Unlocked Checkpoints and Shafts" which is changed in other locations.

#### Regular Table

| Chest                             | Common          | Uncommon*       | Rare            | EventEpic*      | Legendary*      | Elixir                              | Crowns                |
| --------------------------------- | --------------- | --------------- | --------------- | --------------- | --------------- | ----------------------------------- | --------------------- |
| localization gacha.name.{ChestId} | Formatted Count | Formatted Count | Formatted Count | Formatted Count | Formatted Count | {SoftCurrencyMin}-{SoftCurrencyMax} | {LeaderboardCurrency} |

\* For the headers Common, Uncommon, Rare, EventEpic, Legendary, only display them if IsWorldEvergreen=true. Also pass that ID through card.rarity.{CardTypeAllLowercase}.singular

For formatted count, it should be a function like this:

- 22.89 -> 23 (89%)\n22 (11%)
- 47.02 -> 48 (2%)\n47 (98%)
- 6.00 -> 6 (100%)
- 6.5 -> 7 (50%)\n6 (50%)
- 6.005 -> 7 (1%)\n6 (99%)

Note that if decimal part was .00, no second part reported.

If the smallest percentage number out of those two was less than 0.5%, then show as many decimal places as needed for it to be visible, and apply the same numebr of decimal places its counterpart percentage as well.

Only display gacha if they are type 0, 1, 3, and ID is NOT "GachaCrusher".

#### Fixed Table

For fixed chests (type=2), display them below.

| ID        | Cards                                                  | Elixir    | Crowns    |
| --------- | ------------------------------------------------------ | --------- | --------- |
| unchanged | show "x{COUNT} card.{CARD_ID}.name ({Card_ID}.rarity)" | unchanged | unchanged |

If IsWorldEvergreen=true, then display the following row first:

|GachaLegendary|x1 Legendary Card|0|0|

## Tests

Make sure they are all in one common location (but split by file)
