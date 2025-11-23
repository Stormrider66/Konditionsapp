# Architectural Specification for Algorithmic Endurance Training: The Pyramidal Philosophy

## 1. Executive Summary and Architectural Vision

The development of a computational engine for endurance training prescription requires a shift from static scheduling to dynamic, physiologically grounded algorithmic logic. While recent trends in popular fitness media have disproportionately amplified the "Polarized" (80/20) training model, a rigorous analysis of elite training logs, physiological literature, and historical methodology reveals that the Pyramidal Training (PYR) model represents the most robust, scalable, and historically validated framework for distance running, particularly for events ranging from the 5,000m to the Marathon. For an application powered by advanced logic such as Claude Code, understanding Pyramidal training is not merely about cataloging workout types; it necessitates a deep dissection of the non-linear relationships between training volume, intensity distribution, and metabolic adaptation.

The Pyramidal philosophy is distinct in its acceptance of a continuum of intensity. Unlike the Polarized model, which treats moderate intensity (Zone 2 in a 3-zone model) as a "black hole" to be avoided, the Pyramidal architecture embraces this domain as the foundational engine of aerobic durability. The distribution is characterized by a massive aerobic base (Zone 1), a supportive and substantial tier of threshold/tempo work (Zone 2), and a precise, capped peak of high-intensity VO2 max work (Zone 3). This structure—wide at the bottom and narrowing as intensity increases—mimics the physiological reality of adaptation cost: the body can absorb vast amounts of low-intensity stress, moderate amounts of threshold stress, but only limited amounts of severe anaerobic stress.

Crucially, recent comparative efficacy studies indicate that while Polarized training can be effective for short-term VO2 max boosting or highly specific elite subsets, Pyramidal training often yields superior consistency, injury prevention, and race-specific adaptations for half-marathon and marathon distances. Furthermore, longitudinal analysis suggests that many athletes who conceptually identify as "Polarized" essentially execute a Pyramidal distribution when their training is quantified by "time-in-zone" rather than session goal. This discrepancy highlights a critical insight for software design: the engine must quantify physiological load (time-in-zone) rather than relying on binary session labels.

This report provides an exhaustive analysis of the Pyramidal training philosophy to serve as the "ground truth" for an algorithmic training engine. It will delineate the physiological mechanisms (such as VLamax suppression and lactate shuttling), zoning taxonomies, progression algorithms, and periodization structures necessary to encode this philosophy into a dynamic, adaptive training application.

## 2. Physiological Foundations of the Pyramidal Model

To algorithmically prescribe Pyramidal training, the software engine must be built upon a robust physiological model. The effectiveness of the Pyramidal approach is not arbitrary; it is rooted in specific cellular and systemic adaptations that occur at distinct intensity domains. Understanding these mechanisms allows the algorithm to prioritize specific zones not just for variety, but for targeted metabolic engineering.

### 2.1 The Three-Domain Model and Lactate Dynamics

The scientific definition of Pyramidal training relies on three distinct intensity domains separated by two physiological thresholds: the Aerobic Threshold (LT1/VT1) and the Anaerobic Threshold (LT2/VT2). The algorithm must recognize that these are not merely "zones" but distinct metabolic states.

#### The Moderate Domain (Zone 1): The Foundation of Capillarity

The first domain, typically referred to as Zone 1 in the academic 3-zone model, encompasses all intensities below the first lactate threshold (LT1), where blood lactate concentration remains near baseline levels (<2 mmol/L). In the Pyramidal model, this is not "garbage yardage" but the primary stimulus for structural adaptation.

The physiological logic here is driven by shear stress and capillarization. Even at easy intensities, the mechanical action of muscle contraction generates shear stress within the vascular system. This stress signals the release of vascular endothelial growth factor (VEGF), which drives angiogenesis—the creation of new capillaries. Crucially, research indicates that this capillary development occurs even around fast-twitch fibers during low-intensity exercise because the arterioles supplying these fibers are dilated by the recruitment of adjacent slow-twitch fibers. This means that massive volumes of Zone 1 training build the oxygen-delivery infrastructure for the entire muscle, not just the slow-twitch fibers.

For the algorithm, this implies that Zone 1 volume is a prerequisite for high-intensity performance. Without the capillary density built in Zone 1, the metabolic byproducts generated in Zone 3 cannot be cleared effectively.

#### The Heavy Domain (Zone 2): The Lactate Shuttle Engine

The second domain, lying between LT1 and LT2 (typically 2–4 mmol/L lactate), is the distinguishing feature of the Pyramidal model. In Polarized training, this zone is minimized. In Pyramidal training, it is essential.

The physiological argument for Zone 2 (Pyramidal style) centers on lactate kinetics and MCT transporter density. Lactate is not merely a waste product but a potent fuel source. During exercise in the Heavy Domain, glycolytic (fast-twitch) fibers produce lactate, which must be transported out of the cell and into oxidative (slow-twitch) fibers or the heart/liver to be used as fuel. This transport is mediated by Monocarboxylate Transporters (MCT1 and MCT4). Training in this domain creates a high flux of lactate—production is elevated, but clearance matches it (Maximal Lactate Steady State).

This creates a specific training adaptation: the upregulation of MCT transporters and the improvement of the "lactate shuttle." By spending significant time (15-25% of volume) in this domain, the Pyramidal athlete improves their ability to process high-intensity fuel, effectively raising the ceiling of their steady-state performance. An algorithm that skips this zone (as in strict Polarized logic) fails to optimize this specific metabolic machinery, which is arguably the most critical factor for events lasting longer than 30 minutes.

#### The Severe Domain (Zone 3): VO2 Max and VLamax

The third domain, above LT2, represents intensities where lactate accumulation is exponential and unsustainable. While this domain stimulates rapid improvements in VO2 max (maximum oxygen uptake), it comes with a metabolic cost: the increase of VLamax (maximal glycolytic rate).

A critical insight for the engine logic is the trade-off between anaerobic power and aerobic efficiency. High-intensity training (Zone 3) raises VLamax. For a 5K runner, a high VLamax is useful for kick speed. However, for a marathon runner, a high VLamax is detrimental because it increases the rate of carbohydrate combustion at sub-maximal speeds, leading to faster glycogen depletion. Pyramidal training, with its heavy emphasis on Zone 1 and Zone 2, naturally suppresses VLamax, forcing the body to rely on fat oxidation and preserving glycogen stores. This makes Pyramidal training mechanically superior for long-distance durability compared to models that over-emphasize Zone 3.

### 2.2 Zoning Taxonomy and User Mapping

One of the most significant challenges in algorithmic training prescription is the translation of physiological intent (3-Zone Model) into user execution (typically 5-Zone Consumer Model). A disconnect here leads to the "Grey Zone" error, where athletes train too hard on easy days and too easy on hard days.

#### The Algorithmic Translation Matrix

The engine must possess a translation layer that maps the 3-Zone scientific inputs to the 5-Zone outputs displayed on user devices (Garmin, Strava, Polar, Apple).

| Seiler Zone (Science) | Physiological Markers | Garmin/Consumer Zone | Algorithmic Prescription Logic |
|----------------------|----------------------|---------------------|-------------------------------|
| **Zone 1 (Base)** | < LT1<br>< 2mmol/L Lactate<br>Talk Test: Comfortable | Zone 1 (Warm-up)<br>Zone 2 (Easy) | **Constraint:** Hard cap at top of Garmin Z2.<br>**Purpose:** Structural integrity, mitochondrial density.<br>**Warning:** Drifting into Garmin Z3 violates the pyramid base logic. |
| **Zone 2 (Threshold)** | LT1 - LT2<br>2-4 mmol/L Lactate<br>Talk Test: Strained | Zone 3 (Aerobic)<br>Low Zone 4 (Threshold) | **Target:** "Sweet Spot" to "Lactate Threshold."<br>**Purpose:** Lactate clearance, MCT upregulation.<br>**Context:** This is the "Pyramid Middle." Must be prescribed as work, not recovery. |
| **Zone 3 (Severe)** | > LT2<br>> 4mmol/L Lactate<br>Talk Test: Impossible | High Zone 4<br>Zone 5 (Maximum) | **Target:** VO2 Max / Anaerobic Capacity.<br>**Purpose:** Central cardiac output, neuromuscular recruitment.<br>**Constraint:** Capped at 5-10% volume to prevent VLamax spikes in marathoners. |

**Insight for Engine Design:** The most common error in automated training plans is the conflation of Garmin Zone 3 (Moderate) with "Junk Miles." In the Pyramidal philosophy, Garmin Zone 3 is not junk if it is programmed deliberately as "Aerobic Threshold" or "Marathon Pace" work. The engine must differentiate between "drifting into Zone 3 out of lack of discipline" (bad) and "targeting Zone 3 for metabolic stability" (good). This distinction is vital for the feedback loop—if a user enters Zone 3 during a recovery run, the system flags an error; if they enter it during a steady-state run, the system flags success.

## 3. The Pyramidal Training Intensity Distribution (TID)

With the physiological zones defined, the next architectural requirement is the logic for distributing volume across these zones. "Pyramidal" describes the shape—wide base, narrowing middle, sharp peak—but the algorithm requires precise ratios to function.

### 3.1 The Golden Ratios of the Pyramid

Research reviewing elite endurance athletes, particularly in rowing and marathon running, consistently identifies a specific distribution of training intensity that correlates with long-term success. The standard Pyramidal ratio for the algorithmic baseline should be set as follows:

- **Zone 1 (Base): 70% - 80% of Total Time**
- **Zone 2 (Threshold): 15% - 25% of Total Time**
- **Zone 3 (Severe): 0% - 10% of Total Time**

This distribution differs significantly from the Polarized model, which typically prescribes an 80/0/20 or 75/5/20 split. The Pyramidal model effectively "steals" volume from the high-intensity Zone 3 and reallocates it to Zone 2. This trade-off is based on the concept of "adaptive cost." Zone 3 work carries a high autonomic and neuromuscular cost, requiring 48-72 hours of recovery. Zone 2 work, while metabolically taxing, carries a lower central fatigue cost, allowing for greater accumulation of volume.

### 3.2 Volume-Dependent Morphologies

The "Pyramid" is not a static shape; it morphs based on the athlete's total training volume. The engine must apply Volume-Dependent Logic to adjust the TID ratios.

#### The Low-Volume Athlete (< 5 Hours/Week)

For an athlete training 3-4 times per week, a strict Polarized approach (20% intensity) results in very low absolute minutes of quality work (e.g., 36 minutes of intensity per week). This may be insufficient to drive adaptation.

- **Algorithmic Adjustment:** The engine should shift toward a "Steep Pyramid" or "Threshold-Heavy" model.
- **Logic:** Zone 2 (Threshold) intensity provides a higher aerobic return-on-investment per minute than Zone 1, without the injury risk of Zone 3.
- **Ratio Shift:** Z1: 60% | Z2: 30% | Z3: 10%

#### The High-Volume Athlete (> 10 Hours/Week)

As volume increases, the proportion of intensity must decrease to preserve homeostasis. An elite runner doing 100 miles a week cannot survive 20% of that volume (20 miles) at VO2 max pace.

- **Algorithmic Adjustment:** The engine must broaden the base and cap the absolute volume of quality.
- **Logic:** Zone 3 volume does not scale linearly. It hits a physiological ceiling (typically around 30-40 minutes of time-in-zone per session).
- **Ratio Shift:** Z1: 85% | Z2: 12% | Z3: 3%

### 3.3 Time-in-Zone vs. Session-Goal Quantification

A critical nuance for the data ingestion module of the app is how training is counted.

- **Session-Goal Method:** A session is categorized by its main set. A "Interval Session" is counted entirely as "Hard," including warm-up and cool-down.
- **Time-in-Zone Method:** Every minute is categorized based on heart rate or power.
- **Relevance:** Research shows that when analyzing elite logs via the "Session-Goal" method, they appear Polarized (80/20). However, when analyzed via "Time-in-Zone," they appear Pyramidal (lots of time accumulates in Zone 2 during warm-ups, recovery intervals, and steady runs).
- **Engine Rule:** The engine should plan based on Time-in-Zone. This ensures that the "hidden" volume in Zone 2 is accounted for and contributes to the Pyramidal structure rather than being accidental "junk."

## 4. The Engine Room: Threshold Training Mechanics

If Zone 1 is the foundation, Zone 2 (Threshold) is the structure's load-bearing framework. The differentiating factor of a Pyramidal app is its sophisticated handling of this zone. Unlike Polarized apps that might only prescribe "Easy" and "Hard," a Pyramidal engine requires a nuanced library of Threshold modalities.

### 4.1 The Physiology of Lactate Clearance

The goal of Zone 2 training is to improve the velocity at the Lactate Threshold (vLT2). This is achieved not by running at the limit where the system crashes (Zone 3), but by running just below or at the limit where lactate production and clearance are in equilibrium. This state maximizes the chemical signaling for mitochondrial respiration and MCT transporter proliferation without inducing the severe acidosis that damages cell structures and requires long recovery.

### 4.2 Modality A: Cruise Intervals (The Daniels Logic)

Jack Daniels, a seminal figure in Pyramidal methodology, introduced "Cruise Intervals" as a superior alternative to continuous tempo runs.

- **The Concept:** By breaking a threshold run into segments separated by very short rest intervals (e.g., 1 minute), an athlete can clear just enough lactate to lower blood acidity, allowing them to maintain the threshold intensity for a greater total duration than they could continuously.
- **Mathematical Advantage:** A runner might struggle to hold Threshold Pace (T-Pace) for 25 continuous minutes (psychological and thermal drift). However, they can likely complete 6 x 5 minutes (30 mins total) or 4 x 1 mile (approx. 28-32 mins total) at the same pace with 60-second breaks.
- **Engine Implementation:** The engine should prioritize Cruise Intervals for intermediate runners to accumulate volume.
  - **Standard:** 1-mile repeats at T-Pace with 1 min rest.
  - **Progression:** Increase volume (number of reps) before increasing pace.
- **Constraints:** Daniels suggests capping total T-Pace volume at 10% of weekly mileage. The engine must enforce this cap to prevent overtraining.

### 4.3 Modality B: Continuous Tempo (The Pfitzinger Logic)

Pete Pfitzinger, another architect of Pyramidal marathon training, emphasizes continuous blocks of "Lactate Threshold" work, typically ranging from 4 to 7 miles (or 20 to 40 minutes).

- **The Concept:** Continuous pressure forces mental adaptations (focus, pain tolerance) and thermal regulation adaptations that intervals might mask.
- **Engine Implementation:** These should be scheduled during the "Specific Phase" for Half-Marathon and Marathon plans.
- **Pacing Logic:** Pfitzinger defines this as 15K to Half-Marathon race pace. The engine must calculate this range dynamically based on VDOT or recent race times.

### 4.4 Modality C: Advanced Broken & Alternating Tempos

For advanced users, the engine needs "Special Block" workouts that manipulate lactate dynamics.

#### The "Alternating Tempo"

This workout involves continuous running where the pace oscillates between "faster than threshold" (e.g., 10K pace) and "slower than threshold" (e.g., Marathon Pace).

- **Mechanism:** The fast segment floods the muscles with lactate. The "float" segment (MP) is too fast for passive recovery; it forces the muscles to actively consume the lactate as fuel while maintaining a high cardiac output. This is the ultimate "Lactate Shuttle" workout.
- **Engine Recipe:** 3 sets of [5 min @ 10K Pace / 5 min @ Marathon Pace] - continuous.

#### The Hilly Broken Tempo

Combining terrain with intensity.

- **Engine Recipe:** 3 miles Tempo + 3 mins jog + 4 x 30sec Hill Sprints + 3 mins jog + 3 miles Tempo. This targets motor unit recruitment (hills) under fatigue.

## 5. Periodization Algorithms

A static weekly template is not training; it is merely exercise. To drive adaptation, the engine must organize time into macrocycles and mesocycles using periodization logic. The Pyramidal model supports specific periodization transitions that the engine must execute.

### 5.1 Linear Periodization and the Lydiard Legacy

The grandfather of Pyramidal training, Arthur Lydiard, established a linear progression that remains valid for the engine's "Standard Mode."

- **Phase 1 (Base):** Focus on Zone 1 volume. Engine maximizes frequency and duration of E-runs.
- **Phase 2 (Strength):** Introduction of Hills and Zone 2 Threshold work. Engine introduces Tempo runs.
- **Phase 3 (Anaerobic/Sharpening):** Introduction of Zone 3 intervals. Engine transitions some Zone 2 work to Zone 3.
- **Phase 4 (Coordination/Taper):** Volume drops, intensity is maintained but with full recovery.

### 5.2 The "Pyramidal to Polarized" Switch

A sophisticated insight derived from recent research (specifically Filipas et al.) suggests a "Pyramidal to Polarized" periodization pattern is superior for maximizing performance in shorter endurance events (5K/10K).

- **The Logic:** The Pyramidal phase (Base/Build) builds the metabolic infrastructure (mitochondria, lactate transporters). The Polarized phase (Peak) sharpens the neural drive and VO2 max while ensuring freshness by removing the fatigue-inducing middle zone.
- **Engine Logic for 5K Plans:**
  - Weeks 1-8: Pyramidal Distribution (Heavy Zone 2).
  - Weeks 9-12: Polarized Distribution (Drop Zone 2, add Zone 3).
  - **Why:** This prevents the "staleness" associated with prolonged threshold work and peaks the athlete specifically for the high-intensity demands of a 5K.

### 5.3 Volume Management Rules

The engine must govern volume progression to prevent injury.

- **The 10% Rule:** Do not increase total weekly volume by more than 10% rolling average.
- **Step-Back Weeks:** Every 3rd or 4th week, the engine must automatically reduce volume by 20-30%. This "consolidation week" is where adaptation physically occurs (supercompensation).
- **The Long Run Cap:** The Long Run should not exceed 30-35% of the total weekly volume to prevent structural breakdown. If a user runs 20 miles a week, the engine should not prescribe a 10-mile long run.

## 6. Workout Library and Progression Logic

The application requires a database of workout primitives. However, these primitives must have associated Progression Logic—the engine needs to know how to make the workout harder next week.

### 6.1 Zone 1 Primitives (The Foundation)

- **Recovery Run:**
  - Intensity: <70% HR Max.
  - Logic: Must follow a hard workout or long run. Duration <45 mins.

- **General Aerobic:**
  - Intensity: 70-75% HR Max.
  - Logic: The standard daily filler.

- **Long Run:**
  - Intensity: 70-80% HR Max.
  - Logic: The anchor of the week. Progression: Add 1-2 miles per week.

### 6.2 Zone 2 Primitives (The Threshold Engine)

This is where the engine needs the most variety.

| Workout ID | Name | Structure Example | Progression Logic |
|-----------|------|------------------|-------------------|
| Z2_CI | Cruise Intervals | 4 x 1 mile @ T-Pace (1 min rest) | Phase 1: Add volume (5x1, 6x1).<br>Phase 2: Reduce rest (45s, 30s). |
| Z2_CT | Continuous Tempo | 20 mins @ T-Pace | Phase 1: Increase duration (25, 30, 35, 40 mins).<br>Phase 2: Break into 2x20 if >40 mins. |
| Z2_MP | Marathon Tempo | 8 miles @ Marathon Pace | Increase distance (10, 12, 14 miles). Critical for marathon plans. |
| Z2_BT | Broken Tempo | 2 x 15 mins @ T-Pace (3 min rest) | Increase rep duration (2x20) or reduce rest. |

### 6.3 Zone 3 Primitives (The Sharpening Tool)

Used sparingly (5-10% volume), primarily in the final phases of training.

| Workout ID | Name | Structure Example | Progression Logic |
|-----------|------|------------------|-------------------|
| Z3_VO2 | Classic VO2 Max | 5 x 3 mins @ 5K Pace (2 min rest) | Increase volume (5x4 mins) or density (reduce rest). |
| Z3_400 | Speed Reps | 10 x 400m @ Mile Pace (400m rest) | Increase pace or volume (12x400m). |
| Z3_PYR | Pyramid Intervals | 1-2-3-4-3-2-1 mins Hard (Eq. jog rest) | Maintain structure, increase pace. |

## 7. Event-Specific Adaptation Algorithms

The "Pyramid" shape must adapt based on the user's target race. The engine cannot treat a 5K and a Marathon as scalar variations of the same plan; they require different metabolic architectures.

### 7.1 The Marathon Pyramid

For the marathon, the pyramid base widens, and the "middle" (Zone 2) becomes the dominant quality sector.

- **Zone 3 Suppression:** The engine should explicitly suppress Zone 3 work in the final 8 weeks. High levels of anaerobic work (Zone 3) increase glycolytic enzyme activity, which can increase the rate of carbohydrate combustion. For a marathoner, the goal is Glycogen Sparing (fat oxidation). Too much Zone 3 work can essentially "teach" the body to burn sugar too fast, leading to a bonk.
- **Specific Workout:** The engine should prioritize "Fatigued Threshold" runs—tempo runs placed after a block of easy miles (e.g., 10 miles easy + 4 miles T-Pace). This simulates the specific demands of the final 10K of a marathon.

### 7.2 The 5K/10K Pyramid

For the 5K, the pyramid must support a higher peak.

- **VLamax Consideration:** Unlike the marathon, a 5K runner benefits from a higher VLamax (anaerobic power). Therefore, the engine should schedule regular Zone 3 work.
- **Periodization Shift:** As noted in section 5.2, the engine should switch to a Polarized distribution in the final 4-6 weeks. This means the "Threshold" workouts (Zone 2) are replaced by "Race Pace" intervals (Zone 3) to sharpen neuromuscular recruitment and tolerance to severe acidosis.

## 8. User Inputs, Feedback Loops, and Auto-Regulation

For the engine to be "smart," it needs feedback loops. It cannot simply dispense a static PDF-style plan. It must react to data.

### 8.1 Inputs: The VDOT Anchor

The engine must calculate paces precisely. "Run Hard" is subjective; "Run 6:50/mile" is actionable.

- **Input:** Recent race time (e.g., 22:00 5K).
- **Calculation:** The engine calculates VDOT (approx. 45) and derives training paces:
  - Easy: 9:00 - 9:40 / mile.
  - Threshold (T-Pace): 7:30 / mile.
  - Interval (I-Pace): 6:55 / mile.
- **Maintenance:** Every 4-6 weeks, the engine should prompt a "Test Workout" (e.g., a 20-minute time trial or a Parkrun) to recalibrate VDOT and ensure progressive overload.

### 8.2 Feedback Loop: Cardiac Drift (Decoupling)

If the user wears a heart rate monitor, the engine can track Aerobic Decoupling (Pw:HR).

- **The Metric:** Comparing the ratio of Pace to Heart Rate in the first half of a run vs. the second half.
- **The Rule:** If HR rises >5% while pace remains steady (or pace drops while HR remains steady) during a Zone 1 or Zone 2 run, it indicates a lack of aerobic durability.
- **Engine Action:** If high decoupling is detected consistently, the engine should reduce the intensity of upcoming Quality sessions and increase the volume of Zone 1 (Base) work to reinforce the aerobic foundation. This prevents the user from building a "house of cards" (high speed, no endurance).

### 8.3 Feedback Loop: Failed Workouts

- **Scenario:** User fails to hit the splits on a Zone 2 Cruise Interval session.
- **Diagnosis:** Likely fatigue or incorrect VDOT.
- **Engine Action:** Do NOT force a harder workout next week. Repeat the same workout logic. If failure repeats, suggest a VDOT reduction (drop training paces by 1-2%).

## 9. Conclusion

The Pyramidal Training philosophy represents a "Goldilocks" solution to endurance programming. It avoids the monotony of high-volume/low-intensity training by including substantial threshold work, yet it avoids the burnout risks of high-intensity/low-volume approaches by capping severe stress.

For the development of a Claude Code-powered training engine, the Pyramidal model offers a distinct advantage: it is highly computable. Its ratios (75/20/5) are stable, its progression logic (Linear Periodization) is mathematical, and its primary mechanism (Lactate Threshold improvement) is measurable.

By implementing the architectural specifications detailed in this report—specifically the differentiation of Zone 2 "Threshold" work via Cruise Intervals, the event-specific periodization shifts (Pyramidal to Polarized for 5K), and the strict adherence to time-in-zone volume limits—the application can generate training plans that are not only scientifically sound but dynamically adaptive to the user's physiology. The result is a system that acts not merely as a scheduler, but as a digital physiologist, guiding the user through the complex non-linearities of adaptation with algorithmic precision.

## Table 1: The Pyramidal Training Matrix for Engine Logic

| Variable | Base Phase | Build Phase | Peak Phase (5K) | Peak Phase (Marathon) |
|----------|------------|-------------|----------------|----------------------|
| **Zone 1 Volume** | 85-90% | 75-80% | 80-85% | 70-75% |
| **Zone 2 Volume** | 10-15% | 15-20% | 5-10% | 20-30% |
| **Zone 3 Volume** | <5% | 5% | 10-15% | <5% |
| **Key Workout** | Steady State Run | Cruise Intervals | VO2 Max Intervals | Long Tempo / MP Run |
| **Progression** | Increase Duration | Increase Density (Less Rest) | Increase Intensity (Speed) | Increase Duration |
| **Physiological Goal** | Mitochondria / Capillarity | Lactate Clearance / MCT | Aerobic Power (VO2) | Glycogen Sparing / Economy |

## Table 2: Algorithm Ruleset Summary

| Rule Name | Trigger | Action | Source Logic |
|-----------|---------|--------|--------------|
| **The 10% Cap** | Weekly Volume Calculation | If New_Vol > Current_Vol * 1.10, Set New_Vol = Current_Vol * 1.10 | Injury Prevention |
| **The 8% Quality Cap** | T-Pace Volume Calculation | If T-Pace_Vol > 0.10 * Weekly_Vol, Reduce Interval Reps | Daniels Rule |
| **The 5K Polarized Switch** | 4 Weeks from Race | Change TID from Pyramidal (75/20/5) to Polarized (80/0/20) | Peaking Optimization |
| **The Marathon Z3 Lock** | 8 Weeks from Race | Remove all Z3 Intervals; Replace with Z2 Tempo | Glycogen Sparing |
| **Decoupling Safety** | HR Drift > 5% | Revert to previous week's volume; Reduce Z2 intensity | Aerobic Deficiency |

## References

- inscyd.com: Polarized training vs Pyramidal training - Which Method Suits For Your Athlete?
- pmc.ncbi.nlm.nih.gov: The training intensity distribution among well-trained and elite endurance athletes
- pmc.ncbi.nlm.nih.gov: Does Lactate-Guided Threshold Interval Training within a High-Volume Low-Intensity Approach Represent the "Next Step" in the Evolution of Distance Running Training?
- pmc.ncbi.nlm.nih.gov: Polarized and Pyramidal Training Intensity Distribution: Relationship with a Half-Ironman Distance Triathlon Competition
- trainingpeaks.com: Polarized vs. Pyramidal Training — Which is Better For Your Athletes?
- reddit.com: What's your opinion/interpretation on the research of polarised vs pyramidal training? (r/AdvancedRunning)
- endureiq.com: Training intensity distributions: From Polarized to Pyramidal models, specificity is key in Long Distance Triathlon
- scienceofultra.com: Training Intensity Distribution
- azum.com: 3 vs. 5 Zone model, which one suits you the most?
- garmin.com: How you can train by heart rate zones using Garmin
- trainingpeaks.com: The Importance of Lactate Threshold and How to Find Yours
- trainerroad.com: Understand Pyramidal Training
- researchgate.net: Polarized and pyramidal training intensity distributions in distance running: an integrative literature review
- marktosques.com: Jack Daniels' Phase II - Running
- physicalrules.com: Threshold Training: Finding your T-pace
- coachray.nz: Jack Daniels' Running Intensity
- reddit.com: What should my Cruise interval pace be? (r/running)
- reddit.com: LT Workout Structure (r/AdvancedRunning)
- reddit.com: Pfitz LT runs? (r/AdvancedRunning)
- runningwithrock.com: Pfitzinger Marathon Plan: Pros and Cons of Pete's Approach
- runnersconnect.net: Tempo Training – Alternating Tempos
- run.outsideonline.com: Workout of the Week: Over/Under Intervals
- mcmillanrunning.com: The Hilly Broken Tempo Workout
- lauranorrisrunning.com: Periodization Training: Undulating, Linear and More
- pmc.ncbi.nlm.nih.gov: Effects of 16 weeks of pyramidal and polarized training intensity distributions in well‐trained endurance runners
- pubmed.ncbi.nlm.nih.gov: Training Periodization, Methods, Intensity Distribution, and Volume in Highly Trained and Elite Distance Runners: A Systematic Review
- mymottiv.com: Advanced Marathon Training
