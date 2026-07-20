# Gold and Goblins Calculator Design Spec 6

## Purpose and status

This document is a handoff for the next implementation session. It records the recommended implementation order for save interpretation and the calculation cleanup that should precede it, along with the questions that remain unresolved.

This is a plan and evidence log, not a claim that every step has already been implemented. At the time this document was written, the save interpreter described below had not yet been implemented.

The goal is to add save loading without introducing another source of truth or making the current calculation files harder to follow.

## Intended state model

The API server will decode the save and return raw JSON. The browser will validate and interpret that JSON.

Loading a save should atomically replace the current editable `ActiveState` with a snapshot derived from the selected saved world. After loading, the user may edit any supported value manually. Those edits modify the same `ActiveState`; the imported save is not a second live source of truth. Loading a save again replaces the edited state with a newly interpreted snapshot.

Optional metadata may be retained for display and diagnostics, for example:

- which saved world was loaded;
- the save timestamp;
- the saved rank;
- whether the state has been manually modified since it was loaded.

This metadata must not compete with `ActiveState` when calculations are performed.

The intended calculation dependency direction is:

```text
Raw ActiveState inputs
  -> evaluated per-card and per-checkpoint effects
  -> aggregate named effects
  -> balance/domain calculations
  -> projections/view models
  -> UI
```

`projections.ts` may depend on balance calculations, but balance calculations must not depend on projections or UI-derived types.

## Recommended implementation order

### 1. Freeze and characterize the current behavior

Before reorganizing calculation code, establish a behavior-preserving baseline.

1. Run the current unit tests, type checking, and production build and record any pre-existing failures or TODO tests.
2. Add characterization tests for behavior that is currently believed to be correct, especially:
   - named global effects;
   - card and checkpoint stacking;
   - target-specific mineshaft effects;
   - mineshaft production and idle income;
   - ranks and `rankMultiplierIndex`;
   - delivery weights and known delivery values;
   - the existing example balance fixtures.
3. Treat `REWARDS.md` as the living record of live game observations. Convert its confirmed rows into named, balance-specific test cases without copying the entire document into test comments or this spec.
4. Keep uncertain behavior explicitly uncertain. In particular, do not invent a soft-currency delivery formula just to make the test suite complete.

The purpose of this step is to make the following refactor mechanically safe. Tests should distinguish confirmed game behavior from provisional calculator behavior.

### 2. Separate effect evaluation from domain calculations

Clean up the dependency boundary before adding save-derived inputs. Preserve behavior during this step.

Recommended modules:

| Module                   | Responsibility                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modifiers.ts`           | Generic formula evaluation only, such as `calculateFormula` and `calculateStatModifier`. `FormulaInput` may remain here if it is only used by these formula functions. |
| `effectTypes.ts`         | Shared non-UI types such as `EvaluatedEffect`, source information, aggregate effect types, and `NamedGlobalEffects`.                                                   |
| `effects.ts`             | Evaluate raw card/checkpoint inputs into per-source effects and aggregate them into named global and target-specific effects.                                          |
| `balanceCalculations.ts` | Pure balance math that consumes already-aggregated effects. It must not import projections or UI types.                                                                |
| `projections.ts`         | UI-oriented view models and table rows only. It calls domain calculations rather than defining the underlying rules.                                                   |

The effect layer should make all three stages inspectable:

1. raw inputs, such as card levels and opened checkpoints;
2. each card or checkpoint's evaluated contribution;
3. the final aggregate used by calculations.

An aggregate will probably need both global and target-specific sections, for example `{ global, byGeneratorId }`, because cards and managers can affect one mineshaft without being global effects.

Move UI labels, formatting rules, and applicability metadata out of `modifiers.ts`. Move `NamedGlobalEffects` out of UI-oriented `derivedTypes.ts`. Avoid repeatedly calling `buildNamedGlobalEffects` for the same state during one projection pass.

After this boundary is stable, large domain sections can be split further into modules such as:

- `rankCalculations.ts`;
- `deliveryCalculations.ts`;
- `gachaCalculations.ts`;
- per-view projection files for cards, mineshafts, deliveries, gacha, and summary.

This split is preferable to merely moving every `map()` call into another large file. The useful boundary is responsibility, not syntax.

Verification for this step should cover formula types 3, 8, and 11; additive and multiplicative checkpoint stacking; critical chance/power; applicability filtering; and generator-targeted effects.

### 3. Standardize numerical inputs and unlock terminology

Replace every numerical input in the application with one shared wrapper around the Base UI Number Field discussed previously. This is an application-wide migration, not a Goblin Purchase Level-only workaround.

The wrapper should provide consistent parsing, constraints, styling, and accessibility while allowing intermediate editing states. In particular:

- a user must be able to temporarily clear the field or type an incomplete value without the first keystroke being rejected by `min` validation;
- commit, normalization, and clamping should happen at the agreed commit boundary, such as blur or Enter, rather than after every character;
- Arrow Up and Arrow Down must continue to increment and decrement by the configured step;
- each use must be able to supply its own `min`, `max`, and `step`;
- the visible styling should remain compact, and visible increment/decrement buttons are not required;
- the shared wrapper, rather than each screen, should own draft-string handling and number conversion.

This removes the Goblin Purchase Level typing problem without maintaining a separate custom workaround for that field.

Also change the user-facing unlock criterion `Forge mineshaft` to `Beginning`. This is only a display-label change: the underlying rank/unlock position still represents the beginning/Forge position.

### 4. Define raw-save and parsed-save boundaries

The parser should accept `unknown`, validate it, and return application-owned parsed types. It should not cast the API response directly to trusted TypeScript interfaces.

Raw interfaces should describe protobuf JSON rather than application state. Suggested names are:

- `RawUniverseSave`;
- `RawWorldSave`;
- `RawZoneSave`;
- `RawGridCellSave`.

They must allow protobuf defaults to be omitted and 64-bit integers to arrive as strings. The parsed layer should use types such as:

```ts
interface ParsedSave {
  lastSavedAt: Date;
  hardCurrency: number;
  evergreen?: ParsedWorldSave;
  lte?: ParsedWorldSave;
}

interface DeliverySave {
  claimCount: number;
  nextDeliveryAt: Date;
  claimCountResetsAt: Date;
  duplicateCycleResetsAt: Date;
  claimedDuplicateIds: string[];
  claimedDuplicateCounts: number[];
}

interface FreeGachaSave {
  index: number;
  availableAt: Date;
}

interface RewardCycleSave {
  id: string;
  index: number;
}

interface CardSave {
  id: string;
  level: number;
}
```

The exact nesting may change, but raw save types, parsed save types, `ActiveState`, and UI projection types should remain distinct concepts.

Implement a shared .NET tick conversion using `BigInt` before converting to a JavaScript `Date`:

```ts
const DOTNET_UNIX_EPOCH_TICKS = 621355968000000000n;
const TICKS_PER_MILLISECOND = 10000n;

new Date(
  Number((BigInt(value) - DOTNET_UNIX_EPOCH_TICKS) / TICKS_PER_MILLISECOND),
);
```

`LastSave` is different: the example stores Unix seconds, not .NET ticks. Test the two conversions separately. A JavaScript `Date` is the parsed object; there is no native JavaScript `DateTime` type.

Known fixture details that the parser must honor:

- `StringMap` belongs to the world, not the zone.
- The actual duplicate-count field is `ClaimedDeliveryDupeCounts`.
- `FreeGachas` may be absent or empty.
- `ClearedCheckPointLevelVals` may be omitted and then means zero opened checkpoints.
- Enum value zero, `State: 0`, and numeric `Id: 0` may be omitted by protobuf JSON.
- An empty grid cell is represented by `{}`.
- A missing `Id` on key `x` can mean string-map index zero; it is not necessarily an unknown object.
- Balance delivery IDs should be normalized to strings at the parsing boundary.
- The example Evergreen grid is `7 * 48 = 336` cells and the LTE grid is `7 * 86 = 602` cells.

Fixture tests should assert representative root values, both worlds, timestamps, cards, delivery fields, checkpoint count, string-map lookup, and default-value omissions.

### 5. Add scalar `ActiveState` hydration

Hydrate the selected world into one new `ActiveState` object before publishing it to React. Do not partially update the existing state one field at a time.

The API response may contain `Evergreen` and optional `Lte` worlds. Parse the response once, then allow the user to explicitly choose `Load Main Mines` or `Load Event` when those worlds are available. Before exposing or accepting `Load Event`, validate that the saved LTE is the currently scheduled event:

```ts
world.BalanceId === Schedule[current].GameDataId;
```

If it does not match, report that the save's LTE is not the current scheduled event and do not hydrate it as the current event.

For the chosen world:

1. read its `BalanceId`;
2. load the matching balance if necessary;
3. parse the saved world;
4. build the complete replacement state using that balance;
5. commit the balance, zone selection, and `ActiveState` together.

The current effect that watches `selectedBalanceId` can race with hydration and reset state. Refactor this flow so a save load cannot briefly select a balance and then lose the imported values.

At this stage hydrate all non-map-dependent values:

- hard currency from the save root;
- world soft currency;
- zone core currency;
- opened checkpoint count;
- card levels;
- delivery state;
- free-gacha state;
- reward-cycle indexes;
- saved rank metadata for validation only;
- goblin purchase level and milestone progress using the resolved formula below.

Current currency values need dedicated state fields. Do not reuse `maximumCurrency`: that value is a calculation/table limit and is not the same as `Zone.CoreCurrencyValue`.

`DeliveryInput` is currently empty and should become real imported delivery state. Add equivalent state for reward cycles and free gacha where projections need it.

If the referenced balance cannot be loaded, report the error and leave the previous state untouched. Never apply a partial save.

### 6. Parse and resolve the saved map

Keep the map read-only for this implementation. Supporting a manually editable map would require incomplete user-entered occupancy, destructive terrain assumptions, movement tools, and two-way reconciliation that are far outside the value of the calculator.

Preserve the base balance cell and saved cell instead of destructively merging them:

```ts
interface ResolvedMapCell {
  index: number;
  rowFromBottom: number;
  column: number;
  checkpointIndex: number;
  base: ParsedBalanceCell | null;
  saved: ParsedSaveCell | null;
  effective: ParsedMapCell | null;
}
```

The saved grid is the authoritative current occupancy at every coordinate, including when a formerly nonblank base cell is now blank. Retaining `base` is still useful for diagnostics, checkpoint segmentation, and tooltips. A missing/null `InteractionValue` on a power-bearing target means that no damage has been applied and the target remains at full power.

Map parsing requirements:

1. Use the save/zone dimensions rather than a hard-coded width.
2. Interpret the save array from bottom-left:
   - `column = index % width`;
   - `rowFromBottom = Math.floor(index / width)`;
   - display rows must be flipped relative to the current top-oriented balance renderer.
3. Resolve string-map IDs from the world.
4. Support every observed key: `b`, `c`, `d`, `e`, `l`, `m`, `p`, `r`, `s`, `w`, `x`, and `y`.
5. Retain all raw attributes for diagnostics and tooltips, even if a calculation does not yet use them.
6. Resolve multi-cell anchors and covered cells after effective occupancy is known. A blank array entry can be covered by an adjacent multi-cell object.
7. Assign each coordinate to its checkpoint segment based on map position/base progression even when its content has been replaced.
8. Resolve targeted miners. Observed examples indicate `SecondaryLevel` is the zero-based column and `TertiaryLevel` is the zero-based, bottom-origin row, so the target index is `row * width + column`.
9. Calculate directions to a target object's footprint, not only its anchor. This matters for multi-cell rocks.
10. Grid delivery `SecondaryId` should be resolved against balance deliveries.

Add fixture tests for known mineshafts, checkpoints, goblins, blank overrides, dimensions, spans, and targeted-miner relationships.

### 7. Hydrate map-dependent calculation inputs

Once the map model is trustworthy, derive the remaining editable calculation inputs from it:

- open mineshafts and their levels;
- forge state;
- mineshaft saved state where useful for display; `State: 3` means a manually operated mineshaft has finished its cycle and is ready to collect, so it remains non-automated;
- manager/card-derived automation;
- checkpoint constraints;
- any map-derived rank inputs.

Do not treat every saved cell's `Level` identically. For a closed mineshaft, a saved level can represent its power requirement rather than an owned generator level. Use the semantic key, state, and string-map value together.

Read and retain `WORLD.Rank`, but never use it as the calculator's source of rank. Calculate `globalRank` from the canonical progression inputs. Immediately after save hydration, compare the two and call `console.warn` if they do not match. All calculations continue to use the derived `globalRank`, and manual progression edits recalculate it normally.

### 8. Wire the save-loading UI

Add the user-visible workflow only after parsing and hydration are independently tested.

The UI should:

- fetch/decode the save once;
- show which worlds are present;
- provide explicit `Load Main Mines` and, only after current-schedule validation, `Load Event` actions as applicable;
- show the save timestamp and selected balance;
- report validation or balance-loading failures without changing current inputs;
- indicate that the current inputs came from a save;
- mark the state as modified after a manual edit;
- clear the modified marker when a save is loaded again.

Manual editing remains fully allowed. Reloading is the explicit way to restore save-derived truth.

### 9. Integrate delivery, gacha, and reward-cycle save state

Use the parsed delivery object rather than scattering raw save fields through projection code.

- Combine claimed delivery IDs and counts by matching indexes. If their lengths differ, use only valid pairs and produce a diagnostic warning.
- Use parsed absolute dates for next-delivery and reset displays; calculate remaining durations at the UI boundary.
- Use imported free-gacha and reward-cycle indexes where the existing projections need a cycle position.
- Preserve current duplicate and unlock rules unless confirmed evidence requires a behavior change.

This step does not require the unknown soft-currency delivery formula to be solved.

### 10. Render the imported map snapshot

The map renderer is a snapshot viewer, not a visualization synthesized from manual progression inputs:

- Before a save has been loaded, render the pristine balance map. Changing the raw checkpoint count or opened mineshafts must not alter that map.
- After a save has been loaded, render the exact imported saved-map snapshot. Later manual changes must not move, open, close, destroy, or create map objects.
- If the user changes the checkpoint count or opened-mineshaft state after a save load, keep the snapshot unchanged and show a visible warning that the map no longer reflects the edited progression inputs.

Expose full saved/base attributes in diagnostic tooltips where useful.

If a user makes a structural progression edit after loading a save, do not invent corresponding rocks, goblins, barrels, or empty cells. Calculations still use the edited `ActiveState`; only the snapshot remains unchanged.

Do not add map editing, goblin dragging, terrain clearing, or partial manual occupancy entry as part of save interpretation.

### 11. Integration verification and documentation cleanup

Before considering save loading complete, verify at least these end-to-end cases:

1. load the Evergreen world from `example-save.json.old`;
2. load its LTE world;
3. confirm the correct balance is selected before state appears;
4. compare representative currencies, cards, checkpoints, ranks, mineshafts, deliveries, and map cells with the fixture;
5. edit imported inputs manually and confirm calculations change;
6. confirm that checkpoint/mineshaft edits leave the imported map unchanged and display the stale-snapshot warning;
7. load the save again and confirm the edits are replaced and the warning clears;
8. test an LTE whose `BalanceId` does and does not match `Schedule[current].GameDataId`;
9. test a missing LTE world and omitted protobuf defaults;
10. test an invalid save and unavailable balance without losing the prior state;
11. run unit tests, type checking, production build, and focused browser tests.

While doing this work, correct the terminology/typos in `DESIGN_SPEC_MAP.md`, including malformed table rows and the `InteractiveValue`/`InteractionValue` spelling, based on the actual save field.

## Resolved implementation decisions

### 1. Goblin purchase level and progress

The off-by-one behavior is confirmed. In Evergreen, `ReinforcementsLevel = 72` is one goblin away from a higher purchase level, and `ReinforcementsLevel = 73` produces the higher-level goblin.

For a positive reinforcement level, derive the base purchase level and progress as:

```ts
const stepsPerLevel = Math.round(1 / LevelMultiplier);
const basePurchaseLevel =
  Math.floor((ReinforcementsLevel - 1) / stepsPerLevel) + 1;
const progressSteps = (ReinforcementsLevel - 1) % stepsPerLevel;
```

If `ReinforcementsLevel` is zero or omitted, both the base purchase level and progress are zero. The editable value loaded into state is:

```ts
goblinPurchaseLevel = basePurchaseLevel + GoblinPurchaseLevelChange;
goblinPurchaseLevelProgress = progressSteps;
```

With Evergreen's eight purchases per level:

| `ReinforcementsLevel` | Base purchase level | Progress |
| --------------------: | ------------------: | -------: |
|                    72 |                   9 |      7/8 |
|                    73 |                  10 |      0/8 |

Card and checkpoint effects must be evaluated before applying `GoblinPurchaseLevelChange`.

### 2. Rank from the save is validation only

Use the calculator's derived `globalRank` for every calculation. Retain `WORLD.Rank` only to validate save hydration. If it differs from derived `globalRank`, issue a clear `console.warn` containing both values and enough world/balance context to diagnose the mismatch.

### 3. The map never follows manual progression edits

Without an imported save, the map remains the pristine balance map. With an imported save, it remains the imported snapshot. Checkpoint and opened-mineshaft inputs can always be edited and calculations should respond, but those edits never mutate the rendered map. After such an edit to imported state, show a visible stale-snapshot warning.

### 4. Validate LTE against the current schedule

Evergreen can be offered directly. An LTE world may be loaded as the current event only when `WORLD.BalanceId === Schedule[current].GameDataId`. A mismatch is a validation failure, not permission to silently switch to an old or different event balance.

### 5. Missing `InteractionValue` means full power

Because protobuf JSON omits default numeric zeroes, a missing/null interaction value on a power-bearing target means that no damage has been applied and the target is at full power.

### 6. Ready-to-collect mineshafts are manual

`State: 3` means that a manually operated mineshaft has finished running and is ready to collect. Treat it as non-automated. `State: 4` represents the automated state; manager/card requirements remain the calculation source for automation after manual edits.

## Questions still unresolved

No remaining question blocks the effect cleanup, input migration, raw-save parser, or base-map parser. The reward formulas below remain unresolved and must stay isolated as explicit calculation uncertainties. Continue adding live observations to `REWARDS.md`; resolve formulas only when its cases support a consistent rule.

## Known calculation uncertainties that do not block save interpretation

### Soft-currency deliveries

The soft-currency/elixir formula remains `Unknown`. Do not block the save parser or invent a universal formula.

Observed examples include:

- Pirate: rank 3 and weight 90 yielded 50;
- Pirate: rank 3 and weight 42 yielded 10;
- Pirate: rank 2 and weight 8 yielded 5;
- Evergreen rank 157 yielded 485, 80, and 28;
- Evergreen rank 158 yielded 485, 80, and 29.

These observations do not yet support one formula across balances.

### Core-currency delivery rank behavior

The current universal `globalRank - 1` assumption is not reliable across all observed events.

In Pirate with the actual rank field set to 2 and idle income of 7.68 K, observed delivery values were:

| Quantity multiplier | Observed value |
| ------------------: | -------------: |
|                 900 |        921.6 K |
|                 600 |        691.2 K |
|                 300 |        345.6 K |

Those values align with using rank 2 directly in the Pirate behavior being tested. Earlier Arctic evidence was closer to a different adjustment but was not exact. Keep this as a named domain uncertainty. Regardless of the eventual formula, its rank input must be the calculator's derived `globalRank`, not `WORLD.Rank`.

## Explicitly out of scope for this phase

- A fully editable map.
- Requiring users to reproduce the entire map manually.
- Automatically synthesizing terrain after manual progression edits.
- Resolving every unknown delivery formula before save loading.
- Rewriting all projection files in one pass without characterization tests.
- Treating the raw save, imported parsed save, and editable state as three competing live sources of truth.

## Completion criteria

This phase is complete when a decoded save can load either available world into a single editable `ActiveState`, using the correct balance, with tested time conversion, card/checkpoint/effect aggregation, currencies, progression, delivery/gacha cycle state, and an accurate read-only saved map. Every numerical field must use the shared Base UI Number Field wrapper. Manual edits must continue to work, structural progression edits must visibly mark an imported map snapshot as stale without changing it, and loading again must reliably replace the edits without race conditions or partial state.
