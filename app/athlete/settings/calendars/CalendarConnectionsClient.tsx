'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import {
  Calendar,
  Trash2,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useLocale, useTranslations } from '@/i18n/client'

interface Connection {
  id: string
  provider: string
  calendarName: string
  calendarId: string
  icalUrl: string | null
  syncEnabled: boolean
  lastSyncAt: Date | null
  lastSyncError: string | null
  importAsType: string
  defaultImpact: string
  color: string | null
  eventCount: number
  createdAt: Date
}

interface CalendarConnectionsClientProps {
  clientId: string
  connections: Connection[]
  googleConfigured: boolean
  outlookConfigured: boolean
}

export function CalendarConnectionsClient({
  clientId,
  connections: initialConnections,
  googleConfigured,
  outlookConfigured,
}: CalendarConnectionsClientProps) {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const t = useTranslations('pages.calendarConnections')
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? sv : enUS

  const [connections, setConnections] = useState(initialConnections)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state for new connection
  const [newConnection, setNewConnection] = useState({
    provider: 'ICAL_URL' as 'GOOGLE' | 'OUTLOOK' | 'ICAL_URL',
    calendarName: '',
    icalUrl: '',
    importAsType: 'EXTERNAL_EVENT',
    defaultImpact: 'NORMAL',
  })

  // Show success/error messages from URL params
  const success = searchParams.get('success')
  const error = searchParams.get('error')
  const calendarName = searchParams.get('calendar')

  const handleAddConnection = async () => {
    if (newConnection.provider === 'ICAL_URL' && !newConnection.icalUrl) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.missingIcalUrl'),
        variant: 'destructive',
      })
      return
    }

    if (!newConnection.calendarName) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.missingCalendarName'),
        variant: 'destructive',
      })
      return
    }

    setIsAdding(true)

    try {
      const response = await fetch('/api/calendar/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          ...newConnection,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('toast.createConnectionError'))
      }

      // For OAuth providers, redirect to auth URL
      if (data.oauthRequired && data.oauthUrl) {
        window.location.href = data.oauthUrl
        return
      }

      // For iCal URLs, add to list and close dialog
      setConnections((prev) => [
        {
          ...data.connection,
          eventCount: data.imported || 0,
        },
        ...prev,
      ])

      toast({
        title: t('toast.calendarConnected'),
        description: t('toast.eventsImported', { count: data.imported || 0 }),
      })

      setShowAddDialog(false)
      setNewConnection({
        provider: 'ICAL_URL',
        calendarName: '',
        icalUrl: '',
        importAsType: 'EXTERNAL_EVENT',
        defaultImpact: 'NORMAL',
      })
    } catch (err) {
      toast({
        title: t('toast.errorTitle'),
        description: err instanceof Error ? err.message : t('toast.createConnectionError'),
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleSync = async (connectionId: string) => {
    setSyncingId(connectionId)

    try {
      const response = await fetch(`/api/calendar/external/${connectionId}/sync`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('toast.syncErrorDescription'))
      }

      // Update connection in list
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId
            ? {
              ...c,
              lastSyncAt: new Date(),
              lastSyncError: null,
              eventCount: c.eventCount + (data.stats?.created || 0) - (data.stats?.deleted || 0),
            }
            : c
        )
      )

      toast({
        title: t('toast.syncComplete'),
        description: t('toast.syncStats', {
          created: data.stats?.created || 0,
          updated: data.stats?.updated || 0,
          deleted: data.stats?.deleted || 0,
        }),
      })
    } catch (err) {
      toast({
        title: t('toast.syncErrorTitle'),
        description: err instanceof Error ? err.message : t('toast.syncErrorDescription'),
        variant: 'destructive',
      })
    } finally {
      setSyncingId(null)
    }
  }

  const handleDelete = async (connectionId: string) => {
    if (!confirm(t('confirmDelete'))) {
      return
    }

    setDeletingId(connectionId)

    try {
      const response = await fetch(`/api/calendar/external/${connectionId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('toast.deleteConnectionError'))
      }

      setConnections((prev) => prev.filter((c) => c.id !== connectionId))

      toast({
        title: t('toast.connectionDeleted'),
        description: t('toast.eventsDeleted', { count: data.deletedEvents || 0 }),
      })
    } catch (err) {
      toast({
        title: t('toast.errorTitle'),
        description: err instanceof Error ? err.message : t('toast.deleteConnectionError'),
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'GOOGLE':
        return '📅'
      case 'OUTLOOK':
        return '📧'
      case 'APPLE':
        return '🍎'
      default:
        return '🔗'
    }
  }

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'GOOGLE':
        return 'Google Calendar'
      case 'OUTLOOK':
        return 'Outlook'
      case 'APPLE':
        return 'Apple iCloud'
      case 'ICAL_URL':
        return 'iCal URL'
      default:
        return provider
    }
  }

  return (
    <div className="space-y-8">
      {/* Success/Error Alerts */}
      {success === 'google_connected' && (
        <Alert className="bg-green-500/10 border-green-500/20 text-green-400 rounded-2xl">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-green-300">{t('alerts.googleConnectedTitle')}</AlertTitle>
          <AlertDescription className="text-sm text-green-200/80">
            {calendarName ? t('alerts.namedCalendarConnected', { name: calendarName }) : t('alerts.calendarConnected')}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-500/10 border-red-500/20 text-red-400 rounded-2xl">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-red-300">{t('alerts.errorTitle')}</AlertTitle>
          <AlertDescription className="text-sm text-red-200/80">
            {error === 'oauth_denied' && t('alerts.oauthDenied')}
            {error === 'google_not_configured' && t('alerts.googleNotConfigured')}
            {error === 'token_exchange_failed' && t('alerts.tokenExchangeFailed')}
            {error === 'calendar_fetch_failed' && t('alerts.calendarFetchFailed')}
            {!['oauth_denied', 'google_not_configured', 'token_exchange_failed', 'calendar_fetch_failed'].includes(error) && t('alerts.unexpectedError')}
          </AlertDescription>
        </Alert>
      )}

      {/* Add Connection Card */}
      <GlassCard className="border-slate-200 shadow-sm overflow-hidden relative group dark:border-white/5 dark:shadow-xl dark:shadow-black/50">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 blur-3xl group-hover:bg-orange-600/10 transition-colors" />
        <GlassCardHeader className="flex flex-row items-center justify-between pb-6">
          <div className="space-y-1">
            <GlassCardTitle className="text-xl font-black italic uppercase tracking-tight">{t('addCard.title')}</GlassCardTitle>
            <GlassCardDescription className="text-slate-500 font-medium">
              {t('addCard.description')}
            </GlassCardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="h-11 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all">
                <Plus className="h-4 w-4 mr-2" />
                {t('addCard.addButton')}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md rounded-3xl backdrop-blur-xl dark:bg-[#0a0a0a] dark:border-white/10 dark:text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic uppercase tracking-tight">{t('dialog.titlePrefix')} <span className="text-orange-400">{t('dialog.titleAccent')}</span></DialogTitle>
                <DialogDescription className="text-slate-400">
                  {t('dialog.description')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('dialog.connectionType')}</Label>
                  <Select
                    value={newConnection.provider}
                    onValueChange={(v) =>
                      setNewConnection((prev) => ({
                        ...prev,
                        provider: v as typeof prev.provider,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#111] dark:border-white/10 dark:text-white">
                      <SelectItem value="ICAL_URL" className="focus:bg-slate-100 dark:focus:bg-white/5">{t('providers.icalDefault')}</SelectItem>
                      {googleConfigured && (
                        <SelectItem value="GOOGLE" className="focus:bg-slate-100 dark:focus:bg-white/5">Google Calendar</SelectItem>
                      )}
                      {outlookConfigured && (
                        <SelectItem value="OUTLOOK" className="focus:bg-slate-100 dark:focus:bg-white/5">Microsoft Outlook</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('dialog.calendarName')}</Label>
                  <Input
                    value={newConnection.calendarName}
                    onChange={(e) =>
                      setNewConnection((prev) => ({
                        ...prev,
                        calendarName: e.target.value,
                      }))
                    }
                    placeholder={t('dialog.calendarNamePlaceholder')}
                    className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white"
                  />
                </div>

                {newConnection.provider === 'ICAL_URL' && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('dialog.icalUrl')}</Label>
                    <Input
                      value={newConnection.icalUrl}
                      onChange={(e) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          icalUrl: e.target.value,
                        }))
                      }
                      placeholder="https://..."
                      type="url"
                      className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white"
                    />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {t('dialog.icalHelp')}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('dialog.importAs')}</Label>
                    <Select
                      value={newConnection.importAsType}
                      onValueChange={(v) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          importAsType: v,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#111] dark:border-white/10 dark:text-white">
                        <SelectItem value="EXTERNAL_EVENT" className="focus:bg-slate-100 dark:focus:bg-white/5">{t('importTypes.externalEvent')}</SelectItem>
                        <SelectItem value="WORK_BLOCKER" className="focus:bg-slate-100 dark:focus:bg-white/5">{t('importTypes.workBlocker')}</SelectItem>
                        <SelectItem value="PERSONAL_BLOCKER" className="focus:bg-slate-100 dark:focus:bg-white/5">{t('importTypes.personalBlocker')}</SelectItem>
                        <SelectItem value="TRAVEL" className="focus:bg-slate-100 dark:focus:bg-white/5">{t('importTypes.travel')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('dialog.impact')}</Label>
                    <Select
                      value={newConnection.defaultImpact}
                      onValueChange={(v) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          defaultImpact: v,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#111] dark:border-white/10 dark:text-white">
                        <SelectItem value="NORMAL" className="focus:bg-slate-100 dark:focus:bg-white/5">{t('impact.normal')}</SelectItem>
                        <SelectItem value="MODIFIED" className="focus:bg-slate-100 dark:focus:bg-white/5">{t('impact.modified')}</SelectItem>
                        <SelectItem value="REDUCED" className="focus:bg-slate-100 dark:focus:bg-white/5">{t('impact.reduced')}</SelectItem>
                        <SelectItem value="NO_TRAINING" className="focus:bg-slate-100 dark:focus:bg-white/5">{t('impact.noTraining')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setShowAddDialog(false)} className="text-slate-600 font-bold uppercase tracking-widest text-[10px] hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5">
                  {t('dialog.cancel')}
                </Button>
                <Button onClick={handleAddConnection} disabled={isAdding} className="bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-[10px] h-11 px-6 rounded-xl shadow-lg shadow-orange-600/20">
                  {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {newConnection.provider === 'ICAL_URL' ? t('dialog.connectCalendar') : t('dialog.signIn')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </GlassCardHeader>
      </GlassCard>

      {/* Existing Connections */}
      {connections.length === 0 ? (
        <GlassCard className="border-slate-200 border-dashed bg-transparent dark:border-white/5">
          <GlassCardContent className="py-20 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-700 opacity-50" />
            <p className="text-slate-500 font-black uppercase tracking-widest">{t('empty.title')}</p>
            <p className="text-slate-600 text-sm mt-2">{t('empty.description')}</p>
          </GlassCardContent>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">{t('connectionsTitle')}</h2>
          {connections.map((connection) => (
            <GlassCard key={connection.id} className="border-slate-200 hover:border-slate-300 transition-colors group dark:border-white/5 dark:hover:border-white/10">
              <GlassCardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner relative overflow-hidden"
                      style={{
                        backgroundColor: `${connection.color || '#6b7280'}20`,
                      }}
                    >
                      <div className="absolute inset-0 bg-white/5 opacity-50" />
                      <span className="relative z-10 filter drop-shadow-lg">{getProviderIcon(connection.provider)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-black text-slate-900 italic tracking-tight dark:text-white">{connection.calendarName}</h3>
                        {connection.syncEnabled ? (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[8px] font-black uppercase tracking-widest border border-green-500/20">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            {t('status.active')}
                          </div>
                        ) : (
                          <div className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/20">
                            {t('status.paused')}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {getProviderLabel(connection.provider)} • <span className="text-blue-400">{t('eventCount', { count: connection.eventCount })}</span>
                      </p>

                      {connection.lastSyncAt && (
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-[10px] font-black uppercase tracking-tight text-slate-600">
                            {t('lastSync', { date: format(new Date(connection.lastSyncAt), "d MMM HH:mm", { locale: dateLocale }) })}
                          </p>
                          {connection.lastSyncError && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-red-500 uppercase tracking-tight">
                              <AlertCircle className="h-3 w-3" />
                              {t('syncError')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                      variant="ghost"
                      size="lg"
                      className="flex-1 md:flex-none h-12 px-6 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-white hover:bg-blue-600 transition-all group/btn dark:bg-white/5 dark:border-white/5 dark:text-slate-400"
                      onClick={() => handleSync(connection.id)}
                      disabled={syncingId === connection.id || !connection.syncEnabled}
                    >
                      {syncingId === connection.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2 transition-transform group-hover/btn:rotate-180 duration-500" />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-widest">{t('syncNow')}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all dark:bg-white/5 dark:border-white/5 dark:text-slate-600"
                      onClick={() => handleDelete(connection.id)}
                      disabled={deletingId === connection.id}
                    >
                      {deletingId === connection.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Help Section */}
      <GlassCard className="bg-blue-50 border-blue-100 dark:bg-blue-500/[0.02] dark:border-blue-500/10">
        <GlassCardContent className="py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ExternalLink className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">{t('help.title')}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Google Calendar</p>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {t('help.google.before')} <span className="text-blue-400 font-bold italic">{t('help.google.highlight')}</span>
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Outlook</p>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {t('help.outlook.before')} <span className="text-blue-400 font-bold italic">{t('help.outlook.highlight')}</span>
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Apple iCloud</p>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {t('help.apple.before')} <span className="text-blue-400 font-bold italic">{t('help.apple.highlight')}</span> {t('help.apple.after')}
              </p>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
