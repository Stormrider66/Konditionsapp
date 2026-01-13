'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HabitLog {
  id: string
  date: string
  completed: boolean
}

interface Habit {
  id: string
  name: string
  logs: HabitLog[]
}

interface HabitCalendarProps {
  habits: Habit[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
}

const DAYS_OF_WEEK = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
]

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

function getStartPadding(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay()
  // Convert Sunday = 0 to Monday = 0 based week
  return firstDay === 0 ? 6 : firstDay - 1
}

type CompletionStatus = 'all' | 'partial' | 'none' | 'future'

export function HabitCalendar({
  habits,
  currentMonth,
  onMonthChange
}: HabitCalendarProps) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const days = useMemo(() => getDaysInMonth(year, month), [year, month])
  const startPadding = useMemo(() => getStartPadding(year, month), [year, month])

  // Create a map of date -> completion status
  const completionMap = useMemo(() => {
    const map: Record<string, CompletionStatus> = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    days.forEach(day => {
      const dateStr = day.toISOString().split('T')[0]

      // Future dates
      if (day > today) {
        map[dateStr] = 'future'
        return
      }

      // Count completed habits for this day
      let completed = 0
      let total = habits.length

      habits.forEach(habit => {
        const log = habit.logs.find(l => l.date.split('T')[0] === dateStr)
        if (log?.completed) completed++
      })

      if (total === 0) {
        map[dateStr] = 'none'
      } else if (completed === total) {
        map[dateStr] = 'all'
      } else if (completed > 0) {
        map[dateStr] = 'partial'
      } else {
        map[dateStr] = 'none'
      }
    })

    return map
  }, [days, habits])

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1))
  }

  const getStatusColor = (status: CompletionStatus): string => {
    switch (status) {
      case 'all':
        return 'bg-green-500 text-white'
      case 'partial':
        return 'bg-yellow-500 text-white'
      case 'none':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
      case 'future':
        return 'bg-gray-100 dark:bg-gray-800 text-muted-foreground'
      default:
        return 'bg-gray-100 dark:bg-gray-800'
    }
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{MONTHS[month]} {year}</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK.map(day => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding for start of month */}
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}

          {/* Days */}
          {days.map(day => {
            const dateStr = day.toISOString().split('T')[0]
            const status = completionMap[dateStr]

            return (
              <div
                key={dateStr}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors",
                  getStatusColor(status),
                  isToday(day) && "ring-2 ring-primary ring-offset-2"
                )}
              >
                {day.getDate()}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Alla klara</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Delvis</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
            <span>Inga</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
