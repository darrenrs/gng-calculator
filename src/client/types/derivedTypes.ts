import type {
  Card,
  Delivery,
  Gacha,
  MineShaft,
  RankMultiplier,
  Rock,
} from "./sourceBalanceTypes";
import type { GlobalEffectId } from "./effectTypes";

export type LocalizationLookup = (key: string, fallback?: string) => string;

export type MineshaftProjection = {
  id: string;
  source: MineShaft;
  level: number;
  managers: ManagerProjection[];
  existsInSelectedZone: boolean;
  opened: boolean;
  requiredOpen: boolean;
  automated: boolean;
  automationCardId?: string;
  automationLevel?: number;
  incomePerCycle: number;
  cycleSeconds: number;
  incomePerSecond: number;
  activeIncomePerSecond: number;
  idleIncomePercent: number;
  activeIncomePercent: number;
  nextObjectiveCost: number | null;
  activeTimeToUpgrade: number | null;
  idleTimeToUpgrade: number | null;
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
  effectLabel: string;
  elixirAllocated: number;
  elixirRemaining: number;
  unlockLabel: string;
  displayLevel: number;
  displayMaxLevel: number;
};

export type SummaryProjection = {
  balanceId: string;
  zoneNumber: number;
  zoneId: string;
  checkpointsOpened: number;
  goblinPurchaseLevel: number;
  goblinCannonLevel: number;
  idleIncomePerSecond: number;
  activeIncomePerSecond: number;
  deliveriesPerHour: number;
  rankUpType: string;
  rankMultiplierIndex: number;
  globalRank: number;
  globalEffects: GlobalEffectProjection[];
  derivedCalculations: DerivedCalculationProjection[];
  rankMultiplierRows: RankMultiplierProjection[];
};

export type GlobalEffectProjection = {
  id: GlobalEffectId;
  label: string;
  value: number;
  valueLabel: string;
};

export type DerivedCalculationProjection = {
  id: string;
  label: string;
  value: number;
  valueLabel: string;
};

export type RankMultiplierProjection = {
  id: keyof RankMultiplier;
  value: number;
};

export type DerivedRankState = {
  rankMultiplierIndex: number;
  globalRank: number;
};

export type MapProjection = {
  zoneId: string;
  displayRows: MapDisplayCell[][];
  progressionCells: MapParsedCell[];
  rowCount: number;
  columnCount: number;
  mineshaftIdsInZone: string[];
  checkpointCount: number;
  checkpointsOpened: number;
  maxGoblinCount: number;
  isImportedSnapshot: boolean;
  snapshotStale: boolean;
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
  checkpointId: number;
  baseToken?: string;
  tooltip?: string;
  targetIndex?: number;
  targetDirection?: "Up" | "Down" | "Left" | "Right" | "Overlapping";
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
  | "barrelGoblin"
  | "barrelDelivery"
  | "dynamite"
  | "goblin"
  | "reward"
  | "goblinKing"
  | "unknown";

export type GoblinCostProjection = {
  goblinPurchaseLevel: number;
  minimumGoblinPurchaseLevel: number;
  labels: number[];
  rows: GoblinCostRow[];
  maxGoblinCount: number;
  spawnIntervalSeconds: number;
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
  claimCountResetSeconds: number;
  maxDupesResetSeconds: number;
  claimCount: number;
  nextDeliveryAt: Date | null;
  claimCountResetsAt: Date | null;
  duplicateCycleResetsAt: Date | null;
};

export type DeliveryRowProjection = {
  source: Delivery;
  rewardName: string;
  valueLabel: string;
  numericValue: number | null;
  rawWeight: number;
  oddsWeight: number;
  nextDeliveryPercent: number;
  unlocked: boolean;
  eligibleForNext: boolean;
  count: number;
  total: number;
};

export type GachaProjection = {
  unlockedCheckpointsAndShafts: number;
  rankMultiplierIndex: number;
  selectedRankMultiplier?: RankMultiplier;
  gachaCardLevel: number;
  regularGachas: Gacha[];
  fixedGachas: Gacha[];
  freeGachaIndex: number | null;
  freeGachaAvailableAt: Date | null;
};

export type RocksProjection = {
  rewardCycles: Array<{ id: string; index: number }>;
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
  | "rocks"
  | "save";
