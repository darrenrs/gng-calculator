export type LocalizationMap = Record<string, string>;

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

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) {
      values[key] = value;
    }
  }

  return values;
}

export function lookupLocalization(
  values: LocalizationMap,
  key: string,
  fallback = key,
): string {
  if (key === "theme.space1.name") {
    return "Space (Left)";
  }
  if (key === "theme.space2.name") {
    return "Space (Right)";
  }
  return values[key] ?? fallback;
}
