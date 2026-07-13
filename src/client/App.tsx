import { useEffect, useMemo, useState } from "react";
import {
  getBalance,
  getBalanceIds,
  getLocalization,
  getSchedule,
} from "./api/balancesApi";
import {
  createDefaultActiveState,
  type ActiveState,
} from "./types/activeStateTypes";
import type { AppViewId } from "./types/derivedTypes";
import { lookupLocalization, parseLocalization } from "./game/localization";
import {
  buildCardProjections,
  buildDeliveryProjection,
  buildGachaProjection,
  buildGoblinCostProjection,
  buildMapProjection,
  buildMineshaftProjections,
  buildSummaryProjection,
  getSelectedRankMultiplier,
} from "./game/projections";
import type { Balance, LteScheduleEntry } from "./types/sourceBalanceTypes";
import { CardsView } from "./views/CardsView";
import { DeliveriesView } from "./views/DeliveriesView";
import { GachaView } from "./views/GachaView";
import { GoblinsView } from "./views/GoblinsView";
import { MapView } from "./views/MapView";
import { MineshaftsView } from "./views/MineshaftsView";
import { SaveView } from "./views/SaveView";
import { SummaryView } from "./views/SummaryView";

const FALLBACK_BALANCE_ID = "evergreen";
const views: Array<{ id: AppViewId; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "map", label: "Map" },
  { id: "mineshafts", label: "Mineshafts" },
  { id: "cards", label: "Cards" },
  { id: "goblins", label: "Goblins" },
  { id: "deliveries", label: "Deliveries" },
  { id: "gacha", label: "Gacha" },
  { id: "save", label: "Save" },
];

export function App() {
  const [balanceIds, setBalanceIds] = useState<string[]>([]);
  const [selectedBalanceId, setSelectedBalanceId] =
    useState(FALLBACK_BALANCE_ID);
  const [selectedScheduleEntryId, setSelectedScheduleEntryId] = useState<
    string | null
  >(null);
  const [pendingDefaultZoneId, setPendingDefaultZoneId] = useState("zone1");
  const [balance, setBalance] = useState<Balance | null>(null);
  const [activeState, setActiveState] = useState<ActiveState | null>(null);
  const [schedule, setSchedule] = useState<LteScheduleEntry[]>([]);
  const [localizationText, setLocalizationText] = useState("");
  const [activeView, setActiveView] = useState<AppViewId>("summary");
  const [balancePanelOpen, setBalancePanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localization = useMemo(
    () => parseLocalization(localizationText),
    [localizationText],
  );
  const t = (key: string, fallback?: string) =>
    lookupLocalization(localization, key, fallback);
  const balanceName = t(
    `theme.${selectedBalanceId}.name`,
    titleCase(selectedBalanceId),
  );

  useEffect(() => {
    Promise.allSettled([
      getBalanceIds(),
      getSchedule(),
      getLocalization(),
    ]).then(([balanceIdsResult, scheduleResult, localizationResult]) => {
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

      const rejected = [
        balanceIdsResult,
        scheduleResult,
        localizationResult,
      ].find((result) => result.status === "rejected");
      setError(rejected ? "Some balance metadata could not be loaded." : null);
    });
  }, []);

  useEffect(() => {
    setBalance(null);
    setActiveState(null);
    getBalance(selectedBalanceId)
      .then((data) => {
        setBalance(data);
        setActiveState(createDefaultActiveState(data, pendingDefaultZoneId));
        setError(null);
      })
      .catch((err) => {
        setError(`${err.message} error`);
      });
  }, [selectedBalanceId, pendingDefaultZoneId]);

  const mapProjection = useMemo(
    () =>
      balance && activeState
        ? buildMapProjection(
            balance,
            activeState,
            activeState.selectedZoneId,
            t,
          )
        : null,
    [balance, activeState, localization],
  );
  const cardProjections = useMemo(
    () =>
      balance && activeState ? buildCardProjections(balance, activeState) : [],
    [balance, activeState],
  );
  const mineshaftProjections = useMemo(
    () =>
      balance && activeState
        ? buildMineshaftProjections(balance, activeState)
        : [],
    [balance, activeState],
  );
  const summaryProjection = useMemo(
    () =>
      balance && activeState
        ? buildSummaryProjection(balance, activeState)
        : null,
    [balance, activeState],
  );
  const goblinProjection = useMemo(
    () =>
      balance && activeState
        ? buildGoblinCostProjection(balance, activeState)
        : null,
    [balance, activeState],
  );
  const deliveryProjection = useMemo(
    () =>
      balance && activeState
        ? buildDeliveryProjection(
            balance,
            activeState,
            mineshaftProjections.reduce(
              (total, mineshaft) => total + mineshaft.incomePerSecond,
              0,
            ),
          )
        : null,
    [balance, activeState, mineshaftProjections],
  );
  const gachaProjection = useMemo(
    () =>
      balance && activeState
        ? buildGachaProjection(balance, activeState)
        : null,
    [balance, activeState],
  );

  function updateActiveState(updater: (state: ActiveState) => ActiveState) {
    setActiveState((state) => (state ? updater(state) : state));
  }

  function setSelectedZoneId(zoneId: string) {
    updateActiveState((state) => ({ ...state, selectedZoneId: zoneId }));
  }

  function setCardLevel(cardId: string, level: number) {
    updateActiveState((state) => ({
      ...state,
      cardsInput: {
        ...state.cardsInput,
        [cardId]: {
          quantity: state.cardsInput[cardId]?.quantity ?? 0,
          level,
        },
      },
    }));
  }

  function setCardQuantity(cardId: string, quantity: number) {
    updateActiveState((state) => ({
      ...state,
      cardsInput: {
        ...state.cardsInput,
        [cardId]: {
          level: state.cardsInput[cardId]?.level ?? 0,
          quantity,
        },
      },
    }));
  }

  function setGeneratorLevel(generatorId: string, level: number) {
    updateActiveState((state) => ({
      ...state,
      generatorsInput: {
        ...state.generatorsInput,
        [generatorId]: { level },
      },
    }));
  }

  function setGeneratorOpened(generatorId: string, opened: boolean) {
    updateActiveState((state) => {
      const ids = new Set(state.mapInput.mineshaftIdsOpened);
      if (opened) {
        ids.add(generatorId);
      } else {
        ids.delete(generatorId);
      }
      ids.add("spawningcart");
      return {
        ...state,
        mapInput: {
          ...state.mapInput,
          mineshaftIdsOpened: Array.from(ids),
        },
      };
    });
  }

  function setCheckpointCount(count: number) {
    updateActiveState((state) => ({
      ...state,
      mapInput: { ...state.mapInput, checkpointsOpened: count },
    }));
  }

  function setGoblinLevel(level: number) {
    updateActiveState((state) => ({
      ...state,
      goblinsInput: { ...state.goblinsInput, currentGoblinLevel: level },
    }));
  }

  return (
    <>
      <header className="navbar bg-body-tertiary px-3 gng-header">
        <div className="gng-navbar-row">
          <a className="navbar-brand d-flex align-items-center gap-2" href="#">
            <img src="/favicon.png" width={32} height={32} alt="" />
            <span>G&amp;G Calculator</span>
          </a>
          <button
            className="btn btn-primary gng-balance-button"
            type="button"
            onClick={() => setBalancePanelOpen((isOpen) => !isOpen)}
          >
            {balanceName}
          </button>
          <div className="flex-grow-1" />
          <button className="btn btn-primary" type="button">
            About
          </button>
        </div>
      </header>

      {balancePanelOpen && (
        <BalancePanel
          balanceIds={balanceIds}
          schedule={schedule}
          selectedBalanceId={selectedBalanceId}
          selectedScheduleEntryId={selectedScheduleEntryId}
          setDirectBalance={(balanceId) => {
            setSelectedScheduleEntryId(null);
            setPendingDefaultZoneId("zone1");
            setSelectedBalanceId(balanceId);
            setBalancePanelOpen(false);
          }}
          setScheduleEntry={(entry) => {
            setSelectedScheduleEntryId(entry.Id);
            setPendingDefaultZoneId(`zone${entry.ExclusiveZoneNumber}`);
            setSelectedBalanceId(entry.GameDataId);
            setBalancePanelOpen(false);
          }}
          t={t}
        />
      )}

      <main>
        {balance && activeState && (
          <div className="px-3 pt-3">
            <p className="text-danger">
              WARNING: This tool is not yet complete and may not return correct
              data. Always cross-check with the game first.
            </p>
            <label className="form-label" htmlFor="globalZoneSelect">
              Zone
            </label>
            <select
              className="form-select gng-zone-select"
              id="globalZoneSelect"
              value={activeState.selectedZoneId}
              onChange={(event) => setSelectedZoneId(event.target.value)}
            >
              {balance.Zones.map((zone) => (
                <option key={zone.Id} value={zone.Id}>
                  {zone.Id}
                </option>
              ))}
            </select>
          </div>
        )}

        <ul className="nav nav-tabs px-3 pt-3">
          {views.map((view) => (
            <li className="nav-item" key={view.id}>
              <button
                className={`nav-link ${activeView === view.id ? "active" : ""}`}
                type="button"
                onClick={() => setActiveView(view.id)}
              >
                {view.label}
              </button>
            </li>
          ))}
        </ul>

        {error && <div className="alert alert-warning m-3">{error}</div>}
        {!balance && activeView !== "save" && (
          <div className="p-3">Loading...</div>
        )}

        {balance &&
          activeState &&
          summaryProjection &&
          activeView === "summary" && (
            <SummaryView projection={summaryProjection} />
          )}
        {mapProjection && activeState && activeView === "map" && (
          <MapView
            currentGoblinLevel={activeState.goblinsInput.currentGoblinLevel}
            map={mapProjection}
            onCheckpointCountChange={setCheckpointCount}
            onGoblinLevelChange={setGoblinLevel}
          />
        )}
        {balance && activeState && activeView === "mineshafts" && (
          <MineshaftsView
            balance={balance}
            mineshafts={mineshaftProjections}
            objectiveElixirMultiplier={
              getSelectedRankMultiplier(balance, activeState)
                ?.GenObjectiveSoftCurrencyMultiplier ?? 1
            }
            onCardLevelChange={setCardLevel}
            onGeneratorLevelChange={setGeneratorLevel}
            onGeneratorOpenedChange={setGeneratorOpened}
            t={t}
          />
        )}
        {activeView === "cards" && (
          <CardsView
            cards={cardProjections}
            onCardLevelChange={setCardLevel}
            t={t}
          />
        )}
        {goblinProjection && activeView === "goblins" && (
          <GoblinsView projection={goblinProjection} />
        )}
        {deliveryProjection && activeView === "deliveries" && (
          <DeliveriesView projection={deliveryProjection} />
        )}
        {balance &&
          activeState &&
          gachaProjection &&
          activeView === "gacha" && (
            <GachaView
              balance={balance}
              projection={gachaProjection}
              onCardLevelChange={setCardLevel}
              t={t}
            />
          )}
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
  selectedScheduleEntryId,
  setDirectBalance,
  setScheduleEntry,
  t,
}: {
  balanceIds: string[];
  schedule: LteScheduleEntry[];
  selectedBalanceId: string;
  selectedScheduleEntryId: string | null;
  setDirectBalance: (balanceId: string) => void;
  setScheduleEntry: (entry: LteScheduleEntry) => void;
  t: (key: string, fallback?: string) => string;
}) {
  const activeSchedule = schedule.filter(isScheduleEntryActive);
  const sortedBalances = balanceIds
    .filter((balanceId) => balanceId !== "evergreen")
    .sort((a, b) =>
      t(`theme.${a}.name`, titleCase(a)).localeCompare(
        t(`theme.${b}.name`, titleCase(b)),
      ),
    );

  return (
    <section className="gng-balance-panel border-bottom bg-body p-3">
      <div className="row g-3">
        <div className="col-lg-8">
          <h2 className="h6">Schedule</h2>
          <div className="list-group">
            {activeSchedule.map((entry) => (
              <button
                className={`list-group-item list-group-item-action ${
                  selectedScheduleEntryId === entry.Id ? "active" : ""
                }`}
                key={entry.Id}
                type="button"
                onClick={() => setScheduleEntry(entry)}
              >
                <span className="d-flex justify-content-between gap-3">
                  <strong>
                    {t(`theme.${entry.GameDataId}.name`, entry.GameDataId)}
                  </strong>
                  <span className="gng-date-text">
                    {formatDate(entry.StartDateTimeUtc)} -{" "}
                    {formatDate(entry.EndDateTimeUtc)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="col-lg-4">
          <h2 className="h6">All Balances</h2>
          <div className="list-group">
            <button
              className={`list-group-item list-group-item-action gng-main-mine-entry ${
                !selectedScheduleEntryId && selectedBalanceId === "evergreen"
                  ? "active"
                  : ""
              }`}
              type="button"
              onClick={() => setDirectBalance("evergreen")}
            >
              {t("theme.evergreen.name", "Main Mines")}
            </button>
            {sortedBalances.map((balanceId) => (
              <button
                className={`list-group-item list-group-item-action ${
                  !selectedScheduleEntryId && selectedBalanceId === balanceId
                    ? "active"
                    : ""
                }`}
                key={balanceId}
                type="button"
                onClick={() => setDirectBalance(balanceId)}
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

function isScheduleEntryActive(entry: LteScheduleEntry): boolean {
  const end = new Date(entry.EndDateTimeUtc);
  if (Number.isNaN(end.getTime())) {
    return true;
  }
  const endOfLocalDay = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    23,
    59,
    59,
    999,
  );
  return new Date() <= endOfLocalDay;
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
