# Kandha

A real, deployable app for booking head-load workers, handcart and hand-van pullers and porters — and for those workers to find work. Two sides, one download, a wall between them.

This replaces the clickable prototype, which is now in `../archive/` for reference.

```
kandha-app/
├── backend/     Node 20 · Express · Prisma · PostgreSQL · Socket.IO
└── mobile/      Expo (React Native) · expo-router · TypeScript
```

---

## What actually works

**Backend**
- Phone + OTP sign-in (bcrypt-hashed codes, 5-minute expiry, rate limited, attempt-capped)
- Cities and markets as data — the unit (*nag* / *piece* / *than*), the local word for the worker and the union rate band all come from a row, not a release
- Job creation with **server-side fare calculation** — the client never sends a price
- The 50 kg rule enforced server-side: above it, the job needs two people per unit and the per-unit rate steps up
- Worker board with market scope, trade filter, inter-market pass rule and places-left logic
- Race-safe accept (transaction, cannot oversubscribe a job)
- Job lifecycle: reached → picked → delivered, with both-sides counting
- Live updates over WebSocket: new job to the market room, status to the job room
- Ratings, LR/bilty number, cancel, earnings summary
- **Role wall**: a booker token cannot reach a worker route, and location pings are rejected unless a job is actually running

**Mobile**
- Gate (city + which side you are on) → OTP login → the right home
- Booker: Book (pickup/drop, service tiles, count, weight, helpers, pay-more, live fare) · Trips · Trip detail with partner phone numbers and stage rail · Account
- Worker: duty toggle · work board with filters, big numerals, a full sentence in his language and **text-to-speech on every card** · running job with step buttons · earnings and card
- Hindi / Bengali / English for every worker-facing string
- Location sent only while a job runs

## What is deliberately not built yet

Push notifications (Expo tokens are collected, nothing is sent) · photo upload (S3/Cloudinary needed) · maps · payments · multi-stop · repeat-booking · no-show handling · the sardar/crew role · admin panel for market-desk verification (right now you verify by updating the row).

Verification is a real gate in the code but there is no UI to grant it — that is the next thing to build, and it should be a small web page for the market desk operator.

---

## Run it locally

```bash
# 1. database + api together
cd backend
cp .env.example .env          # then set JWT_SECRET to something random
docker compose up --build     # api on http://localhost:8080

# in another terminal, once:
docker compose exec api npx prisma migrate deploy
docker compose exec api npx tsx prisma/seed.ts
```

Or without Docker:

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Check it: `curl http://localhost:8080/health`

```bash
# 2. the app
cd ../mobile
npm install
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8080 npx expo start
```

Scan the QR with Expo Go. Use your LAN IP, not `localhost` — the phone is a different machine.

In development `OTP_DEV_MODE=true` prints the OTP to the API log and returns it in the response, so you can sign in without an SMS account.

**Demo login:** `9830144712` is seeded as a verified worker in Kolkata (card KND 84217). Any other number becomes a booker.

---

## Deploy the backend

Any host that runs a Docker image plus a managed Postgres. Cheapest sensible options in India, roughly ₹800–2,000/month to start:

**Railway** (simplest)
1. New project → Deploy from GitHub → point at `backend/`
2. Add a PostgreSQL plugin; it sets `DATABASE_URL` for you
3. Add variables: `JWT_SECRET`, `OTP_DEV_MODE=false`, `SMS_PROVIDER=msg91`, `MSG91_*`
4. Deploy. The Dockerfile runs `prisma migrate deploy` on boot
5. Seed once: `railway run npx tsx prisma/seed.ts`

**Render** — New Web Service, Docker, root `backend/`, add a Render Postgres, same variables.

**Fly.io** — `fly launch` in `backend/`, `fly postgres create`, `fly postgres attach`, `fly deploy`.

Put it behind HTTPS (all three do this by default) and set `CORS_ORIGINS` to your own domains in production.

### SMS — read this before you launch in India

You cannot send transactional SMS to Indian numbers without **DLT registration** (TRAI). Budget a week:

1. Register your entity on a DLT portal (Jio, Airtel, Vodafone or BSNL) — needs GST/PAN and company documents
2. Register a **sender ID** (6 letters, e.g. `KANDHA`)
3. Register the **OTP template** with the exact text and a variable placeholder
4. Put the resulting template ID and auth key in `MSG91_TEMPLATE_ID` and `MSG91_AUTH_KEY`

Rough cost: ₹0.12–0.20 per SMS. Until DLT clears, keep `OTP_DEV_MODE=true` and onboard people in person at the market — which is what you should be doing in the first weeks anyway.

---

## Deploy the app to a phone

```bash
cd mobile
npm install -g eas-cli
eas login
eas init                      # writes your projectId into app.json
```

Set the API URL in `eas.json` (`EXPO_PUBLIC_API_URL`) for each profile, then:

```bash
# an APK you can WhatsApp to people and sideload — best for market testing
eas build -p android --profile preview

# a Play Store bundle
eas build -p android --profile production
eas submit -p android
```

For iOS you need an Apple Developer account (US$99/year). For this user base, Android first is obviously right.

**Over-the-air updates.** After the first build, `eas update` pushes JS changes to installed apps without a new store release. Use it — the people testing this will not reinstall.

### Play Store, realistically

Internal testing track works within a day. Production review takes a few days and asks for:
- a privacy policy URL (you collect a phone number and, during jobs, location — say so plainly)
- a data-safety declaration
- justification for location permission — the honest one is exactly right: *shared only while a job is running, to show the customer where their goods are*

---

## Architecture notes worth knowing

**Fare is never trusted from the client.** `POST /v1/jobs/quote` is only for display; `POST /v1/jobs` recomputes from the city band and ignores whatever the app thought.

**The wall between the two sides is enforced in middleware,** not in the UI. `requireRole` blocks a booker token from every worker route. This matters: if a booker could read the board he could see what every other booker pays and who has been idle all morning.

**Verification is a human step.** `requireVerifiedWorker` blocks accepting a job until someone at the market desk sets `verify = VERIFIED`. A worker can browse before that — seeing the board is what makes him come to the desk.

**Location is job-scoped.** `POST /v1/worker/ping` returns 403 unless that worker has a live assignment. Tracking someone between jobs is surveillance, and the unions will read it that way.

**Cities are rows.** Adding Delhi or Surat is a seed entry, not a release.

---

## API surface

```
GET    /health
GET    /v1/geo/cities

POST   /v1/auth/otp/request        { phone }
POST   /v1/auth/otp/verify         { phone, code, name?, lang?, cityId? } → { token, user }
GET    /v1/auth/me
PATCH  /v1/auth/me                 { name?, lang?, cityId? }
POST   /v1/auth/device             { pushToken, platform }

POST   /v1/jobs/quote              { cityId, units, kgPerUnit, helpers?, extra? }
POST   /v1/jobs                    create a job
GET    /v1/jobs/mine               booker's own trips
GET    /v1/jobs/:id
POST   /v1/jobs/:id/cancel
POST   /v1/jobs/:id/count          { assignmentId, count }
POST   /v1/jobs/:id/lr             { lrNumber }
POST   /v1/jobs/:id/rate           { subjectId, stars, note? }

GET    /v1/jobs/board/open         worker only, verified only
POST   /v1/jobs/:id/accept         worker only, verified only
POST   /v1/jobs/:id/step           { state: REACHED|PICKED|DELIVERED, count? }
GET    /v1/jobs/worker/running

POST   /v1/worker/register         { name, lang, trades[], marketId }
GET    /v1/worker/me
POST   /v1/worker/duty             { onDuty }
POST   /v1/worker/ping             { lat, lng }   — only while a job runs
GET    /v1/worker/earnings
```

WebSocket at `/ws` (Socket.IO), authenticated with the same JWT. Events: `job:new`, `job:taken`, `job:accepted`, `job:step`, `job:cancelled`, `count:updated`, `worker:moved`.

---

## Before you put this in front of anyone

The three questions in the project map are still unanswered, and no amount of code answers them:

1. Can a man from one market work the next one?
2. Does the sardar work with you or against you?
3. Is booking through this faster than phoning a sardar you have used for nine years?

This codebase exists so you can test those with something real in your hand — not so you can skip them.
