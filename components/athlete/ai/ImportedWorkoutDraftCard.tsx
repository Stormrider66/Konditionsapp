'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarDays, Check, Dumbbell, Loader2, Send, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'
import {
  getAiCapabilityActionResultLink,
  type ActionResultLink,
} from '@/lib/ai/action-result-links'
import type { ChatActionResult } from '@/components/ai-studio/ChatActionCard'
import type {
  ImportedWorkoutParsedPreview,
  ImportedWorkoutType,
} from '@/lib/ai/imported-workout-types'

interface ImportedWorkoutDraftCardProps {
  result: ChatActionResult
  preview: ImportedWorkoutParsedPreview
  basePath?: string
}

function label(locale: 'en' | 'sv', en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function typeLabel(type: ImportedWorkoutType, locale: 'en' | 'sv'): string {
  if (type === 'STRENGTH') return label(locale, 'Strength', 'Styrka')
  if (type === 'CARDIO') return label(locale, 'Cardio', 'Kondition')
  return label(locale, 'Hybrid', 'Hybrid')
}

export function ImportedWorkoutDraftCard({
  result,
  preview,
  basePath = '',
}: ImportedWorkoutDraftCardProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const { toast } = useToast()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'cancelled' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [executionResponse, setExecutionResponse] = useState<unknown>(null)
  const [assignedDate, setAssignedDate] = useState(preview.assignedDate)
  const [name, setName] = useState(preview.name)
  const [workoutType, setWorkoutType] = useState<ImportedWorkoutType>(preview.workoutType)
  const [notes, setNotes] = useState(preview.notes || '')

  const action = result.action?.type === 'aiCapabilityAction' ? result.action : null
  if (!action) return null

  const confirmEndpoint = action.confirmEndpoint
  const cancelEndpoint = action.cancelEndpoint
  const isSent = status === 'sent'
  const resultLink: ActionResultLink | null = isSent
    ? getAiCapabilityActionResultLink(action, executionResponse, basePath)
    : null

  async function handleConfirm() {
    if (status === 'sending' || isSent || status === 'cancelled') return
    setStatus('sending')
    setStatusMessage(null)
    try {
      const response = await fetch(confirmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputOverride: {
            assignedDate,
            name,
            workoutType,
            notes,
          },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || label(locale, 'Could not create the workout.', 'Kunde inte skapa passet.'))
      }

      setStatus('sent')
      setExecutionResponse(data)
      setStatusMessage(data.result?.message || data.message || label(locale, 'Workout created.', 'Passet skapades.'))
      toast({
        title: label(locale, 'Workout created', 'Passet skapades'),
        description: name,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : label(locale, 'Try again.', 'Försök igen.')
      setStatus('error')
      setStatusMessage(message)
      toast({
        title: label(locale, 'Import failed', 'Importen misslyckades'),
        description: message,
        variant: 'destructive',
      })
    }
  }

  async function handleCancel() {
    if (status === 'sending' || isSent || status === 'cancelled') return
    setStatus('sending')
    setStatusMessage(null)
    try {
      const response = await fetch(cancelEndpoint, { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || label(locale, 'Could not cancel the import.', 'Kunde inte avbryta importen.'))
      }
      setStatus('cancelled')
      setStatusMessage(data.message || label(locale, 'Import cancelled.', 'Importen avbröts.'))
    } catch (error) {
      setStatus('error')
      setStatusMessage(error instanceof Error ? error.message : label(locale, 'Try again.', 'Försök igen.'))
    }
  }

  return (
    <div className="ml-11 mt-2 max-w-[88%] overflow-hidden rounded-lg border bg-background shadow-sm">
      <div className="flex items-start gap-3 border-b bg-emerald-500/10 px-3 py-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <Dumbbell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold">{label(locale, 'Imported workout', 'Importerat pass')}</h4>
            <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px]">
              {typeLabel(preview.workoutType, locale)}
            </Badge>
            {isSent && (
              <Badge variant="secondary" className="h-5 shrink-0 gap-1 px-1.5 text-[10px]">
                <Check className="h-3 w-3" />
                {label(locale, 'Created', 'Skapat')}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{preview.summary}</p>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] font-medium uppercase text-muted-foreground">
              {label(locale, 'Name', 'Namn')}
            </span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={status !== 'idle' && status !== 'error'}
              className="h-9 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium uppercase text-muted-foreground">
              {label(locale, 'Date', 'Datum')}
            </span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={assignedDate}
                onChange={(event) => setAssignedDate(event.target.value)}
                disabled={status !== 'idle' && status !== 'error'}
                className="h-9 pl-8 text-sm"
              />
            </div>
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">
            {label(locale, 'Workout type', 'Passtyp')}
          </span>
          <Select
            value={workoutType}
            onValueChange={(value) => setWorkoutType(value as ImportedWorkoutType)}
            disabled={status !== 'idle' && status !== 'error'}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STRENGTH">{typeLabel('STRENGTH', locale)}</SelectItem>
              <SelectItem value="CARDIO">{typeLabel('CARDIO', locale)}</SelectItem>
              <SelectItem value="HYBRID">{typeLabel('HYBRID', locale)}</SelectItem>
            </SelectContent>
          </Select>
        </label>

        {preview.sections.length > 0 && (
          <div className="space-y-2 rounded-md bg-muted/60 p-3">
            {preview.sections.slice(0, 3).map((section) => (
              <div key={section.label}>
                <p className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">{section.label}</p>
                <ul className="space-y-1 text-xs">
                  {section.items.slice(0, 6).map((item) => (
                    <li key={item} className="truncate">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <label className="space-y-1">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">
            {label(locale, 'Notes', 'Noteringar')}
          </span>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={status !== 'idle' && status !== 'error'}
            className="min-h-[58px] resize-none text-sm"
          />
        </label>

        {preview.warnings.length > 0 && (
          <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {preview.warnings.slice(0, 3).map((warning) => (
              <div key={warning} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {statusMessage && (
          <div
            className={cn(
              'rounded-md px-3 py-2 text-xs',
              isSent
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : status === 'cancelled'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-destructive/10 text-destructive'
            )}
          >
            {statusMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => { void handleConfirm() }}
            disabled={status === 'sending' || isSent || status === 'cancelled' || !name.trim() || !assignedDate}
            className={cn('h-9', isSent && 'bg-emerald-600 hover:bg-emerald-600')}
          >
            {status === 'sending' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isSent ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isSent ? label(locale, 'Created', 'Skapat') : action.confirmLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { void handleCancel() }}
            disabled={status === 'sending' || isSent || status === 'cancelled'}
            className="h-9"
          >
            {status === 'cancelled' ? (
              <>
                <X className="mr-2 h-4 w-4" />
                {label(locale, 'Cancelled', 'Avbruten')}
              </>
            ) : action.cancelLabel}
          </Button>
          {resultLink && (
            <Button asChild type="button" variant="outline" size="sm" className="h-9">
              <Link href={resultLink.href}>
                {label(locale, 'Open workout', 'Öppna pass')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
