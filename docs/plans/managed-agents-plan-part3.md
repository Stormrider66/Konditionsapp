# Claude Managed Agents Implementation Plan - Part 3: Nutrition, Physio & Migration

## Agent 6: Nutrition & Weight Management Agent (Per Athlete)

**New capability** - leverages existing nutrition infrastructure with agentic accountability.

### Current Foundation
The platform already has:
- BMR/TDEE calculations (Mifflin-St Jeor, Harris-Benedict)
- 7 macro profiles (Balanced, High Protein, Low Carb, Endurance, Strength, Keto, Custom)
- Body composition tracking (InBody/Tanita/Omron/Garmin)
- AI food photo scanning (Gemini Flash vision)
- Nutrition timing system (ISSN/ACSM/IOC-based)
- Meal logging with full macro breakdown
- Weight timeline projections
- NutritionGoal model (WEIGHT_LOSS, WEIGHT_GAIN, MAINTAIN, BODY_RECOMP)

### What the Agent Adds
- **Real-time accountability** instead of passive tracking
- **Adaptive targets** that respond to progress stalls
- **Training-nutrition coordination** with the Coaching Agent
- **Behavioral coaching** for adherence and habit formation

### Trigger Events
- Meal logged or food photo scanned
- Daily check-in submitted (includes energy/hunger metrics)
- Garmin body composition synced (weight, body fat, muscle mass)
- End of day (daily nutrition summary)
- Weekly review (progress assessment)
- Weight stall detected (>2 weeks no progress)
- Coaching Agent modifies workout (nutrition must adapt)

### Tools Available

```typescript
// READ
readNutritionGoal(clientId)              // Current goal + macro targets
readMealsToday(clientId)                 // All logged meals today
readDailyMacros(clientId, date?)         // Aggregated macros vs targets
readBodyCompHistory(clientId, days: 90)  // Weight + body fat trend
readWeightTrend(clientId)                // Weekly averages, rate of change
readTrainingToday(clientId)              // Today's workout for nutrition timing
readReadiness(clientId)                  // Sleep, stress affect appetite
readGarminCalories(clientId, date?)      // Active calories burned (Garmin)

// CALCULATE
calculateTDEE(clientId)                  // Based on BMR + activity level
calculateMacroTargets(goal, tdee)        // Daily protein/carb/fat targets
calculateDeficitSurplus(intake, tdee)    // Net caloric balance
projectWeightTimeline(current, target, rate) // Weeks to goal
assessAdherence(clientId, days: 7)       // % of days hitting targets
detectPlateaus(clientId)                 // >2 weeks no weight change
calculateNutritionTiming(workout)        // Pre/during/post-workout nutrition

// WRITE
sendNutritionNudge(clientId, type, message) // Meal reminder, hydration, etc.
adjustMacroTargets(clientId, newTargets)    // Adapt to progress/stalls
generateMealSuggestion(clientId, mealType)  // AI meal recommendation
generateDailySummary(clientId)              // End-of-day nutrition report
generateWeeklyReport(clientId)              // Weekly progress + adjustments
createNutritionAlert(coachId, clientId, type, message)
logNutritionInsight(clientId, insight)      // Store for future context
```

### Key Workflows

#### Weight Loss Accountability
```
EVENT: Athlete logs lunch via food photo scan

Agent:
1. readMealsToday(athlete) --> Breakfast: 450kcal, Lunch: 820kcal
2. readNutritionGoal(athlete) --> WEIGHT_LOSS, target 1800kcal/day
3. calculateDeficitSurplus() --> 1270kcal consumed, 530kcal remaining for dinner+snacks
4. readTrainingToday(athlete) --> Evening strength session scheduled
5. calculateNutritionTiming(strengthSession) --> Need 30g protein pre-workout

Response to athlete:
"Good lunch! You have ~530 kcal left for dinner and snacks.
Heads up: strength session tonight - have a protein-rich snack
(~30g protein) about 2 hours before. Greek yogurt with berries
would fit perfectly within your remaining macros."
```

#### Plateau Breaking
```
EVENT: Weekly review trigger (Sunday)

Agent:
1. readWeightTrend(athlete) --> No change for 16 days
2. detectPlateaus(athlete) --> PLATEAU detected
3. readBodyCompHistory(athlete) --> Body fat also flat
4. assessAdherence(athlete, 14) --> 71% adherence (moderate)
5. readReadiness(athlete) --> Stress elevated, sleep declining

Decision tree:
- If adherence <80%: Focus on consistency, not calorie adjustment
- If adherence >80% + plateau: Reduce calories by 100kcal or add 1 cardio session
- If stress/sleep poor: Address recovery first (cortisol blocks fat loss)

Action:
6. generateWeeklyReport(athlete) -->
   "2-week plateau detected. Your adherence was 71% - let's focus on
   hitting your targets consistently before adjusting calories.
   I noticed your stress is elevated - high cortisol can stall weight loss.
   Priority this week: sleep hygiene and hitting protein targets."
```

#### Garmin Body Composition Trigger
```
EVENT: Garmin syncs body composition (weekly weigh-in)

Agent:
1. readBodyCompHistory(athlete, 30) --> Weight: 82.1kg (was 83.5kg 4 weeks ago)
2. Body fat: 18.2% (was 19.1%)
3. Muscle mass: 36.8kg (was 36.6kg) -- gaining muscle!
4. readNutritionGoal(athlete) --> BODY_RECOMP target

Response:
"Great progress! In 4 weeks: -1.4kg weight, -0.9% body fat,
+0.2kg muscle mass. You're successfully recomping.
Current rate is sustainable - no changes needed to your plan."
```

### Nutrition + Coaching Agent Coordination

When the Coaching Agent modifies a workout, it notifies the Nutrition Agent:

```
Coaching Agent: "Swapped high-intensity intervals for easy 40min run due to low HRV"
  --> Triggers Nutrition Agent

Nutrition Agent:
1. readTrainingToday(athlete) --> Easy run (was intervals)
2. calculateNutritionTiming(easyRun) --> Lower carb needs
3. adjustMacroTargets(athlete, { carbs: -30g, calories: -120 })
4. sendNutritionNudge(athlete, 'ADJUSTMENT',
     "Your workout was swapped to an easy run today.
      I've adjusted your carb target down by 30g.
      Focus on protein and vegetables for dinner.")
```

---

## Agent 7: Physio Agent (Per Physio)

**Enhances existing physio role** with automated restriction lifecycle and rehab monitoring.

### Current Physio Capabilities
- Create injury assessments (pain, functional, Delaware pain rules)
- Set training restrictions (10 types, 4 severity levels)
- Design rehab programs (5 phases: ACUTE to RETURN_TO_SPORT)
- Log treatment sessions (SOAP notes)
- Conduct movement screenings (FMS, SFMA, Y-Balance)
- Communicate via care team threads

### Current Gaps the Agent Fills
1. No automated restriction clearance based on rehab progress
2. No escalation when athlete stalls in rehab
3. No proactive alerts when movement screen asymmetries correlate with injury risk
4. No automated care team thread creation when agent detects injury patterns
5. Manual-only restriction creation (limited INJURY_CASCADE automation)

### Trigger Events
- Athlete completes rehab exercise log
- Pain level reported in check-in exceeds threshold
- Coaching Agent detects injury risk pattern
- Restriction approaching expiry date
- Movement screen completed (new asymmetry data)
- Treatment session logged (SOAP notes updated)
- Athlete hasn't logged rehab for 3+ days

### Tools Available

```typescript
// READ
readActiveRestrictions(clientId)         // Current restrictions + expiry
readRehabProgress(clientId, programId)   // Completion rate, pain trends
readInjuryHistory(clientId)              // Past assessments + outcomes
readMovementScreens(clientId)            // FMS/SFMA/Y-Balance results
readRecentPainLevels(clientId, days: 14) // Pain trend from check-ins
readTreatmentHistory(clientId)           // SOAP notes timeline
readCareTeamThreads(physioId, clientId)  // Active communication threads

// ANALYZE
assessRestrictionReadiness(clientId, restrictionId) // Can we clear this?
compareMovementScreens(clientId)         // Progress between screens
detectRehabStall(clientId, programId)    // No progress >1 week
analyzeReturnToSportReadiness(clientId)  // Multi-factor clearance check
calculateInjuryRiskFromScreening(screenData) // Asymmetry-based risk

// WRITE
suggestRestrictionUpdate(restrictionId, newSeverity, reason)  // For physio review
createCareTeamThread(physioId, coachId, clientId, subject)
sendRehabReminder(clientId, message)     // Nudge for missed rehab
flagForPhysioReview(physioId, clientId, reason, priority)
generateProgressReport(clientId, programId) // Weekly rehab summary
```

### Key Workflows

#### Automated Restriction Lifecycle
```
EVENT: Athlete completes rehab log, reports pain 2/10 (was 6/10 two weeks ago)

Agent:
1. readRehabProgress(athlete, kneeProgram) --> Phase: SUBACUTE, 85% completion
2. readRecentPainLevels(athlete, 14) --> Trend: 6 -> 4 -> 3 -> 2 (improving)
3. readActiveRestrictions(athlete) --> "NO_JUMPING" severity MODERATE
4. assessRestrictionReadiness(athlete, restriction123)
   --> Pain <3, completion >80%, 2+ weeks in phase = READY TO DOWNGRADE

Action:
5. suggestRestrictionUpdate(restriction123, 'MILD',
     'Pain improved from 6 to 2 over 14 days. Rehab 85% complete.
      Suggest downgrading from MODERATE to MILD.')
6. flagForPhysioReview(physio789, athlete, 'Restriction ready for review', 'NORMAL')
7. createCareTeamThread(physio789, coach456, athlete,
     'Knee restriction ready for downgrade review')
```

#### Rehab Stall Detection
```
EVENT: Weekly review - athlete hasn't improved in 10 days

Agent:
1. detectRehabStall(athlete, shoulderProgram) --> STALLED
2. readRehabProgress(athlete, shoulderProgram) --> Completion: 45%, pain stable 4/10
3. readTreatmentHistory(athlete) --> Last treatment: 12 days ago

Action:
4. flagForPhysioReview(physio789, athlete,
     'Rehab stalled: shoulder program at 45%, pain stable 4/10 for 10 days.
      No treatment in 12 days. May need reassessment.', 'HIGH')
5. sendRehabReminder(athlete,
     'Your shoulder rehab has plateaued. Consider booking a follow-up
      with your physio to reassess your program.')
```

#### Cross-Agent Injury Prevention
```
EVENT: Coaching Agent calculates HIGH injury risk for athlete

Coaching Agent --> Notifies Physio Agent:
"Athlete has ACWR 1.5, right hamstring tightness mentioned in check-in,
 history of hamstring strain 8 months ago."

Physio Agent:
1. readInjuryHistory(athlete) --> Hamstring strain, cleared 6 months ago
2. readMovementScreens(athlete) --> FMS: hamstring asymmetry score 1/3
3. readActiveRestrictions(athlete) --> None currently active

Action:
4. flagForPhysioReview(physio789, athlete,
     'Preventive review recommended: ACWR danger + hamstring tightness +
      history of hamstring strain + FMS asymmetry detected', 'HIGH')
5. createCareTeamThread(physio789, coach456, athlete,
     'Preventive hamstring review - multiple risk factors detected')
```

---

## Migration Strategy: Crons to Managed Agents

### Phase 1: Parallel Running (Weeks 1-3)

Run Managed Agents alongside existing crons. Both systems operate on the same data. Agent actions are logged but only executed if they match what the cron would have done (shadow mode).

```
Garmin Webhook
  ├── Store data (existing)
  ├── Trigger Coaching Agent (NEW, shadow mode)
  └── Cron perceive/decide/execute (EXISTING, still active)

Comparison: Log when agent decision differs from cron decision.
Goal: Agent matches cron output >95% of the time.
```

### Phase 2: Agent Primary, Cron Fallback (Weeks 4-6)

Agent handles all events. Cron runs as safety net, only acts if agent hasn't responded within 60 minutes.

```
Garmin Webhook
  ├── Store data
  └── Trigger Coaching Agent (PRIMARY)

Cron (every 30 min):
  └── Check: any athletes without agent response in last 60 min?
      └── If yes: run legacy perceive/decide for those athletes only
```

### Phase 3: Agent Only (Weeks 7+)

Disable cron-based perceive/decide/execute. Keep monitoring for agent health.

```
Garmin Webhook
  ├── Store data
  └── Trigger Coaching Agent (ONLY)

Health Monitor (new cron, every 5 min):
  └── Check: any pending events not processed by agent?
      └── If yes: alert engineering team
```

### Database Changes

New tables for Managed Agent session tracking:

```prisma
model ManagedAgentSession {
  id              String   @id @default(uuid())
  agentType       AgentType // COACHING, PROGRAM_GEN, COACH_DASHBOARD, NUTRITION, PHYSIO, RESEARCH, LEARNING
  entityId        String   // clientId, coachId, or physioId
  externalId      String?  // Claude Managed Agent session ID
  status          SessionStatus // ACTIVE, PAUSED, EXPIRED, ERROR
  lastEventAt     DateTime
  totalTokensUsed Int      @default(0)
  totalCostUsd    Float    @default(0)
  metadata        Json?    // Agent-specific session data
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([agentType, entityId])
  @@index([status])
}

model AgentEvent {
  id          String   @id @default(uuid())
  sessionId   String
  session     ManagedAgentSession @relation(fields: [sessionId], references: [id])
  eventType   String   // GARMIN_ACTIVITY, CHECKIN_SUBMITTED, MEAL_LOGGED, etc.
  eventData   Json
  processedAt DateTime?
  result      Json?    // Agent response
  createdAt   DateTime @default(now())

  @@index([sessionId, createdAt])
}

enum AgentType {
  COACHING
  PROGRAM_GENERATION
  COACH_DASHBOARD
  NUTRITION
  PHYSIO
  RESEARCH
  LEARNING
}

enum SessionStatus {
  ACTIVE
  PAUSED
  EXPIRED
  ERROR
}
```

### Cost Estimation

| Agent | Sessions/Month | Avg Tokens/Session | Est. Cost/Month |
|-------|---------------|-------------------|-----------------|
| Coaching (per athlete) | 30 events x athletes | ~2000 tokens/event | ~$0.50/athlete |
| Program Gen | On demand | ~50,000 tokens | ~$1.50/program |
| Coach Dashboard | 30 briefings/month | ~3000 tokens/briefing | ~$2/coach |
| Nutrition | 90 events/month | ~1500 tokens/event | ~$0.40/athlete |
| Physio | 20 events/month | ~2000 tokens/event | ~$0.30/athlete |
| Research | On demand | ~20,000 tokens | ~$1/research |
| Learning | Weekly batch | ~10,000 tokens | ~$0.50/month |

**Total estimate**: ~$1-2/athlete/month for full agent coverage (at Sonnet pricing). Significant cost reduction vs current approach due to eliminated polling waste.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Agent session timeout | Auto-resume on next event, stateless tool design |
| Provider outage | Fallback to cron-based system (kept dormant but deployable) |
| Cost overrun | Per-session token budgets, monthly caps per athlete |
| Bad decisions at scale | Shadow mode first, gradual rollout by autonomy level |
| Data consistency | Tools use Prisma transactions, same DB as crons |
| Consent violations | Enforced at tool level, not agent level |
| Latency spike | Event queue with backpressure, batch processing for non-urgent |

---

## Success Metrics

| Metric | Current (Cron) | Target (Agents) |
|--------|---------------|-----------------|
| Response latency (critical event) | ~50 min | <30 seconds |
| Multi-step action chains | Not possible | Standard workflow |
| Athlete engagement (check-in rate) | Baseline | +20% (proactive nudges) |
| Coach time per athlete/week | Baseline | -30% (automated briefings) |
| Nutrition adherence | No tracking | 75% target |
| Restriction clearance time | Manual only | -40% (automated lifecycle) |
| Cron job count | 22 | 8 (5 essential + 3 deterministic) |
| Polling API calls/day | ~2880 (2/min) | 0 |

---

## File References

Key existing files that will be wrapped as agent tools:

| Existing Module | Becomes Tool |
|----------------|-------------|
| `lib/agent/perception/readiness.ts` | `readReadiness` |
| `lib/agent/perception/training-load.ts` | `readTrainingLoad` |
| `lib/agent/perception/injury.ts` | `readActiveInjuries` |
| `lib/agent/decision/rules/safety.ts` | Agent system prompt (safety constitution) |
| `lib/agent/decision/rules/recovery.ts` | Agent system prompt (recovery guidelines) |
| `lib/agent/execution/workout-modifier.ts` | `modifyWorkoutIntensity/Duration` |
| `lib/agent/execution/notification.ts` | `sendNotification` |
| `lib/agent/guardrails/consent.ts` | Tool-level middleware |
| `lib/agent/guardrails/autonomy.ts` | Tool-level middleware |
| `lib/calculations/dmax.ts` | `calculateDmax` |
| `lib/calculations/vdot.ts` | `calculateVDOT` |
| `lib/program-generator/sport-router.ts` | `generateSportProgram` |
| `lib/ai/nutrition-calculator.ts` | `calculateTDEE/MacroTargets` |
| `lib/ai/body-composition-analyzer.ts` | `readBodyCompHistory` |
| `lib/integrations/garmin/training.ts` | `pushWorkoutToGarmin` |
