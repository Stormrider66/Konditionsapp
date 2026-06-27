'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
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
import { useLocale, useTranslations } from '@/i18n/client'

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
type ProviderTone = 'emerald' | 'blue' | 'amber' | 'violet'

const providerToneClasses: Record<ProviderTone, string> = {
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  blue: 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  amber: 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  violet: 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
}

const providerConfig: Record<
  GymProvider,
  { label: string; descriptionKey: GymProviderKey; fields: string[]; provider: string; tone: ProviderTone }
> = {
  ZOEZI: {
    label: 'Zoezi',
    descriptionKey: 'zoezi',
    fields: ['apiKey'],
    provider: 'ZOEZI',
    tone: 'emerald',
  },
  WONDR: {
    label: 'Wondr (BRP)',
    descriptionKey: 'wondr',
    fields: ['apiKey', 'apiSecret', 'siteId'],
    provider: 'WONDR',
    tone: 'blue',
  },
  BOKADIREKT: {
    label: 'Boka Direkt',
    descriptionKey: 'bokaDirekt',
    fields: ['apiKey'],
    provider: 'BOKADIREKT',
    tone: 'amber',
  },
  MINDBODY: {
    label: 'MindBody',
    descriptionKey: 'mindBody',
    fields: ['apiKey', 'siteId'],
    provider: 'MINDBODY',
    tone: 'violet',
  },
}

const providerConfigById = Object.fromEntries(
  Object.entries(providerConfig).map(([provider, config]) => [
    provider,
    config,
  ]),
) as Record<string, (typeof providerConfig)[GymProvider]>

const labelClassName = 'text-sm font-medium text-zinc-700 dark:text-zinc-300'
const inputClassName = 'border-zinc-200 bg-white focus-visible:ring-blue-500 dark:border-white/10 dark:bg-zinc-900'

function formatLastSync(value: string | null, locale: string, neverLabel: string) {
  if (!value) return neverLabel
  return new Date(value).toLocaleTimeString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function GymPlatformSettings() {
  const t = useTranslations('components.settings.coach')
  const locale = useLocale()
  const [connections, setConnections] = useState<GymConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
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
      // keep the current state on transient failures
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchConnections()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchConnections])

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
    <div className="space-y-5">
      {loading ? (
        <RolePanel className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500 dark:text-zinc-400" />
        </RolePanel>
      ) : connections.length > 0 ? (
        <div className="space-y-4">
          {connections.map(conn => {
            const config = providerConfigById[conn.provider]
            const providerTone = config?.tone || 'blue'
            return (
              <RolePanel key={conn.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-md border', providerToneClasses[providerTone])}>
                      <Plug className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-zinc-950 dark:text-zinc-50">{conn.displayName}</h2>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{config?.label || conn.provider}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        conn.isActive
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300'
                      )}
                    >
                      {conn.isActive ? t('integrations.gymPlatforms.status.active') : t('integrations.gymPlatforms.status.inactive')}
                    </Badge>
                    {conn.lastSyncError && (
                      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                        {t('integrations.gymPlatforms.status.error')}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                    <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{conn._count.syncedClasses}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t('integrations.gymPlatforms.stats.syncedClasses')}</p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                    <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{conn._count.syncedBookings}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t('integrations.gymPlatforms.stats.syncedBookings')}</p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                    <p className="flex items-center gap-1 text-sm font-medium text-zinc-950 dark:text-zinc-50">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      {formatLastSync(conn.lastSyncAt, locale, t('integrations.gymPlatforms.stats.never'))}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t('integrations.gymPlatforms.stats.lastSync')}</p>
                  </div>
                </div>

                {conn.lastSyncError && (
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{conn.lastSyncError}</span>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { void triggerSync(conn.id) }}
                    disabled={syncing === conn.id}
                  >
                    {syncing === conn.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RefreshCw className="h-4 w-4" />
                    }
                    {t('integrations.gymPlatforms.actions.syncNow')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => { void deleteConnection(conn.id) }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('integrations.gymPlatforms.actions.remove')}
                  </Button>
                </div>
              </RolePanel>
            )
          })}
        </div>
      ) : (
        <RolePanel className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
            <Plug className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
            {t('integrations.platforms.title')}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {t('integrations.platforms.description')}
          </p>
        </RolePanel>
      )}

      {!showAdd ? (
        <Button onClick={() => setShowAdd(true)} className="w-full" variant="outline">
          <Plus className="h-4 w-4" />
          {t('integrations.gymPlatforms.actions.connect')}
        </Button>
      ) : (
        <RolePanel className="p-5">
          <div className="flex items-center gap-3 border-b border-zinc-200 pb-5 dark:border-white/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <Plug className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {t('integrations.gymPlatforms.actions.connectNew')}
            </h2>
          </div>

          <div className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(providerConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setAddProvider(key)
                    setAddName(config.label)
                    setAddResult(null)
                  }}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-colors',
                    addProvider === key
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/60 dark:hover:border-white/20 dark:hover:bg-zinc-900/70'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-md border', providerToneClasses[config.tone])}>
                      <Plug className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{config.label}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {t(`integrations.gymPlatforms.providers.${config.descriptionKey}.description`)}
                  </p>
                </button>
              ))}
            </div>

            {addProvider && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className={labelClassName}>{t('integrations.gymPlatforms.form.nameLabel')}</label>
                  <Input
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    placeholder={t('integrations.gymPlatforms.form.namePlaceholder')}
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelClassName}>{t('integrations.gymPlatforms.form.apiKeyLabel')}</label>
                  <Input
                    type="password"
                    value={addApiKey}
                    onChange={e => setAddApiKey(e.target.value)}
                    placeholder={t('integrations.gymPlatforms.form.apiKeyPlaceholder')}
                    className={inputClassName}
                  />
                </div>
                {providerConfigById[addProvider]?.fields.includes('apiSecret') && (
                  <div className="space-y-2">
                    <label className={labelClassName}>{t('integrations.gymPlatforms.form.apiSecretLabel')}</label>
                    <Input
                      type="password"
                      value={addApiSecret}
                      onChange={e => setAddApiSecret(e.target.value)}
                      placeholder={t('integrations.gymPlatforms.form.apiSecretPlaceholder')}
                      className={inputClassName}
                    />
                  </div>
                )}
                {providerConfigById[addProvider]?.fields.includes('siteId') && (
                  <div className="space-y-2">
                    <label className={labelClassName}>{t('integrations.gymPlatforms.form.siteIdLabel')}</label>
                    <Input
                      value={addSiteId}
                      onChange={e => setAddSiteId(e.target.value)}
                      placeholder={t('integrations.gymPlatforms.form.siteIdPlaceholder')}
                      className={inputClassName}
                    />
                  </div>
                )}

                {addResult && (
                  <div className={cn(
                    'flex items-start gap-2 rounded-md border p-3 text-sm',
                    addResult.success
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
                  )}>
                    {addResult.success
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    }
                    <span>{addResult.success ? t('integrations.gymPlatforms.connectionSuccess') : addResult.error}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => { void addConnection() }} disabled={adding || !addApiKey}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
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
              </div>
            )}
          </div>
        </RolePanel>
      )}
    </div>
  )
}
