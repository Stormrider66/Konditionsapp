# Athlete Monitoring and Adaptive Program Modification System

**Document Purpose**: Production-ready implementation of daily monitoring systems and automatic program modification algorithms for runner training programs. This document covers HRV monitoring, subjective wellness assessment, resting heart rate tracking, and intelligent workout modification logic.

**Critical Context**: The Norwegian double-threshold methodology and other high-volume elite training approaches CANNOT be safely executed without robust daily monitoring. These systems prevent overtraining, reduce injury risk, and optimize adaptation by modifying training based on real-time athlete readiness.

**Integration Point**: This document extends the core training engine with monitoring and adaptation capabilities. All algorithms must be implemented before v1.0 launch to ensure athlete safety.

---

## Table of Contents

1. Heart Rate Variability (HRV) Monitoring System
2. Daily Wellness Questionnaire
3. Resting Heart Rate (RHR) Monitoring
4. Comprehensive Readiness Assessment Algorithm
5. Automatic Program Modification Logic
6. Integration with Training Methodologies
7. Data Collection and Measurement Protocols
8. Warning Systems and Red Flags

---

## Part 1: Heart Rate Variability (HRV) Monitoring System

### 1.1 Scientific Foundation

**HRV Definition**: Heart rate variability measures the variation in time between successive heartbeats. Higher HRV indicates better autonomic nervous system balance and recovery capacity. Lower HRV indicates accumulated fatigue, stress, or incomplete recovery.

**Key Metric**: RMSSD (Root Mean Square of Successive Differences) - the gold standard for daily HRV monitoring. Measured in milliseconds.

**Why HRV Works**: The parasympathetic nervous system (rest/digest) increases HRV, while the sympathetic nervous system (fight/flight) decreases HRV. Training stress, poor sleep, illness, and life stress all activate the sympathetic system, suppressing HRV.

**Sensitivity**: HRV responds to training load within 24-48 hours, making it ideal for daily monitoring. Research shows correlation coefficients of r = 0.65-0.85 between HRV changes and performance readiness.

### 1.2 Baseline Establishment Protocol

```javascript
const HRVBaselineProtocol = {
  measurement_period: {
    duration: "14 days minimum, 21 days ideal",
    frequency: "Daily without exception",
    timing: "Upon waking, before standing or bathroom",
    conditions: "Calm, quiet environment, minimal movement"
  },
  
  exclusion_criteria: [
    "Recent illness (wait 7 days post-recovery)",
    "Recent injury",
    "Major life stressor (wait for stabilization)",
    "Alcohol consumption (previous 24 hours)",
    "Insufficient sleep (<5 hours)"
  ],
  
  measurement_protocol: {
    position: "Lying supine OR seated (choose one, maintain consistency)",
    duration: "3-5 minutes (longer is better)",
    breathing: "Normal, relaxed breathing (no breathing exercises)",
    device: "Chest strap HR monitor (wrist optical too inaccurate)",
    apps: "HRV4Training, Elite HRV, Kubios, or similar validated app"
  },
  
  calculation: {
    metric: "RMSSD in milliseconds",
    baseline: "7-day rolling average",
    standardDeviation: "Calculate SD for interpretation boundaries"
  }
};

function establishHRVBaseline(dailyMeasurements) {
  // dailyMeasurements = [{date, rmssd, quality}, ...]
  
  // Validate minimum data
  if (dailyMeasurements.length < 14) {
    return {
      error: "INSUFFICIENT_DATA",
      message: `Need ${14 - dailyMeasurements.length} more days of measurements`,
      daysRemaining: 14 - dailyMeasurements.length
    };
  }
  
  // Filter out poor quality measurements
  const validMeasurements = dailyMeasurements.filter(m => 
    m.quality !== "poor" && m.rmssd > 10 && m.rmssd < 200
  );
  
  if (validMeasurements.length < 14) {
    return {
      error: "INSUFFICIENT_QUALITY",
      message: "Too many poor quality measurements. Review measurement protocol.",
      validDays: validMeasurements.length,
      required: 14
    };
  }
  
  // Calculate baseline statistics
  const rmssdValues = validMeasurements.map(m => m.rmssd);
  const mean = rmssdValues.reduce((a, b) => a + b) / rmssdValues.length;
  
  // Calculate standard deviation
  const variance = rmssdValues.reduce((sum, val) => 
    sum + Math.pow(val - mean, 2), 0
  ) / rmssdValues.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate coefficient of variation
  const cv = (stdDev / mean) * 100;
  
  return {
    baseline: {
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      cv: Math.round(cv * 10) / 10,
      measurementDays: validMeasurements.length,
      dateRange: {
        start: validMeasurements[0].date,
        end: validMeasurements[validMeasurements.length - 1].date
      }
    },
    thresholds: {
      normal: {
        lower: Math.round((mean - stdDev * 0.5) * 10) / 10,
        upper: Math.round((mean + stdDev * 0.5) * 10) / 10
      },
      yellowFlag: {
        lower: Math.round((mean - stdDev * 1.0) * 10) / 10,
        upper: Math.round((mean + stdDev * 1.0) * 10) / 10
      },
      redFlag: {
        lower: Math.round((mean - stdDev * 1.5) * 10) / 10
      }
    },
    interpretation: {
      stability: cv < 15 ? "Excellent" : cv < 25 ? "Good" : "Variable - continue monitoring",
      recommendation: cv > 25 
        ? "High variability detected. Review measurement consistency and lifestyle factors."
        : "Baseline established. Begin daily monitoring."
    }
  };
}
```

### 1.3 Daily HRV Assessment Algorithm

```javascript
function assessDailyHRV(todayHRV, baseline, recentHistory) {
  // recentHistory = last 7 days of HRV measurements
  
  // Calculate 7-day rolling average
  const recent7Days = [...recentHistory, todayHRV];
  const rollingAvg = recent7Days.reduce((a, b) => a + b) / recent7Days.length;
  
  // Calculate percentage of baseline
  const percentOfBaseline = (todayHRV / baseline.mean) * 100;
  const rollingPercentOfBaseline = (rollingAvg / baseline.mean) * 100;
  
  // Assess today's measurement
  let status, severity, message, action;
  
  if (todayHRV >= baseline.thresholds.normal.lower) {
    status = "NORMAL";
    severity = "GREEN";
    message = "HRV within normal range - good recovery status";
    action = "PROCEED";
  } else if (todayHRV >= baseline.thresholds.yellowFlag.lower) {
    status = "SLIGHTLY_SUPPRESSED";
    severity = "YELLOW";
    message = "HRV slightly below baseline - moderate fatigue present";
    action = "MODIFY_MODERATE";
  } else if (todayHRV >= baseline.thresholds.redFlag.lower) {
    status = "SUPPRESSED";
    severity = "YELLOW_RED";
    message = "HRV notably suppressed - significant fatigue accumulation";
    action = "MODIFY_SIGNIFICANT";
  } else {
    status = "SEVERELY_SUPPRESSED";
    severity = "RED";
    message = "HRV severely suppressed - overreaching or illness risk";
    action = "REST_REQUIRED";
  }
  
  // Check for trends (3+ day decline)
  const trend = analyzeTrend(recent7Days);
  
  // Elevated HRV can also indicate overtraining paradox
  if (todayHRV > baseline.mean + baseline.stdDev * 2) {
    return {
      status: "ABNORMALLY_ELEVATED",
      severity: "YELLOW",
      message: "HRV unusually high - possible overtraining paradox or measurement error",
      action: "MONITOR_CLOSELY",
      note: "Sustained elevation with declining performance suggests overtraining",
      percentOfBaseline: percentOfBaseline,
      trend: trend
    };
  }
  
  return {
    status: status,
    severity: severity,
    message: message,
    action: action,
    todayValue: Math.round(todayHRV * 10) / 10,
    baselineValue: baseline.mean,
    percentOfBaseline: Math.round(percentOfBaseline),
    rollingAverage: Math.round(rollingAvg * 10) / 10,
    rollingPercentOfBaseline: Math.round(rollingPercentOfBaseline),
    trend: trend,
    interpretation: generateHRVInterpretation(percentOfBaseline, trend, status)
  };
}

function analyzeTrend(recent7Days) {
  if (recent7Days.length < 3) return { trend: "INSUFFICIENT_DATA" };
  
  // Simple linear regression
  const n = recent7Days.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  recent7Days.forEach((value, index) => {
    sumX += index;
    sumY += value;
    sumXY += index * value;
    sumX2 += index * index;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Calculate percentage change per day
  const avgValue = sumY / n;
  const percentChangePerDay = (slope / avgValue) * 100;
  
  let trend, severity, message;
  
  if (percentChangePerDay > 2) {
    trend = "IMPROVING";
    severity = "GREEN";
    message = "HRV trending upward - recovering well";
  } else if (percentChangePerDay > -2) {
    trend = "STABLE";
    severity = "GREEN";
    message = "HRV stable - consistent recovery";
  } else if (percentChangePerDay > -5) {
    trend = "DECLINING_MILD";
    severity = "YELLOW";
    message = "HRV declining mildly - monitor training load";
  } else {
    trend = "DECLINING_SIGNIFICANT";
    severity = "RED";
    message = "HRV declining significantly - fatigue accumulating";
  }
  
  return {
    trend: trend,
    severity: severity,
    message: message,
    percentChangePerDay: Math.round(percentChangePerDay * 10) / 10,
    consecutiveDeclines: countConsecutiveDeclines(recent7Days)
  };
}

function countConsecutiveDeclines(recent7Days) {
  let count = 0;
  for (let i = recent7Days.length - 1; i > 0; i--) {
    if (recent7Days[i] < recent7Days[i - 1]) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function generateHRVInterpretation(percentOfBaseline, trend, status) {
  const interpretations = {
    physiological: "",
    training: "",
    recommendation: ""
  };
  
  // Physiological interpretation
  if (percentOfBaseline >= 95) {
    interpretations.physiological = "Autonomic nervous system well-balanced. Parasympathetic dominance indicates good recovery.";
  } else if (percentOfBaseline >= 85) {
    interpretations.physiological = "Moderate sympathetic activation. Body managing stress but not fully recovered.";
  } else if (percentOfBaseline >= 75) {
    interpretations.physiological = "Elevated sympathetic activity. Significant stress or incomplete recovery present.";
  } else {
    interpretations.physiological = "High sympathetic dominance. Body in stress state - overreaching or illness possible.";
  }
  
  // Training implications
  if (status === "NORMAL" && trend.trend === "STABLE") {
    interpretations.training = "Training load well-tolerated. Continue with planned progression.";
  } else if (status === "SLIGHTLY_SUPPRESSED") {
    interpretations.training = "Training stress slightly elevated. Body adapting but close to threshold.";
  } else if (trend.consecutiveDeclines >= 3) {
    interpretations.training = "Cumulative fatigue building over multiple days. Deload needed.";
  } else if (status === "SEVERELY_SUPPRESSED") {
    interpretations.training = "Training load exceeds recovery capacity. Immediate action required.";
  }
  
  // Specific recommendations
  if (percentOfBaseline >= 95 && trend.trend === "IMPROVING") {
    interpretations.recommendation = "Excellent recovery. Good day for quality workout.";
  } else if (percentOfBaseline >= 90 && trend.trend === "STABLE") {
    interpretations.recommendation = "Proceed with planned training.";
  } else if (percentOfBaseline < 90 && trend.consecutiveDeclines >= 3) {
    interpretations.recommendation = "Implement 3-5 day reduced load period. Convert quality to easy.";
  } else if (percentOfBaseline < 80) {
    interpretations.recommendation = "Cancel quality workout. Easy aerobic or rest only.";
  } else if (percentOfBaseline < 70) {
    interpretations.recommendation = "Rest day mandatory. Consider medical evaluation if sustained.";
  }
  
  return interpretations;
}
```

### 1.4 Special Considerations and Edge Cases

```javascript
const HRVSpecialCases = {
  firstMorning: {
    situation: "HRV abnormally low on first measurement day",
    causes: ["Poor sleep", "Recent travel", "Alcohol", "Illness coming on", "High stress"],
    action: "Repeat measurement next 2 days before establishing baseline",
    note: "Single low measurement doesn't indicate chronic suppression"
  },
  
  abnormallyHigh: {
    situation: "HRV >150% of baseline for 3+ days",
    possibilities: [
      "Measurement error (check device/protocol)",
      "Overtraining paradox (parasympathetic overactivity)",
      "Detraining (fitness loss from extended rest)"
    ],
    validation: "Cross-check with performance metrics and resting HR",
    action: "If performance declining → overtraining concern",
    action2: "If performance stable/improving → likely measurement issue"
  },
  
  inconsistentMeasurements: {
    situation: "CV > 25% during baseline establishment",
    causes: [
      "Inconsistent measurement timing (before vs after standing)",
      "Inconsistent position (lying vs seated)",
      "Irregular sleep schedule",
      "Variable stress levels",
      "Measurement technique errors"
    ],
    action: "Review protocol adherence. Extend baseline period to 21-28 days.",
    note: "Some individuals naturally have higher HRV variability"
  },
  
  postIllness: {
    situation: "Returning from illness",
    protocol: "Wait 7 days post-symptom resolution before resuming training",
    hrvExpectation: "HRV should return to >90% baseline before quality work",
    action: "If HRV <90% baseline 10+ days post-illness → medical consultation"
  },
  
  women_menstrualCycle: {
    situation: "HRV fluctuates with menstrual cycle",
    pattern: [
      "Follicular phase (days 1-14): HRV typically higher, better for quality work",
      "Luteal phase (days 15-28): HRV typically lower, may need intensity adjustment",
      "Menstruation (days 1-5): HRV often lowest, easy week often beneficial"
    ],
    recommendation: "Track cycle phase alongside HRV for pattern recognition",
    individualVariation: "Patterns vary significantly between individuals"
  },
  
  ageConsiderations: {
    youngerAthletes: {
      age: "<25 years",
      baseline: "Typically 60-100 ms RMSSD",
      recovery: "Faster recovery, HRV normalizes within 24-36 hours"
    },
    matureAthletes: {
      age: "40+ years",
      baseline: "Typically 30-60 ms RMSSD",
      recovery: "Slower recovery, may need 48-72 hours for HRV normalization",
      note: "Lower absolute HRV is normal and expected with age"
    },
    interpretation: "Always compare to individual baseline, not population averages"
  }
};
```

---

## Part 2: Daily Wellness Questionnaire

### 2.1 Questionnaire Design and Scoring

```javascript
const DailyWellnessQuestionnaire = {
  version: "1.0",
  completionTime: "60-90 seconds",
  timing: "Morning, before training",
  
  questions: [
    {
      id: "sleep_quality",
      question: "How was your sleep quality last night?",
      scale: "1-10",
      anchors: {
        1: "Terrible - barely slept, constantly awake",
        3: "Poor - very disrupted, unrefreshing",
        5: "Okay - some interruptions, mediocre quality",
        7: "Good - minor interruptions, generally restful",
        10: "Excellent - deep, uninterrupted, very refreshing"
      },
      weight: 2.0,
      category: "recovery",
      interpretation: {
        critical: "Sleep is the #1 recovery factor",
        ranges: {
          "1-3": "Severely compromised recovery - quality workout unlikely",
          "4-6": "Suboptimal recovery - reduce intensity expectations",
          "7-8": "Good recovery - proceed as planned",
          "9-10": "Optimal recovery - excellent for quality work"
        }
      }
    },
    {
      id: "sleep_hours",
      question: "How many hours did you sleep?",
      type: "numeric",
      unit: "hours",
      weight: 1.5,
      category: "recovery",
      scoring: function(hours) {
        if (hours >= 8) return 10;
        if (hours >= 7) return 8;
        if (hours >= 6) return 6;
        if (hours >= 5) return 4;
        return 2;
      },
      interpretation: {
        optimal: ">= 8 hours",
        adequate: "7-8 hours",
        suboptimal: "6-7 hours",
        insufficient: "< 6 hours"
      }
    },
    {
      id: "muscle_soreness",
      question: "Rate your overall muscle soreness",
      scale: "1-10 (inverted)",
      anchors: {
        1: "Extremely sore - significantly affects movement",
        3: "Very sore - clearly affects running mechanics",
        5: "Moderate soreness - noticeable but manageable",
        7: "Light soreness - normal post-training feel",
        10: "Zero soreness - completely fresh"
      },
      weight: 1.5,
      category: "physical",
      interpretation: {
        ranges: {
          "1-3": "Severe DOMS - easy recovery only",
          "4-5": "Significant soreness - reduce intensity",
          "6-7": "Normal training soreness - proceed cautiously",
          "8-10": "Minimal soreness - ready for quality work"
        }
      }
    },
    {
      id: "energy_level",
      question: "How is your overall energy level right now?",
      scale: "1-10",
      anchors: {
        1: "Exhausted - can barely function",
        3: "Very low - struggle to do basic activities",
        5: "Below normal - somewhat lethargic",
        7: "Normal energy - ready for typical training",
        10: "Excellent energy - feel powerful and ready"
      },
      weight: 1.5,
      category: "readiness",
      interpretation: {
        critical: "Energy level strongly predicts workout performance",
        ranges: {
          "1-3": "Severe fatigue - rest day strongly recommended",
          "4-5": "Low energy - easy aerobic only",
          "6-7": "Moderate energy - quality work possible but monitor",
          "8-10": "High energy - optimal for challenging sessions"
        }
      }
    },
    {
      id: "mood_motivation",
      question: "How would you describe your mood and motivation?",
      scale: "1-10",
      anchors: {
        1: "Very low mood, zero motivation, irritable",
        3: "Poor mood, low motivation, reluctant to train",
        5: "Neutral mood, moderate motivation",
        7: "Good mood, motivated to train",
        10: "Excellent mood, highly motivated and excited"
      },
      weight: 1.0,
      category: "psychological",
      interpretation: {
        note: "Mood/motivation less predictive than physical markers but important",
        warning: "Persistent low scores (3+ days <5) may indicate overtraining or burnout",
        ranges: {
          "1-3": "Psychological fatigue - consider rest or very easy day",
          "4-5": "Low motivation - reduce session difficulty",
          "6-10": "Adequate psychological readiness"
        }
      }
    },
    {
      id: "stress_level",
      question: "What is your current stress level?",
      scale: "1-10 (inverted)",
      anchors: {
        1: "Extremely high stress - overwhelmed",
        3: "High stress - struggling to cope",
        5: "Moderate stress - manageable but present",
        7: "Low stress - feeling controlled and calm",
        10: "Very relaxed - minimal life stress"
      },
      weight: 1.0,
      category: "psychological",
      interpretation: {
        critical: "Life stress impacts recovery capacity independent of training",
        note: "High stress (scores 1-4) reduces training tolerance by 15-30%",
        ranges: {
          "1-3": "High stress - reduce training load significantly",
          "4-5": "Elevated stress - monitor recovery closely",
          "6-10": "Manageable stress levels"
        }
      }
    },
    {
      id: "injury_pain",
      question: "Any injury concerns or pain?",
      scale: "1-10 (inverted)",
      anchors: {
        1: "Significant pain - clearly abnormal and limiting",
        3: "Moderate pain - concerning, affects movement",
        5: "Minor discomfort - noticeable but not limiting",
        7: "Very slight - only during specific movements",
        10: "No pain - completely healthy"
      },
      weight: 3.0,
      category: "physical",
      interpretation: {
        critical: "Any score <8 requires detailed assessment",
        autoFlag: "Score <7 automatically flags for injury screening",
        ranges: {
          "1-4": "STOP - medical evaluation required before continuing",
          "5-6": "Significant concern - modify or skip training",
          "7-8": "Minor issue - proceed with caution and monitoring",
          "9-10": "No concerns"
        }
      }
    }
  ]
};

function calculateWellnessScore(responses) {
  // responses = {sleep_quality: 8, sleep_hours: 7.5, muscle_soreness: 7, ...}
  
  let weightedSum = 0;
  let totalWeight = 0;
  let categoryScores = {};
  let flags = [];
  
  DailyWellnessQuestionnaire.questions.forEach(q => {
    let score = responses[q.id];
    
    // Handle numeric inputs with scoring function
    if (q.type === "numeric" && q.scoring) {
      score = q.scoring(score);
    }
    
    // Check for critical flags
    if (q.id === "injury_pain" && score < 7) {
      flags.push({
        severity: score < 5 ? "RED" : "YELLOW",
        metric: "Injury/Pain",
        value: score,
        message: q.interpretation.ranges[getRangeKey(score)]
      });
    }
    
    if (q.id === "sleep_quality" && score < 4) {
      flags.push({
        severity: "YELLOW",
        metric: "Sleep Quality",
        value: score,
        message: "Severely compromised recovery"
      });
    }
    
    // Accumulate weighted score
    weightedSum += score * q.weight;
    totalWeight += q.weight;
    
    // Track category scores
    if (!categoryScores[q.category]) {
      categoryScores[q.category] = { sum: 0, weight: 0, count: 0 };
    }
    categoryScores[q.category].sum += score * q.weight;
    categoryScores[q.category].weight += q.weight;
    categoryScores[q.category].count++;
  });
  
  const overallScore = weightedSum / totalWeight;
  
  // Calculate category subscores
  const categoryResults = {};
  Object.keys(categoryScores).forEach(category => {
    categoryResults[category] = {
      score: categoryScores[category].sum / categoryScores[category].weight,
      weight: categoryScores[category].weight,
      questionCount: categoryScores[category].count
    };
  });
  
  // Determine overall assessment
  let assessment, readinessLevel, recommendation;
  
  if (overallScore >= 8.5) {
    assessment = "EXCELLENT";
    readinessLevel = "HIGH";
    recommendation = "Optimal readiness for quality training. Proceed with planned workout.";
  } else if (overallScore >= 7.5) {
    assessment = "GOOD";
    readinessLevel = "MODERATE_HIGH";
    recommendation = "Good readiness. Proceed as planned with normal monitoring.";
  } else if (overallScore >= 6.5) {
    assessment = "MODERATE";
    readinessLevel = "MODERATE";
    recommendation = "Acceptable readiness. Consider slight reduction in intensity or volume.";
  } else if (overallScore >= 5.5) {
    assessment = "FAIR";
    readinessLevel = "LOW_MODERATE";
    recommendation = "Suboptimal readiness. Reduce intensity 15-20% or convert to easy aerobic.";
  } else if (overallScore >= 4.5) {
    assessment = "POOR";
    readinessLevel = "LOW";
    recommendation = "Poor readiness. Easy aerobic only, no quality work.";
  } else {
    assessment = "VERY_POOR";
    readinessLevel = "VERY_LOW";
    recommendation = "Severe readiness deficit. Rest day strongly recommended.";
  }
  
  return {
    overallScore: Math.round(overallScore * 10) / 10,
    assessment: assessment,
    readinessLevel: readinessLevel,
    recommendation: recommendation,
    categoryScores: categoryResults,
    flags: flags,
    timestamp: new Date().toISOString()
  };
}

function getRangeKey(score) {
  if (score <= 3) return "1-3";
  if (score <= 5) return "4-5";
  if (score <= 7) return "6-7";
  return "8-10";
}
```

### 2.2 Historical Trend Analysis

```javascript
function analyzeWellnessTrends(last14Days) {
  // last14Days = [wellnessScore objects from last 14 days]
  
  if (last14Days.length < 7) {
    return {
      error: "INSUFFICIENT_DATA",
      message: "Need minimum 7 days of wellness data for trend analysis"
    };
  }
  
  const scores = last14Days.map(d => d.overallScore);
  const avg = scores.reduce((a, b) => a + b) / scores.length;
  
  // Calculate trend
  const n = scores.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  scores.forEach((score, index) => {
    sumX += index;
    sumY += score;
    sumXY += index * score;
    sumX2 += index * index;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const dailyChange = slope;
  
  // Calculate coefficient of variation
  const variance = scores.reduce((sum, val) => 
    sum + Math.pow(val - avg, 2), 0
  ) / scores.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avg) * 100;
  
  // Count low-score days
  const lowScoreDays = scores.filter(s => s < 6.0).length;
  const veryLowScoreDays = scores.filter(s => s < 5.0).length;
  
  // Determine trend assessment
  let trendAssessment, severity, message;
  
  if (dailyChange > 0.1 && avg > 7.0) {
    trendAssessment = "IMPROVING_STRONG";
    severity = "GREEN";
    message = "Wellness improving consistently. Training load well-tolerated.";
  } else if (dailyChange > 0.05) {
    trendAssessment = "IMPROVING_MODERATE";
    severity = "GREEN";
    message = "Wellness trending positively. Recovery adequate.";
  } else if (dailyChange > -0.05 && avg > 6.5) {
    trendAssessment = "STABLE_GOOD";
    severity = "GREEN";
    message = "Wellness stable at good levels. Continue current approach.";
  } else if (dailyChange > -0.05 && avg > 5.5) {
    trendAssessment = "STABLE_MODERATE";
    severity = "YELLOW";
    message = "Wellness stable but at moderate levels. Monitor closely.";
  } else if (dailyChange < -0.1) {
    trendAssessment = "DECLINING_SIGNIFICANT";
    severity = "RED";
    message = "Wellness declining significantly. Deload or rest period needed.";
  } else {
    trendAssessment = "DECLINING_MILD";
    severity = "YELLOW";
    message = "Wellness declining mildly. Consider load reduction.";
  }
  
  // Check for concerning patterns
  const concerns = [];
  
  if (lowScoreDays >= 4) {
    concerns.push({
      issue: "FREQUENT_LOW_SCORES",
      severity: "YELLOW",
      message: `${lowScoreDays} days with wellness <6.0 in last ${n} days`
    });
  }
  
  if (veryLowScoreDays >= 2) {
    concerns.push({
      issue: "VERY_LOW_SCORES",
      severity: "RED",
      message: `${veryLowScoreDays} days with wellness <5.0 - significant fatigue accumulation`
    });
  }
  
  if (cv > 20) {
    concerns.push({
      issue: "HIGH_VARIABILITY",
      severity: "YELLOW",
      message: "High day-to-day variability suggests unstable recovery patterns"
    });
  }
  
  // Check for specific category trends
  const categoryTrends = analyzeCategoryTrends(last14Days);
  
  return {
    period: `${n} days`,
    averageScore: Math.round(avg * 10) / 10,
    trend: {
      assessment: trendAssessment,
      severity: severity,
      message: message,
      dailyChange: Math.round(dailyChange * 100) / 100
    },
    variability: {
      stdDev: Math.round(stdDev * 10) / 10,
      cv: Math.round(cv * 10) / 10,
      assessment: cv < 10 ? "Low - consistent" : cv < 20 ? "Moderate" : "High - unstable"
    },
    lowScoreDays: {
      below6: lowScoreDays,
      below5: veryLowScoreDays,
      percentage: Math.round((lowScoreDays / n) * 100)
    },
    concerns: concerns,
    categoryTrends: categoryTrends,
    recommendation: generateTrendRecommendation(trendAssessment, concerns, avg)
  };
}

function analyzeCategoryTrends(last14Days) {
  const categories = ["recovery", "physical", "psychological", "readiness"];
  const trends = {};
  
  categories.forEach(category => {
    const categoryScores = last14Days
      .map(d => d.categoryScores[category]?.score)
      .filter(s => s !== undefined);
    
    if (categoryScores.length >= 7) {
      const avg = categoryScores.reduce((a, b) => a + b) / categoryScores.length;
      
      // Simple trend
      const recentAvg = categoryScores.slice(-3).reduce((a, b) => a + b) / 3;
      const earlyAvg = categoryScores.slice(0, 3).reduce((a, b) => a + b) / 3;
      const change = recentAvg - earlyAvg;
      
      trends[category] = {
        average: Math.round(avg * 10) / 10,
        recentAverage: Math.round(recentAvg * 10) / 10,
        trend: change > 0.5 ? "Improving" : change < -0.5 ? "Declining" : "Stable",
        change: Math.round(change * 10) / 10
      };
    }
  });
  
  return trends;
}

function generateTrendRecommendation(trendAssessment, concerns, averageScore) {
  if (concerns.find(c => c.issue === "VERY_LOW_SCORES")) {
    return {
      priority: "HIGH",
      action: "IMMEDIATE_DELOAD",
      message: "Multiple days of very poor wellness. Implement 5-7 day reduced load period immediately.",
      specifics: [
        "Cancel all quality workouts",
        "Convert to easy aerobic at 60-70% max HR",
        "Prioritize sleep (8+ hours)",
        "Consider complete rest days if wellness <4.5"
      ]
    };
  }
  
  if (trendAssessment === "DECLINING_SIGNIFICANT") {
    return {
      priority: "HIGH",
      action: "DELOAD_REQUIRED",
      message: "Wellness declining significantly over past week. Deload needed.",
      specifics: [
        "Reduce training volume 40-50% for 3-5 days",
        "Reduce intensity - no sessions above threshold",
        "Focus on recovery: sleep, nutrition, stress management"
      ]
    };
  }
  
  if (trendAssessment === "DECLINING_MILD" || concerns.find(c => c.issue === "FREQUENT_LOW_SCORES")) {
    return {
      priority: "MODERATE",
      action: "REDUCE_LOAD",
      message: "Wellness showing signs of fatigue accumulation. Proactive reduction recommended.",
      specifics: [
        "Reduce training volume 20-30% this week",
        "Limit high-intensity work to 1-2 sessions",
        "Add extra easy day if possible"
      ]
    };
  }
  
  if (averageScore < 6.5 && trendAssessment === "STABLE_MODERATE") {
    return {
      priority: "MODERATE",
      action: "MAINTAIN_VIGILANCE",
      message: "Wellness stable but at moderate levels. Close monitoring needed.",
      specifics: [
        "Do not increase training load",
        "Skip quality workout if daily score <6.0",
        "Prioritize recovery practices"
      ]
    };
  }
  
  return {
    priority: "LOW",
    action: "CONTINUE",
    message: "Wellness trends positive. Continue current training approach.",
    specifics: []
  };
}
```

---

## Part 3: Resting Heart Rate (RHR) Monitoring

### 3.1 RHR Baseline and Daily Assessment

```javascript
const RHRMonitoringProtocol = {
  measurement: {
    timing: "Immediately upon waking, before standing or bathroom",
    position: "Lying supine, fully rested",
    duration: "5 minutes minimum (use middle 3 minutes)",
    device: "Any heart rate monitor or fitness tracker",
    frequency: "Daily"
  },
  
  baseline_establishment: {
    period: "14-21 days",
    calculation: "7-day rolling average",
    exclusions: [
      "Days after alcohol consumption",
      "Illness days",
      "Poor sleep (<5 hours)",
      "High stress events"
    ]
  },
  
  interpretation: {
    normal_variation: "±3 bpm day-to-day is normal",
    yellow_flag: "+3-5 bpm above baseline",
    red_flag: "+5-8 bpm above baseline",
    critical: "+8+ bpm above baseline"
  }
};

function establishRHRBaseline(dailyMeasurements) {
  // dailyMeasurements = [{date, rhr, quality}, ...]
  
  if (dailyMeasurements.length < 14) {
    return {
      error: "INSUFFICIENT_DATA",
      message: `Need ${14 - dailyMeasurements.length} more days`,
      daysRemaining: 14 - dailyMeasurements.length
    };
  }
  
  // Filter quality measurements
  const validMeasurements = dailyMeasurements.filter(m =>
    m.quality !== "poor" && m.rhr > 35 && m.rhr < 100
  );
  
  const rhrValues = validMeasurements.map(m => m.rhr);
  const mean = rhrValues.reduce((a, b) => a + b) / rhrValues.length;
  const variance = rhrValues.reduce((sum, val) => 
    sum + Math.pow(val - mean, 2), 0
  ) / rhrValues.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    baseline: Math.round(mean),
    stdDev: Math.round(stdDev * 10) / 10,
    range: {
      normal: {
        lower: Math.round(mean - stdDev),
        upper: Math.round(mean + stdDev)
      }
    },
    thresholds: {
      yellowFlag: Math.round(mean + 3),
      redFlag: Math.round(mean + 5),
      critical: Math.round(mean + 8)
    },
    measurementDays: validMeasurements.length
  };
}

function assessDailyRHR(todayRHR, baseline, recentHistory) {
  // recentHistory = last 7 days
  
  const deviation = todayRHR - baseline.baseline;
  const rollingAvg = [...recentHistory, todayRHR].reduce((a, b) => a + b) / (recentHistory.length + 1);
  const rollingDeviation = rollingAvg - baseline.baseline;
  
  let status, severity, message, action;
  
  if (deviation <= 3) {
    status = "NORMAL";
    severity = "GREEN";
    message = "RHR within normal range - good recovery";
    action = "PROCEED";
  } else if (deviation <= 5) {
    status = "SLIGHTLY_ELEVATED";
    severity = "YELLOW";
    message = "RHR slightly elevated - moderate fatigue or stress";
    action = "MODIFY_MODERATE";
  } else if (deviation <= 8) {
    status = "ELEVATED";
    severity = "YELLOW_RED";
    message = "RHR notably elevated - significant fatigue or possible illness";
    action = "MODIFY_SIGNIFICANT";
  } else {
    status = "SEVERELY_ELEVATED";
    severity = "RED";
    message = "RHR severely elevated - overreaching, illness, or high stress";
    action = "REST_REQUIRED";
  }
  
  // Check for concerning trends
  const consecutiveElevated = countConsecutiveElevated(recentHistory, baseline.baseline);
  
  if (consecutiveElevated >= 3) {
    return {
      status: "CHRONIC_ELEVATION",
      severity: "RED",
      message: `RHR elevated for ${consecutiveElevated} consecutive days - cumulative fatigue or illness`,
      action: "DELOAD_REQUIRED",
      todayValue: todayRHR,
      baseline: baseline.baseline,
      deviation: deviation,
      rollingAverage: Math.round(rollingAvg),
      rollingDeviation: Math.round(rollingDeviation),
      consecutiveElevated: consecutiveElevated
    };
  }
  
  return {
    status: status,
    severity: severity,
    message: message,
    action: action,
    todayValue: todayRHR,
    baseline: baseline.baseline,
    deviation: deviation,
    rollingAverage: Math.round(rollingAvg),
    rollingDeviation: Math.round(rollingDeviation),
    interpretation: generateRHRInterpretation(deviation, consecutiveElevated)
  };
}

function countConsecutiveElevated(recentHistory, baseline) {
  let count = 0;
  for (let i = recentHistory.length - 1; i >= 0; i--) {
    if (recentHistory[i] > baseline + 3) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function generateRHRInterpretation(deviation, consecutiveDays) {
  if (deviation <= 3 && consecutiveDays === 0) {
    return {
      physiological: "Normal cardiovascular recovery. Heart adapting well to training stress.",
      training: "Training load well-tolerated. Recovery adequate.",
      recommendation: "Proceed with planned training."
    };
  }
  
  if (deviation > 3 && deviation <= 5 && consecutiveDays < 2) {
    return {
      physiological: "Mild sympathetic activation. Body managing but not fully recovered.",
      training: "Training stress slightly elevated. Close to recovery threshold.",
      recommendation: "Proceed with caution. Reduce intensity 10% if wellness also compromised."
    };
  }
  
  if (deviation > 5 && deviation <= 8) {
    return {
      physiological: "Significant sympathetic dominance. Incomplete recovery or illness brewing.",
      training: "Training load exceeding recovery capacity. Adaptation compromised.",
      recommendation: "Cancel quality workout. Easy aerobic only or rest."
    };
  }
  
  if (deviation > 8 || consecutiveDays >= 3) {
    return {
      physiological: "Severe stress response. Possible overreaching, illness, or infection.",
      training: "Critical fatigue state. Continued training risks injury or illness.",
      recommendation: "Mandatory rest. If sustained 48+ hours, seek medical evaluation."
    };
  }
  
  return {
    physiological: "Elevated sympathetic activity.",
    training: "Training stress present.",
    recommendation: "Monitor closely and adjust as needed."
  };
}
```

### 3.2 RHR Special Considerations

```javascript
const RHRSpecialConsiderations = {
  cardiovascularDrift: {
    situation: "RHR gradually decreasing over training cycle",
    cause: "Training adaptation - improved cardiovascular efficiency",
    action: "Positive sign - update baseline every 4-6 weeks",
    typical: "Well-trained athletes see 5-10 bpm decrease over 12-16 weeks",
    note: "This is GOOD adaptation, not concerning"
  },
  
  trainingCampOrAltitude: {
    situation: "Elevated RHR during training camp or altitude",
    expected: "+5-10 bpm for first 7-14 days",
    interpretation: "Normal stress response to increased load or hypoxia",
    action: "Monitor trend - should stabilize after 2 weeks",
    concern: "If RHR continues rising beyond 14 days → overreaching"
  },
  
  heatAcclimation: {
    situation: "Training in hot environment",
    expected: "+3-7 bpm during first week",
    duration: "Normalizes within 7-14 days",
    action: "Reduce intensity 10-15% during acclimatization period"
  },
  
  illness: {
    early: "RHR often elevated 24-48 hours BEFORE symptoms appear",
    utility: "Can catch illness early and reduce training to prevent worsening",
    protocol: "If RHR +8 bpm with no training explanation → rest 48 hours preventively",
    recovery: "RHR should return to baseline within 7 days post-symptoms"
  },
  
  dehydration: {
    effect: "Can elevate RHR 5-10 bpm",
    cofactor: "Often occurs with hard training or heat",
    action: "Ensure proper hydration - drink to clear/pale urine",
    validation: "If RHR elevated but normalizes post-hydration → not training fatigue"
  },
  
  alcohol: {
    effect: "Elevates RHR 5-15 bpm for 24-48 hours",
    recommendation: "Exclude day-after-alcohol measurements from baseline calculations",
    trainingImpact: "Compromises recovery even if RHR normalized"
  },
  
  medications: {
    betaBlockers: "Artificially lower RHR - cannot use for monitoring",
    stimulants: "Elevate RHR - may mask fatigue signals",
    thyroidMeds: "Affect baseline - establish new baseline if dosage changes",
    recommendation: "Document all medications affecting cardiovascular function"
  }
};
```

---

## Part 4: Comprehensive Readiness Assessment Algorithm

### 4.1 Multi-Factor Integration

```javascript
function comprehensiveReadinessAssessment(monitoringData) {
  /*
  monitoringData = {
    hrv: {value: 45, baseline: 52, percentOfBaseline: 86.5, trend: {...}},
    rhr: {value: 52, baseline: 47, deviation: 5, ...},
    wellness: {overallScore: 6.8, assessment: "MODERATE", categoryScores: {...}},
    acwr: 1.15,
    recentWorkouts: [{...}, {...}], // Last 3-7 days
    sleepHours: 6.5,
    subjectiveReadiness: 6 // Optional quick single question
  }
  */
  
  // Initialize scoring system
  const factors = {
    hrv: { score: 0, weight: 3.0, status: "" },
    rhr: { score: 0, weight: 2.0, status: "" },
    wellness: { score: 0, weight: 2.5, status: "" },
    acwr: { score: 0, weight: 2.0, status: "" },
    sleep: { score: 0, weight: 1.5, status: "" }
  };
  
  // Score HRV (0-10 scale)
  if (monitoringData.hrv.percentOfBaseline >= 95) {
    factors.hrv.score = 10;
    factors.hrv.status = "EXCELLENT";
  } else if (monitoringData.hrv.percentOfBaseline >= 90) {
    factors.hrv.score = 8;
    factors.hrv.status = "GOOD";
  } else if (monitoringData.hrv.percentOfBaseline >= 85) {
    factors.hrv.score = 6;
    factors.hrv.status = "MODERATE";
  } else if (monitoringData.hrv.percentOfBaseline >= 80) {
    factors.hrv.score = 4;
    factors.hrv.status = "FAIR";
  } else if (monitoringData.hrv.percentOfBaseline >= 75) {
    factors.hrv.score = 2;
    factors.hrv.status = "POOR";
  } else {
    factors.hrv.score = 0;
    factors.hrv.status = "VERY_POOR";
  }
  
  // Adjust HRV score based on trend
  if (monitoringData.hrv.trend.consecutiveDeclines >= 3) {
    factors.hrv.score = Math.max(0, factors.hrv.score - 2);
    factors.hrv.status += " (declining trend)";
  }
  
  // Score RHR (0-10 scale)
  if (monitoringData.rhr.deviation <= 2) {
    factors.rhr.score = 10;
    factors.rhr.status = "EXCELLENT";
  } else if (monitoringData.rhr.deviation <= 3) {
    factors.rhr.score = 8;
    factors.rhr.status = "GOOD";
  } else if (monitoringData.rhr.deviation <= 5) {
    factors.rhr.score = 6;
    factors.rhr.status = "MODERATE";
  } else if (monitoringData.rhr.deviation <= 7) {
    factors.rhr.score = 4;
    factors.rhr.status = "FAIR";
  } else if (monitoringData.rhr.deviation <= 10) {
    factors.rhr.score = 2;
    factors.rhr.status = "POOR";
  } else {
    factors.rhr.score = 0;
    factors.rhr.status = "VERY_POOR";
  }
  
  // Score Wellness (0-10 scale, already on 10-point scale)
  factors.wellness.score = monitoringData.wellness.overallScore;
  factors.wellness.status = monitoringData.wellness.assessment;
  
  // Score ACWR (0-10 scale)
  if (monitoringData.acwr < 0.8) {
    factors.acwr.score = 6; // Too little load = detraining
    factors.acwr.status = "LOW (detraining risk)";
  } else if (monitoringData.acwr <= 1.0) {
    factors.acwr.score = 10;
    factors.acwr.status = "OPTIMAL";
  } else if (monitoringData.acwr <= 1.2) {
    factors.acwr.score = 8;
    factors.acwr.status = "MODERATE";
  } else if (monitoringData.acwr <= 1.3) {
    factors.acwr.score = 5;
    factors.acwr.status = "CAUTION";
  } else if (monitoringData.acwr <= 1.5) {
    factors.acwr.score = 2;
    factors.acwr.status = "HIGH_RISK";
  } else {
    factors.acwr.score = 0;
    factors.acwr.status = "CRITICAL_RISK";
  }
  
  // Score Sleep (0-10 scale)
  if (monitoringData.sleepHours >= 8.5) {
    factors.sleep.score = 10;
    factors.sleep.status = "EXCELLENT";
  } else if (monitoringData.sleepHours >= 7.5) {
    factors.sleep.score = 8;
    factors.sleep.status = "GOOD";
  } else if (monitoringData.sleepHours >= 6.5) {
    factors.sleep.score = 6;
    factors.sleep.status = "ADEQUATE";
  } else if (monitoringData.sleepHours >= 5.5) {
    factors.sleep.score = 4;
    factors.sleep.status = "INSUFFICIENT";
  } else {
    factors.sleep.score = 2;
    factors.sleep.status = "POOR";
  }
  
  // Calculate weighted composite score
  let weightedSum = 0;
  let totalWeight = 0;
  
  Object.keys(factors).forEach(key => {
    weightedSum += factors[key].score * factors[key].weight;
    totalWeight += factors[key].weight;
  });
  
  const compositeScore = weightedSum / totalWeight;
  
  // Identify critical red flags (any factor scoring ≤2)
  const redFlags = [];
  Object.keys(factors).forEach(key => {
    if (factors[key].score <= 2) {
      redFlags.push({
        factor: key,
        status: factors[key].status,
        severity: "RED"
      });
    }
  });
  
  // Identify yellow flags (any factor scoring 3-5)
  const yellowFlags = [];
  Object.keys(factors).forEach(key => {
    if (factors[key].score > 2 && factors[key].score <= 5) {
      yellowFlags.push({
        factor: key,
        status: factors[key].status,
        severity: "YELLOW"
      });
    }
  });
  
  // Determine overall readiness
  let overallReadiness, readinessLevel, recommendation;
  
  // Critical override: 2+ red flags = mandatory rest
  if (redFlags.length >= 2) {
    overallReadiness = "CRITICAL";
    readinessLevel = "VERY_LOW";
    recommendation = {
      action: "REST_MANDATORY",
      message: "Multiple critical factors compromised. Rest day mandatory.",
      workoutModification: "CANCEL_ALL_TRAINING",
      specifics: [
        "Complete rest or very light activity only (<60% max HR)",
        "Prioritize sleep, nutrition, stress management",
        "Reassess tomorrow - continue rest if not improved"
      ]
    };
  }
  // Single red flag = significant modification needed
  else if (redFlags.length === 1) {
    overallReadiness = "POOR";
    readinessLevel = "LOW";
    recommendation = {
      action: "SIGNIFICANT_MODIFICATION",
      message: `Critical issue in ${redFlags[0].factor}. Major workout modification required.`,
      workoutModification: "CANCEL_QUALITY_WORK",
      specifics: [
        "Cancel all quality/intensity work",
        "Easy aerobic only at 60-70% max HR for 30-45 minutes",
        "OR complete rest if feeling very poor",
        "Address specific factor: " + getFactorAdvice(redFlags[0].factor)
      ]
    };
  }
  // Multiple yellow flags = moderate modification
  else if (yellowFlags.length >= 3) {
    overallReadiness = "SUBOPTIMAL";
    readinessLevel = "MODERATE_LOW";
    recommendation = {
      action: "MODERATE_MODIFICATION",
      message: "Multiple factors showing fatigue. Reduce training load.",
      workoutModification: "REDUCE_INTENSITY_VOLUME",
      specifics: [
        "Reduce planned intensity by 15-20%",
        "Reduce volume by 20-30%",
        "Convert threshold work to tempo (92-95% LT2)",
        "Extend recovery between intervals"
      ]
    };
  }
  // Composite score drives recommendation
  else if (compositeScore >= 8.5) {
    overallReadiness = "EXCELLENT";
    readinessLevel = "HIGH";
    recommendation = {
      action: "PROCEED_FULL",
      message: "Excellent readiness. Optimal day for quality training.",
      workoutModification: "NONE",
      specifics: ["Execute workout as planned", "Good day for hard efforts"]
    };
  } else if (compositeScore >= 7.5) {
    overallReadiness = "GOOD";
    readinessLevel = "MODERATE_HIGH";
    recommendation = {
      action: "PROCEED_NORMAL",
      message: "Good readiness. Proceed with planned training.",
      workoutModification: "NONE",
      specifics: ["Execute workout as planned"]
    };
  } else if (compositeScore >= 6.5) {
    overallReadiness = "MODERATE";
    readinessLevel = "MODERATE";
    recommendation = {
      action: "PROCEED_CAUTIOUSLY",
      message: "Moderate readiness. Consider slight reduction.",
      workoutModification: "MINOR_REDUCTION",
      specifics: [
        "Reduce intensity 5-10% OR reduce volume 10-15%",
        "Start workout, abort if feel doesn't improve by 15 minutes",
        "Prioritize recovery post-session"
      ]
    };
  } else {
    overallReadiness = "FAIR";
    readinessLevel = "LOW_MODERATE";
    recommendation = {
      action: "REDUCE_SIGNIFICANTLY",
      message: "Fair readiness. Significant modification recommended.",
      workoutModification: "REDUCE_INTENSITY_VOLUME",
      specifics: [
        "Reduce intensity 15-20%",
        "Reduce volume 20-30%",
        "Consider converting quality to easy aerobic",
        "Prioritize recovery - this is a fatigue signal"
      ]
    };
  }
  
  return {
    compositeScore: Math.round(compositeScore * 10) / 10,
    overallReadiness: overallReadiness,
    readinessLevel: readinessLevel,
    recommendation: recommendation,
    factorScores: factors,
    redFlags: redFlags,
    yellowFlags: yellowFlags,
    timestamp: new Date().toISOString(),
    interpretation: generateCompositeInterpretation(compositeScore, factors, redFlags, yellowFlags)
  };
}

function getFactorAdvice(factor) {
  const advice = {
    hrv: "Focus on sleep quality and stress management. Consider 2-3 easy days.",
    rhr: "Possible illness brewing or severe fatigue. Monitor temperature and symptoms.",
    wellness: "Multiple wellness factors compromised. Review sleep, nutrition, life stress.",
    acwr: "Training load spike detected. Immediate deload required for injury prevention.",
    sleep: "Prioritize 8+ hours sleep tonight. Consider earlier bedtime and sleep hygiene."
  };
  return advice[factor] || "Address this specific factor";
}

function generateCompositeInterpretation(score, factors, redFlags, yellowFlags) {
  let interpretation = {
    summary: "",
    keyFactors: [],
    physiology: "",
    trainingImpact: ""
  };
  
  // Generate summary
  if (score >= 8.5) {
    interpretation.summary = "All systems show excellent recovery. Optimal physiological state for high-quality training.";
  } else if (score >= 7.5) {
    interpretation.summary = "Good recovery across most factors. Ready for normal training load.";
  } else if (score >= 6.5) {
    interpretation.summary = "Moderate recovery with some compromised factors. Training possible but consider modifications.";
  } else if (score >= 5.5) {
    interpretation.summary = "Suboptimal recovery. Multiple factors showing fatigue accumulation.";
  } else {
    interpretation.summary = "Poor recovery state. Significant physiological stress present.";
  }
  
  // Identify key limiting factors
  const sortedFactors = Object.entries(factors)
    .sort((a, b) => (a[1].score * a[1].weight) - (b[1].score * b[1].weight))
    .slice(0, 2);
  
  interpretation.keyFactors = sortedFactors.map(([name, data]) => ({
    factor: name,
    score: data.score,
    status: data.status,
    impact: data.score <= 5 ? "Limiting" : "Contributing"
  }));
  
  // Physiological interpretation
  if (factors.hrv.score <= 5 && factors.rhr.score <= 5) {
    interpretation.physiology = "High sympathetic nervous system activity with suppressed parasympathetic tone. Body in stress state with inadequate recovery.";
  } else if (factors.hrv.score <= 5) {
    interpretation.physiology = "Reduced parasympathetic activity indicates incomplete autonomic recovery. Central nervous system fatigue present.";
  } else if (factors.rhr.score <= 5) {
    interpretation.physiology = "Elevated cardiovascular stress response. Possible illness, dehydration, or overreaching.";
  } else {
    interpretation.physiology = "Autonomic and cardiovascular systems functioning well within normal parameters.";
  }
  
  // Training impact
  if (redFlags.length >= 2) {
    interpretation.trainingImpact = "Capacity for training severely compromised. Risk of injury, illness, or overtraining if continued. Rest essential.";
  } else if (redFlags.length === 1 || yellowFlags.length >= 3) {
    interpretation.trainingImpact = "Training tolerance reduced. High-intensity work likely to accumulate more fatigue than adaptation. Easy work only.";
  } else if (score < 7.0) {
    interpretation.trainingImpact = "Reduced capacity for high-quality work. Training possible but effectiveness decreased. Modifications beneficial.";
  } else {
    interpretation.trainingImpact = "Full training capacity present. Body ready to respond positively to training stimulus.";
  }
  
  return interpretation;
}
```

---

## Part 5: Automatic Program Modification Logic

### 5.1 Workout Modification Decision Tree

```javascript
function generateWorkoutModification(readinessAssessment, plannedWorkout, methodology) {
  /*
  plannedWorkout = {
    type: "threshold" | "tempo" | "intervals" | "long_run" | "easy" | "recovery",
    duration: 60, // minutes
    intervals: {count: 4, duration: 10, intensity: "LT2", recovery: 3},
    targetPace: "4:15/km",
    targetHR: 165,
    volume: 15, // km
    importance: "HIGH" | "MODERATE" | "LOW"
  }
  
  methodology = "norwegian" | "polarized" | "canova" | "lydiard"
  */
  
  const action = readinessAssessment.recommendation.action;
  let modifiedWorkout = JSON.parse(JSON.stringify(plannedWorkout)); // Deep copy
  let modifications = [];
  let reasoning = "";
  
  // CRITICAL: Rest mandatory
  if (action === "REST_MANDATORY") {
    return {
      decision: "CANCEL",
      modifiedWorkout: {
        type: "rest",
        duration: 0,
        message: "Rest day mandatory due to critical fatigue markers"
      },
      modifications: ["Workout cancelled - rest required"],
      reasoning: readinessAssessment.recommendation.message,
      reschedule: {
        action: "POSTPONE",
        duration: "24-48 hours",
        condition: "Reassess readiness tomorrow. Resume when composite score >6.5"
      }
    };
  }
  
  // SIGNIFICANT MODIFICATION: Cancel quality, easy only
  if (action === "SIGNIFICANT_MODIFICATION" || action === "CANCEL_QUALITY_WORK") {
    if (plannedWorkout.type === "easy" || plannedWorkout.type === "recovery") {
      // Already easy - just reduce slightly
      modifiedWorkout.duration = Math.round(plannedWorkout.duration * 0.8);
      modifiedWorkout.targetPace = adjustPace(plannedWorkout.targetPace, 5); // 5 sec/km slower
      modifications.push(`Duration reduced to ${modifiedWorkout.duration} minutes`);
      modifications.push(`Pace slowed 5 sec/km`);
      reasoning = "Even easy run reduced due to poor readiness";
    } else {
      // Convert to easy aerobic
      modifiedWorkout = {
        type: "easy_modified",
        duration: 30,
        targetPace: "conversational (60-70% max HR)",
        targetHR: Math.round(plannedWorkout.targetHR * 0.65),
        volume: 5,
        message: "Quality workout cancelled - converted to short easy run"
      };
      modifications.push("Workout type changed from " + plannedWorkout.type + " to easy aerobic");
      modifications.push("Duration reduced to 30 minutes");
      modifications.push("Intensity reduced to 60-70% max HR");
      reasoning = readinessAssessment.recommendation.message;
    }
    
    return {
      decision: "MAJOR_MODIFICATION",
      modifiedWorkout: modifiedWorkout,
      modifications: modifications,
      reasoning: reasoning,
      reschedule: {
        action: "POSTPONE_QUALITY",
        duration: "48-72 hours",
        condition: "Resume quality work when readiness improves to MODERATE or better"
      }
    };
  }
  
  // MODERATE MODIFICATION: Reduce intensity and/or volume
  if (action === "REDUCE_INTENSITY_VOLUME" || action === "MODERATE_MODIFICATION") {
    if (plannedWorkout.type === "threshold" || plannedWorkout.type === "tempo") {
      // Norwegian double threshold requires special handling
      if (methodology === "norwegian" && plannedWorkout.type === "threshold") {
        return handleNorwegianThresholdModification(plannedWorkout, readinessAssessment);
      }
      
      // Standard threshold modification
      modifiedWorkout.duration = Math.round(plannedWorkout.duration * 0.75);
      modifiedWorkout.targetPace = adjustPace(plannedWorkout.targetPace, 10); // 10 sec/km slower (92-95% of original)
      
      if (plannedWorkout.intervals) {
        modifiedWorkout.intervals.count = Math.max(2, plannedWorkout.intervals.count - 1);
        modifiedWorkout.intervals.duration = Math.round(plannedWorkout.intervals.duration * 0.8);
      }
      
      modifications.push("Duration reduced 25%");
      modifications.push("Pace reduced to tempo range (92-95% LT2)");
      if (plannedWorkout.intervals) {
        modifications.push(`Intervals reduced from ${plannedWorkout.intervals.count} to ${modifiedWorkout.intervals.count}`);
      }
      
      reasoning = "Moderate fatigue detected. Reduced intensity and volume to prevent overreaching.";
      
    } else if (plannedWorkout.type === "intervals" || plannedWorkout.type === "vo2max") {
      // VO2max work most affected by fatigue
      modifiedWorkout.intervals.count = Math.max(2, Math.round(plannedWorkout.intervals.count * 0.7));
      modifiedWorkout.intervals.recovery = Math.round(plannedWorkout.intervals.recovery * 1.3); // 30% more recovery
      
      modifications.push(`Intervals reduced from ${plannedWorkout.intervals.count} to ${modifiedWorkout.intervals.count}`);
      modifications.push(`Recovery extended ${Math.round((0.3) * 100)}%`);
      
      reasoning = "High-intensity work requires excellent recovery. Reduced volume and extended recovery.";
      
    } else if (plannedWorkout.type === "long_run") {
      modifiedWorkout.duration = Math.round(plannedWorkout.duration * 0.8);
      modifiedWorkout.volume = Math.round(plannedWorkout.volume * 0.8);
      modifiedWorkout.targetPace = adjustPace(plannedWorkout.targetPace, 5);
      
      modifications.push("Duration reduced 20%");
      modifications.push("Pace slowed slightly");
      
      reasoning = "Long run duration reduced due to suboptimal recovery state.";
    }
    
    return {
      decision: "MODERATE_MODIFICATION",
      modifiedWorkout: modifiedWorkout,
      modifications: modifications,
      reasoning: reasoning,
      monitoring: "Start workout. If feel doesn't improve by 15 minutes, abort and convert to easy."
    };
  }
  
  // MINOR MODIFICATION: Slight adjustments
  if (action === "MINOR_REDUCTION" || action === "PROCEED_CAUTIOUSLY") {
    if (plannedWorkout.type !== "easy" && plannedWorkout.type !== "recovery") {
      // 10% volume reduction OR 5-10% intensity reduction
      const reductionChoice = readinessAssessment.factorScores.hrv.score < 7 
        ? "intensity" 
        : "volume";
      
      if (reductionChoice === "intensity") {
        modifiedWorkout.targetPace = adjustPace(plannedWorkout.targetPace, 5); // 5 sec/km slower
        modifications.push("Pace reduced 5 sec/km (~3% slower)");
      } else {
        modifiedWorkout.duration = Math.round(plannedWorkout.duration * 0.9);
        if (plannedWorkout.intervals) {
          modifiedWorkout.intervals.count = Math.max(2, plannedWorkout.intervals.count - 1);
        }
        modifications.push("Volume reduced 10%");
      }
      
      reasoning = "Slight fatigue present. Minor modification to reduce stress while maintaining training stimulus.";
    } else {
      // Easy day - maintain as is
      modifications.push("No modification needed for easy workout");
      reasoning = "Easy workout maintained at planned level. Monitor feel during session.";
    }
    
    return {
      decision: "MINOR_MODIFICATION",
      modifiedWorkout: modifiedWorkout,
      modifications: modifications,
      reasoning: reasoning,
      monitoring: "Proceed with workout. Monitor perceived effort closely."
    };
  }
  
  // PROCEED NORMAL or PROCEED FULL
  return {
    decision: "PROCEED_AS_PLANNED",
    modifiedWorkout: plannedWorkout,
    modifications: ["No modifications needed"],
    reasoning: "Excellent readiness. Execute workout as planned.",
    bonus: readinessAssessment.overallReadiness === "EXCELLENT" 
      ? "Optimal day for breakthrough workout. Consider pushing slightly if feel is excellent."
      : null
  };
}

function handleNorwegianThresholdModification(plannedWorkout, readinessAssessment) {
  // Norwegian method REQUIRES strict adherence to lactate control
  // Cannot simply "push through" on poor days - defeats the entire methodology
  
  const compositeScore = readinessAssessment.compositeScore;
  
  if (compositeScore < 6.5) {
    return {
      decision: "CANCEL_NORWEGIAN_SESSION",
      modifiedWorkout: {
        type: "easy",
        duration: 45,
        targetPace: "easy conversational",
        message: "Norwegian threshold cancelled - converted to Zone 1 easy run"
      },
      modifications: [
        "Double threshold session cancelled",
        "Converted to 45-minute easy run at <1.0 mmol/L"
      ],
      reasoning: "Norwegian methodology requires EXCELLENT recovery for threshold sessions. Lactate control impossible when fatigued. Session postponed.",
      reschedule: {
        action: "POSTPONE",
        duration: "48 hours minimum",
        condition: "Resume threshold only when composite score ≥7.5 AND morning HR within 3 bpm of baseline"
      },
      criticalNote: "DO NOT attempt double threshold on suboptimal days. This violates core Norwegian principle."
    };
  }
  
  if (compositeScore < 7.5) {
    return {
      decision: "REDUCE_NORWEGIAN_SESSION",
      modifiedWorkout: {
        type: "threshold_single",
        duration: Math.round(plannedWorkout.duration * 0.6),
        targetPace: plannedWorkout.targetPace,
        sessions: 1, // Single session instead of double
        message: "Double threshold converted to single session"
      },
      modifications: [
        "Second threshold session cancelled",
        "Morning session only, duration reduced 40%",
        "Maintain lactate control 2.0-3.0 mmol/L"
      ],
      reasoning: "Moderate readiness insufficient for double session. Single session maintains specificity with reduced stress.",
      monitoring: "CRITICAL: Monitor lactate. If rising above 3.0 mmol/L, abort immediately."
    };
  }
  
  // Composite score ≥7.5 - can proceed but with strict monitoring
  return {
    decision: "PROCEED_WITH_MONITORING",
    modifiedWorkout: plannedWorkout,
    modifications: ["Proceed as planned"],
    reasoning: "Good readiness for Norwegian threshold. Proceed with strict lactate monitoring.",
    criticalMonitoring: [
      "Morning HR must be within 3 bpm of baseline",
      "Lactate must stay 2.0-3.0 mmol/L throughout",
      "Abort if lactate climbs >3.2 mmol/L",
      "Minimum 4-6 hours recovery between AM/PM sessions"
    ],
    abortConditions: [
      "Lactate rising interval-to-interval",
      "Perceived effort increasing at same pace",
      "Heart rate drift >5 bpm during session",
      "Any unusual discomfort or pain"
    ]
  };
}

function adjustPace(paceString, secondsSlower) {
  // paceString format: "4:15/km"
  // Convert to total seconds, add secondsSlower, convert back
  
  const parts = paceString.split(/[:/]/);
  const minutes = parseInt(parts[0]);
  const seconds = parseInt(parts[1]);
  
  const totalSeconds = minutes * 60 + seconds + secondsSlower;
  const newMinutes = Math.floor(totalSeconds / 60);
  const newSeconds = totalSeconds % 60;
  
  return `${newMinutes}:${String(newSeconds).padStart(2, '0')}/km`;
}
```

### 5.2 Progressive Modification Framework

```javascript
function trackModificationHistory(athlete_id, last30Days) {
  // Analyze frequency and patterns of modifications
  // This helps identify chronic issues vs. temporary fatigue
  
  const modifications = last30Days.filter(day => 
    day.workoutModification && day.workoutModification.decision !== "PROCEED_AS_PLANNED"
  );
  
  const modificationRate = (modifications.length / last30Days.length) * 100;
  
  const severityCount = {
    CANCEL: modifications.filter(m => m.workoutModification.decision === "CANCEL").length,
    MAJOR: modifications.filter(m => m.workoutModification.decision === "MAJOR_MODIFICATION").length,
    MODERATE: modifications.filter(m => m.workoutModification.decision === "MODERATE_MODIFICATION").length,
    MINOR: modifications.filter(m => m.workoutModification.decision === "MINOR_MODIFICATION").length
  };
  
  // Identify concerning patterns
  const concerns = [];
  
  if (modificationRate > 40) {
    concerns.push({
      issue: "CHRONIC_HIGH_MODIFICATION_RATE",
      severity: "RED",
      message: `${modificationRate.toFixed(1)}% of workouts modified in last 30 days`,
      recommendation: "Training load chronically exceeds recovery capacity. Implement 1-2 week deload immediately, then reduce baseline weekly volume 15-20%."
    });
  }
  
  if (severityCount.CANCEL >= 5) {
    concerns.push({
      issue: "FREQUENT_CANCELLATIONS",
      severity: "RED",
      message: `${severityCount.CANCEL} workouts cancelled in last 30 days`,
      recommendation: "Excessive cancellations indicate systematic overreaching. Consult coach or reduce training phase intensity."
    });
  }
  
  // Check for consecutive modifications
  let consecutiveModifications = 0;
  let maxConsecutive = 0;
  last30Days.forEach(day => {
    if (day.workoutModification && day.workoutModification.decision !== "PROCEED_AS_PLANNED") {
      consecutiveModifications++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveModifications);
    } else {
      consecutiveModifications = 0;
    }
  });
  
  if (maxConsecutive >= 5) {
    concerns.push({
      issue: "SUSTAINED_FATIGUE",
      severity: "RED",
      message: `${maxConsecutive} consecutive days of modifications`,
      recommendation: "Sustained fatigue over ${maxConsecutive} days indicates insufficient recovery periods. Implement mandatory deload week."
    });
  }
  
  return {
    period: "30 days",
    totalDays: last30Days.length,
    modificationRate: Math.round(modificationRate * 10) / 10,
    severityBreakdown: severityCount,
    maxConsecutiveModifications: maxConsecutive,
    concerns: concerns,
    assessment: generateModificationAssessment(modificationRate, severityCount, maxConsecutive),
    recommendation: concerns.length > 0 
      ? "CRITICAL: Address chronic recovery issues before continuing training"
      : "Modification patterns acceptable. Continue current monitoring."
  };
}

function generateModificationAssessment(rate, severity, consecutive) {
  if (rate > 40 || severity.CANCEL >= 5 || consecutive >= 5) {
    return {
      status: "CRITICAL",
      message: "Chronic overreaching detected. Training program unsustainable at current load.",
      action: "IMMEDIATE_INTERVENTION_REQUIRED"
    };
  }
  
  if (rate > 25 || severity.CANCEL >= 3 || consecutive >= 4) {
    return {
      status: "CONCERNING",
      message: "High modification rate indicates training load slightly exceeds recovery capacity.",
      action: "REDUCE_BASELINE_LOAD"
    };
  }
  
  if (rate > 15 || severity.MAJOR + severity.MODERATE >= 8) {
    return {
      status: "MODERATE",
      message: "Moderate modification rate. Training load at upper limit of recovery capacity.",
      action: "MONITOR_CLOSELY"
    };
  }
  
  return {
    status: "ACCEPTABLE",
    message: "Modification rate within acceptable range. System working as designed.",
    action: "CONTINUE"
  };
}
```

---

## Part 6: Integration with Training Methodologies

### 6.1 Methodology-Specific Modification Rules

```javascript
const MethodologySpecificRules = {
  norwegian: {
    description: "Norwegian double threshold system",
    criticalRequirements: [
      "Morning RHR within 3 bpm of baseline",
      "HRV ≥90% of baseline",
      "Composite readiness score ≥7.5",
      "No consecutive days of suppressed recovery markers"
    ],
    
    thresholdSessionRules: {
      minimumReadiness: 7.5,
      cancelIf: [
        "RHR >+3 bpm baseline",
        "HRV <90% baseline",
        "Wellness score <7.0",
        "Any red flag present"
      ],
      modifyToSingle: {
        condition: "Composite score 7.0-7.5",
        modification: "Cancel PM session, reduce AM session duration 30-40%"
      },
      neverCompromise: "Lactate control is ABSOLUTE. Cannot 'push through' on poor days."
    },
    
    easyDayFlexibility: {
      rule: "Easy days (Zone 1, <1.0 mmol/L) can proceed even with moderate fatigue",
      exception: "Unless RHR >+8 bpm or HRV <75% baseline"
    },
    
    recoveryPriority: {
      between_double_sessions: "Minimum 4 hours, ideal 6+ hours",
      after_double_threshold: "48-72 hours before next threshold",
      total_threshold_per_week: "20-35km maximum (elite level)"
    }
  },
  
  polarized: {
    description: "80/20 intensity distribution",
    criticalRequirements: [
      "Easy days must stay truly easy (below LT1)",
      "Hard days quality over quantity",
      "Clear separation between easy and hard"
    ],
    
    easyDayRules: {
      alwaysProceed: "Easy days proceed regardless of readiness (therapeutic effect)",
      paceAdjustment: "Slow 5-15 sec/km if fatigue present",
      durationAdjustment: "Reduce 20-30% if severe fatigue (readiness <6.0)",
      heartRateMonitor: "Stay strictly under LT1 heart rate"
    },
    
    hardDayRules: {
      minimumReadiness: 7.0,
      cancelIf: [
        "Composite score <6.5",
        "Multiple yellow/red flags",
        "Consecutive hard days showing declining performance"
      ],
      spacing: "Minimum 48 hours between high-intensity sessions"
    },
    
    flexibilityPrinciple: "Move hard days to accommodate readiness. Never force intensity on poor days."
  },
  
  canova: {
    description: "Percentage-based race-specific training",
    criticalRequirements: [
      "Race pace specificity is paramount",
      "Special blocks require excellent recovery",
      "Specific phase sessions cannot be compromised"
    ],
    
    fundamentalPhase: {
      flexibility: "High - can modify significantly",
      paceAdjustment: "10-15 sec/km acceptable",
      volumeAdjustment: "20-30% reduction acceptable"
    },
    
    specialPhase: {
      flexibility: "Moderate",
      longIntervalSessions: "Require readiness ≥7.0",
      specialBlocks: "Require readiness ≥8.0 (must arrive rested)",
      modification: "Reduce reps rather than slow pace when possible"
    },
    
    specificPhase: {
      flexibility: "Low - precision critical",
      racePaceSessions: "Require readiness ≥7.5",
      paceDeviation: "Maximum ±2-3% from target",
      ifSuboptimal: "Postpone rather than execute poorly",
      timing: "Final 6-8 weeks - schedule flexibility crucial"
    },
    
    recoveryPriority: {
      after_special_block: "5-7 days reduced load mandatory",
      before_specific_session: "48-72 hours with no quality work"
    }
  },
  
  lydiard: {
    description: "Periodized base → hill → sharpening",
    criticalRequirements: [
      "Base phase volume completion essential",
      "Hill phase intensity can compromise if needed",
      "Sharpening phase requires peak readiness"
    ],
    
    basePhase: {
      flexibility: "Moderate-High",
      longRunPriority: "Long run is sacred - reduce pace but maintain duration if possible",
      weeklyVolume: "Can reduce 10-15% if needed",
      timeOnFeet: "Prioritize duration over pace"
    },
    
    hillPhase: {
      flexibility: "Moderate",
      hillRepetitions: "Quality over quantity - reduce reps if fatigued",
      aerodicCapacity: "Maintain but can reduce intensity slightly",
      readinessThreshold: 6.5
    },
    
    sharpeningPhase: {
      flexibility: "Low - precision important",
      trackWorkouts: "Require readiness ≥7.5",
      timeTrials: "Require readiness ≥8.0",
      taper: "Do not modify taper structure"
    }
  }
};
```

### 6.2 Integration Algorithm

```javascript
function integrateMonitoringWithMethodology(readinessAssessment, plannedWorkout, methodology, phase) {
  // Get methodology-specific rules
  const methodRules = MethodologySpecificRules[methodology];
  
  if (!methodRules) {
    // Fallback to general modification logic
    return generateWorkoutModification(readinessAssessment, plannedWorkout, methodology);
  }
  
  // Check methodology-specific critical requirements
  const meetsRequirements = checkMethodologyCriteria(
    readinessAssessment,
    methodRules,
    plannedWorkout.type,
    phase
  );
  
  if (!meetsRequirements.passed) {
    return {
      decision: "CANCEL_METHODOLOGY_VIOLATION",
      modifiedWorkout: {
        type: meetsRequirements.alternative.type,
        duration: meetsRequirements.alternative.duration,
        message: meetsRequirements.reason
      },
      modifications: meetsRequirements.modifications,
      reasoning: meetsRequirements.reasoning,
      methodologyNote: `${methodology.toUpperCase()}: ${meetsRequirements.methodologyGuidance}`
    };
  }
  
  // Proceed with standard modification logic, enhanced by methodology context
  const standardModification = generateWorkoutModification(
    readinessAssessment,
    plannedWorkout,
    methodology
  );
  
  // Add methodology-specific guidance
  standardModification.methodologyGuidance = generateMethodologyGuidance(
    methodology,
    phase,
    plannedWorkout.type,
    readinessAssessment
  );
  
  return standardModification;
}

function checkMethodologyCriteria(readiness, methodRules, workoutType, phase) {
  // Example: Norwegian threshold check
  if (methodRules.description.includes("Norwegian") && workoutType === "threshold") {
    const requirements = methodRules.thresholdSessionRules;
    
    // Check minimum readiness
    if (readiness.compositeScore < requirements.minimumReadiness) {
      return {
        passed: false,
        reason: "Composite readiness below Norwegian threshold minimum (7.5)",
        alternative: { type: "easy", duration: 45 },
        modifications: ["Threshold cancelled - readiness insufficient for lactate control"],
        reasoning: "Norwegian methodology requires excellent recovery for threshold work. Lactate control impossible when fatigued.",
        methodologyGuidance: "Never compromise threshold session quality. Better to postpone than execute poorly."
      };
    }
    
    // Check specific cancel conditions
    const rhrFlag = readiness.factorScores.rhr.deviation > 3;
    const hrvFlag = readiness.factorScores.hrv.percentOfBaseline < 90;
    
    if (rhrFlag || hrvFlag) {
      return {
        passed: false,
        reason: rhrFlag ? "RHR elevated >3 bpm" : "HRV <90% baseline",
        alternative: { type: "easy", duration: 45 },
        modifications: ["Norwegian threshold cancelled due to autonomic indicators"],
        reasoning: "Core Norwegian principles violated. Cannot proceed with threshold.",
        methodologyGuidance: "Marius Bakken: 'The magic is in the control, not the suffering.'"
      };
    }
    
    // Check if single session modification appropriate
    if (readiness.compositeScore >= 7.0 && readiness.compositeScore < 7.5) {
      return {
        passed: false,
        reason: "Moderate readiness - insufficient for double session",
        alternative: { type: "threshold_single", duration: 30 },
        modifications: ["Convert double to single threshold session", "Duration reduced 40%"],
        reasoning: "Borderline readiness. Single session maintains stimulus with reduced stress.",
        methodologyGuidance: "Quality over quantity - one good session beats two compromised sessions."
      };
    }
  }
  
  // Passed all checks
  return {
    passed: true
  };
}

function generateMethodologyGuidance(methodology, phase, workoutType, readiness) {
  const guidance = [];
  
  if (methodology === "norwegian") {
    guidance.push("Remember: Lactate control is everything. 2.0-3.0 mmol/L target.");
    if (readiness.compositeScore < 8.0) {
      guidance.push("Readiness moderate. Be especially vigilant for lactate creep.");
    }
  }
  
  if (methodology === "polarized") {
    if (workoutType === "easy") {
      guidance.push("Easy day: Stay strictly below LT1. Goal is recovery, not fitness.");
    } else {
      guidance.push("Hard day: Quality matters. If session feels off after 15min, stop.");
    }
  }
  
  if (methodology === "canova" && phase === "specific") {
    guidance.push("Specific phase: Pace precision critical. Race specificity cannot be compromised.");
    if (readiness.compositeScore < 7.5) {
      guidance.push("Consider postponing to ensure quality execution at correct pace.");
    }
  }
  
  if (methodology === "lydiard" && phase === "base" && workoutType === "long_run") {
    guidance.push("Base phase long run: Duration more important than pace. Slow down if needed.");
  }
  
  return guidance;
}
```

---

## Part 7: Data Collection and Measurement Protocols

### 7.1 Morning Measurement Routine

```javascript
const MorningMeasurementProtocol = {
  sequence: [
    {
      order: 1,
      action: "HRV Measurement",
      timing: "Immediately upon waking, before standing",
      duration: "3-5 minutes",
      position: "Lying supine (on back)",
      requirements: [
        "Chest strap HR monitor",
        "Validated HRV app",
        "Quiet environment",
        "Minimal movement"
      ],
      tips: [
        "Place phone/device within reach before sleep",
        "Start measurement without sitting up",
        "Breathe normally - no breathing exercises",
        "Stay still entire duration"
      ]
    },
    {
      order: 2,
      action: "Resting Heart Rate",
      timing: "During HRV measurement (auto-captured) OR 5 minutes after waking",
      duration: "5 minutes (use middle 3 minutes)",
      position: "Lying supine",
      note: "Most HRV apps also record RHR automatically"
    },
    {
      order: 3,
      action: "Subjective Assessment",
      timing: "After measurements, before standing",
      duration: "60-90 seconds",
      content: "Complete daily wellness questionnaire",
      note: "Rate how you feel RIGHT NOW, not how you expect to feel later"
    },
    {
      order: 4,
      action: "Optional: Morning Weight",
      timing: "After bathroom, before eating/drinking",
      purpose: "Track hydration status and trends",
      note: "5-7 day average more useful than daily fluctuations"
    }
  ],
  
  bestPractices: [
    "Complete ALL measurements before checking phone/email",
    "Establish consistent wake time (±30 minutes)",
    "Measure even on rest days",
    "Log ANY factors affecting sleep: alcohol, stress, late meal, poor sleep",
    "Review data AFTER completing measurements (not during)"
  ],
  
  commonMistakes: [
    "Sitting up before HRV measurement (elevates HR)",
    "Talking or moving during measurement",
    "Measuring after bathroom (sympathetic activation)",
    "Inconsistent timing (8am one day, 6am next day)",
    "Skipping measurements on weekends/rest days"
  ],
  
  totalTime: "10-15 minutes",
  frequency: "EVERY morning, 7 days per week"
};
```

### 7.2 Data Quality Standards

```javascript
function validateMeasurementQuality(measurement) {
  const qualityChecks = {
    hrv: [],
    rhr: [],
    wellness: []
  };
  
  // HRV quality checks
  if (measurement.hrv) {
    if (measurement.hrv.duration < 180) {
      qualityChecks.hrv.push({
        issue: "DURATION_TOO_SHORT",
        severity: "WARNING",
        message: "HRV measurement <3 minutes. Ideal is 5 minutes for accuracy."
      });
    }
    
    if (measurement.hrv.artifact_percentage > 5) {
      qualityChecks.hrv.push({
        issue: "HIGH_ARTIFACTS",
        severity: "ERROR",
        message: "Movement artifacts >5%. Remeasure while staying completely still."
      });
    }
    
    if (measurement.hrv.rmssd < 10 || measurement.hrv.rmssd > 200) {
      qualityChecks.hrv.push({
        issue: "UNLIKELY_VALUE",
        severity: "WARNING",
        message: "HRV value outside typical range. Verify device/strap connection."
      });
    }
  }
  
  // RHR quality checks
  if (measurement.rhr) {
    if (measurement.rhr.value < 35 || measurement.rhr.value > 100) {
      qualityChecks.rhr.push({
        issue: "UNLIKELY_VALUE",
        severity: "WARNING",
        message: "RHR outside typical athlete range. Verify measurement."
      });
    }
  }
  
  // Wellness quality checks
  if (measurement.wellness) {
    const responses = Object.values(measurement.wellness.responses);
    const allSame = responses.every(r => r === responses[0]);
    
    if (allSame) {
      qualityChecks.wellness.push({
        issue: "UNIFORM_RESPONSES",
        severity: "WARNING",
        message: "All wellness responses identical. Please answer thoughtfully."
      });
    }
    
    if (measurement.wellness.completionTime < 30) {
      qualityChecks.wellness.push({
        issue: "RUSHED",
        severity: "WARNING",
        message: "Wellness completed very quickly (<30 sec). Take time to assess honestly."
      });
    }
  }
  
  // Determine overall quality
  const errorCount = [].concat(
    qualityChecks.hrv,
    qualityChecks.rhr,
    qualityChecks.wellness
  ).filter(c => c.severity === "ERROR").length;
  
  const warningCount = [].concat(
    qualityChecks.hrv,
    qualityChecks.rhr,
    qualityChecks.wellness
  ).filter(c => c.severity === "WARNING").length;
  
  let overallQuality, recommendation;
  
  if (errorCount > 0) {
    overallQuality = "POOR";
    recommendation = "Data quality insufficient. Remeasure and ensure protocol adherence.";
  } else if (warningCount > 2) {
    overallQuality = "FAIR";
    recommendation = "Multiple data quality concerns. Use cautiously and address issues.";
  } else if (warningCount > 0) {
    overallQuality = "GOOD";
    recommendation = "Minor quality concerns but data usable.";
  } else {
    overallQuality = "EXCELLENT";
    recommendation = "High quality data. Proceed with confidence.";
  }
  
  return {
    overallQuality: overallQuality,
    recommendation: recommendation,
    checks: qualityChecks,
    timestamp: measurement.timestamp
  };
}
```

---

## Part 8: Warning Systems and Red Flags

### 8.1 Critical Warning Detection

```javascript
function detectCriticalWarnings(athleteData, historyDays) {
  // athleteData = current + last 14-30 days
  const warnings = [];
  
  // WARNING 1: Sustained HRV Suppression
  const hrvData = athleteData.filter(d => d.hrv).slice(-7);
  if (hrvData.length >= 5) {
    const allSuppressed = hrvData.every(d => 
      d.hrv.percentOfBaseline < 85
    );
    const avgSuppression = hrvData.reduce((sum, d) => 
      sum + d.hrv.percentOfBaseline, 0
    ) / hrvData.length;
    
    if (allSuppressed && avgSuppression < 80) {
      warnings.push({
        type: "SUSTAINED_HRV_SUPPRESSION",
        severity: "CRITICAL",
        message: "HRV suppressed <85% baseline for 7+ consecutive days",
        avgSuppression: Math.round(avgSuppression),
        action: "IMMEDIATE_DELOAD",
        details: [
          "High risk of overtraining syndrome",
          "Implement 7-10 day reduced load period",
          "All training at Zone 1 intensity only",
          "Consider medical evaluation if no improvement"
        ]
      });
    }
  }
  
  // WARNING 2: HRV Paradox (abnormally elevated with declining performance)
  const recentHRV = hrvData.slice(-3);
  const recentPerformance = athleteData.filter(d => 
    d.workout && d.workout.qualitySession
  ).slice(-3);
  
  if (recentHRV.length >= 3 && recentPerformance.length >= 2) {
    const avgHRV = recentHRV.reduce((sum, d) => sum + d.hrv.value, 0) / recentHRV.length;
    const baseline = recentHRV[0].hrv.baseline;
    const performanceDecline = recentPerformance.every((workout, i) => {
      if (i === 0) return true;
      return workout.performance < recentPerformance[i-1].performance;
    });
    
    if (avgHRV > baseline * 1.3 && performanceDecline) {
      warnings.push({
        type: "OVERTRAINING_PARADOX",
        severity: "CRITICAL",
        message: "HRV abnormally elevated while performance declining",
        hrvIncrease: Math.round(((avgHRV / baseline) - 1) * 100),
        action: "STOP_TRAINING",
        details: [
          "Classic overtraining paradox: parasympathetic overactivity",
          "This is NOT good recovery - this is dysfunction",
          "Mandatory 7-14 day complete rest",
          "Medical evaluation strongly recommended",
          "Resume only when HRV normalizes AND performance improves"
        ]
      });
    }
  }
  
  // WARNING 3: Chronic RHR Elevation
  const rhrData = athleteData.filter(d => d.rhr).slice(-7);
  if (rhrData.length >= 5) {
    const chronicallyElevated = rhrData.filter(d => 
      d.rhr.deviation > 5
    ).length >= 5;
    
    if (chronicallyElevated) {
      warnings.push({
        type: "CHRONIC_RHR_ELEVATION",
        severity: "CRITICAL",
        message: "RHR elevated >5 bpm for 5+ days",
        action: "MEDICAL_EVALUATION",
        details: [
          "Possible illness, infection, or overtraining",
          "Check temperature daily",
          "Monitor for other symptoms (sore throat, fatigue, etc)",
          "Rest until RHR returns to within 3 bpm of baseline",
          "If no improvement after 7 days, seek medical attention"
        ]
      });
    }
  }
  
  // WARNING 4: Performance Decline Despite Good Recovery Markers
  const performanceData = athleteData.filter(d => 
    d.workout && d.workout.benchmarkSession
  ).slice(-4);
  
  if (performanceData.length >= 3) {
    const declining = performanceData.every((session, i) => {
      if (i === 0) return true;
      return session.performance < performanceData[i-1].performance * 0.97; // >3% decline
    });
    
    const avgReadiness = performanceData.reduce((sum, d) => 
      sum + (d.readiness?.compositeScore || 7), 0
    ) / performanceData.length;
    
    if (declining && avgReadiness > 7.5) {
      warnings.push({
        type: "PERFORMANCE_DECLINE_PARADOX",
        severity: "HIGH",
        message: "Performance declining despite good recovery markers",
        action: "TRAINING_PROGRAM_REVIEW",
        details: [
          "Readiness markers good but performance dropping",
          "Possible causes: inadequate stimulus, poor periodization, or technical issues",
          "Review training program with coach",
          "Consider if training too easy or lacking specificity",
          "Evaluate technique and race-specific preparation"
        ]
      });
    }
  }
  
  // WARNING 5: Excessive Modification Rate
  const modificationData = athleteData.slice(-21); // 3 weeks
  const modificationRate = (modificationData.filter(d => 
    d.workoutModification && d.workoutModification.decision !== "PROCEED_AS_PLANNED"
  ).length / modificationData.length) * 100;
  
  if (modificationRate > 50) {
    warnings.push({
      type: "CHRONIC_OVERLOAD",
      severity: "HIGH",
      message: `${Math.round(modificationRate)}% of workouts modified in last 3 weeks`,
      action: "REDUCE_BASELINE_LOAD",
      details: [
        "Training program consistently exceeds recovery capacity",
        "Reduce weekly volume 20-30%",
        "Reduce quality session frequency",
        "Re-evaluate training phase goals",
        "May need to extend build phase duration"
      ]
    });
  }
  
  // WARNING 6: Injury Pain Signals
  const injuryReports = athleteData.filter(d => 
    d.wellness && d.wellness.responses.injury_pain < 8
  );
  
  if (injuryReports.length >= 3) {
    const mostRecent = injuryReports[injuryReports.length - 1];
    const severity = mostRecent.wellness.responses.injury_pain;
    
    warnings.push({
      type: "INJURY_CONCERN",
      severity: severity < 6 ? "CRITICAL" : "HIGH",
      message: `Pain/injury reported ${injuryReports.length} times recently`,
      painLevel: severity,
      action: severity < 6 ? "STOP_TRAINING" : "MODIFY_IMMEDIATELY",
      details: severity < 6 ? [
        "Pain level indicates significant injury risk",
        "STOP all running immediately",
        "Seek medical/physio evaluation",
        "Do not resume until cleared by professional"
      ] : [
        "Recurring pain signals developing injury",
        "Modify training to avoid pain-causing activities",
        "Add cross-training to maintain fitness",
        "Professional assessment recommended"
      ]
    });
  }
  
  return {
    warningCount: warnings.length,
    highestSeverity: warnings.length > 0 
      ? warnings.reduce((max, w) => 
          w.severity === "CRITICAL" ? "CRITICAL" : max === "CRITICAL" ? max : w.severity, 
          "HIGH"
        )
      : "NONE",
    warnings: warnings,
    urgentAction: warnings.some(w => w.severity === "CRITICAL"),
    summary: generateWarningSummary(warnings)
  };
}

function generateWarningSummary(warnings) {
  if (warnings.length === 0) {
    return {
      status: "ALL_CLEAR",
      message: "No critical warnings detected. Continue normal monitoring."
    };
  }
  
  const criticalWarnings = warnings.filter(w => w.severity === "CRITICAL");
  
  if (criticalWarnings.length > 0) {
    return {
      status: "CRITICAL_WARNINGS",
      message: `${criticalWarnings.length} critical warning(s) detected. Immediate action required.`,
      primaryConcern: criticalWarnings[0].type,
      primaryAction: criticalWarnings[0].action,
      urgency: "IMMEDIATE"
    };
  }
  
  return {
    status: "WARNINGS_PRESENT",
    message: `${warnings.length} warning(s) detected. Review and take corrective action.`,
    primaryConcern: warnings[0].type,
    primaryAction: warnings[0].action,
    urgency: "HIGH"
  };
}
```

---

## Implementation Checklist

### Phase 1: Core Monitoring (Week 1-2)
- [ ] Implement HRV baseline establishment
- [ ] Implement daily HRV assessment algorithm
- [ ] Implement RHR baseline establishment
- [ ] Implement daily RHR assessment
- [ ] Build wellness questionnaire UI
- [ ] Implement wellness scoring algorithm
- [ ] Create morning measurement workflow

### Phase 2: Readiness Assessment (Week 2-3)
- [ ] Build comprehensive readiness assessment
- [ ] Implement multi-factor integration algorithm
- [ ] Create readiness scoring system
- [ ] Build trend analysis functions
- [ ] Implement historical tracking

### Phase 3: Program Modification (Week 3-4)
- [ ] Implement workout modification decision tree
- [ ] Build methodology-specific rules
- [ ] Create Norwegian-specific handling
- [ ] Implement modification history tracking
- [ ] Build progressive modification framework

### Phase 4: Warning Systems (Week 4)
- [ ] Implement critical warning detection
- [ ] Build red flag identification
- [ ] Create alert system
- [ ] Implement intervention recommendations
- [ ] Build medical consultation triggers

### Phase 5: Testing & Validation (Week 5)
- [ ] Unit tests for all algorithms
- [ ] Integration testing with training engine
- [ ] Edge case testing
- [ ] User acceptance testing
- [ ] Documentation completion

---

## Critical Success Factors

1. **User Compliance**: System only works if athletes measure daily. UI must be frictionless (<2 minutes).

2. **Data Quality**: Garbage in = garbage out. Strict validation and education on proper measurement technique.

3. **Conservative Bias**: Better to be overcautious and prevent one injury than under-cautious and miss overtraining signals.

4. **Methodology Respect**: Each training methodology has specific requirements. System must enforce these, not compromise them.

5. **Medical Handoff**: System must know its limits. Clear triggers for "seek professional evaluation" rather than trying to handle everything algorithmically.

---

## Document Version

**Version**: 1.0  
**Date**: November 2025  
**Status**: Production-Ready for Implementation  
**Next Review**: Post-implementation (v1.1 enhancement planning)

---

**END OF DOCUMENT**
