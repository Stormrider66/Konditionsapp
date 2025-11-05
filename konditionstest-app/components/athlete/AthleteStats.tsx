// components/athlete/AthleteStats.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Activity, Clock, MapPin, Zap } from 'lucide-react'

interface AthleteStatsProps {
  totalWorkouts: number
  totalDistance: number
  totalDuration: number
  avgEffort: number
}

export function AthleteStats({
  totalWorkouts,
  totalDistance,
  totalDuration,
  avgEffort,
}: AthleteStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pass denna vecka</p>
              <p className="text-2xl font-bold">{totalWorkouts}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total distans</p>
              <p className="text-2xl font-bold">{totalDistance.toFixed(1)} km</p>
            </div>
            <MapPin className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total tid</p>
              <p className="text-2xl font-bold">{formatDuration(totalDuration)}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Genomsnittlig RPE</p>
              <p className="text-2xl font-bold">{avgEffort > 0 ? `${avgEffort}/10` : '-'}</p>
            </div>
            <Zap className="h-8 w-8 text-red-500" />
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
