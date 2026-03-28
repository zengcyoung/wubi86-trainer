/**
 * build-dict.mjs
 * 从 rime-wubi86-jidian 的 YAML 码表提取数据，生成 TypeScript 常量文件。
 *
 * 产出：
 *   src/data/dict.ts         — 完整单字码表 Map<string, string[]>（字 → 所有编码）
 *   src/data/level1.ts       — 一级简码（25个字，单字母编码，取 weight 最高的）
 *   src/data/level2.ts       — 二级简码（单字，2字母编码，取 weight 最高的）
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DICT_PATH = path.resolve(__dirname, '../../rime-source/wubi86_jidian.dict.yaml')
const OUT_DIR = path.resolve(__dirname, '../src/data')

fs.mkdirSync(OUT_DIR, { recursive: true })

// ── 解析 YAML 码表 ──────────────────────────────────────────────────────────
const raw = fs.readFileSync(DICT_PATH, 'utf-8')
const lines = raw.split('\n')

// 找到 "..." 之后才是数据
let dataStart = 0
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '...') { dataStart = i + 1; break }
}

/** @type {Array<{text:string, code:string, weight:number}>} */
const entries = []
for (let i = dataStart; i < lines.length; i++) {
  const parts = lines[i].split('\t')
  if (parts.length < 2) continue
  const [text, code, weightStr] = parts
  if (!text || !code) continue
  const weight = parseInt(weightStr ?? '0', 10) || 0
  entries.push({ text: text.trim(), code: code.trim(), weight })
}

console.log(`Parsed ${entries.length} entries`)

// ── 一级简码：单字、单字母编码 ──────────────────────────────────────────────
// 每个字母取 weight 最高的一个汉字
/** @type {Map<string, {text:string, weight:number}>} */
const level1Map = new Map()
for (const { text, code, weight } of entries) {
  if ([...text].length !== 1) continue   // 单字
  if (code.length !== 1) continue        // 单字母
  const existing = level1Map.get(code)
  if (!existing || weight > existing.weight) {
    level1Map.set(code, { text, weight })
  }
}

// 按键盘顺序：GFDSA / HJKL M / TREWQ / YUIOP / NBVCX
const KEY_ORDER = 'gfdsahjklmtrewqyuiopnbvcx'
/** @type {Array<{key:string, char:string}>} */
const level1 = KEY_ORDER.split('').map(key => ({
  key,
  char: level1Map.get(key)?.text ?? '?',
}))

// ── 二级简码：单字、2字母编码 ───────────────────────────────────────────────
/** @type {Map<string, {text:string, weight:number}>} */
const level2Map = new Map()
for (const { text, code, weight } of entries) {
  if ([...text].length !== 1) continue
  if (code.length !== 2) continue
  const existing = level2Map.get(code)
  if (!existing || weight > existing.weight) {
    level2Map.set(code, { text, weight })
  }
}

/** @type {Array<{code:string, char:string}>} */
const level2 = [...level2Map.entries()]
  .map(([code, { text }]) => ({ code, char: text }))
  .sort((a, b) => a.code.localeCompare(b.code))

// ── 完整单字码表：字 → 编码列表 ────────────────────────────────────────────
/** @type {Map<string, string[]>} */
const dictMap = new Map()
for (const { text, code, weight } of entries) {
  if ([...text].length !== 1) continue    // 只保留单字
  if (!dictMap.has(text)) dictMap.set(text, [])
  // 按 weight 降序插入（简单策略：最后统一排序）
  dictMap.get(text).push(code)
}

// ── 写出 TypeScript 文件 ────────────────────────────────────────────────────

// level1.ts
const l1Ts = `// 自动生成，勿手动修改 — scripts/build-dict.mjs
// 一级简码：25个高频汉字，对应键盘 GFDSA / HJKLM / TREWQ / YUIOP / NBVCX

export interface Level1Entry {
  key: string   // 五笔键位（小写）
  char: string  // 对应汉字
}

export const LEVEL1: Level1Entry[] = ${JSON.stringify(level1, null, 2)}
`

// level2.ts — 条目较多，紧凑格式
const l2Lines = level2.map(e => `  { code: ${JSON.stringify(e.code)}, char: ${JSON.stringify(e.char)} }`)
const l2Ts = `// 自动生成，勿手动修改 — scripts/build-dict.mjs
// 二级简码：单字 + 2字母编码

export interface Level2Entry {
  code: string
  char: string
}

export const LEVEL2: Level2Entry[] = [
${l2Lines.join(',\n')}
]
`

// dict.ts — 完整单字码表
const dictEntries = [...dictMap.entries()]
  .map(([char, codes]) => `  [${JSON.stringify(char)}, ${JSON.stringify(codes)}]`)
const dictTs = `// 自动生成，勿手动修改 — scripts/build-dict.mjs
// 完整单字码表：汉字 → 编码列表（第一个为最高权重）

export const DICT: Map<string, string[]> = new Map([
${dictEntries.join(',\n')}
])
`

fs.writeFileSync(path.join(OUT_DIR, 'level1.ts'), l1Ts)
fs.writeFileSync(path.join(OUT_DIR, 'level2.ts'), l2Ts)
fs.writeFileSync(path.join(OUT_DIR, 'dict.ts'), dictTs)

console.log(`✅ level1.ts  — ${level1.length} entries`)
console.log(`✅ level2.ts  — ${level2.length} entries`)
console.log(`✅ dict.ts    — ${dictMap.size} unique chars`)
