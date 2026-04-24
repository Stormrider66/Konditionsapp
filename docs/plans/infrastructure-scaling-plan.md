# Infrastructure Scaling Plan

Forward-looking plan for Vercel + Supabase stack as we grow past 5k users. Nothing here is acute — all items are **trigger-driven**. When the signal fires, act. Until then, stay on the current stack.

Source: external architecture review (Apr 2026) + internal assessment. The review over-indexed on outdated Vercel limits (pre-Fluid Compute) and pitched a Railway/Fly.io migration that doesn't pay off at our size. The items below are the parts that *do* apply.

## Current state (Apr 2026)

- Next.js 15 on Vercel (Fluid Compute), 463 API routes
- Supabase Postgres (192 Prisma models) via Supavisor pooler
- Supabase Storage buckets: `video-analysis` (user uploads, ingest-heavy), `exercise-images`
- Exercise demo videos: mix of YouTube/Vimeo links and Supabase Storage URLs (`videoUrl String? // YouTube/Vimeo link` vs `videoUrl String // Supabase Storage URL`)
- Supabase Realtime: not heavily used yet
- Analytics: nightly pre-aggregation via cron jobs (`calculate-acwr`, etc.) — the right pattern

## Priority 1 — Offload exercise demo videos from Supabase Storage

**Trigger:** Any of:
- Supabase egress > 150 GB/month (check dashboard — Pro tier includes 250 GB, overage is $0.09/GB)
- Video-heavy feature ships (e.g. an exercise library UI that auto-plays demos)
- User reports of buffering on demos over cellular

**Why:** Supabase Storage is S3 + a thin CDN — no HLS/adaptive bitrate, flat egress pricing. Fine for profile pics and user-uploaded analysis clips. Bad for serving the same demo video to thousands of athletes.

**Plan:**
1. Audit which exercises actually have Supabase-hosted videos (vs. YouTube/Vimeo). Grep `videoUrl` in `prisma/schema/` — there are multiple models with this field.
2. Pick target: **Bunny Stream** (~$0.005/GB egress + free transcoding, cheapest) for cost, or **Mux** (per-minute pricing, better DX and QoE analytics) if we want built-in viewer analytics.
3. Write a one-time migration script: pull from `video-analysis`/whatever bucket → upload to chosen provider → update `videoUrl` field. New uploads go directly to the new provider via signed upload URLs.
4. Keep Supabase Storage for the `video-analysis` *ingest* flow — user uploads a clip, Gemini analyzes it, it's deleted. That's S3-shaped work, Supabase handles it fine.

**Effort:** 1–2 days. No schema changes needed (the `videoUrl` field already accepts external URLs).

**Cost cross-check:** If we ever serve 1 TB of exercise demos in a month, Vercel/Supabase egress ≈ $90–150. Bunny.net ≈ $5.

## Priority 2 — Monitor Supabase Realtime peak connections

**Trigger:** Realtime dashboard shows peak concurrent connections trending above ~300 (headroom before hitting the 500 Pro-tier cap).

**Why:** Pro tier includes 500 peak connections; overage is $10 per additional 1000 block. If a live-class or synchronous leaderboard feature ever ships, we blow through this in one event.

**Plan when triggered:**
1. First, check *what* is holding those connections. If it's passive subscriptions to low-churn tables, consider whether polling would serve just as well.
2. If we have a genuine synchronous use case (live class, live leaderboard, group challenge), evaluate **Ably**. It's built for pub/sub at scale with guaranteed delivery — Supabase Realtime is a Postgres-changes listener bolted to WebSockets and hits ceilings earlier.
3. Keep Supabase Realtime for low-volume change notifications (presence indicators, row updates for a single user's data). Don't route everything through Ably by default.

**Effort:** Ably integration is ~1 week if we need it. Skip entirely if we never build synchronous group features.

## Priority 3 — Revisit analytics pipeline (Tinybird / ClickHouse)

**Trigger:** A specific dashboard query against training telemetry takes > 2s at p95, OR a cron job processing telemetry starts timing out.

**Why:** Postgres is row-oriented. The doc is right that fleet-wide aggregations over years of pulse/GPS data will hurt eventually. But we're not there — nightly pre-aggregation (what `calculate-acwr` already does) is the correct step before investing in a columnar store.

**Plan when triggered:**
1. First pass: add materialized views or summary tables inside Postgres. Cheap, no new infra.
2. If queries still struggle: stream high-frequency events (pulse-per-second, set/rep telemetry) to **Tinybird** (managed ClickHouse) via its ingest endpoints. Keep OLTP (workouts, users, subscriptions) in Supabase. Tinybird exposes results as REST APIs we can call from Next.js.
3. Do NOT migrate existing Supabase tables wholesale. Hybrid is the point.

**Effort:** 2–4 weeks when we get there. Materialized-view stopgap is ~1 day.

## Priority 4 — Vercel cost hygiene (ongoing)

**Trigger:** Monthly Vercel bill exceeds $100, or any single line item (image optimization cache reads, function invocations, edge middleware egress) climbs week-over-week.

**Why:** Not a migration — just discipline. Fluid Compute fixed the concurrency/cold-start issues the external doc worried about, so the remaining risk is purely billing surprises.

**Things to watch:**
- **Image Optimization cache reads** — 5000 users loading a dashboard with 20 thumbnails daily = 3M cache reads/month. Cheap per unit, but compounds. If it grows fast, consider serving exercise thumbnails from Bunny or putting them behind a longer-TTL `Cache-Control`.
- **Edge Middleware egress** — `proxy.ts` runs on every request. Make sure it's not pulling large payloads through middleware unnecessarily.
- **Function invocations** — Fluid Compute's per-invocation model is cheap, but any runaway client retry loop bills us. Watch `/api/cron/*` success rates.

**Plan:** No action needed until a line item surprises us. Check the Vercel usage dashboard monthly.

## Things we are explicitly NOT doing

- **Railway / Fly.io migration** — the external doc pitched this hard. Fluid Compute removed the underlying reason (cold starts, fd limits, burst concurrency). Migrating 463 API routes to a long-lived Node server is weeks of work for speculative savings. Revisit only if Vercel ships a pricing change that breaks our economics.
- **AWS / RDS migration** — correct at 100k+ users, overkill until then. The external doc agreed.
- **Ably migration for all realtime** — Supabase Realtime is fine for what we use it for today. Targeted replacement only for specific synchronous features.
- **PlanetScale / Neon migration** — we depend on `pgvector` (food-scanner memory, document RAG, future AI features). Leaving Postgres = giving up our AI moat. Not happening.

## Check-in cadence

Review this doc every **~6 months** or when any trigger fires. Update the "Current state" section if the stack materially changes.
