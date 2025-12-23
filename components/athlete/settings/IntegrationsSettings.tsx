'use client'

/**
 * Integrations Settings Component
 *
 * Allows athletes to connect/disconnect Strava and Garmin.
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Link2, Unlink, Activity, Watch, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'

interface IntegrationStatus {
  connected: boolean
  lastSyncAt?: string
  activityCount?: number
  syncEnabled?: boolean
}

interface IntegrationsSettingsProps {
  clientId: string
}

export function IntegrationsSettings({ clientId }: IntegrationsSettingsProps) {
  const { toast } = useToast()
  const [stravaStatus, setStravaStatus] = useState<IntegrationStatus | null>(null)
  const [garminStatus, setGarminStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState({ strava: false, garmin: false })
  const [syncing, setSyncing] = useState({ strava: false, garmin: false })

  const fetchStravaStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/integrations/strava?clientId=${clientId}`)
      const data = await response.json()
      setStravaStatus(data)
    } catch (error) {
      console.error('Failed to fetch Strava status:', error)
    }
  }, [clientId])

  const fetchGarminStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/integrations/garmin?clientId=${clientId}`)
      const data = await response.json()
      if (data.configured === false) {
        setGarminStatus({ connected: false })
      } else {
        setGarminStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch Garmin status:', error)
    }
  }, [clientId])

  // Fetch integration status on mount
  useEffect(() => {
    fetchStravaStatus()
    fetchGarminStatus()
  }, [fetchStravaStatus, fetchGarminStatus])

  const connectStrava = async () => {
    setLoading(prev => ({ ...prev, strava: true }))
    try {
      const response = await fetch('/api/integrations/strava', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte ansluta till Strava',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte ansluta till Strava',
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, strava: false }))
    }
  }

  const disconnectStrava = async () => {
    setLoading(prev => ({ ...prev, strava: true }))
    try {
      const response = await fetch(`/api/integrations/strava?clientId=${clientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setStravaStatus({ connected: false })
        toast({
          title: 'Strava bortkopplad',
          description: 'Din Strava-anslutning har tagits bort',
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte koppla bort Strava',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte koppla bort Strava',
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, strava: false }))
    }
  }

  const syncStrava = async () => {
    setSyncing(prev => ({ ...prev, strava: true }))
    try {
      const response = await fetch('/api/integrations/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, daysBack: 30 }),
      })
      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Synkronisering klar',
          description: `${data.synced || 0} aktiviteter synkroniserade`,
        })
        fetchStravaStatus()
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte synkronisera',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte synkronisera med Strava',
        variant: 'destructive',
      })
    } finally {
      setSyncing(prev => ({ ...prev, strava: false }))
    }
  }

  const connectGarmin = async () => {
    setLoading(prev => ({ ...prev, garmin: true }))
    try {
      const response = await fetch('/api/integrations/garmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte ansluta till Garmin',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte ansluta till Garmin',
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, garmin: false }))
    }
  }

  const disconnectGarmin = async () => {
    setLoading(prev => ({ ...prev, garmin: true }))
    try {
      const response = await fetch(`/api/integrations/garmin?clientId=${clientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setGarminStatus({ connected: false })
        toast({
          title: 'Garmin bortkopplad',
          description: 'Din Garmin-anslutning har tagits bort',
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte koppla bort Garmin',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte koppla bort Garmin',
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, garmin: false }))
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
      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Synkronisering klar',
          description: 'Garmin-data har synkroniserats',
        })
        fetchGarminStatus()
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte synkronisera',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte synkronisera med Garmin',
        variant: 'destructive',
      })
    } finally {
      setSyncing(prev => ({ ...prev, garmin: false }))
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Aldrig'
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Integrationer
        </CardTitle>
        <CardDescription>
          Anslut dina träningsappar för att synkronisera aktiviteter och hälsodata
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strava */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium">Strava</h3>
                <p className="text-sm text-muted-foreground">
                  Synkronisera löpning, cykling och andra aktiviteter
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stravaStatus?.connected ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>

          {stravaStatus?.connected && (
            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
              <p>Senaste synk: {formatDate(stravaStatus.lastSyncAt)}</p>
              {stravaStatus.activityCount !== undefined && (
                <p>{stravaStatus.activityCount} aktiviteter synkade</p>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {stravaStatus?.connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncStrava}
                  disabled={syncing.strava}
                >
                  {syncing.strava ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Synka nu
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectStrava}
                  disabled={loading.strava}
                  className="text-red-600 hover:text-red-700"
                >
                  {loading.strava ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Unlink className="h-4 w-4 mr-2" />
                  )}
                  Koppla bort
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={connectStrava}
                disabled={loading.strava}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {loading.strava ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Anslut Strava
              </Button>
            )}
          </div>
        </div>

        {/* Garmin */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Watch className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Garmin Connect</h3>
                <p className="text-sm text-muted-foreground">
                  Synkronisera HRV, sömn och träningsdata
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {garminStatus?.connected ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>

          {garminStatus?.connected && (
            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
              <p>Senaste synk: {formatDate(garminStatus.lastSyncAt)}</p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {garminStatus?.connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncGarmin}
                  disabled={syncing.garmin}
                >
                  {syncing.garmin ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Synka nu
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectGarmin}
                  disabled={loading.garmin}
                  className="text-red-600 hover:text-red-700"
                >
                  {loading.garmin ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Unlink className="h-4 w-4 mr-2" />
                  )}
                  Koppla bort
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={connectGarmin}
                disabled={loading.garmin}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading.garmin ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Anslut Garmin
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
