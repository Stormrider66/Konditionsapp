'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Plus,
  Plug,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

interface GymConnection {
  id: string
  provider: string
  displayName: string
  siteId: string | null
  syncClasses: boolean
  syncBookings: boolean
  pushWorkouts: boolean
  syncInterval: number
  isActive: boolean
  lastSyncAt: string | null
  lastSyncError: string | null
  lastSyncStats: Record<string, unknown> | null
  _count: { syncedClasses: number; syncedBookings: number }
}

type GymProvider = 'ZOEZI' | 'WONDR' | 'BOKADIREKT' | 'MINDBODY'
type GymProviderKey = 'zoezi' | 'wondr' | 'bokaDirekt' | 'mindBody'

const providerConfig: Record<
  GymProvider,
  { label: string; icon: string; descriptionKey: GymProviderKey; fields: string[]; provider: string }
> = {
  ZOEZI: {
    label: 'Zoezi',
    icon: '🟢',
    descriptionKey: 'zoezi',
    fields: ['apiKey'],
    provider: 'ZOEZI',
  },
  WONDR: {
    label: 'Wondr (BRP)',
    icon: '🔵',
    descriptionKey: 'wondr',
    fields: ['apiKey', 'apiSecret', 'siteId'],
    provider: 'WONDR',
  },
  BOKADIREKT: {
    label: 'Boka Direkt',
    icon: '🟠',
    descriptionKey: 'bokaDirekt',
    fields: ['apiKey'],
    provider: 'BOKADIREKT',
  },
  MINDBODY: {
    label: 'MindBody',
    icon: '🟣',
    descriptionKey: 'mindBody',
    fields: ['apiKey', 'siteId'],
    provider: 'MINDBODY',
  },
}

const providerConfigById = Object.fromEntries(
  Object.entries(providerConfig).map(([provider, config]) => [
    provider,
    config,
  ]),
) as Record<string, (typeof providerConfig)[GymProvider]>

export function GymPlatformSettings() {
  const t = useTranslations('components.settings.coach')
  const [connections, setConnections] = useState<GymConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [addProvider, setAddProvider] = useState('')
  const [addName, setAddName] = useState('')
  const [addApiKey, setAddApiKey] = useState('')
  const [addApiSecret, setAddApiSecret] = useState('')
  const [addSiteId, setAddSiteId] = useState('')
  const [adding, setAdding] = useState(false)
  const [addResult, setAddResult] = useState<{ success: boolean; error?: string } | null>(null)

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/gym-platform')
      if (res.ok) setConnections((await res.json()).connections || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchConnections() }, [fetchConnections])

  const addConnection = async () => {
    if (!addProvider || !addApiKey) return
    setAdding(true)
    setAddResult(null)
    try {
      const res = await fetch('/api/coach/gym-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: addProvider,
          displayName: addName || providerConfigById[addProvider]?.label || addProvider,
          apiKey: addApiKey,
          apiSecret: addApiSecret || undefined,
          siteId: addSiteId || undefined,
        }),
      })
      const data = await res.json()
      setAddResult(data.testResult)
      if (res.ok) {
        void fetchConnections()
        if (data.testResult?.success) {
          setShowAdd(false)
          setAddProvider('')
          setAddName('')
          setAddApiKey('')
          setAddApiSecret('')
          setAddSiteId('')
        }
      }
    } catch {
      setAddResult({ success: false, error: t('integrations.gymPlatforms.errors.networkError') })
    } finally {
      setAdding(false)
    }
  }

  const triggerSync = async (connectionId: string) => {
    setSyncing(connectionId)
    try {
      await fetch('/api/coach/gym-platform/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })
      void fetchConnections()
    } catch {
      // ignore
    } finally {
      setSyncing(null)
    }
  }

  const deleteConnection = async (id: string) => {
    try {
      await fetch('/api/coach/gym-platform', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      void fetchConnections()
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing connections */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {connections.map(conn => {
            const config = providerConfigById[conn.provider]
            const glowColor = conn.provider === 'ZOEZI' ? 'emerald' : conn.provider === 'WONDR' ? 'blue' : conn.provider === 'BOKADIREKT' ? 'amber' : conn.provider === 'MINDBODY' ? 'purple' : 'blue'
            return (
              <GlassCard key={conn.id} glow={glowColor} className="mb-4">
                  <GlassCardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config?.icon || '📱'}</span>
                        <div>
                          <GlassCardTitle className="text-base">{conn.displayName}</GlassCardTitle>
                          <GlassCardDescription>{config?.label || conn.provider}</GlassCardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={conn.isActive ? 'default' : 'secondary'}>
                          {conn.isActive ? t('integrations.gymPlatforms.status.active') : t('integrations.gymPlatforms.status.inactive')}
                        </Badge>
                        {conn.lastSyncError && (
                          <Badge variant="destructive" className="text-xs">
                            {t('integrations.gymPlatforms.status.error')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{conn._count.syncedClasses}</p>
                      <p className="text-xs text-muted-foreground">{t('integrations.gymPlatforms.stats.syncedClasses')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{conn._count.syncedBookings}</p>
                      <p className="text-xs text-muted-foreground">{t('integrations.gymPlatforms.stats.syncedBookings')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        {conn.lastSyncAt
                          ? new Date(conn.lastSyncAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
                          : t('integrations.gymPlatforms.stats.never')
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">{t('integrations.gymPlatforms.stats.lastSync')}</p>
                    </div>
                  </div>

                  {/* Error */}
                  {conn.lastSyncError && (
                    <div className="p-2 rounded bg-red-50 dark:bg-red-900/10 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {conn.lastSyncError}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { void triggerSync(conn.id) }}
                      disabled={syncing === conn.id}
                    >
                      {syncing === conn.id
                        ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        : <RefreshCw className="h-3 w-3 mr-1" />
                      }
                      {t('integrations.gymPlatforms.actions.syncNow')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => { void deleteConnection(conn.id) }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> {t('integrations.gymPlatforms.actions.remove')}
                    </Button>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )
          })}
        </>
      )}

      {/* Add new connection */}
      {!showAdd ? (
        <Button onClick={() => setShowAdd(true)} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" /> {t('integrations.gymPlatforms.actions.connect')}
        </Button>
      ) : (
        <GlassCard glow="blue">
          <GlassCardHeader>
            <GlassCardTitle className="text-lg flex items-center gap-2">
              <Plug className="h-5 w-5" /> {t('integrations.gymPlatforms.actions.connectNew')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            {/* Platform selection */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(providerConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setAddProvider(key)
                    setAddName(config.label)
                    setAddResult(null)
                  }}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    addProvider === key
                      ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10'
                      : 'border-slate-200/50 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{config.icon}</span>
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(`integrations.gymPlatforms.providers.${config.descriptionKey}.description`)}
                  </p>
                </button>
              ))}
            </div>

            {addProvider && (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">{t('integrations.gymPlatforms.form.nameLabel')}</label>
                    <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder={t('integrations.gymPlatforms.form.namePlaceholder')} className="bg-white/50 dark:bg-white/5 border-slate-200/50 dark:border-white/10 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('integrations.gymPlatforms.form.apiKeyLabel')}</label>
                    <Input
                      type="password"
                      value={addApiKey}
                      onChange={e => setAddApiKey(e.target.value)}
                      placeholder={t('integrations.gymPlatforms.form.apiKeyPlaceholder')}
                      className="bg-white/50 dark:bg-white/5 border-slate-200/50 dark:border-white/10 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {providerConfigById[addProvider]?.fields.includes('apiSecret') && (
                    <div>
                      <label className="text-sm font-medium">{t('integrations.gymPlatforms.form.apiSecretLabel')}</label>
                      <Input
                        type="password"
                        value={addApiSecret}
                        onChange={e => setAddApiSecret(e.target.value)}
                        placeholder={t('integrations.gymPlatforms.form.apiSecretPlaceholder')}
                        className="bg-white/50 dark:bg-white/5 border-slate-200/50 dark:border-white/10 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                  {providerConfigById[addProvider]?.fields.includes('siteId') && (
                    <div>
                      <label className="text-sm font-medium">{t('integrations.gymPlatforms.form.siteIdLabel')}</label>
                      <Input value={addSiteId} onChange={e => setAddSiteId(e.target.value)} placeholder={t('integrations.gymPlatforms.form.siteIdPlaceholder')} className="bg-white/50 dark:bg-white/5 border-slate-200/50 dark:border-white/10 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  )}
                </div>

                {addResult && (
                  <div className={cn(
                    'p-3 rounded-lg text-sm flex items-start gap-2',
                    addResult.success
                      ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400'
                  )}>
                    {addResult.success
                      ? <CheckCircle2 className="h-4 w-4 mt-0.5" />
                      : <AlertCircle className="h-4 w-4 mt-0.5" />
                    }
                    {addResult.success ? t('integrations.gymPlatforms.connectionSuccess') : addResult.error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => { void addConnection() }} disabled={adding || !addApiKey}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
                    {t('integrations.gymPlatforms.actions.testAndConnect')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAdd(false)
                      setAddProvider('')
                      setAddResult(null)
                    }}
                  >
                    {t('integrations.gymPlatforms.actions.cancel')}
                  </Button>
                </div>
              </>
            )}
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}
