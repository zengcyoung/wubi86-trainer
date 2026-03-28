import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store'
import Level1Page from './pages/Level1Page'
import Level2Page from './pages/Level2Page'
import './index.css'

type Page = 'level1' | 'level2'

function App() {
  const [page, setPage] = useState<Page>('level1')

  return (
    <div>
      {/* 临时导航，下一步换成 react-router */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex gap-2 px-4 py-2 bg-gray-900/90 backdrop-blur border-b border-gray-800">
        <button
          onClick={() => setPage('level1')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${page === 'level1' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-white'}`}
        >
          一级简码
        </button>
        <button
          onClick={() => setPage('level2')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${page === 'level2' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-white'}`}
        >
          二级简码
        </button>
      </nav>
      <div className="pt-10">
        {page === 'level1' && <Level1Page />}
        {page === 'level2' && <Level2Page />}
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
