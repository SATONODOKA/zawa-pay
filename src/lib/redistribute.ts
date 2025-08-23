export function snap(value: number, unit: number) {
  if (unit <= 1) return Math.round(value);
  return Math.round(value / unit) * unit;
}

/**
 * target の新値に合わせ、残りは「均等」に増減。
 * 合計 groupTotal を必ず守る。2名なら残り1人が全相殺。
 */
export function redistributeKeepSumEqual(
  amounts: Record<string, number>,
  groupTotal: number,
  targetId: string,
  newVal: number
) {
  const ids = Object.keys(amounts);
  const others = ids.filter(id => id !== targetId);

  const next: Record<string, number> = { ...amounts, [targetId]: Math.max(0, Math.round(newVal)) };
  if (others.length === 0) return next;

  const needOthers = groupTotal - next[targetId];
  const base = Math.floor(needOthers / others.length);
  const r = needOthers - base * others.length;
  for (let i = 0; i < others.length; i++) next[others[i]] = base + (i < r ? 1 : 0);

  // 最終調整（端数）
  const sum = Object.values(next).reduce((s, v) => s + v, 0);
  if (sum !== groupTotal) {
    const maxId = [...ids].sort((a, b) => next[b] - next[a])[0];
    next[maxId] += groupTotal - sum;
  }
  return next;
} 