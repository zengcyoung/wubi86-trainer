import { useState, useRef, useEffect, useCallback } from 'react'
import { PHRASES_TIER1, PHRASES_TIER2 } from '../data/phrases'
import type { PhraseEntry } from '../data/phrases'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { advance, recordMistake, resetLesson, jumpTo } from '../store/progressSlice'
import ResultPage from './ResultPage'
import type { MistakeEntry } from './ResultPage'

const ROUND_SIZE = 50  // 每 50 个词触发一次结算

type Tier = 'tier1' | 'tier2' | 'all'

const TIER_DATA: Record<Tier, PhraseEntry[]> = {
  tier1: PHRASES_TIER1,
  tier2: [...PHRASES_TIER1, ...PHRASES_TIER2],
  all: [...PHRASES_TIER1, ...PHRASES_TIER2],
}

const TIER_LABELS: Record<Tier, string> = {
  tier1: `高频词 (${PHRASES_TIER1.length})`,
  tier2: `扩展词 (${PHRASES_TIER1.length + PHRASES_TIER2.length})`,
  all: '全量',
}

type InputState = 'idle' | 'correct' | 'wrong'

// 把编码按输入位置着色
function CodeDisplay({
  code,
  typed,
  state,
}: {
  code: string
  typed: string
  state: InputState
}) {
  return (
    <div className="flex gap-1 font-mono text-2xl tracking-widest">
      {code.split('').map((ch, i) => {
        let color = 'text-gray-500'
        if (i < typed.length) {
          color = typed[i] === ch
            ? state === 'wrong' && i === typed.length - 1
              ? 'text-red-400'
              : 'text-green-400'
            : 'text-red-400'
        } else if (i === typed.length) {
          color = 'text-amber-300 animate-pulse'
        }
        return (
          <span
            key={i}
            className={`
              px-1.5 py-0.5 rounded transition-colors duration-100
              ${i < typed.length
                ? typed[i] === ch ? 'bg-green-400/10' : 'bg-red-400/10'
                : i === typed.length ? 'bg-amber-400/10' : ''
              }
              ${color}
            `}
          >
            {ch.toUpperCase()}
          </span>
        )
      })}
    </div>
  )
}

export default function PhrasePage({ onHome }: { onHome?: () => void }) {
  const dispatch = useAppDispatch()
  const phraseProgress = useAppSelector(s => s.progress.lessons.phrase)

  const [tier, setTier] = useState<Tier>('tier1')
  const sequence = TIER_DATA[tier]

  const safeIndex = phraseProgress.currentIndex % sequence.length
  const current = sequence[safeIndex]

  const [roundMistakes, setRoundMistakes] = useState<Record<string, { code: string; count: number }>>({})
  const [roundCorrect, setRoundCorrect] = useState(0)
  const [roundMistakeCount, setRoundMistakeCount] = useState(0)
  const [showResult, setShowResult] = useState(false)

  // 每打完 ROUND_SIZE 个词触发结算
  const prevIndexRef = useRef(phraseProgress.currentIndex)
  useEffect(() => {
    const prev = prevIndexRef.current
    prevIndexRef.current = phraseProgress.currentIndex
    const crossedBoundary =
      Math.floor(prev / ROUND_SIZE) < Math.floor(phraseProgress.currentIndex / ROUND_SIZE)
    if (crossedBoundary && phraseProgress.currentIndex > 0) {
      setShowResult(true)
    }
  }, [phraseProgress.currentIndex])

  const [typed, setTyped] = useState('')
  const [inputState, setInputState] = useState<InputState>('idle')
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [safeIndex])

  // 切换 tier 时重置 index
  const handleTierChange = (t: Tier) => {
    setTier(t)
    setTyped('')
    dispatch(jumpTo({ lesson: 'phrase', index: 0 }))
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const key = e.key.toLowerCase()
      if (!/^[a-z]$/.test(key)) return
      e.preventDefault()

      const newTyped = typed + key

      if (newTyped.length < 4) {
        // 中间某键打错，立即报错
        if (key !== current.code[newTyped.length - 1]) {
          setTyped(newTyped)
          setInputState('wrong')
          setShake(true)
          dispatch(recordMistake({ lesson: 'phrase' }))
          setRoundMistakeCount(c => c + 1)
          setRoundMistakes(prev => ({
            ...prev,
            [current.text]: { code: current.code, count: (prev[current.text]?.count ?? 0) + 1 },
          }))
          setTimeout(() => {
            setInputState('idle')
            setShake(false)
            setTyped('')
          }, 400)
          return
        }
        setTyped(newTyped)
      } else {
        // 第4键
        const full = newTyped
        if (full === current.code) {
          setTyped(full)
          setInputState('correct')
          dispatch(advance({ lesson: 'phrase', char: current.text }))
          setRoundCorrect(c => c + 1)
          setTimeout(() => {
            setInputState('idle')
            setTyped('')
          }, 250)
        } else {
          setTyped(full)
          setInputState('wrong')
          setShake(true)
          dispatch(recordMistake({ lesson: 'phrase' }))
          setRoundMistakeCount(c => c + 1)
          setRoundMistakes(prev => ({
            ...prev,
            [current.text]: { code: current.code, count: (prev[current.text]?.count ?? 0) + 1 },
          }))
          setTimeout(() => {
            setInputState('idle')
            setShake(false)
            setTyped('')
          }, 400)
        }
      }
    },
    [typed, current, dispatch]
  )

  const { correct: pCorrect, mistakes: pMistakes } = phraseProgress
  const accuracy =
    pCorrect + pMistakes > 0
      ? Math.round((pCorrect / (pCorrect + pMistakes)) * 100)
      : 100
  const round = Math.floor(phraseProgress.currentIndex / ROUND_SIZE) + 1

  const handleRetry = () => {
    dispatch(resetLesson({ lesson: 'phrase' }))
    setTyped('')
    setRoundMistakes({})
    setRoundCorrect(0)
    setRoundMistakeCount(0)
    setShowResult(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (showResult) {
    const mistakeList: MistakeEntry[] = Object.entries(roundMistakes)
      .map(([text, { code, count }]) => ({ text, code, wrongCount: count }))
      .sort((a, b) => b.wrongCount - a.wrongCount)
    return (
      <ResultPage
        result={{ mode: 'phrase', correct: roundCorrect, mistakes: roundMistakeCount, mistakeList }}
        onRetry={handleRetry}
        onHome={onHome ?? (() => setShowResult(false))}
      />
    )
  }

  // 上下文预览：当前词前3、后6
  const previewStart = Math.max(0, safeIndex - 3)
  const previewEnd = Math.min(sequence.length, safeIndex + 7)
  const preview = sequence.slice(previewStart, previewEnd)

  return (
    <div
      className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center px-4 py-8 gap-6 select-none"
      onClick={() => inputRef.current?.focus()}
    >
      {/* 标题 + 统计 */}
      <div className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-widest text-amber-400">词组练习</h1>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>第 <span className="text-white font-semibold">{round}</span> 轮</span>
          <span>{safeIndex + 1} / {sequence.length}</span>
          <span>
            正确率 <span className={`font-semibold ${
              accuracy >= 90 ? 'text-green-400' : accuracy >= 70 ? 'text-yellow-400' : 'text-red-400'
            }`}>{accuracy}%</span>
          </span>
          <button
            onClick={handleRetry}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >重置</button>
        </div>
      </div>

      {/* Tier 选择 */}
      <div className="flex gap-2">
        {(Object.keys(TIER_LABELS) as Tier[]).map(t => (
          <button
            key={t}
            onClick={() => handleTierChange(t)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${tier === t
                ? 'bg-amber-400 text-gray-900'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }
            `}
          >
            {TIER_LABELS[t]}
          </button>
        ))}
      </div>

      {/* 主练习区 */}
      <div
        className={`
          w-full max-w-2xl flex flex-col items-center gap-4 py-8 px-6
          rounded-2xl border transition-all duration-150
          ${inputState === 'correct'
            ? 'border-green-400 bg-green-400/5'
            : inputState === 'wrong'
              ? 'border-red-400 bg-red-400/5'
              : 'border-gray-800 bg-gray-900'
          }
          ${shake ? '[animation:shake_0.35s_ease-in-out]' : ''}
        `}
      >
        {/* 词组大字 */}
        <div className={`
          text-6xl font-bold tracking-widest transition-colors duration-150
          ${inputState === 'correct' ? 'text-green-400'
            : inputState === 'wrong' ? 'text-red-400'
            : 'text-white'}
        `}>
          {current.text}
        </div>

        {/* 编码 + 实时输入反馈 */}
        <CodeDisplay code={current.code} typed={typed} state={inputState} />

        {/* 词长提示 */}
        <div className="text-xs text-gray-600">
          {current.wordLen === 2 ? '二字词'
            : current.wordLen === 3 ? '三字词'
            : current.wordLen === 4 ? '四字词'
            : `${current.wordLen}字词`}
          {' · '}weight {current.weight}
        </div>
      </div>

      {/* 词流预览（类似打字练习的上下文感） */}
      <div className="w-full max-w-2xl flex flex-wrap gap-2 justify-center">
        {preview.map((p, i) => {
          const absIdx = previewStart + i
          const isCurrent = absIdx === safeIndex
          const isPast = absIdx < safeIndex
          return (
            <div
              key={`${absIdx}-${p.code}`}
              className={`
                flex flex-col items-center px-3 py-1.5 rounded-lg transition-all
                ${isCurrent
                  ? 'bg-amber-400/15 ring-1 ring-amber-400 scale-105'
                  : isPast
                    ? 'bg-gray-800/40 opacity-40'
                    : 'bg-gray-800/60'
                }
              `}
            >
              <span className={`text-lg font-bold ${isCurrent ? 'text-white' : isPast ? 'text-gray-500' : 'text-gray-300'}`}>
                {p.text}
              </span>
              <span className={`text-xs font-mono ${isCurrent ? 'text-amber-300' : 'text-gray-600'}`}>
                {p.code.toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>

      {/* 隐藏 input */}
      <input
        ref={inputRef}
        className="opacity-0 absolute w-0 h-0"
        onKeyDown={handleKeyDown}
        readOnly
        autoFocus
      />
      <p className="text-gray-600 text-xs">依次按下4个键位 · 点击页面重新聚焦</p>
    </div>
  )
}
