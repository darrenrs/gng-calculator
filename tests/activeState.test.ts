import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultActiveState,
  SPAWNING_CART_ID,
} from "../src/client/game/activeStateTypes";
import type { Balance } from "../src/client/game/sourceTypes";

test("default active state uses balance defaults and keeps spawning cart opened", () => {
  const state = createDefaultActiveState(balanceSample(), "zone2");

  assert.equal(state.schemaVersion, 1);
  assert.equal(state.balanceId, "sample");
  assert.equal(state.selectedZoneId, "zone2");
  assert.equal(state.maximumCurrency, 1e100);
  assert.deepEqual(state.map.mineshaftIdsOpened, [SPAWNING_CART_ID]);
  assert.equal(state.generators[SPAWNING_CART_ID].level, 1);
  assert.equal(state.goblins.currentGoblinLevel, 1);
});

function balanceSample(): Balance {
  return {
    Id: "sample",
    BalanceProperties: [
      {
        ThemeId: "sample",
        IsWorldEvergreen: false,
        RankUpType: 2,
        AntiCheatSettings: { CoreCurrencyMax: 1e100 },
        DeliveryDelaySecBase: 22,
        DeliveryDelaySecGrowth: 1.02,
        DeliveryClaimCountResetSec: 3600,
        DeliveryMaxDupesResetSec: 14400,
      },
    ],
    Obstructions: [],
    Rocks: [],
    MineShafts: [],
    SpawningCart: [],
    GeneratorObjectives: [],
    Zones: [{ Id: "zone1", Grid: ".,.,.,.,.,.,.", RankMultipliers: [] }],
    Cards: [],
    CardUpgradeCosts: [],
    Gacha: [],
    CheckPoint: [],
    Reinforcements: [],
    Deliveries: [],
    Miners: [],
    MiningTargetHealths: null,
    FreeGachaCycle: null,
    Spells: null,
  };
}
