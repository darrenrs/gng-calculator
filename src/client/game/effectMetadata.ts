import type { GlobalEffectId } from "../types/effectTypes";
import type { Balance } from "../types/sourceBalanceTypes";
import { StatModifierType } from "../types/sourceBalanceTypes";

// Modifiers for 14, 17, and 18 exist in game code but are not seen in cards.
export const STAT_MODIFIER_LOCALIZATION_KEYS: Record<number, string> = {
  1: "statbonus.minerunitcapaddition.name.long",
  2: "statbonus.reinforcementscostdivider.name",
  3: "statbonus.reinforcementscostdividerpercheckpoint.name.long",
  4: "statbonus.reinforcementsleveladdition.name.long",
  5: "statbonus.minercritchanceaddition.name.long",
  6: "statbonus.minercritpowermult.name.long",
  7: "statbonus.minerspawntimereduction.name.long",
  8: "statbonus.minerspawntimereductionpercheckpoint.name.long",
  9: "statbonus.corecurrencymulttargetgenerators.name.long",
  10: "statbonus.corecurrencymultallgenerators.name.long",
  11: "statbonus.corecurrencymultallgenpercheckpoint.name.long",
  12: "statbonus.corecurrencypercentallrocks.name.long",
  13: "statbonus.corecurrencypercentdeliveries.name.long",
  15: "statbonus.prodtimeinversepercentallgenerators.name.long",
  16: "statbonus.cardsmultallgacha.name.long",
  19: "statbonus.LteRewardsMult.name.long",
  20: "statbonus.dynamitedropchanceaddition.name.long",
  21: "statbonus.hardcurrencydoubleddropchanceaddition.name.long",
  22: "statbonus.dynamitepowermult.name.long",
  23: "statbonus.rocklegendarychestdropchanceaddition.name.long",
  24: "statbonus.crusherspeedaddition.name.long",
  25: "statbonus.crusherbombreduction.name.long",
  26: "statbonus.GoblinKing.name.long",
  27: "statbonus.AncestralPowerMult.name.long",
};

export const GLOBAL_EFFECT_LABELS: Record<GlobalEffectId, string> = {
  GoblinLimitChange: "Goblin Limit Change",
  GoblinPurchasePrice: "Goblin Discount",
  GoblinPurchaseLevelChange: "Goblin Purchase Level Change",
  GoblinBaseDamage: "Goblin Base Damage",
  GoblinCannonTimerChange: "Goblin Spawn Time Reduction",
  GeneratorCurrencyMult: "Global Generator Currency Multiplier",
  RockCurrencyMult: "Rock Currency Multiplier",
  DeliveryCurrencyMult: "Delivery Currency Multiplier",
  ProdTimePercentDecrease: "Production Time Percentage Decrease",
  CardsMult: "Chest Card Count Multiplier",
  LteRewardsMult: "Event Rewards Multiplier",
  DeliveryDynamiteMult: "Dynamite Delivery Odds Multiplier",
  RockDoubleGemsPercentChance: "Rock Double Gems Percent Chance",
  DynamiteBaseDamage: "Dynamite Base Damage",
  RockLegendaryChestMult: "Rock Legendary Chest Odds Multiplier",
  CrusherSpeedMult: "Crusher Speed Multiplier",
  CrusherBombInterval: "Crusher Bomb Time Interval",
  GoblinKingDamageModifier: "Goblin King Damage Effect",
};

export const GLOBAL_EFFECT_STAT_TYPES: Record<
  GlobalEffectId,
  StatModifierType[]
> = {
  GoblinLimitChange: [StatModifierType.MinerUnitCapAddition],
  GoblinPurchasePrice: [
    StatModifierType.ReinforcementsCostDivider,
    StatModifierType.ReinforcementsCostDividerPerCheckPoint,
  ],
  GoblinPurchaseLevelChange: [StatModifierType.ReinforcementsLevelAddition],
  GoblinBaseDamage: [
    StatModifierType.MinerCritChanceAddition,
    StatModifierType.MinerCritPowerMult,
    StatModifierType.AncestralPowerMult,
  ],
  GoblinCannonTimerChange: [
    StatModifierType.MinerSpawnTimeReduction,
    StatModifierType.MinerSpawnTimeReductionPerCheckPoint,
  ],
  GeneratorCurrencyMult: [
    StatModifierType.CoreCurrencyMultAllGenerators,
    StatModifierType.CoreCurrencyMultAllGenPerCheckPoint,
  ],
  RockCurrencyMult: [StatModifierType.CoreCurrencyPercentAllRocks],
  DeliveryCurrencyMult: [StatModifierType.CoreCurrencyPercentDeliveries],
  ProdTimePercentDecrease: [
    StatModifierType.ProdTimeInversePercentAllGenerators,
  ],
  CardsMult: [StatModifierType.CardsMultAllGacha],
  LteRewardsMult: [StatModifierType.LteRewardsMult],
  DeliveryDynamiteMult: [StatModifierType.DynamiteDropChanceAddition],
  RockDoubleGemsPercentChance: [
    StatModifierType.HardCurrencyDoubledDropChanceAddition,
  ],
  DynamiteBaseDamage: [StatModifierType.DynamitePowerMult],
  RockLegendaryChestMult: [
    StatModifierType.RockLegendaryChestDropChanceAddition,
  ],
  CrusherSpeedMult: [StatModifierType.CrusherSpeedAddition],
  CrusherBombInterval: [StatModifierType.CrusherBombReduction],
  GoblinKingDamageModifier: [StatModifierType.GoblinKing],
};

export function isGlobalEffectApplicable(
  balance: Balance,
  id: GlobalEffectId,
): boolean {
  if (id === "GoblinBaseDamage" && balance.Miners.length > 0) return true;
  if (id === "DynamiteBaseDamage" && balance.Spells.length > 0) return true;

  const types = new Set(GLOBAL_EFFECT_STAT_TYPES[id]);
  return (
    balance.Cards.some((card) => types.has(card.StatModifierType)) ||
    balance.CheckPoint.some((checkpoint) =>
      checkpoint.StatModifierType.some((type) => types.has(type)),
    )
  );
}
