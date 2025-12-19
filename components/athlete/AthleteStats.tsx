// components/athlete/AthleteStats.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Activity, Clock, MapPin, Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
  // Calculate completion percentages
  const workoutCompletion = plannedWorkouts > 0 ? Math.round((totalWorkouts / plannedWorkouts) * 100) : 0
  const distanceCompletion = plannedDistance > 0 ? Math.round((totalDistance / plannedDistance) * 100) : 0

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Workouts Card */}
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Pass denna vecka</p>
              <p className="text-3xl font-bold">{totalWorkouts}</p>
            </div>
            <Activity className="h-8 w-8 opacity-80" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-blue-100">
              {totalWorkouts}/{plannedWorkouts} planerade
            </span>
            {workoutCompletion > 0 && (
              <span className="text-xs text-blue-100">{workoutCompletion}%</span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-1 h-1.5 bg-blue-400/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(workoutCompletion, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Distance Card */}
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total distans</p>
              <p className="text-3xl font-bold">{totalDistance.toFixed(1)}<span className="text-lg ml-1">km</span></p>
            </div>
            <MapPin className="h-8 w-8 opacity-80" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-green-100">
              av {plannedDistance.toFixed(1)} km planerat
            </span>
            {distanceCompletion > 0 && (
              <span className="text-xs text-green-100">{distanceCompletion}%</span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-1 h-1.5 bg-green-400/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(distanceCompletion, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Duration Card */}
      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Total tid</p>
              <p className="text-3xl font-bold">{formatDuration(totalDuration)}</p>
            </div>
            <Clock className="h-8 w-8 opacity-80" />
          </div>
          <div className="mt-2">
            <span className="text-xs text-orange-100">
              Planerat: {formatDuration(plannedDuration)}
            </span>
          </div>
          <Link href="/athlete/history" className="text-xs text-orange-100 hover:text-white flex items-center gap-1 mt-1">
            Se historik <ArrowRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      {/* RPE Card */}
      <Card className={`border-0 ${avgEffort > 7 ? 'bg-gradient-to-br from-red-500 to-red-600' : avgEffort > 0 ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gradient-to-br from-slate-500 to-slate-600'} text-white`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${avgEffort > 7 ? 'text-red-100' : avgEffort > 0 ? 'text-purple-100' : 'text-slate-100'}`}>
                Genomsnittlig RPE
              </p>
              <p className="text-3xl font-bold">{avgEffort > 0 ? avgEffort : '-'}<span className="text-lg ml-1">/10</span></p>
            </div>
            <Zap className="h-8 w-8 opacity-80" />
          </div>
          <div className="mt-2">
            <span className={`text-xs ${avgEffort > 7 ? 'text-red-100' : avgEffort > 0 ? 'text-purple-100' : 'text-slate-100'}`}>
              {avgEffort > 7 ? 'Hög belastning' : avgEffort > 5 ? 'Moderat belastning' : avgEffort > 0 ? 'Låg belastning' : 'Inga data'}
            </span>
          </div>
          {avgEffort > 0 && (
            <div className="mt-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-500"
                style={{ width: `${avgEffort * 10}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return '-'
  if (minutes < 60) {
    return `${minutes}min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins}m`
}
