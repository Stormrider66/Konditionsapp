'use client'

/**
 * Integrated Recent Activity Component
 *
 * Displays activities from all sources:
 * - Manual workout logs
 * - Strava synced activities
 * - Garmin synced activities
 * - Concept2 synced results
 *
 * Shows source badges and unified metrics.
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, Clock, MapPin, Heart, Flame, TrendingUp, Bike, PersonStanding, Waves, Ship, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

interface UnifiedActivity {
  id: string
  source: 'manual' | 'strava' | 'garmin' | 'concept2' | 'ai' | 'adhoc'
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
  // Concept2 specific
  strokeRate?: number
  equipmentType?: string
  // AI WOD specific
  sessionRPE?: number
}

interface IntegratedRecentActivityProps {
  clientId: string
  limit?: number
  variant?: 'default' | 'glass'
}

const SOURCE_CONFIG = {
  manual: { label: 'Manuell', color: 'bg-gray-100 text-gray-700', icon: '📝' },
  strava: { label: 'Strava', color: 'bg-orange-100 text-orange-700', icon: '🏃' },
  garmin: { label: 'Garmin', color: 'bg-blue-100 text-blue-700', icon: '⌚' },
  concept2: { label: 'Concept2', color: 'bg-cyan-100 text-cyan-700', icon: '🚣' },
  ai: { label: 'AI-Pass', color: 'bg-purple-100 text-purple-700', icon: '✨' },
  adhoc: { label: 'Manuell', color: 'bg-emerald-100 text-emerald-700', icon: '✏️' },
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  RUNNING: <PersonStanding className="h-4 w-4" />,
  CYCLING: <Bike className="h-4 w-4" />,
  SWIMMING: <Waves className="h-4 w-4" />,
  STRENGTH: <TrendingUp className="h-4 w-4" />,
  ROWING: <Ship className="h-4 w-4" />,
  SKIING: <PersonStanding className="h-4 w-4" />,
}

export function IntegratedRecentActivity({ clientId, limit = 10, variant = 'default' }: IntegratedRecentActivityProps) {
  const [activities, setActivities] = useState<UnifiedActivity[]>([])
  const [counts, setCounts] = useState({ manual: 0, strava: 0, garmin: 0, concept2: 0, ai: 0, adhoc: 0 })
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
        setCounts(data.counts || { manual: 0, strava: 0, garmin: 0, concept2: 0, ai: 0, adhoc: 0 })
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

  if (variant === 'glass') {
    return (
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <GlassCardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600 dark:text-orange-500" />
              Senaste aktiviteter
            </GlassCardTitle>
            {(totalSynced > 0 || counts.ai > 0) && (
              <div className="flex gap-1">
                {counts.strava > 0 && (
                  <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20">
                    {counts.strava} Strava
                  </Badge>
                )}
                {counts.garmin > 0 && (
                  <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20">
                    {counts.garmin} Garmin
                  </Badge>
                )}
                {counts.ai > 0 && (
                  <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20">
                    {counts.ai} AI
                  </Badge>
                )}
              </div>
            )}
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">Ingen aktivitet ännu</p>
              <p className="text-sm text-slate-500 mt-2">
                Logga ett pass eller anslut Strava/Garmin
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} variant="glass" />
              ))}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Senaste aktiviteter
          </CardTitle>
          {(totalSynced > 0 || counts.ai > 0) && (
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
              {counts.ai > 0 && (
                <Badge variant="outline" className="text-xs bg-purple-50">
                  {counts.ai} AI
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

function ActivityCard({ activity, variant = 'default' }: { activity: UnifiedActivity, variant?: 'default' | 'glass' }) {
  const sourceConfig = SOURCE_CONFIG[activity.source]
  const typeIcon = TYPE_ICONS[activity.type] || <Activity className="h-4 w-4" />

  if (variant === 'glass') {
    return (
      <div className="border border-slate-200 dark:border-white/10 rounded-lg p-3 space-y-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors bg-slate-50 dark:bg-black/20">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-500 dark:text-slate-400">{typeIcon}</span>
              <h4 className="font-medium text-sm truncate text-slate-800 dark:text-slate-200">{activity.name}</h4>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>
                {formatDistanceToNow(new Date(activity.date), {
                  addSuffix: true,
                  locale: sv,
                })}
              </span>
              <Badge className={`text-xs px-1.5 py-0 ${
                activity.source === 'strava' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' :
                activity.source === 'ai' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' :
                activity.source === 'adhoc' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {sourceConfig.icon} {sourceConfig.label}
              </Badge>
            </div>
          </div>

          {activity.tss && (
            <Badge variant="outline" className="text-xs whitespace-nowrap border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
              TSS {activity.tss}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
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
          {/* ... rest of metrics ... */}
        </div>
      </div>
    )
  }

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
