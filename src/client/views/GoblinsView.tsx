import type { GoblinCostProjection } from "../types/derivedTypes";
import { numberFormat, timeFormat } from "../game/format";
import { NumericInput } from "../components/NumericInput";

export function GoblinsView({
  projection,
  onGoblinPurchaseLevelChange,
}: {
  projection: GoblinCostProjection;
  onGoblinPurchaseLevelChange: (level: number) => void;
}) {
  return (
    <div className="p-3 table-responsive gng-scroll-pane">
      <div className="mb-3">
        <label className="form-label" htmlFor="goblinPurchaseLevel">
          Goblin Purchase Level
        </label>
        <NumericInput
          id="goblinPurchaseLevel"
          min={projection.minimumGoblinPurchaseLevel}
          value={projection.goblinPurchaseLevel}
          onValueChange={onGoblinPurchaseLevelChange}
        />
        <div>
          <strong>Goblin Spawn Interval:</strong>{" "}
          {timeFormat(projection.spawnIntervalSeconds)}
        </div>
      </div>
      <table className="table table-striped table-sm">
        <thead>
          <tr>
            <th>Level</th>
            {projection.labels.map((label) => (
              <th key={label}>Goblin {label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projection.rows.map((row) => (
            <tr key={row.baseLevel}>
              <th>{row.displayLevel}</th>
              {row.costs.map((cost, index) => (
                <td key={index}>{numberFormat(cost)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
