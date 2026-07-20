import { useState } from "react";
import { getSave } from "../api/balancesApi";
import { parseSave } from "../game/saveParser";
import type { ParsedSave, ParsedWorldSave } from "../types/parsedSaveTypes";
import type { LteScheduleEntry } from "../types/sourceBalanceTypes";

type SaveCredentials = {
  platform: "ios" | "android";
  deviceId: string;
};

const SAVE_CREDENTIALS_STORAGE_KEY = "gng-calculator.saveCredentials";

function readRememberedSaveCredentials(): SaveCredentials {
  const fallback: SaveCredentials = { platform: "ios", deviceId: "" };
  try {
    const stored = window.localStorage.getItem(SAVE_CREDENTIALS_STORAGE_KEY);
    if (!stored) return fallback;
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("platform" in parsed) ||
      !("deviceId" in parsed) ||
      (parsed.platform !== "ios" && parsed.platform !== "android") ||
      typeof parsed.deviceId !== "string"
    ) {
      return fallback;
    }
    return { platform: parsed.platform, deviceId: parsed.deviceId };
  } catch {
    return fallback;
  }
}

function rememberSaveCredentials(credentials: SaveCredentials) {
  try {
    window.localStorage.setItem(
      SAVE_CREDENTIALS_STORAGE_KEY,
      JSON.stringify(credentials),
    );
  } catch {
    // Save loading should still succeed when storage is blocked or unavailable.
  }
}

export type LoadedSaveSummary = {
  worldLabel: string;
  balanceId: string;
  lastSavedAt: Date;
  modified: boolean;
  diagnostics: string[];
};

export function SaveView({
  currentEvent,
  loadedSave,
  onLoadWorld,
}: {
  currentEvent?: LteScheduleEntry;
  loadedSave: LoadedSaveSummary | null;
  onLoadWorld: (save: ParsedSave, world: ParsedWorldSave) => Promise<void>;
}) {
  const [rememberedCredentials] = useState(readRememberedSaveCredentials);
  const [platform, setPlatform] = useState<"ios" | "android">(
    rememberedCredentials.platform,
  );
  const [deviceId, setDeviceId] = useState(rememberedCredentials.deviceId);
  const [fetchedCredentials, setFetchedCredentials] =
    useState<SaveCredentials | null>(null);
  const [rawSaveJson, setRawSaveJson] = useState("");
  const [parsedSave, setParsedSave] = useState<ParsedSave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingWorld, setLoadingWorld] = useState<"evergreen" | "lte" | null>(
    null,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setParsedSave(null);
    setFetchedCredentials(null);
    setRawSaveJson("");

    try {
      const credentials = { platform, deviceId: deviceId.trim() };
      const data = await getSave(credentials.platform, credentials.deviceId);
      const parsed = parseSave(data);
      setParsedSave(parsed);
      setFetchedCredentials(credentials);
      setRawSaveJson(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch save");
    } finally {
      setLoading(false);
    }
  }

  async function loadWorld(world: ParsedWorldSave) {
    setLoadingWorld(world.kind);
    setError(null);
    try {
      if (!parsedSave) return;
      await onLoadWorld(parsedSave, world);
      if (fetchedCredentials) rememberSaveCredentials(fetchedCredentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load save");
    } finally {
      setLoadingWorld(null);
    }
  }

  const lteMatchesCurrentEvent = Boolean(
    parsedSave?.lte &&
    currentEvent &&
    parsedSave.lte.balanceId === currentEvent.GameDataId,
  );

  return (
    <div className="p-3">
      {loadedSave && (
        <div
          className={`alert ${loadedSave.modified ? "alert-warning" : "alert-info"}`}
        >
          <strong>Loaded:</strong> {loadedSave.worldLabel} (
          {loadedSave.balanceId}){" — "}
          {loadedSave.lastSavedAt.toLocaleString()}
          {loadedSave.modified && " — inputs have been edited since loading"}
          {loadedSave.diagnostics.map((diagnostic) => (
            <div key={diagnostic}>{diagnostic}</div>
          ))}
        </div>
      )}

      <form className="row g-2 align-items-end mb-3" onSubmit={handleSubmit}>
        <div className="col-sm-3 col-lg-2">
          <label className="form-label" htmlFor="savePlatform">
            Platform
          </label>
          <select
            className="form-select"
            id="savePlatform"
            value={platform}
            onChange={(event) =>
              setPlatform(event.target.value as "ios" | "android")
            }
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

      {parsedSave && (
        <section className="mb-3">
          <p>
            <strong>Last saved:</strong>{" "}
            {parsedSave.lastSavedAt.toLocaleString()}
          </p>
          <div className="d-grid gap-2">
            {parsedSave.evergreen && (
              <button
                className="btn btn-outline-primary text-start"
                disabled={loadingWorld !== null}
                type="button"
                onClick={() => loadWorld(parsedSave.evergreen!)}
              >
                {loadingWorld === "evergreen"
                  ? "Loading..."
                  : "Load Main Mines"}
                {` — ${parsedSave.evergreen.balanceId}:${parsedSave.evergreen.zone.id}`}
              </button>
            )}
            {parsedSave.lte && (
              <button
                className="btn btn-outline-primary text-start"
                disabled={loadingWorld !== null || !lteMatchesCurrentEvent}
                type="button"
                onClick={() => loadWorld(parsedSave.lte!)}
              >
                {loadingWorld === "lte" ? "Loading..." : "Load Event"}
                {` — ${parsedSave.lte.balanceId}:${parsedSave.lte.zone.id}`}
              </button>
            )}
          </div>
          {parsedSave.lte && !lteMatchesCurrentEvent && (
            <div className="alert alert-warning mt-2 mb-0">
              The saved event balance ({parsedSave.lte.balanceId}) does not
              match the current scheduled event (
              {currentEvent?.GameDataId ?? "none"}).
            </div>
          )}
        </section>
      )}

      {rawSaveJson && (
        <details>
          <summary>Raw decoded save JSON</summary>
          <pre className="gng-json-box mt-2">{rawSaveJson}</pre>
        </details>
      )}
    </div>
  );
}
