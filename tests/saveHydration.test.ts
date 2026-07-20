import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hydrateActiveStateFromSave } from "../src/client/game/saveHydration";
import { parseSave } from "../src/client/game/saveParser";
import { buildMapProjection } from "../src/client/game/map";
import {
  buildDeliveryProjection,
  buildRocksProjection,
} from "../src/client/game/projections";
import type { Balance } from "../src/client/types/sourceBalanceTypes";

const parsed = parseSave(
  JSON.parse(readFileSync("example-save.json.old", "utf8")) as unknown,
);

test("Evergreen save hydration produces the canonical derived rank", () => {
  const balance = readBalance("evergreen");
  assert.ok(parsed.evergreen);
  const result = hydrateActiveStateFromSave(balance, parsed, parsed.evergreen);

  assert.equal(result.activeState.selectedZoneId, "zone158");
  assert.equal(result.activeState.currenciesInput.hardCurrency, 1867);
  assert.equal(result.activeState.currenciesInput.softCurrency, 1322077);
  assert.equal(result.activeState.mapInput.checkpointsOpened, 2);
  assert.equal(result.activeState.goblinsInput.goblinPurchaseLevelProgress, 6);
  assert.equal(result.activeState.cardsInput.ca001.level, 14);
  assert.equal(result.activeState.cardsInput.ca001.quantity, 0);
  assert.equal(result.savedRank, 158);
  assert.equal(result.derivedGlobalRank, 158);
  const rocks = buildRocksProjection(result.activeState);
  assert.equal(rocks.rewardCycles.length, 5);
  assert.deepEqual(rocks.rewardCycles[0], {
    id: "rockonboardingmine2",
    index: 5,
  });
});

test("Pirate save hydration distinguishes ready-to-collect from closed shafts", () => {
  const balance = readBalance("pirate");
  assert.ok(parsed.lte);
  const result = hydrateActiveStateFromSave(balance, parsed, parsed.lte);
  const state = result.activeState;

  assert.deepEqual(
    new Set(state.mapInput.mineshaftIdsOpened),
    new Set(["spawningcart", "amethyst", "citrine"]),
  );
  assert.equal(state.generatorsInput.spawningcart.level, 40);
  assert.equal(state.generatorsInput.amethyst.level, 30);
  assert.equal(state.generatorsInput.citrine.level, 20);
  assert.equal(state.generatorsInput.agate.level, 0);
  assert.equal(state.goblinsInput.goblinPurchaseLevel, 2);
  assert.equal(state.goblinsInput.goblinPurchaseLevelProgress, 4);
  assert.equal(state.deliveryInput.claimedCountsById["1"], 1);
  assert.equal(result.savedRank, 3);
  assert.equal(result.derivedGlobalRank, 3);

  const deliveries = buildDeliveryProjection(balance, state, 100);
  const deliveryOne = deliveries.rows.find(
    (row) => String(row.source.Id) === "1",
  );
  assert.ok(deliveryOne);
  assert.equal(deliveries.claimCount, 44);
  assert.equal(deliveryOne.count, 1);
  assert.equal(deliveryOne.eligibleForNext, false);
  assert.equal(deliveryOne.nextDeliveryPercent, 0);

  const map = buildMapProjection(
    balance,
    state,
    state.selectedZoneId,
    undefined,
    { importedSnapshot: result.mapSnapshot },
  );
  assert.equal(map.isImportedSnapshot, true);
  assert.equal(map.columnCount, 7);
  assert.equal(map.rowCount, 86);
  const amethyst = map.displayRows
    .flat()
    .find((cell) => cell.token === "s:amethyst");
  assert.ok(amethyst);
  assert.equal(amethyst.row, 73);
  assert.equal(amethyst.col, 0);
  assert.equal(amethyst.rowSpan, 3);
  assert.match(amethyst.tooltip ?? "", /"State": 3/);
  const targetedGoblin = map.displayRows
    .flat()
    .find((cell) => cell.targetIndex === 99);
  assert.ok(targetedGoblin);
  assert.equal(targetedGoblin.targetDirection, "Left");
});

test("manual checkpoint input does not mutate the pristine balance map", () => {
  const balance = readBalance("pirate");
  assert.ok(parsed.lte);
  const { activeState } = hydrateActiveStateFromSave(
    balance,
    parsed,
    parsed.lte,
  );
  activeState.mapInput.checkpointsOpened = 4;
  const map = buildMapProjection(balance, activeState);

  assert.equal(map.isImportedSnapshot, false);
  assert.equal(
    map.displayRows
      .flat()
      .filter((cell) => cell.kind === "checkpoint")
      .every((cell) => !cell.hidden),
    true,
  );
});

function readBalance(id: string): Balance {
  return JSON.parse(
    readFileSync(`balance/balance_${id}.json`, "utf8"),
  ) as Balance;
}
