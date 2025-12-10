// lib/ai/advanced-intelligence/periodization-adjustments.ts
// Automatic periodization adjustments based on training response

import { prisma } from '@/lib/prisma'

export interface PeriodizationAdjustment {
  type: 'volume' | 'intensity' | 'frequency' | 'recovery' | 'phase'
  urgency: 'immediate' | 'soon' | 'planned'
  currentValue: string
  recommendedValue: string
  rationale: string
  confidence: number
  triggers: string[]
}

export interface PeriodizationAnalysis {
  currentPhase: TrainingPhase
  recommendedPhase: TrainingPhase | null
  phaseProgress: number // 0-100%
  adjustments: PeriodizationAdjustment[]
  warnings: PeriodizationWarning[]
  weeklyPlan: WeeklyAdjustment[]
}

export interface TrainingPhase {
  name: 'BASE' | 'BUILD' | 'PEAK' | 'RACE' | 'RECOVERY'
  weekNumber: number
  totalWeeks: number
  focus: string
  targetVolume: number
  targetIntensity: number
}

export interface PeriodizationWarning {
  type: 'overtraining' | 'undertraining' | 'imbalance' | 'plateau' | 'injury_risk'
  severity: 'low' | 'medium' | 'high'
  message: string
  action: string
}

export interface WeeklyAdjustment {
  weekNumber: number
  volumeChange: number // percentage
  intensityChange: number // percentage
  keyWorkouts: string[]
  focus: string
}

/**
 * Analyze current periodization and recommend adjustments
 */
export async function analyzePeriodization(
  clientId: string,
  programId?: string
): Promise<PeriodizationAnalysis> {
  // Fetch training data
  const [
    trainingLoads,
    workoutLogs,
    checkIns,
    fieldTests,
    program,
  ] = await Promise.all([
    prisma.trainingLoad.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 42, // 6 weeks
    }),
    prisma.workoutLog.findMany({
      where: { athleteId: clientId, completed: true },
      orderBy: { completedAt: 'desc' },
      take: 30,
    }),
    prisma.dailyCheckIn.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 21,
    }),
    prisma.fieldTest.findMany({
      where: { clientId, valid: true },
      orderBy: { date: 'desc' },
      take: 3,
    }),
    programId
      ? prisma.trainingProgram.findUnique({
          where: { id: programId },
          include: { weeks: true },
        })
      : null,
  ])

  // Determine current phase from program or infer
  const currentPhase = determineCurrentPhase(program, workoutLogs, trainingLoads)

  // Analyze response to training
  const responseAnalysis = analyzeTrainingResponse(workoutLogs, checkIns, trainingLoads)

  // Generate adjustments based on analysis
  const adjustments = generateAdjustments(currentPhase, responseAnalysis, trainingLoads)

  // Check for warnings
  const warnings = detectWarnings(trainingLoads, checkIns, responseAnalysis)

  // Generate weekly plan adjustments
  const weeklyPlan = generateWeeklyPlan(currentPhase, adjustments, responseAnalysis)

  // Determine if phase change is needed
  const recommendedPhase = shouldChangePhase(currentPhase, responseAnalysis, fieldTests)

  return {
    currentPhase,
    recommendedPhase,
    phaseProgress: calculatePhaseProgress(currentPhase),
    adjustments,
    warnings,
    weeklyPlan,
  }
}

interface TrainingResponse {
  volumeTolerance: 'good' | 'struggling' | 'under-stimulated'
  intensityResponse: 'positive' | 'neutral' | 'negative'
  recoveryRate: 'fast' | 'normal' | 'slow'
  performanceTrend: 'improving' | 'stable' | 'declining'
  fatigueLevel: 'low' | 'moderate' | 'high'
  readinessAverage: number
  acwrStatus: 'safe' | 'moderate' | 'risky'
}

function determineCurrentPhase(
  program: { weeks: { weekNumber: number; focus: string | null }[] } | null,
  workoutLogs: { duration: number | null; perceivedEffort: number | null }[],
  trainingLoads: { dailyLoad: number }[]
): TrainingPhase {
  // Try to get from program
  if (program && program.weeks.length > 0) {
    const currentWeek = program.weeks[0] // Most recent
    const focus = (currentWeek.focus || 'base').toLowerCase()

    let phase: TrainingPhase['name'] = 'BASE'
    if (focus.includes('build') || focus.includes('styrka')) phase = 'BUILD'
    else if (focus.includes('peak') || focus.includes('topp')) phase = 'PEAK'
    else if (focus.includes('race') || focus.includes('tävling')) phase = 'RACE'
    else if (focus.includes('recovery') || focus.includes('vila')) phase = 'RECOVERY'

    return {
      name: phase,
      weekNumber: currentWeek.weekNumber,
      totalWeeks: program.weeks.length,
      focus: currentWeek.focus || 'Aerob bas',
      targetVolume: calculateTargetVolume(phase),
      targetIntensity: calculateTargetIntensity(phase),
    }
  }

  // Infer from training pattern
  const avgIntensity = workoutLogs
    .filter(w => w.perceivedEffort)
    .reduce((sum, w) => sum + (w.perceivedEffort || 5), 0) /
    workoutLogs.filter(w => w.perceivedEffort).length || 5

  const avgTSS = trainingLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / trainingLoads.length

  let inferredPhase: TrainingPhase['name'] = 'BASE'
  if (avgIntensity > 7 && avgTSS > 500) inferredPhase = 'PEAK'
  else if (avgIntensity > 6 && avgTSS > 400) inferredPhase = 'BUILD'
  else if (avgIntensity < 4 || avgTSS < 200) inferredPhase = 'RECOVERY'

  return {
    name: inferredPhase,
    weekNumber: 1,
    totalWeeks: 12,
    focus: getPhaseDescription(inferredPhase),
    targetVolume: calculateTargetVolume(inferredPhase),
    targetIntensity: calculateTargetIntensity(inferredPhase),
  }
}

function analyzeTrainingResponse(
  workoutLogs: { perceivedEffort: number | null; completed: boolean }[],
  checkIns: { readinessScore: number | null; fatigue: number; soreness: number }[],
  trainingLoads: { dailyLoad: number; acwr: number | null }[]
): TrainingResponse {
  // Volume tolerance
  const avgRPE = workoutLogs
    .filter(w => w.perceivedEffort)
    .reduce((sum, w) => sum + (w.perceivedEffort || 5), 0) /
    workoutLogs.filter(w => w.perceivedEffort).length || 5

  let volumeTolerance: TrainingResponse['volumeTolerance'] = 'good'
  if (avgRPE > 7.5) volumeTolerance = 'struggling'
  else if (avgRPE < 4) volumeTolerance = 'under-stimulated'

  // Recovery rate
  const avgFatigue = checkIns.reduce((sum, c) => sum + c.fatigue, 0) / checkIns.length || 5
  const avgSoreness = checkIns.reduce((sum, c) => sum + c.soreness, 0) / checkIns.length || 5

  let recoveryRate: TrainingResponse['recoveryRate'] = 'normal'
  if (avgFatigue > 7 || avgSoreness > 7) recoveryRate = 'slow'
  else if (avgFatigue < 4 && avgSoreness < 4) recoveryRate = 'fast'

  // Readiness average
  const readinessAverage = checkIns
    .filter(c => c.readinessScore)
    .reduce((sum, c) => sum + (c.readinessScore || 70), 0) /
    checkIns.filter(c => c.readinessScore).length || 70

  // ACWR status
  const recentACWR = trainingLoads.find(t => t.acwr)?.acwr || 1.0
  let acwrStatus: TrainingResponse['acwrStatus'] = 'safe'
  if (recentACWR > 1.5) acwrStatus = 'risky'
  else if (recentACWR > 1.3) acwrStatus = 'moderate'

  // Performance trend
  const recentPaces = workoutLogs
    .slice(0, 10)
    .filter(w => w.perceivedEffort)
    .map(w => w.perceivedEffort!)
  const olderPaces = workoutLogs
    .slice(10, 20)
    .filter(w => w.perceivedEffort)
    .map(w => w.perceivedEffort!)

  const recentAvg = recentPaces.reduce((a, b) => a + b, 0) / recentPaces.length || 5
  const olderAvg = olderPaces.reduce((a, b) => a + b, 0) / olderPaces.length || recentAvg

  let performanceTrend: TrainingResponse['performanceTrend'] = 'stable'
  if (recentAvg < olderAvg - 0.5) performanceTrend = 'improving' // Lower RPE = better
  else if (recentAvg > olderAvg + 0.5) performanceTrend = 'declining'

  // Fatigue level
  let fatigueLevel: TrainingResponse['fatigueLevel'] = 'moderate'
  if (avgFatigue >= 7) fatigueLevel = 'high'
  else if (avgFatigue <= 4) fatigueLevel = 'low'

  // Intensity response
  let intensityResponse: TrainingResponse['intensityResponse'] = 'neutral'
  if (performanceTrend === 'improving' && recoveryRate !== 'slow') {
    intensityResponse = 'positive'
  } else if (performanceTrend === 'declining' || recoveryRate === 'slow') {
    intensityResponse = 'negative'
  }

  return {
    volumeTolerance,
    intensityResponse,
    recoveryRate,
    performanceTrend,
    fatigueLevel,
    readinessAverage,
    acwrStatus,
  }
}

function generateAdjustments(
  currentPhase: TrainingPhase,
  response: TrainingResponse,
  trainingLoads: { dailyLoad: number }[]
): PeriodizationAdjustment[] {
  const adjustments: PeriodizationAdjustment[] = []

  // Volume adjustments
  if (response.volumeTolerance === 'struggling') {
    adjustments.push({
      type: 'volume',
      urgency: response.acwrStatus === 'risky' ? 'immediate' : 'soon',
      currentValue: 'Hög belastning',
      recommendedValue: 'Reducera med 20-30%',
      rationale: 'Högt upplevd ansträngning indikerar att volymen är för hög',
      confidence: 0.85,
      triggers: ['Hög RPE', 'Långsam återhämtning'],
    })
  } else if (response.volumeTolerance === 'under-stimulated') {
    adjustments.push({
      type: 'volume',
      urgency: 'planned',
      currentValue: 'Låg belastning',
      recommendedValue: 'Öka med 10-15%',
      rationale: 'Utrymme finns för ökad träningsvolym',
      confidence: 0.75,
      triggers: ['Låg RPE', 'Snabb återhämtning'],
    })
  }

  // Intensity adjustments
  if (response.intensityResponse === 'negative') {
    adjustments.push({
      type: 'intensity',
      urgency: 'soon',
      currentValue: 'Hög intensitet',
      recommendedValue: 'Mer lågintensiv träning',
      rationale: 'Negativ respons på intensitet - prioritera återhämtning',
      confidence: 0.8,
      triggers: ['Avtagande prestanda', 'Hög trötthet'],
    })
  }

  // Recovery adjustments
  if (response.recoveryRate === 'slow') {
    adjustments.push({
      type: 'recovery',
      urgency: response.fatigueLevel === 'high' ? 'immediate' : 'soon',
      currentValue: `${response.readinessAverage.toFixed(0)}% beredskap`,
      recommendedValue: 'Lägg till extra vilodag',
      rationale: 'Långsam återhämtning kräver mer vila mellan pass',
      confidence: 0.85,
      triggers: ['Låg beredskap', 'Hög muskelömhet'],
    })
  }

  // Frequency adjustments
  if (response.fatigueLevel === 'high' && response.recoveryRate === 'slow') {
    adjustments.push({
      type: 'frequency',
      urgency: 'soon',
      currentValue: 'Nuvarande frekvens',
      recommendedValue: 'Minska med 1 pass/vecka',
      rationale: 'Kombinerad hög trötthet och långsam återhämtning',
      confidence: 0.8,
      triggers: ['Hög trötthet', 'Långsam återhämtning'],
    })
  }

  // Phase adjustment
  if (shouldRecommendPhaseChange(currentPhase, response)) {
    adjustments.push({
      type: 'phase',
      urgency: 'planned',
      currentValue: getPhaseDescription(currentPhase.name),
      recommendedValue: getNextPhaseRecommendation(currentPhase, response),
      rationale: getPhaseChangeRationale(currentPhase, response),
      confidence: 0.7,
      triggers: ['Fasutveckling', 'Träningsrespons'],
    })
  }

  return adjustments
}

function detectWarnings(
  trainingLoads: { dailyLoad: number; acwr: number | null }[],
  checkIns: { readinessScore: number | null; fatigue: number }[],
  response: TrainingResponse
): PeriodizationWarning[] {
  const warnings: PeriodizationWarning[] = []

  // ACWR warning
  const recentACWR = trainingLoads.find(t => t.acwr)?.acwr || 1.0
  if (recentACWR > 1.5) {
    warnings.push({
      type: 'injury_risk',
      severity: 'high',
      message: `ACWR på ${recentACWR.toFixed(2)} indikerar förhöjd skaderisk`,
      action: 'Reducera träningsbelastning omedelbart med 30-40%',
    })
  } else if (recentACWR > 1.3) {
    warnings.push({
      type: 'injury_risk',
      severity: 'medium',
      message: `ACWR på ${recentACWR.toFixed(2)} närmar sig riskzonen`,
      action: 'Undvik ytterligare belastningsökning denna vecka',
    })
  }

  // Overtraining warning
  if (response.fatigueLevel === 'high' && response.performanceTrend === 'declining') {
    warnings.push({
      type: 'overtraining',
      severity: 'high',
      message: 'Tecken på överträning: hög trötthet + avtagande prestanda',
      action: 'Implementera återhämtningsvecka (50% volym, ingen intensitet)',
    })
  }

  // Undertraining warning
  if (response.volumeTolerance === 'under-stimulated' && response.performanceTrend === 'stable') {
    warnings.push({
      type: 'undertraining',
      severity: 'low',
      message: 'Träningen kan vara för lätt för optimal utveckling',
      action: 'Överväg gradvis volym- eller intensitetsökning',
    })
  }

  // Plateau warning
  if (response.performanceTrend === 'stable' && response.volumeTolerance === 'good') {
    const consistentWeeks = trainingLoads.length / 7
    if (consistentWeeks > 4) {
      warnings.push({
        type: 'plateau',
        severity: 'low',
        message: 'Prestationen har varit stabil i 4+ veckor',
        action: 'Överväg periodiseringsbyte eller nya stimuli',
      })
    }
  }

  // Imbalance warning
  if (response.intensityResponse === 'negative' && response.volumeTolerance === 'good') {
    warnings.push({
      type: 'imbalance',
      severity: 'medium',
      message: 'Obalans mellan volym och intensitetstolerans',
      action: 'Justera intensitetsfördelningen (mer 80/20)',
    })
  }

  return warnings
}

function generateWeeklyPlan(
  currentPhase: TrainingPhase,
  adjustments: PeriodizationAdjustment[],
  response: TrainingResponse
): WeeklyAdjustment[] {
  const plan: WeeklyAdjustment[] = []

  // Base adjustments on urgency
  const immediateVolumeAdjust = adjustments.find(a => a.type === 'volume' && a.urgency === 'immediate')
  const volumeAdjust = adjustments.find(a => a.type === 'volume')
  const intensityAdjust = adjustments.find(a => a.type === 'intensity')

  for (let week = 1; week <= 4; week++) {
    let volumeChange = 0
    let intensityChange = 0
    let keyWorkouts: string[] = []
    let focus = currentPhase.focus

    // Week 1 - immediate changes
    if (week === 1) {
      if (immediateVolumeAdjust) {
        volumeChange = -25
        focus = 'Återhämtning och justering'
      } else if (response.fatigueLevel === 'high') {
        volumeChange = -20
        focus = 'Lätt vecka'
      }

      keyWorkouts = response.fatigueLevel === 'high'
        ? ['Lätt distans', 'Mobilitet']
        : getKeyWorkouts(currentPhase.name)
    }

    // Week 2 - gradual adjustments
    if (week === 2) {
      if (volumeAdjust?.urgency === 'soon') {
        volumeChange = volumeAdjust.currentValue.includes('Hög') ? -15 : 10
      }
      if (intensityAdjust) {
        intensityChange = -10
      }
      keyWorkouts = getKeyWorkouts(currentPhase.name)
      focus = currentPhase.focus
    }

    // Week 3 - progressive
    if (week === 3) {
      volumeChange = response.volumeTolerance === 'good' ? 5 : 0
      intensityChange = response.intensityResponse === 'positive' ? 5 : 0
      keyWorkouts = getKeyWorkouts(currentPhase.name)
      focus = currentPhase.focus
    }

    // Week 4 - recovery/consolidation
    if (week === 4) {
      volumeChange = -15
      intensityChange = -10
      keyWorkouts = ['Lätt distans', 'Tekniskt fokus', 'Mobilitet']
      focus = 'Återhämtning och konsolidering'
    }

    plan.push({
      weekNumber: week,
      volumeChange,
      intensityChange,
      keyWorkouts,
      focus,
    })
  }

  return plan
}

function shouldChangePhase(
  currentPhase: TrainingPhase,
  response: TrainingResponse,
  fieldTests: { date: Date; confidence: string | null }[]
): TrainingPhase | null {
  // Check if phase duration reached
  const phaseProgress = calculatePhaseProgress(currentPhase)
  if (phaseProgress < 80) return null

  // Determine next phase based on current and response
  const nextPhaseMap: Record<TrainingPhase['name'], TrainingPhase['name']> = {
    'BASE': 'BUILD',
    'BUILD': 'PEAK',
    'PEAK': 'RACE',
    'RACE': 'RECOVERY',
    'RECOVERY': 'BASE',
  }

  const nextPhaseName = nextPhaseMap[currentPhase.name]

  // Don't recommend phase change if struggling
  if (response.volumeTolerance === 'struggling' || response.fatigueLevel === 'high') {
    return null
  }

  return {
    name: nextPhaseName,
    weekNumber: 1,
    totalWeeks: getDefaultPhaseLength(nextPhaseName),
    focus: getPhaseDescription(nextPhaseName),
    targetVolume: calculateTargetVolume(nextPhaseName),
    targetIntensity: calculateTargetIntensity(nextPhaseName),
  }
}

// Helper functions
function calculateTargetVolume(phase: TrainingPhase['name']): number {
  const volumes: Record<TrainingPhase['name'], number> = {
    'BASE': 80,
    'BUILD': 100,
    'PEAK': 90,
    'RACE': 70,
    'RECOVERY': 50,
  }
  return volumes[phase]
}

function calculateTargetIntensity(phase: TrainingPhase['name']): number {
  const intensities: Record<TrainingPhase['name'], number> = {
    'BASE': 60,
    'BUILD': 80,
    'PEAK': 100,
    'RACE': 90,
    'RECOVERY': 40,
  }
  return intensities[phase]
}

function getPhaseDescription(phase: TrainingPhase['name']): string {
  const descriptions: Record<TrainingPhase['name'], string> = {
    'BASE': 'Aerob bas - bygga uthållighet',
    'BUILD': 'Bygg - öka specifik kapacitet',
    'PEAK': 'Topp - maximal anpassning',
    'RACE': 'Tävling - prestation',
    'RECOVERY': 'Återhämtning - vila och förnyelse',
  }
  return descriptions[phase]
}

function getKeyWorkouts(phase: TrainingPhase['name']): string[] {
  const workouts: Record<TrainingPhase['name'], string[]> = {
    'BASE': ['Långpass', 'Fartlek', 'Stärkande'],
    'BUILD': ['Tempopass', 'Intervaller', 'Långpass'],
    'PEAK': ['Tävlingsspecifik', 'Intensiva intervaller', 'Testpass'],
    'RACE': ['Aktivering', 'Lätt löpning', 'Mentalt fokus'],
    'RECOVERY': ['Lätt distans', 'Korsträning', 'Mobilitet'],
  }
  return workouts[phase]
}

function getDefaultPhaseLength(phase: TrainingPhase['name']): number {
  const lengths: Record<TrainingPhase['name'], number> = {
    'BASE': 8,
    'BUILD': 6,
    'PEAK': 4,
    'RACE': 2,
    'RECOVERY': 2,
  }
  return lengths[phase]
}

function calculatePhaseProgress(phase: TrainingPhase): number {
  if (phase.totalWeeks === 0) return 0
  return Math.min(100, (phase.weekNumber / phase.totalWeeks) * 100)
}

function shouldRecommendPhaseChange(
  currentPhase: TrainingPhase,
  response: TrainingResponse
): boolean {
  const progress = calculatePhaseProgress(currentPhase)

  // Natural phase progression
  if (progress >= 90) return true

  // Early phase change for positive response
  if (progress >= 75 && response.performanceTrend === 'improving' && response.volumeTolerance === 'good') {
    return true
  }

  // Recovery phase if struggling
  if (response.volumeTolerance === 'struggling' && response.fatigueLevel === 'high') {
    return currentPhase.name !== 'RECOVERY'
  }

  return false
}

function getNextPhaseRecommendation(
  currentPhase: TrainingPhase,
  response: TrainingResponse
): string {
  if (response.volumeTolerance === 'struggling' || response.fatigueLevel === 'high') {
    return 'Återhämtningsfas (2 veckor)'
  }

  const nextPhaseMap: Record<TrainingPhase['name'], string> = {
    'BASE': 'Byggfas - öka specifik kapacitet',
    'BUILD': 'Toppfas - maximal anpassning',
    'PEAK': 'Tävlingsfas',
    'RACE': 'Återhämtningsfas',
    'RECOVERY': 'Ny basfas',
  }

  return nextPhaseMap[currentPhase.name]
}

function getPhaseChangeRationale(
  currentPhase: TrainingPhase,
  response: TrainingResponse
): string {
  if (response.volumeTolerance === 'struggling') {
    return 'Hög belastning kräver återhämtning innan fortsatt utveckling'
  }

  if (response.performanceTrend === 'improving') {
    return 'Positiv träningsrespons indikerar redo för nästa fas'
  }

  return `Fasperiod (${currentPhase.totalWeeks} veckor) närmar sig slutet`
}
