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
import { sv } from 'date-fns/locale'

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
export function generateReturnProtocol(info: IllnessInfo): ReturnProtocol {
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
      medicalClearanceReason = 'Feber i mer än 3 dagar kräver läkargodkännande innan återgång till träning'
    } else if (info.symptomsBelowNeck) {
      medicalClearanceReason = 'Symtom under halsen (bröst, kropp) kräver läkarkontroll för att utesluta komplikationer'
    } else {
      medicalClearanceReason = 'Sjukdomens svårighetsgrad kräver läkargodkännande'
    }
  }

  // Generate phases based on severity
  const progressionCurve = getProgressionCurve(severity, protocolDays)

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
      activities: getActivitiesForPhase(progress.intensity, info.type),
      warnings: getWarningsForPhase(day, info),
      readinessCheck: getReadinessCheck(day, severity),
    })
  }

  return {
    startDate,
    endDate: addDays(startDate, protocolDays - 1),
    totalDays: protocolDays,
    phases,
    requiresMedicalClearance,
    medicalClearanceReason,
    generalGuidelines: getGeneralGuidelines(info.type),
    warningSignsToWatch: getWarningSignsToWatch(info.type),
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
function getProgressionCurve(severity: IllnessSeverity, totalDays: number): ProgressionStep[] {
  const steps: ProgressionStep[] = []

  switch (severity) {
    case 'MILD':
      // 4-day progression: 25% → 50% → 75% → 100%
      steps.push(
        { intensity: 'VERY_LIGHT', percent: 25, duration: 20, description: 'Mycket lätt aktivitet - promenad' },
        { intensity: 'LIGHT', percent: 50, duration: 30, description: 'Lätt aerob träning' },
        { intensity: 'MODERATE', percent: 75, duration: 40, description: 'Moderat träning' },
        { intensity: 'NORMAL', percent: 100, duration: 60, description: 'Normal träning' }
      )
      break

    case 'MODERATE':
      // 6-day progression with slower start
      steps.push(
        { intensity: 'NONE', percent: 0, duration: 0, description: 'Fullständig vila' },
        { intensity: 'VERY_LIGHT', percent: 20, duration: 15, description: 'Mycket lätt promenad' },
        { intensity: 'VERY_LIGHT', percent: 30, duration: 20, description: 'Lätt promenad' },
        { intensity: 'LIGHT', percent: 50, duration: 30, description: 'Lätt aerob aktivitet' },
        { intensity: 'MODERATE', percent: 70, duration: 45, description: 'Moderat träning' },
        { intensity: 'NORMAL', percent: 100, duration: 60, description: 'Normal träning' }
      )
      break

    case 'SEVERE':
      // 10-day progression with extended rest
      steps.push(
        { intensity: 'NONE', percent: 0, duration: 0, description: 'Fullständig vila - endast daglig aktivitet' },
        { intensity: 'NONE', percent: 0, duration: 0, description: 'Fortsatt vila' },
        { intensity: 'VERY_LIGHT', percent: 10, duration: 10, description: 'Mycket kort promenad' },
        { intensity: 'VERY_LIGHT', percent: 20, duration: 15, description: 'Lätt promenad' },
        { intensity: 'VERY_LIGHT', percent: 30, duration: 20, description: 'Längre promenad' },
        { intensity: 'LIGHT', percent: 40, duration: 25, description: 'Lätt aerob aktivitet' },
        { intensity: 'LIGHT', percent: 50, duration: 30, description: 'Moderat promenad/cykling' },
        { intensity: 'MODERATE', percent: 60, duration: 40, description: 'Lätt löpning/cykling' },
        { intensity: 'MODERATE', percent: 75, duration: 50, description: 'Moderat träning' },
        { intensity: 'NORMAL', percent: 100, duration: 60, description: 'Normal träning' }
      )
      break
  }

  // Pad or trim to match totalDays
  while (steps.length < totalDays) {
    // Add rest days at the beginning for longer protocols
    steps.unshift({ intensity: 'NONE', percent: 0, duration: 0, description: 'Vila' })
  }
  while (steps.length > totalDays) {
    steps.shift()
  }

  return steps
}

/**
 * Get appropriate activities for each phase
 */
function getActivitiesForPhase(intensity: ReturnPhase['intensity'], illnessType: IllnessType): string[] {
  switch (intensity) {
    case 'NONE':
      return ['Vila', 'Lätt stretching om det känns bra', 'Dagliga aktiviteter']

    case 'VERY_LIGHT':
      return [
        'Promenad i lugnt tempo',
        'Lätt cykling (stationär)',
        'Yoga/stretching',
        illnessType === 'GI' ? 'Se till att dricka ordentligt' : 'Lätt rörlighet',
      ].filter(Boolean)

    case 'LIGHT':
      return [
        'Lätt jogging 10-15 min',
        'Cykling i låg puls',
        'Simning i lugnt tempo',
        'Lätt styrketräning (50% av normal belastning)',
      ]

    case 'MODERATE':
      return [
        'Moderat löpning',
        'Intervalliknande pass med låg intensitet',
        'Normal styrketräning med reducerad volym',
        'Sport-specifik träning i lugnt tempo',
      ]

    case 'NORMAL':
      return [
        'Normal träning enligt program',
        'Lyssna på kroppen',
        'Var beredd att backa om tröttheten ökar',
      ]
  }
}

/**
 * Get warnings for specific phase
 */
function getWarningsForPhase(day: number, info: IllnessInfo): string[] {
  const warnings: string[] = []

  if (day <= 2) {
    warnings.push('Avbryt omedelbart vid yrsel, illamående eller andningsbesvär')
    if (info.hadFever) {
      warnings.push('Kontrollera temperatur före aktivitet')
    }
  }

  if (day <= 4) {
    warnings.push('Håll intensiteten lägre än planerat om du känner dig trött')
  }

  if (info.type === 'RESPIRATORY') {
    warnings.push('Undvik träning i kall luft de första dagarna')
  }

  if (info.type === 'GI') {
    if (day <= 3) {
      warnings.push('Prioritera vätskeintag - minst 2-3 liter per dag')
    }
  }

  return warnings
}

/**
 * Get readiness check question for the day
 */
function getReadinessCheck(day: number, severity: IllnessSeverity): string {
  if (day === 1) {
    return 'Har du varit feberfri i minst 24 timmar utan febernedsättande medicin?'
  }

  if (day <= 3) {
    return 'Känner du dig utvilad efter gårdagens aktivitet?'
  }

  if (severity === 'SEVERE' && day <= 5) {
    return 'Har du kunnat sova normalt och vaknat utvilad?'
  }

  return 'Hur känns energinivån idag? (Fortsätt bara om >70%)'
}

/**
 * Get general guidelines based on illness type
 */
function getGeneralGuidelines(illnessType: IllnessType): string[] {
  const common = [
    'Vila är en del av träningen - underskatta inte återhämtning',
    'Det är bättre att komma tillbaka för sent än för tidigt',
    'Öka belastningen stegvis - max 10% per dag',
    'Sov minst 8 timmar per natt under återhämtningen',
  ]

  switch (illnessType) {
    case 'RESPIRATORY':
      return [
        ...common,
        'Undvik hård andning i kall/torr luft de första dagarna',
        'Hostretning under träning är vanligt - minska intensiteten om det händer',
      ]

    case 'GI':
      return [
        ...common,
        'Återställ vätskebalansen innan du börjar träna',
        'Ät lättsmält mat och undvik tungt intag före träning',
        'Elektrolyter kan behövas om du haft diarré/kräkningar',
      ]

    case 'FEVER':
      return [
        ...common,
        'Feber tyder på att kroppen kämpar - ge den tid att återhämta sig',
        'Vänta minst 24-48 timmar efter att febern gått ner',
        'Kontakta läkare om febern återkommer under återhämtningen',
      ]

    default:
      return common
  }
}

/**
 * Get warning signs to watch for
 */
function getWarningSignsToWatch(illnessType: IllnessType): string[] {
  const common = [
    'Feber som återkommer (>38°C)',
    'Onormal trötthet efter lätt aktivitet',
    'Hjärtklappning eller oregelbunden puls',
    'Yrsel eller svimningskänsla',
    'Bröstsmärta eller andningsbesvär',
  ]

  switch (illnessType) {
    case 'RESPIRATORY':
      return [
        ...common,
        'Ihållande hosta som förvärras av aktivitet',
        'Pipande andning eller andnöd',
      ]

    case 'GI':
      return [
        ...common,
        'Fortsatta magproblem',
        'Tecken på uttorkning (mörkare urin, yrsel)',
      ]

    case 'FEVER':
      return [
        ...common,
        'Muskelsmärta eller ledvärk',
        'Svullna lymfkörtlar',
      ]

    default:
      return common
  }
}

/**
 * Format protocol for display
 */
export function formatProtocolSummary(protocol: ReturnProtocol): string {
  const lines = [
    `📅 Återgångsprotokoll: ${protocol.totalDays} dagar`,
    `Startdatum: ${format(protocol.startDate, 'd MMMM', { locale: sv })}`,
    `Slutdatum: ${format(protocol.endDate, 'd MMMM', { locale: sv })}`,
    '',
  ]

  if (protocol.requiresMedicalClearance) {
    lines.push('⚠️ LÄKARGODKÄNNANDE KRÄVS')
    lines.push(protocol.medicalClearanceReason || '')
    lines.push('')
  }

  lines.push('Faser:')
  protocol.phases.forEach((phase) => {
    const intensityEmoji = {
      NONE: '🔴',
      VERY_LIGHT: '🟠',
      LIGHT: '🟡',
      MODERATE: '🟢',
      NORMAL: '✅',
    }
    lines.push(
      `  ${intensityEmoji[phase.intensity]} Dag ${phase.day}: ${phase.description} (${phase.intensityPercent}%, ${phase.durationMinutes} min)`
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
 * Get intensity label in Swedish
 */
export function getIntensityLabel(intensity: ReturnPhase['intensity']): string {
  switch (intensity) {
    case 'NONE':
      return 'Vila'
    case 'VERY_LIGHT':
      return 'Mycket lätt'
    case 'LIGHT':
      return 'Lätt'
    case 'MODERATE':
      return 'Moderat'
    case 'NORMAL':
      return 'Normal'
  }
}
