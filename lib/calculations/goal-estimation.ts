/**
 * Goal-Based Zone Estimation
 *
 * Allows creating training zones without lab testing by using:
 * - Race results (VDOT calculation)
 * - Time trials (5K/10K/half marathon)
 * - HR drift tests
 * - Loose goals ("sub-4 marathon")
 *
 * Based on Jack Daniels VDOT tables and running physiology principles.
 */

// VDOT lookup table (simplified - major values)
// Full table: https://runsmartproject.com/calculator/
const VDOT_TABLE: Record<number, {
  e_pace: number;  // Easy pace min/km
  m_pace: number;  // Marathon pace min/km
  t_pace: number;  // Threshold pace min/km
  i_pace: number;  // Interval pace min/km
  r_pace: number;  // Repetition pace min/km
}> = {
  30: { e_pace: 7.5, m_pace: 6.85, t_pace: 6.45, i_pace: 6.0, r_pace: 5.5 },
  35: { e_pace: 6.7, m_pace: 6.1, t_pace: 5.7, i_pace: 5.3, r_pace: 4.85 },
  40: { e_pace: 6.05, m_pace: 5.5, t_pace: 5.1, i_pace: 4.75, r_pace: 4.35 },
  45: { e_pace: 5.55, m_pace: 5.0, t_pace: 4.65, i_pace: 4.3, r_pace: 3.95 },
  50: { e_pace: 5.1, m_pace: 4.6, t_pace: 4.25, i_pace: 3.95, r_pace: 3.6 },
  55: { e_pace: 4.7, m_pace: 4.25, t_pace: 3.95, i_pace: 3.65, r_pace: 3.35 },
  60: { e_pace: 4.4, m_pace: 3.95, t_pace: 3.65, i_pace: 3.4, r_pace: 3.1 },
  65: { e_pace: 4.1, m_pace: 3.7, t_pace: 3.4, i_pace: 3.15, r_pace: 2.9 },
  70: { e_pace: 3.85, m_pace: 3.5, t_pace: 3.2, i_pace: 2.95, r_pace: 2.7 },
  75: { e_pace: 3.65, m_pace: 3.3, t_pace: 3.0, i_pace: 2.8, r_pace: 2.55 },
  80: { e_pace: 3.45, m_pace: 3.1, t_pace: 2.85, i_pace: 2.65, r_pace: 2.4 },
};

// Standard race distances in meters
const RACE_DISTANCES = {
  '5K': 5000,
  '10K': 10000,
  'HALF_MARATHON': 21097.5,
  'MARATHON': 42195,
  '15K': 15000,
  '20K': 20000,
  '30K': 30000,
};

// Goal time parsing patterns (HH:MM:SS or MM:SS or just minutes)
const TIME_PATTERNS = {
  HMS: /^(\d{1,2}):(\d{2}):(\d{2})$/,
  MS: /^(\d{1,3}):(\d{2})$/,
  MINUTES: /^(\d+(?:\.\d+)?)$/,
};

export interface GoalInput {
  type: 'RACE_RESULT' | 'TIME_TRIAL' | 'HR_DRIFT' | 'LOOSE_GOAL';
  // For RACE_RESULT and TIME_TRIAL
  distance?: keyof typeof RACE_DISTANCES | number; // e.g., '5K', '10K', 42195
  time?: string | number; // e.g., '20:30', '3:45:00', 1230 (seconds)
  // For HR_DRIFT
  hrDriftPercent?: number;
  avgHR?: number;
  duration?: number; // minutes
  avgPace?: number; // min/km
  // For LOOSE_GOAL
  goalDescription?: string; // e.g., 'sub-4 marathon', 'break 25 min 5K'
}

export interface TrainingZones {
  vdot: number;
  estimationMethod: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  zones: {
    z1: { name: string; paceRange: { min: number; max: number }; hrRange?: { min: number; max: number }; description: string };
    z2: { name: string; paceRange: { min: number; max: number }; hrRange?: { min: number; max: number }; description: string };
    z3: { name: string; paceRange: { min: number; max: number }; hrRange?: { min: number; max: number }; description: string };
    z4: { name: string; paceRange: { min: number; max: number }; hrRange?: { min: number; max: number }; description: string };
    z5: { name: string; paceRange: { min: number; max: number }; hrRange?: { min: number; max: number }; description: string };
  };
  keyPaces: {
    easy: number;
    marathon: number;
    threshold: number;
    interval: number;
    repetition: number;
  };
  equivalentTimes: {
    '5K': string;
    '10K': string;
    halfMarathon: string;
    marathon: string;
  };
}

/**
 * Parse time string to seconds
 */
function parseTimeToSeconds(time: string | number): number {
  if (typeof time === 'number') {
    return time;
  }

  const hmsMatch = time.match(TIME_PATTERNS.HMS);
  if (hmsMatch) {
    const [, h, m, s] = hmsMatch;
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
  }

  const msMatch = time.match(TIME_PATTERNS.MS);
  if (msMatch) {
    const [, m, s] = msMatch;
    return parseInt(m) * 60 + parseInt(s);
  }

  const minMatch = time.match(TIME_PATTERNS.MINUTES);
  if (minMatch) {
    return parseFloat(minMatch[1]) * 60;
  }

  throw new Error(`Invalid time format: ${time}`);
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Calculate VDOT from race performance
 *
 * Uses Jack Daniels' formula (simplified approximation)
 */
export function calculateVDOT(distanceMeters: number, timeSeconds: number): number {
  // Convert to standard units
  const distanceKm = distanceMeters / 1000;
  const timeMinutes = timeSeconds / 60;

  // Speed in km/min
  const speed = distanceKm / timeMinutes;

  // Approximate VDOT calculation
  // This is a simplified version of the full Daniels equation
  // VO2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity^2
  // %VO2max = 0.8 + 0.1894393 * e^(-0.012778 * time) + 0.2989558 * e^(-0.1932605 * time)

  // Velocity in m/min
  const velocity = distanceMeters / timeMinutes;

  // Estimate VO2 cost
  const vo2Cost = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);

  // Estimate %VO2max based on race duration
  const percentVO2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes);

  // VDOT = VO2 / %VO2max
  const vdot = vo2Cost / percentVO2max;

  // Clamp to reasonable range
  return Math.max(25, Math.min(85, Math.round(vdot * 10) / 10));
}

/**
 * Get training paces from VDOT
 */
function getPacesFromVDOT(vdot: number): {
  easy: number;
  marathon: number;
  threshold: number;
  interval: number;
  repetition: number;
} {
  // Find closest VDOT values for interpolation
  const vdotValues = Object.keys(VDOT_TABLE).map(Number).sort((a, b) => a - b);

  let lower = vdotValues[0];
  let upper = vdotValues[vdotValues.length - 1];

  for (let i = 0; i < vdotValues.length - 1; i++) {
    if (vdot >= vdotValues[i] && vdot <= vdotValues[i + 1]) {
      lower = vdotValues[i];
      upper = vdotValues[i + 1];
      break;
    }
  }

  // Interpolate
  const ratio = (vdot - lower) / (upper - lower);
  const lowerPaces = VDOT_TABLE[lower];
  const upperPaces = VDOT_TABLE[upper];

  const interpolate = (low: number, high: number) =>
    Math.round((low + (high - low) * ratio) * 100) / 100;

  return {
    easy: interpolate(lowerPaces.e_pace, upperPaces.e_pace),
    marathon: interpolate(lowerPaces.m_pace, upperPaces.m_pace),
    threshold: interpolate(lowerPaces.t_pace, upperPaces.t_pace),
    interval: interpolate(lowerPaces.i_pace, upperPaces.i_pace),
    repetition: interpolate(lowerPaces.r_pace, upperPaces.r_pace),
  };
}

/**
 * Calculate equivalent race times from VDOT
 */
function getEquivalentTimes(vdot: number): {
  '5K': string;
  '10K': string;
  halfMarathon: string;
  marathon: string;
} {
  const paces = getPacesFromVDOT(vdot);

  // Approximate race times using key paces
  // 5K is run at approximately I-pace
  // 10K is between I-pace and T-pace
  // Half is close to T-pace
  // Marathon is at M-pace

  const time5k = paces.interval * 5 * 60;
  const time10k = ((paces.interval + paces.threshold) / 2) * 10 * 60;
  const timeHalf = paces.threshold * 21.0975 * 60;
  const timeMarathon = paces.marathon * 42.195 * 60;

  return {
    '5K': formatTime(time5k),
    '10K': formatTime(time10k),
    halfMarathon: formatTime(timeHalf),
    marathon: formatTime(timeMarathon),
  };
}

/**
 * Parse loose goal description to VDOT
 */
function parseLooseGoal(goal: string): { vdot: number; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } {
  const goalLower = goal.toLowerCase();

  // Common patterns
  const subPatterns = [
    { regex: /sub[- ]?(\d+)[- ]?(hour)?[- ]?marathon/i, distance: 'MARATHON' },
    { regex: /(\d+):?(\d{2})?[- ]?marathon/i, distance: 'MARATHON' },
    { regex: /break[- ]?(\d+)[- ]?(min(ute)?s?)?[- ]?5k/i, distance: '5K' },
    { regex: /sub[- ]?(\d+)[- ]?(min(ute)?s?)?[- ]?5k/i, distance: '5K' },
    { regex: /(\d+):(\d{2})[- ]?5k/i, distance: '5K' },
    { regex: /break[- ]?(\d+)[- ]?(min(ute)?s?)?[- ]?10k/i, distance: '10K' },
    { regex: /sub[- ]?(\d+)[- ]?(min(ute)?s?)?[- ]?10k/i, distance: '10K' },
    { regex: /(\d+):(\d{2})[- ]?10k/i, distance: '10K' },
    { regex: /sub[- ]?(\d)[- ]?(hour)?[- ]?half/i, distance: 'HALF_MARATHON' },
    { regex: /(\d+):(\d{2})[- ]?half/i, distance: 'HALF_MARATHON' },
  ];

  for (const pattern of subPatterns) {
    const match = goal.match(pattern.regex);
    if (match) {
      let timeSeconds: number;
      const distance = RACE_DISTANCES[pattern.distance as keyof typeof RACE_DISTANCES];

      if (match[2] && !isNaN(parseInt(match[2]))) {
        // Format: MM:SS or H:MM
        if (pattern.distance === 'MARATHON' || pattern.distance === 'HALF_MARATHON') {
          // Hours:Minutes
          timeSeconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60;
        } else {
          // Minutes:Seconds
          timeSeconds = parseInt(match[1]) * 60 + parseInt(match[2]);
        }
      } else {
        // Just a number (hours for marathon, minutes for shorter)
        const num = parseInt(match[1]);
        if (pattern.distance === 'MARATHON') {
          timeSeconds = num * 3600; // hours
        } else if (pattern.distance === 'HALF_MARATHON') {
          timeSeconds = num * 3600; // hours
        } else {
          timeSeconds = num * 60; // minutes
        }
      }

      const vdot = calculateVDOT(distance, timeSeconds);
      return { vdot, confidence: 'MEDIUM' };
    }
  }

  // Default estimates based on common descriptions
  if (goalLower.includes('beginner') || goalLower.includes('first')) {
    return { vdot: 35, confidence: 'LOW' };
  }
  if (goalLower.includes('recreational') || goalLower.includes('casual')) {
    return { vdot: 40, confidence: 'LOW' };
  }
  if (goalLower.includes('intermediate') || goalLower.includes('regular')) {
    return { vdot: 45, confidence: 'LOW' };
  }
  if (goalLower.includes('competitive') || goalLower.includes('serious')) {
    return { vdot: 50, confidence: 'LOW' };
  }
  if (goalLower.includes('advanced') || goalLower.includes('experienced')) {
    return { vdot: 55, confidence: 'LOW' };
  }
  if (goalLower.includes('elite') || goalLower.includes('professional')) {
    return { vdot: 65, confidence: 'LOW' };
  }

  // Default middle ground
  return { vdot: 45, confidence: 'LOW' };
}

/**
 * Estimate zones from HR drift test
 *
 * HR drift test: Run at constant pace for 30-60 min, measure HR drift
 * If HR drifts >10%, pace is above aerobic threshold
 * If HR drifts <5%, pace is well below aerobic threshold
 */
function estimateFromHRDrift(
  hrDriftPercent: number,
  avgHR: number,
  avgPace: number,
  durationMinutes: number
): { vdot: number; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } {
  // Calculate VDOT from the test pace
  // Assume drift test is run at easy/moderate effort
  // Adjust based on drift:
  // - Low drift (<5%): pace is easy (zone 2)
  // - Moderate drift (5-10%): pace is at aerobic threshold (zone 3)
  // - High drift (>10%): pace is above threshold (zone 4+)

  let paceMultiplier = 1.0;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

  if (hrDriftPercent < 5) {
    // Pace is easy - E-pace
    paceMultiplier = 1.0;
    confidence = 'MEDIUM';
  } else if (hrDriftPercent < 10) {
    // Pace is at aerobic threshold - between E and T pace
    paceMultiplier = 0.9;
    confidence = 'HIGH';
  } else {
    // Pace is above threshold - close to T-pace
    paceMultiplier = 0.85;
    confidence = 'MEDIUM';
  }

  // Estimate VDOT from pace
  // If avgPace is E-pace, find corresponding VDOT
  const adjustedPace = avgPace * paceMultiplier;

  // Find VDOT where T-pace matches our adjusted pace
  let closestVdot = 40;
  let closestDiff = Infinity;

  for (const vdotStr of Object.keys(VDOT_TABLE)) {
    const vdot = parseInt(vdotStr);
    const tPace = VDOT_TABLE[vdot].t_pace;
    const diff = Math.abs(tPace - adjustedPace);

    if (diff < closestDiff) {
      closestDiff = diff;
      closestVdot = vdot;
    }
  }

  return { vdot: closestVdot, confidence };
}

/**
 * Main function: Estimate training zones from goal input
 */
export function estimateZonesFromGoal(input: GoalInput): TrainingZones {
  let vdot: number;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  let estimationMethod: string;

  switch (input.type) {
    case 'RACE_RESULT': {
      if (!input.distance || !input.time) {
        throw new Error('Distance and time are required for race result');
      }

      const distanceMeters = typeof input.distance === 'string'
        ? RACE_DISTANCES[input.distance as keyof typeof RACE_DISTANCES]
        : input.distance;
      const timeSeconds = parseTimeToSeconds(input.time);

      vdot = calculateVDOT(distanceMeters, timeSeconds);
      confidence = 'HIGH';
      estimationMethod = `Race result: ${input.distance} in ${formatTime(timeSeconds)}`;
      break;
    }

    case 'TIME_TRIAL': {
      if (!input.distance || !input.time) {
        throw new Error('Distance and time are required for time trial');
      }

      const distanceMeters = typeof input.distance === 'string'
        ? RACE_DISTANCES[input.distance as keyof typeof RACE_DISTANCES]
        : input.distance;
      const timeSeconds = parseTimeToSeconds(input.time);

      vdot = calculateVDOT(distanceMeters, timeSeconds);
      // Time trials are slightly less reliable than race results
      confidence = 'MEDIUM';
      estimationMethod = `Time trial: ${input.distance} in ${formatTime(timeSeconds)}`;
      break;
    }

    case 'HR_DRIFT': {
      if (input.hrDriftPercent === undefined || !input.avgHR || !input.avgPace || !input.duration) {
        throw new Error('HR drift data required: hrDriftPercent, avgHR, avgPace, duration');
      }

      const result = estimateFromHRDrift(
        input.hrDriftPercent,
        input.avgHR,
        input.avgPace,
        input.duration
      );
      vdot = result.vdot;
      confidence = result.confidence;
      estimationMethod = `HR drift test: ${input.hrDriftPercent}% drift over ${input.duration}min at ${input.avgPace} min/km`;
      break;
    }

    case 'LOOSE_GOAL': {
      if (!input.goalDescription) {
        throw new Error('Goal description is required for loose goal');
      }

      const result = parseLooseGoal(input.goalDescription);
      vdot = result.vdot;
      confidence = result.confidence;
      estimationMethod = `Loose goal: "${input.goalDescription}"`;
      break;
    }

    default:
      throw new Error(`Unknown goal type: ${input.type}`);
  }

  // Get paces from VDOT
  const keyPaces = getPacesFromVDOT(vdot);
  const equivalentTimes = getEquivalentTimes(vdot);

  // Build training zones
  const zones: TrainingZones['zones'] = {
    z1: {
      name: 'Recovery',
      paceRange: { min: keyPaces.easy * 1.15, max: keyPaces.easy * 1.25 },
      description: 'Very easy, conversational pace for active recovery',
    },
    z2: {
      name: 'Easy / Aerobic',
      paceRange: { min: keyPaces.easy * 1.0, max: keyPaces.easy * 1.15 },
      description: 'Easy running, builds aerobic base (majority of training)',
    },
    z3: {
      name: 'Tempo / Threshold',
      paceRange: { min: keyPaces.threshold * 0.95, max: keyPaces.threshold * 1.05 },
      description: 'Comfortably hard, sustainable for 20-60 minutes',
    },
    z4: {
      name: 'Interval / VO2max',
      paceRange: { min: keyPaces.interval * 0.95, max: keyPaces.interval * 1.05 },
      description: 'Hard effort, 3-5 minute intervals with recovery',
    },
    z5: {
      name: 'Repetition / Speed',
      paceRange: { min: keyPaces.repetition * 0.95, max: keyPaces.repetition * 1.05 },
      description: 'Near-max effort, short intervals (200-400m)',
    },
  };

  return {
    vdot,
    estimationMethod,
    confidenceLevel: confidence,
    zones,
    keyPaces,
    equivalentTimes,
  };
}

/**
 * Convert VDOT-based zones to HR zones (requires max HR)
 */
export function addHRZones(
  zones: TrainingZones,
  maxHR: number,
  restingHR: number = 50
): TrainingZones {
  const hrReserve = maxHR - restingHR;

  // HR zone percentages (Karvonen method)
  const hrZones = {
    z1: { min: 0.50, max: 0.60 },
    z2: { min: 0.60, max: 0.75 },
    z3: { min: 0.80, max: 0.88 },
    z4: { min: 0.88, max: 0.95 },
    z5: { min: 0.95, max: 1.00 },
  };

  const withHR = { ...zones };

  for (const zone of ['z1', 'z2', 'z3', 'z4', 'z5'] as const) {
    const hrRange = hrZones[zone];
    withHR.zones[zone] = {
      ...withHR.zones[zone],
      hrRange: {
        min: Math.round(restingHR + hrReserve * hrRange.min),
        max: Math.round(restingHR + hrReserve * hrRange.max),
      },
    };
  }

  return withHR;
}
