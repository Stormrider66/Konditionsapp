// lib/ai/body-composition-analyzer.ts

export interface BodyCompositionMeasurement {
  id: string
  measurementDate: Date | string
  weightKg?: number | null
  bodyFatPercent?: number | null
  muscleMassKg?: number | null
  visceralFat?: number | null
  waterPercent?: number | null
  bmrKcal?: number | null
}

export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'fluctuating'
export type ProgressStatus = 'excellent' | 'good' | 'on_track' | 'slow' | 'concerning' | 'unknown'
type AppLocale = 'en' | 'sv'

export interface BodyCompTrend {
  direction: TrendDirection
  weeklyChange: number
  percentChange: number
  dataPoints: number
}

export interface BodyCompAnalysis {
  trend: 'losing_fat' | 'gaining_muscle' | 'recomp' | 'maintaining' | 'concerning' | 'insufficient_data'
  progressStatus: ProgressStatus
  weightTrend: BodyCompTrend | null
  fatTrend: BodyCompTrend | null
  muscleTrend: BodyCompTrend | null
  weeklyFatChange: number | null
  weeklyMuscleChange: number | null
  weeklyWeightChange: number | null
  narrative: string
  recommendations: string[]
  warnings: string[]
  projections: {
    targetFatPercent?: { weeks: number; date: Date } | null
    targetWeight?: { weeks: number; date: Date } | null
    targetMuscleMass?: { weeks: number; date: Date } | null
  }
}

export interface AnalysisOptions {
  targetWeight?: number
  targetBodyFatPercent?: number
  targetMuscleMass?: number
  goal?: 'weight_loss' | 'muscle_gain' | 'recomp' | 'maintenance'
  locale?: string
}

function getLocale(locale?: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function calculateTrend(
  measurements: BodyCompositionMeasurement[],
  getValue: (m: BodyCompositionMeasurement) => number | null | undefined
): BodyCompTrend | null {
  const validMeasurements = measurements
    .filter(m => getValue(m) != null)
    .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime())

  if (validMeasurements.length < 2) return null

  const first = getValue(validMeasurements[0])!
  const last = getValue(validMeasurements[validMeasurements.length - 1])!

  const firstDate = new Date(validMeasurements[0].measurementDate)
  const lastDate = new Date(validMeasurements[validMeasurements.length - 1].measurementDate)
  const weeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7))

  const totalChange = last - first
  const weeklyChange = totalChange / weeks
  const percentChange = (totalChange / first) * 100

  // Calculate variance to detect fluctuation
  const values = validMeasurements.map(m => getValue(m)!)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  const coefficientOfVariation = (stdDev / mean) * 100

  let direction: TrendDirection
  if (coefficientOfVariation > 5) {
    direction = 'fluctuating'
  } else if (Math.abs(weeklyChange) < 0.1) {
    direction = 'stable'
  } else if (weeklyChange > 0) {
    direction = 'increasing'
  } else {
    direction = 'decreasing'
  }

  return {
    direction,
    weeklyChange: Number(weeklyChange.toFixed(2)),
    percentChange: Number(percentChange.toFixed(1)),
    dataPoints: validMeasurements.length,
  }
}

function calculateProjection(
  currentValue: number,
  weeklyChange: number,
  targetValue: number
): { weeks: number; date: Date } | null {
  if (weeklyChange === 0) return null

  const diff = targetValue - currentValue
  if ((diff > 0 && weeklyChange < 0) || (diff < 0 && weeklyChange > 0)) {
    return null // Moving in wrong direction
  }

  const weeks = Math.abs(diff / weeklyChange)
  if (weeks > 104) return null // More than 2 years - not realistic

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + weeks * 7)

  return { weeks: Math.round(weeks), date: targetDate }
}

export function analyzeBodyComposition(
  measurements: BodyCompositionMeasurement[],
  options: AnalysisOptions = {}
): BodyCompAnalysis {
  const locale = getLocale(options.locale)
  const sortedMeasurements = [...measurements]
    .filter(m => m.measurementDate)
    .sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime())

  // Need at least 3 measurements for meaningful analysis
  if (sortedMeasurements.length < 3) {
    return {
      trend: 'insufficient_data',
      progressStatus: 'unknown',
      weightTrend: null,
      fatTrend: null,
      muscleTrend: null,
      weeklyFatChange: null,
      weeklyMuscleChange: null,
      weeklyWeightChange: null,
      narrative: t(
        locale,
        'More measurements are needed to analyze trends. Keep measuring weekly to build useful insight.',
        'Behöver fler mätningar för att analysera trender. Fortsätt mäta varje vecka för att få insikter.'
      ),
      recommendations: [
        t(locale, 'Measure once per week at the same time and under the same conditions', 'Mät dig själv en gång i veckan, samma tid och villkor'),
        t(locale, 'Morning before breakfast gives the most consistent results', 'Morgon före frukost ger mest konsekventa resultat'),
        t(locale, 'Use the same scale or device so measurements stay comparable', 'Använd samma våg/utrustning för jämförbarhet'),
      ],
      warnings: [],
      projections: {},
    }
  }

  const weightTrend = calculateTrend(sortedMeasurements, m => m.weightKg)
  const fatTrend = calculateTrend(sortedMeasurements, m => m.bodyFatPercent)
  const muscleTrend = calculateTrend(sortedMeasurements, m => m.muscleMassKg)

  const latestMeasurement = sortedMeasurements[0]
  const warnings: string[] = []
  const recommendations: string[] = []

  // Determine overall trend
  let trend: BodyCompAnalysis['trend'] = 'maintaining'
  let progressStatus: ProgressStatus = 'on_track'

  const isFatDecreasing = fatTrend && fatTrend.weeklyChange < -0.1
  const isMuscleIncreasing = muscleTrend && muscleTrend.weeklyChange > 0.05

  if (isFatDecreasing && isMuscleIncreasing) {
    trend = 'recomp'
    progressStatus = 'excellent'
  } else if (isFatDecreasing && !isMuscleIncreasing) {
    trend = 'losing_fat'
    progressStatus = fatTrend!.weeklyChange < -1 ? 'concerning' : 'good'
  } else if (isMuscleIncreasing && !isFatDecreasing) {
    trend = 'gaining_muscle'
    progressStatus = 'good'
  } else if (fatTrend && fatTrend.weeklyChange > 0.3) {
    trend = 'concerning'
    progressStatus = 'concerning'
  } else {
    trend = 'maintaining'
    progressStatus = options.goal === 'maintenance' ? 'on_track' : 'slow'
  }

  // Generate warnings
  if (weightTrend && weightTrend.weeklyChange < -1.5) {
    warnings.push(t(
      locale,
      'Weight loss is too fast (>1.5 kg/week). This increases the risk of muscle loss and metabolic adaptation.',
      'Viktminskning går för snabbt (>1.5 kg/vecka). Risk för muskelförlust och metabolisk anpassning.'
    ))
  }

  if (fatTrend && fatTrend.weeklyChange > 0.5) {
    warnings.push(t(locale, 'Body fat is increasing quickly. Review nutrition and training.', 'Kroppsfettet ökar snabbt. Granska kost och träning.'))
  }

  if (muscleTrend && muscleTrend.weeklyChange < -0.2) {
    warnings.push(t(locale, 'Muscle mass is decreasing. Increase protein intake and include strength training.', 'Muskelmassa minskar. Öka proteinintag och inkludera styrketräning.'))
  }

  if (latestMeasurement.bodyFatPercent && latestMeasurement.bodyFatPercent < 8) {
    warnings.push(t(locale, 'Body fat is very low. Pay attention to hormonal health and energy levels.', 'Kroppsfettnivån är mycket låg. Var uppmärksam på hormonell hälsa och energinivåer.'))
  }

  // Generate recommendations based on goal and trends
  if (options.goal === 'weight_loss') {
    if (weightTrend && weightTrend.weeklyChange > -0.3) {
      recommendations.push(t(locale, 'Slightly increase the calorie deficit or activity level', 'Öka kaloriunderskottet något eller öka aktivitetsnivån'))
    }
    recommendations.push(t(locale, 'Keep protein intake high (1.6-2 g/kg) to preserve muscle mass', 'Behåll högt proteinintag (1.6-2g/kg) för att bevara muskelmassa'))
    recommendations.push(t(locale, 'Include strength training 2-3 times per week', 'Inkludera styrketräning 2-3 gånger/vecka'))
  } else if (options.goal === 'muscle_gain') {
    if (muscleTrend && muscleTrend.weeklyChange < 0.1) {
      recommendations.push(t(locale, 'Make sure you are eating enough - a small calorie surplus is required', 'Se till att du äter tillräckligt - ett litet kaloriöverskott krävs'))
    }
    recommendations.push(t(locale, 'Focus on progressive overload in training', 'Fokusera på progressiv överbelastning i träningen'))
    recommendations.push(t(locale, 'Sleep at least 7-8 hours for optimal recovery', 'Sov minst 7-8 timmar för optimal återhämtning'))
  } else if (options.goal === 'recomp') {
    recommendations.push(t(locale, 'Eat around maintenance calories with high protein', 'Ät runt underhållskalorier med högt protein'))
    recommendations.push(t(locale, 'Prioritize strength training to stimulate muscle growth', 'Prioritera styrketräning för att stimulera muskeltillväxt'))
    recommendations.push(t(locale, 'Be patient - recomposition takes time but gives sustainable results', 'Ha tålamod - recomp tar tid men ger hållbara resultat'))
  }

  // Calculate projections
  const projections: BodyCompAnalysis['projections'] = {}

  if (options.targetBodyFatPercent && fatTrend && latestMeasurement.bodyFatPercent) {
    projections.targetFatPercent = calculateProjection(
      latestMeasurement.bodyFatPercent,
      fatTrend.weeklyChange,
      options.targetBodyFatPercent
    )
  }

  if (options.targetWeight && weightTrend && latestMeasurement.weightKg) {
    projections.targetWeight = calculateProjection(
      latestMeasurement.weightKg,
      weightTrend.weeklyChange,
      options.targetWeight
    )
  }

  if (options.targetMuscleMass && muscleTrend && latestMeasurement.muscleMassKg) {
    projections.targetMuscleMass = calculateProjection(
      latestMeasurement.muscleMassKg,
      muscleTrend.weeklyChange,
      options.targetMuscleMass
    )
  }

  // Generate narrative
  const narrative = generateNarrative(
    trend,
    progressStatus,
    weightTrend,
    fatTrend,
    muscleTrend,
    projections,
    options,
    locale
  )

  return {
    trend,
    progressStatus,
    weightTrend,
    fatTrend,
    muscleTrend,
    weeklyFatChange: fatTrend?.weeklyChange ?? null,
    weeklyMuscleChange: muscleTrend?.weeklyChange ?? null,
    weeklyWeightChange: weightTrend?.weeklyChange ?? null,
    narrative,
    recommendations,
    warnings,
    projections,
  }
}

function generateNarrative(
  trend: BodyCompAnalysis['trend'],
  progressStatus: ProgressStatus,
  weightTrend: BodyCompTrend | null,
  fatTrend: BodyCompTrend | null,
  muscleTrend: BodyCompTrend | null,
  projections: BodyCompAnalysis['projections'],
  options: AnalysisOptions,
  locale: AppLocale
): string {
  const parts: string[] = []

  // Opening based on trend
  switch (trend) {
    case 'recomp':
      parts.push(t(locale, 'Excellent progress! You are losing fat while building muscle - the gold standard of body recomposition.', 'Utmärkt progress! Du tappar fett samtidigt som du bygger muskler - detta är den heliga gralen av kroppssammansättning.'))
      break
    case 'losing_fat':
      if (progressStatus === 'excellent' || progressStatus === 'good') {
        parts.push(t(locale, 'Good fat loss. Your body composition is improving.', 'Bra fettförbränning! Din kroppssammansättning förbättras.'))
      } else {
        parts.push(t(locale, 'You are losing fat, but keep the pace sustainable.', 'Du tappar fett, men tänk på att hålla ett hållbart tempo.'))
      }
      break
    case 'gaining_muscle':
      parts.push(t(locale, 'You are building muscle mass. The strength training is paying off.', 'Du bygger muskelmassa! Styrketräningen ger resultat.'))
      break
    case 'maintaining':
      parts.push(t(locale, 'Your body composition is stable.', 'Din kroppssammansättning är stabil.'))
      if (options.goal !== 'maintenance') {
        parts.push(t(locale, 'If you want to see change, you may need to adjust the plan.', 'Om du vill se förändring kan justeringar behövas.'))
      }
      break
    case 'concerning':
      parts.push(t(locale, 'Your body composition is moving in a direction that may need attention.', 'Din kroppssammansättning rör sig i en riktning som kan behöva uppmärksamhet.'))
      break
    default:
      parts.push(t(locale, 'Keep measuring to reveal clear trends.', 'Fortsätt mäta för att se tydliga trender.'))
  }

  // Add specific numbers
  if (weightTrend && Math.abs(weightTrend.weeklyChange) >= 0.1) {
    const amount = Math.abs(weightTrend.weeklyChange).toFixed(1)
    parts.push(weightTrend.weeklyChange > 0
      ? t(locale, `Weight is increasing by ~${amount} kg/week.`, `Vikten ökar med ~${amount} kg/vecka.`)
      : t(locale, `Weight is decreasing by ~${amount} kg/week.`, `Vikten minskar med ~${amount} kg/vecka.`))
  }

  if (fatTrend && Math.abs(fatTrend.weeklyChange) >= 0.1) {
    const amount = Math.abs(fatTrend.weeklyChange).toFixed(1)
    parts.push(fatTrend.weeklyChange > 0
      ? t(locale, `Body fat is increasing by ~${amount}%/week.`, `Kroppsfettet ökar med ~${amount}%/vecka.`)
      : t(locale, `Body fat is decreasing by ~${amount}%/week.`, `Kroppsfettet minskar med ~${amount}%/vecka.`))
  }

  // Add projections
  if (projections.targetWeight) {
    parts.push(t(locale, `At the current pace, you will reach your target weight in ~${projections.targetWeight.weeks} weeks.`, `Vid nuvarande takt når du målvikten om ~${projections.targetWeight.weeks} veckor.`))
  }

  if (projections.targetFatPercent) {
    parts.push(t(locale, `You will reach your body fat target in ~${projections.targetFatPercent.weeks} weeks.`, `Du når målet för kroppsfett om ~${projections.targetFatPercent.weeks} veckor.`))
  }

  return parts.join(' ')
}

// Helper function to format analysis for AI context
export function formatBodyCompAnalysisForAI(analysis: BodyCompAnalysis, locale: AppLocale = 'en'): string {
  const lines: string[] = [
    t(locale, 'BODY COMPOSITION ANALYSIS:', 'KROPPSSAMMANSÄTTNINGSANALYS:'),
    `- ${t(locale, 'Trend', 'Trend')}: ${analysis.trend}`,
    `- ${t(locale, 'Status', 'Status')}: ${analysis.progressStatus}`,
  ]

  if (analysis.weeklyWeightChange !== null) {
    lines.push(`- ${t(locale, 'Weight change', 'Viktförändring')}: ${analysis.weeklyWeightChange > 0 ? '+' : ''}${analysis.weeklyWeightChange.toFixed(2)} kg/${t(locale, 'week', 'vecka')}`)
  }

  if (analysis.weeklyFatChange !== null) {
    lines.push(`- ${t(locale, 'Fat change', 'Fettförändring')}: ${analysis.weeklyFatChange > 0 ? '+' : ''}${analysis.weeklyFatChange.toFixed(2)} %/${t(locale, 'week', 'vecka')}`)
  }

  if (analysis.weeklyMuscleChange !== null) {
    lines.push(`- ${t(locale, 'Muscle change', 'Muskelförändring')}: ${analysis.weeklyMuscleChange > 0 ? '+' : ''}${analysis.weeklyMuscleChange.toFixed(2)} kg/${t(locale, 'week', 'vecka')}`)
  }

  if (analysis.warnings.length > 0) {
    lines.push(`\n${t(locale, 'WARNINGS:', 'VARNINGAR:')}`)
    analysis.warnings.forEach(w => lines.push(`- ${w}`))
  }

  lines.push(`\n${t(locale, 'SUMMARY', 'SAMMANFATTNING')}: ${analysis.narrative}`)

  return lines.join('\n')
}
