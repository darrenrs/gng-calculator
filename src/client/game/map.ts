import type { ActiveState } from "../types/activeStateTypes";
import { FORGE_ID } from "../types/activeStateTypes";
import type {
  MapCellKind,
  MapDisplayCell,
  MapProjection,
} from "../types/derivedTypes";
import type {
  Balance,
  MapSizedObject,
  Zone,
} from "../types/sourceBalanceTypes";
import { generatorIncome, maxGoblinCount } from "./balanceCalculations";
import { numberFormat, titleCase } from "./format";

const MAP_COLUMNS = 7;
const STATIC_MAP_SIZES: Record<string, { rowSpan: number; colSpan: number }> = {
  [FORGE_ID]: { rowSpan: 1, colSpan: 5 },
  checkpoint: { rowSpan: 1, colSpan: 5 },
  exit: { rowSpan: 1, colSpan: 3 },
};

export function buildMapProjection(
  balance: Balance,
  activeState: ActiveState,
  selectedZoneId = activeState.selectedZoneId,
  t?: (key: string, fallback?: string) => string,
): MapProjection {
  const zone =
    balance.Zones.find((item) => item.Id === selectedZoneId) ??
    balance.Zones[0];
  const cells = gridRows(zone).map((row, rowIndex) =>
    row.map((_token, colIndex) =>
      emptyMapDisplayCell(zone, rowIndex, colIndex),
    ),
  );
  const tokens = zone?.Grid.split(",") ?? [];
  tokens.forEach((token, index) => {
    const placement = balanceIndexToCssGrid(index, MAP_COLUMNS, 1, 1);
    const cell = parseMapDisplayCell(
      balance,
      activeState,
      zone,
      token,
      index,
      placement,
      t,
    );
    cells[cell.gridRowStart - 1][cell.gridColumnStart - 1] = cell;
  });
  applyCoveredCells(cells);
  applyCheckpointProgress(cells, activeState.mapInput.checkpointsOpened);

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
    mineshaftIdsInZone: zoneMineshaftIds(zone),
    checkpointCount: zoneCheckpointCount(zone),
    checkpointsOpened: activeState.mapInput.checkpointsOpened,
    maxGoblinCount: maxGoblinCount(balance, activeState),
  };
}

export function zoneMineshaftIds(zone?: Zone): string[] {
  return (zone?.Grid.split(",") ?? [])
    .filter((token) => mapTokenParts(token)[0] === "s")
    .map((token) => mapTokenParts(token)[1])
    .filter(Boolean);
}

export function zoneCheckpointCount(zone?: Zone): number {
  return (zone?.Grid.split(",") ?? []).filter(
    (token) => mapTokenParts(token)[0] === "p",
  ).length;
}

export function mapTokenParts(token: string): string[] {
  return token.split(":");
}

function gridRows(zone?: Zone): string[][] {
  const cells = zone?.Grid.split(",") ?? [];
  const rows = [];
  for (let index = 0; index < cells.length; index += MAP_COLUMNS) {
    rows.push(cells.slice(index, index + MAP_COLUMNS));
  }
  return rows;
}

export function balanceIndexToCssGrid(
  index: number,
  columns: number,
  colSpan = 1,
  rowSpan = 1,
): {
  saveCol: number;
  sourceRow: number;
  gridColumnStart: number;
  gridRowStart: number;
  colSpan: number;
  rowSpan: number;
} {
  const safeColSpan = Math.max(1, colSpan);
  const safeRowSpan = Math.max(1, rowSpan);
  const saveCol = (index % columns) + 1;
  const sourceRow = Math.floor(index / columns) + 1;

  return {
    saveCol,
    sourceRow,
    gridColumnStart: saveCol,
    gridRowStart: sourceRow - safeRowSpan + 1,
    colSpan: safeColSpan,
    rowSpan: safeRowSpan,
  };
}

function emptyMapDisplayCell(
  zone: Zone | undefined,
  row: number,
  col: number,
): MapDisplayCell {
  return {
    key: `${zone?.Id ?? "zone"}-${row}-${col}`,
    row,
    col,
    token: "",
    kind: "empty",
    label: "",
    rowSpan: 1,
    colSpan: 1,
    gridRowStart: row + 1,
    gridColumnStart: col + 1,
    hidden: false,
    covered: false,
  };
}

function parseMapDisplayCell(
  balance: Balance,
  activeState: ActiveState,
  zone: Zone | undefined,
  token: string,
  index: number,
  placement: ReturnType<typeof balanceIndexToCssGrid>,
  t?: (key: string, fallback?: string) => string,
): MapDisplayCell {
  const parts = mapTokenParts(token);
  const prefix = parts[0];
  const base = {
    key: `${zone?.Id ?? "zone"}-${index}`,
    row: placement.gridRowStart - 1,
    col: placement.gridColumnStart - 1,
    token,
    rowSpan: placement.rowSpan,
    colSpan: placement.colSpan,
    gridRowStart: placement.gridRowStart,
    gridColumnStart: placement.gridColumnStart,
    hidden: false,
    covered: false,
  };

  if (!token || token === ".") {
    return { ...base, kind: "empty", label: "" };
  }

  if (prefix === "x") {
    const source = balance.Obstructions.find((item) => item.Id === parts[1]);
    return placedCell(base, "obstruction", "", index, zone, source);
  }

  if (prefix === "r") {
    const source = balance.Rocks.find((item) => item.Id === parts[1]);
    return placedCell(base, "rock", parts[2] ?? "", index, zone, source);
  }

  if (prefix === "s") {
    const id = parts[1];
    const source = balance.MineShafts.find((item) => item.Id === id);
    const cardId = parts[4];
    const automationLevel = Number(parts[5] ?? 0);
    const automated =
      (activeState.cardsInput[cardId]?.level ?? 0) >= automationLevel ||
      !cardId;
    const income = source
      ? generatorIncome(
          balance,
          id,
          source,
          activeState.generatorsInput[id]?.level ?? 1,
          cardLevelsFromState(activeState),
          activeState.mapInput.checkpointsOpened,
        )
      : null;
    return placedCell(
      base,
      "mineshaft",
      t?.(`generator.${id}.name`, titleCase(id)) ?? titleCase(id),
      index,
      zone,
      source,
      `Automated: ${automated ? "Yes" : "No"}\nIncome per Cycle: ${
        income ? numberFormat(income.incomePerCycle) : "-"
      }`,
    );
  }

  if (prefix === "c") {
    const source = balance.SpawningCart[0];
    const income = source
      ? generatorIncome(
          balance,
          FORGE_ID,
          source,
          activeState.generatorsInput[FORGE_ID]?.level ?? 1,
          cardLevelsFromState(activeState),
          activeState.mapInput.checkpointsOpened,
        )
      : null;
    return placedStaticCell(
      base,
      "spawningCart",
      "Forge",
      index,
      zone,
      STATIC_MAP_SIZES[FORGE_ID],
      `Income per Cycle: ${income ? numberFormat(income.incomePerCycle) : "-"}`,
    );
  }

  if (prefix === "p") {
    return placedStaticCell(
      base,
      "checkpoint",
      `Checkpoint: ${parts[2] ?? ""}`,
      index,
      zone,
      STATIC_MAP_SIZES.checkpoint,
      parts[3],
    );
  }

  if (prefix === "e") {
    return placedStaticCell(
      base,
      "exit",
      `Exit: ${parts[2] ?? ""}`,
      index,
      zone,
      STATIC_MAP_SIZES.exit,
      parts[3],
    );
  }

  const saveOnlyKinds: Record<string, MapCellKind> = {
    b: "barrelGoblin",
    d: "barrelDelivery",
    l: "dynamite",
    m: "goblin",
    w: "reward",
    y: "goblinKing",
  };
  return saveOnlyKinds[prefix]
    ? { ...base, kind: saveOnlyKinds[prefix], label: token }
    : { ...base, kind: "unknown", label: token };
}

function placedCell(
  base: Omit<MapDisplayCell, "kind" | "label">,
  kind: MapCellKind,
  label: string,
  index: number,
  zone: Zone | undefined,
  source?: Partial<MapSizedObject>,
  detail?: string,
): MapDisplayCell {
  const placement = placementFromSource(index, MAP_COLUMNS, source);
  return {
    ...base,
    kind,
    label,
    detail,
    ...placement,
    row: placement.gridRowStart - 1,
    col: placement.gridColumnStart - 1,
  };
}

function placedStaticCell(
  base: Omit<MapDisplayCell, "kind" | "label">,
  kind: MapCellKind,
  label: string,
  index: number,
  zone: Zone | undefined,
  size: { rowSpan: number; colSpan: number },
  detail?: string,
): MapDisplayCell {
  const placement = placementFromSize(index, MAP_COLUMNS, size);
  return {
    ...base,
    kind,
    label,
    detail,
    ...placement,
    row: placement.gridRowStart - 1,
    col: placement.gridColumnStart - 1,
  };
}

function applyCoveredCells(rows: MapDisplayCell[][]): void {
  for (const row of rows) {
    for (const cell of row) {
      if (cell.kind === "empty" || cell.covered) continue;
      for (let rowOffset = 0; rowOffset < cell.rowSpan; rowOffset += 1) {
        for (let colOffset = 0; colOffset < cell.colSpan; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) continue;
          const covered = rows[cell.row + rowOffset]?.[cell.col + colOffset];
          if (covered) covered.covered = true;
        }
      }
    }
  }
}

function applyCheckpointProgress(
  rows: MapDisplayCell[][],
  checkpointsOpened: number,
): void {
  if (checkpointsOpened <= 0) return;
  rows
    .slice()
    .reverse()
    .flatMap((row) => row)
    .filter((cell) => cell.kind === "checkpoint")
    .forEach((cell, index) => {
      if (index < checkpointsOpened) cell.hidden = true;
    });
}

function placementFromSource(
  index: number,
  columns: number,
  source?: Partial<MapSizedObject>,
) {
  return placementFromSize(index, columns, {
    rowSpan: source?.DepthCells ?? 1,
    colSpan: source?.WidthCells ?? 1,
  });
}

function placementFromSize(
  index: number,
  columns: number,
  size: { rowSpan: number; colSpan: number },
) {
  return balanceIndexToCssGrid(index, columns, size.colSpan, size.rowSpan);
}

function cardLevelsFromState(activeState: ActiveState): Record<string, number> {
  return Object.fromEntries(
    Object.entries(activeState.cardsInput).map(([cardId, input]) => [
      cardId,
      input.level,
    ]),
  );
}
