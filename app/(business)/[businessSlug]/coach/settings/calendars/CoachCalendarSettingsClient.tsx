'use client'

import { useState, useEffect } from 'react'
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
import { sv } from 'date-fns/locale'
import Link from 'next/link'
import { toast } from 'sonner'

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
  ICAL_URL: 'Annan kalender (iCal)',
}

const PROVIDER_HELP: Record<string, string> = {
  BOKADIREKT: 'Hitta din iCal-länk under Inställningar > Kalendersynkronisering i Bokadirekt',
  ZOEZI: 'Kontakta Zoezi support för att få din kalender-URL',
  ICAL_URL: 'Klistra in en iCal/ICS-länk från valfri kalender',
}

export function CoachCalendarSettingsClient({ basePath = '' }: CoachCalendarSettingsClientProps) {
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)

  // Form state
  const [provider, setProvider] = useState<string>('BOKADIREKT')
  const [calendarName, setCalendarName] = useState('')
  const [icalUrl, setIcalUrl] = useState('')

  useEffect(() => {
    fetchConnections()
  }, [])

  async function fetchConnections() {
    try {
      const response = await fetch('/api/coach/calendar/external')
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
      toast.error('Kunde inte hämta kalenderanslutningar')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddConnection() {
    if (!calendarName.trim() || !icalUrl.trim()) {
      toast.error('Fyll i alla fält')
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
        toast.success(`Kalender "${data.connection.calendarName}" har lagts till`)
        setDialogOpen(false)
        setCalendarName('')
        setIcalUrl('')
        setProvider('BOKADIREKT')
        fetchConnections()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Kunde inte lägga till kalender')
      }
    } catch (error) {
      console.error('Failed to add connection:', error)
      toast.error('Något gick fel')
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
        toast.success(enabled ? 'Synkronisering aktiverad' : 'Synkronisering pausad')
      }
    } catch (error) {
      console.error('Failed to toggle sync:', error)
      toast.error('Kunde inte uppdatera inställning')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Är du säker på att du vill ta bort "${name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/coach/calendar/external/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConnections(prev => prev.filter(c => c.id !== id))
        toast.success('Kalender borttagen')
      }
    } catch (error) {
      console.error('Failed to delete connection:', error)
      toast.error('Kunde inte ta bort kalender')
    }
  }

  async function handleSync(id: string) {
    setSyncing(id)
    // Trigger a re-fetch of appointments which will sync the calendar
    try {
      const response = await fetch('/api/coach/appointments/today')
      if (response.ok) {
        toast.success('Kalender synkroniserad')
        fetchConnections() // Refresh to get new lastSyncAt
      }
    } catch (error) {
      console.error('Failed to sync:', error)
      toast.error('Synkronisering misslyckades')
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
          Tillbaka till inställningar
        </Link>
        <h1 className="text-2xl font-bold">Kalenderanslutningar</h1>
        <p className="text-muted-foreground">
          Anslut externa kalendrar som Bokadirekt för att se bokningar på din dashboard
        </p>
      </div>

      <GlassCard className="mb-6">
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <GlassCardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Anslutna kalendrar
              </GlassCardTitle>
              <GlassCardDescription>
                Kalendrar som synkroniseras med din dashboard
              </GlassCardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Lägg till kalender
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Lägg till extern kalender</DialogTitle>
                  <DialogDescription>
                    Anslut en extern bokningskalender för att se bokningar på din dashboard
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Kalendertyp</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOKADIREKT">Bokadirekt</SelectItem>
                        <SelectItem value="ZOEZI">Zoezi</SelectItem>
                        <SelectItem value="ICAL_URL">Annan kalender (iCal)</SelectItem>
                      </SelectContent>
                    </Select>
                    {PROVIDER_HELP[provider] && (
                      <p className="text-xs text-muted-foreground">
                        {PROVIDER_HELP[provider]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Namn</Label>
                    <Input
                      placeholder="t.ex. Mina PT-bokningar"
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
                      Klistra in din kalenderlänk (slutar ofta på .ics)
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={handleAddConnection} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Lägg till
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
              <p>Inga kalendrar anslutna</p>
              <p className="text-sm mt-1">
                Klicka på &quot;Lägg till kalender&quot; för att komma igång
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
                          {PROVIDER_LABELS[connection.provider] || connection.provider}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {connection.lastSyncAt ? (
                          <>
                            {connection.lastSyncError ? (
                              <span className="flex items-center gap-1 text-red-500">
                                <AlertCircle className="h-3 w-3" />
                                Synkfel
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Synkad {format(new Date(connection.lastSyncAt), 'd MMM HH:mm', { locale: sv })}
                              </span>
                            )}
                          </>
                        ) : (
                          <span>Aldrig synkad</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`sync-${connection.id}`} className="text-xs text-muted-foreground">
                        Aktiv
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
          <GlassCardTitle className="text-base">Hur hittar jag min iCal-länk?</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              Bokadirekt
              <ExternalLink className="h-3 w-3" />
            </h4>
            <ol className="text-sm text-muted-foreground list-decimal list-inside mt-1 space-y-1">
              <li>Logga in på business.bokadirekt.se</li>
              <li>Gå till Inställningar → Kalendersynkronisering</li>
              <li>Aktivera iCal-synkronisering och kopiera länken</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium flex items-center gap-2">
              Zoezi
              <ExternalLink className="h-3 w-3" />
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Kontakta Zoezi support för att få din kalender-URL, eller kolla i inställningarna
              för export/synkronisering.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
