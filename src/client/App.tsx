import { useEffect, useMemo, useRef, useState } from "react";
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
import { zoneMineshaftIdsUnlockedByCheckpoints } from "./game/map";
import {
  buildCardProjections,
  buildDeliveryProjection,
  buildGachaProjection,
  buildGoblinCostProjection,
  buildMapProjection,
  buildMineshaftProjections,
  buildRocksProjection,
  buildSummaryProjection,
  getSelectedRankMultiplier,
} from "./game/projections";
import { buildNamedGlobalEffects } from "./game/balanceCalculations";
import { RankUpType } from "./types/sourceBalanceTypes";
import type { Balance, LteScheduleEntry } from "./types/sourceBalanceTypes";
import { CardsView } from "./views/CardsView";
import { DeliveriesView } from "./views/DeliveriesView";
import { GachaView } from "./views/GachaView";
import { GoblinsView } from "./views/GoblinsView";
import { MapView } from "./views/MapView";
import { MineshaftsView } from "./views/MineshaftsView";
import { SaveView } from "./views/SaveView";
import { SummaryView } from "./views/SummaryView";
import { RocksView } from "./views/RocksView";
import { NumericInput } from "./components/NumericInput";
import { hydrateActiveStateFromSave } from "./game/saveHydration";
import type {
  ImportedMapSnapshot,
  ParsedSave,
  ParsedWorldSave,
} from "./types/parsedSaveTypes";
import type { LoadedSaveSummary } from "./views/SaveView";

const FALLBACK_BALANCE_ID = "evergreen";
const views: Array<{ id: AppViewId; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "map", label: "Map" },
  { id: "mineshafts", label: "Mineshafts" },
  { id: "cards", label: "Cards" },
  { id: "goblins", label: "Goblins" },
  { id: "deliveries", label: "Deliveries" },
  { id: "gacha", label: "Gacha" },
  { id: "rocks", label: "Rocks" },
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
  const [importedMapSnapshot, setImportedMapSnapshot] =
    useState<ImportedMapSnapshot | null>(null);
  const [mapSnapshotStale, setMapSnapshotStale] = useState(false);
  const [loadedSave, setLoadedSave] = useState<LoadedSaveSummary | null>(null);
  const balanceRequestVersion = useRef(0);

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
  const selectedScheduleEntry = schedule.find(
    (entry) => entry.Id === selectedScheduleEntryId,
  );
  const currentScheduleEntry = schedule.find(isScheduleEntryCurrent);

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
        setSchedule(scheduleResult.value.LteDatas);
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
    if (
      balance?.Id === selectedBalanceId &&
      activeState?.balanceId === selectedBalanceId &&
      activeState.selectedZoneId === pendingDefaultZoneId
    ) {
      return;
    }
    const requestVersion = ++balanceRequestVersion.current;
    setBalance(null);
    setActiveState(null);
    getBalance(selectedBalanceId)
      .then((data) => {
        if (requestVersion !== balanceRequestVersion.current) return;
        setBalance(data);
        setActiveState(createDefaultActiveState(data, pendingDefaultZoneId));
        setError(null);
      })
      .catch((err) => {
        if (requestVersion !== balanceRequestVersion.current) return;
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
            {
              importedSnapshot: importedMapSnapshot,
              snapshotStale: mapSnapshotStale,
            },
          )
        : null,
    [balance, activeState, localization, importedMapSnapshot, mapSnapshotStale],
  );
  const cardProjections = useMemo(
    () =>
      balance && activeState
        ? buildCardProjections(balance, activeState, t)
        : [],
    [balance, activeState, localization],
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
  const rocksProjection = useMemo(
    () => (activeState ? buildRocksProjection(activeState) : null),
    [activeState],
  );

  function updateActiveState(updater: (state: ActiveState) => ActiveState) {
    setActiveState((state) => (state ? updater(state) : state));
    setLoadedSave((loaded) =>
      loaded ? { ...loaded, modified: true } : loaded,
    );
  }

  function markImportedMapStale() {
    if (importedMapSnapshot) setMapSnapshotStale(true);
  }

  function setSelectedZoneId(zoneId: string) {
    markImportedMapStale();
    updateActiveState((state) => ({ ...state, selectedZoneId: zoneId }));
  }

  function setCardLevel(cardId: string, level: number) {
    updateActiveState((state) => {
      const nextState = {
        ...state,
        cardsInput: {
          ...state.cardsInput,
          [cardId]: {
            quantity: state.cardsInput[cardId]?.quantity ?? 0,
            level,
          },
        },
      };
      if (!balance) return nextState;
      const minimumGoblinPurchaseLevel = Math.max(
        1,
        buildNamedGlobalEffects(balance, nextState).GoblinPurchaseLevelChange +
          1,
      );
      return {
        ...nextState,
        goblinsInput: {
          ...nextState.goblinsInput,
          goblinPurchaseLevel: Math.max(
            minimumGoblinPurchaseLevel,
            nextState.goblinsInput.goblinPurchaseLevel,
          ),
        },
      };
    });
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
    markImportedMapStale();
    updateActiveState((state) => {
      const normalizedLevel = Number.isFinite(level)
        ? Math.max(0, Math.floor(level))
        : 0;
      const ids = new Set(state.mapInput.mineshaftIdsOpened);
      if (generatorId === "spawningcart" || normalizedLevel > 0) {
        ids.add(generatorId);
      } else {
        ids.delete(generatorId);
      }
      ids.add("spawningcart");
      return {
        ...state,
        generatorsInput: {
          ...state.generatorsInput,
          [generatorId]: {
            level:
              generatorId === "spawningcart"
                ? Math.max(1, normalizedLevel)
                : normalizedLevel,
          },
        },
        mapInput: {
          ...state.mapInput,
          mineshaftIdsOpened: Array.from(ids),
        },
      };
    });
  }

  function setGeneratorOpened(generatorId: string, opened: boolean) {
    markImportedMapStale();
    updateActiveState((state) => {
      const zone = balance?.Zones.find(
        (candidate) => candidate.Id === state.selectedZoneId,
      );
      const requiredOpenIds = new Set(
        zoneMineshaftIdsUnlockedByCheckpoints(
          zone,
          state.mapInput.checkpointsOpened - 1,
        ),
      );
      if (
        !opened &&
        (generatorId === "spawningcart" || requiredOpenIds.has(generatorId))
      ) {
        return state;
      }
      const ids = new Set(state.mapInput.mineshaftIdsOpened);
      if (opened) {
        ids.add(generatorId);
      } else {
        ids.delete(generatorId);
      }
      ids.add("spawningcart");
      return {
        ...state,
        generatorsInput: {
          ...state.generatorsInput,
          [generatorId]: {
            level: opened
              ? Math.max(1, state.generatorsInput[generatorId]?.level ?? 1)
              : 0,
          },
        },
        mapInput: {
          ...state.mapInput,
          mineshaftIdsOpened: Array.from(ids),
        },
      };
    });
  }

  function setCheckpointCount(count: number) {
    markImportedMapStale();
    updateActiveState((state) => {
      const zone = balance?.Zones.find(
        (candidate) => candidate.Id === state.selectedZoneId,
      );
      const openedIds = new Set(
        zoneMineshaftIdsUnlockedByCheckpoints(zone, count),
      );
      openedIds.add("spawningcart");
      const generatorsInput = { ...state.generatorsInput };
      for (const id of [
        "spawningcart",
        ...(balance?.MineShafts.map((generator) => generator.Id).filter(
          (id): id is string => Boolean(id),
        ) ?? []),
      ]) {
        const wasOpened = state.mapInput.mineshaftIdsOpened.includes(id);
        generatorsInput[id] = {
          level: openedIds.has(id)
            ? wasOpened
              ? Math.max(1, state.generatorsInput[id]?.level ?? 1)
              : 1
            : 0,
        };
      }
      generatorsInput.spawningcart = {
        level: Math.max(1, generatorsInput.spawningcart?.level ?? 1),
      };
      const nextState = {
        ...state,
        generatorsInput,
        mapInput: {
          ...state.mapInput,
          checkpointsOpened: count,
          mineshaftIdsOpened: Array.from(openedIds),
        },
      };
      if (!balance) return nextState;
      return {
        ...nextState,
        goblinsInput: {
          ...nextState.goblinsInput,
          goblinPurchaseLevel: Math.max(
            1,
            buildNamedGlobalEffects(balance, nextState)
              .GoblinPurchaseLevelChange + 1,
            nextState.goblinsInput.goblinPurchaseLevel,
          ),
        },
      };
    });
  }

  function setGeneratorAutomated(generatorId: string, automated: boolean) {
    const mineshaft = mineshaftProjections.find(
      (candidate) => candidate.id === generatorId,
    );
    if (!mineshaft?.automationCardId) return;
    const currentLevel =
      activeState?.cardsInput[mineshaft.automationCardId]?.level ?? 0;
    setCardLevel(
      mineshaft.automationCardId,
      automated ? Math.max(currentLevel, mineshaft.automationLevel ?? 0) : 0,
    );
  }

  function setGoblinPurchaseLevel(level: number) {
    updateActiveState((state) => {
      const minimum = balance
        ? Math.max(
            1,
            buildNamedGlobalEffects(balance, state).GoblinPurchaseLevelChange +
              1,
          )
        : 1;
      return {
        ...state,
        goblinsInput: {
          ...state.goblinsInput,
          goblinPurchaseLevel: Math.max(minimum, Math.floor(level)),
        },
      };
    });
  }

  async function loadSaveWorld(save: ParsedSave, world: ParsedWorldSave) {
    const eventEntry = schedule.find(isScheduleEntryCurrent);
    if (
      world.kind === "lte" &&
      (!eventEntry || world.balanceId !== eventEntry.GameDataId)
    ) {
      throw new Error(
        `Saved event ${world.balanceId} does not match the current scheduled event ${eventEntry?.GameDataId ?? "none"}`,
      );
    }

    const requestVersion = ++balanceRequestVersion.current;
    const nextBalance = await getBalance(world.balanceId);
    if (requestVersion !== balanceRequestVersion.current) return;
    const hydrated = hydrateActiveStateFromSave(nextBalance, save, world);
    if (hydrated.savedRank !== hydrated.derivedGlobalRank) {
      console.warn("Saved rank does not match derived globalRank", {
        world: world.kind,
        balanceId: world.balanceId,
        zoneId: world.zone.id,
        savedRank: hydrated.savedRank,
        derivedGlobalRank: hydrated.derivedGlobalRank,
      });
    }

    setBalance(nextBalance);
    setActiveState(hydrated.activeState);
    setSelectedBalanceId(world.balanceId);
    setPendingDefaultZoneId(world.zone.id);
    setSelectedScheduleEntryId(world.kind === "lte" ? eventEntry!.Id : null);
    setImportedMapSnapshot(hydrated.mapSnapshot);
    setMapSnapshotStale(false);
    setLoadedSave({
      worldLabel: world.kind === "evergreen" ? "Main Mines" : "Event",
      balanceId: world.balanceId,
      lastSavedAt: save.lastSavedAt,
      modified: false,
      diagnostics: hydrated.diagnostics,
    });
    setBalancePanelOpen(false);
    setError(null);
  }

  function clearImportedSave() {
    setImportedMapSnapshot(null);
    setMapSnapshotStale(false);
    setLoadedSave(null);
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
            <span className="d-flex flex-column">
              <span>
                {balanceName}
                {balance &&
                  balance.BalanceProperties[0]?.RankUpType ===
                    RankUpType.MineShaftAndCheckPoint &&
                  ` (${variantShort(selectedBalanceId, activeState?.selectedZoneId)})`}
              </span>
              {selectedScheduleEntry && (
                <small>
                  {formatDate(selectedScheduleEntry.StartDateTimeUtc)} -{" "}
                  {formatDate(selectedScheduleEntry.EndDateTimeUtc)}
                </small>
              )}
            </span>
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
            clearImportedSave();
            setSelectedScheduleEntryId(null);
            setPendingDefaultZoneId("zone1");
            setSelectedBalanceId(balanceId);
            setBalancePanelOpen(false);
          }}
          setScheduleEntry={(entry) => {
            clearImportedSave();
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
            <ZoneSelector
              balance={balance}
              disabled={selectedScheduleEntryId !== null}
              selectedZoneId={activeState.selectedZoneId}
              onChange={setSelectedZoneId}
            />
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
            map={mapProjection}
            onCheckpointCountChange={setCheckpointCount}
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
            onGeneratorAutomatedChange={setGeneratorAutomated}
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
          <GoblinsView
            projection={goblinProjection}
            onGoblinPurchaseLevelChange={setGoblinPurchaseLevel}
          />
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
        {activeView === "save" && (
          <SaveView
            currentEvent={currentScheduleEntry}
            loadedSave={loadedSave}
            onLoadWorld={loadSaveWorld}
          />
        )}
        {activeView === "rocks" && rocksProjection && (
          <RocksView projection={rocksProjection} />
        )}
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
      <h2 className="h6">Main Mines</h2>
      <div className="list-group mb-3 w-100">
        <button
          className={`list-group-item list-group-item-action ${
            !selectedScheduleEntryId && selectedBalanceId === "evergreen"
              ? "active"
              : ""
          }`}
          type="button"
          onClick={() => setDirectBalance("evergreen")}
        >
          {t("theme.evergreen.name", "Main Mines")}
        </button>
      </div>
      <div className="row g-3">
        <div className="col-lg-8">
          <h2 className="h6">Event Schedule</h2>
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
                    {variantSuffix(entry.GameDataId, entry.ExclusiveZoneNumber)}
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
          <h2 className="h6">All Events</h2>
          <div className="list-group">
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

const VARIANT_BY_BALANCE: Record<string, ["L" | "R", "L" | "R"]> = {
  arctic: ["L", "R"],
  candy: ["L", "R"],
  jungle: ["R", "L"],
  minicard: ["L", "R"],
  minielixir: ["L", "R"],
  minigem: ["L", "R"],
  pirate: ["L", "R"],
  volcano: ["L", "R"],
};

function variantShort(balanceId: string, zoneId?: string): string {
  const zoneNumber = Math.max(1, Number(zoneId?.replace(/^zone/, "") ?? 1));
  return VARIANT_BY_BALANCE[balanceId]?.[zoneNumber - 1] ?? "L";
}

function variantSuffix(balanceId: string, zoneNumber: number): string {
  const variant = VARIANT_BY_BALANCE[balanceId]?.[zoneNumber - 1];
  return variant ? ` (${variant})` : "";
}

function ZoneSelector({
  balance,
  disabled,
  selectedZoneId,
  onChange,
}: {
  balance: Balance;
  disabled: boolean;
  selectedZoneId: string;
  onChange: (zoneId: string) => void;
}) {
  const rankUpType = balance.BalanceProperties[0]?.RankUpType;
  const zoneIndex = Math.max(
    0,
    balance.Zones.findIndex((zone) => zone.Id === selectedZoneId),
  );

  if (rankUpType === RankUpType.MineShaftAndCheckPoint) {
    return (
      <fieldset disabled={disabled}>
        <legend className="form-label">Amethyst Left/Right Variant</legend>
        {(["L", "R"] as const).map((variant) => {
          const mappedIndex =
            VARIANT_BY_BALANCE[balance.Id]?.indexOf(variant) ?? 0;
          const targetZone = balance.Zones[Math.max(0, mappedIndex)];
          return (
            <label className="form-check form-check-inline" key={variant}>
              <input
                checked={variantShort(balance.Id, selectedZoneId) === variant}
                className="form-check-input"
                name="zoneVariant"
                type="radio"
                onChange={() => targetZone && onChange(targetZone.Id)}
              />
              <span className="form-check-label">
                {variant === "L" ? "Left" : "Right"}
              </span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  return (
    <div>
      <label className="form-label" htmlFor="globalZoneSelect">
        Mine
      </label>
      <div className="gng-inline-number">
        <NumericInput
          id="globalZoneSelect"
          max={balance.Zones.length}
          min={1}
          value={zoneIndex + 1}
          onValueChange={(value) => {
            const nextIndex = Math.max(
              0,
              Math.min(balance.Zones.length - 1, value - 1),
            );
            onChange(balance.Zones[nextIndex]?.Id ?? selectedZoneId);
          }}
        />
        <span className="text-secondary">/ {balance.Zones.length}</span>
      </div>
    </div>
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

function isScheduleEntryCurrent(entry: LteScheduleEntry): boolean {
  const start = new Date(entry.StartDateTimeUtc).getTime();
  const end = new Date(entry.EndDateTimeUtc).getTime();
  const now = Date.now();
  return (
    Number.isFinite(start) && Number.isFinite(end) && start <= now && now <= end
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
