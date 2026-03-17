'use client'

import { forwardRef } from 'react'
import { Flame, Trophy } from 'lucide-react'

interface CheckInDay {
  date: string
  checkedIn: boolean
}

interface StreakShareableCardProps {
  currentStreak: number
  personalBest: number
  checkInHistory?: CheckInDay[]
  athleteName?: string
}

export const StreakShareableCard = forwardRef<HTMLDivElement, StreakShareableCardProps>(
  function StreakShareableCard({ currentStreak, personalBest, checkInHistory, athleteName }, ref) {
    // Build a 4-week (28 day) calendar grid
    const last28Days = checkInHistory?.slice(-28) || []

    return (
      <div
        ref={ref}
        style={{
          width: 1200,
          height: 630,
          background: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
          fontFamily: 'system-ui, sans-serif',
        }}
        className="relative flex flex-col items-center justify-center p-16"
      >
        {/* Flame icon */}
        <div className="p-6 rounded-2xl mb-6 bg-orange-200">
          <Flame className="h-16 w-16 text-orange-600" />
        </div>

        {/* Streak count */}
        <div className="flex items-baseline gap-4 mb-2">
          <span className="text-8xl font-bold text-orange-800">{currentStreak}</span>
          <span className="text-3xl text-orange-700">
            {currentStreak === 1 ? 'dag' : 'dagars'} streak
          </span>
        </div>

        {/* Personal best */}
        <div className="flex items-center gap-2 mb-8 text-amber-700">
          <Trophy className="h-5 w-5 text-amber-500" />
          <span className="text-xl">Rekord: {personalBest} dagar</span>
        </div>

        {/* Mini 4-week calendar grid */}
        {last28Days.length > 0 && (
          <div className="flex gap-2 mb-8">
            {last28Days.map((day, i) => (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: day.checkedIn ? '#f97316' : '#fed7aa',
                  border: day.checkedIn ? 'none' : '1px solid #fdba74',
                }}
              />
            ))}
          </div>
        )}

        {/* Athlete name */}
        {athleteName && (
          <p className="text-xl text-orange-700 opacity-70 mb-4">
            {athleteName}
          </p>
        )}

        {/* Branding */}
        <div className="absolute bottom-6 right-8 flex items-center gap-2 opacity-60">
          <span className="text-lg font-semibold text-orange-800">Trainomics</span>
        </div>
      </div>
    )
  }
)
