# Norwegian Singles Training Methodology - Implementation Guide

## Overview

**Norwegian Singles** is an accessible adaptation of the Norwegian Method for hobby joggers and time-constrained athletes. It provides the same core benefits of sub-threshold training (2.3-3.0 mmol/L lactate) but without the demanding twice-daily sessions and strict lactate monitoring requirements of the Norwegian Doubles method.

### Key Differences: Singles vs Doubles

| Aspect | Norwegian Singles | Norwegian Doubles |
|--------|------------------|-------------------|
| **Volume** | 50-100 km/week | 160-220 km/week |
| **Sessions/Day** | Once daily | Twice daily (AM/PM) |
| **Quality Sessions** | 2-3 per week (spread across different days) | 2 double-days per week (Tue/Thu) |
| **Time Commitment** | 5-9 hours/week | 10+ hours/week |
| **Lactate Meter** | NOT required (pace/HR/RPE) | Required (twice-weekly monitoring) |
| **Prerequisites** | 1+ year, 40+ km/week | 2+ years, 60+ km/week |
| **Target Athlete** | Hobby joggers with jobs/families | Elite/sub-elite athletes |
| **Intensity Control** | Pace + HR + RPE | Precise lactate measurements |

## Scientific Foundation

Norwegian Singles exploits the same "metabolic sweet spot" as the full Norwegian Method:

### CRITICAL PRINCIPLE: Individualized Lactate Targets

**The key is training 0.3-0.5 mmol/L BELOW your individual LT2 (d-max or field test threshold).**

This is **NOT a universal 2.3-3.0 mmol/L** - that was Marius Bakken's personal range. Your target depends on YOUR threshold:

| Your LT2 (d-max) | Your Training Target | Example Athlete |
|------------------|---------------------|----------------|
| 2.7 mmol/L | 2.3-3.0 mmol/L | Marius Bakken |
| 4.0 mmol/L | **3.5-3.7 mmol/L** | Standard distance runner |
| 4.5 mmol/L | **4.0-4.2 mmol/L** | Middle-distance runner |
| 3.5 mmol/L | 3.0-3.2 mmol/L | Elite distance runner |

**Why this subtle downshift works:**
- Training 0.3-0.5 mmol/L below LT2 generates **4-5x less peripheral and central fatigue**
- Enables **3-4 quality sessions weekly** instead of 1-2
- Sustainable year-round without burnout
- Maximizes threshold volume accumulation

### Other Intensity Markers

- **Target HR: 82-87% HRmax** (may drift to 86-91% by end of intervals)
- **Target RPE: 6-7/10** ("comfortably hard, challenging but sustainable")
- **Talk test: Can speak short sentences (4-8 words), breathing 30-50 breaths/min**

### Why Sub-Threshold Training Works

1. **Sustainable Volume**: Training 0.3-0.5 mmol/L below LT2 generates 4-5x less fatigue than traditional LT2 work
2. **High Frequency**: Enables 2-3 quality sessions per week instead of 1-2
3. **Trainability**: LT correlates with marathon time at r=0.91 vs VO2max at r=0.63
4. **MCT Adaptations**: Optimizes lactate shuttling and clearance capacity
5. **Dual-Pathway Mitochondrial Biogenesis**: Activates both calcium and AMPK signaling

## Prerequisites & Eligibility

### Critical Requirements (Must Meet)

1. ✅ **Training Age**: Minimum 1 year consistent training
2. ✅ **Aerobic Base**: Minimum 40 km/week sustained volume

### High Priority (Strongly Recommended)

3. ⚠️ **Recent Testing**: Field test OR lactate test within 12 weeks
   - 20-minute time trial
   - 30-minute time trial
   - Lab lactate test

### Medium Priority (Helpful but Optional)

4. ⚠️ **Heart Rate Monitor**: For intensity control (can use pace/RPE as backup)

### Low Priority (Recommended)

5. ℹ️ **Coach Guidance**: Recommended but not critical

## Implementation Architecture

### File Structure

```
lib/training-engine/
├── integration/
│   └── norwegian-singles-validation.ts    # Eligibility checking
├── sessions/
│   └── norwegian-singles-templates.ts     # Session library
└── generators/
    └── norwegian-singles-generator.ts     # Program generation

app/api/norwegian-singles/
├── eligibility/[clientId]/route.ts        # GET eligibility check
└── generate/route.ts                      # POST program generation
```

### Core Functions

#### 1. Eligibility Validation

```typescript
import { validateNorwegianSinglesEligibility } from '@/lib/training-engine/integration/norwegian-singles-validation';

const result = await validateNorwegianSinglesEligibility(clientId, prisma);

// Returns:
// - eligible: boolean
// - requirements: Array of 5 prerequisite checks
// - transitionPlan: 4-phase progression (12-16 weeks)
// - comparisonToDoubles: Comparison with Norwegian Doubles eligibility
```

#### 2. Pace Calculation (with Individualized LT2)

```typescript
import { calculateNorwegianSinglesPaces } from '@/lib/training-engine/integration/norwegian-singles-validation';

// Fetch athlete's individual LT2 from most recent test
const recentTest = await prisma.test.findFirst({
  where: { clientId },
  orderBy: { testDate: 'desc' },
  include: { thresholdCalculation: true }
});

const individualLT2 = recentTest?.thresholdCalculation?.lt2Lactate || 4.0; // Default to 4.0

// From 5K time with individualized LT2
const paces = calculateNorwegianSinglesPaces(1500, individualLT2); // 25:00 5K = 1500 seconds

// Returns:
// - lt2Pace: LT2 threshold pace (seconds/km)
// - pace1000m: 10K-15K pace (LT2 - 10s/km)
// - pace2000m: Half marathon pace (LT2 - 5s/km)
// - pace3000m: 30K pace (LT2 pace)
// - easyPace: Recovery pace (LT2 + 75s/km)
// - targetHRRange: [82, 87]%
// - targetLactateRange: [individualLT2 - 0.5, individualLT2 - 0.3] mmol/L (INDIVIDUALIZED!)
```

**Example Output for Different Athletes:**

```typescript
// Athlete 1: LT2 = 2.7 mmol/L (like Marius Bakken)
targetLactateRange: [2.2, 2.4] // Trains at 2.2-2.4 mmol/L

// Athlete 2: LT2 = 4.0 mmol/L (typical distance runner)
targetLactateRange: [3.5, 3.7] // Trains at 3.5-3.7 mmol/L

// Athlete 3: LT2 = 4.5 mmol/L (middle-distance runner)
targetLactateRange: [4.0, 4.2] // Trains at 4.0-4.2 mmol/L
```

#### 3. Program Generation

```typescript
import { generateNorwegianSinglesProgram } from '@/lib/training-engine/generators/norwegian-singles-generator';

const program = await generateNorwegianSinglesProgram(
  clientId,
  {
    startDate: new Date(),
    durationWeeks: 12,
    baseWeeklyVolume: 50,
    targetWeeklyVolume: 75,
    qualitySessions: 2, // or 3
    includeXFactor: false,
    fiveKTime: 1500, // 25:00
    terrain: 'ROAD'
  },
  prisma
);

// Returns complete 12-week program with daily workouts
```

## Session Templates

### Distance-Based Intervals (Primary)

#### Short Intervals (Tuesday)
- **6-10x1000m @ 10K-15K pace**
- Rest: 60 seconds (standing/walking)
- Pace: LT2 - 10 seconds/km
- Example: 3:50/km for 1:12 half marathoner

#### Medium Intervals (Thursday)
- **4-5x2000m @ Half Marathon pace**
- Rest: 75 seconds
- Pace: LT2 - 5 seconds/km
- Example: 3:55/km for 1:12 half marathoner

#### Long Intervals (Saturday)
- **3x3000m @ 30K pace**
- Rest: 90 seconds
- Pace: LT2 pace
- Example: 4:00/km for 1:12 half marathoner

### Time-Based Intervals (Alternative)

- **10-12x3min @ 15K pace** (60s rest)
- **6-8x5-6min @ 10-mile pace** (60s rest)
- **3-4x10-12min @ HM-30K pace** (90s rest)

Good for trails or varied terrain where GPS unreliable.

### X-Factor Sessions (Optional)

- **20x200m hill repeats @ 800m-1500m pace**
- Rest: 70s jog-back recovery
- Purpose: Neuromuscular power, speed, turnover
- Frequency: Once weekly OR every 2-3 weeks
- **Not sub-threshold** - targets 5-8 mmol/L lactate

### Recovery Sessions

#### Easy Runs
- Distance: 12-14 km
- Pace: LT2 + 75 seconds/km
- HR: <70% HRmax
- **Conversational pace** - can speak full sentences
- Purpose: Recovery + volume accumulation

#### Long Runs
- Distance: 16-20 km (75-90 minutes)
- Pace: **SAME as easy runs** (not slower)
- HR: <70% HRmax
- **No quality work** - pure easy pace
- Kristoffer's principle: "Same pace as easy runs, just longer"

## Weekly Microcycle Patterns

### Base Phase (Weeks 1-4): 2 Quality Sessions

```
Monday:    Easy 12km
Tuesday:   6x1000m @ 10K pace
Wednesday: Easy 12km
Thursday:  4x2000m @ HM pace
Friday:    Easy 12km
Saturday:  Easy 12km or Rest
Sunday:    Long run 16-18km

Weekly: 60-70 km, 15-20% quality
```

### Build Phase (Weeks 5-12): 3 Quality Sessions

```
Monday:    Easy 12km
Tuesday:   8-10x1000m @ 10K pace
Wednesday: Easy 12km
Thursday:  5x2000m @ HM pace
Friday:    Easy 12km
Saturday:  3x3000m @ 30K pace
Sunday:    Long run 18km

Weekly: 75-90 km, 20-25% quality
```

### Peak Phase (Optional): 2 Quality + X-Factor

```
Monday:    Easy 12km
Tuesday:   8x1000m
Wednesday: Easy 12km
Thursday:  4x2000m
Friday:    Easy 12-14km
Saturday:  20x200m hills (X-factor)
Sunday:    Long run 16-18km

Weekly: 70-85 km, 20% quality
```

## Volume Progression

### 10% Rule with Deload

```typescript
Week 1: 50 km (baseline)
Week 2: 55 km (+10%)
Week 3: 60 km (+9%)
Week 4: 45 km (deload -25%)  // Every 4th week
Week 5: 62 km (+10% from week 3)
Week 6: 68 km (+10%)
...
```

### Quality Volume Progression

```
Phase 1 (Weeks 1-4):   15-20% of weekly volume
Phase 2 (Weeks 5-8):   20-23% of weekly volume
Phase 3 (Weeks 9-12):  23-25% of weekly volume
```

### Progression Hierarchy

When sessions going well, progress in this order:

1. **Add 1-2 reps** (6x1000m → 8x1000m)
2. **Extend rep duration** (+1-2 minutes per rep)
3. **Reduce rest** (-10-15 seconds)
4. **Increase pace** (-2-3 seconds/km) - LAST resort
5. **Add quality session** (2 → 3 sessions) - Only when all sessions mastered

## Intensity Control

### The "Secret Sauce": Rest Intervals

- **30s**: Very short intervals (1min work) - trains clearance under stress
- **60s**: Short intervals (1000m, 3-5min work) - **OPTIMAL for sub-threshold**
  - "Long enough for a break, short enough that lactate stays elevated"
  - Allows partial recovery without complete clearance
  - **This is the magic** of Norwegian training
- **75s**: Medium intervals (2000m) - slightly more recovery
- **90s**: Long intervals (3000m, 10min) - lactate buffering time

### Real-Time Decision Rules

```
IF HR > 92% HRmax:
  → STOP SESSION IMMEDIATELY
  → Begin cooldown
  → Reduce next session pace by 5-10s/km

ELSE IF cannot speak even 1-2 words (gasping):
  → REDUCE current pace by 10s/km

ELSE IF cannot speak short sentences:
  → REDUCE current pace by 5s/km

ELSE IF feels "comfortably hard" AND can speak short sentences:
  → MAINTAIN current pace (perfect!)
```

### Environmental Adjustments

```
Temperature:
  <10°C:    No adjustment (may run slightly faster)
  15-20°C:  Baseline pace
  20-25°C:  -5-10 seconds/km
  25-30°C:  -15 seconds/km
  >30°C:    -20+ seconds/km OR use RPE only

Altitude:  +10 seconds/km per 1000m elevation
Trails:    +20-60 seconds/km, use RPE primary
Hills:     +30 seconds/km, use RPE primary
```

## Success Criteria

### Session-Level Success

✅ Complete all planned reps
✅ HR controlled (82-91% range)
✅ Can speak short sentences throughout
✅ Pace consistency (<5% variation across reps)
✅ Feel capable of 2-3 more reps after finishing

### Weekly Success

✅ Easy runs feel truly easy (not running on tired legs)
✅ Resting HR normal (not elevated 5+ bpm)
✅ Sleep quality maintained
✅ Motivation high (not dreading track sessions)
✅ Recovering well between quality sessions

### Long-Term Success

✅ Sustainable year-round without burnout/injury
✅ Race performances improving (PRs or consistent near-PRs)
✅ Enjoying training ("not dreading track")
✅ Can maintain structure around work/family
✅ Recovery always prioritized

## Common Mistakes & Fixes

### Mistake #1: "Greed" (Running Too Fast)

❌ **Problem**: Natural tendency to run intervals faster than prescribed
- Crosses from 2-3 mmol/L to 6-10 mmol/L
- Accumulates 4-5x more fatigue
- Prevents session frequency
- Leads to injury/overtraining

✅ **Fix**:
- Use treadmill for precise pace control (Kristoffer's method)
- Start conservatively - first rep should feel TOO EASY
- Last rep should be same pace as first rep
- If HR >92%, STOP immediately

### Mistake #2: Grey Zone Training

❌ **Problem**: Easy runs become "steady moderate" runs
- Too hard to recover from
- Too easy to stimulate adaptation
- "Putting in effort, reaping no reward"

✅ **Fix**:
- Use 70% max HR ceiling rigorously
- Apply conversational pace test
- Should feel "extremely slow" initially
- "Make easy runs EASY and hard runs HARD"

### Mistake #3: Volume + Intensity Increases

❌ **Problem**: Increasing distance AND pace simultaneously
- Kristoffer's February muscle tear from overenthusiasm
- Recipe for injury

✅ **Fix**:
- Henrik's principle: "Be very careful with speed if increasing volume"
- EITHER increase volume OR increase intensity, NEVER both
- Progress slowly (1-2 km per week)

### Mistake #4: Insufficient Recovery

❌ **Problem**: Treating easy days as optional
- Elevated resting HR ignored
- Disrupted sleep dismissed
- Heavy legs ignored
- Flat motivation ignored

✅ **Fix**:
- Jakob's principle: "Recovery, recovery, recovery"
- Question for all training: "Will this make me more ready for my next Load Day, or less?"
- If less → it fails as recovery

## API Usage Examples

### Check Eligibility

```bash
GET /api/norwegian-singles/eligibility/[clientId]

Response:
{
  "success": true,
  "data": {
    "clientName": "Johan Andersson",
    "singles": {
      "eligible": true,
      "requirements": [...],
      "transitionPlan": [4 phases],
      "comparisonToDoubles": {...}
    },
    "doubles": {
      "eligible": false,
      "requirements": [...]
    },
    "recommendation": {
      "methodology": "NORWEGIAN_SINGLES",
      "reasoning": [...],
      "nextSteps": [...]
    }
  }
}
```

### Generate Program

```bash
POST /api/norwegian-singles/generate

Body:
{
  "clientId": "uuid",
  "startDate": "2025-01-01",
  "durationWeeks": 12,
  "baseWeeklyVolume": 50,
  "targetWeeklyVolume": 75,
  "qualitySessions": 2,
  "includeXFactor": false,
  "fiveKTime": 1500, // 25:00
  "terrain": "ROAD"
}

Response:
{
  "success": true,
  "data": {
    "program": {...},
    "summary": {
      "volumeProgression": {...},
      "paceTargets": {
        "lt2Pace": "4:00/km",
        "pace1000m": "3:50/km",
        "pace2000m": "3:55/km",
        "easyPace": "5:15/km"
      },
      "intensityControl": {...},
      "keyPrinciples": [...]
    }
  }
}
```

## Comparison with Other Methodologies

### vs Norwegian Doubles

**Choose Singles if:**
- 5-9 hours/week training time
- Once-daily sessions only
- No lactate meter
- Work/family commitments

**Choose Doubles if:**
- 10+ hours/week available
- Can do twice-daily sessions
- Have lactate meter + coach
- Elite aspirations

### vs Polarized Training (Seiler)

**Singles**: 70-75% easy, 20-30% sub-threshold, <5% above threshold
**Polarized**: 80% easy, <5% moderate, 15-20% hard (>LT2)

**Key difference**: Singles EMBRACES threshold as sweet spot; Polarized AVOIDS it

### vs Jack Daniels

**Singles**: 2 paces (easy + sub-threshold), interval-based, state monitoring
**Daniels**: 5 paces (E/M/T/I/R), varied structure, prescriptive pacing

**Key difference**: Singles runs BELOW Daniels T pace (2.5-3.0 vs 4.0 mmol/L)

### vs Lydiard

**Lydiard**: Pure aerobic base → distinct phases → anaerobic sharpening
**Singles**: Sub-threshold throughout → minimal periodization → same structure year-round

**Key difference**: Singles makes threshold THE base training, not a later phase

## References

1. **Casado et al. (2023)**: Norwegian model peer-reviewed research
2. **Marius Bakken**: 5,500+ lactate measurements documenting 2.3-3.0 mmol/L effectiveness
3. **Kristoffer Ingebrigtsen**: 1:29 → 1:12 half marathon transformation (working athlete)
4. **Jakob Ingebrigtsen**: Olympic gold, world records (170-180 km/week at 2.5-3.0 mmol/L)
5. **Norwegian Olympiatoppen**: Official 5-zone system (Zone 3 = 82-87% HRmax)

## Implementation Status

✅ **Core Engine**: Complete
- Eligibility validation
- Pace calculations
- Session templates
- Program generator

✅ **API Layer**: Complete
- GET eligibility endpoint
- POST program generation endpoint

⏳ **UI Layer**: Pending
- Coach program configuration component
- Athlete program viewer
- Comparison tool (Singles vs Doubles)

⏳ **Testing**: Pending
- End-to-end program generation
- Eligibility validation scenarios
- Integration with existing training engine

## Next Steps

1. **Create Coach UI**: Program configuration wizard
2. **Create Athlete UI**: Program viewer with daily workouts
3. **Integration Testing**: Test with real athlete data
4. **Documentation**: User-facing guides in Swedish
5. **Monitoring**: Dashboard for tracking adherence and progression

---

**Implementation Date**: November 2025
**Version**: 1.0
**Status**: Production-Ready (Pending UI)
