import { numberFormat } from "../game/format";
import type { SummaryProjection } from "../types/derivedTypes";

export function IncomeTable({ projection }: { projection: SummaryProjection }) {
  const rows = [
    {
      mode: "Idle",
      description: "Offline or online without doing anything",
      deliveriesPerHour: 0,
      incomePerSecond: projection.idleIncomePerSecond,
    },
    {
      mode: "Active",
      description:
        "Online; collecting deliveries and running mineshafts continuously",
      deliveriesPerHour: projection.deliveriesPerHour,
      incomePerSecond: projection.activeIncomePerSecond,
    },
  ];

  return (
    <table className="table table-striped table-sm">
      <thead>
        <tr>
          <th>Mode</th>
          <th>Description</th>
          <th>Deliveries / Hour</th>
          <th>Income / Sec</th>
          <th>Income / Hour</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.mode}>
            <td>{row.mode}</td>
            <td>{row.description}</td>
            <td>{row.deliveriesPerHour.toLocaleString()}</td>
            <td>{numberFormat(row.incomePerSecond)}</td>
            <td>{numberFormat(row.incomePerSecond * 3600)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
