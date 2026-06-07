'use client'

/**
 * ClientBulkPRImportDialog
 *
 * Per-client variant of the team bulk-import flow. The team version
 * needs name matching against a roster; here we already know which
 * client the PRs belong to, so the paste format collapses to:
 *
 *   exercise, kg[, date]
 *
 * Used from the StrengthPRTable on the per-client Analys tab — fast
 * onboarding when a coach sits down with one athlete and types a
 * dozen PRs at once instead of opening the single-PR dialog 12 times.
 */

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Check, X, AlertCircle, Upload } from 'lucide-react'
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

function text(locale: AppLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

interface Exercise {
  id: string
  name: string
  nameSv: string | null
  nameEn?: string | null
}

interface ParsedRow {
  exerciseId: string | null
  exerciseLabel: string
  oneRepMax: number | null
  date: string
  problem: string
}

interface ClientBulkPRImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  onImported?: () => void
}

const PLACEHOLDER_SV = `Knäböj, 120, 2026-04-15
Bänkpress, 90
Marklyft, 140`

const PLACEHOLDER_EN = `Back Squat, 120, 2026-04-15
Bench Press, 90
Deadlift, 140`

function exerciseDisplayName(exercise: Exercise, locale: AppLocale): string {
  return locale === 'sv' ? exercise.nameSv || exercise.name : exercise.nameEn || exercise.name
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

function pickExercise(input: string, exercises: Exercise[]): Exercise | null {
  const target = normalize(input)
  if (!target) return null
  const ladder = [
    (e: Exercise) => normalize(e.nameSv ?? '') === target,
    (e: Exercise) => normalize(e.name) === target,
    (e: Exercise) => normalize(e.nameSv ?? '').startsWith(target),
    (e: Exercise) => normalize(e.name).startsWith(target),
    (e: Exercise) => normalize(e.nameSv ?? '').includes(target),
    (e: Exercise) => normalize(e.name).includes(target),
  ]
  for (const test of ladder) {
    const hit = exercises.find(test)
    if (hit) return hit
  }
  return null
}

function parseRows(paste: string, exercises: Exercise[], locale: AppLocale): ParsedRow[] {
  return paste
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((raw): ParsedRow => {
      const cells = raw
        .split(/[,\t;]/)
        .map((c) => c.trim())
        .filter(Boolean)

      if (cells.length < 2) {
        return {
          exerciseId: null,
          exerciseLabel: cells[0] ?? '',
          oneRepMax: null,
          date: '',
          problem: text(locale, 'Behöver minst övning och vikt', 'Needs at least exercise and weight'),
        }
      }

      const [exerciseInput, weightInput, dateInput] = cells
      const exercise = pickExercise(exerciseInput, exercises)
      const oneRepMax = parseFloat(weightInput.replace(',', '.'))
      const date = dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput) ? dateInput : ''

      const problems: string[] = []
      if (!exercise) problems.push(text(locale, 'övning ej hittad', 'exercise not found'))
      if (!oneRepMax || oneRepMax <= 0) problems.push(text(locale, 'ogiltig vikt', 'invalid weight'))

      return {
        exerciseId: exercise?.id ?? null,
        exerciseLabel: exercise ? exerciseDisplayName(exercise, locale) : exerciseInput,
        oneRepMax: Number.isFinite(oneRepMax) ? oneRepMax : null,
        date,
        problem: problems.join(' · '),
      }
    })
}

export function ClientBulkPRImportDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onImported,
}: ClientBulkPRImportDialogProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [paste, setPaste] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch('/api/exercises?limit=500&surface=strength-studio')
        if (res.ok) {
          const body = await res.json()
          const list = Array.isArray(body) ? body : body.exercises ?? []
          if (!cancelled) {
            setExercises(
              list.map((e: { id: string; name: string; nameSv: string | null; nameEn?: string | null }) => ({
                id: e.id,
                name: e.name,
                nameSv: e.nameSv,
                nameEn: e.nameEn,
              }))
            )
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open])

  // Reset state every time the user changes the paste — overrides
  // become stale once the row indices shift.
  useEffect(() => {
    setOverrides({})
  }, [paste])

  const rows = useMemo(() => parseRows(paste, exercises, locale), [paste, exercises, locale])

  const effectiveRows: ParsedRow[] = rows.map((r, i) => {
    const overrideId = overrides[i]
    if (!overrideId) return r
    const ex = exercises.find((e) => e.id === overrideId)
    if (!ex) return r
    const next: ParsedRow = {
      ...r,
      exerciseId: ex.id,
      exerciseLabel: exerciseDisplayName(ex, locale),
    }
    const problems: string[] = []
    if (!next.exerciseId) problems.push(text(locale, 'övning ej hittad', 'exercise not found'))
    if (!next.oneRepMax || next.oneRepMax <= 0) problems.push(text(locale, 'ogiltig vikt', 'invalid weight'))
    next.problem = problems.join(' · ')
    return next
  })
  const validRows = effectiveRows.filter((r) => !r.problem)

  const handleSubmit = async () => {
    if (validRows.length === 0) return
    setIsSubmitting(true)
    setServerError(null)
    setResultMsg(null)
    try {
      const res = await fetch('/api/strength-pr/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          entries: validRows.map((r) => ({
            clientId,
            exerciseId: r.exerciseId!,
            oneRepMax: r.oneRepMax!,
            date: r.date || undefined,
            source: 'TESTED' as const,
          })),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const body = await res.json()
      const skipped = effectiveRows.length - validRows.length
      const updatedSuffix = body.updated > 0 ? text(locale, ` · ${body.updated} uppdaterade`, ` · ${body.updated} updated`) : ''
      setResultMsg(
        locale === 'sv'
          ? `Sparade ${body.created} ny${body.created === 1 ? '' : 'a'} PR${updatedSuffix}${skipped > 0 ? ` · ${skipped} rad${skipped === 1 ? '' : 'er'} hoppades över` : ''}`
          : `Saved ${body.created} new PR${body.created === 1 ? '' : 's'}${updatedSuffix}${skipped > 0 ? ` · ${skipped} row${skipped === 1 ? '' : 's'} skipped` : ''}`
      )
      setPaste('')
      onImported?.()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : text(locale, 'Kunde inte spara', 'Could not save'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            {text(locale, 'Importera PRs', 'Import PRs')} – {clientName}
          </DialogTitle>
          <DialogDescription>
            {text(locale, 'En rad per PR. Format:', 'One row per PR. Format:')}{' '}
            <code className="bg-muted px-1 rounded">
              {text(locale, 'övning, vikt[, datum]', 'exercise, weight[, date]')}
            </code>
            . {text(locale, 'Datum är valfritt (default: idag). Källa sätts som "Testat".', 'Date is optional (default: today). Source is set to "Tested".')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="client-bulk-paste">{text(locale, 'Klistra in', 'Paste')}</Label>
            <Textarea
              id="client-bulk-paste"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={text(locale, PLACEHOLDER_SV, PLACEHOLDER_EN)}
              rows={6}
              className="font-mono text-xs"
              spellCheck={false}
              disabled={isLoading || isSubmitting}
            />
            {isLoading && (
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {text(locale, 'Hämtar övningar…', 'Loading exercises...')}
              </p>
            )}
          </div>

          {effectiveRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {text(locale, 'Förhandsgranskning', 'Preview')} ({validRows.length} {text(locale, 'av', 'of')} {effectiveRows.length} {text(locale, 'klara', 'ready')})
              </p>
              <div className="rounded-md border max-h-[40vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 w-6"></th>
                      <th className="px-2 py-1.5">{text(locale, 'Övning', 'Exercise')}</th>
                      <th className="px-2 py-1.5 text-right">{text(locale, 'Vikt', 'Weight')}</th>
                      <th className="px-2 py-1.5">{text(locale, 'Datum', 'Date')}</th>
                      <th className="px-2 py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveRows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5">
                          {r.problem ? (
                            <X className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.exerciseId ? (
                            r.exerciseLabel
                          ) : (
                            <Select
                              value=""
                              onValueChange={(v) =>
                                setOverrides((prev) => ({ ...prev, [i]: v }))
                              }
                            >
                              <SelectTrigger className="h-7 text-xs w-[180px]">
                                <SelectValue placeholder={r.exerciseLabel || text(locale, '— välj —', '- select -')} />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {exercises.map((e) => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {exerciseDisplayName(e, locale)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {r.oneRepMax ? `${r.oneRepMax} kg` : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {r.date || text(locale, 'idag', 'today')}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.problem ? (
                            <span className="text-destructive">{r.problem}</span>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0">
                              {text(locale, 'klar', 'ready')}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {serverError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {resultMsg && (
            <div className="flex items-start gap-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 text-xs text-green-700 dark:text-green-300">
              <Check className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{resultMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {text(locale, 'Stäng', 'Close')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || validRows.length === 0}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {text(locale, 'Spara', 'Save')} {validRows.length > 0 ? `${validRows.length} ` : ''}PR
            {validRows.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
