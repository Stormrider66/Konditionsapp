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

import { useState, useCallback, useRef, useMemo } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { sv } from 'date-fns/locale'
import useSWR from 'swr'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { MonthViewDraggable } from './MonthViewDraggable'
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
import { ScheduleTestDialog } from './ScheduleTestDialog'
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


interface UnifiedCalendarProps {
  clientId: string
  clientName?: string
  isCoachView?: boolean
  variant?: 'default' | 'glass'
}

export function UnifiedCalendar({ clientId, clientName, isCoachView = false, variant = 'default' }: UnifiedCalendarProps) {
  const { toast } = useToast()
  const isGlass = variant === 'glass'
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedItem, setSelectedItem] = useState<UnifiedCalendarItem | null>(null)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<UnifiedCalendarItem | null>(null)
  const [activeView, setActiveView] = useState<'month' | 'agenda'>('month')
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
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

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

  // Swipe navigation for mobile
  const { ref: swipeRef, swipeOffset, isSwiping } = useSwipeNavigation({
    onSwipeLeft: () => setCurrentMonth((prev) => addMonths(prev, 1)),
    onSwipeRight: () => setCurrentMonth((prev) => subMonths(prev, 1)),
    enabled: isMobile && activeView === 'month',
    threshold: 80,
  })

  // Calculate date range for API call
  const startDate = startOfMonth(currentMonth)
  const endDate = endOfMonth(currentMonth)

  // Fetch unified calendar data
  const { data, error, isLoading, mutate } = useSWR(
    `/api/calendar/unified?clientId=${clientId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  const items: UnifiedCalendarItem[] = data?.items || []

  // Compute items for the selected date
  const selectedDateItems = useMemo(() => {
    if (!selectedDate) return []
    return items.filter(item => isSameDay(new Date(item.date), selectedDate))
  }, [items, selectedDate])

  // Blocked and reduced dates for mobile move workflow (empty by default)
  const blockedDates: Date[] = []
  const reducedDates: Date[] = []

  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1))
    setSelectedDate(null)
    setSelectedItem(null)
  }, [])

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1))
    setSelectedDate(null)
    setSelectedItem(null)
  }, [])

  const handleToday = useCallback(() => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }, [])

  const handleDayClick = useCallback((date: Date, event?: React.MouseEvent) => {
    setSelectedDate(date)
    setSelectedItem(null)

    // Check if this day has any items
    const dayItems = items.filter(item => isSameDay(new Date(item.date), date))
    const isEmpty = dayItems.length === 0

    // For coach view on empty days, show the action menu
    if (isCoachView && isEmpty) {
      dayActionMenu.openMenu(date, event?.currentTarget as HTMLElement)
      return
    }

    // Open mobile sheet on mobile devices
    if (isMobile) {
      setIsMobileDaySheetOpen(true)
    }
  }, [isMobile, isCoachView, items, dayActionMenu])

  const handleItemClick = useCallback((item: UnifiedCalendarItem) => {
    setSelectedItem(item)
    setSelectedDate(new Date(item.date))
  }, [])

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
          title: 'Fel',
          description: result.error || 'Kunde inte flytta passet',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Pass flyttat',
        description: result.message,
      })

      mutate()
      setIsMobileMoveSheetOpen(false)
      setWorkoutToMove(null)
    } catch (error) {
      console.error('Move error:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte flytta passet',
        variant: 'destructive',
      })
    }
  }, [workoutToMove, mutate, toast])

  // Mobile: Handle FAB action
  const handleFABAction = useCallback((action: { type: 'new-event'; eventType?: CalendarEventType }) => {
    if (action.type === 'new-event') {
      setDefaultEventType(action.eventType)
      setEditingEvent(null)
      setIsEventDialogOpen(true)
    }
  }, [])

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
            title: 'Fel',
            description: result.error || 'Kunde inte kontrollera konflikter',
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
          title: 'Fel',
          description: 'Kunde inte kontrollera konflikter',
          variant: 'destructive',
        })
      } finally {
        setIsCheckingConflicts(false)
      }
    },
    [items, toast]
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
            title: 'Fel',
            description: result.error || 'Kunde inte flytta passet',
            variant: 'destructive',
          })
          return
        }

        // Success
        toast({
          title: 'Pass flyttat',
          description: result.message,
        })

        // Refresh calendar data
        mutate()

        // Close dialogs
        setShowConflictDialog(false)
        setShowConfirmDialog(false)
        setRescheduleState(null)
      } catch (err) {
        console.error('Error rescheduling:', err)
        toast({
          title: 'Fel',
          description: 'Kunde inte flytta passet',
          variant: 'destructive',
        })
      } finally {
        setIsRescheduling(false)
      }
    },
    [rescheduleState, mutate, toast]
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
          title: 'Avbrutet',
          description: 'Flytten avbröts',
        })
      } else if (resolution?.type === 'IGNORE' || resolution === null) {
        // Proceed with original reschedule
        executeReschedule(undefined, true)
      } else if (resolution?.type === 'MODIFY_INTENSITY') {
        // TODO: Apply intensity modification first, then reschedule
        executeReschedule(undefined, true)
      } else {
        // For other resolutions, proceed with reschedule
        executeReschedule(undefined, true)
      }
    },
    [rescheduleState, executeReschedule, toast]
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
                  {clientName ? `${clientName}s kalender` : 'Kalender'}
                </GlassCardTitle>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleAddEvent(selectedDate || new Date())}
                className="hidden md:flex bg-orange-600 hover:bg-orange-700 text-white border-none"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ny händelse
              </Button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="hover:bg-white/10 text-slate-400">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="hover:bg-white/10 text-slate-400">
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleToday} className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-white hover:bg-white/10">
                  Idag
                </Button>
              </div>

              <h2 className="text-xl font-black capitalize text-white tracking-tight">
                {format(currentMonth, 'MMMM yyyy', { locale: sv })}
              </h2>

              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'month' | 'agenda')} className="hidden sm:block">
                <TabsList className="h-8 bg-white/5 border border-white/10">
                  <TabsTrigger value="month" className="text-[10px] uppercase font-bold tracking-widest px-3 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                    Månad
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="text-[10px] uppercase font-bold tracking-widest px-3 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                    Lista
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Summary Stats */}
            {data?.counts && (
              <div className="flex gap-4 mt-4 text-[10px] font-bold uppercase tracking-wider">
                {data.counts.workouts > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    {data.counts.workouts} pass
                  </span>
                )}
                {data.counts.races > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    {data.counts.races} tävlingar
                  </span>
                )}
                {data.counts.calendarEvents > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                    {data.counts.calendarEvents} händelser
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
            ) : activeView === 'month' ? (
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
                <MonthViewDraggable
                  clientId={clientId}
                  month={currentMonth}
                  items={items}
                  onDayClick={handleDayClick}
                  onItemClick={handleItemClick}
                  selectedDate={selectedDate}
                  onReschedule={handleReschedule}
                  isRescheduling={isCheckingConflicts || isRescheduling}
                  isGlass={true}
                />
              </div>
            ) : (
              <AgendaView
                items={items}
                onItemClick={handleItemClick}
                selectedItem={selectedItem}
                isGlass={true}
              />
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
            onAddEvent={() => handleAddEvent(selectedDate || undefined)}
            onEditEvent={handleEditEvent}
            onEventDeleted={handleEventDeleted}
            isCoachView={isCoachView}
            variant="glass"
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
            handleAddEvent(selectedDate || undefined)
          }}
          onEditEvent={(item) => {
            setIsMobileDaySheetOpen(false)
            handleEditEvent(item)
          }}
          onEventDeleted={handleEventDeleted}
          onMoveWorkout={handleMobileMove}
          isCoachView={isCoachView}
          variant="glass"
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
                {clientName ? `${clientName}s kalender` : 'Kalender'}
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
              Ny händelse
            </Button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday}>
                Idag
              </Button>
            </div>

            <h2 className="text-xl font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: sv })}
            </h2>

            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'month' | 'agenda')}>
              <TabsList className="h-8">
                <TabsTrigger value="month" className="text-xs px-3">
                  Månad
                </TabsTrigger>
                <TabsTrigger value="agenda" className="text-xs px-3">
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Summary Stats */}
          {data?.counts && (
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              {data.counts.workouts > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {data.counts.workouts} pass
                </span>
              )}
              {data.counts.races > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {data.counts.races} tävlingar
                </span>
              )}
              {data.counts.calendarEvents > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  {data.counts.calendarEvents} händelser
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
          ) : activeView === 'month' ? (
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
              <MonthViewDraggable
                clientId={clientId}
                month={currentMonth}
                items={items}
                onDayClick={handleDayClick}
                onItemClick={handleItemClick}
                selectedDate={selectedDate}
                onReschedule={handleReschedule}
                isRescheduling={isCheckingConflicts || isRescheduling}
              />
            </div>
          ) : (
            <AgendaView
              items={items}
              onItemClick={handleItemClick}
              selectedItem={selectedItem}
            />
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
          onAddEvent={() => handleAddEvent(selectedDate || undefined)}
          onEditEvent={handleEditEvent}
          onEventDeleted={handleEventDeleted}
          isCoachView={isCoachView}
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
          handleAddEvent(selectedDate || undefined)
        }}
        onEditEvent={(item) => {
          setIsMobileDaySheetOpen(false)
          handleEditEvent(item)
        }}
        onEventDeleted={handleEventDeleted}
        onMoveWorkout={handleMobileMove}
        isCoachView={isCoachView}
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
}

function AgendaView({ items, onItemClick, selectedItem, isGlass = false }: AgendaViewProps) {
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

  if (sortedDates.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Inga händelser denna månad
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto">
      {sortedDates.map((dateKey) => (
        <div key={dateKey}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
            {format(new Date(dateKey), 'EEEE d MMMM', { locale: sv })}
          </h3>
          <div className="space-y-2">
            {groupedItems[dateKey].map((item) => (
              <AgendaItem
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onClick={() => onItemClick(item)}
                isGlass={isGlass}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface AgendaItemProps {
  item: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

function AgendaItem({ item, isSelected, onClick, isGlass = false }: AgendaItemProps) {
  const typeColors: Record<string, string> = {
    WORKOUT: 'border-l-blue-500',
    RACE: 'border-l-red-500',
    FIELD_TEST: 'border-l-green-500',
    CALENDAR_EVENT: 'border-l-purple-500',
    CHECK_IN: 'border-l-gray-500',
  }

  return (
    <button
      className={cn(
        "w-full text-left p-4 rounded-xl border-l-4 transition-all duration-300",
        typeColors[item.type],
        isGlass
          ? "bg-white/5 border-r border-t border-b border-white/10 hover:bg-white/10 hover:border-white/20"
          : "bg-card hover:bg-accent border shadow-sm",
        isSelected && (isGlass ? "ring-1 ring-orange-500/50 bg-orange-500/5" : "ring-2 ring-primary")
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{item.title}</span>
        <span className="text-xs text-muted-foreground capitalize">
          {item.type === 'WORKOUT' && (item.metadata.workoutType as string)?.toLowerCase()}
          {item.type === 'RACE' && String(item.metadata.classification || '')}
          {item.type === 'CALENDAR_EVENT' && (item.metadata.eventType as string)?.replace(/_/g, ' ').toLowerCase()}
        </span>
      </div>
      {item.description && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{item.description}</p>
      )}
    </button>
  )
}
