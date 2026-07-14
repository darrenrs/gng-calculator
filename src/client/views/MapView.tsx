import type { MapProjection } from "../types/derivedTypes";
import { MapDisplay } from "./MapDisplay";

export function MapView({
  map,
  onCheckpointCountChange,
}: {
  map: MapProjection;
  onCheckpointCountChange: (count: number) => void;
}) {
  return (
    <div className="p-3">
      <div className="mb-2">
        <strong>Dimensions:</strong> {map.columnCount}x{map.rowCount}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="mapCheckpointCount">
          Checkpoints Opened
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
          <span className="text-secondary">/ {map.checkpointCount}</span>
        </div>
      </div>
      <MapDisplay map={map} />
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
