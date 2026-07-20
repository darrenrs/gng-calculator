import type { CardProjection, LocalizationLookup } from "../types/derivedTypes";
import { STAT_MODIFIER_LOCALIZATION_KEYS } from "../game/effectMetadata";
import type { Rarity } from "../types/sourceBalanceTypes";
import { StatModifierType } from "../types/sourceBalanceTypes";
import { NumericInput } from "../components/NumericInput";

export function CardsView({
  cards,
  onCardLevelChange,
  t,
}: {
  cards: CardProjection[];
  onCardLevelChange: (cardId: string, level: number) => void;
  t: LocalizationLookup;
}) {
  return (
    <div className="p-3 table-responsive gng-scroll-pane">
      <table className="table table-striped table-sm align-middle">
        <thead>
          <tr>
            <th>Card Name</th>
            <th>Unlocked At</th>
            <th>Rarity</th>
            <th>Level</th>
            <th>Effect</th>
            <th>Elixir Allocated</th>
            <th>Elixir Remaining</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(
            ({
              card,
              unlockLabel,
              displayLevel,
              displayMaxLevel,
              effectLabel,
              elixirAllocated,
              elixirRemaining,
            }) => (
              <tr key={card.Id}>
                <td>
                  {cardDisplayName(
                    card.IsManager,
                    t(`card.${card.Id}.name`, card.Id),
                  )}
                </td>
                <td>{unlockLabel}</td>
                <td>{t(rarityKey(card.Rarity), String(card.Rarity))}</td>
                <td className="gng-level-cell-td">
                  <div className="gng-level-cell">
                    <NumericInput
                      className="form-control form-control-sm"
                      max={displayMaxLevel}
                      min={0}
                      value={displayLevel}
                      onValueChange={(value) =>
                        onCardLevelChange(
                          card.Id,
                          displayToInternalLevel(
                            card.StatModifierType,
                            clampLevel(value, displayMaxLevel),
                          ),
                        )
                      }
                    />
                    <span className="text-secondary">/ {displayMaxLevel}</span>
                  </div>
                </td>
                <td>{effectLabel}</td>
                <td>{elixirAllocated.toLocaleString()}</td>
                <td>{elixirRemaining.toLocaleString()}</td>
                <td>
                  {fillManagerDescription(
                    t(
                      descriptionKey(card.StatModifierType),
                      t(
                        STAT_MODIFIER_LOCALIZATION_KEYS[
                          card.StatModifierType
                        ] ?? `stat.${card.StatModifierType}`,
                        `Type ${card.StatModifierType}`,
                      ),
                    ),
                    card.TargetIds[0],
                    t,
                  )}
                </td>
              </tr>
            ),
          )}
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

function fillManagerDescription(
  description: string,
  targetId: string | undefined,
  t: LocalizationLookup,
): string {
  if (!targetId) {
    return stripHtml(description);
  }
  return stripHtml(description).replace(
    "{0}",
    t(`mineshaft.name.${targetId}`, targetId),
  );
}

function displayToInternalLevel(type: StatModifierType, level: number): number {
  return type === StatModifierType.GoblinKing ? level + 1 : level;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}
