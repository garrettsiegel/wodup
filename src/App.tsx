import { useState, useEffect } from 'react'
import { Home } from './pages/Home'
import { Generate } from './pages/Generate'
import { WodResult } from './pages/WodResult'
import { Saved } from './pages/Saved'
import { ErrorBoundary } from './components/ErrorBoundary'
import type { GeneratedWod } from './lib/wod/types'

type Page = 'home' | 'generate' | 'result' | 'saved'

const SAVED_KEY = 'wodup:saved'

function loadSaved(): GeneratedWod[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
  } catch {
    return []
  }
}

function persistSaved(wods: GeneratedWod[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(wods))
}

const NAV_LINKS = [
  { page: 'generate', label: 'Generate' },
  { page: 'saved', label: 'Saved' },
] as const

const Nav = ({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) => (
  <nav className="fixed top-0 left-0 right-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/80">
    <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="font-black text-lg tracking-tight leading-none"
      >
        <span className="text-white">WOD</span>
        <span className="text-orange-500">up</span>
      </button>
      <div className="flex items-center gap-1">
        {NAV_LINKS.map(({ page: p, label }) => (
          <button
            key={p}
            type="button"
            onClick={() => onNavigate(p)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              page === p
                ? 'bg-gray-800 text-white'
                : 'text-gray-500 hover:text-gray-200 hover:bg-gray-900',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  </nav>
)

export const App = () => {
  const [page, setPage] = useState<Page>('home')
  const [currentWod, setCurrentWod] = useState<GeneratedWod | null>(null)
  const [saved, setSaved] = useState<GeneratedWod[]>(loadSaved)

  useEffect(() => { persistSaved(saved) }, [saved])

  const handleResult = (wod: GeneratedWod) => {
    setCurrentWod(wod)
    setPage('result')
  }

  const handleSave = (wod: GeneratedWod) => {
    setSaved((prev) => {
      if (prev.find((w) => w.id === wod.id)) return prev
      return [wod, ...prev]
    })
  }

  const handleDelete = (id: string) => {
    setSaved((prev) => prev.filter((w) => w.id !== id))
  }

  const handleViewSaved = (wod: GeneratedWod) => {
    setCurrentWod(wod)
    setPage('result')
  }

  return (
    <ErrorBoundary>
      <div className="pt-16">
        <Nav page={page} onNavigate={setPage} />
        {page === 'home' && <Home onNavigate={(p) => setPage(p)} />}
        {page === 'generate' && <Generate onResult={handleResult} />}
        {page === 'result' && currentWod && (
          <WodResult
            wod={currentWod}
            onRegenerate={() => setPage('generate')}
            onSave={handleSave}
          />
        )}
        {page === 'saved' && (
          <Saved
            saved={saved}
            onView={handleViewSaved}
            onDelete={handleDelete}
            onNavigate={(p) => setPage(p)}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}

export default App
