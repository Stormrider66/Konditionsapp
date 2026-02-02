# AI Agent System Guide

## Overview

The AI Agent is an autonomous coaching assistant that monitors athlete health, makes training recommendations, and executes adjustments within strict safety guardrails. It operates in a continuous cycle:

```
PERCEPTION → DECISION → GUARDRAILS → EXECUTION
     ↑                                    │
     └────────────────────────────────────┘
```

---

## Architecture

### 1. Perception Layer (`lib/agent/perception/`)

Collects athlete state every **30 minutes** from multiple sources:

| Component | Data Sources | Outputs |
|-----------|--------------|---------|
| **Readiness** | Daily check-ins, Garmin, Strava | Score (0-100), fatigue, sleep, stress |
| **Training Load** | Workout history | Acute (7d), Chronic (28d), ACWR ratio |
| **Injury** | Assessments, acute reports | Active injuries, restrictions, pain trends |
| **Behavior** | Check-in streak, completions | Streak, missed workouts, completion rate |
| **Patterns** | All above | Overtraining, monotony, strain spikes |

**Pattern Detection:**
- `OVERTRAINING`: High ACWR + low readiness
- `UNDERRECOVERY`: 3+ days with readiness <50
- `STRAIN_SPIKE`: ACWR jump ≥50%
- `DECLINING_PERFORMANCE`: Engagement drop + low completion

---

### 2. Decision Engine (`lib/agent/decision/`)

Runs every **15 minutes** on fresh perceptions. Applies rules in priority order:

**Safety Rules (Highest Priority):**
| Condition | Action | Priority |
|-----------|--------|----------|
| ACWR ≥ 2.0 | 50% intensity reduction | URGENT |
| Pain ≥ 9/10 | Escalate + Skip workout | URGENT |
| Pain 7-8/10 | Escalate to coach | HIGH |
| Active restriction | Reduce intensity 30% | HIGH |

**Recovery Rules:**
| Condition | Action | Priority |
|-----------|--------|----------|
| Readiness <40 | Reduce intensity 30% | NORMAL |
| Fatigue >70 | Suggest recovery activity | NORMAL |
| ACWR 1.5-2.0 | Inject rest day | HIGH |
| Overtraining pattern | Escalate for review | HIGH |

**Confidence Scoring:**
- Based on data recency, source quality, pattern consistency
- LOW (<0.6) → MEDIUM (0.6-0.8) → HIGH (0.8-0.95) → VERY_HIGH (0.95+)
- Actions need ≥0.8 confidence for auto-apply

---

### 3. Guardrails System (`lib/agent/guardrails/`)

Every action passes through safety, consent, and autonomy checks.

**Absolute Safety Limits (Non-negotiable):**
```
ACWR_CRITICAL: 2.0         - Emergency intervention
MAX_INTENSITY_REDUCTION: 50%
MIN_INTENSITY_FLOOR: 30%
MIN_REST_DAYS_PER_WEEK: 1
MAX_CONSECUTIVE_HARD_DAYS: 4
PAIN_ESCALATION: 7+
PAIN_STOP: 9+
```

**Autonomy Levels:**
| Level | Behavior |
|-------|----------|
| **ADVISORY** | All actions proposed for manual review |
| **LIMITED** | Only intensity reductions auto-apply |
| **SUPERVISED** | Most adjustments auto-apply, coach notified |
| **AUTONOMOUS** | Full auto-apply within safety bounds |

**Consent Requirements:**
- `dataProcessingConsent` + `healthDataProcessingConsent` = Required
- `automatedDecisionConsent` = Enables auto-apply
- Withdrawal stops all agent activity immediately

---

### 4. Execution Layer (`lib/agent/execution/`)

Executes validated actions, respecting autonomy and preferences.

**Action Types:**
| Action | Effect |
|--------|--------|
| `WORKOUT_INTENSITY_REDUCTION` | Lowers workout intensity by % |
| `WORKOUT_DURATION_REDUCTION` | Shortens workout duration |
| `REST_DAY_INJECTION` | Cancels workouts, adds recovery |
| `WORKOUT_SKIP_RECOMMENDATION` | Cancels specific workout |
| `RECOVERY_ACTIVITY_SUGGESTION` | Suggests easy activity |
| `ESCALATE_TO_COACH` | Creates coach notification |
| `CHECK_IN_NUDGE` | Prompts athlete engagement |

**Execution Result Statuses:**
- `PROPOSED` → Waiting for review
- `AUTO_APPLIED` → Executed automatically
- `ACCEPTED` → Manually approved by athlete
- `REJECTED` → Athlete declined
- `EXPIRED` → Timed out (24h default)

---

### 5. GDPR Compliance (`lib/agent/gdpr/`)

| Component | Purpose |
|-----------|---------|
| **Consent Manager** | Grant/update/withdraw consent with version tracking |
| **Audit Logger** | Immutable log of all data access (7-year retention) |
| **Data Export** | Full personal data export (Article 20) |
| **Data Deletion** | Right to erasure (Article 17) |

---

## API Routes

### Athlete Routes (`/api/agent/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/status` | GET | Get agent status, consent, pending actions |
| `/consent` | GET/POST | View or grant consent |
| `/consent/withdraw` | POST | Withdraw all consent |
| `/preferences` | GET/PUT | View or update preferences |
| `/actions` | GET | List all agent actions |
| `/actions/[id]/accept` | POST | Accept proposed action |
| `/actions/[id]/reject` | POST | Reject with feedback |
| `/data/export` | POST | Export all personal data |
| `/data/delete` | POST | Delete all personal data |

### Coach Routes (`/api/coach/agent/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/oversight` | GET | Get pending oversight items |
| `/oversight/summary` | GET | Get metrics summary |
| `/oversight/[id]/approve` | POST | Approve action |
| `/oversight/[id]/reject` | POST | Reject action |
| `/oversight/[id]/modify` | POST | Approve with modifications |
| `/metrics` | GET | Agent performance metrics |

---

## Cron Jobs (`/api/cron/agent/`)

| Job | Frequency | Purpose |
|-----|-----------|---------|
| `perceive` | 30 min | Create perception snapshots |
| `decide` | 15 min | Run decision engine |
| `execute` | 10 min | Execute pending actions |
| `cleanup` | Daily | Remove old audit logs (>7yr) |
| `learn` | Daily | Process learning feedback |

---

## Data Flow Example

**Scenario: Low readiness + high ACWR**

```
1. PERCEPTION (30 min cycle)
   ├─ readinessScore: 35/100
   ├─ acwr: 1.7 (DANGER zone)
   └─ detects: UNDERRECOVERY pattern (MEDIUM)

2. DECISION (15 min cycle)
   ├─ Recovery Rules triggered:
   │   ├─ readiness < 40 → INTENSITY_REDUCTION (30%)
   │   └─ ACWR > 1.5 → REST_DAY_INJECTION
   └─ Actions created: 2

3. GUARDRAILS
   ├─ Consent valid: ✓
   ├─ Safety bounds: ✓ (30% < 50% max)
   ├─ Autonomy: SUPERVISED allows intensity reduction
   └─ Rest day needs coach oversight (non-AI-coached)

4. EXECUTION
   ├─ Intensity reduction: AUTO_APPLIED
   ├─ Rest day: PROPOSED (coach review)
   └─ Notifications sent

5. AUDIT
   └─ All actions logged with reasoning
```

---

## AI-Coached vs Coach-Managed Athletes

| Aspect | AI-Coached | Coach-Managed |
|--------|------------|---------------|
| Default Autonomy | SUPERVISED | ADVISORY |
| Escalations | → Support Team | → Assigned Coach |
| Max Intensity Reduction | 30% | 20% |
| Auto-apply | More freedom | More conservative |
| Coach Oversight | Not required | Required for HIGH/URGENT |

---

## Key Files

```
lib/agent/
├── index.ts              # Main exports
├── types.ts              # TypeScript interfaces
├── perception/           # Data collection
│   ├── readiness.ts
│   ├── training-load.ts
│   ├── injury.ts
│   └── behavior.ts
├── decision/             # Decision engine
│   ├── engine.ts
│   ├── confidence.ts
│   └── rules/
├── execution/            # Action execution
│   ├── workout-modifier.ts
│   └── rest-day-injector.ts
├── guardrails/           # Safety system
│   ├── safety-bounds.ts
│   ├── consent.ts
│   └── autonomy.ts
└── gdpr/                 # Compliance
    ├── consent-manager.ts
    ├── audit-logger.ts
    └── data-export.ts
```

---

## UI Components

**Athlete:**
- `AgentRecommendationsPanel` - Dashboard widget showing pending actions
- `AgentStatusBadge` - Shows agent state (active/paused/disabled)
- `AgentConsentBanner` - Prompts for consent if needed
- `AgentActionCard` - Individual action with accept/reject

**Coach:**
- `AgentOversightQueue` - List of items needing review
- `AgentApprovalDialog` - Approve/reject/modify actions
- `AgentPerformanceMetrics` - Agent effectiveness dashboard
