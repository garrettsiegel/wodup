import type { Exercise, Intensity, RepScheme, PrescribedMovement, WodFormat } from './types'

// ── CrossFit-canonical rep scheme types ─────────────────────────────────────

export type RepSchemeKind =
  | { kind: 'amrap_fixed'; reps: number }
  | { kind: 'descending_ladder'; sets: number[] }
  | { kind: 'fixed_rounds'; rounds: number; reps: number }
  | { kind: 'chipper'; sets: number[] }
  | { kind: 'single_set'; reps: number }
  | { kind: 'calories'; calories: number }
  | { kind: 'distance'; distance: string }
  | { kind: 'time'; duration: string }

// Rep options per kind — varied so workouts don't feel repetitive
const AMRAP_FIXED_OPTIONS: Record<Intensity, number[]> = {
  low:      [5, 8, 10],
  moderate: [8, 10, 12, 15],
  high:     [10, 12, 15, 20],
}

const LADDER_OPTIONS: number[][] = [
  [21, 15, 9],
  [15, 12, 9],
  [10, 8, 6],
]

const ROUNDS_OPTIONS: Record<Intensity, { rounds: number; reps: number }[]> = {
  low:      [{ rounds: 3, reps: 8 }, { rounds: 3, reps: 10 }],
  moderate: [{ rounds: 3, reps: 10 }, { rounds: 5, reps: 9 }, { rounds: 5, reps: 12 }],
  high:     [{ rounds: 5, reps: 12 }, { rounds: 5, reps: 9 }, { rounds: 3, reps: 21 }],
}

const CHIPPER_OPTIONS: Record<Intensity, number[][]> = {
  low:      [[20, 15, 10], [15, 10, 5]],
  moderate: [[30, 20, 10], [21, 15, 9]],
  high:     [[50, 40, 30, 20, 10], [30, 20, 10]],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Chooses the canonical rep scheme kind for a given WOD format + slot context
export function selectRepSchemeKind(
  slotRepScheme: RepScheme,
  format: WodFormat,
  movementCount: number,
  intensity: Intensity,
  timeAvailable: number,
): RepSchemeKind {
  if (slotRepScheme === 'calories') {
    const cals = intensity === 'low' ? 10 : intensity === 'high' ? 20 : 15
    return { kind: 'calories', calories: cals }
  }
  if (slotRepScheme === 'distance') {
    const dist = timeAvailable <= 15 ? '200m' : '400m'
    return { kind: 'distance', distance: dist }
  }
  if (slotRepScheme === 'time') {
    const sec = intensity === 'low' ? 20 : intensity === 'high' ? 45 : 30
    return { kind: 'time', duration: `${sec} sec` }
  }

  // Format-driven scheme selection
  if (format === 'AMRAP') {
    return { kind: 'amrap_fixed', reps: pick(AMRAP_FIXED_OPTIONS[intensity]) }
  }

  if (format === 'EMOM') {
    const reps = intensity === 'low' ? pick([5, 8]) : intensity === 'high' ? pick([10, 12]) : pick([8, 10])
    return { kind: 'amrap_fixed', reps }
  }

  if (format === 'Intervals') {
    return { kind: 'amrap_fixed', reps: pick(AMRAP_FIXED_OPTIONS[intensity]) }
  }

  if (format === 'For Time') {
    if (movementCount <= 2) {
      return { kind: 'descending_ladder', sets: pick(LADDER_OPTIONS) }
    }
    // Chipper for longer workouts with many movements
    if (movementCount >= 5 || timeAvailable >= 25) {
      return { kind: 'chipper', sets: pick(CHIPPER_OPTIONS[intensity]) }
    }
    // Rounds for 3-4 movement For Time
    const opt = pick(ROUNDS_OPTIONS[intensity])
    return { kind: 'fixed_rounds', rounds: opt.rounds, reps: opt.reps }
  }

  if (format === 'Strength + Metcon') {
    // Strength part uses low reps; metcon uses fixed rounds
    if (slotRepScheme === 'low') {
      return { kind: 'fixed_rounds', rounds: 5, reps: pick([3, 4, 5]) }
    }
    const opt = pick(ROUNDS_OPTIONS[intensity])
    return { kind: 'fixed_rounds', rounds: opt.rounds, reps: opt.reps }
  }

  // Fallback
  return { kind: 'amrap_fixed', reps: pick(AMRAP_FIXED_OPTIONS[intensity]) }
}

// ── Rep prescribing ──────────────────────────────────────────────────────────

type RepContext = {
  intensity: Intensity
  timeAvailable: number
  movementCount: number
  format: WodFormat
}

// Shared state per WOD so all slots in a For Time use the same ladder/rounds numbers
export type RepSchemeState = {
  resolvedKind?: RepSchemeKind
}

export function prescribeReps(
  exercise: Exercise,
  repScheme: RepScheme,
  ctx: RepContext,
  state: RepSchemeState,
  rxLoadNote?: string,
): PrescribedMovement {
  // For Time and rounds: all movements share the same scheme
  const shouldShareScheme = ctx.format === 'For Time' || ctx.format === 'Strength + Metcon'

  if (!state.resolvedKind || !shouldShareScheme) {
    state.resolvedKind = selectRepSchemeKind(
      repScheme,
      ctx.format,
      ctx.movementCount,
      ctx.intensity,
      ctx.timeAvailable,
    )
  }

  const kind = state.resolvedKind
  const base: PrescribedMovement = { exerciseId: exercise.id, name: exercise.name, loadNote: rxLoadNote }

  switch (kind.kind) {
    case 'amrap_fixed':
      return { ...base, reps: kind.reps }
    case 'descending_ladder':
      // All ladder movements share the same sets — reps are the full ladder
      return { ...base, reps: kind.sets[0], rounds: kind.sets.length, loadNote: rxLoadNote }
    case 'fixed_rounds':
      return { ...base, reps: kind.reps, rounds: kind.rounds }
    case 'chipper':
      return { ...base, reps: kind.sets[0] }
    case 'single_set':
      return { ...base, reps: kind.reps }
    case 'calories':
      return { ...base, calories: kind.calories }
    case 'distance':
      return { ...base, distance: kind.distance }
    case 'time':
      return { ...base, duration: kind.duration }
  }
}

// ── Workout text builder ─────────────────────────────────────────────────────

export function buildWorkoutText(
  movements: PrescribedMovement[],
  format: WodFormat,
  duration: number,
  resolvedScheme?: RepSchemeKind,
): string {
  const lines: string[] = []

  if (format === 'For Time') {
    if (resolvedScheme?.kind === 'descending_ladder') {
      const sets = resolvedScheme.sets
      lines.push(`${sets.join('-')} For Time`)
      lines.push('')
      for (const m of movements) {
        const load = m.loadNote ? ` (${m.loadNote})` : ''
        lines.push(`  ${m.name}${load}`)
      }
    } else if (resolvedScheme?.kind === 'fixed_rounds') {
      const { rounds, reps } = resolvedScheme
      lines.push(`${rounds} Rounds For Time`)
      lines.push('')
      for (const m of movements) {
        const load = m.loadNote ? ` (${m.loadNote})` : ''
        lines.push(`  ${reps} ${m.name}${load}`)
      }
      lines.push(`\nTime cap: ${Math.round(duration * 1.1)} min`)
    } else if (resolvedScheme?.kind === 'chipper') {
      const sets = resolvedScheme.sets
      lines.push(`For Time (Chipper)`)
      lines.push('')
      for (let i = 0; i < movements.length; i++) {
        const m = movements[i]
        const rep = sets[i] ?? sets[sets.length - 1]
        const load = m.loadNote ? ` (${m.loadNote})` : ''
        lines.push(`  ${rep} ${m.name}${load}`)
      }
      lines.push(`\nTime cap: ${duration} min`)
    } else {
      lines.push(`For Time`)
      lines.push('')
      for (const m of movements) {
        lines.push(`  ${formatMovementLine(m)}`)
      }
    }
  } else if (format === 'AMRAP') {
    lines.push(`${duration}-Minute AMRAP`)
    lines.push('')
    for (const m of movements) {
      lines.push(`  ${formatMovementLine(m)}`)
    }
  } else if (format === 'EMOM') {
    const perMinuteCount = movements.length
    lines.push(`${duration}-Minute EMOM (${perMinuteCount} movements, 1 per min)`)
    lines.push('')
    for (let i = 0; i < movements.length; i++) {
      const m = movements[i]
      lines.push(`  Min ${i + 1}: ${formatMovementLine(m)}`)
    }
  } else if (format === 'Intervals') {
    lines.push(`${duration}-Minute Intervals`)
    lines.push('')
    for (const m of movements) {
      lines.push(`  ${formatMovementLine(m)}`)
    }
  } else {
    lines.push(`${duration}-Minute ${format}`)
    lines.push('')
    for (const m of movements) {
      lines.push(`  ${formatMovementLine(m)}`)
    }
  }

  return lines.join('\n')
}

function formatMovementLine(m: PrescribedMovement): string {
  const load = m.loadNote ? ` (${m.loadNote})` : ''
  if (m.reps !== undefined) return `${m.reps} ${m.name}${load}`
  if (m.calories !== undefined) return `${m.calories} cal ${m.name}`
  if (m.distance) return `${m.distance} ${m.name}`
  if (m.duration) return `${m.duration} ${m.name}`
  return m.name
}

// ── Stimulus ─────────────────────────────────────────────────────────────────

export function describeStimulusFor(intensity: Intensity, format: WodFormat): string {
  const stimuli: Record<Intensity, Record<string, string>> = {
    low: {
      AMRAP:              'Steady, sustainable effort — move well, not fast.',
      EMOM:               'Controlled pace; use remaining time in each minute to recover.',
      'For Time':         'Moderate clip — prioritize technique over speed.',
      Intervals:          'Aerobic effort — you should be able to hold a conversation.',
      'Strength + Metcon': 'Heavy strength sets followed by light conditioning.',
    },
    moderate: {
      AMRAP:              'Sustainable mixed-modal conditioning — find a pace you can hold for the full duration.',
      EMOM:               'Challenging but consistent — each minute should feel the same.',
      'For Time':         'Push-pace effort — uncomfortable but doable start to finish.',
      Intervals:          'Hard work periods with planned recovery between sets.',
      'Strength + Metcon': 'Solid strength sets, then a spicy metcon finisher.',
    },
    high: {
      AMRAP:              'High output — go as fast as technique allows. This should hurt.',
      EMOM:               'Near-maximal effort each minute with minimal rest.',
      'For Time':         'Sprint effort — leave nothing on the floor.',
      Intervals:          'Max-effort work periods, full recovery between rounds.',
      'Strength + Metcon': 'Heavy lifting into a punishing met-con.',
    },
  }
  return stimuli[intensity][format] ?? 'Give consistent effort throughout.'
}

// ── Scaling ───────────────────────────────────────────────────────────────────

export function buildScaling(
  movements: PrescribedMovement[],
  allExercises: { id: string; name: string; rxLoad?: { male: string; female: string } }[],
  resolvedScheme?: RepSchemeKind,
): { easier: string[]; harder: string[] } {
  const easier: string[] = []
  const harder: string[] = []

  if (resolvedScheme?.kind === 'descending_ladder') {
    easier.push(`Scale the ladder: ${resolvedScheme.sets.map((r) => Math.round(r * 0.6)).join('-')} reps`)
    harder.push(`Increase the ladder: ${resolvedScheme.sets.map((r) => Math.round(r * 1.3)).join('-')} reps`)
  } else if (resolvedScheme?.kind === 'fixed_rounds') {
    easier.push(`Reduce to ${Math.max(1, resolvedScheme.rounds - 1)} rounds or lower reps to ${Math.round(resolvedScheme.reps * 0.7)}`)
    harder.push(`Add 1 round or increase reps to ${Math.round(resolvedScheme.reps * 1.3)}`)
  } else if (resolvedScheme?.kind === 'chipper') {
    const scaled = resolvedScheme.sets.map((r) => Math.round(r * 0.6))
    easier.push(`Scale reps: ${scaled.join('-')}`)
    const harder2 = resolvedScheme.sets.map((r) => Math.round(r * 1.2))
    harder.push(`Increase reps: ${harder2.join('-')}`)
  }

  for (const m of movements) {
    const ex = allExercises.find((e) => e.id === m.exerciseId)
    if (!ex) continue
    if (ex.rxLoad) {
      easier.push(`${ex.name}: use lighter load`)
      harder.push(`${ex.name}: go heavier if form is solid`)
    } else if (m.reps !== undefined) {
      easier.push(`${Math.round(m.reps * 0.6)} ${ex.name}`)
      harder.push(`${Math.round(m.reps * 1.3)} ${ex.name}`)
    }
  }

  return { easier: easier.slice(0, 4), harder: harder.slice(0, 4) }
}
