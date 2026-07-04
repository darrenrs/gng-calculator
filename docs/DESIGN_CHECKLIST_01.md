# DESIGN_SPEC_01 Implementation Checklist

## Repo / Cleanup

- [x] Review current dirty git state before editing.
- [x] Preserve unrelated user changes.
- [x] Remove unused Node/Express server code after Python API replacement works.
- [x] Remove obsolete `_OLD` type names once replacement types are wired.
- [x] Remove `enums.py` if still unused.
- [x] Keep generated folders ignored: `build/`, `dist/`, `balance/`, `node_modules/`.

## Python API

- [x] Create Python API entry point under `src/server/` or `api/`.
- [x] Choose and document backend framework.
- [x] Add `GET /api/health`.
- [x] Add `GET /api/balances`.
- [x] Add `GET /api/balances/:balanceId`.
- [x] Add `GET /api/schedule`.
- [x] Add `GET /api/localization`.
- [x] Add `POST /api/update` using existing UnityPy downloader logic.
- [x] Add `POST /api/save` based on `TMP_server.py`.
- [x] Ensure save endpoint returns decoded JSON only, with no gameplay interpretation.
- [x] Ensure API errors return JSON, not HTML.

## Vite / Client Integration

- [x] Update Vite dev proxy to point at Python API.
- [x] Update npm scripts for client-only JS workflow.
- [x] Keep `npm run build` building the React client.
- [x] Remove server TypeScript build scripts if Python fully replaces Node.
- [x] Verify frontend loads through Vite dev server.

## Source Types

- [x] Rename `types_defined.ts` to a clearer source type file.
- [x] Add source types for `Balance`, `BalanceProperties`, `MineShafts`, `SpawningCart`, `GeneratorObjectives`, `Zones`, `RankMultipliers`, `Cards`, `CardUpgradeCosts`, `Gacha`, and `CheckPoint`.
- [x] Fix source types to match raw JSON shape, even when ugly.
- [x] Create derived/calculation type file for runtime table/projection outputs.
- [x] Remove or replace `types.ts` old API-specific types.

## Localization / Schedule

- [x] Parse localization `X=Y` text on the client or via API response.
- [x] Add lookup helper with fallback to raw key/id.
- [x] Load LTE schedule from `lte_schedule.json`.
- [x] Display event names using `theme.{GameDataId}.name`.
- [x] Handle missing schedule/localization gracefully.

## Client State

- [x] Create one basic app state model.
- [x] Store selected balance id.
- [x] Store selected map/zone id.
- [x] Store card levels.
- [x] Store mineshaft levels.
- [x] Store checkpoint count.
- [x] Do not persist state across refresh.

## Views

- [x] Build header with favicon, title, and selected balance name.
- [x] Build balance dropdown/panel with schedule and all events.
- [x] Add section selector for Map, Mineshafts, Cards, Gacha, and Save.
- [x] Build Map view as raw 7-column table.
- [x] Build Cards view with sorted cards and level inputs.
- [x] Build Mineshafts view with level inputs, relevant cards, cycle income, cycle time, and income/sec.
- [x] Preserve existing Gacha behavior.
- [x] Build Save view with input and pretty-printed decoded JSON.
- [x] Keep footer unchanged.

## Formula Work

- [x] Implement StatModifierType formulas listed in spec.
- [x] Add supplied formula cases as lightweight tests or a smoke script.
- [x] Do not implement unsupported StatModifierTypes 14, 17, or 18.
- [x] Do not add unexplained magic coefficients.
- [x] Keep income calculation limited to mineshafts for v1.
  - Note: StatModifierType 23 follows the supplied smoke-check expected values, which imply a x100 display-scale factor despite the formula text saying `ModifierMultiplier * LEVEL`.

## Verification

- [x] Run frontend build.
- [x] Start Python API locally.
- [x] Verify `/api/health`.
- [x] Verify balance list loads.
- [x] Verify evergreen balance loads.
- [x] Verify schedule loads.
- [x] Verify localization loads.
- [x] Verify Map, Mineshafts, Cards, Gacha, and Save views render.
- [x] Note any skipped or blocked items under this checklist instead of deleting them.
  - `/api/update` was wired but not called during verification because it downloads external PlayFab/assetbundle data and mutates ignored `balance/` files.
  - `/api/save` was wired and the Save view renders, but a live save fetch was not attempted because it requires a real device id and the missing generated `gng_pb2.py` decoder to convert the protobuf payload to JSON.
