'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Trash2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale } from 'next-intl'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface Assistant {
  id: string
  userId: string
  name: string
  email: string
  canRunTests: boolean
  canRunIntervals: boolean
  canCreateEvents: boolean
}

interface ManageAssistantsDialogProps {
  teamId: string
  teamName: string
}

export function ManageAssistantsDialog({ teamId, teamName }: ManageAssistantsDialogProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [open, setOpen] = useState(false)
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchAssistants = useCallback(async () => {
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/assistants`)
      if (res.ok) {
        const data = await res.json()
        setAssistants(data.assistants || [])
      }
    } catch {
      // silently fail
    }
  }, [teamId])

  useEffect(() => {
    if (!open) return
    const timeout = window.setTimeout(() => {
      void fetchAssistants()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [open, fetchAssistants])

  const handleAdd = async () => {
    if (!email.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/assistants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        toast.success(copy(locale, 'Assistant coach added', 'Assisterande coach tillagd'))
        setEmail('')
        void fetchAssistants()
      } else {
        const err = await res.json()
        toast.error(err.error || copy(locale, 'Could not add coach', 'Kunde inte lägga till coach'))
      }
    } catch {
      toast.error(copy(locale, 'Network error', 'Nätverksfel'))
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (assignmentId: string) => {
    if (!confirm(copy(locale, 'Remove this assistant coach?', 'Ta bort denna assisterande coach?'))) return
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/assistants`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      })
      if (res.ok) {
        setAssistants((prev) => prev.filter((a) => a.id !== assignmentId))
        toast.success(copy(locale, 'Coach removed', 'Coach borttagen'))
      }
    } catch {
      toast.error(copy(locale, 'Could not remove coach', 'Kunde inte ta bort coach'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="h-4 w-4 mr-1.5" />
          {copy(locale, 'Coaches', 'Coacher')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy(locale, 'Assistant coaches', 'Assisterande coacher')} - {teamName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new assistant */}
          <div className="flex gap-2">
            <Input
              placeholder={copy(locale, 'Email address...', 'E-postadress...')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAdd()
              }}
              type="email"
            />
            <Button onClick={handleAdd} disabled={adding || !email.trim()} size="sm" className="shrink-0">
              <UserPlus className="h-4 w-4 mr-1" />
              {copy(locale, 'Add', 'Lägg till')}
            </Button>
          </div>

          {/* Current assistants */}
          {assistants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {copy(locale, 'No assistant coaches yet', 'Inga assisterande coacher ännu')}
            </p>
          ) : (
            <div className="space-y-2">
              {assistants.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                    <div className="flex gap-1 mt-1">
                      {a.canRunTests && <Badge variant="outline" className="text-[9px]">{copy(locale, 'Tests', 'Tester')}</Badge>}
                      {a.canRunIntervals && <Badge variant="outline" className="text-[9px]">{copy(locale, 'Intervals', 'Intervaller')}</Badge>}
                      {a.canCreateEvents && <Badge variant="outline" className="text-[9px]">{copy(locale, 'Calendar', 'Kalender')}</Badge>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-8 w-8 p-0"
                    onClick={() => handleRemove(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {copy(
              locale,
              'Assistant coaches can view athletes, run tests and interval sessions, and create calendar events. They cannot edit programs or settings.',
              'Assisterande coacher kan visa atleter, köra tester och intervallsessioner, samt skapa kalenderhändelser. De kan inte redigera program eller inställningar.'
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
