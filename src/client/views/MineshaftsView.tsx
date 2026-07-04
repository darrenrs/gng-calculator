import { useMemo, useState } from "react";
import type {
  LocalizationLookup,
  MineshaftProjection,
} from "../game/derivedTypes";
import { numberFormat, timeFormat } from "../game/format";
import type { Balance } from "../game/sourceTypes";

interface MineshaftsViewProps {
  balance: Balance;
  mineshafts: MineshaftProjection[];
  onCardLevelChange: (cardId: string, level: number) => void;
  onGeneratorLevelChange: (generatorId: string, level: number) => void;
  onGeneratorOpenedChange: (generatorId: string, opened: boolean) => void;
  t: LocalizationLookup;
}

export function MineshaftsView({
  balance,
  mineshafts,
  onCardLevelChange,
  onGeneratorLevelChange,
  onGeneratorOpenedChange,
  t,
}: MineshaftsViewProps) {
  const [selectedGeneratorId, setSelectedGeneratorId] = useState(
    mineshafts[0]?.id ?? "",
  );
  const selected =
    mineshafts.find((mineshaft) => mineshaft.id === selectedGeneratorId) ??
    mineshafts[0];

  return (
    <div className="p-3">
      <div className="table-responsive gng-scroll-pane mb-3">
        <table className="table table-striped table-sm align-middle gng-mineshaft-table">
          <thead>
            <tr>
              <th>Mineshaft</th>
              <th>Open</th>
              <th>Level</th>
              <th>Managers</th>
              <th>Next Objective Cost</th>
              <th>Income / Cycle</th>
              <th>Time</th>
              <th>Income / Sec</th>
            </tr>
          </thead>
          <tbody>
            {mineshafts.map((mineshaft) => (
              <MineshaftRow
                key={mineshaft.id}
                mineshaft={mineshaft}
                onCardLevelChange={onCardLevelChange}
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
              {mineshafts.map((mineshaft) => (
                <option key={mineshaft.id} value={mineshaft.id}>
                  {displayName(mineshaft.id, t)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {selected && <UpgradeTable balance={balance} mineshaft={selected} />}
      </section>
    </div>
  );
}

function MineshaftRow({
  mineshaft,
  onCardLevelChange,
  onGeneratorLevelChange,
  onGeneratorOpenedChange,
  t,
}: {
  mineshaft: MineshaftProjection;
  onCardLevelChange: (cardId: string, level: number) => void;
  onGeneratorLevelChange: (generatorId: string, level: number) => void;
  onGeneratorOpenedChange: (generatorId: string, opened: boolean) => void;
  t: LocalizationLookup;
}) {
  const disabled = !mineshaft.existsInSelectedZone;
  return (
    <tr className={disabled ? "text-secondary" : ""}>
      <td>{displayName(mineshaft.id, t)}</td>
      <td>
        <input
          checked={mineshaft.opened}
          disabled={mineshaft.id === "spawningcart" || disabled}
          type="checkbox"
          onChange={(event) =>
            onGeneratorOpenedChange(mineshaft.id, event.target.checked)
          }
        />
      </td>
      <td className="gng-level-cell">
        <input
          className="form-control form-control-sm"
          disabled={disabled}
          min={1}
          type="number"
          value={mineshaft.level}
          onChange={(event) =>
            onGeneratorLevelChange(
              mineshaft.id,
              Math.max(1, Number(event.target.value)),
            )
          }
        />
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
            <input
              className="form-control form-control-sm"
              max={manager.maxLevel}
              min={0}
              type="number"
              value={manager.level}
              onChange={(event) =>
                onCardLevelChange(
                  manager.card.Id,
                  Math.max(
                    0,
                    Math.min(manager.maxLevel, Number(event.target.value)),
                  ),
                )
              }
            />
          </div>
        ))}
      </td>
      <td>
        {mineshaft.nextObjectiveCost === null
          ? "-"
          : numberFormat(mineshaft.nextObjectiveCost)}
      </td>
      <td>{numberFormat(mineshaft.incomePerCycle)}</td>
      <td>{timeFormat(mineshaft.cycleSeconds)}</td>
      <td>{numberFormat(mineshaft.incomePerSecond)}</td>
    </tr>
  );
}

function UpgradeTable({
  balance,
  mineshaft,
}: {
  balance: Balance;
  mineshaft: MineshaftProjection;
}) {
  const rows = useMemo(() => {
    const objective = balance.GeneratorObjectives.find(
      (item) => item.GeneratorId === mineshaft.id,
    );
    if (!objective) {
      return [];
    }
    let level = 1;
    return objective.ObjectiveCount.map((count, index) => {
      const from = level;
      const to = level + count;
      level = to;
      return {
        from,
        to,
        multiplier: objective.CoreCurrencyMultiplier[index] ?? 1,
        cost: upgradeCostRange(mineshaft.source, from, to),
      };
    });
  }, [balance, mineshaft]);

  return (
    <div className="table-responsive">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Cost</th>
            <th>Elixir Gained</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.from}-${row.to}`}>
              <td>{row.from}</td>
              <td>
                {row.to} (x{row.multiplier})
              </td>
              <td>{numberFormat(row.cost)}</td>
              <td>TBD</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function upgradeCostRange(
  source: MineshaftProjection["source"],
  from: number,
  to: number,
): number {
  let total = 0;
  for (let level = from; level < to; level += 1) {
    total += source.UpgradeCostBase * source.UpgradeCostGrowth ** (level - 1);
  }
  return total;
}

function displayName(id: string, t: LocalizationLookup): string {
  if (id === "spawningcart") {
    return "Spawning Cart";
  }
  return t(`generator.${id}.name`, titleCase(id));
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
