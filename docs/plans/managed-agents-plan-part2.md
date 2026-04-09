# Claude Managed Agents Implementation Plan - Part 2: Agent Specifications

## Agent 1: Coaching Agent (Per Athlete)

**Replaces**: perceive, decide, execute crons + pattern-detection + milestone-detection

### Trigger Events
- Garmin webhook (activity, sleep, HRV, daily, stress, body composition)
- Strava webhook (activity:create, activity:update)
- Concept2 webhook (result-added)
- Athlete daily check-in submitted
- Workout completed/skipped
- Injury reported
- Physio restriction created/updated/cleared
- Coach sends instruction

### Tools Available

```typescript
// READ tools (no side effects)
readAthleteProfile(clientId)        // Demographics, sport, experience, goals
readReadiness(clientId, date?)      // DailyMetrics + DailyCheckIn composite
readTrainingLoad(clientId)          // ACWR, acute/chronic load, TSS history
readActiveInjuries(clientId)        // InjuryAssessments + TrainingRestrictions
readUpcomingWorkouts(clientId, days: 7)  // Scheduled sessions next N days
readRecentDecisions(clientId, days: 7)   // Past AgentActions for context
readConversationMemory(clientId)    // Extracted facts from AI conversations
readGarminLatest(clientId)          // Latest Garmin sync data (HRV, sleep, stress)
readRehabProgress(clientId)         // Active rehab programs + completion rates
readNutritionStatus(clientId)       // Current goals, recent intake, deficits

// CALCULATE tools (deterministic, no side effects)
calculateACWR(clientId)             // Acute:Chronic Workload Ratio
calculateZones(testData)            // HR/pace/power zones from test
calculateTSS(activityData)         // Training Stress Score
detectPatterns(checkIns7d)         // 7-day trend analysis (sleep, fatigue, stress)
detectMilestones(clientId)         // PR, streak, workout count achievements
calculateInjuryRisk(clientId)      // Risk score from load + injury + readiness

// WRITE tools (side effects, guardrailed)
modifyWorkoutIntensity(assignmentId, reductionPercent)  // Max 50% reduction
modifyWorkoutDuration(assignmentId, reductionPercent)   // Max 50% reduction
substituteWorkout(assignmentId, newType)                // Recovery/cross-training
skipWorkout(assignmentId, reason)                       // Mark as skipped
injectRestDay(clientId, date, reason)                   // Add rest day
sendNotification(clientId, type, title, message)        // In-app notification
createCoachAlert(coachId, clientId, alertType, severity, message)
createOversightItem(coachId, clientId, action, priority, category)
escalateToSupport(clientId, reason, urgency)            // AI-coached athletes
requestCheckIn(clientId, reason)                        // Prompt daily check-in
pushWorkoutToGarmin(clientId, workoutData)              // Send to Garmin watch
logAgentAction(clientId, actionType, reasoning, confidence)
```

### Guardrails (Enforced at Tool Level)
- All WRITE tools check `AgentConsent` before executing
- `modifyWorkoutIntensity` respects `maxIntensityReduction` from preferences
- `injectRestDay` checks `allowRestDayInjection` permission
- `skipWorkout` requires HIGH+ confidence or CRITICAL safety condition
- Auto-apply rules follow autonomy level (ADVISORY/LIMITED/SUPERVISED/AUTONOMOUS)
- All actions logged to `AgentAuditLog` automatically

### Example Multi-Step Workflow

```
EVENT: Garmin syncs sleep data showing 4.5 hours, HRV status LOW

Agent thinks:
1. readReadiness(athlete123) --> readiness: 35/100, sleep: 4.5h, HRV: LOW
2. readTrainingLoad(athlete123) --> ACWR: 1.4 (DANGER zone)
3. readUpcomingWorkouts(athlete123, 1) --> Today: High-intensity intervals
4. readActiveInjuries(athlete123) --> Right knee: mild restriction
5. calculateInjuryRisk(athlete123) --> HIGH (ACWR danger + low sleep + active injury)

Agent decides (multi-action chain):
6. modifyWorkoutIntensity(todaySession, 30%) --> Reduce intervals to 70%
7. substituteWorkout(todaySession, 'EASY_AEROBIC') --> Actually, swap entirely
8. sendNotification(athlete123, 'RECOVERY',
     'Easy day today',
     'Your sleep (4.5h) and HRV are low. Swapped intervals for an easy 40min run.')
9. createCoachAlert(coach456, athlete123, 'READINESS_DROP', 'HIGH',
     'Athlete had 4.5h sleep, LOW HRV, ACWR 1.4. Auto-swapped to easy session.')
10. pushWorkoutToGarmin(athlete123, easyRunWorkout) --> Push updated workout to watch

Total time: ~5 seconds (vs 50 minutes with cron chain)
```

### Session Management
- **Persistent session per athlete** (resumed on each trigger event)
- Session holds conversation memory and recent decision context
- Session expires after 24h inactivity, auto-recreated on next event
- Cost tracked per session with monthly budget limits

---

## Agent 2: Program Generation Agent (On Demand)

**Replaces**: poll-program-generation cron + orchestrator.ts polling pattern

### Trigger Events
- Coach/athlete requests program generation via UI
- Program modification requested

### Tools Available

```typescript
// Deterministic training science
calculateDmax(lactateData)              // D-max threshold detection
calculateVDOT(raceTime, distance)       // Daniels VDOT
calculateElitePaces(vLT2, athleteLevel) // Race pace coefficients
selectMethodology(athleteProfile)       // Auto-select training approach
calculatePeriodization(weeks, methodology) // Phase distribution
calculateZones(thresholdData, methodology) // Training zones
buildWorkoutSegments(workoutSpec, zones)   // Warmup/work/cooldown segments

// Sport-specific generators
generateSportProgram(sport, params)     // Full deterministic generation
analyzeHyroxWeaknesses(stationTimes)    // HYROX station analysis
estimateRaceTime(athleteData, distance) // Race prediction

// AI-enhanced
generatePhaseOutline(context)           // AI creates phase structure
generatePhaseDetail(phaseNum, context)  // AI generates individual phase
mergePhases(outline, phases)            // Combine into complete program
validateProgram(program)                // Check consistency

// Storage
saveProgram(clientId, program)          // Store completed program
updateProgress(sessionId, percent, msg) // Update generation progress
```

### Workflow
```
1. Receive generation request with athlete profile + constraints
2. calculateElitePaces() or calculateVDOT() for pace anchors
3. selectMethodology() based on athlete level and prerequisites
4. calculatePeriodization() for phase structure
5. If short program (<8 weeks): generateSportProgram() deterministic
6. If long program: generatePhaseOutline() then loop generatePhaseDetail()
7. mergePhases() and validateProgram()
8. saveProgram() and notify athlete/coach
```

**Key advantage**: No polling. Agent runs to completion on Anthropic infrastructure. Client polls a simple status endpoint, but the agent manages its own retry/fallback logic internally.

---

## Agent 3: Coach Dashboard Agent (Per Coach)

**Replaces**: morning-briefings + coach-alerts + mental-prep crons

### Trigger Events
- Morning schedule (timezone-aware, per coach preference)
- Athlete data changes (new check-in, missed workout, injury report)
- Coach asks a question (natural language query)
- Race approaching for any athlete (mental prep trigger)

### Tools Available

```typescript
// Read across all coach's athletes
listAthletes(coachId)                    // All assigned athletes
getAthleteOverview(clientId)             // Quick status summary
getAthletesNeedingAttention(coachId)     // Prioritized concern list
getUpcomingRaces(coachId, days: 14)      // Races across all athletes

// Analysis
compareAthleteReadiness(athleteIds)      // Side-by-side readiness
getTeamTrainingLoad(coachId)             // Aggregate team ACWR
identifyAtRiskAthletes(coachId)          // ACWR danger/critical + low readiness

// Actions
generateMorningBriefing(coachId)         // AI-powered daily brief
generateMentalPrep(clientId, raceData)   // Pre-race mental content
createCoachAlert(coachId, clientId, type, severity, message)
sendAthleteMessage(clientId, message)    // Direct communication
approveAgentAction(actionId, notes)      // Approve pending oversight items
rejectAgentAction(actionId, reason)      // Reject with learning feedback

// Natural language queries
queryAthleteData(coachId, question)      // "How is Emma's ACWR trending?"
```

### Morning Briefing Flow
```
Agent (triggered at coach's preferred morning time):
1. listAthletes(coach123)
2. For each athlete: getAthleteOverview()
3. identifyAtRiskAthletes(coach123)
4. getUpcomingRaces(coach123, 7)
5. Generate prioritized briefing:
   "Good morning. 3 athletes need attention:
    - Emma: ACWR 1.5 (danger), consider reducing Thursday intervals
    - Marcus: Missed 3 check-ins, last seen Monday
    - Sofia: Race in 3 days, mental prep generated
    12 athletes are on track. Team avg readiness: 72/100."
```

---

## Agent 4: Research Agent (On Demand)

**Replaces**: poll-research cron

### Trigger Events
- Coach/athlete initiates research query
- Agent needs external knowledge during program generation

### Tools Available

```typescript
webSearch(query)                         // Search training science literature
fetchUrl(url)                            // Read specific article/study
queryKnowledgeBase(query, clientId?)     // RAG over uploaded documents
generateEmbedding(text)                  // For similarity search
searchKnowledgeSkills(query)             // Match against skill library
summarizeFindings(sources, question)     // Synthesize research
```

**Key advantage**: Runs as a single long-lived agent session instead of polling external providers. Can use tool calls to search, read, synthesize in a natural loop.

---

## Agent 5: Learning Agent (Background)

**Replaces**: learn cron + auto-optimize cron

### Trigger Events
- Athlete accepts/rejects agent recommendation
- Coach overrides agent decision
- Weekly batch analysis (Sunday)
- New outcome data available (race result, test result)

### Tools Available

```typescript
// Read outcomes
getRecentOutcomes(days: 30)              // Accept/reject/override events
getAcceptanceRateByType(actionType)      // Per-action-type success rate
getCoachOverridePatterns(coachId?)       // What coaches change and why
getPredictionAccuracy(predictionType)    // Race time, injury risk accuracy

// Analysis
analyzeDecisionQuality(actionIds)        // Were auto-applied actions good?
detectPromptWeaknesses(slot)             // Where do AI outputs underperform?
extractLessons(overrides)                // What can we learn from coach edits?
crossAthletePatterns(sport, level)       // Anonymized success patterns

// Write
updatePromptVariant(slot, variant)       // A/B test new prompt versions
logLearningInsight(insight)              // Store extracted lesson
updatePredictionModel(type, adjustment)  // Refine accuracy
```

---

## Tool API Implementation Strategy

All agent tools are implemented as **Next.js API routes** under `/api/agent-tools/`:

```
app/api/agent-tools/
  read-athlete-profile/route.ts
  read-readiness/route.ts
  read-training-load/route.ts
  read-active-injuries/route.ts
  modify-workout-intensity/route.ts
  modify-workout-duration/route.ts
  inject-rest-day/route.ts
  send-notification/route.ts
  calculate-acwr/route.ts
  calculate-zones/route.ts
  ... etc
```

Each tool route:
1. Validates input (Zod schema)
2. Checks consent and permissions
3. Executes business logic
4. Logs to audit trail
5. Returns structured result

Tools are registered with the Claude Managed Agents API as tool definitions with JSON schemas matching the Zod validators.

See Part 3 for Nutrition Agent, Physio Agent, and migration strategy.
