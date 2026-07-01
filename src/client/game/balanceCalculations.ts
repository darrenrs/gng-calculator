import { calculateStatModifier } from "./modifiers";
import type { Card, MineShaft, Balance } from "./sourceTypes";

export function sortedCards(balance: Balance): Card[] {
  return [...balance.Cards].sort((a, b) => b.SortingWeight - a.SortingWeight);
}

export function maxCardLevel(balance: Balance, card: Card): number {
  const cost = balance.CardUpgradeCosts.find((item) => item.Rarity === card.Rarity);
  return cost ? cost.Duplicates.length + 1 : 1;
}

export function getGenerators(balance: Balance): Array<{ id: string; source: MineShaft }> {
  const spawningCart = balance.SpawningCart[0]
    ? [{ id: "spawningcart", source: balance.SpawningCart[0] }]
    : [];

  return [
    ...spawningCart,
    ...balance.MineShafts.map((source) => ({ id: source.Id ?? "unknown", source })),
  ];
}

export function managerCardsForGenerator(balance: Balance, generatorId: string): Card[] {
  return sortedCards(balance).filter(
    (card) => card.IsManager && card.TargetIds[0] === generatorId,
  );
}

export function globalGeneratorCards(balance: Balance): Card[] {
  return sortedCards(balance).filter(
    (card) => !card.IsManager && [10, 11, 15].includes(card.StatModifierType),
  );
}

export function checkpointModifier(
  balance: Balance,
  statModifierType: number,
  checkpointCount: number,
): number {
  const checkpoint = balance.CheckPoint[0];
  if (!checkpoint || checkpointCount <= 0) {
    return 0;
  }

  let total = 0;
  checkpoint.StatModifierType.forEach((type, index) => {
    if (type !== statModifierType) {
      return;
    }

    total +=
      calculateStatModifier(
        {
          StatModifierType: type,
          ModifierBase: checkpoint.ModifierBase[index] ?? 0,
          ModifierMultiplier: checkpoint.ModifierMultiplier[index] ?? 0,
          ModifierGrowth: checkpoint.ModifierGrowth[index] ?? 0,
        },
        checkpointCount,
      ) || (checkpoint.ModifierBase[index] ?? 0) * checkpointCount;
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
      let total = 0;
      for (let current = level; current < endLevel; current++) {
        total += source.UpgradeCostBase * source.UpgradeCostGrowth ** (current - 1);
      }
      return total;
    }
    startLevel = endLevel;
  }

  return null;
}

export function generatorIncome(
  balance: Balance,
  generatorId: string,
  source: MineShaft,
  level: number,
  cardLevels: Record<string, number>,
  checkpointCount: number,
): { incomePerCycle: number; cycleSeconds: number } {
  const targetCards = managerCardsForGenerator(balance, generatorId).filter(
    (card) => card.StatModifierType === 9,
  );
  const globalCards = globalGeneratorCards(balance);
  const cardMultiplier = [...targetCards, ...globalCards]
    .filter((card) => [9, 10, 11].includes(card.StatModifierType))
    .reduce((total, card) => {
      const value = calculateStatModifier(card, cardLevels[card.Id] ?? 0);
      if (card.StatModifierType === 11) {
        return total * value ** checkpointCount;
      }
      return total * value;
    }, 1);
  const checkpointMultiplier = checkpointModifier(balance, 10, checkpointCount) || 1;
  const speedReduction =
    globalCards
      .filter((card) => card.StatModifierType === 15)
      .reduce(
        (total, card) => total + calculateStatModifier(card, cardLevels[card.Id] ?? 0),
        0,
      ) + checkpointModifier(balance, 15, checkpointCount);
  const cycleSeconds = source.GenerationDelaySecBase * Math.max(0, 1 - speedReduction);
  const incomePerCycle =
    source.CurrencyOutputMultiplier *
    generatorLevelMultiplier(balance, generatorId, level) *
    cardMultiplier *
    checkpointMultiplier;

  return {
    incomePerCycle,
    cycleSeconds,
  };
}
