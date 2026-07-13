import { FormulaType, StatModifierType } from "../types/sourceBalanceTypes";

export type ModifierInput = {
  StatModifierType: StatModifierType;
  ModifierBase: number;
  ModifierMultiplier: number;
  ModifierGrowth: number;
  ModifierFormulaType?: FormulaType;
  ModifierPower?: number;
  ModifierRound?: number;
};

// Modifiers for 14, 17, 18 exist in game code but are not seen anywhere
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

export type FormulaInput = {
  baseValue: number;
  multiplier?: number;
  growth?: number;
  power?: number;
  round?: number;
};

export function calculateFormula(
  formulaType: FormulaType,
  level: number,
  input: FormulaInput,
): number {
  const baseValue = input.baseValue ?? 0;
  const multiplier = input.multiplier ?? 0;
  const growth = input.growth ?? 0;
  const power = input.power ?? 0;
  const round = input.round ?? 0;

  switch (formulaType) {
    case FormulaType.Quadratic:
      return growth * level ** 2 + multiplier * level + baseValue;
    case FormulaType.Exponential:
      return multiplier * growth ** level + baseValue;
    case FormulaType.RawExponential:
      return baseValue * growth ** level;
    case FormulaType.InverseExpoRounded: {
      const raw =
        baseValue + multiplier * (1 - Math.exp(-growth * level ** power));
      return round > 0 ? Math.floor(raw / round) * round : raw;
    }
    default:
      return 0;
  }
}

export function calculateStatModifier(
  input: ModifierInput,
  level: number,
): number {
  return calculateFormula(
    input.ModifierFormulaType ?? FormulaType.Quadratic,
    level,
    {
      baseValue: input.ModifierBase,
      multiplier: input.ModifierMultiplier,
      growth: input.ModifierGrowth,
      power: input.ModifierPower,
      round: input.ModifierRound,
    },
  );
}
