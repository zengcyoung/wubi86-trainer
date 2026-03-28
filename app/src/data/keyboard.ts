// 五笔键盘行布局（从上到下）
export const KEYBOARD_ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
  ['n', 'b', 'v', 'c', 'x'],
]

// 一级简码的键盘行分组（用于展示）
// GFDSA / HJKLM / TREWQ / YUIOP / NBVCX
export const LEVEL1_ROWS: { keys: string[]; label: string }[] = [
  { keys: ['g', 'f', 'd', 's', 'a'], label: 'GFDSA' },
  { keys: ['h', 'j', 'k', 'l', 'm'], label: 'HJKLM' },
  { keys: ['t', 'r', 'e', 'w', 'q'], label: 'TREWQ' },
  { keys: ['y', 'u', 'i', 'o', 'p'], label: 'YUIOP' },
  { keys: ['n', 'b', 'v', 'c', 'x'], label: 'NBVCX' },
]
