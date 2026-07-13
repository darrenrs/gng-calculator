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
import { numberFormat, timeFormat, titleCase } from "./format";
import type { ActiveState } from "../types/activeStateTypes";
import { FORGE_ID } from "../types/activeStateTypes";
import type {
  CardProjection,
  DerivedRankState,
  DeliveryProjection,
  DeliveryRowProjection,
  GachaProjection,
  GoblinCostProjection,
  MapProjection,
  MineshaftProjection,
  SummaryProjection,
} from "../types/derivedTypes";
import type { GlobalEffectId, NamedGlobalEffects } from "../types/derivedTypes";
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
  zoneCheckpointCount,
  zoneMineshaftIds,
} from "./map";

export { balanceIndexToCssGrid, buildMapProjection } from "./map";

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
): CardProjection[] {
  return sortedCards(balance).map((card) => {
    const level = activeState.cardsInput[card.Id]?.level ?? 0;
    const upgradeCosts =
      balance.CardUpgradeCosts.find((item) => item.Rarity === card.Rarity)
        ?.SoftCurrency ?? [];
    const spentCount = Math.max(0, level - 1);
    const effect = calculateStatModifier(card, level);
    return {
      card,
      level,
      quantity: activeState.cardsInput[card.Id]?.quantity ?? 0,
      maxLevel: maxCardLevel(balance, card),
      effect,
      effectLabel: formatModifierValue(effect, card.StatModifierType),
      elixirAllocated: sum(upgradeCosts.slice(0, spentCount)),
      elixirRemaining: sum(upgradeCosts.slice(spentCount)),
    };
  });
}

export function buildMineshaftProjections(
  balance: Balance,
  activeState: ActiveState,
): MineshaftProjection[] {
  const cardLevels = cardLevelsFromState(activeState);
  const map = buildMapProjection(
    balance,
    activeState,
    activeState.selectedZoneId,
    undefined,
  );
  const zoneMineshaftIds = new Set(map.mineshaftIdsInZone);
  const openedIds = new Set(activeState.mapInput.mineshaftIdsOpened);

  const rows = getGenerators(balance).map(({ id, source }) => {
    const level = activeState.generatorsInput[id]?.level ?? 1;
    const income = generatorIncome(
      balance,
      id,
      source,
      level,
      cardLevels,
      activeState.mapInput.checkpointsOpened,
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
  const activeIncomePerSecond =
    activeGeneratorIncomePerSecond + activeDeliveryIncomePerSecond;

  return {
    zoneId: activeState.selectedZoneId,
    checkpointsOpened: activeState.mapInput.checkpointsOpened,
    currentGoblinLevel: activeState.goblinsInput.currentGoblinLevel,
    idleIncomePerSecond: idleIncomePerSecond,
    activeIncomePerSecond,
    rankUpType: rankUpTypeName(balance.BalanceProperties[0]?.RankUpType),
    rankMultiplierIndex: rank.rankMultiplierIndex,
    globalRank: rank.globalRank,
    globalEffects: buildGlobalEffectProjections(effects),
    derivedCalculations: [
      derivedRow(
        "GoblinLimit",
        "Goblin Limit (Max Goblins)",
        (balance.BalanceProperties[0]?.BaseUnitCap ?? 0) + effects.GoblinLimit,
      ),
      derivedRow(
        "GoblinPurchasePrice",
        "Goblin Purchase Price Divider",
        effects.GoblinPurchasePrice,
        `/${numberFormat(effects.GoblinPurchasePrice)}`,
      ),
      derivedRow(
        "GoblinPurchaseLevel",
        "Goblin Purchase Level",
        effects.GoblinPurchaseLevel,
        `+${numberFormat(effects.GoblinPurchaseLevel)}`,
      ),
      derivedRow(
        "GoblinSpawnInterval",
        "Goblin Spawn Interval",
        spawnIntervalSeconds,
        timeFormat(spawnIntervalSeconds, true),
      ),
      derivedRow("IdleIncome", "Idle Income / Sec", idleIncomePerSecond),
      derivedRow("ActiveIncome", "Active Income / Sec", activeIncomePerSecond),
    ],
    rankMultiplierRows: selectedRankMultiplier
      ? RANK_MULTIPLIER_KEYS.map((id) => ({
          id,
          value: selectedRankMultiplier[id],
        }))
      : [],
  };
}

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

export function buildGoblinCostProjection(
  balance: Balance,
  activeState: ActiveState,
): GoblinCostProjection {
  const reinforcement = balance.Reinforcements[0];
  if (!reinforcement) {
    return {
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
  const levelOffset = effects.GoblinPurchaseLevel;
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
  const rows = balance.Deliveries.map((delivery) =>
    buildDeliveryRow(
      balance,
      activeState,
      delivery,
      incomePerSecond,
      globalRank,
    ),
  );
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
        gacha.GachaType === GachaType.Fixed || gacha.GuaranteedCardIds?.length,
    ),
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
): DeliveryRowProjection {
  const rewardName = deliveryName(delivery);
  return {
    source: delivery,
    rewardName,
    ...deliveryValue(
      balance,
      activeState,
      delivery,
      incomePerSecond,
      globalRank,
    ),
    weight: delivery.Weight,
    count: 0,
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
): Pick<DeliveryRowProjection, "valueLabel" | "numericValue"> {
  const reward = deliveryReward(delivery);
  switch (reward.DetailedType) {
    case "tinygoblin":
      return {
        valueLabel: String(
          Math.max(1, activeState.goblinsInput.currentGoblinLevel - 1),
        ),
        numericValue: Math.max(
          1,
          activeState.goblinsInput.currentGoblinLevel - 1,
        ),
      };
    case "Soft":
      return { valueLabel: "Unknown", numericValue: null };
    case "Core": {
      const deliveryCurrencyMult = buildNamedGlobalEffects(
        balance,
        activeState,
      ).DeliveryCurrencyMult;
      const numericValue =
        incomePerSecond *
        coreDeliveryQuantity(delivery, globalRank) *
        deliveryCurrencyMult;
      return { valueLabel: numberFormat(numericValue), numericValue };
    }
    case "Dynamite":
      return { valueLabel: "Highest Goblin Level", numericValue: null };
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
    .sort((a, b) => b.row.weight - a.row.weight || a.index - b.index)
    .map(({ row }) => row);
  let time = 0;
  let claimCount = 0;
  let nextClaimCountReset = props.DeliveryClaimCountResetSec;
  let totalCore = 0;
  const claimed = new Map<number, number>();
  while (time < props.DeliveryMaxDupesResetSec) {
    const next =
      props.DeliveryDelaySecBase * props.DeliveryDelaySecGrowth ** claimCount;
    time += next;
    if (time > props.DeliveryMaxDupesResetSec) {
      break;
    }
    const row = orderedRows.find((candidate) => {
      const count = claimed.get(candidate.source.Id) ?? 0;
      return candidate.total === -1 || count < candidate.total;
    });
    if (row && deliveryReward(row.source).DetailedType === "Core") {
      totalCore += row.numericValue ?? 0;
    }
    if (row) {
      claimed.set(row.source.Id, (claimed.get(row.source.Id) ?? 0) + 1);
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

  return totalCore / props.DeliveryMaxDupesResetSec;
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

  return base - buildNamedGlobalEffects(balance, activeState).GoblinCannonTimer;
}

const GLOBAL_EFFECT_LABELS: Record<GlobalEffectId, string> = {
  GoblinLimit: "Goblin Count Limit",
  GoblinPurchasePrice: "Goblin Discount",
  GoblinPurchaseLevel: "Goblin Purchase Level",
  GoblinBaseDamage: "Goblin Base Damage",
  GoblinCannonTimer: "Goblin Spawn Time Reduction",
  GeneratorCurrencyMult: "Global Generator Currency Multiplier",
  RockCurrencyMult: "Rock Currency Percentage Increase",
  DeliveryCurrencyMult: "Delivery Currency Percentage Increase",
  ProdTimePercentDecrease: "Production Time Percentage Decrease",
  CardsMult: "Chest Card Count Multiplier",
  LteRewardsMult: "Event Rewards Multiplier",
  DeliveryDynamiteMult: "Dynamite Delivery Odds Multiplier",
  RockDoubleGemsPercentChance: "Rock Double Gems Percent Chance",
  DynamiteBaseDamage: "Dynamite Base Damage",
  RockLegendaryChestMult: "Rock Legendary Chest Odds Multiplier",
  CrusherSpeedMult: "Crusher Speed Multiplier",
  CrusherBombInterval: "Crusher Bomb Time Interval",
  GoblinKingDamageModifier: "Goblin King Damage Effect",
};

function buildGlobalEffectProjections(
  effects: NamedGlobalEffects,
): SummaryProjection["globalEffects"] {
  return (Object.keys(GLOBAL_EFFECT_LABELS) as GlobalEffectId[]).map((id) => ({
    id,
    label: GLOBAL_EFFECT_LABELS[id],
    value: effects[id],
    valueLabel: formatGlobalEffectValue(id, effects[id]),
  }));
}

function formatGlobalEffectValue(id: GlobalEffectId, value: number): string {
  if (["GoblinLimit", "GoblinPurchaseLevel"].includes(id)) {
    return `+${numberFormat(value)}`;
  }
  if (id === "GoblinPurchasePrice") return `/${numberFormat(value)}`;
  if (id === "GoblinCannonTimer") return `-${timeFormat(value, true)}`;
  if (id === "CrusherBombInterval") return timeFormat(value, true);
  if (["ProdTimePercentDecrease", "RockDoubleGemsPercentChance"].includes(id)) {
    return `${numberFormat(value * 100)}%`;
  }
  if (["RockCurrencyMult", "DeliveryCurrencyMult"].includes(id)) {
    return `${numberFormat(value * 100)}%`;
  }
  return `x${numberFormat(value)}`;
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
    return `/${numberFormat(value)}`;
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
