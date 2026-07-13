import type { Balance } from "./sourceBalanceTypes";

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
  currentGoblinLevel: number;
  currentGoblinLevelProgress: number;
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
      currentGoblinLevel: 1,
      currentGoblinLevelProgress: 0,
    },
    cardsInput: {},
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
