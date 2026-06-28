export type Equipment =
  | 'bodyweight'
  | 'dumbbells'
  | 'kettlebell'
  | 'barbell'
  | 'pull_up_bar'
  | 'rings'
  | 'jump_rope'
  | 'box'
  | 'medicine_ball'
  | 'rower'
  | 'bike'
  | 'ski_erg'
  | 'sandbag'
  | 'wall_ball'
  | 'bench'
  | 'rope'
  | 'ghd'
  | 'sled'

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'push'
  | 'pull'
  | 'lunge'
  | 'carry'
  | 'core'
  | 'jump'
  | 'monostructural'
  | 'olympic_lift'
  | 'gymnastics'
  | 'conditioning'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type Intensity = 'low' | 'moderate' | 'high'
export type TimeDomain = 'short' | 'medium' | 'long'
export type RepScheme = 'low' | 'medium' | 'high' | 'time' | 'distance' | 'calories'
export type WodFormat = 'AMRAP' | 'EMOM' | 'For Time' | 'Intervals' | 'Strength + Metcon'
export type ScoreType = 'rounds_reps' | 'time' | 'load' | 'completed' | 'calories'
export type SpaceAvailable = 'small_room' | 'garage' | 'outdoor'

export type Goal =
  | 'conditioning'
  | 'strength'
  | 'fat_loss'
  | 'engine'
  | 'mixed'
  | 'mobility'

export type TargetArea = 'full_body' | 'upper' | 'lower' | 'core'

export type WorkoutType = 'amrap' | 'emom' | 'for_time' | 'intervals' | 'strength_metcon'

export type RxLoad = { male: string; female: string }

// CrossFit modal domain: Metabolic conditioning, Gymnastics, Weightlifting
export type Modality = 'M' | 'G' | 'W'

export type Exercise = {
  id: string
  name: string
  equipment: Equipment[]
  movementPattern: MovementPattern
  difficulty: Difficulty
  intensity: Intensity
  muscleGroups: string[]
  defaultRepRange: [number, number]
  timeDomainFit: TimeDomain[]
  substitutions: string[]
  avoidForBeginner?: boolean
  commonFaults?: string[]
  coachingCue?: string
  rxLoad?: RxLoad
  modality?: Modality
}

// When set, forces the rep scheme for all slots in this template
export type RepSchemeOverride =
  | { kind: 'descending_ladder'; sets: number[] }
  | { kind: 'fixed_rounds'; rounds: number; reps: number }
  | { kind: 'single_set'; reps: number }

export type MovementSlot = {
  pattern: MovementPattern
  required?: boolean
  repScheme: RepScheme
  repSchemeOverride?: RepSchemeOverride
}

export type WodTemplate = {
  id: string
  name: string
  format: WodFormat
  durationRange: [number, number]
  allowedIntensity: Intensity[]
  allowedSkillLevels: Difficulty[]
  movementSlots: MovementSlot[]
  scoreType: ScoreType
}

export type WodRequest = {
  equipment: Equipment[]
  timeAvailable: 8 | 10 | 12 | 15 | 20 | 30 | 45 | 60
  intensity: Intensity
  skillLevel: Difficulty
  goal: Goal
  targetArea: TargetArea
  workoutType?: WorkoutType
  spaceAvailable?: SpaceAvailable
  avoidMovements?: string[]
  limitations?: string[]
  includeWarmup?: boolean
}

export type PrescribedMovement = {
  exerciseId: string
  name: string
  reps?: number
  rounds?: number
  duration?: string
  distance?: string
  calories?: number
  loadNote?: string
  coachingCue?: string
  modality?: Modality
  slotPattern?: MovementPattern
  slotRepScheme?: RepScheme
}

// Coach's whiteboard brief — target, feel, pacing, scaling trigger
export type CoachBrief = {
  targetScore: string
  feel: string
  pacing: string
  scaleWhen: string
}

export type WarmupBlock = {
  generalCardio: string
  movementPrep: string[]
}

export type ScalingTiers = {
  rx: string[]
  scaled: string[]
  beginner: string[]
}

// Shared mutable state passed through all movement slots during generation
export type RepSchemeState = {
  resolvedKind?: RepSchemeOverride | import('./scoring').RepSchemeKind
}

export type GeneratedWod = {
  id: string
  title: string
  format: WodFormat
  durationMinutes: number
  summary: string
  workoutText: string
  movements: PrescribedMovement[]
  scoreType: ScoreType
  stimulus: string
  scaling: {
    easier: string[]
    harder: string[]
  }
  substitutions: {
    movement: string
    alternatives: string[]
  }[]
  safetyNote: string
  brief?: CoachBrief
  warmup?: WarmupBlock
  scalingTiers?: ScalingTiers
  resolvedScheme: import('./scoring').RepSchemeKind
  request: WodRequest
}
