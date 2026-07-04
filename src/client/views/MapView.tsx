import type { MapDisplayCell, MapProjection } from "../game/derivedTypes";

export function MapView({ map }: { map: MapProjection }) {
  const baseCells = map.displayRows.flat();
  const objectCells = baseCells.filter(
    (cell) => cell.kind !== "empty" && !cell.hidden,
  );

  return (
    <div className="p-3">
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
  return (
    <div
      className={`gng-map-object gng-map-object-${cell.kind}`}
      style={{
        gridColumn: `${cell.gridColumnStart} / span ${cell.colSpan}`,
        gridRow: `${cell.gridRowStart} / span ${cell.rowSpan}`,
      }}
    >
      <div className="gng-map-object-content">
        {cell.label && <strong>{cell.label}</strong>}
        {cell.detail && <span>{cell.detail}</span>}
      </div>
    </div>
  );
}
