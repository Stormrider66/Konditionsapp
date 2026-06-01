'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Share2,
  User,
  Mail,
  CheckCircle2,
  Loader2,
  X,
  UserPlus,
} from 'lucide-react'
import { useLocale } from '@/i18n/client'

// ============================================
// Types
// ============================================

interface Client {
  id: string
  name: string
  email: string | null
}

interface CurrentShare {
  id: string
  athleteId: string
  athleteName: string
  athleteEmail: string | null
  sharedAt: string
  notified: boolean
}

interface ShareResearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string | null
  clients: Client[]
  linkedAthleteId?: string | null
  onShareComplete?: () => void
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  networkError: string
  sharedTitle: string
  sharedDescription: (successCount: number, failCount: number) => string
  failedTitle: string
  genericError: string
  removedTitle: string
  removedDescription: string
  errorTitle: string
  removeFailed: string
  dialogTitle: string
  dialogDescription: string
  currentShares: string
  sharedDate: (date: string) => string
  notified: string
  shareWithAthletes: string
  selected: (count: number) => string
  allShared: string
  linkedAthlete: string
  sendNotification: string
  sendNotificationDescription: string
  cancel: string
  shareButton: (count: number) => string
  removeShare: string
}> = {
  en: {
    networkError: 'Network error',
    sharedTitle: 'Research shared',
    sharedDescription: (successCount, failCount) =>
      `Shared with ${successCount} athlete${successCount === 1 ? '' : 's'}.${failCount > 0 ? ` ${failCount} failed.` : ''}`,
    failedTitle: 'Failed to share',
    genericError: 'An error occurred.',
    removedTitle: 'Share removed',
    removedDescription: 'The athlete no longer has access to this research.',
    errorTitle: 'Error',
    removeFailed: 'Failed to remove share.',
    dialogTitle: 'Share Research',
    dialogDescription: 'Share this research report with your athletes. They will be able to view the full report.',
    currentShares: 'Currently Shared With',
    sharedDate: (date) => `Shared ${date}`,
    notified: 'Notified',
    shareWithAthletes: 'Share With Athletes',
    selected: (count) => `${count} selected`,
    allShared: 'Already shared with all athletes',
    linkedAthlete: 'Linked Athlete (Recommended)',
    sendNotification: 'Send Notification',
    sendNotificationDescription: 'Email athletes about the shared research',
    cancel: 'Cancel',
    shareButton: (count) => `Share with ${count} Athlete${count === 1 ? '' : 's'}`,
    removeShare: 'Remove share',
  },
  sv: {
    networkError: 'Nätverksfel',
    sharedTitle: 'Research delad',
    sharedDescription: (successCount, failCount) =>
      `Delad med ${successCount} atlet${successCount === 1 ? '' : 'er'}.${failCount > 0 ? ` ${failCount} misslyckades.` : ''}`,
    failedTitle: 'Kunde inte dela',
    genericError: 'Ett fel uppstod.',
    removedTitle: 'Delning borttagen',
    removedDescription: 'Atleten har inte längre åtkomst till denna research.',
    errorTitle: 'Fel',
    removeFailed: 'Kunde inte ta bort delningen.',
    dialogTitle: 'Dela research',
    dialogDescription: 'Dela denna researchrapport med dina atleter. De kan se hela rapporten.',
    currentShares: 'Delas just nu med',
    sharedDate: (date) => `Delad ${date}`,
    notified: 'Aviserad',
    shareWithAthletes: 'Dela med atleter',
    selected: (count) => `${count} valda`,
    allShared: 'Redan delad med alla atleter',
    linkedAthlete: 'Länkad atlet (rekommenderas)',
    sendNotification: 'Skicka avisering',
    sendNotificationDescription: 'Mejla atleterna om den delade researchen',
    cancel: 'Avbryt',
    shareButton: (count) => `Dela med ${count} atlet${count === 1 ? '' : 'er'}`,
    removeShare: 'Ta bort delning',
  },
}

// ============================================
// Component
// ============================================

export function ShareResearchDialog({
  open,
  onOpenChange,
  sessionId,
  clients,
  linkedAthleteId,
  onShareComplete,
}: ShareResearchDialogProps) {
  const { toast } = useToast()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'

  const [isLoading, setIsLoading] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [currentShares, setCurrentShares] = useState<CurrentShare[]>([])
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])
  const [sendNotification, setSendNotification] = useState(true)

  // Fetch current shares
  const fetchCurrentShares = useCallback(async () => {
    if (!sessionId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/ai/deep-research/${sessionId}/share`)
      if (response.ok) {
        const data = await response.json()
        setCurrentShares(data.shares)
      }
    } catch (err) {
      console.error('Failed to fetch shares:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (open && sessionId) {
      void fetchCurrentShares()
      setSelectedAthletes([])
    }
  }, [open, sessionId, fetchCurrentShares])

  // Get athletes that haven't been shared with
  const availableAthletes = clients.filter(
    (client) => !currentShares.some((share) => share.athleteId === client.id)
  )

  // Toggle athlete selection
  const toggleAthlete = (athleteId: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId]
    )
  }

  // Share with selected athletes
  const shareWithAthletes = async () => {
    if (!sessionId || selectedAthletes.length === 0) return

    setIsSharing(true)
    const results: { athleteId: string; success: boolean; error?: string }[] = []

    for (const athleteId of selectedAthletes) {
      try {
        const response = await fetch(`/api/ai/deep-research/${sessionId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            athleteId,
            notify: sendNotification,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          results.push({ athleteId, success: true })
        } else {
          results.push({ athleteId, success: false, error: data.error })
        }
      } catch {
        results.push({ athleteId, success: false, error: copy.networkError })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    if (successCount > 0) {
      toast({
        title: copy.sharedTitle,
        description: copy.sharedDescription(successCount, failCount),
      })
      void fetchCurrentShares()
      setSelectedAthletes([])
      onShareComplete?.()
    } else {
      toast({
        title: copy.failedTitle,
        description: results[0]?.error || copy.genericError,
        variant: 'destructive',
      })
    }

    setIsSharing(false)
  }

  // Remove share
  const removeShare = async (athleteId: string) => {
    if (!sessionId) return

    try {
      const response = await fetch(`/api/ai/deep-research/${sessionId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId }),
      })

      if (response.ok) {
        toast({
          title: copy.removedTitle,
          description: copy.removedDescription,
        })
        void fetchCurrentShares()
      } else {
        const data = await response.json()
        throw new Error(data.error)
      }
    } catch (err) {
      toast({
        title: copy.errorTitle,
        description: err instanceof Error ? err.message : copy.removeFailed,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {copy.dialogTitle}
          </DialogTitle>
          <DialogDescription>
            {copy.dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Shares */}
          {currentShares.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{copy.currentShares}</Label>
              <div className="space-y-2">
                {currentShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{share.athleteName}</p>
                        <p className="text-xs text-muted-foreground">
                          {copy.sharedDate(new Date(share.sharedAt).toLocaleDateString(dateLocale))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {share.notified && (
                        <Badge variant="outline" className="text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          {copy.notified}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeShare(share.athleteId)}
                        aria-label={copy.removeShare}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Athletes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {copy.shareWithAthletes}
              {selectedAthletes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {copy.selected(selectedAthletes.length)}
                </Badge>
              )}
            </Label>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : availableAthletes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{copy.allShared}</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {/* Quick share with linked athlete */}
                  {linkedAthleteId && availableAthletes.some((c) => c.id === linkedAthleteId) && (
                    <div
                      className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10"
                      onClick={() => toggleAthlete(linkedAthleteId)}
                    >
                      <Checkbox
                        checked={selectedAthletes.includes(linkedAthleteId)}
                        onCheckedChange={() => toggleAthlete(linkedAthleteId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {clients.find((c) => c.id === linkedAthleteId)?.name}
                        </p>
                        <p className="text-xs text-primary">{copy.linkedAthlete}</p>
                      </div>
                    </div>
                  )}

                  {availableAthletes
                    .filter((c) => c.id !== linkedAthleteId)
                    .map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => toggleAthlete(client.id)}
                      >
                        <Checkbox
                          checked={selectedAthletes.includes(client.id)}
                          onCheckedChange={() => toggleAthlete(client.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{client.name}</p>
                          {client.email && (
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Notification Option */}
          {selectedAthletes.length > 0 && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{copy.sendNotification}</p>
                  <p className="text-xs text-muted-foreground">
                    {copy.sendNotificationDescription}
                  </p>
                </div>
              </div>
              <Switch
                checked={sendNotification}
                onCheckedChange={setSendNotification}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            onClick={shareWithAthletes}
            disabled={selectedAthletes.length === 0 || isSharing}
          >
            {isSharing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            {copy.shareButton(selectedAthletes.length)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
