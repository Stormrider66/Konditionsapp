# Plan A: AI Core Infrastructure

> Shared AI improvements that benefit ALL users across all sports and fitness goals.

## Overview

This plan covers the foundational AI features that work universally. Build these first, then layer sport-specific features on top.

**Principle**: Build once, use everywhere. Sport-specific context is injected via existing `sport-context-builder.ts` pattern.

---

## Phase 1: Conversational Memory

**Goal**: AI remembers previous conversations and builds relationships over time.

### Database Schema

```prisma
model ConversationMemory {
  id          String      @id @default(cuid())
  clientId    String
  client      Client      @relation(fields: [clientId], references: [id], onDelete: Cascade)

  memoryType  MemoryType
  category    String?     // "injury", "goal", "preference", "life_event"
  content     String      // "Mentioned knee discomfort after long runs"
  context     String?     // Additional context if needed

  extractedAt DateTime    @default(now())
  expiresAt   DateTime?   // Some memories fade (e.g., temporary injury)
  importance  Int         @default(3) // 1-5 for retrieval priority

  // Source tracking
  sourceMessageId String?

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([clientId, memoryType])
  @@index([clientId, importance])
}

enum MemoryType {
  INJURY_MENTION      // "knee hurts after long runs"
  GOAL_STATEMENT      // "I want to run sub-40 10K"
  PREFERENCE          // "I prefer morning workouts"
  LIFE_EVENT          // "Starting new job next week"
  FEEDBACK            // "The tempo run was too hard"
  MILESTONE           // "First marathon completed"
  EQUIPMENT           // "Just got a new power meter"
  LIMITATION          // "Can't do overhead movements"
}

model ConversationSummary {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  weekStart   DateTime // Summary for this week
  summary     String   // AI-generated summary of week's conversations
  keyTopics   String[] // ["recovery", "nutrition", "race prep"]
  sentiment   String?  // "positive", "neutral", "concerned"

  createdAt   DateTime @default(now())

  @@unique([clientId, weekStart])
}
```

### API Endpoints

```
POST /api/ai/memory/extract
- Called after each chat session
- Uses AI to extract memorable facts
- Stores in ConversationMemory

GET /api/ai/memory/[clientId]
- Retrieves relevant memories for context injection
- Filters by importance and recency
- Used by chat system prompt builder

POST /api/ai/memory/summarize
- Weekly cron job
- Summarizes past week's conversations
- Stores in ConversationSummary
```

### Components

```
components/athlete/ai/
├── MemoryIndicator.tsx       # Shows "AI remembers..." context
├── MilestoneModal.tsx        # Celebrates remembered milestones
└── JourneyTimeline.tsx       # Visual history of key moments

components/coach/ai/
└── AthleteMemoryView.tsx     # Coach can see what AI remembers
```

### UI Integration

**Athlete Chat Enhancement**:
```tsx
// In AthleteFloatingChat.tsx - add memory context display
<div className="memory-context">
  <span className="text-xs text-muted-foreground">
    🧠 AI minns: Du nämnde höftbesvär förra veckan
  </span>
</div>
```

**System Prompt Enhancement**:
```typescript
// In lib/ai/athlete-system-prompt.ts
const buildSystemPrompt = async (clientId: string) => {
  const memories = await getRelevantMemories(clientId);
  const recentSummary = await getRecentSummary(clientId);

  return `
    ${basePrompt}

    MINNEN OM DENNA ATLET:
    ${memories.map(m => `- ${m.content} (${m.memoryType})`).join('\n')}

    SENASTE VECKANS SAMMANFATTNING:
    ${recentSummary?.summary || 'Ingen tidigare konversation'}
  `;
};
```

---

## Phase 2: Proactive Intelligence

**Goal**: AI initiates contact at the right moments, not just responds.

### Database Schema

```prisma
model AINotification {
  id          String              @id @default(cuid())
  clientId    String
  client      Client              @relation(fields: [clientId], references: [id], onDelete: Cascade)

  type        AINotificationType
  title       String
  message     String
  priority    NotificationPriority @default(MEDIUM)

  // Scheduling
  scheduledFor DateTime?          // When to show
  triggeredBy  String?            // "morning_briefing", "pre_workout", "pattern_detected"

  // Status
  status      NotificationStatus   @default(PENDING)
  readAt      DateTime?
  dismissedAt DateTime?
  actionTaken String?             // "opened_chat", "dismissed", "snoozed"

  // Context for regeneration
  contextData Json?               // Data used to generate this notification

  createdAt   DateTime            @default(now())
  expiresAt   DateTime?           // Auto-dismiss after this time

  @@index([clientId, status, scheduledFor])
}

enum AINotificationType {
  MORNING_BRIEFING
  PRE_WORKOUT_NUDGE
  POST_WORKOUT_FOLLOWUP
  PATTERN_ALERT
  WEATHER_ALERT
  CALENDAR_CONFLICT
  MILESTONE_CELEBRATION
  INJURY_CHECK
  READINESS_WARNING
}

enum NotificationPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum NotificationStatus {
  PENDING
  DELIVERED
  READ
  DISMISSED
  ACTIONED
  EXPIRED
}

model AINotificationPreferences {
  id              String   @id @default(cuid())
  clientId        String   @unique
  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  // Morning briefing
  morningBriefingEnabled  Boolean  @default(true)
  morningBriefingTime     String   @default("07:00") // Local time

  // Pre-workout
  preWorkoutNudgeEnabled  Boolean  @default(true)
  preWorkoutNudgeMinutes  Int      @default(120) // 2 hours before

  // Post-workout
  postWorkoutFollowupEnabled Boolean @default(true)
  postWorkoutFollowupMinutes Int     @default(60) // 1 hour after

  // Other notifications
  patternAlertsEnabled    Boolean  @default(true)
  weatherAlertsEnabled    Boolean  @default(false)
  milestoneAlertsEnabled  Boolean  @default(true)

  // Delivery preferences
  pushNotificationsEnabled Boolean @default(false)
  emailNotificationsEnabled Boolean @default(false)
  inAppOnly               Boolean  @default(true)

  // Quiet hours
  quietHoursStart         String?  // "22:00"
  quietHoursEnd           String?  // "07:00"

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Cron Jobs

```typescript
// app/api/cron/morning-briefing/route.ts
// Runs every 15 minutes, sends briefings at athlete's preferred time

// app/api/cron/pre-workout-nudges/route.ts
// Runs every 15 minutes, checks for upcoming workouts

// app/api/cron/pattern-detection/route.ts
// Runs weekly, analyzes athlete patterns
```

### API Endpoints

```
GET /api/athlete/notifications
- Get pending notifications for athlete
- Used by dashboard to show alerts

POST /api/athlete/notifications/[id]/read
- Mark notification as read

POST /api/athlete/notifications/[id]/dismiss
- Dismiss notification

POST /api/athlete/notifications/[id]/action
- Record action taken (opened chat, etc.)

GET /api/athlete/notification-preferences
PUT /api/athlete/notification-preferences
- Manage notification settings
```

### Components

```
components/athlete/ai/
├── MorningBriefingCard.tsx       # Expandable briefing on dashboard
├── ProactiveNotificationBanner.tsx # Alert banners
├── NotificationPreferences.tsx    # Settings UI
└── PatternAlertModal.tsx         # Weekly pattern insights

components/athlete/dashboard/
└── AINotificationsWidget.tsx     # Dashboard widget showing alerts
```

### UI Integration

**Dashboard Integration**:
```tsx
// In athlete dashboard page
<div className="grid gap-4">
  {/* Priority: AI notifications first */}
  <MorningBriefingCard />
  <AINotificationsWidget />

  {/* Then existing widgets */}
  <TodaysWorkout />
  <ReadinessPanel />
  ...
</div>
```

**Morning Briefing Card Design**:
```
┌─────────────────────────────────────────────────┐
│ 🌅 God morgon Henrik!              08:00 idag  │
│                                                 │
│ Dagens pass: Intervaller 8x400m                │
│ Readiness: 7.4/10 ✅ Bra för intensitet        │
│                                                 │
│ ⚡ Tips: Du sov 7.5h - perfekt för hårda pass  │
│                                                 │
│ [Öppna i chatten] [Avfärda]                    │
└─────────────────────────────────────────────────┘
```

---

## Phase 3: Coach-AI Collaboration

**Goal**: AI helps coaches manage athletes at scale.

### Database Schema

```prisma
model CoachAIAlert {
  id          String          @id @default(cuid())
  coachId     String
  coach       User            @relation(fields: [coachId], references: [id], onDelete: Cascade)
  clientId    String
  client      Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)

  alertType   CoachAlertType
  severity    AlertSeverity
  title       String
  description String
  suggestion  String?         // AI's suggested action

  // Source data
  dataPoints  Json?           // Evidence for alert

  // Status
  status      AlertStatus     @default(PENDING)
  resolvedAt  DateTime?
  resolvedBy  String?         // "coach_action", "auto_resolved", "dismissed"
  notes       String?         // Coach notes on resolution

  createdAt   DateTime        @default(now())
  expiresAt   DateTime?

  @@index([coachId, status])
  @@index([clientId])
}

enum CoachAlertType {
  READINESS_DROP          // Sustained low readiness
  MISSED_SESSIONS         // Unusual missed workouts
  INJURY_MENTIONED        // Pain/injury in chat
  OVERTRAINING_RISK       // ACWR danger zone
  PROGRESS_STALL          // No improvement trend
  ENGAGEMENT_DROP         // Reduced app usage
  GOAL_AT_RISK           // Goal timeline concern
}

enum AlertSeverity {
  INFO
  WARNING
  URGENT
}

enum AlertStatus {
  PENDING
  ACKNOWLEDGED
  IN_PROGRESS
  RESOLVED
  DISMISSED
}

model AIProgramSuggestion {
  id              String   @id @default(cuid())
  coachId         String
  coach           User     @relation(fields: [coachId], references: [id], onDelete: Cascade)
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  programId       String?

  suggestionType  String   // "reduce_intensity", "add_recovery", "modify_session"
  title           String
  description     String
  rationale       String   // Why AI suggests this

  // What to change
  originalValue   Json?
  suggestedValue  Json?

  // Status
  status          String   @default("pending") // pending, approved, rejected, modified
  coachResponse   String?  // Coach's notes

  createdAt       DateTime @default(now())

  @@index([coachId, status])
}

model WeeklyAthleteReport {
  id          String   @id @default(cuid())
  coachId     String
  coach       User     @relation(fields: [coachId], references: [id], onDelete: Cascade)
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  weekStart   DateTime

  // AI-generated content
  summary     String   // Natural language summary
  highlights  String[] // Key achievements
  concerns    String[] // Things to watch
  suggestions String[] // Recommended actions

  // Metrics snapshot
  metricsSnapshot Json  // { readinessAvg, completionRate, etc. }

  // Coach interaction
  viewedAt    DateTime?
  markedRead  Boolean  @default(false)

  createdAt   DateTime @default(now())

  @@unique([clientId, weekStart])
  @@index([coachId, weekStart])
}
```

### Cron Jobs

```typescript
// app/api/cron/coach-alerts/route.ts
// Runs daily, generates alerts for coaches

// app/api/cron/weekly-reports/route.ts
// Runs weekly (Sunday evening), generates athlete summaries

// app/api/cron/program-suggestions/route.ts
// Runs daily, analyzes athlete response to training
```

### API Endpoints

```
GET /api/coach/ai-alerts
- Get all pending alerts for coach's athletes
- Filterable by severity, type

POST /api/coach/ai-alerts/[id]/resolve
- Mark alert as resolved with notes

GET /api/coach/ai-suggestions
- Get program modification suggestions

POST /api/coach/ai-suggestions/[id]/respond
- Approve, reject, or modify suggestion

GET /api/coach/weekly-reports
- Get weekly summaries for all athletes

GET /api/coach/weekly-reports/[clientId]
- Get specific athlete's report
```

### Components

```
components/coach/ai/
├── CoachAIAssistantPanel.tsx     # Main AI panel on dashboard
├── AthleteAlertCard.tsx          # Individual alert display
├── ProgramSuggestionCard.tsx     # Modification proposal
├── WeeklyReportCard.tsx          # Athlete summary
├── AIInsightsOverview.tsx        # Aggregated insights
└── AlertsManagementPage.tsx      # Full alerts management

components/coach/dashboard/
└── AIAssistantWidget.tsx         # Dashboard widget
```

### UI Integration

**Coach Dashboard Enhancement**:
```tsx
// In coach dashboard
<div className="grid grid-cols-3 gap-4">
  <div className="col-span-2">
    {/* Existing dashboard content */}
  </div>

  <div className="col-span-1">
    {/* New AI Assistant Panel */}
    <CoachAIAssistantPanel />
  </div>
</div>
```

---

## Phase 4: Streak & Accountability Tracking

**Goal**: Built-in accountability with celebration of consistency.

### Database Schema

```prisma
model AthleteStreak {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  streakType  StreakType

  // Current streak
  currentStreak   Int      @default(0)
  currentStart    DateTime?
  lastActivity    DateTime?

  // Records
  longestStreak   Int      @default(0)
  longestStart    DateTime?
  longestEnd      DateTime?

  // Grace period (allow 1 miss without breaking)
  graceDaysUsed   Int      @default(0)
  graceDaysAllowed Int     @default(1)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([clientId, streakType])
}

enum StreakType {
  DAILY_CHECKIN     // Daily check-ins
  WORKOUT_LOGGED    // Workouts completed
  APP_ENGAGEMENT    // Any app interaction
  SLEEP_LOGGED      // Sleep data logged
  NUTRITION_LOGGED  // Nutrition logged
}

model Achievement {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  achievementType String  // "streak_7", "first_pr", "consistency_month"
  title          String
  description    String
  iconName       String   // Icon identifier

  unlockedAt     DateTime
  celebratedAt   DateTime? // When user saw the celebration

  // XP system (optional gamification)
  xpAwarded      Int      @default(0)

  // Context
  contextData    Json?    // Additional data about achievement

  @@index([clientId])
}
```

### Components

```
components/athlete/
├── StreakTracker.tsx           # Calendar view with streak
├── StreakBadge.tsx             # Small streak indicator
├── AchievementUnlockModal.tsx  # Celebration popup
├── AchievementBadge.tsx        # Individual badge
└── AchievementsGrid.tsx        # All achievements view

components/shared/
└── AccountabilityWidget.tsx    # Dashboard widget
```

### UI Integration

**Dashboard Widget**:
```tsx
<AccountabilityWidget>
  <StreakDisplay current={23} record={29} type="checkin" />
  <RecentAchievements limit={3} />
  <TodaysCTA action="checkin" /> {/* Or workout, depending on schedule */}
</AccountabilityWidget>
```

---

## Phase 5: Deep Performance Analysis

**Goal**: AI provides narrative insights about test results and training.

### API Endpoints

```
POST /api/ai/analyze-test
- Input: testId
- Output: AI narrative analysis with insights

POST /api/ai/analyze-progress
- Input: clientId, dateRange
- Output: Progress narrative with correlations

POST /api/ai/predict-race
- Input: clientId, raceDistance, targetDate
- Output: Predicted time with confidence interval
```

### Components

```
components/athlete/analysis/
├── AITestAnalysis.tsx          # Narrative analysis card
├── TrainingCorrelation.tsx     # What training drove results
├── RacePredictionWidget.tsx    # Goal predictions
├── ProgressNarrative.tsx       # Long-term progress story
└── TestComparisonView.tsx      # Side-by-side comparison
```

### UI Integration

**Test Results Page Enhancement**:
```tsx
// On test detail page
<div className="grid gap-6">
  <TestResultsChart data={test} />

  {/* New AI Analysis Section */}
  <AITestAnalysis testId={test.id} />

  <TrainingCorrelation
    testDate={test.date}
    lookbackDays={90}
  />

  <RacePredictionWidget
    currentFitness={test.vo2max}
    targetRace="10K"
  />
</div>
```

---

## Implementation Timeline

### Sprint 1-2: Conversational Memory
- [ ] Database schema migration
- [ ] Memory extraction API
- [ ] System prompt enhancement
- [ ] Memory indicator UI
- [ ] Weekly summarization cron

### Sprint 3-4: Proactive Intelligence
- [ ] Notification database schema
- [ ] Morning briefing cron job
- [ ] Pre-workout nudge system
- [ ] Notification preferences UI
- [ ] Dashboard integration

### Sprint 5-6: Coach-AI Collaboration
- [ ] Alert system database
- [ ] Alert generation cron
- [ ] Coach dashboard panel
- [ ] Weekly report generation
- [ ] Program suggestion system

### Sprint 7-8: Accountability & Analysis
- [ ] Streak tracking system
- [ ] Achievement system
- [ ] Test analysis AI integration
- [ ] Progress narrative generation
- [ ] Race prediction model

---

## Dependencies

| Feature | Depends On |
|---------|------------|
| Conversational Memory | Existing AI chat system |
| Proactive Intelligence | Cron infrastructure, Calendar events |
| Coach Collaboration | Existing coach dashboard |
| Streaks | Daily check-in system |
| Analysis | Test data, workout logs |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Memory Accuracy | 90% relevant | Manual review sample |
| Briefing Open Rate | 60% | Notification analytics |
| Coach Alert Response | <24h avg | Alert resolution time |
| Streak Engagement | 40% >7 days | Streak data |
| Analysis Usage | 50% of tests | View analytics |

---

## Files to Create/Modify

### New Files
```
prisma/schema.prisma (additions)
app/api/ai/memory/
app/api/ai/analyze-test/
app/api/athlete/notifications/
app/api/coach/ai-alerts/
app/api/coach/weekly-reports/
app/api/cron/morning-briefing/
app/api/cron/coach-alerts/
app/api/cron/weekly-reports/
components/athlete/ai/MorningBriefingCard.tsx
components/athlete/ai/MemoryIndicator.tsx
components/athlete/StreakTracker.tsx
components/coach/ai/CoachAIAssistantPanel.tsx
components/coach/ai/AthleteAlertCard.tsx
lib/ai/memory-extractor.ts
lib/ai/notification-generator.ts
lib/ai/coach-alert-generator.ts
```

### Files to Modify
```
lib/ai/athlete-system-prompt.ts (add memory context)
components/athlete/ai/AthleteFloatingChat.tsx (add memory UI)
app/athlete/dashboard/page.tsx (add notifications)
app/coach/dashboard/page.tsx (add AI panel)
```
