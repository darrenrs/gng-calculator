import type { SummaryProjection } from "../types/derivedTypes";

export function DerivedCalculationsTable({
  calculations,
}: {
  calculations: SummaryProjection["derivedCalculations"];
}) {
  return (
    <table className="table table-striped table-sm">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Current Value</th>
        </tr>
      </thead>
      <tbody>
        {calculations.map((calculation) => (
          <tr key={calculation.id}>
            <td>{calculation.id}</td>
            <td>{calculation.label}</td>
            <td>{calculation.valueLabel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
