'use client'

import { useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import Link from 'next/link'
import { toast } from 'sonner'
import { useLocale, useTranslations } from '@/i18n/client'

interface CalendarConnection {
  id: string
  provider: string
  calendarName: string
  syncEnabled: boolean
  lastSyncAt: string | null
  lastSyncError: string | null
  color: string | null
  createdAt: string
}

interface CoachCalendarSettingsClientProps {
  basePath?: string
}

const PROVIDER_LABELS: Record<string, string> = {
  BOKADIREKT: 'Bokadirekt',
  ZOEZI: 'Zoezi',
  APPLE: 'Apple iCloud',
  GOOGLE: 'Google Calendar',
  OUTLOOK: 'Outlook',
  ICAL_URL: 'providerLabels.icalUrl',
}

const PROVIDER_HELP: Record<string, string> = {
  BOKADIREKT: 'providerHelp.bokadirekt',
  ZOEZI: 'providerHelp.zoezi',
  ICAL_URL: 'providerHelp.icalUrl',
}

export function CoachCalendarSettingsClient({ basePath = '' }: CoachCalendarSettingsClientProps) {
  const t = useTranslations('coach.pages.calendarSettings')
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? sv : enUS
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)

  // Form state
  const [provider, setProvider] = useState<string>('BOKADIREKT')
  const [calendarName, setCalendarName] = useState('')
  const [icalUrl, setIcalUrl] = useState('')

  const fetchConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/coach/calendar/external')
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
      toast.error(t('toasts.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchConnections()
    })
  }, [fetchConnections])

  async function handleAddConnection() {
    if (!calendarName.trim() || !icalUrl.trim()) {
      toast.error(t('toasts.fillAllFields'))
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/coach/calendar/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          calendarName: calendarName.trim(),
          icalUrl: icalUrl.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(t('toasts.added', { calendarName: data.connection.calendarName }))
        setDialogOpen(false)
        setCalendarName('')
        setIcalUrl('')
        setProvider('BOKADIREKT')
        void fetchConnections()
      } else {
        const error = await response.json()
        toast.error(error.error || t('toasts.addFailed'))
      }
    } catch (error) {
      console.error('Failed to add connection:', error)
      toast.error(t('toasts.unexpectedError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleSync(id: string, enabled: boolean) {
    try {
      const response = await fetch(`/api/coach/calendar/external/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncEnabled: enabled }),
      })

      if (response.ok) {
        setConnections(prev =>
          prev.map(c => (c.id === id ? { ...c, syncEnabled: enabled } : c))
        )
        toast.success(enabled ? t('toasts.syncEnabled') : t('toasts.syncPaused'))
      }
    } catch (error) {
      console.error('Failed to toggle sync:', error)
      toast.error(t('toasts.updateFailed'))
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t('confirmDelete', { calendarName: name }))) {
      return
    }

    try {
      const response = await fetch(`/api/coach/calendar/external/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConnections(prev => prev.filter(c => c.id !== id))
        toast.success(t('toasts.deleted'))
      }
    } catch (error) {
      console.error('Failed to delete connection:', error)
      toast.error(t('toasts.deleteFailed'))
    }
  }

  async function handleSync(id: string) {
    setSyncing(id)
    // Trigger a re-fetch of appointments which will sync the calendar
    try {
      const response = await fetch('/api/coach/appointments/today')
      if (response.ok) {
        toast.success(t('toasts.synced'))
        void fetchConnections() // Refresh to get new lastSyncAt
      }
    } catch (error) {
      console.error('Failed to sync:', error)
      toast.error(t('toasts.syncFailed'))
    } finally {
      setSyncing(null)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <Link
          href={`${basePath}/coach/settings`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToSettings')}
        </Link>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <GlassCard className="mb-6">
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <GlassCardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('connectedCalendars')}
              </GlassCardTitle>
              <GlassCardDescription>
                {t('connectedDescription')}
              </GlassCardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addCalendar')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('dialog.title')}</DialogTitle>
                  <DialogDescription>
                    {t('dialog.description')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('fields.calendarType')}</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOKADIREKT">Bokadirekt</SelectItem>
                        <SelectItem value="ZOEZI">Zoezi</SelectItem>
                        <SelectItem value="ICAL_URL">{t('providerLabels.icalUrl')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {PROVIDER_HELP[provider] && (
                      <p className="text-xs text-muted-foreground">
                        {t(PROVIDER_HELP[provider])}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t('fields.name')}</Label>
                    <Input
                      placeholder={t('placeholders.name')}
                      value={calendarName}
                      onChange={e => setCalendarName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>iCal URL</Label>
                    <Input
                      placeholder="https://..."
                      value={icalUrl}
                      onChange={e => setIcalUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('icalHelper')}
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('actions.cancel')}
                  </Button>
                  <Button onClick={handleAddConnection} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t('actions.add')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('empty.title')}</p>
              <p className="text-sm mt-1">
                {t('empty.description')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map(connection => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: connection.color
                          ? connection.color + '20'
                          : 'rgb(var(--muted))',
                      }}
                    >
                      <Calendar
                        className="h-5 w-5"
                        style={{ color: connection.color || undefined }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{connection.calendarName}</p>
                        <Badge variant="secondary" className="text-xs">
                          {PROVIDER_LABELS[connection.provider]?.startsWith('providerLabels.')
                            ? t(PROVIDER_LABELS[connection.provider])
                            : PROVIDER_LABELS[connection.provider] || connection.provider}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {connection.lastSyncAt ? (
                          <>
                            {connection.lastSyncError ? (
                              <span className="flex items-center gap-1 text-red-500">
                                <AlertCircle className="h-3 w-3" />
                                {t('sync.error')}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                {t('sync.syncedAt', { date: format(new Date(connection.lastSyncAt), 'd MMM HH:mm', { locale: dateLocale }) })}
                              </span>
                            )}
                          </>
                        ) : (
                          <span>{t('sync.never')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`sync-${connection.id}`} className="text-xs text-muted-foreground">
                        {t('sync.active')}
                      </Label>
                      <Switch
                        id={`sync-${connection.id}`}
                        checked={connection.syncEnabled}
                        onCheckedChange={enabled => handleToggleSync(connection.id, enabled)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSync(connection.id)}
                      disabled={syncing === connection.id}
                    >
                      <RefreshCw className={`h-4 w-4 ${syncing === connection.id ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(connection.id, connection.calendarName)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Help section */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="text-base">{t('help.title')}</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              Bokadirekt
              <ExternalLink className="h-3 w-3" />
            </h4>
            <ol className="text-sm text-muted-foreground list-decimal list-inside mt-1 space-y-1">
              <li>{t('help.bokadirekt.step1')}</li>
              <li>{t('help.bokadirekt.step2')}</li>
              <li>{t('help.bokadirekt.step3')}</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium flex items-center gap-2">
              Zoezi
              <ExternalLink className="h-3 w-3" />
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {t('help.zoezi')}
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
