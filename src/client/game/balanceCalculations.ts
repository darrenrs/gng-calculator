import { calculateFormula } from "./modifiers";
import type { ActiveState } from "../types/activeStateTypes";
import type { AggregatedEffects } from "../types/effectTypes";
import type { Card, MineShaft, Balance } from "../types/sourceBalanceTypes";
import { FormulaType } from "../types/sourceBalanceTypes";
import { aggregateEffects, buildNamedGlobalEffects } from "./effects";

export {
  buildNamedGlobalEffects,
  calculateNamedGlobalEffects,
} from "./effects";

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
  return base + buildNamedGlobalEffects(balance, activeState).GoblinLimitChange;
}

export function generatorIncome(
  balance: Balance,
  generatorId: string,
  source: MineShaft,
  level: number,
  cardLevels: Record<string, number>,
  checkpointCount: number,
  aggregatedEffects?: AggregatedEffects,
): { incomePerCycle: number; cycleSeconds: number } {
  const effects =
    aggregatedEffects ?? aggregateEffects(balance, cardLevels, checkpointCount);
  const targetMultiplier = effects.byGeneratorId[generatorId] ?? 1;
  const cycleSeconds =
    calculateFormula(source.GenerationDelaySecFormulaType, 0, {
      baseValue: source.GenerationDelaySecBase,
      multiplier: source.GenerationDelaySecMultiplier,
      growth: source.GenerationDelaySecGrowth,
    }) *
    (1 - effects.named.ProdTimePercentDecrease);
  const incomePerCycle =
    source.CurrencyOutputMultiplier *
    generatorLevelMultiplier(balance, generatorId, level) *
    targetMultiplier *
    effects.named.GeneratorCurrencyMult;

  return {
    incomePerCycle,
    cycleSeconds,
  };
}
