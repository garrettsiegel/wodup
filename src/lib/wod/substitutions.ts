import type { Exercise, Equipment } from './types'

export function getSubstitutions(
  exercise: Exercise,
  availableEquipment: Equipment[],
  exercisesByName: Map<string, Exercise>,
): string[] {
  const equipSet = new Set(availableEquipment)

  return exercise.substitutions.filter((subName) => {
    const sub = exercisesByName.get(subName.toLowerCase())
    if (!sub) return true // unknown sub — include as free-text note
    return sub.equipment.some((eq) => equipSet.has(eq))
  })
}
