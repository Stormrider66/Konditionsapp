'use client'

/**
 * Calendar Connections Client Component
 *
 * Client-side UI for managing external calendar connections
 */

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Calendar,
  Link as LinkIcon,
  Trash2,
  RefreshCw,
  Plus,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

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
        title: 'Fel',
        description: 'Ange en iCal-URL',
        variant: 'destructive',
      })
      return
    }

    if (!newConnection.calendarName) {
      toast({
        title: 'Fel',
        description: 'Ange ett namn för kalendern',
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
        throw new Error(data.error || 'Kunde inte skapa anslutning')
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
        title: 'Kalender ansluten',
        description: `${data.imported} händelser importerade`,
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
        title: 'Fel',
        description: err instanceof Error ? err.message : 'Kunde inte skapa anslutning',
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
        throw new Error(data.error || 'Kunde inte synka kalendern')
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
        title: 'Synkning klar',
        description: `${data.stats?.created || 0} nya, ${data.stats?.updated || 0} uppdaterade, ${data.stats?.deleted || 0} borttagna`,
      })
    } catch (err) {
      toast({
        title: 'Synkningsfel',
        description: err instanceof Error ? err.message : 'Kunde inte synka kalendern',
        variant: 'destructive',
      })
    } finally {
      setSyncingId(null)
    }
  }

  const handleDelete = async (connectionId: string) => {
    if (!confirm('Är du säker? Alla importerade händelser från denna kalender kommer att tas bort.')) {
      return
    }

    setDeletingId(connectionId)

    try {
      const response = await fetch(`/api/calendar/external/${connectionId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte ta bort anslutningen')
      }

      setConnections((prev) => prev.filter((c) => c.id !== connectionId))

      toast({
        title: 'Anslutning borttagen',
        description: `${data.deletedEvents} händelser borttagna`,
      })
    } catch (err) {
      toast({
        title: 'Fel',
        description: err instanceof Error ? err.message : 'Kunde inte ta bort anslutningen',
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
    <div className="space-y-6">
      {/* Success/Error Alerts */}
      {success === 'google_connected' && (
        <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Google Calendar ansluten!</AlertTitle>
          <AlertDescription>
            {calendarName ? `Kalendern "${calendarName}" har anslutits.` : 'Din kalender har anslutits.'}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Något gick fel</AlertTitle>
          <AlertDescription>
            {error === 'oauth_denied' && 'Du nekade åtkomst till kalendern.'}
            {error === 'google_not_configured' && 'Google Calendar är inte konfigurerat.'}
            {error === 'token_exchange_failed' && 'Kunde inte ansluta till Google.'}
            {error === 'calendar_fetch_failed' && 'Kunde inte hämta kalendrar.'}
            {!['oauth_denied', 'google_not_configured', 'token_exchange_failed', 'calendar_fetch_failed'].includes(error) && 'Ett oväntat fel inträffade.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Add Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Anslut ny kalender</span>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Lägg till
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Anslut extern kalender</DialogTitle>
                  <DialogDescription>
                    Välj hur du vill ansluta din kalender
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Typ av anslutning</Label>
                    <Select
                      value={newConnection.provider}
                      onValueChange={(v) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          provider: v as typeof prev.provider,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ICAL_URL">iCal URL (fungerar med de flesta kalendrar)</SelectItem>
                        {googleConfigured && (
                          <SelectItem value="GOOGLE">Google Calendar</SelectItem>
                        )}
                        {outlookConfigured && (
                          <SelectItem value="OUTLOOK">Microsoft Outlook</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Namn på kalendern</Label>
                    <Input
                      value={newConnection.calendarName}
                      onChange={(e) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          calendarName: e.target.value,
                        }))
                      }
                      placeholder="t.ex. Arbetskalender"
                    />
                  </div>

                  {newConnection.provider === 'ICAL_URL' && (
                    <div className="space-y-2">
                      <Label>iCal URL</Label>
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
                      />
                      <p className="text-xs text-muted-foreground">
                        Hitta din iCal-URL i kalenderinställningarna. Söker efter
                        &quot;Dela kalender&quot; eller &quot;Exportera kalender&quot;.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Importera som</Label>
                    <Select
                      value={newConnection.importAsType}
                      onValueChange={(v) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          importAsType: v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXTERNAL_EVENT">Externa händelser</SelectItem>
                        <SelectItem value="WORK_BLOCKER">Arbetsblockerare</SelectItem>
                        <SelectItem value="PERSONAL_BLOCKER">Personliga händelser</SelectItem>
                        <SelectItem value="TRAVEL">Resor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Standard träningspåverkan</Label>
                    <Select
                      value={newConnection.defaultImpact}
                      onValueChange={(v) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          defaultImpact: v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">Normal (ingen påverkan)</SelectItem>
                        <SelectItem value="MODIFIED">Modifierad träning</SelectItem>
                        <SelectItem value="REDUCED">Reducerad träning</SelectItem>
                        <SelectItem value="NO_TRAINING">Ingen träning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={handleAddConnection} disabled={isAdding}>
                    {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {newConnection.provider === 'ICAL_URL' ? 'Anslut' : 'Fortsätt till inloggning'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Importera händelser från Google Calendar, Outlook, eller vilken kalender som helst som
            stödjer iCal-format.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Existing Connections */}
      {connections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Inga kalendrar anslutna ännu.</p>
            <p className="text-sm">Klicka &quot;Lägg till&quot; för att komma igång.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{
                        backgroundColor: connection.color || '#6b7280',
                      }}
                    >
                      {getProviderIcon(connection.provider)}
                    </div>
                    <div>
                      <h3 className="font-medium">{connection.calendarName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getProviderLabel(connection.provider)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{connection.eventCount} händelser</Badge>
                        {connection.syncEnabled ? (
                          <Badge variant="outline" className="text-green-600">
                            Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">
                            Pausad
                          </Badge>
                        )}
                      </div>
                      {connection.lastSyncAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Senast synkad:{' '}
                          {format(new Date(connection.lastSyncAt), "d MMM 'kl' HH:mm", {
                            locale: sv,
                          })}
                        </p>
                      )}
                      {connection.lastSyncError && (
                        <p className="text-xs text-red-600 mt-1">
                          Fel: {connection.lastSyncError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSync(connection.id)}
                      disabled={syncingId === connection.id || !connection.syncEnabled}
                    >
                      {syncingId === connection.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(connection.id)}
                      disabled={deletingId === connection.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deletingId === connection.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardContent className="py-6">
          <h3 className="font-medium mb-2">Hur hittar jag min iCal-URL?</h3>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Google Calendar:</strong> Inställningar → Kalenderinställningar → Integrerar
              kalender → Hemlig adress i iCal-format
            </p>
            <p>
              <strong>Outlook:</strong> Inställningar → Visa alla Outlook-inställningar → Kalender →
              Delade kalendrar → Publicera en kalender
            </p>
            <p>
              <strong>Apple iCloud:</strong> iCloud.com → Kalender → Dela kalender → Offentlig
              kalender
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
