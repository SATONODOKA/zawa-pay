export const yen = (n: number) => `¥${n.toLocaleString()}`;
export const roundToUnit = (n: number, unit: 1|10|100|1000) =>
  Math.round(n / unit) * unit;
