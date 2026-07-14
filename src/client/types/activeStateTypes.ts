import type { Balance } from "./sourceBalanceTypes";
import { StatModifierType } from "./sourceBalanceTypes";

export const FORGE_ID = "spawningcart";

export type ActiveState = {
  balanceId: string;
  selectedZoneId: string;
  maximumCurrency: number;
  mapInput: MapInput;
  goblinsInput: GoblinInput;
  cardsInput: Record<string, CardInput>;
  generatorsInput: Record<string, GeneratorInput>;
  deliveriesInput: Record<string, DeliveryInput>;
};

export type MapInput = {
  checkpointsOpened: number;
  mineshaftIdsOpened: string[];
};

export type GoblinInput = {
  goblinPurchaseLevel: number;
  goblinPurchaseLevelProgress: number;
};

export type CardInput = {
  level: number;
  quantity: number;
};

export type GeneratorInput = {
  level: number;
};

export type DeliveryInput = Record<string, never>;

export function createDefaultActiveState(
  balance: Balance,
  selectedZoneId = balance.Zones[0]?.Id ?? "",
): ActiveState {
  return {
    balanceId: balance.Id,
    selectedZoneId,
    maximumCurrency:
      balance.BalanceProperties[0]?.AntiCheatSettings?.CoreCurrencyMax ??
      Infinity,
    mapInput: {
      checkpointsOpened: 0,
      mineshaftIdsOpened: [FORGE_ID],
    },
    goblinsInput: {
      goblinPurchaseLevel: 1,
      goblinPurchaseLevelProgress: 0,
    },
    cardsInput: Object.fromEntries(
      balance.Cards.filter(
        (card) => card.StatModifierType === StatModifierType.GoblinKing,
      ).map((card) => [card.Id, { level: 1, quantity: 0 }]),
    ),
    generatorsInput: {
      [FORGE_ID]: { level: 1 },
    },
    deliveriesInput: {},
  };
}

export function withForgeOpened(state: ActiveState): ActiveState {
  if (state.mapInput.mineshaftIdsOpened.includes(FORGE_ID)) {
    return state;
  }

  return {
    ...state,
    mapInput: {
      ...state.mapInput,
      mineshaftIdsOpened: [FORGE_ID, ...state.mapInput.mineshaftIdsOpened],
    },
  };
}
