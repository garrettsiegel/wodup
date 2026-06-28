import { Button } from '../components/ui/Button'

type HomeProps = {
  onNavigate: (page: 'generate') => void
}

const FEATURES = [
  {
    num: '01',
    title: 'Equipment-based',
    body: 'Only uses what you have — dumbbells, barbell, bodyweight, or any combination.',
  },
  {
    num: '02',
    title: 'Time-aware',
    body: 'Short on time? Get an 8-minute AMRAP. Have an hour? Full strength + metcon.',
  },
  {
    num: '03',
    title: 'Skill-scaled',
    body: 'Beginner, intermediate, or advanced — appropriate movements every time.',
  },
  {
    num: '04',
    title: 'Always safe',
    body: 'Scaling options and safety notes included with every generated WOD.',
  },
]

export const Home = ({ onNavigate }: HomeProps) => (
  <div className="min-h-screen bg-gray-950 text-white flex flex-col">
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-px w-8 bg-orange-500/50" />
        <p className="text-orange-500 text-xs font-bold uppercase tracking-[0.2em]">CrossFit WOD Generator</p>
        <span className="h-px w-8 bg-orange-500/50" />
      </div>

      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] max-w-3xl">
        Your gym.
        <br />
        <span className="text-orange-500">Your rules.</span>
        <br />
        Your WOD.
      </h1>

      <p className="mt-8 text-gray-400 text-base sm:text-lg max-w-md leading-relaxed">
        Generate CrossFit-style workouts in seconds. Pick your equipment, time, and goals — get a complete WOD with scaling and substitutions.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <Button onClick={() => onNavigate('generate')} size="lg">
          Generate a WOD
        </Button>
      </div>
    </main>

    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-800">
      {FEATURES.map((f, i) => (
        <div
          key={f.num}
          className={[
            'px-7 py-8 group hover:bg-gray-900/60 transition-colors duration-200',
            i < 3 ? 'lg:border-r border-gray-800' : '',
            i === 0 ? 'sm:border-r border-gray-800' : '',
            i === 1 ? 'sm:border-r-0 lg:border-r border-gray-800' : '',
            i < 2 ? 'sm:border-b-0 border-b border-gray-800' : '',
          ].join(' ')}
        >
          <p className="text-orange-500/50 font-black text-xs tracking-[0.15em] mb-4">{f.num}</p>
          <h3 className="font-bold text-white text-base mb-2 group-hover:text-orange-400 transition-colors duration-200">
            {f.title}
          </h3>
          <p className="text-gray-500 text-sm leading-relaxed">{f.body}</p>
        </div>
      ))}
    </section>
  </div>
)
