## Global Effects Tab

I was thinking, it would be easiest if each individual effect got pooled into a broader total effect to be shown on the summary menu:

Global effects are accessed by their named ID, never by a numeric table index. The default is the identity value used when no source contributes to that effect.

| ID                          | Label                                 | Default | Source / combination                                                                                                                                       | Example                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------- | ------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GoblinLimit                 | Goblin Count Limit                    |       0 | Total sum of MinerUnitCapAddition (including checkpoints).                                                                                                 | +8                                                                                                                                                                                                                            |
| GoblinPurchasePrice         | Goblin Discount                       |       1 | Product of all StatModifierType=2 values and each StatModifierType=3 value raised to CheckpointsOpened.                                                    | If a StatModifierType=3 card has an effect of 100, one checkpoint is open, and the checkpoint supplies a StatModifierType=2 value of 100, the total effect is /10,000.                                                        |
| GoblinPurchaseLevel         | Goblin Purchase Level                 |       0 | Sum of ReinforcementsLevelAddition.                                                                                                                        | +5                                                                                                                                                                                                                            |
| GoblinBaseDamage            | Goblin Base Damage                    |       1 | Average goblin damage modifier calculated from base critical chance, base critical power, StatModifierType=5, StatModifierType=6, and StatModifierType=27. | BALANCE_ROOT["Miners"][0]["CritChanceBase"]=0; BALANCE_ROOT["Miners"][0]["CritPowerBase"]=2; StatModifierType=6=x32; StatModifierType=5=60%; StatModifierType=27=48% gives ((2\*32\*0.6) + (1\*0.4))\*(1+0.48) = **x57.424**. |
| GoblinCannonTimer           | Goblin Spawn Time Reduction           |       0 | Sum of all StatModifierType=7 values plus each StatModifierType=8 value multiplied by CheckpointsOpened.                                                   | -10m                                                                                                                                                                                                                          |
| GeneratorCurrencyMult       | Global Generator Currency Multiplier  |       1 | Product of all StatModifierType=10 values and each StatModifierType=11 value raised to CheckpointsOpened.                                                  | x64                                                                                                                                                                                                                           |
| RockCurrencyMult            | Rock Currency Percentage Increase     |       1 | 1 + the sum of StatModifierType=12.                                                                                                                        | StatModifierType=12 of 1080% produces 1,180%.                                                                                                                                                                                 |
| DeliveryCurrencyMult        | Delivery Currency Percentage Increase |       1 | 1 + the sum of StatModifierType=13.                                                                                                                        | StatModifierType=13 of 4860% produces 4,960%.                                                                                                                                                                                 |
| ProdTimePercentDecrease     | Production Time Percentage Decrease   |       0 | Sum of all StatModifierType=15 values.                                                                                                                     | 10%                                                                                                                                                                                                                           |
| CardsMult                   | Chest Card Count Multiplier           |       1 | 1 + the sum of StatModifierType=16.                                                                                                                        | x1.5                                                                                                                                                                                                                          |
| LteRewardsMult              | Event Rewards Multiplier              |       1 | 1 + the sum of StatModifierType=19.                                                                                                                        | x1.5                                                                                                                                                                                                                          |
| DeliveryDynamiteMult        | Dynamite Delivery Odds Multiplier     |       1 | 1 + the sum of StatModifierType=20.                                                                                                                        | x1.5                                                                                                                                                                                                                          |
| RockDoubleGemsPercentChance | Rock Double Gems Percent Chance       |       0 | Sum of StatModifierType=21.                                                                                                                                | 5%                                                                                                                                                                                                                            |
| DynamiteBaseDamage          | Dynamite Base Damage                  |       1 | 1 + the sum of StatModifierType=22.                                                                                                                        | x1.5                                                                                                                                                                                                                          |
| RockLegendaryChestMult      | Rock Legendary Chest Odds Multiplier  |       1 | 1 + the sum of StatModifierType=23.                                                                                                                        | x1.5                                                                                                                                                                                                                          |
| CrusherSpeedMult            | Crusher Speed Multiplier              |       1 | 1 + the sum of StatModifierType=24.                                                                                                                        | x1.5                                                                                                                                                                                                                          |
| CrusherBombInterval         | Crusher Bomb Time Interval            |       0 | StatModifierType=25.                                                                                                                                       | 15s                                                                                                                                                                                                                           |
| GoblinKingDamageModifier    | Goblin King Damage Effect             |       1 | 1 + the sum of StatModifierType=26.                                                                                                                        | x1.5                                                                                                                                                                                                                          |

### Per-Checkpoint Stacking Rules

The per-checkpoint modifier types do not all stack in the same way. Given a calculated card effect `value` and `CheckpointsOpened`:

- StatModifierType=3 (ReinforcementsCostDividerPerCheckPoint): `value ** CheckpointsOpened`.
- StatModifierType=8 (MinerSpawnTimeReductionPerCheckPoint): `value * CheckpointsOpened`.
- StatModifierType=11 (CoreCurrencyMultAllGenPerCheckPoint): `value ** CheckpointsOpened`.

Checkpoint-source modifiers use the operator represented by their destination effect:

- Multiplication and division effects stack multiplicatively. If one checkpoint supplies coefficient `value`, `CheckpointsOpened` checkpoints contribute `value ** CheckpointsOpened`.
- Integer addition and subtraction effects stack additively. If one checkpoint supplies `value`, `CheckpointsOpened` checkpoints contribute `value * CheckpointsOpened`.
- Percentage-addition effects are provisionally additive. Add the normalized percentage contribution from every opened checkpoint, then convert the total to a coefficient exactly once at the end: `1 + totalPercentageContribution`. If a balance stores percentages as whole numbers, normalize them at the source boundary before summing.

Do not apply `CheckpointsOpened` twice. Calculate the one-checkpoint value from the position-matched checkpoint modifier arrays, then apply the stacking rule above.

### Goblin Average Damage

The base critical chance is `BALANCE_ROOT["Miners"][0]["CritChanceBase"]`. StatModifierType=5 is added to that value. The base critical power is `BALANCE_ROOT["Miners"][0]["CritPowerBase"]`, and StatModifierType=6 multiplies it.

```text
critChance = CritChanceBase + sum(StatModifierType=5)
critPower = CritPowerBase * product(StatModifierType=6)

GoblinBaseDamage =
  ((critPower * critChance) + (1 * (1 - critChance)))
  * (1 + sum(StatModifierType=27))
```

For Arctic, both the base critical chance and the available critical-chance contribution are zero. The critical-hit term therefore contributes zero and the non-critical term contributes 100%, making the zero base critical power irrelevant.

### Derived Calculations

Global effects are referenced by the named IDs defined above. These calculations should be shown in another Summary table with the header "Derived Calculations."

- Goblin Limit (same as "Max Goblins"): `BaseUnitCap + GoblinLimit`.
- Goblin Purchase Price: all values in the Goblins table are divided by `GoblinPurchasePrice`.
- Goblin Purchase Level: the leftmost column in the Goblins table is increased by `GoblinPurchaseLevel`.
- Goblin Spawn Interval: `SpawnDelaySecBase - GoblinCannonTimer`. This value does not need to be clamped; valid balance and active-state inputs will not reduce it to zero or below.
- Idle Income: each generator that is open and automated contributes. Calculate each generator's base income from its level and manager, multiply it by `GeneratorCurrencyMult`, and multiply its rate by `1 / (1 - ProdTimePercentDecrease)`.
- Active Income: each generator that is open contributes, whether or not it is automated. Calculate each generator's base income from its level and manager, multiply it by `GeneratorCurrencyMult`, and multiply its rate by `1 / (1 - ProdTimePercentDecrease)`. Add the income rate from active delivery farming.
- `ProdTimePercentDecrease` does not need to be clamped; valid balance and active-state inputs will always keep it below 1.
- Delivery Income Values: Core delivery values use idle generator income as the currency input. Keep `globalRank` one-based in the derived model, but evaluate the Core delivery quantity curve at `max(globalRank - 1, 0)`. For the delivery inverse-exponential curve, use an effective power of `1`; do not apply the balance row's `QuantityPower`. Round the resulting raw inverse-exponential value to the nearest whole number before flooring it to the `QuantityRound` bucket. This intermediate whole-number step allows saturated rows to reach their configured maximum instead of remaining one bucket below it. These are delivery-specific, empirically derived rules and must not change Formula Type 3 behavior for rocks or other consumers. A previous implementation used active generator income and later evaluated delivery quantity at the constant `1`; both were errors. Active income is `active generator income + delivery income calculated from idle generator income`.
- Gacha: select `currentZone.RankMultipliers[rankMultiplierIndex]`. The read-only field currently labelled "Unlocked Checkpoints and Shafts" must display `rankMultiplierIndex`, even though the existing label is not accurate for every RankUpType. Gacha must not independently reconstruct the index from an opened-object count.

### Current Rank Multipliers Summary Table

Add a separate table to the Summary view containing every field from the currently selected `RankMultiplier` entry, including fields that are not yet consumed by another calculation.

Display the selected zone ID, `rankMultiplierIndex`, and `globalRank` immediately above the table. The table format is:

| ID                                  |                      Current Value |
| ----------------------------------- | ---------------------------------: |
| GachaCardsMultNormal                | Value from selected RankMultiplier |
| GachaCardsMultPremium               | Value from selected RankMultiplier |
| GachaCardsMultRare                  | Value from selected RankMultiplier |
| GachaLeaderboardCurrencyMultNormal  | Value from selected RankMultiplier |
| GachaLeaderboardCurrencyMultPremium | Value from selected RankMultiplier |
| GachaLeaderboardCurrencyMultRare    | Value from selected RankMultiplier |
| GachaSoftCurrencyMultNormal         | Value from selected RankMultiplier |
| GachaSoftCurrencyMultPremium        | Value from selected RankMultiplier |
| GachaSoftCurrencyMultRare           | Value from selected RankMultiplier |
| GenObjectiveSoftCurrencyMultiplier  | Value from selected RankMultiplier |
| MiningLeaderboardCurrencyMultiplier | Value from selected RankMultiplier |
| MiningSoftCurrencyMultiplier        | Value from selected RankMultiplier |

These are raw current values from the balance, not formatted global effects. Keep this table independent from whether a field is currently used elsewhere so it can serve as a diagnostic view while calculations are being verified.

## Rank Multiplier Selection and Elixir

The derived model must include these two separately named values:

```ts
type DerivedRankState = {
  rankMultiplierIndex: number;
  globalRank: number;
};
```

Do not retain a separate value named `localRankProgress`; `rankMultiplierIndex` replaces that name. When calculating `rankMultiplierIndex`, `MineshaftsOpened` includes the current-zone Forge/spawning cart.

| RankUpType | `rankMultiplierIndex`                                                            | `globalRank`                                                                                                                                 |
| ---------: | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
|          1 | `0`                                                                              | One-based current zone index                                                                                                                 |
|          2 | Current-zone open mineshafts including Forge + current-zone open checkpoints - 1 | Current-zone open mineshafts including Forge + current-zone open checkpoints                                                                 |
|          3 | Current-zone open mineshafts including Forge + current-zone open checkpoints - 1 | Previous-zone non-Forge mineshafts and checkpoints + completed previous zones + current-zone open mineshafts including Forge and checkpoints |

### RankUpType 1

```text
rankMultiplierIndex = 0
globalRank = one-based current ZoneIndex
selectedRankMultiplier = currentZone.RankMultipliers[0]
```

For example, Evergreen `zone157` has `globalRank = 157` and still uses `RankMultipliers[0]`.

### RankUpType 2

```text
rankMultiplierIndex =
  MineshaftsOpenedInCurrentZoneIncludingForge
  + CheckpointsOpenedInCurrentZone
  - 1

globalRank =
  MineshaftsOpenedInCurrentZoneIncludingForge
  + CheckpointsOpenedInCurrentZone
```

### RankUpType 3

```text
rankMultiplierIndex =
  MineshaftsOpenedInCurrentZoneIncludingForge
  + CheckpointsOpenedInCurrentZone
  - 1

globalRank =
  sum over each completed previous zone of (
    all non-Forge mineshafts in that zone
    + all checkpoints in that zone
    + 1 zone-completion rank
  )
  + MineshaftsOpenedInCurrentZoneIncludingForge
  + CheckpointsOpenedInCurrentZone
```

RankUpType 3 counts the Forge exactly once in `globalRank`: through the current-zone open-mineshaft list, which always contains Forge. Previous-zone contributions explicitly exclude Forge. Each completed previous zone contributes one separate zone-completion rank. `rankMultiplierIndex` also counts the current-zone Forge before subtracting 1 because it is the zero-based position within the current zone's RankMultiplier array.

### RankMultiplier Array Offset

For every RankUpType, `rankMultiplierIndex` is the actual zero-based JavaScript array index. Select the current entry using:

```text
selectedRankMultiplier =
  currentZone.RankMultipliers[rankMultiplierIndex]
```

For RankUpTypes 2 and 3, the always-open Forge makes the opened-object count start at 1; subtracting 1 converts that count to array offset 0. For example, two opened objects including Forge produce `rankMultiplierIndex = 1` and select `currentZone.RankMultipliers[1]`. RankUpType 1 always uses `rankMultiplierIndex = 0`.

Every RankUpType 2 and RankUpType 3 zone in the current balance data has exactly `total mineshafts excluding Forge + total checkpoints + 1 Forge entry` RankMultiplier entries. This matches `rankMultiplierIndex` values 0 through `RankMultipliers.length - 1`.

The same selection and rank rules must be used for manual active-state input and future imported-save input.

Christmas demonstrates the distinction. Its six zones contain 65 total non-Forge mineshaft/checkpoint ranks. Adding the single current-zone Forge rank and five completed-previous-zone ranks produces a maximum `globalRank` of 71. The zone-local RankMultiplier lengths are `[6, 9, 11, 14, 15, 16]`. Christmas zone 6 therefore uses `rankMultiplierIndex` values 0 through 15, while `globalRank` spans 56 through 71 in that zone.

### Rank-Dependent Source Fields

Ignore `Delivery.RankUnlock` for now. Do not use it to select a RankMultiplier or to filter delivery rows until its behavior is investigated separately.

Implement and expose `rankMultiplierIndex` and `globalRank` as distinct derived values; do not expose one ambiguous variable named only `rank` to all calculations.

### Soft Delivery Elixir

The formula input for a delivery whose reward `DetailedType` is `Soft` is **Unknown**. Continue displaying its calculated value as `Unknown`. Do not infer a formula from `MiningSoftCurrencyMultiplier` merely to make an observed value fit.

Keep `MiningSoftCurrencyMultiplier` visible in the Current Rank Multipliers summary table for diagnosis. The recorded Evergreen and Arctic values below remain observations for a future investigation, not passing implementation requirements for Spec 04.

### Generator Objective Elixir

Calculate the generator objective's base SoftCurrencyReward formula, multiply the unrounded result by the selected rank multiplier's `GenObjectiveSoftCurrencyMultiplier`, and only then round the result:

```text
unroundedObjectiveReward = calculateFormula(
  objective.SoftCurrencyRewardFormulaType,
  objectiveIndex + 1,
  objective SoftCurrencyReward parameters
)

ObjectiveElixir = round(
  unroundedObjectiveReward
  * selectedRankMultiplier.GenObjectiveSoftCurrencyMultiplier
)
```

Do not round the base objective reward before applying `GenObjectiveSoftCurrencyMultiplier`.

The Arctic observations at `rankMultiplierIndex = 3` confirm this rule. The selected fourth RankMultiplier entry has `GenObjectiveSoftCurrencyMultiplier = 1.3`:

| Generator | Objective level | Objective array index | Calculation                         | Observed and expected reward |
| --------- | --------------: | --------------------: | ----------------------------------- | ---------------------------: |
| Amethyst  |              40 |                     3 | `round((0 + 0.25 * (3 + 1)) * 1.3)` |                            1 |
| Amethyst  |              50 |                     4 | `round((0 + 0.25 * (4 + 1)) * 1.3)` |                            2 |
| Forge     |              60 |                     2 | `round((0 + 0.5 * (2 + 1)) * 1.3)`  |                            2 |
| Citrine   |              40 |                     1 | `round((0 + 1.5 * (1 + 1)) * 1.3)`  |                            4 |

The separately recorded Citrine level-20 reward of `2` is an Arctic zone/rank 3 observation, not an Evergreen observation. Arctic Citrine level 20 is the first objective, at objective-array index 0, so its unmultiplied reward is `0 + 1.5 * (0 + 1) = 1.5`. The early Arctic `GenObjectiveSoftCurrencyMultiplier` values still produce `2` after rounding; for example, the third RankMultiplier entry gives `round(1.5 * 1.2) = 2`. The observation therefore agrees with the same formula, although its rounded value alone does not distinguish between the nearby early RankMultiplier entries.

### Active Delivery Farming

Use the deterministic delivery-cycle behavior from `scripts/other-project-server.py.old`, with its intent made explicit:

1. Start with zero claimed duplicates and a delivery claim count of zero until save parsing supplies real current-cycle values.
2. Order eligible deliveries by descending `Weight`. Preserve balance-file order as the tie-breaker.
3. At each claim, choose the highest-weight delivery whose `MaxDupes` has not been reached. Treat `MaxDupes = -1` as unlimited.
4. Add the selected Core delivery's value to total Core income. Other reward types consume a delivery claim but add no Core income.
5. Schedule the next claim after `DeliveryDelaySecBase * DeliveryDelaySecGrowth ** claimCount`, then increment `claimCount`.
6. At every recurring `DeliveryClaimCountResetSec` boundary, reset `claimCount` to zero and advance the next claim-count-reset boundary by the same interval.
7. Simulate through one `DeliveryMaxDupesResetSec` cycle. At that boundary the finite duplicate counts reset. Active delivery income per second is the total Core value collected during the cycle divided by `DeliveryMaxDupesResetSec`.

The TypeScript implementation must sort by descending weight rather than choosing the first eligible balance row, and its claim-count reset boundary must recur rather than remaining fixed after the first reset.

## Testing

I really want to make sure that we have income and elixir working. Here are some real test cases with implications for idle and active income:

### Regression Test Inventory

Keep each real observation as its own named regression case. Cases whose formula is still unknown remain documented TODO tests. Executable tests should assert raw numeric values before also checking formatted display values.

| Case | Status          | Primary behavior covered                                     | Required inputs                                                                                                 | Expected output currently recorded                                 |
| ---- | --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1    | Documented TODO | Evergreen idle income feeding a Core delivery                | Exact selected zone/open-state snapshot, all card levels, checkpoint count, opened generators, generator levels | Delivery value `123.46 AN`                                         |
| 2    | Documented TODO | Evergreen Soft delivery elixir changing by selected mine     | Balance and selected mine                                                                                       | Mine 157: `485, 80, 28`; Mine 158: `485, 80, 29`                   |
| 3    | Documented TODO | Arctic RankMultiplier selection for Soft deliveries          | Balance and internal rank progress                                                                              | Rank ID 2: `50, 10, 5`; Rank ID 3 weight-8 delivery remains `5`    |
| 4    | Documented TODO | Active income using delivery values derived from idle income | Exact `globalRank`/map state, balance, generator levels, manager levels, and speed-card level                   | Gold deliveries: `1.32 M`, `480 K`, `240 K`                        |
| 5a   | Executable      | Generator-objective multiplier and rounding order            | Evergreen, selected zone/rank, Forge, objective index                                                           | Forge 340 and 350: `24`                                            |
| 5b   | Executable      | Arctic objective multiplier, indexing, and rounding          | Arctic, `rankMultiplierIndex = 3`, generator and objective index                                                | Amethyst 40: `1`; Amethyst 50: `2`; Forge 60: `2`; Citrine 40: `4` |
| 5c   | Executable      | Arctic first-objective indexing                              | Arctic zone/rank 3, Citrine, objective-array index 0                                                            | Citrine level 20: `2`                                              |
| 6    | Executable      | Generator upgrade costs                                      | Balance, generator, current level, next objective                                                               | Formula and real-balance regression values recorded below          |

When a test fails, keep the failure associated with its case number rather than changing an unrelated calculation to make the formatted result match. The cases intentionally cover separate layers: rank selection, base formula evaluation, global effects, rounding, and number formatting.

### Test Case 1

- Balance: evergreen
- Cards: all max
- Checkpoints opened: 1
- Generator levels: spawningcart 330, citrine 300, topaz 260, sapphire 200, emerald 180
- 123.46 AN currency from a delivery with QuantityBase=0.7, QuantityFormulaType=3, QuantityGrowth=0.01, QuantityMultiplier=200, QuantityPower=1.1, QuantityRound=1.

### Test Case 2

Balance: evergreen

Mine 157: elixir values 485, 80, 28 from deliveries at index 5-7.
Mine 158: elixir values 485, 80, 29 from deliveries at index 5-7.

nothing changed except the mine (or zone) number, so clearly that matters.

### Test Case 3

Balance: arctic

Internal rank ID: 2

Elixir value from weight 90: 50
Elixir value from weight 42: 10
Elixir value from weight 8: 5

Internal rank ID: 3

Elixir value from weight 8: still 5

### Test Case 4

Balance: arctic

- spawningcart: level 20, manager 1 (automated)
- amethyst: level 20, manager 2 (not automated)
- citrine: level 14, manager 1 (not automated)

Mineshaft speed level 1

First Gold delivery with a weight of 16 (quantitymultiplier 3600): 1.32 M
Second Gold delivery with a weight of 32 (quantitymultiplier 1200): 480 K
Second Gold delivery with a weight of 16 (quantitymultiplier 600): 240 K

“First” and “Second” identify the first or second occurrence of the specified weight among the Core-delivery rows in balance-list order. They do not identify different gameplay snapshots. This observation remains a documented TODO until the exact `globalRank`/map state is recorded and the remaining delivery-formula behavior can be verified without guessing.

## Function Organization

Everything dealing with rendering the map should go in its own file map.ts.
Keep everything else as-is for now.

## Other

- Generator upgrade cost uses FormulaType=2 (RawExponential): `UpgradeCostBase * UpgradeCostGrowth ** (currentLevel - 1)`. The cost for an objective range is the sum of that per-level cost from the starting level, inclusive, to the objective level, exclusive. The main mineshaft table and objective upgrade table must use the same shared calculation. Evergreen regression values include Forge level 1 through objective 10 = `4019.417549711379`, Amethyst level 1 through objective 10 = `32436.593969678655`, and Citrine level 1 through objective 10 = `294220.8616876006` before number formatting.
