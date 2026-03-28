import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type LessonKey = 'level1' | 'level2' | 'article'

interface LessonProgress {
  /** 当前练习索引 */
  currentIndex: number
  /** 本轮正确次数 */
  correct: number
  /** 本轮错误次数 */
  mistakes: number
  /** 已完整过一遍的字（key = char，value = 累计正确数） */
  mastered: Record<string, number>
}

interface ProgressState {
  lessons: Record<LessonKey, LessonProgress>
}

const defaultLesson = (): LessonProgress => ({
  currentIndex: 0,
  correct: 0,
  mistakes: 0,
  mastered: {},
})

const initialState: ProgressState = {
  lessons: {
    level1: defaultLesson(),
    level2: defaultLesson(),
    article: defaultLesson(),
  },
}

export const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    advance(state, action: PayloadAction<{ lesson: LessonKey; char: string }>) {
      const { lesson, char } = action.payload
      const l = state.lessons[lesson]
      l.correct += 1
      l.mastered[char] = (l.mastered[char] ?? 0) + 1
      l.currentIndex += 1
    },
    recordMistake(state, action: PayloadAction<{ lesson: LessonKey }>) {
      state.lessons[action.payload.lesson].mistakes += 1
    },
    resetLesson(state, action: PayloadAction<{ lesson: LessonKey }>) {
      state.lessons[action.payload.lesson] = defaultLesson()
    },
    jumpTo(state, action: PayloadAction<{ lesson: LessonKey; index: number }>) {
      state.lessons[action.payload.lesson].currentIndex = action.payload.index
    },
  },
})

export const { advance, recordMistake, resetLesson, jumpTo } = progressSlice.actions
export default progressSlice.reducer
