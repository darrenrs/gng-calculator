import type { Card, MineShaft } from "./sourceTypes";

export type LocalizationLookup = (key: string, fallback?: string) => string;

export type MineshaftProjection = {
  id: string;
  source: MineShaft;
  level: number;
  managers: Card[];
  incomePerCycle: number;
  cycleSeconds: number;
  incomePerSecond: number;
};

export type AppViewId = "map" | "mineshafts" | "cards" | "gacha" | "save";
