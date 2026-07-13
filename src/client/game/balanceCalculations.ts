import { calculateFormula, calculateStatModifier } from "./modifiers";
import type { ActiveState } from "../types/activeStateTypes";
import type { NamedGlobalEffects } from "../types/derivedTypes";
import type { Card, MineShaft, Balance } from "../types/sourceBalanceTypes";
import { FormulaType, StatModifierType } from "../types/sourceBalanceTypes";

export function sortedCards(balance: Balance): Card[] {
  return [...balance.Cards].sort((a, b) => b.SortingWeight - a.SortingWeight);
}

export function maxCardLevel(balance: Balance, card: Card): number {
  const cost = balance.CardUpgradeCosts.find(
    (item) => item.Rarity === card.Rarity,
  );
  return cost ? cost.Duplicates.length + 1 : 1;
}

export function getGenerators(
  balance: Balance,
): Array<{ id: string; source: MineShaft }> {
  const spawningCart = balance.SpawningCart[0]
    ? [{ id: "spawningcart", source: balance.SpawningCart[0] }]
    : [];

  return [
    ...spawningCart,
    ...balance.MineShafts.map((source) => ({
      id: source.Id ?? "unknown",
      source,
    })),
  ];
}

export function managerCardsForGenerator(
  balance: Balance,
  generatorId: string,
): Card[] {
  return sortedCards(balance).filter(
    (card) => card.IsManager && card.TargetIds[0] === generatorId,
  );
}

function checkpointModifier(
  balance: Balance,
  statModifierType: number,
  checkpointCount: number,
): number {
  const checkpoint = balance.CheckPoint[0];
  const multiplicative = isMultiplicativeModifier(statModifierType);
  if (!checkpoint || checkpointCount <= 0) {
    return multiplicative ? 1 : 0;
  }

  let total = multiplicative ? 1 : 0;
  checkpoint.StatModifierType.forEach((type, index) => {
    if (type !== statModifierType) {
      return;
    }

    const value = calculateStatModifier(
      {
        StatModifierType: type,
        ModifierBase: checkpoint.ModifierBase[index] ?? 0,
        ModifierMultiplier: checkpoint.ModifierMultiplier[index] ?? 0,
        ModifierGrowth: checkpoint.ModifierGrowth[index] ?? 0,
        ModifierFormulaType: checkpoint.ModifierFormulaType[index],
        ModifierPower: checkpoint.ModifierPower[index],
        ModifierRound: checkpoint.ModifierRound[index],
      },
      1,
    );
    if (multiplicative) {
      total *= value ** checkpointCount;
    } else {
      total += value * checkpointCount;
    }
  });

  return total;
}

export function generatorLevelMultiplier(
  balance: Balance,
  generatorId: string,
  level: number,
): number {
  const objective = balance.GeneratorObjectives.find(
    (item) => item.GeneratorId === generatorId,
  );
  if (!objective) {
    return Math.max(level, 1);
  }

  let multiplier = Math.max(level, 1);
  let nextLevel = 1;

  objective.ObjectiveCount.forEach((count, index) => {
    nextLevel += count;
    if (nextLevel <= level) {
      multiplier *= objective.CoreCurrencyMultiplier[index] ?? 1;
    }
  });

  return multiplier;
}

export function calculateGeneratorObjectiveElixir(
  balance: Balance,
  generatorId: string,
  objectiveIndex: number,
  genObjectiveSoftCurrencyMultiplier = 1,
): number | null {
  const objective = balance.GeneratorObjectives.find(
    (item) => item.GeneratorId === generatorId,
  );
  if (!objective) {
    return null;
  }

  const unroundedReward = calculateFormula(
    objective.SoftCurrencyRewardFormulaType ?? FormulaType.Quadratic,
    objectiveIndex + 1,
    {
      baseValue: objective.SoftCurrencyRewardBase,
      multiplier: objective.SoftCurrencyRewardMultiplier,
      growth: objective.SoftCurrencyRewardGrowth,
    },
  );

  return Math.round(unroundedReward * genObjectiveSoftCurrencyMultiplier);
}

export function generatorUpgradeCostToNextObjective(
  balance: Balance,
  generatorId: string,
  source: MineShaft,
  level: number,
): number | null {
  const objective = balance.GeneratorObjectives.find(
    (item) => item.GeneratorId === generatorId,
  );
  if (!objective) {
    return null;
  }

  let startLevel = 1;
  for (const count of objective.ObjectiveCount) {
    const endLevel = startLevel + count;
    if (level < endLevel) {
      return generatorUpgradeCostRange(source, level, endLevel);
    }
    startLevel = endLevel;
  }

  return null;
}

export function generatorUpgradeCostAtLevel(
  source: MineShaft,
  currentLevel: number,
): number {
  return calculateFormula(source.UpgradeCostFormulaType, currentLevel - 1, {
    baseValue: source.UpgradeCostBase,
    multiplier: source.UpgradeCostMultiplier,
    growth: source.UpgradeCostGrowth,
  });
}

export function generatorUpgradeCostRange(
  source: MineShaft,
  fromLevel: number,
  toLevel: number,
): number {
  let total = 0;
  for (let currentLevel = fromLevel; currentLevel < toLevel; currentLevel++) {
    total += generatorUpgradeCostAtLevel(source, currentLevel);
  }
  return total;
}

export function maxGoblinCount(
  balance: Balance,
  activeState: ActiveState,
): number {
  const base = balance.BalanceProperties[0]?.BaseUnitCap ?? 0;
  return base + buildNamedGlobalEffects(balance, activeState).GoblinLimit;
}

export function buildNamedGlobalEffects(
  balance: Balance,
  activeState: ActiveState,
): NamedGlobalEffects {
  return calculateNamedGlobalEffects(
    balance,
    Object.fromEntries(
      Object.entries(activeState.cardsInput).map(([id, input]) => [
        id,
        input.level,
      ]),
    ),
    activeState.mapInput.checkpointsOpened,
  );
}

export function calculateNamedGlobalEffects(
  balance: Balance,
  cardLevels: Record<string, number>,
  checkpointCount: number,
): NamedGlobalEffects {
  const globalCards = balance.Cards.filter((card) => !card.TargetIds.length);
  const values = (type: StatModifierType): number[] =>
    globalCards.flatMap((card) => {
      const level = cardLevels[card.Id] ?? 0;
      return card.StatModifierType === type && level > 0
        ? [calculateStatModifier(card, level)]
        : [];
    });
  const additive = (type: StatModifierType): number =>
    sum(values(type)) + checkpointModifier(balance, type, checkpointCount);
  const product = (type: StatModifierType): number =>
    values(type).reduce((total, value) => total * value, 1) *
    checkpointModifier(balance, type, checkpointCount);

  const critChance =
    (balance.Miners[0]?.CritChanceBase ?? 0) +
    additive(StatModifierType.MinerCritChanceAddition);
  const critPower =
    (balance.Miners[0]?.CritPowerBase ?? 0) *
    product(StatModifierType.MinerCritPowerMult);

  return {
    GoblinLimit: additive(StatModifierType.MinerUnitCapAddition),
    GoblinPurchasePrice:
      product(StatModifierType.ReinforcementsCostDivider) *
      values(StatModifierType.ReinforcementsCostDividerPerCheckPoint).reduce(
        (total, value) => total * value ** checkpointCount,
        checkpointModifier(
          balance,
          StatModifierType.ReinforcementsCostDividerPerCheckPoint,
          checkpointCount,
        ),
      ),
    GoblinPurchaseLevel: additive(StatModifierType.ReinforcementsLevelAddition),
    GoblinBaseDamage:
      (critPower * critChance + (1 - critChance)) *
      (1 + additive(StatModifierType.AncestralPowerMult)),
    GoblinCannonTimer:
      additive(StatModifierType.MinerSpawnTimeReduction) +
      values(StatModifierType.MinerSpawnTimeReductionPerCheckPoint).reduce(
        (total, value) => total + value * checkpointCount,
        checkpointModifier(
          balance,
          StatModifierType.MinerSpawnTimeReductionPerCheckPoint,
          checkpointCount,
        ),
      ),
    GeneratorCurrencyMult:
      product(StatModifierType.CoreCurrencyMultAllGenerators) *
      values(StatModifierType.CoreCurrencyMultAllGenPerCheckPoint).reduce(
        (total, value) => total * value ** checkpointCount,
        checkpointModifier(
          balance,
          StatModifierType.CoreCurrencyMultAllGenPerCheckPoint,
          checkpointCount,
        ),
      ),
    RockCurrencyMult:
      1 + additive(StatModifierType.CoreCurrencyPercentAllRocks),
    DeliveryCurrencyMult:
      1 + additive(StatModifierType.CoreCurrencyPercentDeliveries),
    ProdTimePercentDecrease: additive(
      StatModifierType.ProdTimeInversePercentAllGenerators,
    ),
    CardsMult: 1 + additive(StatModifierType.CardsMultAllGacha),
    LteRewardsMult: 1 + additive(StatModifierType.LteRewardsMult),
    DeliveryDynamiteMult:
      1 + additive(StatModifierType.DynamiteDropChanceAddition),
    RockDoubleGemsPercentChance: additive(
      StatModifierType.HardCurrencyDoubledDropChanceAddition,
    ),
    DynamiteBaseDamage: 1 + additive(StatModifierType.DynamitePowerMult),
    RockLegendaryChestMult:
      1 + additive(StatModifierType.RockLegendaryChestDropChanceAddition),
    CrusherSpeedMult: 1 + additive(StatModifierType.CrusherSpeedAddition),
    CrusherBombInterval: additive(StatModifierType.CrusherBombReduction),
    GoblinKingDamageModifier: 1 + additive(StatModifierType.GoblinKing),
  };
}

export function generatorIncome(
  balance: Balance,
  generatorId: string,
  source: MineShaft,
  level: number,
  cardLevels: Record<string, number>,
  checkpointCount: number,
): { incomePerCycle: number; cycleSeconds: number } {
  const effects = calculateNamedGlobalEffects(
    balance,
    cardLevels,
    checkpointCount,
  );
  const targetMultiplier = balance.Cards.filter(
    (card) =>
      card.StatModifierType ===
        StatModifierType.CoreCurrencyMultTargetGenerators &&
      card.TargetIds.includes(generatorId),
  ).reduce((total, card) => {
    const level = cardLevels[card.Id] ?? 0;
    return level > 0 ? total * calculateStatModifier(card, level) : total;
  }, 1);
  const cycleSeconds =
    calculateFormula(source.GenerationDelaySecFormulaType, 0, {
      baseValue: source.GenerationDelaySecBase,
      multiplier: source.GenerationDelaySecMultiplier,
      growth: source.GenerationDelaySecGrowth,
    }) *
    (1 - effects.ProdTimePercentDecrease);
  const incomePerCycle =
    source.CurrencyOutputMultiplier *
    generatorLevelMultiplier(balance, generatorId, level) *
    targetMultiplier *
    effects.GeneratorCurrencyMult;

  return {
    incomePerCycle,
    cycleSeconds,
  };
}

function isMultiplicativeModifier(statModifierType: number): boolean {
  return [
    StatModifierType.ReinforcementsCostDivider,
    StatModifierType.ReinforcementsCostDividerPerCheckPoint,
    StatModifierType.MinerCritPowerMult,
    StatModifierType.CoreCurrencyMultTargetGenerators,
    StatModifierType.CoreCurrencyMultAllGenerators,
    StatModifierType.CoreCurrencyMultAllGenPerCheckPoint,
  ].includes(statModifierType);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
