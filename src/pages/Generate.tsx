import { useState } from 'react'
import { Chip } from '../components/ui/Chip'
import { Button } from '../components/ui/Button'
import { generateWod } from '../lib/wod/generator'
import type { WodRequest, Equipment, GeneratedWod } from '../lib/wod/types'

type GenerateProps = {
  onResult: (wod: GeneratedWod) => void
}

const EQUIPMENT_OPTIONS: { id: Equipment; label: string }[] = [
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'pull_up_bar', label: 'Pull-Up Bar' },
  { id: 'rings', label: 'Rings' },
  { id: 'jump_rope', label: 'Jump Rope' },
  { id: 'box', label: 'Box' },
  { id: 'medicine_ball', label: 'Medicine Ball' },
  { id: 'rower', label: 'Rower' },
  { id: 'bike', label: 'Bike' },
  { id: 'ski_erg', label: 'Ski Erg' },
  { id: 'sandbag', label: 'Sandbag' },
  { id: 'wall_ball', label: 'Wall Ball' },
  { id: 'bench', label: 'Bench' },
  { id: 'rope', label: 'Climbing Rope' },
  { id: 'ghd', label: 'GHD' },
  { id: 'sled', label: 'Sled / Prowler' },
]

const TIME_OPTIONS: WodRequest['timeAvailable'][] = [8, 10, 12, 15, 20, 30, 45, 60]

type SegmentedProps<T extends string | number> = {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}

const Segmented = <T extends string | number>({ label, options, value, onChange }: SegmentedProps<T>) => (
  <div className="space-y-3">
    <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-gray-500">
      <span className="w-1 h-3.5 rounded-full bg-orange-500 shrink-0" />
      {label}
    </p>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip
          key={String(opt.value)}
          label={opt.label}
          selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  </div>
)

type FormState = {
  equipment: Equipment[]
  timeAvailable: WodRequest['timeAvailable']
  intensity: WodRequest['intensity']
  skillLevel: WodRequest['skillLevel']
  goal: WodRequest['goal']
  targetArea: WodRequest['targetArea']
  includeWarmup: boolean
}

type SettingsProps = {
  form: FormState
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}

const WorkoutSettings = ({ form, set }: SettingsProps) => (
  <>
    <Segmented label="Time Available" value={form.timeAvailable}
      onChange={(v) => set('timeAvailable', v)}
      options={TIME_OPTIONS.map((t) => ({ value: t, label: `${t} min` }))} />
    <Segmented label="Intensity" value={form.intensity}
      onChange={(v) => set('intensity', v)}
      options={[
        { value: 'low', label: 'Low' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'high', label: 'High' },
      ]} />
    <Segmented label="Skill Level" value={form.skillLevel}
      onChange={(v) => set('skillLevel', v)}
      options={[
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
      ]} />
    <Segmented label="Goal" value={form.goal}
      onChange={(v) => set('goal', v)}
      options={[
        { value: 'conditioning', label: 'Conditioning' },
        { value: 'strength', label: 'Strength' },
        { value: 'fat_loss', label: 'Fat Loss' },
        { value: 'engine', label: 'Engine' },
        { value: 'mixed', label: 'Mixed' },
        { value: 'mobility', label: 'Mobility' },
      ]} />
    <Segmented label="Target Area" value={form.targetArea}
      onChange={(v) => set('targetArea', v)}
      options={[
        { value: 'full_body', label: 'Full Body' },
        { value: 'upper', label: 'Upper' },
        { value: 'lower', label: 'Lower' },
        { value: 'core', label: 'Core' },
      ]} />
  </>
)

const GenerateForm = ({ onResult }: GenerateProps) => {
  const [form, setForm] = useState<FormState>({
    equipment: ['bodyweight'],
    timeAvailable: 15,
    intensity: 'moderate',
    skillLevel: 'beginner',
    goal: 'conditioning',
    targetArea: 'full_body',
    includeWarmup: true,
  })
  const [error, setError] = useState<string | null>(null)

  const toggleEquipment = (eq: Equipment) =>
    setForm((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(eq)
        ? prev.equipment.filter((e) => e !== eq)
        : [...prev.equipment, eq],
    }))

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleGenerate = () => {
    setError(null)
    try {
      onResult(generateWod(form as WodRequest))
    } catch {
      setError('Could not generate a workout with those settings. Try adjusting equipment or intensity.')
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-gray-500">
          <span className="w-1 h-3.5 rounded-full bg-orange-500 shrink-0" />
          Equipment
        </p>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map(({ id, label }) => (
            <Chip key={id} label={label} selected={form.equipment.includes(id)} onClick={() => toggleEquipment(id)} />
          ))}
        </div>
      </div>
      <WorkoutSettings form={form} set={set} />
      <div className="space-y-3">
        <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-gray-500">
          <span className="w-1 h-3.5 rounded-full bg-orange-500 shrink-0" />
          Warm-Up
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip
            label="Include tailored warm-up"
            selected={form.includeWarmup}
            onClick={() => set('includeWarmup', !form.includeWarmup)}
          />
        </div>
      </div>
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      <Button onClick={handleGenerate} fullWidth size="lg">Generate WOD</Button>
    </div>
  )
}

export const Generate = ({ onResult }: GenerateProps) => (
  <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
    <div className="max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white">Generate a WOD</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your workout preferences below.</p>
      </div>
      <GenerateForm onResult={onResult} />
    </div>
  </div>
)
