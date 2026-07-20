import { useMemo, useState } from "react";
import type {
  LocalizationLookup,
  MineshaftProjection,
} from "../types/derivedTypes";
import { numberFormat, timeFormat } from "../game/format";
import {
  calculateGeneratorObjectiveElixir,
  generatorUpgradeCostRange,
} from "../game/balanceCalculations";
import type { Balance } from "../types/sourceBalanceTypes";
import { NumericInput } from "../components/NumericInput";

interface MineshaftsViewProps {
  balance: Balance;
  objectiveElixirMultiplier: number;
  mineshafts: MineshaftProjection[];
  onCardLevelChange: (cardId: string, level: number) => void;
  onGeneratorAutomatedChange: (generatorId: string, automated: boolean) => void;
  onGeneratorLevelChange: (generatorId: string, level: number) => void;
  onGeneratorOpenedChange: (generatorId: string, opened: boolean) => void;
  t: LocalizationLookup;
}

export function MineshaftsView({
  balance,
  objectiveElixirMultiplier,
  mineshafts,
  onCardLevelChange,
  onGeneratorAutomatedChange,
  onGeneratorLevelChange,
  onGeneratorOpenedChange,
  t,
}: MineshaftsViewProps) {
  const [selectedGeneratorId, setSelectedGeneratorId] = useState(
    mineshafts[0]?.id ?? "",
  );
  const visibleMineshafts = mineshafts.filter(
    (mineshaft) => mineshaft.existsInSelectedZone,
  );
  const selected =
    visibleMineshafts.find(
      (mineshaft) => mineshaft.id === selectedGeneratorId,
    ) ?? visibleMineshafts[0];

  return (
    <div className="p-3">
      <div className="table-responsive gng-scroll-pane mb-3">
        <table className="table table-striped table-sm align-middle gng-mineshaft-table">
          <thead>
            <tr>
              <th>Mineshaft</th>
              <th>Open</th>
              <th>Automated</th>
              <th>Level</th>
              <th>Managers</th>
              <th>Income / Cycle</th>
              <th>Cycle Time</th>
              <th>Idle Income %</th>
              <th>Active Income %</th>
              <th>Upgrade Cost</th>
              <th>Idle Time to Upgrade</th>
              <th>Active Time to Upgrade</th>
            </tr>
          </thead>
          <tbody>
            {visibleMineshafts.map((mineshaft) => (
              <MineshaftRow
                key={mineshaft.id}
                mineshaft={mineshaft}
                onCardLevelChange={onCardLevelChange}
                onGeneratorAutomatedChange={onGeneratorAutomatedChange}
                onGeneratorLevelChange={onGeneratorLevelChange}
                onGeneratorOpenedChange={onGeneratorOpenedChange}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>

      <section>
        <div className="row g-2 align-items-end mb-2">
          <div className="col-sm-4">
            <label className="form-label" htmlFor="upgradeGenerator">
              Upgrade Table
            </label>
            <select
              className="form-select"
              id="upgradeGenerator"
              value={selected?.id ?? ""}
              onChange={(event) => setSelectedGeneratorId(event.target.value)}
            >
              {visibleMineshafts.map((mineshaft) => (
                <option key={mineshaft.id} value={mineshaft.id}>
                  {displayName(mineshaft.id, t)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {selected && (
          <UpgradeTable
            balance={balance}
            mineshaft={selected}
            objectiveElixirMultiplier={objectiveElixirMultiplier}
          />
        )}
      </section>
    </div>
  );
}

function MineshaftRow({
  mineshaft,
  onCardLevelChange,
  onGeneratorAutomatedChange,
  onGeneratorLevelChange,
  onGeneratorOpenedChange,
  t,
}: {
  mineshaft: MineshaftProjection;
  onCardLevelChange: (cardId: string, level: number) => void;
  onGeneratorAutomatedChange: (generatorId: string, automated: boolean) => void;
  onGeneratorLevelChange: (generatorId: string, level: number) => void;
  onGeneratorOpenedChange: (generatorId: string, opened: boolean) => void;
  t: LocalizationLookup;
}) {
  return (
    <tr>
      <td>{displayName(mineshaft.id, t)}</td>
      <td>
        <input
          checked={mineshaft.opened}
          disabled={mineshaft.requiredOpen}
          type="checkbox"
          onChange={(event) =>
            onGeneratorOpenedChange(mineshaft.id, event.target.checked)
          }
        />
      </td>
      <td>
        <input
          checked={mineshaft.automated}
          disabled={!mineshaft.automationCardId}
          type="checkbox"
          onChange={(event) =>
            onGeneratorAutomatedChange(mineshaft.id, event.target.checked)
          }
        />
      </td>
      <td className="gng-level-cell-td">
        <div className="gng-level-cell">
          <NumericInput
            className="form-control form-control-sm"
            min={0}
            value={mineshaft.level}
            onValueChange={(value) =>
              onGeneratorLevelChange(mineshaft.id, value)
            }
          />
        </div>
      </td>
      <td>
        {mineshaft.managers.map((manager) => (
          <div className="gng-manager-input" key={manager.card.Id}>
            <span>
              {t(
                `card.rarity.${rarityName(manager.card.Rarity)}.singular`,
                "Manager",
              )}
              {manager.automationLevel
                ? ` Auto at ${manager.automationLevel}`
                : ""}
            </span>
            <NumericInput
              className="form-control form-control-sm"
              max={manager.maxLevel}
              min={0}
              value={manager.level}
              onValueChange={(value) =>
                onCardLevelChange(
                  manager.card.Id,
                  Math.max(0, Math.min(manager.maxLevel, value)),
                )
              }
            />
          </div>
        ))}
      </td>
      <td>{mineshaft.opened ? numberFormat(mineshaft.incomePerCycle) : ""}</td>
      <td>{mineshaft.opened ? timeFormat(mineshaft.cycleSeconds) : ""}</td>
      <td>
        {mineshaft.opened ? `${mineshaft.idleIncomePercent.toFixed(2)}%` : ""}
      </td>
      <td>
        {mineshaft.opened ? `${mineshaft.activeIncomePercent.toFixed(2)}%` : ""}
      </td>
      <td>
        {!mineshaft.opened
          ? ""
          : mineshaft.nextObjectiveCost === null
            ? "-"
            : numberFormat(mineshaft.nextObjectiveCost)}
      </td>
      <td>
        {!mineshaft.opened
          ? ""
          : mineshaft.idleTimeToUpgrade === null
            ? "-"
            : timeFormat(mineshaft.idleTimeToUpgrade)}
      </td>
      <td>
        {!mineshaft.opened
          ? ""
          : mineshaft.activeTimeToUpgrade === null
            ? "-"
            : timeFormat(mineshaft.activeTimeToUpgrade)}
      </td>
    </tr>
  );
}

function UpgradeTable({
  balance,
  mineshaft,
  objectiveElixirMultiplier,
}: {
  balance: Balance;
  mineshaft: MineshaftProjection;
  objectiveElixirMultiplier: number;
}) {
  const rows = useMemo(() => {
    const objective = balance.GeneratorObjectives.find(
      (item) => item.GeneratorId === mineshaft.id,
    );
    if (!objective) {
      return [];
    }
    let level = 1;
    const maxCurrency =
      balance.BalanceProperties[0]?.AntiCheatSettings?.CoreCurrencyMax ??
      Infinity;
    return objective.ObjectiveCount.map((count, index) => {
      const from = level;
      const to = level + count;
      level = to;
      return {
        objective: to,
        multiplier: objective.CoreCurrencyMultiplier[index] ?? 1,
        cost: generatorUpgradeCostRange(mineshaft.source, from, to),
        elixir: calculateGeneratorObjectiveElixir(
          balance,
          mineshaft.id,
          index,
          objectiveElixirMultiplier,
        ),
      };
    }).filter((row) => row.cost <= maxCurrency);
  }, [balance, mineshaft, objectiveElixirMultiplier]);

  return (
    <div className="table-responsive">
      <table className="table table-striped table-sm">
        <thead>
          <tr>
            <th>Objective</th>
            <th>Multiplier</th>
            <th>Cost</th>
            <th>Elixir Gained</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.objective}>
              <td>{row.objective}</td>
              <td>x{row.multiplier.toLocaleString()}</td>
              <td>{numberFormat(row.cost)}</td>
              <td>{row.elixir === null ? "-" : numberFormat(row.elixir)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function displayName(id: string, t: LocalizationLookup): string {
  if (id === "spawningcart") {
    return "Forge";
  }
  return t(`mineshaft.name.${id}`, titleCase(id));
}

function rarityName(rarity: number): string {
  const names: Record<number, string> = {
    1: "common",
    2: "uncommon",
    3: "rare",
    4: "eventepic",
    5: "legendary",
    6: "majestic",
    7: "ancestral",
  };
  return names[rarity] ?? String(rarity);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
