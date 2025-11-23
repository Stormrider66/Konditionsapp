# Database Documentation

This directory contains visual documentation of the database schema.

---

## 📊 Entity-Relationship Diagram

**File**: `erd.svg` (1.8MB)

**What it shows**:
- All 40+ Prisma models (database tables)
- Relationships between models (one-to-many, one-to-one, many-to-many)
- Foreign key constraints
- Field types and enums
- Cascade delete rules

**How to view**:
1. Open `erd.svg` in any modern browser or SVG viewer
2. Use Ctrl/Cmd + Plus/Minus to zoom
3. **Tip**: The diagram is large - use browser search (Ctrl/Cmd + F) to find specific models

**Auto-generation**:
This diagram is automatically generated from `prisma/schema.prisma` using `prisma-erd-generator`.

To regenerate after schema changes:
```bash
npx prisma generate
```

The ERD will be updated at `docs/database/erd.svg`

---

## 🗺️ Simplified Database Map

For a quicker overview, here's a simplified view of the core systems:

### Core Testing System
```
User (COACH role)
  ├─→ Client (1:many)
  │     ├─→ Test (1:many)
  │     │     ├─→ TestStage (1:many, cascade delete)
  │     │     ├─→ Report (1:one, cascade delete)
  │     │     └─→ ThresholdCalculation (1:many)
  │     ├─→ AthleteAccount (1:one)
  │     │     └─→ User (ATHLETE role)
  │     └─→ Race (1:many)
  └─→ Team (1:many)
```

### Training Programs
```
Client
  └─→ TrainingProgram (1:many)
        ├─→ TrainingWeek (1:many, cascade delete)
        │     └─→ TrainingDay (1:many)
        │           └─→ Workout (1:many)
        │                 ├─→ WorkoutSegment (1:many)
        │                 └─→ WorkoutLog (1:many)
        └─→ RaceCalendar (1:one)
              └─→ Race (1:many)
```

### Elite Training Engine
```
Client
  ├─→ AthleteProfile (1:one)
  ├─→ DailyCheckIn (1:many)
  ├─→ DailyMetrics (1:many)
  ├─→ TrainingLoad (1:many)
  ├─→ FieldTest (1:many)
  ├─→ SelfReportedLactate (1:many)
  ├─→ InjuryAssessment (1:many)
  └─→ CrossTrainingSession (1:many)
```

### Strength Training
```
Exercise (library, 84 exercises)
  ├─→ easierExercise (self-reference)
  └─→ harderExercise (self-reference)

Client
  └─→ ProgressionTracking (1:many per exercise)
        └─→ OneRepMaxHistory (1:many)
```

### Messaging
```
User (COACH) ←──→ Message ←──→ User (ATHLETE)
                     │
                     └─→ Client (context)
```

### Billing
```
User
  └─→ Subscription (1:one)
```

---

## 🔑 Key Relationships

### Cascade Deletes

**When a Test is deleted**:
- ✅ All TestStages are deleted
- ✅ Associated Report is deleted
- ✅ ThresholdCalculations are deleted

**When a TrainingProgram is deleted**:
- ✅ All TrainingWeeks are deleted
- ✅ All TrainingDays are deleted (via weeks)
- ✅ All Workouts are deleted (via days)
- ✅ WorkoutSegments remain or are deleted based on configuration

**When a Client is deleted**:
- ✅ All Tests are deleted (cascade to stages, reports)
- ✅ All TrainingPrograms are deleted (cascade to weeks, days, workouts)
- ✅ AthleteAccount is deleted
- ✅ All monitoring data deleted (DailyCheckIn, DailyMetrics, etc.)
- ✅ ProgressionTracking and OneRepMaxHistory deleted

### One-to-One Relationships

- Client ↔ AthleteAccount (1:1)
- Client ↔ AthleteProfile (1:1)
- Test ↔ Report (1:1)
- User ↔ Subscription (1:1)
- TrainingProgram ↔ RaceCalendar (1:1)

### Many-to-Many Relationships

- Team ↔ Client (many:many via TeamMembership)
- Exercise ↔ Exercise (self-reference for progression paths)

---

## 📋 Model Count by Feature

| Feature | Models | Description |
|---------|--------|-------------|
| **Core Testing** | 7 | User, Client, Team, Test, TestStage, Report, TestTemplate |
| **Training Programs** | 10 | TrainingProgram, TrainingWeek, TrainingDay, Workout, WorkoutSegment, WorkoutLog, Exercise, Message, AthleteAccount, Subscription |
| **Elite Training Engine** | 15 | AthleteProfile, DailyCheckIn, DailyMetrics, TrainingLoad, ThresholdCalculation, FieldTest, SelfReportedLactate, InjuryAssessment, CrossTrainingSession, StrengthTrainingSession, RaceCalendar, Race, WorkoutModification, TrainingProgramEngine, FieldTestSchedule |
| **Strength Training** | 3 | Exercise, ProgressionTracking, OneRepMaxHistory |
| **Communication** | 1 | Message |
| **Billing** | 1 | Subscription |
| **Total** | **40+** | Complete database schema |

---

## 🎯 Common Queries Reference

### Get all tests for a client with stages
```prisma
client.findUnique({
  where: { id: clientId },
  include: {
    tests: {
      include: {
        testStages: {
          orderBy: { sequence: 'asc' }
        },
        thresholdCalculations: true
      }
    }
  }
})
```

### Get training program with all workouts
```prisma
trainingProgram.findUnique({
  where: { id: programId },
  include: {
    weeks: {
      include: {
        days: {
          include: {
            workouts: {
              include: {
                segments: true
              }
            }
          }
        }
      }
    }
  }
})
```

### Get athlete monitoring data
```prisma
client.findUnique({
  where: { id: clientId },
  include: {
    athleteProfile: true,
    dailyCheckIns: {
      orderBy: { date: 'desc' },
      take: 30
    },
    trainingLoads: {
      orderBy: { date: 'desc' },
      take: 30
    }
  }
})
```

---

## 🔄 Schema Updates

**When you modify the Prisma schema** (`prisma/schema.prisma`):

1. Create migration:
   ```bash
   npx prisma migrate dev --name describe_your_changes
   ```

2. Regenerate Prisma client and ERD:
   ```bash
   npx prisma generate
   ```

3. The ERD will automatically update at `docs/database/erd.svg`

---

## 📚 Related Documentation

- **Full schema**: `prisma/schema.prisma`
- **Developer guide**: `/CLAUDE.md` (Database Schema section)
- **Data specifications**: `/docs/specifications/data_model.md`
- **Migration history**: `prisma/migrations/`

---

**For questions about specific models or relationships**, see the full ERD (`erd.svg`) or `prisma/schema.prisma`.
