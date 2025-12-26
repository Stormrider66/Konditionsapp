/**
 * Training Camp Utilities
 *
 * Utilities for planning and managing multi-day training camps.
 * Handles volume adjustments, session planning, and recovery considerations.
 */

import { addDays, differenceInDays, format } from 'date-fns'
import { sv } from 'date-fns/locale'

export type CampType = 'ENDURANCE' | 'SPEED' | 'MIXED' | 'RECOVERY'
export type CampFocus = 'VOLUME' | 'INTENSITY' | 'TECHNIQUE' | 'MIXED'

export interface TrainingCampInfo {
  startDate: Date
  endDate: Date
  campType: CampType
  campFocus?: CampFocus
  sessionsPerDay?: number // 1, 2, or 3
  volumeMultiplier?: number // e.g., 1.5 for 150% of normal volume
  isAltitude?: boolean
  altitude?: number
  location?: string
}

export interface CampDay {
  date: Date
  day: number
  isRestDay: boolean
  sessions: CampSession[]
  volumePercent: number // % of normal daily volume
  recommendations: string[]
}

export interface CampSession {
  sessionNumber: number
  type: 'MORNING' | 'MIDDAY' | 'AFTERNOON' | 'EVENING'
  focus: string
  durationMinutes: number
  intensity: 'EASY' | 'MODERATE' | 'HARD' | 'RECOVERY'
  notes: string
}

export interface TrainingCampPlan {
  camp: TrainingCampInfo
  totalDays: number
  totalSessions: number
  days: CampDay[]
  volumeProgression: number[] // % for each day
  restDayPattern: number[] // which days are rest (1-indexed)
  generalGuidelines: string[]
  recoveryRecommendations: string[]
  nutritionTips: string[]
}

/**
 * Calculate recommended volume progression for camp
 */
export function calculateVolumeProgression(totalDays: number, campType: CampType): number[] {
  const progression: number[] = []

  // Build-up pattern with mid-camp and final rest days
  for (let day = 1; day <= totalDays; day++) {
    let volume: number

    // First day: moderate start
    if (day === 1) {
      volume = 80
    }
    // Gradual build-up days 2-3
    else if (day <= 3) {
      volume = 100 + (day - 1) * 10 // 110%, 120%
    }
    // Mid-camp rest day (around day 4-5 for 7+ day camps)
    else if (totalDays >= 7 && (day === 4 || day === Math.floor(totalDays / 2))) {
      volume = 50 // Rest day
    }
    // Peak volume days
    else if (day <= totalDays - 2) {
      volume = campType === 'RECOVERY' ? 70 : 120 + Math.min((day - 3) * 5, 20) // Up to 140%
    }
    // Taper down last 2 days
    else if (day === totalDays - 1) {
      volume = 90
    }
    // Final day: easy
    else {
      volume = 60
    }

    progression.push(volume)
  }

  return progression
}

/**
 * Determine rest day pattern based on camp length
 */
export function getRestDayPattern(totalDays: number): number[] {
  if (totalDays <= 3) return [] // No rest days for short camps
  if (totalDays <= 5) return [totalDays] // Last day easy
  if (totalDays <= 7) return [4, totalDays] // Mid and end
  if (totalDays <= 10) return [4, 7, totalDays] // Every 3-4 days
  return [4, 7, 10, totalDays] // Regular rest pattern
}

/**
 * Generate sessions for a camp day
 */
function generateDaySessions(
  day: number,
  volumePercent: number,
  sessionsPerDay: number,
  campType: CampType,
  campFocus: CampFocus,
  isRestDay: boolean
): CampSession[] {
  if (isRestDay) {
    return [
      {
        sessionNumber: 1,
        type: 'MORNING',
        focus: 'Aktiv vila',
        durationMinutes: 30,
        intensity: 'RECOVERY',
        notes: 'Lätt promenad, stretching, massage',
      },
    ]
  }

  const sessions: CampSession[] = []

  // Adjust session count based on volume
  const effectiveSessions = volumePercent >= 100 ? sessionsPerDay : Math.min(sessionsPerDay, 2)

  for (let i = 1; i <= effectiveSessions; i++) {
    const sessionType = getSessionType(i, effectiveSessions)
    const { focus, duration, intensity } = getSessionDetails(
      i,
      effectiveSessions,
      campType,
      campFocus,
      volumePercent
    )

    sessions.push({
      sessionNumber: i,
      type: sessionType,
      focus,
      durationMinutes: duration,
      intensity,
      notes: getSessionNotes(i, effectiveSessions, campType),
    })
  }

  return sessions
}

function getSessionType(
  sessionNumber: number,
  totalSessions: number
): 'MORNING' | 'MIDDAY' | 'AFTERNOON' | 'EVENING' {
  if (totalSessions === 1) return 'MORNING'
  if (totalSessions === 2) return sessionNumber === 1 ? 'MORNING' : 'AFTERNOON'
  // 3 sessions
  if (sessionNumber === 1) return 'MORNING'
  if (sessionNumber === 2) return 'MIDDAY'
  return 'AFTERNOON'
}

function getSessionDetails(
  sessionNumber: number,
  totalSessions: number,
  campType: CampType,
  campFocus: CampFocus,
  volumePercent: number
): { focus: string; duration: number; intensity: CampSession['intensity'] } {
  // First session is usually the main/quality session
  if (sessionNumber === 1) {
    switch (campType) {
      case 'ENDURANCE':
        return {
          focus: campFocus === 'INTENSITY' ? 'Tempopass' : 'Långpass',
          duration: volumePercent >= 100 ? 90 : 60,
          intensity: campFocus === 'INTENSITY' ? 'HARD' : 'MODERATE',
        }
      case 'SPEED':
        return {
          focus: 'Intervaller',
          duration: 60,
          intensity: 'HARD',
        }
      case 'RECOVERY':
        return {
          focus: 'Lätt löpning',
          duration: 45,
          intensity: 'EASY',
        }
      default:
        return {
          focus: 'Huvudpass',
          duration: 75,
          intensity: 'MODERATE',
        }
    }
  }

  // Second session
  if (sessionNumber === 2) {
    return {
      focus: totalSessions === 2 ? 'Distanspass' : 'Teknik/Styrka',
      duration: totalSessions === 2 ? 60 : 45,
      intensity: 'MODERATE',
    }
  }

  // Third session (if exists)
  return {
    focus: 'Lätt jogging',
    duration: 30,
    intensity: 'EASY',
  }
}

function getSessionNotes(
  sessionNumber: number,
  totalSessions: number,
  campType: CampType
): string {
  if (sessionNumber === 1 && campType === 'ENDURANCE') {
    return 'Huvudpass - fokus på aerob utveckling'
  }
  if (sessionNumber === 1 && campType === 'SPEED') {
    return 'Kvalitetspass - full återhämtning mellan intervaller'
  }
  if (sessionNumber === totalSessions && totalSessions > 1) {
    return 'Avslutande pass - lätt för återhämtning'
  }
  return ''
}

/**
 * Generate complete training camp plan
 */
export function generateTrainingCampPlan(info: TrainingCampInfo): TrainingCampPlan {
  const totalDays = differenceInDays(info.endDate, info.startDate) + 1
  const volumeProgression = calculateVolumeProgression(totalDays, info.campType)
  const restDayPattern = getRestDayPattern(totalDays)
  const sessionsPerDay = info.sessionsPerDay || 2
  const campFocus = info.campFocus || 'MIXED'

  const days: CampDay[] = []
  let totalSessions = 0

  for (let day = 1; day <= totalDays; day++) {
    const date = addDays(info.startDate, day - 1)
    const isRestDay = restDayPattern.includes(day)
    const volumePercent = volumeProgression[day - 1]

    const sessions = generateDaySessions(
      day,
      volumePercent,
      sessionsPerDay,
      info.campType,
      campFocus,
      isRestDay
    )

    totalSessions += sessions.length

    days.push({
      date,
      day,
      isRestDay,
      sessions,
      volumePercent,
      recommendations: getDayRecommendations(day, totalDays, isRestDay, volumePercent),
    })
  }

  return {
    camp: info,
    totalDays,
    totalSessions,
    days,
    volumeProgression,
    restDayPattern,
    generalGuidelines: getGeneralGuidelines(info.campType, totalDays),
    recoveryRecommendations: getRecoveryRecommendations(totalDays),
    nutritionTips: getNutritionTips(info.campType),
  }
}

function getDayRecommendations(
  day: number,
  totalDays: number,
  isRestDay: boolean,
  volumePercent: number
): string[] {
  const recommendations: string[] = []

  if (day === 1) {
    recommendations.push('Sätt dig in i planen, bekanta dig med miljön')
    recommendations.push('Ta det lugnt första dagen - kroppen behöver anpassa sig')
  }

  if (isRestDay) {
    recommendations.push('Aktiv vila - promenad, simning, massage')
    recommendations.push('Extra fokus på sömn och näring')
    return recommendations
  }

  if (volumePercent >= 130) {
    recommendations.push('Hög volymdag - prioritera bränsle och vätskeintag')
    recommendations.push('Planera för extra vila mellan passen')
  }

  if (day === totalDays - 1 || day === totalDays) {
    recommendations.push('Börja sänka belastningen inför hemresa')
    recommendations.push('Fokus på återhämtning')
  }

  if (recommendations.length === 0) {
    recommendations.push('Normal träningsdag enligt plan')
  }

  return recommendations
}

function getGeneralGuidelines(campType: CampType, totalDays: number): string[] {
  const common = [
    'Håll en stabil dygnsrytm med regelbundna måltider',
    'Sov minst 8-9 timmar per natt',
    'Dokumentera träningen och hur du mår',
    'Lyssna på kroppen - anpassa vid behov',
  ]

  switch (campType) {
    case 'ENDURANCE':
      return [
        ...common,
        'Fokus på att bygga aerob kapacitet',
        'Undvik för höga intensiteter tidigt i lägret',
        'Använd pulsklocka för att hålla rätt zon',
      ]
    case 'SPEED':
      return [
        ...common,
        'Full återhämtning mellan intervaller',
        'Värm upp ordentligt före kvalitetspass',
        'Ta det lugnt om benmuskulaturen är trött',
      ]
    case 'RECOVERY':
      return [
        ...common,
        'Detta är ett återhämtningsläger - ingen press',
        'Fokus på teknik och rörlighet',
        'Mental avkoppling lika viktigt som fysisk',
      ]
    default:
      return common
  }
}

function getRecoveryRecommendations(totalDays: number): string[] {
  const baseRecs = [
    'Planera 2-3 lätta dagar efter hemkomst',
    'Återgå gradvis till normal träning',
    'Extra sömn första veckan hem',
  ]

  if (totalDays >= 7) {
    return [
      ...baseRecs,
      'Första kvalitetspasset tidigast 4-5 dagar efter lägret',
      'Var uppmärksam på tecken på överträning',
    ]
  }

  return baseRecs
}

function getNutritionTips(campType: CampType): string[] {
  const common = [
    'Ät regelbundet var 3-4:e timme',
    'Drick minst 2-3 liter per dag (mer vid värme)',
    'Ta med energi under pass längre än 60 min',
  ]

  if (campType === 'ENDURANCE') {
    return [
      ...common,
      'Kolhydratrik kost - 6-8 g/kg kroppsvikt/dag',
      'Återhämtningsmat inom 30 min efter pass',
    ]
  }

  return common
}

/**
 * Get camp type label in Swedish
 */
export function getCampTypeLabel(campType: CampType): string {
  switch (campType) {
    case 'ENDURANCE':
      return 'Distansläger'
    case 'SPEED':
      return 'Fartläger'
    case 'MIXED':
      return 'Blandläger'
    case 'RECOVERY':
      return 'Återhämtningsläger'
  }
}

/**
 * Get camp focus label in Swedish
 */
export function getCampFocusLabel(campFocus: CampFocus): string {
  switch (campFocus) {
    case 'VOLUME':
      return 'Volym'
    case 'INTENSITY':
      return 'Intensitet'
    case 'TECHNIQUE':
      return 'Teknik'
    case 'MIXED':
      return 'Blandat'
  }
}
