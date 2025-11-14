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
 * Modified D-max algorithm with constraints
 * Ensures threshold is in physiological range (1.5-4.5 mmol/L)
 *
 * @param data - Lactate test data
 * @returns Mod-Dmax threshold result
 */
export function calculateModDmax(data: LactateTestData): DmaxResult {
  const result = calculateDmax(data);

  // Apply physiological constraints
  const MIN_LACTATE = 1.5;
  const MAX_LACTATE = 4.5;

  if (result.lactate < MIN_LACTATE || result.lactate > MAX_LACTATE) {
    // Threshold outside physiological range - recalculate with constraints
    const { intensity, lactate, heartRate } = data;
    const regression = fitPolynomial3(intensity, lactate);

    // Find first point where lactate reaches 2.0 mmol/L (aerobic threshold)
    let thresholdIntensity = intensity[0];
    let thresholdLactate = lactate[0];
    let thresholdHR = heartRate[0];

    for (let i = 1; i < lactate.length; i++) {
      if (lactate[i] >= 2.0 && lactate[i - 1] < 2.0) {
        const ratio = (2.0 - lactate[i - 1]) / (lactate[i] - lactate[i - 1]);
        thresholdIntensity = intensity[i - 1] + ratio * (intensity[i] - intensity[i - 1]);
        thresholdHR = heartRate[i - 1] + ratio * (heartRate[i] - heartRate[i - 1]);
        thresholdLactate = 2.0;
        break;
      }
    }

    return {
      intensity: parseFloat(thresholdIntensity.toFixed(2)),
      lactate: parseFloat(thresholdLactate.toFixed(2)),
      heartRate: Math.round(thresholdHR),
      method: 'MOD_DMAX',
      r2: result.r2,
      confidence: 'MEDIUM',
      warning: `D-max threshold (${result.lactate.toFixed(1)} mmol/L) outside physiological range. Using 2.0 mmol/L instead.`,
      coefficients: result.coefficients,
      dmaxDistance: result.dmaxDistance
    };
  }

  return {
    ...result,
    method: 'MOD_DMAX'
  };
}
