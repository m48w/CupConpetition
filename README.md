# CupFlow

Responsive React + TypeScript + Vite frontend for a one-day futsal tournament.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts Vite together with the Cloudflare Worker and its Durable Object in the local
workerd runtime. Tournament data is kept in `.wrangler/state/` (not committed).

## Checks

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
```

## Deploy to Cloudflare

```bash
npx wrangler login   # once per machine
npm run deploy
```

The app runs as one Worker (`velocity-cup`) that serves the built SPA and handles `/api/*`. All
tournament state lives in a single SQLite-backed Durable Object (`TournamentRoom`) and is pushed to
every open page over WebSocket.
