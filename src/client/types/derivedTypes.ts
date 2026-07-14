import type {
  Card,
  Delivery,
  Gacha,
  MineShaft,
  RankMultiplier,
  Rock,
} from "./sourceBalanceTypes";

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

export type GlobalEffectId =
  | "GoblinLimitChange"
  | "GoblinPurchasePrice"
  | "GoblinPurchaseLevelChange"
  | "GoblinBaseDamage"
  | "GoblinCannonTimerChange"
  | "GeneratorCurrencyMult"
  | "RockCurrencyMult"
  | "DeliveryCurrencyMult"
  | "ProdTimePercentDecrease"
  | "CardsMult"
  | "LteRewardsMult"
  | "DeliveryDynamiteMult"
  | "RockDoubleGemsPercentChance"
  | "DynamiteBaseDamage"
  | "RockLegendaryChestMult"
  | "CrusherSpeedMult"
  | "CrusherBombInterval"
  | "GoblinKingDamageModifier";

export type NamedGlobalEffects = Record<GlobalEffectId, number>;

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
