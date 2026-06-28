import { z } from 'zod'
import EXERCISES_JSON from '@/data/exercises.json'
import { TEMPLATES } from './templates.seed'
import { isForbiddenForSkill, DEFAULT_SAFETY_NOTE, LIMITATION_AVOID } from './safety'
import { getSubstitutions } from './substitutions'
import { deriveModality } from './modality'
import { buildBrief } from './brief'
import { buildWarmup } from './warmup'
import { buildScalingTiers } from './scaling-map'
import {
  prescribeReps,
  buildWorkoutText,
  buildScaling,
  selectRepSchemeKind,
} from './scoring'
import type {
  WodRequest,
  GeneratedWod,
  Exercise,
  WodTemplate,
  PrescribedMovement,
  Equipment,
  Intensity,
  Modality,
  MovementPattern,
  RepSchemeState,
} from './types'

const EXERCISES = EXERCISES_JSON as unknown as Exercise[]

// ── Zod schema ──────────────────────────────────────────────────────────────

const WodRequestSchema = z.object({
  equipment: z.array(z.string()).min(1),
  timeAvailable: z.union([
    z.literal(8), z.literal(10), z.literal(12), z.literal(15),
    z.literal(20), z.literal(30), z.literal(45), z.literal(60),
  ]),
  intensity: z.enum(['low', 'moderate', 'high']),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  goal: z.enum(['conditioning', 'strength', 'fat_loss', 'engine', 'mixed', 'mobility']),
  targetArea: z.enum(['full_body', 'upper', 'lower', 'core']),
  workoutType: z.enum(['amrap', 'emom', 'for_time', 'intervals', 'strength_metcon']).optional(),
  spaceAvailable: z.enum(['small_room', 'garage', 'outdoor']).optional(),
  avoidMovements: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  includeWarmup: z.boolean().optional(),
})

// ── Exercise filtering ───────────────────────────────────────────────────────

function normalizeEquipment(equipment: Equipment[]): Equipment[] {
  return equipment.length === 0 ? ['bodyweight'] : equipment
}

const SMALL_ROOM_AVOID = new Set([
  'run', 'shuttle-run', 'walking-lunge', 'db-walking-lunge', 'bear-crawl', 'broad-jump',
])

function buildAvoidSet(request: WodRequest): Set<string> {
  const avoid = new Set<string>(request.avoidMovements?.map((m) => m.toLowerCase()) ?? [])
  for (const limitation of request.limitations ?? []) {
    const key = limitation.toLowerCase().replace(/\s+/g, '_')
    for (const id of LIMITATION_AVOID[key] ?? []) avoid.add(id)
  }
  if (request.spaceAvailable === 'small_room') {
    for (const id of SMALL_ROOM_AVOID) avoid.add(id)
  }
  return avoid
}

function filterExercises(request: WodRequest, equipment: Equipment[]): Exercise[] {
  const equipSet = new Set(equipment)
  const avoidSet = buildAvoidSet(request)

  return EXERCISES.filter((ex) => {
    if (!ex.equipment.some((eq) => equipSet.has(eq))) return false
    if (isForbiddenForSkill(ex.id, request.skillLevel)) return false
    if (avoidSet.has(ex.id) || avoidSet.has(ex.name.toLowerCase())) return false
    return true
  })
}

// ── Template selection ───────────────────────────────────────────────────────

const FORMAT_MAP: Record<string, string> = {
  amrap: 'AMRAP', emom: 'EMOM', for_time: 'For Time',
  intervals: 'Intervals', strength_metcon: 'Strength + Metcon',
}

function filterTemplates(request: WodRequest, bodyweightOnly: boolean): WodTemplate[] {
  return TEMPLATES.filter((t) => {
    if (!t.allowedIntensity.includes(request.intensity)) return false
    if (!t.allowedSkillLevels.includes(request.skillLevel)) return false
    if (request.timeAvailable < t.durationRange[0] || request.timeAvailable > t.durationRange[1] * 1.5) return false
    if (request.workoutType && t.format !== FORMAT_MAP[request.workoutType]) return false
    if (bodyweightOnly && t.format === 'Strength + Metcon') return false
    if (request.skillLevel === 'beginner' && t.id === 'chipper') return false
    // Benchmark archetypes need equipment to support them
    if (t.id === 'fran-style' || t.id === '21-15-9-triplet' || t.id === 'dt-style') {
      if (bodyweightOnly) return false
    }
    if (t.id === 'grace-style' && bodyweightOnly) return false
    if (t.id === 'dt-style' && !request.equipment.includes('barbell')) return false
    if (t.id === 'grace-style' && !request.equipment.includes('barbell')) return false
    return true
  })
}

function pickTemplate(templates: WodTemplate[], request: WodRequest): WodTemplate {
  if (templates.length === 0) {
    return TEMPLATES.find((t) => t.id === 'bodyweight-short-amrap') ?? TEMPLATES[0]
  }
  // Scale ideal slot count with time so longer workouts get more movements.
  const ideal = request.timeAvailable <= 10 ? 2
    : request.timeAvailable <= 20 ? 3
    : request.timeAvailable <= 30 ? 5
    : 6
  return templates
    .map((t) => ({ t, score: -Math.abs(t.movementSlots.length - ideal) }))
    .sort((a, b) => b.score - a.score)[0].t
}

// ── Movement slot filling ────────────────────────────────────────────────────

const GOAL_PATTERNS: Record<string, MovementPattern[]> = {
  conditioning: ['squat', 'conditioning', 'monostructural', 'push', 'pull'],
  strength:     ['squat', 'hinge', 'push', 'pull', 'olympic_lift'],
  fat_loss:     ['conditioning', 'monostructural', 'squat', 'push'],
  engine:       ['monostructural', 'conditioning', 'squat'],
  mixed:        ['squat', 'hinge', 'push', 'pull', 'core', 'monostructural'],
  mobility:     ['lunge', 'core', 'hinge', 'squat'],
}

const TARGET_AREA_PATTERNS: Record<string, MovementPattern[]> = {
  full_body: ['squat', 'hinge', 'push', 'pull', 'conditioning', 'monostructural', 'core'],
  upper:     ['push', 'pull', 'gymnastics', 'core'],
  lower:     ['squat', 'hinge', 'lunge', 'jump'],
  core:      ['core', 'gymnastics', 'conditioning'],
}

type PickOptions = {
  preferEquipment?: Equipment
  usedModalities?: Set<Modality>
  usedPatternMod?: Set<string>
  smallTemplate?: boolean
}

function intensityFits(ex: Exercise, intensity: Intensity): boolean {
  if (intensity === 'low') return ex.intensity !== 'high'
  if (intensity === 'high') return ex.intensity !== 'low'
  return true
}

// Scores candidates so equipment representation stays primary, with a soft nudge
// toward an unused modality and a soft penalty for duplicating a (pattern, modality)
// pair in short templates. Soft scoring only — never filters a slot empty.
function pickExercise(
  pattern: MovementPattern,
  pool: Exercise[],
  used: Set<string>,
  intensity: Intensity,
  opts: PickOptions = {},
): Exercise | undefined {
  const candidates = pool.filter(
    (ex) => ex.movementPattern === pattern && !used.has(ex.id) && intensityFits(ex, intensity),
  )
  if (candidates.length === 0) return undefined

  const scored = candidates.map((ex) => {
    const mod = deriveModality(ex)
    let score = Math.random()
    if (opts.preferEquipment && ex.equipment.includes(opts.preferEquipment)) score += 10
    if (opts.usedModalities && !opts.usedModalities.has(mod)) score += 3
    if (opts.smallTemplate && opts.usedPatternMod?.has(`${pattern}|${mod}`)) score -= 5
    return { ex, score }
  })
  return scored.sort((a, b) => b.score - a.score)[0].ex
}

// Fills movement slots, cycling through non-bodyweight equipment so each selected
// implement is represented, while nudging the WOD to mix modal domains (M/G/W).
function fillMovementSlots(
  template: WodTemplate,
  pool: Exercise[],
  featured: Equipment[],
  request: WodRequest,
  state: RepSchemeState,
): PrescribedMovement[] {
  const used = new Set<string>()
  const usedModalities = new Set<Modality>()
  const usedPatternMod = new Set<string>()
  const smallTemplate = template.movementSlots.length <= 3
  const filled: { pattern: MovementPattern; ex: Exercise }[] = []
  const movements: PrescribedMovement[] = []
  let equipIdx = 0

  for (const slot of template.movementSlots) {
    const preferEquipment = featured.length > 0 ? featured[equipIdx % featured.length] : undefined
    const ex = pickExercise(slot.pattern, pool, used, request.intensity, {
      preferEquipment,
      usedModalities,
      usedPatternMod,
      smallTemplate,
    })
    if (!ex) continue
    used.add(ex.id)
    if (featured.length > 0) equipIdx++
    if (slot.repSchemeOverride) state.resolvedKind = slot.repSchemeOverride

    const mod = deriveModality(ex)
    usedModalities.add(mod)
    usedPatternMod.add(`${slot.pattern}|${mod}`)
    filled.push({ pattern: slot.pattern, ex })
    movements.push(prescribe(ex, slot, template, request, state))
  }

  return rebalanceModalities(filled, movements, pool, request, state, template)
}

function prescribe(
  ex: Exercise,
  slot: WodTemplate['movementSlots'][number],
  template: WodTemplate,
  request: WodRequest,
  state: RepSchemeState,
): PrescribedMovement {
  const loadNote = ex.rxLoad ? scaleLoad(ex.rxLoad, request.skillLevel) : undefined
  const pm = prescribeReps(
    ex, slot.repScheme,
    { intensity: request.intensity, timeAvailable: request.timeAvailable, movementCount: template.movementSlots.length, format: template.format },
    state, loadNote,
  )
  const withMod: PrescribedMovement = {
    ...pm,
    modality: deriveModality(ex),
    slotPattern: slot.pattern,
    slotRepScheme: slot.repScheme,
  }
  return ex.coachingCue ? { ...withMod, coachingCue: ex.coachingCue } : withMod
}

// Cross-modal safety net: if a multi-movement WOD ended up single-modality, try to
// swap the last movement for a same-pattern exercise in a different modality.
function rebalanceModalities(
  filled: { pattern: MovementPattern; ex: Exercise }[],
  movements: PrescribedMovement[],
  pool: Exercise[],
  request: WodRequest,
  state: RepSchemeState,
  template: WodTemplate,
): PrescribedMovement[] {
  if (filled.length < 2) return movements
  const modalities = new Set(filled.map((f) => deriveModality(f.ex)))
  if (modalities.size > 1) return movements

  const lastIdx = filled.length - 1
  const last = filled[lastIdx]
  const lastModality = deriveModality(last.ex)
  const usedIds = new Set(filled.map((f) => f.ex.id))

  const alt = pool.filter(
    (ex) =>
      ex.movementPattern === last.pattern &&
      !usedIds.has(ex.id) &&
      deriveModality(ex) !== lastModality &&
      intensityFits(ex, request.intensity),
  ).sort(() => Math.random() - 0.5)[0]
  if (!alt) return movements

  const slot = template.movementSlots[lastIdx]
  movements[lastIdx] = prescribe(alt, slot, template, request, state)
  return movements
}

// ── Loading helpers ──────────────────────────────────────────────────────────

function scaleLoad(rxLoad: { male: string; female: string }, skillLevel: string): string {
  if (skillLevel === 'advanced') return `${rxLoad.male} / ${rxLoad.female}`
  if (skillLevel === 'intermediate') return `${rxLoad.male} / ${rxLoad.female} (scale if needed)`
  return `Light — scale as needed`
}

// ── Title builder ────────────────────────────────────────────────────────────

function buildTitle(template: WodTemplate, movements: PrescribedMovement[], duration: number): string {
  const moveNames = movements.slice(0, 3).map((m) => m.name).join(' / ')
  if (template.format === 'For Time') {
    const first = movements[0]
    const prefix = first.rounds ? `${first.rounds} Rounds` : ''
    return prefix ? `${prefix} For Time — ${moveNames}` : `For Time — ${moveNames}`
  }
  return `${duration}-Min ${template.format} — ${moveNames}`
}

// ── WOD generation ──────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function generateWod(rawRequest: WodRequest): GeneratedWod {
  WodRequestSchema.parse(rawRequest)

  const request = { ...rawRequest }
  const equipment = normalizeEquipment(request.equipment as Equipment[])
  const bodyweightOnly = equipment.length === 1 && equipment[0] === 'bodyweight'

  const exercisePool = filterExercises(request, equipment)
  const templates = filterTemplates(request, bodyweightOnly)
  const template = pickTemplate(templates, request)

  const goalPatterns = new Set(GOAL_PATTERNS[request.goal] ?? [])
  const areaPatterns = new Set(TARGET_AREA_PATTERNS[request.targetArea] ?? [])

  const sortedPool = [...exercisePool].sort((a, b) => {
    const aScore = (goalPatterns.has(a.movementPattern) ? 1 : 0) + (areaPatterns.has(a.movementPattern) ? 1 : 0)
    const bScore = (goalPatterns.has(b.movementPattern) ? 1 : 0) + (areaPatterns.has(b.movementPattern) ? 1 : 0)
    return bScore - aScore
  })

  const exercisesByName = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e]))

  const featured = equipment.filter((e) => e !== 'bodyweight')
  const state: RepSchemeState = {}
  const movements = fillMovementSlots(template, sortedPool, featured, request, state)

  const resolvedScheme = state.resolvedKind ?? selectRepSchemeKind(
    'medium', template.format, template.movementSlots.length, request.intensity, request.timeAvailable,
  )

  const workoutText = buildWorkoutText(movements, template.format, request.timeAvailable, resolvedScheme)
  const scaling = buildScaling(movements, EXERCISES, resolvedScheme)
  const scalingTiers = buildScalingTiers(movements, EXERCISES, resolvedScheme)
  const brief = buildBrief(template, resolvedScheme, request, movements)

  const usedPatterns = movements
    .map((m) => EXERCISES.find((e) => e.id === m.exerciseId)?.movementPattern)
    .filter((p): p is MovementPattern => p !== undefined)
  const warmup = request.includeWarmup === false
    ? undefined
    : buildWarmup(usedPatterns, request)

  const substitutions = movements.map((m) => {
    const ex = EXERCISES.find((e) => e.id === m.exerciseId)
    if (!ex) return { movement: m.name, alternatives: [] }
    return { movement: ex.name, alternatives: getSubstitutions(ex, equipment, exercisesByName) }
  })

  return {
    id: generateId(),
    title: buildTitle(template, movements, request.timeAvailable),
    format: template.format,
    durationMinutes: request.timeAvailable,
    summary: `${template.movementSlots.length}-movement ${template.format} at ${request.intensity} intensity`,
    workoutText,
    movements,
    scoreType: template.scoreType,
    stimulus: brief.feel,
    scaling,
    substitutions,
    safetyNote: DEFAULT_SAFETY_NOTE,
    brief,
    warmup,
    scalingTiers,
    resolvedScheme,
    request,
  }
}

export function swapMovement(wod: GeneratedWod, movementIndex: number): GeneratedWod {
  const movement = wod.movements[movementIndex]
  if (!movement?.slotPattern) return wod

  const equipment = normalizeEquipment(wod.request.equipment as Equipment[])
  const pool = filterExercises(wod.request, equipment)

  const usedIds = new Set(
    wod.movements.filter((_, i) => i !== movementIndex).map((m) => m.exerciseId),
  )

  const newEx = pickExercise(movement.slotPattern, pool, usedIds, wod.request.intensity)
  if (!newEx) return wod

  const newMovement: PrescribedMovement = {
    exerciseId: newEx.id,
    name: newEx.name,
    reps:      movement.reps,
    rounds:    movement.rounds,
    duration:  movement.duration,
    distance:  movement.distance,
    calories:  movement.calories,
    loadNote:  newEx.rxLoad ? scaleLoad(newEx.rxLoad, wod.request.skillLevel) : undefined,
    coachingCue: newEx.coachingCue,
    modality:  deriveModality(newEx),
    slotPattern:   movement.slotPattern,
    slotRepScheme: movement.slotRepScheme,
  }

  const newMovements = wod.movements.map((m, i) => (i === movementIndex ? newMovement : m))
  const exercisesByName = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e]))

  const workoutText = buildWorkoutText(newMovements, wod.format, wod.durationMinutes, wod.resolvedScheme)
  const scaling = buildScaling(newMovements, EXERCISES, wod.resolvedScheme)
  const scalingTiers = buildScalingTiers(newMovements, EXERCISES, wod.resolvedScheme)
  const substitutions = newMovements.map((m) => {
    const ex = EXERCISES.find((e) => e.id === m.exerciseId)
    if (!ex) return { movement: m.name, alternatives: [] }
    return { movement: ex.name, alternatives: getSubstitutions(ex, equipment, exercisesByName) }
  })
  const title = movementIndex < 3
    ? buildTitle({ format: wod.format } as WodTemplate, newMovements, wod.durationMinutes)
    : wod.title

  return { ...wod, title, workoutText, movements: newMovements, scaling, substitutions, scalingTiers }
}
