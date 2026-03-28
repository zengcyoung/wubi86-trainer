/**
 * build-dict.mjs
 * 从 rime-wubi86-jidian 的 YAML 码表提取数据，生成 TypeScript 常量文件。
 *
 * 产出：
 *   src/data/dict.ts          — 完整单字码表 Map<string, string[]>（字 → 所有编码）
 *   src/data/level1.ts        — 一级简码（25个字，单字母编码，取 weight 最高的）
 *   src/data/level2.ts        — 二级简码（单字，2字母编码，取 weight 最高的）
 *   src/data/level2Groups.ts  — 二级简码按第一键分组，组内按第二键键盘行排列
 *   src/data/phrases.ts       — 词组（4码，2字以上），按 weight 降序，去重
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
/** @type {Map<string, {text:string, weight:number}>} */
const level1Map = new Map()
for (const { text, code, weight } of entries) {
  if ([...text].length !== 1) continue
  if (code.length !== 1) continue
  const existing = level1Map.get(code)
  if (!existing || weight > existing.weight) {
    level1Map.set(code, { text, weight })
  }
}

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
  if (!code.match(/^[a-z]{2}$/)) continue
  const existing = level2Map.get(code)
  if (!existing || weight > existing.weight) {
    level2Map.set(code, { text, weight })
  }
}

/** @type {Array<{code:string, char:string}>} */
const level2 = [...level2Map.entries()]
  .map(([code, { text }]) => ({ code, char: text }))
  .sort((a, b) => a.code.localeCompare(b.code))

// ── 二级简码分组：按第一键 → 子行（按第二键的键盘行） ─────────────────────
// 键盘行定义（五笔26键，z不用）
const KB_ROWS = ['gfdsa', 'hjklm', 'trewq', 'yuiop', 'nbvcx']

/** 返回某个字母属于哪一键盘行 */
function rowOf(k) {
  for (const row of KB_ROWS) {
    if (row.includes(k)) return row
  }
  return null
}

// 按第一键分26组（a-y），每组内按第二键的键盘行排列
const ALL_KEYS = 'abcdefghijklmnopqrstuvwxy' // z不参与五笔

/** @type {Array<{ firstKey: string, rows: Array<{ rowKeys: string, entries: Array<{code:string,char:string}> }> }>} */
const level2Groups = []

for (const firstKey of ALL_KEYS.split('')) {
  const group = level2.filter(e => e.code[0] === firstKey)
  if (group.length === 0) continue

  // 按键盘行分子组
  const rowMap = /** @type {Map<string, Array<{code:string,char:string}>>} */ (new Map())
  for (const entry of group) {
    const r = rowOf(entry.code[1])
    if (!r) continue
    if (!rowMap.has(r)) rowMap.set(r, [])
    rowMap.get(r).push(entry)
  }

  const rows = KB_ROWS
    .filter(r => rowMap.has(r))
    .map(r => ({ rowKeys: r, entries: rowMap.get(r) }))

  level2Groups.push({ firstKey, rows })
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

// level2.ts
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

// level2Groups.ts
const groupsJson = JSON.stringify(level2Groups, null, 2)
const l2gTs = `// 自动生成，勿手动修改 — scripts/build-dict.mjs
// 二级简码分组：按第一键分组，组内按第二键键盘行排列

export interface Level2GroupEntry {
  code: string
  char: string
}

export interface Level2Row {
  /** 键盘行字母（如 "gfdsa"） */
  rowKeys: string
  entries: Level2GroupEntry[]
}

export interface Level2Group {
  /** 第一键（小写字母） */
  firstKey: string
  rows: Level2Row[]
}

export const LEVEL2_GROUPS: Level2Group[] = ${groupsJson}
`

// dict.ts
const dictMap = new Map()
for (const { text, code, weight } of entries) {
  if ([...text].length !== 1) continue
  if (!dictMap.has(text)) dictMap.set(text, [])
  dictMap.get(text).push(code)
}
const dictEntries = [...dictMap.entries()]
  .map(([char, codes]) => `  [${JSON.stringify(char)}, ${JSON.stringify(codes)}]`)
const dictTs = `// 自动生成，勿手动修改 — scripts/build-dict.mjs
// 完整单字码表：汉字 → 编码列表

export const DICT: Map<string, string[]> = new Map([
${dictEntries.join(',\n')}
])
`

// ── 词组：4码、2字以上，按 weight 降序，code 去重（取最高 weight 的词） ──
/** @type {Map<string, {text:string, weight:number, wordLen:number}>} */
const phraseMap = new Map()
for (const { text, code, weight } of entries) {
  const wl = [...text].length
  if (wl < 2) continue
  if (code.length !== 4) continue
  if (!code.match(/^[a-z]{4}$/)) continue
  const existing = phraseMap.get(code)
  // 同编码取 weight 最高；weight 相同取字数更少（更常用）
  if (!existing || weight > existing.weight || (weight === existing.weight && wl < existing.wordLen)) {
    phraseMap.set(code, { text, weight, wordLen: wl })
  }
}

/** @type {Array<{text:string, code:string, weight:number, wordLen:number}>} */
const phrases = [...phraseMap.entries()]
  .map(([code, { text, weight, wordLen }]) => ({ text, code, weight, wordLen }))
  .sort((a, b) => b.weight - a.weight || a.wordLen - b.wordLen)

// phrases.ts — 分三档输出，方便前端按难度加载
// tier1: weight >= 30  (~1589个，高频核心词)
// tier2: weight >= 20  (全量 ~62000+)
const tier1 = phrases.filter(p => p.weight >= 30)
const tier2 = phrases.filter(p => p.weight >= 20 && p.weight < 30)

const phraseEntryTs = (p) =>
  `  { text: ${JSON.stringify(p.text)}, code: ${JSON.stringify(p.code)}, weight: ${p.weight}, wordLen: ${p.wordLen} }`

const phraseTs = `// 自动生成，勿手动修改 — scripts/build-dict.mjs
// 词组码表：4码，按 weight 降序排列
// tier1: weight >= 30 (高频词，${tier1.length}个)
// tier2: weight == 20 (扩展词，${tier2.length}个)

export interface PhraseEntry {
  text: string    // 词组文字
  code: string    // 4位编码
  weight: number  // 词频权重
  wordLen: number // 词组字数
}

/** 高频词组（weight ≥ 30），共 ${tier1.length} 个，适合初学练习 */
export const PHRASES_TIER1: PhraseEntry[] = [
${tier1.map(phraseEntryTs).join(',\n')}
]

/** 扩展词组（weight = 20），共 ${tier2.length} 个 */
export const PHRASES_TIER2: PhraseEntry[] = [
${tier2.map(phraseEntryTs).join(',\n')}
]

/** 全量词组（tier1 + tier2），共 ${tier1.length + tier2.length} 个 */
export const PHRASES_ALL: PhraseEntry[] = [...PHRASES_TIER1, ...PHRASES_TIER2]
`

fs.writeFileSync(path.join(OUT_DIR, 'level1.ts'), l1Ts)
fs.writeFileSync(path.join(OUT_DIR, 'level2.ts'), l2Ts)
fs.writeFileSync(path.join(OUT_DIR, 'level2Groups.ts'), l2gTs)
fs.writeFileSync(path.join(OUT_DIR, 'dict.ts'), dictTs)
fs.writeFileSync(path.join(OUT_DIR, 'phrases.ts'), phraseTs)

console.log(`✅ level1.ts        — ${level1.length} entries`)
console.log(`✅ level2.ts        — ${level2.length} entries`)
console.log(`✅ level2Groups.ts  — ${level2Groups.length} groups`)
console.log(`✅ dict.ts          — ${dictMap.size} unique chars`)
console.log(`✅ phrases.ts       — tier1: ${tier1.length}, tier2: ${tier2.length}, total: ${tier1.length + tier2.length}`)
