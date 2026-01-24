# Physiotherapist (PHYSIO) System Documentation

## Overview

The PHYSIO role system enables comprehensive injury management, rehabilitation programs, treatment logging, and care team communication within the platform.

## Core Features

### 1. Physio Assignments

Physios can be assigned to athletes at multiple scopes:

- **Individual** - Direct assignment to a specific athlete (`clientId`)
- **Team** - All athletes in a team (`teamId`)
- **Organization** - All teams in an organization (`organizationId`)
- **Business** - All athletes in a business (`businessId`)
- **Location** - All athletes at a specific location (`locationId`)

Assignment roles:
- `PRIMARY` - Main physio responsible for the athlete
- `SECONDARY` - Backup/support physio
- `CONSULTANT` - Advisory role with limited access

### 2. Rehab Programs

Structured rehabilitation programs with:

- **Phases**: ACUTE → SUBACUTE → REMODELING → FUNCTIONAL → RETURN_TO_SPORT
- **Exercises**: Prescribed exercises with sets, reps, frequency
- **Milestones**: Achievement tracking with criteria
- **Progress Logs**: Athlete self-reporting with pain tracking
- **Pain Thresholds**: Acceptable pain during/after exercise

### 3. Training Restrictions

Restrictions that integrate with the training system:

**Restriction Types:**
- `NO_RUNNING` - No running activities
- `NO_JUMPING` - No plyometric exercises
- `NO_IMPACT` - No high-impact activities
- `NO_UPPER_BODY` - No upper body exercises
- `NO_LOWER_BODY` - No lower body exercises
- `REDUCED_VOLUME` - Reduced training volume
- `REDUCED_INTENSITY` - Capped intensity zones
- `MODIFIED_ONLY` - Only modified exercises
- `SPECIFIC_EXERCISES` - Specific exercises blocked
- `CUSTOM` - Custom restriction

**Severity Levels:**
- `MILD` - Minor limitation
- `MODERATE` - Moderate limitation
- `SEVERE` - Significant limitation
- `COMPLETE` - No activity in affected area

### 4. Treatment Sessions

SOAP-format treatment documentation:

- **Subjective** - Patient's description
- **Objective** - Clinical findings
- **Assessment** - Diagnosis/evaluation
- **Plan** - Treatment plan

Treatment types include manual therapy, dry needling, exercise therapy, and more.

### 5. Care Team Communication

Thread-based messaging between:
- Physiotherapist
- Coach
- Athlete

Features:
- Priority levels (URGENT, HIGH, MEDIUM, LOW)
- Thread status tracking
- File/image attachments
- @mentions

### 6. Movement Screenings

Standardized movement assessments:
- FMS (Functional Movement Screen)
- SFMA (Selective Functional Movement Assessment)
- Custom screenings

### 7. Acute Injury Reports

Quick injury reporting for match-day incidents:
- Mechanism of injury
- Immediate assessment
- Urgency levels
- Auto-restriction creation

## Database Models

### Core Models

```prisma
model PhysioAssignment {
  id              String   @id @default(cuid())
  physioUserId    String
  clientId        String?
  teamId          String?
  organizationId  String?
  businessId      String?
  locationId      String?
  role            String   @default("PRIMARY")
  active          Boolean  @default(true)
  canModifyPrograms     Boolean @default(true)
  canCreateRestrictions Boolean @default(true)
  canViewFullHistory    Boolean @default(true)
}

model RehabProgram {
  id                   String   @id @default(cuid())
  name                 String
  description          String?
  clientId             String
  physioUserId         String
  currentPhase         String   @default("ACUTE")
  status               String   @default("ACTIVE")
  shortTermGoals       String[]
  longTermGoals        String[]
  contraindications    String[]
  acceptablePainDuring Int      @default(3)
  acceptablePainAfter  Int      @default(4)
}

model TrainingRestriction {
  id                    String    @id @default(cuid())
  clientId              String
  type                  String
  severity              String
  bodyParts             String[]
  affectedWorkoutTypes  String[]
  affectedExerciseIds   String[]
  volumeReductionPercent Int?
  maxIntensityZone      Int?
  description           String?
  reason                String?
  startDate             DateTime  @default(now())
  endDate               DateTime?
  isActive              Boolean   @default(true)
  source                String    @default("PHYSIO_MANUAL")
}
```

## API Endpoints

### Physio Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/physio/assignments` | Create assignment |
| GET | `/api/physio/assignments` | List assignments |
| GET | `/api/physio/assignments/[id]` | Get assignment |
| PATCH | `/api/physio/assignments/[id]` | Update assignment |
| DELETE | `/api/physio/assignments/[id]` | Delete assignment |

### Rehab Programs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/physio/rehab-programs` | Create program |
| GET | `/api/physio/rehab-programs` | List programs |
| GET | `/api/physio/rehab-programs/[id]` | Get program details |
| PATCH | `/api/physio/rehab-programs/[id]` | Update program |
| POST | `/api/physio/rehab-programs/[id]/exercises` | Add exercise |
| POST | `/api/physio/rehab-programs/[id]/milestones` | Add milestone |
| GET | `/api/physio/rehab-programs/[id]/progress` | Get progress logs |
| POST | `/api/physio/rehab-programs/[id]/progress` | Log progress |

### Training Restrictions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/physio/restrictions` | Create restriction |
| GET | `/api/physio/restrictions` | List restrictions |
| GET | `/api/restrictions/athlete/[clientId]` | Get athlete restrictions |
| PATCH | `/api/physio/restrictions/[id]` | Update restriction |
| DELETE | `/api/physio/restrictions/[id]` | Delete restriction |

### Treatment Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/physio/treatments` | Create session |
| GET | `/api/physio/treatments` | List sessions |
| GET | `/api/physio/treatments/[id]` | Get session details |
| PATCH | `/api/physio/treatments/[id]` | Update session |

### Care Team Communication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/care-team/threads` | Create thread |
| GET | `/api/care-team/threads` | List threads |
| GET | `/api/care-team/threads/[id]` | Get thread |
| PATCH | `/api/care-team/threads/[id]` | Update thread |
| POST | `/api/care-team/threads/[id]/messages` | Send message |

### Acute Injury Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/injury/acute-report` | Create report |
| GET | `/api/injury/acute-report` | List reports |
| PATCH | `/api/injury/acute-report/[id]` | Update report |
| POST | `/api/injury/acute-report/[id]/assess` | Create assessment |

## Integration Points

### AI WOD Generation

The AI WOD system respects active restrictions:

```typescript
// Fetch athlete restrictions before generating WOD
const restrictions = await fetch(`/api/restrictions/athlete/${clientId}`)

// The AI prompt includes restriction context
const prompt = `
  Generate a workout that respects these restrictions:
  - Restricted body parts: ${restrictions.restrictedBodyParts}
  - Restricted exercises: ${restrictions.restrictedExerciseIds}
  - Max intensity zone: ${restrictions.maxIntensityZone}
  - Volume reduction: ${restrictions.volumeReductionPercent}%
`
```

### Injury Cascade System

When injuries are detected via daily check-ins:

1. Injury assessment is created
2. Delaware Pain Rules are evaluated
3. Training restrictions are auto-created
4. Coach is notified
5. Care team thread is created

### Notification System

Notifications are triggered for:

- Pain exceeding thresholds
- Athlete requesting physio contact
- New restrictions created
- Milestone achievements
- Urgent care team messages

## Athlete-Facing Features

### Rehab Dashboard (`/athlete/rehab`)

- View active rehab programs
- See today's exercises
- Log exercise completion
- Track pain levels
- View milestone progress

### Active Restrictions Card

Displayed on athlete dashboard when restrictions are active:
- Shows restriction type and severity
- Displays affected body parts
- Shows end date
- Contact physio button

### Progress Logging

Athletes can log:
- Exercises completed
- Pain during/after (0-10)
- Difficulty level (TOO_EASY, APPROPRIATE, TOO_HARD)
- Overall feeling (GOOD, NEUTRAL, BAD)
- Notes
- Request physio contact

## Routes

### Legacy Routes (Non-Business)

- `/physio/dashboard` - Physio dashboard
- `/physio/athletes` - Athlete list
- `/physio/treatments` - Treatment sessions
- `/physio/rehab-programs` - Rehab programs
- `/physio/restrictions` - Restrictions management
- `/physio/messages` - Care team inbox
- `/athlete/rehab` - Athlete rehab overview
- `/athlete/rehab/[id]` - Athlete program detail

### Business-Scoped Routes

- `/[businessSlug]/physio/dashboard` - Business physio dashboard
- `/[businessSlug]/physio/athletes` - Business athletes
- `/[businessSlug]/athlete/rehab` - Business athlete rehab

## Authorization

### Physio Access Checks

```typescript
// Check if physio can access athlete
const hasAccess = await canAccessAthleteAsPhysio(userId, clientId)

// This checks:
// 1. Direct client assignment
// 2. Team assignment (if client belongs to assigned team)
// 3. Organization assignment
// 4. Business assignment
// 5. Location assignment
```

### Permission Flags

- `canModifyPrograms` - Can modify training programs
- `canCreateRestrictions` - Can create training restrictions
- `canViewFullHistory` - Can view full injury/treatment history

## Best Practices

### Creating Rehab Programs

1. Start in ACUTE phase
2. Set appropriate pain thresholds
3. Add exercises with clear progression criteria
4. Define milestones for phase transitions
5. Create care team thread for communication

### Managing Restrictions

1. Be specific with body parts and exercise types
2. Set realistic end dates
3. Use appropriate severity levels
4. Document reason clearly
5. Notify coach of new restrictions

### Progress Monitoring

1. Review progress logs regularly
2. Watch for pain threshold violations
3. Update phase when milestones achieved
4. Adjust exercises based on feedback
5. Communicate changes via care team

## Testing

Run physio system tests:

```bash
npm test -- --grep "physio"
```

Test files:
- `__tests__/api/physio/assignments.test.ts`
- `__tests__/api/physio/rehab-programs.test.ts`
- `__tests__/api/physio/restrictions.test.ts`
