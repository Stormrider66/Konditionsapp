'use client'

/**
 * BulkPRImportDialog
 *
 * Paste-driven 1RM bulk import for a team coach. Closes the gap between
 * "I want to use % of 1RM workouts for my team" and "I have to enter 25
 * × 5 PRs by hand first."
 *
 * Flow:
 *  1. Coach pastes lines like "Anna Andersson, Squat, 120, 2026-04-15"
 *  2. Component parses + fuzzy-matches names against the team roster
 *     and exercise names against the library.
 *  3. Preview table shows match status per row; the coach can pick a
 *     different match in a select if the auto-pick is wrong.
 *  4. "Spara X PRs" submits all matched rows to /api/strength-pr/bulk.
 *
 * Source defaults to TESTED (the coach measured these); date defaults
 * to today if missing.
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
import { getExerciseDisplayName } from '@/lib/exercises/display-name'

interface Member {
  id: string
  name: string
}

interface Exercise {
  id: string
  name: string
  nameSv: string | null
  nameEn?: string | null
}

interface ParsedRow {
  raw: string
  clientId: string | null
  clientName: string
  exerciseId: string | null
  exerciseLabel: string
  oneRepMax: number | null
  date: string // ISO date or '' if not parsed
  /** Reason this row is unsubmittable (one of several). Empty when valid. */
  problem: string
}

interface BulkPRImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
  businessSlug?: string
  onImported?: () => void
}

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

const PLACEHOLDERS: Record<AppLocale, string> = {
  en: `Anna Andersson, Squat, 120, 2026-04-15
Erik Eriksson, Bench press, 90
Lisa Larsson, Deadlift, 140`,
  sv: `Anna Andersson, Knäböj, 120, 2026-04-15
Erik Eriksson, Bänkpress, 90
Lisa Larsson, Marklyft, 140`,
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

function pickMember(input: string, members: Member[]): Member | null {
  const target = normalize(input)
  if (!target) return null
  // Exact wins, then startsWith, then contains.
  const exact = members.find((m) => normalize(m.name) === target)
  if (exact) return exact
  const starts = members.find((m) => normalize(m.name).startsWith(target))
  if (starts) return starts
  const contains = members.find((m) => normalize(m.name).includes(target))
  return contains ?? null
}

function pickExercise(input: string, exercises: Exercise[]): Exercise | null {
  const target = normalize(input)
  if (!target) return null
  // Match both localized names. Exact wins, then startsWith, then contains.
  const ladder = [
    (e: Exercise) => normalize(e.nameEn ?? '') === target,
    (e: Exercise) => normalize(e.nameSv ?? '') === target,
    (e: Exercise) => normalize(e.name) === target,
    (e: Exercise) => normalize(e.nameEn ?? '').startsWith(target),
    (e: Exercise) => normalize(e.nameSv ?? '').startsWith(target),
    (e: Exercise) => normalize(e.name).startsWith(target),
    (e: Exercise) => normalize(e.nameEn ?? '').includes(target),
    (e: Exercise) => normalize(e.nameSv ?? '').includes(target),
    (e: Exercise) => normalize(e.name).includes(target),
  ]
  for (const test of ladder) {
    const hit = exercises.find(test)
    if (hit) return hit
  }
  return null
}

function exerciseDisplayName(exercise: Exercise, locale: AppLocale): string {
  return getExerciseDisplayName(exercise, locale)
}

function parseRows(
  paste: string,
  members: Member[],
  exercises: Exercise[],
  locale: AppLocale
): ParsedRow[] {
  return paste
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((raw): ParsedRow => {
      const cells = raw
        .split(/[,\t;]/)
        .map((c) => c.trim())
        .filter(Boolean)

      if (cells.length < 3) {
        return {
          raw,
          clientId: null,
          clientName: cells[0] ?? '',
          exerciseId: null,
          exerciseLabel: cells[1] ?? '',
          oneRepMax: null,
          date: '',
          problem: copy(locale, 'Needs at least name, exercise, weight', 'Behöver minst namn, övning, vikt'),
        }
      }

      const [nameInput, exerciseInput, weightInput, dateInput] = cells
      const member = pickMember(nameInput, members)
      const exercise = pickExercise(exerciseInput, exercises)
      const oneRepMax = parseFloat(weightInput.replace(',', '.'))
      const date = dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput) ? dateInput : ''

      const problems: string[] = []
      if (!member) problems.push(copy(locale, 'athlete not found', 'atlet ej hittad'))
      if (!exercise) problems.push(copy(locale, 'exercise not found', 'övning ej hittad'))
      if (!oneRepMax || oneRepMax <= 0) problems.push(copy(locale, 'invalid weight', 'ogiltig vikt'))

      return {
        raw,
        clientId: member?.id ?? null,
        clientName: member?.name ?? nameInput,
        exerciseId: exercise?.id ?? null,
        exerciseLabel: exercise ? exerciseDisplayName(exercise, locale) : exerciseInput,
        oneRepMax: Number.isFinite(oneRepMax) ? oneRepMax : null,
        date,
        problem: problems.join(' · '),
      }
    })
}

export function BulkPRImportDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  businessSlug,
  onImported,
}: BulkPRImportDialogProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [paste, setPaste] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  // Lazy-load roster + exercises when the dialog opens. The endpoints
  // are already cached client-side by the dashboard, but the dialog
  // can stand alone.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const teamQuery = businessSlug ? `?businessSlug=${encodeURIComponent(businessSlug)}` : ''
        const [teamRes, exRes] = await Promise.all([
          fetch(`/api/teams/${teamId}/analysis-summary${teamQuery}`, {
            headers: businessSlug ? { 'x-business-slug': businessSlug } : undefined,
          }),
          fetch('/api/exercises?limit=500'),
        ])
        if (teamRes.ok) {
          const body = await teamRes.json()
          if (!cancelled && body.success) {
            setMembers(
              body.data.members.map((m: { clientId: string; name: string }) => ({
                id: m.clientId,
                name: m.name,
              }))
            )
          }
        }
        if (exRes.ok) {
          const body = await exRes.json()
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
    void load()
    return () => {
      cancelled = true
    }
  }, [businessSlug, open, teamId])

  const rows = useMemo(
    () => parseRows(paste, members, exercises, locale),
    [paste, members, exercises, locale]
  )
  const handleSubmit = async () => {
    if (effectiveValid.length === 0) return
    setIsSubmitting(true)
    setServerError(null)
    setResultMsg(null)
    try {
      const res = await fetch('/api/strength-pr/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          entries: effectiveValid.map((r) => ({
            clientId: r.clientId!,
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
      const skipped = effectiveRows.length - effectiveValid.length
      const updatedSuffix = body.updated > 0
        ? copy(locale, ` · ${body.updated} updated`, ` · ${body.updated} uppdaterade`)
        : ''
      setResultMsg(
        copy(
          locale,
          `Saved ${body.created} new PRs${updatedSuffix}${skipped > 0 ? ` · ${skipped} row${skipped === 1 ? '' : 's'} skipped` : ''}`,
          `Sparade ${body.created} nya PRs${updatedSuffix}${skipped > 0 ? ` · ${skipped} rad${skipped === 1 ? '' : 'er'} hoppades över` : ''}`
        )
      )
      setPaste('')
      onImported?.()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : copy(locale, 'Could not save', 'Kunde inte spara'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Allow the coach to manually correct a wrong auto-match. Replaces
  // either the clientId or exerciseId on a single row in place.
  const overrideRow = (
    rowIndex: number,
    field: 'clientId' | 'exerciseId',
    value: string
  ) => {
    const newRows = [...rows]
    const row = { ...newRows[rowIndex] }
    if (field === 'clientId') {
      const m = members.find((mm) => mm.id === value)
      row.clientId = m?.id ?? null
      row.clientName = m?.name ?? row.clientName
    } else {
      const ex = exercises.find((ee) => ee.id === value)
      row.exerciseId = ex?.id ?? null
      row.exerciseLabel = ex ? exerciseDisplayName(ex, locale) : row.exerciseLabel
    }
    // Re-derive problem from the updated row.
    const problems: string[] = []
    if (!row.clientId) problems.push(copy(locale, 'athlete not found', 'atlet ej hittad'))
    if (!row.exerciseId) problems.push(copy(locale, 'exercise not found', 'övning ej hittad'))
    if (!row.oneRepMax || row.oneRepMax <= 0) problems.push(copy(locale, 'invalid weight', 'ogiltig vikt'))
    row.problem = problems.join(' · ')

    // Rebuild paste string from the edited rows so subsequent edits
    // don't re-parse and clobber the override. We can't rely on
    // mutating `paste` because the parse derives names — instead, we
    // bypass parsing for the overridden field by storing rows directly.
    // Simplest approach: stash the override in a sibling map.
    setOverrides((prev) => ({ ...prev, [rowIndex]: { ...prev[rowIndex], [field]: value } }))
  }

  // Map of rowIndex → { clientId?, exerciseId? } applied on top of parsed rows.
  const [overrides, setOverrides] = useState<
    Record<number, { clientId?: string; exerciseId?: string }>
  >({})

  // Reset overrides whenever the paste content changes (new parse run).
  useEffect(() => {
    const timeout = window.setTimeout(() => setOverrides({}), 0)
    return () => window.clearTimeout(timeout)
  }, [paste])

  const effectiveRows: ParsedRow[] = rows.map((r, i) => {
    const ov = overrides[i]
    if (!ov) return r
    const next: ParsedRow = { ...r }
    if (ov.clientId) {
      const m = members.find((mm) => mm.id === ov.clientId)
      if (m) {
        next.clientId = m.id
        next.clientName = m.name
      }
    }
    if (ov.exerciseId) {
      const ex = exercises.find((ee) => ee.id === ov.exerciseId)
      if (ex) {
        next.exerciseId = ex.id
        next.exerciseLabel = exerciseDisplayName(ex, locale)
      }
    }
    const problems: string[] = []
    if (!next.clientId) problems.push(copy(locale, 'athlete not found', 'atlet ej hittad'))
    if (!next.exerciseId) problems.push(copy(locale, 'exercise not found', 'övning ej hittad'))
    if (!next.oneRepMax || next.oneRepMax <= 0) problems.push(copy(locale, 'invalid weight', 'ogiltig vikt'))
    next.problem = problems.join(' · ')
    return next
  })
  const effectiveValid = effectiveRows.filter((r) => !r.problem)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            {copy(locale, 'Import PRs', 'Importera PRs')} - {teamName}
          </DialogTitle>
          <DialogDescription>
            {copy(locale, 'Paste one row per PR. Format:', 'Klistra in en rad per PR. Format:')}{' '}
            <code className="bg-muted px-1 rounded">{copy(locale, 'name, exercise, weight[, date]', 'namn, övning, vikt[, datum]')}</code>.
            {' '}{copy(locale, 'Date is optional (default: today). Source is set to "Tested".', 'Datum är valfritt (default: idag). Källa sätts som "Testat".')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="bulk-paste">{copy(locale, 'Paste', 'Klistra in')}</Label>
            <Textarea
              id="bulk-paste"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={PLACEHOLDERS[locale]}
              rows={6}
              className="font-mono text-xs"
              spellCheck={false}
              disabled={isLoading || isSubmitting}
            />
            {isLoading && (
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {copy(locale, 'Fetching team and exercises...', 'Hämtar lag och övningar...')}
              </p>
            )}
          </div>

          {effectiveRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {copy(
                    locale,
                    `Preview (${effectiveValid.length} of ${effectiveRows.length} ready)`,
                    `Förhandsgranskning (${effectiveValid.length} av ${effectiveRows.length} klara)`
                  )}
                </p>
              </div>
              <div className="rounded-md border max-h-[40vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 w-6"></th>
                      <th className="px-2 py-1.5">{copy(locale, 'Athlete', 'Atlet')}</th>
                      <th className="px-2 py-1.5">{copy(locale, 'Exercise', 'Övning')}</th>
                      <th className="px-2 py-1.5 text-right">{copy(locale, 'Weight', 'Vikt')}</th>
                      <th className="px-2 py-1.5">{copy(locale, 'Date', 'Datum')}</th>
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
                          {r.clientId ? (
                            r.clientName
                          ) : (
                            <Select
                              value=""
                              onValueChange={(v) => overrideRow(i, 'clientId', v)}
                            >
                              <SelectTrigger className="h-7 text-xs w-[140px]">
                                <SelectValue placeholder={r.clientName || copy(locale, '- select -', '- välj -')} />
                              </SelectTrigger>
                              <SelectContent>
                                {members.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.exerciseId ? (
                            r.exerciseLabel
                          ) : (
                            <Select
                              value=""
                              onValueChange={(v) => overrideRow(i, 'exerciseId', v)}
                            >
                              <SelectTrigger className="h-7 text-xs w-[160px]">
                                <SelectValue placeholder={r.exerciseLabel || copy(locale, '- select -', '- välj -')} />
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
                          {r.date || copy(locale, 'today', 'idag')}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.problem ? (
                            <span className="text-destructive">{r.problem}</span>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0">
                              {copy(locale, 'ready', 'klar')}
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
            {copy(locale, 'Close', 'Stäng')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || effectiveValid.length === 0}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {copy(locale, 'Save', 'Spara')} {effectiveValid.length > 0 ? `${effectiveValid.length} ` : ''}PR
            {effectiveValid.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
