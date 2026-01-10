# Plan B: Gym Members

> General Fitness, Functional Fitness, Weight Loss, and Muscle Building

## Overview

Expand support for traditional gym members who don't identify with a specific sport. Three primary goals:
1. **Weight Loss** - Calorie deficit, habit formation, body composition
2. **Muscle Building** - Progressive overload, hypertrophy, strength
3. **General Fitness** - Health, energy, functional movement

Plus a new sport type:
4. **Functional Fitness** - CrossFit-style training (without trademark)

---

## Part 1: Enhanced General Fitness

### Current State

Existing `GENERAL_FITNESS` sport type with:
- 6 goal types (weight loss, strength, endurance, flexibility, stress relief, general health)
- GeneralFitnessSettings in SportProfile
- 12-week program templates
- Body composition tracking
- Basic nutrition goals

### Gaps to Fill

| Gap | Solution |
|-----|----------|
| No habit tracking | Add habit formation system |
| Basic nutrition | Enhanced nutrition intelligence |
| No body comp AI | AI analysis of trends |
| Generic AI prompts | Goal-specific AI personas |
| Limited accountability | Streak system (from Plan A) |

---

## Goal-Specific AI Personas

### Weight Loss AI Persona

```typescript
// lib/ai/personas/weight-loss-persona.ts

export const weightLossPersona = `
Du är en stödjande viktminskningscoach. Din approach:

PRINCIPER:
- Hållbar viktminskning: 0.5-1 kg/vecka max
- Kaloriunderskott utan svält
- Fokus på beteendeförändring, inte bara siffror
- Fira icke-vågrelaterade vinster (energi, kläder, styrka)

KOMMUNIKATIONSSTIL:
- Uppmuntrande men realistisk
- Normalisera bakslag ("Det händer alla")
- Fokusera på vad de KAN göra, inte vad de misslyckades med
- Undvik skam och skuld

PRIORITERINGAR:
1. Konsistens > Perfektion
2. Sömn och stress påverkar vikten
3. Styrketräning bevarar muskler
4. NEAT (vardagsrörelse) är underskattat

VARNINGAR:
- Flagga för snabb viktminskning (>1 kg/vecka)
- Upptäck tecken på ätstörningar
- Rekommendera professionell hjälp vid behov

AKTUELL DATA:
- Startvikt: ${startWeight} kg
- Nuvarande: ${currentWeight} kg
- Mål: ${targetWeight} kg
- Progress: ${progressKg} kg (${progressPercent}%)
- Veckosnitt: ${weeklyChange} kg/vecka
`;
```

### Muscle Building AI Persona

```typescript
// lib/ai/personas/muscle-building-persona.ts

export const muscleBuildingPersona = `
Du är en kunnig styrketräningscoach. Din approach:

PRINCIPER:
- Progressiv överbelastning är nyckeln
- Teknik före tyngd
- Återhämtning är när muskler växer
- Protein: 1.6-2.2 g/kg kroppsvikt

KOMMUNIKATIONSSTIL:
- Motiverande och målfokuserad
- Fira PRs och styrkeframsteg
- Teknisk när det behövs
- Fokus på långsiktig utveckling

PRIORITERINGAR:
1. Konsistens i träningen
2. Progressiv överbelastning (2-for-2 regeln)
3. Adekvat protein och kalorier
4. 7-9 timmars sömn

TRACKING:
- 1RM-utveckling över tid
- Volym per muskelgrupp
- Återhämtningskvalitet

AKTUELL DATA:
- Träningserfarenhet: ${experienceLevel}
- Fokusområden: ${focusAreas}
- Senaste PRs: ${recentPRs}
- Veckovolym: ${weeklyVolume} set
`;
```

### General Fitness AI Persona

```typescript
// lib/ai/personas/general-fitness-persona.ts

export const generalFitnessPersona = `
Du är en vänlig hälsocoach. Din approach:

PRINCIPER:
- Balans mellan kondition, styrka och rörlighet
- Hållbara vanor framför intensiva program
- Lyssna på kroppen
- Träning ska vara njutbar

KOMMUNIKATIONSSTIL:
- Varm och stödjande
- Fokusera på välmående, inte bara resultat
- Uppmuntra variation och utforskning
- Normalisera att börja smått

PRIORITERINGAR:
1. Rörelse varje dag (även 10 min räknas)
2. Hitta aktiviteter som är roliga
3. Stresshantering och sömn
4. Social träning när möjligt

FOKUSOMRÅDEN:
- Energinivå i vardagen
- Sömnkvalitet
- Stresshantering
- Funktionell rörlighet
`;
```

---

## Part 2: Add FUNCTIONAL_FITNESS Sport Type

### Database Changes

```prisma
// Add to SportType enum
enum SportType {
  // ... existing types
  FUNCTIONAL_FITNESS  // CrossFit-style without trademark
}

// Add to SportProfile
model SportProfile {
  // ... existing fields

  functionalFitnessSettings Json? // FunctionalFitnessSettings
}
```

### Settings Schema

```typescript
interface FunctionalFitnessSettings {
  // Experience
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'competitor';
  yearsTraining: number;

  // Focus
  primaryFocus: 'general' | 'strength' | 'endurance' | 'gymnastics' | 'competition';

  // Gym setup
  gymType: 'commercial' | 'functional_box' | 'home' | 'garage';
  equipmentAvailable: EquipmentType[];

  // Benchmarks (renamed from CrossFit names)
  benchmarks: {
    // Metabolic
    fran?: number;        // 21-15-9 Thrusters + Pull-ups (seconds)
    grace?: number;       // 30 Clean & Jerks for time
    diane?: number;       // 21-15-9 Deadlifts + HSPU
    helen?: number;       // 3 rounds: 400m + KB swings + Pull-ups

    // Hero workouts
    murph?: number;       // 1mi + 100 PU + 200 Push + 300 Sq + 1mi

    // Strength
    cleanAndJerk1RM?: number;
    snatch1RM?: number;
    backSquat1RM?: number;
    deadlift1RM?: number;
    strictPress1RM?: number;

    // Gymnastics
    maxPullUps?: number;
    maxMuscleUps?: number;
    maxHSPU?: number;
    maxDoubleUnders?: number;
  };

  // Skill levels
  gymnasticsSkills: {
    pullUps: 'none' | 'banded' | 'strict' | 'kipping' | 'butterfly' | 'muscle_up';
    handstandPushUps: 'none' | 'pike' | 'box' | 'wall' | 'strict' | 'kipping' | 'freestanding';
    toeToBar: 'none' | 'hanging_knee' | 'kipping' | 'strict';
    doubleUnders: 'none' | 'learning' | 'consistent' | 'unbroken_50';
    ropClimbs: 'none' | 'with_legs' | 'legless';
  };

  // Olympic lifting comfort
  olympicLiftingLevel: 'none' | 'learning' | 'competent' | 'proficient';

  // Training preferences
  preferredWODDuration: number;  // minutes
  weeklyTrainingDays: number;
  competitionInterest: boolean;
}
```

### Onboarding Flow

```
components/onboarding/FunctionalFitnessOnboarding.tsx

Steps:
1. Experience & Background
   - Years training
   - Previous sports/training
   - Current fitness level

2. Gym & Equipment
   - Gym type selection
   - Equipment checklist
   - Home gym setup details

3. Benchmark Assessment
   - Known benchmark times
   - Current 1RMs
   - "Don't know" option for each

4. Skills Assessment
   - Gymnastics skill levels
   - Olympic lifting comfort
   - Movement limitations

5. Goals & Preferences
   - Primary focus area
   - Training frequency
   - Competition interest
   - WOD duration preference

6. Summary & Program Recommendation
```

### UI Components

```
components/onboarding/FunctionalFitnessOnboarding.tsx
components/coach/sport-views/FunctionalFitnessAthleteView.tsx
components/athlete/FunctionalFitnessDashboard.tsx
```

### Functional Fitness Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ FUNCTIONAL FITNESS DASHBOARD                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ BENCHMARKS                                                  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │ Fran    │ │ Grace   │ │ Murph   │ │ Helen   │           │
│ │ 4:23    │ │ 2:45    │ │ 42:15   │ │ 11:30   │           │
│ │ ↓ 12s   │ │ ↓ 8s    │ │ ↓ 1:20  │ │ = 0     │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│ 1RM LIFTS                                                   │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Back Squat   [████████████░░░░] 120 kg  (+5 kg)      │  │
│ │ Deadlift     [██████████████░░] 140 kg  (+2.5 kg)    │  │
│ │ Clean & Jerk [████████░░░░░░░░] 85 kg   (nytt!)      │  │
│ │ Snatch       [██████░░░░░░░░░░] 65 kg   (+5 kg)      │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ GYMNASTICS SKILLS                                           │
│ Pull-ups: Butterfly ✅  |  HSPU: Kipping ✅               │
│ Muscle-ups: Strict 🔄   |  T2B: Kipping ✅                 │
│ Double-unders: 50+ ✅   |  Rope: Legless ✅                │
│                                                             │
│ VECKANS WODs                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Mån: AMRAP 20 - Klart ✅                               │ │
│ │ Ons: Strength + MetCon - Idag                          │ │
│ │ Fre: For Time - Kommande                               │ │
│ │ Lör: Partner WOD - Kommande                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Context for Functional Fitness

```typescript
// lib/ai/sport-context-builder.ts

export function buildFunctionalFitnessContext(settings: FunctionalFitnessSettings) {
  return `
FUNCTIONAL FITNESS PROFIL:
- Erfarenhet: ${settings.experienceLevel} (${settings.yearsTraining} år)
- Fokus: ${settings.primaryFocus}
- Gymtyp: ${settings.gymType}

BENCHMARKS:
- Fran: ${settings.benchmarks.fran ? formatTime(settings.benchmarks.fran) : 'Ej testad'}
- Grace: ${settings.benchmarks.grace ? formatTime(settings.benchmarks.grace) : 'Ej testad'}
- Murph: ${settings.benchmarks.murph ? formatTime(settings.benchmarks.murph) : 'Ej testad'}

STYRKA (1RM):
- Back Squat: ${settings.benchmarks.backSquat1RM || 'Ej testad'} kg
- Deadlift: ${settings.benchmarks.deadlift1RM || 'Ej testad'} kg
- Clean & Jerk: ${settings.benchmarks.cleanAndJerk1RM || 'Ej testad'} kg
- Snatch: ${settings.benchmarks.snatch1RM || 'Ej testad'} kg

GYMNASTICS:
- Pull-ups: ${settings.gymnasticsSkills.pullUps}
- HSPU: ${settings.gymnasticsSkills.handstandPushUps}
- Muscle-ups: ${settings.gymnasticsSkills.pullUps === 'muscle_up' ? 'Ja' : 'Nej'}
- Double-unders: ${settings.gymnasticsSkills.doubleUnders}

OLYMPISKA LYFT: ${settings.olympicLiftingLevel}
  `;
}
```

---

## Part 3: Habit Formation System

### Database Schema

```prisma
model Habit {
  id          String    @id @default(cuid())
  clientId    String
  client      Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)

  name        String    // "Drick 2L vatten"
  category    HabitCategory
  frequency   HabitFrequency
  targetDays  Int[]?    // [1,2,3,4,5] for weekdays only (1=Mon)

  // Trigger-Routine-Reward
  trigger     String?   // "Efter frukost"
  routine     String?   // "Fyll vattenflaska"
  reward      String?   // "Kryssa av i appen"

  // Tracking
  currentStreak   Int   @default(0)
  longestStreak   Int   @default(0)
  totalCompletions Int  @default(0)

  // Status
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  archivedAt  DateTime?

  logs        HabitLog[]

  @@index([clientId, isActive])
}

model HabitLog {
  id          String   @id @default(cuid())
  habitId     String
  habit       Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)

  date        DateTime @db.Date
  completed   Boolean
  note        String?  // Optional reflection

  createdAt   DateTime @default(now())

  @@unique([habitId, date])
}

enum HabitCategory {
  NUTRITION     // Drink water, eat protein
  SLEEP         // Bedtime routine, wake time
  MOVEMENT      // Daily walks, stretching
  MINDFULNESS   // Meditation, journaling
  TRAINING      // Gym attendance
  RECOVERY      // Foam rolling, ice bath
}

enum HabitFrequency {
  DAILY
  WEEKDAYS
  SPECIFIC_DAYS
  X_TIMES_WEEK
}
```

### UI Components

```
components/athlete/habits/
├── HabitTracker.tsx          # Main habits dashboard
├── HabitCard.tsx             # Individual habit with today's status
├── HabitCalendar.tsx         # Month view with completion
├── AddHabitModal.tsx         # Create new habit
├── HabitInsights.tsx         # AI analysis of habit patterns
└── HabitReminder.tsx         # Notification component
```

### Habit Tracker UI

```
┌─────────────────────────────────────────────────────────────┐
│ DAGLIGA VANOR                           Streak: 12 dagar 🔥│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ IDAG                                    4 av 6 klara        │
│                                                             │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ☑️ Drick 2L vatten                    ████████████ 12d │  │
│ │ ☑️ 10 min morgonsträck               ████████░░░░  8d │  │
│ │ ☑️ Protein till frukost               ██████████░░ 10d │  │
│ │ ☑️ 7h sömn                            ████████████ 12d │  │
│ │ ☐ Kvällspromenad                      ████████░░░░  8d │  │
│ │ ☐ Ingen skärm efter 22                ██████░░░░░░  6d │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ JANUARI                                                      │
│ M  T  O  T  F  L  S                                        │
│ 🟢 🟢 🟢 🟢 🟢 🟡 🟢                                        │
│ 🟢 🟢 🟢 🟡 🟢 🟢 🟢                                        │
│ 🟢 🟢 ⭕ ⭕ ⭕ ⭕ ⭕                                        │
│                                                             │
│ [+ Lägg till vana]                                          │
│                                                             │
│ 🤖 AI INSIKT:                                              │
│ "Dina vanor faller på torsdagar - kanske planera            │
│  enklare kvällsrutiner den dagen?"                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 4: Body Composition Intelligence

### Enhanced Analysis

```typescript
// lib/ai/body-composition-analyzer.ts

interface BodyCompAnalysis {
  trend: 'losing_fat' | 'gaining_muscle' | 'recomp' | 'maintaining' | 'concerning';
  weeklyFatChange: number;
  weeklyMuscleChange: number;
  narrative: string;
  recommendations: string[];
  warnings?: string[];
}

export async function analyzeBodyComposition(
  clientId: string,
  recentMeasurements: BodyComposition[]
): Promise<BodyCompAnalysis> {
  // Calculate trends
  // Detect concerning patterns
  // Generate narrative
  // Provide recommendations
}
```

### UI Components

```
components/athlete/body-composition/
├── BodyCompDashboard.tsx     # Enhanced dashboard
├── TrendAnalysis.tsx         # AI-powered trend insights
├── ProgressPhotos.tsx        # Optional photo tracking
├── GoalProjection.tsx        # "At this rate..."
└── WeeklyCheckIn.tsx         # Weekly measurement prompt
```

### Body Composition Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ KROPPSSAMMANSÄTTNING                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ NUVARANDE                                                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │ Vikt    │ │ Fett    │ │ Muskel  │ │ Vatten  │           │
│ │ 82.5 kg │ │ 18.2%   │ │ 38.1 kg │ │ 55.2%   │           │
│ │ ↓ 0.8   │ │ ↓ 0.4%  │ │ ↑ 0.2   │ │ ↑ 0.3%  │           │
│ │ denna v │ │ denna v │ │ denna v │ │ denna v │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│ 12-VECKORS TREND                                            │
│ [Interactive chart showing weight, fat%, muscle kg]         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 AI ANALYS                                            │ │
│ │                                                         │ │
│ │ Utmärkt progress! Du tappar fett (0.4%/vecka) medan    │ │
│ │ du behåller muskelmassa. Detta är idealisk recomp.     │ │
│ │                                                         │ │
│ │ Vid nuvarande takt:                                     │ │
│ │ • 15% kroppsfett: ~8 veckor                            │ │
│ │ • Målvikt 78 kg: ~6 veckor                             │ │
│ │                                                         │ │
│ │ Rekommendation: Fortsätt som nu. Öka inte              │ │
│ │ kaloriunderskottet - du tappar optimalt.               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Logga ny mätning] [Se historik] [Exportera data]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 5: Nutrition Enhancement

### Enhanced Daily Nutrition Card

```
components/athlete/nutrition/
├── DailyNutritionCard.tsx    # Workout-aware nutrition
├── MealTimingGuide.tsx       # When to eat based on training
├── QuickMealLog.tsx          # Simple meal logging
├── NutritionScore.tsx        # Daily/weekly score
└── DeficitSurplusTracker.tsx # For weight goals
```

### Daily Nutrition UI

```
┌─────────────────────────────────────────────────────────────┐
│ NUTRITION IDAG                      Träning: 17:00 Styrka  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ MÅL IDAG (träningsdag)                                     │
│ Kalorier: 2,400 kcal  |  Protein: 160g                     │
│ Kolhydrater: 280g     |  Fett: 80g                         │
│                                                             │
│ LOGGAT                                                      │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 🌅 Frukost (08:00)                          520 kcal  │  │
│ │    Havregrynsgröt, ägg, banan                          │  │
│ │                                                         │  │
│ │ 🌞 Lunch (12:00)                            680 kcal  │  │
│ │    Kycklingbowl med ris                                │  │
│ │                                                         │  │
│ │ 🍌 Mellanmål (15:00)                        280 kcal  │  │
│ │    Kvarg, nötter                                       │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ KVAR: 920 kcal  |  Protein kvar: 65g                       │
│                                                             │
│ 🤖 NÄSTA MÅLTID (pre-workout):                             │
│ "Ät en lätt måltid ~16:00 med 40-50g kolhydrater          │
│  och 20g protein. Undvik fett nära träningen."            │
│                                                             │
│ [+ Logga måltid]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Timeline

### Sprint 1-2: Goal-Specific AI Personas
- [ ] Weight loss persona and prompts
- [ ] Muscle building persona and prompts
- [ ] General fitness persona and prompts
- [ ] Context injection based on goal

### Sprint 3-4: FUNCTIONAL_FITNESS Sport Type
- [ ] Database schema update
- [ ] Settings interface
- [ ] Onboarding flow (6 steps)
- [ ] Sport-specific dashboard
- [ ] AI context builder
- [ ] Benchmark tracking UI

### Sprint 5-6: Habit Formation System
- [ ] Habit database models
- [ ] Habit CRUD API
- [ ] Habit tracker UI
- [ ] Streak tracking
- [ ] AI habit insights
- [ ] Reminder system

### Sprint 7-8: Body Composition & Nutrition
- [ ] Enhanced body comp analysis
- [ ] AI trend narratives
- [ ] Goal projection
- [ ] Enhanced nutrition card
- [ ] Meal timing intelligence
- [ ] Quick meal logging

---

## Dependencies

| Feature | Depends On |
|---------|------------|
| Goal Personas | AI Core (Plan A) |
| Functional Fitness | Existing HybridWorkout system |
| Habits | Streak system (Plan A) |
| Body Comp AI | Existing BodyComposition model |
| Nutrition | Existing NutritionGoal model |

---

## Files to Create

```
lib/ai/personas/
├── weight-loss-persona.ts
├── muscle-building-persona.ts
├── general-fitness-persona.ts
└── functional-fitness-persona.ts

components/onboarding/
└── FunctionalFitnessOnboarding.tsx

components/coach/sport-views/
└── FunctionalFitnessAthleteView.tsx

components/athlete/
├── FunctionalFitnessDashboard.tsx
└── habits/
    ├── HabitTracker.tsx
    ├── HabitCard.tsx
    ├── HabitCalendar.tsx
    ├── AddHabitModal.tsx
    └── HabitInsights.tsx

components/athlete/body-composition/
├── TrendAnalysis.tsx
├── GoalProjection.tsx
└── WeeklyCheckIn.tsx

components/athlete/nutrition/
├── DailyNutritionCard.tsx
├── MealTimingGuide.tsx
└── QuickMealLog.tsx

app/api/habits/
├── route.ts
└── [id]/
    ├── route.ts
    └── log/route.ts

lib/ai/
├── body-composition-analyzer.ts
└── sport-context-builder.ts (update)
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Habit Completion | 70% daily | Habit logs |
| Body Comp Logging | Weekly | Measurement frequency |
| Weight Goal Progress | 0.5-1kg/week | Weight trends |
| Functional Fitness Adoption | 20% new signups | Sport profile data |
| Nutrition Logging | 50% of training days | Meal logs |
