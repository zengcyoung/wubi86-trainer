import { useEffect, useRef, useState } from 'react'
import { LEVEL1 } from '../data/level1'
import { LEVEL1_ROWS } from '../data/keyboard'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { advance, recordMistake, resetLesson } from '../store/progressSlice'

// 按 LEVEL1_ROWS 顺序排列练习序列
const PRACTICE_SEQUENCE = LEVEL1_ROWS.flatMap(row =>
  row.keys.map(key => {
    const entry = LEVEL1.find(e => e.key === key)!
    return { key, char: entry.char }
  })
)

type InputState = 'idle' | 'correct' | 'wrong'

export default function Level1Page() {
  const dispatch = useAppDispatch()
  const { currentIndex, correct, mistakes } = useAppSelector(
    s => s.progress.lessons.level1
  )

  // 循环：到末尾后从头来
  const safeIndex = currentIndex % PRACTICE_SEQUENCE.length
  const current = PRACTICE_SEQUENCE[safeIndex]
  const [inputState, setInputState] = useState<InputState>('idle')
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 每次切换字时聚焦
  useEffect(() => {
    inputRef.current?.focus()
  }, [safeIndex])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key.toLowerCase()
    if (key !== current.key) {
      // 错误
      setInputState('wrong')
      setShake(true)
      dispatch(recordMistake({ lesson: 'level1' }))
      setTimeout(() => {
        setInputState('idle')
        setShake(false)
      }, 500)
      return
    }
    // 正确
    setInputState('correct')
    dispatch(advance({ lesson: 'level1', char: current.char }))
    setTimeout(() => setInputState('idle'), 200)
  }

  // 计算当前轮次（每轮 25 个字）
  const round = Math.floor(currentIndex / PRACTICE_SEQUENCE.length) + 1
  const accuracy =
    correct + mistakes > 0
      ? Math.round((correct / (correct + mistakes)) * 100)
      : 100

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center px-4 py-10 gap-8 select-none">
      {/* 标题 */}
      <h1 className="text-2xl font-bold tracking-widest text-amber-400">
        一级简码练习
      </h1>

      {/* 统计栏 */}
      <div className="flex gap-6 text-sm text-gray-400">
        <span>第 <span className="text-white font-semibold">{round}</span> 轮</span>
        <span>进度 <span className="text-white font-semibold">{safeIndex + 1}</span>/25</span>
        <span>正确率 <span className={`font-semibold ${accuracy >= 90 ? 'text-green-400' : accuracy >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{accuracy}%</span></span>
        <button
          onClick={() => dispatch(resetLesson({ lesson: 'level1' }))}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          重置
        </button>
      </div>

      {/* 键盘行总览 */}
      <div className="w-full max-w-xl flex flex-col gap-3">
        {LEVEL1_ROWS.map(row => (
          <div key={row.label} className="flex justify-center gap-2">
            {row.keys.map(key => {
              const entry = LEVEL1.find(e => e.key === key)!
              const isActive = key === current.key
              return (
                <div
                  key={key}
                  className={`
                    flex flex-col items-center justify-center
                    w-16 h-16 rounded-lg border text-center transition-all duration-150
                    ${isActive
                      ? inputState === 'correct'
                        ? 'border-green-400 bg-green-400/10 scale-110'
                        : inputState === 'wrong'
                          ? 'border-red-400 bg-red-400/10'
                          : 'border-amber-400 bg-amber-400/10 scale-105'
                      : 'border-gray-700 bg-gray-900'
                    }
                  `}
                >
                  <span className="text-xl font-bold leading-none">{entry.char}</span>
                  <span className={`text-xs mt-1 font-mono ${isActive ? 'text-amber-300' : 'text-gray-500'}`}>
                    {key.toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* 当前要打的字 */}
      <div
        className={`
          mt-4 flex flex-col items-center gap-2
          transition-all duration-100
          ${shake ? 'animate-[shake_0.3s_ease-in-out]' : ''}
        `}
      >
        <div
          className={`
            text-8xl font-bold transition-colors duration-150
            ${inputState === 'correct' ? 'text-green-400' : inputState === 'wrong' ? 'text-red-400' : 'text-white'}
          `}
        >
          {current.char}
        </div>
        <div className="text-2xl font-mono text-amber-300 tracking-widest">
          {current.key.toUpperCase()}
        </div>
      </div>

      {/* 隐藏 input，捕获键盘输入 */}
      <input
        ref={inputRef}
        className="opacity-0 absolute w-0 h-0"
        onKeyDown={handleKeyDown}
        readOnly
        autoFocus
      />

      <p className="text-gray-600 text-sm">按下对应键位继续</p>
    </div>
  )
}
