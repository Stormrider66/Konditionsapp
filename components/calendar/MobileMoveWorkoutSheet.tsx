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
  variant?: 'default' | 'glass'
}

export function MobileMoveWorkoutSheet({
  isOpen,
  onClose,
  workout,
  onConfirm,
  isLoading = false,
  blockedDates = [],
  reducedDates = [],
  variant = 'default',
}: MobileMoveWorkoutSheetProps) {
  const isGlass = variant === 'glass'
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
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          isGlass ? "bg-slate-950/40 backdrop-blur-sm" : "bg-black/50"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 shadow-2xl transition-all duration-300 ease-out max-h-[75vh] flex flex-col",
        isGlass
          ? "bg-slate-950/90 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem]"
          : "bg-background rounded-t-2xl"
      )}>
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className={cn(
            "w-12 h-1.5 rounded-full transition-colors",
            isGlass ? "bg-white/10" : "bg-muted-foreground/30"
          )} />
        </div>

        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-6 pb-4 pt-1",
          isGlass ? "border-b border-white/5" : "border-b"
        )}>
          <div>
            <h2 className={cn(
              "text-lg font-black tracking-tight",
              isGlass ? "text-white" : ""
            )}>Flytta pass</h2>
            <p className={cn(
              "text-sm font-medium opacity-50 truncate max-w-[200px]",
              isGlass ? "text-slate-400" : "text-muted-foreground"
            )}>{workout.title}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={isGlass ? "text-slate-400 hover:text-white" : ""}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Current date info */}
        <div className={cn(
          "px-6 py-4",
          isGlass ? "bg-white/5 border-b border-white/5" : "bg-muted/50 border-b"
        )}>
          <div className="flex items-center gap-3 text-xs">
            <Calendar className={cn("h-4 w-4", isGlass ? "text-blue-400" : "text-muted-foreground")} />
            <span className={cn(isGlass ? "text-slate-400 font-bold uppercase tracking-widest text-[10px]" : "")}>Nuvarande datum:</span>
            <span className={cn("font-black", isGlass ? "text-white" : "")}>
              {format(originalDate, 'd MMMM yyyy', { locale: sv })}
            </span>
          </div>
        </div>

        {/* Week Navigation */}
        <div className={cn(
          "flex items-center justify-between px-6 py-4",
          isGlass ? "border-b border-white/5" : "border-b"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousWeek}
            className={isGlass ? "hover:bg-white/5 text-slate-400" : ""}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <span className={cn(
            "text-xs font-black uppercase tracking-widest",
            isGlass ? "text-white" : ""
          )}>
            {format(currentWeekStart, 'd MMM', { locale: sv })} -{' '}
            {format(endOfWeek(currentWeekStart, { locale: sv, weekStartsOn: 1 }), 'd MMM', { locale: sv })}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextWeek}
            className={isGlass ? "hover:bg-white/5 text-slate-400" : ""}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Week Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((day, i) => (
              <div
                key={day + i}
                className={cn(
                  "text-center text-[10px] font-black uppercase tracking-widest",
                  isGlass ? "text-slate-600" : "text-muted-foreground"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
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
                    'aspect-square rounded-xl flex flex-col items-center justify-center',
                    'text-sm transition-all duration-300 relative',
                    'active:scale-90',
                    // Default
                    isGlass ? "bg-white/5 border border-white/5 text-slate-300" : "bg-background border",
                    // Blocked
                    blocked && (isGlass ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-red-100 border-red-200 text-red-400'),
                    // Reduced
                    reduced && !blocked && (isGlass ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-amber-50 border-amber-200'),
                    // Original date
                    isOriginal && (isGlass ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-100 border-blue-300 text-blue-600'),
                    // Past
                    isPast && 'opacity-20',
                    // Today
                    isToday && !isSelected && 'border-primary ring-1 ring-primary/20',
                    // Selected
                    isSelected && (isGlass ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-primary text-primary-foreground border-primary'),
                    // Hover
                    !blocked && !isOriginal && !isPast && !isSelected && (isGlass ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-accent')
                  )}
                >
                  <span className="font-medium">{format(date, 'd')}</span>
                  {isOriginal && (
                    <span className="text-[10px] leading-none mt-0.5">nuvarande</span>
                  )}
                  {blocked && !isOriginal && (
                    <AlertTriangle className="h-3 w-3 absolute top-1.5 right-1.5 text-red-500 opacity-50" />
                  )}
                  {reduced && !blocked && !isOriginal && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1.5 right-1.5" />
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
        <div className={cn(
          "p-6",
          isGlass ? "border-t border-white/5 bg-slate-900/50" : "p-4 border-t bg-background"
        )}>
          {selectedDate && (
            <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-emerald-400">
              <Check className="h-4 w-4" />
              <span>Flytta till: </span>
              <span className="text-white ml-1">
                {format(selectedDate, 'EEEE d MMMM', { locale: sv })}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="ghost"
              className={cn(
                "flex-1 h-12 font-black text-xs uppercase tracking-widest",
                isGlass ? "bg-white/5 border border-white/10 text-slate-400 hover:text-white" : ""
              )}
              onClick={onClose}
              disabled={isLoading}
            >
              Avbryt
            </Button>
            <Button
              variant="default"
              className={cn(
                "flex-1 h-12 font-black text-xs uppercase tracking-widest",
                isGlass ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20" : ""
              )}
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
