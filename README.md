# CupFlow

Responsive React + TypeScript + Vite frontend for a one-day futsal tournament.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars   # local passwords: superadmin1234 / subadmin1234
npm run dev
```

`npm run dev` starts Vite together with the Cloudflare Worker and its Durable Object in the local
workerd runtime. Tournament matches, teams, and team logos are kept in SQLite under
`.wrangler/state/` (not committed).

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

The tournament app is served under `/20261220/`; the site root `/` returns 404. Staff sign in at
`/20261220/admin`. The previous `/superadmin` and `/subadmin` URLs redirect to the admin sign-in
page. The admin dashboard assigns `subadmin1`–`2` to Court 1, `3`–`4` to Court 2, and `5`–`6` to
Court 3. Changing `SESSION_SECRET` signs everyone out.

- Sessions last 12 hours: sign in on the morning of the event, not the night before.
- The session cookie is `Secure`, so testing from a phone against the dev server over
  `http://<LAN IP>` will not keep you signed in; use `localhost` or an https tunnel.

The app runs as one Worker (`velocity-cup`) that serves the built SPA under `/20261220/` and handles
`/api/*`. Public pages include the overview, teams, matches, groups, live matches, standings, and
knockout bracket. All tournament state lives in a single SQLite-backed Durable Object
(`TournamentRoom`) and is pushed to every open page over WebSocket.

Team representatives register at `/registration/20261220/`. Member access is verified against the
registered email and phone; registration sessions last one hour. Member entry closes at 23:59 JST
on 12 December 2026, with a server-side 11-player limit per team. Super Admins can review
registrations and update shared club logos at `/20261220/admin/registrations`. A representative must
upload a shared club logo with each team registration; a multi-team application can submit several
distinct team names from the same club at once. Additional teams may reuse the registered contact
details. Registration
records are kept separate from the fixed match schedule until an administrator assigns teams to
match slots.
