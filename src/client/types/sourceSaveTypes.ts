// This will not be finished yet

export type UniverseSave = {
  SerializationVersion: number;
  Evergreen?: WorldSave;
  Lte?: WorldSave;
  LastSave: string;
  SaveVersion: number;
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
