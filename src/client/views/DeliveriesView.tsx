import type { DeliveryProjection } from "../types/derivedTypes";
import { percentageFormat } from "../game/format";

export function DeliveriesView({
  projection,
}: {
  projection: DeliveryProjection;
}) {
  return (
    <div className="p-3 table-responsive gng-scroll-pane">
      <div className="mb-3">
        <strong>Current claim count:</strong> {projection.claimCount}
        {projection.nextDeliveryAt && (
          <div>
            <strong>Next delivery:</strong>{" "}
            {projection.nextDeliveryAt.toLocaleString()}
          </div>
        )}
        {projection.claimCountResetsAt && (
          <div>
            <strong>Claim count resets:</strong>{" "}
            {projection.claimCountResetsAt.toLocaleString()}
          </div>
        )}
        {projection.duplicateCycleResetsAt && (
          <div>
            <strong>Duplicate counts reset:</strong>{" "}
            {projection.duplicateCycleResetsAt.toLocaleString()}
          </div>
        )}
      </div>
      <table className="table table-striped table-sm">
        <thead>
          <tr>
            <th>Reward</th>
            <th>Value</th>
            <th>Raw Weight</th>
            <th>Next Delivery %</th>
            <th>Collected</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {projection.rows.map((row) => (
            <tr
              className={row.unlocked ? undefined : "gng-delivery-locked"}
              key={row.source.Id}
            >
              <td>{row.rewardName}</td>
              <td>{row.valueLabel}</td>
              <td>{row.rawWeight}</td>
              <td>{percentageFormat(row.nextDeliveryPercent, 1)}</td>
              <td>{row.count}</td>
              <td>{row.total === -1 ? "∞" : row.total}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4}>All Deliveries</td>
            <td>{projection.obtained}</td>
            <td>{projection.total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
