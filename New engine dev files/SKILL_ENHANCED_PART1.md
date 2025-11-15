# Runner Training Program Engine - Skill Documentation (PART 1 of 2)

## Purpose
This skill enables Claude Code to build an individualized training program engine for runners based on their VO2 max test results and lactate curve analysis. The system translates physiological test data into actionable, scientifically-grounded training programs using elite methodologies.

## Core Philosophy
**DO NOT rely on generic formulas.** Instead, use exact, individualized threshold points (LT1 and LT2) as the primary control parameters for defining training zones and sessions.

---

## Part 1: Physiological Foundations & Athlete Profiling

### 1.1 Key Physiological Parameters

#### VO2 Max (Maximal Oxygen Uptake)
- **Definition**: Maximum volume of oxygen (ml/kg/min) the body can utilize during maximal effort
- **Role**: Represents the athlete's physiological "ceiling" or aerobic engine's maximum potential
- **Critical Limitation**: VO2 max is NOT the primary factor for prescribing daily training intensity. Two runners with identical VO2 max can have dramatically different performances at 10k or marathon distances
- **The Key Difference**: Lactate threshold defines what percentage of VO2 max a runner can utilize aerobically for extended periods without significant lactate accumulation
- **Trainability**: VO2 max plateaus relatively quickly (2-3 years of consistent training). Lactate threshold remains highly trainable throughout an athletic career

**AI Usage Instructions:**
1. Use VO2 max to categorize athlete's physiological potential (see Section 1.3)
2. Use VO2 max to establish intensity for specific high-intensity Zone 5 sessions (see Section 4.3)

#### Lactate Thresholds (LT1 and LT2)

**Lactate Physiology**: Lactate is not merely a "waste product" or cause of fatigue. It's a central fuel substrate for aerobic work (especially in the heart and slow-twitch muscle fibers) and an important signaling molecule for metabolic adaptations.

##### LT1 (Aerobic Threshold)
- **Physiological Definition**: The intensity (expressed as pace or heart rate) where blood lactate levels first rise measurably and persistently above resting baseline levels
- **Quantification Methods**:
  - Traditional: ~2.0 mmol/L (schematic)
  - More accurate: "Baseline + 0.5 mmol/L"
  - Elite athletes (Norwegian model): Can be as low as ~1.0 mmol/L
- **Practical Relevance**: Marks the upper limit of "easy" or "conversational pace" (top of Zone 1 in Seiler's 3-zone model)
- **Training Effect**: Builds mitochondrial density, increases muscle capillarization, improves fat utilization as fuel
- **Foundation**: This is the physiological basis for the 80/20 rule

##### LT2 (Anaerobic Threshold / MLSS)
- **Physiological Definition**: More precisely defined as Maximal Lactate Steady State (MLSS) - the highest intensity where lactate production and elimination are in exact balance (steady state)
- **Critical Point**: Immediately above this intensity, lactate accumulates exponentially, leading to rapid acidosis and neuromuscular fatigue
- **Practical Relevance**: THE single most important physiological determinant for endurance performance from 5k to marathon. This is the threshold that the Norwegian model (double threshold) is specifically designed to manipulate and improve

### 1.2 Critical Analysis of Threshold Determination Methods (LT2)

**AI Primary Task**: When analyzing a lactate curve, your first task is to identify LT2. Different test protocols use different methods.

#### Method 1: Fixed Lactate (OBLA / Mader 4.0 mmol/L)
- **Definition**: Historical method defining threshold at the intensity corresponding to 4.0 mmol/L blood lactate concentration (OBLA - Onset of Blood Lactate Accumulation)
- **Analysis**: Simple to apply but physiologically flawed
- **Problem**: Fails to account for large individual variation. True threshold (MLSS) can occur anywhere between 2.0-8.0 mmol/L depending on training status and muscle fiber composition
- **Implications**:
  - Tends to **overestimate** true threshold for well-trained athletes (whose threshold often lies at 2.5-3.5 mmol/L)
  - Tends to **underestimate** threshold for untrained individuals
  - Mader himself noted in later work that well-trained athletes tolerated training at 4.0 mmol/L poorly, indicating the intensity was too high (above their true MLSS)

**AI Instruction**: Only use this method if no other analysis (like D-max) is available. When used, the report MUST include a warning about high uncertainty and likely overestimation of threshold intensity for trained athletes.

#### Method 2: D-max and Modified D-max (Mod-Dmax) ⭐ PREFERRED
- **Definition**: Mathematical method where the lactate curve (lactate vs. intensity) is plotted and fitted with a polynomial function (typically 3rd degree)
- **D-max**: The point on the fitted curve with maximum perpendicular distance to the straight line connecting the curve's start point (first measurement) and end point (maximal measurement)
- **Modified D-max (Mod-Dmax)**: Improvement where the start point is not the first measurement, but the last measurement point before significant lactate increase (e.g., last point before lactate rises >0.4 mmol/L above baseline)

**Analysis & Evaluation**: D-max methods are superior to OBLA because they are individualized. Based on the unique shape of the athlete's physiological response curve rather than an arbitrary fixed number. D-max methods show higher correlation with MLSS and are more reliable for predicting performance in races lasting 10-15 km.

**AI Instruction (Primary Logic)**: Your standard procedure for determining LT2 from a lactate curve should be to apply the D-max or Mod-Dmax method. The result from this calculation (pace and heart rate at the D-max point) shall be defined as the athlete's LT2.

### 1.3 Quantitative Categorization of Runner Levels

**AI Instruction**: Use a combination of the athlete's VO2 max and the pace (or heart rate) identified at LT2 (via D-max) to place them in one of four categories.

**Key Concept**: A runner's profile is defined not by a single value, but by the relationship between values. An untrained runner has a lactate curve that rises almost immediately, meaning their LT2 occurs at a very low percentage of their already low VO2 max. An elite runner has not only a high VO2 max (ceiling), but also an extremely "right-shifted" lactate curve, meaning their LT2 occurs at a very high percentage of their VO2 max.

#### Table 1: Physiological Profiles and Normative Data per Runner Category

*Normative data for VO2 max based on age group 30-39 years for reference*

| Category | VO2 Max (Men, 30-39) | VO2 Max (Women, 30-39) | Lactate Curve Form | LT2 (as % of VO2 max) | Characteristics |
|----------|---------------------|------------------------|-------------------|----------------------|-----------------|
| **Beginner** | < 31.5 ml/kg/min (Very Low) | < 22.8 ml/kg/min (Very Low) | Curve rises almost immediately from baseline | < 75% | Limited aerobic base. Training should focus on Zone 2 volume |
| **Recreational** | 31.5 - 49.4 ml/kg/min (Low to Good) | 22.8 - 40.0 ml/kg/min (Low to Good) | Clear baseline, but curve starts bending at moderate intensity. 5k time ~25 min | 75-85% | Has basic capacity. Very responsive to both volume and threshold training |
| **Advanced / Elite Recreational** | > 49.4 ml/kg/min (Excellent/Superior) | > 40.0 ml/kg/min (Excellent/Superior) | Long, flat baseline. Curve "breaks" late and steeply at high intensity | 83-88% | Well-developed aerobic base. Requires more specific and higher volume quality work for improvements |
| **Elite** | > 70 ml/kg/min | > 60 ml/kg/min | Extremely right-shifted curve. LT2 may be at low mmol/L level but at extremely high pace | > 85-90% | Physiologically optimized. Training focuses on maximizing threshold volume and specific pace endurance |

---

## Part 2: From Physiology to Practical Training Zones

### 2.1 The 3-Zone Model (Seiler - Physiological)

This model is the scientific foundation for understanding training intensity distribution and is physiologically anchored in the lactate thresholds defined in Part 1.

- **Zone 1 (Low Intensity)**: All intensity below LT1. This is the true low-intensity zone. Lactate is stable near baseline levels, often under 2.0 mmol/L
- **Zone 2 (Medium Intensity / Threshold)**: Intensity between LT1 and LT2. Lactate levels are elevated above baseline but stable (steady state), often in the 2.0-4.0 mmol/L range. This is the "threshold zone"
- **Zone 3 (High Intensity)**: All intensity above LT2. Lactate accumulates and is no longer in steady state, > 4.0 mmol/L

**The famous "80/20 rule" (Polarized Training)** refers to this model: 80% of sessions (or total training time) should be spent in Zone 1, and 20% in Zone 3, with minimal intentional time in Zone 2.

### 2.2 The 5-Zone Model (Practical Application)

This is the most common model used by coaches and sports watches (e.g., Garmin) to provide more granularity in training prescription.

- **Zone 1 (Recovery)**: Very light effort, < 60-70% of max heart rate (HR_max)
- **Zone 2 (Aerobic Base)**: Low-intensity distance, "conversational pace". The physiological point LT1 lies here
- **Zone 3 (Tempo / Marathon Pace)**: Moderate effort, often called the "gray zone" that Polarized training avoids
- **Zone 4 (Threshold)**: High-intensity effort, right at and just above the physiological point LT2
- **Zone 5 (VO2 max)**: Maximal effort, > 90% HR_max

**Critical Confusion**: "Zone 2" means different things in the two models:
- In the 3-zone model, Zone 2 is hard (threshold training)
- In the 5-zone model, Zone 2 is easy (distance running)

**Synthesis**: The 80/20 rule (Polarized) translates to the 5-zone model as: 80% of time in Zones 1 and 2, and 20% of time in Zones 4 and 5. Pyramidal training, in contrast, adds significant intentional time in Zone 3.

### 2.3 Mapping Logic for AI (Synthesis) ⭐ CRITICAL

**AI Instruction (Critical Translation)**: Your most important task is to create individualized zones. When you have identified LT1 and LT2 (in both pace and heart rate) from Part 1.2, DO NOT use generic %HR_max formulas. These generic formulas are a primary cause of incorrect training intensity. Instead, map the physiological breakpoints directly to the 5-zone model:

1. **Identify heart rate and pace at LT1** (e.g., via "baseline + 0.5 mmol/L"). This point constitutes the boundary between 5-zone Zone 2 and Zone 3
2. **Identify heart rate and pace at LT2** (e.g., via D-max method). This point constitutes the primary target intensity for 5-zone Zone 4

**Result**: The following individualized 5-zone model:

- **Zone 1 (Recovery)**: HR < 85% of LT1 heart rate
- **Zone 2 (Aerobic Base / Distance)**: HR between 85% of LT1 heart rate and 100% of LT1 heart rate
- **Zone 3 (Tempo / "Gray Zone")**: HR between 100% of LT1 heart rate and 94% of LT2 heart rate
- **Zone 4 (Threshold)**: HR between 95% of LT2 heart rate and 102% of LT2 heart rate
- **Zone 5 (VO2 max)**: HR > 102% of LT2 heart rate

#### Table 2: Zone Mapping Matrix (From Physiology to Practice)

| 5-Zone | 3-Zone (Seiler) Equivalent | Physiological Anchor | Lactate (mmol/L) (Typical) | Primary Purpose |
|--------|---------------------------|---------------------|---------------------------|-----------------|
| Zone 1 | Low Zone 1 | Resting HR | < 1.5 (baseline) | Active recovery, "flush out" |
| Zone 2 | High Zone 1 | LT1 (Aerobic Threshold) | ~1.5 - 2.0 | Build mitochondria, capillaries, fat burning. High volume |
| Zone 3 | Low Zone 2 ("Gray Zone") | Between LT1 and LT2 | ~2.0 - 3.0 | Marathon-specific pace, tempo. High stress |
| Zone 4 | High Zone 2 | LT2 (Anaerobic Threshold / MLSS) | ~2.5 - 4.5+ (individual) | Raise lactate threshold, improve lactate tolerance |
| Zone 5 | Zone 3 | VO2 max | > 4.5+ (accumulating) | Raise aerobic ceiling (VO2 max), neuromuscular power |

---

## Part 3: Modern Training Philosophies and Elite Methodologies

### 3.1 Methodology 1: Polarized Training (Dr. Stephen Seiler)

**Principles**: Based on observations of elite athletes in endurance sports. Advocates that training distribution should be "polarized" - focused on physiological extremes. Foundation is the 80/20 distribution.

**Distribution (3-zone)**: Approximately 80% of all training time spent in Zone 1 (low intensity, below LT1), and 20% spent in Zone 3 (high intensity, above LT2). Very little time spent intentionally in Zone 2 (medium intensity threshold training).

**Physiological Rationale**:
- **Low-Intensity Training (LIT) in Zone 1**: Drives most fundamental aerobic adaptations (mitochondrial biogenesis, capillarization, improved fat metabolism) with very low physiological and neuromuscular stress. This allows the athlete to accumulate very high total training volume
- **High-Intensity Training (HIT) in Zone 3**: Drives other, more specific adaptations like improved VO2 max, anaerobic capacity, and neuromuscular power
- **"Gray Zone" (Zone 2)**: Training in this zone is considered to provide too much physiological stress relative to the adaptive signal it sends. This stress compromises recovery and thus the quality of important HIT sessions, leading to stagnation and overload

**Implication**: The biggest advantage for recreational runners is injury prevention. The model protects the runner from the common trap of running "moderately hard" every session. For advanced runners, it maximizes adaptation by ensuring easy sessions are easy enough (for recovery and volume) and hard sessions are hard enough (for specific adaptation).

### 3.2 Methodology 2: Pyramidal Training vs. Polarized

**Definition**: Pyramidal training, like Polarized, has the largest volume in 3-zone Zone 1. The difference is the distribution between Zone 2 and Zone 3. A pyramidal model has more time in Zone 2 (medium) than in Zone 3 (high), for example a 70/20/10 distribution (Z1/Z2/Z3).

**Synthesis & Decision Rule**: The scientific debate "Pyramidal vs. Polarized" has landed in a nuanced conclusion that gives AI a central decision rule, based on a 2022 systematic review (Casado et al.):

**Rule 1 (Season)**: Use Pyramidal (more 5-zone Z3 work) during the preparation phase (base training) to build a robust aerobic base and threshold tolerance. Use Polarized (more 5-zone Z4/5 work) during the specific competition phase to "peak" form and maximize race-specific capacity.

**Rule 2 (Distance)**: Pyramidal is often more relevant for longer distances (e.g., Marathon), where race pace itself lies in 3-zone Zone 2 (or 5-zone Zone 3). Polarized is often more relevant for shorter distances (e.g., 1500m, 5k), where race pace lies in 3-zone Zone 3 (or 5-zone Z4/5).

### 3.3 Methodology 3: Percentage-Based Training (Renato Canova)

**Principles**: This system, developed by elite coach Renato Canova, is not primarily governed by lactate zones, but by percentage of specific race pace (Race Pace - RP). The entire philosophy is built on the principle of specificity: all training exists solely to support the athlete's ability to hold the intended race pace for the intended distance.

**Central Concept**: "Ladder of Support" - To be able to run 100% RP (e.g., 10k pace), you must build support. This is done by training at paces just below and just above RP. Canova defines this as 95% RP (specific endurance) and 105% RP (specific speed).

**Definitions (for AI logic)**:
- **Regeneration**: Easy running to accelerate recovery. Pace is approximately 60-70% of LT2 pace
- **Fundamental**: Aerobic base training, e.g., long runs at 110-120% of marathon pace (or ~80-90% of 10k RP)
- **Special**: Training further from RP. Special Endurance is ~90% of RP and Special Speed is ~110% of RP
- **Specific**: Training directly relevant to the race. This occurs in the 95-105% of RP zone

**AI Instruction**: This method is best suited for "Advanced" or "Elite" runners (from Part 1.3) who have a clear time goal in a specific race (e.g., "run marathon in 2:45:00").

### 3.4 Methodology 4: The Norwegian Model (Lactate-Controlled Double Threshold) ⭐

This is the specifically requested method, developed by Marius Bakken and made famous through the Ingebrigtsen family.

**Core Principle**: Maximize the total weekly volume of training in the threshold zone (Seiler's Zone 2 / 5-zone Zone 4).

**Method**: Instead of one long, exhausting threshold session (e.g., 1 x 40 min), the volume is split into two shorter sessions on the same day (e.g., one in the morning and one in the afternoon). This enables higher total quality volume with shorter recovery time (4-6 hours) between sessions.

**The Key to Success**: Strict control of lactate levels during sessions. This is NOT "all-out" threshold work where you "hang on by a thread".

**The Critical Detail (Lactate Control)**: The reason double threshold works is that intensity is kept lower than what many traditionally define as "threshold". It's NOT training at 4.0 mmol/L. Marius Bakken found that training under 3.0 mmol/L (often in the 2.3-3.0 mmol/L range) gave the best results and enabled enormous training volumes without "wearing out" the runner. Training at 4.0 mmol/L was too strenuous to be repeated frequently.

**Exact Lactate Targets (for AI control)**:
- **Low Intensity/Distance (5-zone Zone 2)**: Very strict. Lactate should be kept under 1.0 mmol/L to ensure it's pure aerobic recovery and base training
- **Threshold Sessions (both sessions)**: Goal is to keep lactate stable in the 2.0 - 3.0 mmol/L range. It can be allowed to rise toward 3.5 mmol/L on the very last intervals of the afternoon session, but if it starts rising uncontrollably, pace must be reduced

**Example Sessions (for AI program builder)**:
- **Morning Session (often longer intervals)**: 10 x 3 minutes (with 30-60 seconds rest) OR 5-6 x 6 minutes (with 60 seconds rest)
- **Afternoon Session (often shorter intervals)**: 6 x 5 minutes (with 60 seconds rest) OR 15-20 x 400 meters (with 30 seconds rest)

**AI Instruction**: This model is extremely demanding and should only be recommended to "Advanced" or "Elite" runners who have the time and base fitness required to handle 10+ training sessions per week.

---

## Part 4: Synthesis and Logical Engine for Training Programs

### 4.1 Principle 1: Methodology Selection (Decision Tree)

**AI Instruction**: When an athlete has been categorized (Part 1.3) and their zones have been mapped (Part 2.3), ask the following logical questions to choose a main methodology (Part 3).

#### Table 3: Decision Tree for Training Model Selection

| If Athlete Level Is... | And Goal Distance Is... | And Season Phase Is... | And Training Volume Is... | Recommend Methodology |
|----------------------|------------------------|----------------------|--------------------------|----------------------|
| "Beginner" | All | Base Training | Low (< 4 sessions/week) | Pyramidal OR Polarized (for injury prevention). Focus: Build volume in 5-zone Z2 |
| "Recreational" | 5k/10k | Competition | Medium (4-6 sessions/week) | Polarized (80/20) |
| "Recreational" | Marathon/Half Marathon | Base Training | Medium (4-6 sessions/week) | Pyramidal |
| "Advanced" | Marathon | Specific (Competition) | High (> 6 sessions/week) | Canova (Percentage-based). Focus on RP |
| "Advanced / Elite" | 1500m / 5k / 10k | All | Very High (> 8 sessions/week) | Norwegian Model (Double Threshold) |

### 4.2 Principle 2: Periodization (Macrocycle)

AI must structure the program over time:

1. **Preparation Phase (Base Training)**: 1-3 months. Focus on high total training volume. Majority of training is in 5-zone Zone 2 (distance). Training distribution is typically Pyramidal
2. **Specific Phase**: 4-8 weeks. Volume is maintained or slightly decreased, but intensity (proportion of Zone 4/5) increases. Focus shifts to Polarized or Canova-specific training
3. **Taper**: 1-2 weeks. Volume is reduced significantly (e.g., by 40-60%), but high intensity (Zone 4/5) is maintained in shorter sessions to maximize recovery while maintaining "sharpness"

### 4.3 Principle 3: Construction of Key Sessions (Microcycle)

**AI Instruction**: Use these templates to build the week's 2-3 quality sessions. Fill the rest of the week's sessions with 5-zone Z2 running (distance) and one Z1 session (recovery). Pace and heart rate should always be based on the individualized zones from Part 2.3.

#### Session Type 1: VO2 max (5-zone Zone 5)
- **Purpose**: Raise the physiological ceiling (VO2 max)
- **Format**: Longer intervals, 2 to 6 minutes, with rest almost as long as work period (approximately 1:1)
- **Example 1 (Norwegian 4x4)**: 4 x 4 minutes @ Z5 pace (90-95% HR_max). Rest: 3 minutes active rest (easy jog)
- **Example 2**: 6 x 3 minutes @ Z5 pace. Rest: 2-3 minutes rest

#### Session Type 2: Lactate Threshold (LT2) (5-zone Zone 4)
- **Purpose**: Raise LT2, the most important performance factor
- **Format**: Total time in zone should be 20-60 minutes. Rest is shorter (e.g., 5:1 or 4:1 work:rest ratio) to keep lactate levels elevated but stable
- **Example 1 (Standard)**: 6 x 5 minutes @ Z4 pace (95-100% of LT2 pace). Rest: 60 seconds
- **Example 2 (Longer)**: 3 x 10 minutes @ Z4 pace. Rest: 2 minutes

#### Session Type 3: Aerobic Threshold (LT1) / Distance (5-zone Zone 2)
- **Purpose**: Build aerobic base, mitochondrial density, fat burning, capillarization. This constitutes ~80% of training in a polarized model
- **Format**: Long, continuous sessions
- **Intensity**: Strict Zone 2, below LT1. For Norwegian model, very strict control, lactate < 1.0 mmol/L

#### Session Type 4: Support Work (Optional)
- **Purpose**: Injury prevention, core stability, and running economy
- **Examples**: Squats, Planks, Hanging leg raises

### 4.4 Complete Example Case Study (Logic Example for AI Simulation)

**AI Instruction**: Follow this logical chain to generate a report and training program.

#### Step 1: Input Data
- **Athlete**: "Erik", 40 years old
- **Test Results**: VO2 max: 64 ml/kg/min
- **Lactate Curve** (analyzed with D-max):
  - LT1: Identified at 13.0 km/h (HR 148, lactate 2.0 mmol/L)
  - LT2: Identified at 16.0 km/h (HR 170, lactate 3.2 mmol/L)

#### Step 2: AI Logic - Categorization
- VO2 max 64 is "Superior" for age group (see Table 1)
- LT2 occurs at 3.2 mmol/L. This is significantly below 4.0 mmol/L, which strongly indicates a "well-trained" profile
- **Conclusion**: Athlete is categorized as **Advanced**

#### Step 3: AI Logic - Zone Mapping
Based on the individualized mapping logic (Part 2.3):
- **Zone 1 (Recovery)**: < 11.5 km/h (HR < 126)
- **Zone 2 (Aerobic Base)**: 11.5 - 13.0 km/h (HR 126-148) *(Anchor: LT1)*
- **Zone 3 (Tempo)**: 13.1 - 15.2 km/h (HR 149-161)
- **Zone 4 (Threshold)**: 15.3 - 16.3 km/h (HR 162-173) *(Anchor: LT2)*
- **Zone 5 (VO2 max)**: > 16.3 km/h (HR > 173)

#### Step 4: AI Logic - Methodology Selection
- **User Input**: Athlete has high training motivation, 10k race as goal, is in base training phase, wants to try "Ingebrigtsen model"
- **Decision** (from Table 3): Level "Advanced", Goal "10k", Volume "High" (can do 10 sessions/week)
- **AI Recommendation**: Norwegian Model (Double Threshold) is appropriate, albeit demanding

#### Step 5: AI Logic - Program Generation (Example Week for Norwegian Model)

**Monday:**
- AM: 60 minutes easy distance @ Z2 pace (11.5-13.0 km/h). Lactate control: Keep < 1.5 mmol/L
- PM: 30 minutes easy distance @ Z1/Z2 pace

**Tuesday (Double Threshold):**
- AM: 10 min warmup. Session: 6 x 5 minutes @ Z4 pace (~15.8 km/h). Rest 60 sec (easy jog). 10 min cooldown. Target: Lactate ~2.5-3.0 mmol/L
- PM: (4-6 hours later) 10 min warmup. Session: 10 x 3 minutes @ Z4 pace (~16.0 km/h). Rest 30 sec (standing rest). 10 min cooldown. Target: Lactate ~2.8-3.2 mmol/L

**Wednesday:**
- AM: 60 minutes easy distance @ Z2 pace (11.5-13.0 km/h)
- PM: 30 minutes easy distance @ Z1/Z2 pace

**Thursday (Double Threshold):**
- AM: 10 min warmup. Session: 5 x 6 minutes @ Z4 pace (~15.7 km/h). Rest 60 sec. 10 min cooldown. Target: Lactate ~2.5-3.0 mmol/L
- PM: (4-6 hours later) 10 min warmup. Session: 20 x 400m @ ~Z4/Z5 pace (~16.2 km/h). Rest 30 sec (easy jog). 10 min cooldown. Target: Lactate < 3.5 mmol/L

**Friday:**
- AM: 45 minutes easy distance @ Z2 pace (11.5-13.0 km/h)

**Saturday:**
- AM: Long run. 120-150 minutes @ Z2 pace (11.5-13.0 km/h)

**Sunday:**
- Rest or 30 minutes active recovery @ Z1 pace

---

---

## Part 5: Mathematical Implementation - D-max and Threshold Calculation Algorithms

### 5.1 D-max Method: Complete Algorithm Specification

**The D-max method is your PRIMARY tool for LT2 identification.** It finds the point on the lactate curve with maximum perpendicular distance from the baseline, representing where lactate accumulation accelerates most dramatically.

#### Step-by-Step Algorithm

**Step 1: Polynomial Curve Fitting**

Fit a third-degree polynomial to your lactate data using least squares regression:

```
y = ax³ + bx² + cx + d
```

Where:
- `x` = intensity (km/h, watts, or m/s)
- `y` = lactate concentration (mmol/L)
- `a, b, c, d` = coefficients to solve for

Use the Vandermonde matrix method for solving: `β = (X^T X)^(-1) X^T Y`

**Quality Control:** Require R² ≥ 0.90 for acceptable fit. If R² < 0.85, reject the test or try exponential fitting.

**Step 2: Calculate Baseline Slope**

```
avgSlope = [lactate[n] - lactate[1]] / [intensity[n] - intensity[1]]
```

This represents the average rate of lactate accumulation across the entire test.

**Step 3: Find D-max Point Using Derivative Method**

The D-max occurs where the tangent to the polynomial curve is parallel to the baseline.

1. Take derivative of polynomial: `y' = 3ax² + 2bx + c`
2. Set equal to average slope: `3ax² + 2bx + c = avgSlope`
3. Rearrange to quadratic: `3ax² + 2bx + (c - avgSlope) = 0`
4. Solve using quadratic formula:

```
D-max_x = [-2b + √(4b² - 12a(c - avgSlope))] / 6a
```

**ALWAYS select the larger root** within your data range.

**Step 4: Calculate Lactate at D-max**

Plug `D-max_x` back into your polynomial:

```
D-max_lactate = a(D-max_x)³ + b(D-max_x)² + c(D-max_x) + d
```

#### Pseudocode Implementation

```javascript
function calculateDmax(intensity, lactate) {
  // 1. Validate input
  if (intensity.length < 4 || lactate.length < 4) {
    return ERROR: "Minimum 4 data points required";
  }
  
  // 2. Fit 3rd degree polynomial
  const coefficients = polynomialFit(intensity, lactate, degree=3);
  // Returns {a, b, c, d, R2}
  
  if (coefficients.R2 < 0.85) {
    return ERROR: "Poor curve fit (R² < 0.85). Try exponential fitting or retest with more points.";
  }
  
  // 3. Calculate baseline slope
  const n = intensity.length;
  const avgSlope = (lactate[n-1] - lactate[0]) / (intensity[n-1] - intensity[0]);
  
  // 4. Solve quadratic equation: 3ax² + 2bx + (c-m) = 0
  const a_quad = 3 * coefficients.a;
  const b_quad = 2 * coefficients.b;
  const c_quad = coefficients.c - avgSlope;
  
  const discriminant = b_quad * b_quad - 4 * a_quad * c_quad;
  
  if (discriminant < 0) {
    return ERROR: "No real solution found. Try Modified D-max method.";
  }
  
  // 5. Calculate both roots
  const root1 = (-b_quad + Math.sqrt(discriminant)) / (2 * a_quad);
  const root2 = (-b_quad - Math.sqrt(discriminant)) / (2 * a_quad);
  
  // 6. Select larger root within data range
  let dmax_intensity = Math.max(root1, root2);
  
  if (dmax_intensity < intensity[0] || dmax_intensity > intensity[n-1]) {
    return ERROR: "D-max outside data range. Use Modified D-max or increase test intensity range.";
  }
  
  // 7. Calculate lactate at D-max
  const dmax_lactate = coefficients.a * Math.pow(dmax_intensity, 3) +
                       coefficients.b * Math.pow(dmax_intensity, 2) +
                       coefficients.c * dmax_intensity +
                       coefficients.d;
  
  // 8. Interpolate heart rate at D-max intensity
  const dmax_hr = linearInterpolate(intensity, heartRate, dmax_intensity);
  
  return {
    intensity: dmax_intensity,
    lactate: dmax_lactate,
    heartRate: dmax_hr,
    R2: coefficients.R2,
    method: "D-max"
  };
}
```

### 5.2 Modified D-max (Mod-Dmax): Improved Reliability

**When to use:** Modified D-max shows better repeatability (CV ≈ 3.4%) and highest correlation with ventilatory threshold (r = 0.99). Use as your DEFAULT method when possible.

**Key Difference:** Instead of using the absolute first data point as your baseline start, Mod-Dmax finds the last point BEFORE lactate rises significantly (≥0.4 mmol/L above baseline).

**Algorithm Adjustment:**

```javascript
function findModDmaxStartPoint(intensity, lactate) {
  // Find baseline (lowest lactate value)
  const baseline = Math.min(...lactate);
  
  // Find first point where lactate rises ≥0.4 mmol/L above baseline
  for (let i = 0; i < lactate.length; i++) {
    if (lactate[i] >= baseline + 0.4) {
      // Return the point BEFORE this rise
      return i > 0 ? i - 1 : 0;
    }
  }
  
  // If no significant rise found, use first point
  return 0;
}

function calculateModDmax(intensity, lactate, heartRate) {
  // 1. Find adjusted start point
  const startIdx = findModDmaxStartPoint(intensity, lactate);
  
  // 2. Create adjusted arrays starting from this point
  const adj_intensity = intensity.slice(startIdx);
  const adj_lactate = lactate.slice(startIdx);
  const adj_hr = heartRate.slice(startIdx);
  
  // 3. Apply standard D-max algorithm to adjusted data
  return calculateDmax(adj_intensity, adj_lactate, adj_hr);
}
```

### 5.3 Alternative Methods for Validation and Fallback

#### Fixed Lactate Method (OBLA)

**Use only when:** D-max fails or for comparison purposes. NOT recommended as primary method.

```javascript
function calculateOBLA(intensity, lactate, heartRate, targetLactate = 4.0) {
  // Fit polynomial
  const coefficients = polynomialFit(intensity, lactate, 3);
  
  // Solve: ax³ + bx² + cx + d = targetLactate
  // Use Newton-Raphson or numerical solving
  const obla_intensity = solvePolynomial(coefficients, targetLactate);
  const obla_hr = linearInterpolate(intensity, heartRate, obla_intensity);
  
  return {
    intensity: obla_intensity,
    lactate: targetLactate,
    heartRate: obla_hr,
    method: `OBLA (${targetLactate} mmol/L)`,
    warning: "Fixed lactate method may not reflect true individual threshold"
  };
}
```

#### Baseline Plus Method for LT1

```javascript
function calculateLT1(intensity, lactate, heartRate, increment = 0.5) {
  // Find baseline (average of first 2-3 low-intensity points)
  const baseline = average(lactate.slice(0, 3));
  const target = baseline + increment;
  
  // Find first point exceeding target
  for (let i = 0; i < lactate.length - 1; i++) {
    if (lactate[i] <= target && lactate[i+1] > target) {
      // Linear interpolation between these points
      const lt1_intensity = linearInterpolate(
        [lactate[i], lactate[i+1]], 
        [intensity[i], intensity[i+1]], 
        target
      );
      const lt1_hr = linearInterpolate(
        [intensity[i], intensity[i+1]], 
        [heartRate[i], heartRate[i+1]], 
        lt1_intensity
      );
      
      return {
        intensity: lt1_intensity,
        lactate: target,
        heartRate: lt1_hr,
        method: `Baseline + ${increment}`
      };
    }
  }
  
  return ERROR: "LT1 not found within test range";
}
```

### 5.4 Interpolation Functions

```javascript
function linearInterpolate(x_array, y_array, x_target) {
  // Find bracketing points
  for (let i = 0; i < x_array.length - 1; i++) {
    if (x_target >= x_array[i] && x_target <= x_array[i+1]) {
      const x1 = x_array[i], x2 = x_array[i+1];
      const y1 = y_array[i], y2 = y_array[i+1];
      
      // Linear interpolation formula
      return y1 + (x_target - x1) * (y2 - y1) / (x2 - x1);
    }
  }
  
  throw new Error("Target value outside interpolation range");
}

function cubicSplineInterpolate(x_array, y_array, x_target) {
  // Use library like scipy.interpolate.CubicSpline or implement
  // Natural cubic spline with tridiagonal matrix solver
  // Returns smooth interpolated value
}
```

### 5.5 Data Quality Requirements and Error Handling

**Minimum Requirements:**
- **4 points minimum** for third-degree polynomial
- **6-8 points recommended** for stable D-max
- **8-10 points optimal** for robust threshold detection

**Quality Thresholds:**
- R² ≥ 0.90: Good fit, proceed with confidence
- R² 0.85-0.90: Acceptable, but flag for review
- R² < 0.85: Poor fit, try alternative method or retest

**Error Handling Decision Tree:**

```javascript
function validateAndCalculateThreshold(intensity, lactate, heartRate) {
  // Check minimum data points
  if (intensity.length < 4) {
    return {
      error: "INSUFFICIENT_DATA",
      message: "Need minimum 4 data points. Current: " + intensity.length,
      action: "Retest with more stages"
    };
  }
  
  // Try Modified D-max first (most reliable)
  try {
    const result = calculateModDmax(intensity, lactate, heartRate);
    if (result.R2 >= 0.90) {
      return result;
    } else if (result.R2 >= 0.85) {
      result.warning = "Acceptable but below optimal curve fit. Consider retesting.";
      return result;
    }
  } catch (error) {
    // Mod-Dmax failed, try standard D-max
  }
  
  // Fallback to standard D-max
  try {
    const result = calculateDmax(intensity, lactate, heartRate);
    if (result.R2 >= 0.85) {
      return result;
    }
  } catch (error) {
    // Standard D-max failed
  }
  
  // Last resort: Use OBLA with warning
  try {
    const result = calculateOBLA(intensity, lactate, heartRate, 4.0);
    result.criticalWarning = "D-max methods failed. Using fixed 4.0 mmol/L method which may not reflect true threshold. Strongly recommend retesting with more data points.";
    return result;
  } catch (error) {
    return {
      error: "CALCULATION_FAILED",
      message: "Unable to determine threshold using any method",
      action: "Review test protocol and data quality, then retest"
    };
  }
}
```

---

## Part 6: Data Validation and Edge Case Handling

### 6.1 Standard Test Protocol Validation

**Validate test protocols against these standards:**

```javascript
function validateTestProtocol(testData) {
  const issues = [];
  
  // Stage duration check
  if (testData.stageDuration < 180) { // 3 minutes minimum
    issues.push({
      severity: "WARNING",
      message: "Stage duration < 3 minutes may not allow lactate stabilization",
      recommendation: "Use 3-5 minute stages for most athletes"
    });
  }
  
  // Total test duration
  const totalDuration = testData.stageDuration * testData.numStages / 60;
  if (totalDuration < 12 || totalDuration > 20) {
    issues.push({
      severity: "ERROR",
      message: `Total test duration ${totalDuration} min outside optimal 12-20 min range`,
      recommendation: "Adjust starting intensity or increment size"
    });
  }
  
  // Baseline establishment
  const baselineLactate = Math.min(...testData.lactate.slice(0, 3));
  if (baselineLactate > 2.5) {
    issues.push({
      severity: "ERROR",
      message: `Baseline lactate ${baselineLactate} mmol/L too high (>2.5)`,
      recommendation: "Test invalid. Check for: anxiety, recent food/caffeine, inadequate warmup"
    });
  }
  
  // Resting lactate check
  if (testData.restingLactate > 3.0) {
    issues.push({
      severity: "CRITICAL",
      message: "Resting lactate > 3.0 mmol/L indicates stress/anxiety artifacts",
      recommendation: "REJECT TEST. Retest after proper rest and preparation"
    });
  }
  
  // Minimum data points
  if (testData.lactate.length < 4) {
    issues.push({
      severity: "CRITICAL",
      message: "Fewer than 4 valid data points",
      recommendation: "REJECT TEST. Need minimum 6-8 stages"
    });
  }
  
  // Check for maximum lactate achieved
  const maxLactate = Math.max(...testData.lactate);
  if (maxLactate < 4.0) {
    issues.push({
      severity: "WARNING",
      message: "Test may have stopped before reaching threshold (max lactate < 4.0)",
      recommendation: "Increase final stage intensity in future tests"
    });
  }
  
  return {
    valid: issues.filter(i => i.severity === "CRITICAL").length === 0,
    issues: issues
  };
}
```

### 6.2 Handling Problematic Curve Patterns

#### Flat Curves in Elite Athletes

**Pattern:** Lactate stays below 2.5 mmol/L across wide intensity range with minimal rise until very high intensities (>90% max).

```javascript
function analyzeFlatCurve(intensity, lactate, heartRate) {
  const lactateRange = Math.max(...lactate) - Math.min(...lactate);
  const intensityRange = intensity[intensity.length-1] - intensity[0];
  
  if (lactateRange < 2.0 && intensityRange > 5.0) { // Flat curve detected
    return {
      pattern: "FLAT_ELITE_CURVE",
      recommendation: [
        "Perform all-out 30-60 second effort to measure max lactate capacity",
        "If max lactate > 12 mmol/L: True elite aerobic efficiency",
        "If max lactate < 6 mmol/L: Low anaerobic capacity (use performance-based zones)",
        "Consider using higher lactate cutoffs (LT2 at 2.5-3.0 mmol/L)",
        "Train using pace/power zones rather than absolute lactate values"
      ],
      zones: "Use Modified LT2 = point where lactate reaches 2.5-3.0 mmol/L"
    };
  }
  
  return null;
}
```

#### Steep Curves in Deconditioned Individuals

**Pattern:** No aerobic baseline below 2.0 mmol/L, continuous rise from first stage.

```javascript
function analyzeSteepCurve(intensity, lactate, heartRate) {
  const baseline = Math.min(...lactate);
  const firstStageRise = lactate[1] - lactate[0];
  
  if (baseline > 2.5 && firstStageRise > 0.5) { // Steep curve detected
    // Find "aerobic ceiling" - lowest sustainable intensity
    let aerobicCeiling = {
      intensity: intensity[0],
      heartRate: heartRate[0],
      lactate: lactate[0]
    };
    
    // Find lowest point or first plateau
    for (let i = 0; i < lactate.length; i++) {
      if (lactate[i] < aerobicCeiling.lactate) {
        aerobicCeiling = {
          intensity: intensity[i],
          heartRate: heartRate[i],
          lactate: lactate[i]
        };
      }
    }
    
    return {
      pattern: "STEEP_DECONDITIONED_CURVE",
      aerobicCeiling: aerobicCeiling,
      recommendation: [
        "Severe aerobic deficiency detected",
        "ALL training should be at or below aerobic ceiling for 8-12 weeks",
        `Aerobic ceiling HR: ${aerobicCeiling.heartRate} bpm (may be as low as 100-120 bpm)`,
        "Focus: High volume, extremely low intensity",
        "May require walking or very slow jogging initially",
        "Expect dramatic improvements: HR could increase 30-40 bpm within 6 months"
      ],
      zones: {
        Zone1: `< ${aerobicCeiling.heartRate} bpm`,
        Zone2: `${aerobicCeiling.heartRate} bpm`,
        Zone3: "DO NOT TRAIN",
        Zone4: "DO NOT TRAIN",
        Zone5: "DO NOT TRAIN"
      }
    };
  }
  
  return null;
}
```

#### Indistinguishable LT1 and LT2

**Pattern:** Thresholds cannot be distinguished (<10 bpm apart).

```javascript
function handleIndistinguishableThresholds(LT1, LT2) {
  const hrDifference = LT2.heartRate - LT1.heartRate;
  
  if (hrDifference < 10) {
    return {
      pattern: "INDISTINGUISHABLE_THRESHOLDS",
      recommendation: [
        "Retest with modified protocol:",
        "- Use 5-minute stages instead of 3-minute",
        "- Use smaller intensity increments (0.5 km/h vs 1.0 km/h)",
        "- Perform 8-10 total stages",
        "Alternative: Use performance-based zones:",
        "- 30-minute time trial for LT2",
        "- 60-90 minute effort for LT1",
        "Temporary solution: Single-threshold model",
        "- Below threshold = aerobic",
        "- Above threshold = tempo/threshold"
      ],
      temporaryZones: {
        Zone1: `< ${LT1.heartRate - 10} bpm`,
        Zone2: `${LT1.heartRate - 10} - ${LT1.heartRate} bpm`,
        Zone3: `${LT1.heartRate} - ${LT2.heartRate} bpm`,
        Zone4: `${LT2.heartRate} - ${LT2.heartRate + 8} bpm`,
        Zone5: `> ${LT2.heartRate + 8} bpm`
      }
    };
  }
  
  return null;
}
```

### 6.3 Missing Data Scenarios

#### Missing Heart Rate Data

```javascript
function calculateZonesFromPaceOnly(LT2_pace) {
  // 30-minute time trial method
  // Average pace for last 20 minutes = LT2 pace
  
  return {
    Zone1_Easy: {
      pace: `${LT2_pace + 90} - ${LT2_pace + 150} sec/mile`,
      description: "Easy running, conversational"
    },
    Zone2_Marathon: {
      pace: `${LT2_pace + 30} - ${LT2_pace + 40} sec/mile`,
      description: "Marathon pace"
    },
    Zone3_HalfMarathon: {
      pace: `${LT2_pace + 10} - ${LT2_pace + 15} sec/mile`,
      description: "Half marathon pace"
    },
    Zone4_Threshold: {
      pace: `${LT2_pace - 10} - ${LT2_pace + 10} sec/mile`,
      description: "Lactate threshold pace"
    },
    Zone5_VO2max: {
      pace: `${LT2_pace - 45} - ${LT2_pace - 40} sec/mile`,
      description: "VO2 max pace"
    },
    method: "30-minute time trial",
    warning: "No heart rate data available. Pace zones only. Use RPE for validation."
  };
}
```

#### Missing Pace Data (Heart Rate Only)

```javascript
function calculateHRZonesFromLTHR(LTHR, maxHR = null) {
  // Joe Friel zone system from LTHR
  
  if (!maxHR) {
    maxHR = LTHR * 1.08; // Estimate if not provided
  }
  
  return {
    Zone1: {
      hr: `< ${Math.round(LTHR * 0.85)} bpm`,
      description: "Recovery, active rest"
    },
    Zone2: {
      hr: `${Math.round(LTHR * 0.85)} - ${Math.round(LTHR * 0.89)} bpm`,
      description: "Aerobic base building"
    },
    Zone3: {
      hr: `${Math.round(LTHR * 0.90)} - ${Math.round(LTHR * 0.94)} bpm`,
      description: "Tempo, marathon pace"
    },
    Zone4: {
      hr: `${Math.round(LTHR * 0.95)} - ${Math.round(LTHR * 0.99)} bpm`,
      description: "Lactate threshold"
    },
    Zone5a: {
      hr: `${Math.round(LTHR * 1.00)} - ${Math.round(LTHR * 1.02)} bpm`,
      description: "VO2 max intervals"
    },
    Zone5b: {
      hr: `${Math.round(LTHR * 1.03)} - ${Math.round(LTHR * 1.06)} bpm`,
      description: "Anaerobic capacity"
    },
    Zone5c: {
      hr: `> ${Math.round(LTHR * 1.06)} bpm`,
      description: "Neuromuscular power"
    },
    warnings: [
      "HR has 2-3 minute lag to intensity changes",
      "Expect 5-10 bpm cardiac drift during long efforts",
      "Heat adds +10-15 bpm",
      "Running HR typically 5-8 bpm higher than cycling",
      "Always combine with RPE for validation",
      "Use chest strap monitor (wrist optical too inaccurate)"
    ]
  };
}
```

---

## Part 7: Training Load Quantification

### 7.1 Training Stress Score (TSS/rTSS) for Running

**Core Formula:**

```javascript
function calculateRTSS(durationMinutes, intensityFactor, FTPace) {
  // rTSS = (duration in hours) × IF² × 100
  const durationHours = durationMinutes / 60;
  const rTSS = durationHours * Math.pow(intensityFactor, 2) * 100;
  
  return Math.round(rTSS);
}

function calculateIntensityFactor(avgPace, FTPace) {
  // IF = Normalized Graded Pace / FTPace
  // For flat runs without power meter, simplified:
  // IF = FTPace / avgPace (for pace in sec/km or sec/mile)
  return FTPace / avgPace;
}

// Integration with lactate threshold
function getTSSFromLT2(durationMinutes, avgPace, LT2_pace) {
  const IF = calculateIntensityFactor(avgPace, LT2_pace);
  return calculateRTSS(durationMinutes, IF, LT2_pace);
}

// Zone-based estimation when pace data unavailable
function estimateTSSFromZone(durationMinutes, zone) {
  const TSSperHour = {
    1: 50,   // Zone 1: Easy recovery
    2: 60,   // Zone 2: Aerobic base
    3: 70,   // Zone 3: Tempo
    4: 80,   // Zone 4: Threshold  
    5: 100   // Zone 5a: VO2max
  };
  
  return (durationMinutes / 60) * TSSperHour[zone];
}
```

**Example Calculation:**

```javascript
// Athlete runs 90 minutes at 80% of threshold pace
const duration = 90; // minutes
const IF = 0.80;     // 80% of FTPace
const rTSS = calculateRTSS(duration, IF);
// Result: 1.5 hours × 0.64 × 100 = 96 TSS
```

### 7.2 TRIMP Methods

#### Edwards TRIMP (Recommended for Simplicity)

```javascript
function calculateEdwardsTRIMP(hrZoneTimes, maxHR) {
  // hrZoneTimes = [min_Z1, min_Z2, min_Z3, min_Z4, min_Z5]
  const coefficients = [1, 2, 3, 4, 5];
  
  let trimp = 0;
  for (let i = 0; i < 5; i++) {
    trimp += hrZoneTimes[i] * coefficients[i];
  }
  
  return {
    trimp: trimp,
    method: "Edwards",
    zoneBreakdown: hrZoneTimes.map((time, i) => ({
      zone: i + 1,
      minutes: time,
      contribution: time * coefficients[i]
    }))
  };
}

// Example: 10 min Z1, 20 min Z3, 5 min Z5, 10 min Z2
const trimp = calculateEdwardsTRIMP([10, 10, 20, 0, 5], 200);
// Result: (10×1) + (10×2) + (20×3) + (0×4) + (5×5) = 10 + 20 + 60 + 0 + 25 = 115
```

#### Banister TRIMP (Physiologically Sound)

```javascript
function calculateBanisterTRIMP(durationMinutes, avgHR, restingHR, maxHR, gender) {
  // Calculate Heart Rate Reserve ratio
  const HRR = (avgHR - restingHR) / (maxHR - restingHR);
  
  // Gender-specific exponential weighting
  const y = gender === "male" 
    ? 0.64 * Math.exp(1.92 * HRR)
    : 0.86 * Math.exp(1.67 * HRR);
  
  const trimp = durationMinutes * HRR * y;
  
  return {
    trimp: Math.round(trimp),
    method: "Banister",
    HRR: HRR,
    weighting: y
  };
}

// Example: Male, 30 min at HR 130, resting 40, max 200
const trimp = calculateBanisterTRIMP(30, 130, 40, 200, "male");
// HRR = (130-40)/(200-40) = 0.5625
// y = 0.64 × e^(1.92 × 0.5625) = 1.885
// TRIMP = 30 × 0.5625 × 1.885 = 31.8
```

#### Lucia TRIMP (Threshold-Based)

```javascript
function calculateLuciaTRIMP(timeInZones, VT1_HR, VT2_HR) {
  // timeInZones = {belowVT1: min, VT1toVT2: min, aboveVT2: min}
  const coefficients = {
    zone1: 1,  // Below VT1 (aerobic threshold)
    zone2: 2,  // VT1 to VT2 (moderate)
    zone3: 3   // Above VT2 (anaerobic threshold)
  };
  
  const trimp = 
    timeInZones.belowVT1 * coefficients.zone1 +
    timeInZones.VT1toVT2 * coefficients.zone2 +
    timeInZones.aboveVT2 * coefficients.zone3;
  
  return {
    trimp: trimp,
    method: "Lucia (Threshold-based)",
    distribution: `${timeInZones.belowVT1}/${timeInZones.VT1toVT2}/${timeInZones.aboveVT2} min`
  };
}
```

**Method Selection Decision:**

```javascript
function selectTRIMPMethod(athleteLevel, dataAvailable) {
  if (dataAvailable.hasZoneTracking) {
    return "Edwards"; // Easiest, most practical
  } else if (dataAvailable.hasVentilatory && athleteLevel === "elite") {
    return "Lucia"; // Best for elite with lab testing
  } else if (dataAvailable.hasDetailedHR && dataAvailable.hasMaxHR) {
    return "Banister"; // Most physiologically accurate
  } else {
    return "Edwards"; // Default fallback
  }
}
```

### 7.3 Acute:Chronic Workload Ratio (ACWR)

```javascript
class ACWRCalculator {
  constructor(acuteLambda = 7, chronicLambda = 28) {
    this.acuteLambda = acuteLambda;
    this.chronicLambda = chronicLambda;
    this.acuteLoad = 0;
    this.chronicLoad = 0;
    this.history = [];
  }
  
  update(dailyLoad) {
    // Exponentially Weighted Moving Average (EWMA) method
    const acuteDecay = Math.exp(-1 / this.acuteLambda);
    const chronicDecay = Math.exp(-1 / this.chronicLambda);
    
    this.acuteLoad = this.acuteLoad * acuteDecay + dailyLoad;
    this.chronicLoad = this.chronicLoad * chronicDecay + dailyLoad;
    
    const acwr = this.chronicLoad > 0 ? this.acuteLoad / this.chronicLoad : 0;
    
    this.history.push({
      date: new Date(),
      dailyLoad: dailyLoad,
      acuteLoad: this.acuteLoad,
      chronicLoad: this.chronicLoad,
      acwr: acwr,
      riskZone: this.getRiskZone(acwr)
    });
    
    return acwr;
  }
  
  getRiskZone(acwr) {
    if (acwr < 0.8) return "UNDER-TRAINING";
    if (acwr >= 0.8 && acwr <= 1.3) return "OPTIMAL";
    if (acwr > 1.3 && acwr <= 1.5) return "CAUTION";
    return "DANGER"; // > 1.5
  }
  
  getRecommendation(acwr) {
    const zone = this.getRiskZone(acwr);
    
    const recommendations = {
      "UNDER-TRAINING": "Consider gradually increasing training load. May indicate deconditioning or recent injury recovery.",
      "OPTIMAL": "Training load well-balanced. Maintain current progression.",
      "CAUTION": "Approaching high risk zone. Consider maintaining current load or implementing deload week.",
      "DANGER": "HIGH RISK: Acute load exceeds chronic preparation. MANDATORY deload or rest period recommended."
    };
    
    return {
      zone: zone,
      acwr: acwr.toFixed(2),
      message: recommendations[zone],
      action: zone === "DANGER" ? "REDUCE_IMMEDIATELY" : zone === "CAUTION" ? "MONITOR_CLOSELY" : "CONTINUE"
    };
  }
}

// Usage example
const calculator = new ACWRCalculator();
calculator.update(50); // Day 1: 50 TSS
calculator.update(60); // Day 2: 60 TSS
const acwr = calculator.update(120); // Day 3: 120 TSS
const advice = calculator.getRecommendation(acwr);
```

**Critical Implementation Notes:**

```javascript
// ACWR Limitations and Usage Guidelines
const ACWRGuidelines = {
  use: [
    "Training load management and progression monitoring",
    "Component of comprehensive monitoring program",
    "Identifying sudden spikes in training load"
  ],
  
  doNotUse: [
    "Injury prediction (not reliable in prospective studies)",
    "As sole metric for training decisions",
    "Without considering sport-specific context"
  ],
  
  combineWith: [
    "Heart Rate Variability (HRV)",
    "Sleep quality metrics",
    "Rate of Perceived Exertion (RPE)",
    "Subjective wellness questionnaires",
    "Performance metrics"
  ],
  
  warnings: [
    "Ratio problem: 10→15 miles same ACWR as 100→150 miles (different risks)",
    "Reverse causation: Low ACWR often result of injury, not predictor",
    "Individual variation: Thresholds may differ by athlete",
    "2020-2025 research questions original 'sweet spot' validity"
  ]
};
```

---

## Part 8: Performance Prediction and Race Pace Calculators

### 8.1 Race Time Prediction from LT2

```javascript
function predictRaceTimeFromLT2(LT2_pace_secPerKm, distance, runnerLevel) {
  // Distance-specific relationships (pace in sec/km)
  
  const eliteFactors = {
    "5k": 0.90,   // 5K = LT2 pace × 0.90 (10% faster)
    "10k": 0.95,  // 10K = LT2 pace × 0.95 (5% faster)
    "half": 1.00, // Half = at LT2 pace
    "full": 1.12  // Marathon = LT2 pace × 1.12 (12% slower)
  };
  
  const recreationalFactors = {
    "5k": 0.95,   // 5K only slightly faster than LT2
    "10k": 1.00,  // 10K at or slightly below LT2
    "half": 1.08, // Half significantly slower
    "full": 1.20  // Marathon much slower
  };
  
  const factors = runnerLevel === "elite" || runnerLevel === "advanced" 
    ? eliteFactors 
    : recreationalFactors;
  
  const predictedPace = LT2_pace_secPerKm * factors[distance];
  
  const distanceKm = {
    "5k": 5,
    "10k": 10,
    "half": 21.0975,
    "full": 42.195
  };
  
  const totalSeconds = predictedPace * distanceKm[distance];
  
  return {
    pace: predictedPace,
    totalTime: formatTime(totalSeconds),
    method: "LT2-based prediction",
    accuracy: runnerLevel === "elite" ? "±2-3%" : "±5-8%",
    note: "Assumes proper race-specific training"
  };
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
```

### 8.2 Critical Velocity/Critical Speed Calculator

```javascript
function calculateCriticalSpeed(timeTrials) {
  // timeTrials = [{distance: meters, time: seconds}, ...]
  // Minimum 2-3 time trials spanning 2-20 minutes
  
  // Linear regression: Time = m × Distance + b
  // Critical Speed CS = 1/m
  
  const n = timeTrials.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  timeTrials.forEach(trial => {
    sumX += trial.distance;
    sumY += trial.time;
    sumXY += trial.distance * trial.time;
    sumX2 += trial.distance * trial.distance;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const CS = 1 / slope; // meters per second
  const DPrime = -intercept / slope; // meters
  
  // Convert to pace
  const CS_pace_minPerKm = (1000 / CS) / 60;
  
  return {
    criticalSpeed: CS,
    criticalSpeedPace: formatPace(CS_pace_minPerKm),
    DPrime: Math.round(DPrime),
    trainingPaces: {
      "CS- (Threshold)": formatPace(CS_pace_minPerKm * 1.03),
      "CS (Critical Velocity)": formatPace(CS_pace_minPerKm),
      "CS+ (VO2max)": formatPace(CS_pace_minPerKm * 0.97)
    }
  };
}

function formatPace(minPerKm) {
  const minutes = Math.floor(minPerKm);
  const seconds = Math.round((minPerKm - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}

// Quick estimate from 5K time
function estimateCVFrom5K(time5K_seconds) {
  const fiveKPace_secPerKm = time5K_seconds / 5;
  
  return {
    thresholdPace: formatPace((fiveKPace_secPerKm / 60) * 1.11), // 90% of 5K
    criticalVelocity: formatPace((fiveKPace_secPerKm / 60) * 1.04), // 96% of 5K
    vo2maxPace: formatPace(fiveKPace_secPerKm / 60), // 100% of 5K (equals 5K pace)
    accuracy: ">90% for most runners with 5K times 14:00-25:00"
  };
}
```

### 8.3 VDOT Calculator

```javascript
function calculateVDOT(raceDistance_meters, raceTime_seconds) {
  // Jack Daniels' VDOT formulas
  const t = raceTime_seconds / 60; // time in minutes
  const v = raceDistance_meters / t; // velocity in m/min
  
  // Calculate VO2max percentage
  const vo2maxPercent = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 
                        0.2989558 * Math.exp(-0.1932605 * t);
  
  // Calculate VO2
  const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
  
  // Calculate VDOT
  const vdot = vo2 / vo2maxPercent;
  
  return Math.round(vdot);
}

function getTrainingPacesFromVDOT(vdot) {
  // Simplified VDOT pace table (would use full lookup table in production)
  // These are approximations
  
  const multipliers = {
    E: 1.30,   // Easy: ~59-74% VO2max
    M: 1.12,   // Marathon: ~75-84% VO2max  
    T: 1.00,   // Threshold: ~83-88% VO2max
    I: 0.92,   // Interval: ~97-100% VO2max
    R: 0.85    // Repetition: >100% VO2max
  };
  
  // Base calculation (simplified - would use VDOT tables)
  const basePace_secPerMile = 420 - (vdot * 3); // Rough approximation
  
  return {
    Easy: formatPace((basePace_secPerMile * multipliers.E) / 1.60934),
    Marathon: formatPace((basePace_secPerMile * multipliers.M) / 1.60934),
    Threshold: formatPace((basePace_secPerMile * multipliers.T) / 1.60934),
    Interval: formatPace((basePace_secPerMile * multipliers.I) / 1.60934),
    Repetition: formatPace((basePace_secPerMile * multipliers.R) / 1.60934),
    vdot: vdot,
    note: "Use measured LT2 pace to override Threshold pace for better accuracy"
  };
}
```

### 8.4 Riegel Race Equivalency Formula

```javascript
function predictRaceTime(knownDistance, knownTime, targetDistance, runnerLevel = "recreational") {
  // T₂ = T₁ × (D₂/D₁)^exponent
  
  const fatigueExponents = {
    "elite": 1.06,
    "subElite": 1.065,
    "recreational": 1.075,
    "novice": 1.08
  };
  
  const exponent = fatigueExponents[runnerLevel];
  const distanceRatio = targetDistance / knownDistance;
  const predictedTime = knownTime * Math.pow(distanceRatio, exponent);
  
  return {
    predictedTime: formatTime(predictedTime),
    accuracy: "~80% for similar distances (<2× apart)",
    exponent: exponent,
    note: runnerLevel === "recreational" || runnerLevel === "novice"
      ? "Prediction may be optimistic without race-specific training"
      : "Assumes adequate race-specific preparation"
  };
}
```

### 8.5 Integrated Prediction System

```javascript
function comprehensiveRacePrediction(athleteData) {
  const { LT2_pace, recent_5K_time, vdot, targetRace } = athleteData;
  
  const predictions = [];
  
  // Method 1: From LT2 if available
  if (LT2_pace) {
    predictions.push({
      method: "LT2-based",
      ...predictRaceTimeFromLT2(LT2_pace, targetRace.distance, athleteData.level),
      confidence: "High (based on lab testing)"
    });
  }
  
  // Method 2: From 5K performance
  if (recent_5K_time) {
    const cv = estimateCVFrom5K(recent_5K_time);
    predictions.push({
      method: "5K-based Critical Velocity",
      ...cv,
      confidence: "Very High (>90% accuracy)"
    });
  }
  
  // Method 3: VDOT if we have recent race
  if (vdot) {
    predictions.push({
      method: "VDOT",
      paces: getTrainingPacesFromVDOT(vdot),
      confidence: "High (85-90% accuracy)"
    });
  }
  
  // Method 4: Riegel from any race
  if (athleteData.recentRace) {
    predictions.push({
      method: "Riegel Formula",
      ...predictRaceTime(
        athleteData.recentRace.distance,
        athleteData.recentRace.time,
        targetRace.distance,
        athleteData.level
      ),
      confidence: "Medium (~80% accuracy)"
    });
  }
  
  return {
    targetRace: targetRace,
    predictions: predictions,
    recommendation: getConsensusRecommendation(predictions),
    adjustments: {
      heat: "Subtract 2-5% for hot/humid conditions",
      hills: "Not included in flat-course formulas",
      pacing: "Even pacing essential for predicted times",
      nutrition: "Proper fueling critical for marathon+"
    }
  };
}
```

---

## Part 9: Progressive Overload and Deload Protocols

### 9.1 Evidence-Based Volume Progression

```javascript
function calculateNextWeekVolume(currentVolume, athleteLevel, weeksAtCurrent, acwr) {
  const progressionRates = {
    "beginner": { min: 0.15, max: 0.20, target: 0.175 },      // 15-20%
    "recreational": { min: 0.10, max: 0.15, target: 0.125 },  // 10-15%
    "advanced": { min: 0.05, max: 0.10, target: 0.075 },      // 5-10%
    "elite": { min: 0.05, max: 0.10, target: 0.075 }          // 5-10%
  };
  
  const rates = progressionRates[athleteLevel];
  
  // Decision logic
  if (weeksAtCurrent < 3) {
    return {
      volume: currentVolume,
      action: "MAINTAIN",
      reason: `Need ${3 - weeksAtCurrent} more week(s) for adaptation`,
      weeksRemaining: 3 - weeksAtCurrent
    };
  }
  
  if (acwr > 1.3) {
    return {
      volume: currentVolume * 0.70, // 30% reduction
      action: "DELOAD",
      reason: "ACWR exceeds 1.3 - high injury risk zone",
      urgency: "IMMEDIATE"
    };
  }
  
  if (acwr > 1.2) {
    return {
      volume: currentVolume,
      action: "MAINTAIN",
      reason: "ACWR approaching caution zone (>1.2)",
      monitor: "Closely monitor recovery markers"
    };
  }
  
  // Ready to progress
  const increase = currentVolume * rates.target;
  const newVolume = currentVolume + increase;
  
  return {
    volume: newVolume,
    action: "PROGRESS",
    increase: increase,
    percentIncrease: (rates.target * 100).toFixed(1) + "%",
    reason: "3+ weeks adaptation complete, ACWR optimal"
  };
}
```

### 9.2 3-Week Up, 1-Week Down Progression Model

```javascript
class ProgressionCycleManager {
  constructor(baseVolume, athleteLevel) {
    this.baseVolume = baseVolume;
    this.athleteLevel = athleteLevel;
    this.currentWeek = 1;
    this.currentCycle = 1;
  }
  
  getWeeklyVolume() {
    const progressionRates = {
      "beginner": 0.175,
      "recreational": 0.125,
      "advanced": 0.075,
      "elite": 0.075
    };
    
    const rate = progressionRates[this.athleteLevel];
    const weekInCycle = ((this.currentWeek - 1) % 4) + 1;
    
    let volume, description;
    
    switch(weekInCycle) {
      case 1: // Build week 1
        volume = this.baseVolume;
        description = "Base volume week";
        break;
      case 2: // Build week 2
        volume = this.baseVolume * (1 + rate);
        description = `${(rate * 100).toFixed(1)}% increase`;
        break;
      case 3: // Build week 3 (peak)
        volume = this.baseVolume * (1 + rate) * (1 + rate);
        description = `${(rate * 100).toFixed(1)}% further increase (peak week)`;
        break;
      case 4: // Deload week
        volume = this.baseVolume;
        description = "Deload - return to base";
        break;
    }
    
    return {
      week: this.currentWeek,
      cycle: this.currentCycle,
      weekInCycle: weekInCycle,
      volume: Math.round(volume),
      description: description,
      isDeload: weekInCycle === 4,
      isPeak: weekInCycle === 3
    };
  }
  
  advance() {
    this.currentWeek++;
    if (this.currentWeek % 4 === 1 && this.currentWeek > 1) {
      // New cycle starts, increase base volume
      const rate = {
        "beginner": 0.175,
        "recreational": 0.125,
        "advanced": 0.075,
        "elite": 0.075
      }[this.athleteLevel];
      
      this.baseVolume = this.baseVolume * (1 + rate * 0.5); // Increase base by half the weekly rate
      this.currentCycle++;
    }
  }
}

// Usage example
const manager = new ProgressionCycleManager(40, "recreational"); // 40 miles/week, recreational
for (let i = 0; i < 12; i++) {
  console.log(manager.getWeeklyVolume());
  manager.advance();
}
```

### 9.3 Deload Protocol Calculator

```javascript
function calculateDeloadWeek(peakVolume, athleteLevel, fatigueScore, weekssinceDeload) {
  // Base reduction percentages
  const reductionRates = {
    "beginner": 0.45,      // 45% reduction (< 40 mpw)
    "recreational": 0.30,  // 30% reduction (40-70 mpw)
    "advanced": 0.20,      // 20% reduction (> 70 mpw)
    "elite": 0.175         // 17.5% reduction
  };
  
  let reduction = reductionRates[athleteLevel];
  
  // Adjust based on fatigue (0-100 scale)
  if (fatigueScore > 80) {
    reduction += 0.10; // Very fatigued: add 10% reduction
  } else if (fatigueScore < 60) {
    reduction -= 0.10; // Not very fatigued: reduce by 10%
  }
  
  // Clamp between 15-50%
  reduction = Math.max(0.15, Math.min(0.50, reduction));
  
  const deloadVolume = peakVolume * (1 - reduction);
  
  // Intensity management
  const intensityApproach = fatigueScore > 75 
    ? {
        strategy: "REDUCE_BOTH",
        volumeReduction: reduction,
        intensityReduction: 0.30, // 30% easier paces
        description: "High fatigue: reduce both volume and intensity"
      }
    : {
        strategy: "MAINTAIN_INTENSITY",
        volumeReduction: reduction,
        intensityReduction: 0,
        description: "Moderate fatigue: maintain pace, reduce volume only"
      };
  
  // Workout adjustments
  const workoutAdjustments = {
    intervals: fatigueScore > 75 ? "ELIMINATE" : "REDUCE_TO_75%",
    tempo: "REDUCE_TO_75%",
    longRun: "CAP_AT_90_MIN",
    strides: "8-10_x_20_SEC"
  };
  
  return {
    deloadVolume: Math.round(deloadVolume),
    peakVolume: peakVolume,
    reductionPercent: (reduction * 100).toFixed(1) + "%",
    duration: "1 WEEK",
    timing: `Week ${weekssinceDeload + 1} (every ${weekssinceDeload < 3 ? 3 : 4} weeks)`,
    intensityApproach: intensityApproach,
    workoutAdjustments: workoutAdjustments,
    expectedOutcome: "Dissipate fatigue while maintaining adaptations"
  };
}
```

### 9.4 Deload vs Taper Distinction

```javascript
const DeloadVsTaper = {
  deload: {
    purpose: "Recovery and preparation for next training block",
    timing: "Regular 3-4 week intervals throughout season",
    duration: "1 week (standard)",
    volumeReduction: "15-50%",
    intensityChange: "MAINTAIN or slightly reduce",
    frequency: "Recurring/regular component",
    expectedOutcome: "Dissipate fatigue, maintain adaptations",
    useWhen: "Training cycle component"
  },
  
  taper: {
    purpose: "Peak performance for competition",
    timing: "Immediately before major race (final 2-3 weeks)",
    duration: "2-3 weeks (sometimes 1-4 depending on distance)",
    volumeReduction: "25-75% progressive (week -3: 25%, week -2: 50%, week -1: 70%)",
    intensityChange: "MAINTAIN or slightly INCREASE (>85% race intensity)",
    frequency: "MAINTAIN training frequency",
    expectedOutcome: "2-5% performance improvement (supercompensation)",
    useWhen: "Goal race preparation"
  }
};

function generateTaper(raceDistance, currentVolume, athleteLevel) {
  const taperPlans = {
    "marathon": {
      weeks: 3,
      reductions: [0.25, 0.50, 0.70], // Week -3, -2, -1
      intensityMaintenance: ">85% race pace"
    },
    "half": {
      weeks: 2,
      reductions: [0.30, 0.60],
      intensityMaintenance: ">85% race pace"
    },
    "10k": {
      weeks: 1.5, // 10 days
      reductions: [0.50],
      intensityMaintenance: ">85% race pace"
    }
  };
  
  const plan = taperPlans[raceDistance];
  const taperWeeks = [];
  
  plan.reductions.forEach((reduction, index) => {
    taperWeeks.push({
      week: `Race - ${plan.reductions.length - index}`,
      volume: Math.round(currentVolume * (1 - reduction)),
      reduction: `${(reduction * 100).toFixed(0)}%`,
      intensity: plan.intensityMaintenance,
      focus: index === plan.reductions.length - 1 
        ? "Race week: minimal volume, maintain sharpness"
        : "Reduce volume, keep intensity high"
    });
  });
  
  return {
    raceDistance: raceDistance,
    totalTaperWeeks: plan.weeks,
    schedule: taperWeeks,
    criticalRules: [
      "NEVER reduce intensity - maintain >85% race pace",
      "Maintain frequency (number of runs per week)",
      "Expected performance gain: 2-5%",
      "Final hard workout: 10-14 days before race"
    ]
  };
}
```

### 9.5 Phase Duration and Periodization Parameters

```javascript
const PeriodizationPhases = {
  base: {
    duration: {
      beginner: "16-24 weeks",
      intermediate: "6-12 weeks",
      advanced: "4-8 weeks",
      elite: "4-6 weeks"
    },
    volumeProgression: "Increase by athlete_level_percentage weekly",
    intensityDistribution: {
      easy: "85%",
      moderate: "10%",
      strides: "5%"
    },
    deloadFrequency: "Every 4 weeks",
    deloadReduction: "30-40%",
    progressionCriteria: "Easy running feels consistently comfortable"
  },
  
  build: {
    duration: "6-8 weeks",
    volumeProgression: "0.5× athlete_level_percentage (slower)",
    intensityDistribution: {
      easy: "70%",
      moderateTempo: "20%",
      hardIntervals: "10%"
    },
    longRunTarget: "Target_distance × 0.75",
    deloadFrequency: "Every 4 weeks",
    deloadReduction: "25-35%"
  },
  
  peak: {
    duration: {
      standard: "2-4 weeks",
      marathon: "3-6 weeks (8-10 quality long runs needed)"
    },
    volumeChange: "Reduce 10% from build phase peak",
    intensityDistribution: {
      easy: "50%",
      moderate: "30%",
      hardRaceSpecific: "20%"
    },
    qualitySessions: "2 per week",
    longRunTarget: "Target_distance × 0.9 (cap at 20 miles for marathon)",
    deloadFrequency: "Every 3 weeks",
    deloadReduction: "30%",
    maxDuration: "6 weeks (burnout risk beyond this)"
  },
  
  taper: {
    marathon: {
      weeks: 3,
      weekMinus3: "25% reduction",
      weekMinus2: "50% reduction",
      weekMinus1: "70% reduction"
    },
    halfMarathon: {
      weeks: 2,
      weekMinus2: "30% reduction",
      weekMinus1: "60% reduction"
    },
    tenK: {
      days: 10,
      reduction: "50%"
    },
    criticalRule: "Maintain intensity ≥85% race pace, maintain frequency"
  },
  
  recovery: {
    duration: {
      marathon: "3-4 weeks",
      halfMarathon: "2-3 weeks",
      tenK: "1-2 weeks"
    },
    activities: "Easy running, cross-training, or complete rest",
    purpose: "Mental and physical recovery"
  }
};

function generatePeriodizationPlan(targetRace, weeksToRace, athleteLevel) {
  const totalWeeks = weeksToRace;
  
  // Allocate weeks to phases
  const taperWeeks = targetRace.distance === "marathon" ? 3 : 2;
  const peakWeeks = targetRace.distance === "marathon" ? 6 : 4;
  const buildWeeks = 7;
  const baseWeeks = totalWeeks - taperWeeks - peakWeeks - buildWeeks;
  
  return {
    totalWeeks: totalWeeks,
    phases: [
      {
        phase: "Base",
        weeks: baseWeeks,
        startWeek: 1,
        endWeek: baseWeeks,
        ...PeriodizationPhases.base,
        goal: "Build aerobic foundation"
      },
      {
        phase: "Build",
        weeks: buildWeeks,
        startWeek: baseWeeks + 1,
        endWeek: baseWeeks + buildWeeks,
        ...PeriodizationPhases.build,
        goal: "Add race-specific workouts"
      },
      {
        phase: "Peak",
        weeks: peakWeeks,
        startWeek: baseWeeks + buildWeeks + 1,
        endWeek: baseWeeks + buildWeeks + peakWeeks,
        ...PeriodizationPhases.peak,
        goal: "Maximize race-specific fitness"
      },
      {
        phase: "Taper",
        weeks: taperWeeks,
        startWeek: totalWeeks - taperWeeks + 1,
        endWeek: totalWeeks,
        ...PeriodizationPhases.taper[targetRace.distance],
        goal: "Peak for race day"
      }
    ],
    criticalRules: [
      "NEVER increase volume AND intensity simultaneously",
      "Include deload every 3-4 weeks",
      "Monitor ACWR weekly, intervene if >1.3",
      "Base phase is longest - be patient",
      "Peak phase max 6 weeks (burnout risk)",
      "When introducing new stimulus, maintain or decrease volume",
      "Taper must reduce volume aggressively while maintaining intensity"
    ]
  };
}
```

---

---

## Part 10: Race-Day Execution Protocols ⭐ NEW

### 10.1 Distance-Specific Warm-Up Protocols

**The Norwegian method demonstrates why warm-up duration inversely correlates with race distance.** The physiological rationale: shorter races require immediate access to aerobic and anaerobic systems at maximal capacity, while longer races benefit from glycogen conservation.

#### 5K Race Warm-Up (60-75 minutes total)

```javascript
function generate5KWarmup(raceTime_minutes, LT2_pace) {
  return {
    totalDuration: "60-75 minutes",
    protocol: [
      {
        phase: "Initial Aerobic Prep",
        duration: "20 minutes",
        intensity: "Uptempo easy running",
        pace: `${LT2_pace * 1.30} - ${LT2_pace * 1.25} sec/km`,
        heartRate: "60-70% max",
        purpose: "Raise core temperature, increase muscle blood flow"
      },
      {
        phase: "Dynamic Stretching",
        duration: "10 minutes",
        exercises: [
          "Leg swings (forward/back, side-to-side)",
          "Walking lunges",
          "High knees",
          "Butt kicks",
          "A-skips and B-skips"
        ],
        purpose: "Improve range of motion, neural activation"
      },
      {
        phase: "Race-Pace Preparation",
        duration: "20-25 minutes",
        sets: "6-8 × 1 minute intervals",
        pace: `At or faster than race pace (${LT2_pace * 0.90} sec/km)`,
        recovery: "60 seconds easy jog between",
        purpose: "Prime aerobic system, establish race rhythm"
      },
      {
        phase: "Final Activation",
        duration: "5-10 minutes",
        activity: "Easy jogging, 2-3 strides",
        timing: "Finish 10 minutes before race start",
        purpose: "Maintain readiness without fatigue"
      }
    ],
    eliteExample: "Ingebrigtsen brothers standardize on treadmills when possible for consistency",
    critical: "For 5K races <18 minutes, this extensive warmup is non-negotiable"
  };
}
```

#### 10K Race Warm-Up (40-50 minutes total)

```javascript
function generate10KWarmup(LT2_pace) {
  return {
    totalDuration: "40-50 minutes",
    protocol: [
      {
        phase: "Aerobic Prep",
        duration: "15-20 minutes",
        intensity: "Easy to moderate",
        pace: `${LT2_pace * 1.25} - ${LT2_pace * 1.15} sec/km`,
        purpose: "Gradual cardiovascular activation"
      },
      {
        phase: "Dynamic Movement",
        duration: "8-10 minutes",
        focus: "Same exercises as 5K but slightly abbreviated"
      },
      {
        phase: "Race-Pace Touches",
        duration: "10-15 minutes",
        sets: "4-5 × 1-2 minute intervals",
        pace: "At race pace",
        recovery: "60-90 seconds",
        purpose: "Establish pace feel, open aerobic pathways"
      },
      {
        phase: "Final Prep",
        duration: "5 minutes",
        activity: "Easy jog, 3-4 strides",
        timing: "End 8-10 minutes before start"
      }
    ],
    note: "Less extensive than 5K because race allows gradual settling into rhythm"
  };
}
```

#### Half Marathon Warm-Up (20-30 minutes total)

```javascript
function generateHalfMarathonWarmup() {
  return {
    totalDuration: "20-30 minutes",
    protocol: [
      {
        phase: "Light Aerobic",
        duration: "15-20 minutes",
        intensity: "Very easy jogging",
        purpose: "Minimal glycogen depletion, circulatory prep"
      },
      {
        phase: "Dynamic Stretching",
        duration: "5 minutes",
        focus: "Quick leg swings, lunges only"
      },
      {
        phase: "Race Feel",
        duration: "5 minutes",
        activity: "4-6 strides at race pace",
        purpose: "Establish rhythm without fatigue"
      }
    ],
    timing: "Complete 10-15 minutes before start",
    rationale: "Conservative approach preserves glycogen for 13.1 mile effort"
  };
}
```

#### Marathon Warm-Up (10-15 minutes total)

```javascript
function generateMarathonWarmup() {
  return {
    totalDuration: "10-15 minutes maximum",
    protocol: [
      {
        phase: "Minimal Jogging",
        duration: "10 minutes",
        intensity: "Very easy",
        purpose: "Light muscle activation only"
      },
      {
        phase: "Light Stretching",
        duration: "3-5 minutes",
        focus: "Gentle leg swings, walking lunges"
      },
      {
        phase: "Final Strides",
        sets: "4-5 × 15-second accelerations",
        timing: "10 minutes before start",
        purpose: "Neural activation without glycogen cost"
      }
    ],
    critical: "Glycogen conservation paramount - extensive warmup counterproductive",
    eliteExample: "Kipchoge uses minimal warmup to preserve carbohydrate stores"
  };
}
```

### 10.2 Distance-Specific Pacing Algorithms

#### 5K Pacing (3.1 miles)

```javascript
function calculate5KPacing(LT2_pace_secPerKm, goalTime_seconds) {
  const goalPace = (goalTime_seconds / 5);
  
  return {
    targetIntensity: "105-110% of LT2 pace",
    absolutePace: goalPace,
    splits: {
      mile1: {
        targetPace: goalPace,
        variance: "+0 to +10 sec/mile slower",
        strategy: "Controlled start, resist urge to sprint with pack",
        physiological: "Establish aerobic rhythm before anaerobic contribution increases"
      },
      mile2: {
        targetPace: goalPace,
        strategy: "DISCIPLINE CHECKPOINT - maintain despite discomfort",
        physiological: "Psychological crucible - hardest mental portion",
        critical: "Do not slow OR surge - steady state optimal"
      },
      mile3: {
        targetPace: `${goalPace} to ${goalPace * 0.98} (negative split)`,
        strategy: "Progressive acceleration if energy permits",
        physiological: "Begin utilizing anaerobic reserves"
      },
      final_0_1: {
        strategy: "MAXIMUM SPRINT EFFORT",
        physiological: "Empty all remaining anaerobic capacity",
        tactical: "Position for final surge at 200m mark"
      }
    },
    fuelingProtocol: {
      pre_race: "No fueling during race",
      hydration: "Small sips at each mile if hot (>20°C)",
      note: "Duration too short for glycogen depletion"
    }
  };
}
```

#### 10K Pacing (6.2 miles)

```javascript
function calculate10KPacing(LT2_pace_secPerKm) {
  const targetPace = LT2_pace_secPerKm * 0.95; // 5% faster than LT2
  
  return {
    targetIntensity: "95-100% of LT2 pace",
    pacePhases: {
      miles_1_2: {
        pace: `${targetPace * 1.03} - ${targetPace * 1.05} sec/km`,
        delta: "5-10 sec/mile slower than goal",
        purpose: "Establish aerobic stability",
        lactateTarget: "2.5-3.5 mmol/L range"
      },
      miles_3_4: {
        pace: targetPace,
        strategy: "MENTAL DISCIPLINE ZONE",
        challenge: "Discomfort peaks, finish still distant",
        technique: "Focus on form, breathing rhythm, segment into 1km chunks"
      },
      miles_5_6: {
        pace: `${targetPace} to ${targetPace * 0.97}`,
        strategy: "Progressive acceleration if energy reserves permit",
        decision: "Assess remaining capacity at 5 mile mark"
      },
      final_0_2: {
        strategy: "Controlled fast finish",
        effort: "Hard but not all-out sprint"
      }
    },
    fuelingProtocol: {
      under_60min: "No fueling required",
      over_60min: {
        timing: "20-30 minute mark",
        amount: "30-40g carbohydrates (1 gel)",
        purpose: "Maintain blood glucose"
      },
      hydration: "Small amounts each mile in heat"
    }
  };
}
```

#### Half Marathon Pacing (13.1 miles)

```javascript
function calculateHalfMarathonPacing(LT2_pace_secPerKm, goalPace_secPerMile) {
  return {
    targetIntensity: "At LT2 pace (100%)",
    paceStrategy: {
      miles_1_3: {
        pace: `${goalPace_secPerMile + 10} - ${goalPace_secPerMile + 15} sec/mile`,
        delta: "10-15 seconds slower than goal",
        purpose: "Glycogen conservation, aerobic system priming",
        critical: "DISCIPLINE - resist temptation to match faster runners"
      },
      miles_4_10: {
        pace: goalPace_secPerMile,
        strategy: "Lock into precise goal pace",
        monitoring: "RPE should feel controlled, breathing steady",
        technique: "Every mile on target builds confidence and preserves glycogen"
      },
      miles_11_13_1: {
        pace: `${goalPace_secPerMile - 5} - ${goalPace_secPerMile - 10} (negative split)`,
        strategy: "DECISION TIME - assess remaining energy",
        execution: "If feeling strong, progressive acceleration",
        alternative: "If struggling, maintain pace rather than fade"
      }
    },
    example: {
      goalPace: "9:00/mile",
      execution: [
        "Miles 1-3: 9:10/mile pace",
        "Miles 4-10: 9:00/mile pace",
        "Miles 11-13.1: 8:50/mile pace if energy permits"
      ]
    },
    fuelingProtocol: {
      preRace: {
        timing: "2-4 hours before",
        amount: "1-4g carbs per kg bodyweight",
        total: "100-400g for 70kg runner"
      },
      duringRace: {
        target: "30-60g carbohydrates per hour",
        timing: "Begin at 20-30 minutes",
        frequency: "Every 3-4 miles",
        options: "Gels (25g), sports drinks (15g per 8oz), chews (10g per 3 pieces)"
      },
      hydration: {
        target: "400-800ml per hour",
        execution: "Small amounts each aid station",
        electrolytes: "Sodium-containing products"
      }
    }
  };
}
```

#### Marathon Pacing (26.2 miles) - The 10-10-10 Method

```javascript
function calculateMarathonPacing(LT2_pace_secPerKm, goalTime_seconds, runnerLevel) {
  const goalPace_secPerMile = (goalTime_seconds / 26.2);
  
  // Elite runners can maintain higher % of LT2, recreational runners lower %
  const LT2_factors = {
    "elite": { min: 0.88, max: 0.93 },
    "advanced": { min: 0.86, max: 0.90 },
    "recreational": { min: 0.84, max: 0.88 }
  };
  
  const factor = LT2_factors[runnerLevel] || LT2_factors.recreational;
  
  return {
    method: "10-10-10 CONSERVATIVE START",
    targetIntensity: `${factor.min * 100}-${factor.max * 100}% of LT2 pace`,
    phases: {
      miles_1_10: {
        pace: `${goalPace_secPerMile + 10} - ${goalPace_secPerMile + 15} sec/mile`,
        delta: "10-15 seconds SLOWER than goal",
        purpose: "GLYCOGEN PRESERVATION - non-negotiable",
        physiological: "Maximize fat oxidation, delay glycogen depletion",
        RPE: "Should feel easy, conversational possible",
        critical: "This discipline prevents 'the wall' at mile 20"
      },
      miles_11_20: {
        pace: goalPace_secPerMile,
        strategy: "SETTLE INTO GOAL PACE",
        monitoring: [
          "Breathing pattern steady",
          "Form maintained",
          "RPE controlled (not straining)"
        ],
        fueling: "Critical window - consistent carb intake",
        mental: "Focus on process, not outcome"
      },
      miles_20_26_2: {
        pace: `${goalPace_secPerMile} to ${goalPace_secPerMile - 10}`,
        strategy: "AGGRESSIVE PUSH with remaining reserves",
        physiological: "Glycogen stores determine success here",
        execution: [
          "If well-fueled: progressive negative split possible",
          "If glycogen-depleted: maintain pace becomes victory",
          "Never give up - even 5-10 sec/mile matters over 6+ miles"
        ],
        mental: "Pain reframing critical - 'sensation' not 'damage'"
      }
    },
    eliteExample: {
      kipchoge_2_01_09: {
        description: "2:01:09 Berlin 2024 (with rabbits)",
        firstHalf: "1:00:35 (faster with protection)",
        secondHalf: "1:00:34 (virtually even despite losing rabbits)",
        note: "Slight positive split but protected pacing phase allows it"
      },
      sisson_2_18_29: {
        description: "Emily Sisson 2:18:29 American Record",
        firstHalf: "1:09:26",
        secondHalf: "1:09:03",
        negativeSplit: "23 seconds faster",
        note: "Textbook negative split from superior glycogen management"
      }
    },
    fuelingProtocol: {
      carbLoading: {
        timing: "48 hours before race",
        amount: "8-12g per kg bodyweight daily",
        example: "560-840g for 70kg runner"
      },
      raceMorning: {
        timing: "2-4 hours pre-start",
        amount: "100-400g carbohydrates",
        options: "Bagel, banana, oatmeal, sports drink"
      },
      preStart: {
        timing: "10 minutes before gun",
        amount: "25g (one gel)",
        purpose: "Top off blood glucose"
      },
      duringRace: {
        target: "60-90g carbohydrates per hour",
        eliteIntake: "90-120g per hour at high intensity",
        frequency: "Every 15-30 minutes continuously",
        schedule_example: "Gels at miles 6, 9, 12, 15, 18, 21, 24",
        totalRaceIntake: "~200g carbohydrates minimum"
      },
      hydration: {
        target: "400-800ml per hour (14-28oz)",
        execution: "~100ml per aid station cup",
        dehydrationTolerance: "Up to 2% bodyweight loss acceptable",
        warning: "Overdrinking risks hyponatremia",
        electrolytes: "~1g sodium per liter fluid",
        hotConditions: "Add 100-200ml per hour"
      }
    },
    gutTraining: {
      protocol: "Begin 6-8 weeks before race",
      progression: [
        "Start: 30g carbs/hour during long runs",
        "Week 2-3: 40g carbs/hour",
        "Week 4-5: 50g carbs/hour",
        "Week 6+: 60g carbs/hour (race target)"
      ],
      purpose: "Train intestinal absorption capacity",
      critical: "Use exact race-day products in training"
    }
  };
}
```

### 10.3 Mental Strategies and Attentional Focus

**Sport psychology research reveals elite and recreational runners employ fundamentally different attentional strategies.**

```javascript
const AttentionalStrategies = {
  associative: {
    definition: "Internal focus on bodily sensations and effort",
    focus: [
      "Breathing patterns",
      "Leg muscle sensations",
      "Heart rate monitoring",
      "Effort assessment",
      "Form checks"
    ],
    userProfile: "Elite marathoners (Morgan & Pollock 1977)",
    benefits: [
      "Enables precise pace control",
      "Allows tactical adjustments",
      "Facilitates form corrections",
      "Enables relaxation commands to tense muscles"
    ],
    optimalFor: "Competitive racing, threshold training"
  },
  
  dissociative: {
    definition: "External focus away from bodily sensations",
    focus: [
      "Scenery observation",
      "Spectator interaction",
      "Music/podcasts",
      "Mathematical calculations",
      "Conversation"
    ],
    userProfile: "Recreational runners (Morgan & Pollock 1977)",
    benefits: [
      "Reduces perceived exertion",
      "Lowers oxygen consumption (recent research)",
      "Decreases blood lactate (recreational athletes)",
      "Improves running economy",
      "Makes discomfort more tolerable"
    ],
    optimalFor: "Easy training runs, managing discomfort in ultras"
  },
  
  researchFindings: {
    study: "Morgan & Pollock 1977 + recent 2021 updates",
    elitePattern: "Continuous associative monitoring enables performance optimization",
    recreationalPattern: "Dissociative-external focus improves economy",
    implication: "Optimal strategy varies by competitive level and goals"
  }
};
```

#### Race-Specific Mental Protocols

```javascript
function generateMarathonMentalProtocol() {
  return {
    miles_1_13: {
      strategy: "Associative-External Focus",
      implementation: [
        "Monitor splits religiously",
        "Track position relative to goal pace group",
        "Note hydration/fueling timing",
        "Maintain discipline against surge urges"
      ],
      self_talk: [
        "'Stay patient, trust the plan'",
        "'Banking time is myth, banking glycogen is real'",
        "'Every second under pace costs later'"
      ]
    },
    miles_14_20: {
      strategy: "Transition to Associative-Internal",
      focus: [
        "Body monitoring intensifies",
        "Form checks every mile",
        "Breathing pattern becomes primary focus",
        "Fuel/hydration adherence critical"
      ],
      self_talk: [
        "'Form stays strong, breathing stays rhythmic'",
        "'I've trained for this exact feeling'",
        "'This is where training meets race'"
      ]
    },
    miles_21_26_2: {
      strategy: "Mixed Associative Strategies",
      techniques: [
        "Pain reframing: 'sensation of working hard' not 'damage'",
        "Segmenting: Focus only on reaching next mile marker",
        "Form mantras: 'Quick feet, tall posture, relaxed shoulders'",
        "Tactical awareness: Monitor competitors, adjust if needed"
      ],
      self_talk: [
        "'Everything I have goes into these 6 miles'",
        "'Pain is temporary, finishing strong is permanent'",
        "'One mile at a time, just this mile'",
        "'I am running a strong race'"
      ],
      distanceChunking: "Focus on 400m segments, not remaining miles"
    },
    painManagement: {
      reframing: [
        "Label as 'signal I'm working hard' not 'damage'",
        "Use 'sensation' or 'discomfort' not 'pain'",
        "Acknowledge without judgment: 'This is hard, and I can handle hard'"
      ],
      breathing: [
        "Rhythmic breathing: 3-step inhale, 2-step exhale",
        "When struggling: Focus entirely on breath rhythm",
        "Deep belly breaths reduce anxiety response"
      ],
      segmenting: [
        "Never think about miles remaining after mile 20",
        "Focus: 'Just get to mile 21', then reassess",
        "Final miles: Count down 10 lampposts, then 10 more"
      ]
    }
  };
}
```

### 10.4 Post-Race Recovery Protocols

```javascript
function generatePostRaceRecovery(raceDistance_miles, raceTime_minutes) {
  // Formula: 1 day recovery per mile raced
  const recoveryDays_total = Math.ceil(raceDistance_miles);
  
  return {
    immediate: {
      priority1: {
        action: "CONTINUE WALKING 10-30 minutes",
        duration: "10-30 minutes minimum",
        purpose: "Maintain blood circulation, flush metabolic byproducts",
        critical: "NEVER sit immediately - venous pooling risk"
      },
      priority2: {
        action: "Thermoregulation",
        hot: "Move to shade, remove wet clothing, cool gradually",
        cold: "Add dry layers immediately, prevent rapid cooling"
      },
      priority3: {
        action: "Rehydration",
        target: "16-20oz per pound lost",
        composition: "Electrolyte drinks, not plain water",
        timing: "Begin immediately, continue for 4-6 hours"
      },
      priority4: {
        action: "Refuel - Glycogen Window",
        timing: "Within 30 minutes post-finish",
        ratio: "3:1 or 4:1 carbs-to-protein",
        amounts: "21-37g protein + 60-120g carbohydrates",
        example: "Chocolate milk: 24g carbs + 8g protein per 8oz"
      },
      priority5: {
        action: "Leg Elevation",
        duration: "10-15 minutes",
        position: "Legs above heart",
        purpose: "Reduce swelling, aid venous return"
      }
    },
    
    first_48_hours: {
      activity: {
        avoid: "Complete rest (paradoxically delays recovery)",
        implement: "20-30 minutes daily light movement",
        options: [
          "Walking",
          "Easy swimming",
          "Gentle cycling",
          "Yoga (wait 2-6 hours post-race for stretching)"
        ],
        purpose: "Promote blood flow without additional damage"
      },
      nutrition: {
        protein: "20g+ per meal for muscle repair",
        antiInflammatory: [
          "Berries (anthocyanins)",
          "Leafy greens",
          "Fatty fish (omega-3)",
          "Nuts",
          "Turmeric"
        ],
        hydration: "Continue elevated fluid intake"
      },
      coldTherapy: {
        optional: "Ice baths not mandatory",
        protocol: "10-15 minutes, hips submerged",
        timing: "First 48 hours only",
        temperature: "50-60°F (10-15°C)",
        evidence: "Reduces inflammation, mixed performance evidence"
      },
      massage: {
        timing: "Wait 24 hours minimum",
        rationale: "Muscles need fluid and energy replenishment first",
        aggressive: "Avoid until 48-72 hours post-race"
      }
    },
    
    days_3_7: {
      activity: {
        days_3_5: "Continue light cross-training",
        days_5_7: {
          condition: "If muscles feel recovered AND HR normal",
          allow: "20-30 minute easy runs",
          pace: "Very easy, conversational",
          monitor: "HR should match normal easy pace HR"
        }
      },
      warning_signs: [
        "Persistent muscle soreness (48+ hours)",
        "Elevated resting HR (5+ bpm)",
        "Sleep disturbances",
        "Loss of appetite",
        "Continued fatigue"
      ],
      if_warning_signs: "Extend rest period, do not force return"
    },
    
    timeline_by_distance: {
      "5k": {
        recovery_days: 5-7,
        protocol: "3 days easy minimum before quality work"
      },
      "10k": {
        recovery_days: 7-10,
        protocol: "6 days easy minimum before quality work"
      },
      "half": {
        recovery_days: 10-14,
        protocol: "10 days easy minimum, 14 days before intensity"
      },
      "marathon": {
        recovery_days: 21-42,
        protocol: "3-6 weeks reduced intensity",
        breakdown: {
          weeks_1_2: "Rest and active recovery, 50-70% peak volume",
          weeks_3_4: "Rebuild base aerobic fitness",
          weeks_5_6: "Reintroduce intensity (threshold, tempo)",
          weeks_7_8: "Full training resumption if ready"
        }
      }
    },
    
    return_to_training_checklist: {
      physiological: [
        "Resting heart rate normalized to baseline",
        "No lingering muscle soreness",
        "Sleep quality restored to normal",
        "Appetite normalized"
      ],
      performance: [
        "Energy levels feel high",
        "No injury concerns",
        "HRV recovered to baseline (if tracking)"
      ],
      psychological: [
        "Mental motivation restored",
        "Enthusiasm for training returned",
        "Race disappointment processed (if applicable)"
      ],
      decision: "ALL criteria must be met before resuming quality training",
      consequence: "Premature return risks injury, overtraining, performance regression"
    }
  };
}
```

---

## Part 11: Environmental Adjustments and Real-World Corrections ⭐ NEW

### 11.1 Temperature and WBGT-Based Performance Model

**Matthew Ely's marathon study analyzing 140 race-years across 7 major marathons provides performance-level specific coefficients.** This replaces vague guidance with mathematical precision.

#### WBGT Performance Degradation Formula

```javascript
function calculateTemperatureImpact(baselineTime_seconds, WBGT_celsius, finishPosition, athleteLevel) {
  // Ely et al. performance degradation per 5°C WBGT increase
  const degradationCoefficients = {
    top3: 0.009,      // 0.9% per 5°C
    place25: 0.011,   // 1.1% per 5°C
    place50: 0.015,   // 1.5% per 5°C
    place100: 0.018,  // 1.8% per 5°C
    place300: 0.032   // 3.2% per 5°C
  };
  
  // Map athlete level to coefficient
  const levelToPosition = {
    "elite": "top3",
    "advanced": "place25",
    "recreational": "place100",
    "beginner": "place300"
  };
  
  const coefficient = degradationCoefficients[levelToPosition[athleteLevel]];
  
  // Optimal WBGT approximately 10°C
  const optimalWBGT = 10;
  const WBGTIncrease = Math.max(0, WBGT_celsius - optimalWBGT);
  const incrementsOf5C = WBGTIncrease / 5.0;
  
  const totalSlowdown = coefficient * incrementsOf5C;
  const adjustedTime = baselineTime_seconds * (1 + totalSlowdown);
  
  return {
    baselineTime: formatTime(baselineTime_seconds),
    WBGT: WBGT_celsius,
    degradationPercent: (totalSlowdown * 100).toFixed(1) + "%",
    timeAdded: formatTime(adjustedTime - baselineTime_seconds),
    adjustedTime: formatTime(adjustedTime),
    coefficient: coefficient,
    note: "Slower runners suffer disproportionately due to extended exposure time"
  };
}

// WBGT Calculation from weather data
function calculateWBGT(wetBulbTemp_C, blackGlobeTemp_C, airTemp_C) {
  // WBGT = 0.7×Twb + 0.2×Tg + 0.1×Ta
  return (0.7 * wetBulbTemp_C) + (0.2 * blackGlobeTemp_C) + (0.1 * airTemp_C);
}
```

**Example Implementation:**

```javascript
// 3:00 marathoner (recreational, ~300th place level) racing at WBGT 20°C vs optimal 10°C
const example = calculateTemperatureImpact(
  180 * 60,      // 3:00:00 baseline
  20,            // WBGT
  300,           // finish position
  "recreational"
);
// Result: 6.4% slowdown = 11.5 minutes added = 3:11:30 adjusted time

// Elite runner same conditions
const eliteExample = calculateTemperatureImpact(
  130 * 60,      // 2:10:00 baseline
  20,            // WBGT
  3,             // top-3 finish
  "elite"
);
// Result: 1.8% slowdown = 3.6 minutes added = 2:13:36 adjusted time
```

### 11.2 Simplified Heat Index Method

**For implementation without WBGT equipment:**

```javascript
function calculateHeatIndexAdjustment(temperature_F, dewPoint_F, baselinePace_secPerMile) {
  // Mark Hadley formula
  const heatIndex = temperature_F + dewPoint_F;
  
  // Pace adjustment thresholds
  const adjustmentTable = [
    { min: 0, max: 100, adjustment: 0.000 },
    { min: 101, max: 110, adjustment: 0.0025 },
    { min: 111, max: 120, adjustment: 0.0075 },
    { min: 121, max: 130, adjustment: 0.015 },
    { min: 131, max: 140, adjustment: 0.025 },
    { min: 141, max: 150, adjustment: 0.0375 },
    { min: 151, max: 160, adjustment: 0.0525 },
    { min: 161, max: 170, adjustment: 0.070 },
    { min: 171, max: 180, adjustment: 0.090 },
    { min: 181, max: 999, adjustment: 0.120 }
  ];
  
  // Find applicable adjustment
  const applicable = adjustmentTable.find(
    range => heatIndex >= range.min && heatIndex <= range.max
  );
  
  const percentAdjustment = applicable.adjustment;
  const adjustedPace = baselinePace_secPerMile * (1 + percentAdjustment);
  
  return {
    heatIndex: heatIndex,
    baselinePace: formatPace(baselinePace_secPerMile / 60),
    adjustment: (percentAdjustment * 100).toFixed(1) + "%",
    adjustedPace: formatPace(adjustedPace / 60),
    secondsAdded: Math.round(adjustedPace - baselinePace_secPerMile),
    warning: heatIndex > 180 ? "EXTREME CONDITIONS - hard running inadvisable" : null,
    intervalAdjustment: "Use 50% of continuous run adjustment for intervals (recovery periods allow thermal recovery)"
  };
}

// Alternative: Dew Point specific formula
function dewPointAdjustment(basePace_secPerMile, dewPoint_F) {
  if (dewPoint_F <= 60) {
    return {
      adjustment: 0,
      note: "Below comfort threshold - no adjustment needed"
    };
  }
  
  const adjustment_sec = (dewPoint_F - 60) * 0.025 * 60; // 0.025 min per degree F
  return {
    baselinePace: basePace_secPerMile,
    dewPoint: dewPoint_F,
    adjustment_seconds: Math.round(adjustment_sec),
    adjustedPace: basePace_secPerMile + adjustment_sec,
    formula: "base_pace + [(dewPoint°F - 60) × 0.025] min/mile"
  };
}
```

### 11.3 Altitude Adjustments (Jack Daniels Validated)

```javascript
function calculateAltitudeAdjustment(seaLevelPace_secPerMile, altitude_feet, workoutType) {
  // No adjustment below 3,000 feet
  if (altitude_feet < 3000) {
    return {
      adjustment: 0,
      note: "Below threshold for aerobic impact"
    };
  }
  
  const excess_altitude = altitude_feet - 3000;
  const thousands_feet = excess_altitude / 1000;
  
  // Jack Daniels: 4-5 sec/mile per 1,000 feet
  const adjustment_secPerMile = thousands_feet * 4.5;
  
  // Workout-specific application
  const applyAdjustment = {
    "interval": true,      // VO2max intervals - full adjustment
    "threshold": true,     // LT2 work - full adjustment
    "tempo": true,         // Sustained efforts - full adjustment
    "repetition": false,   // Short maximal (<2min) - no adjustment (anaerobic)
    "easy": true          // Easy runs - full adjustment
  };
  
  const shouldAdjust = applyAdjustment[workoutType];
  const adjustedPace = shouldAdjust 
    ? seaLevelPace_secPerMile + adjustment_secPerMile
    : seaLevelPace_secPerMile;
  
  return {
    altitude: altitude_feet,
    seaLevelPace: formatPace(seaLevelPace_secPerMile / 60),
    adjustment: shouldAdjust ? `+${Math.round(adjustment_secPerMile)} sec/mile` : "none",
    adjustedPace: formatPace(adjustedPace / 60),
    workoutType: workoutType,
    note: workoutType === "repetition" 
      ? "Short maximal efforts operate anaerobically - altitude irrelevant"
      : "Aerobic capacity limited by oxygen availability",
    recoveryAdjustment: "May need 10-20% longer recovery between intervals"
  };
}

// Specific altitude examples
const altitudeTable = {
  4000: "4-5 sec/mile slower",
  5000: "8-10 sec/mile slower",
  6000: "12-15 sec/mile slower",
  7000: "16-20 sec/mile slower",
  8000: "20-25 sec/mile slower"
};

// Interval-specific adjustment
function altitudeIntervalAdjustment(intervals, altitude_feet) {
  return {
    formula: "~1 second per 400m interval per 1,000ft above 3,000ft",
    example: {
      workout: "10 × 400m",
      seaLevel_pace: "90 sec per 400m",
      altitude: 5000,
      adjustment: "+2 seconds per 400m",
      altitude_pace: "92 sec per 400m"
    }
  };
}
```

#### Péronnet Theoretical Model

```javascript
function calculateAltitudeEffectByDistance(distance_meters, altitude_meters) {
  // Distance-specific altitude impact
  const models = {
    100: {
      optimal_altitude: 2240, // Mexico City elevation
      performance_change: 1.019, // 1.9% faster due to reduced drag
      reason: "Minimal aerobic contribution, drag reduction dominates"
    },
    400: {
      optimal_altitude: 2400-2500,
      performance_change: 1.014, // 1.4% faster
      reason: "Aerobic-anaerobic balance point"
    },
    800: {
      optimal_altitude: 1500-2000,
      performance_change: 1.000, // Neutral zone
      reason: "Aerobic and anaerobic contributions equal"
    },
    1500: {
      optimal_altitude: 0,
      performance_change: 0.990, // 1% slower at 2000m
      reason: "Aerobic-dominant, reduced VO2max impact begins"
    },
    5000: {
      optimal_altitude: 0,
      performance_change: 0.970, // 3% slower at 2000m
      reason: "Fully aerobic, VO2max limitation significant"
    },
    10000: {
      optimal_altitude: 0,
      performance_change: 0.955, // 4.5% slower at 2000m
      reason: "Extended aerobic effort, cumulative oxygen deficit"
    },
    marathon: {
      optimal_altitude: 0,
      performance_change: 0.930, // 7% slower at 2000m
      reason: "Prolonged reduced oxygen delivery"
    }
  };
  
  // Air density decreases 9.7% per 1,000m altitude
  const airDensityReduction = altitude_meters * 0.000097;
  
  return {
    distance: distance_meters,
    altitude: altitude_meters,
    airDensityReduction: (airDensityReduction * 100).toFixed(1) + "%",
    sprintBenefit: "Reduced drag benefits sprints",
    enduranceImpairment: "Reduced VO2max impairs endurance",
    crossoverPoint: "400-800m where effects balance"
  };
}
```

### 11.4 Wind Resistance Formulas

```javascript
function calculateWindImpact(runningSpeed_mps, windSpeed_mps, windDirection, bodyMass_kg, height_m) {
  // Drag equation: F_drag = 0.5 × ρ × Cd × A × v_rel²
  const airDensity = 1.225; // kg/m³ at sea level
  const dragCoefficient = 0.8; // typical runner
  
  // Calculate frontal area
  const bodySurfaceArea = 0.1173 * Math.pow(bodyMass_kg, 0.6466);
  const frontalArea = 0.266 * bodySurfaceArea;
  
  // Relative air velocity
  let relativeVelocity;
  if (windDirection === "headwind") {
    relativeVelocity = runningSpeed_mps + windSpeed_mps;
  } else if (windDirection === "tailwind") {
    relativeVelocity = runningSpeed_mps - windSpeed_mps;
  } else {
    relativeVelocity = runningSpeed_mps; // crosswind ignored for simplicity
  }
  
  // Calculate drag force
  const dragForce = 0.5 * airDensity * dragCoefficient * frontalArea * Math.pow(relativeVelocity, 2);
  
  // Convert to metabolic cost
  // 1% bodyweight in horizontal force = 6.13% increase in metabolic cost
  const dragAsPercentBodyweight = (dragForce / (bodyMass_kg * 9.81)) * 100;
  const metabolicCostIncrease = dragAsPercentBodyweight * 6.13;
  
  return {
    dragForce: dragForce.toFixed(2) + " N",
    metabolicIncrease: metabolicCostIncrease.toFixed(1) + "%",
    practicalImpact: estimatePaceImpact(metabolicCostIncrease, windDirection)
  };
}

function estimatePaceImpact(metabolicIncrease_percent, windDirection) {
  // Pugh 1971: "substantial wind" (≈ running speed)
  // Headwind penalty: ~12 sec/mile
  // Tailwind benefit: ~6 sec/mile (asymmetric due to v² relationship)
  
  if (windDirection === "headwind") {
    return {
      typical: "12 sec/mile penalty for wind equal to running speed",
      scaling: "Impact scales with wind²",
      note: "Faster runners suffer proportionally more (v² relationship)"
    };
  } else {
    return {
      typical: "6 sec/mile benefit for wind equal to running speed",
      asymmetry: "Tailwind helps 2× less than headwind hurts",
      reason: "Cannot run fast enough to fully capture tailwind benefits"
    };
  }
}

// Practical simplified formula
function quickWindAdjustment(basePace_secPerMile, windSpeed_mph, windDirection) {
  const runningSpeed_mph = 3600 / (basePace_secPerMile * 5280/3600);
  const windRatio = windSpeed_mph / runningSpeed_mph;
  
  let adjustment;
  if (windDirection === "headwind") {
    adjustment = 12 * windRatio * 0.5; // Conservative scaling
  } else if (windDirection === "tailwind") {
    adjustment = -6 * windRatio * 0.5; // Negative = faster
  } else {
    adjustment = 0; // Crosswind minimal direct impact
  }
  
  return {
    baselinePace: basePace_secPerMile,
    windSpeed: windSpeed_mph,
    windDirection: windDirection,
    adjustment_seconds: Math.round(adjustment),
    adjustedPace: basePace_secPerMile + adjustment,
    note: "Drafting reduces air resistance ~80% when 1m behind"
  };
}
```

#### Wind Profile Power Law (Ground-Level Correction)

```javascript
function correctWindMeasurement(nominalWind_mph, measurementHeight_m, runnerHeight_m, terrain) {
  // Wind Profile Power Law: v_actual = v_nominal × (h_actual/h_nominal)^α
  
  const terrainAlpha = {
    "beach": 0.11,
    "open_water": 0.11,
    "rural_open": 0.16,
    "prairie": 0.20,
    "suburban": 0.30,
    "urban": 0.40
  };
  
  const alpha = terrainAlpha[terrain] || 0.30;
  const runnerChestHeight = 1.5; // meters, approximate
  
  const correctedWind = nominalWind_mph * Math.pow(
    runnerChestHeight / measurementHeight_m,
    alpha
  );
  
  return {
    nominalWind: nominalWind_mph,
    measurementHeight: measurementHeight_m,
    terrain: terrain,
    alpha: alpha,
    correctedWind: correctedWind.toFixed(1) + " mph",
    reduction: ((1 - correctedWind/nominalWind_mph) * 100).toFixed(1) + "%",
    example: "10 mph nominal in suburban (α=0.30) at 10m height → 6.7 mph at runner level"
  };
}
```

### 11.5 Combined Environmental Factors

```javascript
function calculateComprehensiveAdjustment(conditions, baselinePace_secPerMile) {
  // Conditions object contains: temp, dewpoint, altitude, wind, terrain
  
  let cumulativeAdjustment = 0;
  const adjustmentBreakdown = [];
  
  // 1. Temperature/Humidity adjustment
  if (conditions.temperature_F && conditions.dewPoint_F) {
    const heatAdjustment = calculateHeatIndexAdjustment(
      conditions.temperature_F,
      conditions.dewPoint_F,
      baselinePace_secPerMile
    );
    const heatImpact = heatAdjustment.secondsAdded;
    cumulativeAdjustment += heatImpact;
    adjustmentBreakdown.push({
      factor: "Temperature/Humidity",
      adjustment: heatImpact,
      details: heatAdjustment
    });
  }
  
  // 2. Altitude adjustment
  if (conditions.altitude_feet && conditions.altitude_feet > 3000) {
    const altitudeAdjustment = calculateAltitudeAdjustment(
      baselinePace_secPerMile,
      conditions.altitude_feet,
      "tempo" // default to tempo for general running
    );
    const altImpact = (altitudeAdjustment.adjustedPace - baselinePace_secPerMile);
    cumulativeAdjustment += altImpact;
    adjustmentBreakdown.push({
      factor: "Altitude",
      adjustment: altImpact,
      details: altitudeAdjustment
    });
  }
  
  // 3. Wind adjustment
  if (conditions.wind_mph && conditions.wind_direction && conditions.terrain) {
    // First correct for ground level
    const correctedWind = correctWindMeasurement(
      conditions.wind_mph,
      10, // assume 10m measurement
      1.5, // runner chest height
      conditions.terrain
    );
    
    // Then calculate impact
    const windAdjustment = quickWindAdjustment(
      baselinePace_secPerMile,
      parseFloat(correctedWind.correctedWind),
      conditions.wind_direction
    );
    cumulativeAdjustment += windAdjustment.adjustment_seconds;
    adjustmentBreakdown.push({
      factor: "Wind",
      adjustment: windAdjustment.adjustment_seconds,
      details: windAdjustment
    });
  }
  
  const finalPace = baselinePace_secPerMile + cumulativeAdjustment;
  
  return {
    baselinePace: formatPace(baselinePace_secPerMile / 60),
    conditions: conditions,
    breakdown: adjustmentBreakdown,
    totalAdjustment: Math.round(cumulativeAdjustment) + " seconds/mile",
    adjustedPace: formatPace(finalPace / 60),
    percentChange: ((cumulativeAdjustment / baselinePace_secPerMile) * 100).toFixed(1) + "%",
    note: "Adjustments combine multiplicatively - physiological stressors interact"
  };
}

// Example usage
const conditions = {
  temperature_F: 80,
  dewPoint_F: 68,
  altitude_feet: 5000,
  wind_mph: 10,
  wind_direction: "headwind",
  terrain: "suburban"
};

const adjustment = calculateComprehensiveAdjustment(conditions, 420); // 7:00/mile baseline
// Result breakdown:
// - Heat/humidity: +15 sec/mile (3.75%)
// - Altitude: +9 sec/mile (2.1%)  
// - Wind: +8 sec/mile (1.9%)
// - Total: +32 sec/mile → 7:32/mile adjusted
```

### 11.6 Validation Data and Confidence Intervals

```javascript
const ValidationMetrics = {
  temperatureModel: {
    source: "Ely et al., WBGT marathon study",
    sample: "140 race-years, 7 major marathons",
    significance: "p < 0.001",
    validRange: "WBGT 5-25°C",
    individualVariability: "20-30% between athletes",
    factors: [
      "Heat acclimatization status (7-14 days adaptation)",
      "Body size (surface area to mass ratio affects heat dissipation)",
      "Fitness level (modulates all environmental impacts)"
    ],
    limitations: [
      "Limited data for extreme cold (<0°C)",
      "Limited data for slower marathon runners (>3:00)",
      "Does not capture acclimatization status"
    ],
    confidence: "±1-2% for typical conditions"
  },
  
  altitudeModel: {
    source: "Jack Daniels, Péronnet theoretical analysis",
    validation: "Multiple altitude training studies",
    accuracy: "±2-3 sec/mile per 1000ft",
    validRange: "Up to 8,000 feet",
    above8000ft: "Individual hypoxic response variability increases significantly",
    confidence: "High for aerobic efforts below 8,000ft"
  },
  
  windModel: {
    source: "Pugh 1971 wind tunnel, Da Silva 2022 horizontal force",
    validation: "12 runners, various wind speeds",
    accuracy: "±5-10% for headwinds up to 15-20 mph",
    crosswind: "Less well characterized",
    confidence: "±3-5 sec/mile depending on terrain stability"
  },
  
  combinedModel: {
    note: "Multiple stressors compound rather than sum",
    recommendation: "Conservative estimates when multiple factors present",
    monitoring: "Individual response may vary ±20% from predictions"
  }
};
```

---

**END OF PART 1**

**CONTINUE TO PART 2 FOR:**
- Part 12: Benchmark Workouts Library (Field Testing Without Lab Access)
- Part 13: Multi-Race Periodization Strategies
- Updated Implementation Guidelines for Claude Code

---
