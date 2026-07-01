const cases = [
  [27, 0.021, 0, 0.0038, 11, 0.4808],
  [9, 0, 1, 3, 14, 4782969],
  [9, 0, 1, 3, 10, 59049],
  [9, 0, 1, 4, 12, 16777216],
  [12, 0, 0, 0.6, 9, 48.6],
  [7, 0, 60, 0, 9, 540],
  [15, 0, 0.1, 0.001, 9, 0.981],
  [3, 0, 0.5, 10, 9, 500000000],
  [5, 0, 0.047, 0.0022, 9, 0.6012],
  [13, 0, 0.3, 0.1, 9, 10.8],
  [8, 0, 30, 0, 9, 270],
  [16, 0, 0.042, 0.0015, 9, 0.4995],
  [19, 0, 0.08, 0, 9, 0.72],
  [24, 0, 0.08, 0.009, 6, 0.804],
  [24, 0, 0.08, 0.009, 7, 1.001],
  [20, 0.01, 0.02, 0, 6, 0.13],
  [20, 0.01, 0.02, 0, 7, 0.15],
  [21, 0.03, 0.0205, 0.0016, 6, 0.2106],
  [21, 0.03, 0.0205, 0.0016, 7, 0.2519],
  [25, 4.5, -0.5, 0, 6, 1.5],
  [25, 4.5, -0.5, 0, 7, 1],
  [22, 0, 0.1, 0.002, 6, 0.672],
  [22, 0, 0.1, 0.002, 7, 0.798],
  [23, 0, 0.0005, 0, 6, 0.3],
  [23, 0, 0.0005, 0, 7, 0.35],
  [10, 0, 1, 3, 5, 243],
  [1, 0, 1, 0, 5, 5],
  [11, 0, 1, 2, 5, 32],
  [6, 0, 1, 2, 5, 32],
  [4, 0, 1, 0, 5, 5],
  [26, 0.05, 0.05, 0, 0, 0.1],
  [26, 0.05, 0.05, 0, 2, 0.2],
  [3, 0, 1, 100, 5, 10000000000],
];

function calculate(type, base, mult, growth, level) {
  switch (type) {
    case 1:
    case 4:
      return level;
    case 2:
    case 3:
    case 6:
    case 9:
    case 10:
    case 11:
      return mult * growth ** level;
    case 5:
    case 13:
    case 15:
    case 16:
    case 24:
      return level * (mult + growth * level);
    case 7:
    case 8:
    case 19:
      return mult * level;
    case 23:
      return mult * level * 100;
    case 12:
    case 27:
      return base + growth * level ** 2;
    case 20:
    case 25:
      return base + mult * level;
    case 21:
    case 22:
      return base + mult * level + growth * level ** 2;
    case 26:
      return base + mult * (level + 1);
    default:
      return 0;
  }
}

for (const [type, base, mult, growth, level, expected] of cases) {
  const actual = calculate(type, base, mult, growth, level);
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(
      `type ${type} level ${level}: expected ${expected}, received ${actual}`,
    );
  }
}

console.log(`ok ${cases.length} stat modifier cases`);
