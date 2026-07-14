import type { SummaryProjection } from "../types/derivedTypes";

export function GlobalEffectsTable({
  effects,
}: {
  effects: SummaryProjection["globalEffects"];
}) {
  return (
    <table className="table table-striped table-sm">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Effect Value</th>
        </tr>
      </thead>
      <tbody>
        {effects.map((effect) => (
          <tr key={effect.id}>
            <td>{effect.id}</td>
            <td>{effect.label}</td>
            <td>{effect.valueLabel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
