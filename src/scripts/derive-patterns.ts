/**
 * Derives rep scheme and movement pairing patterns from the scraped CrossFit raw data.
 * Input: src/data/crossfit-raw.json (produced by scrape-crossfit.ts)
 * Output: src/data/derived-patterns.json (committed, used by generator)
 *
 * Usage: tsx --tsconfig tsconfig.scripts.json src/scripts/derive-patterns.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import type { ParsedWod } from './parse-wod.js'

const DATA_DIR = join(fileURLToPath(import.meta.url), '../../../src/data')
const RAW_FILE = join(DATA_DIR, 'crossfit-raw.json')
const OUT_FILE = join(DATA_DIR, 'derived-patterns.json')

type ScrapeResult = { date: string; parsed: ParsedWod | null }

export type DerivedPatterns = {
  // How often each rep scheme appears per format
  repSchemeDistribution: Record<string, Record<string, number>>
  // Top ladder sets (e.g. [21,15,9] appears N times)
  ladderFrequency: { sets: number[]; count: number }[]
  // Top rounds counts
  roundsFrequency: { rounds: number; count: number }[]
  // Most common movement pairs per format
  movementPairs: { format: string; pair: string[]; count: number }[]
  // Computed from: N WODs over M days
  meta: { totalWods: number; parsedWods: number; generatedAt: string }
}

function tally<K extends string | number>(map: Map<K, number>, key: K) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function topN<T>(entries: [T, number][], n: number): { value: T; count: number }[] {
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }))
}

function derivePatterns(wods: ParsedWod[]): DerivedPatterns {
  const schemeByFormat = new Map<string, Map<string, number>>()
  const ladderMap = new Map<string, number>()
  const roundsMap = new Map<number, number>()
  const pairMap = new Map<string, { format: string; pair: string[]; count: number }>()

  for (const wod of wods) {
    const fmt = wod.format
    if (!schemeByFormat.has(fmt)) schemeByFormat.set(fmt, new Map())
    tally(schemeByFormat.get(fmt)!, wod.repScheme)

    if (wod.ladderSets) {
      tally(ladderMap, wod.ladderSets.join('-'))
    }
    if (wod.rounds != null) {
      tally(roundsMap, wod.rounds)
    }

    // Build movement pairs
    const names = wod.movements.map((m) => m.name.toLowerCase())
    for (let i = 0; i < names.length - 1; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = `${fmt}::${[names[i], names[j]].sort().join('|')}`
        if (!pairMap.has(key)) {
          pairMap.set(key, { format: fmt, pair: [names[i], names[j]], count: 0 })
        }
        pairMap.get(key)!.count++
      }
    }
  }

  const repSchemeDistribution: Record<string, Record<string, number>> = {}
  for (const [fmt, counts] of schemeByFormat) {
    repSchemeDistribution[fmt] = Object.fromEntries(counts)
  }

  const ladderFrequency = topN([...ladderMap.entries()], 10).map(({ value, count }) => ({
    sets: value.split('-').map(Number),
    count,
  }))

  const roundsFrequency = topN([...roundsMap.entries()], 10).map(({ value, count }) => ({
    rounds: value,
    count,
  }))

  const movementPairs = [...pairMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)

  return {
    repSchemeDistribution,
    ladderFrequency,
    roundsFrequency,
    movementPairs,
    meta: {
      totalWods: wods.length,
      parsedWods: wods.filter((w) => w.movements.length > 0).length,
      generatedAt: new Date().toISOString(),
    },
  }
}

function main() {
  if (!existsSync(RAW_FILE)) {
    console.error(`${RAW_FILE} not found. Run npm run scrape:crossfit first.`)
    process.exit(1)
  }

  const raw: ScrapeResult[] = JSON.parse(readFileSync(RAW_FILE, 'utf8'))
  const wods = raw.flatMap((r) => r.parsed ? [r.parsed] : [])

  console.warn(`Analyzing ${wods.length} parsed WODs...`)
  const patterns = derivePatterns(wods)

  writeFileSync(OUT_FILE, JSON.stringify(patterns, null, 2))
  console.warn(`Wrote ${OUT_FILE}`)
  console.warn(`Top ladders: ${patterns.ladderFrequency.slice(0, 3).map((l) => l.sets.join('-')).join(', ')}`)
  console.warn(`Top rounds: ${patterns.roundsFrequency.slice(0, 3).map((r) => `${r.rounds}×`).join(', ')}`)
}

main()
