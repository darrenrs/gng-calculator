import {
  buildNamedGlobalEffects,
  generatorIncome,
  generatorUpgradeCostToNextObjective,
  getGenerators,
  managerCardsForGenerator,
  maxCardLevel,
  maxGoblinCount,
  sortedCards,
} from "./balanceCalculations";
import { calculateFormula, calculateStatModifier } from "./modifiers";
import {
  coefficientFormat,
  numberFormat,
  timeFormat,
  titleCase,
} from "./format";
import type { ActiveState } from "../types/activeStateTypes";
import { FORGE_ID } from "../types/activeStateTypes";
import type {
  CardProjection,
  DeliveryProjection,
  DeliveryRowProjection,
  GachaProjection,
  GoblinCostProjection,
  LocalizationLookup,
  MapProjection,
  MineshaftProjection,
  RocksProjection,
  SummaryProjection,
} from "../types/derivedTypes";
import type { GlobalEffectId, NamedGlobalEffects } from "../types/effectTypes";
import {
  FormulaType,
  GachaType,
  RankUpType,
  StatModifierType,
} from "../types/sourceBalanceTypes";
import type {
  Balance,
  Card,
  Delivery,
  MineShaft,
  RankMultiplier,
  RewardModel,
} from "../types/sourceBalanceTypes";
import {
  buildMapProjection,
  mapTokenParts,
  zoneMineshaftIds,
  zoneMineshaftIdsUnlockedByCheckpoints,
  zoneRankUnlocks,
} from "./map";
import {
  buildDerivedRankState,
  getSelectedRankMultiplier,
} from "./rankCalculations";
import {
  GLOBAL_EFFECT_LABELS,
  isGlobalEffectApplicable,
} from "./effectMetadata";
import { aggregateEffects } from "./effects";

export { balanceIndexToCssGrid, buildMapProjection } from "./map";
export {
  buildDerivedRankState,
  getSelectedRankMultiplier,
} from "./rankCalculations";

const RANK_MULTIPLIER_KEYS: Array<keyof RankMultiplier> = [
  "GachaCardsMultNormal",
  "GachaCardsMultPremium",
  "GachaCardsMultRare",
  "GachaLeaderboardCurrencyMultNormal",
  "GachaLeaderboardCurrencyMultPremium",
  "GachaLeaderboardCurrencyMultRare",
  "GachaSoftCurrencyMultNormal",
  "GachaSoftCurrencyMultPremium",
  "GachaSoftCurrencyMultRare",
  "GenObjectiveSoftCurrencyMultiplier",
  "MiningLeaderboardCurrencyMultiplier",
  "MiningSoftCurrencyMultiplier",
];

export function buildCardProjections(
  balance: Balance,
  activeState: ActiveState,
  t?: LocalizationLookup,
): CardProjection[] {
  return sortedCards(balance).map((card) => {
    const level = activeState.cardsInput[card.Id]?.level ?? 0;
    const upgradeCosts =
      balance.CardUpgradeCosts.find((item) => item.Rarity === card.Rarity)
        ?.SoftCurrency ?? [];
    const spentCount = Math.max(0, level - 1);
    const maxLevel = maxCardLevel(balance, card);
    const isGoblinKing = card.StatModifierType === StatModifierType.GoblinKing;
    const effect =
      isGoblinKing && level === 0 ? 0 : calculateStatModifier(card, level);
    return {
      card,
      level,
      quantity: activeState.cardsInput[card.Id]?.quantity ?? 0,
      maxLevel,
      effect,
      effectLabel: formatModifierValue(effect, card.StatModifierType),
      elixirAllocated: sum(upgradeCosts.slice(0, spentCount)),
      elixirRemaining: sum(upgradeCosts.slice(spentCount)),
      unlockLabel: cardUnlockLabel(balance, card, t),
      displayLevel: isGoblinKing ? Math.max(0, level - 1) : level,
      displayMaxLevel: isGoblinKing ? Math.max(0, maxLevel - 1) : maxLevel,
    };
  });
}

export function buildMineshaftProjections(
  balance: Balance,
  activeState: ActiveState,
): MineshaftProjection[] {
  const cardLevels = cardLevelsFromState(activeState);
  const aggregatedEffects = aggregateEffects(
    balance,
    cardLevels,
    activeState.mapInput.checkpointsOpened,
  );
  const map = buildMapProjection(
    balance,
    activeState,
    activeState.selectedZoneId,
    undefined,
  );
  const zoneMineshaftIds = new Set(map.mineshaftIdsInZone);
  const openedIds = new Set(activeState.mapInput.mineshaftIdsOpened);
  const zone =
    balance.Zones.find((item) => item.Id === activeState.selectedZoneId) ??
    balance.Zones[0];
  const requiredOpenIds = new Set(
    zoneMineshaftIdsUnlockedByCheckpoints(
      zone,
      activeState.mapInput.checkpointsOpened - 1,
    ),
  );

  const rows = getGenerators(balance).map(({ id, source }) => {
    const level = activeState.generatorsInput[id]?.level ?? 1;
    const income = generatorIncome(
      balance,
      id,
      source,
      level,
      cardLevels,
      activeState.mapInput.checkpointsOpened,
      aggregatedEffects,
    );
    const managers = managerCardsForGenerator(balance, id);
    const automation = automationForGenerator(id, managers, map);
    const automated =
      id === FORGE_ID || isAutomationMet(automation, cardLevels);
    const existsInSelectedZone = id === FORGE_ID || zoneMineshaftIds.has(id);
    const opened = id === FORGE_ID || openedIds.has(id);
    const incomePerSecond =
      existsInSelectedZone && opened && automated && income.cycleSeconds > 0
        ? income.incomePerCycle / income.cycleSeconds
        : 0;
    const activeIncomePerSecond =
      existsInSelectedZone && opened && income.cycleSeconds > 0
        ? income.incomePerCycle / income.cycleSeconds
        : 0;
    const nextObjectiveCost = generatorUpgradeCostToNextObjective(
      balance,
      id,
      source,
      level,
    );

    return {
      id,
      source,
      level,
      managers: managers.map((card) => ({
        card,
        level: activeState.cardsInput[card.Id]?.level ?? 0,
        maxLevel: maxCardLevel(balance, card),
        automationLevel:
          automation?.cardId === card.Id
            ? automation.automationLevel
            : undefined,
      })),
      existsInSelectedZone,
      opened,
      requiredOpen: id === FORGE_ID || requiredOpenIds.has(id),
      automated,
      automationCardId: automation?.cardId,
      automationLevel: automation?.automationLevel,
      incomePerCycle: income.incomePerCycle,
      cycleSeconds: income.cycleSeconds,
      incomePerSecond,
      activeIncomePerSecond,
      nextObjectiveCost,
      idleTimeToUpgrade: null,
      activeTimeToUpgrade: null,
    };
  });
  const idleIncomePerSecond = rows.reduce(
    (total, mineshaft) => total + mineshaft.incomePerSecond,
    0,
  );
  const activeIncomePerSecond = rows.reduce(
    (total, mineshaft) => total + mineshaft.activeIncomePerSecond,
    0,
  );
  const activeDeliveryIncomePerSecond = buildDeliveryProjection(
    balance,
    activeState,
    idleIncomePerSecond,
  ).activeIncomePerSecond;
  const activeSessionIncomePerSecond =
    activeIncomePerSecond + activeDeliveryIncomePerSecond;

  return rows.map((row) => ({
    ...row,
    idleIncomePercent:
      idleIncomePerSecond > 0
        ? (row.incomePerSecond / idleIncomePerSecond) * 100
        : 0,
    activeIncomePercent:
      activeIncomePerSecond > 0
        ? (row.activeIncomePerSecond / activeIncomePerSecond) * 100
        : 0,
    idleTimeToUpgrade:
      row.nextObjectiveCost !== null && idleIncomePerSecond > 0
        ? row.nextObjectiveCost / idleIncomePerSecond
        : null,
    activeTimeToUpgrade:
      row.nextObjectiveCost !== null && activeSessionIncomePerSecond > 0
        ? row.nextObjectiveCost / activeSessionIncomePerSecond
        : null,
  }));
}

export function buildSummaryProjection(
  balance: Balance,
  activeState: ActiveState,
): SummaryProjection {
  const mineshafts = buildMineshaftProjections(balance, activeState);
  const idleIncomePerSecond = mineshafts.reduce(
    (total, mineshaft) => total + mineshaft.incomePerSecond,
    0,
  );
  const activeGeneratorIncomePerSecond = mineshafts.reduce(
    (total, mineshaft) => total + mineshaft.activeIncomePerSecond,
    0,
  );
  const activeDeliveryIncomePerSecond = buildDeliveryProjection(
    balance,
    activeState,
    idleIncomePerSecond,
  ).activeIncomePerSecond;
  const effects = buildNamedGlobalEffects(balance, activeState);
  const rank = buildDerivedRankState(balance, activeState);
  const selectedRankMultiplier = getSelectedRankMultiplier(
    balance,
    activeState,
    rank,
  );
  const spawnIntervalSeconds = goblinSpawnIntervalSeconds(balance, activeState);
  const zoneNumber = Math.max(
    1,
    balance.Zones.findIndex((zone) => zone.Id === activeState.selectedZoneId) +
      1,
  );
  const goblinCannonLevel = getGoblinCannonLevel(balance, activeState);
  const activeIncomePerSecond =
    activeGeneratorIncomePerSecond + activeDeliveryIncomePerSecond;

  return {
    balanceId: balance.Id,
    zoneNumber,
    zoneId: activeState.selectedZoneId,
    checkpointsOpened: activeState.mapInput.checkpointsOpened,
    goblinPurchaseLevel: activeState.goblinsInput.goblinPurchaseLevel,
    goblinCannonLevel,
    idleIncomePerSecond: idleIncomePerSecond,
    activeIncomePerSecond,
    deliveriesPerHour: deliveriesPerHour(balance),
    rankUpType: rankUpTypeName(balance.BalanceProperties[0]?.RankUpType),
    rankMultiplierIndex: rank.rankMultiplierIndex,
    globalRank: rank.globalRank,
    globalEffects: buildGlobalEffectProjections(balance, effects),
    derivedCalculations: [
      derivedRow(
        "GoblinLimit",
        "Goblin Limit (Max Goblins)",
        (balance.BalanceProperties[0]?.BaseUnitCap ?? 0) +
          effects.GoblinLimitChange,
      ),
      derivedRow(
        "GoblinPurchaseLevel",
        "Goblin Purchase Level",
        activeState.goblinsInput.goblinPurchaseLevel,
      ),
      derivedRow("GoblinCannonLevel", "Goblin Spawn Level", goblinCannonLevel),
      derivedRow(
        "GoblinCannonTimer",
        "Goblin Spawn Time",
        spawnIntervalSeconds,
        timeFormat(spawnIntervalSeconds, true),
      ),
      derivedRow("RawIncomePerSec", "Idle Income / Sec", idleIncomePerSecond),
      derivedRow(
        "CurrentCoreCurrency",
        "Current Core Currency",
        activeState.currenciesInput.coreCurrency,
      ),
      derivedRow(
        "CurrentSoftCurrency",
        "Current Elixir",
        activeState.currenciesInput.softCurrency,
      ),
      derivedRow(
        "CurrentHardCurrency",
        "Current Gems",
        activeState.currenciesInput.hardCurrency,
      ),
      derivedRow(
        "MineshaftsOpened",
        "Total number of mineshafts opened",
        new Set(activeState.mapInput.mineshaftIdsOpened).size,
      ),
      derivedRow(
        "CheckpointsOpened",
        "Total number of checkpoints opened",
        activeState.mapInput.checkpointsOpened,
      ),
      derivedRow(
        "RankMultiplierIndex",
        "Index used for rank multipliers",
        rank.rankMultiplierIndex,
      ),
      derivedRow("GlobalRank", "Index used for global rank", rank.globalRank),
    ],
    rankMultiplierRows: selectedRankMultiplier
      ? RANK_MULTIPLIER_KEYS.map((id) => ({
          id,
          value: selectedRankMultiplier[id],
        }))
      : [],
  };
}

export function getGoblinCannonLevel(
  balance: Balance,
  activeState: ActiveState,
): number {
  return Math.max(
    1,
    activeState.goblinsInput.goblinPurchaseLevel +
      (balance.SpawningCart[0]?.SpawnLevelOffset ?? 0),
  );
}

export function deliveriesPerHour(balance: Balance): number {
  const props = balance.BalanceProperties[0];
  if (!props || props.DeliveryDelaySecBase <= 0) return 0;

  let cumulativeSeconds = 0;
  let count = 0;
  while (count < 100_000) {
    const delay =
      props.DeliveryDelaySecBase * props.DeliveryDelaySecGrowth ** count;
    if (!Number.isFinite(delay) || cumulativeSeconds + delay > 3600) break;
    cumulativeSeconds += delay;
    count += 1;
  }
  return count;
}

export function buildGoblinCostProjection(
  balance: Balance,
  activeState: ActiveState,
): GoblinCostProjection {
  const reinforcement = balance.Reinforcements[0];
  if (!reinforcement) {
    return {
      goblinPurchaseLevel: activeState.goblinsInput.goblinPurchaseLevel,
      minimumGoblinPurchaseLevel: 1,
      labels: [],
      rows: [],
      maxGoblinCount: maxGoblinCount(balance, activeState),
      spawnIntervalSeconds: goblinSpawnIntervalSeconds(balance, activeState),
    };
  }

  const stepsPerLevel = Math.max(
    1,
    Math.floor(1 / reinforcement.LevelMultiplier),
  );
  const labels = Array.from(
    { length: stepsPerLevel },
    (_value, index) => index + 1,
  );
  const maxCurrency = activeState.maximumCurrency;
  const rows = [];
  const effects = buildNamedGlobalEffects(balance, activeState);
  const levelOffset = effects.GoblinPurchaseLevelChange;
  const costDivider = effects.GoblinPurchasePrice;

  for (let baseLevel = 1; baseLevel < 10_000; baseLevel += 1) {
    const costs = labels.map((_label, index) => {
      const totalLevels = (baseLevel - 1) * stepsPerLevel + index + 1;
      return (
        (reinforcement.CostMultiplier *
          reinforcement.CostGrowth ** totalLevels) /
        costDivider
      );
    });
    rows.push({
      baseLevel,
      displayLevel: baseLevel + levelOffset,
      costs,
    });
    if (costs.some((cost) => cost > maxCurrency)) {
      break;
    }
  }

  return {
    goblinPurchaseLevel: activeState.goblinsInput.goblinPurchaseLevel,
    minimumGoblinPurchaseLevel: Math.max(1, levelOffset + 1),
    labels,
    rows,
    maxGoblinCount: maxGoblinCount(balance, activeState),
    spawnIntervalSeconds: goblinSpawnIntervalSeconds(balance, activeState),
  };
}

export function buildDeliveryProjection(
  balance: Balance,
  activeState: ActiveState,
  incomePerSecond: number,
): DeliveryProjection {
  const globalRank = buildDerivedRankState(balance, activeState).globalRank;
  const effects = buildNamedGlobalEffects(balance, activeState);
  const initialRows = balance.Deliveries.map((delivery) =>
    buildDeliveryRow(
      balance,
      activeState,
      delivery,
      incomePerSecond,
      globalRank,
      effects,
    ),
  );
  const unlockedWeight = initialRows.reduce(
    (total, row) => total + (row.eligibleForNext ? row.oddsWeight : 0),
    0,
  );
  const rows = initialRows.map((row) => ({
    ...row,
    nextDeliveryPercent: row.eligibleForNext
      ? (row.oddsWeight / unlockedWeight) * 100
      : 0,
  }));
  const obtained = rows.reduce((total, row) => total + row.count, 0);
  const total = rows.reduce(
    (sum, row) => sum + (row.total === -1 ? 0 : row.total),
    0,
  );

  return {
    rows,
    obtained,
    total,
    activeIncomePerSecond: activeDeliveryIncomePerSecond(
      balance,
      activeState,
      rows,
    ),
    claimCountResetSeconds:
      balance.BalanceProperties[0]?.DeliveryClaimCountResetSec ?? 0,
    maxDupesResetSeconds:
      balance.BalanceProperties[0]?.DeliveryMaxDupesResetSec ?? 0,
    claimCount: activeState.deliveryInput.claimCount,
    nextDeliveryAt: activeState.deliveryInput.nextDeliveryAt,
    claimCountResetsAt: activeState.deliveryInput.claimCountResetsAt,
    duplicateCycleResetsAt: activeState.deliveryInput.duplicateCycleResetsAt,
  };
}

export function buildGachaProjection(
  balance: Balance,
  activeState: ActiveState,
): GachaProjection {
  const card16 = balance.Cards.find((card) => card.StatModifierType === 16);
  const rank = buildDerivedRankState(balance, activeState);
  return {
    unlockedCheckpointsAndShafts: rank.rankMultiplierIndex,
    rankMultiplierIndex: rank.rankMultiplierIndex,
    selectedRankMultiplier: getSelectedRankMultiplier(
      balance,
      activeState,
      rank,
    ),
    gachaCardLevel: card16
      ? (activeState.cardsInput[card16.Id]?.level ?? 0)
      : 0,
    regularGachas: balance.Gacha.filter(
      (gacha) =>
        [GachaType.Normal, GachaType.Premium, GachaType.Rare].includes(
          gacha.GachaType,
        ) && gacha.Id !== "GachaCrusher",
    ),
    fixedGachas: balance.Gacha.filter(
      (gacha) =>
        (gacha.GachaType === GachaType.Fixed ||
          gacha.GuaranteedCardIds?.length) &&
        !(
          balance.BalanceProperties[0]?.IsWorldEvergreen &&
          gacha.Id === "GachaLegendary"
        ),
    ),
    freeGachaIndex: activeState.freeGachaInput?.index ?? null,
    freeGachaAvailableAt: activeState.freeGachaInput?.availableAt ?? null,
  };
}

export function buildRocksProjection(
  activeState: ActiveState,
): RocksProjection {
  return {
    rewardCycles: activeState.rewardCyclesInput.map((cycle) => ({ ...cycle })),
  };
}

export function cardLevelsFromState(
  activeState: ActiveState,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(activeState.cardsInput).map(([cardId, input]) => [
      cardId,
      input.level,
    ]),
  );
}

function automationForGenerator(
  generatorId: string,
  managers: Card[],
  map: MapProjection,
): { cardId: string; automationLevel: number } | undefined {
  const mapCell = map.displayRows
    .flat()
    .find(
      (cell) =>
        cell.kind === "mineshaft" &&
        mapTokenParts(cell.token)[1] === generatorId,
    );
  const parts = mapCell ? mapTokenParts(mapCell.token) : [];
  const cardId =
    parts[4] ?? managers.find((card) => card.StatModifierType !== 9)?.Id;
  const automationLevel = Number(parts[5] ?? 0);
  return cardId ? { cardId, automationLevel } : undefined;
}

function isAutomationMet(
  automation: { cardId: string; automationLevel: number } | undefined,
  cardLevels: Record<string, number>,
): boolean {
  if (!automation) {
    return false;
  }
  return (cardLevels[automation.cardId] ?? 0) >= automation.automationLevel;
}

function buildDeliveryRow(
  balance: Balance,
  activeState: ActiveState,
  delivery: Delivery,
  incomePerSecond: number,
  globalRank: number,
  effects: NamedGlobalEffects,
): DeliveryRowProjection {
  const rewardName = deliveryName(delivery);
  const reward = deliveryReward(delivery);
  const oddsWeight =
    reward.DetailedType === "Dynamite"
      ? Math.round(delivery.Weight * effects.DeliveryDynamiteMult)
      : delivery.Weight;
  const count =
    activeState.deliveryInput.claimedCountsById[String(delivery.Id)] ?? 0;
  const unlocked = globalRank >= delivery.RankUnlock;
  return {
    source: delivery,
    rewardName,
    ...deliveryValue(
      balance,
      activeState,
      delivery,
      incomePerSecond,
      globalRank,
      effects,
    ),
    rawWeight: delivery.Weight,
    oddsWeight,
    nextDeliveryPercent: 0,
    unlocked,
    eligibleForNext:
      unlocked && (delivery.MaxDupes === -1 || count < delivery.MaxDupes),
    count,
    total: delivery.MaxDupes,
  };
}

function deliveryName(delivery: Delivery): string {
  const reward = deliveryReward(delivery);
  const names: Record<string, string> = {
    tinygoblin: "Goblin",
    Soft: "Elixir",
    Core: "Gold",
    Dynamite: "Dynamite",
  };
  return `${names[reward.DetailedType] ?? reward.DetailedType}${
    delivery.IsAd ? " (ad)" : ""
  }`;
}

function deliveryValue(
  balance: Balance,
  activeState: ActiveState,
  delivery: Delivery,
  incomePerSecond: number,
  globalRank: number,
  effects: NamedGlobalEffects,
): Pick<DeliveryRowProjection, "valueLabel" | "numericValue"> {
  const reward = deliveryReward(delivery);
  switch (reward.DetailedType) {
    case "tinygoblin":
      return {
        valueLabel: String(
          Math.max(
            1,
            activeState.goblinsInput.goblinPurchaseLevel +
              delivery.QuantityBase,
          ),
        ),
        numericValue: Math.max(
          1,
          activeState.goblinsInput.goblinPurchaseLevel + delivery.QuantityBase,
        ),
      };
    case "Soft":
      return { valueLabel: "??", numericValue: null };
    case "Core": {
      const deliveryCurrencyMult = effects.DeliveryCurrencyMult;
      const numericValue =
        incomePerSecond *
        coreDeliveryQuantity(delivery, globalRank) *
        deliveryCurrencyMult;
      return { valueLabel: numberFormat(numericValue), numericValue };
    }
    case "Dynamite":
      return { valueLabel: "1", numericValue: 1 };
    default:
      return { valueLabel: "-", numericValue: null };
  }
}

function coreDeliveryQuantity(delivery: Delivery, globalRank: number): number {
  // Delivery rank is zero-based even though the derived globalRank is
  // intentionally one-based. Keep this adaptation local so other formula
  // consumers retain their documented rank behavior.
  const deliveryRank = Math.max(0, globalRank - 1);

  if (delivery.QuantityFormulaType !== FormulaType.InverseExpoRounded) {
    return calculateFormula(delivery.QuantityFormulaType, deliveryRank, {
      baseValue: delivery.QuantityBase,
      multiplier: delivery.QuantityMultiplier,
      growth: delivery.QuantityGrowth,
      power: delivery.QuantityPower,
      round: delivery.QuantityRound,
    });
  }

  // Empirical low-rank Arctic values show that QuantityPower is not applied
  // here. Rounding the raw curve to a whole number before bucket rounding also
  // lets saturated Evergreen rows reach their configured 600/7500 maxima.
  const raw =
    delivery.QuantityBase +
    delivery.QuantityMultiplier *
      (1 - Math.exp(-delivery.QuantityGrowth * deliveryRank));
  const wholeNumberRaw = Math.round(raw);
  return delivery.QuantityRound > 0
    ? Math.floor(wholeNumberRaw / delivery.QuantityRound) *
        delivery.QuantityRound
    : wholeNumberRaw;
}

function deliveryReward(delivery: Delivery): RewardModel {
  return Array.isArray(delivery.RewardModel)
    ? delivery.RewardModel[0]
    : delivery.RewardModel;
}

function activeDeliveryIncomePerSecond(
  balance: Balance,
  activeState: ActiveState,
  rows: DeliveryRowProjection[],
): number {
  const props = balance.BalanceProperties[0];
  if (!props || props.DeliveryMaxDupesResetSec <= 0) {
    return 0;
  }

  const orderedRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.unlocked)
    .sort((a, b) => b.row.oddsWeight - a.row.oddsWeight || a.index - b.index)
    .map(({ row }) => row);
  let time = 0;
  let claimCount = activeState.deliveryInput.claimCount;
  const now = Date.now();
  let nextClaimCountReset = secondsUntil(
    activeState.deliveryInput.claimCountResetsAt,
    now,
    props.DeliveryClaimCountResetSec,
  );
  const simulationSeconds = secondsUntil(
    activeState.deliveryInput.duplicateCycleResetsAt,
    now,
    props.DeliveryMaxDupesResetSec,
  );
  let totalCore = 0;
  const claimed = new Map<string, number>(
    Object.entries(activeState.deliveryInput.claimedCountsById),
  );
  let firstDelivery = true;
  while (time < simulationSeconds) {
    const next =
      firstDelivery && activeState.deliveryInput.nextDeliveryAt
        ? secondsUntil(activeState.deliveryInput.nextDeliveryAt, now, 0)
        : props.DeliveryDelaySecBase *
          props.DeliveryDelaySecGrowth ** claimCount;
    firstDelivery = false;
    time += next;
    if (time > simulationSeconds) {
      break;
    }
    const row = orderedRows.find((candidate) => {
      const count = claimed.get(String(candidate.source.Id)) ?? 0;
      return candidate.total === -1 || count < candidate.total;
    });
    if (row && deliveryReward(row.source).DetailedType === "Core") {
      totalCore += row.numericValue ?? 0;
    }
    if (row) {
      const id = String(row.source.Id);
      claimed.set(id, (claimed.get(id) ?? 0) + 1);
    }
    claimCount += 1;
    while (
      props.DeliveryClaimCountResetSec > 0 &&
      time >= nextClaimCountReset
    ) {
      claimCount = 0;
      nextClaimCountReset += props.DeliveryClaimCountResetSec;
    }
  }

  return simulationSeconds > 0 ? totalCore / simulationSeconds : 0;
}

function secondsUntil(
  date: Date | null,
  nowMilliseconds: number,
  fallbackSeconds: number,
): number {
  if (!date) return fallbackSeconds;
  return Math.max(0, (date.getTime() - nowMilliseconds) / 1000);
}

function goblinSpawnIntervalSeconds(
  balance: Balance,
  activeState: ActiveState,
): number {
  const spawningCart = balance.SpawningCart[0];
  if (!spawningCart) {
    return 0;
  }

  const base = calculateFormula(spawningCart.SpawnDelaySecFormulaType, 0, {
    baseValue: spawningCart.SpawnDelaySecBase,
    multiplier: spawningCart.SpawnDelaySecMultiplier,
    growth: spawningCart.SpawnDelaySecGrowth,
  });

  return (
    base - buildNamedGlobalEffects(balance, activeState).GoblinCannonTimerChange
  );
}

function buildGlobalEffectProjections(
  balance: Balance,
  effects: NamedGlobalEffects,
): SummaryProjection["globalEffects"] {
  return (Object.keys(GLOBAL_EFFECT_LABELS) as GlobalEffectId[])
    .filter((id) => isGlobalEffectApplicable(balance, id))
    .map((id) => ({
      id,
      label: GLOBAL_EFFECT_LABELS[id],
      value: effects[id],
      valueLabel: formatGlobalEffectValue(id, effects[id]),
    }));
}

function formatGlobalEffectValue(id: GlobalEffectId, value: number): string {
  if (["GoblinLimitChange", "GoblinPurchaseLevelChange"].includes(id)) {
    return `+${numberFormat(value)}`;
  }
  if (id === "GoblinPurchasePrice") return `/${numberFormat(value)}`;
  if (id === "GeneratorCurrencyMult") return `x${numberFormat(value)}`;
  if (id === "GoblinCannonTimerChange") return `-${timeFormat(value, true)}`;
  if (id === "CrusherBombInterval") return timeFormat(value, true);
  if (["ProdTimePercentDecrease", "RockDoubleGemsPercentChance"].includes(id)) {
    return `${numberFormat(value * 100)}%`;
  }
  if (["RockCurrencyMult", "DeliveryCurrencyMult"].includes(id)) {
    return coefficientFormat(value, "x");
  }
  return coefficientFormat(value, "x");
}

function derivedRow(
  id: string,
  label: string,
  value: number,
  valueLabel = numberFormat(value),
) {
  return { id, label, value, valueLabel };
}

function rankUpTypeName(rankUpType: RankUpType | undefined): string {
  switch (rankUpType) {
    case RankUpType.Zone:
      return "Mine";
    case RankUpType.MineShaftAndCheckPoint:
      return "Mineshaft and Checkpoint";
    case RankUpType.MineShaftAndCheckPointAndZone:
      return "Mineshaft, Checkpoint, and Mine";
    default:
      return "-";
  }
}

function cardUnlockLabel(
  balance: Balance,
  card: Card,
  t?: LocalizationLookup,
): string {
  const rankUpType = balance.BalanceProperties[0]?.RankUpType;
  if (rankUpType === RankUpType.Zone) {
    return `Mine ${card.MineUnlock}`;
  }

  let globalRank = 0;
  for (let zoneIndex = 0; zoneIndex < balance.Zones.length; zoneIndex += 1) {
    const zone = balance.Zones[zoneIndex];
    for (const unlock of zoneRankUnlocks(zone)) {
      globalRank += 1;
      if (card.MineUnlock === globalRank) {
        const description =
          unlock.kind === "checkpoint"
            ? `Checkpoint ${unlock.checkpointNumber}`
            : unlock.mineshaftId === FORGE_ID
              ? "Beginning"
              : `${mineshaftName(unlock.mineshaftId, t)} mineshaft`;
        return rankUpType === RankUpType.MineShaftAndCheckPointAndZone
          ? `Mine ${zoneIndex + 1}: ${description}`
          : description;
      }
    }
    if (rankUpType === RankUpType.MineShaftAndCheckPoint) break;
    globalRank += 1;
    if (
      card.MineUnlock === globalRank &&
      zoneIndex + 1 < balance.Zones.length
    ) {
      return `Mine ${zoneIndex + 2}: Beginning`;
    }
  }
  return String(card.MineUnlock);
}

function mineshaftName(id: string, t?: LocalizationLookup): string {
  if (id === FORGE_ID) return "Forge";
  return t?.(`mineshaft.name.${id}`, titleCase(id)) ?? titleCase(id);
}

function formatModifierValue(value: number, statModifierType: number): string {
  if (
    [
      StatModifierType.MinerCritChanceAddition,
      StatModifierType.CoreCurrencyPercentAllRocks,
      StatModifierType.CoreCurrencyPercentDeliveries,
      StatModifierType.ProdTimeInversePercentAllGenerators,
      StatModifierType.CardsMultAllGacha,
      StatModifierType.LteRewardsMult,
      StatModifierType.DynamiteDropChanceAddition,
      StatModifierType.HardCurrencyDoubledDropChanceAddition,
      StatModifierType.GoblinKing,
      StatModifierType.AncestralPowerMult,
      StatModifierType.CrusherSpeedAddition,
      StatModifierType.DynamitePowerMult,
    ].includes(statModifierType)
  ) {
    return `+${numberFormat(value * 100)}%`;
  } else if (
    [StatModifierType.RockLegendaryChestDropChanceAddition].includes(
      statModifierType,
    )
  ) {
    return `+${(value * 100).toFixed(2)}%`;
  } else if (
    [
      StatModifierType.MinerSpawnTimeReduction,
      StatModifierType.MinerSpawnTimeReductionPerCheckPoint,
    ].includes(statModifierType)
  ) {
    return `-${timeFormat(value, true)}`;
  } else if (
    [StatModifierType.CrusherBombReduction].includes(statModifierType)
  ) {
    return `${timeFormat(value, true)}`;
  } else if (
    [
      StatModifierType.MinerCritPowerMult,
      StatModifierType.CoreCurrencyMultTargetGenerators,
      StatModifierType.CoreCurrencyMultAllGenerators,
      StatModifierType.CoreCurrencyMultAllGenPerCheckPoint,
    ].includes(statModifierType)
  ) {
    return `x${numberFormat(value)}`;
  } else if (
    [
      StatModifierType.MinerUnitCapAddition,
      StatModifierType.ReinforcementsLevelAddition,
    ].includes(statModifierType)
  ) {
    return `+${Math.round(value)}`;
  } else if (
    [
      StatModifierType.ReinforcementsCostDivider,
      StatModifierType.ReinforcementsCostDividerPerCheckPoint,
    ].includes(statModifierType)
  ) {
    return `÷${numberFormat(value)}`;
  }
  return numberFormat(value);
}

export function formatGachaCount(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }

  const lower = Math.floor(value);
  const upper = Math.ceil(value);
  const fractional = value - lower;
  if (fractional === 0) {
    return `${lower} (100%)`;
  }

  const upperPercentRaw = formatGachaCountRoundPercentage(fractional * 100, 12);
  const lowerPercentRaw = 100 - upperPercentRaw;
  const minPercent = Math.min(upperPercentRaw, lowerPercentRaw);
  const decimals =
    minPercent < 0.5 ? formatGachaCountVisiblePercentDecimals(minPercent) : 0;
  const upperPercent = formatGachaCountRoundPercentage(
    upperPercentRaw,
    decimals,
  );
  const lowerPercent = formatGachaCountRoundPercentage(
    100 - upperPercent,
    decimals,
  );

  return `${upper} (${upperPercent.toFixed(decimals)}%)\n${lower} (${lowerPercent.toFixed(decimals)}%)`;
}

function formatGachaCountVisiblePercentDecimals(value: number): number {
  for (let decimals = 1; decimals <= 6; decimals += 1) {
    if (Number(value.toFixed(decimals)) > 0) {
      return decimals;
    }
  }
  return 6;
}

function formatGachaCountRoundPercentage(
  value: number,
  decimals: number,
): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
