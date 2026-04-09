# Claude Managed Agents Implementation Plan - Part 1: Vision & Architecture

## Executive Summary

Replace 17 cron-based jobs with event-driven Claude Managed Agents to achieve real-time coaching, eliminate polling overhead, and enable multi-step autonomous workflows. Integrate Garmin/wearable data as real-time triggers, expand physio-agent feedback loops, and introduce a Nutrition Agent for weight management.

## Current State: Cron-Based Architecture

| Layer | Current Mechanism | Frequency | Latency |
|-------|------------------|-----------|---------|
| Perceive | Snapshot athlete state | Every 30 min | Up to 30 min stale |
| Decide | Generate proposed actions | Every 15 min | Up to 15 min delay |
| Execute | Apply actions to workouts | Every 5 min | Up to 5 min delay |
| Learn | Process acceptance patterns | Daily 3 AM | Up to 24 hours |
| Pattern Detection | Analyze 7-day trends | Twice daily | Up to 12 hours |
| Program Generation | Poll for completion | Every minute | Polling waste |
| Deep Research | Poll external providers | Every minute | Polling waste |
| Morning Briefings | Generate per timezone | Hourly | Fixed schedule |
| Coach Alerts | Flag issues | Every 30 min | Up to 30 min |

**Total worst-case latency**: An athlete reporting 9/10 pain waits up to 50 minutes before intervention.

**With Managed Agents**: Event-driven response in seconds.

---

## Target Architecture: Event-Driven Managed Agents

### Architecture Diagram

```
EVENT SOURCES                    MANAGED AGENTS                 YOUR API (TOOLS)
+-----------------------+        +------------------------+     +------------------------+
| Garmin Webhook        |------->|                        |     |                        |
| (activity, sleep,     |        |  1. Coaching Agent     |---->| /tools/read-acwr       |
|  HRV, daily, body)    |        |     (per athlete)      |     | /tools/modify-workout  |
+-----------------------+        |                        |     | /tools/send-notify     |
| Strava Webhook        |------->|  2. Program Gen Agent  |---->| /tools/calculate-zones |
| (activity:create)     |        |     (on demand)        |     | /tools/sport-router    |
+-----------------------+        |                        |     | /tools/periodization   |
| Concept2 Webhook      |------->|  3. Coach Dashboard    |---->| /tools/query-athletes  |
| (result-added)        |        |     Agent (per coach)  |     | /tools/generate-brief  |
+-----------------------+        |                        |     | /tools/create-alert    |
| Athlete Check-in      |------->|  4. Nutrition Agent    |---->| /tools/read-meals      |
| (daily form submit)   |        |     (per athlete)      |     | /tools/body-comp       |
+-----------------------+        |                        |     | /tools/macro-calc      |
| Meal Log / Food Scan  |------->|  5. Physio Agent       |---->| /tools/injury-assess   |
| (photo upload)        |        |     (per physio)       |     | /tools/restrictions    |
+-----------------------+        |                        |     | /tools/rehab-progress  |
| Physio Assessment     |------->|  6. Research Agent     |---->| /tools/web-search      |
| (injury created)      |        |     (on demand)        |     | /tools/knowledge-rag   |
+-----------------------+        |                        |     | /tools/embeddings      |
| Coach Command         |------->|  7. Learning Agent     |---->| /tools/read-outcomes   |
| (natural language)    |        |     (background)       |     | /tools/update-patterns |
+-----------------------+        +------------------------+     +------------------------+
```

### What Changes vs. What Stays

| Component | Keep | Replace | Why |
|-----------|------|---------|-----|
| Safety rules (safety.ts) | As tool guardrails | Cron trigger | Safety bounds enforced at tool level |
| Recovery rules (recovery.ts) | As agent context | Cron trigger | Agent reasons contextually |
| D-max, VDOT, zones | As agent tools | - | Deterministic math stays deterministic |
| Sport router | As agent tool | - | Sport science needs no AI reasoning |
| Consent/guardrails | At tool level | - | Tools refuse unauthorized actions |
| Cost tracking | Enhanced | Per-agent budgets | Managed Agents have session budgets |
| ACWR calculation | Keep as cron | - | Pure math, no AI needed |
| Trial expiry/warnings | Keep as cron | - | Simple DB operations |
| Budget resets | Keep as cron | - | Monthly DB update |
| Data cleanup | Keep as cron | - | Retention policy enforcement |
| Daily metrics processing | Keep as cron | - | Deterministic calculations |

**Crons eliminated**: 12 of 22 (perceive, decide, execute, learn, pattern-detection, milestone-detection, morning-briefings, coach-alerts, mental-prep, poll-program-generation, poll-research, auto-optimize)

**Crons kept**: 5 essential (calculate-acwr, expire-trials, trial-warnings, reset-ai-usage, reset-budgets) + 3 deterministic (process-daily-metrics, link-workouts, cleanup)

---

## Garmin Data as Real-Time Agent Triggers

### Current Flow (Polling)
```
Garmin Webhook --> Store in DailyMetrics/GarminActivity
                   ... wait up to 30 min ...
Perceive Cron --> Read DailyMetrics --> Create AgentPerception
                   ... wait up to 15 min ...
Decide Cron   --> Read Perception --> Create AgentAction
                   ... wait up to 5 min ...
Execute Cron  --> Apply action
```

### Proposed Flow (Event-Driven)
```
Garmin Webhook --> Store in DB --> Trigger Coaching Agent
                                      |
                                      +--> Read full context (ACWR, readiness, injuries)
                                      +--> Reason about implications
                                      +--> Chain multiple actions if needed
                                      +--> Execute immediately
                                      +--> Notify athlete/coach
                                      (Total: seconds, not 50 minutes)
```

### Garmin Data Types as Triggers

| Garmin Event | Agent Trigger | Agent Action |
|-------------|---------------|--------------|
| Activity completed | Coaching Agent | Update training load, auto-complete assignments, check ACWR |
| Sleep data synced | Coaching Agent | Assess recovery, adjust today's workout intensity |
| HRV data synced | Coaching Agent | Update readiness, flag if LOW/UNBALANCED status |
| Daily summary | Coaching Agent | Morning readiness assessment, briefing generation |
| Body composition | Nutrition Agent | Update weight trends, adjust macro targets |
| High stress (>70) | Coaching Agent | Suggest workout substitution or recovery activity |
| Resting HR spike | Coaching Agent | Flag potential illness/overtraining |
| Deregistration | System | Disable sync, notify athlete |

### Strava & Concept2 as Triggers

Same pattern: webhook arrival triggers the Coaching Agent with activity context. Agent has tools to read the synced data and reason about training load implications.

---

## Implementation Phases Overview

### Phase 1: Foundation (Weeks 1-3)
- Tool API layer (expose deterministic logic as callable tools)
- Agent session management (create/resume/terminate)
- Coaching Agent MVP (replaces perceive + decide + execute)

### Phase 2: Program Generation & Research (Weeks 4-5)
- Program Generation Agent (replaces poll-program-generation)
- Research Agent (replaces poll-research)

### Phase 3: Coach & Physio Agents (Weeks 6-8)
- Coach Dashboard Agent (replaces morning-briefings + coach-alerts + mental-prep)
- Physio Agent (new: automated restriction lifecycle)

### Phase 4: Nutrition Agent (Weeks 9-11)
- Nutrition/Weight Management Agent (new capability)
- Garmin body composition integration

### Phase 5: Learning & Optimization (Weeks 12-14)
- Learning Agent (replaces learn cron + auto-optimize)
- Cross-agent intelligence sharing
- Data-moat enhancement

See Part 2 for detailed agent specifications.
See Part 3 for Nutrition Agent, Physio Agent, and migration strategy.
