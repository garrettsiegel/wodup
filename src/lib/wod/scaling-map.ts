import type { PrescribedMovement, ScalingTiers } from './types'
import type { RepSchemeKind } from './scoring'
import { isForbiddenForSkill } from './safety'

// Curated scaling ladders for high-skill movements, ordered most → least demanding.
// Each rung preserves the movement's stimulus as long as possible — e.g. a pull-up
// stays a vertical pull (banded, then jumping) before falling back to a ring row,
// which changes the stimulus to a horizontal pull.
export const SCALE_LADDER: Record<string, string[]> = {
  'pull-up': ['banded pull-up', 'jumping pull-up', 'ring row (last resort — horizontal pull)'],
  'chest-to-bar': ['pull-up', 'banded pull-up', 'jumping pull-up'],
  'muscle-up': ['chest-to-bar + ring dip', 'pull-up + dip', 'jumping pull-up + box dip'],
  'ring-dip': ['banded ring dip', 'box dip', 'push-up'],
  'hspu': ['box HSPU (feet on box)', 'pike push-up', 'DB push press'],
  'handstand-hold': ['box pike hold', 'plank hold'],
  'wall-walk': ['incline wall-walk (partial)', 'bear crawl + plank'],
  'pistol': ['box pistol (sit to box)', 'assisted pistol (hold support)', 'air squat'],
  'overhead-squat': ['front squat', 'air squat with PVC overhead'],
  'double-under': ['single-unders (2–3x reps)', 'attempt double-unders for time'],
  'toes-to-bar': ['hanging knee raises', 'lying leg raises'],
  'ghd-sit-up': ['abmat sit-up', 'tuck-up'],
  'squat-clean': ['power clean + front squat', 'hang power clean'],
  'power-snatch': ['hang power snatch', 'dumbbell snatch'],
  'power-clean': ['hang power clean', 'dumbbell power clean'],
  'wall-ball': ['lighter ball / lower target', 'medicine-ball thruster'],
  'thruster': ['lighter load', 'front squat + push press (broken)'],
  'rope-climb': ['legless from seated → standing pulls', '3 ring rows + 1 strict pull per climb'],
  'legless-rope-climb': ['rope climb (with legs)', '3–5 strict pull-ups per climb'],
}

export function scaleRungs(exerciseId: string): string[] {
  return SCALE_LADDER[exerciseId] ?? []
}

type ScalingExercise = { id: string; name: string; rxLoad?: { male: string; female: string } }

// Produces three preserve-the-stimulus scaling tiers. Each tier draws from the
// curated per-movement ladder above before falling back to load/rep cuts.
export function buildScalingTiers(
  movements: PrescribedMovement[],
  allExercises: ScalingExercise[],
  resolvedScheme?: RepSchemeKind,
): ScalingTiers {
  const rx: string[] = []
  const scaled: string[] = []
  const beginner: string[] = []

  for (const m of movements) {
    const ex = allExercises.find((e) => e.id === m.exerciseId)
    if (!ex) continue
    const rungs = scaleRungs(ex.id)

    if (ex.rxLoad) rx.push(`${ex.name}: ${ex.rxLoad.male} / ${ex.rxLoad.female}`)
    else rx.push(`${ex.name}: as written`)

    if (rungs.length > 0) scaled.push(`${ex.name} → ${rungs[0]}`)
    else if (ex.rxLoad) scaled.push(`${ex.name}: reduce load ~20–30%`)
    else if (m.reps !== undefined) scaled.push(`${ex.name}: ${Math.round(m.reps * 0.7)} reps`)

    if (rungs.length > 0) beginner.push(`${ex.name} → ${rungs[rungs.length - 1]}`)
    else if (isForbiddenForSkill(ex.id, 'beginner')) beginner.push(`${ex.name}: substitute an easier variation`)
    else if (ex.rxLoad) beginner.push(`${ex.name}: light / empty load, focus on mechanics`)
    else if (m.reps !== undefined) beginner.push(`${ex.name}: ${Math.round(m.reps * 0.5)} reps`)
  }

  if (resolvedScheme?.kind === 'descending_ladder') {
    beginner.unshift(`Shorten the ladder: ${resolvedScheme.sets.map((r) => Math.round(r * 0.6)).join('-')} reps`)
  } else if (resolvedScheme?.kind === 'fixed_rounds') {
    beginner.unshift(`Drop to ${Math.max(1, resolvedScheme.rounds - 1)} rounds`)
  } else if (resolvedScheme?.kind === 'chipper') {
    beginner.unshift(`Scale reps: ${resolvedScheme.sets.map((r) => Math.round(r * 0.6)).join('-')}`)
  }

  return { rx: rx.slice(0, 6), scaled: scaled.slice(0, 6), beginner: beginner.slice(0, 6) }
}
