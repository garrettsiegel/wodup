import { Button } from '../components/ui/Button'
import type { GeneratedWod } from '../lib/wod/types'

type SavedProps = {
  saved: GeneratedWod[]
  onView: (wod: GeneratedWod) => void
  onDelete: (id: string) => void
  onNavigate: (page: 'generate') => void
}

const FORMAT_COLORS: Record<string, string> = {
  'AMRAP':            'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'For Time':         'bg-green-500/10 text-green-400 border-green-500/20',
  'EMOM':             'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Intervals':        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Strength + Metcon':'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

export const Saved = ({ saved, onView, onDelete, onNavigate }: SavedProps) => (
  <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Saved WODs</h1>
          {saved.length > 0 && (
            <p className="text-gray-600 text-sm mt-0.5">{saved.length} workout{saved.length !== 1 ? 's' : ''} saved</p>
          )}
        </div>
        <Button onClick={() => onNavigate('generate')} size="sm">+ New WOD</Button>
      </div>

      {saved.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-6">
            <span className="text-2xl font-black text-gray-700">0</span>
          </div>
          <p className="text-gray-400 font-semibold mb-1">No saved workouts yet</p>
          <p className="text-gray-600 text-sm">Generate a WOD and tap Save to keep it here.</p>
          <div className="mt-6">
            <Button onClick={() => onNavigate('generate')}>Generate your first WOD</Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {saved.map((wod) => (
            <li
              key={wod.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors duration-150"
            >
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${FORMAT_COLORS[wod.format] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                      {wod.format}
                    </span>
                    <span className="text-gray-600 text-xs">{wod.durationMinutes} min</span>
                  </div>
                  <h2 className="font-bold text-white text-sm leading-snug truncate">{wod.title}</h2>
                  <ul className="mt-2 space-y-0.5">
                    {wod.movements.slice(0, 3).map((m, i) => (
                      <li key={i} className="text-gray-500 text-xs">
                        {[m.reps, m.calories, m.duration, m.distance].find((v) => v != null)} {m.name}
                      </li>
                    ))}
                    {wod.movements.length > 3 && (
                      <li className="text-gray-700 text-xs">+{wod.movements.length - 3} more</li>
                    )}
                  </ul>
                </div>
                <div className="flex flex-col gap-2 shrink-0 items-end">
                  <Button onClick={() => onView(wod)} variant="secondary" size="sm">View</Button>
                  <button
                    type="button"
                    onClick={() => onDelete(wod.id)}
                    className="text-xs text-gray-700 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
)
