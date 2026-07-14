import type { SummaryProjection } from "../types/derivedTypes";
import { numberFormat } from "../game/format";
import { DerivedCalculationsTable } from "./DerivedCalculationsTable";
import { GlobalEffectsTable } from "./GlobalEffectsTable";
import { IncomeTable } from "./IncomeTable";

export function SummaryView({ projection }: { projection: SummaryProjection }) {
  return (
    <div className="p-3 table-responsive gng-scroll-pane">
      <p className="mb-1">
        <strong>Balance ID</strong>: {projection.balanceId}:
        {projection.zoneNumber}
      </p>
      <p className="mb-3">
        <strong>Rank Up Type</strong>: {projection.rankUpType}
      </p>

      <h2 className="h6">Income</h2>
      <IncomeTable projection={projection} />

      <h2 className="h6">Global Effects</h2>
      <GlobalEffectsTable effects={projection.globalEffects} />

      <h2 className="h6">Derived Calculations</h2>
      <DerivedCalculationsTable calculations={projection.derivedCalculations} />

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
        </tbody>
      </table>
    </div>
  );
}
