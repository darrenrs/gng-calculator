import type { Card, Delivery, Gacha, MineShaft, Rock } from "./sourceTypes";

export type LocalizationLookup = (key: string, fallback?: string) => string;

export type MineshaftProjection = {
  id: string;
  source: MineShaft;
  level: number;
  managers: ManagerProjection[];
  existsInSelectedZone: boolean;
  opened: boolean;
  automated: boolean;
  automationCardId?: string;
  automationLevel?: number;
  incomePerCycle: number;
  cycleSeconds: number;
  incomePerSecond: number;
  nextObjectiveCost: number | null;
};

export type ManagerProjection = {
  card: Card;
  level: number;
  maxLevel: number;
  automationLevel?: number;
};

export type CardProjection = {
  card: Card;
  level: number;
  quantity: number;
  maxLevel: number;
  effect: number;
};

export type SummaryProjection = {
  checkpointsOpened: number;
  currentGoblinLevel: number;
  inactiveIncomePerSecond: number;
  activeIncomePerSecond: number;
};

export type MapProjection = {
  zoneId: string;
  displayRows: MapDisplayCell[][];
  progressionCells: MapParsedCell[];
  rowCount: number;
  columnCount: number;
  mineshaftIdsInZone: string[];
  checkpointCount: number;
};

export type MapDisplayCell = {
  key: string;
  row: number;
  col: number;
  token: string;
  kind: MapCellKind;
  label: string;
  detail?: string;
  rowSpan: number;
  colSpan: number;
  gridRowStart: number;
  gridColumnStart: number;
  hidden: boolean;
  covered: boolean;
};

export type MapParsedCell = MapDisplayCell & {
  progressionIndex: number;
};

export type MapCellKind =
  | "empty"
  | "obstruction"
  | "rock"
  | "mineshaft"
  | "spawningCart"
  | "checkpoint"
  | "exit"
  | "unknown";

export type GoblinCostProjection = {
  labels: number[];
  rows: GoblinCostRow[];
};

export type GoblinCostRow = {
  baseLevel: number;
  displayLevel: number;
  costs: number[];
};

export type DeliveryProjection = {
  rows: DeliveryRowProjection[];
  obtained: number;
  total: number;
  activeIncomePerSecond: number;
};

export type DeliveryRowProjection = {
  source: Delivery;
  rewardName: string;
  valueLabel: string;
  numericValue: number | null;
  weight: number;
  count: number;
  total: number;
};

export type GachaProjection = {
  unlockedCheckpointsAndShafts: number;
  gachaCardLevel: number;
  scriptedGachas: Gacha[];
};

export type RockProjection = {
  source: Rock;
  level: number;
};

export type AppViewId =
  | "summary"
  | "map"
  | "mineshafts"
  | "cards"
  | "goblins"
  | "deliveries"
  | "gacha"
  | "save";
