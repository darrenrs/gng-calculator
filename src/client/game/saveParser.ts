import { dateFromDotNetTicks, dateFromUnixSeconds } from "./format";
import type {
  CardSave,
  DeliverySave,
  FreeGachaSave,
  ParsedGridCellSave,
  ParsedSave,
  ParsedWorldSave,
  ParsedZoneSave,
  RewardCycleSave,
  SaveWorldKind,
} from "../types/parsedSaveTypes";
import type { Int64Json, RawGridCellSave } from "../types/sourceSaveTypes";

export class SaveParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveParseError";
  }
}

export function parseSave(input: unknown): ParsedSave {
  const root = requireRecord(input, "save");
  const evergreen = root.Evergreen
    ? parseWorld(root.Evergreen, "evergreen")
    : undefined;
  const lte = root.Lte ? parseWorld(root.Lte, "lte") : undefined;
  if (!evergreen && !lte) {
    throw new SaveParseError("Save does not contain Evergreen or LTE data");
  }
  return {
    lastSavedAt: dateFromUnixSeconds(
      requireInt64(root.LastSave, "save.LastSave"),
    ),
    hardCurrency: optionalNumber(
      root.HardCurrencyValue,
      0,
      "save.HardCurrencyValue",
    ),
    evergreen,
    lte,
  };
}

function parseWorld(input: unknown, kind: SaveWorldKind): ParsedWorldSave {
  const path = kind === "evergreen" ? "save.Evergreen" : "save.Lte";
  const world = requireRecord(input, path);
  const diagnostics: string[] = [];
  const stringMap = optionalArray(world.StringMap, `${path}.StringMap`).map(
    (value, index) => requireString(value, `${path}.StringMap[${index}]`),
  );
  const zone = parseZone(world.Zone, stringMap, diagnostics, `${path}.Zone`);
  const cards = optionalArray(world.Cards, `${path}.Cards`).map(
    (value, index): CardSave => {
      const card = requireRecord(value, `${path}.Cards[${index}]`);
      return {
        id: requireString(card.Id, `${path}.Cards[${index}].Id`),
        level: optionalInteger(card.Level, 0, `${path}.Cards[${index}].Level`),
      };
    },
  );
  const rewardCycles = optionalArray(
    world.RewardCycles,
    `${path}.RewardCycles`,
  ).map((value, index): RewardCycleSave => {
    const cycle = requireRecord(value, `${path}.RewardCycles[${index}]`);
    return {
      id: requireString(cycle.Id, `${path}.RewardCycles[${index}].Id`),
      index: optionalInteger(
        cycle.Index,
        0,
        `${path}.RewardCycles[${index}].Index`,
      ),
    };
  });
  const freeGachaValues = optionalArray(world.FreeGachas, `${path}.FreeGachas`);
  const freeGacha = freeGachaValues[0]
    ? parseFreeGacha(freeGachaValues[0], `${path}.FreeGachas[0]`)
    : undefined;

  return {
    kind,
    balanceId: requireString(world.BalanceId, `${path}.BalanceId`),
    savedRank: optionalInteger(world.Rank, 0, `${path}.Rank`),
    softCurrency: optionalNumber(
      world.SoftCurrencyValue,
      0,
      `${path}.SoftCurrencyValue`,
    ),
    stringMap,
    delivery: parseDelivery(world, diagnostics, path),
    freeGacha,
    rewardCycles,
    cards,
    zone,
    diagnostics,
  };
}

function parseDelivery(
  world: Record<string, unknown>,
  diagnostics: string[],
  path: string,
): DeliverySave {
  const ids = optionalArray(
    world.ClaimedDeliveryDupeIds,
    `${path}.ClaimedDeliveryDupeIds`,
  ).map((value, index) =>
    requireString(value, `${path}.ClaimedDeliveryDupeIds[${index}]`),
  );
  const counts = optionalArray(
    world.ClaimedDeliveryDupeCounts,
    `${path}.ClaimedDeliveryDupeCounts`,
  ).map((value, index) =>
    optionalInteger(value, 0, `${path}.ClaimedDeliveryDupeCounts[${index}]`),
  );
  if (ids.length !== counts.length) {
    diagnostics.push(
      `Claimed delivery ID/count lengths differ (${ids.length} IDs, ${counts.length} counts)`,
    );
  }
  const claimedCountsById: Record<string, number> = {};
  for (let index = 0; index < Math.min(ids.length, counts.length); index += 1) {
    claimedCountsById[ids[index]] = counts[index];
  }
  return {
    claimCount: optionalInteger(
      world.DeliveryClaimCount,
      0,
      `${path}.DeliveryClaimCount`,
    ),
    nextDeliveryAt: optionalDotNetDate(
      world.DeliveryTime,
      `${path}.DeliveryTime`,
    ),
    claimCountResetsAt: optionalDotNetDate(
      world.DeliveryClaimCountResetTime,
      `${path}.DeliveryClaimCountResetTime`,
    ),
    duplicateCycleResetsAt: optionalDotNetDate(
      world.DeliveryDupeReset,
      `${path}.DeliveryDupeReset`,
    ),
    claimedDuplicateIds: ids,
    claimedDuplicateCounts: counts,
    claimedCountsById,
  };
}

function parseFreeGacha(input: unknown, path: string): FreeGachaSave {
  const value = requireRecord(input, path);
  return {
    index: optionalInteger(value.Index, 0, `${path}.Index`),
    availableAt: optionalDotNetDate(value.Available, `${path}.Available`),
  };
}

function parseZone(
  input: unknown,
  stringMap: string[],
  diagnostics: string[],
  path: string,
): ParsedZoneSave {
  const zone = requireRecord(input, path);
  const width = requirePositiveInteger(zone.Width, `${path}.Width`);
  const depth = requirePositiveInteger(zone.Depth, `${path}.Depth`);
  const expectedLength = width * depth;
  const sourceGrid = optionalArray(zone.Grid, `${path}.Grid`);
  if (sourceGrid.length !== expectedLength) {
    diagnostics.push(
      `Grid length ${sourceGrid.length} does not match ${width}x${depth} (${expectedLength})`,
    );
  }
  const grid = Array.from({ length: expectedLength }, (_value, index) =>
    parseGridCell(sourceGrid[index] ?? {}, index, width, stringMap, path),
  );
  return {
    id: requireString(zone.Id, `${path}.Id`),
    width,
    depth,
    coreCurrency: optionalNumber(
      zone.CoreCurrencyValue,
      0,
      `${path}.CoreCurrencyValue`,
    ),
    checkpointsOpened: optionalArray(
      zone.ClearedCheckPointLevelVals,
      `${path}.ClearedCheckPointLevelVals`,
    ).length,
    reinforcementsLevel: optionalInteger(
      zone.ReinforcementsLevel,
      0,
      `${path}.ReinforcementsLevel`,
    ),
    grid,
  };
}

function parseGridCell(
  input: unknown,
  index: number,
  width: number,
  stringMap: string[],
  zonePath: string,
): ParsedGridCellSave {
  const path = `${zonePath}.Grid[${index}]`;
  const cell = requireRecord(input, path);
  const key =
    cell.Key === undefined ? null : requireString(cell.Key, `${path}.Key`);
  const stringMapIndex = key ? optionalInteger(cell.Id, 0, `${path}.Id`) : null;
  const raw: RawGridCellSave = {
    ...(key === null ? {} : { Key: key }),
    ...(cell.Id === undefined
      ? {}
      : { Id: optionalInteger(cell.Id, 0, `${path}.Id`) }),
    ...(cell.Level === undefined
      ? {}
      : { Level: optionalInteger(cell.Level, 0, `${path}.Level`) }),
    ...(cell.InteractionValue === undefined
      ? {}
      : {
          InteractionValue: optionalNumber(
            cell.InteractionValue,
            0,
            `${path}.InteractionValue`,
          ),
        }),
    ...(cell.State === undefined
      ? {}
      : { State: optionalInteger(cell.State, 0, `${path}.State`) }),
    ...(cell.InteractionValue2 === undefined
      ? {}
      : {
          InteractionValue2: optionalNumber(
            cell.InteractionValue2,
            0,
            `${path}.InteractionValue2`,
          ),
        }),
    ...(cell.SecondaryLevel === undefined
      ? {}
      : {
          SecondaryLevel: optionalInteger(
            cell.SecondaryLevel,
            0,
            `${path}.SecondaryLevel`,
          ),
        }),
    ...(cell.SecondaryId === undefined
      ? {}
      : {
          SecondaryId: requireString(cell.SecondaryId, `${path}.SecondaryId`),
        }),
    ...(cell.TertiaryId === undefined
      ? {}
      : { TertiaryId: requireString(cell.TertiaryId, `${path}.TertiaryId`) }),
    ...(cell.TertiaryLevel === undefined
      ? {}
      : {
          TertiaryLevel: optionalInteger(
            cell.TertiaryLevel,
            0,
            `${path}.TertiaryLevel`,
          ),
        }),
  };
  return {
    index,
    rowFromBottom: Math.floor(index / width),
    column: index % width,
    key,
    stringMapIndex,
    semanticId:
      stringMapIndex === null ? null : (stringMap[stringMapIndex] ?? null),
    level: raw.Level ?? 0,
    interactionValue: raw.InteractionValue ?? null,
    powerRemaining:
      key &&
      ["e", "p", "r", "s"].includes(key) &&
      (key !== "s" || (raw.State ?? 0) === 0)
        ? (raw.InteractionValue ?? raw.Level ?? 0)
        : null,
    state: raw.State ?? 0,
    interactionValue2: raw.InteractionValue2 ?? null,
    secondaryLevel: raw.SecondaryLevel ?? null,
    secondaryId: raw.SecondaryId ?? null,
    tertiaryId: raw.TertiaryId ?? null,
    tertiaryLevel: raw.TertiaryLevel ?? null,
    raw,
  };
}

function optionalDotNetDate(value: unknown, path: string): Date | null {
  if (value === undefined || value === null || value === 0 || value === "0") {
    return null;
  }
  return dateFromDotNetTicks(requireInt64(value, path));
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SaveParseError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function optionalArray(value: unknown, path: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new SaveParseError(`${path} must be an array`);
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new SaveParseError(`${path} must be a string`);
  }
  return value;
}

function optionalNumber(
  value: unknown,
  fallback: number,
  path: string,
): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SaveParseError(`${path} must be a finite number`);
  }
  return value;
}

function optionalInteger(
  value: unknown,
  fallback: number,
  path: string,
): number {
  const result = optionalNumber(value, fallback, path);
  if (!Number.isInteger(result)) {
    throw new SaveParseError(`${path} must be an integer`);
  }
  return result;
}

function requirePositiveInteger(value: unknown, path: string): number {
  const result = optionalInteger(value, 0, path);
  if (result <= 0) {
    throw new SaveParseError(`${path} must be greater than zero`);
  }
  return result;
}

function requireInt64(value: unknown, path: string): Int64Json {
  if (typeof value === "string" && /^-?\d+$/.test(value)) return value;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  throw new SaveParseError(`${path} must be a 64-bit integer string or number`);
}
