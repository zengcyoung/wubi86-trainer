import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store'
import HomePage from './pages/HomePage'
import Level1Page from './pages/Level1Page'
import Level2Page from './pages/Level2Page'
import PhrasePage from './pages/PhrasePage'
import ArticlePage from './pages/ArticlePage'
import './index.css'

export type Page = 'home' | 'level1' | 'level2' | 'phrase' | 'article'

const NAV_ITEMS: { key: Exclude<Page, 'home'>; label: string }[] = [
  { key: 'level1', label: '一级简码' },
  { key: 'level2', label: '二级简码' },
  { key: 'phrase', label: '词组练习' },
  { key: 'article', label: '文章练习' },
]

function App() {
  const [page, setPage] = useState<Page>('home')

  return (
    <div>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-1 px-3 py-2 bg-gray-900/90 backdrop-blur border-b border-gray-800">
        <button
          onClick={() => setPage('home')}
          className={`px-2.5 py-1 rounded text-sm font-bold transition-colors ${
            page === 'home' ? 'text-amber-400' : 'text-gray-600 hover:text-gray-300'
          }`}
          title="首页"
        >
          五笔
        </button>
        <span className="text-gray-700 text-xs">/</span>
        {NAV_ITEMS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              page === key
                ? 'bg-amber-400 text-gray-900'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="pt-10">
        {page === 'home'    && <HomePage onNavigate={setPage} />}
        {page === 'level1'  && <Level1Page onHome={() => setPage('home')} />}
        {page === 'level2'  && <Level2Page />}
        {page === 'phrase'  && <PhrasePage onHome={() => setPage('home')} />}
        {page === 'article' && <ArticlePage />}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>
)
