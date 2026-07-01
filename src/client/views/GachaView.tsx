import { useMemo, useState } from "react";
import type { Balance, Gacha, RankMultiplier } from "../game/sourceTypes";

interface GachaViewProps {
  balance: Balance;
}

const cardIncreaseRareCoeff = [
  1.0, 1.0435, 1.09, 1.1395, 1.192, 1.2475, 1.306, 1.3675, 1.432, 1.4995,
];

const gachaTypes: Record<number, "Normal" | "Premium" | "Rare"> = {
  0: "Normal",
  1: "Premium",
  3: "Rare",
};

export function GachaView({ balance }: GachaViewProps) {
  const [selectedZoneId, setSelectedZoneId] = useState(balance.Zones[0]?.Id ?? "");
  const [selectedSubZoneId, setSelectedSubZoneId] = useState("0");
  const [cardIncreaseRareLvl, setCardIncreaseRareLvl] = useState(0);

  const gachaChests = useMemo(
    () =>
      balance.Gacha.filter(
        (gacha) => !gacha.GuaranteedCardIds?.length && gacha.GachaType in gachaTypes,
      ),
    [balance],
  );
  const maxSubZone = useMemo(
    () => Math.max(...balance.Zones.map((zone) => zone.RankMultipliers.length)),
    [balance],
  );
  const selectedZone =
    balance.Zones.find((zone) => zone.Id === selectedZoneId) ?? balance.Zones[0];
  const selectedSubZone = selectedZone?.RankMultipliers[Number(selectedSubZoneId)];

  return (
    <>
      <div className="container py-3" id="inputFields">
        <div className="row g-2 align-items-end">
          <div className="col-sm-4">
            <label htmlFor="zoneId" className="form-label">
              Zone ID
            </label>
            <select
              className="form-select"
              id="zoneId"
              onChange={(event) => {
                setSelectedZoneId(event.target.value);
                setSelectedSubZoneId("0");
              }}
              value={selectedZone?.Id ?? ""}
            >
              {balance.Zones.map((zone) => (
                <option key={zone.Id} value={zone.Id}>
                  {zone.Id}
                </option>
              ))}
            </select>
          </div>
          <div className="col-sm-4">
            <label htmlFor="subzoneId" className="form-label">
              Walls+Shafts Open
            </label>
            <select
              className="form-select"
              id="subzoneId"
              onChange={(event) => setSelectedSubZoneId(event.target.value)}
              value={selectedSubZoneId}
            >
              {Array.from({ length: maxSubZone }, (_value, index) => (
                <option key={index} value={index}>
                  {index + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="col-sm-3">
            <label htmlFor="cardIncreaseRareLvl" className="form-label">
              Cards+ Lvl
            </label>
            <select
              className="form-select"
              id="cardIncreaseRareLvl"
              onChange={(event) => setCardIncreaseRareLvl(Number(event.target.value))}
              value={cardIncreaseRareLvl}
            >
              {Array.from({ length: 10 }, (_value, index) => (
                <option key={index} value={index}>
                  {index}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="table-responsive gng-scroll-pane px-3">
        {selectedSubZone && (
          <GachaTable
            cardIncreaseRareLvl={cardIncreaseRareLvl}
            gachaData={gachaChests}
            subZoneData={selectedSubZone}
          />
        )}
      </div>
    </>
  );
}

function GachaTable({
  gachaData,
  subZoneData,
  cardIncreaseRareLvl,
}: {
  gachaData: Gacha[];
  subZoneData: RankMultiplier;
  cardIncreaseRareLvl: number;
}) {
  return (
    <table className="table table-striped small gng-mineshaft-table">
      <thead>
        <tr>
          <th>GachaType</th>
          <th>Common</th>
          <th>Uncommon</th>
          <th>Rare</th>
          <th>EventEpic</th>
          <th>Legendary</th>
          <th>SoftCurrencyMin</th>
          <th>SoftCurrencyMax</th>
          <th>LeaderboardCurrency</th>
        </tr>
      </thead>
      <tbody>
        {gachaData.map((gacha) => (
          <GachaRow
            cardIncreaseRareLvl={cardIncreaseRareLvl}
            gacha={gacha}
            key={gacha.Id}
            subZoneData={subZoneData}
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
}: {
  gacha: Gacha;
  subZoneData: RankMultiplier;
  cardIncreaseRareLvl: number;
}) {
  const cardType = gachaTypes[gacha.GachaType];
  const totalCards = Math.floor(
    gacha.BaseNumCards *
      Number(subZoneData[`GachaCardsMult${cardType}`]) *
      cardIncreaseRareCoeff[cardIncreaseRareLvl],
  );
  const totalUncommon = normalizeCardTotal(totalCards / gacha.UncommonWeight);
  const totalRare = normalizeCardTotal(totalCards / gacha.RareWeight);
  const totalEventEpic = normalizeCardTotal(totalCards / gacha.EventEpicWeight);
  const totalLegendary = normalizeCardTotal(totalCards / gacha.LegendaryWeight);
  const totalCommon =
    totalCards - (totalUncommon + totalRare + totalEventEpic + totalLegendary);
  const softCurrencyMin =
    gacha.SoftCurrencyMin * Number(subZoneData[`GachaSoftCurrencyMult${cardType}`]);
  const softCurrencyMax =
    gacha.SoftCurrencyMax * Number(subZoneData[`GachaSoftCurrencyMult${cardType}`]);
  const leaderboardCurrency =
    gacha.LeaderboardCurrency *
    Number(subZoneData[`GachaLeaderboardCurrencyMult${cardType}`]);

  return (
    <tr>
      <td>{gacha.Id}</td>
      <td>{totalCommon.toFixed(2)}</td>
      <td>{totalUncommon.toFixed(2)}</td>
      <td>{totalRare.toFixed(2)}</td>
      <td>{totalEventEpic.toFixed(2)}</td>
      <td>{totalLegendary.toFixed(5)}</td>
      <td>{softCurrencyMin}</td>
      <td>{softCurrencyMax}</td>
      <td>{leaderboardCurrency}</td>
    </tr>
  );
}

function normalizeCardTotal(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
