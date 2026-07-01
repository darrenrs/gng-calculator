import { useEffect, useMemo, useState } from "react";
import {
  getBalance,
  getBalanceIds,
  getLocalization,
  getSchedule,
} from "./api/balancesApi";
import { CardsView } from "./views/CardsView";
import { GachaView } from "./views/GachaView";
import { MapView } from "./views/MapView";
import { MineshaftsView } from "./views/MineshaftsView";
import { SaveView } from "./views/SaveView";
import type { AppViewId } from "./game/derivedTypes";
import { lookupLocalization, parseLocalization } from "./game/localization";
import type { Balance, LteScheduleEntry } from "./game/sourceTypes";

const FALLBACK_BALANCE_ID = "evergreen";
const views: Array<{ id: AppViewId; label: string }> = [
  { id: "map", label: "Map" },
  { id: "mineshafts", label: "Mineshafts" },
  { id: "cards", label: "Cards" },
  { id: "gacha", label: "Gacha" },
  { id: "save", label: "Save" },
];

export function App() {
  const [balanceIds, setBalanceIds] = useState<string[]>([]);
  const [selectedBalanceId, setSelectedBalanceId] = useState(FALLBACK_BALANCE_ID);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [schedule, setSchedule] = useState<LteScheduleEntry[]>([]);
  const [localizationText, setLocalizationText] = useState("");
  const [activeView, setActiveView] = useState<AppViewId>("map");
  const [balancePanelOpen, setBalancePanelOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [cardLevels, setCardLevels] = useState<Record<string, number>>({});
  const [mineshaftLevels, setMineshaftLevels] = useState<Record<string, number>>({});
  const [checkpointCount, setCheckpointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const localization = useMemo(
    () => parseLocalization(localizationText),
    [localizationText],
  );
  const t = (key: string, fallback?: string) =>
    lookupLocalization(localization, key, fallback);
  const balanceName = t(`theme.${selectedBalanceId}.name`, titleCase(selectedBalanceId));

  useEffect(() => {
    Promise.allSettled([getBalanceIds(), getSchedule(), getLocalization()]).then(
      ([balanceIdsResult, scheduleResult, localizationResult]) => {
        if (balanceIdsResult.status === "fulfilled") {
          setBalanceIds(balanceIdsResult.value);
        }
        if (scheduleResult.status === "fulfilled") {
          setSchedule(
            scheduleResult.value.LteDatas ?? scheduleResult.value.LteData ?? [],
          );
        }
        if (localizationResult.status === "fulfilled") {
          setLocalizationText(localizationResult.value);
        }

        const rejected = [balanceIdsResult, scheduleResult, localizationResult].find(
          (result) => result.status === "rejected",
        );
        setError(rejected ? "Some balance metadata could not be loaded." : null);
      },
    );
  }, []);

  useEffect(() => {
    setBalance(null);
    getBalance(selectedBalanceId)
      .then((data) => {
        setBalance(data);
        setSelectedZoneId(data.Zones[0]?.Id ?? "");
        setCardLevels({});
        setMineshaftLevels({});
        setCheckpointCount(0);
        setError(null);
      })
      .catch((err) => {
        setError(`${err.message} error`);
      });
  }, [selectedBalanceId]);

  return (
    <>
      <header className="navbar navbar-dark bg-dark px-3 gng-header">
        <a className="navbar-brand d-flex align-items-center gap-2" href="#">
          <img src="/favicon.png" width={32} height={32} alt="" />
          <span>G&amp;G Calculator</span>
        </a>
        <button
          className="btn btn-outline-light"
          type="button"
          onClick={() => setBalancePanelOpen((isOpen) => !isOpen)}
        >
          {balanceName}
        </button>
      </header>

      {balancePanelOpen && (
        <BalancePanel
          balanceIds={balanceIds}
          schedule={schedule}
          selectedBalanceId={selectedBalanceId}
          setSelectedBalanceId={(balanceId) => {
            setSelectedBalanceId(balanceId);
            setBalancePanelOpen(false);
          }}
          t={t}
        />
      )}

      <main>
        <div className="px-3 pt-3">
          <div className="btn-group flex-wrap" role="group" aria-label="Calculator section">
            {views.map((view) => (
              <button
                className={`btn btn-sm ${
                  activeView === view.id ? "btn-info" : "btn-outline-info"
                }`}
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-warning m-3">{error}</div>}
        {!balance && activeView !== "save" && <div className="p-3">Loading...</div>}

        {balance && activeView === "map" && (
          <MapView
            balance={balance}
            selectedZoneId={selectedZoneId}
            onSelectedZoneIdChange={setSelectedZoneId}
          />
        )}
        {balance && activeView === "mineshafts" && (
          <MineshaftsView
            balance={balance}
            cardLevels={cardLevels}
            mineshaftLevels={mineshaftLevels}
            checkpointCount={checkpointCount}
            onCardLevelChange={(cardId, level) =>
              setCardLevels((levels) => ({ ...levels, [cardId]: level }))
            }
            onMineshaftLevelChange={(generatorId, level) =>
              setMineshaftLevels((levels) => ({ ...levels, [generatorId]: level }))
            }
            onCheckpointCountChange={setCheckpointCount}
            t={t}
          />
        )}
        {balance && activeView === "cards" && (
          <CardsView
            balance={balance}
            cardLevels={cardLevels}
            onCardLevelChange={(cardId, level) =>
              setCardLevels((levels) => ({ ...levels, [cardId]: level }))
            }
            t={t}
          />
        )}
        {balance && activeView === "gacha" && <GachaView balance={balance} />}
        {activeView === "save" && <SaveView />}
      </main>

      <footer className="p-3">
        &copy; 2026 Idle Game Tools :{" "}
        <a href="https://github.com/darrenrs/gng-calculator">GitHub</a>
      </footer>
    </>
  );
}

function BalancePanel({
  balanceIds,
  schedule,
  selectedBalanceId,
  setSelectedBalanceId,
  t,
}: {
  balanceIds: string[];
  schedule: LteScheduleEntry[];
  selectedBalanceId: string;
  setSelectedBalanceId: (balanceId: string) => void;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <section className="gng-balance-panel border-bottom bg-body p-3">
      <h2 className="h5">{t(`theme.${selectedBalanceId}.name`, selectedBalanceId)}</h2>
      <div className="row g-3">
        <div className="col-lg-8">
          <h3 className="h6">Schedule</h3>
          <div className="list-group">
            {schedule.map((entry) => (
              <button
                className="list-group-item list-group-item-action"
                key={entry.Id}
                type="button"
                onClick={() => setSelectedBalanceId(entry.GameDataId)}
              >
                <strong>{t(`theme.${entry.GameDataId}.name`, entry.GameDataId)}</strong>{" "}
                <span className="text-secondary">
                  {formatDate(entry.StartDateTimeUtc)} - {formatDate(entry.EndDateTimeUtc)}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="col-lg-4">
          <h3 className="h6">All Events</h3>
          <div className="list-group">
            {balanceIds
              .filter((balanceId) => balanceId !== "evergreen")
              .map((balanceId) => (
                <button
                  className="list-group-item list-group-item-action"
                  key={balanceId}
                  type="button"
                  onClick={() => setSelectedBalanceId(balanceId)}
                >
                  {t(`theme.${balanceId}.name`, titleCase(balanceId))}
                </button>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
