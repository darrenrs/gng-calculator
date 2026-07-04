export type ModifierInput = {
  StatModifierType: number;
  ModifierBase: number;
  ModifierMultiplier: number;
  ModifierGrowth: number;
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

// These have not been 100% proven correct because some StatModifierTypes are
// associated with "zero" values in balance data that may or may not be included
// in the actual formulae. Existing test cases do not reflect all theoretical
// combinations of values and focus only on those that appear in practice.
export function calculateStatModifier(
  input: ModifierInput,
  level: number,
): number {
  const { ModifierBase, ModifierMultiplier, ModifierGrowth, StatModifierType } =
    input;

  switch (StatModifierType) {
    case 1:
      return level;
    case 2:
      return ModifierMultiplier * ModifierGrowth ** level;
    case 3:
      return ModifierMultiplier * ModifierGrowth ** level;
    case 4:
      return level;
    case 5:
      return level * (ModifierMultiplier + ModifierGrowth * level);
    case 6:
      return ModifierMultiplier * ModifierGrowth ** level;
    case 7:
      return ModifierMultiplier * level;
    case 8:
      return ModifierMultiplier * level;
    case 9:
      return ModifierMultiplier * ModifierGrowth ** level;
    case 10:
      return ModifierMultiplier * ModifierGrowth ** level;
    case 11:
      return ModifierMultiplier * ModifierGrowth ** level;
    case 12:
      return ModifierBase + ModifierGrowth * level ** 2;
    case 13:
      return level * (ModifierMultiplier + ModifierGrowth * level);
    case 15:
      return level * (ModifierMultiplier + ModifierGrowth * level);
    case 16:
      return level * (ModifierMultiplier + ModifierGrowth * level);
    case 19:
      return level * ModifierMultiplier;
    case 20:
      return ModifierBase + ModifierMultiplier * level;
    case 21:
      return (
        ModifierBase + ModifierMultiplier * level + ModifierGrowth * level ** 2
      );
    case 22:
      return (
        ModifierBase + ModifierMultiplier * level + ModifierGrowth * level ** 2
      );
    case 23:
      return ModifierMultiplier * level * 100;
    case 24:
      return level * (ModifierMultiplier + ModifierGrowth * level);
    case 25:
      return ModifierBase + ModifierMultiplier * level;
    case 26:
      return ModifierBase + ModifierMultiplier * (level + 1);
    case 27:
      return ModifierBase + ModifierGrowth * level ** 2;
    default:
      return 0;
  }
}
