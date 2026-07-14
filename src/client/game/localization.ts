export type LocalizationMap = Record<string, string>;

// Initial localization parse
export function parseLocalization(text: string): LocalizationMap {
  const values: LocalizationMap = {};

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key) {
      values[key] = value;
    }
  }

  return values;
}

// Localization query (with optional fallback value if key not found)
export function lookupLocalization(
  values: LocalizationMap,
  key: string,
  fallback: string = key,
): string {
  const normalizedKey = key.toLowerCase();
  if (normalizedKey === "theme.space1.name") {
    return "Lunar Gold Rush (L)";
  }
  if (normalizedKey === "theme.space2.name") {
    return "Lunar Gold Rush (R)";
  }
  return values[normalizedKey] ?? fallback;
}
