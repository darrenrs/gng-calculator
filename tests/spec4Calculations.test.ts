import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildNamedGlobalEffects,
  calculateGeneratorObjectiveElixir,
  generatorUpgradeCostRange,
} from "../src/client/game/balanceCalculations";
import { numberFormat } from "../src/client/game/format";
import {
  buildDeliveryProjection,
  buildDerivedRankState,
  buildGachaProjection,
  buildSummaryProjection,
  getSelectedRankMultiplier,
} from "../src/client/game/projections";
import { zoneCheckpointCount, zoneMineshaftIds } from "../src/client/game/map";
import {
  createDefaultActiveState,
  FORGE_ID,
} from "../src/client/types/activeStateTypes";
import type {
  Balance,
  Delivery,
  Zone,
} from "../src/client/types/sourceBalanceTypes";
import { FormulaType } from "../src/client/types/sourceBalanceTypes";

test("derived rank state follows all three RankUpType rules", () => {
  const evergreen = loadBalance("evergreen");
  const evergreenState = createDefaultActiveState(evergreen, "zone157");
  assert.deepEqual(buildDerivedRankState(evergreen, evergreenState), {
    rankMultiplierIndex: 0,
    globalRank: 157,
  });

  const arctic = loadBalance("arctic");
  const arcticState = createDefaultActiveState(arctic, "zone1");
  assert.deepEqual(buildDerivedRankState(arctic, arcticState), {
    rankMultiplierIndex: 0,
    globalRank: 1,
  });
  openEntireZone(arcticState, arctic.Zones[0]);
  assert.deepEqual(buildDerivedRankState(arctic, arcticState), {
    rankMultiplierIndex: 14,
    globalRank: 15,
  });

  const christmas = loadBalance("christmas");
  const christmasState = createDefaultActiveState(christmas, "zone6");
  openEntireZone(christmasState, christmas.Zones[5]);
  assert.deepEqual(buildDerivedRankState(christmas, christmasState), {
    rankMultiplierIndex: 15,
    globalRank: 71,
  });
});

test("Gacha and Summary consume the same selected RankMultiplier", () => {
  const balance = loadBalance("arctic");
  const state = createDefaultActiveState(balance, "zone1");
  state.mapInput.mineshaftIdsOpened.push(
    ...zoneMineshaftIds(balance.Zones[0]).slice(0, 3),
  );

  const rank = buildDerivedRankState(balance, state);
  const selected = getSelectedRankMultiplier(balance, state);
  const gacha = buildGachaProjection(balance, state);
  const summary = buildSummaryProjection(balance, state);

  assert.equal(rank.rankMultiplierIndex, 3);
  assert.equal(gacha.unlockedCheckpointsAndShafts, 3);
  assert.equal(gacha.rankMultiplierIndex, 3);
  assert.equal(gacha.selectedRankMultiplier, selected);
  assert.equal(summary.rankMultiplierIndex, 3);
  assert.equal(summary.rankMultiplierRows.length, 12);
  assert.equal(
    summary.rankMultiplierRows.find(
      (row) => row.id === "GenObjectiveSoftCurrencyMultiplier",
    )?.value,
    1.3,
  );
});

test("checkpoint and per-checkpoint effects stack by their operators", () => {
  const evergreen = loadBalance("evergreen");
  const evergreenState = createDefaultActiveState(evergreen);
  evergreenState.mapInput.checkpointsOpened = 2;
  evergreenState.cardsInput.ca028 = { level: 1, quantity: 0 };
  evergreenState.cardsInput.ca032 = { level: 2, quantity: 0 };
  evergreenState.cardsInput.ca037 = { level: 1, quantity: 0 };

  const evergreenEffects = buildNamedGlobalEffects(evergreen, evergreenState);
  assert.equal(evergreenEffects.GoblinLimit, 2);
  assert.equal(evergreenEffects.GoblinPurchasePrice, 2500);
  assert.equal(evergreenEffects.GoblinCannonTimer, 240);
  assert.equal(evergreenEffects.GeneratorCurrencyMult, 16);

  const arctic = loadBalance("arctic");
  const arcticState = createDefaultActiveState(arctic);
  arcticState.mapInput.checkpointsOpened = 2;
  const arcticEffects = buildNamedGlobalEffects(arctic, arcticState);
  assert.equal(arcticEffects.GoblinPurchasePrice, 1_000_000);
  assert.equal(arcticEffects.GeneratorCurrencyMult, 4096);
  assert.equal(arcticEffects.GoblinCannonTimer, 1200);
  assert.equal(arcticEffects.DeliveryCurrencyMult, 5);
});

test("named effects include every identity value and average goblin damage", () => {
  const balance = loadBalance("evergreen");
  const state = createDefaultActiveState(balance);
  let effects = buildNamedGlobalEffects(balance, state);

  assert.equal(Object.keys(effects).length, 18);
  assert.equal(effects.GoblinPurchasePrice, 1);
  assert.equal(effects.GeneratorCurrencyMult, 1);
  assert.equal(effects.DeliveryCurrencyMult, 1);
  assert.equal(effects.GoblinBaseDamage, 1);

  state.cardsInput.ca031 = { level: 10, quantity: 0 };
  state.cardsInput.ca035 = { level: 5, quantity: 0 };
  state.cardsInput.ca065 = { level: 11, quantity: 0 };
  effects = buildNamedGlobalEffects(balance, state);
  const critChance = 0.69;
  const critPower = 2 * 32;
  const ancestral = 0.4808;
  assert.ok(
    Math.abs(
      effects.GoblinBaseDamage -
        (critPower * critChance + (1 - critChance)) * (1 + ancestral),
    ) < 1e-10,
  );
});

test("objective elixir uses objectiveIndex plus one and multiplies before rounding", () => {
  const arctic = loadBalance("arctic");
  const fourthRankMultiplier = arctic.Zones[0].RankMultipliers[3];
  const multiplier = fourthRankMultiplier.GenObjectiveSoftCurrencyMultiplier;

  assert.equal(
    calculateGeneratorObjectiveElixir(arctic, "amethyst", 3, multiplier),
    1,
  );
  assert.equal(
    calculateGeneratorObjectiveElixir(arctic, "amethyst", 4, multiplier),
    2,
  );
  assert.equal(
    calculateGeneratorObjectiveElixir(arctic, "spawningcart", 2, multiplier),
    2,
  );
  assert.equal(
    calculateGeneratorObjectiveElixir(arctic, "citrine", 1, multiplier),
    4,
  );
  assert.equal(
    calculateGeneratorObjectiveElixir(
      arctic,
      "citrine",
      0,
      arctic.Zones[0].RankMultipliers[2].GenObjectiveSoftCurrencyMultiplier,
    ),
    2,
  );

  const evergreen = loadBalance("evergreen");
  const evergreenMultiplier =
    evergreen.Zones.find((zone) => zone.Id === "zone157")?.RankMultipliers[0]
      .GenObjectiveSoftCurrencyMultiplier ?? 1;
  assert.equal(
    calculateGeneratorObjectiveElixir(
      evergreen,
      "spawningcart",
      33,
      evergreenMultiplier,
    ),
    24,
  );
  assert.equal(
    calculateGeneratorObjectiveElixir(
      evergreen,
      "spawningcart",
      34,
      evergreenMultiplier,
    ),
    24,
  );
});

test("Evergreen first-objective upgrade costs use raw exponential per-level costs", () => {
  const balance = loadBalance("evergreen");
  const forge = balance.SpawningCart[0];
  const amethyst = balance.MineShafts.find((mine) => mine.Id === "amethyst");
  const citrine = balance.MineShafts.find((mine) => mine.Id === "citrine");
  assert.ok(forge && amethyst && citrine);

  const costs = [forge, amethyst, citrine].map((mine) =>
    generatorUpgradeCostRange(mine, 1, 10),
  );
  assert.deepEqual(
    costs,
    [4019.417549711379, 32436.593969678655, 294220.8616876006],
  );
  assert.deepEqual(costs.map(numberFormat), ["4,019", "32,436", "294.22 K"]);
});

test.todo(
  "Arctic observed Core delivery values need the exact globalRank/map state and remaining formula verification",
);

test.todo(
  "Evergreen observed Core delivery value needs the exact selected zone and open-state snapshot",
);

test.todo("Evergreen Soft delivery formula is unknown");

test.todo("Arctic Soft delivery formula is unknown");

test("active delivery farming chooses the highest eligible weight", () => {
  const balance = deliveryBalance([
    coreDelivery(1, 1, -1, 1),
    softDelivery(2, 100, 1),
    coreDelivery(3, 50, 1, 2),
  ]);
  const state = createDefaultActiveState(balance);

  assert.equal(
    buildDeliveryProjection(balance, state, 10).activeIncomePerSecond,
    10,
  );
});

test("active delivery farming repeats the claim-count reset boundary", () => {
  const balance = deliveryBalance([coreDelivery(1, 1, -1, 1)]);
  balance.BalanceProperties[0].DeliveryDelaySecGrowth = 2;
  balance.BalanceProperties[0].DeliveryClaimCountResetSec = 3;
  balance.BalanceProperties[0].DeliveryMaxDupesResetSec = 8;
  const state = createDefaultActiveState(balance);

  assert.equal(
    buildDeliveryProjection(balance, state, 1).activeIncomePerSecond,
    5 / 8,
  );
});

test("Core delivery quantity formulas use zero-based global rank", () => {
  const balance = loadBalance("evergreen");
  const state = createDefaultActiveState(balance, "zone157");
  const projection = buildDeliveryProjection(balance, state, 10);
  const coreRows = projection.rows.filter(
    (row) =>
      (Array.isArray(row.source.RewardModel)
        ? row.source.RewardModel[0]
        : row.source.RewardModel
      ).DetailedType === "Core",
  );

  assert.equal(buildDerivedRankState(balance, state).globalRank, 157);
  assert.deepEqual(
    coreRows.map((row) => row.numericValue),
    [75_000, 15_000, 9_000, 6_000, 6_000, 3_000],
  );
});

test("Arctic Core deliveries use globalRank minus one and ignore QuantityPower", () => {
  const balance = loadBalance("arctic");
  const state = createDefaultActiveState(balance, "zone1");
  state.mapInput.mineshaftIdsOpened = [
    FORGE_ID,
    "amethyst",
    "citrine",
    "agate",
    "topaz",
  ];
  state.mapInput.checkpointsOpened = 1;
  balance.Cards = [];
  balance.Deliveries = balance.Deliveries.filter(
    (delivery) => String(delivery.Id) === "12",
  );

  const rank = buildDerivedRankState(balance, state);
  const row = buildDeliveryProjection(balance, state, 1).rows[0];

  assert.deepEqual(rank, { rankMultiplierIndex: 5, globalRank: 6 });
  // At delivery rank 5, x300 rounds 118.04 to 118, then buckets to 105.
  // The open checkpoint's +200% delivery effect then changes 105 to 315.
  assert.equal(row.numericValue, 315);
});

function loadBalance(id: string): Balance {
  return JSON.parse(
    readFileSync(`balance/balance_${id}.json`, "utf8"),
  ) as Balance;
}

function openEntireZone(
  state: ReturnType<typeof createDefaultActiveState>,
  zone: Zone,
): void {
  state.mapInput.mineshaftIdsOpened = [FORGE_ID, ...zoneMineshaftIds(zone)];
  state.mapInput.checkpointsOpened = zoneCheckpointCount(zone);
}

function deliveryBalance(deliveries: Delivery[]): Balance {
  const balance = loadBalance("arctic");
  balance.Id = "delivery-fixture";
  balance.Cards = [];
  balance.CheckPoint = [];
  balance.Deliveries = deliveries;
  balance.BalanceProperties[0].DeliveryDelaySecBase = 1;
  balance.BalanceProperties[0].DeliveryDelaySecGrowth = 1;
  balance.BalanceProperties[0].DeliveryClaimCountResetSec = 100;
  balance.BalanceProperties[0].DeliveryMaxDupesResetSec = 3;
  return balance;
}

function coreDelivery(
  id: number,
  weight: number,
  maxDupes: number,
  quantityBase: number,
): Delivery {
  return delivery(id, weight, maxDupes, "Core", quantityBase);
}

function softDelivery(id: number, weight: number, maxDupes: number): Delivery {
  return delivery(id, weight, maxDupes, "Soft", 1);
}

function delivery(
  id: number,
  weight: number,
  maxDupes: number,
  detailedType: string,
  quantityBase: number,
): Delivery {
  return {
    Id: id,
    RewardModel: [{ RewardType: 0, DetailedType: detailedType, Quantity: 1 }],
    QuantityBase: quantityBase,
    QuantityMultiplier: 0,
    QuantityGrowth: 0,
    QuantityPower: 0,
    QuantityRound: 0,
    QuantityFormulaType: FormulaType.Quadratic,
    Weight: weight,
    MaxDupes: maxDupes,
    RankUnlock: 0,
    CheckPointUnlock: 0,
    IsAd: false,
  };
}
