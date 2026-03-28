import { useState, useRef, useEffect, useCallback } from 'react'
import { LEVEL2_GROUPS } from '../data/level2Groups'
import type { Level2Group } from '../data/level2Groups'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { advance, recordMistake, resetLesson } from '../store/progressSlice'

// 把所有组的所有 entry 展开成一个练习序列，按组顺序
const PRACTICE_SEQUENCE = LEVEL2_GROUPS.flatMap(g =>
  g.rows.flatMap(r => r.entries)
)

// 每组的起始 index，方便跳转
const GROUP_START: Record<string, number> = (() => {
  const map: Record<string, number> = {}
  let idx = 0
  for (const g of LEVEL2_GROUPS) {
    map[g.firstKey] = idx
    for (const r of g.rows) idx += r.entries.length
  }
  return map
})()

type InputState = 'idle' | 'correct' | 'wrong'

// 键盘行顺序（用于 rowKeys 排序展示）
const KB_ROW_ORDER = ['gfdsa', 'hjklm', 'trewq', 'yuiop', 'nbvcx']

export default function Level2Page() {
  const dispatch = useAppDispatch()
  const { currentIndex, correct, mistakes } = useAppSelector(
    s => s.progress.lessons.level2
  )

  const safeIndex = currentIndex % PRACTICE_SEQUENCE.length
  const current = PRACTICE_SEQUENCE[safeIndex]

  // 当前第一键是哪个分组
  const currentGroup: Level2Group = LEVEL2_GROUPS.find(
    g => g.firstKey === current.code[0]
  )!

  const [inputBuffer, setInputBuffer] = useState('')
  const [inputState, setInputState] = useState<InputState>('idle')
  const [shake, setShake] = useState(false)
  // 选中的分组（用于侧边栏高亮），初始跟着 currentIndex
  const [selectedGroup, setSelectedGroup] = useState(currentGroup.firstKey)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [safeIndex])

  // 当 currentGroup 变化时同步侧边栏
  useEffect(() => {
    setSelectedGroup(currentGroup.firstKey)
  }, [currentGroup.firstKey])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const key = e.key.toLowerCase()
      if (!/^[a-z]$/.test(key)) return

      const newBuffer = inputBuffer + key
      setInputBuffer(newBuffer)

      if (newBuffer.length === 1) {
        // 第一键：检查是否和当前字第一键一致
        if (key !== current.code[0]) {
          setInputState('wrong')
          setShake(true)
          dispatch(recordMistake({ lesson: 'level2' }))
          setTimeout(() => {
            setInputState('idle')
            setShake(false)
            setInputBuffer('')
          }, 400)
        }
        // 第一键正确，等第二键
      } else if (newBuffer.length === 2) {
        if (newBuffer === current.code) {
          // 全对
          setInputState('correct')
          dispatch(advance({ lesson: 'level2', char: current.char }))
          setTimeout(() => {
            setInputState('idle')
            setInputBuffer('')
          }, 200)
        } else {
          setInputState('wrong')
          setShake(true)
          dispatch(recordMistake({ lesson: 'level2' }))
          setTimeout(() => {
            setInputState('idle')
            setShake(false)
            setInputBuffer('')
          }, 400)
        }
      }
    },
    [inputBuffer, current, dispatch]
  )

  const accuracy =
    correct + mistakes > 0
      ? Math.round((correct / (correct + mistakes)) * 100)
      : 100

  const round = Math.floor(currentIndex / PRACTICE_SEQUENCE.length) + 1

  // 跳到某个分组
  const jumpToGroup = (firstKey: string) => {
    setSelectedGroup(firstKey)
    // 用 jumpTo action 跳到该组起始 index
    dispatch({ type: 'progress/jumpTo', payload: { lesson: 'level2', index: GROUP_START[firstKey] } })
    setInputBuffer('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // 当前显示的分组（侧边栏选中的，不一定是正在打的）
  const displayGroup = LEVEL2_GROUPS.find(g => g.firstKey === selectedGroup)!

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center px-4 py-8 gap-6 select-none">
      {/* 标题 + 统计 */}
      <div className="w-full max-w-3xl flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-widest text-amber-400">二级简码练习</h1>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>第 <span className="text-white font-semibold">{round}</span> 轮</span>
          <span>{safeIndex + 1} / {PRACTICE_SEQUENCE.length}</span>
          <span>正确率 <span className={`font-semibold ${accuracy >= 90 ? 'text-green-400' : accuracy >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{accuracy}%</span></span>
          <button
            onClick={() => { dispatch(resetLesson({ lesson: 'level2' })); setInputBuffer('') }}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >重置</button>
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
                ${g.firstKey === currentGroup.firstKey
                  ? 'bg-amber-400 text-gray-900'
                  : g.firstKey === selectedGroup
                    ? 'bg-gray-700 text-amber-300 ring-1 ring-amber-400'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              {g.firstKey.toUpperCase()}
            </button>
          ))}
        </div>

        {/* 右侧：主内容区 */}
        <div className="flex-1 flex flex-col gap-4">
          {/* 当前大字展示 */}
          <div
            className={`
              flex flex-col items-center justify-center py-6
              rounded-xl border transition-all duration-150
              ${inputState === 'correct'
                ? 'border-green-400 bg-green-400/5'
                : inputState === 'wrong'
                  ? 'border-red-400 bg-red-400/5'
                  : 'border-gray-800 bg-gray-900'
              }
              ${shake ? '[animation:shake_0.35s_ease-in-out]' : ''}
            `}
          >
            <div className={`text-7xl font-bold transition-colors duration-150 ${
              inputState === 'correct' ? 'text-green-400'
                : inputState === 'wrong' ? 'text-red-400'
                : 'text-white'
            }`}>
              {current.char}
            </div>
            {/* 编码提示：第一键 + 第二键分色 */}
            <div className="mt-2 flex gap-1 text-2xl font-mono tracking-widest">
              <span className={`
                px-2 py-0.5 rounded
                ${inputBuffer.length >= 1
                  ? inputBuffer[0] === current.code[0]
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-red-400 bg-red-400/10'
                  : 'text-amber-300'
                }
              `}>
                {current.code[0].toUpperCase()}
              </span>
              <span className={`
                px-2 py-0.5 rounded
                ${inputBuffer.length >= 2
                  ? inputBuffer[1] === current.code[1]
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-red-400 bg-red-400/10'
                  : inputBuffer.length === 1
                    ? 'text-amber-200 animate-pulse'
                    : 'text-gray-500'
                }
              `}>
                {current.code[1].toUpperCase()}
              </span>
            </div>
          </div>

          {/* 当前分组码表 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs text-gray-500 mb-3 font-mono">
              {displayGroup.firstKey.toUpperCase()} 组 — {displayGroup.rows.reduce((s, r) => s + r.entries.length, 0)} 个字
            </div>
            <div className="flex flex-col gap-3">
              {KB_ROW_ORDER
                .filter(rk => displayGroup.rows.some(r => r.rowKeys === rk))
                .map(rk => {
                  const row = displayGroup.rows.find(r => r.rowKeys === rk)!
                  return (
                    <div key={rk} className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-gray-600 font-mono w-14 shrink-0">
                        {rk.toUpperCase()}
                      </span>
                      {row.entries.map(entry => {
                        const isActive = entry.code === current.code
                        return (
                          <div
                            key={entry.code}
                            className={`
                              flex flex-col items-center px-2 py-1 rounded min-w-[2.5rem]
                              transition-all duration-100
                              ${isActive
                                ? inputState === 'correct'
                                  ? 'bg-green-400/20 ring-1 ring-green-400 scale-110'
                                  : inputState === 'wrong'
                                    ? 'bg-red-400/20 ring-1 ring-red-400'
                                    : 'bg-amber-400/15 ring-1 ring-amber-400 scale-105'
                                : 'bg-gray-800 hover:bg-gray-700'
                              }
                            `}
                          >
                            <span className="text-base font-bold leading-tight">{entry.char}</span>
                            <span className={`text-xs font-mono ${isActive ? 'text-amber-300' : 'text-gray-500'}`}>
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

      {/* 隐藏 input */}
      <input
        ref={inputRef}
        className="opacity-0 absolute w-0 h-0"
        onKeyDown={handleKeyDown}
        readOnly
        autoFocus
      />
      <p className="text-gray-600 text-xs">依次按下两个键位继续 · 点击左侧字母切换分组</p>
    </div>
  )
}
