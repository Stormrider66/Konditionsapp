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
import { Loader2, Link2, Unlink, Activity, Watch, RefreshCw, CheckCircle2, XCircle, Waves } from 'lucide-react'
import { IntegrationsHelpModal } from './IntegrationsHelpModal'

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
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface IntegrationsSettingsProps {
  clientId: string
  businessSlug?: string
  variant?: 'default' | 'glass'
}

export function IntegrationsSettings({ clientId, businessSlug, variant = 'default' }: IntegrationsSettingsProps) {
  const { toast } = useToast()
  const isGlass = variant === 'glass'
  const [stravaStatus, setStravaStatus] = useState<IntegrationStatus | null>(null)
  const [garminStatus, setGarminStatus] = useState<IntegrationStatus | null>(null)
  const [concept2Status, setConcept2Status] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState({ strava: false, garmin: false, concept2: false })
  const [syncing, setSyncing] = useState({ strava: false, garmin: false, concept2: false })

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

  // Fetch integration status on mount
  useEffect(() => {
    fetchStravaStatus()
    fetchGarminStatus()
    fetchConcept2Status()
  }, [fetchStravaStatus, fetchGarminStatus, fetchConcept2Status])

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
        body: JSON.stringify({ clientId, businessSlug }),
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
          title: 'Fel',
          description: data.error || 'Kunde inte ansluta till Concept2',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte ansluta till Concept2',
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
          title: 'Concept2 bortkopplad',
          description: 'Din Concept2-anslutning har tagits bort. Historiska resultat bevaras.',
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte koppla bort Concept2',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte koppla bort Concept2',
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
          title: 'Synkronisering klar',
          description: `${data.synced || 0} träningspass synkroniserade`,
        })
        fetchConcept2Status()
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
        description: 'Kunde inte synkronisera med Concept2',
        variant: 'destructive',
      })
    } finally {
      setSyncing(prev => ({ ...prev, concept2: false }))
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
    <CardWrapper>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={cn("flex items-center gap-2", isGlass ? "text-white font-black uppercase italic tracking-tight" : "")}>
            <Link2 className={cn("h-5 w-5", isGlass ? "text-blue-500" : "")} />
            Integrationer
          </CardTitle>
          <IntegrationsHelpModal />
        </div>
        <CardDescription className={cn(isGlass ? "text-slate-500 font-medium" : "")}>
          Anslut dina träningsappar för att synkronisera aktiviteter och hälsodata
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  Synkronisera löpning och cykling
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stravaStatus?.connected ? (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  Ansluten
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  Frånkopplad
                </div>
              )}
            </div>
          </div>

          {stravaStatus?.connected && (
            <div className={cn(
              "mt-3 pt-3 border-t text-[10px] font-black uppercase tracking-widest",
              isGlass ? "border-white/5 text-slate-500" : "text-muted-foreground"
            )}>
              <p>Senaste synk: {formatDate(stravaStatus.lastSyncAt)}</p>
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
                  Synka nu
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
                  Koppla bort
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
                Anslut Strava
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
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isGlass ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-100"
              )}>
                <Watch className={cn("h-5 w-5", isGlass ? "text-blue-400" : "text-blue-600")} />
              </div>
              <div>
                <h3 className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-white" : "text-slate-900")}>Garmin</h3>
                <p className={cn("text-xs", isGlass ? "text-slate-500" : "text-muted-foreground")}>
                  Synkronisera HRV och sömn
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {garminStatus?.connected ? (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  Ansluten
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  Frånkopplad
                </div>
              )}
            </div>
          </div>

          {garminStatus?.connected && (
            <div className={cn(
              "mt-3 pt-3 border-t text-[10px] font-black uppercase tracking-widest",
              isGlass ? "border-white/5 text-slate-500" : "text-muted-foreground"
            )}>
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
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest", isGlass ? "border-white/10 text-white hover:bg-white/10" : "")}
                >
                  {syncing.garmin ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  )}
                  Synka nu
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
                  Koppla bort
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
                Anslut Garmin
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
                  Synkronisera roddpass
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {concept2Status?.connected ? (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  Ansluten
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  Frånkopplad
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
                  <p>Senaste synk: {formatDate(concept2Status.lastSyncAt)}</p>
                </div>
                {concept2Status.resultCount !== undefined && concept2Status.resultCount > 0 && (
                  <div className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    isGlass ? "text-cyan-400" : "text-cyan-600"
                  )}>
                    {concept2Status.resultCount} pass
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
                      {type === 'rower' ? 'Rodd' : type === 'skierg' ? 'SkiErg' : type === 'bike' ? 'BikeErg' : type}: {count as number}
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
                  Synka nu
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
                  Koppla bort
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
                Anslut Concept2
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </CardWrapper>
  )
}
