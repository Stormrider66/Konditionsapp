'use client'

/**
 * Draggable Month View Calendar Component
 *
 * Extends MonthView with drag-and-drop functionality for rescheduling workouts
 */

import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import { sv } from 'date-fns/locale'
import { GripVertical, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UnifiedCalendarItem, DayData, EVENT_TYPE_CONFIG, WORKOUT_TYPE_COLORS } from './types'

interface MonthViewDraggableProps {
  clientId: string
  month: Date
  items: UnifiedCalendarItem[]
  onDayClick: (date: Date) => void
  onItemClick: (item: UnifiedCalendarItem) => void
  selectedDate: Date | null
  onReschedule: (workoutId: string, newDate: Date, originalDate: Date) => void
  isRescheduling?: boolean
  isGlass?: boolean
}

export function MonthViewDraggable({
  month,
  items,
  onDayClick,
  onItemClick,
  selectedDate,
  onReschedule,
  isRescheduling = false,
  isGlass = false,
}: MonthViewDraggableProps) {
  const [activeItem, setActiveItem] = useState<UnifiedCalendarItem | null>(null)
  const [overDateKey, setOverDateKey] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Start dragging after 8px movement
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Generate all days to display (including days from adjacent months)
  const days = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    const calendarStart = startOfWeek(monthStart, { locale: sv, weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { locale: sv, weekStartsOn: 1 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [month])

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, UnifiedCalendarItem[]>()
    for (const item of items) {
      const dateKey = format(new Date(item.date), 'yyyy-MM-dd')
      const existing = map.get(dateKey) || []
      existing.push(item)
      map.set(dateKey, existing)

      // For multi-day events, add to all days in range
      if (item.endDate && item.type === 'CALENDAR_EVENT') {
        const endDate = new Date(item.endDate)
        const startDate = new Date(item.date)
        let current = new Date(startDate)
        current.setDate(current.getDate() + 1)

        while (current <= endDate) {
          const key = format(current, 'yyyy-MM-dd')
          const dayItems = map.get(key) || []
          dayItems.push({ ...item, metadata: { ...item.metadata, isContinuation: true } })
          map.set(key, dayItems)
          current.setDate(current.getDate() + 1)
        }
      }
    }
    return map
  }, [items])

  // Process each day's data
  const dayData: DayData[] = useMemo(() => {
    return days.map((date) => {
      const dateKey = format(date, 'yyyy-MM-dd')
      const dayItems = itemsByDate.get(dateKey) || []

      return {
        date,
        items: dayItems,
        hasWorkout: dayItems.some((i) => i.type === 'WORKOUT'),
        hasRace: dayItems.some((i) => i.type === 'RACE'),
        hasEvent: dayItems.some((i) => i.type === 'CALENDAR_EVENT'),
        hasFieldTest: dayItems.some((i) => i.type === 'FIELD_TEST'),
        hasCheckIn: dayItems.some((i) => i.type === 'CHECK_IN'),
        isBlocked: dayItems.some(
          (i) => i.type === 'CALENDAR_EVENT' && i.metadata.trainingImpact === 'NO_TRAINING'
        ),
        isReduced: dayItems.some(
          (i) =>
            i.type === 'CALENDAR_EVENT' &&
            (i.metadata.trainingImpact === 'REDUCED' || i.metadata.trainingImpact === 'MODIFIED')
        ),
        isToday: isToday(date),
        isCurrentMonth: isSameMonth(date, month),
      }
    })
  }, [days, itemsByDate, month])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const item = event.active.data.current?.item as UnifiedCalendarItem
    if (item) {
      setActiveItem(item)
    }
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const dateKey = event.over?.id as string | null
    setOverDateKey(dateKey)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveItem(null)
      setOverDateKey(null)

      if (!over) return

      const item = active.data.current?.item as UnifiedCalendarItem
      const targetDateKey = over.id as string

      if (!item || !targetDateKey) return

      // Only workouts can be rescheduled
      if (item.type !== 'WORKOUT') return

      const originalDate = new Date(item.date)
      const newDate = new Date(targetDateKey)

      // Check if it's the same day
      if (isSameDay(originalDate, newDate)) return

      // Trigger reschedule callback
      onReschedule(item.id, newDate, originalDate)
    },
    [onReschedule]
  )

  // Weekday headers
  const weekDays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full relative">
        {/* Loading overlay */}
        {isRescheduling && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50 rounded-lg">
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Flyttar pass...</span>
            </div>
          </div>
        )}

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {dayData.map((day) => {
            const dateKey = format(day.date, 'yyyy-MM-dd')
            return (
              <DroppableDayCell
                key={dateKey}
                dateKey={dateKey}
                day={day}
                isSelected={selectedDate ? isSameDay(day.date, selectedDate) : false}
                isDropTarget={overDateKey === dateKey}
                onClick={() => onDayClick(day.date)}
                onItemClick={onItemClick}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Pass</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Tävling</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Händelse</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Test</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
            <span>Blockerad</span>
          </div>
          <div className="flex items-center gap-1">
            <GripVertical className="h-3 w-3" />
            <span>Dra pass för att flytta</span>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem && (
          <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs shadow-lg opacity-90">
            {activeItem.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

interface DroppableDayCellProps {
  dateKey: string
  day: DayData
  isSelected: boolean
  isDropTarget: boolean
  onClick: () => void
  onItemClick: (item: UnifiedCalendarItem) => void
}

function DroppableDayCell({
  dateKey,
  day,
  isSelected,
  isDropTarget,
  onClick,
  onItemClick,
}: DroppableDayCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: dateKey,
  })

  const maxIndicators = 4

  // Get unique event indicators
  const indicators: { type: string; color: string; label: string }[] = []

  // Add workout indicators (first 2 max)
  const workouts = day.items.filter((i) => i.type === 'WORKOUT')
  for (let i = 0; i < Math.min(2, workouts.length); i++) {
    const w = workouts[i]
    const workoutType = (w.metadata.workoutType as string) || 'OTHER'
    indicators.push({
      type: 'WORKOUT',
      color: WORKOUT_TYPE_COLORS[workoutType] || 'bg-blue-500',
      label: w.title,
    })
  }

  // Add race indicator
  if (day.hasRace) {
    indicators.push({
      type: 'RACE',
      color: 'bg-red-500',
      label: 'Tävling',
    })
  }

  // Add event indicator
  if (day.hasEvent) {
    const event = day.items.find((i) => i.type === 'CALENDAR_EVENT')
    const eventType = (event?.metadata.eventType as string) || 'EXTERNAL_EVENT'
    const config = EVENT_TYPE_CONFIG[eventType as keyof typeof EVENT_TYPE_CONFIG]
    indicators.push({
      type: 'EVENT',
      color: 'bg-purple-500',
      label: config?.labelSv || 'Händelse',
    })
  }

  // Add field test indicator
  if (day.hasFieldTest) {
    indicators.push({
      type: 'FIELD_TEST',
      color: 'bg-green-500',
      label: 'Fälttest',
    })
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[80px] md:min-h-[100px] p-1 md:p-2 bg-card text-left transition-colors',
        !day.isCurrentMonth && 'bg-muted/50 text-muted-foreground',
        isSelected && 'ring-2 ring-primary ring-inset',
        day.isBlocked && 'bg-red-50 dark:bg-red-950/30',
        day.isReduced && !day.isBlocked && 'bg-yellow-50 dark:bg-yellow-950/30',
        (isOver || isDropTarget) && 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400'
      )}
      onClick={onClick}
    >
      {/* Date Number */}
      <div className="flex justify-between items-start mb-1">
        <span
          className={cn(
            'text-xs md:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
            day.isToday && 'bg-primary text-primary-foreground',
            !day.isCurrentMonth && 'text-muted-foreground'
          )}
        >
          {format(day.date, 'd')}
        </span>

        {/* Blocked/Reduced indicator */}
        {day.isBlocked && (
          <span className="text-xs text-red-600 dark:text-red-400">🚫</span>
        )}
        {day.isReduced && !day.isBlocked && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400">⚠️</span>
        )}
      </div>

      {/* Event Indicators */}
      <div className="flex flex-wrap gap-1">
        {indicators.slice(0, maxIndicators).map((indicator, idx) => (
          <span
            key={`${indicator.type}-${idx}`}
            className={cn('w-2 h-2 rounded-full', indicator.color)}
            title={indicator.label}
          />
        ))}
        {indicators.length > maxIndicators && (
          <span className="text-xs text-muted-foreground">
            +{indicators.length - maxIndicators}
          </span>
        )}
      </div>

      {/* Items with drag handles */}
      {day.items.length > 0 && (
        <div className="hidden md:block mt-1 space-y-0.5">
          {day.items.slice(0, 2).map((item) => (
            <DraggableItem
              key={item.id}
              item={item}
              onItemClick={onItemClick}
            />
          ))}
          {day.items.length > 2 && (
            <div className="text-xs text-muted-foreground px-1">
              +{day.items.length - 2} mer
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface DraggableItemProps {
  item: UnifiedCalendarItem
  onItemClick: (item: UnifiedCalendarItem) => void
}

function DraggableItem({ item, onItemClick }: DraggableItemProps) {
  // Only workouts are draggable
  const isDraggable = item.type === 'WORKOUT'

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
    disabled: !isDraggable,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'text-xs truncate px-1 py-0.5 rounded flex items-center gap-0.5',
        item.type === 'WORKOUT' &&
          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
        item.type === 'RACE' &&
          'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
        item.type === 'CALENDAR_EVENT' &&
          'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
        item.type === 'FIELD_TEST' &&
          'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
        isDragging && 'opacity-50',
        isDraggable && 'cursor-grab active:cursor-grabbing'
      )}
      onClick={(e) => {
        e.stopPropagation()
        onItemClick(item)
      }}
    >
      {isDraggable && (
        <span {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </span>
      )}
      <span className="truncate flex-1">{item.title}</span>
    </div>
  )
}
