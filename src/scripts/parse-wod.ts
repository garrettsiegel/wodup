import type { WodFormat } from '../lib/wod/types.js'

export type ParsedMovement = {
  name: string
  reps?: number
  calories?: number
  distance?: string
  load?: string
}

export type RepSchemeKind = 'ladder' | 'rounds' | 'chipper' | 'single' | 'amrap_fixed' | 'unknown'

export type ParsedWod = {
  format: WodFormat
  durationMinutes?: number
  movements: ParsedMovement[]
  repScheme: RepSchemeKind
  ladderSets?: number[]
  rounds?: number
  scoreType: 'time' | 'rounds_reps' | 'load' | 'completed'
}

// Matches: "21-15-9", "10-8-6", "50-40-30-20-10"
const LADDER_RE = /(\d+(?:-\d+){1,4})\s+(?:rep[s]?\s+)?(?:of\s+)?:?/i

// Matches: "5 rounds", "3 rounds for time", "3 rounds of"
const ROUNDS_RE = /(\d+)\s+rounds?\s*(?:for\s+time|of)?:?/i

// Matches: "15-minute amrap", "amrap 20 minutes", "amrap in 20"
const AMRAP_RE = /(?:(\d+)[\s-]minute\s+amrap|amrap[\s:]+(\d+)\s+min)/i

// Matches: "emom 12 minutes", "12-minute emom"
const EMOM_RE = /(?:(\d+)[\s-]minute\s+emom|emom[\s:]+(\d+)\s+min)/i

// Matches: "30 burpees", "21 thrusters (95/65)", "400m run", "15 cal row"
const MOVEMENT_RE = /^\s*(\d+)\s+(cal(?:orie)?s?\s+)?([a-z][a-z\s/-]+?)(?:\s*\(([^)]+)\))?\s*$/i
const DISTANCE_RE = /^\s*(\d+\s*(?:m|km|meters?|miles?))\s+([a-z][a-z\s/-]+?)\s*$/i

function parseSets(ladder: string): number[] {
  return ladder.split('-').map(Number)
}

function classifyRepScheme(sets: number[]): RepSchemeKind {
  if (sets.length === 1) return 'single'
  if (sets[0] > sets[sets.length - 1]) return sets.length >= 4 ? 'chipper' : 'ladder'
  return 'chipper'
}

function extractMovements(lines: string[]): ParsedMovement[] {
  const movements: ParsedMovement[] = []

  for (const line of lines) {
    const dist = line.match(DISTANCE_RE)
    if (dist) {
      movements.push({ name: dist[2].trim(), distance: dist[1].trim() })
      continue
    }

    const mov = line.match(MOVEMENT_RE)
    if (mov) {
      const reps = parseInt(mov[1])
      const isCal = !!mov[2]
      const name = mov[3].trim()
      const load = mov[4]?.trim()
      if (isCal) movements.push({ name, calories: reps, load })
      else movements.push({ name, reps, load })
    }
  }

  return movements
}

export function parseWodText(text: string): ParsedWod | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  const fullText = lines.join(' ')

  // AMRAP
  const amrapMatch = fullText.match(AMRAP_RE)
  if (amrapMatch) {
    const dur = parseInt(amrapMatch[1] ?? amrapMatch[2])
    return {
      format: 'AMRAP',
      durationMinutes: isNaN(dur) ? undefined : dur,
      movements: extractMovements(lines),
      repScheme: 'amrap_fixed',
      scoreType: 'rounds_reps',
    }
  }

  // EMOM
  const emomMatch = fullText.match(EMOM_RE)
  if (emomMatch) {
    const dur = parseInt(emomMatch[1] ?? emomMatch[2])
    return {
      format: 'EMOM',
      durationMinutes: isNaN(dur) ? undefined : dur,
      movements: extractMovements(lines),
      repScheme: 'amrap_fixed',
      scoreType: 'completed',
    }
  }

  // Descending ladder: "21-15-9 reps of..."
  const ladderMatch = fullText.match(LADDER_RE)
  if (ladderMatch) {
    const sets = parseSets(ladderMatch[1])
    return {
      format: 'For Time',
      movements: extractMovements(lines),
      repScheme: classifyRepScheme(sets),
      ladderSets: sets,
      scoreType: 'time',
    }
  }

  // Rounds
  const roundsMatch = fullText.match(ROUNDS_RE)
  if (roundsMatch) {
    const rounds = parseInt(roundsMatch[1])
    return {
      format: 'For Time',
      movements: extractMovements(lines),
      repScheme: 'rounds',
      rounds,
      scoreType: 'time',
    }
  }

  // Generic For Time fallback
  const movements = extractMovements(lines)
  if (movements.length > 0) {
    return {
      format: 'For Time',
      movements,
      repScheme: movements.length >= 5 ? 'chipper' : 'unknown',
      scoreType: 'time',
    }
  }

  return null
}
