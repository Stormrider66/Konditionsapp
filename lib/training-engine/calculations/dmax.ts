/**
 * D-max and Mod-Dmax Lactate Threshold Detection
 *
 * D-max: Point of maximum perpendicular distance from baseline to fitted curve
 * Mod-Dmax: Modified D-max with constraints for physiological validity
 *
 * References:
 * - Cheng et al. (1992). A new approach for the determination of ventilatory and lactate thresholds
 * - Bishop et al. (1998). The validity of a repeated sprint ability test
 *
 * @module dmax
 */

import { fitPolynomial3, PolynomialCoefficients } from '../utils/polynomial-fit'
import { interpolateHeartRate } from '../utils/interpolation'

export interface LactateTestData {
  intensity: number[];    // km/h, watts, or m/s
  lactate: number[];      // mmol/L
  heartRate: number[];    // bpm
  unit: string;           // 'km/h', 'watt', 'm/s'
}

export interface DmaxResult {
  // Threshold values
  intensity: number;      // Speed/power at threshold
  lactate: number;        // Lactate at threshold
  heartRate: number;      // HR at threshold

  // Algorithm metadata
  method: 'DMAX' | 'MOD_DMAX' | 'FALLBACK';
  r2: number;             // Polynomial fit quality
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warning?: string;

  // Polynomial details (for debugging/visualization)
  coefficients: PolynomialCoefficients;
  dmaxDistance: number;   // Maximum perpendicular distance
}

/**
 * Calculate lactate threshold using D-max algorithm
 *
 * Algorithm:
 * 1. Fit 3rd degree polynomial to lactate curve
 * 2. Calculate baseline from first to last point
 * 3. Find point of maximum perpendicular distance from baseline
 * 4. Validate physiological constraints
 *
 * @param data - Lactate test data with ≥4 stages
 * @returns D-max threshold result
 * @throws Error if insufficient data or invalid curve
 */
export function calculateDmax(data: LactateTestData): DmaxResult {
  const { intensity, lactate, heartRate, unit } = data;

  // Validation
  if (intensity.length < 4) {
    throw new Error('D-max requires minimum 4 test stages');
  }

  if (intensity.length !== lactate.length || intensity.length !== heartRate.length) {
    throw new Error('All data arrays must have same length');
  }

  // Check if lactate is generally increasing
  const isMonotonic = checkMonotonicity(lactate);
  if (!isMonotonic) {
    console.warn('[D-max] Lactate curve is not monotonically increasing - results may be unreliable');
  }

  // Fit 3rd degree polynomial
  const regression = fitPolynomial3(intensity, lactate);
  const { coefficients, r2, predictions } = regression;

  // Check fit quality
  if (r2 < 0.90) {
    // Poor fit - fall back to traditional 4.0 mmol/L method
    return calculateFallbackThreshold(data, coefficients, r2);
  }

  // Calculate baseline (linear connection from first to last point)
  const x1 = intensity[0];
  const y1 = lactate[0];
  const x2 = intensity[intensity.length - 1];
  const y2 = lactate[lactate.length - 1];

  const baselineSlope = (y2 - y1) / (x2 - x1);
  const baselineIntercept = y1 - baselineSlope * x1;

  // Find point of maximum perpendicular distance
  const dmaxPoint = findMaxPerpendicularDistance(
    coefficients,
    baselineSlope,
    baselineIntercept,
    x1,
    x2
  );

  // Interpolate heart rate at D-max intensity
  const dmaxHR = interpolateHeartRate(intensity, heartRate, dmaxPoint.intensity);

  // Calculate confidence based on R² and curve shape
  const confidence = calculateConfidence(r2, dmaxPoint.distance, lactate);

  return {
    intensity: parseFloat(dmaxPoint.intensity.toFixed(2)),
    lactate: parseFloat(dmaxPoint.lactate.toFixed(2)),
    heartRate: Math.round(dmaxHR),
    method: 'DMAX',
    r2: parseFloat(r2.toFixed(4)),
    confidence,
    coefficients,
    dmaxDistance: parseFloat(dmaxPoint.distance.toFixed(4))
  };
}

/**
 * Find point of maximum perpendicular distance from baseline to curve
 *
 * For each point on the curve y = f(x):
 * - Calculate perpendicular distance to baseline y = mx + b
 * - Distance = |f(x) - (mx + b)| / sqrt(1 + m²)
 *
 * @param coeffs - Polynomial coefficients
 * @param m - Baseline slope
 * @param b - Baseline intercept
 * @param xMin - Minimum intensity
 * @param xMax - Maximum intensity
 * @returns Point with maximum distance
 */
function findMaxPerpendicularDistance(
  coeffs: PolynomialCoefficients,
  m: number,
  b: number,
  xMin: number,
  xMax: number
): { intensity: number; lactate: number; distance: number } {
  let maxDistance = 0;
  let maxPoint = { intensity: xMin, lactate: 0, distance: 0 };

  // Sample 1000 points along the curve
  const numSamples = 1000;
  const step = (xMax - xMin) / numSamples;

  for (let i = 0; i <= numSamples; i++) {
    const x = xMin + i * step;

    // Calculate y on polynomial curve
    const yCurve = coeffs.a * Math.pow(x, 3) +
                   coeffs.b * Math.pow(x, 2) +
                   coeffs.c * x +
                   coeffs.d;

    // Calculate y on baseline
    const yBaseline = m * x + b;

    // Perpendicular distance
    const distance = Math.abs(yCurve - yBaseline) / Math.sqrt(1 + m * m);

    if (distance > maxDistance) {
      maxDistance = distance;
      maxPoint = {
        intensity: x,
        lactate: yCurve,
        distance
      };
    }
  }

  return maxPoint;
}

/**
 * Fallback threshold calculation when polynomial fit is poor (R² < 0.90)
 * Uses traditional 4.0 mmol/L method with linear interpolation
 */
function calculateFallbackThreshold(
  data: LactateTestData,
  coefficients: PolynomialCoefficients,
  r2: number
): DmaxResult {
  const { intensity, lactate, heartRate } = data;

  // Find first crossing of 4.0 mmol/L
  let thresholdIntensity = intensity[intensity.length - 1];
  let thresholdLactate = 4.0;
  let thresholdHR = heartRate[heartRate.length - 1];

  for (let i = 1; i < lactate.length; i++) {
    if (lactate[i] >= 4.0 && lactate[i - 1] < 4.0) {
      // Linear interpolation
      const ratio = (4.0 - lactate[i - 1]) / (lactate[i] - lactate[i - 1]);
      thresholdIntensity = intensity[i - 1] + ratio * (intensity[i] - intensity[i - 1]);
      thresholdHR = heartRate[i - 1] + ratio * (heartRate[i] - heartRate[i - 1]);
      break;
    }
  }

  return {
    intensity: parseFloat(thresholdIntensity.toFixed(2)),
    lactate: 4.0,
    heartRate: Math.round(thresholdHR),
    method: 'FALLBACK',
    r2: parseFloat(r2.toFixed(4)),
    confidence: 'LOW',
    warning: `Poor polynomial fit (R²=${r2.toFixed(2)}). Using 4.0 mmol/L threshold instead.`,
    coefficients,
    dmaxDistance: 0
  };
}

/**
 * Calculate confidence level based on fit quality and threshold position
 *
 * HIGH:   R² ≥ 0.95 and threshold in physiological range (2-4 mmol/L)
 * MEDIUM: R² ≥ 0.90 or threshold slightly outside range
 * LOW:    R² < 0.90 or threshold far outside range
 */
function calculateConfidence(
  r2: number,
  distance: number,
  lactateValues: number[]
): 'HIGH' | 'MEDIUM' | 'LOW' {
  // Check R² quality
  if (r2 < 0.90) return 'LOW';

  // Check if distance is meaningful (not too small)
  const lactateRange = Math.max(...lactateValues) - Math.min(...lactateValues);
  const relativeDistance = distance / lactateRange;

  if (relativeDistance < 0.05) {
    return 'LOW'; // Threshold is too close to baseline - curve too linear
  }

  if (r2 >= 0.95 && relativeDistance >= 0.1) {
    return 'HIGH';
  }

  return 'MEDIUM';
}

/**
 * Check if lactate values are monotonically increasing
 * Allows for small decreases (<0.2 mmol/L) due to measurement error
 */
function checkMonotonicity(lactate: number[]): boolean {
  let violations = 0;

  for (let i = 1; i < lactate.length; i++) {
    const change = lactate[i] - lactate[i - 1];
    if (change < -0.2) {
      violations++;
    }
  }

  // Allow up to 1 violation
  return violations <= 1;
}

/**
 * Bishop Modified D-max algorithm (Bishop et al., 1998)
 *
 * Key difference from Standard D-max:
 * - Standard D-max connects FIRST point to LAST point (shallow baseline for flat curves)
 * - Modified D-max connects the point PRECEDING THE FIRST RISE to LAST point (steeper baseline)
 *
 * This is critical for elite athletes with "flat" lactate curves:
 * - Standard D-max finds the first turnpoint (often LT1)
 * - Modified D-max finds the second turnpoint (LT2/MLSS)
 *
 * Algorithm:
 * 1. Calculate robust baseline (trimmed mean of first 40% of points)
 * 2. Find first point where lactate rises ≥0.4 mmol/L above baseline
 * 3. Use the point BEFORE that rise (index j-1) as the modified start point
 * 4. Calculate D-max using line from modified start to end point
 *
 * @param data - Lactate test data
 * @returns Bishop Mod-Dmax threshold result
 */
export function calculateModDmax(data: LactateTestData): DmaxResult {
  const { intensity, lactate, heartRate, unit } = data;

  // Validation
  if (intensity.length < 4) {
    throw new Error('Modified D-max requires minimum 4 test stages');
  }

  // Step 1: Calculate robust baseline
  // Use trimmed mean of first 40% of data points (excluding highest outlier)
  const baselineCount = Math.max(2, Math.floor(lactate.length * 0.4));
  const baselineValues = lactate.slice(0, baselineCount);
  const sortedBaseline = [...baselineValues].sort((a, b) => a - b);
  // Exclude the highest value (trimmed mean)
  const trimmedBaseline = sortedBaseline.slice(0, -1);
  const baselineAvg = trimmedBaseline.reduce((sum, v) => sum + v, 0) / trimmedBaseline.length;

  console.log('[Bishop Mod-Dmax] Baseline calculation:', {
    baselineCount,
    baselineValues: baselineValues.map(v => v.toFixed(2)),
    trimmedBaseline: trimmedBaseline.map(v => v.toFixed(2)),
    baselineAvg: baselineAvg.toFixed(2)
  });

  // Step 2: Find first rise of 0.4 mmol/L above baseline
  const RISE_THRESHOLD = 0.4; // Bishop et al. criterion
  let firstRiseIndex = -1;

  for (let i = 0; i < lactate.length; i++) {
    if (lactate[i] >= baselineAvg + RISE_THRESHOLD) {
      firstRiseIndex = i;
      break;
    }
  }

  // Step 3: Determine modified start point
  // Use the point BEFORE the first rise (j-1), minimum index 0
  let modifiedStartIndex: number;

  if (firstRiseIndex === -1) {
    // No rise detected - curve is completely flat
    // This is extremely unusual; fall back to using the midpoint
    console.warn('[Bishop Mod-Dmax] No rise detected above baseline + 0.4. Using midpoint as start.');
    modifiedStartIndex = Math.floor(lactate.length / 2);
  } else if (firstRiseIndex === 0) {
    // Rise happens at first point - use first point
    modifiedStartIndex = 0;
  } else {
    // Normal case: use point before the rise
    modifiedStartIndex = firstRiseIndex - 1;
  }

  console.log('[Bishop Mod-Dmax] First rise detection:', {
    riseThreshold: RISE_THRESHOLD,
    baselinePlusThreshold: (baselineAvg + RISE_THRESHOLD).toFixed(2),
    firstRiseIndex,
    firstRiseLactate: firstRiseIndex >= 0 ? lactate[firstRiseIndex].toFixed(2) : 'none',
    modifiedStartIndex,
    modifiedStartIntensity: intensity[modifiedStartIndex].toFixed(1),
    modifiedStartLactate: lactate[modifiedStartIndex].toFixed(2)
  });

  // Step 4: Fit polynomial to the data
  const regression = fitPolynomial3(intensity, lactate);
  const { coefficients, r2 } = regression;

  if (r2 < 0.90) {
    // Poor fit - fall back to traditional method
    return calculateFallbackThreshold(data, coefficients, r2);
  }

  // Step 5: Calculate D-max using MODIFIED baseline
  // Line from modified start point to last point
  const x1 = intensity[modifiedStartIndex];
  const y1 = lactate[modifiedStartIndex];
  const x2 = intensity[intensity.length - 1];
  const y2 = lactate[lactate.length - 1];

  const modifiedSlope = (y2 - y1) / (x2 - x1);
  const modifiedIntercept = y1 - modifiedSlope * x1;

  console.log('[Bishop Mod-Dmax] Modified baseline:', {
    startPoint: `(${x1.toFixed(1)}, ${y1.toFixed(2)})`,
    endPoint: `(${x2.toFixed(1)}, ${y2.toFixed(2)})`,
    slope: modifiedSlope.toFixed(4),
    intercept: modifiedIntercept.toFixed(4)
  });

  // Find point of maximum perpendicular distance using MODIFIED baseline
  // Only search from the modified start point onwards
  const dmaxPoint = findMaxPerpendicularDistanceInRange(
    coefficients,
    modifiedSlope,
    modifiedIntercept,
    x1,  // Start from modified start point
    x2
  );

  // Interpolate heart rate at D-max intensity
  const dmaxHR = interpolateHeartRate(intensity, heartRate, dmaxPoint.intensity);

  // Calculate confidence
  const lactateRange = Math.max(...lactate) - Math.min(...lactate);
  const relativeDistance = dmaxPoint.distance / lactateRange;

  console.log('[Bishop Mod-Dmax] Confidence calculation:', {
    dmaxDistance: dmaxPoint.distance.toFixed(4),
    lactateRange: lactateRange.toFixed(2),
    relativeDistance: relativeDistance.toFixed(4),
    r2: r2.toFixed(4),
    thresholdFor005: (0.05 * lactateRange).toFixed(4),
    thresholdFor010: (0.10 * lactateRange).toFixed(4)
  });

  const confidence = calculateConfidence(r2, dmaxPoint.distance, lactate);

  console.log('[Bishop Mod-Dmax] ★★★ FINAL RESULT ★★★:', {
    intensity: dmaxPoint.intensity.toFixed(2),
    lactate: dmaxPoint.lactate.toFixed(2),
    heartRate: Math.round(dmaxHR),
    r2: r2.toFixed(4),
    confidence,
    dmaxDistance: dmaxPoint.distance.toFixed(4)
  });

  return {
    intensity: parseFloat(dmaxPoint.intensity.toFixed(2)),
    lactate: parseFloat(dmaxPoint.lactate.toFixed(2)),
    heartRate: Math.round(dmaxHR),
    method: 'MOD_DMAX',
    r2: parseFloat(r2.toFixed(4)),
    confidence,
    coefficients,
    dmaxDistance: parseFloat(dmaxPoint.distance.toFixed(4))
  };
}

/**
 * Find point of maximum perpendicular distance in a specific range
 * Used by Bishop Modified D-max to search only after the modified start point
 */
function findMaxPerpendicularDistanceInRange(
  coeffs: PolynomialCoefficients,
  m: number,
  b: number,
  xMin: number,
  xMax: number
): { intensity: number; lactate: number; distance: number } {
  let maxDistance = 0;
  let maxPoint = { intensity: xMin, lactate: 0, distance: 0 };

  // Sample 1000 points along the curve in the specified range
  const numSamples = 1000;
  const step = (xMax - xMin) / numSamples;

  for (let i = 0; i <= numSamples; i++) {
    const x = xMin + i * step;

    // Calculate y on polynomial curve
    const yCurve = coeffs.a * Math.pow(x, 3) +
                   coeffs.b * Math.pow(x, 2) +
                   coeffs.c * x +
                   coeffs.d;

    // Calculate y on baseline
    const yBaseline = m * x + b;

    // Perpendicular distance
    const distance = Math.abs(yCurve - yBaseline) / Math.sqrt(1 + m * m);

    if (distance > maxDistance) {
      maxDistance = distance;
      maxPoint = {
        intensity: x,
        lactate: yCurve,
        distance
      };
    }
  }

  return maxPoint;
}
