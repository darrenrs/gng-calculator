import {
  generatorIncome,
  generatorUpgradeCostToNextObjective,
  getGenerators,
  globalGeneratorCards,
  managerCardsForGenerator,
  maxCardLevel,
} from "../game/balanceCalculations";
import type { LocalizationLookup } from "../game/derivedTypes";
import { numberFormat } from "../game/format";
import type { Balance, Card } from "../game/sourceTypes";

interface MineshaftsViewProps {
  balance: Balance;
  cardLevels: Record<string, number>;
  mineshaftLevels: Record<string, number>;
  checkpointCount: number;
  onCardLevelChange: (cardId: string, level: number) => void;
  onMineshaftLevelChange: (generatorId: string, level: number) => void;
  onCheckpointCountChange: (count: number) => void;
  t: LocalizationLookup;
}

export function MineshaftsView({
  balance,
  cardLevels,
  mineshaftLevels,
  checkpointCount,
  onCardLevelChange,
  onMineshaftLevelChange,
  onCheckpointCountChange,
  t,
}: MineshaftsViewProps) {
  const globalCards = globalGeneratorCards(balance);

  return (
    <div className="p-3">
      <div className="row g-2 align-items-end mb-3">
        <div className="col-sm-3 col-lg-2">
          <label className="form-label" htmlFor="checkpointCount">
            Gates Opened
          </label>
          <select
            className="form-select"
            id="checkpointCount"
            value={checkpointCount}
            onChange={(event) => onCheckpointCountChange(Number(event.target.value))}
          >
            {[0, 1, 2, 3].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>
        {globalCards.map((card) => (
          <CardLevelSelect
            balance={balance}
            card={card}
            key={card.Id}
            level={cardLevels[card.Id] ?? 0}
            onChange={onCardLevelChange}
            t={t}
          />
        ))}
      </div>

      <div className="table-responsive gng-scroll-pane">
        <table className="table table-striped table-sm align-middle gng-mineshaft-table">
          <thead>
            <tr>
              <th>Mineshaft</th>
              <th>Level</th>
              <th>Managers</th>
              <th>Next Objective Cost</th>
              <th>Income / Cycle</th>
              <th>Time</th>
              <th>Income / Sec</th>
            </tr>
          </thead>
          <tbody>
            {getGenerators(balance).map(({ id, source }) => {
              const level = mineshaftLevels[id] ?? 1;
              const income = generatorIncome(
                balance,
                id,
                source,
                level,
                cardLevels,
                checkpointCount,
              );
              const nextCost = generatorUpgradeCostToNextObjective(
                balance,
                id,
                source,
                level,
              );
              const perSecond =
                income.cycleSeconds > 0
                  ? income.incomePerCycle / income.cycleSeconds
                  : Infinity;

              return (
                <tr key={id}>
                  <td>{id === "spawningcart" ? "Spawning Cart" : titleCase(id)}</td>
                  <td className="gng-level-cell">
                    <input
                      className="form-control form-control-sm"
                      min={1}
                      type="number"
                      value={level}
                      onChange={(event) =>
                        onMineshaftLevelChange(id, Math.max(1, Number(event.target.value)))
                      }
                    />
                  </td>
                  <td>
                    {managerCardsForGenerator(balance, id).map((card) => (
                      <div key={card.Id}>{t(`card.${card.Id}.name`, card.Id)}</div>
                    ))}
                  </td>
                  <td>{nextCost === null ? "-" : numberFormat(nextCost)}</td>
                  <td>{numberFormat(income.incomePerCycle)}</td>
                  <td>{formatSeconds(income.cycleSeconds)}</td>
                  <td>{numberFormat(perSecond)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CardLevelSelect({
  balance,
  card,
  level,
  onChange,
  t,
}: {
  balance: Balance;
  card: Card;
  level: number;
  onChange: (cardId: string, level: number) => void;
  t: LocalizationLookup;
}) {
  const maxLevel = maxCardLevel(balance, card);

  return (
    <div className="col-sm-3 col-lg-2">
      <label className="form-label" htmlFor={`card-${card.Id}`}>
        {t(`card.${card.Id}.name`, card.Id)}
      </label>
      <select
        className="form-select"
        id={`card-${card.Id}`}
        value={level}
        onChange={(event) => onChange(card.Id, Number(event.target.value))}
      >
        {Array.from({ length: maxLevel + 1 }, (_value, index) => (
          <option key={index} value={index}>
            {index}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return "-";
  }
  return `${seconds.toLocaleString(undefined, { maximumFractionDigits: 2 })}s`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
