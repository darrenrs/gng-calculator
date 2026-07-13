import type { MapDisplayCell, MapProjection } from "../types/derivedTypes";

export function MapView({
  currentGoblinLevel,
  map,
  onCheckpointCountChange,
  onGoblinLevelChange,
}: {
  currentGoblinLevel: number;
  map: MapProjection;
  onCheckpointCountChange: (count: number) => void;
  onGoblinLevelChange: (level: number) => void;
}) {
  const baseCells = map.displayRows.flat();
  const objectCells = baseCells.filter(
    (cell) => cell.kind !== "empty" && !cell.hidden && !cell.covered,
  );

  return (
    <div className="p-3">
      <div className="row g-3 align-items-end mb-3">
        <div className="col-sm-4 col-md-3">
          <label className="form-label" htmlFor="mapCheckpointCount">
            Checkpoints
          </label>
          <div className="gng-inline-number">
            <input
              id="mapCheckpointCount"
              max={map.checkpointCount}
              min={0}
              type="number"
              value={map.checkpointsOpened}
              onChange={(event) =>
                onCheckpointCountChange(
                  clamp(Number(event.target.value), 0, map.checkpointCount),
                )
              }
            />
            <span>/{map.checkpointCount}</span>
          </div>
        </div>
        <div className="col-sm-4 col-md-3">
          <label className="form-label" htmlFor="mapGoblinLevel">
            Current Goblin Level
          </label>
          <input
            className="gng-number-input"
            id="mapGoblinLevel"
            min={1}
            type="number"
            value={currentGoblinLevel}
            onChange={(event) =>
              onGoblinLevelChange(
                Math.max(1, Math.floor(Number(event.target.value))),
              )
            }
          />
        </div>
        <div className="col-sm-4 col-md-3">
          <span className="form-label d-block">Max Goblins</span>
          <strong>{map.maxGoblinCount}</strong>
        </div>
      </div>
      <div className="gng-map-scroll">
        <div
          className="gng-map-grid"
          style={{
            gridTemplateColumns: `repeat(${map.columnCount}, var(--gng-map-cell-size))`,
            gridTemplateRows: `repeat(${map.rowCount}, var(--gng-map-cell-size))`,
          }}
        >
          {baseCells.map((cell) => (
            <div
              aria-hidden="true"
              className="gng-map-base-cell"
              key={`base-${cell.key}`}
              style={{
                gridColumn: cell.col + 1,
                gridRow: cell.row + 1,
              }}
            />
          ))}
          {objectCells.map((cell) => (
            <MapObject cell={cell} key={cell.key} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MapObject({ cell }: { cell: MapDisplayCell }) {
  const isInteractive = cell.kind !== "obstruction";
  const title = `${cell.token}\n(Col ${cell.col + 1}, Row ${cell.row + 1})`;
  return (
    <div
      className={`gng-map-object gng-map-object-${cell.kind} gng-map-cell-${cell.token.charAt(0)} ${
        isInteractive ? "gng-map-object-interactive" : ""
      }`}
      role={isInteractive ? "button" : undefined}
      style={{
        gridColumn: `${cell.gridColumnStart} / span ${cell.colSpan}`,
        gridRow: `${cell.gridRowStart} / span ${cell.rowSpan}`,
      }}
      tabIndex={isInteractive ? 0 : undefined}
      title={isInteractive ? title : undefined}
    >
      <div className="gng-map-object-content">
        {cell.label && <strong>{cell.label}</strong>}
        {cell.detail && <span>{cell.detail}</span>}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}
