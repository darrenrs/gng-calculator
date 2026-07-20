import type {
  GachaProjection,
  LocalizationLookup,
} from "../types/derivedTypes";
import { formatGachaCount } from "../game/projections";
import { numberFormat } from "../game/format";
import { maxCardLevel } from "../game/balanceCalculations";
import type {
  Balance,
  Gacha,
  RankMultiplier,
} from "../types/sourceBalanceTypes";
import { NumericInput } from "../components/NumericInput";

interface GachaViewProps {
  balance: Balance;
  projection: GachaProjection;
  onCardLevelChange: (cardId: string, level: number) => void;
  t: LocalizationLookup;
}

const cardIncreaseRareCoeff = [
  1.0, 1.0435, 1.09, 1.1395, 1.192, 1.2475, 1.306, 1.3675, 1.432, 1.4995,
];

const gachaTypes: Record<number, "Normal" | "Premium" | "Rare"> = {
  0: "Normal",
  1: "Premium",
  3: "Rare",
};

export function GachaView({
  balance,
  projection,
  onCardLevelChange,
  t,
}: GachaViewProps) {
  const card16 = balance.Cards.find((card) => card.StatModifierType === 16);
  const selectedRankMultiplier = projection.selectedRankMultiplier;
  const isEvergreen = balance.BalanceProperties[0]?.IsWorldEvergreen ?? false;

  return (
    <>
      <div className="p-3" id="inputFields">
        <div className="row g-2 align-items-end">
          <div className="col-sm-4">
            <label
              htmlFor="unlockedCheckpointsAndShafts"
              className="form-label"
            >
              Unlocked Checkpoints and Shafts
            </label>
            <NumericInput
              id="unlockedCheckpointsAndShafts"
              readOnly
              value={projection.unlockedCheckpointsAndShafts}
            />
          </div>
          {card16 && (
            <div className="col-sm-3">
              <label htmlFor="cardIncreaseRareLvl" className="form-label">
                Cards+ Level
              </label>
              <NumericInput
                id="cardIncreaseRareLvl"
                max={maxCardLevel(balance, card16)}
                min={0}
                onValueChange={(value) =>
                  onCardLevelChange(
                    card16.Id,
                    Math.max(0, Math.min(maxCardLevel(balance, card16), value)),
                  )
                }
                value={projection.gachaCardLevel}
              />
            </div>
          )}
        </div>
        {projection.freeGachaIndex !== null && (
          <div className="mt-3">
            <strong>Free Gacha Cycle Index:</strong> {projection.freeGachaIndex}
            {projection.freeGachaAvailableAt &&
              ` — available ${projection.freeGachaAvailableAt.toLocaleString()}`}
          </div>
        )}
      </div>

      <div className="table-responsive gng-scroll-pane px-3">
        {selectedRankMultiplier && (
          <GachaTable
            cardIncreaseRareLvl={projection.gachaCardLevel}
            gachaData={projection.regularGachas}
            isEvergreen={isEvergreen}
            subZoneData={selectedRankMultiplier}
            t={t}
          />
        )}
        <FixedGachaTable
          balance={balance}
          gachaData={projection.fixedGachas}
          isEvergreen={isEvergreen}
          t={t}
        />
      </div>
    </>
  );
}

function GachaTable({
  gachaData,
  subZoneData,
  cardIncreaseRareLvl,
  isEvergreen,
  t,
}: {
  gachaData: Gacha[];
  subZoneData: RankMultiplier;
  cardIncreaseRareLvl: number;
  isEvergreen: boolean;
  t: LocalizationLookup;
}) {
  return (
    <table className="table table-striped table-sm gng-mineshaft-table">
      <thead>
        <tr>
          <th>Chest</th>
          {isEvergreen && (
            <>
              <th>{t("card.rarity.common.singular", "Common")}</th>
              <th>{t("card.rarity.uncommon.singular", "Uncommon")}</th>
              <th>{t("card.rarity.rare.singular", "Rare")}</th>
              <th>{t("card.rarity.eventepic.singular", "EventEpic")}</th>
              <th>{t("card.rarity.legendary.singular", "Legendary")}</th>
            </>
          )}
          {!isEvergreen && (
            <>
              <th>{t("card.rarity.common.singular", "Common")}</th>
              <th>{t("card.rarity.rare.singular", "Rare")}</th>
            </>
          )}
          <th>Elixir</th>
          {!isEvergreen && <th>Crowns</th>}
        </tr>
      </thead>
      <tbody>
        {gachaData.map((gacha) => (
          <GachaRow
            cardIncreaseRareLvl={cardIncreaseRareLvl}
            gacha={gacha}
            isEvergreen={isEvergreen}
            key={gacha.Id}
            subZoneData={subZoneData}
            t={t}
          />
        ))}
      </tbody>
    </table>
  );
}

function GachaRow({
  gacha,
  subZoneData,
  cardIncreaseRareLvl,
  isEvergreen,
  t,
}: {
  gacha: Gacha;
  subZoneData: RankMultiplier;
  cardIncreaseRareLvl: number;
  isEvergreen: boolean;
  t: LocalizationLookup;
}) {
  const cardType = gachaTypes[gacha.GachaType];
  const totalCards =
    gacha.BaseNumCards *
    Number(subZoneData[`GachaCardsMult${cardType}`]) *
    cardIncreaseRareCoeff[cardIncreaseRareLvl];
  const totalUncommon = normalizeCardTotal(totalCards / gacha.UncommonWeight);
  const totalRare = normalizeCardTotal(totalCards / gacha.RareWeight);
  const totalEventEpic = normalizeCardTotal(totalCards / gacha.EventEpicWeight);
  const totalLegendary = normalizeCardTotal(totalCards / gacha.LegendaryWeight);
  const totalCommon =
    totalCards - (totalUncommon + totalRare + totalEventEpic + totalLegendary);
  const softCurrencyMin =
    gacha.SoftCurrencyMin *
    Number(subZoneData[`GachaSoftCurrencyMult${cardType}`]);
  const softCurrencyMax =
    gacha.SoftCurrencyMax *
    Number(subZoneData[`GachaSoftCurrencyMult${cardType}`]);
  const leaderboardCurrency =
    gacha.LeaderboardCurrency *
    Number(subZoneData[`GachaLeaderboardCurrencyMult${cardType}`]);

  return (
    <tr>
      <td>{t(`gacha.name.${gacha.Id}`, gacha.Id)}</td>
      {isEvergreen && (
        <>
          <td>
            <GachaCount value={totalCommon} />
          </td>
          <td>
            <GachaCount value={totalUncommon} />
          </td>
          <td>
            <GachaCount value={totalRare} />
          </td>
          <td>
            <GachaCount value={totalEventEpic} />
          </td>
          <td>
            <GachaCount value={totalLegendary} />
          </td>
        </>
      )}
      {!isEvergreen && (
        <>
          <td>
            <GachaCount value={totalCommon} />
          </td>
          <td>
            <GachaCount value={totalRare} />
          </td>
        </>
      )}
      <td>
        {softCurrencyMin === 0 && softCurrencyMax === 0
          ? ""
          : `${numberFormat(softCurrencyMin)}-${numberFormat(softCurrencyMax)}`}
      </td>
      {!isEvergreen && (
        <td>
          {leaderboardCurrency === 0 ? "" : numberFormat(leaderboardCurrency)}
        </td>
      )}
    </tr>
  );
}

function normalizeCardTotal(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function FixedGachaTable({
  balance,
  gachaData,
  isEvergreen,
  t,
}: {
  balance: Balance;
  gachaData: Gacha[];
  isEvergreen: boolean;
  t: LocalizationLookup;
}) {
  if (!gachaData.length && !isEvergreen) {
    return null;
  }

  const rarityByCard = new Map(
    balance.Cards.map((card) => [card.Id, card.Rarity]),
  );

  return (
    <table className="table table-striped table-sm mt-3">
      <thead>
        <tr>
          <th>ID</th>
          <th>Cards</th>
          <th>Elixir</th>
          {!isEvergreen && <th>Crowns</th>}
        </tr>
      </thead>
      <tbody>
        {isEvergreen && (
          <tr>
            <td>GachaLegendary</td>
            <td>x1 Legendary Card</td>
            <td />
          </tr>
        )}
        {gachaData.map((gacha) => (
          <tr key={gacha.Id}>
            <td>{gacha.Id}</td>
            <td>
              {gacha.GuaranteedCardIds.map((cardId, index) => {
                const count = gacha.GuaranteedCardCounts[index] ?? 0;
                const rarity = rarityByCard.get(cardId);
                return (
                  <span className="d-block" key={`${cardId}-${index}`}>
                    x{count} {t(`card.${cardId}.name`, cardId)} (
                    {rarityName(rarity)})
                  </span>
                );
              })}
            </td>
            <td>{gacha.SoftCurrencyMin === 0 ? "" : gacha.SoftCurrencyMin}</td>
            {!isEvergreen && (
              <td>
                {gacha.LeaderboardCurrency === 0
                  ? ""
                  : gacha.LeaderboardCurrency}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GachaCount({ value }: { value: number }) {
  if (value === 0) return null;
  const lines = formatGachaCount(value).split("\n");
  return (
    <>
      {lines.map((line) => (
        <span className="d-block text-nowrap" key={line}>
          {line}
        </span>
      ))}
    </>
  );
}

function rarityName(rarity: number | undefined): string {
  const names: Record<number, string> = {
    1: "Common",
    2: "Uncommon",
    3: "Rare",
    4: "EventEpic",
    5: "Legendary",
    6: "Majestic",
    7: "Ancestral",
  };
  return rarity ? (names[rarity] ?? String(rarity)) : "-";
}
