'use client'

// Item cards extracted from DaySidebar.tsx (Phase 7k).
// Each card renders one calendar-item row in the sidebar list.

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useLocale, useTranslations } from '@/i18n/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Clock,
  MapPin,
  Activity,
  Heart,
  Target,
  ExternalLink,
  Mountain,
  Thermometer,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Edit,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  Beaker,
  Eye,
  Loader2,
  ThumbsUp,
} from 'lucide-react'
import {
  UnifiedCalendarItem,
  EVENT_TYPE_CONFIG,
  IMPACT_CONFIG,
  WORKOUT_TYPE_COLORS,
  INTENSITY_COLORS,
} from '../types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatDistanceValue, formatDurationMinutes, formatWorkoutTypeLabel, formatIntensityLabel, formatFieldTestType, formatAdHocInputType, formatAdHocTypeLabel, formatRaceDistanceLabel } from './formatters'
import { PrintWorkoutButton } from '@/components/workouts/print/PrintWorkoutButton'
import type { PrintableWorkoutKind } from '@/lib/workout-print/normalize'

type ScheduledWorkoutSource = {
  kind?: string
  sourceId?: string
  sourceName?: string | null
  assignmentId?: string
  status?: string
  completedAt?: string | Date | null
  isCompleted?: boolean
  resultSummary?: Record<string, unknown> | null
}

type ScheduledWorkoutResult = {
  kind: string
  title: string
  athleteName: string
  status: string
  completedAt: string | null
  metrics: Array<{ label: string; value: string }>
  notes: string | null
  details: Array<{
    title: string
    rows: Array<{
      label: string
      values: Array<{ label: string; value: string }>
    }>
  }>
  original: unknown
}

function formatScheduledStatus(status: string | undefined, t?: ReturnType<typeof useTranslations>) {
  const keys: Record<string, string> = {
    PENDING: 'pending',
    SCHEDULED: 'scheduled',
    COMPLETED: 'completed',
    SKIPPED: 'skipped',
    MODIFIED: 'modified',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'inProgress',
  }
  if (!status) {
    return t ? t('calendarItem.event.status.pending') : 'PENDING'
  }
  const key = keys[status] || status.toLowerCase()
  return t ? t(`calendarItem.event.status.${key}`) : status
}

function formatResultDate(value: string | Date | null | undefined, locale: 'en' | 'sv') {
  if (!value) return null
  return format(new Date(value), 'd MMM HH:mm', { locale: locale === 'en' ? enUS : sv })
}

function mapEventImpact(impact: string | undefined) {
  const impactMap: Record<string, string> = {
    NO_TRAINING: 'noTraining',
    REDUCED: 'reduced',
    MODIFIED: 'modified',
    NORMAL: 'normal',
  }
  return impactMap[impact || ''] || 'normal'
}

function toDateLocaleCode(locale: string | undefined): 'en' | 'sv' {
  return locale?.startsWith('sv') ? 'sv' : 'en'
}

function safePreview(value: unknown) {
  if (!value) return null
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export interface WODItemProps {
  wod: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function WODItem({ wod, isSelected, onClick, isGlass = false }: WODItemProps) {
  const meta = wod.metadata
  const isCompleted = meta.isCompleted as boolean
  const mode = meta.mode as string
  const t = useTranslations('components.daySidebar')
  const modeLabelMap: Record<string, string> = {
    STRUCTURED: t('calendarItem.wod.mode.structured'),
    CASUAL: t('calendarItem.wod.mode.casual'),
    FUN: t('calendarItem.wod.mode.fun'),
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg p-3 transition-all',
        isGlass
          ? cn(
              'border border-white/10 hover:bg-white/5',
              isSelected && 'bg-white/10 border-emerald-500/30'
            )
          : cn(
              'border hover:shadow-sm',
              isSelected && 'ring-2 ring-emerald-500/50'
            )
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'font-medium text-sm truncate',
                isGlass ? 'text-white' : ''
              )}>
                {wod.title}
              </span>
            {isCompleted && (
              <Badge variant="default" className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                {t('status.completed')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Sparkles className="h-3 w-3" />
              {t('calendarItem.wod.title')}
            </span>
            <span>{modeLabelMap[mode] || t('calendarItem.wod.mode.structured')}</span>
            {typeof meta.requestedDuration === 'number' && meta.requestedDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {`${typeof meta.actualDuration === 'number' ? meta.actualDuration : meta.requestedDuration} ${t('units.minutes')}`}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className={cn(
          'h-4 w-4 shrink-0 mt-1',
          isGlass ? 'text-slate-500' : 'text-muted-foreground'
        )} />
      </div>
    </button>
  )
}

// ── Workout Item ──────────────────────────────────────────────────────────

export interface WorkoutItemProps {
  workout: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function WorkoutItem({ workout, isSelected, onClick, isGlass = false }: WorkoutItemProps) {
  const meta = workout.metadata
  const workoutType = (meta.workoutType as string) || 'OTHER'
  const intensity = (meta.intensity as string) || 'MODERATE'
  const isCompleted = meta.isCompleted as boolean
  const t = useTranslations('components.daySidebar')

  return (
    <button
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
          : isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent',
        isSelected && isGlass && "ring-1 ring-blue-500/50 bg-blue-500/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                WORKOUT_TYPE_COLORS[workoutType] || 'bg-blue-500'
              )}
            />
            <span className="font-medium text-sm truncate">{workout.title}</span>
            {isCompleted && (
              <Badge variant="secondary" className="text-xs">
                ✓
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {typeof meta.duration === 'number' && meta.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {meta.duration} {t('units.minutes')}
              </span>
            )}
            {typeof meta.distance === 'number' && meta.distance > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {meta.distance} {t('units.kilometers')}
              </span>
            )}
          </div>
        </div>
        <Badge
          className={cn(
            'text-xs shrink-0',
            INTENSITY_COLORS[intensity]?.replace('bg-', 'bg-') || 'bg-yellow-500',
            'text-white'
          )}
        >
          {formatIntensityLabel(intensity, t)}
        </Badge>
      </div>
    </button>
  )
}

export interface RaceItemProps {
  race: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function RaceItem({ race, isSelected, onClick, isGlass = false }: RaceItemProps) {
  const meta = race.metadata
  const classification = meta.classification as string
  const isCompleted = meta.isCompleted as boolean
  const t = useTranslations('components.daySidebar')

  const classificationColors: Record<string, string> = {
    A: 'bg-red-500 text-white',
    B: 'bg-orange-500 text-white',
    C: 'bg-blue-500 text-white',
  }

  return (
    <button
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30"
          : 'border-red-200 bg-red-50 dark:bg-red-950/20',
        isSelected
          ? (isGlass ? 'ring-1 ring-red-500/60 bg-red-500/10' : 'ring-2 ring-primary')
          : ''
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{race.title}</span>
            <Badge className={cn('text-xs', classificationColors[classification] || 'bg-gray-500')}>
              {classification}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {meta.distance ? String(meta.distance) : ''}
            {typeof meta.targetTime === 'string' && meta.targetTime && ` • ${t('calendarItem.race.target')}: ${meta.targetTime}`}
            {isCompleted && typeof meta.actualTime === 'string' && meta.actualTime && ` • ${t('calendarItem.race.actual')}: ${meta.actualTime}`}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  )
}

export interface CalendarEventItemProps {
  clientId?: string
  event: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  onEdit: () => void
  onDeleted: () => void
  isCoachView?: boolean
  isGlass?: boolean
}

export function CalendarEventItem({
  clientId,
  event,
  isSelected,
  onClick,
  onEdit,
  onDeleted,
  isCoachView = false,
  isGlass = false,
}: CalendarEventItemProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [isLoadingResult, setIsLoadingResult] = useState(false)
  const [isSendingPraise, setIsSendingPraise] = useState(false)
  const [workoutResult, setWorkoutResult] = useState<ScheduledWorkoutResult | null>(null)
  const t = useTranslations('components.daySidebar')
  const locale = useLocale()
  const dateLocale = locale?.startsWith('sv') ? sv : enUS
  const dateLocaleCode = toDateLocaleCode(locale)
  const meta = event.metadata
  const eventType = (meta.eventType as string) || 'EXTERNAL_EVENT'
  const trainingImpact = (meta.trainingImpact as string) || 'NORMAL'
  const isReadOnly = meta.isReadOnly as boolean
  const isVirtualAssignment = meta.isVirtualAssignment === true
  const scheduledWorkoutSource = meta.scheduledWorkoutSource as ScheduledWorkoutSource | null | undefined
  const canEditScheduledWorkoutSource = ['strength', 'cardio', 'hybrid'].includes(
    scheduledWorkoutSource?.kind || ''
  )
  const canPrintScheduledWorkoutSource = ['strength', 'cardio', 'hybrid', 'agility'].includes(
    scheduledWorkoutSource?.kind || ''
  )
  const hasRegisteredWorkout = Boolean(
    scheduledWorkoutSource?.isCompleted ||
    scheduledWorkoutSource?.completedAt ||
    scheduledWorkoutSource?.status === 'COMPLETED'
  )
  const config = EVENT_TYPE_CONFIG[eventType as keyof typeof EVENT_TYPE_CONFIG]
  const impactConfig = IMPACT_CONFIG[trainingImpact as keyof typeof IMPACT_CONFIG]
  const sourceName = scheduledWorkoutSource?.sourceName?.trim()
  const shouldShowSourceName = !!sourceName && !event.title.includes(sourceName)
  const completedLabel = formatResultDate(scheduledWorkoutSource?.completedAt, dateLocaleCode)
  const originalPreview = safePreview(workoutResult?.original)
  const detailSections = Array.isArray(workoutResult?.details) ? workoutResult.details : []
  const canSendPraise = Boolean(
    isCoachView &&
      clientId &&
      scheduledWorkoutSource?.kind &&
      scheduledWorkoutSource?.assignmentId &&
      hasRegisteredWorkout
  )

  const openScheduledWorkout = () => {
    const kind = scheduledWorkoutSource?.kind
    const sourceId = scheduledWorkoutSource?.sourceId
    if (!kind || !sourceId) return

    const coachBasePath = (() => {
      const match = pathname?.match(/^\/([^/]+)\/coach(?:\/|$)/)
      if (match?.[1]) return `/${match[1]}/coach`
      return '/coach'
    })()

    const studioPathByKind: Record<string, string> = {
      strength: 'strength',
      cardio: 'cardio',
      hybrid: 'hybrid-studio',
      agility: 'agility-studio',
    }
    const studioPath = studioPathByKind[kind]
    if (!studioPath) return

    const idParam = kind === 'strength' || kind === 'cardio'
      ? 'editSessionId'
      : 'editWorkoutId'
    router.push(`${coachBasePath}/${studioPath}?${idParam}=${sourceId}&fromCalendarEdit=true`)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/calendar-events/${event.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success(t('toast.eventDeleted'))
        onDeleted()
        return
      }
      const data = await response.json().catch(() => ({}))
      toast.error(t('toast.deleteFailed'), {
        description: data.error || `HTTP ${response.status}`,
      })
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast.error(t('toast.deleteFailed'), {
        description: t('errors.network'),
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenResult = async () => {
    const kind = scheduledWorkoutSource?.kind
    const assignmentId = scheduledWorkoutSource?.assignmentId
    if (!kind || !assignmentId) return

    setIsResultOpen(true)
    if (workoutResult) return

    setIsLoadingResult(true)
    try {
      const params = new URLSearchParams({ kind, assignmentId })
      const response = await fetch(`/api/calendar/workout-result?${params.toString()}`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(t('toast.resultLoadFailed'), {
          description: data.error || `HTTP ${response.status}`,
        })
        return
      }
      const data = (await response.json()) as ScheduledWorkoutResult
      setWorkoutResult(data)
    } catch (error) {
      console.error('Failed to fetch workout result:', error)
      toast.error(t('toast.resultLoadFailed'), {
        description: t('errors.network'),
      })
    } finally {
      setIsLoadingResult(false)
    }
  }

  const handleSendPraise = async () => {
    const kind = scheduledWorkoutSource?.kind
    const assignmentId = scheduledWorkoutSource?.assignmentId
    if (!clientId || !kind || !assignmentId) return

    setIsSendingPraise(true)
    try {
      const response = await fetch('/api/calendar/workout-praise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          kind,
          assignmentId,
          message: t('praiseMessage', { title: sourceName || event.title }),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(t('toast.praiseFailed'), {
          description: data.error || `HTTP ${response.status}`,
        })
        return
      }

      toast.success(t('toast.praiseSent'))
    } catch (error) {
      console.error('Failed to send workout praise:', error)
      toast.error(t('toast.praiseFailed'), {
        description: t('errors.network'),
      })
    } finally {
      setIsSendingPraise(false)
    }
  }

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all duration-300 overflow-hidden',
        isGlass
          ? "bg-white/5 border-white/10"
          : (config?.bgColor || 'bg-gray-100'),
        isSelected && (isGlass ? 'ring-1 ring-purple-500/50 bg-purple-500/5' : 'ring-2 ring-primary')
      )}
    >
      <button className="w-full text-left" onClick={onClick}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span>{config?.icon}</span>
              <span className={cn('font-medium text-sm truncate', config?.color)}>
                {event.title}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 min-w-0">
              <Badge
                variant="outline"
                className={cn('text-xs shrink-0', impactConfig?.color)}
              >
                {impactConfig
                  ? t(`eventImpact.${mapEventImpact(trainingImpact)}`)
                  : t('eventImpact.normal')}
              </Badge>
              {scheduledWorkoutSource?.assignmentId && (
                <Badge
                  variant={hasRegisteredWorkout ? 'default' : 'outline'}
                  className={cn(
                    'text-xs shrink-0',
                    hasRegisteredWorkout
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'text-slate-600 border-slate-300 bg-white/70'
                  )}
                >
                {hasRegisteredWorkout
                  ? t('calendarItem.event.status.completed')
                  : formatScheduledStatus(scheduledWorkoutSource.status, t)}
                </Badge>
              )}
              {shouldShowSourceName && (
                <span className="min-w-0 max-w-full truncate text-xs text-muted-foreground">
                  {sourceName}
                </span>
              )}
              {eventType === 'ALTITUDE_CAMP' && typeof meta.altitude === 'number' && meta.altitude > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mountain className="h-3 w-3" />
                  {meta.altitude} {t('units.meters')}
                </span>
              )}
            </div>
            {event.endDate && event.endDate !== event.date && (
              <div className="text-xs text-muted-foreground mt-1">
                {t('calendarItem.event.endsAt')}: {format(new Date(event.endDate as string), 'd MMM', { locale: dateLocale })}
              </div>
            )}
            {hasRegisteredWorkout && completedLabel && (
              <div className="text-xs text-emerald-700 mt-1">
                {t('calendarItem.event.registeredAt', { time: completedLabel })}
              </div>
            )}
          </div>
        </div>
      </button>

      {!isReadOnly && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
          {scheduledWorkoutSource?.sourceId && canEditScheduledWorkoutSource && (
            <Button variant="ghost" size="sm" className="h-7 min-w-0 px-2 text-[10px] uppercase font-bold" onClick={openScheduledWorkout}>
              <ExternalLink className="h-3 w-3 shrink-0 mr-1" />
              {t('calendarItem.event.actions.editWorkout')}
            </Button>
          )}
          {scheduledWorkoutSource?.sourceId && canPrintScheduledWorkoutSource && (
            <PrintWorkoutButton
              kind={scheduledWorkoutSource.kind as PrintableWorkoutKind}
              workoutId={scheduledWorkoutSource.sourceId}
              date={event.date}
              label={t('calendarItem.event.actions.printWorkout')}
              variant="ghost"
              size="sm"
              className="h-7 min-w-0 px-2 text-[10px] uppercase font-bold"
            />
          )}
          {scheduledWorkoutSource?.assignmentId && hasRegisteredWorkout && (
            <Button variant="ghost" size="sm" className="h-7 min-w-0 px-2 text-[10px] uppercase font-bold" onClick={handleOpenResult}>
              <Eye className="h-3 w-3 shrink-0 mr-1" />
              {t('calendarItem.event.actions.viewResult')}
            </Button>
          )}
          {canSendPraise && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 min-w-0 px-2 text-[10px] uppercase font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
              onClick={handleSendPraise}
              disabled={isSendingPraise}
            >
              {isSendingPraise ? (
                <Loader2 className="h-3 w-3 shrink-0 mr-1 animate-spin" />
              ) : (
                <ThumbsUp className="h-3 w-3 shrink-0 mr-1" />
              )}
              {t('calendarItem.event.actions.praise')}
            </Button>
          )}
          {!isVirtualAssignment && (
            <>
              <Button variant="ghost" size="sm" className="h-7 min-w-0 px-2 text-[10px] uppercase font-bold" onClick={onEdit}>
                <Edit className="h-3 w-3 shrink-0 mr-1" />
                {eventType === 'SCHEDULED_WORKOUT'
                  ? t('calendarItem.event.actions.time')
                  : t('calendarItem.event.actions.edit')}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 min-w-0 px-2 text-[10px] uppercase font-bold text-red-400 hover:text-red-300">
                    <Trash2 className="h-3 w-3 shrink-0 mr-1" />
                    {t('calendarItem.event.actions.remove')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={isGlass ? "bg-slate-900 border-white/10" : ""}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className={isGlass ? "text-white font-black" : ""}>
                      {t('calendarItem.event.deleteConfirmTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription className={isGlass ? "text-slate-400" : ""}>
                      {t('calendarItem.event.deleteConfirmMessage', { title: event.title })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className={isGlass ? "bg-white/5 border-white/10 text-slate-300" : ""}>
                      {t('calendarItem.event.actions.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? t('calendarItem.event.actions.removing') : t('calendarItem.event.actions.remove')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      )}

      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent className={cn('max-w-2xl max-h-[88vh] overflow-hidden flex flex-col', isGlass ? 'bg-slate-900 border-white/10 text-white' : '')}>
          <DialogHeader className="shrink-0">
            <DialogTitle className={isGlass ? 'text-white' : ''}>
              {workoutResult?.title || sourceName || event.title}
            </DialogTitle>
            <DialogDescription className={isGlass ? 'text-slate-400' : ''}>
              {workoutResult?.athleteName ? `${workoutResult.athleteName} · ` : ''}
              {workoutResult?.completedAt
                ? t('calendarItem.event.registeredAt', {
                    time: formatResultDate(workoutResult.completedAt, dateLocaleCode) ?? '',
                  })
                : t('calendarItem.event.resultPlaceholder')
              }
            </DialogDescription>
          </DialogHeader>

          {isLoadingResult ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground shrink-0">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('calendarItem.event.loadingResult')}
            </div>
          ) : workoutResult ? (
            <div className="min-h-0 overflow-y-auto pr-2 space-y-5">
              {workoutResult.metrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {workoutResult.metrics.map((item) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className={cn(
                        'rounded-lg border p-3',
                        isGlass ? 'bg-white/5 border-white/10' : 'bg-slate-50'
                      )}
                    >
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                        {item.label}
                      </p>
                      <p className="text-lg font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {workoutResult.notes && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                    {t('calendarItem.event.labels.comment')}
                  </p>
                  <p className={cn('text-sm rounded-lg border p-3 whitespace-pre-wrap', isGlass ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white')}>
                    {workoutResult.notes}
                  </p>
                </div>
              )}

              {detailSections.length > 0 && (
                <div className="space-y-3">
                  {detailSections.map((section) => (
                    <div key={section.title}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                        {section.title}
                      </p>
                      <div className="space-y-2">
                        {section.rows.map((row) => (
                          <div
                            key={row.label}
                            className={cn(
                              'rounded-lg border p-3',
                              isGlass ? 'bg-white/5 border-white/10' : 'bg-slate-50'
                            )}
                          >
                            <p className="text-sm font-semibold mb-2">{row.label}</p>
                            <div className="flex flex-wrap gap-2">
                              {row.values.map((item) => (
                                <span
                                  key={`${row.label}-${item.label}`}
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs',
                                    isGlass ? 'border-white/10 bg-black/20 text-slate-200' : 'bg-white'
                                  )}
                                >
                                  <span className="text-muted-foreground">{item.label}:</span>
                                  <span className="font-semibold">{item.value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {originalPreview && (
                <details className="group">
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t('calendarItem.event.originalData')}
                  </summary>
                  <pre className={cn('mt-2 max-h-48 overflow-auto rounded-lg border p-3 text-xs whitespace-pre-wrap', isGlass ? 'bg-black/30 border-white/10 text-slate-300' : 'bg-slate-50')}>
                    {originalPreview}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">{t('calendarItem.event.noResult')}</p>
          )}
        </DialogContent>
      </Dialog>

      {isReadOnly && (
        <div className="text-[10px] font-medium text-slate-500 mt-2 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          {t('calendarItem.event.importedFrom', {
            name: String(meta.externalCalendarName || t('calendarItem.event.externalSourceDefault')),
          })}
        </div>
      )}
    </div>
  )
}

export interface FieldTestItemProps {
  test: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function FieldTestItem({ test, isSelected, onClick, isGlass = false }: FieldTestItemProps) {
  const meta = test.metadata
  const testType = (meta.testType as string) || ''
  const isValidated = meta.validatedByCoach as boolean
  const t = useTranslations('components.daySidebar')

  return (
    <button
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/30"
          : 'border-green-200 bg-green-50 dark:bg-green-950/20',
        isSelected && (isGlass ? 'ring-1 ring-green-500/50 bg-green-500/5' : 'ring-2 ring-primary')
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{test.title}</span>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {formatFieldTestType(testType, t)}
            </Badge>
            {isValidated ? (
              <Badge className="text-xs bg-green-500">{t('calendarItem.fieldTest.valid')}</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {t('calendarItem.fieldTest.pending')}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export interface CheckInItemProps {
  checkIn: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function CheckInItem({ checkIn, isSelected, onClick, isGlass = false }: CheckInItemProps) {
  const meta = checkIn.metadata
  const readinessScore = meta.readinessScore as number | undefined
  const readinessDecision = meta.readinessDecision as string | undefined
  const t = useTranslations('components.daySidebar')

  const decisionColors: Record<string, string> = {
    PROCEED: 'bg-green-500',
    REDUCE: 'bg-yellow-500',
    EASY: 'bg-orange-500',
    REST: 'bg-red-500',
  }

  return (
    <button
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
          : isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent',
        isSelected && isGlass && 'ring-1 ring-slate-500/50 bg-slate-500/5'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-medium text-sm">{t('calendarItem.checkIn.title')}</span>
          <div className="flex items-center gap-2 mt-1">
            {readinessScore !== undefined && (
              <span className="text-xs text-muted-foreground">
                {t('calendarItem.checkIn.readiness')}: {readinessScore}%
              </span>
            )}
          </div>
        </div>
        {readinessDecision && (
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              decisionColors[readinessDecision] || 'bg-gray-500'
            )}
          />
        )}
      </div>
    </button>
  )
}

export interface AdHocItemProps {
  workout: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function AdHocItem({ workout, isSelected, onClick, isGlass = false }: AdHocItemProps) {
  const meta = workout.metadata
  const intensity = (meta.intensity as string) || 'MODERATE'
  const distance = formatDistanceValue(meta.distance)
  const t = useTranslations('components.daySidebar')

  return (
    <button
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? 'bg-teal-500/5 border-teal-500/20 hover:bg-teal-500/10 hover:border-teal-500/30'
          : 'border-teal-200 bg-teal-50 dark:bg-teal-950/20',
        isSelected
          ? (isGlass ? 'ring-1 ring-teal-500/60 bg-teal-500/10' : 'ring-2 ring-primary')
          : ''
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{workout.title}</span>
            <Badge variant="secondary" className="text-xs">
              ✓
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {typeof meta.duration === 'number' && meta.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {meta.duration} {t('units.minutes')}
              </span>
            )}
            {distance.label && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {distance.label}
              </span>
            )}
          </div>
        </div>
        <Badge
          className={cn(
            'text-xs shrink-0',
            INTENSITY_COLORS[intensity] || 'bg-yellow-500',
            'text-white'
          )}
        >
          {formatIntensityLabel(intensity, t)}
        </Badge>
      </div>
    </button>
  )
}
