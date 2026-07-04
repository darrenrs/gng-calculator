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

export function timeFormat(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return "-";
  }
  if (seconds >= 31_560_000) {
    const years = Math.floor(seconds / 31_560_000);
    const days = Math.floor((seconds % 31_560_000) / 86_400);
    return `${years}y ${String(days).padStart(3, "0")}d`;
  }
  if (seconds >= 864_000) {
    return `${Math.floor(seconds / 86_400)}d`;
  }
  if (seconds >= 86_400) {
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3_600);
    return `${days}d ${String(hours).padStart(2, "0")}h`;
  }
  if (seconds >= 3_600) {
    const hours = Math.floor(seconds / 3_600);
    const minutes = Math.floor((seconds % 3_600) / 60);
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${String(secs).padStart(2, "0")}s`;
  }
  if (seconds >= 1) {
    return `${Math.floor(seconds)}s`;
  }
  if (seconds >= 0.001) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  return "instant";
}
