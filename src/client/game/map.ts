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
import { maxGoblinCount } from "./balanceCalculations";
import { titleCase } from "./format";

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

export type ZoneRankUnlock =
  | { kind: "mineshaft"; mineshaftId: string }
  | { kind: "checkpoint"; checkpointNumber: number };

export function zoneRankUnlocks(zone?: Zone): ZoneRankUnlock[] {
  const tokens = zone?.Grid.split(",") ?? [];
  const rows: string[][] = [];
  for (let index = 0; index < tokens.length; index += MAP_COLUMNS) {
    rows.push(tokens.slice(index, index + MAP_COLUMNS));
  }

  let checkpointNumber = 0;
  return rows
    .reverse()
    .flat()
    .flatMap((token): ZoneRankUnlock[] => {
      const [prefix, id] = mapTokenParts(token);
      if (prefix === "c") {
        return [{ kind: "mineshaft", mineshaftId: FORGE_ID }];
      }
      if (prefix === "s") {
        return [{ kind: "mineshaft", mineshaftId: id }];
      }
      if (prefix === "p") {
        checkpointNumber += 1;
        return [{ kind: "checkpoint", checkpointNumber }];
      }
      return [];
    });
}

export function zoneMineshaftIdsUnlockedByCheckpoints(
  zone: Zone | undefined,
  checkpointsOpened: number,
): string[] {
  let checkpointsPassed = 0;
  const ids: string[] = [];
  for (const unlock of zoneRankUnlocks(zone)) {
    if (unlock.kind === "checkpoint") {
      checkpointsPassed += 1;
    } else if (checkpointsPassed <= checkpointsOpened) {
      ids.push(unlock.mineshaftId);
    }
  }
  return ids;
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
    return placedCell(
      base,
      "mineshaft",
      t?.(`mineshaft.name.${id}`, titleCase(id)) ?? titleCase(id),
      index,
      zone,
      source,
      parts[2] ?? "",
    );
  }

  if (prefix === "c") {
    return placedStaticCell(
      base,
      "spawningCart",
      "Forge",
      index,
      zone,
      STATIC_MAP_SIZES[FORGE_ID],
      undefined,
    );
  }

  if (prefix === "p") {
    return placedStaticCell(
      base,
      "checkpoint",
      parts[2] ?? "",
      index,
      zone,
      STATIC_MAP_SIZES.checkpoint,
      undefined,
    );
  }

  if (prefix === "e") {
    return placedStaticCell(
      base,
      "exit",
      parts[2] ?? "",
      index,
      zone,
      STATIC_MAP_SIZES.exit,
      undefined,
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
