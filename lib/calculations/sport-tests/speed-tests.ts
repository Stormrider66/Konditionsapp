/**
 * Speed Test Calculations
 *
 * Formulas for sprint performance, acceleration, and repeated sprint ability.
 */

export interface SprintSplit {
  distance: number // meters
  time: number // seconds
}

export interface SprintAnalysis {
  totalTime: number
  averageSpeed: number // m/s
  topSpeed: number // m/s
  acceleration: number // m/s²
  splits: SprintSplit[]
}

/**
 * Calculate average speed from sprint test
 *
 * @param distance - Sprint distance in meters
 * @param time - Sprint time in seconds
 * @returns Speed in m/s
 */
export function calculateSpeed(distance: number, time: number): number {
  if (time <= 0) return 0
  return Math.round((distance / time) * 100) / 100
}

/**
 * Calculate acceleration from standing start
 *
 * Using kinematic equation: a = 2d / t²
 *
 * @param distance - Distance covered in meters
 * @param time - Time taken in seconds
 * @returns Acceleration in m/s²
 */
export function calculateAcceleration(distance: number, time: number): number {
  if (time <= 0) return 0
  const acceleration = (2 * distance) / (time * time)
  return Math.round(acceleration * 100) / 100
}

/**
 * Calculate maximum velocity from flying sprint
 *
 * @param distance - Flying distance in meters (typically 10-20m)
 * @param time - Time for flying segment in seconds
 * @returns Maximum velocity in m/s
 */
export function calculateMaxVelocity(distance: number, time: number): number {
  if (time <= 0) return 0
  return Math.round((distance / time) * 100) / 100
}

/**
 * Analyze sprint with multiple splits
 *
 * @param splits - Array of split times at each distance
 * @returns Comprehensive sprint analysis
 */
export function analyzeSprintSplits(splits: SprintSplit[]): SprintAnalysis {
  if (splits.length === 0) {
    return {
      totalTime: 0,
      averageSpeed: 0,
      topSpeed: 0,
      acceleration: 0,
      splits: [],
    }
  }

  // Sort splits by distance
  const sortedSplits = [...splits].sort((a, b) => a.distance - b.distance)

  // Total distance and time
  const totalDistance = sortedSplits[sortedSplits.length - 1].distance
  const totalTime = sortedSplits[sortedSplits.length - 1].time

  // Average speed
  const averageSpeed = calculateSpeed(totalDistance, totalTime)

  // Calculate segment speeds to find top speed
  let topSpeed = 0
  for (let i = 1; i < sortedSplits.length; i++) {
    const segmentDistance = sortedSplits[i].distance - sortedSplits[i - 1].distance
    const segmentTime = sortedSplits[i].time - sortedSplits[i - 1].time
    const segmentSpeed = calculateSpeed(segmentDistance, segmentTime)
    if (segmentSpeed > topSpeed) {
      topSpeed = segmentSpeed
    }
  }

  // If only one split, top speed equals average speed
  if (sortedSplits.length === 1) {
    topSpeed = averageSpeed
  }

  // Acceleration from first 10m or first split
  const first10m = sortedSplits.find((s) => s.distance >= 10) || sortedSplits[0]
  const acceleration = calculateAcceleration(first10m.distance, first10m.time)

  return {
    totalTime: Math.round(totalTime * 1000) / 1000,
    averageSpeed,
    topSpeed,
    acceleration,
    splits: sortedSplits,
  }
}

/**
 * Calculate Repeated Sprint Ability (RSA) metrics
 *
 * @param sprintTimes - Array of sprint times in seconds
 * @param restTime - Rest time between sprints in seconds
 * @returns RSA analysis including fatigue index
 */
export function analyzeRSA(
  sprintTimes: number[],
  restTime: number = 25
): {
  bestTime: number
  worstTime: number
  meanTime: number
  totalTime: number
  fatigueIndex: number // Percentage decrease from best to worst
  performanceDecrement: number // Sdec score
  sprintCount: number
} {
  if (sprintTimes.length === 0) {
    return {
      bestTime: 0,
      worstTime: 0,
      meanTime: 0,
      totalTime: 0,
      fatigueIndex: 0,
      performanceDecrement: 0,
      sprintCount: 0,
    }
  }

  const bestTime = Math.min(...sprintTimes)
  const worstTime = Math.max(...sprintTimes)
  const totalTime = sprintTimes.reduce((sum, t) => sum + t, 0)
  const meanTime = totalTime / sprintTimes.length

  // Fatigue Index (%) = ((Worst - Best) / Best) × 100
  const fatigueIndex =
    bestTime > 0 ? ((worstTime - bestTime) / bestTime) * 100 : 0

  // Sprint Decrement Score (Sdec)
  // Sdec = (Total Time / (Best Time × Number of Sprints) - 1) × 100
  const idealTotal = bestTime * sprintTimes.length
  const performanceDecrement =
    idealTotal > 0 ? ((totalTime / idealTotal - 1) * 100) : 0

  return {
    bestTime: Math.round(bestTime * 1000) / 1000,
    worstTime: Math.round(worstTime * 1000) / 1000,
    meanTime: Math.round(meanTime * 1000) / 1000,
    totalTime: Math.round(totalTime * 1000) / 1000,
    fatigueIndex: Math.round(fatigueIndex * 10) / 10,
    performanceDecrement: Math.round(performanceDecrement * 10) / 10,
    sprintCount: sprintTimes.length,
  }
}

/**
 * Classify sprint performance based on distance and gender
 *
 * @param distance - Sprint distance in meters
 * @param time - Sprint time in seconds
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Performance tier
 */
export function classifySprintPerformance(
  distance: number,
  time: number,
  gender: 'MALE' | 'FEMALE'
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  // Thresholds for common distances (in seconds)
  const thresholds: Record<number, { male: number[]; female: number[] }> = {
    10: {
      male: [1.65, 1.72, 1.80], // Elite < 1.65, Advanced < 1.72, Intermediate < 1.80
      female: [1.80, 1.90, 2.00],
    },
    20: {
      male: [2.90, 3.05, 3.20],
      female: [3.20, 3.40, 3.60],
    },
    30: {
      male: [4.00, 4.20, 4.40],
      female: [4.40, 4.70, 5.00],
    },
    40: {
      male: [5.00, 5.30, 5.60],
      female: [5.60, 6.00, 6.40],
    },
  }

  // Find closest distance threshold
  const distances = Object.keys(thresholds).map(Number)
  const closestDistance = distances.reduce((prev, curr) =>
    Math.abs(curr - distance) < Math.abs(prev - distance) ? curr : prev
  )

  const genderThresholds =
    gender === 'MALE'
      ? thresholds[closestDistance].male
      : thresholds[closestDistance].female

  if (time <= genderThresholds[0]) return 'ELITE'
  if (time <= genderThresholds[1]) return 'ADVANCED'
  if (time <= genderThresholds[2]) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Convert sprint time to speed in km/h
 *
 * @param distance - Distance in meters
 * @param time - Time in seconds
 * @returns Speed in km/h
 */
export function sprintSpeedKmh(distance: number, time: number): number {
  if (time <= 0) return 0
  const speedMs = distance / time
  const speedKmh = speedMs * 3.6
  return Math.round(speedKmh * 10) / 10
}
