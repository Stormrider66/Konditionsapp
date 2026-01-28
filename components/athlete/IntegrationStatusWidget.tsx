'use client'

/**
 * Integration Status Widget
 *
 * Shows connection status and sync health for:
 * - Strava
 * - Garmin
 * - Concept2
 *
 * Displays:
 * - Connection status
 * - Last sync time
 * - Activity/data counts
 * - Quick sync button
 */

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
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
  Waves,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import Link from 'next/link'
import { IntegrationsHelpModal } from './settings/IntegrationsHelpModal'

interface IntegrationStatus {
  connected: boolean
  lastSyncAt?: string
  activityCount?: number
  resultCount?: number
  resultsByType?: Record<string, number>
  syncEnabled?: boolean
  error?: string
}

interface IntegrationStatusWidgetProps {
  clientId: string
  compact?: boolean
  variant?: 'default' | 'glass'
  basePath?: string
}

export function IntegrationStatusWidget({ clientId, compact = false, variant = 'default', basePath = '' }: IntegrationStatusWidgetProps) {
  const { toast } = useToast()
  const [stravaStatus, setStravaStatus] = useState<IntegrationStatus | null>(null)
  const [garminStatus, setGarminStatus] = useState<IntegrationStatus | null>(null)
  const [concept2Status, setConcept2Status] = useState<IntegrationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncing, setSyncing] = useState({ strava: false, garmin: false, concept2: false })
  const [connecting, setConnecting] = useState({ strava: false, garmin: false, concept2: false })

  const fetchStatus = useCallback(async () => {
    try {
      const [stravaRes, garminRes, concept2Res] = await Promise.all([
        fetch(`/api/integrations/strava?clientId=${clientId}`),
        fetch(`/api/integrations/garmin?clientId=${clientId}`),
        fetch(`/api/integrations/concept2?clientId=${clientId}`),
      ])

      if (stravaRes.ok) {
        const data = await stravaRes.json()
        setStravaStatus(data)
      }

      if (garminRes.ok) {
        const data = await garminRes.json()
        setGarminStatus(data.configured === false ? { connected: false } : data)
      }

      if (concept2Res.ok) {
        const data = await concept2Res.json()
        setConcept2Status(data)
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

  const syncConcept2 = async () => {
    setSyncing(prev => ({ ...prev, concept2: true }))
    try {
      const response = await fetch('/api/integrations/concept2/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, daysBack: 30 }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Concept2 synkad',
          description: `${data.synced || 0} träningspass synkroniserade`,
        })
        fetchStatus()
      } else {
        throw new Error('Sync failed')
      }
    } catch {
      toast({
        title: 'Synkfel',
        description: 'Kunde inte synkronisera med Concept2',
        variant: 'destructive',
      })
    } finally {
      setSyncing(prev => ({ ...prev, concept2: false }))
    }
  }

  const connectConcept2 = async () => {
    setConnecting(prev => ({ ...prev, concept2: true }))
    try {
      const response = await fetch('/api/integrations/concept2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to connect')
      }
    } catch (error) {
      toast({
        title: 'Anslutningsfel',
        description: error instanceof Error ? error.message : 'Kunde inte ansluta till Concept2',
        variant: 'destructive',
      })
      setConnecting(prev => ({ ...prev, concept2: false }))
    }
  }

  const connectStrava = async () => {
    setConnecting(prev => ({ ...prev, strava: true }))
    try {
      const response = await fetch('/api/integrations/strava', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to connect')
      }
    } catch (error) {
      toast({
        title: 'Anslutningsfel',
        description: error instanceof Error ? error.message : 'Kunde inte ansluta till Strava',
        variant: 'destructive',
      })
      setConnecting(prev => ({ ...prev, strava: false }))
    }
  }

  if (isLoading) {
    if (variant === 'glass' && !compact) {
      return (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Anslutningar
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <Skeleton className="h-24 w-full bg-white/10" />
          </GlassCardContent>
        </GlassCard>
      )
    }
    return compact ? (
      <div className="flex gap-2">
        <Skeleton className={`h-6 w-20 ${variant === 'glass' ? 'bg-white/10' : ''}`} />
        <Skeleton className={`h-6 w-20 ${variant === 'glass' ? 'bg-white/10' : ''}`} />
        <Skeleton className={`h-6 w-20 ${variant === 'glass' ? 'bg-white/10' : ''}`} />
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

  const hasAnyConnection = stravaStatus?.connected || garminStatus?.connected || concept2Status?.connected

  // Compact mode - just badges for the header
  // Compact mode - just badges for the header
  if (compact) {
    if (variant === 'glass') {
      return (
        <div className="flex items-center gap-2">
          {stravaStatus?.connected && (
            <Badge
              variant="outline"
              className="bg-orange-500/10 text-orange-400 border-orange-500/20 cursor-pointer hover:bg-orange-500/20"
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
              className="bg-blue-500/10 text-blue-400 border-blue-500/20 cursor-pointer hover:bg-blue-500/20"
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
          {concept2Status?.connected && (
            <Badge
              variant="outline"
              className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 cursor-pointer hover:bg-cyan-500/20"
              onClick={syncConcept2}
            >
              {syncing.concept2 ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Waves className="h-3 w-3 mr-1" />
              )}
              Concept2
              {concept2Status.resultCount ? ` (${concept2Status.resultCount})` : ''}
            </Badge>
          )}
          {!hasAnyConnection && (
            <Link href={`${basePath}/athlete/settings`}>
              <Badge variant="outline" className="text-slate-400 border-white/10 cursor-pointer hover:bg-white/10 hover:text-white">
                <Link2 className="h-3 w-3 mr-1" />
                Anslut appar
              </Badge>
            </Link>
          )}
        </div>
      )
    }

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
        {concept2Status?.connected && (
          <Badge
            variant="outline"
            className="bg-cyan-50 text-cyan-700 border-cyan-200 cursor-pointer hover:bg-cyan-100"
            onClick={syncConcept2}
          >
            {syncing.concept2 ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Waves className="h-3 w-3 mr-1" />
            )}
            Concept2
            {concept2Status.resultCount ? ` (${concept2Status.resultCount})` : ''}
          </Badge>
        )}
        {!hasAnyConnection && (
          <Link href={`${basePath}/athlete/settings`}>
            <Badge variant="outline" className="text-muted-foreground cursor-pointer hover:bg-gray-100">
              <Link2 className="h-3 w-3 mr-1" />
              Anslut appar
            </Badge>
          </Link>
        )}
      </div>
    )
  }

  if (variant === 'glass') {
    return (
      <GlassCard>
        <GlassCardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-5 w-5 text-gray-400" />
              Anslutningar
            </GlassCardTitle>
          </div>
        </GlassCardHeader>
        <GlassCardContent className="space-y-3">
          {/* Strava */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stravaStatus?.connected ? 'bg-orange-500/20' : 'bg-white/5'
                }`}>
                <Activity className={`h-4 w-4 ${stravaStatus?.connected ? 'text-orange-500' : 'text-slate-500'
                  }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Strava</p>
                {stravaStatus?.connected ? (
                  <p className="text-xs text-slate-400">
                    {stravaStatus.lastSyncAt
                      ? `Synkad ${formatDistanceToNow(new Date(stravaStatus.lastSyncAt), { addSuffix: true, locale: sv })}`
                      : 'Ansluten'}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Ej ansluten</p>
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
                    className="h-7 px-2 text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <RefreshCw className={`h-3 w-3 ${syncing.strava ? 'animate-spin' : ''}`} />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={connectStrava}
                  disabled={connecting.strava}
                  className="h-7 text-xs border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                >
                  {connecting.strava ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Link2 className="h-3 w-3 mr-1" />
                  )}
                  Anslut
                </Button>
              )}
            </div>
          </div>

          {/* Garmin */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${garminStatus?.connected ? 'bg-blue-500/20' : 'bg-white/5'
                }`}>
                <Watch className={`h-4 w-4 ${garminStatus?.connected ? 'text-blue-500' : 'text-slate-500'
                  }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Garmin</p>
                {garminStatus?.connected ? (
                  <p className="text-xs text-slate-400">
                    {garminStatus.lastSyncAt
                      ? `Synkad ${formatDistanceToNow(new Date(garminStatus.lastSyncAt), { addSuffix: true, locale: sv })}`
                      : 'Ansluten'}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Ej ansluten</p>
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
                    className="h-7 px-2 text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <RefreshCw className={`h-3 w-3 ${syncing.garmin ? 'animate-spin' : ''}`} />
                  </Button>
                </>
              ) : (
                <XCircle className="h-4 w-4 text-slate-600" />
              )}
            </div>
          </div>

          {/* Concept2 */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${concept2Status?.connected ? 'bg-cyan-500/20' : 'bg-white/5'
                }`}>
                <Waves className={`h-4 w-4 ${concept2Status?.connected ? 'text-cyan-500' : 'text-slate-500'
                  }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Concept2</p>
                {concept2Status?.connected ? (
                  <p className="text-xs text-slate-400">
                    {concept2Status.lastSyncAt
                      ? `Synkad ${formatDistanceToNow(new Date(concept2Status.lastSyncAt), { addSuffix: true, locale: sv })}`
                      : 'Ansluten'}
                    {concept2Status.resultCount ? ` • ${concept2Status.resultCount} pass` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Ej ansluten</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {concept2Status?.connected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={syncConcept2}
                    disabled={syncing.concept2}
                    className="h-7 px-2 text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <RefreshCw className={`h-3 w-3 ${syncing.concept2 ? 'animate-spin' : ''}`} />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={connectConcept2}
                  disabled={connecting.concept2}
                  className="h-7 text-xs border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                >
                  {connecting.concept2 ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Link2 className="h-3 w-3 mr-1" />
                  )}
                  Anslut
                </Button>
              )}
            </div>
          </div>

          {/* Errors */}
          {(stravaStatus?.error || garminStatus?.error || concept2Status?.error) && (
            <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded text-xs text-yellow-500 border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4" />
              <span>Synkproblem upptäckt</span>
            </div>
          )}

        </GlassCardContent>
      </GlassCard>
    )
  }

  // Full card mode
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5" />
            Anslutningar
          </CardTitle>
          <IntegrationsHelpModal />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Strava */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stravaStatus?.connected ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
              <Activity className={`h-4 w-4 ${stravaStatus?.connected ? 'text-orange-600' : 'text-gray-400'
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
              <Button
                size="sm"
                variant="outline"
                onClick={connectStrava}
                disabled={connecting.strava}
                className="h-7 text-xs"
              >
                {connecting.strava ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Link2 className="h-3 w-3 mr-1" />
                )}
                Anslut
              </Button>
            )}
          </div>
        </div>

        {/* Garmin */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${garminStatus?.connected ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
              <Watch className={`h-4 w-4 ${garminStatus?.connected ? 'text-blue-600' : 'text-gray-400'
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

        {/* Concept2 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${concept2Status?.connected ? 'bg-cyan-100' : 'bg-gray-100'
              }`}>
              <Waves className={`h-4 w-4 ${concept2Status?.connected ? 'text-cyan-600' : 'text-gray-400'
                }`} />
            </div>
            <div>
              <p className="text-sm font-medium">Concept2</p>
              {concept2Status?.connected ? (
                <p className="text-xs text-muted-foreground">
                  {concept2Status.lastSyncAt
                    ? `Synkad ${formatDistanceToNow(new Date(concept2Status.lastSyncAt), { addSuffix: true, locale: sv })}`
                    : 'Ansluten'}
                  {concept2Status.resultCount ? ` • ${concept2Status.resultCount} pass` : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Ej ansluten</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {concept2Status?.connected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={syncConcept2}
                  disabled={syncing.concept2}
                  className="h-7 px-2"
                >
                  <RefreshCw className={`h-3 w-3 ${syncing.concept2 ? 'animate-spin' : ''}`} />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={connectConcept2}
                disabled={connecting.concept2}
                className="h-7 text-xs"
              >
                {connecting.concept2 ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Link2 className="h-3 w-3 mr-1" />
                )}
                Anslut
              </Button>
            )}
          </div>
        </div>

        {/* Sync errors */}
        {(stravaStatus?.error || garminStatus?.error || concept2Status?.error) && (
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
