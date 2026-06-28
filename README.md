# WOD Creator

A WOD generation engine — not a fixed workout library. Enter your equipment, time, intensity, skill level, goal, and movement limitations, and get a complete, safe, structured CrossFit-style workout every time.

**Generated WODs include:**
- Format: AMRAP, EMOM, For Time, Intervals, Strength + Metcon
- Movement list with reps / rounds / intervals
- Score type and stimulus explanation
- Scaling options (easier and harder)
- Equipment substitutions
- Safety notes

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Zod for runtime validation

## Data Pipeline

The production exercise database is populated from external sources — not hardcoded:

```
API Ninjas / wger → sync script → exercises.json → generator → WOD
```

## Dev

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript compiler check |
| `npm run verify` | Lint + typecheck |
| `npm run sync:exercises` | Sync exercises from wger API into exercises.json |
| `npm run scrape:crossfit` | Scrape CrossFit benchmark WODs for pattern data |
| `npm run derive:patterns` | Derive rep scheme / pairing patterns from scraped data |

## Project Spec

See `.claude/wod-builder-agent-handoff.md` for the full product spec including data models, generator rules, and acceptance criteria.
