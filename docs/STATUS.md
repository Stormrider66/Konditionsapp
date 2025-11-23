# Training Program Implementation - Status Tracker

**Last Updated:** 2025-11-12
**Current Phase:** Phase 1 Complete ✅ → Starting Phase 2

---

## 📊 Overall Progress

| Phase | Status | Progress | Priority |
|-------|--------|----------|----------|
| **Phase 1: Foundation** | ✅ Complete | 100% | MUST HAVE |
| **Phase 2: Program Generation** | 🚧 In Progress | 85% | MUST HAVE |
| **Phase 3: Coach Builder** | 🚧 In Progress | 60% | MUST HAVE |
| **Phase 4: Athlete Portal** | 🚧 In Progress | 40% | MUST HAVE |
| **Phase 5: Communication** | ⏳ Not Started | 0% | SHOULD HAVE |
| **Phase 6: Analytics** | ⏳ Not Started | 0% | SHOULD HAVE |
| **Phase 7: Advanced** | ⏳ Not Started | 0% | NICE TO HAVE |

**Legend:**
✅ Complete | 🚧 In Progress | ⏳ Not Started | ❌ Blocked

---

## Phase 1: Foundation (2-3 weeks) ✅ COMPLETE

### 1.1 Database Schema ✅
- [x] All enums added (UserRole, WorkoutType, WorkoutIntensity, PeriodPhase, SubscriptionTier)
- [x] Subscription model
- [x] AthleteAccount model
- [x] TrainingProgram model
- [x] TrainingWeek model
- [x] TrainingDay model
- [x] Workout model
- [x] WorkoutSegment model
- [x] Exercise model
- [x] WorkoutLog model
- [x] Message model
- [x] All indexes configured
- [x] All relations configured

**Files:**
- ✅ `prisma/schema.prisma` - Complete with all Phase 1 models

### 1.2 Type System ✅
- [x] UserRole, WorkoutType, WorkoutIntensity, PeriodPhase types
- [x] SubscriptionTier, SubscriptionStatus types
- [x] TrainingProgram, TrainingWeek, TrainingDay interfaces
- [x] Workout, WorkoutSegment, Exercise interfaces
- [x] WorkoutLog, Message interfaces
- [x] All DTOs for creation (CreateTrainingProgramDTO, CreateWorkoutDTO, etc.)

**Files:**
- ✅ `types/index.ts` - Complete with all Phase 1 types

### 1.3 Authentication & Authorization ✅
- [x] Role-based route protection in middleware
- [x] `/coach/*` routes protected
- [x] `/athlete/*` routes protected
- [x] `/admin/*` routes protected
- [x] Automatic redirect based on role
- [x] getCurrentUser() function
- [x] requireRole(), requireCoach(), requireAthlete(), requireAdmin()
- [x] canAccessProgram(), canAccessWorkout(), canAccessClient()
- [x] getAccessiblePrograms()
- [x] hasReachedAthleteLimit()
- [x] Subscription management functions

**Files:**
- ✅ `middleware.ts` - Role-based routing implemented
- ✅ `lib/auth-utils.ts` - All auth functions implemented

### 1.4 Athlete Account Creation ✅
- [x] POST endpoint to create athlete account
- [x] GET endpoint to retrieve athlete account by clientId
- [x] Links Client to User (Athlete)
- [x] Supabase Auth integration
- [x] Subscription athlete count update

**Files:**
- ✅ `app/api/athlete-accounts/route.ts` - API endpoints implemented

### 1.5 Exercise Library ✅
- [x] Seed script with Swedish exercises
- [x] Strength exercises (knäböj, marklyft, etc.)
- [x] Plyometric exercises (lådhopp, depth jumps, etc.)
- [x] Core exercises (plank, dead bug, etc.)
- [x] Swedish and English names
- [x] Instructions, equipment, difficulty

**Files:**
- ✅ `prisma/seed-exercises.ts` - Exercise seed script

### 🔄 Migration & Setup Required

Before proceeding to Phase 2, ensure these steps are completed:

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Create and apply migration
npx prisma migrate dev --name add_training_programs_phase1

# 3. Seed exercise library
npx ts-node prisma/seed-exercises.ts

# 4. Verify database schema
npx prisma studio
```

---

## Phase 2: Program Generation (2 weeks) 🚧 IN PROGRESS (85%)

### 2.1 Program Generator Algorithm ✅ MOSTLY COMPLETE
- [x] Core generation logic (`lib/program-generator/index.ts`)
- [x] ProgramGenerationParams interface
- [x] generateBaseProgram() function
- [x] Periodization calculations
- [x] Zone calculator
- [x] Workout builder utilities

**Files:**
- ✅ `lib/program-generator/index.ts` - Main generator
- ✅ `lib/program-generator/periodization.ts` - Phase calculations
- ✅ `lib/program-generator/zone-calculator.ts` - Training zone calculations
- ✅ `lib/program-generator/workout-builder.ts` - Workout generation

### 2.2 Template Library 🚧 PARTIAL
- [x] Marathon template
- [x] 5K/10K template
- [x] Fitness template
- [ ] Half-marathon template
- [ ] Strength-specific templates
- [ ] Plyometrics library
- [ ] Core routines

**Files:**
- ✅ `lib/program-generator/templates/marathon.ts`
- ✅ `lib/program-generator/templates/5k-10k.ts`
- ✅ `lib/program-generator/templates/fitness.ts`
- ⏳ `lib/program-generator/templates/half-marathon.ts` - TODO
- ⏳ `lib/program-generator/templates/strength-base.ts` - TODO
- ⏳ `lib/program-generator/templates/plyometrics-library.ts` - TODO
- ⏳ `lib/program-generator/templates/core-routines.ts` - TODO

### 2.3 API Endpoints ⏳ NEEDED
- [ ] POST `/api/programs/generate` - Generate program from params
- [ ] POST `/api/programs` - Create/save program
- [ ] GET `/api/programs` - List programs
- [ ] GET `/api/programs/[id]` - Get program details
- [ ] PATCH `/api/programs/[id]` - Update program
- [ ] DELETE `/api/programs/[id]` - Delete program

**Next Steps:**
1. Create API routes in `app/api/programs/`
2. Test program generation with sample data
3. Complete remaining template files

---

## Phase 3: Coach Builder (3 weeks) 🚧 IN PROGRESS (60%)

### 3.1 Program Pages ✅ PAGES EXIST
- [x] Program list page (`/coach/programs`)
- [x] Program detail page (`/coach/programs/[id]`)
- [x] Program generation page (`/coach/programs/generate`)
- [ ] Program creation wizard (multi-step)
- [ ] Calendar view component
- [ ] Workout editor modal

**Files:**
- ✅ `app/coach/programs/page.tsx` - List page exists
- ✅ `app/coach/programs/[id]/page.tsx` - Detail page exists
- ✅ `app/coach/programs/generate/page.tsx` - Generation page exists

### 3.2 Coach Dashboard ✅ EXISTS
- [x] Dashboard page created

**Files:**
- ✅ `app/coach/dashboard/page.tsx`

### 3.3 Components ⏳ NEEDED
- [ ] `<ProgramCalendar />` - Monthly/weekly calendar view
- [ ] `<WorkoutCard />` - Workout display card
- [ ] `<WorkoutBuilder />` - Workout creation/editing modal
- [ ] `<SegmentBuilder />` - Workout segment editor
- [ ] `<ExerciseSelector />` - Exercise library selector
- [ ] `<WeekSummary />` - Weekly volume/stats sidebar
- [ ] `<PhaseIndicator />` - Visual phase timeline

**Next Steps:**
1. Build reusable components in `components/coach/`
2. Implement drag-and-drop for workouts
3. Add calendar view with week/month toggle

---

## Phase 4: Athlete Portal (2-3 weeks) 🚧 IN PROGRESS (40%)

### 4.1 Athlete Dashboard ✅ PAGE EXISTS
- [x] Dashboard page created
- [ ] Today's workouts section
- [ ] Upcoming week preview
- [ ] Recent activity widget
- [ ] Progress widgets
- [ ] Messages section

**Files:**
- ✅ `app/athlete/dashboard/page.tsx` - Page exists, needs content

### 4.2 Athlete Pages ⏳ NEEDED
- [ ] `/athlete/calendar` - Training calendar view
- [ ] `/athlete/workouts/[id]` - Workout detail and logging
- [ ] `/athlete/tests` - Test results view
- [ ] `/athlete/progress` - Progress tracking
- [ ] `/athlete/settings` - Profile and settings

### 4.3 Components ⏳ NEEDED
- [ ] `<WorkoutDetailView />` - Pre-workout view with segments
- [ ] `<WorkoutLogger />` - Post-workout logging form
- [ ] `<WorkoutCalendar />` - Athlete calendar view
- [ ] `<ProgressCharts />` - Training load and trends
- [ ] `<TestResultsView />` - Test history and comparison

### 4.4 API Endpoints ⏳ NEEDED
- [ ] POST `/api/workouts/[id]/log` - Log workout completion
- [ ] GET `/api/workouts/[id]/logs` - Get workout logs
- [ ] PATCH `/api/workouts/[id]/log/[logId]` - Update log
- [ ] GET `/api/athlete/calendar` - Get athlete's calendar
- [ ] GET `/api/athlete/progress` - Get progress data

**Next Steps:**
1. Implement athlete dashboard with real data
2. Build workout logging system
3. Create athlete calendar view

---

## Phase 5: Communication (1-2 weeks) ⏳ NOT STARTED

### 5.1 Messaging Interface
- [ ] `/coach/messages` page
- [ ] `/athlete/messages` page
- [ ] Message inbox/conversation list
- [ ] Message thread view
- [ ] Reply functionality
- [ ] Workout-related messages

### 5.2 API Endpoints
- [ ] GET `/api/messages` - Get user's messages
- [ ] POST `/api/messages` - Send new message
- [ ] PATCH `/api/messages/[id]/read` - Mark as read

### 5.3 Notifications
- [ ] In-app notification system
- [ ] Email notifications via Resend
- [ ] Notification preferences

**Dependencies:**
- Phase 4 must be at least 70% complete

---

## Phase 6: Analytics (1-2 weeks) ⏳ NOT STARTED

### 6.1 Athlete Analytics
- [ ] `/athlete/progress` page
- [ ] Training load chart
- [ ] Completion rate tracking
- [ ] Performance trends
- [ ] Test result timeline

### 6.2 Coach Analytics
- [ ] `/coach/clients/[id]/analytics` page
- [ ] Program adherence metrics
- [ ] Training load analysis
- [ ] Performance indicators
- [ ] CSV export functionality

### 6.3 Calculation Functions
- [ ] Calculate ACWR (Acute:Chronic Workload Ratio)
- [ ] Calculate training load
- [ ] Detect anomalies
- [ ] Predict fitness level

**Dependencies:**
- Phase 4 must be complete (need workout logs)

---

## Phase 7: Advanced Features (Optional) ⏳ NOT STARTED

### 7.1 Program Auto-Adaptation
- [ ] Dynamic adjustment logic
- [ ] Missed workout suggestions
- [ ] Volume adjustment based on performance

### 7.2 Race Day Features
- [ ] Pre-race checklist
- [ ] Race day page with pacing strategy
- [ ] Post-race logging

### 7.3 Integrations
- [ ] Strava OAuth connection
- [ ] Garmin Connect integration
- [ ] Auto-import workouts

### 7.4 Team Features
- [ ] Team program management
- [ ] Group workouts
- [ ] Team leaderboards

---

## 📋 Immediate Next Steps (Priority Order)

### This Week
1. ✅ **Review STATUS.md** - Understand current state
2. 🎯 **Complete Phase 2 API Routes** - Create `/api/programs/` endpoints
3. 🎯 **Test Program Generation** - Verify end-to-end program creation
4. 🎯 **Build Core Components** - Start with `<ProgramCalendar />` and `<WorkoutBuilder />`

### Next Week
5. 🎯 **Athlete Workout Logging** - Implement workout detail and logging
6. 🎯 **Athlete Calendar View** - Show program to athletes
7. 🎯 **Coach Program Editor** - Enable workout editing

### Following Weeks
8. 🎯 **Messaging System** - Basic coach-athlete communication
9. 🎯 **Progress Analytics** - Training load and trends
10. 🎯 **Polish & Testing** - UI improvements and bug fixes

---

## 🔧 Technical Debt & Issues

### Known Issues
- [ ] Database migration not yet run (schema exists, but not in DB)
- [ ] Exercise library not seeded
- [ ] No tests yet (unit, integration, or E2E)
- [ ] Coach/athlete pages have skeleton UI, need real implementation
- [ ] No error handling for program generation edge cases
- [ ] File upload for workout logs not implemented

### Performance Considerations
- [ ] Add database indexes for frequently queried fields
- [ ] Implement pagination for workout logs
- [ ] Cache training zones calculations
- [ ] Optimize N+1 query issues

### Security
- [ ] Add rate limiting to API routes
- [ ] Validate all user inputs on server
- [ ] Implement CSRF protection
- [ ] Add API authentication for athlete-accounts endpoint

---

## 📝 Questions & Decisions Needed

Based on the implementation plan, the following questions were posed and need answers:

### 1. Program Duration ✅ DECIDED
**Decision:** Support year-round training (not just race-specific blocks)
- Programs can span any duration
- Support multiple goal types (marathon, 5k, fitness, cycling, skiing, custom)
- `goalType` field added to schema

### 2. Workout Logging ✅ DECIDED
**Decision:** Athletes can log in advance and add custom workouts
- `isCustom` flag on Workout model
- Athletes can log workouts before scheduled date
- Athletes can add custom workouts not in program

### 3. Program Visibility ✅ DECIDED
**Decision:** Athletes see entire program from start
- Full visibility of all future workouts
- No week-by-week unlock system
- Simpler UX, better for planning

### 4. Payment/Access Control ✅ DECIDED
**Decision:** Subscription tiers with athlete limits
- FREE: 0 athletes
- BASIC: 5 athletes
- PRO: 50 athletes
- ENTERPRISE: Unlimited athletes
- Stripe integration prepared (fields in Subscription model)

### 5. Multi-Language ⏳ PENDING
**Current:** Swedish first
- All content in Swedish
- English support to be added later
- `language` field exists on User model
- `nameSv` and `nameEn` fields on Exercise model

### 6. Mobile Apps ⏳ FUTURE
**Current:** Web-first (PWA potential)
- Using Next.js API routes (not separate API)
- Mobile apps are future consideration
- Responsive design for mobile web

### 7. Coach-Athlete Ratio ✅ DECIDED
**Target:** Up to 500 athletes per coach
- Proper indexing in place
- Designed for scalability
- Subscription tiers support up to 50 (PRO) or unlimited (ENTERPRISE)

### 8. Program Templates ⏳ PARTIAL
**Current:** Generation tools + some templates
- Marathon, 5K/10K, fitness templates exist
- Not shipping with pre-built programs (coaches generate from templates)
- More templates to be added

---

## 🎯 Success Metrics

Track these metrics once features are live:

- [ ] **Coach Efficiency:** Time to create program <10 minutes
- [ ] **Athlete Engagement:** >80% workout completion rate
- [ ] **Communication:** <2 hour response time on messages
- [ ] **Retention:** Athletes stay on programs for full duration
- [ ] **Performance:** Page load <2 seconds, no timeouts
- [ ] **Satisfaction:** Positive feedback from coaches and athletes

---

## 📞 Support & Resources

- **Documentation:** See `TRAINING_PROGRAM_IMPLEMENTATION_PLAN.md` for detailed specs
- **Codebase Guide:** See `CLAUDE.md` for project conventions
- **Database Tool:** `npx prisma studio` to view/edit data
- **Development:** `npm run dev` to start development server

---

**End of Status Document**
This document will be updated as implementation progresses.
