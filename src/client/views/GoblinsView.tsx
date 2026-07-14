import { useEffect, useState } from "react";
import type { GoblinCostProjection } from "../types/derivedTypes";
import { numberFormat, timeFormat } from "../game/format";

export function GoblinsView({
  projection,
  onGoblinPurchaseLevelChange,
}: {
  projection: GoblinCostProjection;
  onGoblinPurchaseLevelChange: (level: number) => void;
}) {
  const [purchaseLevelDraft, setPurchaseLevelDraft] = useState(
    String(projection.goblinPurchaseLevel),
  );

  useEffect(() => {
    setPurchaseLevelDraft(String(projection.goblinPurchaseLevel));
  }, [projection.goblinPurchaseLevel]);

  function commitPurchaseLevel() {
    const parsed = Number(purchaseLevelDraft);
    const level = Number.isFinite(parsed)
      ? Math.max(projection.minimumGoblinPurchaseLevel, Math.floor(parsed))
      : projection.goblinPurchaseLevel;
    setPurchaseLevelDraft(String(level));
    onGoblinPurchaseLevelChange(level);
  }

  return (
    <div className="p-3 table-responsive gng-scroll-pane">
      <div className="mb-3">
        <label className="form-label" htmlFor="goblinPurchaseLevel">
          Goblin Purchase Level
        </label>
        <input
          className="gng-number-input"
          id="goblinPurchaseLevel"
          inputMode="numeric"
          pattern="[0-9]*"
          type="text"
          value={purchaseLevelDraft}
          onBlur={commitPurchaseLevel}
          onChange={(event) => setPurchaseLevelDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitPurchaseLevel();
          }}
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
