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
import { sv } from 'date-fns/locale'
import { CalendarEventType, EventImpact } from '@prisma/client'

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
  programEndDate?: Date
): Promise<CalendarContext> {
  try {
    // Default to next 12 weeks if no dates provided
    const startDate = programStartDate || new Date()
    const endDate = programEndDate || addDays(new Date(), 84) // 12 weeks

    // Get availability data
    const availability = await calculateAvailability(clientId, startDate, endDate)
    const constraints = await getCalendarConstraints(clientId, startDate, endDate)

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
## KALENDERKONTEXT
Inga kalenderblockerare eller begränsningar finns för denna period.
Alla dagar är tillgängliga för träning.
`
      return {
        hasCalendarData: false,
        contextText,
        availability,
        constraints,
      }
    }

    contextText = `
## KALENDERKONTEXT

### Tillgänglighetsöversikt
- **Perioden**: ${format(startDate, 'd MMMM', { locale: sv })} - ${format(endDate, 'd MMMM yyyy', { locale: sv })}
- **Totalt dagar**: ${availability.totalDays}
- **Tillgängliga dagar**: ${availability.availableCount} (${Math.round((availability.availableCount / availability.totalDays) * 100)}%)
- **Blockerade dagar**: ${availability.blockedCount}
- **Reducerade dagar**: ${availability.reducedCount}
`

    // Add blocked periods
    if (availability.blockedDays.length > 0) {
      contextText += buildBlockedDaysContext(availability.blockedDays)
    }

    // Add reduced capacity periods
    if (availability.reducedDays.length > 0) {
      contextText += buildReducedDaysContext(availability.reducedDays)
    }

    // Add altitude periods
    if (availability.altitudePeriods.length > 0) {
      contextText += buildAltitudeContext(availability.altitudePeriods)
    }

    // Add upcoming events summary
    if (upcomingEvents.length > 0) {
      contextText += buildUpcomingEventsContext(upcomingEvents)
    }

    // Add training recommendations based on calendar
    contextText += buildTrainingRecommendations(availability)

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
function buildBlockedDaysContext(blockedDays: BlockedDay[]): string {
  // Group consecutive blocked days into periods
  const periods = groupConsecutiveDays(blockedDays)

  let context = `
### Blockerade perioder (ingen träning)
`

  for (const period of periods) {
    const startStr = format(period.startDate, 'd MMM', { locale: sv })
    const endStr = format(period.endDate, 'd MMM', { locale: sv })
    const days = differenceInDays(period.endDate, period.startDate) + 1
    const reason = translateEventType(period.type)

    if (days === 1) {
      context += `- **${startStr}**: ${reason} - ${period.title}\n`
    } else {
      context += `- **${startStr} - ${endStr}** (${days} dagar): ${reason} - ${period.title}\n`
    }
  }

  return context
}

/**
 * Build context for reduced capacity days
 */
function buildReducedDaysContext(reducedDays: ReducedDay[]): string {
  // Group consecutive reduced days into periods
  const periods = groupConsecutiveDays(reducedDays as unknown as BlockedDay[])

  let context = `
### Reducerad träningskapacitet
`

  for (const period of periods) {
    const startStr = format(period.startDate, 'd MMM', { locale: sv })
    const endStr = format(period.endDate, 'd MMM', { locale: sv })
    const days = differenceInDays(period.endDate, period.startDate) + 1

    if (days === 1) {
      context += `- **${startStr}**: ${period.reason}\n`
    } else {
      context += `- **${startStr} - ${endStr}** (${days} dagar): ${period.reason}\n`
    }
  }

  context += `
*Under dessa dagar bör träningsvolym och intensitet reduceras.*
`

  return context
}

/**
 * Build context for altitude camp periods
 */
function buildAltitudeContext(altitudePeriods: AltitudePeriod[]): string {
  let context = `
### Höghöjdsläger
`

  for (const period of altitudePeriods) {
    const startStr = format(period.startDate, 'd MMM', { locale: sv })
    const endStr = format(period.endDate, 'd MMM', { locale: sv })
    const days = differenceInDays(period.endDate, period.startDate) + 1
    const phase = translateAltitudePhase(period.adaptationPhase)

    context += `
#### ${startStr} - ${endStr} (${days} dagar @ ${period.altitude}m)
- **Nuvarande fas**: ${phase}
- **Anpassning**: ${getAltitudeRecommendations(period.adaptationPhase, period.altitude)}
`

    if (period.seaLevelReturnDate) {
      const returnStr = format(period.seaLevelReturnDate, 'd MMM', { locale: sv })
      context += `- **Optimal tävlingsperiod**: 14-21 dagar efter ${returnStr}
`
    }
  }

  context += `
**HÖGHÖJDSANPASSNING - VIKTIGT:**
- Dag 1-3: Reducera intensitet till 60%, volym 50%
- Dag 4-5: Gradvis ökning till 70% intensitet
- Dag 6-10: 80% intensitet, 75% volym
- Dag 11+: Nära normal träning (90-95%)
- Undvik VO2max-pass de första 5 dagarna
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
}[]): string {
  const significantEvents = events.filter(
    (e) => e.trainingImpact !== 'NORMAL' || e.type === 'ALTITUDE_CAMP' || e.type === 'TRAINING_CAMP'
  )

  if (significantEvents.length === 0) return ''

  let context = `
### Kommande händelser att beakta
`

  for (const event of significantEvents.slice(0, 5)) {
    const startStr = format(event.startDate, 'd MMM', { locale: sv })
    const daysUntil = differenceInDays(event.startDate, new Date())
    const impact = translateImpact(event.trainingImpact)

    context += `- **${startStr}** (om ${daysUntil} dagar): ${event.title} - ${impact}\n`
  }

  return context
}

/**
 * Build training recommendations based on calendar constraints
 */
function buildTrainingRecommendations(availability: AvailabilityResult): string {
  const recommendations: string[] = []

  // Check for high blocked ratio
  const blockedRatio = availability.blockedCount / availability.totalDays
  if (blockedRatio > 0.2) {
    recommendations.push(
      'Hög andel blockerade dagar - överväg att koncentrera kvalitetspass till tillgängliga dagar'
    )
  }

  // Check for altitude camps
  if (availability.altitudePeriods.length > 0) {
    recommendations.push(
      'Höghöjdsläger planerat - justera intensitet enligt anpassningsfas och planera tävling 14-21 dagar efter hemkomst'
    )
  }

  // Check for consecutive blocked days
  const maxConsecutiveBlocked = getMaxConsecutiveBlockedDays(availability.blockedDays)
  if (maxConsecutiveBlocked >= 7) {
    recommendations.push(
      `Längre träningsuppehåll (${maxConsecutiveBlocked} dagar) - planera gradvis upptrappning efteråt`
    )
  }

  // Check for reduced days
  if (availability.reducedCount > availability.totalDays * 0.1) {
    recommendations.push(
      'Betydande andel dagar med reducerad kapacitet - prioritera återhämtning och kvalitet över kvantitet'
    )
  }

  if (recommendations.length === 0) return ''

  return `
### Träningsrekommendationer baserat på kalender
${recommendations.map((r) => `- ${r}`).join('\n')}
`
}

/**
 * Get a compact calendar summary for system prompts
 */
export async function getCalendarSummaryForPrompt(
  clientId: string,
  weeksAhead: number = 12
): Promise<string> {
  const startDate = new Date()
  const endDate = addDays(new Date(), weeksAhead * 7)

  const context = await buildCalendarContext(clientId, startDate, endDate)
  return context.contextText
}

/**
 * Check if AI should consider calendar when generating programs
 */
export async function shouldUseCalendarConstraints(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  shouldUse: boolean
  reason: string
  hasBlockers: boolean
  hasAltitude: boolean
  hasIllness: boolean
}> {
  const availability = await calculateAvailability(clientId, startDate, endDate)

  const hasBlockers = availability.blockedCount > 0
  const hasAltitude = availability.altitudePeriods.length > 0
  const hasIllness = availability.blockedDays.some((d) => d.eventType === 'ILLNESS')
  const hasReduced = availability.reducedCount > 0

  const shouldUse = hasBlockers || hasAltitude || hasIllness || hasReduced

  let reason = ''
  if (!shouldUse) {
    reason = 'Inga kalenderbegränsningar hittades'
  } else {
    const reasons: string[] = []
    if (hasBlockers) reasons.push(`${availability.blockedCount} blockerade dagar`)
    if (hasAltitude) reasons.push(`${availability.altitudePeriods.length} höghöjdsläger`)
    if (hasIllness) reasons.push('sjukdomsperioder')
    if (hasReduced) reasons.push(`${availability.reducedCount} dagar med reducerad kapacitet`)
    reason = `Begränsningar: ${reasons.join(', ')}`
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

function translateEventType(type: CalendarEventType): string {
  const translations: Record<CalendarEventType, string> = {
    TRAVEL: 'Resa',
    ILLNESS: 'Sjukdom',
    VACATION: 'Semester',
    WORK_BLOCKER: 'Arbete',
    PERSONAL_BLOCKER: 'Privat',
    EXTERNAL_EVENT: 'Extern händelse',
    ALTITUDE_CAMP: 'Höghöjdsläger',
    TRAINING_CAMP: 'Träningsläger',
  }
  return translations[type] || type
}

function translateImpact(impact: EventImpact): string {
  const translations: Record<EventImpact, string> = {
    NO_TRAINING: 'Ingen träning',
    REDUCED: 'Reducerad träning',
    MODIFIED: 'Anpassad träning',
    NORMAL: 'Normal träning',
  }
  return translations[impact] || impact
}

function translateAltitudePhase(phase: string): string {
  const translations: Record<string, string> = {
    ACUTE: 'Akut anpassning (dag 1-5)',
    ADAPTATION: 'Anpassningsfas (dag 6-14)',
    OPTIMAL: 'Optimal fas (dag 15+)',
    POST_CAMP: 'Efter läger (hemma)',
  }
  return translations[phase] || phase
}

function getAltitudeRecommendations(phase: string, altitude: number): string {
  const highAltitude = altitude > 2500

  switch (phase) {
    case 'ACUTE':
      return highAltitude
        ? 'Kraftig reduktion: 50% volym, 60% intensitet. Endast lätt träning.'
        : 'Reducerad träning: 60% volym, 70% intensitet. Undvik hårda pass.'
    case 'ADAPTATION':
      return highAltitude
        ? 'Gradvis ökning: 70% volym, 80% intensitet. Introduicera tempo.'
        : 'Fortsatt anpassning: 80% volym, 85% intensitet.'
    case 'OPTIMAL':
      return 'Nära normal träning: 90-95% volym och intensitet. Utnyttja adaptationen.'
    case 'POST_CAMP':
      return 'Optimal tävlingsperiod 14-21 dagar efter hemkomst.'
    default:
      return 'Anpassa träning efter hur kroppen reagerar.'
  }
}
