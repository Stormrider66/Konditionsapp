'use client'

/**
 * StreakCalendar
 *
 * Visual 4-week calendar showing daily check-in history.
 * Displays checked-in days as green dots, missed days as gray,
 * and today (if not checked in) as an animated orange indicator.
 */

import { cn } from '@/lib/utils'
import type { CheckInDay } from '@/types/streak'

interface StreakCalendarProps {
  checkInHistory: CheckInDay[]
  hasCheckedInToday: boolean
}

// Swedish day abbreviations
const DAY_LABELS = ['M', 'T', 'O', 'T', 'F', 'L', 'S']

export function StreakCalendar({ checkInHistory, hasCheckedInToday }: StreakCalendarProps) {
  // Get today's date string for comparison
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Group history into weeks (7 days each)
  // checkInHistory is already 28 days, oldest first
  const weeks: CheckInDay[][] = []
  for (let i = 0; i < checkInHistory.length; i += 7) {
    weeks.push(checkInHistory.slice(i, i + 7))
  }

  // Ensure we have exactly 4 weeks by padding if needed
  while (weeks.length < 4) {
    weeks.unshift(Array(7).fill({ date: '', checkedIn: false }))
  }

  return (
    <div className="space-y-1">
      {/* Day labels header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((day, i) => (
          <div
            key={i}
            className="text-[10px] text-muted-foreground text-center font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {week.map((day, dayIndex) => {
            const isToday = day.date === todayStr
            const isFuture = day.date > todayStr
            const isCheckedIn = day.checkedIn
            const isTodayNotCheckedIn = isToday && !hasCheckedInToday

            return (
              <div
                key={dayIndex}
                className="flex items-center justify-center"
                title={day.date || undefined}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full transition-all',
                    // Checked in - green
                    isCheckedIn && 'bg-green-500',
                    // Today but not checked in - orange with pulse
                    isTodayNotCheckedIn && 'bg-orange-400 animate-pulse',
                    // Future or empty - light gray
                    (isFuture || !day.date) && 'bg-muted/50',
                    // Past and missed - darker gray
                    !isCheckedIn && !isToday && !isFuture && day.date && 'bg-muted-foreground/20'
                  )}
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
