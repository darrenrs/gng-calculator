import type { Balance } from "../game/sourceTypes";

export function MapView({
  balance,
  selectedZoneId,
  onSelectedZoneIdChange,
}: {
  balance: Balance;
  selectedZoneId: string;
  onSelectedZoneIdChange: (zoneId: string) => void;
}) {
  const selectedZone = balance.Zones.find((zone) => zone.Id === selectedZoneId) ?? balance.Zones[0];
  const cells = selectedZone?.Grid.split(",") ?? [];
  const rows = [];

  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7));
  }

  return (
    <div className="p-3">
      <div className="row g-2 align-items-end mb-3">
        <div className="col-sm-4 col-lg-3">
          <label className="form-label" htmlFor="zoneSelect">
            Map
          </label>
          <select
            className="form-select"
            id="zoneSelect"
            value={selectedZone?.Id ?? ""}
            onChange={(event) => onSelectedZoneIdChange(event.target.value)}
          >
            {balance.Zones.map((zone) => (
              <option key={zone.Id} value={zone.Id}>
                {zone.Id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-responsive gng-scroll-pane">
        <table className="table table-bordered table-sm align-middle gng-map-table">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{cell === "." ? "" : cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
