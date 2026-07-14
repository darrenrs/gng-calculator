import type { MapDisplayCell, MapProjection } from "../types/derivedTypes";

export function MapDisplay({ map }: { map: MapProjection }) {
  const baseCells = map.displayRows.flat();
  const objectCells = baseCells.filter(
    (cell) => cell.kind !== "empty" && !cell.hidden && !cell.covered,
  );

  return (
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
            style={{ gridColumn: cell.col + 1, gridRow: cell.row + 1 }}
          />
        ))}
        {objectCells.map((cell) => (
          <MapObject cell={cell} key={cell.key} />
        ))}
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
        {cell.detail && <strong>{cell.detail}</strong>}
      </div>
    </div>
  );
}
