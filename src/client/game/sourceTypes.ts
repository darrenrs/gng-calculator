export type Balance = {
  Id: string;
  BalanceProperties: BalanceProperties[];
  MineShafts: MineShaft[];
  SpawningCart: MineShaft[];
  GeneratorObjectives: GeneratorObjective[];
  Zones: Zone[];
  Cards: Card[];
  CardUpgradeCosts: CardUpgradeCost[];
  Gacha: Gacha[];
  CheckPoint: CheckPoint[];
};

export type BalanceProperties = {
  ThemeId: string;
  IsWorldEvergreen: boolean;
};

export type MineShaft = {
  Id?: string;
  CurrencyOutputMultiplier: number;
  GenerationDelaySecBase: number;
  UpgradeCostBase: number;
  UpgradeCostFormulaType: number;
  UpgradeCostGrowth: number;
};

export type GeneratorObjective = {
  GeneratorId: string;
  ObjectiveCount: number[];
  CoreCurrencyMultiplier: number[];
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

export type Card = {
  Id: string;
  IsManager: boolean;
  MineUnlock: number;
  SortingWeight: number;
  ModifierBase: number;
  ModifierFormulaType: number;
  ModifierGrowth: number;
  ModifierMultiplier: number;
  ModifierPower: number;
  ModifierRound: number;
  Rarity: number;
  StatModifierType: number;
  TargetIds: string[];
};

export type CardUpgradeCost = {
  Rarity: number;
  Duplicates: number[];
  SoftCurrency: number[];
};

export type Gacha = {
  Id: string;
  GachaType: number;
  GuaranteedCardIds: string[];
  GuaranteedCardCounts: number[];
  GuaranteedCardMin?: number[];
  SoftCurrencyMin: number;
  SoftCurrencyMax: number;
  LeaderboardCurrency: number;
  BaseNumCards: number;
  UncommonWeight: number;
  RareWeight: number;
  LegendaryWeight: number;
  EventEpicWeight: number;
};

export type CheckPoint = {
  Id: string;
  StatModifierType: number[];
  ModifierBase: number[];
  ModifierMultiplier: number[];
  ModifierGrowth: number[];
  ModifierPower: number[];
  ModifierRound: number[];
  ModifierFormulaType: number[];
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
