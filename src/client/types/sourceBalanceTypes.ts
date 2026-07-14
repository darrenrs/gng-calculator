export type Balance = {
  Id: string;
  BalanceProperties: BalanceProperties[];
  Miners: Miner[];
  Rocks: Rock[];
  MineShafts: MineShaft[];
  Obstructions: Obstruction[];
  MiningTargetHealths: MiningTargetHealth[];
  GeneratorObjectives: GeneratorObjective[];
  Zones: Zone[];
  Reinforcements: Reinforcement[];
  SpawningCart: SpawningCart[];
  CheckPoint: CheckPoint[];
  CardUpgradeCosts: CardUpgradeCost[];
  Cards: Card[];
  Gacha: Gacha[];
  Deliveries: Delivery[];
  FreeGachaCycle: FreeGachaCycle[];
  Spells: Spell[];
};

export type BalanceProperties = {
  ThemeId: string;
  IsWorldEvergreen: boolean;
  RankUpType: RankUpType;
  BaseUnitCap: number;
  DeliveryDelaySecBase: number;
  DeliveryDelaySecGrowth: number;
  DeliveryClaimCountResetSec: number;
  DeliveryMaxDupesResetSec: number;
  AntiCheatSettings: {
    CoreCurrencyMax: number;
  };
};

export enum RankUpType {
  Zone = 1,
  MineShaftAndCheckPoint = 2,
  MineShaftAndCheckPointAndZone = 3,
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
  Quadratic = 0,
  Exponential = 1,
  RawExponential = 2,
  InverseExpoRounded = 3,
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
  RewardType: RewardType;
  DetailedType: string;
  Quantity: number;
};

export enum RewardType {
  Currency = 0,
  Gacha = 1,
  CardByRarity = 2,
  CardById = 3,
  Miner = 4,
  TimeSkip = 5,
  ImmediateTimeSkipMinutes = 6,
  Bundle = 7,
  NoAds = 8,
  Spell = 9,
  MasterKey = 10,
  Majestic = 11,
  FreeSpin = 12,
  BattlePassRegion = 13,
}

export type MineShaft = Partial<MapSizedObject> & {
  GenerationDelaySecBase: number;
  GenerationDelaySecMultiplier: number;
  GenerationDelaySecGrowth: number;
  GenerationDelaySecFormulaType: FormulaType;
  CurrencyType: CurrencyType;
  CurrencyOutputBase: number;
  CurrencyOutputMultiplier: number;
  CurrencyOutputGrowth: number;
  CurrencyOutputFormulaType: FormulaType;
  UpgradeCostBase: number;
  UpgradeCostMultiplier: number;
  UpgradeCostFormulaType: FormulaType;
  UpgradeCostGrowth: number;
};

export enum CurrencyType {
  Core = 1,
  Soft = 2,
  Hard = 3,
  RealMoney = 4,
  Lte = 5,
  Leaderboard = 6,
  BattlePass = 7,
}

export type Obstruction = MapSizedObject;

export type MiningTargetHealth = {};

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
  Common = 1,
  Uncommon = 2,
  Rare = 3,
  EventEpic = 4,
  Legendary = 5,
  Majestic = 6,
  Ancestral = 7,
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
  Normal = 0,
  Premium = 1,
  Fixed = 2,
  Rare = 3,
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
  Goblin = 1,
  Elixir = 2,
  Gold = 3,
  Dynamite = 4,
}

export type FreeGachaCycle = {
  MaxFreeGachas: string;
  Hours: number;
  GachaIds: string[];
};

export type Spell = {
  SpellType: number;
  EffectBase: number;
  EffectMultiplier: number;
  EffectGrowth: number;
  EffectFormulaType: FormulaType;
  CritChanceBase: number;
  CritChanceMultiplier: number;
  CritChanceGrowth: number;
  CritChanceFormulaType: FormulaType;
  CritPowerBase: number;
  CritPowerMultiplier: number;
  CritPowerGrowth: number;
  CritPowerFormulaType: FormulaType;
};

export type LteSchedule = {
  LteDatas: LteScheduleEntry[];
};

export type LteScheduleEntry = {
  Id: string;
  GameDataId: string;
  ExclusiveZoneNumber: number;
  StartDateTimeUtc: string;
  EndDateTimeUtc: string;
  TotalDuration?: string;
};
