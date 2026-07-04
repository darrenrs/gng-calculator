import type { DeliveryProjection } from "../game/derivedTypes";
import { numberFormat } from "../game/format";

export function DeliveriesView({
  projection,
}: {
  projection: DeliveryProjection;
}) {
  return (
    <div className="p-3 table-responsive gng-scroll-pane">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Id</th>
            <th>Reward</th>
            <th>Value</th>
            <th>Weight</th>
            <th>Obtained</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {projection.rows.map((row) => (
            <tr key={row.source.Id}>
              <td>{row.source.Id}</td>
              <td>{row.rewardName}</td>
              <td>{row.valueLabel}</td>
              <td>{row.weight}</td>
              <td>{row.count}</td>
              <td>{row.total}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3}>All Deliveries</td>
            <td />
            <td>{projection.obtained}</td>
            <td>{projection.total}</td>
          </tr>
          <tr>
            <td colSpan={3}>Active Delivery Income / Sec</td>
            <td colSpan={3}>
              {numberFormat(projection.activeIncomePerSecond)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
