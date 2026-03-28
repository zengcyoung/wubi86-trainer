import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type LessonKey = 'level1' | 'level2' | 'phrase' | 'article'

interface LessonProgress {
  currentIndex: number
  correct: number
  mistakes: number
  mastered: Record<string, number>
  /** 当前轮洗牌 seed，reset 时重新生成 */
  roundSeed: number
}

interface ArticleSession {
  articleId: string | null
  /** 开始时间戳（ms），null = 未开始 */
  startedAt: number | null
  /** 完成时间戳（ms），null = 未完成 */
  finishedAt: number | null
  /** 打了多少字（跳过标点） */
  charsTyped: number
  correct: number
  mistakes: number
}

interface ProgressState {
  lessons: Record<LessonKey, LessonProgress>
  articleSession: ArticleSession
}

const defaultLesson = (): LessonProgress => ({
  currentIndex: 0,
  correct: 0,
  mistakes: 0,
  mastered: {},
  roundSeed: Math.floor(Math.random() * 2 ** 31),
})

const defaultSession = (): ArticleSession => ({
  articleId: null,
  startedAt: null,
  finishedAt: null,
  charsTyped: 0,
  correct: 0,
  mistakes: 0,
})

const initialState: ProgressState = {
  lessons: {
    level1: defaultLesson(),
    level2: defaultLesson(),
    phrase: defaultLesson(),
    article: defaultLesson(),
  },
  articleSession: defaultSession(),
}

export const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    advance(state, action: PayloadAction<{ lesson: LessonKey; char: string; newRound?: boolean }>) {
      const { lesson, char, newRound } = action.payload
      const l = state.lessons[lesson]
      l.correct += 1
      l.mastered[char] = (l.mastered[char] ?? 0) + 1
      l.currentIndex += 1
      if (newRound) {
        l.roundSeed = Math.floor(Math.random() * 2 ** 31)
      }
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
    // ── 文章练习专用 ──
    startArticle(state, action: PayloadAction<{ articleId: string }>) {
      state.articleSession = {
        ...defaultSession(),
        articleId: action.payload.articleId,
        startedAt: Date.now(),
      }
    },
    articleCorrect(state) {
      const s = state.articleSession
      s.charsTyped += 1
      s.correct += 1
    },
    articleMistake(state) {
      state.articleSession.mistakes += 1
    },
    finishArticle(state) {
      state.articleSession.finishedAt = Date.now()
    },
    resetArticleSession(state) {
      state.articleSession = defaultSession()
    },
  },
})

export const {
  advance, recordMistake, resetLesson, jumpTo,
  startArticle, articleCorrect, articleMistake, finishArticle, resetArticleSession,
} = progressSlice.actions
export default progressSlice.reducer
