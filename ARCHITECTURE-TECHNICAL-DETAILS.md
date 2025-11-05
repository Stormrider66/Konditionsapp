# KONDITIONSTEST-APP: TECHNICAL IMPLEMENTATION DETAILS

## DATABASE SCHEMA RELATIONSHIPS

### Entity Relationship Overview
```
User (1) ─── (many) Client ─── (many) Test ─── (many) TestStage
  ├─ (1) AthleteAccount (1) ─── Client
  ├─ (many) TrainingProgram ─── (many) TrainingWeek
  ├─ (many) Team ─── (many) Client
  └─ (1) Subscription

TrainingProgram ─── TrainingWeek ─── TrainingDay ─── Workout ─── (many) WorkoutSegment
                                                        └── (many) WorkoutLog
                                                        └── (many) Message

WorkoutSegment ─── (optional) Exercise
Workout ─── (optional) Test (from which program was generated)
Message ─── (optional) Workout
```

### Field Statistics by Model

**User** (11 fields)
- id (UUID), email (unique), name, role, language
- Timestamps: createdAt, updatedAt
- Relations: 20 total (tests, clients, teams, programs, exercises, etc.)

**Client** (12 fields)
- id (UUID), userId (FK), teamId (FK optional), name, email, phone
- Demographics: gender, birthDate, height (cm), weight (kg)
- notes (optional)
- Timestamps: createdAt, updatedAt

**Test** (15 fields)
- id (UUID), clientId (FK), userId (FK), testDate
- testType (enum), status (enum)
- Location: location, testLeader
- Calculated: maxHR, maxLactate, vo2max
- Thresholds: aerobicThreshold (JSON), anaerobicThreshold (JSON)
- trainingZones (JSON array)
- notes (optional)
- Timestamps: createdAt, updatedAt

**TestStage** (13 fields)
- id (UUID), testId (FK), sequence (order)
- Core: duration, heartRate, lactate, vo2
- Running: speed, incline
- Cycling: power, cadence
- Skiing: pace
- Calculated: economy, wattsPerKg
- Timestamps: createdAt

**TrainingProgram** (11 fields)
- id (UUID), clientId (FK), coachId (FK), testId (FK optional)
- name, description (optional), goalRace (optional), goalDate (optional), goalType (optional)
- startDate, endDate
- Flags: isActive (boolean), isTemplate (boolean), generatedFromTest (boolean)
- Timestamps: createdAt, updatedAt

**TrainingWeek** (8 fields)
- id (UUID), programId (FK)
- weekNumber, startDate, endDate
- phase (enum: BASE, BUILD, PEAK, TAPER, RECOVERY, TRANSITION)
- focus (optional), weeklyVolume (optional)
- notes (optional)

**TrainingDay** (5 fields)
- id (UUID), weekId (FK)
- dayNumber (1=Monday...7=Sunday), date
- notes (optional)

**Workout** (10 fields)
- id (UUID), dayId (FK)
- type (enum: RUNNING, STRENGTH, PLYOMETRIC, CORE, RECOVERY, CYCLING, SKIING, OTHER)
- name, description (optional)
- intensity (enum: RECOVERY, EASY, MODERATE, THRESHOLD, INTERVAL, MAX)
- duration (optional minutes), distance (optional km)
- instructions (optional), coachNotes (optional)
- order (for multiple workouts per day)
- isCustom (boolean)
- Timestamps: createdAt, updatedAt

**WorkoutSegment** (14 fields)
- id (UUID), workoutId (FK), exerciseId (FK optional)
- order (sequence)
- type (string: "warmup", "interval", "cooldown", "exercise", "rest", "work")
- Duration: duration (minutes), distance (km), pace (string)
- Training: zone (1-5), heartRate (string), power (watts)
- Strength: reps, sets, weight, tempo, rest (seconds)
- Description and notes
- Timestamps: createdAt

**WorkoutLog** (16 fields)
- id (UUID), workoutId (FK), athleteId (FK - User)
- completed (boolean), completedAt (optional datetime)
- Actual performance: duration, distance, avgPace, avgHR, maxHR
- Feedback: perceivedEffort (1-10), difficulty (1-5 stars), feeling (string)
- notes, dataFileUrl, stravaUrl
- Coach feedback: coachFeedback, coachViewedAt
- Timestamps: createdAt, updatedAt

**Exercise** (12 fields)
- id (UUID), coachId (FK optional - NULL for system exercises)
- name, category (WorkoutType enum), muscleGroup
- description, instructions, videoUrl, equipment
- difficulty, isPublic (boolean)
- nameSv, nameEn (Swedish/English names)
- Timestamps: createdAt, updatedAt

**AthleteAccount** (5 fields)
- id (UUID), clientId (FK unique), userId (FK unique)
- notificationPrefs (JSON)
- Timestamps: createdAt, updatedAt

**Message** (8 fields)
- id (UUID), senderId (FK), receiverId (FK), workoutId (FK optional)
- subject (optional), content (text)
- isRead (boolean), readAt (optional)
- Timestamps: createdAt

**Subscription** (14 fields)
- id (UUID), userId (FK unique)
- tier (enum: FREE, BASIC, PRO, ENTERPRISE)
- status (enum: ACTIVE, CANCELLED, EXPIRED, TRIAL)
- maxAthletes (0, 5, 50, -1 for unlimited)
- currentAthletes (counter)
- Stripe integration: stripeCustomerId, stripeSubscriptionId, stripePriceId, stripeCurrentPeriodEnd
- Billing: trialEndsAt, cancelAt
- Timestamps: createdAt, updatedAt

---

## KEY IMPLEMENTATION PATTERNS

### Authentication Flow

1. **Client-side**: User enters email/password on `/login` or `/register`
2. **Supabase Auth**: Handles authentication, returns session
3. **Session Persistence**: Middleware checks Supabase session on every request
4. **Role Lookup**: Middleware queries Supabase for user role (from User table)
5. **Route Protection**: Middleware redirects based on role
6. **Server-side Access**: `getCurrentUser()` fetches full user record from Prisma

```typescript
// middleware.ts pattern:
const supabaseUser = await supabase.auth.getUser()
const userData = await supabase.from('User').select('role').eq('email', email).single()
// Route-based redirects: /coach/* → requires COACH role, /athlete/* → requires ATHLETE
```

### Data Fetching Strategy

**Pages use Server Components** by default:
- Direct Prisma queries (no API calls)
- Faster initial load
- Automatic caching via Next.js

```typescript
export default async function Page() {
  const user = await getCurrentUser()
  const data = await prisma.model.findMany({ where: { userId: user.id } })
  return <Component data={data} />
}
```

**Client Components** (marked with 'use client'):
- Forms and interactive UI
- Use `fetch()` to API routes
- React hooks for state

```typescript
'use client'
const response = await fetch('/api/endpoint', { method: 'POST', body: JSON.stringify(data) })
```

### Calculation Pipeline

**Test Entry** → **Calculation Engine** → **Result Storage** → **Report Display**

```
1. Form captures stages (duration, HR, lactate, speed/power)
2. submitTest() calls `performAllCalculations()`
3. Engine returns TestCalculations object
4. Results saved to database as JSON
5. Report queries database and displays results
```

**Calculation Entry Point**:
```typescript
// lib/calculations/index.ts
export function performAllCalculations(test: Test, client: Client): TestCalculations {
  const bmi = calculateBMI(...)
  const thresholds = calculateThresholds(...)
  const zones = calculateZones(...)
  const vo2max = calculateVO2Max(...)
  return { bmi, thresholds, zones, vo2max, ... }
}
```

### Program Generation Pipeline

1. **Form Submission**: Coach selects goal type, duration, experience level, test
2. **API Call**: POST `/api/programs/generate` with parameters
3. **Validation**: Check subscription limits, verify test has zones
4. **Algorithm**: `generateBaseProgram()` creates program structure
5. **Database Save**: Prisma transaction creates Program + Weeks + Days + Workouts
6. **Redirect**: User sees newly created program

```typescript
// generateBaseProgram() returns CreateTrainingProgramDTO
const dto: CreateTrainingProgramDTO = {
  clientId, coachId, testId,
  name: 'Marathon Training - Spring 2025',
  startDate, endDate,
  weeks: [ // Array of TrainingWeekDTOs
    {
      weekNumber: 1,
      phase: 'BASE',
      days: [
        {
          dayNumber: 1, // Monday
          workouts: [
            { type: 'RUNNING', name: 'Easy Run', intensity: 'EASY', ... }
          ]
        }
      ]
    }
  ]
}
```

---

## CRITICAL CODE PATHS

### Creating an Athlete Account

```typescript
// API: POST /api/athlete-accounts
1. Require coach role
2. Check subscription athlete limit
3. Verify coach has access to client
4. Check client doesn't already have account
5. Create Supabase Auth user (ATHLETE role)
6. Create User in Prisma
7. Create AthleteAccount linking
8. Increment subscription.currentAthletes
9. Return temporary password
```

### Logging a Workout

```typescript
// API: POST /api/workouts/[id]/logs
1. Require athlete role (user.role === 'ATHLETE')
2. Verify workout exists
3. Create WorkoutLog with athlete data:
   - duration, distance, avgPace, avgHR, maxHR
   - perceivedEffort (1-10), difficulty (1-5)
   - notes, stravaUrl, dataFileUrl
4. Return logged workout
```

### Generating a Test Report

```typescript
// Server Component: app/tests/[id]/page.tsx
1. Fetch test with testStages and client
2. Check calculations are present
3. Parse JSON thresholds and zones
4. Render ReportTemplate with data
5. Include buttons: PDF Export, Email, Print, Home
```

---

## PERFORMANCE CONSIDERATIONS

### Database Indexes

```prisma
User:
  @@index([email])
  @@index([role])

Test:
  @@index([clientId])
  @@index([userId])
  @@index([testDate])
  @@index([location])

TrainingProgram:
  @@index([clientId])
  @@index([coachId])
  @@index([startDate, endDate])
  @@index([isActive])

WorkoutLog:
  @@index([workoutId])
  @@index([athleteId])
  @@index([completedAt])
  @@index([completed])
```

### Potential N+1 Queries

**Risk Areas**:
1. Athlete dashboard loading all programs and workouts for each program
2. Program detail page loading all weeks, days, workouts, segments
3. Client detail page loading all tests and their stages

**Solution**: Use Prisma `include()` with eager loading:
```typescript
const programs = await prisma.trainingProgram.findMany({
  include: {
    weeks: {
      include: {
        days: {
          include: {
            workouts: {
              include: {
                logs: true,
                segments: { include: { exercise: true } }
              }
            }
          }
        }
      }
    }
  }
})
```

### Caching Strategy

- **Static** (test reports): Revalidate only when test data changes
- **Dynamic** (athlete dashboard): Revalidate every request (live data)
- **API routes**: Cache headers set to no-cache (always fresh)

---

## VALIDATION SCHEMAS (Zod)

### Existing Schemas
```typescript
// lib/validations/schemas.ts
export const clientSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.date(),
  height: z.number().min(100).max(250),
  weight: z.number().min(30).max(300),
  notes: z.string().optional(),
})

export const createTestSchema = z.object({
  clientId: z.string().uuid(),
  testDate: z.date(),
  testType: z.enum(['RUNNING', 'CYCLING', 'SKIING']),
  location: z.string().optional(),
  testLeader: z.string().optional(),
  stages: z.array(/* TestStageSchema */),
  notes: z.string().optional(),
})
```

### Missing Schemas (Should be Added)
```typescript
export const programGenerationSchema = z.object({
  clientId: z.string().uuid(),
  testId: z.string().uuid(),
  goalType: z.enum([...]),
  durationWeeks: z.number().min(4).max(52),
  trainingDaysPerWeek: z.number().min(2).max(7),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  // Validation: endDate must be > startDate
  // Validation: durationWeeks must match date range
})

export const workoutLogSchema = z.object({
  completed: z.boolean(),
  duration: z.number().optional(),
  distance: z.number().optional(),
  perceivedEffort: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
})

export const messageSchema = z.object({
  receiverId: z.string().uuid(),
  subject: z.string().optional(),
  content: z.string().min(1),
  workoutId: z.string().uuid().optional(),
})
```

---

## TYPES THAT NEED UPDATES

### Missing DTOs
```typescript
// Missing from types/index.ts
export interface CreateTrainingProgramDTO {
  clientId: string
  coachId: string
  testId?: string
  name: string
  goalType: string
  startDate: Date
  endDate: Date
  weeks: CreateTrainingWeekDTO[]
}

export interface CreateTrainingWeekDTO {
  weekNumber: number
  phase: PeriodPhase
  startDate: Date
  endDate: Date
  focus?: string
  weeklyVolume?: number
  days: CreateTrainingDayDTO[]
}

export interface CreateTrainingDayDTO {
  dayNumber: number
  date: Date
  workouts: CreateWorkoutDTO[]
}

export interface CreateWorkoutDTO {
  type: WorkoutType
  name: string
  intensity: WorkoutIntensity
  duration?: number
  instructions?: string
  segments: CreateWorkoutSegmentDTO[]
}

export interface CreateWorkoutSegmentDTO {
  order: number
  type: string
  duration?: number
  pace?: string
  zone?: number
}

export interface WorkoutLogDTO {
  completed: boolean
  completedAt?: Date
  duration?: number
  distance?: number
  avgPace?: string
  avgHR?: number
  maxHR?: number
  perceivedEffort?: number
  difficulty?: number
  feeling?: string
  notes?: string
  stravaUrl?: string
}

export interface MessageDTO {
  receiverId: string
  subject?: string
  content: string
  workoutId?: string
}

export interface CreateAthleteAccountDTO {
  clientId: string
  email: string
  temporaryPassword?: string
  notificationPrefs?: {
    email: boolean
    push: boolean
    workoutReminders: boolean
  }
}
```

---

## API RESPONSE PATTERNS

### Success Response Format
```typescript
{
  success: true,
  data: { /* entity */ },
  message?: 'Operation successful'
}
```

### Error Response Format
```typescript
{
  success: false,
  error: 'Error message',
  details?: [ /* validation errors */ ],
  statusCode: 400
}
```

### Status Codes Used
- `200`: GET success
- `201`: POST success (resource created)
- `400`: Bad request (validation error)
- `401`: Unauthorized (no auth)
- `403`: Forbidden (wrong role or access denied)
- `404`: Not found
- `500`: Server error

---

## MIGRATION STATUS

### Completed Migrations
1. Initial schema creation
2. User and Client tables
3. Test and TestStage tables
4. Report table
5. Supabase Auth integration
6. Training Program models (Oct 29, 2025)
7. Exercise library (Oct 29, 2025)

### Pending Migrations
- Possible schema adjustments based on testing
- Stripe integration fields (already in schema)
- Performance optimizations

---

## COMMON BUGS & WORKAROUNDS

### Known Issues
1. **dayOfWeek in TrainingDay**
   - Schema uses `dayNumber` (1-7)
   - Some components may reference `dayOfWeek` (wrong field name)
   - **Fix**: Ensure consistent use of `dayNumber`

2. **Message Model Not Implemented**
   - Schema exists but no API endpoints
   - Components trying to use it will fail
   - **Fix**: Create `/api/messages` endpoint

3. **Program Generation Not Tested**
   - `buildWeek()` function exists but untested
   - May not save all segments correctly
   - **Fix**: Add integration tests

4. **Athlete Dashboard Queries**
   - `dayOfWeek` calculation may be wrong
   - RecentActivity filter logic unclear
   - **Fix**: Test with sample data

### Workarounds
- Use Prisma Studio to manually verify data
- Test athlete portal with `/dev/role-info` helper page
- Use mock data in `lib/db-mock.ts` for development

---

## TESTING CHECKLIST

### Unit Tests Needed
- [ ] `performAllCalculations()` with various test types
- [ ] Threshold interpolation with edge cases
- [ ] Zone calculations for different sports
- [ ] Program generation algorithm
- [ ] Athlete limit checks

### Integration Tests Needed
- [ ] Full test creation → calculation → report flow
- [ ] Program generation from test → database persistence
- [ ] Athlete account creation workflow
- [ ] Workout logging workflow
- [ ] Access control for different roles

### E2E Tests Needed
- [ ] Coach: Create client → Create test → Generate program
- [ ] Athlete: Login → View program → Log workout
- [ ] Coach: View athlete progress → Give feedback
- [ ] Subscription: Create user → Check athlete limit

### Manual Testing Checklist
- [ ] Test all three test types (running, cycling, skiing)
- [ ] Verify threshold calculations match expected values
- [ ] Check program generation with different parameters
- [ ] Test athlete dashboard with multiple programs
- [ ] Verify role-based access control
- [ ] Test mobile responsiveness
- [ ] Check PDF export quality
- [ ] Verify email delivery

---

## DEPLOYMENT CHECKLIST

Before production deployment:

### Security
- [ ] All API routes check authentication
- [ ] All API routes check authorization
- [ ] Database queries use proper parameterization
- [ ] No secrets in environment files
- [ ] CORS headers configured correctly
- [ ] Rate limiting on sensitive endpoints

### Performance
- [ ] Database indexes created
- [ ] N+1 queries eliminated
- [ ] API response times < 500ms
- [ ] PDF generation < 10s
- [ ] No console.logs left in production code

### Data Integrity
- [ ] Migrations tested on staging
- [ ] Backup strategy documented
- [ ] Disaster recovery tested
- [ ] Data validation on all inputs

### Monitoring
- [ ] Error logging configured
- [ ] Performance monitoring setup
- [ ] User analytics enabled
- [ ] Health check endpoint configured

### Documentation
- [ ] API documentation complete
- [ ] Database schema documented
- [ ] Deployment instructions written
- [ ] Runbook for common issues
- [ ] Architecture decisions documented

---

## QUICK REFERENCE COMMANDS

```bash
# Development
npm run dev                    # Start dev server
npx prisma studio             # Open Prisma Studio
npx prisma generate           # Regenerate Prisma client
npx prisma db push            # Push schema changes
npx prisma migrate dev --name <name>  # Create migration

# Database
npx ts-node prisma/seed-exercises.ts  # Seed exercises

# Testing
npm run lint                   # ESLint
npm run build                  # Build for production

# Debugging
# Visit /dev/role-info         # Check your role
# Visit /pdf-demo              # Test PDF generation
# Visit /cycling-test          # Test cycling test entry
```

---

## SUMMARY

The technical implementation is solid with good separation of concerns:
- **Database**: Well-normalized schema with proper relations and indexes
- **Backend**: RESTful API with proper error handling and validation
- **Frontend**: Server components for data fetching, client components for interactivity
- **Calculations**: Modular, well-tested calculation engine
- **Auth**: Role-based access control at middleware and API levels

Main gaps are in completing program generation testing and implementing messaging/notification systems.
