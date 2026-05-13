# Athlete AI Billing Implementation Plan

Last updated: 2026-05-13

## Goal

Launch athlete subscriptions with predictable AI unit economics:

- Standard at 199 SEK/month.
- Pro at 399 SEK/month.
- Elite as custom-priced coach/PT-connected subscription.
- No "unlimited AI" promise in self-serve tiers.
- Monthly included AI allowance with hard caps and optional paid top-ups.
- Cost tracking that reconciles app-estimated usage against provider invoices.

## Current State

Already present:

- `AthleteSubscriptionTier`: `FREE`, `STANDARD`, `PRO`, `ELITE`.
- Seed pricing already has athlete Standard at 199 SEK/month and Pro at 399 SEK/month.
- Elite has business-specific price fields on `Business`:
  - `elitePriceMonthly`
  - `elitePriceYearly`
  - `eliteDescription`
- Stripe checkout and webhook plumbing exists for athlete subscriptions.
- Admin pricing management exists through `PricingTier`.
- AI usage logging exists through `AIUsageLog`.
- Google billing CSV import and provider invoice reconciliation exist.

Not launch-ready:

- AI access is still mostly controlled by `aiChatMessagesUsed` / `aiChatMessagesLimit`.
- Food scan, image generation, briefings, video/audio analysis, and program/WOD generation need one shared AI allowance.
- Some copy still implies unlimited AI for Pro.
- Checkout has API/UI contract drift to verify:
  - UI sends `billingCycle`; checkout API expects `cycle`.
  - UI expects `url`; checkout API returns `checkoutUrl`.
- Stripe price source of truth is split between environment variables and `PricingTier`.
- Top-up credit purchases are not implemented.
- Elite needs custom AI allowance and operational onboarding rules.

## Product Decisions

### Self-Serve Tiers

| Tier | Monthly Price | Positioning | AI Policy |
| --- | ---: | --- | --- |
| Free | 0 SEK | Read-only/basic trial surface | Very limited AI or none |
| Standard | 199 SEK | Normal athlete daily use | Included AI allowance, hard cap |
| Pro | 399 SEK | Serious self-coached athlete | Larger included AI allowance, hard cap or short grace |
| Elite | Custom | Coach/PT-connected premium service | Custom allowance and service terms |

### AI Cost Targets

Target internal AI cost as a percent of subscription revenue:

- Standard: 10-15%, target 20-30 SEK/month.
- Pro: 10-20%, target 40-80 SEK/month.
- Elite: custom, based on coach/PT margin and promised service level.

Initial allowance proposal:

| Tier | Internal Monthly AI Budget | User-Facing Language |
| --- | ---: | --- |
| Free | 0-5 SEK | Limited AI trial |
| Standard | 25-35 SEK | AI credits for daily use |
| Pro | 60-90 SEK | Larger AI credits for advanced use |
| Elite | Custom | Included AI support, set by coach/PT package |

Final limits should be adjusted after 1-2 weeks of post-thinking-control usage data.

### Top-Ups

Launch simple one-time AI credit packs:

| Pack | Price | Notes |
| --- | ---: | --- |
| Small | 49 SEK | Good for occasional extra scans |
| Medium | 99 SEK | Default heavy-user rescue |
| Large | 199 SEK | For short heavy blocks |

Top-up credits should be consumed after included monthly credits and can expire after 3-6 months.

## Implementation Phases

## Phase 1: Fix Pricing And Checkout Contracts

Purpose: Make the existing subscription flow reliable before adding more billing complexity.

Tasks:

- Confirm Standard is 199 SEK/month everywhere.
- Confirm Pro is 399 SEK/month everywhere.
- Remove or replace "unlimited AI" copy in pricing, subscription pages, and info content.
- Fix checkout API contract:
  - Accept `billingCycle` and/or normalize it to `cycle`.
  - Return both `checkoutUrl` and `url` temporarily for compatibility.
- Decide Stripe price source of truth:
  - Preferred: `PricingTier.stripePriceIdMonthly` / `stripePriceIdYearly`.
  - Keep env price IDs only as fallback during migration.
- Add tests for checkout request parsing and returned URL shape.

Acceptance criteria:

- Standard and Pro checkout both work from athlete subscription UI.
- Copy no longer promises unlimited AI.
- Stripe webhook creates/updates `AthleteSubscription` with correct tier and feature flags.

## Phase 2: Add Client-Level AI Allowance Model

Purpose: Move from message counts to one shared AI allowance for all AI features.

Recommended schema additions:

- Add `clientId String?` to `AIUsageLog`.
- Add relation from `AIUsageLog.clientId` to `Client.id`.
- Add `AIAllowanceAccount` or similar:
  - `id`
  - `clientId`
  - `periodStart`
  - `periodEnd`
  - `includedBudgetSek`
  - `includedUsedSek`
  - `topUpBalanceSek`
  - `hardCapSek`
  - `status`
  - timestamps
- Add `AITopUpPurchase` or ledger table:
  - `id`
  - `clientId`
  - `stripePaymentIntentId`
  - `amountPaidSek`
  - `creditsSek`
  - `creditsRemainingSek`
  - `expiresAt`
  - timestamps

Important design decision:

- Store allowance in SEK-denominated internal cost credits, not "messages".
- Convert estimated USD cost to SEK using a configurable exchange rate for enforcement.
- Keep raw model usage in `AIUsageLog`.

Acceptance criteria:

- Every athlete AI usage row can be attributed to `clientId` where available.
- Current monthly allowance and remaining balance can be queried in one helper.
- Existing logs without `clientId` continue to work.

## Phase 3: Central AI Metering Helper

Purpose: Make AI enforcement consistent and avoid feature-by-feature drift.

Create a shared helper, for example:

- `lib/ai/billing/allowance.ts`
- `checkAiAllowance(clientId, estimatedSek, category)`
- `recordAiUsageAndDebit({ clientId, userId, category, provider, model, costSek })`
- `getAiAllowanceStatus(clientId)`

Behavior:

- Before expensive calls, check remaining included + top-up credits.
- Allow a small reserve for calls where exact cost is only known after completion.
- After call completes, debit actual estimated cost.
- If over cap:
  - return structured error
  - show upgrade/top-up action
  - do not call the provider

Categories to support from day one:

- `food_scan`
- `food_scan_text`
- `food_scan_refine`
- `food_scan_recipe`
- `food_scan_audio_transcription`
- `briefing`
- `visual_report_*`
- `video_analysis_*`
- `audio_journal_process`
- `chat`
- `wod`
- `program_generation`

Acceptance criteria:

- Food scanner and visual reports are blocked before provider calls when allowance is exhausted.
- Usage is debited after successful provider calls.
- Failed provider calls do not debit user allowance unless the provider billed meaningful usage and we logged it.

## Phase 4: Gate Cost Drivers First

Purpose: Protect the business before all minor AI surfaces are perfect.

Implementation order:

1. Food photo scan.
2. Food text scan.
3. Food refinement.
4. Food recipe scan.
5. Food audio transcription.
6. Visual reports and image generation.
7. Morning briefings.
8. AI chat.
9. Video/audio analysis.
10. WOD/program generation.

Notes:

- Food scanner should use `low` Gemini thinking level initially to protect quality.
- Briefings and routine report generation can use low/minimal thinking.
- Any high-thinking mode should be explicitly reserved for complex analysis features.

Acceptance criteria:

- The two biggest known cost drivers, food scanner and image generation, are controlled by allowance before launch.
- Unit Economics shows invoice gap trending down after deployment.

## Phase 5: Subscription UX

Purpose: Make limits understandable without making the product feel punitive.

Subscription page changes:

- Show Free, Standard, Pro, and Elite.
- Standard: 199 SEK/month.
- Pro: 399 SEK/month.
- Elite: "Custom pricing with coach/PT".
- Replace message counter with AI allowance meter:
  - Included credits used.
  - Top-up credits remaining.
  - Reset date.
- Warnings:
  - 70%: gentle notice.
  - 90%: suggest upgrade/top-up.
  - 100%: hard cap and top-up/upgrade CTA.

User-facing language:

- Use "AI credits" or "monthly AI allowance".
- Avoid "token", "provider cost", and "unlimited".
- Explain that heavy AI use can be expanded with extra credits.

Acceptance criteria:

- A normal athlete understands why a feature is blocked and what to do next.
- Upgrade/top-up path is one click away when blocked.

## Phase 6: Stripe Top-Up Credits

Purpose: Monetize heavy users without forcing everyone into a higher subscription.

Tasks:

- Add top-up products/prices in Stripe.
- Add checkout route for one-time AI credit purchases.
- Add webhook handling for successful top-up payment.
- Add `AITopUpPurchase` or ledger entry on payment success.
- Add idempotency by Stripe event/payment intent id.

Acceptance criteria:

- User can buy extra AI credits without changing subscription.
- Credits are available immediately after webhook confirmation.
- Duplicate Stripe events do not double-credit the account.

## Phase 7: Elite Custom Pricing And Allowance

Purpose: Keep Elite as a service package, not just a larger AI tier.

Tasks:

- Keep Elite tied to business/coach/PT configuration.
- Allow business owner/admin to set:
  - monthly price
  - yearly price
  - description
  - included AI allowance
  - assigned coach/PT
- Ensure checkout requires business context for Elite.
- Add admin view for Elite subscribers and their AI usage.

Acceptance criteria:

- Elite cannot be purchased without a business/coach context.
- Elite allowance is configurable per business or per subscription.
- Revenue share and coach assignment remain intact.

## Phase 8: Monitoring And Rollout

Purpose: Validate economics before broad release.

Dashboards/checks:

- Unit Economics provider reconciliation.
- AI usage by tier.
- AI usage by category.
- Heavy users list.
- Google invoice vs app-estimated cost.
- Top-up conversion rate.
- Food scanner quality complaints after lower thinking setting.

Rollout:

1. Internal only.
2. Current 2-3 heavy AI users.
3. One week of data.
4. Adjust allowance values.
5. Launch Standard/Pro self-serve.
6. Launch Elite only with selected businesses/PTs.

Acceptance criteria:

- App-estimated Google cost covers at least 80-90% of Google invoice cost.
- Average Standard AI cost stays under target.
- Average Pro AI cost stays under target.
- Heavy users either upgrade or buy top-ups.

## Technical Watchpoints

- Do not use "unlimited AI" anywhere in customer-facing copy.
- Do not rely on message counts for AI cost control.
- Ensure all provider calls pass enough context to attribute cost to `clientId`.
- Keep invoice reconciliation because provider pricing can change.
- Keep hard caps as default; soft caps create margin risk.
- Be careful with trials: trial users need AI allowance too, or a very explicit trial cap.
- Stripe prices are immutable; changing a price means creating a new Stripe Price and updating references.

## Suggested First PR / Commit Scope

First implementation chunk should be small and deployment-safe:

1. Fix checkout request/response contract.
2. Replace Pro "unlimited AI" copy.
3. Add a shared pricing/plan config for athlete tiers.
4. Add tests for tier prices and checkout payload.

Second chunk:

1. Add client-level AI allowance schema.
2. Add allowance helper.
3. Gate food scanner and visual reports.

Third chunk:

1. Add AI allowance UI meter.
2. Add top-up checkout.
3. Add webhook crediting.

## Open Decisions

- Exact Standard included AI allowance.
- Exact Pro included AI allowance.
- Whether Pro should have a small grace buffer before hard cap.
- Top-up credit expiry period.
- Whether Elite allowance is business-level default only or configurable per athlete.
- Whether trial users receive Standard allowance or a smaller trial-only allowance.
