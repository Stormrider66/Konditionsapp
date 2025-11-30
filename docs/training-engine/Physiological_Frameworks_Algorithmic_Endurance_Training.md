# Physiological Frameworks for Algorithmic Endurance Training: A Comprehensive Analysis of Cross-Country Skiing, Triathlon Swimming, and HYROX

## 1. Introduction: The Metabolic Basis of Algorithmic Prescription

The development of modern training applications represents a paradigm shift from descriptive logging to prescriptive coaching. By utilizing Maximal Oxygen Uptake (VO₂max) and Blood Lactate Concentration ([La⁻]) as primary input variables, a training algorithm can bypass the inaccuracies inherent in heart rate-based training—such as cardiac drift, dehydration effects, and sympathoadrenal decoupling—to target specific metabolic adaptations with high precision. This report provides the domain-specific physiological logic required to train a "Claude Code" based application, focusing on three distinct bioenergetic modalities: the high-efficiency aerobic demands of Cross-Country Skiing, the hydrodynamic constraints of Triathlon Swimming, and the concurrent strength-endurance threshold of HYROX competition.

In the context of algorithmic prescription, VO₂max serves as the determinant of the athlete's aerobic "ceiling," quantifying the maximum volume of oxygen the body can utilize during intense exercise. However, for the practical segmentation of training intensity, blood lactate kinetics provide the necessary "floor" and "threshold" markers. The application must identify two critical inflection points: the Aerobic Threshold (LT1), typically observed around 1.5–2.0 mmol/L, which demarcates steady-state oxidative work from tempo intensity; and the Anaerobic Threshold (LT2 or MLSS), typically ranging from 3.0 to 4.5 mmol/L, which represents the upper limit of metabolic stability where lactate production equals clearance.¹ By mapping these physiological anchor points to the specific biomechanical demands of skiing, swimming, and functional fitness, the application can prescribe training loads that are mathematically rigorous and physiologically sound.

---

## 2. Cross-Country Skiing: Biomechanics, Zoning, and the Vasaloppet Model

Cross-country skiing serves as the gold standard for aerobic development, often eliciting the highest VO₂max values recorded in human physiology due to the simultaneous recruitment of upper and lower body musculature.² However, the sport has undergone a radical transformation in recent decades, shifting from a lower-body dominant diagonal stride to an upper-body dominant double poling technique, particularly in long-distance events like Vasaloppet. This shift necessitates a complete reimagining of training logic, prioritizing upper-body lactate tolerance and "gross efficiency" over simple cardiovascular capacity.

### 2.1 The Swedish and Norwegian Intensity Frameworks

To build a robust training algorithm for skiing, one must integrate the distinct yet complementary guidelines of the Swedish Ski Association (Svenska Skidförbundet - SSF) and the Norwegian Olympiatoppen model. While SSF focuses on the developmental pathway known as "Blågula Vägen," Olympiatoppen provides the granular intensity scale (I-Scale) essential for precise data quantification.

#### 2.1.1 The Olympiatoppen Intensity Scale (The I-Zone Logic)

The Olympiatoppen scale, widely adopted across Nordic endurance sports, divides intensity into eight specific zones. For an algorithmic application, this 8-zone system is superior to the standard 5-zone model because it explicitly accounts for the decoupling of heart rate and lactate during high-intensity and anaerobic work.¹

**Zone I-1 (Low Intensity / Base Endurance):**

This zone constitutes the vast majority of training volume, typically 80-90% of annual hours for elite skiers. Physiologically, it is defined by a lactate concentration below 1.5 mmol/L and a heart rate between 55% and 72% of HRmax.¹ The primary algorithmic error to flag in this zone is "intensity creep," where athletes inadvertently drift into Zone I-2, accumulating autonomic fatigue without achieving the specific adaptations of threshold training. The application must enforce a strict "ceiling" on pace or heart rate during I-1 sessions to ensure mitochondrial biogenesis without glycogen depletion.

**Zone I-2 (Moderate Intensity / Steady State):**

Occupying the range of 72% to 82% HRmax with lactate values between 1.0 and 2.0 mmol/L, Zone I-2 is often referred to as the "grey zone" in polarized training models.¹ However, in the context of long-distance ski races like Vasaloppet (4–10 hours), this zone represents "race pace" for the recreational athlete. The algorithm should prescribe I-2 work specifically for long continuous sessions (over 2 hours) where lipid oxidation (FatMax) is the primary metabolic target, rather than for shorter daily training runs where it creates fatigue with suboptimal adaptation.³

**Zone I-3 (Threshold / Anaerobic Threshold):**

This is the critical zone for performance development in distance skiing. Defined by heart rates of 82-87% and lactate levels of 1.5–3.5 mmol/L, Zone I-3 represents the maximal intensity an athlete can sustain for 45–60 minutes.¹ The Norwegian model emphasizes "controlled" interval training in this zone, such as 6 × 10 minutes or 4 × 15 minutes, where the athlete finishes the session feeling "comfortably hard" rather than exhausted. The application's logic must distinguish I-3 from I-4; in I-3, the accumulation of lactate is stable. If the user's lactate input rises continuously during an I-3 interval (e.g., 2.5 → 3.0 → 3.8 → 4.5 mmol/L), the algorithm must flag this as a pacing error, as the athlete has crossed into VO2 kinetics.³

**Zone I-4 (High Intensity / VO2max Intervals):**

Targeting 87-92% HRmax and lactate values typically between 3.0 and 6.0 mmol/L, this zone is utilized for increasing maximal aerobic power.¹ The classic "Norwegian Interval" model (e.g., 4 × 4 minutes) resides here. Unlike I-3, where the goal is threshold expansion, I-4 aims to stress the cardiac output and oxygen extraction capabilities. The algorithm should prescribe these sessions sparingly (1-2 times per week) and monitor recovery closely, as the autonomic stress response is significantly higher than in I-3.⁴

**Zone I-5 (Maximal Aerobic Power):**

This zone approaches 100% of VO₂max and typically involves lactate accumulation exceeding 6.0–10.0 mmol/L.¹ Efforts are short (1–3 minutes). For a Vasaloppet-focused application, I-5 is less critical for race specificity but valuable for lifting the physiological "ceiling," creating headroom for sub-maximal efficiency.

#### 2.1.2 SSF Guidelines and "Blågula Vägen"

The Swedish Ski Association's "Blågula Vägen" (Blue-Yellow Way) provides a Long-Term Athlete Development (LTAD) framework that the application should use to tailor plans based on "Training Age".⁵ The model emphasizes that biological maturation dictates the focus of training. For users aged 15-20, the focus is on speed (Zone 7/8 in SSF terms, which corresponds to neuromuscular sprints) and aerobic base. As the athlete matures into the senior ranks, the focus shifts toward specific threshold capacity (Zone A3 in SSF, equivalent to Olympiatoppen I-3).⁷ The app should utilize this logic to prevent "old man training" (slow grinding) in young athletes, ensuring they develop the requisite neural speed before layering on massive aerobic volume.

### 2.2 The Vasaloppet Logic: 90km of Specificity

Vasaloppet is not merely a long ski race; it is a specialized discipline requiring a distinct physiological profile. The course is 90km long, primarily flat or gently undulating, with a significant uphill start.⁸ This profile rewards "Double Poling" (Stakning) efficiency above all else.

#### 2.2.1 The Shift to Double Poling (Stakning)

Modern analysis of Vasaloppet reveals that performance is highly correlated with upper-body sustained power output. Elite athletes now complete the entire race without "kick wax," relying solely on double poling.⁹ For the training app, this necessitates a shift in focus from "leg VO2" to "upper-body lactate tolerance." The algorithm must quantify training load specifically for the triceps, latissimus dorsi, and abdominal muscles.

**Biomechanics of Stakning:**

Effective double poling is not an arm movement; it is a "crunch" utilizing body weight. The application should include technical cues derived from elite mechanics:

- **High Hips:** The skier must maintain a high center of gravity before the pole plant to utilize potential energy.¹⁰
- **The Lock:** Upon impact, the elbow angle should be relatively fixed. The force is generated by "hanging" on the poles and flexing the trunk (crunching), rather than extending the triceps immediately.¹⁰
- **Return Phase:** Rapid extension of the hips to return to the high position is critical for high stroke frequency.

The app can prescribe drills such as "Locked Arm Stakning" (skiing with rigid arms to force core engagement) to reinforce this biomechanical pathway.¹⁰

#### 2.2.2 Seasonal Periodization for Vasaloppet

A valid training algorithm must periodize the year according to the constraints of the sport (snow availability).

**Phase 1: The Dryland Foundation (May – August)**

During this phase, specific ski muscles are developed without snow.

- **Roller Skiing (Rullskidor):** The primary mode of training. The app should emphasize "resistance training" on roller skis using resistance wheels (tröga hjul) to simulate snow friction.¹¹
- **Running with Poles (Skidgång/Elghufs):** This is the most effective dryland simulation of the cardiovascular demand of skiing. "Elghufs" (Moose Hoofing) involves bounding uphill with poles, mimicking the diagonal stride. It allows users to reach Zone I-4/I-5 heart rates that are difficult to achieve on roller skis due to high speeds and traffic safety.¹²
- **General Strength:** Focus on heavy slow resistance for the core and upper body to build the structural integrity required for thousands of poling repetitions.

**Phase 2: Specific Preparation (September – November)**

- **SkiErg Intervals:** The SkiErg is a vital tool for standardization. The app can use 5000m tests to set baseline zones.¹³ Workouts should focus on "Threshold Stakning" (e.g., 10 × 1000m at I-3 pace) to build the local muscular endurance of the upper body.
- **Technique Intensity:** Roller ski sessions shift to higher intensity intervals (I-3/I-4) on uphill terrain to maximize cardiac output.²

**Phase 3: Snow Adaptation and Volume (December – February)**

- **Volume Ramp:** As snow becomes available, volume increases. Long sessions (3–5 hours) are critical to train glycogen sparing and fat oxidation.
- **Seeding Races:** The algorithm must schedule "test races" (40km+) to seed the user into the correct Vasaloppet start group. These serve as the highest specificity training, practicing fueling and mass-start tactics.⁸

### 2.3 Algorithmic Integration of Skiing Data

To function effectively, the "Claude Code" app must normalize skiing data against running or cycling data.

**The "Modality Gap":** VO₂max and HRmax are typically lower in upper-body dominant exercise (poling) than in running due to smaller active muscle mass. The algorithm must accept a separate "Skiing HR Max" or apply a correction factor (typically -5 to -10 bpm from Running HR Max) when calculating zones for SkiErg or Double Poling sessions.¹

**Lactate Correlation:** A lactate value of 4.0 mmol/L in double poling represents a significantly higher relative stress than 4.0 mmol/L in running, due to the smaller muscle mass clearing the lactate. The app should adjust the I-3 threshold for poling down to ~2.5–3.0 mmol/L to prevent overtraining.³

---

## 3. Triathlon Swimming: Hydrodynamics, CSS, and Swedish Structure

Swimming within a triathlon context differs fundamentally from competitive pool swimming. The open water environment eliminates the need for tumble turns and underwater dolphin kicking, replacing them with the need for sighting, continuous rhythm, and energy conservation for the subsequent bike and run. Furthermore, the fluid dynamics of water—being approximately 800 times denser than air—mean that drag reduction offers a significantly higher return on investment than increased power output.

### 3.1 The Critical Swim Speed (CSS) Algorithm

For an algorithmic training application, Heart Rate is a notoriously unreliable metric in swimming due to the "diving reflex" (bradycardia upon facial immersion), horizontal body position (increasing venous return and stroke volume), and the cooling effect of water. Therefore, Critical Swim Speed (CSS) serves as the primary intensity anchor. CSS is mathematically defined as the theoretical pace a swimmer can maintain continuously without exhaustion, serving as a functional proxy for the Maximal Lactate Steady State (MLSS) in the water.¹⁵

#### 3.1.1 The CSS Test Protocol

The application must guide the user through a standardized testing protocol to derive accurate training zones.

1. **Warm-up:** 300–500 meters of easy swimming, including technical drills to prime the neuromuscular system.
2. **Trial 1 (400m):** A maximal effort 400-meter time trial. The user must pace this evenly but exhaustively. The time is recorded as T₄₀₀ (in seconds).
3. **Active Recovery:** 5–8 minutes of very easy swimming or kicking to flush lactate and restore creatine phosphate stores.
4. **Trial 2 (200m):** A maximal effort 200-meter time trial. The time is recorded as T₂₀₀ (in seconds).

#### 3.1.2 The CSS Calculation Logic

The algorithm derives the CSS pace by calculating the slope of the distance-time relationship. The formula effectively removes the anaerobic contribution (dominant in the 200m) to isolate the aerobic capacity.

```
CSS (meters/sec) = (400 - 200) / (T₄₀₀ - T₂₀₀)
```

To convert this to the standard swimmer's metric of Pace per 100 meters (P₁₀₀):

```
P₁₀₀ = 100 / CSS (meters/sec)
```

**Example:**

If a user swims 400m in 6:00 (360s) and 200m in 2:50 (170s):

- Distance Difference = 200m
- Time Difference = 190s
- Speed = 1.05 m/s
- **CSS Pace = 1:35 / 100m**

This 1:35/100m pace becomes the "Threshold" anchor for all subsequent training prescriptions.¹⁵

### 3.2 CSS-Based Training Zones

Once the CSS anchor is established, the application can populate five distinct training zones. Unlike cycling power zones which are percentages, swim zones are defined by fixed time deviations from the CSS pace.¹⁵

**Table 1: CSS Training Zones and Algorithmic Logic**

| Zone | Designation | Pace Calculation (per 100m) | Physiological Target | Training Application |
|------|-------------|----------------------------|---------------------|---------------------|
| Zone 1 | Easy / Recovery | CSS Pace + 10 to 20 sec | Active Recovery, Technique | Warm-ups, cool-downs, and technical drill sets. |
| Zone 2 | Endurance / Steady | CSS Pace + 5 to 10 sec | Aerobic Capacity (LIT) | Long continuous swims (e.g., Ironman prep). Simulates open water cruising. |
| Zone 3 | Tempo / Sweet Spot | CSS Pace + 3 to 5 sec | Aerobic Power / Muscular Endurance | Long intervals (e.g., 4 × 400m). Key for 70.3 distance pacing. |
| Zone 4 | Threshold (CSS) | = CSS Pace | Lactate Threshold | The "Red Mist" sessions. 15 × 100m or 10 × 200m at CSS with short rest (10-15s). |
| Zone 5 | VO2 / Sprint | CSS Pace - 2 to 5 sec | Anaerobic Capacity | Speed development. Short distances (50m) with long rest. |

The application must periodically prompt re-testing (every 6-8 weeks) as swim fitness and technique improve rapidly, rendering old zones obsolete.¹⁹

### 3.3 The Swedish "Simlinjen" and Drill Progression

The Swedish Swimming Federation's development model, "Simlinjen," provides a structural framework for technical acquisition. While Simlinjen is designed for competitive pool swimmers, its emphasis on "Vattenvana" (Water Comfort) and "Vattenläge" (Body Position) is crucial for adult-onset triathletes.²⁰

#### 3.3.1 Technical Hierarchy for the Algorithm

The app should prioritize technical correction based on the user's CSS.

- **Level 1 (CSS > 2:00/100m):** Focus on Drag Reduction. Body position, head alignment, and breathing.
- **Level 2 (CSS 1:30–2:00/100m):** Focus on Propulsion. Catch mechanics and rotation.
- **Level 3 (CSS < 1:30/100m):** Focus on Rhythm and Stroke Rate.

#### 3.3.2 The Drill Library

The application should prescribe specific drills to address common mechanical faults identified in the triathlon population.

**Fist Drill (Simning med knutna nävar):**
- **Mechanism:** By closing the hand into a fist, the swimmer reduces the surface area of the "paddle," forcing reliance on the forearm. This promotes the "Early Vertical Forearm" (EVF) position.
- **Constraint:** The user must maintain stroke rate; if they slip, they are not engaging the latissimus dorsi.²¹

**Sculling (Skovel):**
- **Mechanism:** Small, rhythmic hand movements at the front of the stroke (Front Scull) or near the hips.
- **Purpose:** Develops the "feel for the water" (proprioception) and stability of the catch phase.²³

**The "6-1-6" Drill:**
- **Mechanism:** Kicking on the side for 6 beats, taking one stroke, and rotating to the other side for 6 beats.
- **Purpose:** Teaches longitudinal rotation and streamlined alignment, preventing the "barge" effect of swimming flat on the stomach.²¹

**Single Arm (Enarms-sim):**
- **Mechanism:** Swimming with one arm while the other rests extended in front.
- **Purpose:** Isolates asymmetry. The extended arm acts as a stability reference, forcing the swimmer to rotate around a central axis.²¹

### 3.4 Triathlon Specificity: Open Water Constraints

The application must differentiate between pool fitness and open water performance.

- **Sighting (Navigering):** The "Tarzan" drill (swimming with head up) should be integrated into warm-ups to condition the neck muscles and practice maintaining hip height while looking forward.
- **Stroke Rate (Frekvens):** In the pool, a long glide is efficient. In open water, "gliding" is often "stopping" due to chop and current. The app should encourage a slightly higher stroke rate (70–90 strokes per minute) for open water scenarios to maintain momentum and stability.²⁴
- **Drafting:** Training logic should include "pacing changes" to simulate catching a draft (Zone 4 effort) and then settling in (Zone 2 effort).

---

## 4. HYROX: Functional Threshold and Compromised Running

HYROX represents a novel endurance modality that defies traditional categorization. Combining 8 kilometers of running with 8 functional strength stations, it effectively creates a "Functional Threshold" event where the limiting factor is neither pure strength nor pure aerobic capacity, but the ability to mitigate metabolic accumulation (lactate) while switching modalities. The training application must treat HYROX as a Concurrent Training challenge, balancing the interference effect between strength and endurance.

### 4.1 Event Architecture and Physiological Demands

The race structure is standardized, allowing for precise algorithmic modeling. The event consists of 8 cycles: 1km Run followed by a specific workout station. The total time domain ranges from 60 minutes (Elite) to 90+ minutes (Open), placing it firmly in the aerobic power domain, heavily supplemented by anaerobic glycolysis during the high-tension stations.²⁵

**Table 2: HYROX Station Specifications and Physiological Load**

| Station | Exercise | Distance / Reps | Weight (Men Open) | Weight (Women Open) | Physiological Limiter |
|---------|----------|-----------------|-------------------|--------------------|-----------------------|
| Run | Running | 8 × 1000m | N/A | N/A | Aerobic Capacity / Clearance |
| 1 | SkiErg | 1000m | Standard | Standard | Upper Body Aerobic Power |
| 2 | Sled Push | 50m (4 × 12.5m) | 152 kg | 102 kg | Concentric Leg Strength / Lactate |
| 3 | Sled Pull | 50m (4 × 12.5m) | 103 kg | 78 kg | Posterior Chain / Grip |
| 4 | Burpee Broad Jump | 80m | Bodyweight | Bodyweight | Systemic Metabolic Rate (HR Spike) |
| 5 | Rowing | 1000m | Standard | Standard | Whole Body Aerobic Power |
| 6 | Farmers Carry | 200m | 2 × 24 kg | 2 × 16 kg | Grip Endurance / Core Stability |
| 7 | Sandbag Lunges | 100m | 20 kg | 10 kg | Eccentric Leg Endurance / Glutes |
| 8 | Wall Balls | 75 / 100 reps | 6 kg | 4 kg | Shoulder Endurance / Mental |

*Data derived from HYROX Rulebooks.²⁵*

### 4.2 The "Compromised Running" Algorithm

The defining characteristic of HYROX is "Compromised Running"—the alteration of running mechanics and metabolic cost due to the preceding station's fatigue. The application cannot simply prescribe a flat "4:00/km" pace; it must apply Degradation Coefficients to the target run pace based on the station just completed.²⁸

**Post-SkiErg (Run 2):** Minimal degradation. The fatigue is upper-body centric.
- *Algorithm:* Target Pace = Base 10k Pace + 0-5 seconds/km.

**Post-Sled Push (Run 3):** Major Degradation. The Sled Push creates massive lactate accumulation in the quadriceps. The "rubber leg" sensation destroys running economy.
- *Algorithm:* Target Pace = Base 10k Pace + 15-30 seconds/km. The user must be coached to "shuffle" for the first 200m to flush lactate before accelerating.

**Post-Burpee (Run 5):** The heart rate is typically maximal (Zone 5) exiting the burpees.
- *Algorithm:* Target Pace = Base 10k Pace + 10-15 seconds/km. The focus is on lowering HR.

**Post-Lunges (Run 8):** Mechanical fatigue in the glutes restricts stride length.
- *Algorithm:* Target Pace = Survival. High cadence is required to compensate for short stride.

### 4.3 Weakness Identification and Correction

The application should use benchmark data to identify user "bottlenecks" and prescribe specific corrective blocks.²⁹

#### 4.3.1 The Sled Push Bottleneck

The Sled Push is the most common "stopper" for runners. The limiting factor is often not leg strength, but friction management and kinetic chain efficiency.

- **Weakness Pattern:** Athlete stops frequently. The static friction required to restart the sled is significantly higher than kinetic friction. Frequent stops result in massive energy waste.
- **Correction Logic:** If the user's Sled Push time is > 3:00 mins (Open), the app must prescribe "Heavy Sled Intervals" focusing on continuous movement.
- **Technique Cue:** "Arms locked, hips low." Pushing with bent arms fatigues the triceps needed for the SkiErg and Wall Balls. The force must travel Spine → Hips → Sled.³⁰

#### 4.3.2 The Wall Ball Finisher

Coming at the end of the race, Wall Balls are a test of mitochondrial capacity in the deltoids.

- **Weakness Pattern:** Breaking sets into small chunks (e.g., 5 reps) due to red-lining heart rate.
- **Correction Logic:** "Compromised EMOMs." The app should prescribe sessions where Wall Balls are performed after a high-intensity run interval to simulate the race-end condition.
- **Standards:** The app must enforce the target height (3.0m for Men, 2.7m for Women) and depth (hip crease below knee) in training to ensure race validity.²⁵

### 4.4 Periodization for the Hybrid Athlete

Training for HYROX requires a careful blend of running volume and functional strength.

**The Simulation (Sim) Day:** The cornerstone of HYROX training. The app should schedule a "Sim" session 2–3 weeks prior to race day.
- **Full Sim:** Completing the full race distance.
- **Half Sim:** Doing 4 stations + 4 runs (e.g., the first half or the second half).

**Roxzone Training:** The "Roxzone" (transition area) is where minutes are lost. The app should coach the user to run the recovery, not walk. Transition drills (e.g., Run → Pick up Farmers Carry bells immediately) should be integrated into intervals to minimize "hesitation time".²⁸

---

## 5. Algorithmic Integration: Synthesizing the Logic

To create a cohesive "Claude Code" application, the disparate physiological data from these three sports must be normalized into a unified "Stress Score" or load metric.

### 5.1 The Universal Intensity Normalization

The application needs a "Rosetta Stone" to compare a 100m Swim Interval to a 50m Sled Push. The common currency is Blood Lactate and Duration at Intensity.

| Zone | Description | Load Coefficient | Examples |
|------|-------------|------------------|----------|
| Zone 1 | Recovery | 1.0 | Skiing I-1, Swim Z1, Run Z1 |
| Zone 2 | Endurance | 1.2 | Skiing I-2, Swim Z2, Run Z2 |
| Zone 3 | Threshold | 2.0 | Skiing I-3, Swim CSS, HYROX Station Work |
| Zone 4 | VO2 | 3.0 | Skiing I-4, Swim Z5, HYROX Burpees |
| Zone 5 | Anaerobic | 5.0 | Skiing I-5, Sled Push Sprints |

By calculating the time spent in each zone multiplied by the coefficient, the app can track Acute Training Load (ATL) and Chronic Training Load (CTL) across modalities, preventing overtraining even when the user switches from skiing to swimming.

### 5.2 The VO2-Lactate Feedback Loop

The user's initial prompt highlighted the use of VO2 and Lactate as inputs. The app logic should function as follows:

1. **Input:** User uploads lab data (e.g., LT2 = 175 bpm / 4.0 mmol/L).
2. **Calibration:** The app adjusts all zones. I-3 is now defined as 165–175 bpm.
3. **Prediction:** Using the user's VO2max (e.g., 60 ml/kg/min), the app predicts a theoretical HYROX run time. If the user's actual run time is significantly slower, the app identifies "Running Economy" or "Lactate Clearance" as the limiter, rather than aerobic engine size.
4. **Prescription:** The training plan effectively "morphs." If the limiter is the Engine (VO₂), the app prescribes Zone I-4 intervals. If the limiter is the Threshold (LT2 as % of VO2), the app prescribes Zone I-3 volume.⁴

This framework provides the "Claude Code" application with a scientifically rigorous, data-driven foundation to guide athletes through the complexities of modern endurance performance.

---

## References

1. Olympatoppen's intensity scale 2024 V01 English. https://olt-skala.nif.no/olt_2024_en.pdf
2. Exercise Intensity During Cross-Country Skiing Described by Oxygen Demands in Flat and Uphill Terrain - Frontiers. https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2018.00846/full
3. The Norwegian model of lactate threshold training - Marius Bakken. https://www.mariusbakken.com/the-norwegian-model.html
4. Training Session Models in Endurance Sports: A Norwegian Perspective on Best Practice Recommendations - PubMed Central. https://pmc.ncbi.nlm.nih.gov/articles/PMC11560996/
5. Svenska Skidförbundet - Utvecklingsmodellen. https://www.skidor.com/idrotter/langdakning/utbildning/utvecklingsmodellen
6. Utveckling från SSF - Frösö IF. https://frosoif.se/utveckling-fran-svenska-skidforbundet/
7. SVENSK LÄNGDSKIDÅKNING - Träningsintensitet. https://www.skidor.com/download/18.641724771851535f95012b2e/1671182695341/ssf_traningsintensitet_korr4.pdf
8. Training Program for the Vasaloppet: Your Guide to Preparing for Sweden's Iconic Ski Race - Racketnow.com. https://racketnow.com/en-gb/pages/inspiration/training-program-vasaloppet-guide-preparing-sweden-iconic-ski-race
9. Getting the most from your dryland training - Madshus. https://madshus.com/en-us/blog/p/getting-the-most-from-your-dryland-training
10. Vasaloppsskolan – Teknikträna med stakmaskin (Stakmaskin del 2 av 5) - YouTube. https://www.youtube.com/watch?v=L5WgTXDCtAw
11. Competitive Cross-Country Skiers Have Longer Time to Exhaustion Than Recreational Cross-Country Skiers During Intermittent Work Intervals - Human Kinetics Journals. https://journals.humankinetics.com/view/journals/ijspp/18/11/article-p1246.xml
12. Fall Dryland Training Tips! - Endurance Adventures. https://www.enduradv.com/2023/10/20/fall-dryland-training-tips/
13. Träningspass på stakmaskin – fem exempel - Wickström Coaching. https://wickstromcoaching.com/2019/10/13/traningspass-pa-stakmaskin-fem-exempel/
14. Träningsprogram - Vasaloppet. https://www.vasaloppet.se/lopp/loplopp/ultravasan90/trana/traningsprogram/
15. Simple CSS Calculator with Swim Training Zones - MyProCoach. https://www.myprocoach.net/calculators/critical-swim-speed/
16. Critical Swim Speed — North Endurance - Triathlon & Run Coaching. https://www.northendurance.co.uk/critical-swim-speed
17. Swim Speed & CSS Calculator | Training Zones & Race Pace. https://brenoamelo.com/pages/swim-css-calculator
18. Setting Your Swim Training Zones - Breakaway Coaching. https://www.breakaway-coaching.com/post/setting-your-swim-training-zones
19. How To Swim A Critical Swim Speed Test - Coached Fitness. https://www.coached.fitness/blogs/critical-swim-speed/
20. Intensitetszoner - SVENSK SIMIDROTT. https://svensksimidrott.se/download/18.8c3297718388dc7085dcc03/1666185246560/intensitetszoner%20Antonio%20Lutula.pdf
21. 10 essential pool swim drills for triathletes - 220 Triathlon. https://www.220triathlon.com/training/swim-training/10-essential-pool-swim-drills-for-triathletes
22. 12 Swim Drills for All Triathletes - The Empowered Athlete. https://triathlontraining-coach.com/12-swim-drills-for-all-triathletes/
23. The Only Swim Drills Triathletes Actually Need - YouTube. https://www.youtube.com/watch?v=eO8W1pWRJ1E
24. Kravanalys simning junior till senior - SVENSK SIMIDROTT. https://svensksimidrott.se/download/18.449699b418c43025a4077273/1702300715236/Kravanalys%20simning%20junior%20till%20senior_Del%201.pdf
25. HYROX Weights by Division & Workout Station - 2024/25 Season - The Fitness Experiment. https://fitnessexperiment.co/hyrox/weights/
26. The Complete Guide to HYROX Divisions: Weights, Records, and more. https://hellohyrox.com/2025/01/03/the-complete-guide-to-hyrox-divisions-weights-records-and-more/
27. Complete Guide to HYROX Competition Categories - Freeleticsgoals. https://www.freeleticsgoals.com/en/hyrox-category.html
28. HYROX Race Strategy That Helps You Pace Every Station and Run | RoxHype. https://www.roxhype.com/article/hyrox-race-strategy
29. How I Cut 2+ Minutes Off My HYROX Time By Targeting Weak Stations - Reddit. https://www.reddit.com/r/hyrox/comments/1p5jqw5/how_i_cut_2_minutes_off_my_hyrox_time_by/
30. HYROX Rulebooks - Gym Professor Blog. https://www.thegymrevolution.co.uk/blog/2024/01/11/hyrox-rulebooks/
