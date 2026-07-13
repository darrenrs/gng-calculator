import type { DeliveryProjection } from "../types/derivedTypes";
import { timeFormat } from "../game/format";

export function DeliveriesView({
  projection,
}: {
  projection: DeliveryProjection;
}) {
  return (
    <div className="p-3 table-responsive gng-scroll-pane">
      <div className="mb-3">
        <div>
          Barrel Cycle Resets Every{" "}
          {timeFormat(projection.maxDupesResetSeconds)}
        </div>
        <div>
          Barrel Time Derivative Resets Every{" "}
          {timeFormat(projection.claimCountResetSeconds)}
        </div>
      </div>
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Reward</th>
            <th>Value</th>
            <th>Weight</th>
            <th>Collected</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {projection.rows.map((row) => (
            <tr key={row.source.Id}>
              <td>{row.rewardName}</td>
              <td>{row.valueLabel}</td>
              <td>{row.weight}</td>
              <td>{row.count}</td>
              <td>{row.total}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3}>All Deliveries</td>
            <td>{projection.obtained}</td>
            <td>{projection.total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
