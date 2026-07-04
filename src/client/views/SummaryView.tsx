import type { ActiveState } from "../game/activeStateTypes";
import type { SummaryProjection } from "../game/derivedTypes";
import { numberFormat } from "../game/format";

export function SummaryView({
  activeState,
  checkpointMax,
  projection,
  onCheckpointCountChange,
  onGoblinLevelChange,
}: {
  activeState: ActiveState;
  checkpointMax: number;
  projection: SummaryProjection;
  onCheckpointCountChange: (count: number) => void;
  onGoblinLevelChange: (level: number) => void;
}) {
  return (
    <div className="p-3">
      <p className="mb-3">
        Fill in the input boxes under Card and Mineshaft to get started!
      </p>

      <section className="mb-3">
        <h2 className="h6">Input</h2>
        <div className="row g-2 align-items-end">
          <div className="col-sm-3">
            <label className="form-label" htmlFor="summaryCheckpointCount">
              Checkpoint
            </label>
            <input
              className="form-control"
              id="summaryCheckpointCount"
              max={checkpointMax}
              min={0}
              type="number"
              value={activeState.map.checkpointsOpened}
              onChange={(event) =>
                onCheckpointCountChange(
                  clamp(Number(event.target.value), 0, checkpointMax),
                )
              }
            />
          </div>
          <div className="col-sm-3">
            <label className="form-label" htmlFor="summaryGoblinLevel">
              Current Goblin Level
            </label>
            <input
              className="form-control"
              id="summaryGoblinLevel"
              min={1}
              type="number"
              value={activeState.goblins.currentGoblinLevel}
              onChange={(event) =>
                onGoblinLevelChange(
                  Math.max(1, Math.floor(Number(event.target.value))),
                )
              }
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="h6">Output</h2>
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Mode</th>
              <th>Income / Sec</th>
              <th>Income / Hour</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Inactive</td>
              <td>{numberFormat(projection.inactiveIncomePerSecond)}</td>
              <td>{numberFormat(projection.inactiveIncomePerSecond * 3600)}</td>
            </tr>
            <tr>
              <td>Active</td>
              <td>{numberFormat(projection.activeIncomePerSecond)}</td>
              <td>{numberFormat(projection.activeIncomePerSecond * 3600)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}
