// 役職と年齢をざっくりバケットで係数化（あとで調整前提）
export const ROLE_FACTOR = {
  EXEC: 1.5,     // 役員
  MANAGER: 1.2,  // 部長/課長
  SENIOR: 1.1,   // 主任/リーダー
  MEMBER: 1.0,   // 一般
  JUNIOR: 0.9,   // 新人/インターン
} as const;

export function ageBucketFactor(age?: number | null) {
  if (age == null) return 1.0;     // 未設定は等倍
  if (age >= 50) return 1.10;
  if (age >= 40) return 1.05;
  if (age <= 22) return 0.90;
  if (age <= 26) return 0.95;
  return 1.0;
}

export function roughWeight(role?: string, age?: number | null) {
  const base = (ROLE_FACTOR as Record<string, number>)[role ?? "MEMBER"] ?? 1.0;
  return Number((base * ageBucketFactor(age)).toFixed(3));
}

// 重み→整数円配分（端数は raw-floor の大きい順に+1で決定的に配布）
export function allocateByWeights(
  total: number,
  items: { id: string; weight: number }[]
) {
  const weights = items.map(i => ({ ...i, weight: Math.max(0, i.weight) }));
  const W = weights.reduce((s, x) => s + x.weight, 0);
  if (W <= 0) {
    const k = weights.length, base = Math.floor(total / k);
    const r = total - base * k;
    return Object.fromEntries(weights.map((it, i) => [it.id, base + (i < r ? 1 : 0)]));
  }
  const raw = weights.map(x => ({ id: x.id, raw: (total * x.weight) / W }));
  const base = raw.map(x => ({ id: x.id, val: Math.floor(x.raw) }));
  let r = total - base.reduce((s, x) => s + x.val, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x.raw - base[i].val }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && r > 0; k++) { base[order[k].i].val += 1; r--; }
  return Object.fromEntries(base.map(x => [x.id, x.val]));
}
