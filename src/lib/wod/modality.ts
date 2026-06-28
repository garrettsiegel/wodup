import type { Equipment, Exercise, Modality } from './types'

// Pure cardio implements — define the Metabolic-conditioning domain.
export const M_EQUIPMENT = new Set<Equipment>(['rower', 'bike', 'ski_erg', 'jump_rope'])

// External-load implements — define the Weightlifting domain.
export const LOADED = new Set<Equipment>([
  'barbell', 'dumbbells', 'kettlebell', 'sandbag', 'wall_ball', 'medicine_ball', 'sled',
])

const cache = new Map<string, Modality>()

// Derives the CrossFit modal domain (M/G/W) from an exercise's pattern + equipment.
// Bodyweight wins over load so an unloaded movement listing a station (box/rings/bar)
// still reads as Gymnastics; loaded movements in the seed don't list 'bodyweight'.
export function deriveModality(ex: Exercise): Modality {
  if (ex.modality) return ex.modality
  const cached = cache.get(ex.id)
  if (cached) return cached

  const result = compute(ex)
  cache.set(ex.id, result)
  return result
}

function compute(ex: Exercise): Modality {
  if (ex.movementPattern === 'monostructural') return 'M'
  if (ex.equipment.length > 0 && ex.equipment.every((e) => M_EQUIPMENT.has(e))) return 'M'
  if (ex.movementPattern === 'olympic_lift') return 'W'
  if (ex.equipment.includes('bodyweight')) return 'G'
  if (ex.equipment.some((e) => LOADED.has(e))) return 'W'
  if (ex.movementPattern === 'gymnastics') return 'G'
  return 'G'
}
