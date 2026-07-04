// Balance Types

export type Balance = {
  Id: string;
  BalanceProperties: BalanceProperties[];
  Miners: Miner[];
  Rocks: Rock[];
  MineShafts: MineShaft[];
  Obstructions: Obstruction[];
  // todo
  MiningTargetHealths: null;
  GeneratorObjectives: GeneratorObjective[];
  Zones: Zone[];
  Reinforcements: Reinforcement[];
  SpawningCart: SpawningCart[];
  CheckPoint: CheckPoint[];
  CardUpgradeCosts: CardUpgradeCost[];
  Cards: Card[];
  Gacha: Gacha[];
  Deliveries: Delivery[];
  // todo
  FreeGachaCycle: null;
  Spells: null;
};

export type BalanceProperties = {
  ThemeId: string;
  IsWorldEvergreen: boolean;
  RankUpType: RankUpType;
  DeliveryDelaySecBase: number;
  DeliveryDelaySecGrowth: number;
  DeliveryClaimCountResetSec: number;
  DeliveryMaxDupesResetSec: number;
  AntiCheatSettings?: {
    CoreCurrencyMax: number;
  };
};

export enum RankUpType {
  ZONE = 1,
  MINESHAFT_AND_CHECKPOINT = 2,
  MINESHAFT_AND_CHECKPOINT_AND_ZONE = 3,
}

export type Miner = MapSizedObject & {
  DamageBase: number;
  DamageMultiplier: number;
  DamageGrowth: number;
  DamageFormulaType: FormulaType;
  CritChanceBase: number;
  CritChanceMultiplier: number;
  CritChanceGrowth: number;
  CritChanceFormulaType: FormulaType;
  CritPowerBase: number;
  CritPowerMultiplier: number;
  CritPowerGrowth: number;
  CritPowerFormulaType: FormulaType;
  AttackDelaySecBase: number;
  AttackDelaySecMultiplier: number;
  AttackDelaySecGrowth: number;
  AttackDelayFormulaType: FormulaType;
};

export type MapSizedObject = {
  Id: string;
  WidthCells: number;
  DepthCells: number;
};

export enum FormulaType {
  QUADRATIC = 0,
  EXPONENTIAL = 1,
  RAW_EXPONENTIAL = 2,
  INVERSE_EXPO_ROUNDED = 3,
}

export type Rock = MapSizedObject & {
  MimicId: string;
  CoreCurrencySecondsFormulaType: FormulaType;
  CoreCurrencySecondsBase: number;
  CoreCurrencySecondsMultiplier: number;
  CoreCurrencySecondsGrowth: number;
  CoreCurrencySecondsPower: number;
  CoreCurrencySecondsRound: number;
  SoftCurrencyBase: number;
  SoftCurrencyMultiplier: number;
  SoftCurrencyGrowth: number;
  SoftCurrencyFormulaType: FormulaType;
  LeaderboardCurrencyBase: number;
  LeaderboardCurrencyMultiplier: number;
  LeaderboardCurrencyGrowth: number;
  LeaderboardCurrencyFormulaType: FormulaType;
  LeaderboardCurrencyVariance: number;
  RewardCycle: RewardModel[];
};

export type RewardModel = {
  RewardType: number; // possibly turn this into a proper enum
  DetailedType: string;
  Quantity: number;
};

export type MineShaft = Partial<MapSizedObject> & {
  GenerationDelaySecBase: number;
  GenerationDelaySecMultiplier: number;
  GenerationDelaySecGrowth: number;
  GenerationDelaySecFormulaType: FormulaType;
  CurrencyType: number; // possibly turn this into a proper enum
  CurrencyOutputBase: number;
  CurrencyOutputMultiplier: number;
  CurrencyOutputGrowth: number;
  CurrencyOutputFormulaType: FormulaType;
  UpgradeCostBase: number;
  UpgradeCostMultiplier: number;
  UpgradeCostFormulaType: FormulaType;
  UpgradeCostGrowth: number;
};

export type Obstruction = MapSizedObject;

export type GeneratorObjective = {
  GeneratorId: string;
  ObjectiveCount: number[];
  CoreCurrencyMultiplier: number[];
  SoftCurrencyRewardBase: number;
  SoftCurrencyRewardMultiplier: number;
  SoftCurrencyRewardGrowth: number;
  SoftCurrencyRewardFormulaType: FormulaType;
};

export type Zone = {
  Id: string;
  RankMultipliers: RankMultiplier[];
  Grid: string;
};

export type RankMultiplier = {
  GachaCardsMultNormal: number;
  GachaCardsMultPremium: number;
  GachaCardsMultRare: number;
  GachaLeaderboardCurrencyMultNormal: number;
  GachaLeaderboardCurrencyMultPremium: number;
  GachaLeaderboardCurrencyMultRare: number;
  GachaSoftCurrencyMultNormal: number;
  GachaSoftCurrencyMultPremium: number;
  GachaSoftCurrencyMultRare: number;
  GenObjectiveSoftCurrencyMultiplier: number;
  MiningLeaderboardCurrencyMultiplier: number;
  MiningSoftCurrencyMultiplier: number;
};

export type Reinforcement = {
  LevelMultiplier: number;
  CostMultiplier: number;
  CostGrowth: number;
};

export type SpawningCart = MineShaft & {
  MinerIdCycle: string[];
  SpawnLevelOffset: number;
  SpawnDelaySecBase: number;
  SpawnDelaySecMultiplier: number;
  SpawnDelaySecGrowth: number;
  SpawnDelaySecFormulaType: FormulaType;
};

export type CheckPoint = {
  Id: string;
  StatModifierType: StatModifierType[];
  ModifierBase: number[];
  ModifierMultiplier: number[];
  ModifierGrowth: number[];
  ModifierPower: number[];
  ModifierRound: number[];
  ModifierFormulaType: FormulaType[];
};

export enum StatModifierType {
  MinerUnitCapAddition = 1,
  ReinforcementsCostDivider = 2,
  ReinforcementsCostDividerPerCheckPoint = 3,
  ReinforcementsLevelAddition = 4,
  MinerCritChanceAddition = 5,
  MinerCritPowerMult = 6,
  MinerSpawnTimeReduction = 7,
  MinerSpawnTimeReductionPerCheckPoint = 8,
  CoreCurrencyMultTargetGenerators = 9,
  CoreCurrencyMultAllGenerators = 10,
  CoreCurrencyMultAllGenPerCheckPoint = 11,
  CoreCurrencyPercentAllRocks = 12,
  CoreCurrencyPercentDeliveries = 13,
  ProductionTimeDividerAllGenerators = 14,
  ProdTimeInversePercentAllGenerators = 15,
  CardsMultAllGacha = 16,
  SoftCurrencyMultAllRocks = 17,
  SoftCurrencyMultTargetGenObjective = 18,
  LteRewardsMult = 19,
  DynamiteDropChanceAddition = 20,
  HardCurrencyDoubledDropChanceAddition = 21,
  DynamitePowerMult = 22,
  RockLegendaryChestDropChanceAddition = 23,
  CrusherSpeedAddition = 24,
  CrusherBombReduction = 25,
  GoblinKing = 26,
  AncestralPowerMult = 27,
}

export type CardUpgradeCost = {
  Rarity: number;
  Duplicates: number[];
  SoftCurrency: number[];
};

export type Card = {
  Id: string;
  Rarity: Rarity;
  MineUnlock: number;
  SortingWeight: number;
  StatModifierType: StatModifierType;
  ModifierBase: number;
  ModifierMultiplier: number;
  ModifierGrowth: number;
  ModifierPower: number;
  ModifierRound: number;
  ModifierFormulaType: FormulaType;
  TargetIds: string[];
  IsManager: boolean;
};

export enum Rarity {
  COMMON = 1,
  UNCOMMON = 2,
  RARE = 3,
  EVENTEPIC = 4,
  LEGENDARY = 5,
  MAJESTIC = 6,
  ANCESTRAL = 7,
}

export type Gacha = {
  Id: string;
  GachaType: GachaType;
  MimicId: string;
  GuaranteedCardIds: string[];
  GuaranteedCardCounts: number[];
  SoftCurrencyMin: number;
  SoftCurrencyMax: number;
  LeaderboardCurrency: number;
  BaseNumCards: number;
  UncommonWeight: number;
  RareWeight: number;
  LegendaryWeight: number;
  EventEpicWeight: number;
};

export enum GachaType {
  NORMAL = 0,
  PREMIUM = 1,
  FIXED = 2,
  RARE = 3,
}

export type Delivery = {
  Id: number;
  RewardModel: RewardModel[];
  QuantityBase: number;
  QuantityMultiplier: number;
  QuantityGrowth: number;
  QuantityPower: number;
  QuantityRound: number;
  QuantityFormulaType: FormulaType;
  Weight: number;
  MaxDupes: number;
  RankUnlock: number;
  CheckPointUnlock: number;
  IsAd: boolean;
};

export enum DeliveryType {
  GOBLIN = 1,
  ELIXIR = 2,
  GOLD = 3,
  DYNAMITE = 4,
}

// Save Types

export type UniverseSave = {
  SerializationVersion: number;
  Evergreen?: WorldSave;
  Lte?: WorldSave;
  LastSave?: string | number;
  SaveVersion?: number;
};

export type WorldSave = {
  BalanceId: string;
  WorldType: "EVERGREEN" | "LTE" | number;
  Zone?: WorldZoneSave;
  Cards?: OwnedCardSave[];
  DeliveryClaimCount?: number;
  DeliveryTime?: string | number;
  DeliveryClaimCountResetTime?: string | number;
  DeliveryDupeReset?: string | number;
  ClaimedDeliveryDupeIds?: string[];
  ClaimedDeliveryDupeCounts?: number[];
  Rank?: number;
  LastSaveTimestampSeconds?: string | number;
};

export type WorldZoneSave = {
  Id: string;
  Width: number;
  Depth: number;
  Grid?: WorldGridCellSave[];
  ReinforcementsLevel?: number;
  ClearedCheckPointLevelVals?: number[];
  CoreCurrencyValue?: number;
};

export type WorldGridCellSave = {
  Key?: string;
  Id?: number;
  Level?: number;
  InteractionValue?: number;
  State?: number;
  InteractionValue2?: number;
  SecondaryLevel?: number;
  SecondaryId?: string;
  TertiaryId?: string;
  TertiaryLevel?: number;
};

export type OwnedCardSave = {
  Id: string;
  Quantity: number;
  Level: number;
  IsNew?: boolean;
};

export type LteSchedule = {
  LteDatas?: LteScheduleEntry[];
  LteData?: LteScheduleEntry[];
};

export type LteScheduleEntry = {
  Id: string;
  GameDataId: string;
  ExclusiveZoneNumber: number;
  StartDateTimeUtc: string;
  EndDateTimeUtc: string;
  TotalDuration?: string;
};
