'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Home, Plane } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Match {
  id: string
  opponent: string
  isHome: boolean
  scheduledDate: Date | string
  venue: string | null
  competition: string | null
  matchday: number | null
  result: string | null
  minutesPlayed: number | null
  goals: number | null
  assists: number | null
  plusMinus: number | null
  penaltyMinutes: number | null
  distanceKm: number | null
  sprintDistance: number | null
  maxSpeed: number | null
}

interface AddMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMatchAdded: (match: Match) => void
}

export function AddMatchDialog({
  open,
  onOpenChange,
  onMatchAdded,
}: AddMatchDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [opponent, setOpponent] = useState('')
  const [isHome, setIsHome] = useState(true)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('19:00')
  const [venue, setVenue] = useState('')
  const [competition, setCompetition] = useState('')
  const [matchday, setMatchday] = useState('')

  const resetForm = () => {
    setOpponent('')
    setIsHome(true)
    setDate('')
    setTime('19:00')
    setVenue('')
    setCompetition('')
    setMatchday('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Combine date and time
      const scheduledDate = new Date(`${date}T${time}:00`)

      const response = await fetch('/api/match-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponent,
          isHome,
          scheduledDate: scheduledDate.toISOString(),
          venue: venue || undefined,
          competition: competition || undefined,
          matchday: matchday ? parseInt(matchday) : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte skapa match')
      }

      onMatchAdded(data)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Lägg till match</DialogTitle>
          <DialogDescription>
            Fyll i information om matchen
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Opponent */}
          <div className="space-y-2">
            <Label htmlFor="opponent">Motståndare *</Label>
            <Input
              id="opponent"
              placeholder="t.ex. AIK, Djurgården"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              required
            />
          </div>

          {/* Home/Away Toggle */}
          <div className="space-y-2">
            <Label>Hemma eller borta</Label>
            <div className="flex items-center gap-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setIsHome(true)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors',
                  isHome
                    ? 'bg-green-500 text-white'
                    : 'bg-transparent text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <Home className="h-4 w-4" />
                Hemma
              </button>
              <button
                type="button"
                onClick={() => setIsHome(false)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors',
                  !isHome
                    ? 'bg-orange-500 text-white'
                    : 'bg-transparent text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <Plane className="h-4 w-4" />
                Borta
              </button>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Datum *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Tid *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue">Arena</Label>
            <Input
              id="venue"
              placeholder="t.ex. Friends Arena"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>

          {/* Competition and Matchday */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="competition">Tävling</Label>
              <Input
                id="competition"
                placeholder="t.ex. Allsvenskan"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchday">Omgång</Label>
              <Input
                id="matchday"
                type="number"
                placeholder="t.ex. 15"
                value={matchday}
                onChange={(e) => setMatchday(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lägg till
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
