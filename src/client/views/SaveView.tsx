import { useState } from "react";
import { getSave } from "../api/balancesApi";

export function SaveView() {
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [deviceId, setDeviceId] = useState("");
  const [saveJson, setSaveJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaveJson("");

    try {
      const data = await getSave(platform, deviceId.trim());
      setSaveJson(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-3">
      <form className="row g-2 align-items-end mb-3" onSubmit={handleSubmit}>
        <div className="col-sm-3 col-lg-2">
          <label className="form-label" htmlFor="savePlatform">
            Platform
          </label>
          <select
            className="form-select"
            id="savePlatform"
            value={platform}
            onChange={(event) => setPlatform(event.target.value as "ios" | "android")}
          >
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </select>
        </div>
        <div className="col-sm-6 col-lg-4">
          <label className="form-label" htmlFor="deviceId">
            Device ID
          </label>
          <input
            className="form-control"
            id="deviceId"
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
          />
        </div>
        <div className="col-sm-auto">
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? "Loading..." : "Fetch"}
          </button>
        </div>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}
      <pre className="gng-json-box">{saveJson}</pre>
    </div>
  );
}
