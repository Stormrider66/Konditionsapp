# Athlete AI Billing Launch Checklist

Use this before pushing the AI allowance/top-up work to production.

## Required Environment

- `CRON_SECRET` is set in Vercel production and preview.
- `STRIPE_SECRET_KEY` is set.
- `STRIPE_WEBHOOK_SECRET` is set for the active Stripe webhook endpoint.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set.
- `NEXT_PUBLIC_APP_URL` points to the production HTTPS app URL.
- `AI_BILLING_SEK_PER_USD` is set if we want a fixed exchange-rate buffer. If unset, the app uses `10.5`.
- `EMAILS_PAUSED=true` remains set until launch emails are intentionally enabled.

## Stripe

- If Stripe is not enabled yet, leave `STRIPE_SECRET_KEY` unset. The subscription page will show AI credits and plans, but upgrade/top-up buttons stay disabled with "Kommer snart"/"Snart" copy, and payment APIs return `BILLING_DISABLED`.
- Athlete Standard monthly/yearly prices exist and match 199 SEK/month and 1990 SEK/year.
- Athlete Pro monthly/yearly prices exist and match 399 SEK/month and 3990 SEK/year.
- `STRIPE_ATHLETE_STANDARD_MONTHLY`, `STRIPE_ATHLETE_STANDARD_YEARLY`, `STRIPE_ATHLETE_PRO_MONTHLY`, and `STRIPE_ATHLETE_PRO_YEARLY` point to the active Stripe prices.
- Webhook endpoint receives:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Run one Stripe test checkout for Standard, Pro, and one AI top-up pack before public launch.

## Database

- Apply Prisma migrations before enabling billing UI broadly.
- Run `npm run qa:ai-billing-readiness` before deploy. It verifies AI billing schema markers, required migrations, reset crons, and non-Stripe/Stripe env readiness.
- Confirm these tables/columns exist:
  - `AIUsageLog.clientId`
  - `AIAllowanceAccount`
  - `AITopUpPurchase`
  - `Business.eliteAiAllowanceSek`
  - `AthleteSubscription.customAiAllowanceSek`
- After migration, run a smoke check on `/api/athlete/ai-allowance` with a real athlete account.

## Cron And Jobs

- `vercel.json` includes `/api/cron/reset-ai-usage` at `5 0 1 * *`.
- `vercel.json` includes `/api/cron/reset-budgets` at `0 0 1 * *`.
- Manually call `/api/cron/reset-ai-usage` with `Authorization: Bearer $CRON_SECRET` in preview before production launch.
- Confirm the response includes `allowanceResetCount`, `allowancePeriodStart`, and `allowancePeriodEnd`.

## Product Checks

- Run `npm run qa:ai-billing` against preview with at least one seeded athlete login and one admin login:
  - `TRAINOMICS_QA_BASE_URL`
  - `TRAINOMICS_QA_ATHLETE_EMAIL` / `TRAINOMICS_QA_ATHLETE_PASSWORD`
  - `TRAINOMICS_QA_ADMIN_EMAIL` / `TRAINOMICS_QA_ADMIN_PASSWORD`
  - Optional business admin check: `TRAINOMICS_QA_BUSINESS_ADMIN_EMAIL` / `TRAINOMICS_QA_BUSINESS_ADMIN_PASSWORD` / `TRAINOMICS_QA_BUSINESS_SLUG`
- Food scanner blocks cleanly when AI credits are exhausted.
- To prepare a seeded QA athlete for exhausted-credit smoke testing, run:
  - Dry run: `npm run qa:ai-billing:prepare-smoke -- --email=<athlete-email> --budget=0.25 --remaining=0`
  - Apply: `npm run qa:ai-billing:prepare-smoke -- --email=<athlete-email> --budget=0.25 --remaining=0 --apply`
  - Then run browser QA with `TRAINOMICS_QA_EXPECT_EXHAUSTED=true npm run qa:ai-billing` to assert the exhausted-credit UI.
- Video analysis blocks cleanly when AI credits are exhausted.
- Live voice coach blocks cleanly when AI credits are exhausted.
- WOD generation blocks cleanly when AI credits are exhausted.
- Blocked high-cost flows include a direct AI credit management action.
- Subscription page shows included credits, top-up balance, reset date, and top-up packs.
- Athlete AI credit card warns at 80%, 90%, and exhausted states.
- Blocked flows show upgrade/top-up language, not token/provider wording.
- Platform admin can set a per-athlete AI allowance override.
- Business admin can set Elite AI allowance.
- QA evidence screenshots are written to `test-results/ai-billing-qa/`:
  - Athlete subscription and top-up UI.
  - Admin AI cost monitoring, including provider invoice reconciliation.
  - Platform admin AI allowance override column.
  - Business Elite AI allowance settings when business admin credentials are provided.

## Monitoring First Week

- Check Admin → AI Costs daily.
- Watch food scanner share of total AI spend.
- Watch Standard and Pro average AI cost per athlete.
- Watch margin risk users and whether recommendations are upgrade/top-up/override.
- Compare app-estimated Google cost with the Google invoice import.
- Track top-up conversion and unused top-up balance.
- Adjust Standard/Pro included allowances after 1-2 weeks of real use.
