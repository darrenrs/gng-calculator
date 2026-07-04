import type { CardProjection, LocalizationLookup } from "../game/derivedTypes";
import { STAT_MODIFIER_LOCALIZATION_KEYS } from "../game/modifiers";
import type { Rarity } from "../game/sourceTypes";

export function CardsView({
  cards,
  onCardLevelChange,
  onCardQuantityChange,
  t,
}: {
  cards: CardProjection[];
  onCardLevelChange: (cardId: string, level: number) => void;
  onCardQuantityChange: (cardId: string, quantity: number) => void;
  t: LocalizationLookup;
}) {
  return (
    <div className="p-3 table-responsive gng-scroll-pane">
      <table className="table table-striped table-sm align-middle">
        <thead>
          <tr>
            <th>Card Name</th>
            <th>Rarity</th>
            <th>Level</th>
            <th>Effect</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(({ card, level, quantity, maxLevel, effect }) => (
            <tr key={card.Id}>
              <td>
                {cardDisplayName(
                  card.IsManager,
                  t(`card.${card.Id}.name`, card.Id),
                )}
              </td>
              <td>{t(rarityKey(card.Rarity), String(card.Rarity))}</td>
              <td className="gng-level-cell">
                <input
                  className="form-control form-control-sm"
                  max={maxLevel}
                  min={0}
                  type="number"
                  value={level}
                  onChange={(event) =>
                    onCardLevelChange(
                      card.Id,
                      clampLevel(Number(event.target.value), maxLevel),
                    )
                  }
                />
                <span className="text-secondary">/ {maxLevel}</span>
                <input
                  aria-label={`${card.Id} quantity`}
                  className="form-control form-control-sm"
                  min={0}
                  type="number"
                  value={quantity}
                  onChange={(event) =>
                    onCardQuantityChange(
                      card.Id,
                      Math.max(0, Math.floor(Number(event.target.value))),
                    )
                  }
                />
              </td>
              <td>{effect}</td>
              <td>
                {t(
                  descriptionKey(card.StatModifierType),
                  t(
                    STAT_MODIFIER_LOCALIZATION_KEYS[card.StatModifierType] ??
                      `stat.${card.StatModifierType}`,
                    `Type ${card.StatModifierType}`,
                  ),
                )}
              </td>
            </tr>
          ))}
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

function descriptionKey(statModifierType: number): string {
  const key = STAT_MODIFIER_LOCALIZATION_KEYS[statModifierType];
  if (!key) {
    return `stat.${statModifierType}.description`;
  }
  return key
    .replace(".name.long", ".description")
    .replace(".name", ".description");
}

function rarityKey(rarity: Rarity): string {
  const names: Record<number, string> = {
    1: "common",
    2: "uncommon",
    3: "rare",
    4: "eventepic",
    5: "legendary",
    6: "majestic",
    7: "ancestral",
  };
  return `card.rarity.${names[rarity] ?? rarity}.singular`;
}
