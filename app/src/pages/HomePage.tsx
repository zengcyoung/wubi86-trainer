import { useAppSelector } from '../store/hooks'
import type { LessonKey } from '../store/progressSlice'
import { LEVEL1 } from '../data/level1'
import { PHRASES_TIER1 } from '../data/phrases'

type StageConfig = {
  key: LessonKey
  label: string
  sublabel: string
  total: number
  color: string
  borderColor: string
  glowColor: string
  icon: string
  description: string
  tip: string
}

const STAGES: StageConfig[] = [
  {
    key: 'level1',
    label: '一级简码',
    sublabel: '25 个高频汉字',
    total: 25,
    color: 'text-amber-400',
    borderColor: 'border-amber-400/40',
    glowColor: 'bg-amber-400/5',
    icon: '一',
    description: 'GFDSA / HJKLM / TREWQ / YUIOP / NBVCX，每键一字，单击即出。',
    tip: '一指禅入门，25 个最高频汉字，每个键位只需记一个字。',
  },
  {
    key: 'level2',
    label: '二级简码',
    sublabel: '616 个常用汉字',
    total: 616,
    color: 'text-sky-400',
    borderColor: 'border-sky-400/40',
    glowColor: 'bg-sky-400/5',
    icon: '二',
    description: '两键出字，25 组 × 25 键，覆盖绝大多数常用汉字。',
    tip: '掌握后打字速度会有质的飞跃，建议每天练 1-2 组。',
  },
  {
    key: 'phrase',
    label: '词组练习',
    sublabel: `${PHRASES_TIER1.length} 个高频词组`,
    total: PHRASES_TIER1.length,
    color: 'text-violet-400',
    borderColor: 'border-violet-400/40',
    glowColor: 'bg-violet-400/5',
    icon: '词',
    description: '四码出词，二字词取每字前两码，高频词优先，打词比打字快 2 倍。',
    tip: '词组是速度的关键，推荐从高频 tier1 开始，打熟后再挑战扩展词库。',
  },
  {
    key: 'article',
    label: '文章练习',
    sublabel: '全文跟打，计速',
    total: 0, // 动态，取决于文章长度
    color: 'text-emerald-400',
    borderColor: 'border-emerald-400/40',
    glowColor: 'bg-emerald-400/5',
    icon: '文',
    description: '在真实语料中融合运用一/二级简码与词组，测试真实打字速度。',
    tip: '建议在词组练习正确率 > 85% 后开始文章练习。',
  },
]

// 圆形进度环
function ProgressRing({
  progress,
  size = 64,
  stroke = 5,
  color,
}: {
  progress: number  // 0~1
  size?: number
  stroke?: number
  color: string
}) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(progress, 1))
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#374151" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className={`transition-all duration-700 ${color}`}
      />
    </svg>
  )
}

function StageCard({
  stage,
  masteredCount,
  prevMastered,
  isActive,
  isComingSoon,
  onClick,
}: {
  stage: StageConfig
  masteredCount: number
  prevMastered: number
  isActive: boolean
  isComingSoon: boolean
  onClick: () => void
}) {
  const total = stage.total || 1
  const progress = stage.total > 0 ? masteredCount / total : 0
  const percent = Math.round(progress * 100)
  const prevRequired = 10  // 前一关至少掌握 10 个才建议进入

  return (
    <button
      onClick={onClick}
      className={`
        group w-full text-left rounded-2xl border p-5 transition-all duration-200
        hover:scale-[1.01] active:scale-[0.99]
        ${isActive
          ? `${stage.borderColor} ${stage.glowColor} shadow-lg`
          : isComingSoon
            ? 'border-theme bg-card/40 opacity-60'
            : 'border-theme bg-card/70 hover:border-subtle'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* 左：进度环 + 图标 */}
        <div className="relative shrink-0">
          <ProgressRing progress={progress} color={stage.color} />
          <div className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${stage.color}`}>
            {stage.icon}
          </div>
        </div>

        {/* 中：文字信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-base font-bold ${stage.color}`}>{stage.label}</span>
            {isActive && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 font-medium">
                进行中
              </span>
            )}
            {isComingSoon && prevMastered < prevRequired && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-chip-hover text-muted">
                建议先完成上一关
              </span>
            )}
          </div>
          <div className="text-xs text-muted mb-2">{stage.sublabel}</div>
          <p className="text-xs text-secondary leading-relaxed">{stage.description}</p>
        </div>

        {/* 右：进度数字 */}
        <div className="shrink-0 text-right">
          {stage.total > 0 ? (
            <>
              <div className={`text-2xl font-bold tabular-nums ${stage.color}`}>{percent}%</div>
              <div className="text-xs text-faint mt-0.5">
                {masteredCount} / {total}
              </div>
            </>
          ) : (
            <div className="text-xs text-faint mt-2">即将上线</div>
          )}
        </div>
      </div>

      {/* 底部提示（hover 展开） */}
      <div className="mt-3 pt-3 border-t border-theme text-xs text-muted leading-relaxed group-hover:text-secondary transition-colors">
        💡 {stage.tip}
      </div>
    </button>
  )
}

// 顶部总体数据统计
function StatBar({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
      {sub && <div className="text-xs text-faint">{sub}</div>}
    </div>
  )
}

export default function HomePage({ onNavigate }: { onNavigate: (page: 'level1' | 'level2' | 'phrase' | 'article') => void }) {
  const progress = useAppSelector(s => s.progress.lessons)

  const level1Mastered = Object.keys(progress.level1.mastered).length
  const level2Mastered = Object.keys(progress.level2.mastered).length
  const phraseMastered = Object.keys(progress.phrase.mastered).length

  const totalCorrect = progress.level1.correct + progress.level2.correct + progress.phrase.correct + progress.article.correct
  const totalMistakes = progress.level1.mistakes + progress.level2.mistakes + progress.phrase.mistakes + progress.article.mistakes
  const totalAccuracy = totalCorrect + totalMistakes > 0
    ? Math.round(totalCorrect / (totalCorrect + totalMistakes) * 100)
    : 100
  const totalMastered = level1Mastered + level2Mastered + phraseMastered

  const masteredCounts: Record<LessonKey, number> = {
    level1: level1Mastered,
    level2: level2Mastered,
    phrase: phraseMastered,
    article: 0,
  }

  // 判断当前推荐练习哪一关
  const activeStage: LessonKey =
    level1Mastered < LEVEL1.length ? 'level1'
      : level2Mastered < 100 ? 'level2'
        : phraseMastered < 50 ? 'phrase'
          : 'article'

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col items-center px-4 py-10 gap-8">
      {/* Logo / 标题 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-widest text-amber-400 mb-1">五笔练习</h1>
        <p className="text-sm text-muted">86 版五笔 · 从入门到飞速</p>
      </div>

      {/* 总体统计 */}
      <div className="w-full max-w-lg flex justify-around py-4 px-6 rounded-2xl bg-card border border-theme">
        <StatBar label="累计掌握" value={totalMastered} sub="字/词" />
        <div className="w-px bg-chip" />
        <StatBar label="综合正确率" value={`${totalAccuracy}%`} />
        <div className="w-px bg-chip" />
        <StatBar label="总练习次数" value={totalCorrect + totalMistakes} />
      </div>

      {/* 学习路径 */}
      <div className="w-full max-w-lg flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-muted tracking-widest uppercase px-1">学习路径</h2>
        {STAGES.map((stage, i) => {
          const prevStage = i > 0 ? STAGES[i - 1] : null
          const prevMastered = prevStage ? masteredCounts[prevStage.key] : 999
          return (
            <StageCard
              key={stage.key}
              stage={stage}
              masteredCount={masteredCounts[stage.key]}
              prevMastered={prevMastered}
              isActive={activeStage === stage.key}
              isComingSoon={i > 0 && masteredCounts[STAGES[i - 1].key] === 0}
              onClick={() => onNavigate(stage.key)}
            />
          )
        })}
      </div>

      {/* 底部一句话 */}
      <p className="text-gray-700 text-xs mt-2">进度自动保存于本地 · 清除浏览器数据会重置</p>
    </div>
  )
}
