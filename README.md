# CupFlow

Responsive React + TypeScript + Vite frontend for a one-day futsal tournament.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars   # local passwords: superadmin1234 / subadmin1234
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
npx wrangler login                          # once per machine
npx wrangler secret put SUPERADMIN_PASSWORD # password for "superadmin"
npx wrangler secret put SUBADMIN_PASSWORD   # shared by subadmin1–subadmin6
npx wrangler secret put SESSION_SECRET      # a long random string, e.g. `openssl rand -base64 32`
npm run deploy
```

Staff sign in at `/superadmin` (all courts) and `/subadmin` (`subadmin1`–`2` → Court 1,
`3`–`4` → Court 2, `5`–`6` → Court 3). The header links to these pages only in development.
Changing `SESSION_SECRET` signs everyone out.

- Sessions last 12 hours: sign in on the morning of the event, not the night before.
- The session cookie is `Secure`, so testing from a phone against the dev server over
  `http://<LAN IP>` will not keep you signed in; use `localhost` or an https tunnel.

The app runs as one Worker (`velocity-cup`) that serves the built SPA and handles `/api/*`. All
tournament state lives in a single SQLite-backed Durable Object (`TournamentRoom`) and is pushed to
every open page over WebSocket.
