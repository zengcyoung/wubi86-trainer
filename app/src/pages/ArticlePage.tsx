import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ARTICLES } from '../data/articles'
import type { Article } from '../data/articles'
import { parseArticle } from '../data/codeUtils'
import type { ArticleChar } from '../data/codeUtils'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  startArticle, articleCorrect, articleMistake,
  finishArticle, resetArticleSession,
} from '../store/progressSlice'

// ── WPM 计算 ─────────────────────────────────────────────────────────────────
function calcWpm(charsTyped: number, startedAt: number | null, now: number): number {
  if (!startedAt || charsTyped === 0) return 0
  const minutes = (now - startedAt) / 60000
  return Math.round(charsTyped / minutes)
}

// ── 文章选择卡片 ──────────────────────────────────────────────────────────────
const DIFF_LABEL = { 1: '简单', 2: '中等', 3: '困难' }
const DIFF_COLOR = { 1: 'text-green-400', 2: 'text-yellow-400', 3: 'text-red-400' }

function ArticleSelector({ onSelect }: { onSelect: (a: Article) => void }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center px-4 py-10 gap-6">
      <h1 className="text-2xl font-bold tracking-widest text-amber-400">文章练习</h1>
      <p className="text-sm text-gray-500">选择一篇文章开始跟打练习</p>
      <div className="w-full max-w-lg flex flex-col gap-3">
        {ARTICLES.map(article => {
          // 预计算可打字数
          const chars = parseArticle(article.content).filter(c => !c.isPunctuation && c.code)
          return (
            <button
              key={article.id}
              onClick={() => onSelect(article)}
              className="text-left p-4 rounded-2xl border border-gray-800 bg-gray-900 hover:border-amber-400/40 hover:bg-amber-400/5 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                  {article.title}
                </span>
                <span className={`text-xs font-medium ${DIFF_COLOR[article.difficulty]}`}>
                  {DIFF_LABEL[article.difficulty]}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">{article.description}</div>
              <div className="text-xs text-gray-600">{chars.length} 个可打字符</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 结算弹窗（内嵌版，下一步会抽成独立页） ──────────────────────────────────
function ResultOverlay({
  charsTyped,
  correct,
  mistakes,
  startedAt,
  finishedAt,
  onRetry,
  onBack,
}: {
  charsTyped: number
  correct: number
  mistakes: number
  startedAt: number | null
  finishedAt: number | null
  onRetry: () => void
  onBack: () => void
}) {
  const duration = startedAt && finishedAt ? (finishedAt - startedAt) / 1000 : 0
  const wpm = startedAt && finishedAt
    ? Math.round(charsTyped / ((finishedAt - startedAt) / 60000))
    : 0
  const accuracy = correct + mistakes > 0
    ? Math.round(correct / (correct + mistakes) * 100)
    : 100
  const minutes = Math.floor(duration / 60)
  const seconds = Math.round(duration % 60)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur">
      <div className="w-80 rounded-2xl border border-amber-400/30 bg-gray-900 p-8 flex flex-col items-center gap-6">
        <div className="text-amber-400 text-4xl">🎉</div>
        <h2 className="text-xl font-bold text-white">练习完成！</h2>

        <div className="w-full grid grid-cols-2 gap-4">
          {[
            { label: '打字速度', value: `${wpm}`, unit: '字/分' },
            { label: '正确率', value: `${accuracy}`, unit: '%' },
            { label: '打字数', value: `${charsTyped}`, unit: '字' },
            { label: '用时', value: `${minutes}:${String(seconds).padStart(2, '0')}`, unit: '' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="flex flex-col items-center p-3 rounded-xl bg-gray-800">
              <div className="text-2xl font-bold text-white tabular-nums">
                {value}<span className="text-sm text-gray-500 ml-0.5">{unit}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={onRetry}
            className="flex-1 py-2 rounded-xl bg-amber-400 text-gray-900 font-semibold text-sm hover:bg-amber-300 transition-colors"
          >
            再打一遍
          </button>
          <button
            onClick={onBack}
            className="flex-1 py-2 rounded-xl bg-gray-800 text-gray-300 font-semibold text-sm hover:bg-gray-700 transition-colors"
          >
            换篇文章
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 主练习视图 ────────────────────────────────────────────────────────────────
function ArticlePractice({
  article,
  onBack,
}: {
  article: Article
  onBack: () => void
}) {
  const dispatch = useAppDispatch()
  const session = useAppSelector(s => s.progress.articleSession)

  // 解析文章字符
  const chars: ArticleChar[] = useMemo(() => parseArticle(article.content), [article.content])
  // 只有 CJK 且有编码的字才需要打
  const typableIndices = useMemo(
    () => chars.map((c, i) => (!c.isPunctuation && c.code ? i : -1)).filter(i => i >= 0),
    [chars]
  )

  // currentTypablePos: 当前要打第几个 typable 字
  const [currentTypablePos, setCurrentTypablePos] = useState(0)
  const [typed, setTyped] = useState('')
  const [inputState, setInputState] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [shake, setShake] = useState(false)
  const [paused, setPaused] = useState(false)
  const [now, setNow] = useState(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const currentCharRef = useRef<HTMLSpanElement>(null)

  const isFinished = currentTypablePos >= typableIndices.length

  // 初始化 session
  useEffect(() => {
    dispatch(startArticle({ articleId: article.id }))
    setCurrentTypablePos(0)
    setTyped('')
    setInputState('idle')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [article.id, dispatch])

  // 实时更新 now（用于 WPM 计算），每秒更新
  useEffect(() => {
    if (isFinished || paused) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isFinished, paused])

  // 自动滚动当前字入视野
  useEffect(() => {
    currentCharRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentTypablePos])

  const currentCharIndex = typableIndices[currentTypablePos] ?? -1
  const currentChar = currentCharIndex >= 0 ? chars[currentCharIndex] : null

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (paused || isFinished) return
      const key = e.key.toLowerCase()
      if (!/^[a-z]$/.test(key)) return
      e.preventDefault()

      if (!currentChar?.code) return
      const code = currentChar.code
      const newTyped = typed + key

      if (key !== code[newTyped.length - 1]) {
        // 打错
        setTyped(newTyped)
        setInputState('wrong')
        setShake(true)
        dispatch(articleMistake())
        setTimeout(() => {
          setInputState('idle')
          setShake(false)
          setTyped('')
        }, 350)
        return
      }

      setTyped(newTyped)

      if (newTyped.length === code.length) {
        // 打完这个字
        setInputState('correct')
        dispatch(articleCorrect())
        const next = currentTypablePos + 1
        setTimeout(() => {
          setInputState('idle')
          setTyped('')
          setCurrentTypablePos(next)
          if (next >= typableIndices.length) {
            dispatch(finishArticle())
          }
        }, 150)
      }
    },
    [paused, isFinished, currentChar, typed, currentTypablePos, typableIndices.length, dispatch]
  )

  const wpm = calcWpm(session.charsTyped, session.startedAt, now)
  const accuracy = session.correct + session.mistakes > 0
    ? Math.round(session.correct / (session.correct + session.mistakes) * 100)
    : 100

  const handleRetry = () => {
    dispatch(startArticle({ articleId: article.id }))
    setCurrentTypablePos(0)
    setTyped('')
    setInputState('idle')
    setPaused(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div
      className="min-h-screen bg-gray-950 text-gray-100 flex flex-col px-4 py-8 gap-4"
      onClick={() => !paused && inputRef.current?.focus()}
    >
      {/* 顶栏 */}
      <div className="flex items-center justify-between max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ← 返回
          </button>
          <h2 className="text-base font-bold text-amber-400">{article.title}</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            <span className="text-white font-bold tabular-nums">{wpm}</span>
            <span className="text-gray-600 ml-1">字/分</span>
          </span>
          <span className="text-gray-400">
            <span className={`font-bold tabular-nums ${accuracy >= 90 ? 'text-green-400' : accuracy >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
              {accuracy}%
            </span>
          </span>
          <span className="text-gray-600 text-xs tabular-nums">
            {currentTypablePos}/{typableIndices.length}
          </span>
          <button
            onClick={() => setPaused(p => !p)}
            className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
          >
            {paused ? '▶ 继续' : '⏸ 暂停'}
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full max-w-2xl mx-auto h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-300"
          style={{ width: `${(currentTypablePos / typableIndices.length) * 100}%` }}
        />
      </div>

      {/* 文章正文 */}
      <div
        className={`
          w-full max-w-2xl mx-auto flex-1 rounded-2xl border p-6 leading-loose
          text-xl font-medium tracking-wide overflow-y-auto
          transition-colors duration-150 max-h-[60vh]
          ${paused ? 'opacity-40 border-gray-800 bg-gray-900' : 'border-gray-800 bg-gray-900'}
        `}
      >
        {chars.map((c, i) => {
          const typableIdx = typableIndices.indexOf(i)
          const isCurrent = i === currentCharIndex
          const isPast = typableIdx >= 0 && typableIdx < currentTypablePos

          if (c.isPunctuation || !c.code) {
            return (
              <span key={i} className="text-gray-600">{c.char}</span>
            )
          }

          return (
            <span
              key={i}
              ref={isCurrent ? currentCharRef : undefined}
              className={`
                inline-block transition-all duration-100
                ${isCurrent
                  ? inputState === 'correct'
                    ? 'text-green-400 scale-110'
                    : inputState === 'wrong'
                      ? `text-red-400 ${shake ? '[animation:shake_0.3s_ease-in-out]' : ''}`
                      : 'text-amber-400 underline underline-offset-4'
                  : isPast
                    ? 'text-gray-600'
                    : 'text-gray-300'
                }
              `}
            >
              {c.char}
            </span>
          )
        })}
      </div>

      {/* 当前字编码提示 */}
      {!paused && currentChar && (
        <div className="flex flex-col items-center gap-1 py-2">
          <div className="text-3xl font-bold text-white">{currentChar.char}</div>
          <div className="flex gap-1 font-mono text-lg">
            {(currentChar.code ?? '').split('').map((ch, i) => (
              <span
                key={i}
                className={`
                  px-2 py-0.5 rounded transition-colors duration-100
                  ${i < typed.length
                    ? typed[i] === ch ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                    : i === typed.length
                      ? 'text-amber-300 bg-amber-400/10 animate-pulse'
                      : 'text-gray-600'
                  }
                `}
              >
                {ch.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {paused && (
        <div className="flex flex-col items-center gap-2 py-4 text-gray-500">
          <div className="text-4xl">⏸</div>
          <div className="text-sm">已暂停 · 点击「继续」恢复</div>
        </div>
      )}

      <input
        ref={inputRef}
        className="opacity-0 absolute w-0 h-0"
        onKeyDown={handleKeyDown}
        readOnly
        autoFocus
      />

      {/* 结算弹窗 */}
      {isFinished && (
        <ResultOverlay
          charsTyped={session.charsTyped}
          correct={session.correct}
          mistakes={session.mistakes}
          startedAt={session.startedAt}
          finishedAt={session.finishedAt}
          onRetry={handleRetry}
          onBack={onBack}
        />
      )}
    </div>
  )
}

// ── 导出：ArticlePage 含选文 + 练习两个子视图 ──────────────────────────────
export default function ArticlePage() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const dispatch = useAppDispatch()

  const handleBack = () => {
    dispatch(resetArticleSession())
    setSelectedArticle(null)
  }

  if (!selectedArticle) {
    return <ArticleSelector onSelect={setSelectedArticle} />
  }

  return <ArticlePractice article={selectedArticle} onBack={handleBack} />
}
