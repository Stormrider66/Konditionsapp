// lib/ai/advanced-intelligence/injury-risk-prediction.ts
// Injury risk prediction from load patterns and athlete data

import { prisma } from '@/lib/prisma'

export interface InjuryRiskAssessment {
  overallRisk: 'low' | 'moderate' | 'high' | 'very_high'
  riskScore: number // 0-100
  riskFactors: InjuryRiskFactor[]
  protectiveFactors: ProtectiveFactor[]
  recommendations: InjuryPreventionRecommendation[]
  loadAnalysis: LoadAnalysis
  historicalContext: HistoricalContext
  nextWeekPrediction: WeeklyRiskPrediction
}

export interface InjuryRiskFactor {
  name: string
  category: 'load' | 'recovery' | 'biomechanical' | 'lifestyle' | 'history'
  severity: 'low' | 'moderate' | 'high'
  currentValue: string
  thresholdValue: string
  contribution: number // 0-100 contribution to overall risk
  trend: 'improving' | 'stable' | 'worsening'
}

export interface ProtectiveFactor {
  name: string
  impact: number // 0-100
  description: string
}

export interface InjuryPreventionRecommendation {
  priority: 'immediate' | 'high' | 'medium' | 'low'
  action: string
  rationale: string
  timeframe: string
}

export interface LoadAnalysis {
  acwr: number // Acute:Chronic Workload Ratio
  acwrStatus: 'safe' | 'moderate' | 'risky' | 'dangerous'
  weeklyTSS: number
  monthlyTrend: 'increasing' | 'stable' | 'decreasing'
  loadSpikesLast4Weeks: number
  sustainableLoadRange: { min: number; max: number }
}

export interface HistoricalContext {
  previousInjuries: number
  daysSinceLastInjury: number | null
  injuryProneness: 'low' | 'moderate' | 'high'
  seasonalRiskPattern: string | null
  riskHistory: { week: number; score: number }[]
}

export interface WeeklyRiskPrediction {
  predictedRisk: 'low' | 'moderate' | 'high'
  confidence: number
  keyFactors: string[]
  preventiveActions: string[]
}

/**
 * Calculate comprehensive injury risk assessment
 */
export async function calculateInjuryRisk(clientId: string): Promise<InjuryRiskAssessment> {
  // Fetch all relevant data
  const [
    trainingLoads,
    checkIns,
    workoutLogs,
    injuryHistory,
    bodyComposition,
  ] = await Promise.all([
    prisma.trainingLoad.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 56, // 8 weeks
    }),
    prisma.dailyCheckIn.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 28, // 4 weeks
    }),
    prisma.workoutLog.findMany({
      where: { athleteId: clientId },
      orderBy: { completedAt: 'desc' },
      take: 30,
    }),
    prisma.injuryAssessment.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.bodyComposition.findFirst({
      where: { clientId },
      orderBy: { measurementDate: 'desc' },
    }),
  ])

  // Calculate load analysis
  const loadAnalysis = analyzeLoadPatterns(trainingLoads)

  // Identify risk factors
  const riskFactors = identifyRiskFactors(trainingLoads, checkIns, workoutLogs, loadAnalysis)

  // Identify protective factors
  const protectiveFactors = identifyProtectiveFactors(checkIns, workoutLogs, bodyComposition)

  // Calculate historical context
  const historicalContext = analyzeHistoricalContext(injuryHistory, trainingLoads)

  // Calculate overall risk score
  const { overallRisk, riskScore } = calculateOverallRisk(riskFactors, protectiveFactors, loadAnalysis)

  // Generate recommendations
  const recommendations = generatePreventionRecommendations(riskFactors, loadAnalysis, overallRisk)

  // Predict next week risk
  const nextWeekPrediction = predictNextWeekRisk(loadAnalysis, riskFactors, checkIns)

  return {
    overallRisk,
    riskScore,
    riskFactors,
    protectiveFactors,
    recommendations,
    loadAnalysis,
    historicalContext,
    nextWeekPrediction,
  }
}

function analyzeLoadPatterns(
  trainingLoads: { date: Date; dailyLoad: number; acwr: number | null }[]
): LoadAnalysis {
  // Calculate ACWR (Acute:Chronic Workload Ratio)
  const recentLoads = trainingLoads.slice(0, 7)
  const chronicLoads = trainingLoads.slice(0, 28)

  const acuteLoad = recentLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / 7
  const chronicLoad = chronicLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / 28

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0

  // Determine ACWR status (Gabbett 2016 - "sweet spot" is 0.8-1.3)
  let acwrStatus: LoadAnalysis['acwrStatus'] = 'safe'
  if (acwr > 1.5) acwrStatus = 'dangerous'
  else if (acwr > 1.3) acwrStatus = 'risky'
  else if (acwr > 1.1 || acwr < 0.8) acwrStatus = 'moderate'

  // Calculate weekly TSS
  const weeklyTSS = recentLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0)

  // Analyze monthly trend
  const firstHalf = trainingLoads.slice(14, 28)
  const secondHalf = trainingLoads.slice(0, 14)
  const firstAvg = firstHalf.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / secondHalf.length

  let monthlyTrend: LoadAnalysis['monthlyTrend'] = 'stable'
  if (secondAvg > firstAvg * 1.1) monthlyTrend = 'increasing'
  else if (secondAvg < firstAvg * 0.9) monthlyTrend = 'decreasing'

  // Count load spikes (>25% week-over-week increase)
  let loadSpikes = 0
  for (let i = 0; i < 4; i++) {
    const weekStart = i * 7
    const weekEnd = (i + 1) * 7
    const prevWeekStart = (i + 1) * 7
    const prevWeekEnd = (i + 2) * 7

    const thisWeek = trainingLoads.slice(weekStart, weekEnd).reduce((sum, l) => sum + (l.dailyLoad || 0), 0)
    const prevWeek = trainingLoads.slice(prevWeekStart, prevWeekEnd).reduce((sum, l) => sum + (l.dailyLoad || 0), 0)

    if (prevWeek > 0 && thisWeek > prevWeek * 1.25) {
      loadSpikes++
    }
  }

  // Calculate sustainable load range (based on chronic load)
  const sustainableMin = chronicLoad * 0.85 * 7
  const sustainableMax = chronicLoad * 1.1 * 7

  return {
    acwr: Math.round(acwr * 100) / 100,
    acwrStatus,
    weeklyTSS: Math.round(weeklyTSS),
    monthlyTrend,
    loadSpikesLast4Weeks: loadSpikes,
    sustainableLoadRange: {
      min: Math.round(sustainableMin),
      max: Math.round(sustainableMax),
    },
  }
}

function identifyRiskFactors(
  trainingLoads: { dailyLoad: number; acwr: number | null }[],
  checkIns: { fatigue: number; soreness: number; sleepQuality: number; readinessScore: number | null }[],
  workoutLogs: { perceivedEffort: number | null }[],
  loadAnalysis: LoadAnalysis
): InjuryRiskFactor[] {
  const factors: InjuryRiskFactor[] = []

  // ACWR Risk
  if (loadAnalysis.acwr > 1.0) {
    const severity = loadAnalysis.acwrStatus === 'dangerous' ? 'high' :
      loadAnalysis.acwrStatus === 'risky' ? 'moderate' : 'low'

    factors.push({
      name: 'ACWR (Belastningskvot)',
      category: 'load',
      severity,
      currentValue: loadAnalysis.acwr.toFixed(2),
      thresholdValue: '< 1.30',
      contribution: loadAnalysis.acwr > 1.5 ? 35 : loadAnalysis.acwr > 1.3 ? 25 : 10,
      trend: loadAnalysis.monthlyTrend === 'increasing' ? 'worsening' :
        loadAnalysis.monthlyTrend === 'decreasing' ? 'improving' : 'stable',
    })
  }

  // Load spike risk
  if (loadAnalysis.loadSpikesLast4Weeks > 0) {
    factors.push({
      name: 'Belastningstoppar',
      category: 'load',
      severity: loadAnalysis.loadSpikesLast4Weeks >= 2 ? 'high' : 'moderate',
      currentValue: `${loadAnalysis.loadSpikesLast4Weeks} toppar senaste 4 v`,
      thresholdValue: '0 toppar',
      contribution: loadAnalysis.loadSpikesLast4Weeks * 10,
      trend: 'worsening',
    })
  }

  // Fatigue accumulation
  const avgFatigue = checkIns.reduce((sum, c) => sum + c.fatigue, 0) / checkIns.length || 5
  if (avgFatigue > 6) {
    factors.push({
      name: 'Ackumulerad trötthet',
      category: 'recovery',
      severity: avgFatigue > 7.5 ? 'high' : 'moderate',
      currentValue: `${avgFatigue.toFixed(1)}/10`,
      thresholdValue: '< 6/10',
      contribution: (avgFatigue - 5) * 5,
      trend: calculateTrend(checkIns.slice(0, 7).map(c => c.fatigue), checkIns.slice(7, 14).map(c => c.fatigue)),
    })
  }

  // Soreness accumulation
  const avgSoreness = checkIns.reduce((sum, c) => sum + c.soreness, 0) / checkIns.length || 5
  if (avgSoreness > 6) {
    factors.push({
      name: 'Muskelömhet',
      category: 'recovery',
      severity: avgSoreness > 7.5 ? 'high' : 'moderate',
      currentValue: `${avgSoreness.toFixed(1)}/10`,
      thresholdValue: '< 6/10',
      contribution: (avgSoreness - 5) * 4,
      trend: calculateTrend(checkIns.slice(0, 7).map(c => c.soreness), checkIns.slice(7, 14).map(c => c.soreness)),
    })
  }

  // Sleep deficit
  const avgSleep = checkIns.reduce((sum, c) => sum + c.sleepQuality, 0) / checkIns.length || 6
  if (avgSleep < 6) {
    factors.push({
      name: 'Sömnbrist',
      category: 'lifestyle',
      severity: avgSleep < 5 ? 'high' : 'moderate',
      currentValue: `${avgSleep.toFixed(1)}/10 kvalitet`,
      thresholdValue: '> 6/10',
      contribution: (7 - avgSleep) * 5,
      trend: calculateTrend(checkIns.slice(0, 7).map(c => c.sleepQuality), checkIns.slice(7, 14).map(c => c.sleepQuality)),
    })
  }

  // Low readiness
  const avgReadiness = checkIns
    .filter(c => c.readinessScore)
    .reduce((sum, c) => sum + (c.readinessScore || 70), 0) /
    checkIns.filter(c => c.readinessScore).length || 70

  if (avgReadiness < 60) {
    factors.push({
      name: 'Låg träningsberedskap',
      category: 'recovery',
      severity: avgReadiness < 50 ? 'high' : 'moderate',
      currentValue: `${avgReadiness.toFixed(0)}%`,
      thresholdValue: '> 60%',
      contribution: (70 - avgReadiness) / 2,
      trend: 'stable',
    })
  }

  // High RPE consistently
  const avgRPE = workoutLogs
    .filter(w => w.perceivedEffort)
    .reduce((sum, w) => sum + (w.perceivedEffort || 5), 0) /
    workoutLogs.filter(w => w.perceivedEffort).length || 5

  if (avgRPE > 7.5) {
    factors.push({
      name: 'Hög upplevd ansträngning',
      category: 'load',
      severity: avgRPE > 8.5 ? 'high' : 'moderate',
      currentValue: `${avgRPE.toFixed(1)}/10 RPE`,
      thresholdValue: '< 7.5/10',
      contribution: (avgRPE - 6) * 4,
      trend: 'stable',
    })
  }

  return factors
}

function identifyProtectiveFactors(
  checkIns: { sleepQuality: number; readinessScore: number | null }[],
  workoutLogs: { completed: boolean }[],
  bodyComposition: { weightKg: number | null; muscleMassKg: number | null } | null
): ProtectiveFactor[] {
  const factors: ProtectiveFactor[] = []

  // Good sleep
  const avgSleep = checkIns.reduce((sum, c) => sum + c.sleepQuality, 0) / checkIns.length || 5
  if (avgSleep >= 7) {
    factors.push({
      name: 'God sömnkvalitet',
      impact: 15,
      description: `Genomsnittlig sömnkvalitet ${avgSleep.toFixed(1)}/10`,
    })
  }

  // High readiness
  const avgReadiness = checkIns
    .filter(c => c.readinessScore)
    .reduce((sum, c) => sum + (c.readinessScore || 70), 0) /
    checkIns.filter(c => c.readinessScore).length || 70

  if (avgReadiness >= 75) {
    factors.push({
      name: 'Hög träningsberedskap',
      impact: 15,
      description: `Genomsnittlig beredskap ${avgReadiness.toFixed(0)}%`,
    })
  }

  // Consistent training
  const completionRate = workoutLogs.filter(w => w.completed).length / workoutLogs.length * 100
  if (completionRate >= 85) {
    factors.push({
      name: 'Konsekvent träning',
      impact: 10,
      description: `${completionRate.toFixed(0)}% genomförda pass`,
    })
  }

  // Good muscle mass (if available)
  if (bodyComposition?.muscleMassKg && bodyComposition?.weightKg) {
    const musclePercent = (bodyComposition.muscleMassKg / bodyComposition.weightKg) * 100
    if (musclePercent > 40) {
      factors.push({
        name: 'God muskelmassa',
        impact: 10,
        description: `${musclePercent.toFixed(1)}% muskelmassa`,
      })
    }
  }

  return factors
}

function analyzeHistoricalContext(
  injuryHistory: { date: Date; injuryType: string | null }[],
  trainingLoads: { date: Date; dailyLoad: number }[]
): HistoricalContext {
  const previousInjuries = injuryHistory.length

  // Days since last injury
  let daysSinceLastInjury: number | null = null
  if (injuryHistory.length > 0) {
    const lastInjury = injuryHistory[0]
    daysSinceLastInjury = Math.floor(
      (new Date().getTime() - new Date(lastInjury.date).getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  // Injury proneness
  let injuryProneness: HistoricalContext['injuryProneness'] = 'low'
  if (previousInjuries >= 3 || (daysSinceLastInjury && daysSinceLastInjury < 90)) {
    injuryProneness = 'high'
  } else if (previousInjuries >= 1) {
    injuryProneness = 'moderate'
  }

  // Calculate historical risk scores (simplified)
  const riskHistory: { week: number; score: number }[] = []
  for (let i = 0; i < 8; i++) {
    const weekLoads = trainingLoads.slice(i * 7, (i + 1) * 7)
    const weeklyTSS = weekLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0)
    const baseScore = 30 + (weeklyTSS / 50) // Simple score based on TSS
    riskHistory.push({
      week: 8 - i,
      score: Math.min(100, Math.round(baseScore)),
    })
  }

  return {
    previousInjuries,
    daysSinceLastInjury,
    injuryProneness,
    seasonalRiskPattern: null, // Could analyze seasonal patterns if more data
    riskHistory: riskHistory.reverse(),
  }
}

function calculateOverallRisk(
  riskFactors: InjuryRiskFactor[],
  protectiveFactors: ProtectiveFactor[],
  loadAnalysis: LoadAnalysis
): { overallRisk: InjuryRiskAssessment['overallRisk']; riskScore: number } {
  // Sum risk contributions
  const totalRisk = riskFactors.reduce((sum, f) => sum + f.contribution, 0)

  // Sum protective contributions
  const totalProtection = protectiveFactors.reduce((sum, f) => sum + f.impact, 0)

  // Base score from ACWR
  let baseScore = 20
  if (loadAnalysis.acwrStatus === 'dangerous') baseScore = 60
  else if (loadAnalysis.acwrStatus === 'risky') baseScore = 45
  else if (loadAnalysis.acwrStatus === 'moderate') baseScore = 30

  // Calculate final score
  let riskScore = baseScore + totalRisk - totalProtection
  riskScore = Math.max(0, Math.min(100, riskScore))

  // Determine risk level
  let overallRisk: InjuryRiskAssessment['overallRisk'] = 'low'
  if (riskScore >= 70) overallRisk = 'very_high'
  else if (riskScore >= 50) overallRisk = 'high'
  else if (riskScore >= 30) overallRisk = 'moderate'

  return { overallRisk, riskScore: Math.round(riskScore) }
}

function generatePreventionRecommendations(
  riskFactors: InjuryRiskFactor[],
  loadAnalysis: LoadAnalysis,
  overallRisk: InjuryRiskAssessment['overallRisk']
): InjuryPreventionRecommendation[] {
  const recommendations: InjuryPreventionRecommendation[] = []

  // Immediate actions for very high risk
  if (overallRisk === 'very_high') {
    recommendations.push({
      priority: 'immediate',
      action: 'Reducera träningsvolym med 40-50%',
      rationale: 'Mycket hög skaderisk kräver omedelbar belastningsreduktion',
      timeframe: 'Omedelbart - nästa 7 dagar',
    })
  }

  // ACWR-based recommendations
  if (loadAnalysis.acwrStatus === 'dangerous' || loadAnalysis.acwrStatus === 'risky') {
    recommendations.push({
      priority: 'immediate',
      action: `Minska veckobelastning till ${loadAnalysis.sustainableLoadRange.min}-${loadAnalysis.sustainableLoadRange.max} TSS`,
      rationale: `ACWR på ${loadAnalysis.acwr} indikerar förhöjd skaderisk`,
      timeframe: 'Denna vecka',
    })
  }

  // Factor-specific recommendations
  riskFactors.forEach(factor => {
    if (factor.severity === 'high') {
      if (factor.category === 'recovery') {
        recommendations.push({
          priority: 'high',
          action: factor.name === 'Sömnbrist'
            ? 'Prioritera 8+ timmar sömn per natt'
            : 'Lägg till extra vilodag per vecka',
          rationale: factor.name,
          timeframe: 'Omedelbart',
        })
      } else if (factor.category === 'load') {
        recommendations.push({
          priority: 'high',
          action: 'Undvik belastningsökningar > 10% per vecka',
          rationale: factor.name,
          timeframe: 'Pågående',
        })
      }
    }
  })

  // General preventive recommendations
  if (loadAnalysis.loadSpikesLast4Weeks > 0) {
    recommendations.push({
      priority: 'medium',
      action: 'Planera gradvis belastningsökning med 10% regel',
      rationale: `${loadAnalysis.loadSpikesLast4Weeks} belastningstoppar senaste 4 veckorna`,
      timeframe: 'Planering för kommande veckor',
    })
  }

  // Always recommend strength training
  recommendations.push({
    priority: 'low',
    action: 'Inkludera 2x styrketräning/vecka för skadeprevention',
    rationale: 'Stärker muskulatur och senor för ökad belastningstolerans',
    timeframe: 'Pågående',
  })

  return recommendations.sort((a, b) => {
    const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

function predictNextWeekRisk(
  loadAnalysis: LoadAnalysis,
  riskFactors: InjuryRiskFactor[],
  checkIns: { readinessScore: number | null }[]
): WeeklyRiskPrediction {
  // Predict based on current state and trends
  const worseningFactors = riskFactors.filter(f => f.trend === 'worsening')
  const highSeverityFactors = riskFactors.filter(f => f.severity === 'high')

  // Base prediction on current ACWR status
  let predictedRisk: WeeklyRiskPrediction['predictedRisk'] = 'low'
  if (loadAnalysis.acwrStatus === 'dangerous' || highSeverityFactors.length >= 2) {
    predictedRisk = 'high'
  } else if (loadAnalysis.acwrStatus === 'risky' || highSeverityFactors.length >= 1 || worseningFactors.length >= 2) {
    predictedRisk = 'moderate'
  }

  // Confidence based on data availability
  const confidence = Math.min(0.9, 0.5 + checkIns.length * 0.02)

  // Key factors for the prediction
  const keyFactors = riskFactors
    .filter(f => f.severity !== 'low')
    .slice(0, 3)
    .map(f => f.name)

  // Preventive actions
  const preventiveActions: string[] = []
  if (predictedRisk === 'high') {
    preventiveActions.push('Reducera planerad belastning med 20-30%')
    preventiveActions.push('Prioritera vila och återhämtning')
  } else if (predictedRisk === 'moderate') {
    preventiveActions.push('Undvik intensitetsökning')
    preventiveActions.push('Lägg till extra uppvärmning')
  }
  preventiveActions.push('Monitorera daglig beredskap')

  return {
    predictedRisk,
    confidence: Math.round(confidence * 100) / 100,
    keyFactors,
    preventiveActions,
  }
}

function calculateTrend(
  recent: number[],
  older: number[]
): 'improving' | 'stable' | 'worsening' {
  if (recent.length === 0 || older.length === 0) return 'stable'

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

  // For metrics where lower is better (fatigue, soreness)
  if (recentAvg < olderAvg - 0.5) return 'improving'
  if (recentAvg > olderAvg + 0.5) return 'worsening'
  return 'stable'
}
