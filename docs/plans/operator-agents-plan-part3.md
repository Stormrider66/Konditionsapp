# Operator Agents Implementation Plan - Part 3: Phases, Models & Rollout

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Get the infrastructure in place before any agent runs.

1. **Database models** (new in Prisma):
   - `SupportTicket` — user-submitted bug reports and questions
   - `FeatureRequest` — user feature requests with voting
   - `OperatorAgentRun` — log of every agent execution
   - `FounderBrief` — daily brief storage for historical viewing

2. **Base infrastructure**:
   - `lib/operator-agents/` module (mirrors `lib/managed-agents/`)
   - `lib/operator-agents/types.ts` — OperatorAgentType enum, tool types
   - `lib/operator-agents/agent-runner.ts` — scheduled execution framework
   - `lib/operator-agents/tool-executor.ts` — operator-specific tools
   - `lib/operator-agents/index.ts` — exports

3. **Admin UI shell**:
   - New tab "Agents" in `/app/admin/page.tsx`
   - `OperatorAgentsPanel` component with agent status list

4. **Support ticket intake**:
   - Public form at `/support/new` (authenticated users)
   - POST `/api/support/tickets` endpoint
   - In-app "Report a bug" button in all layouts

### Phase 2: Tier 1 Agents (Weeks 2-3)
Build these in order:
1. Platform Health Agent (easiest, immediate value)
2. Cost Guardian (protects you financially)
3. Support Agent (requires support ticket system from Phase 1)
4. Feature Request Curator (simple aggregation)
5. Churn Predictor (requires some prep — signal collection)

### Phase 3: Tier 2 Agents (Weeks 4-5)
6. Founder's Daily Brief (depends on Tier 1 agents feeding it)
7. Onboarding Activation
8. Business Intelligence
9. Marketing Content

### Phase 4: Tier 3 Agents (Week 6)
10. Data Quality
11. Compliance & Security
12. Competitor Intelligence

### Phase 5: Polish (Week 7)
- Email digest templates
- Dashboard UI refinements
- Agent configuration UI (thresholds, schedules)
- Shadow mode for agents that take actions

---

## New Prisma Models

```prisma
// ============================================================================
// SUPPORT SYSTEM
// ============================================================================

model SupportTicket {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Reporter
  userId      String?  // null if anonymous report
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  reporterEmail String? // fallback contact if not logged in

  // Content
  title       String
  description String   @db.Text
  category    String?  // bug | question | feature_request | complaint | other
  priority    String   @default("NORMAL") // LOW | NORMAL | HIGH | URGENT

  // Context at report time
  url           String?  // Page where bug occurred
  userAgent     String?
  screenshot    String?  // URL to uploaded image
  metadata      Json?    // Additional debugging context

  // Agent processing
  agentClassified Boolean @default(false)
  agentDraftResponse String? @db.Text  // AI-drafted reply for founder review
  agentCategory   String?
  agentSimilarTickets String[] @default([]) // IDs of related tickets

  // Linked items
  githubIssueUrl  String?  // If agent created a GH issue
  featureRequestId String? // If reclassified as feature request
  featureRequest  FeatureRequest? @relation(fields: [featureRequestId], references: [id])

  // Resolution
  status        String   @default("OPEN") // OPEN | IN_PROGRESS | RESOLVED | CLOSED
  resolvedAt    DateTime?
  resolvedBy    String?  // founder user ID
  resolution    String?  @db.Text

  @@index([status, priority])
  @@index([userId])
  @@index([createdAt])
}

// ============================================================================
// FEATURE REQUESTS
// ============================================================================

model FeatureRequest {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Submission
  submittedBy String
  user        User   @relation(fields: [submittedBy], references: [id])
  title       String
  description String @db.Text
  category    String? // training | ai | billing | mobile | physio | nutrition | ui

  // Voting
  upvotes     Int    @default(0)
  voters      String[] @default([]) // userIds who upvoted

  // Agent curation
  agentImpactScore Float?  // Calculated 0-100
  agentDuplicateOf String? // Another request ID if duplicate
  agentSummary     String? @db.Text

  // Status
  status String @default("OPEN") // OPEN | PLANNED | IN_PROGRESS | SHIPPED | DECLINED
  githubIssueUrl String?

  // Related support tickets
  supportTickets SupportTicket[]

  @@index([status, agentImpactScore])
  @@index([category])
}

// ============================================================================
// OPERATOR AGENT EXECUTION LOG
// ============================================================================

model OperatorAgentRun {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())

  agentType    String   // SUPPORT | CHURN | FEATURE_CURATOR | PLATFORM_HEALTH | ...
  status       String   // RUNNING | COMPLETED | FAILED
  triggeredBy  String   // cron | event | manual
  startedAt    DateTime
  completedAt  DateTime?
  durationMs   Int?

  // Results
  itemsProcessed Int?       // E.g., tickets triaged, users analyzed
  actionsTaken   Int?       // E.g., emails drafted, issues created
  escalations    Int?       // Items flagged for founder review
  summary        String?    @db.Text  // Human-readable summary
  details        Json?      // Full agent output

  // Usage
  modelUsed      String?    // e.g., "claude-sonnet-4-6"
  tokensUsed     Int        @default(0)
  costUsd        Float      @default(0)

  // Errors
  errorMessage   String?    @db.Text

  @@index([agentType, createdAt])
  @@index([status])
}

// ============================================================================
// FOUNDER'S DAILY BRIEF
// ============================================================================

model FounderBrief {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  date      DateTime @db.Date @unique

  // Content sections (JSON for flexibility)
  revenue        Json     // { mrrDelta, newSignups, arr, etc. }
  attention      Json     // Urgent items needing focus
  topRequest     Json?    // Highest-impact feature request this week
  focusSuggestion String? @db.Text  // AI-suggested top priority
  fullContent    String   @db.Text  // Full markdown email body

  emailedTo     String?   // founder email
  emailedAt     DateTime?
  readAt        DateTime?

  @@index([date])
}
```

---

## Rollout Strategy

### Shadow Mode for Action-Taking Agents
Support Agent, Churn Predictor, and Feature Curator will run in **shadow mode** for the first 2 weeks:
- They analyze data and draft actions
- Drafts appear in admin UI for your review
- Nothing is sent/created externally without your approval
- After validation, graduate to **semi-autonomous** (auto-create GitHub issues, auto-classify tickets, but always escalate decisions that affect users)

### Email Delivery
Daily brief and critical alerts use **Resend** (already integrated):
- Daily brief: 7am UTC to your configured founder email
- Critical alerts: immediately on trigger
- All other reports: on dashboard only (no email noise)

### GitHub Integration
Use the GitHub MCP server when available:
- Support Agent creates issues in your repo from bug reports
- Feature Curator can create/update roadmap issues
- Marketing Content agent can fetch repo metrics (stars, contributors)

### Configuration UI
Later phase — allow you to tune:
- Cost thresholds
- Churn score weights
- Agent schedules
- Email frequency
- Model choice (override defaults)

---

## Integration with Existing Systems

| Existing System | How Operator Agents Use It |
|----------------|---------------------------|
| `lib/managed-agents/` | Shared infrastructure — sessions, model resolution, cost tracking |
| `lib/sentry.ts` | Platform Health Agent queries errors |
| `lib/email/index.ts` | Agents send drafted emails via Resend |
| `lib/ai/ai-service.ts` | Fallback for simple text generation |
| `prisma` (existing models) | Read-only access for data analysis |
| `/app/admin/` | UI for all agent interactions |
| `AIUsageLog` | Cost Guardian reads from here |
| `AgentAuditLog` | Compliance Agent reads from here |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Support tickets auto-classified | >80% within 5 min |
| Churn predictions accuracy | >70% (validated monthly) |
| Founder's time saved/day | 1+ hour |
| Critical incidents caught before user reports | >90% |
| Feature requests actively curated | 100% |
| Operator agent monthly cost | <$15 |
| Agent uptime | >99% |

---

## Security & Privacy

- **All operator agents require `requireAdmin()`** to manually trigger
- Scheduled runs use a `CRON_SECRET` env var (same as existing crons)
- No user PII in agent logs beyond user IDs
- Email drafts to users require explicit approval before sending
- GDPR-sensitive operations (data export, deletion) always escalate
- Audit trail via `OperatorAgentRun` model for compliance

---

## File Structure (Target)

```
lib/operator-agents/
  types.ts                          // AgentType enum, tool types
  agent-runner.ts                   // Scheduled execution framework
  tool-executor.ts                  // Operator-specific tools
  agent-client.ts                   // Anthropic SDK integration (reuses managed-agents)
  index.ts                          // Exports
  prompts/
    support-agent.ts
    churn-predictor.ts
    feature-curator.ts
    platform-health.ts
    cost-guardian.ts
    founders-brief.ts
    onboarding-activation.ts
    business-intelligence.ts
    marketing-content.ts
    data-quality.ts
    compliance-security.ts
    competitor-intel.ts

app/api/cron/operator/
  support/route.ts                  // Support Agent trigger
  churn/route.ts
  feature-curator/route.ts
  platform-health/route.ts
  cost-guardian/route.ts
  daily-brief/route.ts
  onboarding/route.ts
  business-intel/route.ts
  marketing/route.ts
  data-quality/route.ts
  compliance/route.ts
  competitor/route.ts

app/api/support/
  tickets/route.ts                  // Public: POST new ticket
  tickets/[id]/route.ts             // Admin: GET/PATCH

app/admin/
  agents/
    page.tsx                        // Operator agents dashboard
    [agentType]/page.tsx            // Individual agent detail view

components/admin/agents/
  OperatorAgentsPanel.tsx           // Main dashboard
  AgentStatusCard.tsx               // Per-agent card
  FounderBriefViewer.tsx            // Daily brief viewer
  SupportTicketTriage.tsx           // Support agent review UI
  ChurnRiskList.tsx                 // Churn dashboard
  FeatureRequestRoadmap.tsx         // Curated requests
```

This is a comprehensive plan. Ready to start building Phase 1 (foundation + support system).
