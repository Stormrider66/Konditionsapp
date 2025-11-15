// components/athlete/AthleteStats.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Activity, Clock, MapPin, Zap } from 'lucide-react'

interface AthleteStatsProps {
  totalWorkouts: number
  totalDistance: number
  totalDuration: number
  avgEffort: number
  plannedWorkouts?: number
  plannedDistance?: number
  plannedDuration?: number
}

export function AthleteStats({
  totalWorkouts,
  totalDistance,
  totalDuration,
  avgEffort,
  plannedWorkouts = 0,
  plannedDistance = 0,
  plannedDuration = 0,
}: AthleteStatsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Pass denna vecka</p>
              <p className="text-xl sm:text-2xl font-bold">
                {totalWorkouts}
                <span className="text-sm text-muted-foreground">/{plannedWorkouts}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Genomförda/Planerade</p>
            </div>
            <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total distans</p>
              <p className="text-xl sm:text-2xl font-bold truncate">
                {totalDistance.toFixed(1)}
                <span className="text-sm text-muted-foreground">/{plannedDistance.toFixed(1)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">km (Genomförda/Planerade)</p>
            </div>
            <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total tid</p>
              <p className="text-xl sm:text-2xl font-bold truncate">
                {formatDuration(totalDuration)}
                <span className="text-sm text-muted-foreground">/{formatDuration(plannedDuration)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Genomförda/Planerade</p>
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 sm:pt-6 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Genomsnittlig RPE</p>
              <p className="text-xl sm:text-2xl font-bold">{avgEffort > 0 ? `${avgEffort}/10` : '-'}</p>
              <p className="text-xs text-muted-foreground mt-1">Upplevd ansträngning</p>
            </div>
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}min`
}
