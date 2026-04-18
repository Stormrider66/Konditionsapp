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
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompleteSessionPayload } from './types'

interface CompleteSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (payload: CompleteSessionPayload) => Promise<void>
  completedSets: number
  totalSetsTarget: number
  defaultDurationMinutes?: number
  isStrengthWorkout?: boolean
}

export function CompleteSessionDialog({
  open,
  onOpenChange,
  onConfirm,
  completedSets,
  totalSetsTarget,
  defaultDurationMinutes,
  isStrengthWorkout = true,
}: CompleteSessionDialogProps) {
  const [rpe, setRpe] = useState(6)
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState<number>(defaultDurationMinutes ?? 45)
  const [isSaving, setIsSaving] = useState(false)

  const missingSets = Math.max(0, totalSetsTarget - completedSets)
  const hasMissingSets = missingSets > 0

  async function handleConfirm() {
    setIsSaving(true)
    try {
      await onConfirm({
        rpe,
        duration,
        notes: notes.trim() || undefined,
        markUnloggedAsSkipped: false,
      })
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const rpeColor =
    rpe <= 4 ? 'bg-emerald-500' : rpe <= 7 ? 'bg-yellow-500' : rpe <= 8 ? 'bg-orange-500' : 'bg-red-500'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avsluta pass</DialogTitle>
          <DialogDescription>
            Lägg till en kort summering. Allt är valfritt — du kan avsluta direkt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {hasMissingSets && isStrengthWorkout && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium">
                  {completedSets} av {totalSetsTarget} set loggade
                </p>
                <p className="text-xs text-muted-foreground">
                  Ologgade set räknas som genomförda utan data.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Känsla (RPE)</Label>
              <Badge className={cn('min-w-[36px] justify-center text-white', rpeColor)}>
                {rpe}
              </Badge>
            </div>
            <Slider
              value={[rpe]}
              onValueChange={(v) => setRpe(v[0])}
              min={1}
              max={10}
              step={0.5}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Lätt</span>
              <span>Mycket hårt</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Tid (minuter)</Label>
            <input
              id="duration"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
              className="flex h-10 w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-medium text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar (valfritt)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hur kändes passet?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Avbryt
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Avsluta pass
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteSessionDialog
