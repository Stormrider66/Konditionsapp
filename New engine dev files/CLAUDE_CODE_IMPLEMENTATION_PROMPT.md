# Elite Running Training Engine - Implementation Prompt for Claude Code

## Project Overview

You are tasked with building a **production-ready elite-level running training program engine** that generates individualized training programs based on physiological test data. This system must match the sophistication used by professional coaches, incorporating multiple advanced methodologies with scientifically validated protocols.

## System Architecture

### Core Components

The engine consists of these interconnected systems:

1. **Threshold Determination System** - Analyzes VO2 max and lactate curves using D-max method
2. **Athlete Categorization Engine** - Classifies runners (Beginner/Recreational/Advanced/Elite)
3. **Zone Mapping System** - Creates individualized training zones anchored to physiological thresholds
4. **Methodology Selection Engine** - Chooses optimal training approach based on athlete profile
5. **Program Generation System** - Creates periodized training plans with specific workouts
6. **Athlete Monitoring System** - Daily readiness assessment using HRV, RHR, and wellness questionnaires
7. **Automatic Modification Engine** - Adjusts training based on recovery markers
8. **Injury Management System** - ACWR-based load management and rehabilitation protocols
9. **Cross-Training System** - Maintains fitness during injury using validated equivalencies
10. **Quality Programming System** - Integrates strength training, drills, and plyometrics

---

## Part 1: Physiological Foundation and Threshold Determination

### Input Data Structure

```javascript
const AthleteData = {
  athlete: {
    name: string,
    age: number,
    gender: "male" | "female",
    experienceLevel: "beginner" | "recreational" | "advanced" | "elite",
    bodyMass_kg: number,
    height_m: number
  },
  
  // Lab test results (if available)
  labTestResults: {
    vo2max: number,  // ml/kg/min
    lactateCurve: [
      {
        intensity: number,      // km/h or m/s
        heartRate: number,      // bpm
        lactate: number        // mmol/L
      }
    ],
    testProtocol: {
      stageDuration: number,    // minutes
      restingLactate: number,
      maxHR: number,
      restingHR: number
    }
  },
  
  // Field test results (alternative to lab)
  fieldTestResults: {
    thirtyMinTT: {
      date: Date,
      totalDistance_meters: number,
      avgHR_final20min: number,
      conditions: {
        temperature: number,
        wind: string,
        terrain: string
      }
    },
    criticalVelocity: {
      timeTrials: [
        { distance: number, time: number }
      ],
      CV_result: number,
      DPrime: number,
      R2: number
    },
    recentRaces: [
      {
        date: Date,
        distance: number,
        time: number,
        avgHR: number
      }
    ]
  },
  
  // Training goals
  goals: {
    primaryRaceDistance: string,  // "5k", "10k", "half", "marathon"
    targetTime: string,            // "HH:MM:SS" or null
    races: [
      {
        date: Date,
        distance: string,
        targetTime: string,
        classification: "A" | "B" | "C"
      }
    ]
  },
  
  // Constraints and preferences
  constraints: {
    sessionsPerWeek: number,
    location: {
      altitude_feet: number,
      typical_temperature: number
    },
    availableEquipment: string[],
    injuryHistory: string[]
  }
};
```

### D-max Algorithm for LT2 Determination

**CRITICAL**: This is your PRIMARY method for determining LT2 (lactate threshold 2).

```javascript
function calculateDmax(intensity, lactate, heartRate) {
  /*
  D-max Method: Finds the point on the lactate curve with maximum 
  perpendicular distance from the baseline, representing where lactate 
  accumulation accelerates most dramatically.
  
  Steps:
  1. Fit 3rd degree polynomial: y = ax³ + bx² + cx + d
  2. Calculate baseline slope from first to last point
  3. Find point where curve tangent = baseline slope
  4. Solve: 3ax² + 2bx + (c - avgSlope) = 0
  5. Select larger root within data range
  */
  
  // Minimum 4 data points required
  if (intensity.length < 4) {
    throw new Error("Minimum 4 data points required for D-max");
  }
  
  // 1. Polynomial fit using least squares regression
  const coefficients = polynomialFit(intensity, lactate, degree=3);
  // Returns {a, b, c, d, R2}
  
  // Quality check: Require R² ≥ 0.85
  if (coefficients.R2 < 0.85) {
    throw new Error("Poor curve fit (R² < 0.85). Try Modified D-max or retest.");
  }
  
  // 2. Calculate baseline slope
  const n = intensity.length;
  const avgSlope = (lactate[n-1] - lactate[0]) / (intensity[n-1] - intensity[0]);
  
  // 3. Solve quadratic equation
  const a_quad = 3 * coefficients.a;
  const b_quad = 2 * coefficients.b;
  const c_quad = coefficients.c - avgSlope;
  
  const discriminant = b_quad * b_quad - 4 * a_quad * c_quad;
  
  if (discriminant < 0) {
    throw new Error("No real solution. Try Modified D-max.");
  }
  
  // 4. Calculate both roots, select larger
  const root1 = (-b_quad + Math.sqrt(discriminant)) / (2 * a_quad);
  const root2 = (-b_quad - Math.sqrt(discriminant)) / (2 * a_quad);
  const dmax_intensity = Math.max(root1, root2);
  
  // Validate within data range
  if (dmax_intensity < intensity[0] || dmax_intensity > intensity[n-1]) {
    throw new Error("D-max outside data range");
  }
  
  // 5. Calculate lactate at D-max
  const dmax_lactate = coefficients.a * Math.pow(dmax_intensity, 3) +
                       coefficients.b * Math.pow(dmax_intensity, 2) +
                       coefficients.c * dmax_intensity +
                       coefficients.d;
  
  // 6. Interpolate heart rate
  const dmax_hr = linearInterpolate(intensity, heartRate, dmax_intensity);
  
  return {
    intensity: dmax_intensity,
    lactate: dmax_lactate,
    heartRate: dmax_hr,
    method: "D-max",
    R2: coefficients.R2,
    confidence: coefficients.R2 >= 0.90 ? "HIGH" : "MODERATE"
  };
}
```

### Modified D-max (Preferred Method)

```javascript
function calculateModDmax(intensity, lactate, heartRate) {
  /*
  Modified D-max: More reliable than standard D-max (CV ≈ 3.4%).
  Finds last point BEFORE lactate rises ≥0.4 mmol/L above baseline.
  */
  
  // Find baseline (lowest lactate)
  const baseline = Math.min(...lactate);
  
  // Find first point where lactate rises ≥0.4 above baseline
  let startIdx = 0;
  for (let i = 0; i < lactate.length; i++) {
    if (lactate[i] >= baseline + 0.4) {
      startIdx = i > 0 ? i - 1 : 0;
      break;
    }
  }
  
  // Apply standard D-max to adjusted data
  const adj_intensity = intensity.slice(startIdx);
  const adj_lactate = lactate.slice(startIdx);
  const adj_hr = heartRate.slice(startIdx);
  
  return calculateDmax(adj_intensity, adj_lactate, adj_hr);
}
```

### LT1 Determination (Aerobic Threshold)

```javascript
function calculateLT1(intensity, lactate, heartRate) {
  /*
  LT1: Baseline + 0.5 mmol/L method
  Marks the upper limit of "easy" or conversational pace
  */
  
  // Calculate baseline (average of first 2-3 low-intensity points)
  const baseline = lactate.slice(0, 3).reduce((a, b) => a + b) / 3;
  const target = baseline + 0.5;
  
  // Find first point exceeding target
  for (let i = 0; i < lactate.length - 1; i++) {
    if (lactate[i] <= target && lactate[i+1] > target) {
      // Linear interpolation
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
        method: "Baseline + 0.5"
      };
    }
  }
  
  throw new Error("LT1 not found within test range");
}
```

### Field Testing Protocols (When Lab Unavailable)

**30-Minute Time Trial for LT2 Estimation**
- Correlation r=0.96 with MLSS
- Average pace from final 20 minutes ≈ LT2 pace
- Average HR from final 20 minutes ≈ LT2 heart rate

```javascript
function estimateLT2FromTimeTrialfunction estimateLT2FromTimeTrial(ttData) {
  /*
  30-min TT protocol:
  - Athlete runs all-out for 30 minutes
  - Record average pace and HR from final 20 minutes
  - This approximates LT2
  */
  
  return {
    intensity: ttData.avgPace_final20min,  // sec/km
    heartRate: ttData.avgHR_final20min,
    lactate: 3.0,  // Estimated (actual may vary 2.5-4.0)
    method: "30-min TT",
    confidence: "MODERATE",
    warning: "Validate with lactate testing or critical velocity protocol"
  };
}
```

### Athlete Categorization Logic

```javascript
function categorizeAthlete(vo2max, lt2Data, age, gender) {
  /*
  Categories based on VO2 max AND lactate curve positioning
  
  Beginner: Limited aerobic base, curve rises immediately
  Recreational: Basic capacity, curve starts bending at moderate intensity
  Advanced: Well-developed base, curve breaks late and steeply
  Elite: Physiologically optimized, extremely right-shifted curve
  */
  
  // Age-adjusted VO2 max thresholds (30-39 age group as reference)
  const vo2Thresholds = {
    male: {
      beginner: 31.5,
      recreational: 49.4,
      advanced: 60,
      elite: 70
    },
    female: {
      beginner: 22.8,
      recreational: 40.0,
      advanced: 52,
      elite: 60
    }
  };
  
  // LT2 as % of VO2 max
  const lt2Percent = (lt2Data.intensity / estimateVo2maxPace(vo2max)) * 100;
  
  if (vo2max < vo2Thresholds[gender].beginner || lt2Percent < 75) {
    return "beginner";
  } else if (vo2max < vo2Thresholds[gender].recreational || lt2Percent < 83) {
    return "recreational";
  } else if (vo2max < vo2Thresholds[gender].elite && lt2Percent < 88) {
    return "advanced";
  } else {
    return "elite";
  }
}
```

---

## Part 2: Training Zone Mapping

### Individualized 5-Zone System

**CRITICAL**: NEVER use generic %HRmax formulas. Always anchor zones to LT1 and LT2.

```javascript
function calculateTrainingZones(lt1, lt2, maxHR, restingHR) {
  /*
  Zone 1 (Recovery): HR < 85% of LT1_HR
  Zone 2 (Aerobic Base): 85% LT1_HR to 100% LT1_HR
  Zone 3 (Tempo): 100% LT1_HR to 94% LT2_HR
  Zone 4 (Threshold): 95% LT2_HR to 102% LT2_HR
  Zone 5 (VO2max): > 102% LT2_HR
  */
  
  return {
    zone1: {
      name: "Recovery",
      pace: {
        min: null,  // No minimum, as slow as needed
        max: lt1.intensity * 0.85
      },
      heartRate: {
        min: restingHR,
        max: Math.round(lt1.heartRate * 0.85)
      },
      lactate: {
        target: "< 1.5 mmol/L"
      },
      purpose: "Active recovery, flush out metabolites"
    },
    
    zone2: {
      name: "Aerobic Base",
      pace: {
        min: lt1.intensity * 0.85,
        max: lt1.intensity * 1.00
      },
      heartRate: {
        min: Math.round(lt1.heartRate * 0.85),
        max: lt1.heartRate
      },
      lactate: {
        target: "~1.5 - 2.0 mmol/L"
      },
      purpose: "Build mitochondria, capillaries, fat burning. High volume work."
    },
    
    zone3: {
      name: "Tempo",
      pace: {
        min: lt1.intensity * 1.00,
        max: lt2.intensity * 0.94
      },
      heartRate: {
        min: lt1.heartRate,
        max: Math.round(lt2.heartRate * 0.94)
      },
      lactate: {
        target: "~2.0 - 3.0 mmol/L"
      },
      purpose: "Marathon-specific pace, tempo. High stress 'gray zone'."
    },
    
    zone4: {
      name: "Threshold",
      pace: {
        min: lt2.intensity * 0.95,
        max: lt2.intensity * 1.02
      },
      heartRate: {
        min: Math.round(lt2.heartRate * 0.95),
        max: Math.round(lt2.heartRate * 1.02)
      },
      lactate: {
        target: "~2.5 - 4.5 mmol/L (individual)"
      },
      purpose: "Raise lactate threshold, improve lactate tolerance"
    },
    
    zone5: {
      name: "VO2 max",
      pace: {
        min: lt2.intensity * 1.02,
        max: null
      },
      heartRate: {
        min: Math.round(lt2.heartRate * 1.02),
        max: maxHR
      },
      lactate: {
        target: "> 4.5 mmol/L (accumulating)"
      },
      purpose: "Raise aerobic ceiling (VO2 max), neuromuscular power"
    }
  };
}
```

---

## Part 3: Training Methodologies

### Four Elite Training Philosophies

The engine implements four distinct training methodologies, each with specific selection criteria:

#### 1. Polarized Training (80/20)

```javascript
const PolarizedMethodology = {
  name: "Polarized (80/20)",
  
  distribution: {
    zone1: 0.80,  // 80% of training time
    zone2: 0.00,  // Minimal time in "gray zone"
    zone3: 0.20   // 20% high intensity
  },
  
  principles: [
    "Maximize time at physiological extremes",
    "Avoid moderate-intensity 'gray zone'",
    "Easy days truly easy, hard days truly hard"
  ],
  
  bestFor: ["5k", "10k"],
  athleteLevel: ["recreational", "advanced", "elite"],
  
  weeklyStructure: {
    easyDays: 4-5,
    hardDays: 2-3,
    spacing: "Minimum 48 hours between hard sessions"
  },
  
  sampleWeek: {
    monday: "60-90 min easy (Zone 1)",
    tuesday: "Intervals: 6x5min @ Zone 5 with 2min rest",
    wednesday: "45-60 min easy (Zone 1)",
    thursday: "Threshold: 2x20min @ LT2 with 3min rest",
    friday: "45-60 min easy (Zone 1)",
    saturday: "90-120 min long run (Zone 1-2)",
    sunday: "Rest or 30-45 min recovery"
  }
};
```

#### 2. Norwegian Double Threshold

```javascript
const NorwegianMethodology = {
  name: "Norwegian Double Threshold",
  
  corePrinciple: "Maximize weekly volume at threshold (2.0-3.0 mmol/L)",
  
  lactateTargets: {
    easy: "< 1.0 mmol/L (strict control)",
    threshold_AM: "2.0 - 2.5 mmol/L",
    threshold_PM: "2.5 - 3.0 mmol/L",
    high_intensity: "3.5 - 5.0 mmol/L (once weekly)"
  },
  
  criticalRequirements: [
    "Daily lactate measurement capability",
    "Strict pace/power control during sessions",
    "Morning RHR within 3 bpm of baseline",
    "HRV ≥90% of baseline before threshold work",
    "4-6 hours recovery between AM/PM sessions"
  ],
  
  bestFor: ["1500m", "5k", "10k"],
  athleteLevel: ["advanced", "elite"],
  
  weeklyStructure: {
    totalVolume: "120-160 km/week (elite)",
    thresholdVolume: "20-35 km/week maximum",
    doubleThresholdDays: 2,
    easyDays: 4-5,
    highIntensityDays: 1
  },
  
  sampleWeek: {
    monday: {
      AM: "60 min easy + 30 min easy",
      lactate: "< 1.0 mmol/L both sessions"
    },
    tuesday: {
      AM: "10min WU + 6x5min @ 2.3 mmol/L (60sec rest) + 10min CD",
      PM: "10min WU + 10x3min @ 3.0 mmol/L (30sec rest) + 10min CD"
    },
    wednesday: {
      AM: "60 min easy + 30 min easy",
      lactate: "< 1.0 mmol/L"
    },
    thursday: {
      AM: "10min WU + 5x6min @ 2.3 mmol/L (60sec rest) + 10min CD",
      PM: "10min WU + 20x400m @ 3.0 mmol/L (30sec rest) + 10min CD"
    },
    friday: "45 min easy (< 1.0 mmol/L)",
    saturday: "120-150 min long run (< 1.0 mmol/L)",
    sunday: "Rest or 30 min recovery"
  },
  
  progressionRules: {
    rule1: "Never increase threshold volume >10% per week",
    rule2: "Lactate must stay flat across intervals before increasing",
    rule3: "Morning RHR must be within 3 bpm baseline",
    rule4: "Hold volume minimum 2 weeks after each increase",
    rule5: "Maximum 35km threshold/week for elite, 30km for sub-elite"
  }
};
```

#### 3. Canova Percentage-Based System

```javascript
const CanovaMethodology = {
  name: "Canova Percentage-Based",
  
  corePrinciple: "All training serves specific race pace",
  
  paceCalculation: {
    formula: "N = RP × (2 - P/100)",
    /*
    N = Training pace (min/km)
    RP = Race pace (min/km)
    P = Percentage value
    
    Example: 10k RP = 4:00/km (240 sec/km)
    105% pace: N = 240 × (2 - 1.05) = 240 × 0.95 = 228 sec/km = 3:48/km
    95% pace: N = 240 × (2 - 0.95) = 240 × 1.05 = 252 sec/km = 4:12/km
    */
  },
  
  percentageLadder: {
    "95%": { name: "Specific Endurance", purpose: "Below race pace aerobic power" },
    "100%": { name: "Race Pace", purpose: "Direct race simulation" },
    "105%": { name: "Lactate Tolerance", purpose: "Above race pace, lactate buffering" },
    "110%": { name: "Speed Development", purpose: "Neuromuscular speed" },
    "115%": { name: "Neuromuscular Power", purpose: "Maximum recruitment" }
  },
  
  qualityDistribution: {
    "95%_RP": 0.15,   // 15% of quality time
    "100%_RP": 0.30,  // 30% of quality time
    "105%_RP": 0.35,  // 35% of quality time
    "110%_RP": 0.15,  // 15% of quality time
    "115%_RP": 0.05   // 5% of quality time
  },
  
  phases: {
    fundamental: {
      duration: "8-12 weeks",
      focus: "Aerobic base at 110-125% SLOWER than race pace",
      intensity: "Very easy, extensive volume"
    },
    special: {
      duration: "6-8 weeks",
      focus: "Mixed training 85-110% of race pace",
      intensity: "Moderate, varied stimulus"
    },
    specific: {
      duration: "6-10 weeks",
      focus: "Race-specific 95-105% of race pace",
      intensity: "High precision, race simulation"
    }
  },
  
  bestFor: ["10k", "half", "marathon"],
  athleteLevel: ["advanced", "elite"],
  
  sampleWeekSpecific: {
    monday: "12 km easy (regeneration pace)",
    tuesday: "5x2km @ 101% RP (2min rest)",
    wednesday: "15 km easy",
    thursday: "10 km easy AM + 8 km easy PM",
    friday: "10x1km @ 105% RP (90sec rest)",
    saturday: "8 km easy",
    sunday: "18 km long run easy"
  }
};
```

#### 4. Lydiard Periodization

```javascript
const LydiardMethodology = {
  name: "Lydiard Periodization",
  
  corePrinciple: "Build massive aerobic base, then sharpen with hills and speed",
  
  phases: {
    base: {
      duration: "12-24 weeks",
      focus: "High mileage at conversational pace",
      intensity: "Mostly Zone 1-2, effort-based not pace-based",
      weeklyMileage: "80-120 miles for advanced athletes"
    },
    hill: {
      duration: "4-6 weeks",
      focus: "Hill circuits and resistance",
      workouts: [
        "Hill sprints: 10-15 x 100m uphill (95-100% effort)",
        "Hill circuits: Fartlek-style mixed terrain"
      ]
    },
    speed: {
      duration: "4-6 weeks",
      focus: "Track intervals, leg speed development",
      workouts: [
        "200m repeats (fast, not all-out)",
        "400m repeats building to 3k-5k pace"
      ]
    },
    taper: {
      duration: "2-3 weeks",
      focus: "Reduce volume, maintain sharpness"
    }
  },
  
  bestFor: ["marathon", "ultra"],
  athleteLevel: ["recreational", "advanced"],
  
  keyPrinciples: [
    "Effort-based training, not pace-based",
    "'Out of breath, not out of legs'",
    "Long runs up to 2-2.5 hours",
    "One quality session per week during base"
  ]
};
```

### Methodology Selection Decision Tree

```javascript
function selectMethodology(athleteProfile, goals, constraints) {
  const { category, vo2max, trainingAge, sessionsPerWeek } = athleteProfile;
  const { primaryDistance, targetTime, weeksToRace } = goals;
  
  // Norwegian requires specific conditions
  if (category === "advanced" || category === "elite") {
    if (sessionsPerWeek >= 10 && 
        primaryDistance in ["5k", "10k"] &&
        constraints.hasLactateMeter === true) {
      return "norwegian";
    }
  }
  
  // Canova requires clear time goal and experience
  if ((category === "advanced" || category === "elite") &&
      targetTime !== null &&
      primaryDistance in ["10k", "half", "marathon"]) {
    return "canova";
  }
  
  // Lydiard for marathon/ultra focus
  if (primaryDistance in ["marathon", "ultra"] &&
      sessionsPerWeek >= 6 &&
      weeksToRace >= 16) {
    return "lydiard";
  }
  
  // Polarized as default for most scenarios
  return "polarized";
}
```

---

## Part 4: Athlete Monitoring and Adaptive Modification

### Daily Monitoring Systems

#### HRV (Heart Rate Variability) Monitoring

```javascript
const HRVMonitoring = {
  measurement: {
    metric: "RMSSD (Root Mean Square of Successive Differences)",
    timing: "Upon waking, before standing",
    duration: "3-5 minutes",
    position: "Lying supine",
    device: "Chest strap HR monitor (required)"
  },
  
  baselineEstablishment: {
    period: "14-21 days",
    calculation: "7-day rolling average",
    exclusions: [
      "Days after alcohol",
      "Illness days",
      "Poor sleep (<5 hours)",
      "High stress events"
    ]
  },
  
  interpretation: {
    excellent: ">= 95% of baseline",
    good: "90-95% of baseline",
    moderate: "85-90% of baseline",
    fair: "80-85% of baseline",
    poor: "75-80% of baseline",
    very_poor: "< 75% of baseline"
  },
  
  actions: {
    excellent: "PROCEED - All systems go",
    good: "PROCEED - Normal training",
    moderate: "MODIFY_LIGHT - Reduce intensity slightly",
    fair: "MODIFY_MODERATE - Reduce volume/intensity 20-30%",
    poor: "MODIFY_SIGNIFICANT - Easy day only or rest",
    very_poor: "REST_REQUIRED - Take rest day"
  }
};

function assessDailyHRV(todayHRV, baseline, recentHistory) {
  const percentOfBaseline = (todayHRV / baseline.mean) * 100;
  
  // Calculate 7-day rolling average
  const recent7Days = [...recentHistory, todayHRV];
  const rollingAvg = recent7Days.reduce((a, b) => a + b) / recent7Days.length;
  
  // Check for declining trend (3+ consecutive days declining)
  let consecutiveDeclines = 0;
  for (let i = recent7Days.length - 1; i > 0; i--) {
    if (recent7Days[i] < recent7Days[i-1]) {
      consecutiveDeclines++;
    } else {
      break;
    }
  }
  
  let status, severity, action;
  
  if (percentOfBaseline >= 95) {
    status = "EXCELLENT";
    severity = "GREEN";
    action = "PROCEED";
  } else if (percentOfBaseline >= 90) {
    status = "GOOD";
    severity = "GREEN";
    action = "PROCEED";
  } else if (percentOfBaseline >= 85) {
    status = "MODERATE";
    severity = "YELLOW";
    action = "MODIFY_LIGHT";
  } else if (percentOfBaseline >= 80) {
    status = "FAIR";
    severity = "YELLOW";
    action = "MODIFY_MODERATE";
  } else if (percentOfBaseline >= 75) {
    status = "POOR";
    severity = "YELLOW_RED";
    action = "MODIFY_SIGNIFICANT";
  } else {
    status = "VERY_POOR";
    severity = "RED";
    action = "REST_REQUIRED";
  }
  
  // Adjust if declining trend detected
  if (consecutiveDeclines >= 3 && percentOfBaseline < 90) {
    severity = "RED";
    action = "REST_REQUIRED";
    status += " (declining trend - overreaching risk)";
  }
  
  return {
    todayValue: todayHRV,
    baseline: baseline.mean,
    percentOfBaseline,
    rollingAvg,
    status,
    severity,
    action,
    trend: {
      consecutiveDeclines,
      direction: consecutiveDeclines >= 2 ? "DECLINING" : "STABLE"
    }
  };
}
```

#### Daily Wellness Questionnaire

```javascript
const WellnessQuestionnaire = {
  questions: [
    {
      id: "sleep_quality",
      question: "How was your sleep quality last night?",
      scale: "1-10",
      weight: 2.0,
      anchors: {
        1: "Terrible - barely slept",
        5: "Okay - some interruptions",
        10: "Excellent - deep, uninterrupted"
      }
    },
    {
      id: "sleep_hours",
      question: "How many hours did you sleep?",
      type: "number",
      weight: 1.5,
      optimal: 7-9
    },
    {
      id: "muscle_soreness",
      question: "Rate your muscle soreness",
      scale: "1-10",
      weight: 2.0,
      anchors: {
        1: "No soreness",
        5: "Moderate - noticeable but manageable",
        10: "Severe - difficulty moving"
      }
    },
    {
      id: "fatigue",
      question: "How fatigued do you feel?",
      scale: "1-10",
      weight: 2.5,
      anchors: {
        1: "Fully rested, energetic",
        5: "Somewhat tired",
        10: "Exhausted, drained"
      }
    },
    {
      id: "stress",
      question: "Rate your stress level",
      scale: "1-10",
      weight: 1.5,
      anchors: {
        1: "Completely relaxed",
        5: "Moderate stress",
        10: "Extremely stressed"
      }
    },
    {
      id: "motivation",
      question: "How motivated are you to train today?",
      scale: "1-10",
      weight: 1.0,
      anchors: {
        1: "No desire to train",
        5: "Neutral",
        10: "Highly motivated and excited"
      }
    }
  ],
  
  scoring: {
    excellent: "9-10",
    good: "7.5-8.9",
    moderate: "6.0-7.4",
    poor: "4.5-5.9",
    very_poor: "<4.5"
  }
};

function calculateWellnessScore(responses) {
  /*
  Weighted scoring system
  Inverted for fatigue, soreness, stress (lower is better)
  */
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const question of WellnessQuestionnaire.questions) {
    const response = responses[question.id];
    let adjustedScore = response;
    
    // Invert scores for negative indicators
    if (["muscle_soreness", "fatigue", "stress"].includes(question.id)) {
      adjustedScore = 11 - response;  // Invert 1-10 scale
    }
    
    totalWeightedScore += adjustedScore * question.weight;
    totalWeight += question.weight;
  }
  
  const overallScore = totalWeightedScore / totalWeight;
  
  let assessment;
  if (overallScore >= 9) assessment = "EXCELLENT";
  else if (overallScore >= 7.5) assessment = "GOOD";
  else if (overallScore >= 6.0) assessment = "MODERATE";
  else if (overallScore >= 4.5) assessment = "POOR";
  else assessment = "VERY_POOR";
  
  return {
    overallScore: overallScore.toFixed(1),
    assessment,
    categoryScores: {
      recovery: (responses.sleep_quality + (11 - responses.muscle_soreness)) / 2,
      energy: (11 - responses.fatigue),
      psychology: (responses.motivation + (11 - responses.stress)) / 2
    },
    action: assessment === "VERY_POOR" || assessment === "POOR" 
      ? "MODIFY_SIGNIFICANT" 
      : assessment === "MODERATE"
      ? "MONITOR_CLOSELY"
      : "PROCEED"
  };
}
```

#### Resting Heart Rate Monitoring

```javascript
const RHRMonitoring = {
  measurement: {
    timing: "Upon waking, before standing",
    position: "Lying supine",
    duration: "5 minutes (use middle 3 minutes)",
    frequency: "Daily"
  },
  
  baselineEstablishment: {
    period: "14-21 days",
    calculation: "7-day rolling average"
  },
  
  interpretation: {
    normal: "±2 bpm from baseline",
    yellow_flag: "+3-5 bpm above baseline",
    red_flag: "+5-8 bpm above baseline",
    critical: "+8+ bpm above baseline"
  },
  
  actions: {
    normal: "PROCEED",
    yellow_flag: "MONITOR - Consider easy day",
    red_flag: "MODIFY - Reduce intensity significantly",
    critical: "REST - Potential illness or overtraining"
  }
};

function assessDailyRHR(todayRHR, baseline, recentHistory) {
  const deviation = todayRHR - baseline.mean;
  const recent7Days = [...recentHistory, todayRHR];
  const rollingAvg = recent7Days.reduce((a, b) => a + b) / recent7Days.length;
  
  // Check for upward trend
  const trend = recent7Days.slice(-3).every((val, i, arr) => 
    i === 0 || val >= arr[i-1]
  );
  
  let status, severity, action;
  
  if (Math.abs(deviation) <= 2) {
    status = "NORMAL";
    severity = "GREEN";
    action = "PROCEED";
  } else if (deviation >= 3 && deviation <= 5) {
    status = "ELEVATED";
    severity = "YELLOW";
    action = "MONITOR";
  } else if (deviation >= 5 && deviation <= 8) {
    status = "HIGH";
    severity = "YELLOW_RED";
    action = "MODIFY";
  } else if (deviation > 8) {
    status = "CRITICAL";
    severity = "RED";
    action = "REST";
  }
  
  // Amplify severity if upward trend detected
  if (trend && deviation > 3) {
    severity = "RED";
    action = "REST";
    status += " (trending upward - overtraining risk)";
  }
  
  return {
    todayValue: todayRHR,
    baseline: baseline.mean,
    deviation,
    rollingAvg,
    status,
    severity,
    action,
    trend: trend ? "INCREASING" : "STABLE"
  };
}
```

### Comprehensive Readiness Assessment

```javascript
function comprehensiveReadinessAssessment(monitoringData) {
  /*
  Integrates HRV, RHR, Wellness, and ACWR
  Returns composite score 0-10 with specific action recommendations
  */
  
  const factors = {
    hrv: { score: 0, weight: 3.0 },
    rhr: { score: 0, weight: 2.0 },
    wellness: { score: 0, weight: 2.5 },
    acwr: { score: 0, weight: 2.0 },
    sleep: { score: 0, weight: 1.5 }
  };
  
  // Score HRV (0-10)
  const hrvPercent = monitoringData.hrv.percentOfBaseline;
  if (hrvPercent >= 95) factors.hrv.score = 10;
  else if (hrvPercent >= 90) factors.hrv.score = 8;
  else if (hrvPercent >= 85) factors.hrv.score = 6;
  else if (hrvPercent >= 80) factors.hrv.score = 4;
  else if (hrvPercent >= 75) factors.hrv.score = 2;
  else factors.hrv.score = 0;
  
  // Adjust for declining trend
  if (monitoringData.hrv.trend.consecutiveDeclines >= 3) {
    factors.hrv.score = Math.max(0, factors.hrv.score - 2);
  }
  
  // Score RHR (0-10)
  const rhrDev = monitoringData.rhr.deviation;
  if (rhrDev <= 2) factors.rhr.score = 10;
  else if (rhrDev <= 3) factors.rhr.score = 8;
  else if (rhrDev <= 5) factors.rhr.score = 6;
  else if (rhrDev <= 7) factors.rhr.score = 4;
  else if (rhrDev <= 10) factors.rhr.score = 2;
  else factors.rhr.score = 0;
  
  // Score Wellness (already 0-10)
  factors.wellness.score = parseFloat(monitoringData.wellness.overallScore);
  
  // Score ACWR (0-10)
  const acwr = monitoringData.acwr;
  if (acwr < 0.8) factors.acwr.score = 6;  // Detraining
  else if (acwr <= 1.0) factors.acwr.score = 10;  // Optimal
  else if (acwr <= 1.2) factors.acwr.score = 8;   // Moderate
  else if (acwr <= 1.3) factors.acwr.score = 5;   // Caution
  else if (acwr <= 1.5) factors.acwr.score = 2;   // High risk
  else factors.acwr.score = 0;  // Critical
  
  // Score Sleep
  const sleepHours = monitoringData.sleepHours;
  if (sleepHours >= 8) factors.sleep.score = 10;
  else if (sleepHours >= 7) factors.sleep.score = 8;
  else if (sleepHours >= 6) factors.sleep.score = 5;
  else if (sleepHours >= 5) factors.sleep.score = 3;
  else factors.sleep.score = 0;
  
  // Calculate weighted composite score
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const [key, factor] of Object.entries(factors)) {
    totalWeightedScore += factor.score * factor.weight;
    totalWeight += factor.weight;
  }
  
  const compositeScore = totalWeightedScore / totalWeight;
  
  // Determine readiness level and action
  let readinessLevel, action, message;
  
  if (compositeScore >= 8.5) {
    readinessLevel = "EXCELLENT";
    action = "PROCEED";
    message = "All systems optimal. Execute planned training.";
  } else if (compositeScore >= 7.5) {
    readinessLevel = "GOOD";
    action = "PROCEED";
    message = "Good readiness. Proceed with planned training.";
  } else if (compositeScore >= 6.5) {
    readinessLevel = "MODERATE";
    action = "MODIFY_LIGHT";
    message = "Moderate readiness. Consider reducing intensity 10-15%.";
  } else if (compositeScore >= 5.5) {
    readinessLevel = "FAIR";
    action = "MODIFY_MODERATE";
    message = "Fair readiness. Reduce intensity/volume 20-30% or make easy day.";
  } else if (compositeScore >= 4.5) {
    readinessLevel = "POOR";
    action = "MODIFY_SIGNIFICANT";
    message = "Poor readiness. Easy day only, significant reduction needed.";
  } else {
    readinessLevel = "VERY_POOR";
    action = "REST_REQUIRED";
    message = "Very poor readiness. REST DAY REQUIRED. Do not train.";
  }
  
  return {
    compositeScore: compositeScore.toFixed(1),
    readinessLevel,
    action,
    message,
    factors: factors,
    
    // Red flags
    redFlags: detectRedFlags(monitoringData, compositeScore),
    
    // Methodology-specific guidance
    methodologyGuidance: null  // To be added by modification engine
  };
}

function detectRedFlags(monitoringData, compositeScore) {
  const flags = [];
  
  // Critical RHR elevation
  if (monitoringData.rhr.deviation > 8) {
    flags.push({
      severity: "CRITICAL",
      type: "RHR_ELEVATED",
      message: "RHR >8 bpm above baseline. Potential illness or overtraining.",
      action: "Take rest day and monitor for illness symptoms"
    });
  }
  
  // HRV severely suppressed
  if (monitoringData.hrv.percentOfBaseline < 75) {
    flags.push({
      severity: "CRITICAL",
      type: "HRV_SUPPRESSED",
      message: "HRV <75% of baseline. Severe fatigue accumulation.",
      action: "Rest required. Consider medical consultation if persists >3 days"
    });
  }
  
  // ACWR in danger zone
  if (monitoringData.acwr > 1.5) {
    flags.push({
      severity: "CRITICAL",
      type: "ACWR_DANGER",
      message: "ACWR >1.5. 4x baseline injury risk.",
      action: "Immediate 40-50% load reduction required"
    });
  }
  
  // Multiple moderate warnings
  const moderateWarnings = [
    monitoringData.hrv.percentOfBaseline < 85,
    monitoringData.rhr.deviation > 5,
    monitoringData.wellness.overallScore < 6.0,
    monitoringData.sleepHours < 6
  ].filter(Boolean).length;
  
  if (moderateWarnings >= 3) {
    flags.push({
      severity: "HIGH",
      type: "MULTIPLE_WARNINGS",
      message: "Multiple recovery markers compromised simultaneously.",
      action: "Cumulative fatigue evident. Reduce training load 30-40%"
    });
  }
  
  return flags;
}
```

### Automatic Workout Modification Logic

```javascript
function modifyWorkout(plannedWorkout, readinessAssessment, methodology) {
  /*
  Automatically adjusts workout based on readiness score
  Methodology-specific rules apply
  */
  
  const action = readinessAssessment.action;
  const score = parseFloat(readinessAssessment.compositeScore);
  
  // Check critical flags first
  if (readinessAssessment.redFlags.some(f => f.severity === "CRITICAL")) {
    return {
      modified: true,
      originalWorkout: plannedWorkout,
      modifiedWorkout: {
        type: "REST",
        duration: 0,
        intensity: null,
        reason: "Critical red flag detected. Rest day required.",
        details: readinessAssessment.redFlags
      },
      severity: "CRITICAL"
    };
  }
  
  // Methodology-specific modification rules
  if (methodology === "norwegian") {
    return modifyNorwegianWorkout(plannedWorkout, readinessAssessment);
  } else if (methodology === "polarized") {
    return modifyPolarizedWorkout(plannedWorkout, readinessAssessment);
  } else if (methodology === "canova") {
    return modifyCanovaWorkout(plannedWorkout, readinessAssessment);
  } else if (methodology === "lydiard") {
    return modifyLydiardWorkout(plannedWorkout, readinessAssessment);
  }
  
  // Default modification logic
  if (action === "REST_REQUIRED") {
    return {
      modified: true,
      originalWorkout: plannedWorkout,
      modifiedWorkout: { type: "REST", duration: 0 },
      reason: "Readiness score too low for training"
    };
  }
  
  if (action === "MODIFY_SIGNIFICANT") {
    return {
      modified: true,
      originalWorkout: plannedWorkout,
      modifiedWorkout: {
        ...plannedWorkout,
        intensity: "easy",
        duration: Math.min(plannedWorkout.duration, 45),
        volume: plannedWorkout.volume * 0.5
      },
      reason: "Converted to easy recovery run"
    };
  }
  
  if (action === "MODIFY_MODERATE") {
    return {
      modified: true,
      originalWorkout: plannedWorkout,
      modifiedWorkout: {
        ...plannedWorkout,
        volume: plannedWorkout.volume * 0.7,
        intensity: plannedWorkout.intensity === "hard" ? "moderate" : plannedWorkout.intensity
      },
      reason: "Reduced volume and/or intensity by 30%"
    };
  }
  
  if (action === "MODIFY_LIGHT") {
    return {
      modified: true,
      originalWorkout: plannedWorkout,
      modifiedWorkout: {
        ...plannedWorkout,
        volume: plannedWorkout.volume * 0.85
      },
      reason: "Reduced volume by 15%"
    };
  }
  
  // No modification needed
  return {
    modified: false,
    originalWorkout: plannedWorkout,
    modifiedWorkout: plannedWorkout
  };
}

function modifyNorwegianWorkout(plannedWorkout, readiness) {
  /*
  Norwegian-specific rules:
  - STRICT readiness requirements for threshold work
  - Minimum composite score 7.5 for double threshold
  - Morning RHR within 3 bpm baseline (checked separately)
  - HRV ≥90% baseline (checked separately)
  - NEVER compromise lactate control
  */
  
  const score = parseFloat(readiness.compositeScore);
  
  if (plannedWorkout.type === "double_threshold") {
    // Double threshold requires HIGH readiness
    if (score < 7.5) {
      return {
        modified: true,
        originalWorkout: plannedWorkout,
        modifiedWorkout: {
          type: "single_threshold",
          session: "AM_only",
          volume: plannedWorkout.AM.volume * 0.7,
          intensity: plannedWorkout.AM.intensity,
          lactate_target: plannedWorkout.AM.lactate_target,
          reason: "Readiness insufficient for double threshold. AM session only at reduced volume."
        },
        severity: "MODERATE"
      };
    }
    
    if (score < 7.0) {
      return {
        modified: true,
        originalWorkout: plannedWorkout,
        modifiedWorkout: {
          type: "easy",
          duration: 60,
          lactate_target: "< 1.0 mmol/L",
          reason: "Readiness too low for threshold work. Easy day prescribed."
        },
        severity: "SIGNIFICANT"
      };
    }
  }
  
  if (plannedWorkout.type === "easy" && score < 5.0) {
    return {
      modified: true,
      originalWorkout: plannedWorkout,
      modifiedWorkout: {
        type: "REST",
        reason: "Even easy day contraindicated with very low readiness."
      },
      severity: "CRITICAL"
    };
  }
  
  return { modified: false, originalWorkout: plannedWorkout };
}

function modifyPolarizedWorkout(plannedWorkout, readiness) {
  /*
  Polarized rules:
  - Easy days can proceed even with moderate fatigue (therapeutic)
  - Hard days require good readiness (minimum 7.0)
  - Never force intensity on poor readiness days
  */
  
  const score = parseFloat(readiness.compositeScore);
  
  if (plannedWorkout.intensity === "easy") {
    // Easy days nearly always proceed
    if (score < 5.0) {
      return {
        modified: true,
        originalWorkout: plannedWorkout,
        modifiedWorkout: {
          ...plannedWorkout,
          duration: Math.min(plannedWorkout.duration, 45),
          pace: "very_easy",
          note: "Slow down 10-15 sec/km if needed"
        },
        severity: "LIGHT"
      };
    }
    return { modified: false, originalWorkout: plannedWorkout };
  }
  
  if (plannedWorkout.intensity === "hard") {
    if (score < 6.5) {
      return {
        modified: true,
        originalWorkout: plannedWorkout,
        modifiedWorkout: {
          type: "easy",
          duration: 60,
          pace: "conversational",
          reason: "Readiness insufficient for quality work. Postpone hard session."
        },
        severity: "SIGNIFICANT",
        note: "Reschedule hard session to day with better readiness"
      };
    }
    
    if (score < 7.5) {
      return {
        modified: true,
        originalWorkout: plannedWorkout,
        modifiedWorkout: {
          ...plannedWorkout,
          volume: plannedWorkout.volume * 0.8,
          reps: Math.ceil(plannedWorkout.reps * 0.8),
          note: "Reduced volume 20% due to moderate readiness"
        },
        severity: "MODERATE"
      };
    }
  }
  
  return { modified: false, originalWorkout: plannedWorkout };
}
```

---

## Part 5: Injury Management and ACWR

### Acute:Chronic Workload Ratio

```javascript
function calculateACWR(trainingHistory) {
  /*
  ACWR = Acute Load (7-day average) / Chronic Load (28-day average)
  
  Zones:
  - < 0.8: Detraining
  - 0.8-1.3: Sweet spot (low injury risk)
  - 1.3-1.5: Caution zone
  - 1.5-2.0: Danger zone
  - > 2.0: Critical risk (4x baseline)
  */
  
  if (trainingHistory.length < 28) {
    return {
      error: "Insufficient data",
      message: "Need minimum 28 days of training history"
    };
  }
  
  // Calculate acute load (last 7 days)
  const acute = trainingHistory.slice(-7);
  const acuteLoad = acute.reduce((sum, day) => sum + day.tss, 0) / 7;
  
  // Calculate chronic load (last 28 days)
  const chronic = trainingHistory.slice(-28);
  const chronicLoad = chronic.reduce((sum, day) => sum + day.tss, 0) / 28;
  
  const acwr = acuteLoad / chronicLoad;
  
  let zone, risk, action;
  
  if (acwr < 0.8) {
    zone = "DETRAINING";
    risk = "LOW";
    action = "Increase load gradually 5-10% per week";
  } else if (acwr <= 1.3) {
    zone = "OPTIMAL";
    risk = "LOW";
    action = "Continue current progression";
  } else if (acwr <= 1.5) {
    zone = "CAUTION";
    risk = "MODERATE";
    action = "Maintain current load, do not increase";
  } else if (acwr <= 2.0) {
    zone = "DANGER";
    risk = "HIGH";
    action = "Reduce load 20-30% immediately";
  } else {
    zone = "CRITICAL";
    risk = "VERY_HIGH";
    action = "Reduce load 40-50% or take rest days";
  }
  
  return {
    acwr: acwr.toFixed(2),
    acuteLoad: acuteLoad.toFixed(1),
    chronicLoad: chronicLoad.toFixed(1),
    zone,
    risk,
    action,
    injuryRisk: acwr > 1.5 ? "4x baseline" : acwr > 1.3 ? "1.7x baseline" : "0.6x baseline"
  };
}
```

### Pain Assessment and Training Decisions

```javascript
const PainAssessment = {
  scale: "0-10 Numeric Pain Rating Scale",
  
  guidelines: {
    "0-2": {
      status: "ACCEPTABLE",
      action: "Continue training, monitor closely",
      note: "Minor discomfort is normal during training adaptation"
    },
    "3-4": {
      status: "YELLOW_FLAG",
      action: "Modify training immediately",
      modifications: [
        "Reduce intensity by 20-30%",
        "Reduce volume by 20-30%",
        "Avoid hills and speed work",
        "Consider cross-training substitution"
      ]
    },
    "5-7": {
      status: "RED_FLAG",
      action: "Stop running immediately",
      protocol: [
        "Take 2-3 days complete rest",
        "Apply RICE protocol",
        "Evaluate with healthcare professional",
        "Begin rehabilitation exercises"
      ]
    },
    "8-10": {
      status: "CRITICAL",
      action: "Seek immediate medical attention",
      warning: "Severe pain indicates significant injury"
    }
  },
  
  sorenesRules: {
    rule1: "If soreness appears during warm-up and continues → STOP, take 2 days off, drop one training level",
    rule2: "If soreness appears during workout but disappears → Continue with caution, no increase in intensity",
    rule3: "If soreness appears day after workout → Normal DOMS, okay to train easy if pain ≤ 2/10",
    rule4: "If pain persists >1 hour after workout → Rest day required, reassess next day",
    rule5: "If pain alters gait mechanics → STOP immediately, medical evaluation required"
  }
};

function assessPainAndRecommend(painLevel, timing, location, gaitAffected) {
  /*
  Returns training recommendation based on pain assessment
  */
  
  // Critical: Pain altering gait
  if (gaitAffected) {
    return {
      severity: "CRITICAL",
      action: "STOP_IMMEDIATELY",
      recommendation: "Cease all running. Medical evaluation required.",
      crossTraining: "None until cleared by medical professional",
      estimatedTimeOff: "Unknown - depends on diagnosis"
    };
  }
  
  // Severe pain
  if (painLevel >= 8) {
    return {
      severity: "CRITICAL",
      action: "MEDICAL_ATTENTION",
      recommendation: "Seek immediate medical attention",
      crossTraining: "None until evaluated",
      estimatedTimeOff: "Unknown"
    };
  }
  
  // Significant pain
  if (painLevel >= 5) {
    return {
      severity: "RED_FLAG",
      action: "STOP_RUNNING",
      recommendation: "Complete rest for 2-3 days. Begin RICE protocol.",
      crossTraining: "Water running or swimming only (pain-free)",
      rehabilitation: "Begin appropriate rehab protocol",
      estimatedTimeOff: "7-14 days minimum"
    };
  }
  
  // Moderate pain
  if (painLevel >= 3) {
    return {
      severity: "YELLOW_FLAG",
      action: "MODIFY_IMMEDIATELY",
      recommendation: "Reduce training load 30-40%. Monitor daily.",
      modifications: [
        "Easy pace only (conversational)",
        "Reduce volume 30%",
        "Avoid hills and speed work",
        "Consider cross-training 50% of sessions"
      ],
      crossTraining: "Bike, elliptical, or water running as substitutes",
      estimatedTimeOff: "None if managed properly"
    };
  }
  
  // Acceptable pain
  if (painLevel <= 2) {
    return {
      severity: "ACCEPTABLE",
      action: "CONTINUE_WITH_MONITORING",
      recommendation: "Continue training with close monitoring",
      modifications: [
        "Monitor pain daily",
        "Stop if pain increases above 2/10",
        "Avoid aggressive intensity increases"
      ],
      estimatedTimeOff: "None"
    };
  }
}
```

### Return-to-Running Protocol

```javascript
const ReturnToRunningProtocol = {
  phases: [
    {
      phase: 1,
      name: "Walking",
      duration: "3-7 days",
      criteria: "Pain-free walking 30+ minutes",
      prescription: [
        "Day 1-2: 10-15 min walking",
        "Day 3-4: 20 min walking",
        "Day 5-7: 30 min walking",
        "Must be completely pain-free"
      ],
      advancement: "3 consecutive pain-free days at 30 min"
    },
    {
      phase: 2,
      name: "Walk-Run Intervals",
      duration: "7-10 days",
      criteria: "Pain-free walk-run intervals",
      prescription: [
        "Day 1-2: 1min run / 4min walk x 6 (30min total)",
        "Day 3-4: 2min run / 3min walk x 6 (30min total)",
        "Day 5-6: 3min run / 2min walk x 6 (30min total)",
        "Day 7-10: 4min run / 1min walk x 6 (30min total)"
      ],
      advancement: "3 consecutive pain-free sessions at 4:1 ratio"
    },
    {
      phase: 3,
      name: "Continuous Running",
      duration: "10-14 days",
      criteria: "Pain-free continuous running 20+ minutes",
      prescription: [
        "Day 1-3: 10 min continuous easy running",
        "Day 4-6: 15 min continuous easy running",
        "Day 7-10: 20 min continuous easy running",
        "Day 11-14: 30 min continuous easy running"
      ],
      advancement: "3 consecutive pain-free 30min runs"
    },
    {
      phase: 4,
      name: "Volume Building",
      duration: "14-21 days",
      criteria: "Gradually increase duration to pre-injury levels",
      prescription: [
        "Week 1: 50% of pre-injury volume",
        "Week 2: 70% of pre-injury volume",
        "Week 3: 85% of pre-injury volume",
        "Week 4+: 100% of pre-injury volume"
      ],
      rules: [
        "Increase no more than 10% per week",
        "All runs at easy pace",
        "No hills or speed work"
      ],
      advancement: "Pain-free at 100% volume for 1 week"
    },
    {
      phase: 5,
      name: "Intensity Reintroduction",
      duration: "14-21 days",
      criteria: "Gradually reintroduce quality work",
      prescription: [
        "Week 1: Add strides (4-6 x 20sec)",
        "Week 2: Add tempo intervals (3-4 x 3min)",
        "Week 3: Add threshold work (2 x 8-10min)",
        "Week 4+: Return to normal training"
      ],
      rules: [
        "Only reintroduce if volume building completed pain-free",
        "Add one intensity type per week",
        "Monitor ACWR closely"
      ]
    }
  ],
  
  regressionProtocol: {
    trigger: "Any pain >2/10 during or after running",
    action: "Return to previous phase and hold for 7 days",
    note: "If pain recurs twice, medical evaluation required"
  }
};
```

---

## Part 6: Cross-Training Equivalencies

### Training Stress Score (TSS) Conversions

```javascript
const CrossTrainingEquivalencies = {
  deepWaterRunning: {
    fitnessRetention: "95-100%",
    tssMultiplier: 1.0,  // 1:1 with running
    hrAdjustment: -10,   // HR typically 10 bpm lower
    
    protocol: {
      warmup: "5-10 min easy water running",
      main: "Match time and intensity of planned run workout",
      cooldown: "5-10 min easy",
      note: "Use HR zones -10 bpm from land running"
    },
    
    benefits: [
      "Zero impact",
      "Maintains running-specific muscle recruitment",
      "Can execute intervals and threshold work",
      "Excellent for injuries requiring load reduction"
    ],
    
    conversion: function(runningWorkout) {
      return {
        duration: runningWorkout.duration,  // Same duration
        intensity: runningWorkout.intensity,
        targetHR: runningWorkout.targetHR - 10,
        tss: runningWorkout.tss * 1.0
      };
    }
  },
  
  cycling: {
    fitnessRetention: "70-80%",
    distanceRatio: 3.0,  // 3 km cycling ≈ 1 km running
    tssMultiplier: 1.33, // 1.33x TSS for equivalent stimulus
    
    protocol: {
      note: "Cycling maintains aerobic fitness but less running-specific",
      intensityGuide: "Use HR zones directly (no adjustment)",
      duration: "1.5x run duration OR match TSS"
    },
    
    conversion: function(runningWorkout) {
      return {
        duration: runningWorkout.duration * 1.5,
        distance: runningWorkout.distance * 3,
        intensity: runningWorkout.intensity,
        targetHR: runningWorkout.targetHR,  // No adjustment
        tss: runningWorkout.tss * 1.33
      };
    }
  },
  
  elliptical: {
    fitnessRetention: "60-70%",
    tssMultiplier: 1.2,
    
    protocol: {
      note: "Less specific than water running, more than cycling",
      intensityGuide: "Match HR zones directly",
      duration: "1.2-1.5x run duration"
    },
    
    conversion: function(runningWorkout) {
      return {
        duration: runningWorkout.duration * 1.3,
        intensity: runningWorkout.intensity,
        targetHR: runningWorkout.targetHR,
        tss: runningWorkout.tss * 1.2
      };
    }
  },
  
  swimming: {
    fitnessRetention: "40-50%",
    tssMultiplier: 0.8,  // Lower due to different movement pattern
    hrAdjustment: -15,   // HR significantly lower in water
    
    protocol: {
      note: "Maintains cardiovascular fitness, poor running specificity",
      intensityGuide: "Use HR zones -15 bpm",
      duration: "Match duration to maintain aerobic stimulus"
    },
    
    conversion: function(runningWorkout) {
      return {
        duration: runningWorkout.duration,
        intensity: runningWorkout.intensity,
        targetHR: runningWorkout.targetHR - 15,
        tss: runningWorkout.tss * 0.8,
        note: "Excellent for active recovery, less for maintaining run fitness"
      };
    }
  },
  
  alterG: {
    fitnessRetention: "80-95% (depends on body weight support)",
    bodyWeightSupport: {
      initial: "50-65% (only 35-50% load)",
      progression: "Increase 5-10% per week",
      target: "100% (full body weight)"
    },
    
    protocol: {
      note: "Maintains running mechanics with reduced load",
      progression: "Start at 50% BWS, increase 5-10% weekly if pain-free",
      duration: "Begin with 50% of normal run duration",
      intensity: "Easy pace initially, can progress to quality work at 80%+ BWS"
    }
  }
};

function generateCrossTrainingPlan(injuryType, weeksToRecovery, weeklyTSS) {
  /*
  Creates cross-training schedule to maintain fitness during injury
  */
  
  const plan = {
    weeklySchedule: [],
    expectedFitnessRetention: 0,
    targetTSS: weeklyTSS
  };
  
  // Select primary cross-training modality
  let primaryModality;
  if (["stress_fracture", "tendinopathy"].includes(injuryType)) {
    primaryModality = "deepWaterRunning";  // Zero impact
  } else if (["plantarFasciitis", "achilles"].includes(injuryType)) {
    primaryModality = "cycling";  // Reduced load
  } else {
    primaryModality = "elliptical";  // Moderate impact
  }
  
  // Build weekly schedule
  for (let day = 0; day < 7; day++) {
    const session = {
      day: day + 1,
      modality: primaryModality,
      duration: null,
      intensity: null,
      tss: null
    };
    
    // Distribute TSS across week (similar to running schedule)
    if (day === 0 || day === 3) {  // Mon, Thu - Quality days
      session.duration = 60;
      session.intensity = "moderate";
      session.tss = weeklyTSS * 0.20;
    } else if (day === 6) {  // Sunday - Long session
      session.duration = 90;
      session.intensity = "easy";
      session.tss = weeklyTSS * 0.25;
    } else if (day === 5) {  // Saturday - Off
      session.modality = "REST";
      session.tss = 0;
    } else {  // Easy days
      session.duration = 45;
      session.intensity = "easy";
      session.tss = weeklyTSS * 0.12;
    }
    
    plan.weeklySchedule.push(session);
  }
  
  plan.expectedFitnessRetention = 
    primaryModality === "deepWaterRunning" ? 0.95 :
    primaryModality === "cycling" ? 0.75 :
    0.65;
  
  return plan;
}
```

---

## Part 7: Strength Training and Plyometrics

### Periodized Strength Training

```javascript
const StrengthTrainingSystem = {
  phases: {
    anatomicalAdaptation: {
      duration: "4-6 weeks",
      goal: "Build movement foundations, prepare tissues",
      parameters: {
        load: "40-60% 1RM",
        reps: "12-15",
        sets: "2-3",
        rest: "60-90 seconds",
        frequency: "2-3x per week"
      },
      exercises: [
        "Goblet squats",
        "Bodyweight lunges",
        "Glute bridges",
        "Planks",
        "Side planks",
        "Clamshells"
      ]
    },
    
    maximumStrength: {
      duration: "8-12 weeks",
      goal: "Develop maximal force capacity",
      parameters: {
        load: "85-93% 1RM",
        reps: "3-5",
        sets: "3-5",
        rest: "3-5 minutes",
        frequency: "2x per week"
      },
      exercises: {
        tier1_bilateral: [
          "Back squats",
          "Romanian deadlifts",
          "Hip thrusts"
        ],
        tier2_unilateral: [
          "Bulgarian split squats",
          "Single-leg RDLs",
          "Step-ups"
        ]
      },
      volumeDistribution: "70% bilateral, 30% unilateral"
    },
    
    power: {
      duration: "6-8 weeks",
      goal: "Convert strength to power, improve rate of force development",
      parameters: {
        load: "30-60% 1RM",
        reps: "6-10",
        sets: "3-4",
        rest: "2-3 minutes",
        frequency: "2x per week"
      },
      exercises: [
        "Jump squats",
        "Box jumps",
        "Power cleans",
        "Medicine ball throws"
      ],
      plyometrics: "Integrated - see plyometric section"
    },
    
    maintenance: {
      duration: "8-12 weeks (during competition phase)",
      goal: "Maintain strength gains with minimal fatigue",
      parameters: {
        load: "85-90% 1RM for heavy OR 60-70% for moderate",
        reps: "4-6 heavy OR 8-12 moderate",
        sets: "1-2 (50-60% volume reduction)",
        rest: "2-3 minutes",
        frequency: "1-2x per week"
      },
      time: "20-30 minutes per session",
      taper: "Cease 7-10 days before A-race"
    }
  },
  
  exerciseSelection: {
    tier1_essential_bilateral: {
      exercises: [
        {
          name: "Back or Front Squat",
          benefit: "Maximal quad and glute development",
          runningTransfer: "Ground reaction forces, propulsion"
        },
        {
          name: "Romanian or Conventional Deadlift",
          benefit: "Posterior chain, eccentric strength",
          runningTransfer: "Hamstring injury prevention, hip power"
        },
        {
          name: "Hip Thrust",
          benefit: "Isolated glute activation",
          runningTransfer: "Horizontal force production"
        }
      ]
    },
    
    tier2_essential_unilateral: {
      exercises: [
        {
          name: "Bulgarian Split Squat",
          benefit: "Single-leg strength, asymmetry correction",
          runningTransfer: "Running-specific loading, balance"
        },
        {
          name: "Single-Leg RDL",
          benefit: "Balance, proprioception, hamstring isolation",
          runningTransfer: "Stability in stance phase"
        },
        {
          name: "Step-Ups",
          benefit: "Hip flexor engagement, single-leg power",
          runningTransfer: "Propulsion mechanics"
        }
      ]
    },
    
    tier3_plyometric: {
      exercises: [
        "Box jumps - reactive strength",
        "Depth jumps - RFD development",
        "Single-leg bounds - running-specific power",
        "Pogo jumps - ankle stiffness"
      ]
    }
  },
  
  progression: {
    method: "Double progression",
    algorithm: "When completing target reps at RPE <8, increase load 2.5-5%",
    deload: "Every 4th week reduce volume 40-50%, maintain intensity",
    
    exampleProgression: {
      week1: "Back squat 3x5 @ 85% 1RM",
      week2: "Back squat 4x5 @ 85% 1RM",
      week3: "Back squat 5x5 @ 85% 1RM",
      week4: "Back squat 3x5 @ 70% 1RM (DELOAD)",
      week5: "Back squat 3x5 @ 87.5% 1RM (+2.5% from week 1)"
    }
  }
};
```

### Plyometric Training

```javascript
const PlyometricSystem = {
  classification: {
    lowImpact: {
      groundContactTime: "> 250ms",
      exercises: [
        "Pogo jumps",
        "Squat jumps",
        "Side hops",
        "Rocket jumps",
        "Double-leg jump rope"
      ],
      contactsPerSession: {
        beginner: "60-100",
        intermediate: "80-120",
        advanced: "120-200"
      }
    },
    
    moderateImpact: {
      groundContactTime: "150-250ms",
      exercises: [
        "Countermovement jumps",
        "Box leap-ups (12-18 inches)",
        "Tuck jumps",
        "Lateral bounds",
        "Split squat jumps"
      ]
    },
    
    highImpact: {
      groundContactTime: "< 150ms",
      exercises: [
        "Depth jumps (12-24 inch boxes)",
        "Single-leg depth jumps (6-18 inches)",
        "Maximal bounding",
        "Single-leg hops",
        "Repeat box jumps"
      ],
      warning: "Only for advanced athletes with 6+ months plyometric experience"
    }
  },
  
  volumeGuidelines: {
    beginner: {
      experience: "No plyometric history",
      contactsPerSession: "60-100",
      frequency: "1-2x per week",
      intensity: "Low impact only",
      exampleSession: [
        "Pogo jumps 2x10",
        "Squat jumps 3x6",
        "Side hops 2x12",
        "Jump rope 3x10"
      ],
      totalContacts: 92
    },
    
    intermediate: {
      experience: "2-6 months",
      contactsPerSession: "80-120",
      frequency: "2x per week",
      intensity: "Mix low and moderate",
      exampleSession: [
        "Countermovement jumps 3x8",
        "Lateral bounds 2x10 per leg",
        "Box leaps 3x6",
        "Split squats 2x10"
      ],
      totalContacts: 102
    },
    
    advanced: {
      experience: "6+ months",
      contactsPerSession: "120-200",
      frequency: "2x per week",
      intensity: "All intensities including high-impact",
      exampleSession: [
        "Depth jumps 3x6",
        "Single-leg hops 3x10 per leg",
        "Bounding 60 contacts",
        "Tuck jumps 3x10"
      ],
      totalContacts: 168
    },
    
    elite: {
      experience: "Elite distance runners",
      contactsPerSession: "150-300",
      frequency: "2x weekly (base), 1x weekly (competition)",
      intensity: "Progressive throughout season",
      note: "Depth jumps limited to 27-50 contacts per session"
    }
  },
  
  periodization: {
    basePhase: {
      duration: "8-16 weeks",
      contactsPerSession: "60-100",
      intensityDistribution: "80% low, 20% moderate",
      frequency: "1-2x per week",
      focus: "Build foundation, technical mastery"
    },
    
    buildPhase: {
      duration: "6-8 weeks",
      contactsPerSession: "100-150",
      intensityDistribution: "50% moderate, 30% low, 20% high",
      frequency: "2x per week",
      focus: "Power development, speed"
    },
    
    competitionPhase: {
      duration: "8-12 weeks",
      contactsPerSession: "60-100",
      intensityDistribution: "60% high, 40% moderate",
      frequency: "1-2x per week",
      focus: "Maintain power, minimal fatigue"
    }
  },
  
  recovery: {
    betweenReps: {
      lowIntensity: "15-30 seconds",
      moderateIntensity: "30-60 seconds",
      highIntensity: "5-10 seconds (neuromuscular freshness)"
    },
    
    betweenSets: {
      lowIntensity: "60-120 seconds",
      moderateIntensity: "120-180 seconds",
      highIntensity: "180-240 seconds (ATP-CP replenishment)"
    },
    
    betweenSessions: {
      lowIntensity: "24 hours minimum",
      moderateIntensity: "48 hours minimum",
      highIntensity: "48-72 hours minimum",
      preRace: "Cease 7-10 days before A-race"
    }
  },
  
  expectedAdaptations: {
    duration: "6-12 weeks of consistent training",
    improvements: {
      runningEconomy: "2-8% improvement",
      groundContactTime: "4-15% reduction",
      verticalJump: "5-20% increase",
      sprintPerformance: "2-5% improvement",
      timeTrialPerformance: "1-4% improvement (3-5km)",
      musculotendinousStiffness: "8-12% increase",
      rateOfForceDevelopment: "10-25% increase"
    }
  }
};
```

### Technical Running Drills

```javascript
const RunningDrillsSystem = {
  coreDrills: [
    {
      name: "A-march → A-skip",
      focus: "Knee lift, lower-leg strength, efficient footstrike",
      technique: "Knee to waist height, midfoot landing, arm drive",
      volume: "2-3 sets x 30-50 meters",
      progression: "March → Skip → Fast skip"
    },
    {
      name: "B-march → B-skip",
      focus: "Hamstring strength, leg snap-back",
      technique: "Leg extends forward then powerful snap-back",
      volume: "2-3 sets x 30-50 meters",
      progression: "March → Skip → Fast skip"
    },
    {
      name: "High Knees",
      focus: "Knee lift, hip flexor strength",
      technique: "Exaggerated knee drive to waist, quick ground contacts",
      volume: "2-3 sets x 30-50 meters"
    },
    {
      name: "Butt Kicks",
      focus: "Hamstring engagement",
      technique: "Heels straight up toward glutes",
      volume: "2-3 sets x 30-50 meters"
    },
    {
      name: "Bounding",
      focus: "Horizontal power, exaggerated stride",
      technique: "Emphasize both height and distance",
      volume: "30-100 meters",
      note: "Advanced drill, requires good strength base"
    },
    {
      name: "Strides",
      focus: "Neuromuscular coordination at speed",
      technique: "Gradual acceleration to 85-95% max speed, relaxed form",
      volume: "4-8 x 60-100 meters",
      recovery: "Walk back to start"
    }
  ],
  
  implementation: {
    beginner: {
      weeks: "1-4",
      focus: "Learn proper mechanics",
      drills: ["A-march", "High knees", "Butt kicks", "Carioca"],
      volume: "2 sets x 30 meters",
      frequency: "1x per week"
    },
    
    intermediate: {
      weeks: "5-12",
      focus: "Coordination and speed",
      drills: ["A-skip", "B-march", "Straight-leg bounds", "Carioca"],
      volume: "2-3 sets x 40 meters",
      frequency: "2x per week"
    },
    
    advanced: {
      weeks: "13+",
      focus: "Power and running-specific transfer",
      drills: ["B-skip", "Bounding", "Power A-skips", "Strides"],
      volume: "3 sets x 50 meters",
      frequency: "2x per week"
    }
  },
  
  integration: {
    timing: [
      "Before speed workouts (10-15 min post warm-up)",
      "After easy runs as standalone technical session",
      "Separate session 6+ hours from hard running"
    ],
    optimalFrequency: "2x per week"
  }
};
```

---

## Part 8: Integration and Scheduling

### Weekly Program Structure

```javascript
function generateWeeklyProgram(athlete, methodology, phase, zones, monitoring) {
  /*
  Generates complete weekly program integrating:
  - Running workouts (based on methodology)
  - Strength training (periodized)
  - Plyometrics (periodized)
  - Drills
  - Monitoring
  - Recovery protocols
  */
  
  const weeklyProgram = {
    athlete: athlete.name,
    methodology: methodology,
    phase: phase,
    weekNumber: null,
    
    monday: {},
    tuesday: {},
    wednesday: {},
    thursday: {},
    friday: {},
    saturday: {},
    sunday: {},
    
    weeklyTotals: {
      runningVolume_km: 0,
      totalTSS: 0,
      thresholdWork_km: 0,
      strengthSessions: 0,
      plyometricContacts: 0
    },
    
    monitoring: {
      dailyHRV: true,
      dailyRHR: true,
      dailyWellness: true,
      weeklyACWR: true
    }
  };
  
  // Methodology-specific weekly structure
  if (methodology === "norwegian") {
    weeklyProgram.monday = {
      AM: {
        type: "easy",
        duration: 60,
        zone: "Zone 1-2",
        lactate: "< 1.0 mmol/L"
      },
      PM: {
        type: "easy",
        duration: 30,
        zone: "Zone 1",
        lactate: "< 1.0 mmol/L"
      }
    };
    
    weeklyProgram.tuesday = {
      monitoring: "CHECK READINESS - Minimum score 7.5 required",
      AM: {
        type: "threshold",
        warmup: 10,
        mainSet: "6x5min @ 2.3 mmol/L (60sec rest)",
        cooldown: 10,
        totalDistance: 12
      },
      PM: {
        type: "threshold",
        timeGap: "4-6 hours after AM",
        warmup: 10,
        mainSet: "10x3min @ 3.0 mmol/L (30sec rest)",
        cooldown: 10,
        totalDistance: 16
      }
    };
    
    // ...continue for rest of week
  }
  
  // Add strength training integration
  if (phase.includesStrength) {
    // Strength on same day as hard run, 6+ hours apart
    weeklyProgram.tuesday.strength = {
      timing: "6+ hours after PM threshold",
      phase: phase.strengthPhase,
      duration: 45,
      exercises: getStrengthExercises(phase.strengthPhase)
    };
  }
  
  // Add plyometrics
  if (phase.includesPlyometrics) {
    weeklyProgram.monday.plyometrics = {
      timing: "After PM easy run",
      contacts: getPlyometricVolume(athlete.level),
      exercises: getPlyometricExercises(phase.plyometricPhase)
    };
  }
  
  // Add drills
  weeklyProgram.wednesday.drills = {
    timing: "Before workout or after easy run",
    sets: 3,
    distance: 50,
    drills: ["A-skip", "B-march", "Strides"]
  };
  
  return weeklyProgram;
}
```

---

## Part 9: Implementation Requirements

### Core Classes to Implement

```javascript
// Main engine class
class RunnerTrainingProgramEngine {
  constructor(athleteData) {
    this.data = athleteData;
    this.thresholds = null;
    this.zones = null;
    this.methodology = null;
  }
  
  async generateComprehensiveProgram() {
    // 1. Determine thresholds
    // 2. Calculate zones
    // 3. Categorize athlete
    // 4. Select methodology
    // 5. Generate season plan
    // 6. Build weekly programs
    // 7. Integrate monitoring
    // 8. Add strength/plyometrics
    // 9. Generate reports
  }
}

// Threshold calculation module
class ThresholdCalculator {
  calculateDmax(intensity, lactate, heartRate) {}
  calculateModDmax(intensity, lactate, heartRate) {}
  calculateLT1(intensity, lactate, heartRate) {}
  estimateFromFieldTest(testData) {}
}

// Zone mapping module
class ZoneMapper {
  calculateTrainingZones(lt1, lt2, maxHR, restingHR) {}
  mapMethodologyToZones(methodology, zones) {}
}

// Monitoring system
class AthleteMonitor {
  assessDailyHRV(todayHRV, baseline, history) {}
  assessDailyRHR(todayRHR, baseline, history) {}
  calculateWellnessScore(responses) {}
  comprehensiveReadinessAssessment(data) {}
}

// Workout modification engine
class WorkoutModifier {
  modifyWorkout(planned, readiness, methodology) {}
  modifyNorwegianWorkout(planned, readiness) {}
  modifyPolarizedWorkout(planned, readiness) {}
}

// Injury management system
class InjuryManager {
  calculateACWR(trainingHistory) {}
  assessPain(painLevel, timing, location) {}
  generateReturnToRunningPlan(injuryType) {}
  generateCrossTrainingPlan(injury, weeks, tss) {}
}

// Program generator
class ProgramGenerator {
  generateSeasonPlan(athlete, goals, methodology) {}
  generateWeeklyProgram(week, methodology, zones) {}
  integrateStrength(weeklyProgram, phase) {}
  integratePlyometrics(weeklyProgram, phase) {}
}
```

### Data Flow

```
1. Input: Athlete data (lab tests OR field tests)
   ↓
2. Threshold Determination (D-max or Mod-D-max)
   ↓
3. Zone Calculation (individualized, anchored to LT1/LT2)
   ↓
4. Athlete Categorization (Beginner/Recreational/Advanced/Elite)
   ↓
5. Methodology Selection (Norwegian/Polarized/Canova/Lydiard)
   ↓
6. Season Plan Generation (periodization, phases, races)
   ↓
7. Weekly Program Generation (specific workouts)
   ↓
8. Daily Monitoring Integration (HRV, RHR, Wellness)
   ↓
9. Adaptive Modification (automatic workout adjustments)
   ↓
10. Injury Management (ACWR, pain assessment, return-to-run)
    ↓
11. Cross-Training Prescription (when needed)
    ↓
12. Strength/Plyometric Integration (periodized)
    ↓
13. Output: Complete training program with monitoring
```

### Critical Success Factors

1. **Data Quality**: Garbage in = garbage out. Strict validation required.
2. **Conservative Bias**: Better overcautious than under-cautious (prevent injury).
3. **User Compliance**: Monitoring only works if athletes measure daily.
4. **Methodology Respect**: Each system has specific requirements - don't compromise.
5. **Scientific Rigor**: All algorithms sourced from peer-reviewed research.

### Testing Requirements

```javascript
// Example test suite structure
describe("ThresholdCalculator", () => {
  test("D-max calculation with known data", () => {
    // Test against published data with known D-max results
  });
  
  test("Error handling for insufficient data points", () => {
    // Should throw error with <4 points
  });
  
  test("Validation of R² threshold", () => {
    // Should reject poor curve fits (R² < 0.85)
  });
});

describe("AthleteMonitor", () => {
  test("HRV assessment and action recommendations", () => {
    // Test all readiness thresholds
  });
  
  test("Red flag detection", () => {
    // Ensure critical warnings trigger properly
  });
});

describe("WorkoutModifier", () => {
  test("Norwegian threshold cancellation logic", () => {
    // Ensure threshold work cancelled when readiness <7.5
  });
  
  test("Modification history tracking", () => {
    // Prevent excessive modification rates
  });
});
```

---

## Project Files Reference

All comprehensive documentation is available in the project knowledge:

1. **SKILL_ENHANCED_PART1.md** - Physiological foundations, D-max algorithm, zone mapping, methodologies
2. **SKILL_ENHANCED_PART2.md** - Implementation guidelines, race protocols, environmental adjustments
3. **Athlete_Monitoring_and_Adaptive_Program_Modification_System.md** - HRV, RHR, wellness, modification logic
4. **Production-Ready_Runner_Training_Engine__Injury_Management__Cross-Training__and_Quality_Programming.md** - ACWR, injury protocols, cross-training, strength/plyometrics
5. **Elite_Running_Training_Engine__Four_Critical_Implementation_Gaps_Resolved.md** - Methodology blending, progression rules, recovery algorithms
6. **Target_Time_Threshold_Estimation_Module.md** - Estimating thresholds from target times when no test data available

---

## Implementation Timeline

**Week 1-2: Core Foundation**
- Threshold calculation (D-max, Mod-D-max, LT1)
- Zone mapping system
- Athlete categorization logic
- Basic data structures

**Week 2-3: Methodology Implementation**
- Norwegian double threshold
- Polarized 80/20
- Canova percentage-based
- Lydiard periodization
- Methodology selection logic

**Week 3-4: Monitoring Systems**
- HRV monitoring and baseline establishment
- RHR monitoring
- Daily wellness questionnaire
- Comprehensive readiness assessment
- Workout modification engine

**Week 4-5: Injury Management**
- ACWR calculation
- Pain assessment protocols
- Return-to-running phases
- Cross-training equivalencies
- Rehabilitation protocols

**Week 5-6: Quality Programming**
- Strength training periodization
- Plyometric protocols
- Running drills integration
- Weekly program integration

**Week 6-7: Program Generation**
- Season planning
- Weekly program generation
- Multi-race periodization
- Environmental adjustments
- Race-day protocols

**Week 7-8: Testing & Validation**
- Unit tests for all modules
- Integration testing
- Edge case handling
- User acceptance testing
- Documentation completion

---

## Next Steps for Claude Code

1. **Review all project knowledge files** to understand the complete system
2. **Set up project structure** with proper module organization
3. **Implement core algorithms first** (D-max, zone mapping, categorization)
4. **Build incrementally** - test each module before moving to next
5. **Follow test-driven development** - write tests alongside implementation
6. **Validate against examples** provided in documentation
7. **Create comprehensive error handling** for edge cases
8. **Build user-friendly interfaces** for data input and program output

This is a sophisticated system requiring attention to detail, scientific rigor, and production-ready code quality. Take time to understand each component before implementing. Good luck!

---

**End of Implementation Prompt**
