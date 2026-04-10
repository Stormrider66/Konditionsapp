# Operator Agents Implementation Plan - Part 1: Vision & Architecture

## Executive Summary

Build **12 operator agents** that help the founder run the Elite Training Platform — all accessible from the existing `/admin` super admin page. Agents are **semi-autonomous** (can act on safe operations, escalate risky ones), run **on a schedule** to keep costs predictable, and use a **mix of Haiku/Sonnet/Opus** based on task complexity.

## Current State

- **Super admin page**: `/app/admin/` (exists) with 8 tabs (Overview, Users, Businesses, Pricing, Contracts, Monitoring, Data-Health, AI-Models)
- **Admin role**: `requireAdmin()` in `lib/auth-utils.ts`, `AdminRole` enum with `SUPER_ADMIN | ADMIN | SUPPORT`
- **Sentry**: Fully integrated (production only) via `lib/sentry.ts`
- **Managed Agents foundation**: Already built (`lib/managed-agents/`) — operator agents will extend this

## What's Missing

| Gap | Fix |
|-----|-----|
| No support ticket system | Build `SupportTicket` + `FeatureRequest` Prisma models |
| No analytics aggregation | Build BI agent that queries Prisma directly |
| No Slack/email digest | Add Resend email templates for daily brief |
| No GitHub issue creation from user reports | Use GitHub MCP tools |

## The 12 Operator Agents

### Tier 1: Critical (Build First)
1. **Support Agent** — triages bug reports, drafts responses, creates GitHub issues
2. **Churn Predictor** — identifies at-risk users, suggests interventions
3. **Feature Request Curator** — collects, dedupes, prioritizes requests
4. **Platform Health Agent** — monitors Sentry, cron failures, API latency
5. **Cost Guardian** — tracks AI spend, predicts month-end, flags runaways

### Tier 2: Growth & Retention (Build Second)
6. **Founder's Daily Brief** — every morning, summarizes revenue, signups, tickets, at-risk users
7. **Onboarding Activation** — tracks funnel, nudges stuck users
8. **Business Intelligence** — weekly MRR/churn/cohort reports
9. **Marketing Content** — generates social posts, blog drafts from app data

### Tier 3: Operations (Build Third)
10. **Data Quality** — detects corrupted records, orphans, integrity violations
11. **Compliance & Security** — monitors consent withdrawals, audit log anomalies
12. **Competitor Intelligence** — weekly competitor feature/pricing digest

## Architecture

```
Scheduled Triggers (Vercel Cron)         Operator Agents              Your Infrastructure
+----------------------+                +----------------------+      +---------------------+
| Daily 7am UTC        |--------------> | Founder's Daily Brief|----> | Resend (email)      |
| Every 15 min         |--------------> | Platform Health      |----> | Sentry (monitor)    |
| Every hour           |--------------> | Cost Guardian        |----> | Prisma (read metric)|
| Daily 6am            |--------------> | Churn Predictor      |----> | Stripe (billing)    |
| Every 30 min         |--------------> | Support Agent        |----> | GitHub MCP          |
| Weekly Monday 8am    |--------------> | Business Intelligence|----> | Admin Dashboard UI  |
| Daily 9am            |--------------> | Onboarding Activation|      |                     |
| Weekly Sunday 2am    |--------------> | Feature Curator      |      |                     |
| Daily 4am            |--------------> | Data Quality         |      |                     |
| Daily 5am            |--------------> | Compliance Security  |      |                     |
| Weekly Friday 3pm    |--------------> | Competitor Intel     |      |                     |
+----------------------+                | Marketing Content    |      |                     |
                                        +----------------------+      +---------------------+
           ^                                        |                            ^
           |                                        v                            |
           |             +----------------------------------------+               |
           +------------>| Operator Agent Event Log (new model)  |<--------------+
                         | - lastRun, result, tokensUsed, costUsd |
                         | - actions taken, items escalated       |
                         +----------------------------------------+
```

## Semi-Autonomous Model

| Action Type | Autonomy Level | Example |
|------------|--------------|---------|
| Read-only analysis | Full autonomous | Query DB, read Sentry, generate reports |
| Draft content | Full autonomous | Draft email, social post — stored for your review |
| Create internal records | Full autonomous | Create GitHub issues, tag support tickets |
| Send notifications to you | Full autonomous | Daily digest emails, dashboard updates |
| Contact users | **Escalate** | Drafts go to your inbox for approval before sending |
| Modify data | **Escalate** | Always requires your confirmation |
| Process refunds | **Escalate** | Always requires your confirmation |

## Model Strategy (Cost-Optimized)

| Agent | Default | Why |
|-------|---------|-----|
| Support Agent | **Sonnet** | Needs good reasoning for triage + empathetic responses |
| Churn Predictor | **Sonnet** | Pattern recognition across many signals |
| Feature Request Curator | **Haiku** | Simple categorization + deduplication |
| Platform Health | **Haiku** | Alert routing, lookup-heavy |
| Cost Guardian | **Haiku** | Math + thresholds, no complex reasoning |
| Founder's Daily Brief | **Sonnet** | Synthesis across many data points |
| Onboarding Activation | **Haiku** | Rule-based nudges |
| Business Intelligence | **Sonnet** | Trend analysis, forecasting |
| Marketing Content | **Sonnet** | Quality content matters |
| Data Quality | **Haiku** | Pattern detection, binary checks |
| Compliance & Security | **Sonnet** | Legal sensitivity, nuanced judgment |
| Competitor Intelligence | **Opus** | Deep synthesis across web research |

**Expected monthly cost**: ~$15-30 total for all 12 operator agents (since they run periodically, not per-event).

See Part 2 for individual agent specifications.
See Part 3 for implementation phases and data models.
