/**
 * Illness Return-to-Training Protocol Generator
 *
 * Generates a gradual return-to-training protocol based on illness type and duration.
 * Based on guidelines from sports medicine research for safe return to activity.
 *
 * Key principles:
 * - No training with fever (current or within 24h)
 * - "Neck check" rule: Symptoms above neck = light activity possible, below = rest
 * - Gradual progression over 4-7 days minimum
 * - Medical clearance required for fever >3 days or cardiac symptoms
 */

import { addDays, differenceInDays, format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'

export type IllnessType = 'RESPIRATORY' | 'GI' | 'FEVER' | 'GENERAL' | 'OTHER'
export type IllnessSeverity = 'MILD' | 'MODERATE' | 'SEVERE'

export interface IllnessInfo {
  type: IllnessType
  startDate: Date
  endDate: Date // When symptoms ended
  hadFever: boolean
  feverDays?: number
  severity?: IllnessSeverity
  symptomsBelowNeck?: boolean // Chest congestion, body aches = more rest needed
}

export interface ReturnPhase {
  day: number
  date: Date
  intensity: 'NONE' | 'VERY_LIGHT' | 'LIGHT' | 'MODERATE' | 'NORMAL'
  intensityPercent: number // 0-100%
  durationMinutes: number
  description: string
  activities: string[]
  warnings: string[]
  readinessCheck: string
}

export interface ReturnProtocol {
  startDate: Date
  endDate: Date
  totalDays: number
  phases: ReturnPhase[]
  requiresMedicalClearance: boolean
  medicalClearanceReason?: string
  generalGuidelines: string[]
  warningSignsToWatch: string[]
}

type ProtocolLocale = 'en' | 'sv'

function text(locale: ProtocolLocale, en: string, svText: string): string {
  return locale === 'sv' ? svText : en
}

/**
 * Calculate illness severity based on duration and symptoms
 */
export function calculateSeverity(info: IllnessInfo): IllnessSeverity {
  const durationDays = differenceInDays(info.endDate, info.startDate) + 1

  // Fever is always at least moderate
  if (info.hadFever) {
    if (info.feverDays && info.feverDays > 3) return 'SEVERE'
    return 'MODERATE'
  }

  // Symptoms below neck = moderate or severe
  if (info.symptomsBelowNeck) {
    return durationDays > 5 ? 'SEVERE' : 'MODERATE'
  }

  // Duration-based
  if (durationDays >= 7) return 'SEVERE'
  if (durationDays >= 4) return 'MODERATE'
  return 'MILD'
}

/**
 * Get recommended return protocol length based on illness
 */
function getProtocolDays(info: IllnessInfo, severity: IllnessSeverity): number {
  const baseDays = {
    MILD: 4,
    MODERATE: 6,
    SEVERE: 10,
  }

  let days = baseDays[severity]

  // Fever adds extra days
  if (info.hadFever) {
    days += Math.min(info.feverDays || 1, 5)
  }

  // GI illness needs extra recovery for hydration
  if (info.type === 'GI') {
    days += 2
  }

  return Math.min(days, 14) // Cap at 14 days
}

/**
 * Generate return-to-training protocol
 */
export function generateReturnProtocol(info: IllnessInfo, locale: ProtocolLocale = 'en'): ReturnProtocol {
  const severity = info.severity || calculateSeverity(info)
  const protocolDays = getProtocolDays(info, severity)

  // Protocol starts the day after illness ends
  const startDate = addDays(info.endDate, 1)
  const phases: ReturnPhase[] = []

  // Check if medical clearance is needed
  const requiresMedicalClearance =
    severity === 'SEVERE' ||
    (info.hadFever && (info.feverDays || 0) > 3) ||
    (info.symptomsBelowNeck === true)

  let medicalClearanceReason: string | undefined
  if (requiresMedicalClearance) {
    if (info.hadFever && (info.feverDays || 0) > 3) {
      medicalClearanceReason = text(
        locale,
        'Fever for more than 3 days requires medical clearance before returning to training',
        'Feber i mer än 3 dagar kräver läkargodkännande innan återgång till träning'
      )
    } else if (info.symptomsBelowNeck) {
      medicalClearanceReason = text(
        locale,
        'Symptoms below the neck (chest, body) require medical review to rule out complications',
        'Symtom under halsen (bröst, kropp) kräver läkarkontroll för att utesluta komplikationer'
      )
    } else {
      medicalClearanceReason = text(
        locale,
        'The illness severity requires medical clearance',
        'Sjukdomens svårighetsgrad kräver läkargodkännande'
      )
    }
  }

  // Generate phases based on severity
  const progressionCurve = getProgressionCurve(severity, protocolDays, locale)

  for (let day = 1; day <= protocolDays; day++) {
    const phaseDate = addDays(startDate, day - 1)
    const progress = progressionCurve[day - 1]

    phases.push({
      day,
      date: phaseDate,
      intensity: progress.intensity,
      intensityPercent: progress.percent,
      durationMinutes: progress.duration,
      description: progress.description,
      activities: getActivitiesForPhase(progress.intensity, info.type, locale),
      warnings: getWarningsForPhase(day, info, locale),
      readinessCheck: getReadinessCheck(day, severity, locale),
    })
  }

  return {
    startDate,
    endDate: addDays(startDate, protocolDays - 1),
    totalDays: protocolDays,
    phases,
    requiresMedicalClearance,
    medicalClearanceReason,
    generalGuidelines: getGeneralGuidelines(info.type, locale),
    warningSignsToWatch: getWarningSignsToWatch(info.type, locale),
  }
}

interface ProgressionStep {
  intensity: ReturnPhase['intensity']
  percent: number
  duration: number
  description: string
}

/**
 * Get progression curve based on severity
 */
function getProgressionCurve(severity: IllnessSeverity, totalDays: number, locale: ProtocolLocale): ProgressionStep[] {
  const steps: ProgressionStep[] = []

  switch (severity) {
    case 'MILD':
      // 4-day progression: 25% → 50% → 75% → 100%
      steps.push(
        { intensity: 'VERY_LIGHT', percent: 25, duration: 20, description: text(locale, 'Very light activity - walking', 'Mycket lätt aktivitet - promenad') },
        { intensity: 'LIGHT', percent: 50, duration: 30, description: text(locale, 'Light aerobic training', 'Lätt aerob träning') },
        { intensity: 'MODERATE', percent: 75, duration: 40, description: text(locale, 'Moderate training', 'Moderat träning') },
        { intensity: 'NORMAL', percent: 100, duration: 60, description: text(locale, 'Normal training', 'Normal träning') }
      )
      break

    case 'MODERATE':
      // 6-day progression with slower start
      steps.push(
        { intensity: 'NONE', percent: 0, duration: 0, description: text(locale, 'Complete rest', 'Fullständig vila') },
        { intensity: 'VERY_LIGHT', percent: 20, duration: 15, description: text(locale, 'Very light walk', 'Mycket lätt promenad') },
        { intensity: 'VERY_LIGHT', percent: 30, duration: 20, description: text(locale, 'Light walk', 'Lätt promenad') },
        { intensity: 'LIGHT', percent: 50, duration: 30, description: text(locale, 'Light aerobic activity', 'Lätt aerob aktivitet') },
        { intensity: 'MODERATE', percent: 70, duration: 45, description: text(locale, 'Moderate training', 'Moderat träning') },
        { intensity: 'NORMAL', percent: 100, duration: 60, description: text(locale, 'Normal training', 'Normal träning') }
      )
      break

    case 'SEVERE':
      // 10-day progression with extended rest
      steps.push(
        { intensity: 'NONE', percent: 0, duration: 0, description: text(locale, 'Complete rest - daily activity only', 'Fullständig vila - endast daglig aktivitet') },
        { intensity: 'NONE', percent: 0, duration: 0, description: text(locale, 'Continued rest', 'Fortsatt vila') },
        { intensity: 'VERY_LIGHT', percent: 10, duration: 10, description: text(locale, 'Very short walk', 'Mycket kort promenad') },
        { intensity: 'VERY_LIGHT', percent: 20, duration: 15, description: text(locale, 'Light walk', 'Lätt promenad') },
        { intensity: 'VERY_LIGHT', percent: 30, duration: 20, description: text(locale, 'Longer walk', 'Längre promenad') },
        { intensity: 'LIGHT', percent: 40, duration: 25, description: text(locale, 'Light aerobic activity', 'Lätt aerob aktivitet') },
        { intensity: 'LIGHT', percent: 50, duration: 30, description: text(locale, 'Moderate walking/cycling', 'Moderat promenad/cykling') },
        { intensity: 'MODERATE', percent: 60, duration: 40, description: text(locale, 'Light running/cycling', 'Lätt löpning/cykling') },
        { intensity: 'MODERATE', percent: 75, duration: 50, description: text(locale, 'Moderate training', 'Moderat träning') },
        { intensity: 'NORMAL', percent: 100, duration: 60, description: text(locale, 'Normal training', 'Normal träning') }
      )
      break
  }

  // Pad or trim to match totalDays
  while (steps.length < totalDays) {
    // Add rest days at the beginning for longer protocols
    steps.unshift({ intensity: 'NONE', percent: 0, duration: 0, description: text(locale, 'Rest', 'Vila') })
  }
  while (steps.length > totalDays) {
    steps.shift()
  }

  return steps
}

/**
 * Get appropriate activities for each phase
 */
function getActivitiesForPhase(intensity: ReturnPhase['intensity'], illnessType: IllnessType, locale: ProtocolLocale): string[] {
  switch (intensity) {
    case 'NONE':
      return [
        text(locale, 'Rest', 'Vila'),
        text(locale, 'Light stretching if it feels good', 'Lätt stretching om det känns bra'),
        text(locale, 'Daily activities', 'Dagliga aktiviteter'),
      ]

    case 'VERY_LIGHT':
      return [
        text(locale, 'Easy-paced walk', 'Promenad i lugnt tempo'),
        text(locale, 'Light cycling (stationary)', 'Lätt cykling (stationär)'),
        'Yoga/stretching',
        illnessType === 'GI'
          ? text(locale, 'Make sure to hydrate well', 'Se till att dricka ordentligt')
          : text(locale, 'Light mobility', 'Lätt rörlighet'),
      ].filter(Boolean)

    case 'LIGHT':
      return [
        text(locale, 'Light jogging 10-15 min', 'Lätt jogging 10-15 min'),
        text(locale, 'Low heart-rate cycling', 'Cykling i låg puls'),
        text(locale, 'Easy-paced swimming', 'Simning i lugnt tempo'),
        text(locale, 'Light strength training (50% of normal load)', 'Lätt styrketräning (50% av normal belastning)'),
      ]

    case 'MODERATE':
      return [
        text(locale, 'Moderate running', 'Moderat löpning'),
        text(locale, 'Interval-like session at low intensity', 'Intervalliknande pass med låg intensitet'),
        text(locale, 'Normal strength training with reduced volume', 'Normal styrketräning med reducerad volym'),
        text(locale, 'Sport-specific training at an easy pace', 'Sport-specifik träning i lugnt tempo'),
      ]

    case 'NORMAL':
      return [
        text(locale, 'Normal training according to plan', 'Normal träning enligt program'),
        text(locale, 'Listen to your body', 'Lyssna på kroppen'),
        text(locale, 'Be ready to step back if fatigue increases', 'Var beredd att backa om tröttheten ökar'),
      ]
  }
}

/**
 * Get warnings for specific phase
 */
function getWarningsForPhase(day: number, info: IllnessInfo, locale: ProtocolLocale): string[] {
  const warnings: string[] = []

  if (day <= 2) {
    warnings.push(text(locale, 'Stop immediately if you feel dizzy, nauseous, or short of breath', 'Avbryt omedelbart vid yrsel, illamående eller andningsbesvär'))
    if (info.hadFever) {
      warnings.push(text(locale, 'Check temperature before activity', 'Kontrollera temperatur före aktivitet'))
    }
  }

  if (day <= 4) {
    warnings.push(text(locale, 'Keep intensity lower than planned if you feel tired', 'Håll intensiteten lägre än planerat om du känner dig trött'))
  }

  if (info.type === 'RESPIRATORY') {
    warnings.push(text(locale, 'Avoid training in cold air for the first few days', 'Undvik träning i kall luft de första dagarna'))
  }

  if (info.type === 'GI') {
    if (day <= 3) {
      warnings.push(text(locale, 'Prioritize fluid intake - at least 2-3 liters per day', 'Prioritera vätskeintag - minst 2-3 liter per dag'))
    }
  }

  return warnings
}

/**
 * Get readiness check question for the day
 */
function getReadinessCheck(day: number, severity: IllnessSeverity, locale: ProtocolLocale): string {
  if (day === 1) {
    return text(locale, 'Have you been fever-free for at least 24 hours without fever-reducing medication?', 'Har du varit feberfri i minst 24 timmar utan febernedsättande medicin?')
  }

  if (day <= 3) {
    return text(locale, 'Do you feel recovered after yesterday’s activity?', 'Känner du dig utvilad efter gårdagens aktivitet?')
  }

  if (severity === 'SEVERE' && day <= 5) {
    return text(locale, 'Have you been able to sleep normally and wake up rested?', 'Har du kunnat sova normalt och vaknat utvilad?')
  }

  return text(locale, 'How is your energy level today? (Only continue if >70%)', 'Hur känns energinivån idag? (Fortsätt bara om >70%)')
}

/**
 * Get general guidelines based on illness type
 */
function getGeneralGuidelines(illnessType: IllnessType, locale: ProtocolLocale): string[] {
  const common = [
    text(locale, 'Rest is part of training - do not underestimate recovery', 'Vila är en del av träningen - underskatta inte återhämtning'),
    text(locale, 'It is better to return too late than too early', 'Det är bättre att komma tillbaka för sent än för tidigt'),
    text(locale, 'Increase load gradually - max 10% per day', 'Öka belastningen stegvis - max 10% per dag'),
    text(locale, 'Sleep at least 8 hours per night during recovery', 'Sov minst 8 timmar per natt under återhämtningen'),
  ]

  switch (illnessType) {
    case 'RESPIRATORY':
      return [
        ...common,
        text(locale, 'Avoid hard breathing in cold/dry air for the first few days', 'Undvik hård andning i kall/torr luft de första dagarna'),
        text(locale, 'Cough irritation during training is common - reduce intensity if it happens', 'Hostretning under träning är vanligt - minska intensiteten om det händer'),
      ]

    case 'GI':
      return [
        ...common,
        text(locale, 'Restore fluid balance before training', 'Återställ vätskebalansen innan du börjar träna'),
        text(locale, 'Eat easily digestible food and avoid heavy intake before training', 'Ät lättsmält mat och undvik tungt intag före träning'),
        text(locale, 'Electrolytes may be needed if you had diarrhea/vomiting', 'Elektrolyter kan behövas om du haft diarré/kräkningar'),
      ]

    case 'FEVER':
      return [
        ...common,
        text(locale, 'Fever shows the body is fighting - give it time to recover', 'Feber tyder på att kroppen kämpar - ge den tid att återhämta sig'),
        text(locale, 'Wait at least 24-48 hours after the fever has gone down', 'Vänta minst 24-48 timmar efter att febern gått ner'),
        text(locale, 'Contact a doctor if fever returns during recovery', 'Kontakta läkare om febern återkommer under återhämtningen'),
      ]

    default:
      return common
  }
}

/**
 * Get warning signs to watch for
 */
function getWarningSignsToWatch(illnessType: IllnessType, locale: ProtocolLocale): string[] {
  const common = [
    text(locale, 'Fever returning (>38°C)', 'Feber som återkommer (>38°C)'),
    text(locale, 'Abnormal fatigue after light activity', 'Onormal trötthet efter lätt aktivitet'),
    text(locale, 'Palpitations or irregular pulse', 'Hjärtklappning eller oregelbunden puls'),
    text(locale, 'Dizziness or feeling faint', 'Yrsel eller svimningskänsla'),
    text(locale, 'Chest pain or breathing difficulty', 'Bröstsmärta eller andningsbesvär'),
  ]

  switch (illnessType) {
    case 'RESPIRATORY':
      return [
        ...common,
        text(locale, 'Persistent cough that worsens with activity', 'Ihållande hosta som förvärras av aktivitet'),
        text(locale, 'Wheezing or shortness of breath', 'Pipande andning eller andnöd'),
      ]

    case 'GI':
      return [
        ...common,
        text(locale, 'Continued stomach problems', 'Fortsatta magproblem'),
        text(locale, 'Signs of dehydration (darker urine, dizziness)', 'Tecken på uttorkning (mörkare urin, yrsel)'),
      ]

    case 'FEVER':
      return [
        ...common,
        text(locale, 'Muscle pain or joint pain', 'Muskelsmärta eller ledvärk'),
        text(locale, 'Swollen lymph nodes', 'Svullna lymfkörtlar'),
      ]

    default:
      return common
  }
}

/**
 * Format protocol for display
 */
export function formatProtocolSummary(protocol: ReturnProtocol, locale: ProtocolLocale = 'en'): string {
  const dateLocale = locale === 'sv' ? sv : enUS
  const lines = [
    `📅 ${text(locale, 'Return protocol', 'Återgångsprotokoll')}: ${protocol.totalDays} ${text(locale, 'days', 'dagar')}`,
    `${text(locale, 'Start date', 'Startdatum')}: ${format(protocol.startDate, 'd MMMM', { locale: dateLocale })}`,
    `${text(locale, 'End date', 'Slutdatum')}: ${format(protocol.endDate, 'd MMMM', { locale: dateLocale })}`,
    '',
  ]

  if (protocol.requiresMedicalClearance) {
    lines.push(`⚠️ ${text(locale, 'MEDICAL CLEARANCE REQUIRED', 'LÄKARGODKÄNNANDE KRÄVS')}`)
    lines.push(protocol.medicalClearanceReason || '')
    lines.push('')
  }

  lines.push(`${text(locale, 'Phases', 'Faser')}:`)
  protocol.phases.forEach((phase) => {
    const intensityEmoji = {
      NONE: '🔴',
      VERY_LIGHT: '🟠',
      LIGHT: '🟡',
      MODERATE: '🟢',
      NORMAL: '✅',
    }
    lines.push(
      `  ${intensityEmoji[phase.intensity]} ${text(locale, 'Day', 'Dag')} ${phase.day}: ${phase.description} (${phase.intensityPercent}%, ${phase.durationMinutes} min)`
    )
  })

  return lines.join('\n')
}

/**
 * Get intensity color for UI
 */
export function getIntensityColor(intensity: ReturnPhase['intensity']): string {
  switch (intensity) {
    case 'NONE':
      return 'text-red-600 bg-red-50 dark:bg-red-950/30'
    case 'VERY_LIGHT':
      return 'text-orange-600 bg-orange-50 dark:bg-orange-950/30'
    case 'LIGHT':
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30'
    case 'MODERATE':
      return 'text-green-600 bg-green-50 dark:bg-green-950/30'
    case 'NORMAL':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
  }
}

/**
 * Get localized intensity label.
 */
export function getIntensityLabel(intensity: ReturnPhase['intensity'], locale: ProtocolLocale = 'en'): string {
  switch (intensity) {
    case 'NONE':
      return text(locale, 'Rest', 'Vila')
    case 'VERY_LIGHT':
      return text(locale, 'Very light', 'Mycket lätt')
    case 'LIGHT':
      return text(locale, 'Light', 'Lätt')
    case 'MODERATE':
      return text(locale, 'Moderate', 'Moderat')
    case 'NORMAL':
      return 'Normal'
  }
}
