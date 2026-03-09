'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  User,
  MapPin,
  Dumbbell,
  Heart,
  Zap,
  Flame,
  CalendarCheck,
  Timer,
  ClipboardList,
  ArrowRight,
} from 'lucide-react'
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns'
import { sv } from 'date-fns/locale'

interface TimelineAppointment {
  id: string
  type: 'strength' | 'cardio' | 'agility' | 'hybrid' | 'external'
  workoutName: string
  startTime: string
  endTime: string | null
  location: { id: string; name: string } | null
  locationName: string | null
  athletes: { id: string; name: string }[]
  teamName: string | null
  status: string
  source?: string
  description?: string
  color?: string
}

interface TodayTimelineProps {
  basePath: string
  readinessDistribution?: {
    high: number
    medium: number
    low: number
    total: number
  }
}

const TYPE_ICONS: Record<string, typeof Dumbbell> = {
  strength: Dumbbell,
  cardio: Heart,
  agility: Zap,
  hybrid: Flame,
  external: CalendarCheck,
}

const TYPE_COLORS: Record<string, string> = {
  strength: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  cardio: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  agility: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  hybrid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  external: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const TYPE_LABELS: Record<string, string> = {
  strength: 'Styrka',
  cardio: 'Kondition',
  agility: 'Agility',
  hybrid: 'Hybrid',
  external: 'Extern',
}

function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Idag'
  if (isTomorrow(date)) return 'Imorgon'
  if (isYesterday(date)) return 'Igår'
  return format(date, 'EEEE d MMM', { locale: sv })
}

export function TodayTimeline({ basePath, readinessDistribution }: TodayTimelineProps) {
  const [appointments, setAppointments] = useState<TimelineAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  const fetchAppointments = useCallback(async (date: Date) => {
    setLoading(true)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await fetch(`/api/coach/appointments/today?date=${dateStr}`)
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || [])
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments(selectedDate)
  }, [selectedDate, fetchAppointments])

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1))
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1))
  const goToToday = () => setSelectedDate(new Date())

  const dateLabel = getDateLabel(selectedDate)
  const showTodayButton = !isToday(selectedDate)

  return (
    <GlassCard className="h-full">
      <GlassCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            Schema
          </GlassCardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              onClick={showTodayButton ? goToToday : undefined}
              className={`text-sm font-medium min-w-[80px] text-center ${
                showTodayButton
                  ? 'text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {dateLabel}
            </button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        {/* Morning Readiness Bar */}
        {readinessDistribution && readinessDistribution.total > 0 && isToday(selectedDate) && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 dark:bg-white/5">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Lagets beredskap</p>
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                {readinessDistribution.high > 0 && (
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(readinessDistribution.high / readinessDistribution.total) * 100}%` }}
                  />
                )}
                {readinessDistribution.medium > 0 && (
                  <div
                    className="bg-yellow-500 transition-all"
                    style={{ width: `${(readinessDistribution.medium / readinessDistribution.total) * 100}%` }}
                  />
                )}
                {readinessDistribution.low > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(readinessDistribution.low / readinessDistribution.total) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {readinessDistribution.high} hög
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  {readinessDistribution.medium} medium
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {readinessDistribution.low} låg
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Inga sessioner {isToday(selectedDate) ? 'idag' : ''}</p>
            <p className="text-xs mt-1 mb-4">Schemalägg pass eller tester</p>
            <div className="flex gap-2 justify-center">
              <Link href={`${basePath}/coach/interval-sessions`}>
                <Button size="sm" variant="outline" className="text-xs">
                  <Timer className="h-3 w-3 mr-1" />
                  Skapa session
                </Button>
              </Link>
              <Link href={`${basePath}/coach/test`}>
                <Button size="sm" variant="outline" className="text-xs">
                  <ClipboardList className="h-3 w-3 mr-1" />
                  Boka test
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[23px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="space-y-4">
              {appointments.map((appointment) => {
                const Icon = TYPE_ICONS[appointment.type] || CalendarCheck
                const locationDisplay = appointment.locationName || appointment.location?.name

                return (
                  <div key={`${appointment.type}-${appointment.id}`} className="relative flex gap-3">
                    {/* Time dot */}
                    <div className="flex-shrink-0 w-12 flex flex-col items-center z-10">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        {appointment.startTime}
                      </span>
                    </div>

                    {/* Content card */}
                    <div className="flex-1 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted/50 dark:hover:bg-white/10 transition">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs ${TYPE_COLORS[appointment.type] || TYPE_COLORS.external}`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {TYPE_LABELS[appointment.type] || 'Session'}
                        </Badge>
                        {appointment.teamName && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {appointment.teamName}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm dark:text-slate-200">{appointment.workoutName}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {locationDisplay && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {locationDisplay}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {appointment.athletes.length === 1 ? (
                            <>
                              <User className="h-3 w-3" />
                              {appointment.athletes[0].name}
                            </>
                          ) : appointment.athletes.length > 0 ? (
                            <>
                              <Users className="h-3 w-3" />
                              {appointment.athletes.length} atleter
                            </>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <Link href={`${basePath}/coach/calendar`} className="block pt-2">
          <Button variant="ghost" size="sm" className="text-xs w-full">
            Visa kalender <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </GlassCardContent>
    </GlassCard>
  )
}
