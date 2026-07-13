# Design Spec 03 Implementation Checklist

Status legend: `[ ]` not started, `[~]` in progress, `[x]` complete, `[!]` deferred or blocked.

## Data Management

- [x] Add shared formula helpers for Quadratic, Exponential, Raw Exponential, and Inverse Expo Rounded.
- [~] Route formula-backed calculations through the shared formula helpers where Spec 03 defines a formula source.
- [~] Restructure stat modifier handling into pooled global and target-specific effects keyed by StatModifierType.
- [x] Preserve known special stacking behavior for checkpoint-per modifiers.
- [x] Remove unused stat modifier references for ProductionTimeDividerAllGenerators, SoftCurrencyMultAllRocks, and SoftCurrencyMultTargetGenObjective.
- [x] Keep objective elixir calculation on the existing/proven input path; do not add an unproven constant.
- [x] Keep Soft delivery value displayed as "Unknown".

## Derived State

- [x] Add derived data for global effects shown on Summary.
- [x] Add derived data for max goblin count.
- [~] Add derived map data for unlocked mineshafts, checkpoints, goblin levels, and remaining map power where source data supports it.
- [x] Add delivery reset timing derived from BalanceProperties.
- [x] Add gacha formatted card-count projection from Unlocked Checkpoints and Shafts.

## UI

- [x] Apply minimal number input styling across views.
- [x] Summary: replace input section with RankUpType display.
- [x] Summary: add global effects table.
- [x] Map: render grid objects with spans and a single coordinate conversion helper.
- [~] Map: add hover/tap selection border and Bootstrap tooltip text.
- [x] Map: add CSS classes for new SAVE_ROOT-only object keys.
- [x] Map: add checkpoint count, current goblin level, and max goblin count controls/display.
- [x] Mineshafts: match Spec 03 table columns.
- [x] Mineshafts: relabel Spawning Cart to Forge.
- [x] Mineshafts: dim unavailable rows.
- [x] Mineshafts: show objective multiplier, cost, and elixir gained; stop at AntiCheat max currency.
- [x] Cards: match Spec 03 table columns.
- [x] Cards: show level input with `/MAX_LEVEL`.
- [~] Cards: show formatted effect values from localization modifier codes.
- [x] Cards: show elixir allocated and remaining.
- [x] Cards: fill manager descriptions with mineshaft localization.
- [x] Goblins: zebra stripe table and shift reinforcement values one column earlier.
- [x] Goblins: show max goblins summary.
- [x] Deliveries: match Spec 03 table columns.
- [x] Deliveries: remove Active Delivery Income / Sec row.
- [x] Deliveries: show barrel reset timing above table.
- [x] Gacha: remove rank multiplier row.
- [x] Gacha: source regular gacha contents from Unlocked Checkpoints and Shafts.
- [x] Gacha: implement formatted count probability display.
- [x] Gacha: filter regular gacha to type 0, 1, 3 excluding GachaCrusher.
- [x] Gacha: add fixed chest table and Evergreen legendary row.

## Tests and Verification

- [x] Add focused tests for formula helpers and map coordinate conversion.
- [x] Add focused tests for gacha formatted count probability display.
- [x] Run TypeScript tests.
- [x] Run production build.
- [x] Smoke check Summary, Map, and Gacha in the browser.

## Progress Log

- Created checklist from docs/DESIGN_SPEC_03.md.
- Implemented shared formula helpers, conservative objective elixir calculation, modifier pool projection, and delivery reward normalization.
- Updated Summary, Map, Mineshafts, Cards, Goblins, Deliveries, and Gacha views for Spec 03 UI requirements.
- Added Spec 03 tests for formula helpers, map coordinate conversion, and gacha probability formatting.
- Verified with `npm test` and `npm run build`.
- Smoke checked the running app at http://localhost:5173/; Summary, Map, and Gacha rendered without console errors.
- Deferred/partial: full map goblin-level and remaining-power derivation needs parsed SAVE_ROOT map payloads; map tooltip uses native title text rather than Bootstrap JS; card effect formatting is stat-type based rather than fully parsed from every localization format string.
