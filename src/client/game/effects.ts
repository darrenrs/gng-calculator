import type { ActiveState } from "../types/activeStateTypes";
import type {
  AggregatedEffects,
  EvaluatedEffect,
  NamedGlobalEffects,
} from "../types/effectTypes";
import type { Balance } from "../types/sourceBalanceTypes";
import { StatModifierType } from "../types/sourceBalanceTypes";
import { calculateStatModifier } from "./modifiers";

export function evaluateCardEffects(
  balance: Balance,
  cardLevels: Record<string, number>,
): EvaluatedEffect[] {
  return balance.Cards.flatMap((card): EvaluatedEffect[] => {
    const level = cardLevels[card.Id] ?? 0;
    if (level <= 0) return [];
    const value = calculateStatModifier(card, level);
    return [
      {
        source: { kind: "card", id: card.Id, level },
        statModifierType: card.StatModifierType,
        targetIds: [...card.TargetIds],
        valuePerApplication: value,
        applications: 1,
        combinedValue: value,
      },
    ];
  });
}

export function evaluateCheckpointEffects(
  balance: Balance,
  checkpointCount: number,
): EvaluatedEffect[] {
  if (checkpointCount <= 0) return [];
  return balance.CheckPoint.slice(0, 1).flatMap((checkpoint) =>
    checkpoint.StatModifierType.map((statModifierType, index) => {
      const value = calculateStatModifier(
        {
          StatModifierType: statModifierType,
          ModifierBase: checkpoint.ModifierBase[index] ?? 0,
          ModifierMultiplier: checkpoint.ModifierMultiplier[index] ?? 0,
          ModifierGrowth: checkpoint.ModifierGrowth[index] ?? 0,
          ModifierFormulaType: checkpoint.ModifierFormulaType[index],
          ModifierPower: checkpoint.ModifierPower[index],
          ModifierRound: checkpoint.ModifierRound[index],
        },
        1,
      );
      return {
        source: {
          kind: "checkpoint" as const,
          id: checkpoint.Id,
          checkpointCount,
        },
        statModifierType,
        targetIds: [],
        valuePerApplication: value,
        applications: checkpointCount,
        combinedValue: isMultiplicativeModifier(statModifierType)
          ? value ** checkpointCount
          : value * checkpointCount,
      };
    }),
  );
}

export function aggregateEffects(
  balance: Balance,
  cardLevels: Record<string, number>,
  checkpointCount: number,
): AggregatedEffects {
  const evaluated = [
    ...evaluateCardEffects(balance, cardLevels),
    ...evaluateCheckpointEffects(balance, checkpointCount),
  ];
  const byGeneratorId: Record<string, number> = {};
  for (const effect of evaluated) {
    if (
      effect.statModifierType !==
      StatModifierType.CoreCurrencyMultTargetGenerators
    ) {
      continue;
    }
    for (const targetId of effect.targetIds) {
      byGeneratorId[targetId] =
        (byGeneratorId[targetId] ?? 1) * effect.combinedValue;
    }
  }
  return {
    evaluated,
    named: namedEffectsFromEvaluated(balance, evaluated, checkpointCount),
    byGeneratorId,
  };
}

export function buildNamedGlobalEffects(
  balance: Balance,
  activeState: ActiveState,
): NamedGlobalEffects {
  return aggregateEffects(
    balance,
    Object.fromEntries(
      Object.entries(activeState.cardsInput).map(([id, input]) => [
        id,
        input.level,
      ]),
    ),
    activeState.mapInput.checkpointsOpened,
  ).named;
}

export function calculateNamedGlobalEffects(
  balance: Balance,
  cardLevels: Record<string, number>,
  checkpointCount: number,
): NamedGlobalEffects {
  return aggregateEffects(balance, cardLevels, checkpointCount).named;
}

function namedEffectsFromEvaluated(
  balance: Balance,
  evaluated: EvaluatedEffect[],
  checkpointCount: number,
): NamedGlobalEffects {
  const global = evaluated.filter((effect) => effect.targetIds.length === 0);
  const cards = (type: StatModifierType) =>
    global.filter(
      (effect) =>
        effect.source.kind === "card" && effect.statModifierType === type,
    );
  const checkpoints = (type: StatModifierType) =>
    global.filter(
      (effect) =>
        effect.source.kind === "checkpoint" && effect.statModifierType === type,
    );
  const additive = (type: StatModifierType): number =>
    sum(cards(type).map((effect) => effect.combinedValue)) +
    sum(checkpoints(type).map((effect) => effect.combinedValue));
  const product = (type: StatModifierType): number =>
    [...cards(type), ...checkpoints(type)].reduce(
      (total, effect) => total * effect.combinedValue,
      1,
    );
  const perCheckpointAdditive = (type: StatModifierType): number =>
    sum(
      cards(type).map((effect) => effect.valuePerApplication * checkpointCount),
    ) + sum(checkpoints(type).map((effect) => effect.combinedValue));
  const perCheckpointProduct = (type: StatModifierType): number =>
    cards(type).reduce(
      (total, effect) => total * effect.valuePerApplication ** checkpointCount,
      checkpoints(type).reduce(
        (total, effect) => total * effect.combinedValue,
        1,
      ),
    );

  const critChance =
    (balance.Miners[0]?.CritChanceBase ?? 0) +
    additive(StatModifierType.MinerCritChanceAddition);
  const critPower =
    (balance.Miners[0]?.CritPowerBase ?? 0) *
    product(StatModifierType.MinerCritPowerMult);

  return {
    GoblinLimitChange: additive(StatModifierType.MinerUnitCapAddition),
    GoblinPurchasePrice:
      product(StatModifierType.ReinforcementsCostDivider) *
      perCheckpointProduct(
        StatModifierType.ReinforcementsCostDividerPerCheckPoint,
      ),
    GoblinPurchaseLevelChange: additive(
      StatModifierType.ReinforcementsLevelAddition,
    ),
    GoblinBaseDamage:
      (critPower * critChance + (1 - critChance)) *
      (1 + additive(StatModifierType.AncestralPowerMult)),
    GoblinCannonTimerChange:
      additive(StatModifierType.MinerSpawnTimeReduction) +
      perCheckpointAdditive(
        StatModifierType.MinerSpawnTimeReductionPerCheckPoint,
      ),
    GeneratorCurrencyMult:
      product(StatModifierType.CoreCurrencyMultAllGenerators) *
      perCheckpointProduct(
        StatModifierType.CoreCurrencyMultAllGenPerCheckPoint,
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
