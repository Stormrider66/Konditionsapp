/**
 * Calendar Context Builder for AI
 *
 * Builds calendar-aware context for AI chat and program generation.
 * Provides information about blocked days, altitude camps, illness periods,
 * and other calendar constraints that affect training.
 */

import { prisma } from '@/lib/prisma'
import {
  calculateAvailability,
  getCalendarConstraints,
  type AvailabilityResult,
  type BlockedDay,
  type ReducedDay,
  type AltitudePeriod,
} from '@/lib/calendar/availability-calculator'
import { format, differenceInDays, addDays } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { CalendarEventType, EventImpact } from '@prisma/client'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, svText: string): string {
  return locale === 'sv' ? svText : en
}

function dateFnsLocale(locale: AppLocale) {
  return locale === 'sv' ? sv : enUS
}

function formatDayMonth(date: Date, locale: AppLocale): string {
  return format(date, 'd MMM', { locale: dateFnsLocale(locale) })
}

/**
 * Calendar context for AI prompts
 */
export interface CalendarContext {
  /** Whether calendar data is available */
  hasCalendarData: boolean
  /** Human-readable context for AI prompt */
  contextText: string
  /** Raw availability data */
  availability?: AvailabilityResult
  /** Structured constraints for program generation */
  constraints?: {
    blockedDates: string[]
    reducedDates: string[]
    altitudePeriods: { start: string; end: string; altitude: number }[]
  }
}

/**
 * Upcoming calendar summary for quick reference
 */
export interface UpcomingCalendarSummary {
  upcomingBlockers: {
    title: string
    startDate: Date
    endDate: Date
    type: CalendarEventType
    impact: EventImpact
    daysUntil: number
  }[]
  currentAltitude?: {
    altitude: number
    phase: string
    daysInCamp: number
    endDate: Date
  }
  recentIllness?: {
    endDate: Date
    daysSinceRecovery: number
    inRecoveryPeriod: boolean
  }
}

/**
 * Build calendar context for AI chat
 *
 * @param clientId - The athlete's client ID
 * @param programStartDate - Optional program start date for availability calculation
 * @param programEndDate - Optional program end date
 * @returns Calendar context for AI prompts
 */
export async function buildCalendarContext(
  clientId: string,
  programStartDate?: Date,
  programEndDate?: Date,
  locale: AppLocale = 'en'
): Promise<CalendarContext> {
  try {
    // Default to next 12 weeks if no dates provided
    const startDate = programStartDate || new Date()
    const endDate = programEndDate || addDays(new Date(), 84) // 12 weeks

    // Get availability data
    const availability = await calculateAvailability(clientId, startDate, endDate, locale)
    const constraints = await getCalendarConstraints(clientId, startDate, endDate, locale)

    // Get upcoming events for context
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        clientId,
        status: { not: 'CANCELLED' },
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: 'asc' },
      take: 10,
    })

    // Build human-readable context
    let contextText = ''

    if (availability.blockedCount === 0 && availability.reducedCount === 0 && availability.altitudePeriods.length === 0) {
      contextText = `
## ${t(locale, 'CALENDAR CONTEXT', 'KALENDERKONTEXT')}
${t(locale, 'No calendar blockers or constraints exist for this period.', 'Inga kalenderblockerare eller begränsningar finns för denna period.')}
${t(locale, 'All days are available for training.', 'Alla dagar är tillgängliga för träning.')}
`
      return {
        hasCalendarData: false,
        contextText,
        availability,
        constraints,
      }
    }

    contextText = `
## ${t(locale, 'CALENDAR CONTEXT', 'KALENDERKONTEXT')}

### ${t(locale, 'Availability overview', 'Tillgänglighetsöversikt')}
- **${t(locale, 'Period', 'Perioden')}**: ${format(startDate, 'd MMMM', { locale: dateFnsLocale(locale) })} - ${format(endDate, 'd MMMM yyyy', { locale: dateFnsLocale(locale) })}
- **${t(locale, 'Total days', 'Totalt dagar')}**: ${availability.totalDays}
- **${t(locale, 'Available days', 'Tillgängliga dagar')}**: ${availability.availableCount} (${Math.round((availability.availableCount / availability.totalDays) * 100)}%)
- **${t(locale, 'Blocked days', 'Blockerade dagar')}**: ${availability.blockedCount}
- **${t(locale, 'Reduced days', 'Reducerade dagar')}**: ${availability.reducedCount}
`

    // Add blocked periods
    if (availability.blockedDays.length > 0) {
      contextText += buildBlockedDaysContext(availability.blockedDays, locale)
    }

    // Add reduced capacity periods
    if (availability.reducedDays.length > 0) {
      contextText += buildReducedDaysContext(availability.reducedDays, locale)
    }

    // Add altitude periods
    if (availability.altitudePeriods.length > 0) {
      contextText += buildAltitudeContext(availability.altitudePeriods, locale)
    }

    // Add upcoming events summary
    if (upcomingEvents.length > 0) {
      contextText += buildUpcomingEventsContext(upcomingEvents, locale)
    }

    // Add training recommendations based on calendar
    contextText += buildTrainingRecommendations(availability, locale)

    return {
      hasCalendarData: true,
      contextText,
      availability,
      constraints,
    }
  } catch (error) {
    console.error('Error building calendar context:', error)
    return {
      hasCalendarData: false,
      contextText: '',
    }
  }
}

/**
 * Build context for blocked days (NO_TRAINING impact)
 */
function buildBlockedDaysContext(blockedDays: BlockedDay[], locale: AppLocale): string {
  // Group consecutive blocked days into periods
  const periods = groupConsecutiveDays(blockedDays)

  let context = `
### ${t(locale, 'Blocked periods (no training)', 'Blockerade perioder (ingen träning)')}
`

  for (const period of periods) {
    const startStr = formatDayMonth(period.startDate, locale)
    const endStr = formatDayMonth(period.endDate, locale)
    const days = differenceInDays(period.endDate, period.startDate) + 1
    const reason = translateEventType(period.type, locale)

    if (days === 1) {
      context += `- **${startStr}**: ${reason} - ${period.title}\n`
    } else {
      context += `- **${startStr} - ${endStr}** (${days} ${t(locale, 'days', 'dagar')}): ${reason} - ${period.title}\n`
    }
  }

  return context
}

/**
 * Build context for reduced capacity days
 */
function buildReducedDaysContext(reducedDays: ReducedDay[], locale: AppLocale): string {
  // Group consecutive reduced days into periods
  const periods = groupConsecutiveDays(reducedDays as unknown as BlockedDay[])

  let context = `
### ${t(locale, 'Reduced training capacity', 'Reducerad träningskapacitet')}
`

  for (const period of periods) {
    const startStr = formatDayMonth(period.startDate, locale)
    const endStr = formatDayMonth(period.endDate, locale)
    const days = differenceInDays(period.endDate, period.startDate) + 1

    if (days === 1) {
      context += `- **${startStr}**: ${period.reason}\n`
    } else {
      context += `- **${startStr} - ${endStr}** (${days} ${t(locale, 'days', 'dagar')}): ${period.reason}\n`
    }
  }

  context += `
*${t(locale, 'Training volume and intensity should be reduced on these days.', 'Under dessa dagar bör träningsvolym och intensitet reduceras.')}*
`

  return context
}

/**
 * Build context for altitude camp periods
 */
function buildAltitudeContext(altitudePeriods: AltitudePeriod[], locale: AppLocale): string {
  let context = `
### ${t(locale, 'Altitude camp', 'Höghöjdsläger')}
`

  for (const period of altitudePeriods) {
    const startStr = formatDayMonth(period.startDate, locale)
    const endStr = formatDayMonth(period.endDate, locale)
    const days = differenceInDays(period.endDate, period.startDate) + 1
    const phase = translateAltitudePhase(period.adaptationPhase, locale)

    context += `
#### ${startStr} - ${endStr} (${days} ${t(locale, 'days', 'dagar')} @ ${period.altitude}m)
- **${t(locale, 'Current phase', 'Nuvarande fas')}**: ${phase}
- **${t(locale, 'Adaptation', 'Anpassning')}**: ${getAltitudeRecommendations(period.adaptationPhase, period.altitude, locale)}
`

    if (period.seaLevelReturnDate) {
      const returnStr = formatDayMonth(period.seaLevelReturnDate, locale)
      context += `- **${t(locale, 'Optimal competition window', 'Optimal tävlingsperiod')}**: ${t(locale, '14-21 days after', '14-21 dagar efter')} ${returnStr}
`
    }
  }

  context += `
**${t(locale, 'ALTITUDE ADAPTATION - IMPORTANT', 'HÖGHÖJDSANPASSNING - VIKTIGT')}:**
- ${t(locale, 'Days 1-3: reduce intensity to 60%, volume to 50%', 'Dag 1-3: Reducera intensitet till 60%, volym 50%')}
- ${t(locale, 'Days 4-5: gradual increase to 70% intensity', 'Dag 4-5: Gradvis ökning till 70% intensitet')}
- ${t(locale, 'Days 6-10: 80% intensity, 75% volume', 'Dag 6-10: 80% intensitet, 75% volym')}
- ${t(locale, 'Day 11+: near-normal training (90-95%)', 'Dag 11+: Nära normal träning (90-95%)')}
- ${t(locale, 'Avoid VO2max sessions during the first 5 days', 'Undvik VO2max-pass de första 5 dagarna')}
`

  return context
}

/**
 * Build context for upcoming calendar events
 */
function buildUpcomingEventsContext(events: {
  title: string
  startDate: Date
  endDate: Date
  type: CalendarEventType
  trainingImpact: EventImpact
}[], locale: AppLocale): string {
  const significantEvents = events.filter(
    (e) => e.trainingImpact !== 'NORMAL' || e.type === 'ALTITUDE_CAMP' || e.type === 'TRAINING_CAMP'
  )

  if (significantEvents.length === 0) return ''

  let context = `
### ${t(locale, 'Upcoming events to consider', 'Kommande händelser att beakta')}
`

  for (const event of significantEvents.slice(0, 5)) {
    const startStr = formatDayMonth(event.startDate, locale)
    const daysUntil = differenceInDays(event.startDate, new Date())
    const impact = translateImpact(event.trainingImpact, locale)

    context += `- **${startStr}** (${t(locale, 'in', 'om')} ${daysUntil} ${t(locale, 'days', 'dagar')}): ${event.title} - ${impact}\n`
  }

  return context
}

/**
 * Build training recommendations based on calendar constraints
 */
function buildTrainingRecommendations(availability: AvailabilityResult, locale: AppLocale): string {
  const recommendations: string[] = []

  // Check for high blocked ratio
  const blockedRatio = availability.blockedCount / availability.totalDays
  if (blockedRatio > 0.2) {
    recommendations.push(
      t(
        locale,
        'High share of blocked days - consider concentrating quality sessions on available days',
        'Hög andel blockerade dagar - överväg att koncentrera kvalitetspass till tillgängliga dagar'
      )
    )
  }

  // Check for altitude camps
  if (availability.altitudePeriods.length > 0) {
    recommendations.push(
      t(
        locale,
        'Altitude camp planned - adjust intensity according to adaptation phase and plan competition 14-21 days after returning to sea level',
        'Höghöjdsläger planerat - justera intensitet enligt anpassningsfas och planera tävling 14-21 dagar efter hemkomst'
      )
    )
  }

  // Check for consecutive blocked days
  const maxConsecutiveBlocked = getMaxConsecutiveBlockedDays(availability.blockedDays)
  if (maxConsecutiveBlocked >= 7) {
    recommendations.push(
      t(
        locale,
        `Longer training break (${maxConsecutiveBlocked} days) - plan a gradual ramp-up afterward`,
        `Längre träningsuppehåll (${maxConsecutiveBlocked} dagar) - planera gradvis upptrappning efteråt`
      )
    )
  }

  // Check for reduced days
  if (availability.reducedCount > availability.totalDays * 0.1) {
    recommendations.push(
      t(
        locale,
        'Significant share of days with reduced capacity - prioritize recovery and quality over quantity',
        'Betydande andel dagar med reducerad kapacitet - prioritera återhämtning och kvalitet över kvantitet'
      )
    )
  }

  if (recommendations.length === 0) return ''

  return `
### ${t(locale, 'Training recommendations based on calendar', 'Träningsrekommendationer baserat på kalender')}
${recommendations.map((r) => `- ${r}`).join('\n')}
`
}

/**
 * Get a compact calendar summary for system prompts
 */
export async function getCalendarSummaryForPrompt(
  clientId: string,
  weeksAhead: number = 12,
  locale: AppLocale = 'en'
): Promise<string> {
  const startDate = new Date()
  const endDate = addDays(new Date(), weeksAhead * 7)

  const context = await buildCalendarContext(clientId, startDate, endDate, locale)
  return context.contextText
}

/**
 * Check if AI should consider calendar when generating programs
 */
export async function shouldUseCalendarConstraints(
  clientId: string,
  startDate: Date,
  endDate: Date,
  locale: AppLocale = 'en'
): Promise<{
  shouldUse: boolean
  reason: string
  hasBlockers: boolean
  hasAltitude: boolean
  hasIllness: boolean
}> {
  const availability = await calculateAvailability(clientId, startDate, endDate, locale)

  const hasBlockers = availability.blockedCount > 0
  const hasAltitude = availability.altitudePeriods.length > 0
  const hasIllness = availability.blockedDays.some((d) => d.eventType === 'ILLNESS')
  const hasReduced = availability.reducedCount > 0

  const shouldUse = hasBlockers || hasAltitude || hasIllness || hasReduced

  let reason = ''
  if (!shouldUse) {
    reason = t(locale, 'No calendar constraints found', 'Inga kalenderbegränsningar hittades')
  } else {
    const reasons: string[] = []
    if (hasBlockers) {
      reasons.push(
        t(
          locale,
          `${availability.blockedCount} blocked days`,
          `${availability.blockedCount} blockerade dagar`
        )
      )
    }
    if (hasAltitude) {
      reasons.push(
        t(
          locale,
          `${availability.altitudePeriods.length} altitude camps`,
          `${availability.altitudePeriods.length} höghöjdsläger`
        )
      )
    }
    if (hasIllness) reasons.push(t(locale, 'illness periods', 'sjukdomsperioder'))
    if (hasReduced) {
      reasons.push(
        t(
          locale,
          `${availability.reducedCount} days with reduced capacity`,
          `${availability.reducedCount} dagar med reducerad kapacitet`
        )
      )
    }
    reason = `${t(locale, 'Constraints', 'Begränsningar')}: ${reasons.join(', ')}`
  }

  return {
    shouldUse,
    reason,
    hasBlockers,
    hasAltitude,
    hasIllness,
  }
}

// ==================== HELPER FUNCTIONS ====================

interface GroupedPeriod {
  startDate: Date
  endDate: Date
  type: CalendarEventType
  title: string
  reason: string
}

function groupConsecutiveDays(
  days: BlockedDay[] | { date: Date; eventType: CalendarEventType; reason: string }[]
): GroupedPeriod[] {
  if (days.length === 0) return []

  const sorted = [...days].sort((a, b) => a.date.getTime() - b.date.getTime())
  const periods: GroupedPeriod[] = []

  let currentPeriod: GroupedPeriod | null = null

  for (const day of sorted) {
    const blockedDay = day as BlockedDay
    const dayDate = new Date(day.date)
    dayDate.setHours(0, 0, 0, 0)

    if (!currentPeriod) {
      currentPeriod = {
        startDate: dayDate,
        endDate: dayDate,
        type: day.eventType,
        title: blockedDay.eventTitle || '',
        reason: day.reason,
      }
    } else {
      const dayAfterEnd = addDays(currentPeriod.endDate, 1)
      dayAfterEnd.setHours(0, 0, 0, 0)

      // Check if this day is consecutive and same event type
      if (dayDate.getTime() === dayAfterEnd.getTime() && day.eventType === currentPeriod.type) {
        currentPeriod.endDate = dayDate
      } else {
        periods.push(currentPeriod)
        currentPeriod = {
          startDate: dayDate,
          endDate: dayDate,
          type: day.eventType,
          title: blockedDay.eventTitle || '',
          reason: day.reason,
        }
      }
    }
  }

  if (currentPeriod) {
    periods.push(currentPeriod)
  }

  return periods
}

function getMaxConsecutiveBlockedDays(blockedDays: BlockedDay[]): number {
  if (blockedDays.length === 0) return 0

  const periods = groupConsecutiveDays(blockedDays)
  let max = 0

  for (const period of periods) {
    const days = differenceInDays(period.endDate, period.startDate) + 1
    if (days > max) max = days
  }

  return max
}

function translateEventType(type: CalendarEventType, locale: AppLocale): string {
  const translations: Record<CalendarEventType, Record<AppLocale, string>> = {
    TRAVEL: { en: 'Travel', sv: 'Resa' },
    ILLNESS: { en: 'Illness', sv: 'Sjukdom' },
    VACATION: { en: 'Vacation', sv: 'Semester' },
    WORK_BLOCKER: { en: 'Work', sv: 'Arbete' },
    PERSONAL_BLOCKER: { en: 'Personal', sv: 'Privat' },
    EXTERNAL_EVENT: { en: 'External event', sv: 'Extern händelse' },
    ALTITUDE_CAMP: { en: 'Altitude camp', sv: 'Höghöjdsläger' },
    TRAINING_CAMP: { en: 'Training camp', sv: 'Träningsläger' },
    SCHEDULED_WORKOUT: { en: 'Scheduled workout', sv: 'Schemalagt pass' },
  }
  return translations[type]?.[locale] || type
}

function translateImpact(impact: EventImpact, locale: AppLocale): string {
  const translations: Record<EventImpact, Record<AppLocale, string>> = {
    NO_TRAINING: { en: 'No training', sv: 'Ingen träning' },
    REDUCED: { en: 'Reduced training', sv: 'Reducerad träning' },
    MODIFIED: { en: 'Modified training', sv: 'Anpassad träning' },
    NORMAL: { en: 'Normal training', sv: 'Normal träning' },
  }
  return translations[impact]?.[locale] || impact
}

function translateAltitudePhase(phase: string, locale: AppLocale): string {
  const translations: Record<string, Record<AppLocale, string>> = {
    ACUTE: { en: 'Acute adaptation (days 1-5)', sv: 'Akut anpassning (dag 1-5)' },
    ADAPTATION: { en: 'Adaptation phase (days 6-14)', sv: 'Anpassningsfas (dag 6-14)' },
    OPTIMAL: { en: 'Optimal phase (day 15+)', sv: 'Optimal fas (dag 15+)' },
    POST_CAMP: { en: 'Post-camp (home)', sv: 'Efter läger (hemma)' },
  }
  return translations[phase]?.[locale] || phase
}

function getAltitudeRecommendations(phase: string, altitude: number, locale: AppLocale): string {
  const highAltitude = altitude > 2500

  switch (phase) {
    case 'ACUTE':
      return highAltitude
        ? t(locale, 'Large reduction: 50% volume, 60% intensity. Easy training only.', 'Kraftig reduktion: 50% volym, 60% intensitet. Endast lätt träning.')
        : t(locale, 'Reduced training: 60% volume, 70% intensity. Avoid hard sessions.', 'Reducerad träning: 60% volym, 70% intensitet. Undvik hårda pass.')
    case 'ADAPTATION':
      return highAltitude
        ? t(locale, 'Gradual increase: 70% volume, 80% intensity. Introduce tempo work.', 'Gradvis ökning: 70% volym, 80% intensitet. Introduicera tempo.')
        : t(locale, 'Continued adaptation: 80% volume, 85% intensity.', 'Fortsatt anpassning: 80% volym, 85% intensitet.')
    case 'OPTIMAL':
      return t(locale, 'Near-normal training: 90-95% volume and intensity. Use the adaptation.', 'Nära normal träning: 90-95% volym och intensitet. Utnyttja adaptationen.')
    case 'POST_CAMP':
      return t(locale, 'Optimal competition window 14-21 days after returning to sea level.', 'Optimal tävlingsperiod 14-21 dagar efter hemkomst.')
    default:
      return t(locale, 'Adjust training based on how the body responds.', 'Anpassa träning efter hur kroppen reagerar.')
  }
}
