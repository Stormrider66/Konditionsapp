'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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

const providerConfig: Record<string, { label: string; icon: string; description: string; fields: string[] }> = {
  ZOEZI: {
    label: 'Zoezi',
    icon: '🟢',
    description: 'Affärssystem för friskvårdsbranschen. Synka klasser och bokningar.',
    fields: ['apiKey'],
  },
  WONDR: {
    label: 'Wondr (BRP)',
    icon: '🔵',
    description: 'Används av SATS, Nordic Wellness m.fl. Kräver partneravtal.',
    fields: ['apiKey', 'apiSecret', 'siteId'],
  },
  BOKADIREKT: {
    label: 'Boka Direkt',
    icon: '🟠',
    description: 'Bokningsplattform för PT-sessioner. API i premiumplan.',
    fields: ['apiKey'],
  },
  MINDBODY: {
    label: 'MindBody',
    icon: '🟣',
    description: 'Internationell gymsystem. Gratis under 5 000 API-anrop/cykel.',
    fields: ['apiKey', 'siteId'],
  },
}

export function GymPlatformSettings() {
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

  useEffect(() => { fetchConnections() }, [fetchConnections])

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
          displayName: addName || providerConfig[addProvider]?.label || addProvider,
          apiKey: addApiKey,
          apiSecret: addApiSecret || undefined,
          siteId: addSiteId || undefined,
        }),
      })
      const data = await res.json()
      setAddResult(data.testResult)
      if (res.ok) {
        fetchConnections()
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
      setAddResult({ success: false, error: 'Nätverksfel' })
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
      fetchConnections()
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
      fetchConnections()
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
            const config = providerConfig[conn.provider]
            return (
              <Card key={conn.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config?.icon || '📱'}</span>
                      <div>
                        <CardTitle className="text-base">{conn.displayName}</CardTitle>
                        <CardDescription>{config?.label || conn.provider}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={conn.isActive ? 'default' : 'secondary'}>
                        {conn.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                      {conn.lastSyncError && (
                        <Badge variant="destructive" className="text-xs">Fel</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{conn._count.syncedClasses}</p>
                      <p className="text-xs text-muted-foreground">Synkade klasser</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{conn._count.syncedBookings}</p>
                      <p className="text-xs text-muted-foreground">Synkade bokningar</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        {conn.lastSyncAt
                          ? new Date(conn.lastSyncAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
                          : 'Aldrig'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Senaste synk</p>
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
                      onClick={() => triggerSync(conn.id)}
                      disabled={syncing === conn.id}
                    >
                      {syncing === conn.id
                        ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        : <RefreshCw className="h-3 w-3 mr-1" />
                      }
                      Synka nu
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => deleteConnection(conn.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Ta bort
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </>
      )}

      {/* Add new connection */}
      {!showAdd ? (
        <Button onClick={() => setShowAdd(true)} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Anslut gymplattform
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plug className="h-5 w-5" /> Anslut ny plattform
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    'p-3 rounded-lg border text-left transition-all',
                    addProvider === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{config.icon}</span>
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                </button>
              ))}
            </div>

            {addProvider && (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Namn (valfritt)</label>
                    <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder="t.ex. Mitt Gym" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">API-nyckel</label>
                    <Input
                      type="password"
                      value={addApiKey}
                      onChange={e => setAddApiKey(e.target.value)}
                      placeholder="Din API-nyckel"
                    />
                  </div>
                  {providerConfig[addProvider]?.fields.includes('apiSecret') && (
                    <div>
                      <label className="text-sm font-medium">API-hemlighet</label>
                      <Input
                        type="password"
                        value={addApiSecret}
                        onChange={e => setAddApiSecret(e.target.value)}
                        placeholder="API secret"
                      />
                    </div>
                  )}
                  {providerConfig[addProvider]?.fields.includes('siteId') && (
                    <div>
                      <label className="text-sm font-medium">Site/Facility ID</label>
                      <Input value={addSiteId} onChange={e => setAddSiteId(e.target.value)} placeholder="t.ex. 12345" />
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
                    {addResult.success ? 'Anslutningen lyckades!' : addResult.error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={addConnection} disabled={adding || !addApiKey}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
                    Testa & Anslut
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowAdd(false); setAddProvider(''); setAddResult(null) }}>
                    Avbryt
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
