// lib/ai/advanced-intelligence/predictive-goals.ts
// Predictive goal setting with confidence intervals and race time predictions

import { prisma } from '@/lib/prisma'

// VDOT tables (Jack Daniels) - key race times in seconds
const VDOT_TABLES: Record<number, { fiveK: number; tenK: number; half: number; marathon: number }> = {
  30: { fiveK: 1860, tenK: 3900, half: 8640, marathon: 18000 },
  35: { fiveK: 1620, tenK: 3408, half: 7536, marathon: 15720 },
  40: { fiveK: 1440, tenK: 3024, half: 6672, marathon: 13920 },
  45: { fiveK: 1296, tenK: 2724, half: 5994, marathon: 12540 },
  50: { fiveK: 1176, tenK: 2466, half: 5418, marathon: 11340 },
  55: { fiveK: 1068, tenK: 2250, half: 4938, marathon: 10320 },
  60: { fiveK: 978, tenK: 2058, half: 4518, marathon: 9480 },
  65: { fiveK: 900, tenK: 1896, half: 4158, marathon: 8700 },
  70: { fiveK: 834, tenK: 1758, half: 3852, marathon: 8040 },
  75: { fiveK: 774, tenK: 1632, half: 3582, marathon: 7500 },
  80: { fiveK: 720, tenK: 1518, half: 3330, marathon: 6960 },
  85: { fiveK: 672, tenK: 1416, half: 3102, marathon: 6480 },
}

export interface GoalPrediction {
  distance: '5K' | '10K' | 'HALF' | 'MARATHON'
  predictedTime: string // HH:MM:SS
  predictedPace: string // MM:SS/km
  confidenceInterval: {
    lower: string // Optimistic
    upper: string // Conservative
  }
  confidence: number // 0-1
  factors: GoalFactor[]
  achievableIn: string // Time period estimate
  trainingRecommendations: string[]
}

export interface GoalFactor {
  name: string
  impact: 'positive' | 'negative' | 'neutral'
  description: string
  weight: number
}

export interface RaceTimePrediction {
  distance: '5K' | '10K' | 'HALF' | 'MARATHON'
  currentVDOT: number
  projectedVDOT: number // After training period
  currentPrediction: string
  trainedPrediction: string
  improvementPercent: number
  confidence: number
  methodology: string
}

export interface TrainingReadiness {
  currentFitness: number // 0-100
  fitnessTrajectory: 'improving' | 'maintaining' | 'declining'
  fatigue: number // 0-100
  form: number // fitness - fatigue
  peakDate: Date | null
  daysToGoal: number
  readinessScore: number
}

/**
 * Generate predictive goals based on training history and performance data
 */
export async function generatePredictiveGoals(
  clientId: string,
  targetDistance: '5K' | '10K' | 'HALF' | 'MARATHON'
): Promise<GoalPrediction> {
  // Fetch athlete data
  const [races, fieldTests, workoutLogs, checkIns] = await Promise.all([
    prisma.race.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.fieldTest.findMany({
      where: { clientId, valid: true },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.workoutLog.findMany({
      where: { athleteId: clientId, completed: true },
      orderBy: { completedAt: 'desc' },
      take: 50,
    }),
    prisma.dailyCheckIn.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 30,
    }),
  ])

  // Calculate current VDOT from best recent performance
  const currentVDOT = calculateCurrentVDOT(races, fieldTests)

  // Analyze training factors
  const factors = analyzeGoalFactors(workoutLogs, checkIns, races)

  // Calculate confidence based on data availability
  const confidence = calculateGoalConfidence(races, fieldTests, workoutLogs)

  // Predict race time
  const predictedSeconds = predictRaceTime(currentVDOT, targetDistance)
  const { lower, upper } = calculateConfidenceInterval(predictedSeconds, confidence, factors)

  // Estimate time to achieve goal
  const achievableIn = estimateTimeToGoal(currentVDOT, targetDistance, factors)

  // Generate training recommendations
  const recommendations = generateTrainingRecommendations(targetDistance, factors, currentVDOT)

  return {
    distance: targetDistance,
    predictedTime: formatSecondsToTime(predictedSeconds),
    predictedPace: calculatePace(predictedSeconds, targetDistance),
    confidenceInterval: {
      lower: formatSecondsToTime(lower),
      upper: formatSecondsToTime(upper),
    },
    confidence,
    factors,
    achievableIn,
    trainingRecommendations: recommendations,
  }
}

/**
 * Predict race times for multiple distances
 */
export async function predictRaceTimes(
  clientId: string,
  trainingWeeks: number = 12
): Promise<RaceTimePrediction[]> {
  const [races, fieldTests, workoutLogs, trainingLoads] = await Promise.all([
    prisma.race.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.fieldTest.findMany({
      where: { clientId, valid: true },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.workoutLog.findMany({
      where: { athleteId: clientId, completed: true },
      orderBy: { completedAt: 'desc' },
      take: 100,
    }),
    prisma.trainingLoad.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 90,
    }),
  ])

  const currentVDOT = calculateCurrentVDOT(races, fieldTests)
  const projectedVDOT = projectVDOTImprovement(currentVDOT, trainingWeeks, workoutLogs, trainingLoads)

  const distances: ('5K' | '10K' | 'HALF' | 'MARATHON')[] = ['5K', '10K', 'HALF', 'MARATHON']

  return distances.map(distance => {
    const currentSeconds = predictRaceTime(currentVDOT, distance)
    const projectedSeconds = predictRaceTime(projectedVDOT, distance)
    const improvement = ((currentSeconds - projectedSeconds) / currentSeconds) * 100

    return {
      distance,
      currentVDOT,
      projectedVDOT,
      currentPrediction: formatSecondsToTime(currentSeconds),
      trainedPrediction: formatSecondsToTime(projectedSeconds),
      improvementPercent: Math.round(improvement * 10) / 10,
      confidence: calculatePredictionConfidence(trainingWeeks, workoutLogs.length),
      methodology: 'VDOT-baserad prediktion med träningsprogressionsanalys',
    }
  })
}

/**
 * Calculate training readiness and form curve
 */
export async function calculateTrainingReadiness(
  clientId: string,
  goalDate: Date
): Promise<TrainingReadiness> {
  const now = new Date()
  const daysToGoal = Math.ceil((goalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const [trainingLoads, checkIns] = await Promise.all([
    prisma.trainingLoad.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 42, // 6 weeks
    }),
    prisma.dailyCheckIn.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 14,
    }),
  ])

  // Calculate chronic training load (CTL) - fitness
  const chronicLoad = calculateChronicLoad(trainingLoads)

  // Calculate acute training load (ATL) - fatigue
  const acuteLoad = calculateAcuteLoad(trainingLoads)

  // Training stress balance (TSB) = CTL - ATL = form
  const form = chronicLoad - acuteLoad

  // Determine trajectory
  const recentLoads = trainingLoads.slice(0, 14)
  const olderLoads = trainingLoads.slice(14, 28)
  const recentAvg = recentLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / recentLoads.length
  const olderAvg = olderLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / olderLoads.length || recentAvg

  let trajectory: 'improving' | 'maintaining' | 'declining'
  if (recentAvg > olderAvg * 1.05) trajectory = 'improving'
  else if (recentAvg < olderAvg * 0.95) trajectory = 'declining'
  else trajectory = 'maintaining'

  // Calculate peak date (when form will be highest)
  const peakDate = daysToGoal > 14 ? goalDate : null

  // Overall readiness score
  const avgReadiness = checkIns.length > 0
    ? checkIns.reduce((sum, c) => sum + (c.readinessScore || 70), 0) / checkIns.length
    : 70

  return {
    currentFitness: Math.round(chronicLoad),
    fitnessTrajectory: trajectory,
    fatigue: Math.round(acuteLoad),
    form: Math.round(form),
    peakDate,
    daysToGoal,
    readinessScore: Math.round(avgReadiness),
  }
}

// Helper functions
function calculateCurrentVDOT(
  races: { distance: string; actualTime: string | null; vdot: number | null }[],
  fieldTests: { results: unknown; lt2Pace: number | null }[]
): number {
  // First try to use race VDOT
  const recentRaceWithVDOT = races.find(r => r.vdot && r.actualTime)
  if (recentRaceWithVDOT?.vdot) {
    return recentRaceWithVDOT.vdot
  }

  // Calculate from race time
  const recentRace = races.find(r => r.actualTime)
  if (recentRace?.actualTime) {
    const seconds = parseTimeToSeconds(recentRace.actualTime)
    return estimateVDOTFromTime(seconds, recentRace.distance)
  }

  // Estimate from field test LT2 pace
  const lt2Test = fieldTests.find(t => t.lt2Pace)
  if (lt2Test?.lt2Pace) {
    // LT2 pace approximates 10K pace for well-trained runners
    return estimateVDOTFromTime(lt2Test.lt2Pace * 10, '10K')
  }

  // Default VDOT for recreational runner
  return 40
}

function estimateVDOTFromTime(seconds: number, distance: string): number {
  // Find VDOT that matches closest
  const distanceKey = distance.toLowerCase().replace('-', '') as keyof typeof VDOT_TABLES[30]
  const mapping: Record<string, keyof typeof VDOT_TABLES[30]> = {
    '5k': 'fiveK',
    '10k': 'tenK',
    'half': 'half',
    'halfmarathon': 'half',
    'marathon': 'marathon',
  }
  const key = mapping[distanceKey] || 'tenK'

  let closestVDOT = 40
  let closestDiff = Infinity

  Object.entries(VDOT_TABLES).forEach(([vdot, times]) => {
    const time = times[key]
    const diff = Math.abs(time - seconds)
    if (diff < closestDiff) {
      closestDiff = diff
      closestVDOT = parseInt(vdot)
    }
  })

  return closestVDOT
}

function predictRaceTime(vdot: number, distance: '5K' | '10K' | 'HALF' | 'MARATHON'): number {
  const mapping: Record<string, keyof typeof VDOT_TABLES[30]> = {
    '5K': 'fiveK',
    '10K': 'tenK',
    'HALF': 'half',
    'MARATHON': 'marathon',
  }
  const key = mapping[distance]

  // Interpolate between VDOT values
  const lowerVDOT = Math.floor(vdot / 5) * 5
  const upperVDOT = lowerVDOT + 5
  const lowerTime = VDOT_TABLES[lowerVDOT]?.[key] || VDOT_TABLES[40][key]
  const upperTime = VDOT_TABLES[upperVDOT]?.[key] || lowerTime

  const fraction = (vdot - lowerVDOT) / 5
  return Math.round(lowerTime - fraction * (lowerTime - upperTime))
}

function projectVDOTImprovement(
  currentVDOT: number,
  trainingWeeks: number,
  workoutLogs: unknown[],
  trainingLoads: { dailyLoad: number }[]
): number {
  // Base improvement rate: 0.3-0.5 VDOT per month for consistent training
  const monthlyImprovement = workoutLogs.length > 30 ? 0.5 : 0.3

  // Adjust for training load consistency
  const avgTSS = trainingLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / trainingLoads.length
  const loadMultiplier = avgTSS > 400 ? 1.2 : avgTSS > 200 ? 1.0 : 0.8

  // Calculate projected improvement
  const months = trainingWeeks / 4
  const improvement = monthlyImprovement * months * loadMultiplier

  // Cap improvement at realistic levels
  const maxImprovement = currentVDOT < 45 ? 5 : currentVDOT < 55 ? 3 : 2

  return Math.min(currentVDOT + improvement, currentVDOT + maxImprovement)
}

function analyzeGoalFactors(
  workoutLogs: { perceivedEffort: number | null; duration: number | null }[],
  checkIns: { readinessScore: number | null; sleepQuality: number }[],
  races: { assessment: string | null }[]
): GoalFactor[] {
  const factors: GoalFactor[] = []

  // Training consistency
  const weeklyWorkouts = workoutLogs.length / 4 // Assume 4 weeks
  if (weeklyWorkouts >= 5) {
    factors.push({
      name: 'Träningskonsistens',
      impact: 'positive',
      description: `${weeklyWorkouts.toFixed(1)} pass/vecka - utmärkt konsistens`,
      weight: 0.2,
    })
  } else if (weeklyWorkouts < 3) {
    factors.push({
      name: 'Träningskonsistens',
      impact: 'negative',
      description: `Endast ${weeklyWorkouts.toFixed(1)} pass/vecka - behöver öka`,
      weight: 0.2,
    })
  }

  // Recovery quality
  const avgReadiness = checkIns.length > 0
    ? checkIns.reduce((sum, c) => sum + (c.readinessScore || 70), 0) / checkIns.length
    : 70

  if (avgReadiness >= 75) {
    factors.push({
      name: 'Återhämtning',
      impact: 'positive',
      description: 'Bra återhämtning mellan pass',
      weight: 0.15,
    })
  } else if (avgReadiness < 60) {
    factors.push({
      name: 'Återhämtning',
      impact: 'negative',
      description: 'Låg genomsnittlig beredskap - prioritera vila',
      weight: 0.15,
    })
  }

  // Race experience
  const completedRaces = races.filter(r => r.assessment).length
  if (completedRaces >= 3) {
    factors.push({
      name: 'Tävlingserfarenhet',
      impact: 'positive',
      description: `${completedRaces} genomförda lopp - god erfarenhet`,
      weight: 0.1,
    })
  }

  // Sleep quality
  const avgSleep = checkIns.length > 0
    ? checkIns.reduce((sum, c) => sum + c.sleepQuality, 0) / checkIns.length
    : 6

  if (avgSleep >= 7) {
    factors.push({
      name: 'Sömnkvalitet',
      impact: 'positive',
      description: 'Genomgående god sömn',
      weight: 0.1,
    })
  } else if (avgSleep < 5) {
    factors.push({
      name: 'Sömnkvalitet',
      impact: 'negative',
      description: 'Sömnkvalitet behöver förbättras',
      weight: 0.1,
    })
  }

  return factors
}

function calculateGoalConfidence(
  races: unknown[],
  fieldTests: unknown[],
  workoutLogs: unknown[]
): number {
  let confidence = 0.5 // Base confidence

  // More data = higher confidence
  if (races.length > 0) confidence += 0.15
  if (races.length > 3) confidence += 0.1
  if (fieldTests.length > 0) confidence += 0.1
  if (workoutLogs.length > 20) confidence += 0.1
  if (workoutLogs.length > 50) confidence += 0.05

  return Math.min(0.95, confidence)
}

function calculateConfidenceInterval(
  predictedSeconds: number,
  confidence: number,
  factors: GoalFactor[]
): { lower: number; upper: number } {
  // Wider interval for lower confidence
  const intervalPercent = (1 - confidence) * 0.1 // 0-10% variation

  // Adjust for positive/negative factors
  const factorAdjustment = factors.reduce((sum, f) => {
    return sum + (f.impact === 'positive' ? -0.01 : f.impact === 'negative' ? 0.01 : 0) * f.weight
  }, 0)

  const lowerPercent = 1 - intervalPercent + factorAdjustment
  const upperPercent = 1 + intervalPercent - factorAdjustment

  return {
    lower: Math.round(predictedSeconds * lowerPercent),
    upper: Math.round(predictedSeconds * upperPercent),
  }
}

function estimateTimeToGoal(
  currentVDOT: number,
  distance: '5K' | '10K' | 'HALF' | 'MARATHON',
  factors: GoalFactor[]
): string {
  // Base time estimates
  const baseTimes: Record<string, number> = {
    '5K': 8,
    '10K': 12,
    'HALF': 16,
    'MARATHON': 24,
  }

  let weeks = baseTimes[distance]

  // Adjust based on factors
  const positiveFactors = factors.filter(f => f.impact === 'positive').length
  const negativeFactors = factors.filter(f => f.impact === 'negative').length

  weeks -= positiveFactors * 2
  weeks += negativeFactors * 2

  // Adjust for current fitness
  if (currentVDOT < 35) weeks += 8
  else if (currentVDOT < 45) weeks += 4
  else if (currentVDOT > 55) weeks -= 4

  weeks = Math.max(8, Math.min(32, weeks))

  return `${weeks} veckor`
}

function generateTrainingRecommendations(
  distance: '5K' | '10K' | 'HALF' | 'MARATHON',
  factors: GoalFactor[],
  vdot: number
): string[] {
  const recommendations: string[] = []

  // Distance-specific recommendations
  if (distance === '5K') {
    recommendations.push('Fokusera på intervallträning för 5K: 400m-1000m intervaller')
    recommendations.push('Bygg en stark aerob bas med 80% lågintensiv träning')
  } else if (distance === '10K') {
    recommendations.push('Balansera tempointervaller och längre uthållighetspass')
    recommendations.push('Inkludera ett längre pass/vecka (90+ min)')
  } else if (distance === 'HALF') {
    recommendations.push('Bygg gradvis upp till 90+ km/vecka')
    recommendations.push('Genomför specifika halvmaraton-tempopass')
  } else {
    recommendations.push('Prioritera volym och långa pass (30+ km)')
    recommendations.push('Träna på målmaraton-fart regelbundet')
  }

  // Factor-based recommendations
  factors.forEach(factor => {
    if (factor.impact === 'negative') {
      if (factor.name === 'Sömnkvalitet') {
        recommendations.push('Prioritera 7-9 timmars sömn för optimal återhämtning')
      } else if (factor.name === 'Träningskonsistens') {
        recommendations.push('Öka gradvis antal träningspass per vecka')
      } else if (factor.name === 'Återhämtning') {
        recommendations.push('Lägg till en extra vilodag eller lätt pass per vecka')
      }
    }
  })

  // VDOT-based recommendations
  if (vdot < 40) {
    recommendations.push('Fokusera på att bygga aerob kapacitet innan intensiva pass')
  } else if (vdot > 55) {
    recommendations.push('Inkludera specifik fartträning för att underhålla toppform')
  }

  return recommendations.slice(0, 5) // Max 5 recommendations
}

function calculateChronicLoad(trainingLoads: { dailyLoad: number }[]): number {
  // CTL: 42-day exponentially weighted average
  if (trainingLoads.length === 0) return 50

  let ctlSum = 0
  let weightSum = 0
  const lambda = 2 / (42 + 1)

  trainingLoads.forEach((load, i) => {
    const weight = Math.pow(1 - lambda, i)
    ctlSum += (load.dailyLoad || 0) * weight
    weightSum += weight
  })

  return ctlSum / weightSum
}

function calculateAcuteLoad(trainingLoads: { dailyLoad: number }[]): number {
  // ATL: 7-day exponentially weighted average
  const recentLoads = trainingLoads.slice(0, 7)
  if (recentLoads.length === 0) return 50

  let atlSum = 0
  let weightSum = 0
  const lambda = 2 / (7 + 1)

  recentLoads.forEach((load, i) => {
    const weight = Math.pow(1 - lambda, i)
    atlSum += (load.dailyLoad || 0) * weight
    weightSum += weight
  })

  return atlSum / weightSum
}

function calculatePredictionConfidence(trainingWeeks: number, workoutCount: number): number {
  let confidence = 0.5

  // More training data = higher confidence
  if (workoutCount > 50) confidence += 0.2
  else if (workoutCount > 20) confidence += 0.1

  // Shorter prediction window = higher confidence
  if (trainingWeeks <= 8) confidence += 0.15
  else if (trainingWeeks <= 16) confidence += 0.1
  else confidence -= 0.05

  return Math.min(0.9, Math.max(0.3, confidence))
}

function parseTimeToSeconds(time: string): number {
  // Parse HH:MM:SS or MM:SS
  const parts = time.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}

function formatSecondsToTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.round(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function calculatePace(seconds: number, distance: '5K' | '10K' | 'HALF' | 'MARATHON'): string {
  const distances: Record<string, number> = {
    '5K': 5,
    '10K': 10,
    'HALF': 21.0975,
    'MARATHON': 42.195,
  }

  const km = distances[distance]
  const paceSeconds = seconds / km
  const mins = Math.floor(paceSeconds / 60)
  const secs = Math.round(paceSeconds % 60)

  return `${mins}:${secs.toString().padStart(2, '0')}/km`
}
