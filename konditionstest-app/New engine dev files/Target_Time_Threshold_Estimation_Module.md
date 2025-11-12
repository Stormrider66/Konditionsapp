# Target Time Threshold Estimation Module

## Production-Ready Protocol for Training Without Initial Testing Data

**Purpose:** Enable program generation for runners who want to train for a specific race goal but lack lactate testing or field test data. This module provides scientifically-grounded threshold estimates while mandating validation testing.

**Philosophy:** Better to provide conservative, validated estimates that get athletes started safely than to refuse service. However, UNVALIDATED ESTIMATES carry inherent risk and MUST be validated within 2-4 weeks.

---

## Part 1: Core Estimation Algorithms

### 1.1 Threshold Estimation from Target Race Time (No Previous Data)

```javascript
function estimateThresholdsFromTargetTime(targetRace) {
  const { distance, targetTime_seconds, runnerLevel = "recreational" } = targetRace;
  
  // Step 1: Convert target time to pace
  const targetPace_secPerKm = targetTime_seconds / (distance / 1000);
  
  // Step 2: Use race-to-threshold relationships
  const thresholdFactors = {
    "5000": 1.07,      // 5K pace = LT2 × 1.07 (7% faster than threshold)
    "10000": 1.02,     // 10K pace = LT2 × 1.02 (2% faster)
    "21097.5": 1.00,   // Half marathon = at LT2
    "42195": 0.88      // Marathon = LT2 × 0.88 (12% slower)
  };
  
  // Adjust factors based on runner level
  const levelAdjustments = {
    "elite": { "5000": 1.10, "10000": 1.05, "21097.5": 1.00, "42195": 0.88 },
    "advanced": { "5000": 1.08, "10000": 1.03, "21097.5": 1.00, "42195": 0.88 },
    "recreational": { "5000": 1.07, "10000": 1.02, "21097.5": 1.00, "42195": 0.85 },
    "beginner": { "5000": 1.05, "10000": 1.00, "21097.5": 0.98, "42195": 0.83 }
  };
  
  const factors = levelAdjustments[runnerLevel];
  const raceFactor = factors[distance.toString()] || thresholdFactors[distance.toString()];
  
  // Step 3: Calculate estimated LT2
  const estimatedLT2_pace = targetPace_secPerKm / raceFactor;
  
  // Step 4: Estimate LT1 from LT2 (LT1 is 10-12% slower than LT2)
  const estimatedLT1_pace = estimatedLT2_pace * 1.11; // Use 11% as middle ground
  
  // Step 5: Calculate heart rate estimates (if max HR known)
  let hrEstimates = null;
  if (targetRace.maxHR) {
    hrEstimates = {
      LT1_HR: Math.round(targetRace.maxHR * 0.75), // ~75% max HR
      LT2_HR: Math.round(targetRace.maxHR * 0.87), // ~87% max HR
      note: "HR estimates from age-predicted max. Highly variable between individuals."
    };
  }
  
  return {
    method: "TARGET_TIME_ESTIMATION",
    confidence: "LOW - UNVALIDATED",
    LT1: {
      pace_secPerKm: estimatedLT1_pace,
      heartRate: hrEstimates ? hrEstimates.LT1_HR : null,
      confidence: "LOW"
    },
    LT2: {
      pace_secPerKm: estimatedLT2_pace,
      heartRate: hrEstimates ? hrEstimates.LT2_HR : null,
      confidence: "LOW"
    },
    targetRace: {
      distance: distance,
      targetTime: formatTime(targetTime_seconds),
      targetPace: formatPace(targetPace_secPerKm),
      raceFactor: raceFactor
    },
    warnings: [
      {
        severity: "CRITICAL",
        message: "Training zones estimated from target time WITHOUT validation",
        action: "MANDATORY field test within 2 weeks: 30-min TT or 10K race",
        risk: "Training at incorrect intensities may cause injury or inadequate stimulus"
      },
      {
        severity: "HIGH",
        message: "Initial program will be CONSERVATIVE",
        action: "Zones will use slower end of ranges until validated",
        rationale: "Safety-first approach for unvalidated estimates"
      }
    ],
    validationProtocol: {
      deadline: "Week 2 of training",
      requiredTest: "30-minute time trial OR 10K race",
      acceptableDeviation: "±5%",
      action_if_deviation_exceeded: "REGENERATE entire program with validated zones"
    },
    conservatismAdjustments: {
      note: "Apply these to all zone calculations until validation",
      LT1_upper: "Use LT1 + 2% instead of LT1 + 5%",
      LT2_upper: "Use LT2 - 2% instead of LT2 + 2%",
      weeklyVolume: "Start 10-15% lower than standard prescription",
      progressionRate: "Use 5% instead of 8-10% weekly increases"
    }
  };
}
```

---

### 1.2 Threshold Estimation from Previous Personal Best + Improvement Goal

**This is more reliable than pure target time because it's anchored to real performance data.**

```javascript
function estimateThresholdsFromPB_withImprovement(previousBest, improvementGoal, trainingHistory) {
  const { 
    distance, 
    time_seconds, 
    date, 
    conditions = "good" // "good" | "poor" | "excellent"
  } = previousBest;
  
  const {
    targetTime_seconds,
    targetDate
  } = improvementGoal;
  
  // Step 1: Calculate current thresholds from PB
  const currentThresholds = estimateCurrentThresholdsFromPB(previousBest);
  
  // Step 2: Calculate improvement percentage
  const improvementPercent = ((time_seconds - targetTime_seconds) / time_seconds) * 100;
  const improvementSeconds = time_seconds - targetTime_seconds;
  
  // Step 3: Calculate training time available
  const weeksAvailable = Math.floor(
    (new Date(targetDate) - new Date(date)) / (1000 * 60 * 60 * 24 * 7)
  );
  
  // Step 4: Validate improvement goal is realistic
  const validation = validateImprovementGoal(
    distance, 
    improvementPercent, 
    weeksAvailable, 
    trainingHistory
  );
  
  if (!validation.realistic) {
    return {
      error: "UNREALISTIC_GOAL",
      validation: validation,
      recommendation: validation.suggestedAlternative
    };
  }
  
  // Step 5: Project improved thresholds
  const projectedThresholds = projectImprovedThresholds(
    currentThresholds,
    improvementPercent,
    weeksAvailable,
    trainingHistory
  );
  
  return {
    method: "PB_WITH_IMPROVEMENT_PROJECTION",
    confidence: validation.confidence, // "MEDIUM", "MEDIUM-HIGH", or "HIGH"
    
    currentThresholds: currentThresholds,
    projectedThresholds: projectedThresholds,
    
    improvementAnalysis: {
      currentPB: formatTime(time_seconds),
      targetTime: formatTime(targetTime_seconds),
      improvementRequired: formatTime(improvementSeconds),
      improvementPercent: improvementPercent.toFixed(2) + "%",
      weeksAvailable: weeksAvailable,
      weeksRequired: validation.estimatedWeeksNeeded,
      realistic: validation.realistic,
      confidence: validation.confidence
    },
    
    warnings: validation.warnings,
    
    trainingStrategy: {
      initialZones: "Use CURRENT thresholds for first 4-6 weeks",
      midProgram: "Retest at week 6-8 to assess adaptation",
      finalPhase: "Use PROJECTED thresholds only if validation tests confirm progress",
      raceDay: "Race at target pace only if training indicators support it"
    },
    
    validationProtocol: {
      week4: "First validation - 30-min TT to confirm current thresholds",
      week8: "Second validation - 20-min TT to assess improvement trajectory", 
      week12: "Third validation - 10K race or TT to confirm projected thresholds",
      finalWeek: "Race simulation to validate target pace is achievable"
    },
    
    progressIndicators: generateProgressIndicators(
      currentThresholds,
      projectedThresholds,
      weeksAvailable
    )
  };
}
```

---

### 1.3 Estimating Current Thresholds from Previous Personal Best

```javascript
function estimateCurrentThresholdsFromPB(previousBest) {
  const { distance, time_seconds, conditions } = previousBest;
  
  // Calculate race pace
  const racePace_secPerKm = time_seconds / (distance / 1000);
  
  // Apply conditions adjustment
  const conditionAdjustments = {
    "excellent": 0.98, // Race was aided (wind, downhill, etc.)
    "good": 1.00,      // Standard conditions
    "poor": 1.03       // Race was hindered (heat, wind, hills)
  };
  
  const adjustedPace = racePace_secPerKm * conditionAdjustments[conditions];
  
  // Use race-to-threshold relationships
  const thresholdFactors = {
    "5000": 1.07,
    "10000": 1.02,
    "21097.5": 1.00,
    "42195": 0.88
  };
  
  const raceFactor = thresholdFactors[distance.toString()];
  const estimatedLT2 = adjustedPace / raceFactor;
  const estimatedLT1 = estimatedLT2 * 1.11;
  
  return {
    LT1: {
      pace_secPerKm: estimatedLT1,
      confidence: "MEDIUM" // Higher than pure target time estimate
    },
    LT2: {
      pace_secPerKm: estimatedLT2,
      confidence: "MEDIUM-HIGH" // Anchored to real performance
    },
    derivedFrom: {
      race: formatDistance(distance),
      time: formatTime(time_seconds),
      pace: formatPace(racePace_secPerKm),
      conditions: conditions
    },
    note: "Estimated from previous race performance - more reliable than target time alone"
  };
}
```

---

### 1.4 Improvement Goal Validation System

**CRITICAL: Prevents athletes from setting physiologically impossible goals.**

```javascript
function validateImprovementGoal(distance, improvementPercent, weeksAvailable, trainingHistory) {
  const { 
    weeklyVolume_km = null, 
    yearsRunning = 0,
    consistentTraining = false,
    previousImprovements = []
  } = trainingHistory || {};
  
  // Define realistic improvement rates based on experience and distance
  const improvementBenchmarks = {
    // Format: [weeks, beginner%, recreational%, advanced%]
    "5000": {
      "12": [8, 5, 3],
      "16": [12, 8, 5],
      "24": [18, 12, 8],
      "36": [25, 18, 12]
    },
    "10000": {
      "12": [6, 4, 2],
      "16": [10, 6, 4],
      "24": [15, 10, 6],
      "36": [22, 15, 10]
    },
    "21097.5": {
      "12": [5, 3, 2],
      "16": [8, 5, 3],
      "24": [12, 8, 5],
      "36": [18, 12, 8]
    },
    "42195": {
      "12": [4, 2, 1.5],
      "16": [6, 4, 2.5],
      "24": [10, 6, 4],
      "36": [15, 10, 6]
    }
  };
  
  // Determine athlete category
  let category;
  if (yearsRunning < 1 || weeklyVolume_km < 30) {
    category = 0; // beginner
  } else if (yearsRunning < 3 || weeklyVolume_km < 50 || !consistentTraining) {
    category = 1; // recreational
  } else {
    category = 2; // advanced
  }
  
  // Find appropriate benchmark
  const distanceKey = distance.toString();
  const benchmarks = improvementBenchmarks[distanceKey];
  
  if (!benchmarks) {
    return {
      realistic: false,
      confidence: "UNKNOWN",
      error: "Distance not supported for improvement validation"
    };
  }
  
  // Find closest weeks bracket
  const weekBrackets = Object.keys(benchmarks).map(Number).sort((a,b) => a-b);
  const closestWeeks = weekBrackets.reduce((prev, curr) => 
    Math.abs(curr - weeksAvailable) < Math.abs(prev - weeksAvailable) ? curr : prev
  );
  
  const maxRealisticImprovement = benchmarks[closestWeeks][category];
  
  // Calculate how realistic the goal is
  const realizability = (maxRealisticImprovement / improvementPercent) * 100;
  
  // Determine confidence and warnings
  let confidence, realistic, warnings = [];
  
  if (improvementPercent <= maxRealisticImprovement * 0.7) {
    confidence = "HIGH";
    realistic = true;
    warnings.push({
      severity: "INFO",
      message: "Conservative improvement goal - achievable with proper training",
      note: "You may exceed this goal if training goes very well"
    });
  } else if (improvementPercent <= maxRealisticImprovement) {
    confidence = "MEDIUM-HIGH";
    realistic = true;
    warnings.push({
      severity: "INFO",
      message: "Realistic improvement goal requiring consistent, quality training",
      note: "Stay healthy and follow the program diligently"
    });
  } else if (improvementPercent <= maxRealisticImprovement * 1.2) {
    confidence = "MEDIUM";
    realistic = true;
    warnings.push({
      severity: "WARNING",
      message: "Ambitious goal - achievable but requires perfect execution",
      risk: "High injury risk if you push too hard too soon",
      recommendation: "Consider extending timeline or adjusting goal slightly"
    });
  } else if (improvementPercent <= maxRealisticImprovement * 1.5) {
    confidence = "LOW";
    realistic = false;
    warnings.push({
      severity: "CRITICAL",
      message: "Very ambitious goal - physiologically challenging within timeframe",
      risk: "High probability of overtraining, injury, or failure to achieve",
      recommendation: "Strongly recommend adjusting goal or extending timeline"
    });
  } else {
    confidence = "VERY_LOW";
    realistic = false;
    warnings.push({
      severity: "CRITICAL",
      message: "UNREALISTIC GOAL - Improvement rate exceeds physiological limits",
      risk: "Training for this goal will likely result in injury or burnout",
      action: "MUST adjust goal or timeline before proceeding"
    });
  }
  
  // Calculate suggested alternatives
  const suggestedAlternative = {
    realisticTimeImprovement: calculateRealisticTimeImprovement(
      distance, 
      maxRealisticImprovement,
      improvementPercent
    ),
    extendedTimeline: calculateExtendedTimeline(
      improvementPercent,
      maxRealisticImprovement,
      weeksAvailable,
      benchmarks
    )
  };
  
  return {
    realistic: realistic,
    confidence: confidence,
    realizability: Math.min(realizability, 100).toFixed(0) + "%",
    improvementRequested: improvementPercent.toFixed(2) + "%",
    maxRealisticImprovement: maxRealisticImprovement.toFixed(2) + "%",
    athleteCategory: ["Beginner", "Recreational", "Advanced"][category],
    weeksAvailable: weeksAvailable,
    estimatedWeeksNeeded: suggestedAlternative.extendedTimeline.weeks,
    warnings: warnings,
    suggestedAlternative: suggestedAlternative
  };
}
```

---

### 1.5 Projecting Improved Thresholds Over Training Period

```javascript
function projectImprovedThresholds(currentThresholds, improvementPercent, weeksAvailable, trainingHistory) {
  // Threshold improvements are typically 70-80% of race performance improvements
  // Example: 5% race improvement = ~3.5-4% threshold improvement
  const thresholdImprovementFactor = 0.75;
  const expectedThresholdImprovement = improvementPercent * thresholdImprovementFactor;
  
  // Calculate projected thresholds
  const projectedLT2_pace = currentThresholds.LT2.pace_secPerKm * (1 - expectedThresholdImprovement / 100);
  const projectedLT1_pace = currentThresholds.LT1.pace_secPerKm * (1 - expectedThresholdImprovement / 100);
  
  // Create improvement trajectory (for mid-program adjustments)
  const trajectory = calculateImprovementTrajectory(
    currentThresholds,
    { LT2: projectedLT2_pace, LT1: projectedLT1_pace },
    weeksAvailable
  );
  
  return {
    current: currentThresholds,
    projected: {
      LT1: {
        pace_secPerKm: projectedLT1_pace,
        improvement_secPerKm: currentThresholds.LT1.pace_secPerKm - projectedLT1_pace,
        improvement_percent: expectedThresholdImprovement.toFixed(2) + "%",
        confidence: "PROJECTED - NOT YET ACHIEVED"
      },
      LT2: {
        pace_secPerKm: projectedLT2_pace,
        improvement_secPerKm: currentThresholds.LT2.pace_secPerKm - projectedLT2_pace,
        improvement_percent: expectedThresholdImprovement.toFixed(2) + "%",
        confidence: "PROJECTED - NOT YET ACHIEVED"
      }
    },
    trajectory: trajectory,
    note: "Projected thresholds assume perfect training execution and no setbacks"
  };
}
```

---

### 1.6 Improvement Trajectory Calculator (Mid-Program Adjustments)

```javascript
function calculateImprovementTrajectory(currentThresholds, projectedThresholds, weeksAvailable) {
  // Physiological adaptations follow non-linear curve
  // Early weeks: rapid neuromuscular gains (weeks 1-4)
  // Middle weeks: steady metabolic adaptations (weeks 5-16)
  // Later weeks: fine-tuning and race-specific fitness (weeks 17+)
  
  const totalLT2_improvement = currentThresholds.LT2.pace_secPerKm - projectedThresholds.LT2;
  
  // Improvement distribution model
  const improvementPhases = [
    { weeks: [0, 4], percentage: 0.15 },   // 15% of total improvement in weeks 1-4
    { weeks: [4, 8], percentage: 0.25 },   // 25% in weeks 5-8
    { weeks: [8, 12], percentage: 0.30 },  // 30% in weeks 9-12
    { weeks: [12, 16], percentage: 0.20 }, // 20% in weeks 13-16
    { weeks: [16, 24], percentage: 0.10 }  // 10% in weeks 17-24 (maintenance/race prep)
  ];
  
  const milestones = [];
  let cumulativeImprovement = 0;
  
  for (const phase of improvementPhases) {
    if (weeksAvailable >= phase.weeks[1]) {
      cumulativeImprovement += phase.percentage;
      const milestoneWeek = phase.weeks[1];
      const milestoneLT2 = currentThresholds.LT2.pace_secPerKm - 
        (totalLT2_improvement * cumulativeImprovement);
      
      milestones.push({
        week: milestoneWeek,
        expectedLT2_pace: milestoneLT2,
        cumulativeImprovement: (cumulativeImprovement * 100).toFixed(0) + "%",
        testingRecommendation: milestoneWeek % 4 === 0 ? "RETEST THIS WEEK" : "Continue training"
      });
    }
  }
  
  return {
    model: "Non-linear physiological adaptation curve",
    milestones: milestones,
    retestSchedule: milestones.filter(m => m.testingRecommendation.includes("RETEST")),
    note: "Actual improvement may vary ±20% from projected trajectory"
  };
}
```

---

## Part 2: Integration with Main Training Engine

### 2.1 Enhanced `determineThresholds()` Function

```javascript
async determineThresholds() {
  // Priority 1: Use lab test if available
  if (this.data.labTestResults && this.data.labTestResults.lactateCurve) {
    return this.calculateThresholdsFromLab();
  }
  
  // Priority 2: Use field tests
  if (this.data.fieldTestResults) {
    return this.calculateThresholdsFromFieldTests();
  }
  
  // Priority 3: Estimate from recent race performances
  if (this.data.fieldTestResults && this.data.fieldTestResults.recentRaces.length > 0) {
    return this.estimateFromRaces();
  }
  
  // NEW Priority 4: Previous PB with improvement goal
  if (this.data.personalBest && this.data.improvementGoal) {
    const pbEstimate = estimateThresholdsFromPB_withImprovement(
      this.data.personalBest,
      this.data.improvementGoal,
      this.data.trainingHistory
    );
    
    if (pbEstimate.error === "UNREALISTIC_GOAL") {
      this.warnings.push({
        severity: "CRITICAL",
        message: pbEstimate.validation.warnings[0].message,
        action: "Adjust goal or timeline before generating program",
        alternatives: pbEstimate.recommendation
      });
      return null;
    }
    
    // Add validation protocol warnings
    this.warnings.push(...pbEstimate.warnings);
    this.warnings.push({
      severity: "HIGH",
      message: "Program based on projected improvement from personal best",
      action: "Follow mandatory validation testing schedule",
      schedule: pbEstimate.validationProtocol
    });
    
    return {
      method: "PB_WITH_IMPROVEMENT",
      thresholds: pbEstimate.currentThresholds,
      projectedThresholds: pbEstimate.projectedThresholds,
      confidence: pbEstimate.confidence,
      validationRequired: true,
      validationSchedule: pbEstimate.validationProtocol
    };
  }
  
  // NEW Priority 5: Target time only (no previous data)
  if (this.data.targetRace && this.data.targetRace.targetTime_seconds) {
    const targetEstimate = estimateThresholdsFromTargetTime(this.data.targetRace);
    
    this.warnings.push(...targetEstimate.warnings);
    this.warnings.push({
      severity: "CRITICAL",
      message: "NO PREVIOUS PERFORMANCE DATA - Zones are CONSERVATIVE ESTIMATES",
      action: "Complete validation test by Week 2 or program may be sub-optimal",
      validation: targetEstimate.validationProtocol
    });
    
    return {
      method: "TARGET_TIME_ONLY",
      thresholds: {
        LT1: targetEstimate.LT1,
        LT2: targetEstimate.LT2
      },
      confidence: "LOW",
      conservatismAdjustments: targetEstimate.conservatismAdjustments,
      validationRequired: true,
      validationDeadline: "Week 2 - NON-NEGOTIABLE"
    };
  }
  
  // No usable data: recommend field testing
  this.warnings.push({
    severity: "CRITICAL",
    message: "No threshold data OR race goals provided",
    action: "Provide either: (1) Target race time, (2) Previous PB, or (3) Complete field test",
    options: [
      "30-minute time trial",
      "10K race",
      "Recent race performance (5K, 10K, half, or marathon)"
    ]
  });
  
  return null;
}
```

---

### 2.2 Zone Calculation with Conservatism Adjustments

```javascript
function calculateTrainingZones(thresholds, conservatismAdjustments = null) {
  const { LT1, LT2 } = thresholds;
  
  // Apply conservatism if using unvalidated estimates
  const adjustments = conservatismAdjustments || {
    LT1_upper: 0.05, // Standard 5% range
    LT2_upper: 0.02, // Standard 2% range
    note: "Standard ranges - validated thresholds"
  };
  
  // If conservative adjustments specified
  if (conservatismAdjustments && conservatismAdjustments.note.includes("CONSERVATIVE")) {
    return {
      zones: calculateConservativeZones(LT1, LT2, adjustments),
      note: "CONSERVATIVE ZONES - Using narrower ranges until validation",
      validationStatus: "UNVALIDATED",
      adjustAfterValidation: true
    };
  }
  
  // Standard zone calculation
  return {
    zones: calculateStandardZones(LT1, LT2),
    note: "Standard zones based on validated or high-confidence thresholds",
    validationStatus: "VALIDATED"
  };
}

function calculateConservativeZones(LT1, LT2, adjustments) {
  // Narrower zone ranges, biased toward easier end
  return {
    Zone1: {
      name: "Easy Recovery",
      lower: null,
      upper: LT1.pace_secPerKm * 1.02, // Only 2% above LT1 instead of 5%
      purpose: "Active recovery, aerobic base building",
      note: "Conservative upper limit until validation"
    },
    Zone2: {
      name: "Aerobic Threshold",
      lower: LT1.pace_secPerKm * 0.98,
      upper: LT1.pace_secPerKm * 1.02,
      target: LT1.pace_secPerKm,
      purpose: "Build aerobic efficiency at threshold",
      note: "Narrow range for safety"
    },
    Zone3: {
      name: "Tempo",
      lower: LT1.pace_secPerKm * 0.95,
      upper: LT2.pace_secPerKm * 0.98, // Don't exceed LT2 until validated
      purpose: "Lactate clearance, tempo endurance",
      note: "Stay below estimated LT2 until validation"
    },
    Zone4: {
      name: "Lactate Threshold",
      lower: LT2.pace_secPerKm * 1.00,
      upper: LT2.pace_secPerKm * 0.98, // Conservative - stay at or below LT2
      target: LT2.pace_secPerKm,
      purpose: "Raise anaerobic threshold",
      note: "DO NOT EXCEED until thresholds validated"
    },
    Zone5: {
      name: "VO2 Max",
      lower: LT2.pace_secPerKm * 0.97,
      upper: LT2.pace_secPerKm * 0.92,
      purpose: "Maximal aerobic power",
      note: "AVOID until validation - injury risk too high with unvalidated zones",
      recommendation: "Skip Zone 5 intervals until Week 3+ after validation"
    }
  };
}
```

---

## Part 3: Validation Testing Protocol

### 3.1 Mandatory Validation Schedule

```javascript
function generateValidationSchedule(thresholdMethod, weeksToRace) {
  if (thresholdMethod === "TARGET_TIME_ONLY") {
    return {
      week2: {
        test: "30-minute time trial OR 10K race",
        purpose: "Validate estimated thresholds",
        critical: true,
        action_if_skipped: "PAUSE PROGRAM until test completed",
        acceptableDeviation: "±5%"
      },
      week6: {
        test: "20-minute time trial",
        purpose: "Assess early adaptations",
        critical: false,
        action_if_results_poor: "Adjust zones downward"
      },
      week10: {
        test: "10K race or time trial",
        purpose: "Confirm training effectiveness",
        critical: true,
        action_if_results_poor: "Modify methodology or adjust goal"
      }
    };
  }
  
  if (thresholdMethod === "PB_WITH_IMPROVEMENT") {
    return {
      week4: {
        test: "30-minute time trial",
        purpose: "Establish baseline for improvement tracking",
        critical: true,
        expectedResult: "Confirm current threshold estimates accurate"
      },
      week8: {
        test: "20-minute time trial",
        purpose: "Assess improvement trajectory",
        critical: true,
        expectedResult: "Show 40-50% of projected improvement achieved",
        action_if_behind: "Extend timeline or adjust goal"
      },
      week12: {
        test: "10K race or time trial",
        purpose: "Validate threshold improvements",
        critical: true,
        expectedResult: "Show 70-80% of projected improvement achieved",
        decision_point: "Go/No-Go for original goal"
      },
      finalWeek_minus_2: {
        test: "Race simulation at target pace",
        purpose: "Final validation of race readiness",
        critical: true,
        expectedResult: "Sustain target pace for 30-40 minutes comfortably"
      }
    };
  }
  
  // Standard schedule for validated thresholds
  return {
    week8: {
      test: "Optional benchmark workout",
      purpose: "Track progress",
      critical: false
    },
    week16: {
      test: "Optional 10K race or time trial",
      purpose: "Update zones if significant improvement",
      critical: false
    }
  };
}
```

---

### 3.2 Post-Validation Program Adjustment

```javascript
function adjustProgramPostValidation(validationResults, originalThresholds, currentWeek) {
  const { testType, testResults } = validationResults;
  
  // Calculate actual thresholds from validation test
  const validatedThresholds = calculateThresholdsFromTest(testResults);
  
  // Compare to original estimates
  const LT2_deviation = Math.abs(
    (validatedThresholds.LT2.pace_secPerKm - originalThresholds.LT2.pace_secPerKm) / 
    originalThresholds.LT2.pace_secPerKm
  ) * 100;
  
  const LT1_deviation = Math.abs(
    (validatedThresholds.LT1.pace_secPerKm - originalThresholds.LT1.pace_secPerKm) / 
    originalThresholds.LT1.pace_secPerKm
  ) * 100;
  
  // Determine action based on deviation
  let action, severity, explanation;
  
  if (LT2_deviation < 3 && LT1_deviation < 3) {
    action = "CONTINUE";
    severity = "INFO";
    explanation = "Estimates were accurate within 3%. Continue with current program.";
  } else if (LT2_deviation < 5 && LT1_deviation < 5) {
    action = "MINOR_ADJUSTMENT";
    severity = "INFO";
    explanation = "Small deviation detected. Adjust zones but maintain program structure.";
  } else if (LT2_deviation < 8 && LT1_deviation < 8) {
    action = "REGENERATE_WORKOUTS";
    severity: "WARNING",
    explanation = "Moderate deviation. Regenerate remaining workouts with correct zones.";
  } else {
    action = "FULL_REGENERATION";
    severity = "CRITICAL";
    explanation = "Large deviation (>8%). Original estimates significantly off. Must regenerate entire program from current week forward.";
  }
  
  return {
    action: action,
    severity: severity,
    explanation: explanation,
    originalEstimates: originalThresholds,
    validatedThresholds: validatedThresholds,
    deviations: {
      LT1: LT1_deviation.toFixed(2) + "%",
      LT2: LT2_deviation.toFixed(2) + "%"
    },
    recommendation: generateRegenerationRecommendation(action, currentWeek),
    adjustedZones: calculateTrainingZones(validatedThresholds, null) // No conservatism - validated
  };
}
```

---

## Part 4: User Interface and Communication

### 4.1 Initial Program Generation Message (Target Time Only)

```javascript
function generateTargetTimeWarningMessage(targetRace, estimatedThresholds) {
  return {
    title: "⚠️ TRAINING PROGRAM GENERATED FROM TARGET TIME ONLY",
    severity: "HIGH",
    message: `
Your training program has been generated based on your target ${formatDistance(targetRace.distance)} 
time of ${formatTime(targetRace.targetTime_seconds)} WITHOUT validation testing.

🔴 CRITICAL INFORMATION:

1. Your training zones are CONSERVATIVE ESTIMATES
   - LT1 (Easy pace): ${formatPace(estimatedThresholds.LT1.pace_secPerKm)}
   - LT2 (Threshold): ${formatPace(estimatedThresholds.LT2.pace_secPerKm)}
   
2. These zones may be INCORRECT by ±5-10%

3. MANDATORY VALIDATION TEST BY WEEK 2:
   - Complete a 30-minute time trial OR 10K race
   - We will recalculate your zones from this test
   - If zones change >5%, we'll regenerate your program

⚠️ TRAINING WITH INCORRECT ZONES CAN:
   - Cause injury (if zones too fast)
   - Waste training time (if zones too slow)
   - Lead to race day failure

✅ WHAT TO EXPECT:

Week 1: Feel zones are "easy" - this is intentional (conservative approach)
Week 2: Complete validation test - CRITICAL
Week 3: Receive adjusted zones and continue training with confidence

DO NOT SKIP THE WEEK 2 VALIDATION TEST.
    `,
    actionRequired: true,
    deadline: "Week 2",
    consequence: "Program will be paused until validation completed"
  };
}
```

---

### 4.2 Initial Program Generation Message (Personal Best with Improvement)

```javascript
function generatePB_ImprovementMessage(pbAnalysis, validationResult) {
  return {
    title: "📊 TRAINING PROGRAM: IMPROVEMENT FROM PERSONAL BEST",
    severity: validationResult.realistic ? "INFO" : "WARNING",
    message: `
Your training program has been generated to improve your ${formatDistance(pbAnalysis.distance)} 
from ${formatTime(pbAnalysis.currentPB)} to ${formatTime(pbAnalysis.targetTime)}.

📈 IMPROVEMENT ANALYSIS:

Target improvement: ${pbAnalysis.improvementPercent}% (${formatTime(pbAnalysis.improvementSeconds)})
Training time: ${pbAnalysis.weeksAvailable} weeks
Assessment: ${validationResult.confidence} confidence
Realizability: ${validationResult.realizability}

${validationResult.realistic ? 
  '✅ This is a REALISTIC goal with proper training.' : 
  '⚠️ This is an AMBITIOUS goal requiring perfect execution.'}

🎯 TRAINING APPROACH:

Phase 1 (Weeks 1-6): Train at your CURRENT thresholds
  - LT1: ${formatPace(pbAnalysis.currentThresholds.LT1.pace_secPerKm)}
  - LT2: ${formatPace(pbAnalysis.currentThresholds.LT2.pace_secPerKm)}

Phase 2 (Weeks 7-12): Transition to IMPROVED thresholds (if validation tests confirm)
  - Projected LT1: ${formatPace(pbAnalysis.projectedThresholds.LT1.pace_secPerKm)}
  - Projected LT2: ${formatPace(pbAnalysis.projectedThresholds.LT2.pace_secPerKm)}

Phase 3 (Weeks 13+): Race-specific preparation at TARGET PACE
  - Target race pace: ${formatPace(pbAnalysis.targetPace)}

📅 MANDATORY VALIDATION SCHEDULE:

Week 4: Baseline test (confirm current thresholds)
Week 8: Progress check (expecting 40-50% improvement)
Week 12: Threshold validation (expecting 70-80% improvement)
Week ${pbAnalysis.weeksAvailable - 2}: Race simulation

${!validationResult.realistic ? `
⚠️ IMPORTANT WARNING:

Your improvement goal is at the upper limit of what's physiologically realistic.
Success requires:
- Zero missed workouts
- Perfect recovery
- No illness or injury
- Optimal nutrition and sleep

Alternative: ${formatTime(validationResult.suggestedAlternative.realisticTimeImprovement)} 
would be more realistic within ${pbAnalysis.weeksAvailable} weeks.

Or extend timeline to ${validationResult.suggestedAlternative.extendedTimeline.weeks} weeks 
for ${pbAnalysis.improvementPercent}% improvement.
` : ''}
    `,
    actionRequired: true,
    validationSchedule: generateValidationSchedule("PB_WITH_IMPROVEMENT", pbAnalysis.weeksAvailable)
  };
}
```

---

## Part 5: Error Handling and Edge Cases

### 5.1 Unrealistic Goal Rejection

```javascript
function handleUnrealisticGoal(validationResult) {
  return {
    error: "GOAL_REJECTED",
    severity: "CRITICAL",
    message: "Your improvement goal exceeds physiological limits for the available timeframe.",
    details: {
      requested: validationResult.improvementRequested,
      maxRealistic: validationResult.maxRealisticImprovement,
      realizability: validationResult.realizability
    },
    alternatives: [
      {
        option: "Adjust target time",
        recommendation: validationResult.suggestedAlternative.realisticTimeImprovement,
        benefit: "Achievable with high confidence"
      },
      {
        option: "Extend timeline",
        recommendation: `${validationResult.suggestedAlternative.extendedTimeline.weeks} weeks`,
        benefit: "Keep ambitious goal but allow proper adaptation"
      },
      {
        option: "Complete validation test first",
        recommendation: "30-min TT or 10K race to establish accurate current fitness",
        benefit: "May reveal you're faster than personal best suggests"
      }
    ],
    action: "SELECT ONE OF THE ALTERNATIVES ABOVE BEFORE PROCEEDING",
    note: "We cannot generate a program for this goal as written. Training at inappropriate intensities leads to injury or burnout."
  };
}
```

---

### 5.2 Mid-Program Validation Failure

```javascript
function handleValidationTestFailure(expectedPace, actualPace, weekNumber, methodology) {
  const deviation = ((actualPace - expectedPace) / expectedPace) * 100;
  
  if (deviation > 0) {
    // Slower than expected - under-trained or not recovered
    return {
      result: "BELOW_EXPECTATIONS",
      severity: deviation > 5 ? "CRITICAL" : "WARNING",
      deviation: deviation.toFixed(2) + "% slower than expected",
      possibleCauses: [
        "Inadequate recovery before test",
        "Illness or fatigue",
        "Poor test conditions (heat, wind, hills)",
        "Insufficient training stimulus",
        "Original zones too aggressive"
      ],
      recommendations: [
        {
          action: "REST_AND_RETEST",
          timeline: "Take 3-5 easy days, then retest",
          if_results_similar: "Adjust zones downward and modify training"
        },
        {
          action: "REVIEW_TRAINING_LOG",
          details: "Check: sleep quality, illness, missed workouts, ACWR >1.3"
        },
        {
          action: methodology === "Norwegian" ? "SWITCH_TO_POLARIZED" : "REDUCE_INTENSITY",
          rationale: "Current methodology may be too aggressive for your recovery capacity"
        }
      ],
      programAdjustments: {
        immediate: "Convert next 2 weeks of quality to easy aerobic",
        longTerm: deviation > 5 ? "Regenerate program with adjusted zones" : "Continue but monitor closely"
      }
    };
  } else {
    // Faster than expected - ahead of schedule (good problem!)
    return {
      result: "AHEAD_OF_EXPECTATIONS",
      severity: "INFO",
      deviation: Math.abs(deviation).toFixed(2) + "% faster than expected",
      implications: [
        "Original estimates were conservative",
        "You're adapting faster than typical",
        "Training methodology is working well"
      ],
      recommendations: [
        {
          action: "UPDATE_ZONES",
          details: "Recalculate all zones based on this test",
          benefit: "Optimize remaining training"
        },
        {
          action: "REASSESS_GOAL",
          details: Math.abs(deviation) > 5 ? "Consider faster target time" : "Current goal looks very achievable",
          note: "Being ahead of schedule allows room for ambitious race day"
        },
        {
          action: "MAINTAIN_METHODOLOGY",
          details: "Don't change what's working - increase load gradually"
        }
      ],
      programAdjustments: {
        immediate: "Update zones in next week's workouts",
        longTerm: Math.abs(deviation) > 5 ? "Consider regenerating with faster target" : "Continue with updated zones"
      }
    };
  }
}
```

---

## Part 6: Production Implementation Checklist

### 6.1 Required Data Structures

```javascript
// Add to main athlete data structure:

const EnhancedAthleteData = {
  // ... existing fields ...
  
  // NEW: Target race without validation
  targetRace: {
    distance: number,           // meters (5000, 10000, 21097.5, 42195)
    targetTime_seconds: number,
    targetDate: date,
    runnerLevel: "beginner" | "recreational" | "advanced" | "elite",
    maxHR: number | null       // Optional for HR zone estimation
  },
  
  // NEW: Previous personal best
  personalBest: {
    distance: number,
    time_seconds: number,
    date: date,
    conditions: "excellent" | "good" | "poor",
    location: string | null,
    notes: string | null
  },
  
  // NEW: Improvement goal
  improvementGoal: {
    targetTime_seconds: number,
    targetDate: date,
    confidence: "conservative" | "realistic" | "ambitious"
  },
  
  // NEW: Training history (for validation)
  trainingHistory: {
    yearsRunning: number,
    weeklyVolume_km: number | null,
    consistentTraining: boolean,
    previousImprovements: [
      {
        fromTime: number,
        toTime: number,
        distance: number,
        weeksElapsed: number
      }
    ],
    injuryHistory: string[] | null
  }
};
```

---

### 6.2 Implementation Priority Order

```javascript
const ImplementationPriority = {
  phase1: {
    title: "Core Estimation Functions",
    tasks: [
      "Implement estimateThresholdsFromTargetTime()",
      "Implement estimateCurrentThresholdsFromPB()",
      "Implement estimateThresholdsFromPB_withImprovement()",
      "Add race-to-threshold conversion factors"
    ],
    estimated_time: "2-3 days"
  },
  
  phase2: {
    title: "Validation System",
    tasks: [
      "Implement validateImprovementGoal()",
      "Build improvement trajectory calculator",
      "Create validation test scheduler",
      "Build post-validation adjustment logic"
    ],
    estimated_time: "2-3 days"
  },
  
  phase3: {
    title: "Conservative Zone Calculations",
    tasks: [
      "Implement calculateConservativeZones()",
      "Build zone adjustment logic for unvalidated estimates",
      "Create post-validation zone recalculation"
    ],
    estimated_time: "1-2 days"
  },
  
  phase4: {
    title: "Integration",
    tasks: [
      "Update determineThresholds() with new priority levels",
      "Integrate validation schedules into program generation",
      "Build warning/message generation system",
      "Create validation test reminder system"
    ],
    estimated_time: "2-3 days"
  },
  
  phase5: {
    title: "Testing & Edge Cases",
    tasks: [
      "Test with realistic improvement goals",
      "Test with unrealistic goals (should reject)",
      "Test post-validation adjustments",
      "Test validation test failure scenarios"
    ],
    estimated_time: "2-3 days"
  },
  
  total_estimate: "10-15 days for complete implementation"
};
```

---

### 6.3 Key Safety Principles

```javascript
const SafetyPrinciples = {
  principle1: {
    name: "Conservative Bias",
    rule: "When in doubt, estimate slower thresholds",
    rationale: "Training slightly too easy is safer than training too hard",
    implementation: "Use lower end of race-to-threshold factors for unvalidated estimates"
  },
  
  principle2: {
    name: "Mandatory Validation",
    rule: "All unvalidated estimates MUST be tested within 2-4 weeks",
    rationale: "Extended training at wrong intensities causes injury or poor results",
    implementation: "Hard deadline on Week 2 for target-time-only estimates"
  },
  
  principle3: {
    name: "Realistic Goals Only",
    rule: "Reject goals that exceed physiological improvement rates",
    rationale: "Unrealistic goals lead to overtraining and injury",
    implementation: "Use validateImprovementGoal() with hard limits"
  },
  
  principle4: {
    name: "Gradual Zone Transitions",
    rule: "Don't jump immediately to projected thresholds",
    rationale: "Adaptations take time - premature intensity increases cause breakdown",
    implementation: "Use improvement trajectory with 4-6 week validation cycles"
  },
  
  principle5: {
    name: "Fallback Mechanisms",
    rule: "If validation tests show poor results, reduce intensity immediately",
    rationale: "Program must adapt to reality, not force athlete to meet unrealistic expectations",
    implementation: "Automatic program modification if validation tests >5% off target"
  }
};
```

---

## Conclusion

This module enables the training engine to serve runners who lack initial testing data while maintaining scientific rigor and safety protocols. The system:

✅ Provides immediate program generation from target times or personal bests
✅ Validates improvement goals against physiological limits
✅ Uses conservative estimates until validation testing occurs
✅ Mandates field testing within 2-4 weeks (non-negotiable)
✅ Automatically adjusts programs based on validation results
✅ Rejects unrealistic goals that would lead to injury
✅ Creates progressive improvement trajectories for ambitious goals
✅ Maintains all safety protocols even without lab testing

**This makes the engine accessible to the 95% of runners who don't have access to lactate testing while ensuring they train safely and effectively.**

---

**READY FOR INTEGRATION INTO MAIN SKILL DOCUMENTATION**
