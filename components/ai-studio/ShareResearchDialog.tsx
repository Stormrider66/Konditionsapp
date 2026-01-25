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
  AlertCircle,
  X,
  UserPlus,
} from 'lucide-react'

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
      fetchCurrentShares()
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
        results.push({ athleteId, success: false, error: 'Network error' })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    if (successCount > 0) {
      toast({
        title: 'Research shared',
        description: `Shared with ${successCount} athlete(s).${failCount > 0 ? ` ${failCount} failed.` : ''}`,
      })
      fetchCurrentShares()
      setSelectedAthletes([])
      onShareComplete?.()
    } else {
      toast({
        title: 'Failed to share',
        description: results[0]?.error || 'An error occurred.',
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
          title: 'Share removed',
          description: 'The athlete no longer has access to this research.',
        })
        fetchCurrentShares()
      } else {
        const data = await response.json()
        throw new Error(data.error)
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to remove share.',
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
            Share Research
          </DialogTitle>
          <DialogDescription>
            Share this research report with your athletes. They will be able to view the full report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Shares */}
          {currentShares.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Currently Shared With</Label>
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
                          Shared {new Date(share.sharedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {share.notified && (
                        <Badge variant="outline" className="text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          Notified
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeShare(share.athleteId)}
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
              Share With Athletes
              {selectedAthletes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedAthletes.length} selected
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
                <p className="text-sm">Already shared with all athletes</p>
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
                      />
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {clients.find((c) => c.id === linkedAthleteId)?.name}
                        </p>
                        <p className="text-xs text-primary">Linked Athlete (Recommended)</p>
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
                  <p className="text-sm font-medium">Send Notification</p>
                  <p className="text-xs text-muted-foreground">
                    Email athletes about the shared research
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
            Cancel
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
            Share with {selectedAthletes.length} Athlete{selectedAthletes.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
