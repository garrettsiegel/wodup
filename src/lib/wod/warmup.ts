import type { Equipment, MovementPattern, WarmupBlock, WodRequest } from './types'
import { LIMITATION_AVOID } from './safety'

// Movement-specific ramp-up drills keyed by the pattern present in the WOD.
const PATTERN_WARMUP: Record<MovementPattern, string[]> = {
  squat: ['10 air squats', '10 slow tempo squats (3 sec down)'],
  hinge: ['10 good mornings (empty bar or PVC)', '10 light Romanian deadlifts'],
  push: ['10 scap push-ups', '10 light presses or push-ups'],
  pull: ['10 scap pull-ups / hangs', '10 ring rows'],
  lunge: ['10 walking lunges', '10 cossack squats'],
  carry: ['1 short light carry down and back'],
  core: ['30 sec plank', '10 slow hollow rocks'],
  jump: ['20 sec easy jump rope', '10 low box step-ups'],
  monostructural: ['1–2 min easy on the machine, building pace'],
  olympic_lift: ['Empty-bar complex: 5 high pulls + 5 front squats + 5 push presses', '5 muscle snatches (empty bar)'],
  gymnastics: ['Skill practice: 3–5 controlled reps of the gymnastics movement', '20 sec hollow / arch holds'],
  conditioning: ['10 slow burpees, building speed', '10 mountain-climber pairs'],
}

const CARDIO_BY_EQUIPMENT: { equip: Equipment; line: string }[] = [
  { equip: 'rower', line: '2 min easy row, building pace each 30 sec' },
  { equip: 'bike', line: '2 min easy bike, building pace each 30 sec' },
  { equip: 'ski_erg', line: '2 min easy ski, building pace each 30 sec' },
  { equip: 'jump_rope', line: '2 min easy jump rope (singles), with short breaks' },
]

const BODYWEIGHT_CARDIO = '2 min easy jog in place or jumping jacks, building pace'

// Builds a tailored warm-up: general cardio flush + movement-specific prep for
// the patterns actually in the WOD, skipping prep that aggravates a stated limitation.
export function buildWarmup(patterns: MovementPattern[], request: WodRequest): WarmupBlock {
  const equipSet = new Set<Equipment>(request.equipment)
  const cardio = CARDIO_BY_EQUIPMENT.find((c) => equipSet.has(c.equip))
  const generalCardio = cardio ? cardio.line : BODYWEIGHT_CARDIO

  const avoid = new Set<string>()
  for (const limitation of request.limitations ?? []) {
    const key = limitation.toLowerCase().replace(/\s+/g, '_')
    for (const id of LIMITATION_AVOID[key] ?? []) avoid.add(id)
  }

  const seen = new Set<MovementPattern>()
  const movementPrep: string[] = []
  for (const p of patterns) {
    if (seen.has(p)) continue
    seen.add(p)
    // Skip a prep drill whose own movement id matches an avoided movement.
    for (const drill of PATTERN_WARMUP[p]) {
      if (!isAvoidedDrill(drill, avoid)) movementPrep.push(drill)
    }
  }

  return { generalCardio, movementPrep }
}

function isAvoidedDrill(drill: string, avoid: Set<string>): boolean {
  if (avoid.size === 0) return false
  const lower = drill.toLowerCase()
  for (const id of avoid) {
    if (lower.includes(id.replace(/-/g, ' '))) return true
  }
  return false
}
