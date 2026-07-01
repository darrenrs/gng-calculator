import { maxCardLevel, sortedCards } from "../game/balanceCalculations";
import type { LocalizationLookup } from "../game/derivedTypes";
import { STAT_MODIFIER_LOCALIZATION_KEYS } from "../game/modifiers";
import type { Balance } from "../game/sourceTypes";

export function CardsView({
  balance,
  cardLevels,
  onCardLevelChange,
  t,
}: {
  balance: Balance;
  cardLevels: Record<string, number>;
  onCardLevelChange: (cardId: string, level: number) => void;
  t: LocalizationLookup;
}) {
  return (
    <div className="p-3 table-responsive gng-scroll-pane">
      <table className="table table-striped table-sm align-middle">
        <thead>
          <tr>
            <th>Card</th>
            <th>Effect</th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          {sortedCards(balance).map((card) => {
            const maxLevel = maxCardLevel(balance, card);
            return (
              <tr key={card.Id}>
                <td>{cardDisplayName(card.IsManager, t(`card.${card.Id}.name`, card.Id))}</td>
                <td>
                  {t(
                    STAT_MODIFIER_LOCALIZATION_KEYS[card.StatModifierType] ??
                      `stat.${card.StatModifierType}`,
                    `Type ${card.StatModifierType}`,
                  )}
                </td>
                <td className="gng-level-cell">
                  <input
                    className="form-control form-control-sm"
                    min={0}
                    max={maxLevel}
                    type="number"
                    value={cardLevels[card.Id] ?? 0}
                    onChange={(event) =>
                      onCardLevelChange(
                        card.Id,
                        clampLevel(Number(event.target.value), maxLevel),
                      )
                    }
                  />
                  <span className="text-secondary">/ {maxLevel}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function clampLevel(value: number, maxLevel: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(maxLevel, Math.floor(value)));
}

function cardDisplayName(isManager: boolean, name: string): string {
  if (!isManager || name.toLowerCase().startsWith("manager")) {
    return name;
  }
  return `Manager - ${name}`;
}
