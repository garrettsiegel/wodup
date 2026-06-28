/**
 * CrossFit.com WOD archive scraper — ADMIN USE ONLY
 *
 * CrossFit's Terms of Service prohibit data mining and scraping.
 * This script is disabled by default and must be explicitly enabled
 * with --confirm-tos. Do NOT run this in production or on a schedule.
 *
 * Usage: tsx --tsconfig tsconfig.scripts.json src/scripts/scrape-crossfit.ts --confirm-tos
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { parseWodText } from './parse-wod.js'
import type { ParsedWod } from './parse-wod.js'

const OUT_DIR = join(fileURLToPath(import.meta.url), '../../../src/data')

if (!process.argv.includes('--confirm-tos')) {
  console.error(
    'CrossFit.com ToS prohibits data mining and scraping.\n' +
    'If you have reviewed the ToS and accept responsibility, re-run with --confirm-tos.\n' +
    'This script is for local development analysis only — do not run in CI or production.',
  )
  process.exit(1)
}

// Polite scrape: fetch 90 days of WODs with 1s delay between requests
const DAYS_TO_FETCH = 90
const DELAY_MS = 1000

type ScrapeResult = {
  date: string
  url: string
  parsed: ParsedWod | null
  rawText?: string
  error?: string
}

function dateRange(days: number): string[] {
  const dates: string[] = []
  for (let i = 1; i <= days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    dates.push(`${yyyy}/${mm}/${dd}`)
  }
  return dates
}

function extractWodText(html: string): string {
  // CrossFit.com workout content sits inside elements with class patterns like
  // "workout-details", "wod-text", or inside <article> tags.
  // We extract text between common markers and strip HTML tags.
  const stripped = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Heuristic: the WOD content is usually a dense block of short lines
  // between the title and scaling sections. Extract lines with digits.
  const lines = stripped.split('\n').filter((l) => l.trim())
  const wodLines: string[] = []
  let inWod = false

  for (const line of lines) {
    const t = line.trim()
    if (!inWod && /\d+[-\s]?(round|amrap|emom|rep|min)/i.test(t)) {
      inWod = true
    }
    if (inWod) {
      if (/^(scaling|level|coach|notes?|equipment|warm.?up)/i.test(t)) break
      wodLines.push(t)
      if (wodLines.length > 20) break
    }
  }

  return wodLines.join('\n')
}

async function fetchWod(date: string): Promise<ScrapeResult> {
  const url = `https://www.crossfit.com/workout/${date}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WOD-Creator-Research/1.0 (local dev only)' },
    })
    if (!res.ok) return { date, url, parsed: null, error: `HTTP ${res.status}` }
    const html = await res.text()
    const rawText = extractWodText(html)
    const parsed = rawText ? parseWodText(rawText) : null
    return { date, url, parsed, rawText }
  } catch (err) {
    return { date, url, parsed: null, error: String(err) }
  }
}

async function main() {
  console.warn('Starting CrossFit.com WOD archive scrape (90 days)...')
  console.warn('Polite scraping: 1s delay between requests.\n')

  const dates = dateRange(DAYS_TO_FETCH)
  const results: ScrapeResult[] = []

  for (const date of dates) {
    process.stdout.write(`  ${date}... `)
    const result = await fetchWod(date)
    results.push(result)
    if (result.error) {
      process.stdout.write(`ERROR: ${result.error}\n`)
    } else if (result.parsed) {
      process.stdout.write(`OK (${result.parsed.format})\n`)
    } else {
      process.stdout.write(`skipped (no parseable WOD)\n`)
    }
    await new Promise((r) => setTimeout(r, DELAY_MS))
  }

  const parsed = results.filter((r) => r.parsed !== null)
  console.warn(`\nParsed ${parsed.length} / ${results.length} WODs`)

  mkdirSync(OUT_DIR, { recursive: true })
  const outFile = join(OUT_DIR, 'crossfit-raw.json')
  writeFileSync(outFile, JSON.stringify(results, null, 2))
  console.warn(`Wrote ${outFile}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
