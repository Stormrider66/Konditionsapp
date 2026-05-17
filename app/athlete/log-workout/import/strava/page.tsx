'use client'

/**
 * Strava Import Page
 *
 * Lists available Strava activities for import.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Activity,
  Clock,
  MapPin,
  Heart,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { useLocale, useTranslations } from '@/i18n/client'

interface StravaActivity {
  id: string
  stravaId: string
  name: string
  type: string
  startDate: string
  distance: number
  movingTime: number
  elevationGain: number
  averageHeartrate?: number
  alreadyImported: boolean
}

export default function StravaImportPage() {
  const t = useTranslations('pages.logWorkoutInputs')
  const locale = useLocale()
  const dateLocale = locale === 'en' ? enUS : sv
  const basePath = useBasePath()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [error, setError] = useState<string>()

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true)
      setError(undefined)

      const res = await fetch('/api/adhoc-workouts/import/strava')

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch activities')
      }

      const data = await res.json()
      setActivities(data.data.activities)
    } catch (error) {
      console.error('Error fetching Strava activities:', error)
      setError(error instanceof Error ? error.message : t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities])

  const handleImport = async (stravaId: string) => {
    try {
      setImporting(stravaId)

      const res = await fetch('/api/adhoc-workouts/import/strava', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stravaActivityId: stravaId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to import activity')
      }

      const data = await res.json()
      toast.success(t('import.toastSuccess'))

      // Redirect to review page
      router.push(`${basePath}/athlete/log-workout/${data.data.id}/review`)
    } catch (error) {
      console.error('Error importing activity:', error)
      toast.error(error instanceof Error ? error.message : t('import.toastError'))
      setImporting(null)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes} min`
  }

  const formatDistance = (meters: number) => {
    const km = meters / 1000
    return `${km.toFixed(1)} km`
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`${basePath}/athlete/log-workout`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-orange-500" />
              Strava Import
            </h1>
            <p className="text-muted-foreground">
              {t('import.description')}
            </p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={fetchActivities} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="p-4 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchActivities}>
              {t('actions.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && activities.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{t('import.emptyTitle')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('import.emptyDescription', { provider: 'Strava' })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Activities list */}
      {!loading && !error && activities.length > 0 && (
        <div className="space-y-3">
          {activities.map((activity) => (
            <Card
              key={activity.id}
              className={cn(
                'transition-all',
                activity.alreadyImported && 'opacity-60'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                    <Activity className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{activity.name}</h3>
                      <Badge variant="outline" className="shrink-0">
                        {activity.type}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {format(new Date(activity.startDate), 'PPP', { locale: dateLocale })}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm">
                      {activity.distance > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {formatDistance(activity.distance)}
                        </div>
                      )}
                      {activity.movingTime > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(activity.movingTime)}
                        </div>
                      )}
                      {activity.averageHeartrate && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Heart className="h-3.5 w-3.5" />
                          {Math.round(activity.averageHeartrate)} bpm
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {activity.alreadyImported ? (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        {t('actions.imported')}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleImport(activity.stravaId)}
                        disabled={importing !== null}
                      >
                        {importing === activity.stravaId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t('actions.import')
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
