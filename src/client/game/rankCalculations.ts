import type { ActiveState } from "../types/activeStateTypes";
import type { DerivedRankState } from "../types/derivedTypes";
import type { Balance, RankMultiplier } from "../types/sourceBalanceTypes";
import { RankUpType } from "../types/sourceBalanceTypes";
import { zoneCheckpointCount, zoneMineshaftIds } from "./map";

export function buildDerivedRankState(
  balance: Balance,
  activeState: ActiveState,
): DerivedRankState {
  const zoneIndex = Math.max(
    0,
    balance.Zones.findIndex((zone) => zone.Id === activeState.selectedZoneId),
  );
  const currentZone = balance.Zones[zoneIndex] ?? balance.Zones[0];
  const openedIds = new Set(activeState.mapInput.mineshaftIdsOpened);
  const openCurrentMineshaftsIncludingForge =
    1 + zoneMineshaftIds(currentZone).filter((id) => openedIds.has(id)).length;
  const currentProgress =
    openCurrentMineshaftsIncludingForge +
    activeState.mapInput.checkpointsOpened;
  const rankUpType = balance.BalanceProperties[0]?.RankUpType;

  if (rankUpType === RankUpType.Zone) {
    return { rankMultiplierIndex: 0, globalRank: zoneIndex + 1 };
  }
  if (rankUpType === RankUpType.MineShaftAndCheckPointAndZone) {
    const completedPreviousRanks = balance.Zones.slice(0, zoneIndex).reduce(
      (total, zone) =>
        total + zoneMineshaftIds(zone).length + zoneCheckpointCount(zone) + 1,
      0,
    );
    return {
      rankMultiplierIndex: currentProgress - 1,
      globalRank: completedPreviousRanks + currentProgress,
    };
  }
  return {
    rankMultiplierIndex: currentProgress - 1,
    globalRank: currentProgress,
  };
}

export function getSelectedRankMultiplier(
  balance: Balance,
  activeState: ActiveState,
  rank = buildDerivedRankState(balance, activeState),
): RankMultiplier | undefined {
  const zone =
    balance.Zones.find((item) => item.Id === activeState.selectedZoneId) ??
    balance.Zones[0];
  return zone?.RankMultipliers[rank.rankMultiplierIndex];
}
