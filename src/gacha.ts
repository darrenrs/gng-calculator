export interface Gacha {
  GachaChests: GachaChest[];
  Zones: Zone[];
}

/*
  Evergreen: All weights may be populated
  LTE: Only RareWeight is populated

  CardMultiMax is only used in Scripted Crusher chests -- we don't currently care about scripteds
*/
export interface GachaChest {
  Id: string;
  IsScripted: boolean;
  GachaType: number;
  SoftCurrencyMin: number;
  SoftCurrencyMax: number;
  LeaderboardCurrency: number;
  BaseNumCards: number;
  UncommonWeight: number;
  RareWeight: number;
  LegendaryWeight: number;
  EventEpicWeight: number;
}

export interface Zone {
  Id: string;
  SubZones: ZoneMultiplier[];
}

export interface ZoneMultiplier {
  Id: string;
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
}