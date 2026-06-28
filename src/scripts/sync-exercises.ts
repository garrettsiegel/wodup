import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { WgerProvider } from './providers/wger.js'
import { EXERCISES as SEED } from '../lib/wod/exercises.seed.js'
import type { Exercise } from '../lib/wod/types.js'

const OUT_DIR = join(fileURLToPath(import.meta.url), '../../../src/data')
const OUT_FILE = join(OUT_DIR, 'exercises.json')

function mergeExercises(seedList: Exercise[], apiList: Exercise[]): Exercise[] {
  const merged = new Map<string, Exercise>()

  // Seed exercises take priority (they have CrossFit-specific fields: rxLoad, substitutions, etc.)
  for (const ex of seedList) merged.set(ex.id, ex)

  // wger fills in exercises that aren't already in the seed
  for (const ex of apiList) {
    if (!merged.has(ex.id)) merged.set(ex.id, ex)
  }

  return [...merged.values()]
}

async function main() {
  console.warn('Fetching exercises from wger...')
  const provider = new WgerProvider()
  let wgerExercises: Exercise[] = []

  try {
    wgerExercises = await provider.fetchAll()
    console.warn(`Fetched ${wgerExercises.length} exercises from wger`)
  } catch (err) {
    console.error('wger fetch failed — using seed only:', err)
  }

  const merged = mergeExercises(SEED, wgerExercises)
  console.warn(`Total exercises after merge: ${merged.length}`)

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(merged, null, 2))
  console.warn(`Wrote ${OUT_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
