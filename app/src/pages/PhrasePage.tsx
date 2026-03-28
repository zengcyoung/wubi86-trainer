import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { PHRASES_TIER1, PHRASES_TIER2 } from '../data/phrases'
import type { PhraseEntry } from '../data/phrases'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { advance, recordMistake, resetLesson, jumpTo } from '../store/progressSlice'
import ResultPage from './ResultPage'
import type { MistakeEntry } from './ResultPage'
import { shuffle } from '../utils/shuffle'

const ROUND_SIZE = 50

type Tier = 'tier1' | 'tier2'
type Mode = 'practice' | 'review'

const TIER_BASE: Record<Tier, PhraseEntry[]> = {
  tier1: PHRASES_TIER1,
  tier2: [...PHRASES_TIER1, ...PHRASES_TIER2],
}

const TIER_LABELS: Record<Tier, string> = {
  tier1: `高频词 (${PHRASES_TIER1.length})`,
  tier2: `扩展词 (${PHRASES_TIER1.length + PHRASES_TIER2.length})`,
}

type InputState = 'idle' | 'correct' | 'wrong'

function CodeDisplay({ code, typed, state }: { code: string; typed: string; state: InputState }) {
  return (
    <div className="flex gap-1 font-mono text-2xl tracking-widest">
      {code.split('').map((ch, i) => {
        let color = 'text-gray-500'
        if (i < typed.length) {
          color = typed[i] === ch
            ? (state === 'wrong' && i === typed.length - 1 ? 'text-red-400' : 'text-green-400')
            : 'text-red-400'
        } else if (i === typed.length) {
          color = 'text-amber-300 animate-pulse'
        }
        return (
          <span key={i} className={`
            px-1.5 py-0.5 rounded transition-colors duration-100
            ${i < typed.length ? (typed[i] === ch ? 'bg-green-400/10' : 'bg-red-400/10') : i === typed.length ? 'bg-amber-400/10' : ''}
            ${color}
          `}>
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
  const { roundSeed, mastered } = phraseProgress

  const [tier, setTier] = useState<Tier>('tier1')
  const [mode, setMode] = useState<Mode>('practice')

  // 练习序列：用 roundSeed 洗牌
  const practiceSequence = useMemo(
    () => shuffle(TIER_BASE[tier], roundSeed),
    [tier, roundSeed]
  )

  // 复习序列：从 mastered 取词组，按掌握次数从少到多
  const reviewSequence = useMemo(() => {
    const allPhrases = [...PHRASES_TIER1, ...PHRASES_TIER2]
    return Object.keys(mastered)
      .map(text => allPhrases.find(p => p.text === text))
      .filter((p): p is PhraseEntry => !!p)
      .sort((a, b) => (mastered[a.text] ?? 0) - (mastered[b.text] ?? 0))
  }, [mastered])

  const [reviewIndex, setReviewIndex] = useState(0)

  const sequence = mode === 'review' ? reviewSequence : practiceSequence
  const activeIndex = mode === 'review' ? reviewIndex : phraseProgress.currentIndex
  const safeIndex = sequence.length > 0 ? activeIndex % sequence.length : 0
  const current = sequence[safeIndex]

  const [roundMistakes, setRoundMistakes] = useState<Record<string, { code: string; count: number }>>({})
  const [roundCorrect, setRoundCorrect] = useState(0)
  const [roundMistakeCount, setRoundMistakeCount] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [typed, setTyped] = useState('')
  const [inputState, setInputState] = useState<InputState>('idle')
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 每 ROUND_SIZE 词触发结算（仅 practice 模式）
  const prevIndexRef = useRef(phraseProgress.currentIndex)
  useEffect(() => {
    if (mode !== 'practice') return
    const prev = prevIndexRef.current
    prevIndexRef.current = phraseProgress.currentIndex
    if (Math.floor(prev / ROUND_SIZE) < Math.floor(phraseProgress.currentIndex / ROUND_SIZE)
      && phraseProgress.currentIndex > 0) {
      setShowResult(true)
    }
  }, [phraseProgress.currentIndex, mode])

  useEffect(() => { inputRef.current?.focus() }, [safeIndex])

  const handleTierChange = (t: Tier) => {
    setTier(t)
    setTyped('')
    dispatch(jumpTo({ lesson: 'phrase', index: 0 }))
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleModeChange = (m: Mode) => {
    setMode(m)
    setTyped('')
    setReviewIndex(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!current) return
      const key = e.key.toLowerCase()
      if (!/^[a-z]$/.test(key)) return
      e.preventDefault()

      const newTyped = typed + key

      const recordErr = () => {
        setTyped(newTyped)
        setInputState('wrong')
        setShake(true)
        dispatch(recordMistake({ lesson: 'phrase' }))
        setRoundMistakeCount(c => c + 1)
        setRoundMistakes(prev => ({
          ...prev,
          [current.text]: { code: current.code, count: (prev[current.text]?.count ?? 0) + 1 },
        }))
        setTimeout(() => { setInputState('idle'); setShake(false); setTyped('') }, 400)
      }

      if (newTyped.length < 4) {
        if (key !== current.code[newTyped.length - 1]) { recordErr(); return }
        setTyped(newTyped)
      } else {
        if (newTyped !== current.code) { recordErr(); return }
        setTyped(newTyped)
        setInputState('correct')
        setRoundCorrect(c => c + 1)
        if (mode === 'review') {
          setReviewIndex(i => i + 1)
        } else {
          dispatch(advance({ lesson: 'phrase', char: current.text }))
        }
        setTimeout(() => { setInputState('idle'); setTyped('') }, 250)
      }
    },
    [typed, current, mode, dispatch]
  )

  const { correct: pCorrect, mistakes: pMistakes } = phraseProgress
  const accuracy = pCorrect + pMistakes > 0
    ? Math.round((pCorrect / (pCorrect + pMistakes)) * 100) : 100
  const round = Math.floor(phraseProgress.currentIndex / ROUND_SIZE) + 1

  const handleRetry = () => {
    dispatch(resetLesson({ lesson: 'phrase' }))
    setTyped('')
    setRoundMistakes({})
    setRoundCorrect(0)
    setRoundMistakeCount(0)
    setShowResult(false)
    setReviewIndex(0)
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

  if (mode === 'review' && reviewSequence.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="text-4xl">📭</div>
        <p className="text-gray-400">还没有练习记录，先去练习模式打几个词吧！</p>
        <button onClick={() => setMode('practice')} className="px-4 py-2 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-400 transition-colors">
          去练习
        </button>
      </div>
    )
  }

  if (!current) return null

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
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-widest text-violet-400">词组练习</h1>
          {/* 模式切换 */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
            {(['practice', 'review'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-3 py-1 font-medium transition-colors ${
                  mode === m ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
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
          <button onClick={handleRetry} className="text-gray-500 hover:text-gray-300 transition-colors">重置</button>
        </div>
      </div>

      {/* Tier 选择（仅练习模式） */}
      {mode === 'practice' && (
        <div className="flex gap-2">
          {(Object.keys(TIER_LABELS) as Tier[]).map(t => (
            <button
              key={t}
              onClick={() => handleTierChange(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tier === t ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {TIER_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {mode === 'review' && (
        <div className="text-xs text-violet-400/70">
          按掌握次数从少到多排列 · 薄弱词优先复习
        </div>
      )}

      {/* 主练习区 */}
      <div className={`
        w-full max-w-2xl flex flex-col items-center gap-4 py-8 px-6
        rounded-2xl border transition-all duration-150
        ${inputState === 'correct' ? 'border-green-400 bg-green-400/5'
          : inputState === 'wrong' ? 'border-red-400 bg-red-400/5'
          : mode === 'review' ? 'border-violet-400/30 bg-violet-400/5' : 'border-gray-800 bg-gray-900'}
        ${shake ? '[animation:shake_0.35s_ease-in-out]' : ''}
      `}>
        {mode === 'review' && (
          <div className="text-xs text-violet-400 font-medium">
            复习 · 练过 {mastered[current.text] ?? 0} 次
          </div>
        )}
        <div className={`text-6xl font-bold tracking-widest transition-colors duration-150 ${
          inputState === 'correct' ? 'text-green-400' : inputState === 'wrong' ? 'text-red-400' : 'text-white'
        }`}>
          {current.text}
        </div>
        <CodeDisplay code={current.code} typed={typed} state={inputState} />
        <div className="text-xs text-gray-600">
          {current.wordLen === 2 ? '二字词' : current.wordLen === 3 ? '三字词' : `${current.wordLen}字词`}
          {' · '}weight {current.weight}
        </div>
      </div>

      {/* 词流预览 */}
      <div className="w-full max-w-2xl flex flex-wrap gap-2 justify-center">
        {preview.map((p, i) => {
          const absIdx = previewStart + i
          const isCurrent = absIdx === safeIndex
          const isPast = absIdx < safeIndex
          return (
            <div key={`${absIdx}-${p.code}`} className={`
              flex flex-col items-center px-3 py-1.5 rounded-lg transition-all
              ${isCurrent ? 'bg-violet-400/15 ring-1 ring-violet-400 scale-105'
                : isPast ? 'bg-gray-800/40 opacity-40' : 'bg-gray-800/60'}
            `}>
              <span className={`text-lg font-bold ${isCurrent ? 'text-white' : isPast ? 'text-gray-500' : 'text-gray-300'}`}>
                {p.text}
              </span>
              <span className={`text-xs font-mono ${isCurrent ? 'text-violet-300' : 'text-gray-600'}`}>
                {p.code.toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>

      <input ref={inputRef} className="opacity-0 absolute w-0 h-0" onKeyDown={handleKeyDown} readOnly autoFocus />
      <p className="text-gray-600 text-xs">
        {mode === 'practice' ? '随机顺序 · 依次按下4键 · 点击页面重新聚焦'
          : '复习薄弱词 · 依次按下4键'}
      </p>
    </div>
  )
}
