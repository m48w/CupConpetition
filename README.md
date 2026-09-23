# CupFlow

Responsive React + TypeScript + Vite frontend for a one-day futsal tournament.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Included in this first slice

- Responsive desktop sidebar and mobile bottom navigation
- Overview, match schedule, live centre, standings, and knockout bracket routes
- Round-robin fixture data for 8 groups of 5 teams
- Standings calculation using points, goal difference, and goals scored
- Admin match controls for start, pause, finish, and score changes
- SuperAdmin setup surface with schedule-generation status

The current data source is an in-memory fixture store so the UI can be developed independently of the API. The `Match`, `Team`, and standings logic are isolated in `src/types.ts`, `src/data.ts`, and `src/logic.ts` for a later D1/Pages Functions integration.
