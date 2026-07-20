// Global number formatting function
export function numberFormat(n: number): string {
  if (typeof n !== "number") {
    return String(NaN);
  }

  if (n < 100_000) {
    return parseInt(Math.floor(n).toFixed(0), 10).toLocaleString();
  }

  const logThousand = Math.floor(Math.log(n) / Math.log(1000));
  const significantFigures = (
    Math.floor(Number((n / Math.pow(1000, logThousand)).toFixed(4)) * 100) / 100
  ).toFixed(2);

  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const coreSuffixes = ["", "K", "M", "B", "T"];
  let suffix: string;

  if (logThousand < coreSuffixes.length) {
    suffix = coreSuffixes[logThousand];
  } else {
    const index = logThousand - coreSuffixes.length;
    suffix = alpha[Math.floor(index / 26)] + alpha[index % 26];
  }

  return `${significantFigures} ${suffix}`;
}

export function coefficientFormat(value: number, operator: "x" | "÷"): string {
  return `${operator}${value.toFixed(2)}`;
}

export function percentageFormat(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// Global time formatting function
export function timeFormat(s: number, zeroMeansBase: boolean = false): string {
  if (typeof s !== "number") {
    return String(NaN);
  }

  if (zeroMeansBase && !s) {
    return "0s";
  }

  if (!Number.isFinite(s)) {
    return "-";
  }

  if (s >= 31_560_000 * 1_000_000_000_000) {
    return "Forever";
  } else if (s >= 31_560_000) {
    const years = Math.floor(s / 31_560_000);
    const yearsSuffix = ["Ga", "Ma", "ka", "a"];

    const yearsLogThousand = Math.floor(Math.log(years) / Math.log(1000));
    const yearsBaseAfterLog = Math.floor(years / 1000 ** yearsLogThousand);

    return `${yearsBaseAfterLog}${yearsSuffix[yearsSuffix.length - 1 - yearsLogThousand]}`;
  } else if (s >= 864_000) {
    return `${Math.floor(s / 86_400)}d`;
  } else if (s >= 86_400) {
    const days = Math.floor(s / 86_400);
    const hours = Math.floor((s % 86_400) / 3_600);
    return `${days}d ${String(hours).padStart(2, "0")}h`;
  } else if (s >= 3_600) {
    const hours = Math.floor(s / 3_600);
    const minutes = Math.floor((s % 3_600) / 60);
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  } else if (s >= 60) {
    const minutes = Math.floor(s / 60);
    const seconds = Math.floor(s % 60);
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  } else if (s >= 5) {
    return `${Math.floor(s)}s`;
  } else if (s >= 1) {
    return `${s.toPrecision(2)}s`;
  } else if (s >= 0.001) {
    return `${Math.round(s * 1000)}ms`;
  } else {
    return "Instant";
  }
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const DOTNET_UNIX_EPOCH_TICKS = 621355968000000000n;
const TICKS_PER_MILLISECOND = 10000n;

export function dateFromDotNetTicks(value: string | number): Date {
  const ticks = int64ToBigInt(value);
  const milliseconds =
    (ticks - DOTNET_UNIX_EPOCH_TICKS) / TICKS_PER_MILLISECOND;
  const date = new Date(Number(milliseconds));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid .NET tick value: ${String(value)}`);
  }
  return date;
}

export function dateFromUnixSeconds(value: string | number): Date {
  const seconds = Number(value);
  const date = new Date(seconds * 1000);
  if (!Number.isFinite(seconds) || Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Unix timestamp: ${String(value)}`);
  }
  return date;
}

function int64ToBigInt(value: string | number): bigint {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`Invalid 64-bit integer: ${String(value)}`);
    }
    return BigInt(value);
  }
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`Invalid 64-bit integer: ${value}`);
  }
  return BigInt(value);
}
