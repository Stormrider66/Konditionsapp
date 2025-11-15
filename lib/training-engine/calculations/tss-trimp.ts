/**
 * Training Stress Score (TSS) and Training Impulse (TRIMP) Calculations
 *
 * TSS: Cycling-focused training load quantification
 * TRIMP: Heart rate-based training load quantification
 * hrTSS: Heart rate-based Training Stress Score for running/swimming
 *
 * References:
 * - Coggan, A. (2003). Training and Racing Using a Power Meter
 * - Banister, E. W. (1991). Modeling Elite Athletic Performance
 * - Edwards, S. (1993). The Heart Rate Monitor Book
 *
 * @module tss-trimp
 */

export interface WorkoutData {
  duration: number;        // minutes
  avgHeartRate?: number;   // bpm (for TRIMP/hrTSS)
  maxHeartRate?: number;   // bpm (for TRIMP/hrTSS)
  avgPower?: number;       // watts (for TSS)
  normalizedPower?: number; // watts (for TSS)
  ftp?: number;            // watts (for TSS)
  ltHR?: number;           // bpm at lactate threshold (for hrTSS)
  restingHR?: number;      // bpm (for TRIMP)
  gender?: 'MALE' | 'FEMALE'; // for TRIMP weighting
  timeInZones?: number[];  // minutes in each zone [Z1, Z2, Z3, Z4, Z5]
}

export interface TrainingLoadResult {
  tss?: number;            // Training Stress Score (cycling)
  hrTSS?: number;          // Heart rate-based TSS (running)
  trimp?: number;          // Training Impulse (all sports)
  intensity?: number;      // Intensity Factor (0-1+)
  method: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warning?: string;
}

/**
 * Calculate Training Stress Score (TSS) from power data
 *
 * TSS = (duration_sec × NP × IF) / (FTP × 3600) × 100
 * Where IF (Intensity Factor) = NP / FTP
 *
 * Interpretation:
 * - <150: Low stress (recovery next day)
 * - 150-300: Medium stress (some fatigue)
 * - 300-450: High stress (significant fatigue)
 * - >450: Very high stress (multi-day recovery)
 *
 * @param data - Workout data with power metrics
 * @returns TSS value
 */
export function calculateTSS(data: WorkoutData): number {
  const { duration, normalizedPower, ftp } = data;

  if (!normalizedPower || !ftp || ftp === 0) {
    throw new Error('Normalized Power and FTP required for TSS calculation');
  }

  if (duration <= 0) {
    throw new Error('Duration must be positive');
  }

  const durationSeconds = duration * 60;
  const intensityFactor = normalizedPower / ftp;

  const tss = (durationSeconds * normalizedPower * intensityFactor) / (ftp * 3600) * 100;

  return Math.round(tss);
}

/**
 * Calculate Normalized Power (NP) from power stream
 *
 * Algorithm:
 * 1. Calculate 30-second rolling average
 * 2. Raise each value to 4th power
 * 3. Average the 4th power values
 * 4. Take 4th root
 *
 * NP accounts for variable pacing better than average power
 *
 * @param powerStream - Array of power values (watts) per second
 * @returns Normalized Power
 */
export function calculateNormalizedPower(powerStream: number[]): number {
  if (powerStream.length < 30) {
    throw new Error('Minimum 30 seconds of power data required');
  }

  // Calculate 30-second rolling average
  const rollingAverages: number[] = [];
  const windowSize = 30;

  for (let i = windowSize - 1; i < powerStream.length; i++) {
    const window = powerStream.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
    rollingAverages.push(avg);
  }

  // Raise to 4th power and average
  const fourthPowerAvg = rollingAverages.reduce((sum, val) => sum + Math.pow(val, 4), 0) / rollingAverages.length;

  // Take 4th root
  const normalizedPower = Math.pow(fourthPowerAvg, 0.25);

  return Math.round(normalizedPower);
}

/**
 * Calculate heart rate-based Training Stress Score (hrTSS)
 *
 * hrTSS = duration_min × (HR_ratio)² × 100
 * Where HR_ratio = (avgHR - restingHR) / (ltHR - restingHR)
 *
 * Used for running, swimming, and other non-power sports
 *
 * @param data - Workout data with heart rate metrics
 * @returns hrTSS value
 */
export function calculateHrTSS(data: WorkoutData): number {
  const { duration, avgHeartRate, ltHR, restingHR } = data;

  if (!avgHeartRate || !ltHR || !restingHR) {
    throw new Error('Average HR, LT HR, and resting HR required for hrTSS');
  }

  if (restingHR >= ltHR) {
    throw new Error('Resting HR must be less than LT HR');
  }

  if (duration <= 0) {
    throw new Error('Duration must be positive');
  }

  // Calculate HR ratio (normalized intensity)
  const hrRatio = (avgHeartRate - restingHR) / (ltHR - restingHR);

  // Clamp ratio to reasonable range (0.3 - 1.3)
  const clampedRatio = Math.max(0.3, Math.min(1.3, hrRatio));

  const hrTSS = duration * Math.pow(clampedRatio, 2) * 100;

  return Math.round(hrTSS);
}

/**
 * Calculate Training Impulse (TRIMP) using Edwards method
 *
 * TRIMP = Σ(time_in_zone × zone_multiplier)
 *
 * Zone multipliers (Edwards):
 * Zone 1 (50-60%): 1
 * Zone 2 (60-70%): 2
 * Zone 3 (70-80%): 3
 * Zone 4 (80-90%): 4
 * Zone 5 (90-100%): 5
 *
 * Simple and effective for comparing workouts
 *
 * @param data - Workout data with time in zones
 * @returns TRIMP value
 */
export function calculateTRIMP(data: WorkoutData): number {
  const { timeInZones } = data;

  if (!timeInZones || timeInZones.length !== 5) {
    throw new Error('Time in zones array required (5 zones)');
  }

  const zoneMultipliers = [1, 2, 3, 4, 5];

  const trimp = timeInZones.reduce((sum, time, index) => {
    return sum + (time * zoneMultipliers[index]);
  }, 0);

  return Math.round(trimp);
}

/**
 * Calculate Banister TRIMP (gender-specific with exponential weighting)
 *
 * TRIMP = duration × ΔHR_ratio × 0.64 × e^(k × ΔHR_ratio)
 * Where:
 * - ΔHR_ratio = (avgHR - restingHR) / (maxHR - restingHR)
 * - k = 1.92 (male) or 1.67 (female)
 *
 * More physiologically accurate than Edwards method
 *
 * @param data - Workout data with HR metrics
 * @returns Banister TRIMP value
 */
export function calculateBanisterTRIMP(data: WorkoutData): number {
  const { duration, avgHeartRate, maxHeartRate, restingHR, gender } = data;

  if (!avgHeartRate || !maxHeartRate || !restingHR) {
    throw new Error('Average HR, max HR, and resting HR required for Banister TRIMP');
  }

  if (restingHR >= maxHeartRate) {
    throw new Error('Resting HR must be less than max HR');
  }

  if (duration <= 0) {
    throw new Error('Duration must be positive');
  }

  // Gender-specific exponential coefficient
  const k = gender === 'FEMALE' ? 1.67 : 1.92;

  // Heart rate ratio
  const hrRatio = (avgHeartRate - restingHR) / (maxHeartRate - restingHR);

  // Clamp to reasonable range
  const clampedRatio = Math.max(0, Math.min(1, hrRatio));

  // Banister TRIMP formula
  const trimp = duration * clampedRatio * 0.64 * Math.exp(k * clampedRatio);

  return Math.round(trimp);
}

/**
 * Calculate comprehensive training load metrics
 * Automatically selects appropriate method based on available data
 *
 * @param data - Workout data (power and/or HR)
 * @returns Training load result with all applicable metrics
 */
export function calculateTrainingLoad(data: WorkoutData): TrainingLoadResult {
  const result: TrainingLoadResult = {
    method: '',
    confidence: 'LOW'
  };

  // Try TSS (power-based) first - most accurate for cycling
  if (data.normalizedPower && data.ftp) {
    try {
      result.tss = calculateTSS(data);
      result.intensity = data.normalizedPower / data.ftp;
      result.method = 'TSS (Power)';
      result.confidence = 'HIGH';
      return result;
    } catch (error) {
      console.warn('[Training Load] TSS calculation failed:', error);
    }
  }

  // Try hrTSS (HR-based TSS) - good for running
  if (data.avgHeartRate && data.ltHR && data.restingHR) {
    try {
      result.hrTSS = calculateHrTSS(data);
      result.intensity = (data.avgHeartRate - data.restingHR) / (data.ltHR - data.restingHR);
      result.method = 'hrTSS (Heart Rate)';
      result.confidence = 'HIGH';

      // Also calculate TRIMP if possible
      if (data.maxHeartRate && data.gender) {
        result.trimp = calculateBanisterTRIMP(data);
      }

      return result;
    } catch (error) {
      console.warn('[Training Load] hrTSS calculation failed:', error);
    }
  }

  // Try Edwards TRIMP (time in zones) - fallback
  if (data.timeInZones) {
    try {
      result.trimp = calculateTRIMP(data);
      result.method = 'TRIMP (Edwards)';
      result.confidence = 'MEDIUM';
      return result;
    } catch (error) {
      console.warn('[Training Load] TRIMP calculation failed:', error);
    }
  }

  // Try Banister TRIMP as last resort
  if (data.avgHeartRate && data.maxHeartRate && data.restingHR && data.gender) {
    try {
      result.trimp = calculateBanisterTRIMP(data);
      result.method = 'TRIMP (Banister)';
      result.confidence = 'MEDIUM';
      return result;
    } catch (error) {
      console.warn('[Training Load] Banister TRIMP calculation failed:', error);
    }
  }

  // No valid method available
  result.warning = 'Insufficient data for training load calculation. Provide power (TSS), HR with LT (hrTSS), or time in zones (TRIMP).';
  result.method = 'NONE';

  return result;
}

/**
 * Calculate Acute:Chronic Workload Ratio (ACWR)
 * Used for injury risk monitoring
 *
 * ACWR = Acute Load (7 days) / Chronic Load (28 days)
 *
 * Safe zone: 0.8 - 1.3
 * Risk zone: <0.8 (detraining) or >1.5 (overload)
 *
 * @param weeklyLoads - Array of weekly TSS/TRIMP values (most recent first)
 * @returns ACWR value
 */
export function calculateACWR(weeklyLoads: number[]): number {
  if (weeklyLoads.length < 4) {
    throw new Error('Minimum 4 weeks of data required for ACWR');
  }

  // Acute load: last 7 days (most recent week)
  const acuteLoad = weeklyLoads[0];

  // Chronic load: last 28 days (average of last 4 weeks)
  const chronicLoad = weeklyLoads.slice(0, 4).reduce((sum, val) => sum + val, 0) / 4;

  if (chronicLoad === 0) {
    return 0;
  }

  return parseFloat((acuteLoad / chronicLoad).toFixed(2));
}

/**
 * Calculate Exponentially Weighted Moving Average (EWMA) ACWR
 * More responsive to recent changes than traditional ACWR
 *
 * Recommended by research as more accurate for injury prediction
 *
 * @param dailyLoads - Array of daily TSS/TRIMP values (most recent first)
 * @returns EWMA ACWR value
 */
export function calculateEWMA_ACWR(dailyLoads: number[]): number {
  if (dailyLoads.length < 28) {
    throw new Error('Minimum 28 days of data required for EWMA ACWR');
  }

  // EWMA formula: EWMA_t = α × Load_t + (1-α) × EWMA_{t-1}
  // α_acute = 2/(7+1) = 0.25 (7-day window)
  // α_chronic = 2/(28+1) ≈ 0.069 (28-day window)

  const alphaAcute = 2 / 8;
  const alphaChronic = 2 / 29;

  let acuteEWMA = dailyLoads[dailyLoads.length - 1];
  let chronicEWMA = dailyLoads[dailyLoads.length - 1];

  // Calculate EWMA for last 28 days (starting from oldest)
  for (let i = dailyLoads.length - 2; i >= 0 && i >= dailyLoads.length - 28; i--) {
    acuteEWMA = alphaAcute * dailyLoads[i] + (1 - alphaAcute) * acuteEWMA;
    chronicEWMA = alphaChronic * dailyLoads[i] + (1 - alphaChronic) * chronicEWMA;
  }

  if (chronicEWMA === 0) {
    return 0;
  }

  return parseFloat((acuteEWMA / chronicEWMA).toFixed(2));
}
