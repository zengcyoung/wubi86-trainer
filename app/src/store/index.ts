import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'
import progressReducer from './progressSlice'

// 手动构造 localStorage adapter，避免 redux-persist/lib/storage
// 在某些 Vite 打包环境下解析为空对象的问题
const localStorageAdapter = {
  getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value)
    return Promise.resolve()
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key)
    return Promise.resolve()
  },
}

const persistConfig = {
  key: 'wubi86',
  storage: localStorageAdapter,
  whitelist: ['progress'],
}

const rootReducer = combineReducers({
  progress: progressReducer,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
