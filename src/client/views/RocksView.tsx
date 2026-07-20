import type { RocksProjection } from "../types/derivedTypes";

export function RocksView({ projection }: { projection: RocksProjection }) {
  return (
    <div className="p-3">
      <h2 className="h5">Reward Cycles</h2>
      {projection.rewardCycles.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>Reward Cycle</th>
                <th>Index</th>
              </tr>
            </thead>
            <tbody>
              {projection.rewardCycles.map((cycle) => (
                <tr key={cycle.id}>
                  <td>{cycle.id}</td>
                  <td>{cycle.index}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-body-secondary mb-0">
          No reward-cycle save data loaded.
        </p>
      )}
    </div>
  );
}
