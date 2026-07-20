import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aggregateEffects } from "../src/client/game/effects";
import type { Balance } from "../src/client/types/sourceBalanceTypes";
import { StatModifierType } from "../src/client/types/sourceBalanceTypes";

test("effect aggregation retains card/checkpoint sources and target aggregates", () => {
  const balance = JSON.parse(
    readFileSync("balance/balance_pirate.json", "utf8"),
  ) as Balance;
  const targetCard = balance.Cards.find(
    (card) =>
      card.StatModifierType ===
        StatModifierType.CoreCurrencyMultTargetGenerators &&
      card.TargetIds.length > 0,
  );
  assert.ok(targetCard);

  const effects = aggregateEffects(balance, { [targetCard.Id]: 1 }, 1);
  const evaluatedCard = effects.evaluated.find(
    (effect) =>
      effect.source.kind === "card" && effect.source.id === targetCard.Id,
  );
  assert.ok(evaluatedCard);
  assert.deepEqual(evaluatedCard.targetIds, targetCard.TargetIds);
  assert.equal(
    effects.byGeneratorId[targetCard.TargetIds[0]],
    evaluatedCard.combinedValue,
  );
  assert.equal(
    effects.evaluated.some((effect) => effect.source.kind === "checkpoint"),
    balance.CheckPoint[0]?.StatModifierType.length > 0,
  );
});
