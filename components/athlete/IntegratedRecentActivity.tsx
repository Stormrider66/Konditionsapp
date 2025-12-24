'use client'

/**
 * Integrated Recent Activity Component
 *
 * Displays activities from all sources:
 * - Manual workout logs
 * - Strava synced activities
 * - Garmin synced activities
 *
 * Shows source badges and unified metrics.
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, Clock, MapPin, Heart, Flame, TrendingUp, Bike, PersonStanding, Waves } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

interface UnifiedActivity {
  id: string
  source: 'manual' | 'strava' | 'garmin'
  name: string
  type: string
  date: string
  duration?: number
  distance?: number
  avgHR?: number
  maxHR?: number
  calories?: number
  tss?: number
  trimp?: number
  pace?: string
  speed?: number
  elevationGain?: number
  completed?: boolean
  notes?: string
}

interface IntegratedRecentActivityProps {
  clientId: string
  limit?: number
}

const SOURCE_CONFIG = {
  manual: { label: 'Manuell', color: 'bg-gray-100 text-gray-700', icon: '📝' },
  strava: { label: 'Strava', color: 'bg-orange-100 text-orange-700', icon: '🏃' },
  garmin: { label: 'Garmin', color: 'bg-blue-100 text-blue-700', icon: '⌚' },
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  RUNNING: <PersonStanding className="h-4 w-4" />,
  CYCLING: <Bike className="h-4 w-4" />,
  SWIMMING: <Waves className="h-4 w-4" />,
  STRENGTH: <TrendingUp className="h-4 w-4" />,
}

export function IntegratedRecentActivity({ clientId, limit = 10 }: IntegratedRecentActivityProps) {
  const [activities, setActivities] = useState<UnifiedActivity[]>([])
  const [counts, setCounts] = useState({ manual: 0, strava: 0, garmin: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchActivities() {
      try {
        const response = await fetch(
          `/api/athlete/integrated-activity?clientId=${clientId}&limit=${limit}&days=14`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch activities')
        }

        const data = await response.json()
        setActivities(data.activities || [])
        setCounts(data.counts || { manual: 0, strava: 0, garmin: 0 })
      } catch (err) {
        console.error('Error fetching activities:', err)
        setError('Kunde inte ladda aktiviteter')
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [clientId, limit])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Senaste aktiviteter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Senaste aktiviteter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const totalSynced = counts.strava + counts.garmin

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Senaste aktiviteter
          </CardTitle>
          {totalSynced > 0 && (
            <div className="flex gap-1">
              {counts.strava > 0 && (
                <Badge variant="outline" className="text-xs bg-orange-50">
                  {counts.strava} Strava
                </Badge>
              )}
              {counts.garmin > 0 && (
                <Badge variant="outline" className="text-xs bg-blue-50">
                  {counts.garmin} Garmin
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ingen aktivitet ännu</p>
            <p className="text-sm text-muted-foreground mt-2">
              Logga ett pass eller anslut Strava/Garmin
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityCard({ activity }: { activity: UnifiedActivity }) {
  const sourceConfig = SOURCE_CONFIG[activity.source]
  const typeIcon = TYPE_ICONS[activity.type] || <Activity className="h-4 w-4" />

  return (
    <div className="border rounded-lg p-3 space-y-2 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-muted-foreground">{typeIcon}</span>
            <h4 className="font-medium text-sm truncate">{activity.name}</h4>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(activity.date), {
                addSuffix: true,
                locale: sv,
              })}
            </span>
            <Badge className={`text-xs px-1.5 py-0 ${sourceConfig.color}`}>
              {sourceConfig.icon} {sourceConfig.label}
            </Badge>
          </div>
        </div>

        {activity.tss && (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            TSS {activity.tss}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {activity.duration && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {activity.duration} min
          </span>
        )}
        {activity.distance && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {activity.distance.toFixed(1)} km
          </span>
        )}
        {activity.avgHR && (
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {activity.avgHR} bpm
          </span>
        )}
        {activity.pace && (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {activity.pace}/km
          </span>
        )}
        {activity.speed && (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {activity.speed.toFixed(1)} km/h
          </span>
        )}
        {activity.calories && (
          <span className="flex items-center gap-1">
            <Flame className="h-3 w-3" />
            {activity.calories} kcal
          </span>
        )}
        {activity.elevationGain && activity.elevationGain > 0 && (
          <span className="flex items-center gap-1">
            ↗️ {Math.round(activity.elevationGain)} m
          </span>
        )}
      </div>

      {activity.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2">{activity.notes}</p>
      )}
    </div>
  )
}
