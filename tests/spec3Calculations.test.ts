import test from "node:test";
import assert from "node:assert/strict";
import { calculateFormula } from "../src/client/game/modifiers";
import {
  buildCardProjections,
  buildGoblinCostProjection,
  buildMineshaftProjections,
  buildSummaryProjection,
  formatGachaCount,
} from "../src/client/game/projections";
import { createDefaultActiveState } from "../src/client/types/activeStateTypes";
import {
  generatorIncome,
  generatorUpgradeCostAtLevel,
  generatorUpgradeCostRange,
  generatorUpgradeCostToNextObjective,
} from "../src/client/game/balanceCalculations";
import type { Balance } from "../src/client/types/sourceBalanceTypes";
import { FormulaType } from "../src/client/types/sourceBalanceTypes";

test("formula helper implements Spec 03 formula types", () => {
  assert.equal(
    calculateFormula(FormulaType.Quadratic, 3, {
      baseValue: 2,
      multiplier: 4,
      growth: 5,
    }),
    59,
  );
  assert.equal(
    calculateFormula(FormulaType.Exponential, 3, {
      baseValue: 2,
      multiplier: 4,
      growth: 5,
    }),
    502,
  );
  assert.equal(
    calculateFormula(FormulaType.RawExponential, 3, {
      baseValue: 2,
      growth: 5,
    }),
    250,
  );
  assert.equal(
    calculateFormula(FormulaType.InverseExpoRounded, 2, {
      baseValue: 10,
      multiplier: 100,
      growth: 0.5,
      power: 1,
      round: 5,
    }),
    70,
  );
});

test("raw exponential generator costs scale the base geometrically", () => {
  const balance = incomeBalanceFixture();
  const source = balance.MineShafts[0];
  const expectedFirstObjectiveCost = 32436.593969678655;

  assert.equal(generatorUpgradeCostAtLevel(source, 1), 512);
  assert.equal(generatorUpgradeCostAtLevel(source, 2), 512 * 1.46);
  assert.equal(
    generatorUpgradeCostRange(source, 1, 10),
    expectedFirstObjectiveCost,
  );

  balance.GeneratorObjectives[0].ObjectiveCount = [9];
  assert.equal(
    generatorUpgradeCostToNextObjective(balance, "amethyst", source, 1),
    expectedFirstObjectiveCost,
  );
});

test("gacha count formatter splits fractional counts into probabilities", () => {
  assert.equal(formatGachaCount(22.89), "23 (89%)\n22 (11%)");
  assert.equal(formatGachaCount(47.02), "48 (2%)\n47 (98%)");
  assert.equal(formatGachaCount(6), "6 (100%)");
  assert.equal(formatGachaCount(6.5), "7 (50%)\n6 (50%)");
  assert.equal(formatGachaCount(6.005), "7 (1%)\n6 (99%)");
});

test("generator income uses the nonzero currency output coefficient", () => {
  const balance = incomeBalanceFixture();
  const income = generatorIncome(
    balance,
    "amethyst",
    balance.MineShafts[0],
    1,
    {},
    0,
  );

  assert.equal(income.incomePerCycle, 400);
  assert.equal(income.cycleSeconds, 8);
});

test("spawn-time cards are displayed and applied as seconds, not percentages", () => {
  const balance = incomeBalanceFixture();
  const state = createDefaultActiveState(balance);
  state.cardsInput.ca029 = { level: 1, quantity: 0 };
  state.cardsInput.ca032 = { level: 2, quantity: 0 };
  state.mapInput.checkpointsOpened = 3;

  const cards = buildCardProjections(balance, state);
  assert.equal(
    cards.find((card) => card.card.Id === "ca029")?.effectLabel,
    "-1m 00s",
  );
  assert.equal(
    cards.find((card) => card.card.Id === "ca032")?.effectLabel,
    "-1m 00s",
  );
  assert.equal(
    buildGoblinCostProjection(balance, state).spawnIntervalSeconds,
    2160,
  );
});

test("active income uses deliveries calculated from idle income", () => {
  const balance = incomeBalanceFixture();
  const state = createDefaultActiveState(balance);
  state.mapInput.mineshaftIdsOpened = ["spawningcart", "amethyst"];

  const summary = buildSummaryProjection(balance, state);
  assert.equal(summary.idleIncomePerSecond, 1.5);
  assert.equal(summary.activeIncomePerSecond, 53);

  const amethyst = buildMineshaftProjections(balance, state).find(
    (mineshaft) => mineshaft.id === "amethyst",
  );
  assert.ok(amethyst);
  assert.equal(amethyst.incomePerSecond, 0);
  assert.equal(amethyst.activeIncomePerSecond, 50);
  assert.equal(amethyst.nextObjectiveCost, 512);
  assert.equal(amethyst.idleTimeToUpgrade, 512 / 1.5);
  assert.equal(amethyst.activeTimeToUpgrade, 512 / 53);
});

function incomeBalanceFixture(): Balance {
  return {
    Id: "fixture",
    BalanceProperties: [
      {
        ThemeId: "fixture",
        IsWorldEvergreen: false,
        RankUpType: 1,
        BaseUnitCap: 10,
        AntiCheatSettings: { CoreCurrencyMax: 1e100 },
        DeliveryDelaySecBase: 1,
        DeliveryDelaySecGrowth: 1,
        DeliveryClaimCountResetSec: 3600,
        DeliveryMaxDupesResetSec: 1,
      },
    ],
    Miners: [],
    Rocks: [],
    MineShafts: [
      {
        Id: "amethyst",
        WidthCells: 2,
        DepthCells: 3,
        GenerationDelaySecBase: 8,
        GenerationDelaySecMultiplier: 0,
        GenerationDelaySecGrowth: 0,
        GenerationDelaySecFormulaType: FormulaType.Quadratic,
        CurrencyType: 1,
        CurrencyOutputBase: 0,
        CurrencyOutputMultiplier: 400,
        CurrencyOutputGrowth: 0,
        CurrencyOutputFormulaType: FormulaType.Quadratic,
        UpgradeCostBase: 512,
        UpgradeCostMultiplier: 0,
        UpgradeCostGrowth: 1.46,
        UpgradeCostFormulaType: FormulaType.RawExponential,
      },
    ],
    Obstructions: [],
    MiningTargetHealths: [],
    GeneratorObjectives: [
      {
        GeneratorId: "amethyst",
        ObjectiveCount: [1],
        CoreCurrencyMultiplier: [2],
        SoftCurrencyRewardBase: 0,
        SoftCurrencyRewardMultiplier: 0,
        SoftCurrencyRewardGrowth: 0,
        SoftCurrencyRewardFormulaType: FormulaType.Quadratic,
      },
    ],
    Zones: [
      {
        Id: "zone1",
        Grid: ".,.,.,.,.,.,.,c:spawningcart:1,.,.,.,.,.,.,.,.,.,.,.,s:amethyst:1:gacha,.",
        RankMultipliers: [],
      },
    ],
    Reinforcements: [
      {
        LevelMultiplier: 0.25,
        CostMultiplier: 10,
        CostGrowth: 1.2,
      },
    ],
    SpawningCart: [
      {
        MinerIdCycle: ["tinygoblin"],
        SpawnLevelOffset: -1,
        SpawnDelaySecBase: 2400,
        SpawnDelaySecMultiplier: 0,
        SpawnDelaySecGrowth: 0,
        SpawnDelaySecFormulaType: FormulaType.Quadratic,
        GenerationDelaySecBase: 2,
        GenerationDelaySecMultiplier: 0,
        GenerationDelaySecGrowth: 0,
        GenerationDelaySecFormulaType: FormulaType.Quadratic,
        CurrencyType: 1,
        CurrencyOutputBase: 0,
        CurrencyOutputMultiplier: 3,
        CurrencyOutputGrowth: 0,
        CurrencyOutputFormulaType: FormulaType.Quadratic,
        UpgradeCostBase: 72,
        UpgradeCostMultiplier: 0,
        UpgradeCostGrowth: 1.43,
        UpgradeCostFormulaType: FormulaType.RawExponential,
      },
    ],
    CheckPoint: [],
    CardUpgradeCosts: [],
    Cards: [
      {
        Id: "ca029",
        Rarity: 3,
        MineUnlock: 1,
        SortingWeight: 99,
        StatModifierType: 7,
        ModifierBase: 0,
        ModifierMultiplier: 60,
        ModifierGrowth: 0,
        ModifierPower: 0,
        ModifierRound: 0,
        ModifierFormulaType: FormulaType.Quadratic,
        TargetIds: [],
        IsManager: false,
      },
      {
        Id: "ca032",
        Rarity: 3,
        MineUnlock: 40,
        SortingWeight: 94,
        StatModifierType: 8,
        ModifierBase: 0,
        ModifierMultiplier: 30,
        ModifierGrowth: 0,
        ModifierPower: 0,
        ModifierRound: 0,
        ModifierFormulaType: FormulaType.Quadratic,
        TargetIds: [],
        IsManager: false,
      },
    ],
    Gacha: [],
    Deliveries: [
      {
        Id: 1,
        RewardModel: [
          {
            RewardType: 0,
            DetailedType: "Core",
            Quantity: 1,
          },
        ],
        QuantityBase: 0,
        QuantityMultiplier: 1,
        QuantityGrowth: 1,
        QuantityPower: 0,
        QuantityRound: 0,
        QuantityFormulaType: FormulaType.Exponential,
        Weight: 1,
        MaxDupes: -1,
        RankUnlock: 0,
        CheckPointUnlock: 0,
        IsAd: false,
      },
    ],
    FreeGachaCycle: [],
    Spells: [],
  };
}
