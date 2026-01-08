# Strength Training Integration - Implementation Checklist

**Timeline**: 8 weeks
**Status**: 🚧 In Progress
**Last Updated**: 2025-11-19

---

## Phase 1: Exercise Library Expansion (Week 1)
**Goal**: Expand from 25 to 100+ exercises covering all biomechanical pillars

### Database Schema Updates
- [x] Add `BiomechanicalPillar` enum (POSTERIOR_CHAIN, KNEE_DOMINANCE, UNILATERAL, FOOT_ANKLE, ANTI_ROTATION_CORE, UPPER_BODY)
- [x] Add `ProgressionLevel` enum (LEVEL_1, LEVEL_2, LEVEL_3)
- [x] Add `PlyometricIntensity` enum (LOW, MODERATE, HIGH)
- [ ] Update Exercise model with new fields
- [ ] Create database migration
- [ ] Run migration on development database

### Posterior Chain Exercises (15 exercises)
- [ ] Glute Bridge
- [ ] Single-Leg Glute Bridge
- [ ] Clamshells with Band
- [ ] Hip Hikes
- [ ] Fire Hydrants
- [ ] Hip Thrusts (barbell)
- [ ] Single-Leg RDL
- [ ] Good Mornings
- [ ] Pull-Throughs (cable)
- [ ] Banded Hip Extensions
- [ ] Kettlebell Swings
- [ ] Standing Long Jump
- [ ] Box Step-Ups
- [ ] Donkey Kicks
- [ ] Reverse Hyperextensions

### Knee Dominance Exercises (12 exercises)
- [ ] Goblet Squat
- [ ] Wall Sit
- [ ] Split Squat
- [ ] Front Squat
- [ ] Bulgarian Split Squat
- [ ] Hack Squat
- [ ] Leg Press
- [ ] Jump Squats
- [ ] Box Jumps
- [ ] Pogo Jumps
- [ ] Pistol Squat Progression
- [ ] Cyclist Squats

### Unilateral Exercises (15 exercises)
- [ ] Bulgarian Split Squat (DB)
- [ ] Bulgarian Split Squat (BB)
- [ ] Bulgarian Split Squat (Elevated)
- [ ] Single-Leg RDL (DB)
- [ ] Single-Leg RDL (KB)
- [ ] Single-Leg RDL (Barbell)
- [ ] Step-Ups (Low Box)
- [ ] Step-Ups (High Box)
- [ ] Step-Ups with Knee Drive
- [ ] Single-Leg Press
- [ ] Walking Lunges
- [ ] Reverse Lunges
- [ ] Lateral Lunges
- [ ] Curtsy Lunges
- [ ] Skater Squats

### Foot & Ankle Complex (10 exercises)
- [ ] Calf Raises (Straight Knee - Gastrocnemius)
- [ ] Calf Raises (Bent Knee - Soleus)
- [ ] Single-Leg Calf Raises
- [ ] Seated Calf Raises
- [ ] Pogo Jumps (Ankle Stiffness)
- [ ] Ankle Hops
- [ ] Toe Yoga
- [ ] Marble Pickups
- [ ] Ankle Dorsiflexion (Band)
- [ ] Heel Walks

### Anti-Rotation Core (12 exercises)
- [ ] Pallof Press (Cable)
- [ ] Pallof Press (Band)
- [ ] Dead Bug
- [ ] Bird Dog
- [ ] Suitcase Carry
- [ ] Farmer's Walk
- [ ] Side Plank
- [ ] Side Plank with Rotation Resistance
- [ ] Ab Wheel Rollouts
- [ ] Plank (Anti-Extension)
- [ ] Copenhagen Plank
- [ ] Stir the Pot

### Plyometric Exercises (20 exercises)
#### Level 1 - Extensive (LOW intensity)
- [ ] Jump Rope
- [ ] Pogo Jumps
- [ ] Low Box Jumps
- [ ] Lateral Hops
- [ ] Skipping

#### Level 2 - Moderate (MODERATE intensity)
- [ ] Squat Jumps
- [ ] Countermovement Jumps
- [ ] Lateral Bounds
- [ ] Tuck Jumps
- [ ] Split Jumps

#### Level 3 - Intensive (MODERATE-HIGH intensity)
- [ ] Box Jumps (18-24")
- [ ] Single-Leg Bounds
- [ ] Hurdle Hops
- [ ] Broad Jump
- [ ] Triple Jump

#### Level 4 - Advanced (HIGH intensity)
- [ ] Depth Jumps (30cm)
- [ ] Depth Jumps (40cm)
- [ ] Drop Jumps
- [ ] Repeated Bounds
- [ ] Depth to Broad Jump

### Seed File Updates
- [ ] Update `prisma/seed-exercises.ts` with all new exercises
- [ ] Add progressionLevel, biomechanicalPillar, plyometricIntensity fields
- [ ] Run seed script: `npx ts-node prisma/seed-exercises.ts`

---

## Phase 2: Automatic Progression System (Week 2)
**Goal**: Implement intelligent load progression and tracking

### Database Models
- [ ] Create `ProgressionTracking` model
- [ ] Add fields: clientId, exerciseId, date, estimated1RM, actualLoad, repsCompleted
- [ ] Add progressionStatus enum (ON_TRACK, PLATEAU, REGRESSING)
- [ ] Add lastIncrease date field
- [ ] Create database migration
- [ ] Add indexes for performance

### 1RM Estimation & Calculation
- [ ] Create `lib/training-engine/progression/rm-estimation.ts`
- [ ] Implement Epley formula: 1RM = weight × (1 + reps/30)
- [ ] Implement Brzycki formula: 1RM = weight × 36 / (37 - reps)
- [ ] Add historical 1RM tracking function
- [ ] Add 1RM estimation from multiple formulas (average)
- [ ] Create TypeScript types for RM calculations

### 2-for-2 Rule Implementation
- [ ] Create `lib/training-engine/progression/two-for-two.ts`
- [ ] Implement detection logic (2 extra reps × 2 sessions)
- [ ] Calculate load increase (upper: 2.5-5%, lower: 5-10%)
- [ ] Store progression decisions in database
- [ ] Add progression recommendation function
- [ ] Add override/lock mechanism

### Phase-Based Progression
- [ ] Create `lib/training-engine/progression/phase-progression.ts`
- [ ] Anatomical Adaptation: Volume progression (reps/sets)
- [ ] Maximum Strength: Load progression (weight)
- [ ] Power: Velocity progression (reduce load if speed drops)
- [ ] Maintenance: Maintain load, reduce volume
- [ ] Add progression calculator per phase

### Plateau Detection
- [ ] Create plateau detection algorithm (3 weeks no progress)
- [ ] Implement deload trigger (reduce volume 40-50%)
- [ ] Add exercise variation suggestions
- [ ] Create plateau notification system
- [ ] Add recovery week auto-scheduling

### API Endpoint
- [ ] Create `POST /api/progression/calculate`
- [ ] Input: workoutLogs, clientId, exerciseId
- [ ] Output: recommended load, progression status
- [ ] Add error handling
- [ ] Add authentication checks

---

## Phase 3: Enhanced Program Generator (Week 3)
**Goal**: Integrate scientific framework into automatic program generation

### 5-Phase Periodization
- [ ] Update `lib/training-engine/quality-programming/strength-periodization.ts`
- [ ] Implement Anatomical Adaptation (4-6 weeks, 2-3×12-20 @ 40-60%)
- [ ] Implement Maximum Strength (6-8 weeks, 3-5×3-6 @ 80-95%)
- [ ] Implement Power (3-4 weeks, 3-5×4-6 @ 30-60% max velocity)
- [ ] Implement Maintenance (variable, 2×3-5 @ 80-85%)
- [ ] Implement Taper (1-2 weeks, 41-60% volume reduction)
- [ ] Add phase transition logic

### Running Phase Alignment
- [ ] Map Base Building → Anatomical Adaptation
- [ ] Map Threshold/Tempo → Maximum Strength
- [ ] Map Intervals/Speed → Power
- [ ] Map Race Prep → Maintenance
- [ ] Map Taper → Taper (stop 7-10 days before race)
- [ ] Add phase synchronization validator

### Interference Management
- [ ] Create `lib/training-engine/scheduling/interference-manager.ts`
- [ ] Implement beginner rule (>24h separation)
- [ ] Implement intermediate rule (6-9h same-day)
- [ ] Implement advanced rule (6-9h mandatory hard/hard)
- [ ] Add <48h before key workout check
- [ ] Add schedule conflict warnings

### Exercise Selection Algorithm
- [ ] Create `lib/training-engine/generators/exercise-selector.ts`
- [ ] Implement phase-appropriate selection
- [ ] Add biomechanical balance (1 posterior + 1 knee + 1 unilateral)
- [ ] Add equipment availability filtering
- [ ] Implement rotation logic (no repeat within 2 weeks)
- [ ] Add progression path tracking
- [ ] Add bilateral movement balance

### Plyometric Contact Calculation
- [ ] Implement beginner limit (60-80 contacts, extensive only)
- [ ] Implement intermediate limit (100-120 contacts)
- [ ] Implement advanced limit (120-140 contacts)
- [ ] Implement elite limit (150-300 contacts)
- [ ] Add cumulative contact counter
- [ ] Add auto-adjust when limit exceeded

### Program Generator Update
- [ ] Update `generateStrengthProgram()` in lib/program-generator
- [ ] Integrate 5-phase system
- [ ] Integrate exercise selector
- [ ] Integrate interference manager
- [ ] Add plyometric session generation
- [ ] Add weekly volume distribution

---

## Phase 4: Universal Program Editor (Week 4)
**Goal**: Full editing capabilities for all session types

### Backend API
- [ ] Create `app/api/programs/[id]/edit/route.ts`
- [ ] `PUT /api/programs/:id/weeks/:weekId/days/:dayId` - Edit any day
- [ ] `POST /api/programs/:id/weeks/:weekId/days/:dayId/workouts` - Add workout
- [ ] `DELETE /api/programs/:id/workouts/:workoutId` - Remove workout
- [ ] `PUT /api/programs/:id/workouts/:workoutId/reorder` - Change order
- [ ] `PUT /api/programs/:id/workouts/:workoutId/segments` - Edit exercises
- [ ] Add input validation with Zod
- [ ] Add optimistic locking
- [ ] Add error handling

### Session Editor Component
- [ ] Create `components/coach/program-editor/SessionEditor.tsx`
- [ ] Add running workout editor
- [ ] Add strength workout editor
- [ ] Add plyometric workout editor
- [ ] Add core workout editor
- [ ] Implement drag-and-drop exercise reordering
- [ ] Add/remove exercises from library
- [ ] Real-time duration calculation
- [ ] Add save/cancel buttons

### Exercise Swapper
- [ ] Create `components/coach/program-editor/ExerciseSwapper.tsx`
- [ ] Show similar alternatives on click
- [ ] Filter by biomechanical pillar
- [ ] Filter by progression level
- [ ] Filter by equipment
- [ ] One-click swap functionality
- [ ] Auto-adjust sets/reps

### Program Overview Dashboard
- [ ] Create `components/coach/program-editor/ProgramOverview.tsx`
- [ ] Calendar view of entire program
- [ ] Color-coded session types (easy/quality/strength/plyo)
- [ ] Click session to open editor
- [ ] Drag-and-drop to move sessions
- [ ] Show interference warnings
- [ ] Show volume alerts
- [ ] Show recovery gaps
- [ ] Export program to PDF

---

## Phase 5: API Layer (Week 5)
**Goal**: Complete backend support for all features

### Exercise Management
- [ ] `GET /api/exercises` - List all with filters
- [ ] `POST /api/exercises` - Create custom
- [ ] `GET /api/exercises/:id` - Get details
- [ ] `PUT /api/exercises/:id` - Update custom
- [ ] `DELETE /api/exercises/:id` - Delete custom
- [ ] `GET /api/exercises/categories/:category` - Filter by category
- [ ] `GET /api/exercises/pillars/:pillar` - Filter by pillar
- [ ] Add Zod validation schemas
- [ ] Add pagination support

### Session Templates
- [ ] `GET /api/strength-templates` - List saved templates
- [ ] `POST /api/strength-templates` - Save session as template
- [ ] `GET /api/strength-templates/:id` - Get template
- [ ] `POST /api/strength-templates/:id/apply` - Apply to program
- [ ] `DELETE /api/strength-templates/:id` - Delete template
- [ ] Add template sharing between coaches (optional)

### Progression Tracking
- [ ] `GET /api/clients/:id/progression/:exerciseId` - Get history
- [ ] `POST /api/progression/calculate` - Calculate next loads
- [ ] `GET /api/clients/:id/strength-standards` - Check benchmarks
- [ ] Add 1RM history endpoint
- [ ] Add volume load tracking endpoint

### Workout Logging
- [ ] `POST /api/workouts/:id/log` - Log completion
- [ ] `GET /api/clients/:id/workout-history` - Get history
- [ ] `GET /api/clients/:id/strength-stats` - Stats dashboard
- [ ] Add filters: date range, workout type, phase
- [ ] Add aggregation queries

---

## Phase 6: Coach UI Components (Week 6)
**Goal**: Complete coach interface for strength management

### Exercise Library Browser
- [ ] Create `components/coach/strength/ExerciseLibrary.tsx`
- [ ] Grid/list view toggle
- [ ] Search by name functionality
- [ ] Filter by category
- [ ] Filter by biomechanical pillar
- [ ] Filter by difficulty
- [ ] Filter by equipment
- [ ] Preview modal (video, instructions)
- [ ] "Create Custom" button
- [ ] Edit/delete custom exercises

### Custom Exercise Creator
- [ ] Create `components/coach/strength/ExerciseCreator.tsx`
- [ ] Name fields (Swedish + English)
- [ ] Category dropdown
- [ ] Biomechanical pillar multi-select
- [ ] Progression level selector
- [ ] Equipment multi-select
- [ ] Difficulty radio buttons
- [ ] Instructions textarea
- [ ] Video URL input
- [ ] Muscle groups multi-select
- [ ] Form validation
- [ ] Save button with loading state

### Strength Program Generator Wizard
- [ ] Create `components/coach/strength/StrengthProgramWizard.tsx`
- [ ] Step 1: Select running program
- [ ] Step 2: Choose duration (4-24 weeks)
- [ ] Step 3: Set athlete level
- [ ] Step 4: Select starting phase
- [ ] Step 5: Configure frequency (1-3x weekly)
- [ ] Step 6: Equipment selection
- [ ] Step 7: Preview + Generate
- [ ] Show phase alignment with running
- [ ] Add interference warnings
- [ ] Progress indicator

### Progression Dashboard
- [ ] Create `components/coach/strength/ProgressionDashboard.tsx`
- [ ] 1RM charts (per exercise)
- [ ] Volume load trends
- [ ] Strength standards checklist
- [ ] Plateau detection alerts
- [ ] Bilateral asymmetry comparison
- [ ] Export to CSV button
- [ ] Date range selector

---

## Phase 7: Athlete Interface (Week 7)
**Goal**: Simple logging and workout display

### Workout Display Card
- [ ] Create `components/athlete/strength/StrengthWorkoutCard.tsx`
- [ ] Show session name and phase
- [ ] List exercises with sets/reps/load
- [ ] Show rest intervals
- [ ] Video links for exercises
- [ ] Total estimated duration
- [ ] "Start Workout" button
- [ ] Completed status indicator

### Simple Logging Form
- [ ] Create `components/athlete/strength/WorkoutLoggingForm.tsx`
- [ ] Completed toggle (Yes/No)
- [ ] Overall RPE slider (1-10)
- [ ] Difficulty selector (Too Easy/Just Right/Too Hard)
- [ ] Notes textarea
- [ ] Duration field (auto or manual)
- [ ] Submit button
- [ ] Success notification

### Workout History
- [ ] Create `components/athlete/strength/StrengthHistory.tsx`
- [ ] List view of past workouts
- [ ] Filter by date range
- [ ] Filter by phase
- [ ] Filter by completed/skipped
- [ ] Click workout to see details
- [ ] Show workout notes
- [ ] Simple stats: sessions completed, avg RPE

### Exercise Instructions Modal
- [ ] Create `components/athlete/strength/ExerciseInstructionsModal.tsx`
- [ ] Video embed (Vimeo/external)
- [ ] Written instructions
- [ ] Form cues
- [ ] Common mistakes section
- [ ] Personal bests display
- [ ] Close button

---

## Phase 8: Testing & Documentation (Week 8)
**Goal**: Validate implementation and document usage

### Integration Testing
- [ ] Test program generation with all 5 phases
- [ ] Test interference management (verify 6-24h gaps)
- [ ] Test progression algorithm (2-for-2 rule)
- [ ] Test exercise selection (biomechanical balance)
- [ ] Test plyometric contact limits
- [ ] Test phase alignment (running + strength)
- [ ] Test session editing (add/remove/swap)
- [ ] Test on mobile devices

### User Acceptance Testing
- [ ] Create test athlete with 12-week marathon program
- [ ] Generate integrated strength program
- [ ] Edit sessions (add/remove exercises)
- [ ] Log workouts as athlete
- [ ] Verify progression triggers
- [ ] Test custom exercise creation
- [ ] Test session templates
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome

### Documentation
- [ ] Update `CLAUDE.md` with strength training section
- [ ] Create "How to Create Custom Exercises" guide
- [ ] Create "How to Edit Generated Programs" guide
- [ ] Create "How to Log Strength Workouts" (athlete guide)
- [ ] Create API documentation (Swagger/OpenAPI)
- [ ] Add inline code comments
- [ ] Create video tutorials (optional)
- [ ] Update README.md

### Deployment
- [ ] Run final database migration
- [ ] Seed production database with exercises
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Gather user feedback

---

## Progress Summary

**Overall Progress**: 2/171 tasks completed (1%)

### Phase Completion
- **Phase 1**: 2/31 (6%) ✅ Database enums added
- **Phase 2**: 0/22 (0%)
- **Phase 3**: 0/27 (0%)
- **Phase 4**: 0/17 (0%)
- **Phase 5**: 0/19 (0%)
- **Phase 6**: 0/23 (0%)
- **Phase 7**: 0/15 (0%)
- **Phase 8**: 0/17 (0%)

**Next Action**: Update Exercise model with new fields, then start adding exercises to seed file.
