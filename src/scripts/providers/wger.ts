import type { Exercise, Equipment, MovementPattern, Difficulty, Intensity } from '../../lib/wod/types.js'
import type { ExerciseProvider } from '../types.js'

const BASE = 'https://wger.de/api/v2'

type WgerCategory = { id: number; name: string }
type WgerEquipment = { id: number; name: string }
type WgerMuscle = { id: number; name_en: string }
type WgerTranslation = { language: number; name: string; description: string }

type WgerExerciseInfo = {
  id: number
  category: WgerCategory
  equipment: WgerEquipment[]
  muscles: WgerMuscle[]
  muscles_secondary: WgerMuscle[]
  translations: WgerTranslation[]
}

type WgerPage = {
  count: number
  next: string | null
  results: WgerExerciseInfo[]
}

// wger category id → CrossFit movement pattern
const CATEGORY_MAP: Record<number, MovementPattern> = {
  10: 'core',       // Abs
  8:  'pull',       // Arms
  12: 'pull',       // Back
  14: 'monostructural', // Calves
  15: 'monostructural', // Cardio
  11: 'push',       // Chest
  9:  'squat',      // Legs
  13: 'push',       // Shoulders
}

// wger equipment id → CrossFit equipment type
const EQUIPMENT_MAP: Record<number, Equipment> = {
  1:  'barbell',
  3:  'dumbbells',
  6:  'pull_up_bar',
  7:  'bodyweight',
  8:  'bench',
  10: 'kettlebell',
}

const SKIP_EQUIPMENT = new Set([2, 4, 5, 9, 11]) // SZ-bar, gym mat, swiss ball, incline bench, resistance band

// Names containing these strings are machines/equipment-dependent regardless of how wger tags them.
// wger incorrectly tags many machine and cardio-equipment exercises as "bodyweight" (ID 7).
const MACHINE_KEYWORDS = [
  // Resistance machines & cable
  'machine', 'cable ', 'cable-', 'smith ', 'smith-', 'pulley',
  // Cardio machines
  'treadmill', 'elliptical', 'stationary', 'stair master', 'stairmaster',
  // Cycling (generic "Cycling" requires a bike — distinct from air bike which is real CrossFit gear)
  'cycling',
  // Obviously non-WOD content
  'meditation',
]

function isMachineExercise(name: string): boolean {
  const lower = name.toLowerCase()
  return MACHINE_KEYWORDS.some((kw) => lower.includes(kw))
}

// Infer difficulty + intensity from category / equipment
function inferDifficulty(cat: WgerCategory, equip: WgerEquipment[]): Difficulty {
  if (cat.id === 15) return 'beginner' // Cardio
  if (equip.some((e) => e.id === 1)) return 'intermediate' // barbell = intermediate+
  return 'beginner'
}

function inferIntensity(cat: WgerCategory): Intensity {
  if (cat.id === 15) return 'high' // Cardio
  if (cat.id === 9 || cat.id === 12) return 'moderate' // Legs, Back
  return 'low'
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export class WgerProvider implements ExerciseProvider {
  async fetchAll(): Promise<Exercise[]> {
    const exercises: Exercise[] = []
    let url: string | null = `${BASE}/exerciseinfo/?format=json&language=2&limit=100`

    while (url) {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`wger fetch failed: ${res.status}`)
      const page = (await res.json()) as WgerPage

      for (const ex of page.results) {
        const english = ex.translations.find((t) => t.language === 2)
        if (!english?.name) continue

        // Skip exercises that use equipment we don't support
        if (ex.equipment.some((e) => SKIP_EQUIPMENT.has(e.id))) continue

        // Skip gym machines that wger incorrectly tags as bodyweight
        if (isMachineExercise(english.name)) continue

        const pattern: MovementPattern = CATEGORY_MAP[ex.category.id] ?? 'conditioning'

        // Only include exercises with at least one equipment type we can map.
        // Exercises with an empty equipment list in wger are often gym machines or
        // cable stations with no equipment ID — skip them to avoid false bodyweight matches.
        const equipment: Equipment[] = ex.equipment.flatMap(
          (e) => EQUIPMENT_MAP[e.id] ? [EQUIPMENT_MAP[e.id]] : [],
        )
        if (equipment.length === 0) continue

        const allMuscles = [
          ...ex.muscles.map((m) => m.name_en),
          ...ex.muscles_secondary.map((m) => m.name_en),
        ].filter(Boolean)

        exercises.push({
          id: slug(english.name),
          name: english.name,
          equipment,
          movementPattern: pattern,
          difficulty: inferDifficulty(ex.category, ex.equipment),
          intensity: inferIntensity(ex.category),
          muscleGroups: [...new Set(allMuscles)],
          defaultRepRange: [8, 12],
          timeDomainFit: ['short', 'medium'],
          substitutions: [],
        })
      }

      url = page.next
      // Polite crawl delay
      if (url) await new Promise((r) => setTimeout(r, 300))
    }

    return exercises
  }
}
