/**
 * Elite Athlete Lactate Threshold Detection System
 *
 * Implements advanced algorithms for detecting LT1 and LT2 in elite endurance athletes
 * with "flat" lactate curves (Paula Radcliffe-type profiles).
 *
 * Based on research from:
 * - Log-Log (Beaver) Method
 * - Robust Baseline Plus Method
 * - Peter Thompson's Lactate Dynamics
 *
 * @module elite-threshold-detection
 */

export interface LactateDataPoint {
  intensity: number;  // km/h, watts, or pace
  lactate: number;    // mmol/L
  heartRate: number;  // bpm
}

export interface AthleteProfile {
  type: 'ELITE_FLAT' | 'STANDARD' | 'RECREATIONAL';
  baselineAvg: number;
  baselineSlope: number;
  maxLactate: number;
  lactateRange: number;
}

export interface ThresholdResult {
  intensity: number;
  lactate: number;
  heartRate: number;
  method: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  profileType: AthleteProfile['type'];
}

export interface EnsembleResult {
  lt1: ThresholdResult | null;
  lt2: ThresholdResult | null;
  profile: AthleteProfile;
  methods: {
    logLog: ThresholdResult | null;
    baselinePlus: ThresholdResult | null;
    dmax: ThresholdResult | null;
  };
}

/**
 * Pre-process lactate data to handle noise and artifacts
 *
 * Implements:
 * - "Startle" filter for elevated first reading
 * - Basic smoothing for analyzer noise
 */
export function preprocessData(data: LactateDataPoint[]): LactateDataPoint[] {
  if (data.length < 3) return data;

  const processed = [...data];

  // Startle Filter: If first reading is elevated due to nervousness
  // Rule: If Lac_Step1 > Lac_Step2 + 0.2, use Lac_Step2 for baseline
  if (processed[0].lactate > processed[1].lactate + 0.2) {
    console.log('[Elite Detection] Startle filter: First reading elevated, adjusting baseline');
    // Don't discard, but flag it
    processed[0] = { ...processed[0], lactate: processed[1].lactate };
  }

  return processed;
}

/**
 * Classify athlete profile based on lactate curve characteristics
 *
 * Elite_Flat: Baseline < 1.5 mmol/L AND flat slope (< 0.05 per km/h)
 * Standard: Baseline 1.5-2.5 mmol/L or moderate slope
 * Recreational: Higher baseline or steep initial slope
 */
export function classifyAthleteProfile(data: LactateDataPoint[]): AthleteProfile {
  if (data.length < 4) {
    return {
      type: 'STANDARD',
      baselineAvg: data[0]?.lactate || 1.5,
      baselineSlope: 0,
      maxLactate: Math.max(...data.map(d => d.lactate)),
      lactateRange: 0
    };
  }

  // Calculate baseline from first 40% of data (trimmed mean, excluding highest)
  const baselineCount = Math.max(2, Math.floor(data.length * 0.4));
  const baselineData = data.slice(0, baselineCount);
  const sortedBaseline = [...baselineData].sort((a, b) => a.lactate - b.lactate);

  // Trimmed mean: exclude the highest value
  const trimmedBaseline = sortedBaseline.slice(0, -1);
  const baselineAvg = trimmedBaseline.reduce((sum, d) => sum + d.lactate, 0) / trimmedBaseline.length;

  // Calculate slope in the baseline region (lactate change per intensity unit)
  const firstPoint = baselineData[0];
  const lastBaselinePoint = baselineData[baselineData.length - 1];
  const baselineSlope = (lastBaselinePoint.lactate - firstPoint.lactate) /
                        (lastBaselinePoint.intensity - firstPoint.intensity);

  const maxLactate = Math.max(...data.map(d => d.lactate));
  const lactateRange = maxLactate - baselineAvg;

  // Classification logic from the research document
  let type: AthleteProfile['type'];

  if (baselineAvg < 1.5 && Math.abs(baselineSlope) < 0.05) {
    type = 'ELITE_FLAT';
  } else if (baselineAvg < 2.5 && Math.abs(baselineSlope) < 0.15) {
    type = 'STANDARD';
  } else {
    type = 'RECREATIONAL';
  }

  console.log('[Elite Detection] Profile classified:', {
    type,
    baselineAvg: baselineAvg.toFixed(2),
    baselineSlope: baselineSlope.toFixed(4),
    maxLactate: maxLactate.toFixed(2),
    lactateRange: lactateRange.toFixed(2)
  });

  return { type, baselineAvg, baselineSlope, maxLactate, lactateRange };
}

/**
 * Log-Log Transformation Method (Beaver Method)
 *
 * Primary detector for elite athletes with flat curves.
 * Transforms data to logarithmic coordinates to detect the kinetic breakpoint.
 *
 * Algorithm:
 * 1. Transform to ln(x) and ln(y)
 * 2. Perform segmented linear regression
 * 3. Find breakpoint k that minimizes total SSE
 * 4. Validate: Slope_2 > 1.5 × Slope_1
 */
export function calculateLogLogThreshold(
  data: LactateDataPoint[]
): ThresholdResult | null {
  if (data.length < 5) {
    console.log('[Log-Log] Insufficient data points');
    return null;
  }

  // Filter out zero or negative values for log transformation
  const validData = data.filter(d => d.intensity > 0 && d.lactate > 0);
  if (validData.length < 5) return null;

  // Transform to log coordinates
  const logData = validData.map(d => ({
    x: Math.log(d.intensity),
    y: Math.log(d.lactate),
    original: d
  }));

  let bestBreakpoint = 2;
  let bestSSE = Infinity;
  let bestSlope1 = 0;
  let bestSlope2 = 0;

  // Try each possible breakpoint (need at least 2 points on each side)
  for (let k = 2; k < logData.length - 2; k++) {
    // Fit Line 1 (Baseline phase): points 0 to k
    const line1Data = logData.slice(0, k + 1);
    const line1 = linearRegression(line1Data.map(d => d.x), line1Data.map(d => d.y));

    // Fit Line 2 (Accumulation phase): points k to end
    const line2Data = logData.slice(k);
    const line2 = linearRegression(line2Data.map(d => d.x), line2Data.map(d => d.y));

    // Calculate total SSE
    let sse = 0;
    for (let i = 0; i <= k; i++) {
      const predicted = line1.slope * logData[i].x + line1.intercept;
      sse += Math.pow(logData[i].y - predicted, 2);
    }
    for (let i = k; i < logData.length; i++) {
      const predicted = line2.slope * logData[i].x + line2.intercept;
      sse += Math.pow(logData[i].y - predicted, 2);
    }

    if (sse < bestSSE) {
      bestSSE = sse;
      bestBreakpoint = k;
      bestSlope1 = line1.slope;
      bestSlope2 = line2.slope;
    }
  }

  // Validate: Slope of Line 2 must be significantly greater than Slope 1
  // For elite athletes, we use a lower threshold since the change can be subtle
  const slopeRatio = bestSlope2 / Math.max(0.01, Math.abs(bestSlope1));

  console.log('[Log-Log] Breakpoint analysis:', {
    breakpoint: bestBreakpoint,
    slope1: bestSlope1.toFixed(4),
    slope2: bestSlope2.toFixed(4),
    slopeRatio: slopeRatio.toFixed(2),
    sse: bestSSE.toFixed(4)
  });

  // For elite flat curves, even a small positive change is significant
  // Require slope2 > slope1 (any positive increase indicates the turn)
  if (bestSlope2 <= bestSlope1) {
    console.log('[Log-Log] No significant slope change detected');
    return null;
  }

  const breakpointData = logData[bestBreakpoint].original;

  // Determine confidence based on slope ratio
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  if (slopeRatio > 2.0) {
    confidence = 'HIGH';
  } else if (slopeRatio > 1.3) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  return {
    intensity: breakpointData.intensity,
    lactate: breakpointData.lactate,
    heartRate: breakpointData.heartRate,
    method: 'LOG_LOG',
    confidence,
    profileType: 'ELITE_FLAT'
  };
}

/**
 * Robust Baseline Plus Method
 *
 * Uses adaptive delta based on athlete profile.
 * Validates Log-Log results or serves as fallback.
 *
 * Delta values:
 * - Elite: +0.3 mmol/L
 * - Standard: +0.5 mmol/L
 * - Recreational: +1.0 mmol/L
 */
export function calculateBaselinePlusThreshold(
  data: LactateDataPoint[],
  profile: AthleteProfile
): ThresholdResult | null {
  if (data.length < 4) return null;

  // Calculate robust baseline (trimmed mean of first 40%, excluding highest)
  const baselineCount = Math.max(2, Math.floor(data.length * 0.4));
  const baselineData = data.slice(0, baselineCount);
  const sortedBaseline = [...baselineData].sort((a, b) => a.lactate - b.lactate);
  const trimmedBaseline = sortedBaseline.slice(0, -1);
  const baseline = trimmedBaseline.reduce((sum, d) => sum + d.lactate, 0) / trimmedBaseline.length;

  // Adaptive delta based on profile
  let delta: number;
  switch (profile.type) {
    case 'ELITE_FLAT':
      delta = 0.3;
      break;
    case 'STANDARD':
      delta = 0.5;
      break;
    case 'RECREATIONAL':
    default:
      delta = 1.0;
      break;
  }

  const threshold = baseline + delta;

  console.log('[Baseline Plus] Detection parameters:', {
    baseline: baseline.toFixed(2),
    delta,
    threshold: threshold.toFixed(2),
    profile: profile.type
  });

  // Scan from left to right
  // Trigger at first point where Lac_i > threshold AND Lac_{i+1} > threshold
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].lactate > threshold && data[i + 1].lactate > threshold) {
      // Found it! But we want the point just before the rise (more accurate LT1)
      const resultIndex = Math.max(0, i - 1);

      return {
        intensity: data[resultIndex].intensity,
        lactate: data[resultIndex].lactate,
        heartRate: data[resultIndex].heartRate,
        method: `BASELINE_PLUS_${delta}`,
        confidence: profile.type === 'ELITE_FLAT' ? 'MEDIUM' : 'HIGH',
        profileType: profile.type
      };
    }
  }

  // If threshold never crossed, return the point closest to baseline + delta
  let closestIndex = 0;
  let closestDiff = Infinity;

  for (let i = 0; i < data.length; i++) {
    const diff = Math.abs(data[i].lactate - threshold);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }

  return {
    intensity: data[closestIndex].intensity,
    lactate: data[closestIndex].lactate,
    heartRate: data[closestIndex].heartRate,
    method: `BASELINE_PLUS_${delta}_ESTIMATED`,
    confidence: 'LOW',
    profileType: profile.type
  };
}

/**
 * Simple linear regression helper
 */
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const meanY = sumY / n;
  const ssTot = y.reduce((total, yi) => total + Math.pow(yi - meanY, 2), 0);
  const ssRes = y.reduce((total, yi, i) => total + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const r2 = 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/**
 * Interpolate heart rate at a given intensity
 */
function interpolateHeartRate(data: LactateDataPoint[], targetIntensity: number): number {
  // Find surrounding points
  let below = data[0];
  let above = data[data.length - 1];

  for (let i = 0; i < data.length; i++) {
    if (data[i].intensity <= targetIntensity) {
      below = data[i];
    }
    if (data[i].intensity >= targetIntensity && above.intensity >= data[i].intensity) {
      above = data[i];
      break;
    }
  }

  if (below.intensity === above.intensity) return below.heartRate;

  const ratio = (targetIntensity - below.intensity) / (above.intensity - below.intensity);
  return below.heartRate + ratio * (above.heartRate - below.heartRate);
}

/**
 * Main Ensemble Detection Function
 *
 * Combines multiple methods and uses heuristic logic to select best result.
 *
 * For Elite_Flat profiles:
 * - Prioritize Log-Log result
 * - Validate against Baseline+0.3
 * - If divergence > ±1.5 units, fallback to conservative estimate
 */
export function detectEliteThresholds(data: LactateDataPoint[]): EnsembleResult {
  // Pre-process data
  const processedData = preprocessData(data);

  // Classify athlete profile
  const profile = classifyAthleteProfile(processedData);

  // Calculate thresholds using each method
  const logLogResult = calculateLogLogThreshold(processedData);
  const baselinePlusResult = calculateBaselinePlusThreshold(processedData, profile);

  console.log('[Ensemble] Method results:', {
    logLog: logLogResult ? `${logLogResult.intensity.toFixed(1)} @ ${logLogResult.lactate.toFixed(2)}` : 'null',
    baselinePlus: baselinePlusResult ? `${baselinePlusResult.intensity.toFixed(1)} @ ${baselinePlusResult.lactate.toFixed(2)}` : 'null'
  });

  // Heuristic selection based on profile
  let selectedLT1: ThresholdResult | null = null;

  if (profile.type === 'ELITE_FLAT') {
    // For elite athletes, prioritize Log-Log
    if (logLogResult && baselinePlusResult) {
      const divergence = Math.abs(logLogResult.intensity - baselinePlusResult.intensity);

      if (divergence <= 1.5) {
        // Methods agree - use Log-Log (more precise for elites)
        selectedLT1 = logLogResult;
        console.log('[Ensemble] Methods agree, using Log-Log result');
      } else {
        // Divergence - use more conservative (lower intensity) as LT1
        selectedLT1 = logLogResult.intensity < baselinePlusResult.intensity
          ? logLogResult
          : baselinePlusResult;
        selectedLT1.confidence = 'MEDIUM';
        console.log('[Ensemble] Methods diverge, using conservative estimate');
      }
    } else {
      selectedLT1 = logLogResult || baselinePlusResult;
    }
  } else {
    // For standard/recreational, baseline plus is reliable
    selectedLT1 = baselinePlusResult || logLogResult;
  }

  // LT2 detection using existing D-max (imported separately)
  // For now, return null and let the main calculation handle LT2

  return {
    lt1: selectedLT1,
    lt2: null, // Will be calculated by D-max in main flow
    profile,
    methods: {
      logLog: logLogResult,
      baselinePlus: baselinePlusResult,
      dmax: null
    }
  };
}

/**
 * Convert TestStage array to LactateDataPoint array
 */
export function convertToLactateData(stages: {
  speed?: number | null;
  power?: number | null;
  pace?: number | null;
  lactate: number;
  heartRate: number;
}[]): LactateDataPoint[] {
  return stages.map(stage => {
    let intensity = 0;
    if (stage.speed !== null && stage.speed !== undefined) {
      intensity = stage.speed;
    } else if (stage.power !== null && stage.power !== undefined) {
      intensity = stage.power;
    } else if (stage.pace !== null && stage.pace !== undefined) {
      intensity = stage.pace;
    }

    return {
      intensity,
      lactate: stage.lactate,
      heartRate: stage.heartRate
    };
  }).filter(d => d.intensity > 0);
}
