import type { CoachBrief, Modality, PrescribedMovement, WodRequest, WodTemplate } from './types'
import type { RepSchemeKind } from './scoring'
import { describeStimulusFor } from './scoring'

// Builds a coach's whiteboard brief: target score, how it feels, pacing, scale trigger.
export function buildBrief(
  template: WodTemplate,
  scheme: RepSchemeKind | undefined,
  request: WodRequest,
  movements: PrescribedMovement[],
): CoachBrief {
  return {
    targetScore: buildTargetScore(template, scheme, request),
    feel: describeStimulusFor(request.intensity, template.format),
    pacing: buildPacing(movements, template),
    scaleWhen: buildScaleWhen(request.intensity, scheme),
  }
}

function buildTargetScore(
  template: WodTemplate,
  scheme: RepSchemeKind | undefined,
  request: WodRequest,
): string {
  const t = request.timeAvailable

  if (template.scoreType === 'load') {
    return 'Build to a heavy but technically sound set; the metcon is the score-maker, not a max-out.'
  }
  if (template.format === 'AMRAP') {
    // Rough round estimate: a round of mixed-modal work runs ~60-90s.
    const lo = Math.max(2, Math.floor(t / 1.5))
    const hi = Math.max(lo + 1, Math.floor(t / 1.0))
    return `Target roughly ${lo}–${hi} rounds. Pick a number you can defend and chase it.`
  }
  if (template.format === 'EMOM') {
    return 'Finish each minute with 10–20 sec to spare — if you can’t, scale the reps.'
  }
  if (template.format === 'Intervals') {
    return 'Hold a repeatable output across every work interval — first and last should match.'
  }
  if (template.format === 'For Time') {
    const cap = scheme?.kind === 'chipper' ? t : Math.round(t * 1.1)
    return `Aim to finish well under the ${cap}-min cap; if you’re past two-thirds time at the halfway mark, scale.`
  }
  return 'Move with intent and keep a steady, repeatable pace.'
}

function buildPacing(movements: PrescribedMovement[], template: WodTemplate): string {
  const present = new Set<Modality>()
  for (const m of movements) if (m.modality) present.add(m.modality)

  const hasM = present.has('M')
  const hasW = present.has('W')
  const hasG = present.has('G')

  if (hasM && present.size === 1) {
    return 'Settle into a sustainable breathing rhythm on the engine work — negative-split it rather than blowing up early.'
  }
  if (hasW && hasG) {
    return 'Break the loaded movement into planned sets before you fail, and cycle the gymnastics unbroken while it’s cheap.'
  }
  if (hasM && hasW) {
    return 'Use the cardio piece as active recovery between barbell sets — keep moving, keep breathing.'
  }
  if (hasM && hasG) {
    return 'Keep transitions tight; the monostructural work is where you make up or lose time.'
  }
  if (template.format === 'AMRAP') {
    return 'Pick a pace you can hold for the whole window — consistency beats a fast first round.'
  }
  return 'Find a rhythm early and hold it; smooth is fast.'
}

function buildScaleWhen(intensity: string, scheme: RepSchemeKind | undefined): string {
  if (scheme?.kind === 'descending_ladder' || scheme?.kind === 'chipper') {
    return 'Scale loads or reps if any single set drops below a few unbroken reps or your rest balloons.'
  }
  if (scheme?.kind === 'fixed_rounds') {
    return 'Scale if a round takes much longer than ~90 sec or your sets break more than twice.'
  }
  if (intensity === 'high') {
    return 'Scale the moment your form degrades — intensity is worthless without sound mechanics.'
  }
  return 'Scale load, reps, or range of motion to keep moving without long pauses.'
}
