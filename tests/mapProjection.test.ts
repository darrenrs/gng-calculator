import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDefaultActiveState } from "../src/client/types/activeStateTypes";
import {
  balanceIndexToCssGrid,
  buildMapProjection,
} from "../src/client/game/projections";
import type { Balance } from "../src/client/types/sourceBalanceTypes";

test("map projection preserves BALANCE_ROOT source order for display", () => {
  const balance = balanceFixture();
  const state = createDefaultActiveState(balance);
  const projection = buildMapProjection(balance, state);

  assert.equal(projection.displayRows[0][0].token, "e:exit:3:exit");
  assert.equal(projection.displayRows[4][0].token, "c:spawningcart:1");
  assert.equal(projection.displayRows[3][5].token, "s:mine:1:gacha:card:2");
  assert.equal(projection.displayRows[3][0].token, "p:checkpoint:2:cp");
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

test("map projection places BALANCE_ROOT multi-cell objects up from lower-left source anchor", () => {
  const balance = balanceFixture();
  balance.Zones[0].Grid =
    ".,.,.,.,.,.,.,.,.,.,.,.,.,.,s:mine:1:gacha:card:2,.,.,.,.,.,.,.";
  const state = createDefaultActiveState(balance);
  const projection = buildMapProjection(balance, state);
  const cell = projection.displayRows
    .flat()
    .find((item) => item.kind === "mineshaft");

  assert.ok(cell);
  assert.equal(cell.row, 0);
  assert.equal(cell.col, 0);
  assert.equal(cell.rowSpan, 3);
  assert.equal(cell.colSpan, 2);
  assert.equal(cell.gridRowStart, 1);
  assert.equal(cell.gridColumnStart, 1);
});

test("balance index to CSS grid helper maps source-order corners", () => {
  assert.deepEqual(balanceIndexToCssGrid(0, 3), {
    saveCol: 1,
    sourceRow: 1,
    gridColumnStart: 1,
    gridRowStart: 1,
    colSpan: 1,
    rowSpan: 1,
  });
  assert.deepEqual(balanceIndexToCssGrid(2, 3), {
    saveCol: 3,
    sourceRow: 1,
    gridColumnStart: 3,
    gridRowStart: 1,
    colSpan: 1,
    rowSpan: 1,
  });
  assert.deepEqual(balanceIndexToCssGrid(6, 3), {
    saveCol: 1,
    sourceRow: 3,
    gridColumnStart: 1,
    gridRowStart: 3,
    colSpan: 1,
    rowSpan: 1,
  });
  assert.deepEqual(balanceIndexToCssGrid(8, 3), {
    saveCol: 3,
    sourceRow: 3,
    gridColumnStart: 3,
    gridRowStart: 3,
    colSpan: 1,
    rowSpan: 1,
  });
  assert.deepEqual(balanceIndexToCssGrid(6, 3, 2, 3), {
    saveCol: 1,
    sourceRow: 3,
    gridColumnStart: 1,
    gridRowStart: 1,
    colSpan: 2,
    rowSpan: 3,
  });
});

test("map projection keeps obstruction roots renderable and marks only covered cells", () => {
  const balance = balanceFixture();
  const state = createDefaultActiveState(balance);
  const projection = buildMapProjection(balance, state);
  const cells = projection.displayRows.flat();
  const root = cells.find((item) => item.token === "x:block");

  assert.ok(root);
  assert.equal(root.kind, "obstruction");
  assert.equal(root.covered, false);
  assert.equal(root.rowSpan, 2);
  assert.equal(root.colSpan, 3);
  assert.equal(cells.filter((item) => item.covered).length >= 5, true);
});

test("shipped balance map spans do not cover other root tokens", () => {
  const balanceFiles = [
    "balance_arctic.json",
    "balance_candy.json",
    "balance_christmas.json",
    "balance_easter.json",
    "balance_evergreen.json",
    "balance_halloween.json",
    "balance_harvest.json",
    "balance_jungle.json",
    "balance_minicard.json",
    "balance_minielixir.json",
    "balance_minigem.json",
    "balance_pirate.json",
    "balance_space1.json",
    "balance_space2.json",
    "balance_summer.json",
    "balance_valentine.json",
    "balance_volcano.json",
  ];

  for (const file of balanceFiles) {
    const balance = JSON.parse(
      readFileSync(`balance/${file}`, "utf8"),
    ) as Balance;
    const state = createDefaultActiveState(balance, "zone1");
    const projection = buildMapProjection(balance, state);
    const coveredRoots = projection.displayRows
      .flat()
      .filter((cell) => cell.covered && cell.token && cell.token !== ".");

    assert.deepEqual(coveredRoots, [], file);
  }
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
        RankUpType: 1,
        BaseUnitCap: 10,
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
        MinerIdCycle: [],
        SpawnLevelOffset: 0,
        SpawnDelaySecBase: 1,
        SpawnDelaySecMultiplier: 0,
        SpawnDelaySecGrowth: 0,
        SpawnDelaySecFormulaType: 0,
      },
    ],
    GeneratorObjectives: [],
    Zones: [
      {
        Id: "zone1",
        Grid: "e:exit:3:exit,.,.,.,.,.,.,.,.,.,.,.,.,.,x:block,.,.,r:rock:4,.,.,.,p:checkpoint:2:cp,.,.,.,.,.,.,c:spawningcart:1,.,.,.,.,.,.,.,.,.,.,.,s:mine:1:gacha:card:2,.",
        RankMultipliers: [],
      },
    ],
    Cards: [],
    CardUpgradeCosts: [],
    Gacha: [],
    CheckPoint: [],
    Reinforcements: [],
    Deliveries: [],
    Miners: [],
    MiningTargetHealths: [],
    FreeGachaCycle: [],
    Spells: [],
  };
}
