# LinKing FC Discord Worker

Cloudflare Worker for LinKing FC slash commands and match signup. It lives in this repo. Stats stay in `data/*.json` written by `scripts/sync.py`. Firebase project `football-signup-64bd9` stores signup slots only.

```text
EA API
  → GitHub Actions (scripts/sync.py)
  → data/matches.json
    data/aggregated/board.json
    data/aggregated/board_last10.json
    data/meta.json
       ├─ GitHub Pages (existing UI)
       └─ this Worker (reads JSON)
Firebase signups/{YYYY-MM-DD}  ← /signup /cancel /list /call /teams only
```

`/sync` drops the Worker's 60-second JSON cache and reads the files again. It does not call EA and does not write matches into Firebase.

Public defaults (override with Wrangler vars):

| Var | Default |
| --- | --- |
| `CLUB_ID` | `41026` |
| `PLATFORM` | `common-gen5` |
| `SITE_URL` | `https://siumeifc1988-sketch.github.io/linking-fc-sync/` |
| `STATS_JSON_BASE` | `https://raw.githubusercontent.com/siumeifc1988-sketch/linking-fc-sync/main/data` |
| `FIREBASE_PROJECT_ID` | `football-signup-64bd9` |

`STATS_JSON_BASE` is the directory that contains `meta.json`, `matches.json`, and `aggregated/`. Point it at raw GitHub or at the Pages `data/` URL.

## Commands

| Command | What it does |
| --- | --- |
| `/signup` | Today (Asia/Hong_Kong) slot `2130` `2200` `2230` `2300` `Unsure` |
| `/cancel` | Remove yourself from today's slots |
| `/list` | Today's list |
| `/call` | Ping the role in `DISCORD_ROLE_ID`, or `@everyone` |
| `/teams` | Split everyone signed up today, using board ratings |
| `/player` | One player from `board.json` (近10 from `board_last10.json`) |
| `/rank` | 金靴 / 助攻 / 防守 / 評分 / 出勤 |
| `/matches` | Last 10 from `matches.json` |
| `/chat` | Cantonese coach note grounded on JSON. Optional Tavily snippet |
| `/sync` | Refresh JSON cache only |
| `/help` | This list |

Signup documents keep the existing shape: `signups/{date}` with `slots` map → array of `{name, ts, id, discordId}`.

## HTTP

| Path | |
| --- | --- |
| `GET /health` | `ok`, `version`, `clubId` `41026`, configured `statsJsonBase` |
| `GET /register` | PUT slash commands to Discord |
| `GET /firebase-check` | Today's signup doc (no stats collections) |
| `GET /stats-check` | Force-read `meta.json` / board and report freshness |

If `REGISTER_SECRET` is set, `/register` requires `Authorization: Bearer <secret>` or `?token=`.

## Secrets

Set with `npx wrangler secret put` from this directory. Do not commit them. Names only:

- `DISCORD_PUBLIC_KEY` — Interactions signature
- `DISCORD_BOT_TOKEN` — `/register` only
- `DISCORD_APPLICATION_ID` — `/register` only
- `FIREBASE_API_KEY` — Firestore REST for `signups`
- `TAVILY_API_KEY` — optional, `/chat`
- `REGISTER_SECRET` — optional, locks `/register`
- `DISCORD_ROLE_ID` — optional, `/call` role ping. This one can be a var instead of a secret.

Copy `worker/.dev.vars.example` to `worker/.dev.vars` for local dev.

## Discord Interactions URL

1. Discord Developer Portal → the application that should own these slash commands → **General Information**.
2. Set **Interactions Endpoint URL** to the Worker origin, for example `https://linking-fc-discord.<account>.workers.dev/` (POST `/` or `/interactions` both accept Discord).
3. Discord sends a PING (`type: 1`). The Worker replies `{ "type": 1 }` after Ed25519 verification. That only works once `DISCORD_PUBLIC_KEY` is set.
4. Register commands (token stays on the Worker):

```bash
curl "https://linking-fc-discord.<account>.workers.dev/register"
```

Putting this URL on an application that currently receives interactions through a Gateway bot will move those interactions to this Worker.

Do not deploy from CI in this repo unless you add that workflow yourself. Local check:

```bash
cd worker
npm test
npx wrangler dev
```
