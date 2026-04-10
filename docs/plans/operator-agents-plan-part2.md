# Operator Agents Implementation Plan - Part 2: Agent Specifications

## Tier 1: Critical Agents

### 1. Support Agent (Sonnet, every 30 min)

**Purpose**: Triage bug reports and user questions, draft responses, create GitHub issues for real bugs.

**Trigger**: New `SupportTicket` created, or scheduled scan every 30 min.

**Tools**:
```typescript
readOpenTickets()                   // Get unresolved support tickets
readTicket(ticketId)                // Full ticket details
classifyTicket(ticketId, category)  // bug | question | feature_request | complaint
draftResponse(ticketId, body)       // Draft for your review (not sent)
createGitHubIssue(title, body, labels) // For confirmed bugs
escalateToFounder(ticketId, reason) // Mark as urgent
searchSimilarTickets(query)         // Find related resolved tickets
readAppContext(clientId)            // Check user's account state if relevant
```

**Workflow**:
1. Get new tickets since last run
2. For each: classify, search similar resolved, draft response
3. If it's a bug: create GitHub issue, link to ticket
4. If it's a feature request: route to Feature Request Curator
5. If it's urgent/angry: escalate to founder
6. Post summary to daily brief

**Outputs**: Drafted responses in admin UI for your review, GitHub issues created, ticket categories assigned.

---

### 2. Churn Predictor (Sonnet, daily 6am)

**Purpose**: Identify users at risk of churning and suggest interventions.

**Trigger**: Daily cron at 6am UTC.

**Tools**:
```typescript
getActiveSubscriptions()            // All paying users
getUserEngagement(userId, days: 30) // Login count, features used, check-ins
getFailedPayments()                 // Recent payment failures
getSupportTicketHistory(userId)     // Past complaints
getUsageTrend(userId)               // Is engagement dropping?
calculateChurnScore(userId)         // 0-100 composite risk score
draftRetentionEmail(userId, reason) // Personalized re-engagement
flagForFounderReview(userId, score) // High-value at-risk users
```

**Signals weighted**:
- No login in 14+ days (weight: 25)
- Check-in streak broken (weight: 15)
- Failed payment in last 30 days (weight: 30)
- Support ticket with negative sentiment (weight: 20)
- Subscription tier downgrade (weight: 10)

**Outputs**:
- At-risk user list on admin dashboard (sorted by score + LTV)
- Draft retention emails ready for your approval
- Trend report in weekly BI brief

---

### 3. Feature Request Curator (Haiku, weekly Sunday 2am)

**Purpose**: Structure chaotic feature requests into a prioritized roadmap.

**Trigger**: Weekly cron, plus event-driven on new `FeatureRequest` submission.

**Tools**:
```typescript
getOpenFeatureRequests()           // Unprocessed requests
readFeatureRequest(id)             // Full details with votes
findDuplicates(requestId)          // Semantic similarity search
mergeRequests(id1, id2)            // Combine duplicates
categorizeFeatureRequest(id, cat)  // training | ai | billing | mobile | physio | nutrition
scoreImpact(id)                    // Based on user tier, votes, frequency
generateRoadmapSummary()           // Weekly prioritized list
```

**Scoring formula**:
```
impact_score =
  (vote_count * 2) +
  (requesting_user_tier_weight) +   // Enterprise: 5, Pro: 3, Basic: 1
  (frequency_mentioned) +
  (affected_user_percentage * 10)
```

**Outputs**: Roadmap tab on admin dashboard with top 20 requests ranked by impact score.

---

### 4. Platform Health Agent (Haiku, every 15 min)

**Purpose**: Monitor Sentry errors, cron job failures, API latency, DB issues.

**Trigger**: Cron every 15 minutes.

**Tools**:
```typescript
getSentryErrors(minutes: 15)        // Recent errors grouped by issue
getCronJobStatus()                  // Which crons failed in last hour
getAPILatency(endpoint?)            // Avg/p95 by endpoint
getDatabaseHealth()                 // Connection pool, slow queries
alertFounder(severity, message)     // Email for CRITICAL issues only
logHealthSnapshot()                 // Store for trend analysis
```

**Alert thresholds**:
- CRITICAL: >10 errors/min, cron failed 3x in a row, API p95 >5s
- HIGH: 5-10 errors/min, cron failed 1-2x, API p95 >2s
- MEDIUM: Error rate +50% vs baseline

**Outputs**: Real-time health widget on admin dashboard, email alerts for CRITICAL only.

---

### 5. Cost Guardian (Haiku, hourly)

**Purpose**: Track AI API spend, prevent budget blowups.

**Trigger**: Hourly cron.

**Tools**:
```typescript
getAIUsageLast24h()                 // From AIUsageLog model
getAIUsageThisMonth()               // Running total
getPerUserCosts(days: 30)           // Top spenders
predictMonthEnd()                   // Linear projection
identifyAnomalies()                 // Users with sudden spend spikes
alertFounder(message)               // If forecasted > threshold
```

**Alert thresholds** (you'll configure):
- Monthly forecast exceeds $X
- Single user spends >$Y/day
- Total cost growing >30% week-over-week

**Outputs**: Cost dashboard widget with forecast, anomaly alerts.

---

## Tier 2: Growth & Retention

### 6. Founder's Daily Brief (Sonnet, daily 7am UTC)

**Purpose**: Your personal COO — every morning, tells you what matters.

**Trigger**: Daily cron at 7am UTC (adjustable to your timezone).

**Tools**:
```typescript
getRevenueYesterday()              // New signups, MRR delta
getSignupsYesterday()              // New users by tier
getOpenSupportTickets(priority)    // Urgent/high tickets
getCriticalErrors(hours: 24)       // From Platform Health
getAtRiskUsers(limit: 5)           // From Churn Predictor
getFeatureRequestHighlights()      // Top 3 by impact this week
getCostToday()                     // AI API spend today
getKeyMetrics()                    // Active users, engagement, churn
sendDailyBriefEmail(content)       // Via Resend to you
```

**Output format** (email + dashboard widget):
```
Good morning. Here's your brief for [DATE]:

REVENUE
- +$127 MRR yesterday (3 new Pro, 1 Business)
- 12 new signups
- $3.47 AI spend

ATTENTION NEEDED
- 2 urgent support tickets (link)
- Sentry: 3 new errors in checkout flow
- Emma Larsson (Enterprise, $299/mo) at-risk — churn score 78

TOP FEATURE REQUEST THIS WEEK
- "Mobile app for athletes" (votes: 34, impact: 87)

TODAY'S FOCUS SUGGESTION
Based on data: review checkout errors first, then reach out to Emma.
```

---

### 7. Onboarding Activation Agent (Haiku, daily 9am UTC)

**Purpose**: Track new user funnel, identify stuck users, send nudges.

**Trigger**: Daily cron.

**Tools**:
```typescript
getNewUsersLast7d()                // New signups
getOnboardingProgress(userId)      // Which steps completed
findStuckUsers(step)               // Users stuck on specific step >3 days
draftOnboardingNudge(userId, step) // Personalized email
identifyDropoffPoints()            // Where users abandon
```

**Outputs**: Activation funnel widget, stuck user list, draft nudge emails.

---

### 8. Business Intelligence (Sonnet, weekly Monday 8am)

**Purpose**: Weekly executive report on business health.

**Trigger**: Weekly cron.

**Tools**:
```typescript
getMRRTrend(weeks: 12)             // Monthly Recurring Revenue
getChurnRate(days: 30)             // User + revenue churn
getCohortRetention()               // Cohort analysis
getARPU()                          // Average Revenue Per User
getLTV()                           // Customer Lifetime Value
getCAC()                           // If ad spend data available
getFunnelConversion()              // Visitor -> trial -> paid
generateWeeklyReport()             // Comprehensive BI report
```

**Outputs**: Weekly email report + BI tab on admin dashboard with charts.

---

### 9. Marketing Content Agent (Sonnet, weekly Friday 3pm)

**Purpose**: Generate marketing content from real platform data (with consent).

**Trigger**: Weekly cron + on-demand.

**Tools**:
```typescript
findMilestoneEvents(days: 7)       // "100 races this week", "5000 users"
findSuccessStories()               // Athletes who hit major PRs (consented)
draftSocialPost(topic, platform)   // LinkedIn, X, Instagram
draftBlogPost(topic, outline)      // Full markdown draft
draftNewsletter(highlights)        // Weekly newsletter for users
```

**Outputs**: Content queue for your review/publish.

---

## Tier 3: Operations

### 10. Data Quality Agent (Haiku, daily 4am)

**Purpose**: Detect corrupted records, orphans, integrity issues.

**Tools**:
```typescript
findOrphanedRecords()              // FK violations, dangling references
findDuplicateRecords()             // Potential duplicates
checkLactateTestValidity()         // Decreasing values, etc.
checkDateRangeSanity()             // Birth dates, workout dates
getDataQualityScore()              // Overall health score
```

**Outputs**: Data health dashboard (already exists in admin), auto-generated report.

---

### 11. Compliance & Security Agent (Sonnet, daily 5am)

**Purpose**: Monitor consent withdrawals, audit log anomalies, GDPR requests.

**Tools**:
```typescript
getConsentWithdrawals(days: 7)     // Recent withdrawals
getGDPRRequests()                  // Export/delete requests
getAuditLogAnomalies()             // Unusual admin actions
getFailedLogins(hours: 24)         // Brute force detection
getSuspiciousPatterns()            // IP changes, rapid account access
alertFounder(severity, message)
```

**Outputs**: Compliance dashboard, security alert email for suspicious activity.

---

### 12. Competitor Intelligence (Opus, weekly Friday 10am)

**Purpose**: Monitor competitors, industry trends, pricing.

**Tools**:
```typescript
webSearch(query)                   // Current competitor features
fetchCompetitorPricing()           // Scrape known competitor pages
readIndustryNews(category)         // Fitness tech news
analyzePositioning()               // How do we compare?
generateCompetitorDigest()         // Weekly summary
```

**Outputs**: Weekly competitor digest email + Market Intel tab on dashboard.

---

## Model Cost Summary

| Agent | Runs | Est. Tokens/Run | Est. $/Month |
|-------|------|----------------|-------------|
| Support | ~48/day | 3000 | ~$5 |
| Churn Predictor | 1/day | 8000 | ~$1 |
| Feature Curator | 1/week | 5000 | ~$0.10 |
| Platform Health | ~96/day | 500 | ~$1 |
| Cost Guardian | 24/day | 500 | ~$0.30 |
| Daily Brief | 1/day | 5000 | ~$0.70 |
| Onboarding | 1/day | 3000 | ~$0.20 |
| BI | 1/week | 10000 | ~$0.20 |
| Marketing | 1/week + on-demand | 8000 | ~$1 |
| Data Quality | 1/day | 2000 | ~$0.10 |
| Compliance | 1/day | 3000 | ~$0.40 |
| Competitor | 1/week | 15000 | ~$1 |
| **TOTAL** | | | **~$11/month** |

Significantly under the earlier estimate of $15-30 because most agents run infrequently.

See Part 3 for implementation phases, Prisma models, and rollout strategy.
