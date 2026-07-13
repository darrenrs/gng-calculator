import type { SummaryProjection } from "../types/derivedTypes";
import { numberFormat } from "../game/format";

export function SummaryView({ projection }: { projection: SummaryProjection }) {
  return (
    <div className="p-3">
      <p className="mb-3">Rank Up Type: {projection.rankUpType}</p>

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
              <td>Idle</td>
              <td>{numberFormat(projection.idleIncomePerSecond)}</td>
              <td>{numberFormat(projection.idleIncomePerSecond * 3600)}</td>
            </tr>
            <tr>
              <td>Active</td>
              <td>{numberFormat(projection.activeIncomePerSecond)}</td>
              <td>{numberFormat(projection.activeIncomePerSecond * 3600)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="h6">Global Effects</h2>
        <table className="table table-striped table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Effect Value</th>
            </tr>
          </thead>
          <tbody>
            {projection.globalEffects.map((effect) => (
              <tr key={effect.id}>
                <td>
                  <div>{effect.id}</div>
                  <small className="text-body-secondary">{effect.label}</small>
                </td>
                <td>{effect.valueLabel}</td>
              </tr>
            ))}
            {!projection.globalEffects.length && (
              <tr>
                <td colSpan={2}>-</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="h6">Derived Calculations</h2>
        <table className="table table-striped table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Current Value</th>
            </tr>
          </thead>
          <tbody>
            {projection.derivedCalculations.map((calculation) => (
              <tr key={calculation.id}>
                <td>{calculation.label}</td>
                <td>{calculation.valueLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="h6">Current Rank Multipliers</h2>
        <p className="mb-2">
          Zone: {projection.zoneId}; rankMultiplierIndex:{" "}
          {projection.rankMultiplierIndex}; globalRank: {projection.globalRank}
        </p>
        <table className="table table-striped table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Current Value</th>
            </tr>
          </thead>
          <tbody>
            {projection.rankMultiplierRows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{numberFormat(row.value)}</td>
              </tr>
            ))}
            {!projection.rankMultiplierRows.length && (
              <tr>
                <td colSpan={2}>-</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
