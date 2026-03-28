import { DICT } from './dict'
import { LEVEL1 } from './level1'
import { LEVEL2 } from './level2'

// 一级简码 Map: char → key
const LEVEL1_MAP = new Map(LEVEL1.map(e => [e.char, e.key]))
// 二级简码 Map: char → code
const LEVEL2_MAP = new Map(LEVEL2.map(e => [e.char, e.code]))

/**
 * 给定汉字，返回最优编码（优先简码）
 * 策略：一级简码 > 二级简码 > 完整码（取第一个，即最高权重）
 */
export function lookupCode(char: string): string | null {
  // 一级简码
  const l1 = LEVEL1_MAP.get(char)
  if (l1) return l1

  // 二级简码
  const l2 = LEVEL2_MAP.get(char)
  if (l2) return l2

  // 完整码
  const full = DICT.get(char)
  if (full && full.length > 0) return full[0]

  return null
}

/** 判断是否为需要打的汉字（过滤标点、数字、英文、空白） */
export function isCJK(char: string): boolean {
  const cp = char.codePointAt(0) ?? 0
  return (cp >= 0x4e00 && cp <= 0x9fff)   // CJK 基本区
    || (cp >= 0x3400 && cp <= 0x4dbf)      // CJK 扩展 A
    || (cp >= 0x20000 && cp <= 0x2a6df)    // CJK 扩展 B
}

export interface ArticleChar {
  char: string
  code: string | null   // null = 无法查到编码（生僻字）
  isPunctuation: boolean
}

/**
 * 把文章字符串解析为 ArticleChar 列表
 * 标点保留（用于显示），但不需要打
 */
export function parseArticle(text: string): ArticleChar[] {
  return [...text].map(char => {
    if (isCJK(char)) {
      return { char, code: lookupCode(char), isPunctuation: false }
    }
    return { char, code: null, isPunctuation: true }
  })
}
