'use client'

/**
 * Mobile Move Workout Sheet
 *
 * Bottom sheet for moving workouts to a different date on mobile.
 * Alternative to drag-and-drop for touch-friendly rescheduling.
 */

import { useState, useMemo, useCallback } from 'react'
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { UnifiedCalendarItem } from './types'

interface MobileMoveWorkoutSheetProps {
  isOpen: boolean
  onClose: () => void
  workout: UnifiedCalendarItem | null
  onConfirm: (targetDate: Date) => Promise<void>
  isLoading?: boolean
  blockedDates?: Date[]
  reducedDates?: Date[]
}

export function MobileMoveWorkoutSheet({
  isOpen,
  onClose,
  workout,
  onConfirm,
  isLoading = false,
  blockedDates = [],
  reducedDates = [],
}: MobileMoveWorkoutSheetProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    if (workout) {
      return startOfWeek(new Date(workout.date), { locale: sv, weekStartsOn: 1 })
    }
    return startOfWeek(new Date(), { locale: sv, weekStartsOn: 1 })
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Generate week days
  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { locale: sv, weekStartsOn: 1 })
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd })
  }, [currentWeekStart])

  const handlePreviousWeek = useCallback(() => {
    setCurrentWeekStart((prev) => subDays(prev, 7))
    setSelectedDate(null)
  }, [])

  const handleNextWeek = useCallback(() => {
    setCurrentWeekStart((prev) => addDays(prev, 7))
    setSelectedDate(null)
  }, [])

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!selectedDate) return
    await onConfirm(selectedDate)
    onClose()
  }, [selectedDate, onConfirm, onClose])

  const isDateBlocked = useCallback(
    (date: Date) => {
      return blockedDates.some((d) => isSameDay(d, date))
    },
    [blockedDates]
  )

  const isDateReduced = useCallback(
    (date: Date) => {
      return reducedDates.some((d) => isSameDay(d, date))
    },
    [reducedDates]
  )

  const isOriginalDate = useCallback(
    (date: Date) => {
      if (!workout) return false
      return isSameDay(date, new Date(workout.date))
    },
    [workout]
  )

  if (!isOpen || !workout) return null

  const originalDate = new Date(workout.date)

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Flytta träningspass"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b">
          <div>
            <h2 className="text-lg font-semibold">Flytta pass</h2>
            <p className="text-sm text-muted-foreground">{workout.title}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Current date info */}
        <div className="px-4 py-3 bg-muted/50 border-b">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Nuvarande datum:</span>
            <span className="font-medium">
              {format(originalDate, 'd MMMM yyyy', { locale: sv })}
            </span>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm font-medium">
            {format(currentWeekStart, 'd MMM', { locale: sv })} -{' '}
            {format(endOfWeek(currentWeekStart, { locale: sv, weekStartsOn: 1 }), 'd MMM', { locale: sv })}
          </span>

          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Week Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((day, i) => (
              <div
                key={day + i}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((date) => {
              const blocked = isDateBlocked(date)
              const reduced = isDateReduced(date)
              const isOriginal = isOriginalDate(date)
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isToday = isSameDay(date, new Date())
              const isPast = date < new Date() && !isToday

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !blocked && !isOriginal && !isPast && handleSelectDate(date)}
                  disabled={blocked || isOriginal || isPast}
                  className={cn(
                    'aspect-square rounded-lg flex flex-col items-center justify-center',
                    'text-sm transition-all relative',
                    'active:scale-95',
                    // Default
                    'bg-background border',
                    // Blocked
                    blocked && 'bg-red-100 border-red-200 text-red-400 cursor-not-allowed',
                    // Reduced
                    reduced && !blocked && 'bg-amber-50 border-amber-200',
                    // Original date
                    isOriginal && 'bg-blue-100 border-blue-300 text-blue-600 cursor-not-allowed',
                    // Past
                    isPast && 'opacity-50 cursor-not-allowed',
                    // Today
                    isToday && !isSelected && 'border-primary',
                    // Selected
                    isSelected && 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30',
                    // Hover
                    !blocked && !isOriginal && !isPast && 'hover:bg-accent'
                  )}
                >
                  <span className="font-medium">{format(date, 'd')}</span>
                  {isOriginal && (
                    <span className="text-[10px] leading-none mt-0.5">nuvarande</span>
                  )}
                  {blocked && !isOriginal && (
                    <AlertTriangle className="h-3 w-3 absolute top-1 right-1 text-red-500" />
                  )}
                  {reduced && !blocked && !isOriginal && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1 right-1" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
              <span>Nuvarande</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-200" />
              <span>Blockerad</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
              <span>Reducerad</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-background">
          {selectedDate && (
            <div className="flex items-center gap-2 mb-3 text-sm">
              <Check className="h-4 w-4 text-green-600" />
              <span>Flytta till:</span>
              <span className="font-medium">
                {format(selectedDate, 'EEEE d MMMM', { locale: sv })}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={onClose}
              disabled={isLoading}
            >
              Avbryt
            </Button>
            <Button
              variant="default"
              className="flex-1 h-12"
              onClick={handleConfirm}
              disabled={!selectedDate || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Flyttar...
                </>
              ) : (
                'Bekräfta flytt'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
