'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TEAM_EVENT_CONTENT_STATUS_LABELS,
  TEAM_EVENT_TYPE_COLORS,
  TEAM_EVENT_TYPE_LABELS,
  type TeamEventContentStatus,
  isTeamEventType,
} from '@/lib/team-calendar/event-types'
import { Calendar, MapPin, Clock, CheckCircle2 } from 'lucide-react'

interface TeamEvent {
  id: string
  teamName: string
  title: string
  type: string
  location: string | null
  contentStatus?: string
  linkedWorkoutType?: string | null
  linkedWorkoutId?: string | null
  linkedWorkoutName?: string | null
  assignedBroadcastId?: string | null
  assignedAt?: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, sv: string, en: string) => (locale === 'sv' ? sv : en)

const TEAM_EVENT_TYPE_LABELS_EN: Partial<Record<string, string>> = {
  PRACTICE: 'Ice practice',
  ICE_PRACTICE: 'Ice practice',
  STRENGTH: 'Strength',
  CARDIO: 'Cardio',
  HYBRID: 'Hybrid',
  AGILITY: 'Agility',
  PREHAB: 'Stability / Prehab',
  PLYOMETRICS: 'Plyometrics',
  GAME: 'Game',
  TEST: 'Test',
  INTERVAL_SESSION: 'Interval session',
  OFF_DAY: 'Rest day',
  MEETING: 'Meeting',
  ANNUAL_PLAN: 'Annual plan',
  OTHER: 'Other',
}

const TEAM_EVENT_CONTENT_STATUS_LABELS_EN: Record<TeamEventContentStatus, string> = {
  PLANNED: 'Planned frame',
  NEEDS_CONTENT: 'Needs content',
  CONTENT_READY: 'Content ready',
  ASSIGNED: 'Assigned',
}

function contentStatusLabel(status: string | undefined, locale: AppLocale): string {
  if (status && status in TEAM_EVENT_CONTENT_STATUS_LABELS) {
    const typedStatus = status as TeamEventContentStatus
    return locale === 'sv'
      ? TEAM_EVENT_CONTENT_STATUS_LABELS[typedStatus]
      : TEAM_EVENT_CONTENT_STATUS_LABELS_EN[typedStatus]
  }
  return ''
}

function getTypeConfig(type: string, locale: AppLocale) {
  if (isTeamEventType(type)) {
    return {
      label: locale === 'sv' ? TEAM_EVENT_TYPE_LABELS[type] : TEAM_EVENT_TYPE_LABELS_EN[type] ?? type,
      color: TEAM_EVENT_TYPE_COLORS[type],
    }
  }
  return { label: t(locale, 'Övrigt', 'Other'), color: 'bg-gray-500' }
}

function formatEventDate(iso: string, locale: AppLocale): string {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return t(locale, 'Idag', 'Today')
  if (d.toDateString() === tomorrow.toDateString()) return t(locale, 'Imorgon', 'Tomorrow')
  return d.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(iso: string, locale: AppLocale): string {
  return new Date(iso).toLocaleTimeString(locale === 'sv' ? 'sv-SE' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

export function UpcomingTeamEvents() {
  const locale = getAppLocale(useLocale())
  const [events, setEvents] = useState<TeamEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/athlete/team-calendar?days=14')
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || [])
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    void fetchEvents()
  }, [])

  if (loading) return null
  if (events.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {t(locale, 'Kommande laghändelser', 'Upcoming team events')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.slice(0, 5).map((event) => {
          const typeConf = getTypeConfig(event.type, locale)
          return (
            <div key={event.id} className="flex items-start gap-2 py-1.5">
              <div className={`w-1 self-stretch rounded-full shrink-0 ${typeConf.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{event.title}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">{typeConf.label}</Badge>
                  {event.assignedBroadcastId && (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-[9px] text-emerald-700 shrink-0">
                      {t(locale, 'Tilldelat', 'Assigned')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatEventDate(event.startDate, locale)}</span>
                  {!event.allDay && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(event.startDate, locale)}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {event.location}
                    </span>
                  )}
                </div>
                {event.linkedWorkoutName && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {event.assignedBroadcastId && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                    <span className="truncate">
                      {event.assignedBroadcastId ? `${t(locale, 'Pass', 'Workout')}: ` : `${contentStatusLabel(event.contentStatus, locale)}: `}
                      {event.linkedWorkoutName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
