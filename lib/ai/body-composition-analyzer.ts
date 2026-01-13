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
      narrative: 'Behöver fler mätningar för att analysera trender. Fortsätt mäta varje vecka för att få insikter.',
      recommendations: [
        'Mät dig själv en gång i veckan, samma tid och villkor',
        'Morgon före frukost ger mest konsekventa resultat',
        'Använd samma våg/utrustning för jämförbarhet',
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
  const isWeightDecreasing = weightTrend && weightTrend.weeklyChange < -0.2

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
    warnings.push('Viktminskning går för snabbt (>1.5 kg/vecka). Risk för muskelförlust och metabolisk anpassning.')
  }

  if (fatTrend && fatTrend.weeklyChange > 0.5) {
    warnings.push('Kroppsfettet ökar snabbt. Granska kost och träning.')
  }

  if (muscleTrend && muscleTrend.weeklyChange < -0.2) {
    warnings.push('Muskelmassa minskar. Öka proteinintag och inkludera styrketräning.')
  }

  if (latestMeasurement.bodyFatPercent && latestMeasurement.bodyFatPercent < 8) {
    warnings.push('Kroppsfettnivån är mycket låg. Var uppmärksam på hormonell hälsa och energinivåer.')
  }

  // Generate recommendations based on goal and trends
  if (options.goal === 'weight_loss') {
    if (weightTrend && weightTrend.weeklyChange > -0.3) {
      recommendations.push('Öka kaloriunderskottet något eller öka aktivitetsnivån')
    }
    recommendations.push('Behåll högt proteinintag (1.6-2g/kg) för att bevara muskelmassa')
    recommendations.push('Inkludera styrketräning 2-3 gånger/vecka')
  } else if (options.goal === 'muscle_gain') {
    if (muscleTrend && muscleTrend.weeklyChange < 0.1) {
      recommendations.push('Se till att du äter tillräckligt - ett litet kaloriöverskott krävs')
    }
    recommendations.push('Fokusera på progressiv överbelastning i träningen')
    recommendations.push('Sov minst 7-8 timmar för optimal återhämtning')
  } else if (options.goal === 'recomp') {
    recommendations.push('Ät runt underhållskalorier med högt protein')
    recommendations.push('Prioritera styrketräning för att stimulera muskeltillväxt')
    recommendations.push('Ha tålamod - recomp tar tid men ger hållbara resultat')
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
    options
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
  options: AnalysisOptions
): string {
  const parts: string[] = []

  // Opening based on trend
  switch (trend) {
    case 'recomp':
      parts.push('Utmärkt progress! Du tappar fett samtidigt som du bygger muskler - detta är den heliga gralen av kroppssammansättning.')
      break
    case 'losing_fat':
      if (progressStatus === 'excellent' || progressStatus === 'good') {
        parts.push('Bra fettförbränning! Din kroppssammansättning förbättras.')
      } else {
        parts.push('Du tappar fett, men tänk på att hålla ett hållbart tempo.')
      }
      break
    case 'gaining_muscle':
      parts.push('Du bygger muskelmassa! Styrketräningen ger resultat.')
      break
    case 'maintaining':
      parts.push('Din kroppssammansättning är stabil.')
      if (options.goal !== 'maintenance') {
        parts.push('Om du vill se förändring kan justeringar behövas.')
      }
      break
    case 'concerning':
      parts.push('Din kroppssammansättning rör sig i en riktning som kan behöva uppmärksamhet.')
      break
    default:
      parts.push('Fortsätt mäta för att se tydliga trender.')
  }

  // Add specific numbers
  if (weightTrend && Math.abs(weightTrend.weeklyChange) >= 0.1) {
    const direction = weightTrend.weeklyChange > 0 ? 'ökar' : 'minskar'
    parts.push(`Vikten ${direction} med ~${Math.abs(weightTrend.weeklyChange).toFixed(1)} kg/vecka.`)
  }

  if (fatTrend && Math.abs(fatTrend.weeklyChange) >= 0.1) {
    const direction = fatTrend.weeklyChange > 0 ? 'ökar' : 'minskar'
    parts.push(`Kroppsfettet ${direction} med ~${Math.abs(fatTrend.weeklyChange).toFixed(1)}%/vecka.`)
  }

  // Add projections
  if (projections.targetWeight) {
    parts.push(`Vid nuvarande takt når du målvikten om ~${projections.targetWeight.weeks} veckor.`)
  }

  if (projections.targetFatPercent) {
    parts.push(`Du når målet för kroppsfett om ~${projections.targetFatPercent.weeks} veckor.`)
  }

  return parts.join(' ')
}

// Helper function to format analysis for AI context
export function formatBodyCompAnalysisForAI(analysis: BodyCompAnalysis): string {
  const lines: string[] = [
    'KROPPSSAMMANSÄTTNINGSANALYS:',
    `- Trend: ${analysis.trend}`,
    `- Status: ${analysis.progressStatus}`,
  ]

  if (analysis.weeklyWeightChange !== null) {
    lines.push(`- Viktförändring: ${analysis.weeklyWeightChange > 0 ? '+' : ''}${analysis.weeklyWeightChange.toFixed(2)} kg/vecka`)
  }

  if (analysis.weeklyFatChange !== null) {
    lines.push(`- Fettförändring: ${analysis.weeklyFatChange > 0 ? '+' : ''}${analysis.weeklyFatChange.toFixed(2)} %/vecka`)
  }

  if (analysis.weeklyMuscleChange !== null) {
    lines.push(`- Muskelförändring: ${analysis.weeklyMuscleChange > 0 ? '+' : ''}${analysis.weeklyMuscleChange.toFixed(2)} kg/vecka`)
  }

  if (analysis.warnings.length > 0) {
    lines.push('\nVARNINGAR:')
    analysis.warnings.forEach(w => lines.push(`- ${w}`))
  }

  lines.push(`\nSAMMANFATTNING: ${analysis.narrative}`)

  return lines.join('\n')
}
