import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDefaultActiveState } from "../src/client/game/activeStateTypes";
import { buildMapProjection } from "../src/client/game/projections";
import type { Balance } from "../src/client/game/sourceTypes";

test("map projection preserves display order and builds bottom-left progression order", () => {
  const balance = balanceFixture();
  const state = createDefaultActiveState(balance);
  const projection = buildMapProjection(balance, state);

  assert.equal(projection.displayRows[0][0].token, "e:exit:3:exit");
  assert.equal(projection.displayRows[1][0].token, "c:spawningcart:1");
  assert.equal(projection.progressionCells[0].token, "c:spawningcart:1");
  assert.equal(projection.progressionCells[2].token, "p:checkpoint:2:cp");
  assert.equal(projection.progressionCells[7].token, "e:exit:3:exit");
});

test("map projection uses dynamic and static map object sizes", () => {
  const balance = balanceFixture();
  const state = createDefaultActiveState(balance);
  const projection = buildMapProjection(balance, state);
  const cells = projection.displayRows.flat();

  assertCellSize(cells, "x:block", 2, 3);
  assertCellSize(cells, "r:rock:4", 1, 2);
  assertCellSize(cells, "s:mine:1:gacha:card:2", 3, 2);
  assertCellSize(cells, "c:spawningcart:1", 1, 5);
  assertCellSize(cells, "p:checkpoint:2:cp", 1, 5);
  assertCellSize(cells, "e:exit:3:exit", 1, 3);
});

test("map projection places multi-cell objects upward from bottom-left anchor", () => {
  const balance = balanceFixture();
  balance.Zones[0].Grid =
    ".,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,s:mine:1:gacha:card:2,.,.,.,.,.,.,.";
  const state = createDefaultActiveState(balance);
  const projection = buildMapProjection(balance, state);
  const cell = projection.displayRows
    .flat()
    .find((item) => item.kind === "mineshaft");

  assert.ok(cell);
  assert.equal(cell.row, 3);
  assert.equal(cell.col, 0);
  assert.equal(cell.rowSpan, 3);
  assert.equal(cell.colSpan, 2);
  assert.equal(cell.gridRowStart, 2);
  assert.equal(cell.gridColumnStart, 1);
});

test("rock map cells show level text without rock id detail", () => {
  const balance = balanceFixture();
  const state = createDefaultActiveState(balance);
  const projection = buildMapProjection(balance, state);
  const cell = projection.displayRows
    .flat()
    .find((item) => item.kind === "rock");

  assert.ok(cell);
  assert.equal(cell.label, "4");
  assert.equal(cell.detail, undefined);
});

test("christmas balance map parses expected token kinds", () => {
  const balance = JSON.parse(
    readFileSync("balance/balance_christmas.json", "utf8"),
  ) as Balance;
  const state = createDefaultActiveState(balance, "zone1");
  const projection = buildMapProjection(balance, state);
  const kinds = new Set(projection.displayRows.flat().map((cell) => cell.kind));

  assert.equal(kinds.has("obstruction"), true);
  assert.equal(kinds.has("rock"), true);
  assert.equal(kinds.has("mineshaft"), true);
  assert.equal(kinds.has("spawningCart"), true);
  assert.equal(kinds.has("checkpoint"), true);
  assert.equal(kinds.has("exit"), true);
});

function assertCellSize(
  cells: ReturnType<typeof buildMapProjection>["displayRows"][number],
  token: string,
  rowSpan: number,
  colSpan: number,
) {
  const cell = cells.find((item) => item.token === token);
  assert.ok(cell);
  assert.equal(cell.rowSpan, rowSpan);
  assert.equal(cell.colSpan, colSpan);
}

function balanceFixture(): Balance {
  return {
    Id: "fixture",
    BalanceProperties: [
      {
        ThemeId: "fixture",
        IsWorldEvergreen: false,
        AntiCheatSettings: { CoreCurrencyMax: 100000 },
        DeliveryDelaySecBase: 60,
        DeliveryDelaySecGrowth: 1,
        DeliveryClaimCountResetSec: 3600,
        DeliveryMaxDupesResetSec: 14400,
      },
    ],
    Obstructions: [{ Id: "block", WidthCells: 3, DepthCells: 2 }],
    Rocks: [
      {
        Id: "rock",
        MimicId: "",
        WidthCells: 2,
        DepthCells: 1,
        CoreCurrencySecondsFormulaType: 0,
        CoreCurrencySecondsBase: 0,
        CoreCurrencySecondsMultiplier: 0,
        CoreCurrencySecondsGrowth: 0,
        CoreCurrencySecondsPower: 0,
        CoreCurrencySecondsRound: 0,
        SoftCurrencyBase: 0,
        SoftCurrencyMultiplier: 0,
        SoftCurrencyGrowth: 0,
        SoftCurrencyFormulaType: 0,
        LeaderboardCurrencyBase: 0,
        LeaderboardCurrencyMultiplier: 0,
        LeaderboardCurrencyGrowth: 0,
        LeaderboardCurrencyFormulaType: 0,
        LeaderboardCurrencyVariance: 0,
        RewardCycle: [],
      },
    ],
    MineShafts: [
      {
        Id: "mine",
        WidthCells: 2,
        DepthCells: 3,
        GenerationDelaySecBase: 10,
        GenerationDelaySecMultiplier: 0,
        GenerationDelaySecGrowth: 0,
        GenerationDelaySecFormulaType: 0,
        CurrencyType: 1,
        CurrencyOutputBase: 0,
        CurrencyOutputMultiplier: 10,
        CurrencyOutputGrowth: 0,
        CurrencyOutputFormulaType: 0,
        UpgradeCostBase: 10,
        UpgradeCostMultiplier: 0,
        UpgradeCostFormulaType: 2,
        UpgradeCostGrowth: 1.1,
      },
    ],
    SpawningCart: [
      {
        GenerationDelaySecBase: 1,
        GenerationDelaySecMultiplier: 0,
        GenerationDelaySecGrowth: 0,
        GenerationDelaySecFormulaType: 0,
        CurrencyType: 1,
        CurrencyOutputBase: 0,
        CurrencyOutputMultiplier: 1,
        CurrencyOutputGrowth: 0,
        CurrencyOutputFormulaType: 0,
        UpgradeCostBase: 1,
        UpgradeCostMultiplier: 0,
        UpgradeCostFormulaType: 2,
        UpgradeCostGrowth: 1,
      },
    ],
    GeneratorObjectives: [],
    Zones: [
      {
        Id: "zone1",
        Grid: "e:exit:3:exit,x:block,r:rock:4,.,.,.,.,c:spawningcart:1,s:mine:1:gacha:card:2,p:checkpoint:2:cp,.,.,.,.",
        RankMultipliers: [],
      },
    ],
    Cards: [],
    CardUpgradeCosts: [],
    Gacha: [],
    CheckPoint: [],
    Reinforcements: [],
    Deliveries: [],
    Exit: {},
  };
}
