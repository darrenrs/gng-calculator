import type { StatModifierType } from "./sourceBalanceTypes";

export type GlobalEffectId =
  | "GoblinLimitChange"
  | "GoblinPurchasePrice"
  | "GoblinPurchaseLevelChange"
  | "GoblinBaseDamage"
  | "GoblinCannonTimerChange"
  | "GeneratorCurrencyMult"
  | "RockCurrencyMult"
  | "DeliveryCurrencyMult"
  | "ProdTimePercentDecrease"
  | "CardsMult"
  | "LteRewardsMult"
  | "DeliveryDynamiteMult"
  | "RockDoubleGemsPercentChance"
  | "DynamiteBaseDamage"
  | "RockLegendaryChestMult"
  | "CrusherSpeedMult"
  | "CrusherBombInterval"
  | "GoblinKingDamageModifier";

export type NamedGlobalEffects = Record<GlobalEffectId, number>;

export type EffectSource =
  | { kind: "card"; id: string; level: number }
  | { kind: "checkpoint"; id: string; checkpointCount: number };

export type EvaluatedEffect = {
  source: EffectSource;
  statModifierType: StatModifierType;
  targetIds: string[];
  valuePerApplication: number;
  applications: number;
  combinedValue: number;
};

export type AggregatedEffects = {
  evaluated: EvaluatedEffect[];
  named: NamedGlobalEffects;
  byGeneratorId: Record<string, number>;
};
