import type { GoblinCostProjection } from "../types/derivedTypes";
import { numberFormat, timeFormat } from "../game/format";

export function GoblinsView({
  projection,
}: {
  projection: GoblinCostProjection;
}) {
  return (
    <div className="p-3 table-responsive gng-scroll-pane">
      <p className="mb-3">
        <strong>Max Goblins:</strong> {projection.maxGoblinCount}
        <br />
        <strong>Goblin Spawn Interval:</strong>{" "}
        {timeFormat(projection.spawnIntervalSeconds)}
      </p>
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
