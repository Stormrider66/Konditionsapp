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
import { Loader2, Link2, Unlink, Activity, RefreshCw, Waves, Moon, HeartPulse } from 'lucide-react'
import Image from 'next/image'
import { IntegrationsHelpModal } from './IntegrationsHelpModal'
import { useLocale, useTranslations } from '@/i18n/client'

type RecoverySourcePref = 'AUTO' | 'GARMIN' | 'OURA' | 'WHOOP'

interface RecoverySourceState {
  preferred: RecoverySourcePref
  resolved: 'GARMIN' | 'OURA' | 'WHOOP' | null
  connected: { GARMIN: boolean; OURA: boolean; WHOOP: boolean }
}

interface IntegrationStatus {
  connected: boolean
  lastSyncAt?: string
  activityCount?: number
  resultCount?: number
  resultsByType?: Record<string, number>
  syncEnabled?: boolean
}

import {
  GlassCard,
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface IntegrationsSettingsProps {
  clientId: string
  businessSlug?: string
  variant?: 'default' | 'glass'
}

export function IntegrationsSettings({ clientId, businessSlug, variant = 'default' }: IntegrationsSettingsProps) {
  const { toast } = useToast()
  const t = useTranslations('components.integrationsSettings')
  const locale = useLocale()
  const isGlass = variant === 'glass'
  const [stravaStatus, setStravaStatus] = useState<IntegrationStatus | null>(null)
  const [garminStatus, setGarminStatus] = useState<IntegrationStatus | null>(null)
  const [concept2Status, setConcept2Status] = useState<IntegrationStatus | null>(null)
  const [ouraStatus, setOuraStatus] = useState<IntegrationStatus | null>(null)
  const [whoopStatus, setWhoopStatus] = useState<IntegrationStatus | null>(null)
  const [recoverySource, setRecoverySource] = useState<RecoverySourceState | null>(null)
  const [loading, setLoading] = useState({ strava: false, garmin: false, concept2: false, oura: false, whoop: false })
  const [syncing, setSyncing] = useState({ strava: false, garmin: false, concept2: false, oura: false, whoop: false })
  const [savingPref, setSavingPref] = useState(false)

  const CardWrapper = isGlass ? GlassCard : Card;

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

  const fetchConcept2Status = useCallback(async () => {
    try {
      const response = await fetch(`/api/integrations/concept2?clientId=${clientId}`)
      const data = await response.json()
      setConcept2Status(data)
    } catch (error) {
      console.error('Failed to fetch Concept2 status:', error)
    }
  }, [clientId])

  const fetchOuraStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/integrations/oura?clientId=${clientId}`)
      const data = await response.json()
      setOuraStatus(data)
    } catch (error) {
      console.error('Failed to fetch Oura status:', error)
    }
  }, [clientId])

  const fetchWhoopStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/integrations/whoop?clientId=${clientId}`)
      const data = await response.json()
      if (data.configured === false) {
        setWhoopStatus({ connected: false })
      } else {
        setWhoopStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch WHOOP status:', error)
    }
  }, [clientId])

  const fetchRecoverySource = useCallback(async () => {
    try {
      const response = await fetch(`/api/integrations/recovery-source?clientId=${clientId}`)
      const data = await response.json()
      setRecoverySource(data)
    } catch (error) {
      console.error('Failed to fetch recovery source:', error)
    }
  }, [clientId])

  // Fetch integration status on mount
  useEffect(() => {
    void fetchStravaStatus()
    void fetchGarminStatus()
    void fetchConcept2Status()
    void fetchOuraStatus()
    void fetchWhoopStatus()
    void fetchRecoverySource()
  }, [fetchStravaStatus, fetchGarminStatus, fetchConcept2Status, fetchOuraStatus, fetchWhoopStatus, fetchRecoverySource])

  const connectStrava = async () => {
    setLoading(prev => ({ ...prev, strava: true }))
    try {
      const response = await fetch('/api/integrations/strava', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, businessSlug }),
      })
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.connectError', { service: 'Strava' }),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.connectError', { service: 'Strava' }),
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
          title: t('toast.disconnectedTitle', { service: 'Strava' }),
          description: t('toast.disconnectedDescription', { service: 'Strava' }),
        })
      } else {
        const data = await response.json()
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.disconnectError', { service: 'Strava' }),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.disconnectError', { service: 'Strava' }),
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
          title: t('toast.syncComplete'),
          description: t('toast.activitiesSynced', { count: data.synced || 0 }),
        })
        void fetchStravaStatus()
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.syncError'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.syncWithServiceError', { service: 'Strava' }),
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
        body: JSON.stringify({ clientId, businessSlug }),
      })
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.connectError', { service: 'Garmin' }),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.connectError', { service: 'Garmin' }),
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
        void fetchRecoverySource()
        toast({
          title: t('toast.disconnectedTitle', { service: 'Garmin' }),
          description: t('toast.disconnectedDescription', { service: 'Garmin' }),
        })
      } else {
        const data = await response.json()
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.disconnectError', { service: 'Garmin' }),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.disconnectError', { service: 'Garmin' }),
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
          title: t('toast.syncRequestSent'),
          description: t('toast.garminPushDescription'),
        })
        void fetchGarminStatus()
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.syncError'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.syncWithServiceError', { service: 'Garmin' }),
        variant: 'destructive',
      })
    } finally {
      setSyncing(prev => ({ ...prev, garmin: false }))
    }
  }

  const connectConcept2 = async () => {
    setLoading(prev => ({ ...prev, concept2: true }))
    try {
      const response = await fetch('/api/integrations/concept2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, businessSlug }),
      })
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.connectError', { service: 'Concept2' }),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.connectError', { service: 'Concept2' }),
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, concept2: false }))
    }
  }

  const disconnectConcept2 = async () => {
    setLoading(prev => ({ ...prev, concept2: true }))
    try {
      const response = await fetch(`/api/integrations/concept2?clientId=${clientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConcept2Status({ connected: false })
        toast({
          title: t('toast.disconnectedTitle', { service: 'Concept2' }),
          description: t('toast.concept2DisconnectedDescription'),
        })
      } else {
        const data = await response.json()
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.disconnectError', { service: 'Concept2' }),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.disconnectError', { service: 'Concept2' }),
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, concept2: false }))
    }
  }

  const syncConcept2 = async () => {
    setSyncing(prev => ({ ...prev, concept2: true }))
    try {
      const response = await fetch('/api/integrations/concept2/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, daysBack: 90 }),
      })
      const data = await response.json()

      if (response.ok) {
        toast({
          title: t('toast.syncComplete'),
          description: t('toast.workoutsSynced', { count: data.synced || 0 }),
        })
        void fetchConcept2Status()
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.syncError'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.syncWithServiceError', { service: 'Concept2' }),
        variant: 'destructive',
      })
    } finally {
      setSyncing(prev => ({ ...prev, concept2: false }))
    }
  }

  const connectOura = async () => {
    setLoading(prev => ({ ...prev, oura: true }))
    try {
      const response = await fetch('/api/integrations/oura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, businessSlug }),
      })
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.connectError', { service: 'Oura' }),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.connectError', { service: 'Oura' }),
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, oura: false }))
    }
  }

  const disconnectOura = async () => {
    setLoading(prev => ({ ...prev, oura: true }))
    try {
      const response = await fetch(`/api/integrations/oura?clientId=${clientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setOuraStatus({ connected: false })
        void fetchRecoverySource()
        toast({
          title: t('toast.disconnectedTitle', { service: 'Oura' }),
          description: t('toast.ouraDisconnectedDescription'),
        })
      } else {
        const data = await response.json()
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.disconnectError', { service: 'Oura' }),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.disconnectError', { service: 'Oura' }),
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, oura: false }))
    }
  }

  const syncOura = async () => {
    setSyncing(prev => ({ ...prev, oura: true }))
    try {
      const response = await fetch('/api/integrations/oura/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, daysBack: 3 }),
      })
      const data = await response.json()

      if (response.ok) {
        toast({
          title: t('toast.syncComplete'),
          description: t('toast.daysUpdated', { count: data.synced || 0 }),
        })
        void fetchOuraStatus()
        void fetchRecoverySource()
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.syncError'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.syncWithServiceError', { service: 'Oura' }),
        variant: 'destructive',
      })
    } finally {
      setSyncing(prev => ({ ...prev, oura: false }))
    }
  }

  const connectWhoop = async () => {
    setLoading(prev => ({ ...prev, whoop: true }))
    try {
      const response = await fetch('/api/integrations/whoop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, businessSlug }),
      })
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.connectError', { service: 'WHOOP' }),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.connectError', { service: 'WHOOP' }),
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, whoop: false }))
    }
  }

  const disconnectWhoop = async () => {
    setLoading(prev => ({ ...prev, whoop: true }))
    try {
      const response = await fetch(`/api/integrations/whoop?clientId=${clientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setWhoopStatus({ connected: false })
        void fetchRecoverySource()
        toast({
          title: t('toast.disconnectedTitle', { service: 'WHOOP' }),
          description: t('toast.whoopDisconnectedDescription'),
        })
      } else {
        const data = await response.json()
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.disconnectError', { service: 'WHOOP' }),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.disconnectError', { service: 'WHOOP' }),
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, whoop: false }))
    }
  }

  const syncWhoop = async () => {
    setSyncing(prev => ({ ...prev, whoop: true }))
    try {
      const response = await fetch('/api/integrations/whoop/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, daysBack: 7 }),
      })
      const data = await response.json()

      if (response.ok) {
        toast({
          title: t('toast.syncComplete'),
          description: t('toast.whoopSyncComplete', { count: data.synced || 0, workouts: data.workoutsSynced || 0 }),
        })
        void fetchWhoopStatus()
        void fetchRecoverySource()
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.syncError'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.syncWithServiceError', { service: 'WHOOP' }),
        variant: 'destructive',
      })
    } finally {
      setSyncing(prev => ({ ...prev, whoop: false }))
    }
  }

  const setRecoveryPreference = async (source: RecoverySourcePref) => {
    setSavingPref(true)
    try {
      const response = await fetch('/api/integrations/recovery-source', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, source }),
      })
      const data = await response.json()

      if (response.ok) {
        setRecoverySource(prev =>
          prev ? { ...prev, preferred: source, resolved: data.resolved } : prev,
        )
        toast({
          title: t('toast.recoverySourceUpdated'),
          description:
            source === 'AUTO'
              ? t('toast.recoverySourceAuto')
              : t('toast.recoverySourceManual', { service: recoveryServiceName(source) }),
        })
      } else {
        toast({
          title: t('toast.errorTitle'),
          description: data.error || t('toast.updateError'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.recoverySourceUpdateError'),
        variant: 'destructive',
      })
    } finally {
      setSavingPref(false)
    }
  }

  const recoveryServiceName = (source: Exclude<RecoverySourcePref, 'AUTO'>) => {
    if (source === 'OURA') return 'Oura'
    if (source === 'WHOOP') return 'WHOOP'
    return 'Garmin'
  }

  const connectedRecoveryOptions = recoverySource
    ? (['GARMIN', 'OURA', 'WHOOP'] as const).filter(source => recoverySource.connected[source])
    : []
  const recoveryPreferenceOptions: RecoverySourcePref[] = ['AUTO', ...connectedRecoveryOptions]

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('never')
    return new Date(dateString).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <CardWrapper>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={cn("flex items-center gap-2", isGlass ? "text-white font-black uppercase italic tracking-tight" : "")}>
            <Link2 className={cn("h-5 w-5", isGlass ? "text-blue-500" : "")} />
            {t('title')}
          </CardTitle>
          <IntegrationsHelpModal />
        </div>
        <CardDescription className={cn(isGlass ? "text-slate-500 font-medium" : "")}>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recovery source picker — appears when at least two recovery wearables are connected */}
        {connectedRecoveryOptions.length > 1 && recoverySource && (
          <div className={cn(
            "rounded-xl p-4 transition-all duration-300",
            isGlass ? "bg-white/[0.02] border border-white/5" : "border bg-slate-50"
          )}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className={cn(
                  "font-black uppercase italic tracking-tight text-sm",
                  isGlass ? "text-white" : "text-slate-900"
                )}>
                  {t('recovery.title')}
                </h3>
                <p className={cn(
                  "text-xs mt-1",
                  isGlass ? "text-slate-400" : "text-muted-foreground"
                )}>
                  {t('recovery.description')}
                  {recoverySource.resolved && (
                    <>{' '}
                      <span className={cn("font-semibold", isGlass ? "text-emerald-400" : "text-emerald-600")}>
                        {t('recovery.active', { service: recoveryServiceName(recoverySource.resolved) })}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {recoveryPreferenceOptions.map(opt => (
                  <Button
                    key={opt}
                    size="sm"
                    variant={recoverySource.preferred === opt ? 'default' : 'outline'}
                    onClick={() => setRecoveryPreference(opt)}
                    disabled={savingPref}
                    className={cn(
                      "h-8 text-[10px] font-black uppercase tracking-widest",
                      isGlass && recoverySource.preferred !== opt && "border-white/10 text-white hover:bg-white/10",
                    )}
                  >
                    {opt === 'AUTO' ? 'Auto' : recoveryServiceName(opt)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Strava */}
        <div className={cn(
          "rounded-xl p-4 transition-all duration-300",
          isGlass ? "bg-white/[0.02] border border-white/5 hover:bg-white/5" : "border"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isGlass ? "bg-orange-500/10 border border-orange-500/20" : "bg-orange-100"
              )}>
                <Activity className={cn("h-5 w-5", isGlass ? "text-orange-400" : "text-orange-600")} />
              </div>
              <div>
                <h3 className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-white" : "text-slate-900")}>Strava</h3>
                <p className={cn("text-xs", isGlass ? "text-slate-500" : "text-muted-foreground")}>
                  {t('services.strava.description')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stravaStatus?.connected ? (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  {t('status.connected')}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  {t('status.disconnected')}
                </div>
              )}
            </div>
          </div>

          {stravaStatus?.connected && (
            <div className={cn(
              "mt-3 pt-3 border-t text-[10px] font-black uppercase tracking-widest",
              isGlass ? "border-white/5 text-slate-500" : "text-muted-foreground"
            )}>
              <p>{t('lastSync', { date: formatDate(stravaStatus.lastSyncAt) })}</p>
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
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest", isGlass ? "border-white/10 text-white hover:bg-white/10" : "")}
                >
                  {syncing.strava ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  )}
                  {t('actions.syncNow')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnectStrava}
                  disabled={loading.strava}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-500/10")}
                >
                  {loading.strava ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <Unlink className="h-3.5 w-3.5 mr-2" />
                  )}
                  {t('actions.disconnect')}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={connectStrava}
                disabled={loading.strava}
                className={cn(
                  "h-9 text-[11px] font-black uppercase tracking-widest",
                  isGlass ? "bg-orange-600 hover:bg-orange-700 text-white border-0" : "bg-orange-600 hover:bg-orange-700"
                )}
              >
                {loading.strava ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-3.5 w-3.5 mr-2" />
                )}
                {t('actions.connect', { service: 'Strava' })}
              </Button>
            )}
          </div>
        </div>

        {/* Garmin */}
        <div className={cn(
          "rounded-xl p-4 transition-all duration-300",
          isGlass ? "bg-white/[0.02] border border-white/5 hover:bg-white/5" : "border"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden",
                isGlass ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-100"
              )}>
                <Image
                  src="/garmin-connect-icon.png"
                  alt="Garmin Connect"
                  width={32}
                  height={32}
                  className="object-contain rounded-md"
                  unoptimized
                />
              </div>
              <div>
                <h3 className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-white" : "text-slate-900")}>Garmin Connect&trade;</h3>
                <p className={cn("text-xs", isGlass ? "text-slate-500" : "text-muted-foreground")}>
                  {t('services.garmin.description')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {garminStatus?.connected ? (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  {t('status.connected')}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  {t('status.disconnected')}
                </div>
              )}
            </div>
          </div>

          {garminStatus?.connected && (
            <div className={cn(
              "mt-3 pt-3 border-t text-[10px] font-black uppercase tracking-widest",
              isGlass ? "border-white/5 text-slate-500" : "text-muted-foreground"
            )}>
              <p>{t('lastSync', { date: formatDate(garminStatus.lastSyncAt) })}</p>
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
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest", isGlass ? "border-white/10 text-white hover:bg-white/10" : "")}
                >
                  {syncing.garmin ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  )}
                  {t('actions.syncNow')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnectGarmin}
                  disabled={loading.garmin}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-500/10")}
                >
                  {loading.garmin ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <Unlink className="h-3.5 w-3.5 mr-2" />
                  )}
                  {t('actions.disconnect')}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={connectGarmin}
                disabled={loading.garmin}
                className={cn(
                  "h-9 text-[11px] font-black uppercase tracking-widest",
                  isGlass ? "bg-blue-600 hover:bg-blue-700 text-white border-0" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {loading.garmin ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-3.5 w-3.5 mr-2" />
                )}
                {t('actions.connect', { service: 'Garmin Connect' })}
              </Button>
            )}
          </div>
        </div>

        {/* Concept2 */}
        <div className={cn(
          "rounded-xl p-4 transition-all duration-300",
          isGlass ? "bg-white/[0.02] border border-white/5 hover:bg-white/5" : "border"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isGlass ? "bg-cyan-500/10 border border-cyan-500/20" : "bg-cyan-100"
              )}>
                <Waves className={cn("h-5 w-5", isGlass ? "text-cyan-400" : "text-cyan-600")} />
              </div>
              <div>
                <h3 className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-white" : "text-slate-900")}>Concept2</h3>
                <p className={cn("text-xs", isGlass ? "text-slate-500" : "text-muted-foreground")}>
                  {t('services.concept2.description')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {concept2Status?.connected ? (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  {t('status.connected')}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  {t('status.disconnected')}
                </div>
              )}
            </div>
          </div>

          {concept2Status?.connected && (
            <div className={cn(
              "mt-3 pt-3 border-t",
              isGlass ? "border-white/5" : ""
            )}>
              <div className="flex items-center justify-between">
                <div className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isGlass ? "text-slate-500" : "text-muted-foreground"
                )}>
                  <p>{t('lastSync', { date: formatDate(concept2Status.lastSyncAt) })}</p>
                </div>
                {concept2Status.resultCount !== undefined && concept2Status.resultCount > 0 && (
                  <div className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    isGlass ? "text-cyan-400" : "text-cyan-600"
                  )}>
                    {t('workoutCount', { count: concept2Status.resultCount })}
                  </div>
                )}
              </div>
              {concept2Status.resultsByType && Object.keys(concept2Status.resultsByType).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(concept2Status.resultsByType).map(([type, count]) => (
                    <span
                      key={type}
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                        isGlass
                          ? "bg-white/5 text-slate-400 border border-white/10"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {type === 'rower' ? t('resultTypes.rower') : type === 'skierg' ? 'SkiErg' : type === 'bike' ? 'BikeErg' : type}: {count as number}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {concept2Status?.connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncConcept2}
                  disabled={syncing.concept2}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest", isGlass ? "border-white/10 text-white hover:bg-white/10" : "")}
                >
                  {syncing.concept2 ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  )}
                  {t('actions.syncNow')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnectConcept2}
                  disabled={loading.concept2}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-500/10")}
                >
                  {loading.concept2 ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <Unlink className="h-3.5 w-3.5 mr-2" />
                  )}
                  {t('actions.disconnect')}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={connectConcept2}
                disabled={loading.concept2}
                className={cn(
                  "h-9 text-[11px] font-black uppercase tracking-widest",
                  isGlass ? "bg-cyan-600 hover:bg-cyan-700 text-white border-0" : "bg-cyan-600 hover:bg-cyan-700"
                )}
              >
                {loading.concept2 ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-3.5 w-3.5 mr-2" />
                )}
                {t('actions.connect', { service: 'Concept2' })}
              </Button>
            )}
          </div>
        </div>

        {/* Oura */}
        <div className={cn(
          "rounded-xl p-4 transition-all duration-300",
          isGlass ? "bg-white/[0.02] border border-white/5 hover:bg-white/5" : "border"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isGlass ? "bg-violet-500/10 border border-violet-500/20" : "bg-violet-100"
              )}>
                <Moon className={cn("h-5 w-5", isGlass ? "text-violet-400" : "text-violet-600")} />
              </div>
              <div>
                <h3 className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-white" : "text-slate-900")}>Oura Ring</h3>
                <p className={cn("text-xs", isGlass ? "text-slate-500" : "text-muted-foreground")}>
                  {t('services.oura.description')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ouraStatus?.connected ? (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  {t('status.connected')}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  {t('status.disconnected')}
                </div>
              )}
            </div>
          </div>

          {ouraStatus?.connected && (
            <div className={cn(
              "mt-3 pt-3 border-t text-[10px] font-black uppercase tracking-widest",
              isGlass ? "border-white/5 text-slate-500" : "text-muted-foreground"
            )}>
              <p>{t('lastSync', { date: formatDate(ouraStatus.lastSyncAt) })}</p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {ouraStatus?.connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncOura}
                  disabled={syncing.oura}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest", isGlass ? "border-white/10 text-white hover:bg-white/10" : "")}
                >
                  {syncing.oura ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  )}
                  {t('actions.syncNow')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnectOura}
                  disabled={loading.oura}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-500/10")}
                >
                  {loading.oura ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <Unlink className="h-3.5 w-3.5 mr-2" />
                  )}
                  {t('actions.disconnect')}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={connectOura}
                disabled={loading.oura}
                className={cn(
                  "h-9 text-[11px] font-black uppercase tracking-widest",
                  isGlass ? "bg-violet-600 hover:bg-violet-700 text-white border-0" : "bg-violet-600 hover:bg-violet-700"
                )}
              >
                {loading.oura ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-3.5 w-3.5 mr-2" />
                )}
                {t('actions.connect', { service: 'Oura Ring' })}
              </Button>
            )}
          </div>
        </div>

        {/* WHOOP */}
        <div className={cn(
          "rounded-xl p-4 transition-all duration-300",
          isGlass ? "bg-white/[0.02] border border-white/5 hover:bg-white/5" : "border"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isGlass ? "bg-rose-500/10 border border-rose-500/20" : "bg-rose-100"
              )}>
                <HeartPulse className={cn("h-5 w-5", isGlass ? "text-rose-400" : "text-rose-600")} />
              </div>
              <div>
                <h3 className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-white" : "text-slate-900")}>WHOOP</h3>
                <p className={cn("text-xs", isGlass ? "text-slate-500" : "text-muted-foreground")}>
                  {t('services.whoop.description')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {whoopStatus?.connected ? (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  {t('status.connected')}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  {t('status.disconnected')}
                </div>
              )}
            </div>
          </div>

          {whoopStatus?.connected && (
            <div className={cn(
              "mt-3 pt-3 border-t",
              isGlass ? "border-white/5" : ""
            )}>
              <div className="flex items-center justify-between">
                <div className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isGlass ? "text-slate-500" : "text-muted-foreground"
                )}>
                  <p>{t('lastSync', { date: formatDate(whoopStatus.lastSyncAt) })}</p>
                </div>
                {whoopStatus.activityCount !== undefined && whoopStatus.activityCount > 0 && (
                  <div className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    isGlass ? "text-rose-400" : "text-rose-600"
                  )}>
                    {t('workoutCount', { count: whoopStatus.activityCount })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {whoopStatus?.connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncWhoop}
                  disabled={syncing.whoop}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest", isGlass ? "border-white/10 text-white hover:bg-white/10" : "")}
                >
                  {syncing.whoop ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  )}
                  {t('actions.syncNow')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnectWhoop}
                  disabled={loading.whoop}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-500/10")}
                >
                  {loading.whoop ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <Unlink className="h-3.5 w-3.5 mr-2" />
                  )}
                  {t('actions.disconnect')}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={connectWhoop}
                disabled={loading.whoop}
                className={cn(
                  "h-9 text-[11px] font-black uppercase tracking-widest",
                  isGlass ? "bg-rose-600 hover:bg-rose-700 text-white border-0" : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                {loading.whoop ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-3.5 w-3.5 mr-2" />
                )}
                {t('actions.connect', { service: 'WHOOP' })}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </CardWrapper>
  )
}
