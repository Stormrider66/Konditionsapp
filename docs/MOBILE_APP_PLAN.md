# Mobile App Plan — Athlete-First Native App

**Status:** Backend groundwork in progress (2026-06). Expo app deliberately deferred until the athlete core (focus modes, logging, nutrition, chat) stops changing shape week-to-week; this doc captures the full plan so backend work lands mobile-ready.

## 1. Goals & scope

- **Athletes get a native app** (Expo / React Native); **coaches stay on the web**.
- The app is a *subset* of the platform: the athlete's daily loop (today's training, focus-mode execution, logging, check-in, nutrition log, chat), not the whole feature surface.
- The web app keeps working unchanged throughout — all backend work here is additive.

## 2. Architecture

```
Expo app ──(supabase-js native sign-in)──► Supabase Auth
   │  access token (JWT, includes custom claims from
   │  public.custom_access_token_hook: dbUserId, role,
   │  selfAthleteClientId, ...)
   ▼
Authorization: Bearer <jwt> ──► existing /api/** routes on Vercel
                                 (getCurrentUser() bearer branch)
Supabase Realtime (chat) ──► supabase-js works natively in RN
Supabase Storage uploads ──► existing signed-URL flow (mobile-friendly)
Expo push ──► existing DevicePushToken + lib/chat/push.ts fan-out
```

No separate mobile backend, no API gateway: the app calls the same REST routes the web uses.

## 3. Auth bridge spec

- **Token source:** the RN app signs in with supabase-js (`persistSession` via Expo SecureStore). Every API call sends `Authorization: Bearer <access_token>`; supabase-js auto-refreshes tokens.
- **Server side:** `getCurrentUser()` (`lib/auth/current-user.ts`) detects a JWT-shaped bearer header and validates it with a stateless `supabase.auth.getUser(token)` call, then runs the same DB-user resolution as the cookie path. All auth helpers (`resolveAthleteClientId`, `requireCoach`, `canAccessClient`) inherit this — no per-route changes.
- **Fail closed:** an invalid/expired bearer token yields `null` (401 from routes). There is **no fallback from a present-but-invalid bearer token to cookies** — this rule is load-bearing for the CSRF exemption below.
- **Token discrimination:** only `Bearer` values shaped like a JWT (three base64url segments) enter the bearer path. `Bearer bak_*` is the existing business API-key scheme (`lib/api-key-auth.ts`) and is untouched.
- **CSRF:** `proxy.ts` skips the Origin/Referer same-origin check for requests carrying a JWT-shaped bearer header. Rationale: CSRF defends *ambient cookie credentials*; a cross-site attacker cannot attach a custom `Authorization` header without a CORS preflight we never approve, and fail-closed auth means a junk header can't skip CSRF and then ride cookies.
- **Per-request cost:** one Supabase Auth network call per request (React `cache()` dedupes within a request). Acceptable for v1; see §6 for the local-verification upgrade.

## 4. Mobile API surface v1

| Area | Endpoint | Status |
|---|---|---|
| Identity | `GET /api/athlete/me` | exists |
| Home/dashboard | `GET /api/athlete/dashboard` | **new (this work)** |
| Check-in submit | `POST /api/daily-metrics` | exists |
| Check-in/readiness read | `GET /api/readiness?clientId=` , `GET /api/daily-metrics` | exists |
| Streak widget | `GET /api/athlete/streaks` | exists |
| Training load | `GET /api/athlete/training-load?clientId=` | exists |
| History | `GET /api/athlete/history` | **new (this work)** |
| Tests | `GET /api/athlete/tests`, `GET /api/athlete/tests/[id]` | **new (this work)** |
| PRs | `GET /api/athlete/one-rep-maxes` | exists |
| Activity feed | `GET /api/athlete/integrated-activity?clientId=` | exists |
| Workout execution | `GET/POST/PUT /api/cardio-sessions/[id]/focus-mode`, `PUT .../segments/[index]`, strength/hybrid equivalents | exists |
| Nutrition | `/api/nutrition/meals`, `/api/nutrition/daily-targets`, food scanner | exists |
| Chat | `/api/threads/*` + Supabase Realtime | exists |
| Calendar | `GET /api/calendar/unified` | exists |
| Push tokens | `POST/DELETE /api/push-tokens` | exists |
| Entitlements | `GET /api/payments/subscription` | exists (read-only in app) |

## 5. Conventions for athlete endpoints

- Envelope: `{ success: true, data }` / `{ success: false, error }` with proper status codes (401/403/404/500).
- Auth: `resolveAthleteClientId()` for self-data; `canAccessClient()` + explicit `clientId` param where coaches also call the route.
- Locale: `resolveRequestLocale(request, user.language)` + inline `t(locale, en, sv)` for error strings.
- Dates: ISO 8601 strings in JSON.
- **ID-space gotcha:** `WorkoutLog.athleteId` is a `User.id`; every other model's `athleteId` is a `Client.id`. Wrong id = silently empty results.
- **TrainingLoad:** load sums must filter `source: 'WORKOUT'`; ACWR reads filter `source: 'ACWR_SUMMARY'`.

## 6. JWT verification upgrade path (later)

When the per-request Supabase Auth call shows up in latency budgets: add `jose`; sniff the token header `alg` — RS256/ES256 → verify against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (cached remote JWK set); HS256 (legacy projects) → `SUPABASE_JWT_SECRET` env. Gate behind `SUPABASE_BEARER_VERIFY=local`. The custom claims already in the token (`dbUserId`, `selfAthleteClientId`) can then skip the Prisma user lookup on hot paths — keep the DB path wherever athlete auto-provisioning matters.

## 7. Expo app phases (after the athlete core stabilizes)

1. **P1 — read-only companion (TestFlight/internal track):** sign-in, home (dashboard endpoint), check-in submit, history, tests, push registration.
2. **P2 — workout execution:** cardio/strength focus modes on the existing focus-mode APIs; logging; offline-tolerant submits.
3. **P3 — chat + AI:** threads with Realtime + push; AI chat (text first).
4. **P4 — device integrations:** BLE ergs via `react-native-ble-plx` — the FTMS parsers in `lib/integrations/wattbike/parsers.ts` are pure functions and port directly; this finally covers iOS (no Web Bluetooth there). HR straps likewise.

Release strategy: closed beta first (TestFlight + Play internal track), **EAS Update (OTA)** for JS-level iteration without store review; public store release only when the beta stops wobbling.

## 8. Deferred features (not in the app v1)

- **Video pose analysis** — MediaPipe is web-WASM; a mobile port is its own project.
- **Gemini Live voice coaching** — browser WebSocket + audio APIs; revisit with a native audio session implementation.
- **PDF exports** — generate server-side and deliver links if needed.
- **SpeechSynthesis voice cues** — use Expo's speech module if/when wanted.

## 9. Payments stance

No in-app purchases in v1. Subscriptions are bought/managed on the web (Stripe); the app only *reads* entitlements via `GET /api/payments/subscription` and never links to external purchase flows from iOS (App Store 3.1.1). Revisit RevenueCat/IAP only if conversion data demands it.

## 10. Push & realtime

- Chat push fan-out already exists (`lib/chat/push.ts`, Expo HTTP/2 batches, stale-token cleanup) — becomes live once the app registers tokens via `POST /api/push-tokens`.
- Candidates for later push fan-out: morning briefings, coach alerts, pre-workout nudges (cron jobs already compute these; they currently surface in-app/email only).
- Realtime: Supabase Realtime works in RN. The SSE streams (live HR/interval sessions) need an EventSource polyfill or a polling fallback — decide in P2.

## 11. Risks & open questions

- Auth bridge touches the hottest code path — shipped fail-closed with unit tests + curl smoke tests; single-commit revertible.
- `getCurrentUser` auto-creates athlete users where some converged routes previously 404'd on missing users (superset behavior; watch logs).
- Business/legacy athlete page drift (13 pairs) is untouched by this work; the new lib extractions only power the *legacy* pages (which serve solo athletes) + the APIs. De-drift remains a separate cleanup.
