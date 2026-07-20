import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  dateFromDotNetTicks,
  dateFromUnixSeconds,
} from "../src/client/game/format";
import { parseSave, SaveParseError } from "../src/client/game/saveParser";

test("save time helpers distinguish Unix seconds from .NET ticks", () => {
  assert.equal(
    dateFromUnixSeconds("1784231390").toISOString(),
    "2026-07-16T19:49:50.000Z",
  );
  assert.equal(
    dateFromDotNetTicks("639198262981610000").toISOString(),
    "2026-07-16T19:18:18.161Z",
  );
});

test("example save parses both worlds and protobuf default omissions", () => {
  const raw: unknown = JSON.parse(
    readFileSync("example-save.json.old", "utf8"),
  );
  const save = parseSave(raw);

  assert.equal(save.lastSavedAt.toISOString(), "2026-07-16T19:49:50.000Z");
  assert.equal(save.hardCurrency, 1867);

  const evergreen = save.evergreen;
  assert.ok(evergreen);
  assert.equal(evergreen.balanceId, "evergreen");
  assert.equal(evergreen.savedRank, 158);
  assert.equal(evergreen.softCurrency, 1322077);
  assert.equal(evergreen.zone.id, "zone158");
  assert.equal(evergreen.zone.width, 7);
  assert.equal(evergreen.zone.depth, 48);
  assert.equal(evergreen.zone.grid.length, 336);
  assert.equal(evergreen.zone.checkpointsOpened, 2);
  assert.equal(evergreen.zone.reinforcementsLevel, 191);
  assert.equal(evergreen.zone.grid[0].key, "x");
  assert.equal(evergreen.zone.grid[0].stringMapIndex, 0);
  assert.equal(evergreen.zone.grid[0].semanticId, "block1x2");
  assert.equal(evergreen.zone.grid[49].semanticId, "citrine");
  assert.equal(evergreen.zone.grid[49].level, 500);
  assert.equal(evergreen.delivery.claimCount, 6);
  assert.equal(evergreen.delivery.claimedCountsById["18"], 2);
  assert.equal(
    evergreen.delivery.nextDeliveryAt?.toISOString(),
    "2026-07-16T19:18:18.161Z",
  );
  assert.equal(evergreen.freeGacha?.index, 304);
  assert.equal(
    evergreen.freeGacha?.availableAt?.toISOString(),
    "2026-07-16T23:15:06.405Z",
  );
  assert.equal(evergreen.rewardCycles[0].id, "rockonboardingmine2");
  assert.deepEqual(evergreen.cards[0], { id: "ca001", level: 14 });

  const lte = save.lte;
  assert.ok(lte);
  assert.equal(lte.kind, "lte");
  assert.equal(lte.balanceId, "pirate");
  assert.equal(lte.zone.grid.length, 602);
  assert.equal(lte.zone.checkpointsOpened, 0);
  assert.equal(lte.zone.grid[70].semanticId, "amethyst");
  assert.equal(lte.zone.grid[70].state, 3);
  assert.equal(lte.zone.grid[56].interactionValue, null);
  assert.equal(lte.zone.grid[56].powerRemaining, 2);
});

test("save parser rejects an unrecognized root instead of casting it", () => {
  assert.throws(() => parseSave({ LastSave: "1" }), SaveParseError);
});
