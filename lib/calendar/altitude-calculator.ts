/**
 * Altitude Training Calculator
 *
 * Calculates pace adjustments, training zones, and adaptation phases for altitude training.
 * Based on scientific research on the physiological effects of altitude on endurance performance.
 *
 * Key principles:
 * - VO2max decreases approximately 1% per 100m above 1500m
 * - Heart rate increases at altitude for same perceived effort
 * - Lactate threshold occurs at lower absolute intensities
 * - Adaptation takes 10-21 days depending on altitude
 *
 * References:
 * - Fulco et al. (1998) Maximal and submaximal exercise performance at altitude
 * - Wilber (2004) Altitude Training and Athletic Performance
 * - Millet et al. (2010) Combining hypoxic methods for peak performance
 */

import { addDays, differenceInDays, format, isWithinInterval } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'

export type AltitudeLocale = 'en' | 'sv'

export interface AltitudeCampInfo {
  startDate: Date
  endDate: Date
  altitude: number // meters above sea level
  athleteExperience?: 'FIRST_TIME' | 'SOME' | 'EXPERIENCED' // altitude experience
  baseVO2max?: number // sea level VO2max if known
}

export type AdaptationPhase = 'PRE_CAMP' | 'ACUTE' | 'ADAPTATION' | 'OPTIMAL' | 'POST_CAMP'

export interface DailyAdaptation {
  date: Date
  day: number // day of camp (1, 2, 3...)
  phase: AdaptationPhase
  vo2maxReduction: number // percentage reduction
  paceAdjustment: number // seconds per km to add
  hrAdjustment: number // bpm adjustment (HR will be higher)
  maxIntensity: number // max % of sea level intensity
  recommendations: string[]
  guidelines: string[]
}

export interface AltitudeZoneAdjustment {
  zoneName: string
  seaLevelPace: string // min:sec/km
  altitudePace: string // adjusted pace
  adjustmentSeconds: number
  hrZone: string
  notes: string
}

export interface AltitudeCampPlan {
  camp: AltitudeCampInfo
  totalDays: number
  adaptationTimeline: DailyAdaptation[]
  phaseBreakdown: {
    acute: { start: number; end: number }
    adaptation: { start: number; end: number }
    optimal: { start: number; end: number }
  }
  postCampMonitoring: {
    startDate: Date
    endDate: Date
    days: number
    recommendations: string[]
  }
  generalGuidelines: string[]
  warningSignsToWatch: string[]
}

/**
 * Calculate VO2max reduction based on altitude
 * Research shows ~1% reduction per 100m above 1500m
 */
export function calculateVO2maxReduction(altitude: number): number {
  if (altitude <= 1500) return 0

  // Reduction starts at 1500m, approximately 1% per 100m
  const effectiveAltitude = altitude - 1500
  const reduction = (effectiveAltitude / 100) * 1.0

  // Cap at reasonable maximum (even at 4000m, max ~25% reduction)
  return Math.min(reduction, 30)
}

/**
 * Calculate pace adjustment in seconds per km
 * Based on VO2max-pace relationship
 */
export function calculatePaceAdjustment(
  altitude: number,
  dayOfCamp: number,
  campDuration: number
): number {
  const baseVO2Reduction = calculateVO2maxReduction(altitude)

  // Adaptation factor reduces the penalty over time
  const adaptationFactor = calculateAdaptationFactor(dayOfCamp, campDuration)

  // Pace increase is roughly 1.5-2% per 1% VO2max reduction
  // But adaptation reduces this over time
  const effectiveReduction = baseVO2Reduction * (1 - adaptationFactor)

  // Convert to seconds per km (assuming ~5:00/km base pace = 300 sec)
  // 1% VO2max reduction ≈ 3-5 seconds/km slower
  const paceAdjustment = effectiveReduction * 4 // 4 sec/km per 1% reduction

  return Math.round(paceAdjustment)
}

/**
 * Calculate adaptation factor (0-1, higher = more adapted)
 */
function calculateAdaptationFactor(dayOfCamp: number, _campDuration: number): number {
  // No adaptation on first day
  if (dayOfCamp <= 1) return 0

  // Acute phase (days 1-5): minimal adaptation (0-10%)
  if (dayOfCamp <= 5) {
    return 0.1 * ((dayOfCamp - 1) / 4)
  }

  // Adaptation phase (days 6-14): moderate adaptation (10-50%)
  if (dayOfCamp <= 14) {
    return 0.1 + 0.4 * ((dayOfCamp - 5) / 9)
  }

  // Optimal phase (day 15+): good adaptation (50-70%)
  const daysOptimal = dayOfCamp - 14
  const optimalProgress = Math.min(daysOptimal / 7, 1)
  return 0.5 + 0.2 * optimalProgress
}

/**
 * Get adaptation phase for a given day
 */
export function getAdaptationPhase(dayOfCamp: number): AdaptationPhase {
  if (dayOfCamp <= 0) return 'PRE_CAMP'
  if (dayOfCamp <= 5) return 'ACUTE'
  if (dayOfCamp <= 14) return 'ADAPTATION'
  return 'OPTIMAL'
}

/**
 * Get maximum training intensity for a given phase
 */
export function getMaxIntensity(phase: AdaptationPhase, altitude: number): number {
  const vo2Reduction = calculateVO2maxReduction(altitude)

  switch (phase) {
    case 'ACUTE':
      // First 5 days: reduce by additional 10-15% beyond VO2max reduction
      return Math.max(55, 100 - vo2Reduction - 15)
    case 'ADAPTATION':
      // Days 6-14: reduce by additional 5-10%
      return Math.max(65, 100 - vo2Reduction - 10)
    case 'OPTIMAL':
      // Day 15+: just account for VO2max reduction
      return Math.max(75, 100 - vo2Reduction - 5)
    default:
      return 100
  }
}

/**
 * Calculate HR adjustment for altitude
 * Heart rate is typically 10-20% higher at altitude for same effort
 */
export function calculateHRAdjustment(altitude: number, dayOfCamp: number): number {
  if (altitude <= 1500) return 0

  const baseIncrease = Math.min((altitude - 1500) / 100, 20) // ~1 bpm per 100m
  const adaptationFactor = calculateAdaptationFactor(dayOfCamp, 21)

  // HR elevation decreases with adaptation
  return Math.round(baseIncrease * (1 - adaptationFactor * 0.5))
}

/**
 * Generate complete altitude camp plan
 */
export function generateAltitudeCampPlan(
  info: AltitudeCampInfo,
  locale: AltitudeLocale = 'en'
): AltitudeCampPlan {
  const totalDays = differenceInDays(info.endDate, info.startDate) + 1
  const adaptationTimeline: DailyAdaptation[] = []

  // Generate daily adaptation data
  for (let day = 1; day <= totalDays; day++) {
    const date = addDays(info.startDate, day - 1)
    const phase = getAdaptationPhase(day)
    const vo2Reduction = calculateVO2maxReduction(info.altitude)
    const paceAdjustment = calculatePaceAdjustment(info.altitude, day, totalDays)
    const hrAdjustment = calculateHRAdjustment(info.altitude, day)
    const maxIntensity = getMaxIntensity(phase, info.altitude)

    adaptationTimeline.push({
      date,
      day,
      phase,
      vo2maxReduction: vo2Reduction,
      paceAdjustment,
      hrAdjustment,
      maxIntensity,
      recommendations: getDailyRecommendations(day, phase, info.altitude, locale),
      guidelines: getDailyGuidelines(phase, info.athleteExperience, locale),
    })
  }

  // Calculate phase breakdown
  const phaseBreakdown = {
    acute: { start: 1, end: Math.min(5, totalDays) },
    adaptation: {
      start: totalDays > 5 ? 6 : 0,
      end: totalDays > 5 ? Math.min(14, totalDays) : 0,
    },
    optimal: {
      start: totalDays > 14 ? 15 : 0,
      end: totalDays > 14 ? totalDays : 0,
    },
  }

  // Post-camp monitoring (14 days after return to sea level)
  const postCampStart = addDays(info.endDate, 1)
  const postCampEnd = addDays(info.endDate, 14)

  return {
    camp: info,
    totalDays,
    adaptationTimeline,
    phaseBreakdown,
    postCampMonitoring: {
      startDate: postCampStart,
      endDate: postCampEnd,
      days: 14,
      recommendations: getPostCampRecommendations(totalDays, locale),
    },
    generalGuidelines: getGeneralGuidelines(info.altitude, locale),
    warningSignsToWatch: getWarningSignsToWatch(locale),
  }
}

/**
 * Get daily training recommendations
 */
function getDailyRecommendations(
  day: number,
  phase: AdaptationPhase,
  altitude: number,
  locale: AltitudeLocale
): string[] {
  const paceAdjustment = Math.round(calculatePaceAdjustment(altitude, day, 21))

  switch (phase) {
    case 'ACUTE':
      return locale === 'sv'
        ? [
            'Fokusera på lätt aerob träning',
            'Undvik hög intensitet (inga intervaller)',
            'Prioritera återhämtning och sömn',
            day === 1 ? 'Vilodag eller mycket lätt aktivitet' : 'Lätt jogging 30-45 min',
            'Inga kvalitetspass de första 3-5 dagarna',
          ]
        : [
            'Focus on easy aerobic training',
            'Avoid high intensity (no intervals)',
            'Prioritize recovery and sleep',
            day === 1 ? 'Rest day or very light activity' : 'Easy jogging 30-45 min',
            'No quality sessions during the first 3-5 days',
          ]

    case 'ADAPTATION':
      if (day <= 10) {
        return locale === 'sv'
          ? [
              'Gradvis ökning av volym',
              'Lätt fartlek kan introduceras',
              'Fortsatt fokus på aerob bas',
              'Undvik max-ansträngningar',
            ]
          : [
              'Gradually increase volume',
              'Light fartlek can be introduced',
              'Keep the focus on aerobic base work',
              'Avoid maximal efforts',
            ]
      }
      return locale === 'sv'
        ? [
            'Moderat intensitet tillåten',
            'Korta tempointervaller kan påbörjas',
            'Lyssna på kroppen',
            'Ha alltid plan B vid trötthet',
          ]
        : [
            'Moderate intensity is allowed',
            'Short tempo intervals can begin',
            'Listen to the body',
            'Always have a plan B when fatigue is high',
          ]

    case 'OPTIMAL':
      return locale === 'sv'
        ? [
            'Normal träning med anpassade hastigheter',
            'Kvalitetspass fullt tillåtna',
            `Kom ihåg att hastigheter är ${paceAdjustment} sek/km långsammare`,
            'Maximalt utnyttjande av höjdeffekten',
          ]
        : [
            'Normal training with adjusted speeds',
            'Quality sessions are fully allowed',
            `Remember that paces are ${paceAdjustment} sec/km slower`,
            'Make the most of the altitude effect',
          ]

    default:
      return []
  }
}

/**
 * Get daily guidelines
 */
function getDailyGuidelines(
  phase: AdaptationPhase,
  experience: 'FIRST_TIME' | 'SOME' | 'EXPERIENCED' | undefined,
  locale: AltitudeLocale
): string[] {
  const isFirstTimer = experience === 'FIRST_TIME'

  const baseGuidelines =
    locale === 'sv'
      ? [
          'Drick 3-4 liter vatten per dag',
          'Ät kolhydratrikt',
          'Sov 8-9 timmar per natt',
          'Använd pulsoximeter vid behov (>90% SpO2)',
        ]
      : [
          'Drink 3-4 liters of water per day',
          'Eat carbohydrate-rich meals',
          'Sleep 8-9 hours per night',
          'Use a pulse oximeter when needed (>90% SpO2)',
        ]

  if (phase === 'ACUTE') {
    return locale === 'sv'
      ? [
          ...baseGuidelines,
          'Undvik alkohol',
          'Var uppmärksam på huvudvärk eller illamående',
          isFirstTimer
            ? 'Extra försiktighet - kroppen behöver tid att anpassa sig'
            : 'Tillåt kroppen att acklimatisera sig',
        ]
      : [
          ...baseGuidelines,
          'Avoid alcohol',
          'Watch for headaches or nausea',
          isFirstTimer
            ? 'Extra caution - the body needs time to adapt'
            : 'Allow the body to acclimatize',
        ]
  }

  if (phase === 'ADAPTATION') {
    return locale === 'sv'
      ? [...baseGuidelines, 'Kvalitativ sömn är avgörande', 'Järntillskott kan övervägas']
      : [...baseGuidelines, 'High-quality sleep is critical', 'Iron supplementation can be considered']
  }

  return baseGuidelines
}

/**
 * Get post-camp recommendations
 */
function getPostCampRecommendations(
  campDays: number,
  locale: AltitudeLocale
): string[] {
  const optimalWindow =
    locale === 'sv'
      ? campDays >= 21
        ? 'Dag 1-28 efter hemkomst'
        : campDays >= 14
          ? 'Dag 1-21 efter hemkomst'
          : 'Dag 7-14 efter hemkomst'
      : campDays >= 21
        ? 'Days 1-28 after returning'
        : campDays >= 14
          ? 'Days 1-21 after returning'
          : 'Days 7-14 after returning'

  return locale === 'sv'
    ? [
        `Optimal prestationsperiod: ${optimalWindow}`,
        'Dagarna 1-3: Lätt träning, låt kroppen återhämta sig',
        'Dagarna 4-7: Gradvis ökning, introducera kvalitet',
        'Undvik överträning - kroppen behöver läka',
        'Planera A-tävling inom den optimala perioden',
        'Var uppmärksam på tecken på sjukdom (immunförsvaret kan vara nedsatt)',
        'Fortsätt med god vätske- och järnintag',
      ]
    : [
        `Optimal performance window: ${optimalWindow}`,
        'Days 1-3: Easy training, let the body recover',
        'Days 4-7: Gradually increase load and introduce quality',
        'Avoid overtraining - the body needs to recover',
        'Plan the A race inside the optimal window',
        'Watch for signs of illness (immune function may be suppressed)',
        'Keep hydration and iron intake high',
      ]
}

/**
 * Get general guidelines for altitude training
 */
function getGeneralGuidelines(altitude: number, locale: AltitudeLocale): string[] {
  const isHighAltitude = altitude >= 2500
  const isModerateAltitude = altitude >= 1800 && altitude < 2500

  const guidelines =
    locale === 'sv'
      ? [
          'Höjdträning kräver tålamod - överdriv inte',
          'Kvalitet framför kvantitet i alla pass',
          'Lyssna på kroppen och anpassa efter dagsformen',
          'Dokumentera sömn, puls och känsla dagligen',
          'Ha flexibla träningsplaner med möjlighet att reducera',
        ]
      : [
          'Altitude training requires patience - do not overdo it',
          'Prioritize quality over quantity in every session',
          'Listen to the body and adapt to daily readiness',
          'Track sleep, heart rate, and perceived feeling every day',
          'Keep training plans flexible with room to reduce load',
        ]

  if (isHighAltitude) {
    return locale === 'sv'
      ? [
          ...guidelines,
          `På ${altitude}m: Förvänta dig 15-20% prestandaminskning initialt`,
          'Akut höjdsjuka är en risk - känn till symtomen',
          'Överväg gradvis acklimatisering om möjligt',
        ]
      : [
          ...guidelines,
          `At ${altitude}m: Expect an initial 15-20% performance reduction`,
          'Acute altitude sickness is a risk - know the symptoms',
          'Consider gradual acclimatization when possible',
        ]
  }

  if (isModerateAltitude) {
    return locale === 'sv'
      ? [
          ...guidelines,
          `På ${altitude}m: Förvänta dig 10-15% prestandaminskning initialt`,
          'Klassisk "Live High, Train Low" är effektivt',
        ]
      : [
          ...guidelines,
          `At ${altitude}m: Expect an initial 10-15% performance reduction`,
          'Classic "Live High, Train Low" is effective',
        ]
  }

  return guidelines
}

/**
 * Get warning signs to watch for
 */
function getWarningSignsToWatch(locale: AltitudeLocale): string[] {
  return locale === 'sv'
    ? [
        'Ihållande huvudvärk som inte försvinner med paracetamol',
        'Illamående eller aptitlöshet',
        'Yrsel eller koordinationsproblem',
        'Andnöd i vila',
        'Extrem trötthet eller sömnstörningar',
        'Svullnad i händer, fötter eller ansikte',
        'Hjärtklappning i vila',
        'Hosta, särskilt nattetid',
      ]
    : [
        'Persistent headache that does not resolve with paracetamol',
        'Nausea or loss of appetite',
        'Dizziness or coordination problems',
        'Shortness of breath at rest',
        'Extreme fatigue or sleep disturbances',
        'Swelling in hands, feet, or face',
        'Heart palpitations at rest',
        'Coughing, especially at night',
      ]
}

/**
 * Calculate adjusted training zones for altitude
 */
export function calculateAltitudeZones(
  seaLevelZones: { name: string; pace: string; hrZone: string }[],
  altitude: number,
  dayOfCamp: number,
  locale: AltitudeLocale = 'en'
): AltitudeZoneAdjustment[] {
  const paceAdjustment = calculatePaceAdjustment(altitude, dayOfCamp, 21)

  return seaLevelZones.map((zone) => {
    // Parse pace (assuming format "MM:SS" or "M:SS")
    const paceParts = zone.pace.split(':')
    const totalSeconds = parseInt(paceParts[0]) * 60 + parseInt(paceParts[1])
    const adjustedSeconds = totalSeconds + paceAdjustment
    const adjustedMinutes = Math.floor(adjustedSeconds / 60)
    const adjustedSecRemainder = adjustedSeconds % 60

    return {
      zoneName: zone.name,
      seaLevelPace: zone.pace,
      altitudePace: `${adjustedMinutes}:${String(adjustedSecRemainder).padStart(2, '0')}`,
      adjustmentSeconds: paceAdjustment,
      hrZone: zone.hrZone,
      notes:
        locale === 'sv'
          ? `+${paceAdjustment} sek/km på ${altitude}m`
          : `+${paceAdjustment} sec/km at ${altitude}m`,
    }
  })
}

/**
 * Get phase label
 */
export function getPhaseLabel(phase: AdaptationPhase, locale: AltitudeLocale = 'en'): string {
  if (locale === 'sv') {
    switch (phase) {
      case 'PRE_CAMP':
        return 'Före läger'
      case 'ACUTE':
        return 'Akutfas'
      case 'ADAPTATION':
        return 'Anpassningsfas'
      case 'OPTIMAL':
        return 'Optimalfas'
      case 'POST_CAMP':
        return 'Efter läger'
    }
  }

  switch (phase) {
    case 'PRE_CAMP':
      return 'Before camp'
    case 'ACUTE':
      return 'Acute phase'
    case 'ADAPTATION':
      return 'Adaptation phase'
    case 'OPTIMAL':
      return 'Optimal phase'
    case 'POST_CAMP':
      return 'After camp'
  }
}

/**
 * Get phase color for UI
 */
export function getPhaseColor(phase: AdaptationPhase): string {
  switch (phase) {
    case 'PRE_CAMP':
      return 'text-gray-600 bg-gray-50 dark:bg-gray-950/30'
    case 'ACUTE':
      return 'text-red-600 bg-red-50 dark:bg-red-950/30'
    case 'ADAPTATION':
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30'
    case 'OPTIMAL':
      return 'text-green-600 bg-green-50 dark:bg-green-950/30'
    case 'POST_CAMP':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
  }
}

/**
 * Check if a date is within the post-camp monitoring period
 */
export function isInPostCampMonitoring(
  checkDate: Date,
  campEndDate: Date
): { inMonitoring: boolean; day: number } {
  const monitoringStart = addDays(campEndDate, 1)
  const monitoringEnd = addDays(campEndDate, 14)

  const inMonitoring = isWithinInterval(checkDate, {
    start: monitoringStart,
    end: monitoringEnd,
  })

  const day = inMonitoring ? differenceInDays(checkDate, monitoringStart) + 1 : 0

  return { inMonitoring, day }
}

/**
 * Format altitude plan summary
 */
export function formatAltitudePlanSummary(
  plan: AltitudeCampPlan,
  locale: AltitudeLocale = 'en'
): string {
  const dateLocale = locale === 'sv' ? sv : enUS
  const lines = [
    locale === 'sv' ? `🏔️ Höjdläger: ${plan.camp.altitude}m` : `🏔️ Altitude camp: ${plan.camp.altitude}m`,
    `📅 ${format(plan.camp.startDate, 'd MMMM', { locale: dateLocale })} - ${format(plan.camp.endDate, 'd MMMM', { locale: dateLocale })}`,
    locale === 'sv' ? `Totalt: ${plan.totalDays} dagar` : `Total: ${plan.totalDays} days`,
    '',
    locale === 'sv' ? 'Faser:' : 'Phases:',
    locale === 'sv'
      ? `  🔴 Akutfas: Dag 1-${plan.phaseBreakdown.acute.end}`
      : `  🔴 Acute phase: Day 1-${plan.phaseBreakdown.acute.end}`,
  ]

  if (plan.phaseBreakdown.adaptation.start > 0) {
    lines.push(
      locale === 'sv'
        ? `  🟡 Anpassning: Dag ${plan.phaseBreakdown.adaptation.start}-${plan.phaseBreakdown.adaptation.end}`
        : `  🟡 Adaptation: Day ${plan.phaseBreakdown.adaptation.start}-${plan.phaseBreakdown.adaptation.end}`
    )
  }

  if (plan.phaseBreakdown.optimal.start > 0) {
    lines.push(
      locale === 'sv'
        ? `  🟢 Optimal: Dag ${plan.phaseBreakdown.optimal.start}-${plan.phaseBreakdown.optimal.end}`
        : `  🟢 Optimal: Day ${plan.phaseBreakdown.optimal.start}-${plan.phaseBreakdown.optimal.end}`
    )
  }

  lines.push('')
  lines.push(
    locale === 'sv'
      ? `VO2max-reduktion: ~${Math.round(calculateVO2maxReduction(plan.camp.altitude))}%`
      : `VO2max reduction: ~${Math.round(calculateVO2maxReduction(plan.camp.altitude))}%`
  )
  lines.push(
    locale === 'sv'
      ? `Initial tempojustering: +${calculatePaceAdjustment(plan.camp.altitude, 1, plan.totalDays)} sek/km`
      : `Initial pace adjustment: +${calculatePaceAdjustment(plan.camp.altitude, 1, plan.totalDays)} sec/km`
  )

  return lines.join('\n')
}
