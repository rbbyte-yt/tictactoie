# R-T TicTacToe — Full-Stack Online Multiplayer Gaming Platform

Premium responsive TicTacToe arena: bots, friend rooms, ranked matchmaking, R Coin economy, 79-item shop, 10 chests, redeem codes, leaderboards, profiles, admin console.

## Stack
- Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- PostgreSQL + Drizzle ORM (server-authoritative, prepared statements, transactions)
- Cookie sessions (HttpOnly, SameSite, SHA-256 token hashes), bcryptjs (12 rounds)
- Crypto-secure RNG for chests (`crypto.randomInt`)

## Quick Start
```bash
npm install
# .env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
ADMIN_SETUP_KEY=R-T-ADMIN-2026-SECURE   # required to register an admin account
npx drizzle-kit push
npm run build && npm start
```
Health: `GET /api/health`

## Auth
- `POST /api/auth?action=register` {username, password, dob (YYYY-MM-DD), email?, adminKey?} → sets session cookie, +500 R Coins
- `POST /api/auth?action=login` {identifier, password}
- `POST /api/auth?action=logout`
- `GET /api/auth?action=me` / `GET /api/auth?action=check-username&username=`
- Brute-force lockout (8 fails → 10 min), rate limits, XSS escaping, unique username/email (case-insensitive).

## Profiles
- Page: `/profile/:username` (public, safe routing) • API: `GET /api/profile?username=` • `PATCH /api/profile` {theme, soundEnabled, showEmail, showDob, showAge}
- Shows age (server-calculated from DOB), stats, streaks, score, rank, equipped cosmetics, match history. Email/coins only for self.

## Game Engine (server-authoritative)
- `POST /api/game?action=bot-create` {difficulty: easy|medium|hard|expert, symbol}
- `POST /api/game?action=create-room` / `join-room` {code} / `leave-room`
- `GET /api/game?action=room&code=` • `GET /api/game?action=match&id=` (poll every ~1.2s for realtime)
- `POST /api/game?action=move` {matchId, position} — validates turn, occupancy, status; bot replies server-side
- `POST /api/game?action=rematch` {matchId} — swaps sides
- `POST /api/game?action=use-ability` {matchId, type: hint|assist|shield, idem} — hint 20, assist 30, shield 1000 (6 turns, blocks opponent hints with notice)
- Win/draw detection, winning-line animation, idempotent scoring (`recordMatchScore` + `scored` flag).

## Matchmaking
- `POST /api/matchmaking?action=join` / `cancel` • `GET /api/matchmaking` (searching/matched/timeout). Never self-matches, blocks concurrent matches, 2-min expiry.

## R Coin Economy
- `GET /api/coins?action=balance` / `transactions` • `POST /api/coins?action=daily` (20h cooldown, streak bonus, idempotent)
- Rewards: bot win 10, friend win 25, ranked win 50 (+100 pts), draws smaller. All via `adjustCoins()` (SELECT FOR UPDATE + ledger, `INSUFFICIENT_FUNDS` guard).

## Shop (79 items, 12 categories, 10 rarities)
- `GET /api/shop?action=items` • `POST /api/shop?action=purchase` {itemId} (server price, no dupes) • `POST /api/shop?action=equip` {category, itemId|null} (ownership checked)
- Includes **R-T Eternal God Chest Relic** — Mythic, 1,000,000,000 R Coins direct.

## Chests (10 types)
- `GET /api/chests?action=list|detail&id=|history` • `POST /api/chests?action=open` {chestId, idem}
- Atomic: charge → secure roll → award/duplicate-convert → ledger, all in one transaction. Each pool sums to exactly 100%.
- **Secret Chest (25,000 🪙)** holds the Relic at exactly **0.1%**, rest 99.9%. Duplicate policy: common 10 … mythic 2000 … secret 20000.

## Redeem Codes
- `POST /api/redeem` {code, idem} • `GET /api/redeem` (history)
- `Rabbi` → +100 🪙 once/account, case-insensitive, UNIQUE(codeId,userId) + tx (refresh/multi-tab safe).
- `AdminRabbiBoos` → admin-only; requires admin session + {amount 1–1M, confirm:true}; every grant in `admin_coin_grants` + coin ledger. Ordinary users get “Invalid code”.

## Leaderboards & History
- `GET /api/leaderboard?scope=all-time|yearly|monthly&year=&page=&search=` (UTC year, pagination, search, myRank, scoring disclosure)
- `GET /api/matches?username=&page=`

## Admin (`/api/admin`, role-checked, logged)
- `GET ?action=stats` (users, coins, matches, queue, relic drops, recent tx/openings/grants, codes, chests)
- `POST ?action=grant|create-code|toggle-code|upsert-item|update-chest|update-pool|ban`
- `update-pool` rejects totals ≠ 100%. No default admin account — register with `ADMIN_SETUP_KEY`.

## Security
Prepared statements, bcrypt, HttpOnly SameSite cookies, HTTPS in prod, input validation, rate limits, auth middleware, server-side moves/currency/probabilities, idempotency keys, WebSocket-equivalent room auth (only members mutate), no secrets in client/logs.

## Deploy (Render)
- Web service: `npm install && npm run build`, start `npm start`, env `DATABASE_URL` (Render Postgres) + `ADMIN_SETUP_KEY`. Health check `/api/health`.
- One service runs web + API + realtime-polling (no separate PHP/Python needed — equivalent guarantees in this runtime). For true WebSockets at scale, add a second service with sticky sessions.
- Never commit `.env`. Run `npx drizzle-kit push` on first deploy; seed runs automatically via `ensureSeeded()`.

## Tests (manual acceptance map)
- Register → +500; login lockout after 8 fails; `Rabbi` +100 once (try `RABBI` again → 409); non-admin `AdminRabbiBoos` → 404; admin grant with confirm → ledger row.
- Bot move validation (occupied/turn/finished rejected); chest open charges server price, exactly 1 reward, failed open loses nothing; Secret pool = 100.0 with relic 0.1; dupes convert per table; shop price tampering ignored; purchases persist after logout.
