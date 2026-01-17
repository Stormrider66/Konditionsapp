# Physiological Algorithmic Logic for Endurance Training Applications

## Volume-Dependent Intensity Distributions, Threshold Dynamics, and Methodology Prioritization

---

## Introduction

The digitization of endurance training has fundamentally transitioned from the passive logging of external load metrics—distance, duration, and frequency—to the complex, algorithmic prescription of internal physiological stress. Contemporary fitness applications act as digital surrogates for human coaches, tasked with the immense responsibility of prescribing training loads that optimize adaptation while mitigating the risk of non-functional overreaching or injury. The efficacy of such software architecture relies not on the aesthetic presentation of data, but on the sophistication of the underlying physiological logic gates that govern the distribution of intensity, the definition of metabolic zones, and the periodization of stress over time.

A robust training algorithm must transcend the "one-size-fits-all" application of popular methodologies. While the "80/20 rule"—or Polarized Training (POL)—has been empirically validated in elite populations, the direct transposition of such distributions to recreational athletes with limited training volume (<6 hours/week) presents significant physiological contradictions. Furthermore, the boundaries of training zones are not static mathematical derivatives of heart rate reserve; they are elastic physiological states that compress and expand as an athlete's metabolic fitness fluctuates. An effective app must therefore function as a dynamic expert system, capable of ingesting biomarkers—specifically maximal oxygen uptake (VO₂max) and lactate threshold (LT) kinetics—to constantly recalibrate the "dose" (intensity and duration) based on the "response" (fitness changes and recovery status).

This report provides an exhaustive analysis of the physiological research required to implement sophisticated logic for volume-adjusted intensity distribution, fitness-dependent zone modulation, periodization hierarchy, and sport-specific adaptations for low-frequency or team-sport athletes. By synthesizing data from exercise physiology, including the efficacy of Polarized (POL) versus Threshold (THR) training models across varying volumes, the impact of metabolic fitness on the "aerobic window" (the gap between LT1 and LT2), and the structural demands of microcycle planning in team sports, this document outlines the blueprints for a next-generation adaptive training engine.

---

## 1. Volume-Adjusted Intensity Distribution Logic

The initial and perhaps most critical logic gate in an algorithmic training builder is the determination of Training Intensity Distribution (TID) based on the user's available training volume. The pervasive adoption of the "80/20 rule" suggests that 80% of training sessions (or total time) should be performed at low intensity (Zone 1 in a 3-zone model, typically below the first lactate threshold, LT1) and roughly 20% at high intensity (Zone 3, above the second lactate threshold, LT2), with a deliberate minimization of time spent in the "threshold" zone (Zone 2). However, this distribution is largely derived from retrospective analyses of elite athletes—rowers, cross-country skiers, and runners—who sustain training volumes ranging from 15 to 30 hours per week. Implementing this ratio strictly for a recreational user training 3–5 hours per week requires a nuanced physiological adjustment to avoid "undertraining" the aerobic system and to ensure the total training impulse (TRIMP) is sufficient to drive adaptation.

### 1.1 The Efficacy of Polarization at Low Volumes

The debate regarding the applicability of polarized training to time-crunched athletes centers on the concept of "stimulus density." Research indicates that the effectiveness of POL is maintained, and often amplified, even at lower training volumes, though the margin of superiority over Threshold (THR) or High-Volume Low-Intensity (HVT) models narrows as total hours decrease.

A seminal study by Muñoz et al. (2014) provides critical insight for algorithm development targeting recreational runners training approximately 3–5 hours per week. The study compared a polarized group (spending ~77% of time in Zone 1, 3% in Zone 2, and 20% in Zone 3) against a threshold-focused group (46% Zone 1, 35% Zone 2, 19% Zone 3). Both groups improved 10km performance significantly, but the polarized group showed a greater magnitude of improvement (5.0% vs. 3.6%), particularly in the subset of runners who adhered most strictly to the prescribed intensity zones. This finding challenges the assumption that low-volume athletes must rely on threshold work to compensate for lack of volume. It suggests that even at ~4 hours of training per week, the "quality" of the high-intensity signal in POL, combined with the autonomic recovery facilitated by Zone 1, creates a superior adaptive environment compared to the "moderate stress" of constant threshold work, which often leads to autonomic stagnation.

However, the "stress floor" concept implies that a minimum volume of Zone 1 work is required to stimulate specific pathways. Mitochondrial biogenesis is largely driven by the calcium-signaling pathway (CaMK), which is sensitive to the duration of muscle contraction (volume), while the 5' AMP-activated protein kinase (AMPK) pathway is stimulated by energy depletion (intensity). In elite athletes, the massive volume of Zone 1 (15+ hours) provides a robust aerobic stimulus through the CaMK pathway alone. For an athlete training 3 hours per week, adhering strictly to 80/20 implies only ~36 minutes of high intensity and ~2.4 hours of easy running per week. Some physiologists argue that for time-crunched athletes, the "easy" volume is insufficient to drive central adaptations (such as significant increases in stroke volume), and thus, a shift toward "Sweet Spot" or Threshold training might be necessary to maximize the training impulse within limited time constraints.

### 1.2 Algorithmic Logic for TID Selection

The application logic should not view 80/20 as a rigid mathematical constraint but as a "fatigue management guardrail" that becomes increasingly relevant as training frequency increases. The distribution must slide dynamically based on total weekly volume and frequency.

#### 1.2.1 The Logic of the "Moderate-Intensity Rut"

Recreational athletes naturally drift toward a 50/50 distribution—spending roughly half their time at low intensity and half at moderate/threshold intensity. This occurs because true Zone 1 feels "too slow" for the ego or biomechanics of a novice, while true Zone 3 is psychologically daunting. The resulting "black hole" training leads to a "moderate-intensity rut" where the athlete is too fatigued to perform high-quality intervals but not fatigued enough to stimulate further adaptation. The algorithm must intervene by actively polarizing the schedule. If a user inputs <5 hours/week, the system should strictly enforce intensity discipline: the hard sessions must be very hard (to compensate for low volume), and the easy sessions must remain truly easy to facilitate the recovery required for those hard sessions.

#### 1.2.2 Volume-Dependent Logic Tables

The following logic structure is proposed for the app to determine the optimal TID based on weekly duration constraints. This logic synthesizes the "stimulus density" requirement of low-volume training with the "autonomic preservation" benefits of polarization.

**Table 1: Volume-Adjusted Intensity Distribution Logic**

| Weekly Volume (Hours) | Recommended TID Model | Distribution Logic (Zone 1 / 2 / 3*) | Physiological Rationale for Algorithm |
|----------------------|----------------------|-------------------------------------|---------------------------------------|
| < 3 Hours | High Intensity / Compressed | 30% / 20% / 50% | Volume is too low for significant CaMK pathway adaptations via Zone 1. Priority shifts to maximizing VO₂max and metabolic flux. "Easy" days are functionally active recovery between HIIT sessions. The goal is maximizing caloric and metabolic turnover per minute. |
| 3 – 5 Hours | Pyramidal (PYR) | 70% / 20% / 10% | Sufficient volume to build a modest aerobic base. Introduction of Threshold (Zone 2) work provides a high aerobic stimulus without the extreme autonomic fatigue of HIIT, effectively bridging the gap between base and intensity. Ideally suited for recreational competitors. |
| 5 – 9 Hours | Polarized (POL) | 80% / 5% / 15% | The "Classic" Seiler zone. Volume is high enough that fatigue from "middle zone" (Threshold) work begins to negatively impact the quality of key sessions. Strict polarization is engaged to protect recovery and autonomic balance. |
| > 9 Hours | Advanced Polarized | 85-90% / <5% / ~10% | As volume scales, the absolute amount of High-Intensity Training (HIT) an athlete can absorb plateaus (approx. 2-3 hard sessions/week). Any additional volume must be absorbed as Zone 1 to prevent overtraining syndrome (OTS). |

*Zones based on the 3-Zone Model: Z1 < LT1 (Aerobic), Z2 = LT1-LT2 (Threshold), Z3 > LT2 (Severe).*

### 1.3 Implementing the "Rule of 6" and Stress Scores

To refine this logic further, the app can utilize a "stress score" override logic, similar to the "Rule of 6" concept which balances Frequency, Volume, and Intensity. This heuristic suggests that you cannot maximize all three variables simultaneously without risking breakdown.

**Logic Gate A:** If `Training_Frequency > 4 sessions/week` AND `Total_Volume < 6 hours`, THEN `Shift_Distribution -> Polarized`.

*Reasoning:* High frequency implies limited recovery time between sessions (often <24 hours). Even with low total volume, the lack of full rest days necessitates a polarized approach to prevent the accumulation of chronic fatigue.

**Logic Gate B:** If `Training_Frequency <= 3 sessions/week`, THEN `Shift_Distribution -> Pyramidal or Threshold`.

*Reasoning:* With 4+ recovery days per week, the athlete enters each session relatively fresh. The risk of autonomic burnout is low, allowing for higher per-session intensity (Threshold work) to maximize the training effect.

### 1.4 Synthesis for Application Development

The research suggests that the "80/20 rule" is not a universal constant but an asymptote that athletes approach as their volume increases. For the <6h/week athlete, the app should prioritize frequency of stimulus and session quality over rigid polarization. The logic essentially dictates: "If you have ample recovery time (e.g., 4 rest days/week), you can afford to train harder on your training days." Conversely, "If you train every day but for short durations, you must polarize to preserve autonomic balance". The application must guide the user away from the "grey zone" not by banning Zone 2 entirely, but by contextualizing it: Zone 2 is a "hard" workout for a low-volume athlete, whereas it is a "support" workout for a high-volume athlete.

---

## 2. Fitness-Dependent Zone Width and Threshold Dynamics

The second core component of a sophisticated training algorithm is the accurate and dynamic definition of training zones. Static percentages of Maximum Heart Rate (HR_max) (e.g., Zone 2 = 60-70% HR_max) are fundamentally flawed for personalized prescription because they fail to account for the immense variability in individual metabolic fitness. The "width" of physiological zones—specifically the aerobic base (Zone 1 in a 3-zone model) and the threshold zone—changes dynamically as an athlete's fitness (VO₂max and Lactate Threshold) improves. This phenomenon, which we can term the "Accordion Effect," requires the app to calculate zones as moving targets rather than fixed integers.

### 2.1 The "Accordion Effect" of Fitness on Zone Widths

Physiological zones are bounded by distinct metabolic inflection points that respond differently to training:

- **LT1 (Aerobic Threshold / VT1):** The intensity at which blood lactate concentration rises above baseline levels (typically ~2 mmol/L). This marks the transition from purely oxidative metabolism to a mix of oxidative and glycolytic metabolism.
- **LT2 (Anaerobic Threshold / VT2 / MLSS):** The intensity at which lactate production exceeds the rate of clearance (typically ~4 mmol/L), leading to accumulation and rapid fatigue.

In untrained individuals, LT1 and LT2 are often found at relatively low percentages of VO₂max. For example, an untrained individual might hit LT1 at 50% VO₂max and LT2 at 65% VO₂max. This results in a "compressed" aerobic zone and a disproportionately wide "anaerobic reserve" (the gap between LT2 and VO₂max). Consequently, the "Zone 2" (Aerobic/Endurance) window is incredibly narrow, often only spanning 10-15 beats per minute.

In elite athletes, long-term endurance training pushes these thresholds significantly to the right. An elite marathoner might have LT1 at 75-80% VO₂max and LT2 at 90-95% VO₂max.

**Insight:** As fitness increases, the "Aerobic Zone" (below LT1) expands in terms of absolute power and pace. The athlete can run faster and produce more watts while remaining purely oxidative.

**Logic for App:** The app must decouple Heart Rate zones from Power/Pace zones. As efficiency improves, the Power at LT1 increases significantly, but the Heart Rate at LT1 may remain relatively stable or increase only slightly. Relying solely on pace will overshoot the zone if the athlete is fatigued; relying solely on HR might underestimate the physiological work if stroke volume has improved.

### 2.2 Relationship Between VO₂max and Lactate Thresholds

The relationship between VO₂max and Thresholds is non-linear and varies by fitness level. The app requires a "Fitness Coefficient" to estimate zone boundaries if direct lactate data is missing or to interpolate between test dates. Research indicates that the "fraction of utilization" (LT %VO₂max) is often a stronger predictor of endurance performance than VO₂max alone.

- **Recreational Athletes:** LT2 is typically found at 65–80% of VO₂max.
- **Elite Athletes:** LT2 is typically found at 85–95% of VO₂max.

This discrepancy creates a massive variance in the width of the "Steady State" zone.

- **Novice:** Zone 2 might be 110–130 bpm.
- **Elite:** Zone 2 might be 110–160 bpm (massive aerobic window).

#### 2.2.1 Zone Width Calculation Logic

The app should calculate zone boundaries using a sliding scale based on the user's measured or estimated fitness level (categorized by VO₂max relative to age/gender norms).

**Table 2: Fitness-Dependent Zone Boundaries (Heart Rate Model)**

| User Fitness Level | Estimated LT1 (% HRmax) | Estimated LT2 (% HRmax) | Zone 2 Width (5-Zone Model) | Implication for Training Algorithm |
|-------------------|------------------------|------------------------|----------------------------|-----------------------------------|
| Untrained / Novice (VO₂max < 35) | 55–60% | 75–80% | Narrow (15–20% range) | Extremely hard to stay in Z2; drifts easily into Z3. App must alert for "Cardiac Drift" and prescribe walk breaks. |
| Recreational / Active (VO₂max 35-50) | 65–70% | 82–87% | Moderate (15–20% range) | Standard training zones apply. Z2 is sustainable for 60-90 mins. |
| Elite / Highly Trained (VO₂max > 65) | 75–80% | 90–95% | Wide (15-20% range but higher absolute wattage) | Massive power range available for "Easy" days. LT2 is very close to HRmax, making Z4/Z5 very compressed. |

**Algorithm Formula for Zone Estimation:**

```
If Test_Data = "Available":
    Zone2_Upper_Limit = Power_at_LT1 (or HR at LT1).
    Zone4_Upper_Limit = Power_at_LT2 (or HR at LT2).

If Test_Data = "Estimated" (using VO₂max proxy):
    Fitness_Factor = (User_VO2max / Population_Norm_VO2max).
    Estimated_LT1_% = 0.60 + (0.20 × log(Fitness_Factor)).
```

*Refinement:* Use the Karvonen formula (Heart Rate Reserve) for better accuracy than %MaxHR, as it accounts for resting HR changes due to fitness improvements.

### 2.3 The "Grey Zone" Danger for Novices

For low-fitness users, the physiological gap between "comfortable" (walking) and "threshold" (jogging) is often non-existent. When an untrained person begins to jog, their heart rate often spikes immediately above LT1, placing them squarely in Zone 3 (the "Grey Zone"). This is the physiological basis for the "moderate intensity rut"—the mechanics of running force the metabolic system into a high-stress state.

**Logic:** If `Estimated_LT1_Pace < User_Jogging_Pace`, THEN `Prescribe_Walk_Run_Intervals`.

The app must recognize that continuous running for a novice is a threshold workout. Therefore, adherence to 80/20 logic dictates that the "80%" of training for this user must be walking or a structured walk/run protocol to physically remain below the aerobic threshold (Zone 1/2).

---

## 3. Methodology Override Logic: Program vs. Phase vs. Sport

A robust fitness app must handle conflicting logic sets. For example, a "Polarized" methodology might dictate easy running, but a "Soccer" sport profile demands high-intensity sprints, and a "Competition" phase requires tapering. The algorithm requires a strict Periodization Hierarchy to resolve these conflicts systematically.

### 3.1 The Periodization Hierarchy

The logic engine should follow a hierarchical structure rooted in periodization theory, prioritising constraints that are biological or fixed over those that are theoretical or preferential.

#### Hierarchy Level 1: Macrocycle (The "Season" Goal)

This is the immutable constraint governing the overall direction of training.

- **Logic:** If `Season_Phase = "Off-Season"`, force `TID = Base (Pyramidal/Polarized)`. High volume, low intensity to rebuild aerobic foundation.
- **Logic:** If `Season_Phase = "Pre-Competition"`, allow `TID = Threshold/Specific`. Specificity increases; intensity distribution mimics race demands.
- **Logic:** If `Season_Phase = "Taper"`, reduce Volume by 40-60%, maintain Intensity (to prevent detraining of fast-twitch fibers), and increase Rest.

#### Hierarchy Level 2: Mesocycle (The Current Block - 3-6 weeks)

This level dictates the specific TID model (POL, PYR, THR) currently in play.

**Block Periodization Logic:** The app should cycle methodologies to prevent stagnation.

- Week 1-3 (Accumulation): Pyramidal (Focus on Z1/Z2 to build work capacity).
- Week 4-6 (Transmutation): Polarized (Focus on Z1/Z3) or Threshold (Focus on Z2), depending on the target event distance (Long distance = Threshold; Short distance = Polarized).
- Week 7 (Realization): Taper/Recovery.

**Override:** A user selection of "Methodology: Polarized" at the global settings level overrides the Mesocycle default, unless it conflicts with Sport Safety (Level 3).

#### Hierarchy Level 3: Sport Specificity (The Biological Demands)

This level overrides TID distributions if the sport's demands are incompatible with the selected methodology.

**Example (Team Sports):** A soccer player cannot strictly follow a Polarized endurance model during the competitive season because the "match" is a massive stochastic load that defies simple Z1/Z3 categorization. The match itself imposes a specific load that must be subtracted from the weekly "allowance".

**Logic:** `Weekly_Load_Capacity - Match_Load = Available_Training_Load`.

If `Sport = "Soccer"` AND `Phase = "In-Season"`, THEN Methodology defaults to Microcycle Periodization (Tactical Periodization) regardless of user preference for "80/20". The distribution must be dictated by recovery from and preparation for the match.

#### Hierarchy Level 4: Daily Bio-Feedback (The "Ready to Train" State)

This is the final override, ensuring safety and daily adaptation.

**Logic:** If `HRV_Status = "Low"` OR `Resting_HR = "High"` (>2 SD above baseline), THEN `Downgrade_Session_Intensity` (e.g., convert Threshold run to Recovery run) regardless of the Plan or Phase.

### 3.2 Methodology Conflict Resolution Matrix

The app needs a decision matrix for when a user selects conflicting parameters (e.g., "Marathon Training" program but "HIIT" methodology).

**Table 3: Methodology Conflict Resolution Matrix**

| Conflict Scenario | Priority Winner | Logic / Action |
|-------------------|-----------------|----------------|
| Base Phase vs. HIIT Methodology | Phase | Force Base parameters (LIT). High intensity in Base phase undermines aerobic development. Alert user: "HIIT not recommended in Base." |
| Team Sport vs. Polarized | Sport | Matches are "Threshold/Anaerobic" soup. Treat Match as the "Hard" session. Polarize the remaining days (make them easy) to ensure recovery. |
| Low Volume (<3h) vs. 80/20 | Volume | Override 80/20. Shift to Pyramidal or HIIT to ensure stimulus sufficiency. There is not enough time to accumulate the volume required for Polarized benefits. |
| Injury History vs. Intensity | History | If `Injury_Risk = High`, cap Zone 3 volume. Override standard TID to reduce mechanical load. Shift focus to cross-training or Zone 2. |

---

## 4. Adaptations for Low-Frequency and Team-Sport Athletes

Applying endurance-centric models (like Seiler's 80/20) to team sport athletes (Soccer, Rugby, Hockey) or low-frequency runners requires significant adaptation. The "Norwegian Method" (Double Threshold) has gained popularity, but its application to amateurs and team sports requires a "Lite" version that respects the specific constraints of these populations.

### 4.1 The "Norwegian Singles" Logic for Amateurs

The "Norwegian Method" traditionally involves high volume and double threshold sessions (AM/PM) to maximize time at ~3.0 mmol/L lactate without incurring the excessive fatigue associated with training above LT2. For the amateur training 3–5 times a week, double days are impractical and recovery-prohibitive.

**The Adaptation: "Norwegian Singles"**

Instead of 2x sessions in one day, the logic distributes "Sub-Threshold" work across the week.

- **Intensity Control:** The app must rigidly cap intensity at LT2 (Anaerobic Threshold). The goal is controlled hardness, not "all-out" effort. The mantra is "stimulation, not annihilation."

**Logic for App:**

```
If User_Type = "Recreational" AND Method = "Norwegian":
    Schedule: 2-3 "Sub-Threshold" sessions per week (e.g., 3 x 10min @ LT2 pace or 5 x 6min).
    Zone Constraint: NO "Zone 5" (VO2max) work. The focus is exclusively on raising the floor (LT1) 
                     and the ceiling (LT2) through volume at intensity, not maximal effort.
    Zone Boundaries: The "Threshold" zone in this mode is defined strictly as 82-87% HRmax 
                     or 2.5-3.5 mmol/L lactate.
```

### 4.2 Team Sport Microcycle Logic (Soccer)

Team sports operate on a microcycle revolving around Match Day (MD). The external load (distance, sprints) and internal load (HR, RPE) fluctuate predictably relative to the game.

#### 4.2.1 The Tactical Periodization Microcycle

The app must implement a countdown logic from MD, adjusting the physiological focus daily:

- **MD (Match Day):** The "Mega-Session". High load, mixed intensity.
- **MD+1 (Recovery):** Passive or active recovery (Zone 1). Crucial for clearing metabolites and reducing muscle tone.
- **MD-4 (Strength/Loading):** High mechanical load, moderate metabolic load. Focus on neuromuscular power.
- **MD-3 (Endurance/Loading):** The highest volume training day of the week. Focus on large spaces, high aerobic demand (Zone 3/4). This is the key "Training Stimulus" day where "Match Replication" occurs.
- **MD-2 (Speed/Taper):** Low volume, high intensity (short sprints, reaction). Focus on alactic power without lactate accumulation.
- **MD-1 (Activation):** Very low volume, moderate intensity "primers". Neural potentiation.

#### 4.2.2 Quantifying "Match Equivalent" Load

A major challenge in team sports is that training often fails to replicate the peak intensity of match play. The app should use Match Equivalent (ME) as a unit of measure.

**Logic:**

1. Calculate `Match_Load` (e.g., 90 mins, 10km distance, 15 mins > 90% HRmax).
2. Analyze Training Week: If `Weekly_Training_Load < Match_Load`, the user is likely undertrained for the demands of the game.
3. **Recommendation:** The app should prescribe "Match Replication" intervals (e.g., 4 x 4 mins @ 90-95% HRmax) on MD-3 specifically for users who are bench players or have no mid-week game.

#### 4.2.3 Heart Rate Zone Distribution in Soccer Matches

Data shows players spend ~65% of match time between 70-90% HRmax and significant time >90% HRmax. However, typical training often lacks this high-end exposure due to frequent stoppages.

**App Logic:** Monitor "Time > 90% HRmax" (Red Zone) on a weekly basis.

If `Weekly_Red_Zone_Minutes < 20 mins` (for a starter), ADD `High_Intensity_Intervals` to the MD-3 session.

This ensures the "fitness floor" required for match play is maintained and protects against the "spike" in load that occurs during the match itself.

---

## Conclusion

The development of a next-generation fitness app based on VO₂ and lactate data requires a paradigm shift from static, template-based planning to fluid, biologically-driven algorithms. This analysis highlights four defining architectural pillars for such a system:

1. **Volume-Gated Intensity:** The "80/20" rule is an ideal physiological state, not a universal starting requirement. For users training <4 hours, the system must prioritize stimulus density (Pyramidal/Threshold) over polarization to ensure sufficient adaptation pressure.

2. **Dynamic Topography:** Training zones are not fixed windows but accordion-like ranges that expand with fitness. The app must dynamically calculate "Zone 2" width based on the user's estimated VO₂max/LT convergence, widening the aerobic window for the fit and narrowing it (while prescribing walk/run protocols) for the novice.

3. **Hierarchical Decision Making:** A rigid hierarchy (Season > Sport > Methodology > Biofeedback) ensures that training logic remains coherent and safe. Sport-specific demands (e.g., a soccer match) must mathematically overwrite generic endurance methodology preferences.

4. **Sport-Specific Translation:** "Norwegian" training for amateurs means "controlled sub-threshold volume" spread across the week, not double days. For team sports, the "Weekly Microcycle" relative to Match Day is the governing time unit, requiring the app to balance loading and tapering on a rolling 7-day basis.

By embedding these physiological rules into the software's backend, the application moves beyond simple tracking to become an intelligent, adaptive coaching engine capable of guiding athletes from their first 5k to elite competitive performance.

---

## Technical Appendix: Algorithm Logic Tables

**Table 4: Soccer Microcycle Intensity Template (One Match Week)**

| Day | Relation to Match | Focus | Est. Intensity (%HRmax) | Primary Zone |
|-----|-------------------|-------|------------------------|--------------|
| Monday | MD+2 (or Off) | Recovery / Off | <60% | Zone 1 |
| Tuesday | MD-4 | Strength / Loading | Mixed (Gym + Field) | Z1 + Muscular Load |
| Wednesday | MD-3 | Endurance Loading | 85-95% (Intervals) | Zone 3 / 4 |
| Thursday | MD-2 | Speed / Tactical | <70% (Short Sprints) | Z1 + Z5 (Alactic) |
| Friday | MD-1 | Activation | 60-70% | Zone 1 / 2 |
| Saturday | MD | MATCH | Variable (Avg >85%) | Zone 4 / 5 |
| Sunday | MD+1 | Recovery | <60% | Zone 1 |

This framework provides the essential logic for coding the training generation engine.
