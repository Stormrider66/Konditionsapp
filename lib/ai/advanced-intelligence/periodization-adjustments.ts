// lib/ai/advanced-intelligence/periodization-adjustments.ts
// Automatic periodization adjustments based on training response

import { prisma } from '@/lib/prisma'

type AppLocale = 'en' | 'sv'

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
  programId?: string,
  locale: AppLocale = 'en'
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
    // WorkoutLog.athleteId is a User.id — resolve via athleteAccount.
    prisma.workoutLog.findMany({
      where: { athlete: { athleteAccount: { clientId } }, completed: true },
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

  // Load sums must use WORKOUT rows only — ACWR_SUMMARY rows duplicate
  // dailyLoad. The full array (with the summary rows) is still needed where
  // the stored acwr value is read.
  const workoutLoads = trainingLoads.filter(l => l.source === 'WORKOUT')

  // Determine current phase from program or infer
  const currentPhase = determineCurrentPhase(program, workoutLogs, workoutLoads, locale)

  // Analyze response to training
  const responseAnalysis = analyzeTrainingResponse(workoutLogs, checkIns, trainingLoads)

  // Generate adjustments based on analysis
  const adjustments = generateAdjustments(currentPhase, responseAnalysis, workoutLoads, locale)

  // Check for warnings
  const warnings = detectWarnings(trainingLoads, checkIns, responseAnalysis, locale)

  // Generate weekly plan adjustments
  const weeklyPlan = generateWeeklyPlan(currentPhase, adjustments, responseAnalysis, locale)

  // Determine if phase change is needed
  const recommendedPhase = shouldChangePhase(currentPhase, responseAnalysis, fieldTests, locale)

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

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function determineCurrentPhase(
  program: { weeks: { weekNumber: number; focus: string | null }[] } | null,
  workoutLogs: { duration: number | null; perceivedEffort: number | null }[],
  trainingLoads: { dailyLoad: number }[],
  locale: AppLocale = 'en'
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
      focus: currentWeek.focus || t(locale, 'Aerobic base', 'Aerob bas'),
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
    focus: getPhaseDescription(inferredPhase, locale),
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
  trainingLoads: { dailyLoad: number }[],
  locale: AppLocale = 'en'
): PeriodizationAdjustment[] {
  const adjustments: PeriodizationAdjustment[] = []

  // Volume adjustments
  if (response.volumeTolerance === 'struggling') {
    adjustments.push({
      type: 'volume',
      urgency: response.acwrStatus === 'risky' ? 'immediate' : 'soon',
      currentValue: t(locale, 'High load', 'Hög belastning'),
      recommendedValue: t(locale, 'Reduce by 20-30%', 'Reducera med 20-30%'),
      rationale: t(locale, 'High perceived effort indicates that volume is too high', 'Högt upplevd ansträngning indikerar att volymen är för hög'),
      confidence: 0.85,
      triggers: [t(locale, 'High RPE', 'Hög RPE'), t(locale, 'Slow recovery', 'Långsam återhämtning')],
    })
  } else if (response.volumeTolerance === 'under-stimulated') {
    adjustments.push({
      type: 'volume',
      urgency: 'planned',
      currentValue: t(locale, 'Low load', 'Låg belastning'),
      recommendedValue: t(locale, 'Increase by 10-15%', 'Öka med 10-15%'),
      rationale: t(locale, 'There is room for increased training volume', 'Utrymme finns för ökad träningsvolym'),
      confidence: 0.75,
      triggers: [t(locale, 'Low RPE', 'Låg RPE'), t(locale, 'Fast recovery', 'Snabb återhämtning')],
    })
  }

  // Intensity adjustments
  if (response.intensityResponse === 'negative') {
    adjustments.push({
      type: 'intensity',
      urgency: 'soon',
      currentValue: t(locale, 'High intensity', 'Hög intensitet'),
      recommendedValue: t(locale, 'More low-intensity training', 'Mer lågintensiv träning'),
      rationale: t(locale, 'Negative response to intensity - prioritize recovery', 'Negativ respons på intensitet - prioritera återhämtning'),
      confidence: 0.8,
      triggers: [t(locale, 'Declining performance', 'Avtagande prestanda'), t(locale, 'High fatigue', 'Hög trötthet')],
    })
  }

  // Recovery adjustments
  if (response.recoveryRate === 'slow') {
    adjustments.push({
      type: 'recovery',
      urgency: response.fatigueLevel === 'high' ? 'immediate' : 'soon',
      currentValue: t(locale, `${response.readinessAverage.toFixed(0)}% readiness`, `${response.readinessAverage.toFixed(0)}% beredskap`),
      recommendedValue: t(locale, 'Add an extra rest day', 'Lägg till extra vilodag'),
      rationale: t(locale, 'Slow recovery requires more rest between sessions', 'Långsam återhämtning kräver mer vila mellan pass'),
      confidence: 0.85,
      triggers: [t(locale, 'Low readiness', 'Låg beredskap'), t(locale, 'High muscle soreness', 'Hög muskelömhet')],
    })
  }

  // Frequency adjustments
  if (response.fatigueLevel === 'high' && response.recoveryRate === 'slow') {
    adjustments.push({
      type: 'frequency',
      urgency: 'soon',
      currentValue: t(locale, 'Current frequency', 'Nuvarande frekvens'),
      recommendedValue: t(locale, 'Reduce by 1 session/week', 'Minska med 1 pass/vecka'),
      rationale: t(locale, 'Combined high fatigue and slow recovery', 'Kombinerad hög trötthet och långsam återhämtning'),
      confidence: 0.8,
      triggers: [t(locale, 'High fatigue', 'Hög trötthet'), t(locale, 'Slow recovery', 'Långsam återhämtning')],
    })
  }

  // Phase adjustment
  if (shouldRecommendPhaseChange(currentPhase, response)) {
    adjustments.push({
      type: 'phase',
      urgency: 'planned',
      currentValue: getPhaseDescription(currentPhase.name, locale),
      recommendedValue: getNextPhaseRecommendation(currentPhase, response, locale),
      rationale: getPhaseChangeRationale(currentPhase, response, locale),
      confidence: 0.7,
      triggers: [t(locale, 'Phase progression', 'Fasutveckling'), t(locale, 'Training response', 'Träningsrespons')],
    })
  }

  return adjustments
}

function detectWarnings(
  trainingLoads: { dailyLoad: number; acwr: number | null }[],
  checkIns: { readinessScore: number | null; fatigue: number }[],
  response: TrainingResponse,
  locale: AppLocale = 'en'
): PeriodizationWarning[] {
  const warnings: PeriodizationWarning[] = []

  // ACWR warning
  const recentACWR = trainingLoads.find(t => t.acwr)?.acwr || 1.0
  if (recentACWR > 1.5) {
    warnings.push({
      type: 'injury_risk',
      severity: 'high',
      message: t(locale, `ACWR of ${recentACWR.toFixed(2)} indicates elevated injury risk`, `ACWR på ${recentACWR.toFixed(2)} indikerar förhöjd skaderisk`),
      action: t(locale, 'Reduce training load immediately by 30-40%', 'Reducera träningsbelastning omedelbart med 30-40%'),
    })
  } else if (recentACWR > 1.3) {
    warnings.push({
      type: 'injury_risk',
      severity: 'medium',
      message: t(locale, `ACWR of ${recentACWR.toFixed(2)} is approaching the risk zone`, `ACWR på ${recentACWR.toFixed(2)} närmar sig riskzonen`),
      action: t(locale, 'Avoid further load increases this week', 'Undvik ytterligare belastningsökning denna vecka'),
    })
  }

  // Overtraining warning
  if (response.fatigueLevel === 'high' && response.performanceTrend === 'declining') {
    warnings.push({
      type: 'overtraining',
      severity: 'high',
      message: t(locale, 'Signs of overtraining: high fatigue + declining performance', 'Tecken på överträning: hög trötthet + avtagande prestanda'),
      action: t(locale, 'Implement a recovery week (50% volume, no intensity)', 'Implementera återhämtningsvecka (50% volym, ingen intensitet)'),
    })
  }

  // Undertraining warning
  if (response.volumeTolerance === 'under-stimulated' && response.performanceTrend === 'stable') {
    warnings.push({
      type: 'undertraining',
      severity: 'low',
      message: t(locale, 'Training may be too easy for optimal development', 'Träningen kan vara för lätt för optimal utveckling'),
      action: t(locale, 'Consider gradual volume or intensity increases', 'Överväg gradvis volym- eller intensitetsökning'),
    })
  }

  // Plateau warning
  if (response.performanceTrend === 'stable' && response.volumeTolerance === 'good') {
    const consistentWeeks = trainingLoads.length / 7
    if (consistentWeeks > 4) {
      warnings.push({
        type: 'plateau',
        severity: 'low',
        message: t(locale, 'Performance has been stable for 4+ weeks', 'Prestationen har varit stabil i 4+ veckor'),
        action: t(locale, 'Consider a periodization change or new training stimuli', 'Överväg periodiseringsbyte eller nya stimuli'),
      })
    }
  }

  // Imbalance warning
  if (response.intensityResponse === 'negative' && response.volumeTolerance === 'good') {
    warnings.push({
      type: 'imbalance',
      severity: 'medium',
      message: t(locale, 'Imbalance between volume and intensity tolerance', 'Obalans mellan volym och intensitetstolerans'),
      action: t(locale, 'Adjust intensity distribution (more 80/20)', 'Justera intensitetsfördelningen (mer 80/20)'),
    })
  }

  return warnings
}

function generateWeeklyPlan(
  currentPhase: TrainingPhase,
  adjustments: PeriodizationAdjustment[],
  response: TrainingResponse,
  locale: AppLocale = 'en'
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
        focus = t(locale, 'Recovery and adjustment', 'Återhämtning och justering')
      } else if (response.fatigueLevel === 'high') {
        volumeChange = -20
        focus = t(locale, 'Easy week', 'Lätt vecka')
      }

      keyWorkouts = response.fatigueLevel === 'high'
        ? [t(locale, 'Easy endurance', 'Lätt distans'), t(locale, 'Mobility', 'Mobilitet')]
        : getKeyWorkouts(currentPhase.name, locale)
    }

    // Week 2 - gradual adjustments
    if (week === 2) {
      if (volumeAdjust?.urgency === 'soon') {
        volumeChange = volumeAdjust.type === 'volume' && response.volumeTolerance === 'struggling' ? -15 : 10
      }
      if (intensityAdjust) {
        intensityChange = -10
      }
      keyWorkouts = getKeyWorkouts(currentPhase.name, locale)
      focus = currentPhase.focus
    }

    // Week 3 - progressive
    if (week === 3) {
      volumeChange = response.volumeTolerance === 'good' ? 5 : 0
      intensityChange = response.intensityResponse === 'positive' ? 5 : 0
      keyWorkouts = getKeyWorkouts(currentPhase.name, locale)
      focus = currentPhase.focus
    }

    // Week 4 - recovery/consolidation
    if (week === 4) {
      volumeChange = -15
      intensityChange = -10
      keyWorkouts = [t(locale, 'Easy endurance', 'Lätt distans'), t(locale, 'Technical focus', 'Tekniskt fokus'), t(locale, 'Mobility', 'Mobilitet')]
      focus = t(locale, 'Recovery and consolidation', 'Återhämtning och konsolidering')
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
  fieldTests: { date: Date; confidence: string | null }[],
  locale: AppLocale = 'en'
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
    focus: getPhaseDescription(nextPhaseName, locale),
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

function getPhaseDescription(phase: TrainingPhase['name'], locale: AppLocale = 'en'): string {
  const descriptions: Record<TrainingPhase['name'], Record<AppLocale, string>> = {
    'BASE': { en: 'Aerobic base - build endurance', sv: 'Aerob bas - bygga uthållighet' },
    'BUILD': { en: 'Build - increase specific capacity', sv: 'Bygg - öka specifik kapacitet' },
    'PEAK': { en: 'Peak - maximize adaptation', sv: 'Topp - maximal anpassning' },
    'RACE': { en: 'Race - performance', sv: 'Tävling - prestation' },
    'RECOVERY': { en: 'Recovery - rest and renewal', sv: 'Återhämtning - vila och förnyelse' },
  }
  return descriptions[phase][locale]
}

function getKeyWorkouts(phase: TrainingPhase['name'], locale: AppLocale = 'en'): string[] {
  const workouts: Record<TrainingPhase['name'], Record<AppLocale, string[]>> = {
    'BASE': { en: ['Long session', 'Fartlek', 'Strength support'], sv: ['Långpass', 'Fartlek', 'Stärkande'] },
    'BUILD': { en: ['Tempo session', 'Intervals', 'Long session'], sv: ['Tempopass', 'Intervaller', 'Långpass'] },
    'PEAK': { en: ['Race-specific', 'Intensive intervals', 'Test session'], sv: ['Tävlingsspecifik', 'Intensiva intervaller', 'Testpass'] },
    'RACE': { en: ['Activation', 'Easy run', 'Mental focus'], sv: ['Aktivering', 'Lätt löpning', 'Mentalt fokus'] },
    'RECOVERY': { en: ['Easy endurance', 'Cross-training', 'Mobility'], sv: ['Lätt distans', 'Korsträning', 'Mobilitet'] },
  }
  return workouts[phase][locale]
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
  response: TrainingResponse,
  locale: AppLocale = 'en'
): string {
  if (response.volumeTolerance === 'struggling' || response.fatigueLevel === 'high') {
    return t(locale, 'Recovery phase (2 weeks)', 'Återhämtningsfas (2 veckor)')
  }

  const nextPhaseMap: Record<TrainingPhase['name'], Record<AppLocale, string>> = {
    'BASE': { en: 'Build phase - increase specific capacity', sv: 'Byggfas - öka specifik kapacitet' },
    'BUILD': { en: 'Peak phase - maximize adaptation', sv: 'Toppfas - maximal anpassning' },
    'PEAK': { en: 'Race phase', sv: 'Tävlingsfas' },
    'RACE': { en: 'Recovery phase', sv: 'Återhämtningsfas' },
    'RECOVERY': { en: 'New base phase', sv: 'Ny basfas' },
  }

  return nextPhaseMap[currentPhase.name][locale]
}

function getPhaseChangeRationale(
  currentPhase: TrainingPhase,
  response: TrainingResponse,
  locale: AppLocale = 'en'
): string {
  if (response.volumeTolerance === 'struggling') {
    return t(locale, 'High load requires recovery before continued development', 'Hög belastning kräver återhämtning innan fortsatt utveckling')
  }

  if (response.performanceTrend === 'improving') {
    return t(locale, 'Positive training response indicates readiness for the next phase', 'Positiv träningsrespons indikerar redo för nästa fas')
  }

  return t(locale, `Phase period (${currentPhase.totalWeeks} weeks) is nearing its end`, `Fasperiod (${currentPhase.totalWeeks} veckor) närmar sig slutet`)
}
