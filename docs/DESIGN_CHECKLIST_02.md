# DESIGN_SPEC_02 Implementation Checklist

## Repo / Planning

- [x] Review current dirty git state before editing.
- [x] Preserve unrelated user changes.
- [x] Keep ignored generated/data folders ignored: `build/`, `dist/`, `balance/`, `node_modules/`.
- [x] Note skipped or deferred spec items under this checklist instead of deleting them.

## Testing Approach

- [x] Add or choose a focused test runner for TypeScript pure logic.
- [x] Keep game logic in `.ts` calculation/projection modules instead of `.tsx` views where practical.
- [x] Add focused tests for active state defaults and updates.
- [x] Add focused tests for map CSV display order and bottom-left progression order.
- [x] Add focused tests for map object sizing rules.
- [x] Add a skeleton (But do not actually write) for tests for generator automation and income/sec behavior.
- [x] Add a skeleton (But do not actually write) for tests for summary projections.
- [x] Add a skeleton (But do not actually write) for tests for delivery active-income calculations once formulas are implemented.

## Source Types

- [x] Extend `sourceTypes.ts` for all Spec 2 balance fields used by calculations.
- [x] Add `AntiCheatSettings.CoreCurrencyMax` under `BalanceProperties`.
- [x] Add `Reinforcements`.
- [x] Add `Deliveries`.
- [x] Add `Obstructions`.
- [x] Add `Rocks`.
- [x] Add `Exit` if useful, even if currently an empty source object.
- [x] Add shared `MapSizedObject` source type for `Obstructions`, `Rocks`, and `MineShafts`.
- [x] Add `WidthCells` and `DepthCells` to `MineShaft`.
- [x] Keep spawning cart, checkpoint, and exit map sizes as derived projection rules, not source fields.
- [x] Add source save/protobuf JSON types needed for initial interpretation.
- [x] Add card rarity enum/type for source cards.

## Active State Types

- [x] Create `activeStateTypes.ts`.
- [x] Define `ActiveState` with schema version, balance id, selected zone id, and current player/app assumptions.
- [x] Define `MapInput` with `checkpointsOpened` and `mineshaftIdsOpened`.
- [x] Ensure `"spawningcart"` is always included in opened generator/mineshaft state.
- [x] Define `GoblinInput` with current goblin level and progress.
- [x] Define `CardInput` with lowercase `level` and `quantity`.
- [x] Define `GeneratorInput` with lowercase `level`.
- [x] Define blank/dummy `DeliveryInput` for future wiring.
- [x] Do not store derived income, display rows, manager lists, or map cell projections in active state.
- [x] Prepare active state for future localStorage serialization without persisting it yet unless explicitly implemented.

## Derived Types / Projections

- [x] Keep `derivedTypes.ts` for computed UI projection types only.
- [x] Add projection builders for cards, generators/mineshafts, map, summary, goblins, deliveries, and gacha as needed.
- [x] Build projections from `sourceTypes` + `activeStateTypes`.
- [x] Keep React views mostly responsible for rendering and event wiring.
- [x] Add shared time formatter matching Spec 2 thresholds.

## Navbar / Balance Selector

- [x] Restyle navbar/header with subtle separation from the main body.
- [x] Add desktop/tablet layout with icon, title, balance selector, overflow/dummy area, and About button.
- [x] Add mobile layout with balance selector on its own row.
- [x] Make About a link-style dummy button.
- [x] Filter schedule entries by local date against `EndDateTimeUtc`.
- [x] Override localization for `space1` and `space2`.
- [x] Rename "All Events" to "All Balances".
- [x] Show evergreen/Main Mines first with a stronger divider below it.
- [x] Sort LTE balance entries alphabetically by display name.
- [x] Highlight the selected schedule or direct balance entry.
- [x] Default schedule selections to `zone{ExclusiveZoneNumber}`.
- [x] Default direct balance selections to `zone1`.

## Body / Shared Layout

- [x] Add Summary, Goblins, and Deliveries tabs.
- [x] Change tab selector styling to full-width Bootstrap `.nav-tabs`.
- [x] Add persistent selected-zone selector immediately above the tab list.
- [x] Allow selected zone to be changed no matter which tab is active.
- [x] Apply 12px table font across all tables, including the map.
- [ ] Remove obsolete custom table CSS where Spec 2 calls for barebones Bootstrap tables.

## Summary Tab

- [x] Add Summary tab.
- [x] Show the getting-started label from the spec.
- [x] Add Input and Output sections.
- [x] Let Summary edit `activeState.map.checkpointsOpened`.
- [x] Let Summary edit `activeState.goblins.currentGoblinLevel`.
- [x] Clamp checkpoint input to the number of checkpoints in the current zone.
- [x] Display inactive income/sec and income/hour.
- [x] Display active income/sec and income/hour, including deliveries once available.
- [x] Ensure Summary owns no independent persisted state.

## Card Tab

- [x] Update table columns to Card Name, Rarity, Level, Effect, and Description.
- [x] Display rarity using `card.rarity.{rarityId}.singular`.
- [x] Display description using the `*.description` localization key.
- [x] Keep level input wired to active card state.
- [x] Show effect as an unformatted number for now.

## Mineshaft Tab

- [x] Treat `generators` as the code concept and "Mineshafts" as the UI label.
- [x] Show manager cards with level inputs in the Managers column.
- [x] Label manager entries by rarity.
- [x] Show automation requirements next to the relevant manager, such as `Auto at 11`.
- [x] Make Income / Sec zero when automation requirements are not met.
- [x] Derive current-zone mineshaft availability from the selected zone map.
- [x] Grey out and disable mineshafts that do not exist in the current zone.
- [x] Add one-mineshaft-at-a-time upgrade table controlled by a dropdown.
- [x] Include upgrade level/cost rows.
- [x] Include Elixir Gained column with placeholder/TBD behavior.

## Map Tab

- [x] Add complete map source types before parser implementation.
- [x] Parse raw `ZONE["Grid"]` CSV in display order from top-left to bottom-right.
- [x] Build separate progression order from bottom-left, left-to-right, then upward.
- [x] Split non-empty/non-period cells by `:`.
- [x] Render empty/period cells as grey blank cells.
- [x] Render obstructions from `Obstructions` using `DepthCells` and `WidthCells`.
- [x] Render rocks from `Rocks` using `DepthCells` and `WidthCells`.
- [x] Render mineshafts from `MineShafts` using `DepthCells` and `WidthCells`.
- [x] Render spawning cart with fixed size 1 row x 5 columns.
- [x] Render checkpoints with fixed size 1 row x 5 columns.
- [x] Render exits with fixed size 1 row x 3 columns.
- [x] Add mineshaft ids found in the current zone to the derived active-mineshaft list.
- [x] Show mineshaft display name, automation status, and income/cycle in map cells.
- [x] Show spawning cart income/cycle in its map cell.
- [ ] Apply checkpoint-open behavior that moves spawning cart into the nth checkpoint area.
- [x] Hide checkpoints at or below the opened checkpoint count.
- [x] Keep individual map cells square with horizontal scrolling when needed.
- [x] Do not allow direct map manipulation yet.

## Goblins Tab

- [x] Add source typing for `Reinforcements`.
- [x] Add goblin cost calculation.
- [x] Apply StatModifierType 4 to goblin level value.
- [x] Apply StatModifierType 2 and 3 to goblin cost reduction.
- [x] Generate goblin level/cost table until `CoreCurrencyMax`.
- [x] Use columns from label through `1 / LevelMultiplier`.
- [x] Adjust goblin row label for goblin-level stat modifier offset.

## Deliveries Tab

- [x] Add Deliveries tab.
- [x] Add source typing for delivery balance data.
- [x] Port/reference display behavior from `docs/DESIGN_SPEC_02_Appendix_A.js`.
- [x] Port/reference delivery cycle behavior from `docs/DESIGN_SPEC_02_Appendix_B.py`.
- [x] Implement delivery type enum.
- [x] Compute goblin delivery value.
- [x] Leave elixir delivery value as unknown/placeholder.
- [x] Compute gold delivery value from income/sec, quantity multiplier, and StatModifierType 13.
- [x] Display dynamite value as `Highest Goblin Lvl` placeholder.
- [x] Implement delivery timing from delay base/growth and claim count.
- [x] Implement claim-count reset interval.
- [x] Implement duplicate/reset cycle interval.
- [x] Derive active delivery farming income over the full four-hour interval.
- [x] Feed active delivery income into Summary output.
- [x] Defer individual collected delivery state until full save interpretation.

## Gacha Tab

- [x] Rename "Walls + Shafts open" to "Unlocked Checkpoints and Shafts".
- [x] Derive unlocked count from `checkpointsOpened + mineshaftIdsOpened.length`.
- [x] Wire StatModifierType 16 card level dropdown when available.
- [x] Preserve existing gacha table behavior.
- [x] Add scripted gacha table.
- [x] Show scripted gacha id.
- [x] Show guaranteed cards as `{GuaranteedCardIds} x{GuaranteedCardCounts}`, comma-separated.
- [x] Label `SoftCurrencyMin` as Elixir.
- [x] Label `LeaderboardCurrency` as Crowns.

## Save Tab

- [x] Keep Save tab visually unchanged for now.
- [x] Continue decoding successful PlayFab API responses to JSON using `gng_pb2.py`.
- [x] Display decoded JSON only.
- [x] Do not wire save import into active state yet unless the spec is updated.

## Verification

- [x] Run TypeScript tests.
- [x] Run existing smoke scripts.
- [x] Run frontend build.
- [x] Start Python API locally.
- [x] Verify `/api/health`.
- [x] Verify balance list, selected balance, schedule, and localization still load.
- [ ] Verify balance selector filtering, sorting, highlighting, and default-zone behavior.
- [x] Verify Summary, Map, Mineshafts, Cards, Goblins, Deliveries, Gacha, and Save views render.
- [ ] Verify active state updates flow across Summary, Cards, Mineshafts, Map, and Gacha.
- [x] Verify Christmas balance map parses expected `x`, `r`, `s`, `c`, `p`, and `e` tokens.
- [x] Verify mineshafts outside the selected zone are disabled.
- [ ] Verify inactive income excludes non-automated mineshafts.
- [x] Verify active income includes delivery projection once implemented.
- [ ] Verify responsive navbar and tab/zone controls on desktop and mobile widths.
- [x] Record any skipped verification with the reason.

## Notes / Deferred

- [ ] Spawning cart checkpoint relocation is not fully implemented yet. Opened checkpoints are hidden, but the cart is not moved into the nth checkpoint area.
- [ ] Obsolete table CSS was reduced but not fully removed; mineshaft sticky-table styling remains.
- [ ] Balance selector filtering/sorting/highlighting/default-zone behavior is implemented but not exhaustively browser-verified.
- [ ] Active-state update flow was browser-smoked through rendered tabs, but cross-tab edit propagation still needs targeted interaction tests.
- [ ] Inactive income exclusion for non-automated mineshafts is implemented in projections but still needs a dedicated test.
- [ ] Responsive navbar/tab controls were implemented in CSS but not screenshot-verified at mobile width.
- [ ] Delivery active-income math is a first implementation from the appendix/spec and should be validated against known expected values when available.
