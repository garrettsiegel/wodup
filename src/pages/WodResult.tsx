import { useState } from 'react'
import { Button } from '../components/ui/Button'
import type { GeneratedWod, Modality, PrescribedMovement } from '../lib/wod/types'
import { swapMovement } from '../lib/wod/generator'

type WodResultProps = {
  wod: GeneratedWod
  onRegenerate: () => void
  onSave: (wod: GeneratedWod) => void
}

const SCORE_CONFIG: Record<GeneratedWod['scoreType'], { label: string; classes: string }> = {
  rounds_reps: { label: 'Score: Rounds + Reps', classes: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  time:        { label: 'Score: Time',           classes: 'bg-green-500/20 text-green-300 border-green-500/30' },
  load:        { label: 'Score: Max Load',        classes: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  completed:   { label: 'Score: Completed',       classes: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  calories:    { label: 'Score: Calories',        classes: 'bg-red-500/20 text-red-300 border-red-500/30' },
}

const ScoreBadge = ({ scoreType }: { scoreType: GeneratedWod['scoreType'] }) => {
  const cfg = SCORE_CONFIG[scoreType]
  return (
    <span className={`text-xs font-semibold border px-2 py-1 rounded-full whitespace-nowrap ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}

// Build lookup: normalized name → movement metadata
type MovementMeta = { coachingCue?: string; modality?: Modality; movementIndex: number }

function buildMetaMap(movements: PrescribedMovement[]): Map<string, MovementMeta> {
  const map = new Map<string, MovementMeta>()
  for (let i = 0; i < movements.length; i++) {
    const m = movements[i]
    map.set(normalize(m.name), { coachingCue: m.coachingCue, modality: m.modality, movementIndex: i })
  }
  return map
}

const MODALITY_INFO: Record<Modality, { classes: string; title: string }> = {
  M: { classes: 'bg-blue-500/15 text-blue-300 border-blue-500/30', title: 'Metabolic conditioning' },
  G: { classes: 'bg-green-500/15 text-green-300 border-green-500/30', title: 'Gymnastics' },
  W: { classes: 'bg-orange-500/15 text-orange-300 border-orange-500/30', title: 'Weightlifting' },
}

const ModalityBadge = ({ modality }: { modality: Modality }) => (
  <span title={MODALITY_INFO[modality].title}
    className={`shrink-0 text-[10px] font-bold border w-4 h-4 rounded flex items-center justify-center ${MODALITY_INFO[modality].classes}`}>
    {modality}
  </span>
)

// Strip trailing 's' to roughly match singular ↔ plural ("Pull-Up" / "Pull-Ups")
function normalize(name: string): string {
  return name.toLowerCase().replace(/s$/, '').trim()
}

function youtubeUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' CrossFit how to')}`
}

// Inline info panel shown when the user taps ?
const MovementInfo = ({ name, cue }: { name: string; cue?: string }) => (
  <div className="ml-14 mt-0.5 mb-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm space-y-1.5">
    {cue && <p className="text-gray-300 leading-snug">{cue}</p>}
    <a
      href={youtubeUrl(name)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"
    >
      Watch tutorial on YouTube
      <span aria-hidden="true">↗</span>
    </a>
  </div>
)

const SwapButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Swap exercise"
    className="shrink-0 w-5 h-5 rounded-full border border-gray-600 text-gray-500 hover:border-orange-400 hover:text-orange-400 text-xs flex items-center justify-center transition-colors cursor-pointer"
  >
    ↻
  </button>
)

type WorkoutLineProps = {
  line: string
  isFirst: boolean
  metaMap: Map<string, MovementMeta>
  onSwap: (index: number) => void
}

function WorkoutLine({ line, isFirst, metaMap, onSwap }: WorkoutLineProps) {
  const [showInfo, setShowInfo] = useState(false)
  const trimmed = line.trim()

  if (!trimmed) return <div className="h-3" />

  if (isFirst) return <h1 className="text-3xl font-black text-white mb-4 leading-tight">{trimmed}</h1>

  if (trimmed.startsWith('Time cap:')) {
    return (
      <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full bg-gray-800 border border-gray-700">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
        <p className="text-gray-400 text-xs font-medium">{trimmed}</p>
      </div>
    )
  }

  if (trimmed.startsWith('Score:')) {
    return <p className="text-gray-500 text-xs mt-3 uppercase tracking-wider">{trimmed}</p>
  }

  // "Min 1: 10 Push-Ups" — EMOM line
  const emomMatch = trimmed.match(/^(Min \d+):\s+(.+)$/)
  if (emomMatch) {
    const movText = emomMatch[2]
    const { name, display } = parseNameAndDisplay(movText)
    const meta = metaMap.get(normalize(name))
    return (
      <>
        <div className="flex items-baseline gap-3 py-1">
          <span className="text-gray-500 text-sm w-14 shrink-0">{emomMatch[1]}</span>
          <span className="text-white">{display}</span>
          {meta?.modality && <ModalityBadge modality={meta.modality} />}
          {meta && <SwapButton onClick={() => onSwap(meta.movementIndex)} />}
          {meta && <InfoToggle open={showInfo} onToggle={() => setShowInfo(!showInfo)} />}
        </div>
        {showInfo && meta && <MovementInfo name={name} cue={meta.coachingCue} />}
      </>
    )
  }

  // "12 Deadlift (225/155 lb)" — movement with reps
  const repMatch = trimmed.match(/^(\d[\d-]*)\s+(.+)$/)
  if (repMatch) {
    const [, reps, rest] = repMatch
    const loadMatch = rest.match(/^(.+?)\s+\((.+)\)$/)
    const name = (loadMatch ? loadMatch[1] : rest).trim()
    const meta = metaMap.get(normalize(name))
    return (
      <>
        <div className="flex items-baseline gap-3 py-2 border-b border-gray-800/60 last:border-0">
          <span className="text-orange-400 font-black text-2xl w-14 shrink-0 leading-none">{reps}</span>
          <span className="text-white font-semibold text-base">{name}</span>
          {loadMatch && <span className="text-gray-500 text-sm">({loadMatch[2]})</span>}
          {meta?.modality && <ModalityBadge modality={meta.modality} />}
          {meta && <SwapButton onClick={() => onSwap(meta.movementIndex)} />}
          {meta && <InfoToggle open={showInfo} onToggle={() => setShowInfo(!showInfo)} />}
        </div>
        {showInfo && meta && <MovementInfo name={name} cue={meta.coachingCue} />}
      </>
    )
  }

  // "Thruster (95/65 lb)" — ladder movement (no per-line reps)
  const loadOnlyMatch = trimmed.match(/^(.+?)\s+\((.+)\)$/)
  if (loadOnlyMatch) {
    const name = loadOnlyMatch[1].trim()
    const meta = metaMap.get(normalize(name))
    return (
      <>
        <div className="flex items-baseline gap-3 py-2 pl-14 border-b border-gray-800/60 last:border-0">
          <span className="text-white font-semibold text-base">{name}</span>
          <span className="text-gray-500 text-sm">({loadOnlyMatch[2]})</span>
          {meta?.modality && <ModalityBadge modality={meta.modality} />}
          {meta && <SwapButton onClick={() => onSwap(meta.movementIndex)} />}
          {meta && <InfoToggle open={showInfo} onToggle={() => setShowInfo(!showInfo)} />}
        </div>
        {showInfo && meta && <MovementInfo name={name} cue={meta.coachingCue} />}
      </>
    )
  }

  // Plain movement: "Pull-Ups"
  const meta = metaMap.get(normalize(trimmed))
  return (
    <>
      <div className="flex items-baseline gap-3 py-2 pl-14 border-b border-gray-800/60 last:border-0">
        <span className="text-white font-semibold text-base">{trimmed}</span>
        {meta?.modality && <ModalityBadge modality={meta.modality} />}
        {meta && <SwapButton onClick={() => onSwap(meta.movementIndex)} />}
        {meta && <InfoToggle open={showInfo} onToggle={() => setShowInfo(!showInfo)} />}
      </div>
      {showInfo && meta && <MovementInfo name={trimmed} cue={meta.coachingCue} />}
    </>
  )
}

const InfoToggle = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={open ? 'Hide info' : 'Show how-to info'}
    className="ml-auto shrink-0 w-5 h-5 rounded-full border border-gray-600 text-gray-500 hover:border-blue-400 hover:text-blue-400 text-xs flex items-center justify-center transition-colors cursor-pointer"
  >
    {open ? '×' : '?'}
  </button>
)

// Helper: split "10 Push-Ups (some note)" into name + display string
function parseNameAndDisplay(text: string): { name: string; display: string } {
  const rep = text.match(/^(\d+)\s+(.+)$/)
  if (rep) {
    const rest = rep[2]
    const load = rest.match(/^(.+?)\s+\((.+)\)$/)
    const name = load ? load[1].trim() : rest.trim()
    return { name, display: text }
  }
  return { name: text.trim(), display: text }
}

const WhiteboardCard = ({ wod, onSwap }: { wod: GeneratedWod; onSwap: (index: number) => void }) => {
  const lines = wod.workoutText.split('\n')
  const firstContentIdx = lines.findIndex((l) => l.trim().length > 0)
  const metaMap = buildMetaMap(wod.movements)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-500/20" />
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <p className="text-gray-500 text-xs leading-snug">{wod.title}</p>
          <ScoreBadge scoreType={wod.scoreType} />
        </div>
        {lines.map((line, i) => (
          <WorkoutLine key={i} line={line} isFirst={i === firstContentIdx} metaMap={metaMap} onSwap={onSwap} />
        ))}
      </div>
    </div>
  )
}

type SectionProps = { title: string; items: string[] }

const BulletSection = ({ title, items }: SectionProps) => (
  <div>
    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">{title}</h2>
    <ul className="text-gray-400 text-sm space-y-1">
      {items.map((s, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-orange-500/60 mt-0.5 shrink-0">›</span>
          {s}
        </li>
      ))}
    </ul>
  </div>
)

const BriefRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col sm:flex-row sm:gap-4">
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 sm:w-24 shrink-0 sm:pt-0.5">{label}</span>
    <p className="text-gray-300 text-sm leading-relaxed">{value}</p>
  </div>
)

const WarmupCard = ({ warmup }: { warmup: NonNullable<GeneratedWod['warmup']> }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-5">
    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Warm-Up</h2>
    <p className="text-gray-300 text-sm mb-2">{warmup.generalCardio}</p>
    {warmup.movementPrep.length > 0 && (
      <ul className="text-gray-400 text-sm space-y-1">
        {warmup.movementPrep.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-orange-500/60 mt-0.5 shrink-0">›</span>
            {s}
          </li>
        ))}
      </ul>
    )}
  </div>
)

const DetailPanel = ({ wod }: { wod: GeneratedWod }) => {
  const subLines = wod.substitutions
    .filter((s) => s.alternatives.length > 0)
    .map((s) => `${s.movement}: ${s.alternatives.join(', ')}`)
  const tiers = wod.scalingTiers

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
      <div className="px-6 py-5">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Coach's Brief</h2>
        {wod.brief ? (
          <div className="space-y-2.5">
            <BriefRow label="Target" value={wod.brief.targetScore} />
            <BriefRow label="Feel" value={wod.brief.feel} />
            <BriefRow label="Pacing" value={wod.brief.pacing} />
            <BriefRow label="Scale when" value={wod.brief.scaleWhen} />
          </div>
        ) : (
          <p className="text-gray-400 text-sm leading-relaxed">{wod.stimulus}</p>
        )}
      </div>
      {tiers ? (
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {tiers.rx.length > 0 && <BulletSection title="RX" items={tiers.rx} />}
          {tiers.scaled.length > 0 && <BulletSection title="Scaled" items={tiers.scaled} />}
          {tiers.beginner.length > 0 && <BulletSection title="Beginner" items={tiers.beginner} />}
        </div>
      ) : (
        (wod.scaling.easier.length > 0 || wod.scaling.harder.length > 0) && (
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {wod.scaling.easier.length > 0 && <BulletSection title="Scale Down" items={wod.scaling.easier} />}
            {wod.scaling.harder.length > 0 && <BulletSection title="Scale Up" items={wod.scaling.harder} />}
          </div>
        )
      )}
      {subLines.length > 0 && (
        <div className="px-6 py-5">
          <BulletSection title="Substitutions" items={subLines} />
        </div>
      )}
    </div>
  )
}

function buildCopyText(wod: GeneratedWod): string {
  const parts: string[] = []
  if (wod.warmup) {
    parts.push('WARM-UP', `  ${wod.warmup.generalCardio}`, ...wod.warmup.movementPrep.map((p) => `  ${p}`), '')
  }
  parts.push(wod.workoutText)
  if (wod.brief) parts.push('', `Target: ${wod.brief.targetScore}`, `Pacing: ${wod.brief.pacing}`)
  return parts.join('\n')
}

export const WodResult = ({ wod: initialWod, onRegenerate, onSave }: WodResultProps) => {
  const [wod, setWod] = useState(initialWod)
  const [copied, setCopied] = useState(false)

  const handleSwap = (index: number) => setWod((prev) => swapMovement(prev, index))

  const handleCopy = () => {
    navigator.clipboard.writeText(buildCopyText(wod)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        {wod.warmup && <WarmupCard warmup={wod.warmup} />}
        <WhiteboardCard wod={wod} onSwap={handleSwap} />
        <DetailPanel wod={wod} />
        <p className="text-gray-700 text-xs leading-relaxed px-1">{wod.safetyNote}</p>

        <div className="flex flex-wrap gap-3 pt-1">
          <Button onClick={handleCopy} variant="secondary">
            {copied ? 'Copied!' : 'Copy Workout'}
          </Button>
          <Button onClick={() => onSave(wod)} variant="secondary">Save</Button>
          <Button onClick={onRegenerate}>Regenerate</Button>
        </div>
      </div>
    </div>
  )
}
