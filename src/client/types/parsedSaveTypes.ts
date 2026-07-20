import type { RawGridCellSave } from "./sourceSaveTypes";

export type SaveWorldKind = "evergreen" | "lte";

export type ParsedSave = {
  lastSavedAt: Date;
  hardCurrency: number;
  evergreen?: ParsedWorldSave;
  lte?: ParsedWorldSave;
};

export type ParsedWorldSave = {
  kind: SaveWorldKind;
  balanceId: string;
  savedRank: number;
  softCurrency: number;
  stringMap: string[];
  delivery: DeliverySave;
  freeGacha?: FreeGachaSave;
  rewardCycles: RewardCycleSave[];
  cards: CardSave[];
  zone: ParsedZoneSave;
  diagnostics: string[];
};

export type DeliverySave = {
  claimCount: number;
  nextDeliveryAt: Date | null;
  claimCountResetsAt: Date | null;
  duplicateCycleResetsAt: Date | null;
  claimedDuplicateIds: string[];
  claimedDuplicateCounts: number[];
  claimedCountsById: Record<string, number>;
};

export type FreeGachaSave = {
  index: number;
  availableAt: Date | null;
};

export type RewardCycleSave = {
  id: string;
  index: number;
};

export type CardSave = {
  id: string;
  level: number;
};

export type ParsedZoneSave = {
  id: string;
  width: number;
  depth: number;
  coreCurrency: number;
  checkpointsOpened: number;
  reinforcementsLevel: number;
  grid: ParsedGridCellSave[];
};

export type ParsedGridCellSave = {
  index: number;
  rowFromBottom: number;
  column: number;
  key: string | null;
  stringMapIndex: number | null;
  semanticId: string | null;
  level: number;
  interactionValue: number | null;
  powerRemaining: number | null;
  state: number;
  interactionValue2: number | null;
  secondaryLevel: number | null;
  secondaryId: string | null;
  tertiaryId: string | null;
  tertiaryLevel: number | null;
  raw: RawGridCellSave;
};

export type ImportedMapSnapshot = {
  worldKind: SaveWorldKind;
  balanceId: string;
  zone: ParsedZoneSave;
};
