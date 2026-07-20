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
