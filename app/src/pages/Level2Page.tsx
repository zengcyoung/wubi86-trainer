import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { LEVEL2_GROUPS } from '../data/level2Groups'
import type { Level2Group } from '../data/level2Groups'
import { LEVEL2 } from '../data/level2'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { advance, recordMistake, resetLesson, jumpTo } from '../store/progressSlice'
import ResultPage from './ResultPage'
import type { MistakeEntry } from './ResultPage'
import { shuffle } from '../utils/shuffle'

type InputState = 'idle' | 'correct' | 'wrong'
type Mode = 'practice' | 'review'

const KB_ROW_ORDER = ['gfdsa', 'hjklm', 'trewq', 'yuiop', 'nbvcx']

// 每组内条目数
const GROUP_SIZES = LEVEL2_GROUPS.map(g => ({
  firstKey: g.firstKey,
  size: g.rows.reduce((s, r) => s + r.entries.length, 0),
}))

// 给定 roundSeed，生成"组内随机、组间 A→Y"的完整序列
// 每组用 roundSeed ^ groupIndex 作为子 seed，保证各组独立洗牌
function buildShuffledSequence(roundSeed: number) {
  return LEVEL2_GROUPS.flatMap((g, i) => {
    const entries = g.rows.flatMap(r => r.entries)
    return shuffle(entries, (roundSeed ^ (i * 2654435761)) >>> 0)
  })
}

export default function Level2Page({ onHome }: { onHome?: () => void }) {
  const dispatch = useAppDispatch()
  const { currentIndex, correct, mistakes, roundSeed, mastered } = useAppSelector(
    s => s.progress.lessons.level2
  )

  const [mode, setMode] = useState<Mode>('practice')

  // ── 复习序列：从 mastered 里取，按 mastered 次数从少到多（薄弱优先）
  const reviewSequence = useMemo(() => {
    const masteredChars = Object.keys(mastered)
    if (masteredChars.length === 0) return []
    return masteredChars
      .map(char => {
        const entry = LEVEL2.find(e => e.char === char)
        return entry ? { char: entry.char, code: entry.code } : null
      })
      .filter(Boolean)
      .sort((a, b) => (mastered[a!.char] ?? 0) - (mastered[b!.char] ?? 0)) as { char: string; code: string }[]
  }, [mastered])

  // ── 练习序列：组内随机，组间 A→Y
  const practiceSequence = useMemo(() => buildShuffledSequence(roundSeed), [roundSeed])

  // 各组在洗牌序列中的起始 index（组间顺序固定，只有组内顺序随机）
  const groupStartInShuffled = useMemo(() => {
    const map: Record<string, number> = {}
    let idx = 0
    for (const { firstKey, size } of GROUP_SIZES) {
      map[firstKey] = idx
      idx += size
    }
    return map
  }, [])

  const sequence = mode === 'review' ? reviewSequence : practiceSequence

  const [reviewIndex, setReviewIndex] = useState(0)
  const activeIndex = mode === 'review' ? reviewIndex : currentIndex
  const safeIndex = sequence.length > 0 ? activeIndex % sequence.length : 0
  const current = sequence[safeIndex]

  const currentGroup: Level2Group | undefined = current
    ? LEVEL2_GROUPS.find(g => g.firstKey === current.code[0])
    : undefined

  const [inputBuffer, setInputBuffer] = useState('')
  const [inputState, setInputState] = useState<InputState>('idle')
  const [shake, setShake] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(currentGroup?.firstKey ?? 'a')
  const [roundMistakes, setRoundMistakes] = useState<Record<string, { code: string; count: number }>>({})
  const [roundCorrect, setRoundCorrect] = useState(0)
  const [roundMistakeCount, setRoundMistakeCount] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ROUND_SIZE = practiceSequence.length  // 一轮 = 打完全部 616 个字

  // 完成一轮检测（仅 practice 模式）
  const prevIndexRef = useRef(currentIndex)
  useEffect(() => {
    if (mode !== 'practice') return
    const prev = prevIndexRef.current
    prevIndexRef.current = currentIndex
    if (Math.floor(prev / ROUND_SIZE) < Math.floor(currentIndex / ROUND_SIZE) && currentIndex > 0) {
      setShowResult(true)
    }
  }, [currentIndex, mode, ROUND_SIZE])

  useEffect(() => {
    inputRef.current?.focus()
  }, [safeIndex])

  useEffect(() => {
    if (currentGroup) setSelectedGroup(currentGroup.firstKey)
  }, [currentGroup?.firstKey])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!current) return
      const key = e.key.toLowerCase()
      if (!/^[a-z]$/.test(key)) return

      const newBuffer = inputBuffer + key
      setInputBuffer(newBuffer)

      const recordErr = () => {
        setInputState('wrong')
        setShake(true)
        dispatch(recordMistake({ lesson: 'level2' }))
        setRoundMistakeCount(c => c + 1)
        setRoundMistakes(prev => ({
          ...prev,
          [current.char]: { code: current.code, count: (prev[current.char]?.count ?? 0) + 1 },
        }))
        setTimeout(() => { setInputState('idle'); setShake(false); setInputBuffer('') }, 400)
      }

      if (newBuffer.length === 1) {
        if (key !== current.code[0]) { recordErr(); return }
      } else if (newBuffer.length === 2) {
        if (newBuffer !== current.code) { recordErr(); return }
        // 正确
        setInputState('correct')
        if (mode === 'review') {
          setReviewIndex(i => i + 1)
        } else {
          const isLast = (currentIndex + 1) % ROUND_SIZE === 0
          dispatch(advance({ lesson: 'level2', char: current.char, newRound: isLast }))
        }
        setRoundCorrect(c => c + 1)
        setTimeout(() => { setInputState('idle'); setInputBuffer('') }, 200)
      }
    },
    [inputBuffer, current, currentIndex, mode, ROUND_SIZE, dispatch]
  )

  const accuracy = correct + mistakes > 0
    ? Math.round((correct / (correct + mistakes)) * 100) : 100
  const round = Math.floor(currentIndex / ROUND_SIZE) + 1

  const handleReset = () => {
    dispatch(resetLesson({ lesson: 'level2' }))
    setInputBuffer('')
    setRoundMistakes({})
    setRoundCorrect(0)
    setRoundMistakeCount(0)
    setShowResult(false)
    setReviewIndex(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleRetry = () => {
    setRoundMistakes({})
    setRoundCorrect(0)
    setRoundMistakeCount(0)
    setShowResult(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const jumpToGroup = (firstKey: string) => {
    setSelectedGroup(firstKey)
    if (mode === 'practice') {
      const idx = groupStartInShuffled[firstKey] ?? 0
      dispatch(jumpTo({ lesson: 'level2', index: idx }))
    }
    setInputBuffer('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const displayGroup = LEVEL2_GROUPS.find(g => g.firstKey === selectedGroup)!

  if (showResult) {
    const mistakeList: MistakeEntry[] = Object.entries(roundMistakes)
      .map(([text, { code, count }]) => ({ text, code, wrongCount: count }))
      .sort((a, b) => b.wrongCount - a.wrongCount)
    return (
      <ResultPage
        result={{ mode: 'level2', correct: roundCorrect, mistakes: roundMistakeCount, mistakeList }}
        onRetry={handleRetry}
        onHome={onHome ?? (() => setShowResult(false))}
      />
    )
  }

  // 复习模式空状态
  if (mode === 'review' && reviewSequence.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="text-4xl">📭</div>
        <p className="text-gray-400">还没有练习记录，先去练习模式打几个字吧！</p>
        <button onClick={() => setMode('practice')} className="px-4 py-2 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-400 transition-colors">
          去练习
        </button>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center px-4 py-8 gap-6 select-none">
      {/* 标题 + 统计 */}
      <div className="w-full max-w-3xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-widest text-sky-400">二级简码</h1>
          {/* 模式切换 */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
            {(['practice', 'review'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setInputBuffer(''); setReviewIndex(0) }}
                className={`px-3 py-1 font-medium transition-colors ${
                  mode === m ? 'bg-sky-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {m === 'practice' ? '练习' : `复习 (${reviewSequence.length})`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 text-sm text-gray-400">
          {mode === 'practice' && <span>第 <span className="text-white font-semibold">{round}</span> 轮</span>}
          <span>{safeIndex + 1} / {sequence.length}</span>
          <span>正确率 <span className={`font-semibold ${accuracy >= 90 ? 'text-green-400' : accuracy >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{accuracy}%</span></span>
          <button onClick={handleReset} className="text-gray-500 hover:text-gray-300 transition-colors">重置</button>
        </div>
      </div>

      <div className="w-full max-w-3xl flex gap-4">
        {/* 左侧：分组选择器 */}
        <div className="flex flex-col gap-1 shrink-0">
          <div className="text-xs text-gray-500 mb-1 text-center">分组</div>
          {LEVEL2_GROUPS.map(g => (
            <button
              key={g.firstKey}
              onClick={() => jumpToGroup(g.firstKey)}
              className={`
                w-10 h-8 rounded text-sm font-mono font-bold transition-all
                ${g.firstKey === currentGroup?.firstKey
                  ? 'bg-sky-500 text-white'
                  : g.firstKey === selectedGroup
                    ? 'bg-gray-700 text-sky-300 ring-1 ring-sky-400'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              {g.firstKey.toUpperCase()}
            </button>
          ))}
        </div>

        {/* 右侧 */}
        <div className="flex-1 flex flex-col gap-4">
          {/* 当前大字 */}
          <div className={`
            flex flex-col items-center justify-center py-6 rounded-xl border transition-all duration-150
            ${inputState === 'correct' ? 'border-green-400 bg-green-400/5'
              : inputState === 'wrong' ? 'border-red-400 bg-red-400/5'
              : mode === 'review' ? 'border-sky-400/30 bg-sky-400/5' : 'border-gray-800 bg-gray-900'}
            ${shake ? '[animation:shake_0.35s_ease-in-out]' : ''}
          `}>
            {mode === 'review' && (
              <div className="text-xs text-sky-400 mb-2 font-medium">
                复习 · 练过 {mastered[current.char] ?? 0} 次
              </div>
            )}
            <div className={`text-7xl font-bold transition-colors duration-150 ${
              inputState === 'correct' ? 'text-green-400'
                : inputState === 'wrong' ? 'text-red-400' : 'text-white'
            }`}>{current.char}</div>
            <div className="mt-2 flex gap-1 text-2xl font-mono tracking-widest">
              {[0, 1].map(i => (
                <span key={i} className={`px-2 py-0.5 rounded ${
                  inputBuffer.length > i
                    ? inputBuffer[i] === current.code[i] ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                    : inputBuffer.length === i ? 'text-amber-300 animate-pulse bg-amber-400/10' : 'text-gray-500'
                }`}>
                  {current.code[i].toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* 分组码表 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs text-gray-500 mb-3 font-mono">
              {displayGroup.firstKey.toUpperCase()} 组 — {displayGroup.rows.reduce((s, r) => s + r.entries.length, 0)} 个字
              {mode === 'practice' && <span className="ml-2 text-sky-400/60">随机顺序</span>}
            </div>
            <div className="flex flex-col gap-3">
              {KB_ROW_ORDER
                .filter(rk => displayGroup.rows.some(r => r.rowKeys === rk))
                .map(rk => {
                  const row = displayGroup.rows.find(r => r.rowKeys === rk)!
                  return (
                    <div key={rk} className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-gray-600 font-mono w-14 shrink-0">{rk.toUpperCase()}</span>
                      {row.entries.map(entry => {
                        const isActive = entry.code === current.code
                        const isMastered = !!mastered[entry.char]
                        return (
                          <div key={entry.code} className={`
                            flex flex-col items-center px-2 py-1 rounded min-w-[2.5rem] transition-all duration-100
                            ${isActive
                              ? inputState === 'correct' ? 'bg-green-400/20 ring-1 ring-green-400 scale-110'
                                : inputState === 'wrong' ? 'bg-red-400/20 ring-1 ring-red-400'
                                : 'bg-sky-400/15 ring-1 ring-sky-400 scale-105'
                              : isMastered ? 'bg-gray-800/60' : 'bg-gray-800 hover:bg-gray-700'
                            }
                          `}>
                            <span className={`text-base font-bold leading-tight ${isMastered && !isActive ? 'text-gray-500' : 'text-white'}`}>
                              {entry.char}
                            </span>
                            <span className={`text-xs font-mono ${isActive ? 'text-sky-300' : 'text-gray-500'}`}>
                              {entry.code.toUpperCase()}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>

      <input ref={inputRef} className="opacity-0 absolute w-0 h-0" onKeyDown={handleKeyDown} readOnly autoFocus />
      <p className="text-gray-600 text-xs">
        {mode === 'practice' ? '随机顺序 · 依次按下两键' : '复习薄弱字 · 按掌握次数从少到多排列'}
      </p>
    </div>
  )
}
