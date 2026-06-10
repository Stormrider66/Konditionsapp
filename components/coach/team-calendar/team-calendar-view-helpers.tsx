'use client'

// Event typing, date math, planning heuristics, and badges for the team calendar.

import { Badge } from '@/components/ui/badge'
import {
  PHYSICAL_TEAM_EVENT_TYPES,
  TEAM_EVENT_CONTENT_OWNERS,
  TEAM_EVENT_CONTENT_STATUSES,
  TEAM_EVENT_TYPE_COLORS,
  teamEventContentOwnerLabel,
  teamEventContentStatusLabel,
  teamEventTypeLabel,
  type TeamCalendarLocale,
  type TeamEventContentOwner,
  type TeamEventContentStatus,
  type TeamEventType,
  isTeamEventType,
} from '@/lib/team-calendar/event-types'
import {
  CheckCircle2,
  ClipboardList,
  Send,
  TriangleAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PracticeBlock } from '@/lib/team-calendar/practice-plan'
import type { AthletePlanBlockSummary } from '@/components/athlete-plans/AthletePlanSummaryCard'


export interface TeamEvent {
  id: string
  title: string
  description: string | null
  type: string
  location: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
  contentStatus?: string
  contentOwner?: string | null
  practicePlan?: PracticeBlock[] | null
  linkedWorkoutType?: string | null
  linkedWorkoutId?: string | null
  linkedWorkoutName?: string | null
  responsibleCoachId?: string | null
  responsibleCoach?: {
    id: string
    name: string
    email: string | null
  } | null
  assignedBroadcastId?: string | null
  assignedAt?: string | null
  assignmentSummary?: {
    totalAssigned: number
    totalCompleted: number
    completionRate: number
    totalTeamMembers?: number
    missingAssignmentCount?: number
    missingAthletes?: Array<{
      athleteId: string
      athleteName: string
      jerseyNumber: number | null
      position: string | null
    }>
    athletes: Array<{
      assignmentId: string
      athleteId: string
      athleteName: string
      jerseyNumber: number | null
      position: string | null
      workoutType: string
      status: string
      completedAt: string | null
      rpe: number | null
      duration: number | null
      notes: string | null
    }>
  } | null
  createdBy: { name: string }
  intervalSession: { id: string; name: string; status: string } | null
}

export interface TeamCalendarPermissions {
  role: string
  roleLabel: string
  canView: boolean
  creatableTypes: TeamEventType[]
  assignableContentTypes: TeamEventType[]
}

export type PlanningFilter = 'all' | 'needsReview' | 'iceMissingPlan' | 'needsContent' | 'ready' | 'assigned' | 'ice' | 'physical'
export type LoadLevel = 'low' | 'moderate' | 'high'
export type CalendarViewMode = 'day' | 'week' | 'month'

export function getTypeConfig(type: string, locale: TeamCalendarLocale) {
  if (isTeamEventType(type)) {
    return {
      label: teamEventTypeLabel(type, locale),
      color: TEAM_EVENT_TYPE_COLORS[type],
    }
  }
  return { label: locale === 'sv' ? 'Övrigt' : 'Other', color: 'bg-gray-500' }
}

export function firstDescriptionLine(description: string | null): string | null {
  return description?.split('\n').map((line) => line.trim()).find(Boolean) ?? null
}

export function dateLocale(locale: TeamCalendarLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

export function text(locale: TeamCalendarLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

export function formatTime(iso: string, locale: TeamCalendarLocale): string {
  return new Date(iso).toLocaleTimeString(dateLocale(locale), { hour: '2-digit', minute: '2-digit' })
}

export function eventDurationMinutes(event: TeamEvent): number | null {
  if (event.allDay || !event.endDate) return null
  const start = new Date(event.startDate).getTime()
  const end = new Date(event.endDate).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return Math.round((end - start) / 60000)
}

export function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)

  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

export function getMonthDates(baseDate: Date): Date[] {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
  const dates: Date[] = []

  for (let day = 1; day <= end.getDate(); day++) {
    dates.push(new Date(start.getFullYear(), start.getMonth(), day))
  }

  return dates
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function planBlockForDate(blocks: AthletePlanBlockSummary[], date: Date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)

  return blocks.find((block) => {
    const start = new Date(block.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(block.endDate)
    end.setHours(23, 59, 59, 999)
    return day >= start && day <= end
  }) ?? null
}

export function planningColumnFor(type: string): 'ice' | 'physical' | 'team' | 'other' | 'annual' {
  if (type === 'PRACTICE' || type === 'ICE_PRACTICE') return 'ice'
  if (['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY', 'PREHAB', 'PLYOMETRICS', 'INTERVAL_SESSION'].includes(type)) {
    return 'physical'
  }
  if (type === 'GAME' || type === 'TEST') return 'team'
  if (type === 'ANNUAL_PLAN') return 'annual'
  return 'other'
}

export function compactEventText(event: TeamEvent, locale: TeamCalendarLocale): string {
  const time = event.allDay ? '' : formatTime(event.startDate, locale)
  const location = event.location ? ` ${event.location}` : ''
  return `${time}${time ? ' ' : ''}${event.title}${location}`
}

export function eventNeedsContent(event: TeamEvent): boolean {
  if (!PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)) return false
  if (event.contentStatus === 'ASSIGNED' || event.assignedBroadcastId) return false
  return event.contentStatus !== 'CONTENT_READY' || !event.linkedWorkoutId
}

export function contentStatusLabel(status: string | undefined, locale: TeamCalendarLocale): string {
  if (status && TEAM_EVENT_CONTENT_STATUSES.some((candidate) => candidate === status)) {
    return teamEventContentStatusLabel(status as TeamEventContentStatus, locale)
  }
  return teamEventContentStatusLabel('PLANNED', locale)
}

export function contentOwnerLabel(owner: string | null | undefined, locale: TeamCalendarLocale): string {
  if (owner && TEAM_EVENT_CONTENT_OWNERS.some((candidate) => candidate === owner)) {
    return teamEventContentOwnerLabel(owner as TeamEventContentOwner, locale)
  }
  return teamEventContentOwnerLabel('physical_trainer', locale)
}

export function builderLinkForEvent(event: TeamEvent, teamId: string, businessSlug?: string): { href: string; label: string } | null {
  const coachBase = businessSlug ? `/${businessSlug}/coach` : '/coach'
  const query = new URLSearchParams({
    fromTeamCalendar: 'true',
    teamEventId: event.id,
    teamId,
    date: event.startDate,
    eventTitle: event.title,
  })

  if (event.type === 'STRENGTH' || event.type === 'PREHAB' || event.type === 'PLYOMETRICS') {
    return { href: `${coachBase}/strength?${query}`, label: 'Strength Studio' }
  }
  if (event.type === 'CARDIO' || event.type === 'INTERVAL_SESSION') {
    return { href: `${coachBase}/cardio?${query}`, label: 'Cardio Studio' }
  }
  if (event.type === 'HYBRID') {
    return { href: `${coachBase}/hybrid-studio?${query}`, label: 'Hybrid Studio' }
  }
  if (event.type === 'AGILITY') {
    return { href: `${coachBase}/agility-studio?${query}`, label: 'Agility Studio' }
  }
  return null
}

export function assignmentProgressLabel(event: TeamEvent, locale: TeamCalendarLocale): string | null {
  if (!event.assignmentSummary) return null
  const base = `${event.assignmentSummary.totalCompleted}/${event.assignmentSummary.totalAssigned} ${text(locale, 'klara', 'completed')}`
  const missingCount = event.assignmentSummary.missingAssignmentCount ?? 0
  if (missingCount === 0) return base
  return `${base} · ${missingCount} ${text(locale, 'saknar', 'missing')}`
}

export function hasPracticePlan(event: TeamEvent): boolean {
  return Array.isArray(event.practicePlan) && event.practicePlan.length > 0
}

export function isIcePracticeEvent(event: TeamEvent): boolean {
  return event.type === 'PRACTICE' || event.type === 'ICE_PRACTICE'
}

export function isPhysicalEvent(event: TeamEvent): boolean {
  return PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)
}

export function practiceBlockMinutes(event: TeamEvent): number {
  if (!Array.isArray(event.practicePlan)) return 0
  return event.practicePlan.reduce((sum, block) => sum + (Number(block.duration) || 0), 0)
}

export function getPlanningIssues(event: TeamEvent, locale: TeamCalendarLocale): string[] {
  const issues: string[] = []

  if (isIcePracticeEvent(event)) {
    if (!hasPracticePlan(event)) {
      issues.push(text(locale, 'Saknar blockplan', 'Missing block plan'))
    } else if (Array.isArray(event.practicePlan)) {
      const missingGroups = event.practicePlan.filter((block) => !block.groups?.trim()).length
      const missingEquipment = event.practicePlan.filter((block) => !block.equipment?.trim()).length
      const eventMinutes = eventDurationMinutes(event)
      const blockMinutes = practiceBlockMinutes(event)

      if (missingGroups > 0) {
        issues.push(text(locale, `${missingGroups} block saknar grupp`, `${missingGroups} blocks missing groups`))
      }
      if (missingEquipment > 0) {
        issues.push(text(locale, `${missingEquipment} block saknar material`, `${missingEquipment} blocks missing equipment`))
      }
      if (eventMinutes !== null && blockMinutes > 0 && Math.abs(eventMinutes - blockMinutes) >= 10) {
        issues.push(text(locale, `Blocktid ${blockMinutes} min / kalender ${eventMinutes} min`, `Block time ${blockMinutes} min / calendar ${eventMinutes} min`))
      }
    }
  }

  if (isPhysicalEvent(event) && event.contentStatus === 'CONTENT_READY' && !event.linkedWorkoutId && !event.assignedBroadcastId) {
    issues.push(text(locale, 'Markerad klar utan kopplat pass', 'Marked ready without a linked workout'))
  }

  return issues
}

export function eventNeedsReview(event: TeamEvent, locale: TeamCalendarLocale): boolean {
  return getPlanningIssues(event, locale).length > 0
}

export function sumEventMinutes(eventsToSum: TeamEvent[]): number {
  return eventsToSum.reduce((sum, event) => sum + (eventDurationMinutes(event) ?? 0), 0)
}

export function eventLoadPoints(event: TeamEvent): number {
  const duration = eventDurationMinutes(event) ?? 60
  const durationFactor = Math.max(0.5, duration / 60)

  if (event.type === 'GAME') return 5
  if (event.type === 'TEST') return 3
  if (event.type === 'PRACTICE' || event.type === 'ICE_PRACTICE') return 2.5 * durationFactor
  if (event.type === 'STRENGTH' || event.type === 'PLYOMETRICS' || event.type === 'HYBRID' || event.type === 'AGILITY') {
    return 3 * durationFactor
  }
  if (event.type === 'CARDIO' || event.type === 'INTERVAL_SESSION') return 2.5 * durationFactor
  if (event.type === 'PREHAB') return 1 * durationFactor
  return 0.5 * durationFactor
}

export function loadLevelFor(points: number): LoadLevel {
  if (points >= 6) return 'high'
  if (points >= 3) return 'moderate'
  return 'low'
}

export function loadLevelLabel(level: LoadLevel, locale: TeamCalendarLocale): string {
  if (level === 'high') return text(locale, 'Hög', 'High')
  if (level === 'moderate') return text(locale, 'Medel', 'Moderate')
  return text(locale, 'Låg', 'Low')
}

export function loadLevelClassName(level: LoadLevel): string {
  if (level === 'high') return 'border-red-200 bg-red-50 text-red-900'
  if (level === 'moderate') return 'border-amber-200 bg-amber-50 text-amber-900'
  return 'border-emerald-200 bg-emerald-50 text-emerald-900'
}

export function getPlanningBadges(event: TeamEvent, locale: TeamCalendarLocale): Array<{
  key: string
  label: string
  icon: LucideIcon
  className: string
}> {
  const badges: Array<{
    key: string
    label: string
    icon: LucideIcon
    className: string
  }> = []

  if (isIcePracticeEvent(event)) {
    if (hasPracticePlan(event)) {
      badges.push({
        key: 'practice-plan',
        label: 'Plan',
        icon: ClipboardList,
        className: 'border-blue-300 bg-blue-50 text-blue-800',
      })
    } else {
      badges.push({
        key: 'missing-practice-plan',
        label: text(locale, 'Saknar plan', 'Missing plan'),
        icon: TriangleAlert,
        className: 'border-amber-300 bg-amber-50 text-amber-800',
      })
    }
  }

  if (eventNeedsReview(event, locale)) {
    badges.push({
      key: 'needs-review',
      label: text(locale, 'Kontroll', 'Review'),
      icon: TriangleAlert,
      className: 'border-orange-300 bg-orange-50 text-orange-800',
    })
  }

  if (isPhysicalEvent(event)) {
    if (event.assignedBroadcastId) {
      badges.push({
        key: 'assigned',
        label: assignmentProgressLabel(event, locale) ?? text(locale, 'Tilldelat', 'Assigned'),
        icon: Send,
        className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
      })
    } else if (event.linkedWorkoutId && event.contentStatus === 'CONTENT_READY') {
      badges.push({
        key: 'ready',
        label: text(locale, 'Klar', 'Ready'),
        icon: CheckCircle2,
        className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
      })
    } else if (eventNeedsContent(event)) {
      badges.push({
        key: 'needs-content',
        label: contentStatusLabel(event.contentStatus, locale),
        icon: TriangleAlert,
        className: 'border-amber-300 bg-amber-50 text-amber-800',
      })
    }
  }

  return badges
}

export function PlanningBadges({ event, locale, compact = false }: { event: TeamEvent; locale: TeamCalendarLocale; compact?: boolean }) {
  const badges = getPlanningBadges(event, locale)
  if (badges.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? 'mt-1' : ''}`}>
      {badges.map((badge) => {
        const Icon = badge.icon
        return (
          <Badge
            key={badge.key}
            variant="outline"
            className={`shrink-0 gap-1 ${compact ? 'px-1 py-0 text-[10px]' : 'text-[10px]'} ${badge.className}`}
          >
            <Icon className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            {badge.label}
          </Badge>
        )
      })}
    </div>
  )
}

export function eventMatchesPlanningFilter(event: TeamEvent, filter: PlanningFilter, locale: TeamCalendarLocale): boolean {
  if (filter === 'all') return true
  if (filter === 'needsReview') return eventNeedsReview(event, locale)
  if (filter === 'iceMissingPlan') return isIcePracticeEvent(event) && !hasPracticePlan(event)
  if (filter === 'needsContent') return eventNeedsContent(event)
  if (filter === 'ready') return isPhysicalEvent(event) && Boolean(event.linkedWorkoutId) && event.contentStatus === 'CONTENT_READY' && !event.assignedBroadcastId
  if (filter === 'assigned') return Boolean(event.assignedBroadcastId)
  if (filter === 'ice') return isIcePracticeEvent(event)
  if (filter === 'physical') return isPhysicalEvent(event)
  return true
}

export const PLANNING_FILTERS: Array<{ value: PlanningFilter; label: Record<TeamCalendarLocale, string> }> = [
  { value: 'all', label: { en: 'All', sv: 'Alla' } },
  { value: 'needsReview', label: { en: 'Review', sv: 'Kontroll' } },
  { value: 'iceMissingPlan', label: { en: 'Missing ice plan', sv: 'Saknar isplan' } },
  { value: 'needsContent', label: { en: 'Needs content', sv: 'Behöver innehåll' } },
  { value: 'ready', label: { en: 'Ready physical', sv: 'Klara fys' } },
  { value: 'assigned', label: { en: 'Assigned', sv: 'Tilldelade' } },
  { value: 'ice', label: { en: 'Ice', sv: 'Is' } },
  { value: 'physical', label: { en: 'Physical', sv: 'Fys' } },
]

export const PLANNING_QUICK_TYPES: Array<{ type: TeamEventType; title: Record<TeamCalendarLocale, string>; label: string }> = [
  { type: 'STRENGTH', title: { en: 'Strength', sv: 'Styrka' }, label: 'Strength' },
  { type: 'CARDIO', title: { en: 'Conditioning', sv: 'Kondition' }, label: 'Conditioning' },
  { type: 'PREHAB', title: { en: 'Stability / Prehab', sv: 'Stabilitet / Prehab' }, label: 'Prehab' },
  { type: 'PLYOMETRICS', title: { en: 'Plyometrics', sv: 'Plyometri' }, label: 'Plyo' },
  { type: 'HYBRID', title: { en: 'Hybrid', sv: 'Hybrid' }, label: 'Hybrid' },
  { type: 'AGILITY', title: { en: 'Agility', sv: 'Agility' }, label: 'Agility' },
  { type: 'TEST', title: { en: 'Test', sv: 'Test' }, label: 'Test' },
]
