import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultActiveState,
  FORGE_ID,
} from "../src/client/types/activeStateTypes";
import type { Balance } from "../src/client/types/sourceBalanceTypes";

test("default active state uses balance defaults and keeps spawning cart opened", () => {
  const state = createDefaultActiveState(balanceSample(), "zone2");

  assert.equal(state.balanceId, "sample");
  assert.equal(state.selectedZoneId, "zone2");
  assert.equal(state.maximumCurrency, 1e100);
  assert.deepEqual(state.mapInput.mineshaftIdsOpened, [FORGE_ID]);
  assert.equal(state.generatorsInput[FORGE_ID].level, 1);
  assert.equal(state.goblinsInput.currentGoblinLevel, 1);
});

function balanceSample(): Balance {
  return {
    Id: "sample",
    BalanceProperties: [
      {
        ThemeId: "sample",
        IsWorldEvergreen: false,
        RankUpType: 2,
        BaseUnitCap: 10,
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
    MiningTargetHealths: [],
    FreeGachaCycle: [],
    Spells: [],
  };
}
