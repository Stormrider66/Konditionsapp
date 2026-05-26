/**
 * Training Camp Utilities
 *
 * Utilities for planning and managing multi-day training camps.
 * Handles volume adjustments, session planning, and recovery considerations.
 */

import { addDays, differenceInDays } from 'date-fns'

export type TrainingCampLocale = 'en' | 'sv'
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
  locale?: TrainingCampLocale
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

function text(locale: TrainingCampLocale, en: string, svText: string): string {
  return locale === 'sv' ? svText : en
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
  volumePercent: number,
  sessionsPerDay: number,
  campType: CampType,
  campFocus: CampFocus,
  isRestDay: boolean,
  locale: TrainingCampLocale
): CampSession[] {
  if (isRestDay) {
    return [
      {
        sessionNumber: 1,
        type: 'MORNING',
        focus: text(locale, 'Active recovery', 'Aktiv vila'),
        durationMinutes: 30,
        intensity: 'RECOVERY',
        notes: text(
          locale,
          'Easy walk, stretching, massage',
          'Lätt promenad, stretching, massage'
        ),
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
      volumePercent,
      locale
    )

    sessions.push({
      sessionNumber: i,
      type: sessionType,
      focus,
      durationMinutes: duration,
      intensity,
      notes: getSessionNotes(i, effectiveSessions, campType, locale),
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
  volumePercent: number,
  locale: TrainingCampLocale
): { focus: string; duration: number; intensity: CampSession['intensity'] } {
  // First session is usually the main/quality session
  if (sessionNumber === 1) {
    switch (campType) {
      case 'ENDURANCE':
        return {
          focus:
            campFocus === 'INTENSITY'
              ? text(locale, 'Tempo session', 'Tempopass')
              : text(locale, 'Long session', 'Långpass'),
          duration: volumePercent >= 100 ? 90 : 60,
          intensity: campFocus === 'INTENSITY' ? 'HARD' : 'MODERATE',
        }
      case 'SPEED':
        return {
          focus: text(locale, 'Intervals', 'Intervaller'),
          duration: 60,
          intensity: 'HARD',
        }
      case 'RECOVERY':
        return {
          focus: text(locale, 'Easy run', 'Lätt löpning'),
          duration: 45,
          intensity: 'EASY',
        }
      default:
        return {
          focus: text(locale, 'Main session', 'Huvudpass'),
          duration: 75,
          intensity: 'MODERATE',
        }
    }
  }

  // Second session
  if (sessionNumber === 2) {
    return {
      focus:
        totalSessions === 2
          ? text(locale, 'Distance session', 'Distanspass')
          : text(locale, 'Technique/Strength', 'Teknik/Styrka'),
      duration: totalSessions === 2 ? 60 : 45,
      intensity: 'MODERATE',
    }
  }

  // Third session (if exists)
  return {
    focus: text(locale, 'Easy jog', 'Lätt jogging'),
    duration: 30,
    intensity: 'EASY',
  }
}

function getSessionNotes(
  sessionNumber: number,
  totalSessions: number,
  campType: CampType,
  locale: TrainingCampLocale
): string {
  if (sessionNumber === 1 && campType === 'ENDURANCE') {
    return text(
      locale,
      'Main session - focus on aerobic development',
      'Huvudpass - fokus på aerob utveckling'
    )
  }
  if (sessionNumber === 1 && campType === 'SPEED') {
    return text(
      locale,
      'Quality session - full recovery between intervals',
      'Kvalitetspass - full återhämtning mellan intervaller'
    )
  }
  if (sessionNumber === totalSessions && totalSessions > 1) {
    return text(
      locale,
      'Closing session - easy for recovery',
      'Avslutande pass - lätt för återhämtning'
    )
  }
  return ''
}

/**
 * Generate complete training camp plan
 */
export function generateTrainingCampPlan(
  info: TrainingCampInfo,
  locale: TrainingCampLocale = info.locale ?? 'en'
): TrainingCampPlan {
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
      volumePercent,
      sessionsPerDay,
      info.campType,
      campFocus,
      isRestDay,
      locale
    )

    totalSessions += sessions.length

    days.push({
      date,
      day,
      isRestDay,
      sessions,
      volumePercent,
      recommendations: getDayRecommendations(day, totalDays, isRestDay, volumePercent, locale),
    })
  }

  return {
    camp: info,
    totalDays,
    totalSessions,
    days,
    volumeProgression,
    restDayPattern,
    generalGuidelines: getGeneralGuidelines(info.campType, locale),
    recoveryRecommendations: getRecoveryRecommendations(totalDays, locale),
    nutritionTips: getNutritionTips(info.campType, locale),
  }
}

function getDayRecommendations(
  day: number,
  totalDays: number,
  isRestDay: boolean,
  volumePercent: number,
  locale: TrainingCampLocale
): string[] {
  const recommendations: string[] = []

  if (day === 1) {
    recommendations.push(
      text(
        locale,
        'Get familiar with the plan and the environment',
        'Sätt dig in i planen, bekanta dig med miljön'
      )
    )
    recommendations.push(
      text(
        locale,
        'Take it easy on day one - the body needs time to adapt',
        'Ta det lugnt första dagen - kroppen behöver anpassa sig'
      )
    )
  }

  if (isRestDay) {
    recommendations.push(
      text(
        locale,
        'Active recovery - walking, swimming, massage',
        'Aktiv vila - promenad, simning, massage'
      )
    )
    recommendations.push(
      text(locale, 'Extra focus on sleep and nutrition', 'Extra fokus på sömn och näring')
    )
    return recommendations
  }

  if (volumePercent >= 130) {
    recommendations.push(
      text(
        locale,
        'High-volume day - prioritize fuel and fluids',
        'Hög volymdag - prioritera bränsle och vätskeintag'
      )
    )
    recommendations.push(
      text(locale, 'Plan extra rest between sessions', 'Planera för extra vila mellan passen')
    )
  }

  if (day === totalDays - 1 || day === totalDays) {
    recommendations.push(
      text(
        locale,
        'Start lowering the load before traveling home',
        'Börja sänka belastningen inför hemresa'
      )
    )
    recommendations.push(text(locale, 'Focus on recovery', 'Fokus på återhämtning'))
  }

  if (recommendations.length === 0) {
    recommendations.push(
      text(locale, 'Normal training day according to plan', 'Normal träningsdag enligt plan')
    )
  }

  return recommendations
}

function getGeneralGuidelines(campType: CampType, locale: TrainingCampLocale): string[] {
  const common = [
    text(
      locale,
      'Keep a stable daily rhythm with regular meals',
      'Håll en stabil dygnsrytm med regelbundna måltider'
    ),
    text(locale, 'Sleep at least 8-9 hours per night', 'Sov minst 8-9 timmar per natt'),
    text(locale, 'Log your training and how you feel', 'Dokumentera träningen och hur du mår'),
    text(locale, 'Listen to your body - adjust when needed', 'Lyssna på kroppen - anpassa vid behov'),
  ]

  switch (campType) {
    case 'ENDURANCE':
      return [
        ...common,
        text(locale, 'Focus on building aerobic capacity', 'Fokus på att bygga aerob kapacitet'),
        text(
          locale,
          'Avoid high intensities early in the camp',
          'Undvik för höga intensiteter tidigt i lägret'
        ),
        text(
          locale,
          'Use a heart rate monitor to stay in the right zone',
          'Använd pulsklocka för att hålla rätt zon'
        ),
      ]
    case 'SPEED':
      return [
        ...common,
        text(locale, 'Full recovery between intervals', 'Full återhämtning mellan intervaller'),
        text(
          locale,
          'Warm up thoroughly before quality sessions',
          'Värm upp ordentligt före kvalitetspass'
        ),
        text(locale, 'Ease off if the leg muscles feel tired', 'Ta det lugnt om benmuskulaturen är trött'),
      ]
    case 'RECOVERY':
      return [
        ...common,
        text(
          locale,
          'This is a recovery camp - no pressure',
          'Detta är ett återhämtningsläger - ingen press'
        ),
        text(locale, 'Focus on technique and mobility', 'Fokus på teknik och rörlighet'),
        text(
          locale,
          'Mental relaxation is as important as physical recovery',
          'Mental avkoppling lika viktigt som fysisk'
        ),
      ]
    default:
      return common
  }
}

function getRecoveryRecommendations(totalDays: number, locale: TrainingCampLocale): string[] {
  const baseRecs = [
    text(locale, 'Plan 2-3 easy days after returning home', 'Planera 2-3 lätta dagar efter hemkomst'),
    text(locale, 'Gradually return to normal training', 'Återgå gradvis till normal träning'),
    text(locale, 'Extra sleep during the first week at home', 'Extra sömn första veckan hem'),
  ]

  if (totalDays >= 7) {
    return [
      ...baseRecs,
      text(
        locale,
        'First quality session no earlier than 4-5 days after camp',
        'Första kvalitetspasset tidigast 4-5 dagar efter lägret'
      ),
      text(locale, 'Watch for signs of overtraining', 'Var uppmärksam på tecken på överträning'),
    ]
  }

  return baseRecs
}

function getNutritionTips(campType: CampType, locale: TrainingCampLocale): string[] {
  const common = [
    text(locale, 'Eat regularly every 3-4 hours', 'Ät regelbundet var 3-4:e timme'),
    text(
      locale,
      'Drink at least 2-3 liters per day (more in hot weather)',
      'Drick minst 2-3 liter per dag (mer vid värme)'
    ),
    text(locale, 'Bring fuel for sessions longer than 60 min', 'Ta med energi under pass längre än 60 min'),
  ]

  if (campType === 'ENDURANCE') {
    return [
      ...common,
      text(
        locale,
        'Carbohydrate-rich diet - 6-8 g/kg body weight/day',
        'Kolhydratrik kost - 6-8 g/kg kroppsvikt/dag'
      ),
      text(
        locale,
        'Recovery food within 30 min after sessions',
        'Återhämtningsmat inom 30 min efter pass'
      ),
    ]
  }

  return common
}

/**
 * Get camp type label.
 */
export function getCampTypeLabel(campType: CampType, locale: TrainingCampLocale = 'en'): string {
  if (locale === 'en') {
    switch (campType) {
      case 'ENDURANCE':
        return 'Endurance camp'
      case 'SPEED':
        return 'Speed camp'
      case 'MIXED':
        return 'Mixed camp'
      case 'RECOVERY':
        return 'Recovery camp'
    }
  }

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
 * Get camp focus label.
 */
export function getCampFocusLabel(campFocus: CampFocus, locale: TrainingCampLocale = 'en'): string {
  if (locale === 'en') {
    switch (campFocus) {
      case 'VOLUME':
        return 'Volume'
      case 'INTENSITY':
        return 'Intensity'
      case 'TECHNIQUE':
        return 'Technique'
      case 'MIXED':
        return 'Mixed'
    }
  }

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
