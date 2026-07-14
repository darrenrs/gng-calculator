import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildNamedGlobalEffects,
  calculateGeneratorObjectiveElixir,
  generatorUpgradeCostRange,
} from "../src/client/game/balanceCalculations";
import { numberFormat, percentageFormat } from "../src/client/game/format";
import {
  buildCardProjections,
  buildDeliveryProjection,
  buildDerivedRankState,
  buildGachaProjection,
  buildMineshaftProjections,
  buildSummaryProjection,
  deliveriesPerHour,
  getGoblinCannonLevel,
  getSelectedRankMultiplier,
} from "../src/client/game/projections";
import {
  zoneCheckpointCount,
  zoneMineshaftIds,
  zoneMineshaftIdsUnlockedByCheckpoints,
} from "../src/client/game/map";
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
  assert.equal(evergreenEffects.GoblinLimitChange, 2);
  assert.equal(evergreenEffects.GoblinPurchasePrice, 2500);
  assert.equal(evergreenEffects.GoblinCannonTimerChange, 240);
  assert.equal(evergreenEffects.GeneratorCurrencyMult, 16);

  const arctic = loadBalance("arctic");
  const arcticState = createDefaultActiveState(arctic);
  arcticState.mapInput.checkpointsOpened = 2;
  const arcticEffects = buildNamedGlobalEffects(arctic, arcticState);
  assert.equal(arcticEffects.GoblinPurchasePrice, 1_000_000);
  assert.equal(arcticEffects.GeneratorCurrencyMult, 4096);
  assert.equal(arcticEffects.GoblinCannonTimerChange, 1200);
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

test("delivery unlocks control probability and active eligibility", () => {
  const first = coreDelivery(1, 10, -1, 1);
  const second = coreDelivery(2, 30, -1, 100);
  second.RankUnlock = 2;
  const balance = deliveryBalance([first, second]);
  const state = createDefaultActiveState(balance);

  let projection = buildDeliveryProjection(balance, state, 1);
  assert.deepEqual(
    projection.rows.map((row) => [row.unlocked, row.nextDeliveryPercent]),
    [
      [true, 100],
      [false, 0],
    ],
  );
  assert.equal(projection.activeIncomePerSecond, 1);

  state.mapInput.mineshaftIdsOpened.push(zoneMineshaftIds(balance.Zones[0])[0]);
  projection = buildDeliveryProjection(balance, state, 1);
  assert.deepEqual(
    projection.rows.map((row) => [row.unlocked, row.nextDeliveryPercent]),
    [
      [true, 25],
      [true, 75],
    ],
  );
  assert.equal(projection.activeIncomePerSecond, 100);
});

test("dynamite odds use the rounded coefficient without changing raw weight", () => {
  const dynamite = delivery(1, 15, -1, "Dynamite", 1);
  const core = coreDelivery(2, 10, -1, 1);
  const balance = deliveryBalance([dynamite, core]);
  balance.Cards = [
    {
      Id: "dynamite-odds",
      Rarity: 1,
      MineUnlock: 1,
      SortingWeight: 1,
      StatModifierType: 20,
      ModifierBase: 0,
      ModifierMultiplier: 0.1,
      ModifierGrowth: 0,
      ModifierPower: 0,
      ModifierRound: 0,
      ModifierFormulaType: FormulaType.Quadratic,
      TargetIds: [],
      IsManager: false,
    },
  ];
  const state = createDefaultActiveState(balance);
  state.cardsInput["dynamite-odds"] = { level: 1, quantity: 0 };

  const rows = buildDeliveryProjection(balance, state, 1).rows;
  assert.deepEqual(
    rows.map((row) => row.rawWeight),
    [15, 10],
  );
  assert.deepEqual(
    rows.map((row) => row.oddsWeight),
    [17, 10],
  );
  assert.equal(
    Math.round(rows.reduce((total, row) => total + row.nextDeliveryPercent, 0)),
    100,
  );
});

test("checkpoint progress identifies exactly the unlocked mineshafts", () => {
  const zone = loadBalance("arctic").Zones[0];
  assert.deepEqual(zoneMineshaftIdsUnlockedByCheckpoints(zone, 0), [
    FORGE_ID,
    "amethyst",
    "citrine",
    "agate",
  ]);
  assert.deepEqual(zoneMineshaftIdsUnlockedByCheckpoints(zone, 1), [
    FORGE_ID,
    "amethyst",
    "citrine",
    "agate",
    "topaz",
    "opal",
    "jade",
  ]);
});

test("opened checkpoints make completed mineshaft segments required", () => {
  const balance = loadBalance("arctic");
  const state = createDefaultActiveState(balance);
  state.mapInput.checkpointsOpened = 1;
  state.mapInput.mineshaftIdsOpened = zoneMineshaftIdsUnlockedByCheckpoints(
    balance.Zones[0],
    1,
  );

  const rows = buildMineshaftProjections(balance, state);
  assert.equal(rows.find((row) => row.id === "amethyst")?.requiredOpen, true);
  assert.equal(rows.find((row) => row.id === "agate")?.requiredOpen, true);
  assert.equal(rows.find((row) => row.id === "topaz")?.requiredOpen, false);
});

test("Goblin deliveries use purchase level while cannon level clamps to one", () => {
  const goblin = delivery(1, 10, -1, "tinygoblin", 2);
  const balance = deliveryBalance([goblin]);
  const state = createDefaultActiveState(balance);

  assert.equal(getGoblinCannonLevel(balance, state), 1);
  state.goblinsInput.goblinPurchaseLevel = 10;
  const row = buildDeliveryProjection(balance, state, 1).rows[0];
  assert.equal(getGoblinCannonLevel(balance, state), 9);
  assert.equal(row.numericValue, 12);
});

test("delivery percentages display one decimal place", () => {
  assert.equal(percentageFormat(12.34, 1), "12.3%");
  assert.equal(percentageFormat(0, 1), "0.0%");
});

test("purchase price and generator effects use regular number formatting", () => {
  const balance = loadBalance("evergreen");
  const summary = buildSummaryProjection(
    balance,
    createDefaultActiveState(balance),
  );
  assert.equal(
    summary.globalEffects.find((row) => row.id === "GoblinPurchasePrice")
      ?.valueLabel,
    "/1",
  );
  assert.equal(
    summary.globalEffects.find((row) => row.id === "GeneratorCurrencyMult")
      ?.valueLabel,
    "x1",
  );
});

test("card unlock descriptions follow map progression", () => {
  const evergreen = loadBalance("evergreen");
  const evergreenCards = buildCardProjections(
    evergreen,
    createDefaultActiveState(evergreen),
  );
  assert.equal(
    evergreenCards.find((row) => row.card.Id === "ca003")?.unlockLabel,
    "Mine 3",
  );

  const arctic = loadBalance("arctic");
  const arcticCards = buildCardProjections(
    arctic,
    createDefaultActiveState(arctic),
  );
  assert.equal(
    arcticCards.find((row) => row.card.Id === "ca001")?.unlockLabel,
    "Forge mineshaft",
  );
  assert.equal(
    arcticCards.find((row) => row.card.Id === "ca004")?.unlockLabel,
    "Agate mineshaft",
  );
  assert.equal(
    arcticCards.find((row) => row.card.Id === "ca026")?.unlockLabel,
    "Checkpoint 1",
  );

  const christmas = loadBalance("christmas");
  const christmasCards = buildCardProjections(
    christmas,
    createDefaultActiveState(christmas),
  );
  assert.equal(
    christmasCards.find((row) => row.card.Id === "ca001")?.unlockLabel,
    "Mine 1: Forge mineshaft",
  );
  assert.equal(
    christmasCards.find((row) => row.card.Id === "ca026")?.unlockLabel,
    "Mine 2: Forge mineshaft",
  );
  assert.equal(
    christmasCards.some((row) => /^\d+$/.test(row.unlockLabel)),
    false,
  );
});

test("fresh delivery counts use cumulative exponential delays", () => {
  const balance = deliveryBalance([]);
  balance.BalanceProperties[0].DeliveryDelaySecBase = 10;
  balance.BalanceProperties[0].DeliveryDelaySecGrowth = 1;
  assert.equal(deliveriesPerHour(balance), 360);
});

test("manual Goblin King level zero maps to owned internal level one", () => {
  const balance = loadBalance("evergreen");
  const state = createDefaultActiveState(balance);
  const goblinKing = balance.Cards.find((card) => card.StatModifierType === 26);
  assert.ok(goblinKing);

  const projection = buildCardProjections(balance, state).find(
    (row) => row.card.Id === goblinKing.Id,
  );
  assert.ok(projection);
  assert.equal(projection.level, 1);
  assert.equal(projection.displayLevel, 0);
  assert.notEqual(projection.effect, 0);

  state.cardsInput[goblinKing.Id] = { level: 0, quantity: 0 };
  const lockedProjection = buildCardProjections(balance, state).find(
    (row) => row.card.Id === goblinKing.Id,
  );
  assert.equal(lockedProjection?.effect, 0);
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
