// 通用结算页组件
// 用于：文章练习结束 / 一轮简码或词组完成

export interface MistakeEntry {
  text: string    // 打错的字或词
  code: string    // 正确编码
  wrongCount: number
}

export interface RoundResult {
  mode: 'level1' | 'level2' | 'phrase' | 'article'
  correct: number
  mistakes: number
  /** 仅文章练习有 */
  wpm?: number
  durationSeconds?: number
  /** 本轮打错的字/词，按错误次数降序 */
  mistakeList?: MistakeEntry[]
}

const MODE_LABEL: Record<RoundResult['mode'], string> = {
  level1: '一级简码',
  level2: '二级简码',
  phrase: '词组练习',
  article: '文章练习',
}

const RATING = (accuracy: number, wpm?: number) => {
  if (wpm !== undefined) {
    if (wpm >= 60 && accuracy >= 95) return { text: '五笔高手', emoji: '🏆' }
    if (wpm >= 40 && accuracy >= 90) return { text: '打得不错', emoji: '🎯' }
    if (wpm >= 20) return { text: '稳步提升', emoji: '💪' }
    return { text: '继续加油', emoji: '🌱' }
  }
  if (accuracy >= 98) return { text: '完美！', emoji: '✨' }
  if (accuracy >= 90) return { text: '很不错！', emoji: '🎯' }
  if (accuracy >= 75) return { text: '继续练习', emoji: '💪' }
  return { text: '多练多熟', emoji: '📝' }
}

interface ResultPageProps {
  result: RoundResult
  onRetry: () => void
  onNext?: () => void
  onHome: () => void
}

export default function ResultPage({ result, onRetry, onNext, onHome }: ResultPageProps) {
  const accuracy = result.correct + result.mistakes > 0
    ? Math.round(result.correct / (result.correct + result.mistakes) * 100)
    : 100
  const rating = RATING(accuracy, result.wpm)

  const minutes = result.durationSeconds ? Math.floor(result.durationSeconds / 60) : 0
  const seconds = result.durationSeconds ? Math.round(result.durationSeconds % 60) : 0

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col items-center justify-center px-4 py-10 gap-8">
      {/* Emoji + 评价 */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-6xl">{rating.emoji}</div>
        <h2 className="text-2xl font-bold text-white">{rating.text}</h2>
        <div className="text-sm text-muted">{MODE_LABEL[result.mode]} · 本轮结算</div>
      </div>

      {/* 核心数据 */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3">
        <StatCard label="正确率" value={`${accuracy}%`}
          color={accuracy >= 90 ? 'text-green-400' : accuracy >= 75 ? 'text-yellow-400' : 'text-red-400'} />
        <StatCard label="正确次数" value={String(result.correct)} color="text-white" />
        <StatCard label="错误次数" value={String(result.mistakes)}
          color={result.mistakes === 0 ? 'text-green-400' : result.mistakes < 5 ? 'text-yellow-400' : 'text-red-400'} />
        {result.wpm !== undefined
          ? <StatCard label="打字速度" value={`${result.wpm}`} unit="字/分" color="text-amber-400" />
          : <StatCard label="—" value="—" color="text-faint" />
        }
        {result.durationSeconds !== undefined && (
          <StatCard
            label="用时"
            value={`${minutes}:${String(seconds).padStart(2, '0')}`}
            color="text-white"
          />
        )}
      </div>

      {/* 错误回顾 */}
      {result.mistakeList && result.mistakeList.length > 0 && (
        <div className="w-full max-w-sm">
          <h3 className="text-xs font-semibold text-muted tracking-widest uppercase mb-3">
            重点回顾（打错 {result.mistakeList.length} 个）
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.mistakeList.slice(0, 20).map(m => (
              <div
                key={m.text}
                className="flex flex-col items-center px-3 py-2 rounded-xl bg-card border border-red-400/20"
              >
                <span className="text-lg font-bold text-white">{m.text}</span>
                <span className="text-xs font-mono text-amber-300 mt-0.5">{m.code.toUpperCase()}</span>
                {m.wrongCount > 1 && (
                  <span className="text-xs text-red-400 mt-0.5">×{m.wrongCount}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 按钮组 */}
      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={onRetry}
          className="flex-1 py-2.5 rounded-xl bg-amber-400 text-gray-900 font-semibold text-sm hover:bg-amber-300 transition-colors"
        >
          再来一轮
        </button>
        {onNext && (
          <button
            onClick={onNext}
            className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 transition-colors"
          >
            下一关 →
          </button>
        )}
        <button
          onClick={onHome}
          className="flex-1 py-2.5 rounded-xl bg-chip text-secondary font-semibold text-sm hover:bg-chip-hover transition-colors"
        >
          首页
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <div className="flex flex-col items-center p-4 rounded-2xl bg-card border border-theme">
      <div className={`text-3xl font-bold tabular-nums ${color}`}>
        {value}
        {unit && <span className="text-base text-muted ml-1">{unit}</span>}
      </div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  )
}
