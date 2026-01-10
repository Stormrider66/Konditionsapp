# AI Personal Trainer Vision

> Master document for AI-powered athlete coaching across all sports and fitness goals.

## Executive Summary

Transform the existing AI chat into the **best possible personal trainer** by implementing intelligent, proactive, and deeply personalized coaching that adapts to each athlete's sport, goals, and daily readiness.

**Critical Principle**: Every AI feature MUST have a clear UI integration. No backend-only features.

---

## The 14 Core AI Features

### Feature 1: Proactive Intelligence

**Current state**: Reactive suggestions banner, manual chat initiation

**Vision**: AI that anticipates needs before the athlete asks

| Capability | Description | Priority |
|------------|-------------|----------|
| Morning Briefing | Daily personalized message at athlete's preferred time | High |
| Pre-Workout Nudges | 2h before scheduled workout: nutrition, hydration, equipment | Medium |
| Post-Workout Follow-up | Automatic check-in prompts after sessions | High |
| Pattern Detection Alerts | "Your sleep drops every Thursday - any pattern there?" | Medium |
| Weather-Aware Adjustments | "It's -5°C, consider indoor alternatives" | Low |
| Calendar Conflict Detection | "You have a flight at 3pm - workout in morning?" | Medium |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ ATHLETE DASHBOARD                                           │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🌅 MORGONBRIEFING                          08:00 idag  │ │
│ │                                                         │ │
│ │ God morgon Henrik! Här är din dag:                      │ │
│ │                                                         │ │
│ │ 📋 Dagens pass: Tempoløpning 40 min                     │ │
│ │ 💪 Readiness: 7.2/10 - Bra för planerad träning        │ │
│ │ ⚠️  Obs: Du sov bara 6h - prioritera sömn ikväll       │ │
│ │ 🍽️  Ät senast 14:00 (träning 16:00)                    │ │
│ │                                                         │ │
│ │ [Läs mer i chatten] [Avfärda]                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Rest of dashboard...]                                      │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `MorningBriefingCard.tsx` - Dismissible card on athlete dashboard
- `ProactiveNotificationBanner.tsx` - For pre-workout nudges
- `PatternAlertModal.tsx` - Weekly pattern insights
- Settings: `AINotificationPreferences` in athlete settings

**Implementation approach**:
- Cron job for morning briefings (configurable time per athlete)
- Event-driven nudges based on calendar
- Pattern detection via weekly analysis job
- Push notification integration (optional)

---

### Feature 2: Conversational Memory & Relationship Building

**Current state**: Context from database, no conversation memory across sessions

**Vision**: AI that remembers previous conversations and builds a relationship

| Capability | Description | Priority |
|------------|-------------|----------|
| Long-term Memory | "Last week you mentioned knee discomfort - how is it now?" | High |
| Personality Adaptation | Learn preferred communication style over time | Medium |
| Milestone Celebrations | "One year ago today you did your first test!" | Medium |
| Life Context Awareness | Remember stressful periods, vacations, life events | Low |
| Preference Learning | Communication style, motivation type, data vs. simplicity | Medium |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ FLOATING CHAT (Enhanced)                                    │
├─────────────────────────────────────────────────────────────┤
│ AI: Hej Henrik! Förra veckan nämnde du att höften           │
│     kändes lite stram efter löpningen. Hur är det nu?       │
│                                                             │
│ [Quick replies:]                                            │
│ [Mycket bättre] [Fortfarande ont] [Glömde bort det]        │
├─────────────────────────────────────────────────────────────┤
│ 🎉 MILSTOLPE                                                │
│ Ett år sedan ditt första VO2max-test!                       │
│ Då: 48.2 ml/kg/min → Nu: 52.1 ml/kg/min (+8%)              │
│ [Se din resa]                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `MilestoneModal.tsx` - Celebration popup with journey visualization
- `QuickReplyButtons.tsx` - Context-aware quick responses
- `JourneyTimeline.tsx` - Visual progress from first interaction
- Enhanced `AthleteFloatingChat.tsx` with memory indicators

**Database additions**:
```typescript
model ConversationMemory {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId])
  memoryType  MemoryType // PREFERENCE, INJURY_MENTION, LIFE_EVENT, GOAL
  content     String   // "Mentioned knee discomfort after long runs"
  extractedAt DateTime
  expiresAt   DateTime? // Some memories fade
  importance  Int      // 1-5 for retrieval priority
}
```

---

### Feature 3: Real-Time Workout Companion

**Current state**: Workout plan display, post-workout logging

**Vision**: AI that coaches during workout execution

| Capability | Description | Priority |
|------------|-------------|----------|
| Live Coaching Mode | Voice guidance through intervals, rest timers | High |
| Real-time Zone Feedback | "You're in Z3, push to Z4" based on HR | Medium |
| Adaptive Modification | "Your HR is high - should we reduce intensity?" | High |
| Voice Interaction | Hands-free commands during workout | Medium |
| Smartwatch Integration | Haptic cues, glanceable tips | Low |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ WORKOUT EXECUTION MODE (Full Screen)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    INTERVALL 3 av 6                         │
│                                                             │
│                      ⏱️ 2:34                                │
│                    återstår av 4:00                         │
│                                                             │
│     ❤️ 156 bpm          🎯 Zon 4          🏃 4:45/km       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 AI Coach säger:                                      │ │
│ │ "Bra tempo! Håll här i 90 sekunder till,               │ │
│ │  sen kommer vila. Du klarar detta!"                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│   [⏸️ Pausa]    [🎤 Röstkommando]    [⚙️ Justera]          │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Nästa: 2 min vila → Intervall 4 (4 min @ Z4)           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `WorkoutExecutionScreen.tsx` - Full-screen workout mode
- `IntervalTimer.tsx` - Countdown with audio cues
- `LiveMetricsDisplay.tsx` - HR, pace, zone from connected devices
- `AICoachingBubble.tsx` - Real-time AI commentary
- `VoiceCommandHandler.tsx` - "Pause", "Skip", "Easier"
- `WorkoutModificationModal.tsx` - Adjust intensity mid-workout

**Mobile-first consideration**: This must work excellently on mobile.

---

### Feature 4: Intelligent Periodization & Planning

**Current state**: Coach creates programs, AI explains them

**Vision**: AI that generates and adapts complete training plans

| Capability | Description | Priority |
|------------|-------------|----------|
| AI Program Generation | Full periodization from goals to sessions | High |
| Dynamic Load Management | Auto-detect deload needs from HRV/readiness | High |
| Race Simulation Planning | Progressive test workouts toward goal | Medium |
| Multi-Sport Periodization | Balance disciplines for triathletes | Medium |
| Automatic Adjustments | Weekly plan updates based on adaptation signals | High |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ ATHLETE: PROGRAM VIEW                                       │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 AI PROGRAMFÖRSLAG                                    │ │
│ │                                                         │ │
│ │ Baserat på ditt mål (sub-40 10K) och nuvarande form,   │ │
│ │ föreslår jag detta 12-veckors program:                  │ │
│ │                                                         │ │
│ │ Fas 1: Basbygge (4v) - Bygg aerob kapacitet            │ │
│ │ Fas 2: Tempo (4v) - Höj tröskeln                       │ │
│ │ Fas 3: Fart (3v) - Specifik 10K-träning                │ │
│ │ Fas 4: Taper (1v) - Vila inför loppet                  │ │
│ │                                                         │ │
│ │ [Visa detaljerat program] [Justera] [Skicka till coach] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ AUTOMATISK JUSTERING                                 │ │
│ │                                                         │ │
│ │ Din HRV har sjunkit 3 dagar i rad.                     │ │
│ │ Jag föreslår: Byt morgondagens tempo till lätt löpning │ │
│ │                                                         │ │
│ │ [Godkänn ändring] [Behåll original] [Fråga coach]      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `AIProgramSuggestion.tsx` - Program proposal card
- `ProgramAdjustmentAlert.tsx` - Automatic modification suggestions
- `PeriodizationTimeline.tsx` - Visual phase overview
- `AdaptationIndicator.tsx` - Shows why AI suggests changes
- Coach approval workflow for athlete-generated programs

---

### Feature 5: Deep Performance Analysis

**Current state**: Test results displayed, basic zone calculations

**Vision**: AI that provides narrative insights and predictions

| Capability | Description | Priority |
|------------|-------------|----------|
| Trend Analysis Narratives | "Your VO2max improved 4% - here's what drove it" | High |
| Training-Adaptation Correlation | "Your tempo runs correlate with threshold gains" | Medium |
| Predictive Race Modeling | "At current trajectory, sub-40 10K by March" | Medium |
| Benchmarking Insights | "Your power-to-weight is top 20% for age group" | Low |
| Before/After Comparisons | Visual + narrative comparison of tests | Medium |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ TEST RESULTS PAGE (Enhanced)                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ VO2max Test - 15 januari 2026                               │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│ [Graph showing lactate curve]                               │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 AI ANALYS                                            │ │
│ │                                                         │ │
│ │ Din VO2max ökade från 48.2 till 52.1 (+8% på 6 mån).   │ │
│ │                                                         │ │
│ │ Vad som drev förbättringen:                            │ │
│ │ ✅ 340 km zon 2-löpning (stark korrelation)            │ │
│ │ ✅ Konsekvent 4 pass/vecka                              │ │
│ │ ⚠️  Tempoträning var begränsad - potential här         │ │
│ │                                                         │ │
│ │ Prediktion:                                            │ │
│ │ 🎯 10K-tid nu: ~41:30                                  │ │
│ │ 🎯 Med fortsatt träning: sub-40 möjligt i april       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Jämför med tidigare test] [Dela med coach] [Exportera]    │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `AITestAnalysis.tsx` - Narrative analysis card
- `TrainingCorrelationChart.tsx` - What training drove results
- `RacePredictionWidget.tsx` - Goal time predictions
- `TestComparisonView.tsx` - Side-by-side test comparison
- `BenchmarkPosition.tsx` - Where athlete ranks

---

### Feature 6: Mental Performance & Psychology

**Current state**: Motivation quick prompt, mood tracking in check-ins

**Vision**: Complete mental performance support

| Capability | Description | Priority |
|------------|-------------|----------|
| Pre-Competition Mental Prep | Race visualization, anxiety management | High |
| Mental State Detection | Sentiment analysis from chat patterns | Medium |
| Goal Psychology | Break overwhelming goals into process goals | Medium |
| Recovery Psychology | Guide through injury frustration | High |
| Daily Mindset Prompts | "What's your intention for today's workout?" | Low |
| Burnout Early Warning | Detect from engagement patterns | Medium |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ PRE-RACE MENTAL PREP (3 days before race)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🧠 MENTAL FÖRBEREDELSE - Göteborgsvarvet                   │
│                                                             │
│ Dag 1: Visualisering                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ▶️ Guidad visualisering (8 min)                         │ │
│ │ "Se dig själv vid startlinjen..."                       │ │
│ │                                                         │ │
│ │ [Starta] [Läs text istället]                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Dag 2: Tävlingsplan                                         │
│ • Din målpace: 5:00/km                                      │ │
│ • Plan för km 1-5: Håll tillbaka, 5:05-5:10               │ │
│ • Plan för km 15-21: Här avgörs loppet                    │ │
│                                                             │
│ Dag 3: Positiva affirmationer                               │
│ • "Jag har tränat för detta"                               │ │
│ • "Min kropp är redo"                                      │ │
│                                                             │
│ [Anpassa min race-plan]                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ INJURY PSYCHOLOGY (When athlete is injured)                 │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 AI Coach:                                            │ │
│ │                                                         │ │
│ │ Jag vet att det är frustrerande att vara skadad.       │ │
│ │ Din vadskada läker - du är på dag 8 av uppskattad      │ │
│ │ 14-dagars återhämtning.                                │ │
│ │                                                         │ │
│ │ Vad du KAN göra nu:                                    │ │
│ │ ✅ Överkroppsträning                                   │ │
│ │ ✅ Simning (om smärtfritt)                             │ │
│ │ ✅ Mental träning                                      │ │
│ │                                                         │ │
│ │ Din fitness tappar bara ~3% på 2 veckor vila.          │ │
│ │ Du kommer tillbaka starkare.                           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `PreRaceMentalPrep.tsx` - Multi-day mental preparation flow
- `GuidedVisualization.tsx` - Audio/text visualization exercises
- `RacePlanBuilder.tsx` - Pacing and strategy tool
- `InjuryPsychologyCard.tsx` - Supportive messaging during injury
- `MindsetPromptModal.tsx` - Daily intention setting
- `BurnoutWarningBanner.tsx` - Early warning system

---

### Feature 7: Nutrition Intelligence

**Current state**: Dietary preferences, basic tips in chat

**Vision**: Workout-specific, periodized nutrition guidance

| Capability | Description | Priority |
|------------|-------------|----------|
| Workout-Specific Fueling | "Today's 90min run needs ~60g carbs" | High |
| Periodized Nutrition | Higher carbs on intense days, lower on recovery | Medium |
| Meal Timing Optimization | "Your workout is at 6pm - eat lunch by 2pm" | Medium |
| Supplement Guidance | Evidence-based recommendations only | Low |
| Recovery Nutrition | "You burned ~800 kcal - here's recovery targets" | Medium |
| Hydration Calculator | Based on weather, duration, intensity | Medium |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ TODAY'S NUTRITION GUIDANCE (Dashboard Widget)               │
├─────────────────────────────────────────────────────────────┤
│ 🍽️ NUTRITION IDAG                    Träning: 16:00        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Dagens pass: Tempoløpning 50 min (medel-hög intensitet)│ │
│ │                                                         │ │
│ │ Före (senast 14:00):                                   │ │
│ │ • 60-80g kolhydrater (pasta, ris, bröd)               │ │
│ │ • Undvik fett och fiber nära träning                   │ │
│ │                                                         │ │
│ │ Under:                                                  │ │
│ │ • Vatten räcker (under 60 min)                        │ │
│ │                                                         │ │
│ │ Efter (inom 30 min):                                   │ │
│ │ • 20-25g protein                                       │ │
│ │ • 40-60g kolhydrater                                   │ │
│ │ • Exempel: Chokladmjölk + banan                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 💧 Vätskeintag idag: 2.5L mål                              │
│ [████████░░] 2.0L                                          │
│                                                             │
│ [Logga måltid] [Logga vatten] [Anpassa kostråd]           │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `DailyNutritionCard.tsx` - Dashboard widget with workout context
- `PreWorkoutFueling.tsx` - Specific pre-workout recommendations
- `RecoveryNutritionCard.tsx` - Post-workout guidance
- `HydrationTracker.tsx` - Daily water intake logging
- `MealTimingReminder.tsx` - Notification component
- Enhanced `NutritionDashboard.tsx` with AI recommendations

---

### Feature 8: Injury Prevention & Management

**Current state**: Injury tracking, AI excludes injured areas from WOD

**Vision**: Predictive injury prevention and guided recovery

| Capability | Description | Priority |
|------------|-------------|----------|
| Prehab Intelligence | Sport-specific injury risk protocols | High |
| Load-Injury Prediction | "Your training spike puts you at risk" | High |
| Symptom Triage | Guided pain assessment with recommendations | Medium |
| Return-to-Play Protocols | Criteria-based progression, not time-based | High |
| Movement Quality Tracking | Video analysis for developing compensations | Low |
| Historical Pattern Analysis | "You got injured last time loads peaked like this" | Medium |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ INJURY RISK DASHBOARD                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠️ SKADERISK: FÖRHÖJD                                      │
│                                                             │
│ ACWR: 1.38 (Varningszon: 1.3-1.5)                          │
│ [██████████████░░░░░░] 1.38                                 │
│  0.8        1.0       1.3    1.5    2.0                    │
│  Undertrained  Optimal  Caution  Danger                     │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 AI REKOMMENDATION:                                   │ │
│ │                                                         │ │
│ │ Din träningsbelastning ökade 35% senaste veckan.       │ │
│ │ Historiskt har du skadats vid liknande ökningar.       │ │
│ │                                                         │ │
│ │ Förslag:                                                │ │
│ │ • Reducera volymen 20% denna vecka                     │ │
│ │ • Prioritera sömn (mål: 8h)                            │ │
│ │ • Lägg till: Höftmobilitet 10 min/dag                  │ │
│ │                                                         │ │
│ │ [Visa förebyggande övningar] [Justera veckoplan]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ OMRÅDEN ATT BEVAKA:                                         │
│ 🔴 Akillessena (hög belastning + tidigare besvär)         │
│ 🟡 Höft (nedsatt rörlighet noterad)                        │
│ 🟢 Knä (stabilt)                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RETURN-TO-PLAY TRACKER (When injured)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🏥 VADSKADA - ÅTERGÅNG TILL TRÄNING                        │
│                                                             │
│ Fas 3 av 5: Lätt löpning                                    │
│ [████████████░░░░░░░░] 60%                                  │
│                                                             │
│ ✅ Fas 1: Vila (dag 1-3) - Klar                            │
│ ✅ Fas 2: Gång utan smärta (dag 4-7) - Klar               │
│ 🔄 Fas 3: Lätt jogging (dag 8-10) - Pågår                 │
│    Kriterium: 20 min jogg utan smärta                      │
│ ⏳ Fas 4: Progressiv löpning (dag 11-14)                   │
│ ⏳ Fas 5: Full träning                                     │
│                                                             │
│ Dagens uppgift:                                             │
│ Prova 15 min lätt jogging. Smärta över 3/10 = stopp.       │
│                                                             │
│ [Logga dagens test] [Rapportera smärta] [Fråga AI]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `InjuryRiskDashboard.tsx` - ACWR visualization with AI insights
- `BodyPartRiskIndicator.tsx` - Risk per body area
- `PainAssessmentWizard.tsx` - Guided symptom triage
- `ReturnToPlayTracker.tsx` - Phase-based recovery progress
- `PrehabExerciseLibrary.tsx` - Preventive exercises
- `InjuryHistoryTimeline.tsx` - Past injuries and patterns

---

### Feature 9: Social & Accountability Features

**Current state**: Individual athlete experience

**Vision**: Built-in accountability and healthy competition

| Capability | Description | Priority |
|------------|-------------|----------|
| AI Accountability Partner | Check-in streaks, gentle accountability | High |
| Virtual Training Partners | Race your PR self from last month | Low |
| Community Insights | "Athletes with similar goals train X hours/week" | Medium |
| Coach Communication Enhancement | AI summarizes athlete week for coach | High |
| Consistency Celebration | "You've logged 30 consecutive days!" | Medium |
| Normalized Struggle | "Most athletes find weeks 3-4 hardest" | Low |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ DASHBOARD - ACCOUNTABILITY WIDGET                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🔥 STREAK: 23 dagar                                        │
│                                                             │
│ Januari                                                      │
│ M  T  O  T  F  L  S                                        │
│ ✅ ✅ ✅ ✅ ✅ ✅ ✅                                         │
│ ✅ ✅ ✅ ✅ ✅ ✅ ✅                                         │
│ ✅ ✅ ✅ ✅ ✅ 🔵 ⭕                                        │
│              idag                                           │
│                                                             │
│ "23 dagar i rad! Imponerande. Bara 7 dagar till            │
│  så slår du ditt personliga rekord (29 dagar)."            │
│                                                             │
│ [Gör dagens check-in]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ COACH DASHBOARD - ATHLETE SUMMARY (AI Generated)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 VECKOSUMMERING: Henrik Larsson                          │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 AI SAMMANFATTNING:                                   │ │
│ │                                                         │ │
│ │ Henrik hade en stark vecka med 5/5 genomförda pass.    │ │
│ │ Readiness var stabil (snitt 7.2). Han nämnde lätt      │ │
│ │ höftobehag på tisdag men det verkar ha löst sig.       │ │
│ │                                                         │ │
│ │ ✅ Highlights: Ny PB på 5K-tempolöpning (22:45)        │ │
│ │ ⚠️ Notera: Sömn under 7h två nätter                    │ │
│ │ 💬 Förslag: Fråga om höften vid nästa kontakt         │ │
│ │                                                         │ │
│ │ [Skicka meddelande] [Visa detaljer] [Markera som läst] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `StreakTracker.tsx` - Visual streak calendar
- `AccountabilityWidget.tsx` - Dashboard motivation widget
- `WeeklySummaryCard.tsx` - AI-generated athlete summary for coach
- `CoachAlertsBanner.tsx` - Athletes needing attention
- `CommunityInsightsCard.tsx` - Anonymous peer comparisons
- `AchievementBadge.tsx` - Celebration modals

---

### Feature 10: Advanced Integrations

**Current state**: Strava, Garmin, Concept2

**Vision**: Comprehensive data ecosystem

| Capability | Description | Priority |
|------------|-------------|----------|
| Sleep Device Integration | Whoop, Oura, Apple Watch | High |
| Continuous Glucose Monitoring | Correlate glucose with performance | Low |
| Environmental Sensors | Air quality, altitude, heat/humidity | Low |
| Calendar Integration | Google/Outlook for life stress awareness | Medium |
| GPS Data Integration | Football/team sport load monitoring | High |
| External App Sync | Hockey app match schedule import | High |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ SETTINGS - INTEGRATIONS                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ANSLUTNA TJÄNSTER                                           │
│                                                             │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│ │ ✅ Strava     │ │ ✅ Garmin     │ │ ⬜ Whoop      │      │
│ │ Synkad       │ │ Synkad       │ │ [Anslut]     │      │
│ │ 14 jan 08:00 │ │ 14 jan 08:00 │ │              │      │
│ └───────────────┘ └───────────────┘ └───────────────┘      │
│                                                             │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│ │ ⬜ Oura       │ │ ⬜ Apple      │ │ ✅ Concept2   │      │
│ │ [Anslut]     │ │ Health       │ │ Synkad       │      │
│ │              │ │ [Anslut]     │ │ 10 jan       │      │
│ └───────────────┘ └───────────────┘ └───────────────┘      │
│                                                             │
│ SPECIALINTEGRATIONER                                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏒 Hockey App (extern)                                  │ │
│ │                                                         │ │
│ │ Status: Ansluten                                        │ │
│ │ Synkar: Matchschema                                     │ │
│ │ Senaste synk: 14 jan 2026, 08:00                       │ │
│ │                                                         │ │
│ │ [Synka nu] [Inställningar] [Koppla bort]               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚽ GPS Data (Catapult/Statsports)                       │ │
│ │                                                         │ │
│ │ Status: Konfigurerad                                    │ │
│ │ Senaste match: 12 jan - 10.8 km, 890m high-speed       │ │
│ │                                                         │ │
│ │ [Importera data] [Visa historik]                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `IntegrationCard.tsx` - Reusable connection card
- `IntegrationSettings.tsx` - Per-integration configuration
- `SyncStatusBadge.tsx` - Last sync indicator
- `HockeyAppIntegration.tsx` - External hockey app setup
- `GPSDataImport.tsx` - Football GPS data management
- `SleepDataWidget.tsx` - Dashboard widget showing Whoop/Oura data

---

### Feature 11: Learning & Education

**Current state**: AI explains concepts on request

**Vision**: Personalized education curriculum

| Capability | Description | Priority |
|------------|-------------|----------|
| Personalized Curriculum | "This week, learn about lactate threshold" | Medium |
| Video Library Recommendations | Matched to video analysis issues | Medium |
| Scientific Translation | Make research accessible and relevant | Low |
| Interactive Learning | Quiz athlete understanding | Low |
| Progressive Education | Content based on athlete's level | Medium |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ LEARN TAB (New navigation item)                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📚 VECKANS LÄRANDE                                         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Laktattröskel - Vad är det och varför spelar det roll? │ │
│ │                                                         │ │
│ │ Du har just gjort ett laktattest. Låt oss förstå       │ │
│ │ vad siffrorna betyder för din träning.                  │ │
│ │                                                         │ │
│ │ 📖 Läs (5 min)  ▶️ Video (3 min)  🎧 Lyssna (5 min)   │ │
│ │                                                         │ │
│ │ [Starta lektion]                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ REKOMMENDERADE FÖR DIG                                      │
│                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │ 🏃 Löpteknik │ │ 😴 Sömn och  │ │ 🍽️ Kost för │         │
│ │              │ │ återhämtning │ │ uthållighet  │         │
│ │ Baserat på   │ │              │ │              │         │
│ │ din video-   │ │ Din sömn var │ │ Du tränar    │         │
│ │ analys       │ │ <7h 3 ggr    │ │ för mara-    │         │
│ │              │ │ denna vecka  │ │ ton          │         │
│ │ [Börja]      │ │ [Börja]      │ │ [Börja]      │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                             │
│ DINA FRAMSTEG                                               │
│ ✅ Grundläggande kondition (4/4 moduler)                   │
│ 🔄 Träningszoner (2/5 moduler)                             │
│ ⬜ Periodisering (0/6 moduler)                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `LearnPage.tsx` - New navigation destination
- `WeeklyLessonCard.tsx` - Featured learning content
- `LearningModuleCard.tsx` - Individual lesson cards
- `LearningProgress.tsx` - Progress tracker
- `ContentViewer.tsx` - Read/watch/listen modes
- `QuizComponent.tsx` - Interactive knowledge checks

---

### Feature 12: Voice & Multimodal Interaction

**Current state**: Text-based chat

**Vision**: Multiple interaction modalities

| Capability | Description | Priority |
|------------|-------------|----------|
| Voice-First Interface | Full voice conversation during workouts | Medium |
| Image Analysis | "Here's my meal - how does this look?" | Medium |
| Video Submission | Athletes upload form checks | High |
| Real-time Pose Estimation | Live feedback on movement | Low |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ FLOATING CHAT (Enhanced with multimodal)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [Previous messages...]                                      │
│                                                             │
│ USER: [📷 Image of meal]                                   │
│                                                             │
│ AI: Bra val inför träningen! Jag ser:                      │
│     • Pasta (bra kolhydrater) ✅                            │
│     • Kyckling (protein) ✅                                 │
│     • Grönsaker (fiber - kanske lite mycket nära träning) │
│                                                             │
│     Tips: Ät detta 2-3h innan. Ser ut som ~60g kolhydrater │
│     vilket passar för ditt 60-minuterspass.                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Skriv meddelande...]                                       │
│                                                             │
│ [📷 Bild] [🎤 Röst] [📹 Video] [📎 Fil]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ VIDEO FORM CHECK UPLOAD                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📹 LADDA UPP TEKNIKVIDEO                                   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │           [Dra och släpp video här]                    │ │
│ │                                                         │ │
│ │              eller [Välj fil]                          │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Typ av analys:                                              │
│ ○ Löpteknik                                                │
│ ○ Cykelteknik                                              │
│ ○ Styrkelyft                                               │
│ ○ Allmän rörelse                                           │
│                                                             │
│ [Ladda upp och analysera]                                   │
│                                                             │
│ Tips: Filma från sidan, 10-30 sekunder räcker.             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `VoiceInputButton.tsx` - Speech-to-text in chat
- `VoiceOutputToggle.tsx` - Text-to-speech for AI responses
- `ImageUploadPreview.tsx` - Image attachment in chat
- `MealAnalysisResult.tsx` - Structured meal feedback
- `VideoUploadModal.tsx` - Form check video upload
- `VideoAnalysisResult.tsx` - AI analysis display
- `VoiceWorkoutMode.tsx` - Hands-free workout companion

---

### Feature 13: Gamification & Motivation

**Current state**: Basic progress tracking

**Vision**: Engaging achievement system

| Capability | Description | Priority |
|------------|-------------|----------|
| Achievement System | Badges for consistency, PRs, learning | Medium |
| Level-Up System | Training age and achievement based | Low |
| Quests/Challenges | "30-day mobility challenge" with AI check-ins | Medium |
| Progress Visualization | Journey map from start to now | Medium |
| Seasonal Challenges | Winter base building, summer speed | Low |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ PROFILE - ACHIEVEMENTS                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Henrik Larsson                      Level 12: Dedicated     │
│ ████████████████████░░░░░ 2,340 / 3,000 XP till Level 13  │
│                                                             │
│ 🏆 SENASTE PRESTATIONER                                    │
│                                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │ 🔥      │ │ 📈      │ │ 🏃      │ │ 📚      │           │
│ │ 30-Day  │ │ VO2max  │ │ 100 km  │ │ Student │           │
│ │ Streak  │ │ +5%     │ │ Week    │ │ Level 2 │           │
│ │         │ │         │ │         │ │         │           │
│ │ Jan 10  │ │ Jan 8   │ │ Jan 5   │ │ Dec 28  │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│ AKTIVA UTMANINGAR                                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🧘 30 Dagars Rörlighet                    Dag 12 av 30 │ │
│ │ [████████████░░░░░░░░░░░░░░░░░░] 40%                   │ │
│ │                                                         │ │
│ │ Dagens uppgift: 10 min höftöppnare                     │ │
│ │ [Markera klar] [Visa övningar]                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Se alla prestationer] [Utforska utmaningar]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ACHIEVEMENT UNLOCK MODAL                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│               🎉 NY PRESTATION UPPLÅST! 🎉                 │
│                                                             │
│                      ┌─────────┐                            │
│                      │   🔥    │                            │
│                      │ 30-Day  │                            │
│                      │ Streak  │                            │
│                      └─────────┘                            │
│                                                             │
│              30 dagars check-in i rad!                      │
│                                                             │
│         "Konsistens är nyckeln till framgång.              │
│          Du har bevisat att du har det som krävs."         │
│                                                             │
│                     +150 XP                                 │
│                                                             │
│                   [Fantastiskt!]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `AchievementBadge.tsx` - Individual badge display
- `AchievementGrid.tsx` - All achievements overview
- `AchievementUnlockModal.tsx` - Celebration popup
- `LevelProgressBar.tsx` - XP and level display
- `ChallengeCard.tsx` - Active challenge tracker
- `ChallengeLibrary.tsx` - Browse available challenges
- `JourneyTimeline.tsx` - Visual progress over time

---

### Feature 14: Coach-AI Collaboration

**Current state**: Separate coach and athlete AI experiences

**Vision**: AI as intelligent assistant to coaching staff

| Capability | Description | Priority |
|------------|-------------|----------|
| Flag Athletes Needing Attention | Readiness drops, missed check-ins | High |
| Suggest Program Modifications | Based on athlete response | Medium |
| Draft Messages for Coach | "Consider sending this to athlete" | Low |
| Two-Way Transparency | Coach sees AI recommendations | Medium |
| Handoff Protocols | AI knows when to escalate to human | High |
| Weekly Summaries | Aggregated athlete insights for coach | High |

**UI Integration**:
```
┌─────────────────────────────────────────────────────────────┐
│ COACH DASHBOARD - AI ASSISTANT PANEL                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🤖 AI ASSISTENT                                            │
│                                                             │
│ ⚠️ KRÄVER UPPMÄRKSAMHET (3)                                │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔴 Anna Svensson                                        │ │
│ │ Readiness under 5.0 i 4 dagar. Möjlig överträning.     │ │
│ │ [Kontakta] [Visa data] [Avfärda]                       │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🟡 Erik Johansson                                       │ │
│ │ Missade 3 pass denna vecka. Ovanligt mönster.          │ │
│ │ [Kontakta] [Visa data] [Avfärda]                       │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🟡 Lisa Berg                                            │ │
│ │ Nämnde knäsmärta i chatten igår.                       │ │
│ │ [Läs konversation] [Kontakta] [Avfärda]                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 💡 PROGRAMFÖRSLAG                                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Marcus Holm - Vecka 6 av 12                            │ │
│ │                                                         │ │
│ │ AI föreslår: Byt långpasset söndag till lättare        │ │
│ │ löpning. Anledning: HRV trend nedåt, hög ACWR (1.35).  │ │
│ │                                                         │ │
│ │ [Godkänn] [Justera] [Ignorera]                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 📊 VECKANS ÖVERSIKT                                        │
│                                                             │
│ • 12 av 15 atleter genomförde alla pass ✅                 │
│ • Genomsnittlig readiness: 6.8 (normalt)                   │
│ • 2 nya PB registrerade                                    │
│ • 1 skaderapport (minor)                                   │
│                                                             │
│ [Generera fullständig rapport]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components needed**:
- `CoachAIAssistantPanel.tsx` - Main AI assistant widget
- `AthleteAttentionCard.tsx` - Athletes needing attention
- `ProgramSuggestionCard.tsx` - AI modification proposals
- `AIChatTranscriptViewer.tsx` - View athlete's AI conversations
- `WeeklyCoachReport.tsx` - AI-generated summary
- `AIRecommendationHistory.tsx` - Log of AI suggestions

---

## Implementation Priority Matrix

### Tier 1: Foundation (Do First)
| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Conversational Memory | Medium | Very High | None |
| Proactive Intelligence (Morning Briefing) | Low | High | Cron system |
| Coach-AI Collaboration (Alerts) | Low | High | None |
| Injury Prevention (Load Prediction) | Low | High | ACWR exists |

### Tier 2: Quick Wins
| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Nutrition Timing | Low | Medium | Workout schedule |
| Mental Prep (Pre-Competition) | Low | High | Calendar events |
| Accountability (Streaks) | Low | Medium | None |
| Deep Analysis (Narratives) | Medium | High | Test data |

### Tier 3: Major Features
| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Real-Time Workout Companion | High | Very High | WebSocket, voice |
| Intelligent Periodization | High | Very High | Program generators |
| Voice Interaction | High | High | Speech APIs |
| Advanced Integrations | High | Medium | OAuth, APIs |

### Tier 4: Future Enhancements
| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Virtual Training Partners | Medium | Low | Historical data |
| CGM Integration | High | Low | Hardware access |
| Real-time Pose Estimation | Very High | Medium | ML infrastructure |
| Gamification System | Medium | Medium | Achievement design |

---

## Cross-Sport Application

All 14 features apply across sports with sport-specific context:

| Feature | Endurance | Gym Members | Hockey | Football |
|---------|-----------|-------------|--------|----------|
| Morning Briefing | Training focus | Habit reminder | Game-day aware | Match-day aware |
| Memory | Race goals | Weight goals | Season goals | Season goals |
| Real-Time | Interval coaching | Rep counting | N/A (on ice) | N/A (on pitch) |
| Periodization | Race-focused | Goal-focused | Season phases | Season phases |
| Nutrition | Fueling focus | Deficit/surplus | Game-day | Match-day |
| Injury | Overuse focus | Form focus | Contact sports | Contact + overuse |
| Load Mgmt | ACWR/TSS | Volume | Ice time + gym | GPS data |

---

## Related Plans

1. **[01-AI-CORE-INFRASTRUCTURE.md](./01-AI-CORE-INFRASTRUCTURE.md)** - Shared AI improvements
2. **[02-GYM-MEMBERS.md](./02-GYM-MEMBERS.md)** - General Fitness + Functional Fitness
3. **[03-TEAM-SPORTS.md](./03-TEAM-SPORTS.md)** - Hockey + Football

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily AI Engagement | 60% of active athletes | Chat interactions per day |
| Check-in Completion | 80% daily | Check-in records |
| Workout Completion | 75% of assigned | Assignment completion rate |
| Athlete Satisfaction | 4.5/5 | In-app feedback |
| Coach Time Saved | 30% reduction | Coach survey |
| Injury Rate | 20% reduction | Injury records |
| Retention | 85% monthly | Subscription data |
