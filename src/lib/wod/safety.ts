import type { Difficulty } from './types'

export const DEFAULT_SAFETY_NOTE =
  'This workout is general fitness information, not medical advice. Stop if you feel pain, dizziness, chest pain, or unusual shortness of breath. Scale load, reps, and range of motion to your ability.'

// Movements that should never appear in beginner WODs
const BEGINNER_FORBIDDEN = new Set([
  'muscle-up',
  'chest-to-bar',
  'hspu',
  'handstand-hold',
  'wall-walk',
  'pistol',
  'overhead-squat',
  'squat-clean',
  'power-snatch',
  'ring-dip',
  'ghd-sit-up',
  'front-squat',
])

export function isForbiddenForSkill(exerciseId: string, skillLevel: Difficulty): boolean {
  if (skillLevel === 'beginner') return BEGINNER_FORBIDDEN.has(exerciseId)
  return false
}

// Movements to avoid or deprioritize for common limitations
export const LIMITATION_AVOID: Record<string, string[]> = {
  knee_pain: ['box-jump', 'jumping-lunge', 'jump-squat', 'broad-jump', 'skater-hop', 'pistol'],
  shoulder_pain: ['hspu', 'handstand-hold', 'wall-walk', 'push-press', 'strict-press', 'db-push-press', 'overhead-squat'],
  lower_back_pain: ['deadlift', 'good-morning', 'romanian-deadlift', 'ghd-sit-up', 'power-snatch', 'squat-clean'],
  wrist_pain: ['push-up', 'handstand-hold', 'wall-walk', 'ring-dip', 'plank'],
}
