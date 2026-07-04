import type { Balance } from "./sourceTypes";

export const ACTIVE_STATE_SCHEMA_VERSION = 1;
export const SPAWNING_CART_ID = "spawningcart";

export type ActiveState = {
  schemaVersion: number;
  balanceId: string;
  selectedZoneId: string;
  maximumCurrency: number;
  map: MapInput;
  goblins: GoblinInput;
  cards: Record<string, CardInput>;
  generators: Record<string, GeneratorInput>;
  deliveries: Record<string, DeliveryInput>;
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
    schemaVersion: ACTIVE_STATE_SCHEMA_VERSION,
    balanceId: balance.Id,
    selectedZoneId,
    maximumCurrency:
      balance.BalanceProperties[0]?.AntiCheatSettings?.CoreCurrencyMax ??
      Infinity,
    map: {
      checkpointsOpened: 0,
      mineshaftIdsOpened: [SPAWNING_CART_ID],
    },
    goblins: {
      currentGoblinLevel: 1,
      currentGoblinLevelProgress: 0,
    },
    cards: {},
    generators: {
      [SPAWNING_CART_ID]: { level: 1 },
    },
    deliveries: {},
  };
}

export function withSpawningCartOpened(state: ActiveState): ActiveState {
  if (state.map.mineshaftIdsOpened.includes(SPAWNING_CART_ID)) {
    return state;
  }

  return {
    ...state,
    map: {
      ...state.map,
      mineshaftIdsOpened: [SPAWNING_CART_ID, ...state.map.mineshaftIdsOpened],
    },
  };
}
