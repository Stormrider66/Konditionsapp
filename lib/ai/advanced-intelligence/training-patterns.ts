// lib/ai/advanced-intelligence/training-patterns.ts
// Training history pattern recognition for advanced analytics

import { prisma } from '@/lib/prisma'

type AppLocale = 'en' | 'sv'

export interface TrainingPattern {
  type: 'weekly_volume' | 'intensity_distribution' | 'workout_response' | 'recovery_pattern' | 'progression_rate'
  description: string
  confidence: number // 0-1
  data: VolumePattern | IntensityPattern | RecoveryPattern | ProgressionPattern | { workoutsLogged: number; minimumRequired: number }
  insights: string[]
  recommendations: string[]
}

export interface VolumePattern {
  averageWeeklyVolume: number // km or hours
  volumeVariability: number // coefficient of variation
  peakVolume: number
  lowVolume: number
  trend: 'increasing' | 'stable' | 'decreasing'
  weeklyDistribution: { week: number; volume: number }[]
}

export interface IntensityPattern {
  zone1Percent: number // Recovery/Easy
  zone2Percent: number // Aerobic
  zone3Percent: number // Tempo
  zone4Percent: number // Threshold
  zone5Percent: number // VO2max
  polarizationIndex: number // 0-1 (higher = more polarized)
  recommendation: 'more_easy' | 'more_intensity' | 'well_balanced'
}

export interface WorkoutResponsePattern {
  workoutType: string
  averageRPE: number
  averageCompletionRate: number
  recoveryTime: number // days to baseline readiness
  performanceTrend: 'improving' | 'stable' | 'declining'
  bestPerformanceConditions: {
    dayOfWeek?: number
    timeOfDay?: string
    precedingRestDays?: number
  }
}

export interface RecoveryPattern {
  averageRecoveryTime: number // days
  factorsAffectingRecovery: {
    factor: string
    impact: number // -1 to 1 (negative = slower recovery)
    confidence: number
  }[]
  optimalRestDays: number
  sleepImpact: number // correlation with readiness
}

export interface ProgressionPattern {
  weeklyProgressionRate: number // % improvement per week
  plateauPeriods: { start: Date; end: Date; duration: number }[]
  breakthroughWorkouts: { date: Date; description: string }[]
  sustainableLoadIncrease: number // % that doesn't cause overtraining
}

/**
 * Analyze training history to extract patterns
 */
export async function analyzeTrainingPatterns(
  clientId: string,
  lookbackWeeks: number = 12,
  locale: AppLocale = 'en'
): Promise<TrainingPattern[]> {
  const patterns: TrainingPattern[] = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - lookbackWeeks * 7)

  // Fetch training data
  const [workoutLogs, checkIns, trainingLoads] = await Promise.all([
    prisma.workoutLog.findMany({
      where: {
        athleteId: clientId,
        completedAt: { gte: startDate },
      },
      orderBy: { completedAt: 'asc' },
    }),
    prisma.dailyCheckIn.findMany({
      where: {
        clientId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    }),
  ])

  if (workoutLogs.length < 10) {
    return [{
      type: 'weekly_volume',
      description: t(locale, 'Insufficient data for pattern analysis', 'Otillräcklig data för mönsteranalys'),
      confidence: 0,
      data: { workoutsLogged: workoutLogs.length, minimumRequired: 10 },
      insights: [t(locale, 'At least 10 logged workouts are needed for pattern analysis', 'Behöver minst 10 loggade pass för mönsteranalys')],
      recommendations: [t(locale, 'Keep logging workouts to unlock better insights', 'Fortsätt logga pass för att få bättre insikter')],
    }]
  }

  // Analyze volume patterns
  const volumePattern = analyzeVolumePattern(workoutLogs, lookbackWeeks)
  if (volumePattern) {
    patterns.push({
      type: 'weekly_volume',
      description: t(locale, 'Weekly volume pattern', 'Veckovolym-mönster'),
      confidence: calculateConfidence(workoutLogs.length, lookbackWeeks),
      data: volumePattern,
      insights: generateVolumeInsights(volumePattern, locale),
      recommendations: generateVolumeRecommendations(volumePattern, locale),
    })
  }

  // Analyze intensity distribution
  const intensityPattern = analyzeIntensityPattern(workoutLogs)
  if (intensityPattern) {
    patterns.push({
      type: 'intensity_distribution',
      description: t(locale, 'Intensity distribution', 'Intensitetsfördelning'),
      confidence: calculateConfidence(workoutLogs.length, lookbackWeeks),
      data: intensityPattern,
      insights: generateIntensityInsights(intensityPattern, locale),
      recommendations: generateIntensityRecommendations(intensityPattern, locale),
    })
  }

  // Analyze recovery patterns
  const recoveryPattern = analyzeRecoveryPattern(checkIns, workoutLogs, locale)
  if (recoveryPattern) {
    patterns.push({
      type: 'recovery_pattern',
      description: t(locale, 'Recovery pattern', 'Återhämtningsmönster'),
      confidence: calculateConfidence(checkIns.length, lookbackWeeks),
      data: recoveryPattern,
      insights: generateRecoveryInsights(recoveryPattern, locale),
      recommendations: generateRecoveryRecommendations(recoveryPattern, locale),
    })
  }

  // Analyze progression rate
  const progressionPattern = analyzeProgressionPattern(workoutLogs, trainingLoads, locale)
  if (progressionPattern) {
    patterns.push({
      type: 'progression_rate',
      description: t(locale, 'Progression pattern', 'Progressionsmönster'),
      confidence: calculateConfidence(workoutLogs.length, lookbackWeeks),
      data: progressionPattern,
      insights: generateProgressionInsights(progressionPattern, locale),
      recommendations: generateProgressionRecommendations(progressionPattern, locale),
    })
  }

  return patterns
}

function analyzeVolumePattern(
  workoutLogs: { completedAt: Date | null; duration: number | null; distance: number | null }[],
  _lookbackWeeks: number
): VolumePattern | null {
  const weeklyVolumes: Map<number, number> = new Map()

  workoutLogs.forEach(log => {
    if (!log.completedAt || !log.duration) return

    const weekNum = getWeekNumber(log.completedAt)
    const current = weeklyVolumes.get(weekNum) || 0
    // Use distance if available, otherwise estimate from duration
    const volume = log.distance || (log.duration / 60) * 10 // rough km estimate
    weeklyVolumes.set(weekNum, current + volume)
  })

  const volumes = Array.from(weeklyVolumes.values())
  if (volumes.length < 3) return null

  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
  const variance = volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length
  const stdDev = Math.sqrt(variance)
  const cv = stdDev / avgVolume

  // Determine trend using linear regression
  const trend = calculateTrend(volumes)

  return {
    averageWeeklyVolume: Math.round(avgVolume * 10) / 10,
    volumeVariability: Math.round(cv * 100) / 100,
    peakVolume: Math.max(...volumes),
    lowVolume: Math.min(...volumes),
    trend,
    weeklyDistribution: Array.from(weeklyVolumes.entries()).map(([week, volume]) => ({
      week,
      volume: Math.round(volume * 10) / 10,
    })),
  }
}

function analyzeIntensityPattern(
  workoutLogs: { perceivedEffort: number | null; avgHR: number | null; maxHR: number | null }[]
): IntensityPattern | null {
  const effortCounts = { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 }
  let totalWorkouts = 0

  workoutLogs.forEach(log => {
    if (!log.perceivedEffort) return
    totalWorkouts++

    // Map RPE to zones (1-2=Z1, 3-4=Z2, 5-6=Z3, 7-8=Z4, 9-10=Z5)
    if (log.perceivedEffort <= 2) effortCounts.zone1++
    else if (log.perceivedEffort <= 4) effortCounts.zone2++
    else if (log.perceivedEffort <= 6) effortCounts.zone3++
    else if (log.perceivedEffort <= 8) effortCounts.zone4++
    else effortCounts.zone5++
  })

  if (totalWorkouts < 5) return null

  const z1Pct = (effortCounts.zone1 / totalWorkouts) * 100
  const z2Pct = (effortCounts.zone2 / totalWorkouts) * 100
  const z3Pct = (effortCounts.zone3 / totalWorkouts) * 100
  const z4Pct = (effortCounts.zone4 / totalWorkouts) * 100
  const z5Pct = (effortCounts.zone5 / totalWorkouts) * 100

  // Polarization index: higher means more training in Z1-2 and Z4-5, less in Z3
  const easyHard = z1Pct + z2Pct + z4Pct + z5Pct
  const threshold = z3Pct
  const polarizationIndex = Math.min(1, easyHard / (easyHard + threshold * 2))

  // Determine recommendation
  let recommendation: 'more_easy' | 'more_intensity' | 'well_balanced'
  if (z1Pct + z2Pct < 70) {
    recommendation = 'more_easy'
  } else if (z4Pct + z5Pct < 10) {
    recommendation = 'more_intensity'
  } else {
    recommendation = 'well_balanced'
  }

  return {
    zone1Percent: Math.round(z1Pct),
    zone2Percent: Math.round(z2Pct),
    zone3Percent: Math.round(z3Pct),
    zone4Percent: Math.round(z4Pct),
    zone5Percent: Math.round(z5Pct),
    polarizationIndex: Math.round(polarizationIndex * 100) / 100,
    recommendation,
  }
}

function analyzeRecoveryPattern(
  checkIns: { date: Date; readinessScore: number | null; sleepQuality: number; sleepHours: number | null; soreness: number; fatigue: number }[],
  workoutLogs: { completedAt: Date | null; perceivedEffort: number | null }[],
  locale: AppLocale = 'en'
): RecoveryPattern | null {
  if (checkIns.length < 7) return null

  // Calculate how readiness drops after hard workouts
  const hardWorkouts = workoutLogs.filter(w => w.perceivedEffort && w.perceivedEffort >= 7)
  let totalRecoveryDays = 0
  let recoveryMeasurements = 0

  hardWorkouts.forEach(workout => {
    if (!workout.completedAt) return

    // Find check-ins after this workout
    const postWorkoutCheckIns = checkIns.filter(c => {
      const diffDays = Math.floor((c.date.getTime() - workout.completedAt!.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays > 0 && diffDays <= 5
    })

    // Find when readiness returns to baseline (70+)
    for (let i = 0; i < postWorkoutCheckIns.length; i++) {
      if ((postWorkoutCheckIns[i].readinessScore || 70) >= 70) {
        totalRecoveryDays += i + 1
        recoveryMeasurements++
        break
      }
    }
  })

  const avgRecoveryTime = recoveryMeasurements > 0
    ? totalRecoveryDays / recoveryMeasurements
    : 2 // default

  // Calculate sleep impact on readiness
  const sleepReadinessCorrelation = calculateCorrelation(
    checkIns.map(c => c.sleepQuality),
    checkIns.map(c => c.readinessScore || 70)
  )

  return {
    averageRecoveryTime: Math.round(avgRecoveryTime * 10) / 10,
    factorsAffectingRecovery: [
      { factor: t(locale, 'Sleep quality', 'Sömnkvalitet'), impact: sleepReadinessCorrelation, confidence: 0.8 },
      { factor: t(locale, 'Sleep hours', 'Sömntimmar'), impact: 0.6, confidence: 0.7 },
      { factor: t(locale, 'Training intensity', 'Träningsintensitet'), impact: -0.5, confidence: 0.75 },
    ],
    optimalRestDays: Math.round(avgRecoveryTime),
    sleepImpact: Math.round(sleepReadinessCorrelation * 100) / 100,
  }
}

function analyzeProgressionPattern(
  workoutLogs: { completedAt: Date | null; avgPace: string | null; duration: number | null }[],
  trainingLoads: { date: Date; acwr: number | null }[],
  locale: AppLocale = 'en'
): ProgressionPattern | null {
  if (workoutLogs.length < 10) return null

  // Parse paces to seconds for comparison
  const pacedWorkouts = workoutLogs
    .filter(w => w.avgPace && w.completedAt)
    .map(w => ({
      date: w.completedAt!,
      paceSeconds: parsePaceToSeconds(w.avgPace!),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  if (pacedWorkouts.length < 5) return null

  // Calculate weekly progression rate
  const weeklyPaces: Map<number, number[]> = new Map()
  pacedWorkouts.forEach(w => {
    const week = getWeekNumber(w.date)
    const current = weeklyPaces.get(week) || []
    current.push(w.paceSeconds)
    weeklyPaces.set(week, current)
  })

  const weeklyAvgPaces = Array.from(weeklyPaces.entries())
    .map(([week, paces]) => ({
      week,
      avgPace: paces.reduce((a, b) => a + b, 0) / paces.length,
    }))
    .sort((a, b) => a.week - b.week)

  // Calculate progression rate (negative = faster = improving)
  let progressionRate = 0
  if (weeklyAvgPaces.length >= 2) {
    const firstPace = weeklyAvgPaces[0].avgPace
    const lastPace = weeklyAvgPaces[weeklyAvgPaces.length - 1].avgPace
    const weeks = weeklyAvgPaces.length
    progressionRate = ((firstPace - lastPace) / firstPace) * 100 / weeks
  }

  // Find plateau periods (weeks with <1% improvement)
  const plateauPeriods: { start: Date; end: Date; duration: number }[] = []
  // Simplified plateau detection

  // Identify breakthrough workouts (significantly better than average)
  const avgPace = pacedWorkouts.reduce((sum, w) => sum + w.paceSeconds, 0) / pacedWorkouts.length
  const breakthroughWorkouts = pacedWorkouts
    .filter(w => w.paceSeconds < avgPace * 0.95) // 5%+ faster than average
    .slice(0, 5)
    .map(w => ({
      date: w.date,
      description: t(
        locale,
        `${formatSecondsToMinSec(w.paceSeconds)}/km (${Math.round((1 - w.paceSeconds / avgPace) * 100)}% faster than average)`,
        `${formatSecondsToMinSec(w.paceSeconds)}/km (${Math.round((1 - w.paceSeconds / avgPace) * 100)}% snabbare än genomsnitt)`
      ),
    }))

  // Calculate sustainable load increase from ACWR
  const sustainableIncrease = trainingLoads.length > 0
    ? trainingLoads.filter(t => t.acwr && t.acwr <= 1.3).length / trainingLoads.length * 15
    : 10

  return {
    weeklyProgressionRate: Math.round(progressionRate * 100) / 100,
    plateauPeriods,
    breakthroughWorkouts,
    sustainableLoadIncrease: Math.round(sustainableIncrease),
  }
}

// Helper functions
function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function calculateTrend(values: number[]): 'increasing' | 'stable' | 'decreasing' {
  if (values.length < 3) return 'stable'

  // Simple linear regression slope
  const n = values.length
  const sumX = (n * (n - 1)) / 2
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((sum, y, i) => sum + i * y, 0)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const avgValue = sumY / n
  const slopePercent = (slope / avgValue) * 100

  if (slopePercent > 2) return 'increasing'
  if (slopePercent < -2) return 'decreasing'
  return 'stable'
}

function calculateConfidence(dataPoints: number, weeks: number): number {
  // More data = higher confidence, max 0.95
  const pointsPerWeek = dataPoints / weeks
  return Math.min(0.95, 0.3 + (pointsPerWeek / 7) * 0.65)
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 3) return 0

  const avgX = x.reduce((a, b) => a + b, 0) / n
  const avgY = y.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let sumX2 = 0
  let sumY2 = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - avgX
    const dy = y[i] - avgY
    numerator += dx * dy
    sumX2 += dx * dx
    sumY2 += dy * dy
  }

  const denominator = Math.sqrt(sumX2 * sumY2)
  return denominator === 0 ? 0 : numerator / denominator
}

function parsePaceToSeconds(pace: string): number {
  // Parse "5:30/km" or "5:30" to seconds
  const match = pace.match(/(\d+):(\d+)/)
  if (!match) return 0
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

function formatSecondsToMinSec(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Insight generators
function generateVolumeInsights(pattern: VolumePattern, locale: AppLocale): string[] {
  const insights: string[] = []

  if (pattern.trend === 'increasing') {
    insights.push(t(locale, `Volume has increased steadily over the period (${pattern.averageWeeklyVolume} km/week on average)`, `Volymen har ökat stadigt över perioden (${pattern.averageWeeklyVolume} km/vecka i genomsnitt)`))
  } else if (pattern.trend === 'decreasing') {
    insights.push(t(locale, 'Volume has decreased during the period - check that this is planned', 'Volymen har minskat under perioden - kontrollera att detta är planerat'))
  }

  if (pattern.volumeVariability > 0.3) {
    insights.push(t(locale, `High weekly volume variation (CV: ${(pattern.volumeVariability * 100).toFixed(0)}%) - more consistent training is recommended`, `Hög variation i veckovolym (CV: ${(pattern.volumeVariability * 100).toFixed(0)}%) - mer konsekvent träning rekommenderas`))
  }

  const volumeRange = pattern.peakVolume - pattern.lowVolume
  if (volumeRange > pattern.averageWeeklyVolume * 0.5) {
    insights.push(t(locale, `Large gap between peak and low volume (${pattern.peakVolume.toFixed(0)} vs ${pattern.lowVolume.toFixed(0)} km)`, `Stor skillnad mellan topp- och lågvolym (${pattern.peakVolume.toFixed(0)} vs ${pattern.lowVolume.toFixed(0)} km)`))
  }

  return insights
}

function generateVolumeRecommendations(pattern: VolumePattern, locale: AppLocale): string[] {
  const recommendations: string[] = []

  if (pattern.volumeVariability > 0.3) {
    recommendations.push(t(locale, 'Aim for a maximum 10% volume increase per week for safe progression', 'Sikta på max 10% volymökning per vecka för säker progression'))
    recommendations.push(t(locale, 'Plan recovery weeks every 4th week with 20-30% reduced volume', 'Planera in återhämtningsveckor var 4:e vecka med 20-30% reducerad volym'))
  }

  if (pattern.trend === 'decreasing') {
    recommendations.push(t(locale, 'Review the reason for reduced volume - injury, overtraining, or planned rest?', 'Granska orsaken till minskad volym - skada, överträning, eller planerad vila?'))
  }

  return recommendations
}

function generateIntensityInsights(pattern: IntensityPattern, locale: AppLocale): string[] {
  const insights: string[] = []
  const easyPercent = pattern.zone1Percent + pattern.zone2Percent

  if (easyPercent >= 75 && easyPercent <= 85) {
    insights.push(t(locale, `Good intensity distribution with ${easyPercent}% low-intensity training`, `Bra intensitetsfördelning med ${easyPercent}% lågintensiv träning`))
  } else if (easyPercent < 70) {
    insights.push(t(locale, `Too little low-intensity training (${easyPercent}%) - risk of overtraining`, `För lite lågintensiv träning (${easyPercent}%) - risk för överträning`))
  }

  if (pattern.polarizationIndex >= 0.7) {
    insights.push(t(locale, 'High degree of polarized training - effective for endurance', 'Hög grad av polariserad träning - effektivt för uthållighet'))
  } else if (pattern.polarizationIndex < 0.5) {
    insights.push(t(locale, 'Low polarization - a lot of training in the "gray zone"', 'Låg polarisering - mycket träning i "grå zonen"'))
  }

  return insights
}

function generateIntensityRecommendations(pattern: IntensityPattern, locale: AppLocale): string[] {
  const recommendations: string[] = []

  if (pattern.recommendation === 'more_easy') {
    recommendations.push(t(locale, 'Increase low-intensity training (Z1-Z2) to 75-80%', 'Öka andelen lågintensiv träning (Z1-Z2) till 75-80%'))
    recommendations.push(t(locale, 'Replace medium-intensity sessions with either easy or hard sessions', 'Byt ut medelintensiva pass mot antingen lätta eller hårda pass'))
  } else if (pattern.recommendation === 'more_intensity') {
    recommendations.push(t(locale, 'Add 1-2 quality sessions per week (intervals or threshold tempo)', 'Lägg till 1-2 kvalitetspass per vecka (intervaller eller tröskeltempo)'))
  }

  if (pattern.zone3Percent > 25) {
    recommendations.push(t(locale, 'Reduce training in "no man\'s land" (Z3) - choose easier OR harder', 'Minska träning i "ingen mans land" (Z3) - välj lättare ELLER hårdare'))
  }

  return recommendations
}

function generateRecoveryInsights(pattern: RecoveryPattern, locale: AppLocale): string[] {
  const insights: string[] = []

  if (pattern.averageRecoveryTime > 3) {
    insights.push(t(locale, `Longer recovery time than average (${pattern.averageRecoveryTime.toFixed(1)} days)`, `Längre återhämtningstid än genomsnitt (${pattern.averageRecoveryTime.toFixed(1)} dagar)`))
  } else if (pattern.averageRecoveryTime < 2) {
    insights.push(t(locale, 'Fast recovery - good training adaptation', 'Snabb återhämtning - god träningsanpassning'))
  }

  if (pattern.sleepImpact > 0.5) {
    insights.push(t(locale, 'Strong link between sleep quality and performance readiness', 'Stark koppling mellan sömnkvalitet och prestationsberedskap'))
  }

  return insights
}

function generateRecoveryRecommendations(pattern: RecoveryPattern, locale: AppLocale): string[] {
  const recommendations: string[] = []

  if (pattern.sleepImpact > 0.4) {
    recommendations.push(t(locale, 'Prioritize sleep - it has a major impact on your recovery', 'Prioritera sömn - det har stor påverkan på din återhämtning'))
  }

  if (pattern.averageRecoveryTime > 3) {
    recommendations.push(t(locale, `Plan ${pattern.optimalRestDays} rest day(s) after hard sessions`, `Planera ${pattern.optimalRestDays} vilodag(ar) efter hårda pass`))
    recommendations.push(t(locale, 'Consider reducing the intensity of quality sessions', 'Överväg att minska intensiteten på kvalitetspass'))
  }

  return recommendations
}

function generateProgressionInsights(pattern: ProgressionPattern, locale: AppLocale): string[] {
  const insights: string[] = []

  if (pattern.weeklyProgressionRate > 0.5) {
    insights.push(t(locale, `Positive development with ${pattern.weeklyProgressionRate.toFixed(1)}% improvement per week`, `Positiv utveckling med ${pattern.weeklyProgressionRate.toFixed(1)}% förbättring per vecka`))
  } else if (pattern.weeklyProgressionRate < 0) {
    insights.push(t(locale, 'Performance has declined - the cause needs analysis', 'Prestationen har minskat - behöver analys av orsak'))
  }

  if (pattern.breakthroughWorkouts.length > 0) {
    insights.push(t(locale, `${pattern.breakthroughWorkouts.length} breakthrough workouts identified`, `${pattern.breakthroughWorkouts.length} genombrottspass identifierade`))
  }

  return insights
}

function generateProgressionRecommendations(pattern: ProgressionPattern, locale: AppLocale): string[] {
  const recommendations: string[] = []

  if (pattern.weeklyProgressionRate < 0.2) {
    recommendations.push(t(locale, 'Consider adjusting the training setup to break the plateau', 'Överväg att justera träningsupplägg för att bryta platå'))
    recommendations.push(t(locale, 'Add variety - new session types or a changed structure', 'Lägg till variation - nya typer av pass eller ändrad struktur'))
  }

  recommendations.push(t(locale, `Safe load increase: max ${pattern.sustainableLoadIncrease}% per week`, `Säker belastningsökning: max ${pattern.sustainableLoadIncrease}% per vecka`))

  return recommendations
}
