'use client'

/**
 * Integration Status Widget
 *
 * Shows connection status and sync health for:
 * - Strava
 * - Garmin
 *
 * Displays:
 * - Connection status
 * - Last sync time
 * - Activity/data counts
 * - Quick sync button
 */

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Link2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Activity,
  Watch,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import Link from 'next/link'

interface IntegrationStatus {
  connected: boolean
  lastSyncAt?: string
  activityCount?: number
  syncEnabled?: boolean
  error?: string
}

interface IntegrationStatusWidgetProps {
  clientId: string
  compact?: boolean
}

export function IntegrationStatusWidget({ clientId, compact = false }: IntegrationStatusWidgetProps) {
  const { toast } = useToast()
  const [stravaStatus, setStravaStatus] = useState<IntegrationStatus | null>(null)
  const [garminStatus, setGarminStatus] = useState<IntegrationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncing, setSyncing] = useState({ strava: false, garmin: false })

  const fetchStatus = useCallback(async () => {
    try {
      const [stravaRes, garminRes] = await Promise.all([
        fetch(`/api/integrations/strava?clientId=${clientId}`),
        fetch(`/api/integrations/garmin?clientId=${clientId}`),
      ])

      if (stravaRes.ok) {
        const data = await stravaRes.json()
        setStravaStatus(data)
      }

      if (garminRes.ok) {
        const data = await garminRes.json()
        setGarminStatus(data.configured === false ? { connected: false } : data)
      }
    } catch (error) {
      console.error('Failed to fetch integration status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const syncStrava = async () => {
    setSyncing(prev => ({ ...prev, strava: true }))
    try {
      const response = await fetch('/api/integrations/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, daysBack: 7 }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Strava synkad',
          description: `${data.synced || 0} aktiviteter synkroniserade`,
        })
        fetchStatus()
      } else {
        throw new Error('Sync failed')
      }
    } catch {
      toast({
        title: 'Synkfel',
        description: 'Kunde inte synkronisera med Strava',
        variant: 'destructive',
      })
    } finally {
      setSyncing(prev => ({ ...prev, strava: false }))
    }
  }

  const syncGarmin = async () => {
    setSyncing(prev => ({ ...prev, garmin: true }))
    try {
      const response = await fetch('/api/integrations/garmin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, daysBack: 7 }),
      })

      if (response.ok) {
        toast({
          title: 'Garmin synkad',
          description: 'Hälsodata har synkroniserats',
        })
        fetchStatus()
      } else {
        throw new Error('Sync failed')
      }
    } catch {
      toast({
        title: 'Synkfel',
        description: 'Kunde inte synkronisera med Garmin',
        variant: 'destructive',
      })
    } finally {
      setSyncing(prev => ({ ...prev, garmin: false }))
    }
  }

  if (isLoading) {
    return compact ? (
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Anslutningar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  const hasAnyConnection = stravaStatus?.connected || garminStatus?.connected

  // Compact mode - just badges for the header
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {stravaStatus?.connected && (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200 cursor-pointer hover:bg-orange-100"
            onClick={syncStrava}
          >
            {syncing.strava ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Activity className="h-3 w-3 mr-1" />
            )}
            Strava
            {stravaStatus.activityCount ? ` (${stravaStatus.activityCount})` : ''}
          </Badge>
        )}
        {garminStatus?.connected && (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100"
            onClick={syncGarmin}
          >
            {syncing.garmin ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Watch className="h-3 w-3 mr-1" />
            )}
            Garmin
          </Badge>
        )}
        {!hasAnyConnection && (
          <Link href="/athlete/settings">
            <Badge variant="outline" className="text-muted-foreground cursor-pointer hover:bg-gray-100">
              <Link2 className="h-3 w-3 mr-1" />
              Anslut appar
            </Badge>
          </Link>
        )}
      </div>
    )
  }

  // Full card mode
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-5 w-5" />
          Anslutningar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Strava */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              stravaStatus?.connected ? 'bg-orange-100' : 'bg-gray-100'
            }`}>
              <Activity className={`h-4 w-4 ${
                stravaStatus?.connected ? 'text-orange-600' : 'text-gray-400'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium">Strava</p>
              {stravaStatus?.connected ? (
                <p className="text-xs text-muted-foreground">
                  {stravaStatus.lastSyncAt
                    ? `Synkad ${formatDistanceToNow(new Date(stravaStatus.lastSyncAt), { addSuffix: true, locale: sv })}`
                    : 'Ansluten'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Ej ansluten</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stravaStatus?.connected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={syncStrava}
                  disabled={syncing.strava}
                  className="h-7 px-2"
                >
                  <RefreshCw className={`h-3 w-3 ${syncing.strava ? 'animate-spin' : ''}`} />
                </Button>
              </>
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Garmin */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              garminStatus?.connected ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Watch className={`h-4 w-4 ${
                garminStatus?.connected ? 'text-blue-600' : 'text-gray-400'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium">Garmin</p>
              {garminStatus?.connected ? (
                <p className="text-xs text-muted-foreground">
                  {garminStatus.lastSyncAt
                    ? `Synkad ${formatDistanceToNow(new Date(garminStatus.lastSyncAt), { addSuffix: true, locale: sv })}`
                    : 'Ansluten'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Ej ansluten</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {garminStatus?.connected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={syncGarmin}
                  disabled={syncing.garmin}
                  className="h-7 px-2"
                >
                  <RefreshCw className={`h-3 w-3 ${syncing.garmin ? 'animate-spin' : ''}`} />
                </Button>
              </>
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Sync errors */}
        {(stravaStatus?.error || garminStatus?.error) && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <span>Synkproblem upptäckt</span>
          </div>
        )}

        {/* Link to settings */}
        {!hasAnyConnection && (
          <Link href="/athlete/settings" className="block">
            <Button variant="outline" size="sm" className="w-full mt-2">
              <Link2 className="h-4 w-4 mr-2" />
              Anslut appar
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
