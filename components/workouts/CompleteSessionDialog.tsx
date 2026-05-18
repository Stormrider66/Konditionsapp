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
import { useTranslations } from '@/i18n/client'
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
  const t = useTranslations('components.completeSessionDialog')

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
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {hasMissingSets && isStrengthWorkout && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium">
                  {t('missingSets.title', {
                    completed: completedSets,
                    total: totalSetsTarget,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('missingSets.info')}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('fields.rpeLabel')}</Label>
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
              <span>{t('rpeScale.easy')}</span>
              <span>{t('rpeScale.hard')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">{t('fields.durationLabel')}</Label>
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
            <Label htmlFor="notes">{t('fields.notesLabel')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('fields.notesPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t('buttons.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {t('buttons.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteSessionDialog
