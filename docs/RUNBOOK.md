# Incident Runbook

On-call playbook for Trainomics production. Each scenario has the signal that surfaces it, first response, escalation path, and rollback. **Read top to bottom when you don't know the cause yet** — the diagnostics step is shared.

If you have 60 seconds: the **first response** lines are what to do right now. The rest is context for whoever takes the handoff.

---

## 0. Diagnostics — start here when you don't know what's broken

Run these in parallel when paged with a vague signal ("site is slow", "users complaining"):

1. **Vercel deployments** — `vercel ls` or the dashboard. Is the latest deploy READY? Is there a deploy from the last 30 minutes that introduced this?
2. **Sentry** — issues feed for the last hour. New error fingerprints? Spike in volume on an existing one?
3. **Supabase status** — https://status.supabase.com and the project dashboard's "Database health" widget.
4. **Stripe status** — https://status.stripe.com (tab is worth bookmarking).
5. **Vercel runtime logs** — `vercel logs --since 30m` filtered to the affected route, or the dashboard's logs UI.
6. **AI provider status** — https://status.anthropic.com, https://status.openai.com, https://status.cloud.google.com.

If the pager-signal points at a specific scenario below, jump there.

---

## 1. Supabase outage / DB unreachable

**Signal:** `/api/health` returning 503 with `database: down`. Sentry flooded with `Can't reach database server`. Login fails with 500.

**First response:**
1. Confirm at https://status.supabase.com — is this their incident or ours?
2. If theirs: post a status note to the team channel, no action — Supabase will recover and our app will resume on its own.
3. If ours: check the project dashboard for paused state (free tier auto-pauses after 7d inactivity — should not apply on prod, but worth a glance), connection limit exhaustion, or quota issues.

**Mitigation while down:**
- Most read paths fail. Login fails. Webhooks queue at Stripe / Resend / Garmin and retry — *do not panic-disable webhooks*; the providers retry for hours and we want their backfill once we're back.
- Rate-limit on `/api/health` is fine; don't bypass it as a workaround.

**Escalation:**
- Open Supabase support ticket from the dashboard if outage exceeds 15 minutes and isn't on their status page.

**Verify recovery:**
- `curl https://trainomics.app/api/health` returns 200 with `database: ok`.
- Sentry error rate returns to baseline.

---

## 2. Stripe webhook backed up

**Signal:** Stripe dashboard shows webhook "Failing" or with growing pending event count. Subscription state in our DB diverges from Stripe (user upgraded but features not unlocked).

**First response:**
1. Stripe dashboard → Developers → Webhooks → click the endpoint → "Recent deliveries". What's the failure reason? Most common:
   - **5xx from us** → our handler is broken or DB is down. Check Sentry for `app/api/payments/webhook` errors.
   - **Timeout** → our handler is slow. Stripe's timeout is 30s; if we're consistently slower, the queue grows.
   - **Signature failure** → `STRIPE_WEBHOOK_SECRET` rotated without us knowing. Re-fetch from dashboard, update Vercel env, redeploy.
2. Webhook handler is **idempotent** via `StripeWebhookEvent` — Stripe can safely re-deliver. Use Stripe's "Resend" button for failed events once root cause is fixed.

**If subscription state has diverged for a specific user:**
- `prisma.stripeWebhookEvent.findMany({ where: { handled: false } })` — see what's stuck.
- Manually trigger the equivalent state change via the Stripe CLI or by manually invoking the handler.

**Escalation:**
- If we can't process webhooks for >2 hours, we may receive duplicate `customer.subscription.created` events when Stripe gives up retrying — the idempotency dedupe handles this, but log volume will spike.

**Verify recovery:**
- Webhook endpoint shows "Active" status in Stripe dashboard.
- `prisma.stripeWebhookEvent.count({ where: { handled: false } })` returns 0.

---

## 3. Resend / email delivery broken

**Signal:** Welcome / password-reset / invite emails not arriving. Sentry shows `Resend error` or `Background email failed` warnings.

**First response:**
1. Check Resend dashboard for delivery status, bounce/complaint rate, and API status.
2. If it's a sender-reputation issue (high bounce rate suspended sending): switch sender domain or fall back to platform default in `lib/email/email-branding-types.ts`.
3. **The `EMAILS_PAUSED=true` kill switch suppresses *all* outbound** — confirm it isn't accidentally set in Vercel prod env.

**Mitigation:**
- Welcome / referral / non-critical emails go through `sendEmailAfter()` and don't block users — they just silently miss the email. OK for hours-long Resend incidents.
- Password reset is awaited — users see a "check your email" message that's a lie. If Resend is down >15 min, post a banner to the login page or temporarily disable the reset CTA.

**Escalation:**
- Resend incidents on https://resend.com/status. They have ~99.9% historical uptime, but spikes in our bounce rate can get our subdomain throttled — that's a different issue handled via Resend's deliverability tools.

**Verify recovery:**
- Send a test email via the Resend dashboard "Send test email" feature.
- Check that recent welcome emails (Sentry log) succeeded.

---

## 4. AI provider down (Anthropic / OpenAI / Google)

**Signal:** Athlete chat hangs or errors. Specific provider's name in Sentry stack traces. **Or:** circuit breaker auto-opened, log line `AI circuit breaker opened`.

**First response:**
1. The circuit breaker (`lib/ai/circuit-breaker.ts`) auto-routes traffic to a healthy provider after 5 failures within 60s, for a 30s open window. **Most short outages don't need human intervention.**
2. If the breaker is flapping (open / close / open repeatedly): the provider is degraded but not fully down, and the breaker policy needs tuning. Bump `OPEN_DURATION_MS` to 60s in the file as a hot-fix.
3. If all three providers' breakers are open simultaneously: that's almost certainly a bug on our side, not three coincident outages. Check Sentry for a deploy that broke `wrapAiFetch` or model selection. Roll back.

**Mitigation:**
- Coach AI features are not user-facing-critical — generation can wait. Stream/chat is user-facing — if all providers are down, our error message says "AI temporarily unavailable" (Swedish: "AI-tjänsten är tillfälligt otillgänglig").

**Escalation:**
- Single provider out >30 min: monitor and let breaker handle it.
- Multi-provider out: rare, treat as platform-wide and post a banner.

**Verify recovery:**
- Hit the chat endpoint with a known prompt; expect a response.
- Sentry rate of `AI circuit breaker opened` warnings drops to zero.

---

## 5. JWT custom claims hook failing

**Signal:** Sentry shows `custom_access_token_hook failed:` warnings from Supabase logs, or middleware DB-lookup latency spikes.

**First response:**
1. The hook has a try/catch that returns original claims on error so sign-in never blocks. Failures push users onto the slow DB-lookup path — slow, not broken.
2. Check Supabase Dashboard → Database → Logs for the actual error message from the function.
3. Most likely cause: schema drift — a column the function reads (`User.role`, `Business.slug`, `BusinessMember.role`, etc.) was renamed or dropped without updating `prisma/migrations/20260418_custom_access_token_hook/migration.sql`.

**Hot-fix rollback (no dashboard access needed):**
- Set `USE_JWT_CLAIMS=false` in Vercel env and redeploy. Middleware falls back to legacy DB lookup until the function is fixed.

**Permanent fix:**
- Re-edit the migration SQL to match current schema, re-apply via `prisma db execute --file=...migration.sql`, re-enable the hook in dashboard, set `USE_JWT_CLAIMS=true`.

**Escalation:**
- Function failures don't block users (try/catch returns original claims), but they triple every request's latency. Treat as P2 not P1.

---

## 6. Garmin Cloud Run webhook down

**Signal:** Garmin sync hasn't run for a connected athlete in >24h. Cloud Run logs show 5xx or no recent invocations.

**First response:**
1. The Garmin webhook is **on Google Cloud Run, not Vercel** (Garmin requires a static IP for their Evaluation tier). Check Cloud Run console for the service.
2. **Deploy footgun:** the Cloud Run service must include the same `STRIPE_WEBHOOK_SECRET` and `DATABASE_URL` env vars as Vercel — these have drifted in past incidents. Compare against `docs/GARMIN_CLOUD_RUN_WEBHOOK.md`.
3. Garmin retries failed deliveries for ~24h; once Cloud Run is back, backfill happens automatically.

**Escalation:**
- If outage exceeds 24h, athletes will see gaps in their Garmin data and need a manual full-sync trigger via `/api/integrations/garmin/full-sync`.

**Verify recovery:**
- Cloud Run service health probes returning 200.
- Recent webhook deliveries visible in Garmin Developer Portal.
- A fresh activity from a connected athlete appears in our DB within 5 minutes.

---

## 7. Vercel deployment stuck or broken

**Signal:** Latest deploy stuck in "Building" or "Deploying" >10 minutes. Or new deploy is live and immediately surfacing 500s in Sentry.

**First response:**

**If stuck building:**
- Cancel via dashboard. Often a Vercel-side blip; redeploy usually clears it.
- If multiple builds in a row fail with timeout, check the build log for OOM (we set `NODE_OPTIONS=--max-old-space-size=6144` in the typecheck script for this reason).

**If deployed and broken:**
- **Roll back fast.** Vercel dashboard → Deployments → previous good deploy → "Promote to Production". Takes ~30s.
- Then investigate the broken deploy's logs without users feeling pain.

**Never:**
- Force-push to main to undo a deploy. Use the rollback button. The bad deploy is still in the dashboard for forensics.

**Escalation:**
- If multiple consecutive deploys fail post-rollback, freeze deploys in the team channel and start a real diagnostics pass.

---

## 8. Custom domain / DNS issue

**Signal:** A coach's white-label domain (e.g. `coach.example.com`) returns SSL error or "DNS not found". Their athletes can't log in to their branded portal.

**First response:**
1. Vercel dashboard → Project → Settings → Domains. Is the domain listed and "Valid Configuration"?
2. If "Invalid Configuration": they need to update their CNAME / A record. The dashboard tells them what to set. Send them the screenshot.
3. If listed and SSL is pending: Vercel issues certs via Let's Encrypt automatically — usually <5 min. If pending >30 min, click "Renew certificate".

**Tenant isolation reminder:**
- Custom domains are mapped to a `Business` row's `customDomain` field and resolved in `proxy.ts`. If the domain works but routes to the wrong tenant, that's a security incident — page the owner.

**Escalation:**
- DNS propagation takes up to 48h after a record change; the coach may need to wait. Document that in the coach onboarding flow if it happens often.

---

## General principles

- **Webhook handlers are idempotent.** Stripe, Garmin, Strava, Resend — all of them retry. Our handlers dedupe. Don't disable a webhook to "stop the noise"; let the provider retry.
- **The breaker is your friend.** When you see `AI circuit breaker opened` warnings, that's working as designed. Investigate the root cause if sustained, but don't panic about the warning itself.
- **Roll back before you investigate.** A broken deploy in production costs more per minute than the time to investigate. Promote the previous deploy, then diagnose.
- **`USE_JWT_CLAIMS=false` is the auth kill switch.** It degrades performance but never blocks login. If anything auth-related is on fire, this is the safe escape hatch.
- **`EMAILS_PAUSED=true` is the email kill switch.** If we ever start spamming or sender-reputation collapses, set it.
- **Update this document.** Every incident teaches something. After post-mortem, add the new symptom or fix here.
