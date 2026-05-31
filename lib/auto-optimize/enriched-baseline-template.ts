/**
 * Enriched Baseline Template
 *
 * Knowledge-rich prompt variant for program generation with conditional blocks.
 * Uses {{#if_category X}}...{{/endif}} and {{#if_methodology X}}...{{/endif}}
 * blocks that get stripped based on sport type before variable substitution.
 *
 * Distilled from:
 * - docs/hypertrophy_framework.md (MEV/MAV/MRV, volume periodization)
 * - docs/Autoregulation_RPE_RIR_Guide.md (RPE/RIR mapping, autoregulation)
 * - docs/Equipment_Constrained_Resistance_Training.md (DB/BW alternatives)
 * - docs/resistance_training_periodization.md (DUP/WUP/BUP)
 * - docs/Advanced_Resistance_Training_Methodologies.md (wave loading, clusters, myo-reps)
 * - docs/nutrient_timing_ergogenic_supplementation.md (pre/intra/post nutrition)
 * - lib/training-engine/* (methodologies, sport-specific modules)
 */

export const ENRICHED_BASELINE_TEMPLATE = `## TASK: CREATE TRAINING PROGRAM

You are an experienced coach and sport physiologist with deep knowledge of periodization, biomechanics, and performance optimization. Create an individualized, science-based training program.

**Sport:** {{sport}}
**Methodology:** {{methodology}}
**Program length:** {{totalWeeks}} weeks
**Sessions per week:** {{sessionsPerWeek}}
**Experience level:** {{experienceLevel}}
**Goal:** {{goal}}

---

## PERIODIZATION PRINCIPLES (ALL SPORTS)

The program MUST follow correct periodization:

### Phases (adapt phase length to the total number of weeks):
- **Base phase (30-40% of the program):** Build aerobic capacity/base strength, low intensity, high volume
- **Build phase (30-40%):** Increase intensity gradually, introduce specific sessions
- **Peak/specific phase (15-25%):** High intensity, specific training, reduced volume
- **Taper (5-10%):** Reduce volume 40-60%, KEEP intensity (exponential taper)

### Progression rules:
- **10% rule:** Max 10% volume increase per week
- **Step-back weeks:** Every 3-4 weeks, reduce volume 20-30% for recovery
- **2-for-2 rule (strength):** If the athlete completes 2 extra reps in the final set for 2 sessions in a row, increase load (5% upper body, 5-10% lower body)

---

## INJURY PREVENTION (ALL SPORTS)

### Include in EVERY program:
- **Nordic Hamstring Curls:** 51% reduction in hamstring injuries
- **Copenhagen Planks:** 41% reduction in groin injuries
- **Hip abduction/external rotation:** Helps prevent IT-band issues and PFPS
- **Unilateral work:** Helps prevent asymmetries

### Delaware pain rules:
- Pain >5/10: Rest or cross-training
- Pain 3-5: Modified training, 50% reduction
- Pain <3: Cautious progression

### ACWR (Acute:Chronic Workload Ratio): Keep <1.3 during build phases, <1.5 acceptable briefly

---

## RAMP WARM-UP (ALL SPORTS)

Every session MUST start with a RAMP protocol:
1. **Raise** (3-5 min): Raise heart rate with easy cardio
2. **Activate** (3-5 min): Activate key muscles with bands/light weights
3. **Mobilize** (2-3 min): Dynamic mobility for the day's movement pattern
4. **Potentiate** (2-3 min): Progressive loading toward the working load

---

{{#if_category STRENGTH_GYM}}
## STRENGTH TRAINING & GYM PROGRAMS

### Strength periodization phases (Bompa & Haff):
| Phase | Weeks | Intensity | Reps | Sets | Rest | Tempo |
|-----|--------|-----------|------|-----|------|-------|
| Anatomical Adaptation (AA) | 4-6 | 40-60% 1RM | 12-20 | 2-3 | 60-90s | 2-0-2 |
| Hypertrophy | 4-6 | 70-80% 1RM | 8-12 | 3-4 | 60-90s | 3-0-1 |
| Max Strength | 6-8 | 80-95% 1RM | 3-6 | 3-5 | 2-3 min | 2-1-X |
| Power | 3-4 | 30-60% 1RM (explosive) | 4-6 | 3-5 | 3-5 min | X-0-X |
| Maintenance | Ongoing | 70-85% 1RM | 6-8 | 2 | 2 min | 2-0-1 |

### Tempo notation: Use "3-0-X" (3 sec eccentric, 0 pause, X = explosive concentric)

### Volume landmarks (sets per muscle group per week):
- **MEV (Minimum Effective Volume):** 6-10 sets - mesocycle starting point
- **MAV (Maximum Adaptive Volume):** 10-20 sets - optimal growth zone
- **MRV (Maximum Recoverable Volume):** 20-25 sets - exceeding this leads to regression

**Per muscle group:**
| Muscle group | MEV | MAV | MRV | Frequency/week | Optimal reps |
|------------|-----|-----|-----|----------------|---------------|
| Chest | 10 | 12-20 | 22+ | 2-3 | 8-12 |
| Back/Lats | 10 | 14-22 | 25+ | 2-4 | 6-20 (mixed) |
| Shoulders (side/rear) | 8 | 16-22 | 26+ | 2-6 | 10-20 |
| Quadriceps | 8 | 12-18 | 20+ | 2-3 | 8-15 |
| Hamstrings | 6 | 10-16 | 20+ | 2-3 | 5-10 |
| Biceps | 8 | 14-20 | 26+ | 2-6 | 8-15 |
| Triceps | 6 | 10-14 | 18+ | 2-4 | 6-15 |

### Biomechanical balance (include ALL categories in the program):
1. **Posterior Chain:** RDL, Hip Thrust, Kettlebell Swing, Nordic Hamstring
2. **Knee-dominant:** Squat (goblet/back/front), Bulgarian Split Squat, Leg Press
3. **Unilateral:** Lunges, Step-ups, Single-Leg RDL
4. **Core (anti-rotation):** Pallof Press, Plank with lift, Suitcase Carry, Dead Bug
5. **Upper body Push/Pull:** Bench Press, Press, Row, Chin-ups/Pull-ups
6. **Foot/Ankle:** Calf Raise (straight + bent knee), Pogo Jumps

### Split recommendations by level:
- **Beginner (3x/week):** Full-body sessions A/B, focus on foundational lifts
- **Intermediate (4x/week):** Upper/Lower split or Push/Pull
- **Advanced (5-6x/week):** Push/Pull/Legs (PPL) or Arnold split

### RPE/RIR scale (use for intensity prescription):
| RPE | RIR | Description | Use |
|-----|-----|-------------|------------|
| 6 | 4 | Easy, high bar speed | Warm-up, deload |
| 7 | 3 | Moderate, bar moves quickly | Volume phase, accessories |
| 8 | 2 | Heavy but manageable, 2 reps left | Main hypertrophy work |
| 9 | 1 | Very heavy, 1 rep left | Max strength, top set |
| 10 | 0 | Maximal effort, failure | Avoid on free weights |

**Phase-specific RPE:**
- AA/Deload: RPE 5-6 (4+ RIR)
- Hypertrophy: RPE 7-8.5 (1-3 RIR)
- Max Strength: RPE 8-9.5 (0.5-2 RIR)
- Power: RPE 6-7 (3-4 RIR, speed focus)

### Deload (MANDATORY every 3-5 weeks):
- Reduce volume 40-50% (halve number of sets)
- KEEP intensity (same RPE/load)
- Prioritize sleep, nutrition, mobility
- Beginner: every 4-5 weeks | Intermediate: every 3-4 weeks | Advanced: every 3 weeks

### 60-min session structure:
1. **Warm-up (10 min):** RAMP protocol + specific warm-up
2. **Compound exercises (35 min):** 2-3 compound exercises, heaviest first
3. **Accessories/isolation + core (10 min):** 2-3 isolation exercises, supersets
4. **Cooldown (5 min):** Stretching + breathing exercise

### Periodization model - choose the right model by level:
| Level | Goal | Model | Description |
|------|-----|--------|-------------|
| Beginner | Strength/Hypertrophy | Linear (LP) | Gradual weekly increase, simple to follow |
| Intermediate, strength | Strength | DUP (3-4 days) | Daily undulation: Hypertrophy -> Power -> Strength within the same week |
| Intermediate, hypertrophy | Hypertrophy | DUP/WUP (4-5 days) | Vary reps week-to-week or day-to-day |
| Advanced, peaking | Max Strength | BUP (block periodization) | 3-week blocks: Accumulation -> Intensification -> Realization |

**DUP day structure (HPS order):**
- **Hypertrophy day:** 4x8-10 @ 65-70% 1RM, RPE 7-8, 90s rest
- **Power day:** 5x3 @ 75-80% 1RM, RPE 6-7 (maximal speed), 2-3 min rest
- **Strength day:** 5x3-5 @ 85-90% 1RM, RPE 8.5-9, 3-5 min rest

**BUP 3-week block:**
- Week 1 (Accumulation): 4-5x8-10 @ 65-75%, RPE 7-8, high volume
- Week 2 (Intensification): 4-5x4-6 @ 75-85%, RPE 8-8.5, -20% volume
- Week 3 (Realization): 3-5x1-3 @ 85-95%, RPE 8.5-9.5, -40% volume

**Intra-session undulation (within the same session):**
Order: Neurological -> Mechanical -> Metabolic
1. Heavy compound: Squat 5x3 @ 85% (strength)
2. Moderate compound: Leg Press 3x12 @ 65% (hypertrophy)
3. Isolation: Leg Curl 3x15-20 @ RPE 9-10 (metabolic stress)

### Equipment-limited alternatives (dumbbells/bodyweight):
If the athlete does NOT have access to a barbell, use these substitutes:
| Barbell exercise | Dumbbell alternative | Bodyweight alternative |
|-----------------|------------------|----------------------|
| Squat | Bulgarian Split Squat (85-90% EMG) | Pistol Squat (80-85%) |
| Deadlift | Single-Leg RDL (85-90%) | Nordic Hamstring Curl (95-100%) |
| Bench Press | DB Bench Press (95-100%) | Ring/Suspension Push-Up (90-105%) |
| Shoulder Press | Seated Arnold Press (95-100%) | Handstand Push-Up (90-95%) |
| Row | Single-Arm DB Row (90-95%) | Inverted Row (110-160%) |
| Hip Thrust | Single-Leg DB Hip Thrust (95-105%) | Single-Leg Glute Bridge (70-80%) |

**Progression strategies without increasing load:**
- Tempo manipulation: 4-0-1-0 (4 sec eccentric) drastically increases TUT
- Paused reps: 3-5 sec pause at the bottom removes the stretch reflex
- 1.5 reps: Full descent -> halfway up -> down again -> all the way up = 1 rep
- Mechanical drop sets: Harder variation -> easier variation without rest (e.g. flyes -> push-flyes -> press)
- Unilateral progression: Move from bilateral to single-limb execution

**Volume prescription by equipment:**
| Equipment | Reps per set | Sets/muscle group/week | RPE | Rest |
|------------|-------------|----------------------|-----|------|
| Barbell (controlled) | 5-8 | 10-15 | 7.5-9 | 120-180s |
| Dumbbells (max 40 kg) | 8-15 | 12-18 | 8-9.5 | 90-120s |
| Bodyweight | 15-30+ | 15-20 | 9-10 | 60-90s |

### Advanced methods (for intermediate/advanced athletes):
Use these SPARINGLY - max 1-2 methods per program, for compound exercises:

**Wave loading (post-tetanic potentiation):**
- 3/2/1 wave: 3 reps @ 88%, 2 reps @ 91%, 1 rep @ 94% -> repeat with +2-3%
- 7/5/3 wave: 7 reps @ 80%, 5 reps @ 85%, 3 reps @ 90%
- 1-6 contrast: 1 rep @ 90-95%, rest, then 6 reps @ 75-85% (potentiation makes the set easier)
- Rest: 3-5 min between all sets. Max 2-4 waves per session.

**Cluster sets (intra-set rest):**
- Strength: Singles/doubles @ 80-85% 1RM, 15-30s rest between reps
- Hypertrophy: 3-5 reps @ 70-75% 1RM, 15-20s rest, repeat until 20-30 total reps

**Myo-reps (time-efficient hypertrophy):**
1. Activation set: 12-15 reps to 1-2 RIR
2. Rest 10-15 sec (3-5 deep breaths)
3. Mini-set: 3-5 reps @ 1-2 RIR
4. Repeat until 5 mini-sets or reps drop

**Contrast/complex training (strength -> explosiveness):**
- Heavy compound @ >80% 1RM, 3-4x3-4 reps -> rest 3-5 min -> plyometric exercise 3-5 reps
- Pairings: Squat -> Box Jump | Bench Press -> Plyometric Push-up | Deadlift -> Broad Jump

### Nutrition for strength training:
- **Protein:** 1.6-2.2 g/kg/day (2.3-3.1 g/kg during calorie deficit)
- **Distribution:** 4 meals x 0.25-0.40 g/kg protein (at least 2.5g leucine per meal)
- **Pre-session (2-3h):** 1-2 g/kg carbohydrates + 0.25 g/kg protein
- **Post-session (within 2h):** 0.3-0.4 g/kg protein + carbohydrates 1:1
- **Before sleep:** 30-40g casein for overnight muscle protein synthesis
- **Creatine:** 3-5 g/day consistently (daily consistency matters more than timing)
- **Caffeine:** 3-6 mg/kg, 60 min before session (improves strength ~3%)

{{/endif}}

{{#if_category ENDURANCE}}
## ENDURANCE TRAINING & ZONES

### 3-zone model:
- **Zone 1 (Low, <2 mmol/L):** Can speak comfortably, 55-75% maxHR -> 75-80% of training
- **Zone 2 (Threshold, 2-4 mmol/L):** Can speak with effort, 75-88% maxHR -> minimize during base phase
- **Zone 3 (High, >4 mmol/L):** Cannot speak, 88%+ maxHR -> 15-20% of training

### Zone distribution by methodology:
| Methodology | Zone 1 | Zone 2 | Zone 3 |
|---------|-------|-------|-------|
| Polarized (80/20) | 80% | 0-5% | 15-20% |
| Pyramidal | 70-80% | 15-25% | 5-10% |
| Norwegian double threshold | 75-80% | Main focus | Occasional |

### Interval protocols:
- **4x8 min:** 8 min work @ 90-92% maxHR, 2 min jog rest (Seiler gold standard)
- **30/15 micro:** 3 series of (13x30s ON @ 110% vVO2max / 15s OFF), 3 min rest between series
- **Cruise intervals:** 4-6x1 mile @ threshold pace, 1 min jog rest
- **10-20-30:** Repeated 10s sprint, 20s tempo, 30s jog

### Important limits:
- **Long-session ceiling:** Max 2.5-3h per session (diminishing returns after that)
- **Cardiac drift:** <5% = strong aerobic base, >10% = insufficient conditioning

{{#if_methodology POLARIZED}}
### POLARIZED METHODOLOGY (80/20):
- **80% of SESSION COUNT** (not time) should be Zone 1 - easy, conversational pace
- **20% of session count** Zone 3 - high intensity, intervals
- **AVOID the gray zone** - zone 2 should be max 5% of total training
- **Gold standard:** 4x8 min intervals @ 90-92% maxHR, 2 min active rest
- Build the aerobic base FIRST, introduce intensity gradually
{{/endif}}

{{#if_methodology NORWEGIAN}}
### NORWEGIAN DOUBLE THRESHOLD:
- **2x threshold sessions per week** (clustered - AM + PM same day or consecutive days)
- **AM session:** Long intervals at 2-3 mmol/L lactate (threshold work)
- **PM session:** Short intervals at 3-4 mmol/L lactate (suprathreshold)
- **Requires 120+ km/week running volume** as a base
- Other training: Zone 1 easy sessions
- Threshold training builds more mitochondria per unit of time
{{/endif}}

{{#if_methodology CANOVA}}
### CANOVA METHODOLOGY (Marathon):
- **Extension principle:** Extend the distance at race pace, do NOT increase the pace
- **Special blocks (double sessions):** AM: 15 km race pace, PM: 10 km steady
- **Taper:** Week 1: -20% volume, Week 2: -40%, Week 3: -60%
- **Simulation session:** Every 3rd week - 30-35 km with race-pace segments
- Start with short marathon-pace segments, extend gradually
{{/endif}}

{{/endif}}

{{#if_category HYBRID}}
## CONCURRENT TRAINING (STRENGTH + ENDURANCE)

### Separation for combined training:
- **Beginner:** Strength and endurance on DIFFERENT days, at least 24h apart
- **Intermediate:** Same day possible with 6-9h between sessions. AM: Endurance, PM: Strength
- **Advanced:** Same day with 6h gap, strength FIRST if back-to-back

### Order rule: Strength FIRST if on the same day, then easy endurance 6-8h later
### Protein need: 1.6-2.2 g/kg bodyweight during concurrent training

### HYROX-specific:
**Stations and gym transfer:**
- **Sled Push:** Deadmill pushes, heavy sleds, incline walking with weighted vest
- **Sled Pull:** Seated cable rows, rowing machine burst intervals
- **Wall Balls:** Goblet squat + wall ball, thrusters
- **SkiErg:** SkiErg intervals, cable pulldowns with tempo
- **Farmers Carry:** Farmers walks with kettlebells/dumbbells

**Pace degradation after stations:**
- Post-SkiErg: +0-5 sec/km
- Post-Sled Push: +15-30 sec/km (large lactate accumulation)
- Post-Burpees: +10-15 sec/km (maximal heart rate)
- Post-Lunges (last station): Survival pace

**Train "compromised running"** - running on tired legs after heavy stations

### Nutrition for concurrent/HYROX:
- **Interference effect:** Endurance training activates AMPK, which inhibits mTORC1 (muscle building)
- **Countermeasure:** Fill glycogen BEFORE strength sessions, take 2.5-3g leucine (25-30g whey) BETWEEN sessions
- **Carbohydrates by phase:**
  - Base phase (3-5h/week): 3-5 g/kg/day
  - Build phase (6-12h/week): 5-8 g/kg/day
  - Peak phase (12h+/week): 8-12 g/kg/day
- **Intra-session (>60 min):** 30-60 g carbohydrates/hour + 300-600 mg sodium/hour
- **Post-session:** 4:1 carbohydrate:protein ratio (1.0-1.2 g/kg carbohydrates + 0.3 g/kg protein)

{{/endif}}

{{#if_category TEAM_SPORT}}
## TEAM SPORT PERIODIZATION

### Match-day periodization:
- **MD-3 (3 days before match):** High intensity, strength + explosiveness
- **MD-2:** Tactics + tempo, low physical load
- **MD-1:** Activation, short sprint work, rest priority
- **MD+1 (day after match):** Active recovery, pool, easy bike

### Pre-season vs in-season:
- **Pre-season (6-8 weeks):** Focus on aerobic base, max strength, hypertrophy
- **In-season:** Maintenance training - 2 sets/exercise, 2x/week strength, explosiveness focus

### Key qualities:
- Sprint: 10-30m acceleration, repeated sprint ability (RSA)
- Explosiveness: Plyometrics, CMJ, reactive strength
- Conditioning: Intervals that mirror match intensity (4x4 min, 30/30)
- Strength: Maintenance with 2-3 sets of foundational lifts

{{/endif}}

---

## OUTPUT FORMAT

Always answer in English. Return a complete program as JSON:

\`\`\`json
{
  "name": "Program name",
  "description": "Short description of the program and its purpose",
  "totalWeeks": {{totalWeeks}},
  "methodology": "{{methodology}}",
  "weeklySchedule": {
    "sessionsPerWeek": {{sessionsPerWeek}},
    "restDays": [0, 6]
  },
  "phases": [
    {
      "name": "Phase name (e.g. Anatomical Adaptation / Base Phase / Hypertrophy Phase)",
      "weeks": "1-4",
      "focus": "Main focus for the phase",
      "keyWorkouts": ["Key session 1", "Key session 2"],
      "volumeGuidance": "Total weekly volume and intensity distribution",
      "weeklyTemplate": {
        "monday": {
          "type": "STRENGTH",
          "name": "Session name",
          "duration": 60,
          "intensity": "moderate",
          "description": "Detailed description with exercises, sets, reps, rest, RPE",
          "segments": [
            {"order": 1, "type": "warmup", "duration": 10, "description": "RAMP: easy cardio + dynamic mobility + activation"},
            {"order": 2, "type": "work", "duration": 40, "description": "Main set: Exercise 1: 3x8 @ RPE 7, rest 90s. Exercise 2: ..."},
            {"order": 3, "type": "cooldown", "duration": 10, "description": "Stretching + breathing exercise"}
          ]
        },
        "tuesday": { "type": "REST", "description": "Rest or easy walk" }
      }
    }
  ],
  "notes": "General comments, progression rules, deload schedule"
}
\`\`\`

### IMPORTANT OUTPUT RULES:
1. EVERY training session MUST have segments with warmup, work, and cooldown
2. Be SPECIFIC with exercises, sets, reps, tempo, rest, and intensity (RPE/RIR or %1RM)
3. Include rest day(s) every week
4. State progression rules in notes or volumeGuidance
5. Adapt to experience level - beginners get simpler exercises and longer rest
6. Include deload weeks in longer programs (>6 weeks)
7. Ensure biomechanical balance - push/pull, bilateral/unilateral, anterior/posterior
8. Provide tempo notation for strength exercises (e.g. 3-0-X)
`
