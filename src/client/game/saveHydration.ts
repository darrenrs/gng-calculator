import {
  createDefaultActiveState,
  FORGE_ID,
  type ActiveState,
} from "../types/activeStateTypes";
import type {
  ImportedMapSnapshot,
  ParsedSave,
  ParsedWorldSave,
} from "../types/parsedSaveTypes";
import type { Balance } from "../types/sourceBalanceTypes";
import { buildNamedGlobalEffects } from "./effects";
import { buildDerivedRankState } from "./rankCalculations";

export type SaveHydrationResult = {
  activeState: ActiveState;
  mapSnapshot: ImportedMapSnapshot;
  savedRank: number;
  derivedGlobalRank: number;
  diagnostics: string[];
};

export class SaveHydrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveHydrationError";
  }
}

export function hydrateActiveStateFromSave(
  balance: Balance,
  save: ParsedSave,
  world: ParsedWorldSave,
): SaveHydrationResult {
  if (balance.Id !== world.balanceId) {
    throw new SaveHydrationError(
      `Balance ${balance.Id} does not match save balance ${world.balanceId}`,
    );
  }
  if (!balance.Zones.some((zone) => zone.Id === world.zone.id)) {
    throw new SaveHydrationError(
      `Balance ${balance.Id} does not contain saved zone ${world.zone.id}`,
    );
  }

  const activeState = createDefaultActiveState(balance, world.zone.id);
  activeState.currenciesInput = {
    coreCurrency: world.zone.coreCurrency,
    softCurrency: world.softCurrency,
    hardCurrency: save.hardCurrency,
  };
  activeState.mapInput.checkpointsOpened = world.zone.checkpointsOpened;
  activeState.cardsInput = Object.fromEntries(
    balance.Cards.map((card) => [card.Id, { level: 0, quantity: 0 }]),
  );
  for (const card of world.cards) {
    activeState.cardsInput[card.id] = { level: card.level, quantity: 0 };
  }

  activeState.generatorsInput = Object.fromEntries(
    [
      ...balance.SpawningCart.map((generator) => generator.Id ?? FORGE_ID),
      ...balance.MineShafts.map((generator) => generator.Id ?? ""),
    ]
      .filter(Boolean)
      .map((id) => [id, { level: 0 }]),
  );
  const openedIds = new Set<string>([FORGE_ID]);
  activeState.generatorsInput[FORGE_ID] = { level: 1 };
  for (const cell of world.zone.grid) {
    if (cell.key === "c") {
      activeState.generatorsInput[FORGE_ID] = {
        level: Math.max(1, cell.level),
      };
      continue;
    }
    if (cell.key !== "s" || cell.state <= 0 || !cell.semanticId) continue;
    openedIds.add(cell.semanticId);
    activeState.generatorsInput[cell.semanticId] = {
      level: Math.max(1, cell.level),
    };
  }
  activeState.mapInput.mineshaftIdsOpened = Array.from(openedIds);

  const stepsPerLevel = reinforcementStepsPerLevel(balance);
  const reinforcementLevel = world.zone.reinforcementsLevel;
  const basePurchaseLevel =
    reinforcementLevel <= 0
      ? 0
      : Math.floor((reinforcementLevel - 1) / stepsPerLevel) + 1;
  const progress =
    reinforcementLevel <= 0 ? 0 : (reinforcementLevel - 1) % stepsPerLevel;
  const levelChange = buildNamedGlobalEffects(
    balance,
    activeState,
  ).GoblinPurchaseLevelChange;
  activeState.goblinsInput = {
    goblinPurchaseLevel: basePurchaseLevel + levelChange,
    goblinPurchaseLevelProgress: progress,
  };

  activeState.deliveryInput = {
    claimCount: world.delivery.claimCount,
    nextDeliveryAt: world.delivery.nextDeliveryAt,
    claimCountResetsAt: world.delivery.claimCountResetsAt,
    duplicateCycleResetsAt: world.delivery.duplicateCycleResetsAt,
    claimedCountsById: { ...world.delivery.claimedCountsById },
  };
  activeState.freeGachaInput = world.freeGacha ? { ...world.freeGacha } : null;
  activeState.rewardCyclesInput = world.rewardCycles.map((cycle) => ({
    ...cycle,
  }));

  const derivedGlobalRank = buildDerivedRankState(
    balance,
    activeState,
  ).globalRank;
  return {
    activeState,
    mapSnapshot: {
      worldKind: world.kind,
      balanceId: world.balanceId,
      zone: world.zone,
    },
    savedRank: world.savedRank,
    derivedGlobalRank,
    diagnostics: [...world.diagnostics],
  };
}

export function reinforcementStepsPerLevel(balance: Balance): number {
  const multiplier = balance.Reinforcements[0]?.LevelMultiplier ?? 1;
  return multiplier > 0 ? Math.max(1, Math.round(1 / multiplier)) : 1;
}
