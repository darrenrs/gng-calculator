import {
  checkpointModifier,
  generatorIncome,
  generatorUpgradeCostToNextObjective,
  getGenerators,
  globalGeneratorCards,
  managerCardsForGenerator,
  maxCardLevel,
  sortedCards,
} from "./balanceCalculations";
import { calculateStatModifier } from "./modifiers";
import { numberFormat } from "./format";
import type { ActiveState } from "./activeStateTypes";
import { SPAWNING_CART_ID } from "./activeStateTypes";
import type {
  CardProjection,
  DeliveryProjection,
  DeliveryRowProjection,
  GachaProjection,
  GoblinCostProjection,
  MapCellKind,
  MapDisplayCell,
  MapProjection,
  MineshaftProjection,
  SummaryProjection,
} from "./derivedTypes";
import type {
  Balance,
  Card,
  Delivery,
  MapSizedObject,
  MineShaft,
  Zone,
} from "./sourceTypes";

const MAP_COLUMNS = 7;
const STATIC_MAP_SIZES: Record<string, { rowSpan: number; colSpan: number }> = {
  [SPAWNING_CART_ID]: { rowSpan: 1, colSpan: 5 },
  checkpoint: { rowSpan: 1, colSpan: 5 },
  exit: { rowSpan: 1, colSpan: 3 },
};

export function buildCardProjections(
  balance: Balance,
  activeState: ActiveState,
): CardProjection[] {
  return sortedCards(balance).map((card) => {
    const level = activeState.cards[card.Id]?.level ?? 0;
    return {
      card,
      level,
      quantity: activeState.cards[card.Id]?.quantity ?? 0,
      maxLevel: maxCardLevel(balance, card),
      effect: calculateStatModifier(card, level),
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
  const openedIds = new Set(activeState.map.mineshaftIdsOpened);

  return getGenerators(balance).map(({ id, source }) => {
    const level = activeState.generators[id]?.level ?? 1;
    const income = generatorIncome(
      balance,
      id,
      source,
      level,
      cardLevels,
      activeState.map.checkpointsOpened,
    );
    const managers = managerCardsForGenerator(balance, id);
    const automation = automationForGenerator(id, managers, map);
    const automated =
      id === SPAWNING_CART_ID || isAutomationMet(automation, cardLevels);
    const existsInSelectedZone =
      id === SPAWNING_CART_ID || zoneMineshaftIds.has(id);
    const opened = id === SPAWNING_CART_ID || openedIds.has(id);
    const incomePerSecond =
      existsInSelectedZone && opened && automated && income.cycleSeconds > 0
        ? income.incomePerCycle / income.cycleSeconds
        : 0;

    return {
      id,
      source,
      level,
      managers: managers.map((card) => ({
        card,
        level: activeState.cards[card.Id]?.level ?? 0,
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
      nextObjectiveCost: generatorUpgradeCostToNextObjective(
        balance,
        id,
        source,
        level,
      ),
    };
  });
}

export function buildSummaryProjection(
  balance: Balance,
  activeState: ActiveState,
): SummaryProjection {
  const mineshafts = buildMineshaftProjections(balance, activeState);
  const inactiveIncomePerSecond = mineshafts.reduce(
    (total, mineshaft) => total + mineshaft.incomePerSecond,
    0,
  );
  const deliveries = buildDeliveryProjection(
    balance,
    activeState,
    inactiveIncomePerSecond,
  );

  return {
    checkpointsOpened: activeState.map.checkpointsOpened,
    currentGoblinLevel: activeState.goblins.currentGoblinLevel,
    inactiveIncomePerSecond,
    activeIncomePerSecond:
      inactiveIncomePerSecond + deliveries.activeIncomePerSecond,
  };
}

export function buildMapProjection(
  balance: Balance,
  activeState: ActiveState,
  selectedZoneId = activeState.selectedZoneId,
  t?: (key: string, fallback?: string) => string,
): MapProjection {
  const zone =
    balance.Zones.find((item) => item.Id === selectedZoneId) ??
    balance.Zones[0];
  const rows = gridRows(zone);
  const cells = rows.map((row, rowIndex) =>
    row.map((token, colIndex) =>
      parseMapDisplayCell(
        balance,
        activeState,
        zone,
        token,
        rowIndex,
        colIndex,
        t,
      ),
    ),
  );
  applyCoveredCells(cells);
  applyCheckpointProgress(cells, activeState.map.checkpointsOpened);

  const progressionCells = cells
    .slice()
    .reverse()
    .flatMap((row) => row)
    .map((cell, index) => ({ ...cell, progressionIndex: index }));

  return {
    zoneId: zone?.Id ?? "",
    displayRows: cells,
    progressionCells,
    rowCount: cells.length,
    columnCount: MAP_COLUMNS,
    mineshaftIdsInZone: cells
      .flat()
      .filter((cell) => cell.kind === "mineshaft")
      .map((cell) => mapTokenParts(cell.token)[1])
      .filter(Boolean),
    checkpointCount: cells.flat().filter((cell) => cell.kind === "checkpoint")
      .length,
  };
}

export function buildGoblinCostProjection(
  balance: Balance,
  activeState: ActiveState,
): GoblinCostProjection {
  const reinforcement = balance.Reinforcements[0];
  if (!reinforcement) {
    return { labels: [], rows: [] };
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
  const checkpointCount = activeState.map.checkpointsOpened;
  const levelOffset =
    balance.Cards.filter((card) => card.StatModifierType === 4).reduce(
      (total, card) =>
        total +
        calculateStatModifier(card, activeState.cards[card.Id]?.level ?? 0),
      0,
    ) + checkpointModifier(balance, 4, checkpointCount);
  const costDivider = reinforcementCostDivider(balance, activeState);

  for (let baseLevel = 1; baseLevel < 10_000; baseLevel += 1) {
    const costs = labels.map((_label, index) => {
      const totalLevels = (baseLevel - 1) * stepsPerLevel + index;
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

  return { labels, rows };
}

export function buildDeliveryProjection(
  balance: Balance,
  activeState: ActiveState,
  incomePerSecond: number,
): DeliveryProjection {
  const rows = balance.Deliveries.map((delivery) =>
    buildDeliveryRow(balance, activeState, delivery, incomePerSecond),
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
  };
}

export function buildGachaProjection(
  balance: Balance,
  activeState: ActiveState,
): GachaProjection {
  const card16 = balance.Cards.find((card) => card.StatModifierType === 16);
  return {
    unlockedCheckpointsAndShafts:
      activeState.map.checkpointsOpened +
      activeState.map.mineshaftIdsOpened.length,
    gachaCardLevel: card16 ? (activeState.cards[card16.Id]?.level ?? 0) : 0,
    scriptedGachas: balance.Gacha.filter(
      (gacha) => gacha.GuaranteedCardIds?.length,
    ),
  };
}

export function cardLevelsFromState(
  activeState: ActiveState,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(activeState.cards).map(([cardId, input]) => [
      cardId,
      input.level,
    ]),
  );
}

export function formatSpecTime(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return "-";
  }
  if (seconds >= 31_560_000) {
    const years = Math.floor(seconds / 31_560_000);
    const days = Math.floor((seconds % 31_560_000) / 86_400);
    return `${years}y ${String(days).padStart(3, "0")}d`;
  }
  if (seconds >= 864_000) {
    return `${Math.floor(seconds / 86_400)}d`;
  }
  if (seconds >= 86_400) {
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3_600);
    return `${days}d ${String(hours).padStart(2, "0")}h`;
  }
  if (seconds >= 3_600) {
    const hours = Math.floor(seconds / 3_600);
    const minutes = Math.floor((seconds % 3_600) / 60);
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${String(secs).padStart(2, "0")}s`;
  }
  if (seconds >= 1) {
    return `${Math.floor(seconds)}s`;
  }
  if (seconds >= 0.001) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  return "instant";
}

function gridRows(zone?: Zone): string[][] {
  const cells = zone?.Grid.split(",") ?? [];
  const rows = [];
  for (let index = 0; index < cells.length; index += MAP_COLUMNS) {
    rows.push(cells.slice(index, index + MAP_COLUMNS));
  }
  return rows;
}

function parseMapDisplayCell(
  balance: Balance,
  activeState: ActiveState,
  zone: Zone | undefined,
  token: string,
  row: number,
  col: number,
  t?: (key: string, fallback?: string) => string,
): MapDisplayCell {
  const parts = mapTokenParts(token);
  const prefix = parts[0];
  const base = {
    key: `${zone?.Id ?? "zone"}-${row}-${col}`,
    row,
    col,
    token,
    rowSpan: 1,
    colSpan: 1,
    gridRowStart: row + 1,
    gridColumnStart: col + 1,
    hidden: false,
    covered: false,
  };

  if (!token || token === ".") {
    return { ...base, kind: "empty", label: "" };
  }

  if (prefix === "x") {
    const source = balance.Obstructions.find((item) => item.Id === parts[1]);
    return {
      ...base,
      kind: "obstruction",
      label: "",
      ...placementFromSource(row, col, source),
    };
  }

  if (prefix === "r") {
    const source = balance.Rocks.find((item) => item.Id === parts[1]);
    return {
      ...base,
      kind: "rock",
      label: parts[2] ?? "",
      ...placementFromSource(row, col, source),
    };
  }

  if (prefix === "s") {
    const id = parts[1];
    const source = balance.MineShafts.find((item) => item.Id === id);
    const cardId = parts[4];
    const automationLevel = Number(parts[5] ?? 0);
    const automated =
      (activeState.cards[cardId]?.level ?? 0) >= automationLevel || !cardId;
    const generatorLevel = activeState.generators[id]?.level ?? 1;
    const income = source
      ? generatorIncome(
          balance,
          id,
          source,
          generatorLevel,
          cardLevelsFromState(activeState),
          activeState.map.checkpointsOpened,
        )
      : null;

    return {
      ...base,
      kind: "mineshaft",
      label: t?.(`generator.${id}.name`, titleCase(id)) ?? titleCase(id),
      detail: `Automated: ${automated ? "Yes" : "No"}\nIncome per Cycle: ${
        income ? numberFormat(income.incomePerCycle) : "-"
      }`,
      ...placementFromSource(row, col, source),
    };
  }

  if (prefix === "c") {
    const source = balance.SpawningCart[0];
    const level = activeState.generators[SPAWNING_CART_ID]?.level ?? 1;
    const income = source
      ? generatorIncome(
          balance,
          SPAWNING_CART_ID,
          source,
          level,
          cardLevelsFromState(activeState),
          activeState.map.checkpointsOpened,
        )
      : null;
    return {
      ...base,
      kind: "spawningCart",
      label: "Spawning Cart",
      detail: `Income per Cycle: ${income ? numberFormat(income.incomePerCycle) : "-"}`,
      ...placementFromSize(row, col, STATIC_MAP_SIZES[SPAWNING_CART_ID]),
    };
  }

  if (prefix === "p") {
    return {
      ...base,
      kind: "checkpoint",
      label: `Checkpoint: ${parts[2] ?? ""}`,
      detail: parts[3],
      ...placementFromSize(row, col, STATIC_MAP_SIZES.checkpoint),
    };
  }

  if (prefix === "e") {
    return {
      ...base,
      kind: "exit",
      label: `Exit: ${parts[2] ?? ""}`,
      detail: parts[3],
      ...placementFromSize(row, col, STATIC_MAP_SIZES.exit),
    };
  }

  return { ...base, kind: "unknown", label: token };
}

function applyCoveredCells(rows: MapDisplayCell[][]): void {
  for (const row of rows) {
    for (const cell of row) {
      if (cell.kind === "empty" || cell.covered) {
        continue;
      }
      for (let rowOffset = 0; rowOffset < cell.rowSpan; rowOffset += 1) {
        for (let colOffset = 0; colOffset < cell.colSpan; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) {
            continue;
          }
          const covered = rows[cell.row - rowOffset]?.[cell.col + colOffset];
          if (covered) {
            covered.covered = true;
          }
        }
      }
    }
  }
}

function applyCheckpointProgress(
  rows: MapDisplayCell[][],
  checkpointsOpened: number,
): void {
  if (checkpointsOpened <= 0) {
    return;
  }
  const checkpoints = rows
    .slice()
    .reverse()
    .flatMap((row) => row)
    .filter((cell) => cell.kind === "checkpoint");
  checkpoints.forEach((cell, index) => {
    if (index < checkpointsOpened) {
      cell.hidden = true;
    }
  });
}

function placementFromSource(
  sourceRow: number,
  sourceCol: number,
  source?: Partial<MapSizedObject>,
): {
  rowSpan: number;
  colSpan: number;
  gridRowStart: number;
  gridColumnStart: number;
} {
  return placementFromSize(sourceRow, sourceCol, {
    rowSpan: source?.DepthCells ?? 1,
    colSpan: source?.WidthCells ?? 1,
  });
}

function placementFromSize(
  sourceRow: number,
  sourceCol: number,
  size: { rowSpan: number; colSpan: number },
): {
  rowSpan: number;
  colSpan: number;
  gridRowStart: number;
  gridColumnStart: number;
} {
  const rowSpan = Math.max(1, size.rowSpan);
  const colSpan = Math.max(1, size.colSpan);
  return {
    rowSpan,
    colSpan,
    gridRowStart: Math.max(1, sourceRow - rowSpan + 2),
    gridColumnStart: sourceCol + 1,
  };
}

function mapTokenParts(token: string): string[] {
  return token.split(":");
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
): DeliveryRowProjection {
  const rewardName = deliveryName(delivery);
  return {
    source: delivery,
    rewardName,
    ...deliveryValue(balance, activeState, delivery, incomePerSecond),
    weight: delivery.Weight,
    count: 0,
    total: delivery.MaxDupes,
  };
}

function deliveryName(delivery: Delivery): string {
  const names: Record<string, string> = {
    tinygoblin: "Goblin",
    Soft: "Elixir",
    Core: "Gold",
    Dynamite: "Dynamite",
  };
  return `${names[delivery.RewardModel.DetailedType] ?? delivery.RewardModel.DetailedType}${
    delivery.IsAd ? " (ad)" : ""
  }`;
}

function deliveryValue(
  balance: Balance,
  activeState: ActiveState,
  delivery: Delivery,
  incomePerSecond: number,
): Pick<DeliveryRowProjection, "valueLabel" | "numericValue"> {
  switch (delivery.RewardModel.DetailedType) {
    case "tinygoblin":
      return {
        valueLabel: String(
          activeState.goblins.currentGoblinLevel + delivery.QuantityBase,
        ),
        numericValue:
          activeState.goblins.currentGoblinLevel + delivery.QuantityBase,
      };
    case "Soft":
      return { valueLabel: "Unknown", numericValue: null };
    case "Core": {
      const boost = deliveryBoost(balance, activeState);
      const numericValue =
        incomePerSecond * delivery.QuantityMultiplier * (1 + boost);
      return { valueLabel: numberFormat(numericValue), numericValue };
    }
    case "Dynamite":
      return { valueLabel: "Highest Goblin Lvl", numericValue: null };
    default:
      return { valueLabel: "-", numericValue: null };
  }
}

function deliveryBoost(balance: Balance, activeState: ActiveState): number {
  return balance.Cards.filter((card) => card.StatModifierType === 13).reduce(
    (total, card) =>
      total +
      calculateStatModifier(card, activeState.cards[card.Id]?.level ?? 0) / 100,
    0,
  );
}

function activeDeliveryIncomePerSecond(
  balance: Balance,
  activeState: ActiveState,
  rows: DeliveryRowProjection[],
): number {
  const props = balance.BalanceProperties[0];
  if (!props) {
    return 0;
  }

  let time = 0;
  let claimCount = 0;
  let totalCore = 0;
  const claimed = new Map<number, number>();
  while (time < props.DeliveryMaxDupesResetSec) {
    const next =
      props.DeliveryDelaySecBase * props.DeliveryDelaySecGrowth ** claimCount;
    time += next;
    if (time > props.DeliveryMaxDupesResetSec) {
      break;
    }
    const row = rows.find((candidate) => {
      const count = claimed.get(candidate.source.Id) ?? 0;
      return candidate.total === -1 || count < candidate.total;
    });
    if (row?.source.RewardModel.DetailedType === "Core") {
      totalCore += row.numericValue ?? 0;
    }
    if (row) {
      claimed.set(row.source.Id, (claimed.get(row.source.Id) ?? 0) + 1);
    }
    claimCount += 1;
    if (time >= props.DeliveryClaimCountResetSec) {
      claimCount = 0;
    }
  }

  return totalCore / props.DeliveryMaxDupesResetSec;
}

function reinforcementCostDivider(
  balance: Balance,
  activeState: ActiveState,
): number {
  const checkpointCount = activeState.map.checkpointsOpened;
  const cardDivider = balance.Cards.filter((card) =>
    [2, 3].includes(card.StatModifierType),
  ).reduce((total, card) => {
    const value = calculateStatModifier(
      card,
      activeState.cards[card.Id]?.level ?? 0,
    );
    if (!value) {
      return total;
    }
    return (
      total * (card.StatModifierType === 3 ? value ** checkpointCount : value)
    );
  }, 1);
  const checkpointDivider =
    (checkpointModifier(balance, 2, checkpointCount) || 1) *
    (checkpointModifier(balance, 3, checkpointCount) || 1);
  return cardDivider * checkpointDivider;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
