import type { Exercise } from '../lib/wod/types.js'

export interface ExerciseProvider {
  fetchAll(): Promise<Exercise[]>
}
