'use client'

/**
 * Garmin Import Page
 *
 * Lists available Garmin activities for import.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Watch,
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
import { sv } from 'date-fns/locale'
import { useBasePath } from '@/lib/contexts/BasePathContext'

interface GarminActivity {
  id: string
  activityId: string
  activityName: string | null
  activityType: string
  startTime: string
  distance: number | null
  duration: number | null
  elevationGain: number | null
  averageHR: number | null
  maxHR: number | null
  calories: number | null
  alreadyImported: boolean
}

export default function GarminImportPage() {
  const basePath = useBasePath()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)
  const [activities, setActivities] = useState<GarminActivity[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError(undefined)

      const res = await fetch('/api/adhoc-workouts/import/garmin')

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch activities')
      }

      const data = await res.json()
      setActivities(data.data.activities)
    } catch (error) {
      console.error('Error fetching Garmin activities:', error)
      setError(error instanceof Error ? error.message : 'Ett fel uppstod')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (garminId: string) => {
    try {
      setImporting(garminId)

      const res = await fetch('/api/adhoc-workouts/import/garmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ garminActivityId: garminId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to import activity')
      }

      const data = await res.json()
      toast.success('Aktivitet importerad!')

      // Redirect to review page
      router.push(`${basePath}/athlete/log-workout/${data.data.id}/review`)
    } catch (error) {
      console.error('Error importing activity:', error)
      toast.error(error instanceof Error ? error.message : 'Det gick inte att importera')
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
              <Watch className="h-6 w-6 text-cyan-500" />
              Garmin Import
            </h1>
            <p className="text-muted-foreground">
              Välj en aktivitet att importera
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
              Försök igen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && activities.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Watch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Inga aktiviteter hittades</h3>
            <p className="text-sm text-muted-foreground">
              Se till att ditt Garmin-konto är kopplat och synkroniserat
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                    <Watch className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{activity.activityName || activity.activityType}</h3>
                      <Badge variant="outline" className="shrink-0">
                        {activity.activityType}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {format(new Date(activity.startTime), 'PPP', { locale: sv })}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm">
                      {activity.distance != null && activity.distance > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {formatDistance(activity.distance)}
                        </div>
                      )}
                      {activity.duration != null && activity.duration > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(activity.duration)}
                        </div>
                      )}
                      {activity.averageHR != null && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Heart className="h-3.5 w-3.5" />
                          {Math.round(activity.averageHR)} bpm
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {activity.alreadyImported ? (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        Importerad
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleImport(activity.activityId)}
                        disabled={importing !== null}
                      >
                        {importing === activity.activityId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Importera'
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
