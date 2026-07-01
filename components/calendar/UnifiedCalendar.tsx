'use client'

/**
 * Unified Calendar Component
 *
 * Main calendar container that displays all training-related events
 * (workouts, races, field tests) and life events (travel, camps, illness, vacation)
 *
 * Mobile-optimized with:
 * - Swipe navigation between months
 * - Bottom sheet for day details
 * - Tap-to-move for workout rescheduling
 * - FAB for quick actions
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isToday } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import useSWR from 'swr'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { MonthViewDraggable } from './MonthViewDraggable'
import { WeekView } from './WeekView'
import { DaySidebar } from './DaySidebar'
import { EventFormDialog } from './EventFormDialog'
import { ConflictDialog } from './ConflictDialog'
import { RescheduleConfirmDialog } from './RescheduleConfirmDialog'
import { MobileDaySheet } from './MobileDaySheet'
import { MobileMoveWorkoutSheet } from './MobileMoveWorkoutSheet'
import { MobileCalendarFAB } from './MobileCalendarFAB'
import { DayActionMenu, useDayActionMenu, type DayActionType } from './DayActionMenu'
import { QuickWorkoutDialog } from './QuickWorkoutDialog'
import { FullWorkoutDialog } from './FullWorkoutDialog'
import { CalendarWorkoutDetailSheet } from './CalendarWorkoutDetailSheet'
import { ScheduleTestDialog } from './ScheduleTestDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useSwipeNavigation, useIsMobile } from './hooks/useSwipeNavigation'
import { UnifiedCalendarItem } from './types'
import type { Conflict, ConflictResolution } from '@/lib/calendar/conflict-detection'
import { CalendarEventType } from '@prisma/client'
import { cn } from '@/lib/utils'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { useLocale } from '@/i18n/client'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Reschedule state
interface RescheduleState {
  workoutId: string
  workoutName: string
  workoutType?: string
  originalDate: Date
  targetDate: Date
  conflicts: Conflict[]
}


type CalendarView = 'month' | 'week' | 'agenda'

interface UnifiedCalendarProps {
  clientId: string
  clientName?: string
  isCoachView?: boolean
  variant?: 'default' | 'glass'
  businessSlug?: string
}

function getCalendarDayNumber(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay()
}

function sortCalendarItems(calendarItems: UnifiedCalendarItem[]): UnifiedCalendarItem[] {
  return [...calendarItems].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
}

export function UnifiedCalendar({ clientId, clientName, isCoachView = false, variant = 'default', businessSlug }: UnifiedCalendarProps) {
  const { toast } = useToast()
  const locale = useLocale()
  const appLocale = locale === 'sv' ? 'sv' : 'en'
  const dateLocale = appLocale === 'sv' ? sv : enUS
  const isGlass = variant === 'glass'

  // Deep-link support: `?date=YYYY-MM-DD` opens the calendar on that month
  // with that day selected. Read from window.location as the source of truth
  // (useSearchParams can lag behind during client navigation) and apply once
  // per distinct date string so the coach's later month nav isn't clobbered.
  const searchParams = useSearchParams()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const appliedDateParamRef = useRef<string | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    const d = urlParams.get('date') ?? searchParams?.get('date') ?? null
    if (!d || appliedDateParamRef.current === d) return
    const parsed = new Date(d)
    if (isNaN(parsed.getTime())) return
    appliedDateParamRef.current = d
    setCurrentMonth(parsed)
    setSelectedDate(parsed)
  }, [searchParams])
  const [selectedItem, setSelectedItem] = useState<UnifiedCalendarItem | null>(null)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<UnifiedCalendarItem | null>(null)
  const [activeView, setActiveView] = useState<CalendarView>('month')
  const [defaultEventType, setDefaultEventType] = useState<CalendarEventType | undefined>()

  // Mobile-specific state
  const isMobile = useIsMobile()
  const [isMobileDaySheetOpen, setIsMobileDaySheetOpen] = useState(false)
  const [isMobileMoveSheetOpen, setIsMobileMoveSheetOpen] = useState(false)
  const [workoutToMove, setWorkoutToMove] = useState<UnifiedCalendarItem | null>(null)

  // Reschedule state
  const [rescheduleState, setRescheduleState] = useState<RescheduleState | null>(null)
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [isCopyingWorkout, setIsCopyingWorkout] = useState(false)
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Intensity modification state
  const [showIntensityDialog, setShowIntensityDialog] = useState(false)
  const [selectedIntensity, setSelectedIntensity] = useState<string>('moderate')

  // Day action menu (for coach creating workouts/events on empty days)
  const dayActionMenu = useDayActionMenu()

  // Quick workout dialog state
  const [isQuickWorkoutOpen, setIsQuickWorkoutOpen] = useState(false)
  const [quickWorkoutDate, setQuickWorkoutDate] = useState<Date>(new Date())

  // Full workout dialog state
  const [isFullWorkoutOpen, setIsFullWorkoutOpen] = useState(false)
  const [fullWorkoutDate, setFullWorkoutDate] = useState<Date>(new Date())

  // Schedule test dialog state
  const [isScheduleTestOpen, setIsScheduleTestOpen] = useState(false)
  const [scheduleTestDate, setScheduleTestDate] = useState<Date>(new Date())

  // Workout detail sheet state
  const [detailWorkoutId, setDetailWorkoutId] = useState<string | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)

  // Move the calendar backward/forward by one step. Step size depends on the
  // active view: weeks in the week view, months everywhere else.
  const stepCalendar = useCallback((dir: 1 | -1) => {
    setCurrentMonth((prev) => {
      if (activeView === 'week') return dir === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1)
      return dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1)
    })
    setSelectedDate(null)
    setSelectedItem(null)
  }, [activeView])

  // Swipe navigation for mobile (month + week views)
  const { ref: swipeRef, swipeOffset, isSwiping } = useSwipeNavigation({
    onSwipeLeft: () => stepCalendar(1),
    onSwipeRight: () => stepCalendar(-1),
    enabled: isMobile && (activeView === 'month' || activeView === 'week'),
    threshold: 80,
  })

  // Calculate date range for the API call. The window widens for the agenda
  // (≈3 months, kept under the API's 120-day clamp) so athletes can scroll
  // past and upcoming workouts without paging; the week view fetches just its
  // week (which may cross a month boundary).
  const { fetchStart, fetchEnd } = useMemo(() => {
    if (activeView === 'week') {
      return {
        fetchStart: startOfWeek(currentMonth, { weekStartsOn: 1 }),
        fetchEnd: endOfWeek(currentMonth, { weekStartsOn: 1 }),
      }
    }
    if (activeView === 'agenda') {
      return {
        fetchStart: startOfMonth(subMonths(currentMonth, 1)),
        fetchEnd: endOfMonth(addMonths(currentMonth, 1)),
      }
    }
    return { fetchStart: startOfMonth(currentMonth), fetchEnd: endOfMonth(currentMonth) }
  }, [activeView, currentMonth])

  // Fetch unified calendar data
  const { data, error, isLoading, mutate } = useSWR(
    `/api/calendar/unified?clientId=${clientId}&startDate=${fetchStart.toISOString()}&endDate=${fetchEnd.toISOString()}&itemsMode=light&includeGroupedByDate=false`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  const items: UnifiedCalendarItem[] = useMemo(() => data?.items || [], [data?.items])

  // Compute items for the selected date
  const selectedDateItems = useMemo(() => {
    if (!selectedDate) return []
    return items.filter(item => isSameDay(new Date(item.date), selectedDate))
  }, [items, selectedDate])

  // Blocked and reduced dates for mobile move workflow (empty by default)
  const blockedDates: Date[] = []
  const reducedDates: Date[] = []

  const handlePreviousMonth = useCallback(() => stepCalendar(-1), [stepCalendar])

  const handleNextMonth = useCallback(() => stepCalendar(1), [stepCalendar])

  const handleToday = useCallback(() => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }, [])

  // Header label: week range in the week view, otherwise the month name.
  const headerTitle = useMemo(() => {
    if (activeView === 'week') {
      const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 1 })
      const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
      return `${format(weekStart, sameMonth ? 'd' : 'd MMM', { locale: dateLocale })} – ${format(weekEnd, 'd MMM yyyy', { locale: dateLocale })}`
    }
    return format(currentMonth, 'MMMM yyyy', { locale: dateLocale })
  }, [activeView, currentMonth, dateLocale])

  const handleDayClick = useCallback((date: Date, event?: React.MouseEvent) => {
    setSelectedDate(date)
    setSelectedItem(null)

    if (isMobile) {
      setIsMobileDaySheetOpen(true)
      return
    }

    // In coach view, clicking the day canvas should always offer creation
    // actions so coaches can add a second workout to an occupied day.
    // Item chips stop propagation separately and still open/select the item.
    if (isCoachView) {
      dayActionMenu.openMenu(date, event?.currentTarget as HTMLElement)
      return
    }

  }, [isMobile, isCoachView, dayActionMenu])

  const handleItemClick = useCallback((item: UnifiedCalendarItem) => {
    setSelectedItem(item)
    setSelectedDate(new Date(item.date))
    if (isMobile) {
      setIsMobileDaySheetOpen(true)
    }
  }, [isMobile])

  // Handle adding calendar events
  const handleAddEvent = useCallback((date?: Date) => {
    setEditingEvent(null)
    if (date) {
      setSelectedDate(date)
    }
    setIsEventDialogOpen(true)
  }, [])

  // Handle day action menu selections (coach creating workout/event/test)
  const handleDayAction = useCallback((actionType: DayActionType, date: Date) => {
    switch (actionType) {
      case 'quick-workout':
        setQuickWorkoutDate(date)
        setIsQuickWorkoutOpen(true)
        break
      case 'full-workout':
        setFullWorkoutDate(date)
        setIsFullWorkoutOpen(true)
        break
      case 'calendar-event':
        // Open existing event dialog
        handleAddEvent(date)
        break
      case 'field-test':
        setScheduleTestDate(date)
        setIsScheduleTestOpen(true)
        break
      case 'note':
        // Open event dialog for a quick note (user can select type)
        handleAddEvent(date)
        break
    }
  }, [handleAddEvent])

  const handleEditEvent = useCallback((item: UnifiedCalendarItem) => {
    if (item.type === 'CALENDAR_EVENT') {
      setEditingEvent(item)
      setIsEventDialogOpen(true)
    }
  }, [])

  const handleEventSaved = useCallback(() => {
    mutate() // Refresh calendar data
    setIsEventDialogOpen(false)
    setEditingEvent(null)
  }, [mutate])

  const handleEventDeleted = useCallback(() => {
    mutate()
    setSelectedItem(null)
    setIsMobileDaySheetOpen(false)
  }, [mutate])

  // Mobile: Open move workout sheet
  const handleMobileMove = useCallback((workout: UnifiedCalendarItem) => {
    setWorkoutToMove(workout)
    setIsMobileMoveSheetOpen(true)
    setIsMobileDaySheetOpen(false)
  }, [])

  // Mobile: Confirm move workout
  const handleMobileMoveConfirm = useCallback(async (targetDate: Date) => {
    if (!workoutToMove) return

    try {
      const response = await fetch('/api/calendar/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: workoutToMove.id,
          newDate: targetDate.toISOString(),
          skipConflictCheck: false,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: appLocale === 'sv' ? 'Fel' : 'Error',
          description: result.error || (appLocale === 'sv' ? 'Kunde inte flytta passet' : 'Could not move the workout'),
          variant: 'destructive',
        })
        return
      }

      toast({
        title: appLocale === 'sv' ? 'Pass flyttat' : 'Workout moved',
        description: result.message,
      })

      mutate()
      setIsMobileMoveSheetOpen(false)
      setWorkoutToMove(null)
    } catch (error) {
      console.error('Move error:', error)
      toast({
        title: appLocale === 'sv' ? 'Fel' : 'Error',
        description: appLocale === 'sv' ? 'Kunde inte flytta passet' : 'Could not move the workout',
        variant: 'destructive',
      })
    }
  }, [appLocale, workoutToMove, mutate, toast])

  // Mobile: Handle FAB action
  const handleFABAction = useCallback((action: { type: 'new-event'; eventType?: CalendarEventType }) => {
    if (action.type === 'new-event') {
      setDefaultEventType(action.eventType)
      setEditingEvent(null)
      setIsEventDialogOpen(true)
    }
  }, [])

  // Handle viewing full workout details
  const handleViewWorkoutDetails = useCallback((workoutId: string) => {
    setDetailWorkoutId(workoutId)
    setIsDetailSheetOpen(true)
  }, [])

  // Handle sidebar add event (for coach view, open DayActionMenu instead of EventFormDialog)
  const handleSidebarAddEvent = useCallback(() => {
    if (isCoachView && selectedDate) {
      dayActionMenu.openMenu(selectedDate)
    } else {
      handleAddEvent(selectedDate || undefined)
    }
  }, [isCoachView, selectedDate, dayActionMenu, handleAddEvent])

  // Handle drag-and-drop reschedule
  const handleReschedule = useCallback(
    async (workoutId: string, targetDate: Date, originalDate: Date) => {
      // Find the workout in items
      const workout = items.find((item) => item.id === workoutId && item.type === 'WORKOUT')
      if (!workout) return

      setIsCheckingConflicts(true)

      try {
        // Check for conflicts
        const response = await fetch('/api/calendar/conflicts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workoutId,
            targetDate: targetDate.toISOString(),
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          toast({
            title: appLocale === 'sv' ? 'Fel' : 'Error',
            description: result.error || (appLocale === 'sv' ? 'Kunde inte kontrollera konflikter' : 'Could not check conflicts'),
            variant: 'destructive',
          })
          return
        }

        const state: RescheduleState = {
          workoutId,
          workoutName: workout.title,
          workoutType: workout.metadata.workoutType as string | undefined,
          originalDate,
          targetDate,
          conflicts: result.conflicts || [],
        }

        setRescheduleState(state)

        // Show appropriate dialog based on conflicts
        if (state.conflicts.length > 0) {
          setShowConflictDialog(true)
        } else {
          setShowConfirmDialog(true)
        }
      } catch (err) {
        console.error('Error checking conflicts:', err)
        toast({
          title: appLocale === 'sv' ? 'Fel' : 'Error',
          description: appLocale === 'sv' ? 'Kunde inte kontrollera konflikter' : 'Could not check conflicts',
          variant: 'destructive',
        })
      } finally {
        setIsCheckingConflicts(false)
      }
    },
    [appLocale, items, toast]
  )

  // Handle shift-drag workout copy
  const handleCopyWorkout = useCallback(
    async (workoutId: string, targetDate: Date) => {
      const workout = items.find((item) => item.id === workoutId && item.type === 'WORKOUT')
      if (!workout) return

      setIsCopyingWorkout(true)

      try {
        const response = await fetch('/api/calendar/workouts/copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workoutId,
            targetDate: targetDate.toISOString(),
            skipConflictCheck: false,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          toast({
            title: appLocale === 'sv' ? 'Fel' : 'Error',
            description: result.error || (appLocale === 'sv' ? 'Kunde inte kopiera passet' : 'Could not copy the workout'),
            variant: 'destructive',
          })
          return
        }

        const copiedItem: UnifiedCalendarItem = {
          ...workout,
          id: result.workout.id,
          title: result.workout.name || workout.title,
          date: result.workout.date || targetDate.toISOString(),
          status: result.workout.status || 'PLANNED',
          metadata: {
            ...workout.metadata,
            dayNumber: getCalendarDayNumber(targetDate),
            order: result.workout.order,
            isCompleted: false,
            completedAt: null,
          },
        }

        mutate((currentData: typeof data) => {
          if (!currentData || !Array.isArray(currentData.items)) return currentData

          return {
            ...currentData,
            items: sortCalendarItems([...currentData.items, copiedItem]),
            counts: currentData.counts
              ? {
                  ...currentData.counts,
                  total: (currentData.counts.total || 0) + 1,
                  workouts: (currentData.counts.workouts || 0) + 1,
                }
              : currentData.counts,
          }
        }, { revalidate: false })

        toast({
          title: appLocale === 'sv' ? 'Pass kopierat' : 'Workout copied',
          description: result.message,
        })
      } catch (err) {
        console.error('Error copying workout:', err)
        toast({
          title: appLocale === 'sv' ? 'Fel' : 'Error',
          description: appLocale === 'sv' ? 'Kunde inte kopiera passet' : 'Could not copy the workout',
          variant: 'destructive',
        })
      } finally {
        setIsCopyingWorkout(false)
      }
    },
    [appLocale, data, items, mutate, toast]
  )

  const updateMovedCalendarItem = useCallback((
    itemId: string,
    targetDate: Date,
    result: { event?: { date?: string; endDate?: string; status?: string } }
  ) => {
    mutate((currentData: typeof data) => {
      if (!currentData || !Array.isArray(currentData.items)) return currentData

      return {
        ...currentData,
        items: sortCalendarItems(
          currentData.items.map((item: UnifiedCalendarItem) =>
            item.id === itemId
              ? {
                  ...item,
                  date: result.event?.date || targetDate.toISOString(),
                  endDate: result.event?.endDate || targetDate.toISOString(),
                  status: result.event?.status || item.status,
                }
              : item
          )
        ),
      }
    }, { revalidate: false })
  }, [data, mutate])

  const handleMoveScheduledWorkout = useCallback(
    async (item: UnifiedCalendarItem, targetDate: Date) => {
      setIsRescheduling(true)

      try {
        const response = await fetch('/api/calendar/scheduled-workouts/drag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarEventId: item.id,
            targetDate: targetDate.toISOString(),
            action: 'move',
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          toast({
            title: appLocale === 'sv' ? 'Fel' : 'Error',
            description: result.error || (appLocale === 'sv' ? 'Kunde inte flytta passet' : 'Could not move the workout'),
            variant: 'destructive',
          })
          return
        }

        updateMovedCalendarItem(item.id, targetDate, result)

        toast({
          title: appLocale === 'sv' ? 'Pass flyttat' : 'Workout moved',
          description: result.message,
        })
      } catch (err) {
        console.error('Error moving scheduled workout:', err)
        toast({
          title: appLocale === 'sv' ? 'Fel' : 'Error',
          description: appLocale === 'sv' ? 'Kunde inte flytta passet' : 'Could not move the workout',
          variant: 'destructive',
        })
      } finally {
        setIsRescheduling(false)
      }
    },
    [appLocale, toast, updateMovedCalendarItem]
  )

  const handleCopyScheduledWorkout = useCallback(
    async (item: UnifiedCalendarItem, targetDate: Date) => {
      setIsCopyingWorkout(true)

      try {
        const response = await fetch('/api/calendar/scheduled-workouts/drag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarEventId: item.id,
            targetDate: targetDate.toISOString(),
            action: 'copy',
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          toast({
            title: appLocale === 'sv' ? 'Fel' : 'Error',
            description: result.error || (appLocale === 'sv' ? 'Kunde inte kopiera passet' : 'Could not copy the workout'),
            variant: 'destructive',
          })
          return false
        }

        const copiedItem: UnifiedCalendarItem = {
          ...item,
          id: result.event.id,
          title: result.event.title || item.title,
          date: result.event.date || targetDate.toISOString(),
          endDate: result.event.endDate || targetDate.toISOString(),
          status: result.event.status || 'SCHEDULED',
          metadata: {
            ...item.metadata,
            isCompleted: false,
            scheduledWorkoutSource: {
              ...(item.metadata.scheduledWorkoutSource as Record<string, unknown> | null | undefined),
              ...result.scheduledWorkoutSource,
              completedAt: null,
              isCompleted: false,
            },
          },
        }

        mutate((currentData: typeof data) => {
          if (!currentData || !Array.isArray(currentData.items)) return currentData

          return {
            ...currentData,
            items: sortCalendarItems([...currentData.items, copiedItem]),
            counts: currentData.counts
              ? {
                  ...currentData.counts,
                  total: (currentData.counts.total || 0) + 1,
                  calendarEvents: (currentData.counts.calendarEvents || 0) + 1,
                }
              : currentData.counts,
          }
        }, { revalidate: false })

        toast({
          title: appLocale === 'sv' ? 'Pass kopierat' : 'Workout copied',
          description: result.message,
        })
        return true
      } catch (err) {
        console.error('Error copying scheduled workout:', err)
        toast({
          title: appLocale === 'sv' ? 'Fel' : 'Error',
          description: appLocale === 'sv' ? 'Kunde inte kopiera passet' : 'Could not copy the workout',
          variant: 'destructive',
        })
        return false
      } finally {
        setIsCopyingWorkout(false)
      }
    },
    [appLocale, data, mutate, toast]
  )

  // Execute reschedule
  const executeReschedule = useCallback(
    async (reason?: string, skipConflictCheck = false) => {
      if (!rescheduleState) return

      setIsRescheduling(true)

      try {
        const response = await fetch('/api/calendar/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workoutId: rescheduleState.workoutId,
            newDate: rescheduleState.targetDate.toISOString(),
            skipConflictCheck,
            reason,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          toast({
            title: appLocale === 'sv' ? 'Fel' : 'Error',
            description: result.error || (appLocale === 'sv' ? 'Kunde inte flytta passet' : 'Could not move the workout'),
            variant: 'destructive',
          })
          return
        }

        // Success
        toast({
          title: appLocale === 'sv' ? 'Pass flyttat' : 'Workout moved',
          description: result.message,
        })

        mutate((currentData: typeof data) => {
          if (!currentData || !Array.isArray(currentData.items)) return currentData

          return {
            ...currentData,
            items: sortCalendarItems(
              currentData.items.map((item: UnifiedCalendarItem) =>
                item.id === rescheduleState.workoutId && item.type === 'WORKOUT'
                  ? {
                      ...item,
                      date: rescheduleState.targetDate.toISOString(),
                      status: result.workout?.status || item.status,
                      metadata: {
                        ...item.metadata,
                        dayNumber: getCalendarDayNumber(rescheduleState.targetDate),
                      },
                    }
                  : item
              )
            ),
          }
        }, { revalidate: false })

        // Close dialogs
        setShowConflictDialog(false)
        setShowConfirmDialog(false)
        setRescheduleState(null)
      } catch (err) {
        console.error('Error rescheduling:', err)
        toast({
          title: appLocale === 'sv' ? 'Fel' : 'Error',
          description: appLocale === 'sv' ? 'Kunde inte flytta passet' : 'Could not move the workout',
          variant: 'destructive',
        })
      } finally {
        setIsRescheduling(false)
      }
    },
    [appLocale, data, rescheduleState, mutate, toast]
  )

  // Handle conflict resolution
  const handleConflictResolve = useCallback(
    async (resolution: ConflictResolution | null) => {
      if (!rescheduleState) return

      if (resolution?.type === 'RESCHEDULE' && resolution.newDate) {
        // Use the suggested new date
        setRescheduleState({
          ...rescheduleState,
          targetDate: new Date(resolution.newDate),
          conflicts: [], // Clear conflicts for new date
        })
        setShowConflictDialog(false)
        setShowConfirmDialog(true)
      } else if (resolution?.type === 'CANCEL') {
        // User chose to cancel the workout
        setShowConflictDialog(false)
        setRescheduleState(null)
        toast({
          title: appLocale === 'sv' ? 'Avbrutet' : 'Cancelled',
          description: appLocale === 'sv' ? 'Flytten avbröts' : 'The move was cancelled',
        })
      } else if (resolution?.type === 'IGNORE' || resolution === null) {
        // Proceed with original reschedule
        executeReschedule(undefined, true)
      } else if (resolution?.type === 'MODIFY_INTENSITY') {
        // Show intensity selection dialog before rescheduling
        setShowConflictDialog(false)
        setShowIntensityDialog(true)
      } else {
        // For other resolutions, proceed with reschedule
        executeReschedule(undefined, true)
      }
    },
    [appLocale, rescheduleState, executeReschedule, toast]
  )

  const handleCancelReschedule = useCallback(() => {
    setShowConflictDialog(false)
    setShowConfirmDialog(false)
    setRescheduleState(null)
  }, [])

  if (isGlass) {
    return (
      <div className="flex flex-col lg:flex-row gap-4 h-full relative">
        {/* Main Calendar Area */}
        <GlassCard className="flex-1">
          <GlassCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-orange-500" />
                <GlassCardTitle className="text-lg">
                  {clientName
                    ? appLocale === 'sv' ? `${clientName}s kalender` : `${clientName}'s calendar`
                    : appLocale === 'sv' ? 'Kalender' : 'Calendar'}
                </GlassCardTitle>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleAddEvent(selectedDate || new Date())}
                className="hidden md:flex bg-orange-600 hover:bg-orange-700 text-white border-none"
              >
                <Plus className="h-4 w-4 mr-1" />
                {appLocale === 'sv' ? 'Ny händelse' : 'New event'}
              </Button>
            </div>

            {/* Month Navigation */}
            <div className="mt-4 space-y-3">
              {/* Row 1: arrows flanking a prominent, always-readable month title */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousMonth}
                  aria-label={appLocale === 'sv' ? 'Föregående månad' : 'Previous month'}
                  className="shrink-0 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <h2 className="flex-1 text-center text-lg sm:text-xl font-black capitalize tracking-tight text-slate-900 dark:text-white">
                  {headerTitle}
                </h2>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  aria-label={appLocale === 'sv' ? 'Nästa månad' : 'Next month'}
                  className="shrink-0 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Row 2: Today + view toggle — now reachable on mobile */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  {appLocale === 'sv' ? 'Idag' : 'Today'}
                </Button>

                <Tabs value={activeView} onValueChange={(v) => setActiveView(v as CalendarView)}>
                  <TabsList className="h-8 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <TabsTrigger value="month" className="text-[10px] uppercase font-bold tracking-widest px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
                      {appLocale === 'sv' ? 'Månad' : 'Month'}
                    </TabsTrigger>
                    <TabsTrigger value="week" className="text-[10px] uppercase font-bold tracking-widest px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
                      {appLocale === 'sv' ? 'Vecka' : 'Week'}
                    </TabsTrigger>
                    <TabsTrigger value="agenda" className="text-[10px] uppercase font-bold tracking-widest px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
                      {appLocale === 'sv' ? 'Lista' : 'List'}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Summary Stats */}
            {data?.counts && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[10px] font-bold uppercase tracking-wider">
                {data.counts.workouts > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    {data.counts.workouts} {appLocale === 'sv' ? 'pass' : 'workouts'}
                  </span>
                )}
                {data.counts.races > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    {data.counts.races} {appLocale === 'sv' ? 'tävlingar' : 'races'}
                  </span>
                )}
                {data.counts.calendarEvents > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                    {data.counts.calendarEvents} {appLocale === 'sv' ? 'händelser' : 'events'}
                  </span>
                )}
                {data.counts.adHoc > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                    {data.counts.adHoc} ad-hoc
                  </span>
                )}
                {data.counts.garmin > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                    {data.counts.garmin} Garmin
                  </span>
                )}
              </div>
            )}
          </GlassCardHeader>

          <GlassCardContent className="pt-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500/50" />
              </div>
            ) : activeView === 'agenda' ? (
              <AgendaView
                items={items}
                onItemClick={handleItemClick}
                selectedItem={selectedItem}
                isGlass={true}
                locale={appLocale}
              />
            ) : (
              <div
                ref={swipeRef}
                className={cn(
                  'touch-pan-y transition-transform duration-200 ease-out',
                  isSwiping && 'transition-none'
                )}
                style={{
                  transform: isSwiping ? `translateX(${swipeOffset}px)` : undefined,
                }}
              >
                {activeView === 'week' ? (
                  <WeekView
                    anchor={currentMonth}
                    items={items}
                    onDayClick={handleDayClick}
                    onItemClick={handleItemClick}
                    selectedDate={selectedDate}
                    locale={appLocale}
                  />
                ) : (
                  <MonthViewDraggable
                    clientId={clientId}
                    month={currentMonth}
                    items={items}
                    onDayClick={handleDayClick}
                    onItemClick={handleItemClick}
                    selectedDate={selectedDate}
                    onReschedule={handleReschedule}
                    onCopyWorkout={handleCopyWorkout}
                    onMoveScheduledWorkout={handleMoveScheduledWorkout}
                    onCopyScheduledWorkout={handleCopyScheduledWorkout}
                    isRescheduling={isCheckingConflicts || isRescheduling}
                    isCopying={isCopyingWorkout}
                    isGlass={true}
                  />
                )}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Day Details Sidebar */}
        <div className="hidden lg:block w-80 shrink-0">
          <DaySidebar
            clientId={clientId}
            date={selectedDate}
            items={selectedDateItems}
            selectedItem={selectedItem}
            onItemClick={handleItemClick}
            onAddEvent={handleSidebarAddEvent}
            onEditEvent={handleEditEvent}
            onEventDeleted={handleEventDeleted}
            onCopyScheduledWorkout={handleCopyScheduledWorkout}
            isCoachView={isCoachView}
            variant="glass"
            onViewWorkoutDetails={handleViewWorkoutDetails}
          />
        </div>

        {/* Mobile Sheets & FAB */}
        <MobileDaySheet
          date={selectedDate}
          items={selectedDateItems}
          selectedItem={selectedItem}
          isOpen={isMobileDaySheetOpen}
          onClose={() => setIsMobileDaySheetOpen(false)}
          onItemClick={handleItemClick}
          onAddEvent={() => {
            setIsMobileDaySheetOpen(false)
            handleSidebarAddEvent()
          }}
          onEditEvent={(item) => {
            setIsMobileDaySheetOpen(false)
            handleEditEvent(item)
          }}
          onEventDeleted={handleEventDeleted}
          onMoveWorkout={handleMobileMove}
          onCopyScheduledWorkout={handleCopyScheduledWorkout}
          onViewWorkoutDetails={handleViewWorkoutDetails}
          isCoachView={isCoachView}
          variant="glass"
          clientId={clientId}
        />

        <MobileMoveWorkoutSheet
          isOpen={isMobileMoveSheetOpen}
          onClose={() => {
            setIsMobileMoveSheetOpen(false)
            setWorkoutToMove(null)
          }}
          workout={workoutToMove}
          onConfirm={handleMobileMoveConfirm}
          isLoading={isRescheduling}
          blockedDates={blockedDates}
          reducedDates={reducedDates}
          variant="glass"
        />

        <MobileCalendarFAB
          onAction={handleFABAction}
          selectedDate={selectedDate}
          visible={!isMobileDaySheetOpen && !isMobileMoveSheetOpen && !isEventDialogOpen}
          variant="glass"
        />

        {/* Dialogs */}
        <EventFormDialog
          clientId={clientId}
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          date={selectedDate || new Date()}
          event={editingEvent}
          onSaved={handleEventSaved}
        />

        {rescheduleState && (
          <ConflictDialog
            open={showConflictDialog}
            onOpenChange={setShowConflictDialog}
            conflicts={rescheduleState.conflicts}
            workoutName={rescheduleState.workoutName}
            originalDate={rescheduleState.originalDate}
            targetDate={rescheduleState.targetDate}
            onResolve={handleConflictResolve}
            onCancel={handleCancelReschedule}
            isLoading={isRescheduling}
          />
        )}

        {rescheduleState && (
          <RescheduleConfirmDialog
            open={showConfirmDialog}
            onOpenChange={setShowConfirmDialog}
            workoutName={rescheduleState.workoutName}
            workoutType={rescheduleState.workoutType}
            originalDate={rescheduleState.originalDate}
            targetDate={rescheduleState.targetDate}
            onConfirm={(reason) => executeReschedule(reason, false)}
            onCancel={handleCancelReschedule}
            isLoading={isRescheduling}
          />
        )}

        {/* Intensity Modification Dialog */}
        <Dialog open={showIntensityDialog} onOpenChange={setShowIntensityDialog}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>{appLocale === 'sv' ? 'Justera intensitet' : 'Adjust intensity'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {appLocale === 'sv' ? 'Välj ny intensitet för' : 'Choose a new intensity for'}{' '}
                <span className="font-medium">{rescheduleState?.workoutName}</span>{' '}
                {appLocale === 'sv' ? 'innan flytt.' : 'before moving.'}
              </p>
              <div className="space-y-2">
                <Label>{appLocale === 'sv' ? 'Intensitet' : 'Intensity'}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'easy', label: appLocale === 'sv' ? 'Lätt' : 'Easy', color: 'bg-green-100 border-green-400 text-green-800' },
                    { value: 'moderate', label: appLocale === 'sv' ? 'Måttlig' : 'Moderate', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
                    { value: 'hard', label: appLocale === 'sv' ? 'Hård' : 'Hard', color: 'bg-red-100 border-red-400 text-red-800' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all',
                        selectedIntensity === opt.value
                          ? opt.color
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      )}
                      onClick={() => setSelectedIntensity(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowIntensityDialog(false)
                  setRescheduleState(null)
                }}
              >
                {appLocale === 'sv' ? 'Avbryt' : 'Cancel'}
              </Button>
              <Button
                onClick={() => {
                  setShowIntensityDialog(false)
                  executeReschedule(
                    appLocale === 'sv'
                      ? `Intensitet justerad till ${selectedIntensity}`
                      : `Intensity adjusted to ${selectedIntensity}`,
                    true
                  )
                }}
                disabled={isRescheduling}
              >
                {isRescheduling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {appLocale === 'sv' ? 'Flytta med ny intensitet' : 'Move with new intensity'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Coach Action Menu and Dialogs */}
        {isCoachView && dayActionMenu.date && (
          <DayActionMenu
            date={dayActionMenu.date}
            clientId={clientId}
            isOpen={dayActionMenu.isOpen}
            onClose={dayActionMenu.closeMenu}
            onAction={handleDayAction}
            anchorEl={dayActionMenu.anchorEl}
          />
        )}

        {isCoachView && (
          <QuickWorkoutDialog
            open={isQuickWorkoutOpen}
            onOpenChange={setIsQuickWorkoutOpen}
            clientId={clientId}
            date={quickWorkoutDate}
            onCreated={() => {
              mutate()
            }}
          />
        )}

        {isCoachView && (
          <FullWorkoutDialog
            open={isFullWorkoutOpen}
            onOpenChange={setIsFullWorkoutOpen}
            clientId={clientId}
            clientName={clientName}
            date={fullWorkoutDate}
            onOpenEventDialog={() => handleAddEvent(fullWorkoutDate)}
            businessSlug={businessSlug}
          />
        )}

        {isCoachView && (
          <ScheduleTestDialog
            open={isScheduleTestOpen}
            onOpenChange={setIsScheduleTestOpen}
            clientId={clientId}
            date={scheduleTestDate}
            onScheduled={() => {
              mutate()
            }}
          />
        )}

        {/* Workout Detail Sheet */}
        <CalendarWorkoutDetailSheet
          workoutId={detailWorkoutId}
          open={isDetailSheetOpen}
          onOpenChange={setIsDetailSheetOpen}
          variant="glass"
          isCoachView={isCoachView}
          businessSlug={businessSlug}
          onWorkoutUpdated={() => mutate()}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full relative">
      {/* Main Calendar Area */}
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                {clientName
                  ? appLocale === 'sv' ? `${clientName}s kalender` : `${clientName}'s calendar`
                  : appLocale === 'sv' ? 'Kalender' : 'Calendar'}
              </CardTitle>
            </div>
            {/* Hide add button on mobile - use FAB instead */}
            <Button
              variant="default"
              size="sm"
              onClick={() => handleAddEvent(selectedDate || new Date())}
              className="hidden md:flex"
            >
              <Plus className="h-4 w-4 mr-1" />
              {appLocale === 'sv' ? 'Ny händelse' : 'New event'}
            </Button>
          </div>

          {/* Month Navigation — two rows so it never crowds on mobile */}
          <div className="mt-4 space-y-3 sm:space-y-0">
            {/* Row 1: arrows flanking the month/week title */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
                aria-label={appLocale === 'sv' ? 'Föregående' : 'Previous'}
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                aria-label={appLocale === 'sv' ? 'Nästa' : 'Next'}
                className="shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday} className="hidden sm:inline-flex">
                {appLocale === 'sv' ? 'Idag' : 'Today'}
              </Button>

              <h2 className="flex-1 text-center sm:text-left text-lg sm:text-xl font-semibold capitalize truncate">
                {headerTitle}
              </h2>
            </div>

            {/* Row 2 (mobile): Today + view toggle */}
            <div className="flex items-center justify-between gap-2 sm:justify-end sm:mt-3">
              <Button variant="ghost" size="sm" onClick={handleToday} className="sm:hidden">
                {appLocale === 'sv' ? 'Idag' : 'Today'}
              </Button>

              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as CalendarView)}>
                <TabsList className="h-8">
                  <TabsTrigger value="month" className="text-xs px-2.5">
                    {appLocale === 'sv' ? 'Månad' : 'Month'}
                  </TabsTrigger>
                  <TabsTrigger value="week" className="text-xs px-2.5">
                    {appLocale === 'sv' ? 'Vecka' : 'Week'}
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="text-xs px-2.5">
                    {appLocale === 'sv' ? 'Lista' : 'List'}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Summary Stats */}
          {data?.counts && (
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              {data.counts.workouts > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {data.counts.workouts} {appLocale === 'sv' ? 'pass' : 'workouts'}
                </span>
              )}
              {data.counts.races > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {data.counts.races} {appLocale === 'sv' ? 'tävlingar' : 'races'}
                </span>
              )}
              {data.counts.calendarEvents > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  {data.counts.calendarEvents} {appLocale === 'sv' ? 'händelser' : 'events'}
                </span>
              )}
              {data.counts.adHoc > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  {data.counts.adHoc} ad-hoc
                </span>
              )}
              {data.counts.garmin > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  {data.counts.garmin} Garmin
                </span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeView === 'agenda' ? (
            <AgendaView
              items={items}
              onItemClick={handleItemClick}
              selectedItem={selectedItem}
              locale={appLocale}
            />
          ) : (
            <div
              ref={swipeRef}
              className={cn(
                'transition-transform duration-200 ease-out',
                isSwiping && 'transition-none'
              )}
              style={{
                transform: isSwiping ? `translateX(${swipeOffset}px)` : undefined,
              }}
            >
              {activeView === 'week' ? (
                <WeekView
                  anchor={currentMonth}
                  items={items}
                  onDayClick={handleDayClick}
                  onItemClick={handleItemClick}
                  selectedDate={selectedDate}
                  locale={appLocale}
                />
              ) : (
                <MonthViewDraggable
                  clientId={clientId}
                  month={currentMonth}
                  items={items}
                  onDayClick={handleDayClick}
                  onItemClick={handleItemClick}
                  selectedDate={selectedDate}
                  onReschedule={handleReschedule}
                  onCopyWorkout={handleCopyWorkout}
                  onMoveScheduledWorkout={handleMoveScheduledWorkout}
                  onCopyScheduledWorkout={handleCopyScheduledWorkout}
                  isRescheduling={isCheckingConflicts || isRescheduling}
                  isCopying={isCopyingWorkout}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Details Sidebar - Hidden on mobile (use bottom sheet instead) */}
      <div className="hidden lg:block">
        <DaySidebar
          clientId={clientId}
          date={selectedDate}
          items={selectedDateItems}
          selectedItem={selectedItem}
          onItemClick={handleItemClick}
          onAddEvent={handleSidebarAddEvent}
          onEditEvent={handleEditEvent}
          onEventDeleted={handleEventDeleted}
          onCopyScheduledWorkout={handleCopyScheduledWorkout}
          isCoachView={isCoachView}
          onViewWorkoutDetails={handleViewWorkoutDetails}
        />
      </div>

      {/* Mobile Day Sheet */}
      <MobileDaySheet
        date={selectedDate}
        items={selectedDateItems}
        selectedItem={selectedItem}
        isOpen={isMobileDaySheetOpen}
        onClose={() => setIsMobileDaySheetOpen(false)}
        onItemClick={handleItemClick}
        onAddEvent={() => {
          setIsMobileDaySheetOpen(false)
          handleSidebarAddEvent()
        }}
        onEditEvent={(item) => {
          setIsMobileDaySheetOpen(false)
          handleEditEvent(item)
        }}
        onEventDeleted={handleEventDeleted}
        onMoveWorkout={handleMobileMove}
        onCopyScheduledWorkout={handleCopyScheduledWorkout}
        onViewWorkoutDetails={handleViewWorkoutDetails}
        isCoachView={isCoachView}
        clientId={clientId}
      />

      {/* Mobile Move Workout Sheet */}
      <MobileMoveWorkoutSheet
        isOpen={isMobileMoveSheetOpen}
        onClose={() => {
          setIsMobileMoveSheetOpen(false)
          setWorkoutToMove(null)
        }}
        workout={workoutToMove}
        onConfirm={handleMobileMoveConfirm}
        isLoading={isRescheduling}
        blockedDates={blockedDates}
        reducedDates={reducedDates}
      />

      {/* Mobile FAB */}
      <MobileCalendarFAB
        onAction={handleFABAction}
        selectedDate={selectedDate}
        visible={!isMobileDaySheetOpen && !isMobileMoveSheetOpen && !isEventDialogOpen}
      />

      {/* Event Form Dialog */}
      <EventFormDialog
        clientId={clientId}
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        date={selectedDate || new Date()}
        event={editingEvent}
        onSaved={handleEventSaved}
      />

      {/* Day Action Menu (for coach creating workout/event on empty days) */}
      {isCoachView && dayActionMenu.date && (
        <DayActionMenu
          date={dayActionMenu.date}
          clientId={clientId}
          isOpen={dayActionMenu.isOpen}
          onClose={dayActionMenu.closeMenu}
          onAction={handleDayAction}
          anchorEl={dayActionMenu.anchorEl}
        />
      )}

      {/* Quick Workout Dialog */}
      {isCoachView && (
        <QuickWorkoutDialog
          open={isQuickWorkoutOpen}
          onOpenChange={setIsQuickWorkoutOpen}
          clientId={clientId}
          date={quickWorkoutDate}
          onCreated={() => {
            mutate() // Refresh calendar
          }}
        />
      )}

      {/* Full Workout Dialog (Studio Selection) */}
      {isCoachView && (
        <FullWorkoutDialog
          open={isFullWorkoutOpen}
          onOpenChange={setIsFullWorkoutOpen}
          clientId={clientId}
          clientName={clientName}
          date={fullWorkoutDate}
          onOpenEventDialog={() => handleAddEvent(fullWorkoutDate)}
          businessSlug={businessSlug}
        />
      )}

      {/* Schedule Test Dialog */}
      {isCoachView && (
        <ScheduleTestDialog
          open={isScheduleTestOpen}
          onOpenChange={setIsScheduleTestOpen}
          clientId={clientId}
          date={scheduleTestDate}
          onScheduled={() => {
            mutate() // Refresh calendar
          }}
        />
      )}

      {/* Workout Detail Sheet */}
      <CalendarWorkoutDetailSheet
        workoutId={detailWorkoutId}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        isCoachView={isCoachView}
        businessSlug={businessSlug}
        onWorkoutUpdated={() => mutate()}
      />

      {/* Conflict Dialog */}
      {rescheduleState && (
        <ConflictDialog
          open={showConflictDialog}
          onOpenChange={setShowConflictDialog}
          conflicts={rescheduleState.conflicts}
          workoutName={rescheduleState.workoutName}
          originalDate={rescheduleState.originalDate}
          targetDate={rescheduleState.targetDate}
          onResolve={handleConflictResolve}
          onCancel={handleCancelReschedule}
          isLoading={isRescheduling}
        />
      )}

      {/* Reschedule Confirm Dialog */}
      {rescheduleState && (
        <RescheduleConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          workoutName={rescheduleState.workoutName}
          workoutType={rescheduleState.workoutType}
          originalDate={rescheduleState.originalDate}
          targetDate={rescheduleState.targetDate}
          onConfirm={(reason) => executeReschedule(reason, false)}
          onCancel={handleCancelReschedule}
          isLoading={isRescheduling}
        />
      )}

      {/* Intensity Modification Dialog */}
      <Dialog open={showIntensityDialog} onOpenChange={setShowIntensityDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{appLocale === 'sv' ? 'Justera intensitet' : 'Adjust intensity'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {appLocale === 'sv' ? 'Välj ny intensitet för' : 'Choose a new intensity for'}{' '}
              <span className="font-medium">{rescheduleState?.workoutName}</span>{' '}
              {appLocale === 'sv' ? 'innan flytt.' : 'before moving.'}
            </p>
            <div className="space-y-2">
              <Label>{appLocale === 'sv' ? 'Intensitet' : 'Intensity'}</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'easy', label: appLocale === 'sv' ? 'Lätt' : 'Easy', color: 'bg-green-100 border-green-400 text-green-800' },
                  { value: 'moderate', label: appLocale === 'sv' ? 'Måttlig' : 'Moderate', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
                  { value: 'hard', label: appLocale === 'sv' ? 'Hård' : 'Hard', color: 'bg-red-100 border-red-400 text-red-800' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    className={cn(
                      'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all',
                      selectedIntensity === opt.value
                        ? opt.color
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                    onClick={() => setSelectedIntensity(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowIntensityDialog(false)
                setRescheduleState(null)
              }}
            >
              {appLocale === 'sv' ? 'Avbryt' : 'Cancel'}
            </Button>
            <Button
              onClick={() => {
                setShowIntensityDialog(false)
                executeReschedule(
                  appLocale === 'sv'
                    ? `Intensitet justerad till ${selectedIntensity}`
                    : `Intensity adjusted to ${selectedIntensity}`,
                  true
                )
              }}
              disabled={isRescheduling}
            >
              {isRescheduling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {appLocale === 'sv' ? 'Flytta med ny intensitet' : 'Move with new intensity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Agenda View - List of items
 */
interface AgendaViewProps {
  items: UnifiedCalendarItem[]
  onItemClick: (item: UnifiedCalendarItem) => void
  selectedItem: UnifiedCalendarItem | null
  isGlass?: boolean
  locale: 'en' | 'sv'
}

function AgendaView({ items, onItemClick, selectedItem, isGlass = false, locale }: AgendaViewProps) {
  const dateLocale = locale === 'sv' ? sv : enUS
  const containerRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)

  // Group items by date
  const groupedItems: Record<string, UnifiedCalendarItem[]> = {}
  for (const item of items) {
    const dateKey = format(new Date(item.date), 'yyyy-MM-dd')
    if (!groupedItems[dateKey]) {
      groupedItems[dateKey] = []
    }
    groupedItems[dateKey].push(item)
  }

  const sortedDates = Object.keys(groupedItems).sort()

  // The day to bring into view on load: today, else the nearest upcoming day,
  // else the last (most recent past) day — so the list opens on "now", not the
  // top of a 3-month window.
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const targetKey =
    sortedDates.find((k) => k >= todayKey) ?? sortedDates[sortedDates.length - 1] ?? null

  // Scroll the target day to the top of the container (scrolls only the
  // container, never the page) whenever the visible data set changes.
  useEffect(() => {
    const c = containerRef.current
    const t = targetRef.current
    if (!c || !t) return
    const delta = t.getBoundingClientRect().top - c.getBoundingClientRect().top
    c.scrollTop += delta
  }, [targetKey, sortedDates.length])

  if (sortedDates.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        {locale === 'sv' ? 'Inga händelser i perioden' : 'No events in this period'}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="space-y-3 max-h-[65vh] lg:max-h-[560px] overflow-y-auto overscroll-contain pr-1 -mr-1"
    >
      {sortedDates.map((dateKey, idx) => {
        const dayDate = new Date(dateKey)
        const today = isToday(dayDate)
        // 'yyyy-MM-dd'.slice(0, 7) === 'yyyy-MM' — a month separator precedes
        // the first day of each month (compared against the previous group).
        const showMonthSeparator = dateKey.slice(0, 7) !== (sortedDates[idx - 1]?.slice(0, 7) ?? '')
        return (
          <div key={dateKey} ref={dateKey === targetKey ? targetRef : undefined}>
            {showMonthSeparator && (
              <div className="flex items-center gap-3 pt-3 pb-1 first:pt-0">
                <span className="text-xs font-black uppercase tracking-widest capitalize text-muted-foreground">
                  {format(dayDate, 'MMMM yyyy', { locale: dateLocale })}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="flex items-baseline gap-2 mb-2 mt-1">
              <h3
                className={cn(
                  'text-sm font-bold capitalize',
                  today
                    ? 'text-orange-600 dark:text-orange-400'
                    : isGlass
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-foreground'
                )}
              >
                {format(dayDate, 'EEEE d MMMM', { locale: dateLocale })}
              </h3>
              {today && (
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
                  {locale === 'sv' ? 'Idag' : 'Today'}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {groupedItems[dateKey].map((item) => (
                <AgendaItem
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onClick={() => onItemClick(item)}
                  isGlass={isGlass}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface AgendaItemProps {
  item: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
  locale?: 'en' | 'sv'
}

const AGENDA_DOT_COLORS: Record<string, string> = {
  WORKOUT: 'bg-blue-500',
  RACE: 'bg-red-500',
  FIELD_TEST: 'bg-green-500',
  CALENDAR_EVENT: 'bg-purple-500',
  CHECK_IN: 'bg-gray-500',
  AD_HOC: 'bg-teal-500',
  WOD: 'bg-emerald-500',
  GARMIN: 'bg-cyan-500',
  QUICK_ERG: 'bg-lime-500',
}

const AGENDA_BORDER_COLORS: Record<string, string> = {
  WORKOUT: 'border-l-blue-500',
  RACE: 'border-l-red-500',
  FIELD_TEST: 'border-l-green-500',
  CALENDAR_EVENT: 'border-l-purple-500',
  CHECK_IN: 'border-l-gray-500',
  AD_HOC: 'border-l-teal-500',
  WOD: 'border-l-emerald-500',
  GARMIN: 'border-l-cyan-500',
  QUICK_ERG: 'border-l-lime-500',
}

function getAgendaMeta(item: UnifiedCalendarItem, locale: 'en' | 'sv'): string {
  switch (item.type) {
    case 'WORKOUT':
      return (item.metadata.workoutType as string)?.replace(/_/g, ' ').toLowerCase() || (locale === 'sv' ? 'pass' : 'workout')
    case 'RACE':
      return String(item.metadata.classification || (locale === 'sv' ? 'tävling' : 'race'))
    case 'CALENDAR_EVENT':
      return (item.metadata.eventType as string)?.replace(/_/g, ' ').toLowerCase() || (locale === 'sv' ? 'händelse' : 'event')
    case 'AD_HOC':
      return 'ad-hoc'
    case 'WOD':
      return locale === 'sv' ? 'ai-pass' : 'ai workout'
    case 'QUICK_ERG':
      return 'quick erg'
    case 'FIELD_TEST':
      return locale === 'sv' ? 'test' : 'field test'
    case 'GARMIN':
      return item.metadata.deviceName ? `garmin ${item.metadata.deviceName as string}` : 'garmin'
    default:
      return ''
  }
}

function getAgendaPreview(item: UnifiedCalendarItem): string | null {
  if (typeof item.metadata.distance === 'number' && item.metadata.distance > 0) {
    return `${item.metadata.distance} km`
  }
  if (typeof item.metadata.duration === 'number' && item.metadata.duration > 0) {
    return `${item.metadata.duration} min`
  }
  return null
}

function AgendaItem({ item, isSelected, onClick, isGlass = false, locale = 'en' }: AgendaItemProps) {
  const isCompleted = Boolean(item.metadata.isCompleted)
  const preview = getAgendaPreview(item)

  return (
    <button
      className={cn(
        "w-full text-left p-3.5 rounded-xl border-l-4 transition-all duration-300 active:scale-[0.99]",
        AGENDA_BORDER_COLORS[item.type],
        isGlass
          ? "bg-white/5 border-r border-t border-b border-white/10 hover:bg-white/10 hover:border-white/20"
          : "bg-card hover:bg-accent border shadow-sm",
        isSelected && (isGlass ? "ring-1 ring-orange-500/50 bg-orange-500/5" : "ring-2 ring-primary")
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full shrink-0', AGENDA_DOT_COLORS[item.type])} />
          <span className="font-semibold text-sm truncate">{item.title}</span>
          {isCompleted && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
              ✓ {locale === 'sv' ? 'Klar' : 'Done'}
            </span>
          )}
        </div>
        {preview && (
          <span className="text-xs font-medium text-muted-foreground shrink-0">{preview}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1 pl-4">
        <span className="text-xs text-muted-foreground capitalize truncate">
          {getAgendaMeta(item, locale)}
        </span>
      </div>
      {item.description && (
        <p className="text-xs text-muted-foreground mt-1 pl-4 truncate">{item.description}</p>
      )}
    </button>
  )
}
