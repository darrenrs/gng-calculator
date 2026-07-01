export function numberFormat(n: number): string {
  if (typeof n !== "number") {
    return String(NaN);
  }

  if (n < 10_000) {
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
