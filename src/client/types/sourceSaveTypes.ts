export type Int64Json = string | number;

export type RawUniverseSave = {
  SerializationVersion?: number;
  Evergreen?: RawWorldSave;
  Lte?: RawWorldSave;
  LastSave?: Int64Json;
  HardCurrencyValue?: number;
  SaveVersion?: number;
};

export type RawWorldSave = {
  BalanceId?: string;
  WorldType?: "EVERGREEN" | "LTE" | number;
  StringMap?: string[];
  Zone?: RawZoneSave;
  Cards?: RawCardSave[];
  DeliveryClaimCount?: number;
  DeliveryTime?: Int64Json;
  DeliveryClaimCountResetTime?: Int64Json;
  DeliveryDupeReset?: Int64Json;
  ClaimedDeliveryDupeIds?: string[];
  ClaimedDeliveryDupeCounts?: number[];
  RewardCycles?: RawRewardCycleSave[];
  FreeGachas?: RawFreeGachaSave[];
  Rank?: number;
  SoftCurrencyValue?: number;
};

export type RawZoneSave = {
  Id?: string;
  Width?: number;
  Depth?: number;
  Grid?: RawGridCellSave[];
  ReinforcementsLevel?: number;
  ClearedCheckPointLevelVals?: number[];
  CoreCurrencyValue?: number;
};

export type RawGridCellSave = {
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

export type RawCardSave = {
  Id?: string;
  Level?: number;
};

export type RawRewardCycleSave = {
  Id?: string;
  Index?: number;
};

export type RawFreeGachaSave = {
  Index?: number;
  Available?: Int64Json;
};

// Compatibility aliases for older imports while the save parser is introduced.
export type UniverseSave = RawUniverseSave;
export type WorldSave = RawWorldSave;
export type WorldZoneSave = RawZoneSave;
export type WorldGridCellSave = RawGridCellSave;
export type OwnedCardSave = RawCardSave;
