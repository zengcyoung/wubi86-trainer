/**
 * 用 Fisher-Yates 洗牌，返回新数组（不修改原数组）
 * seed 相同则顺序相同，seed 不传则每次随机
 */
export function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = [...arr]
  // 简单 LCG 伪随机（seed 固定时可复现）
  let s = seed ?? Math.floor(Math.random() * 2 ** 31)
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return s / 0x7fffffff
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
