'use client'

/**
 * TeamTestImportDialog
 *
 * Wide-format team-test paste import. Built for the way coaches
 * actually record team tests on paper — rows are athletes, columns
 * are exercises, with an optional "Vikt" column for bodyweight that
 * applies to every PR in that row.
 *
 * Flow:
 *  1. Coach pastes the grid (tab- / comma- / semicolon-separated)
 *  2. Parser extracts headers + names + values, splitting trailing
 *     annotations like "180 Hex" into value=180, note="Hex"
 *  3. Component fuzzy-matches each header against the exercise
 *     library and each first-cell against the team roster, exposing
 *     row-level Selects so the coach can correct misses
 *  4. Per-column unit picker (default KG, Chins/pull-ups auto-detected
 *     to COUNT, etc.)
 *  5. "Spara N PRs" submits everything that has a matched name +
 *     header + numeric value to the existing /api/strength-pr/bulk
 *     endpoint
 *
 * Source defaults to TESTED — these are real measured values, not
 * Epley estimates.
 */

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
import { parseWideFormat, type ParsedWideFormat } from '@/lib/strength/parse-wide-format'
import { PR_UNITS, PR_UNIT_LABELS, type PrUnit } from '@/lib/strength/units'

interface Member {
  id: string
  name: string
}

interface Exercise {
  id: string
  name: string
  nameSv: string | null
}

interface TeamTestImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
  onImported?: () => void
}

const PLACEHOLDER = `Namn\tBenböj\tFrivändning\tBänkpress\tChins\tVikt
Oscar Nilsson\t\t\t\t25\t82.4
Edward Björk\t160\t100\t\t25\t79.6
Wilmer Lindqvist\t\t180 Hex\t\t20\t90.8`

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

function pickMember(input: string, members: Member[]): Member | null {
  const target = normalize(input)
  if (!target) return null
  const exact = members.find((m) => normalize(m.name) === target)
  if (exact) return exact
  const starts = members.find((m) => normalize(m.name).startsWith(target))
  if (starts) return starts
  return members.find((m) => normalize(m.name).includes(target)) ?? null
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

// Header → unit guess. Most strength lifts default to KG; rep-count
// tests like Chins / Pull-ups go COUNT; sprint times go S. Coach can
// override per column.
function guessUnit(header: string): PrUnit {
  const n = normalize(header)
  if (/(chins|pull[\s-]?up|push[\s-]?up|sit[\s-]?up|dips|reps)/.test(n)) return 'COUNT'
  if (/(sprint|sec|tid|time|plank|hang)/.test(n)) return 'S'
  if (/(jump.*cm|hopp|vertical|vert\.|broad|hojd|höjd)/.test(n)) return 'CM'
  if (/(power|watt|ftp)/.test(n)) return 'W'
  if (/(distance|meter|length|kast|throw)/.test(n)) return 'M'
  if (/(speed|kmh|km\/h)/.test(n)) return 'KMH'
  return 'KG'
}

export function TeamTestImportDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  onImported,
}: TeamTestImportDialogProps) {
  const [paste, setPaste] = useState('')
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [members, setMembers] = useState<Member[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  // Per-column overrides for header → exerciseId. Per-row overrides
  // for name → clientId. Reset every time the paste changes.
  const [headerOverrides, setHeaderOverrides] = useState<Record<number, string>>({})
  const [nameOverrides, setNameOverrides] = useState<Record<number, string>>({})
  const [unitOverrides, setUnitOverrides] = useState<Record<number, PrUnit>>({})

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const [teamRes, exRes] = await Promise.all([
          fetch(`/api/teams/${teamId}/analysis-summary`),
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
              list.map((e: { id: string; name: string; nameSv: string | null }) => ({
                id: e.id,
                name: e.name,
                nameSv: e.nameSv,
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
  }, [open, teamId])

  // Reset all overrides whenever the paste changes — old indices are
  // invalid against a re-parsed grid.
  useEffect(() => {
    setHeaderOverrides({})
    setNameOverrides({})
    setUnitOverrides({})
  }, [paste])

  const parsed: ParsedWideFormat = useMemo(() => parseWideFormat(paste), [paste])

  // Auto-match each header / name / unit, with override taking precedence.
  const matchedHeaders = useMemo(
    () =>
      parsed.headers.map((h, i) => {
        const overrideId = headerOverrides[i]
        if (overrideId) {
          const ex = exercises.find((e) => e.id === overrideId)
          if (ex) return ex
        }
        return pickExercise(h, exercises)
      }),
    [parsed.headers, headerOverrides, exercises]
  )

  const matchedNames = useMemo(
    () =>
      parsed.names.map((n, i) => {
        const overrideId = nameOverrides[i]
        if (overrideId) {
          const m = members.find((mm) => mm.id === overrideId)
          if (m) return m
        }
        return pickMember(n, members)
      }),
    [parsed.names, nameOverrides, members]
  )

  const matchedUnits = useMemo(
    () =>
      parsed.headers.map((h, i) => unitOverrides[i] ?? guessUnit(h)),
    [parsed.headers, unitOverrides]
  )

  // Build the submittable entries from the parsed cells × matches.
  const entries = useMemo(
    () =>
      parsed.cells
        .map((cell) => {
          const member = matchedNames[cell.rowIndex]
          const exercise = matchedHeaders[cell.colIndex]
          const unit = matchedUnits[cell.colIndex]
          if (!member || !exercise) return null
          return {
            clientId: member.id,
            exerciseId: exercise.id,
            oneRepMax: cell.value,
            unit,
            bodyWeight: cell.bodyWeight ?? undefined,
            notes: cell.note || undefined,
          }
        })
        .filter((e): e is NonNullable<typeof e> => e !== null),
    [parsed.cells, matchedHeaders, matchedNames, matchedUnits]
  )

  const unmatchedHeaders = matchedHeaders.filter((h) => !h).length
  const unmatchedNames = matchedNames.filter((n) => !n).length

  const handleSubmit = async () => {
    if (entries.length === 0) return
    setIsSubmitting(true)
    setServerError(null)
    setResultMsg(null)
    try {
      const res = await fetch('/api/strength-pr/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          entries: entries.map((e) => ({
            ...e,
            date: testDate,
            source: 'TESTED' as const,
          })),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const body = await res.json()
      setResultMsg(`Sparade ${body.created} PRs från testpasset.`)
      setPaste('')
      onImported?.()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Kunde inte spara')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            Importera testresultat – {teamName}
          </DialogTitle>
          <DialogDescription>
            Klistra in en testtabell. Första raden är rubriker (övningar). Varje
            efterföljande rad är en atlet. Cellvärden som "180 Hex" sparas som
            180 kg med "Hex" som notering. En "Vikt"-kolumn används som
            kroppsvikt för alla rader.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_180px] gap-3">
            <div>
              <Label htmlFor="test-paste">Testtabell</Label>
              <Textarea
                id="test-paste"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={8}
                className="font-mono text-xs"
                spellCheck={false}
                disabled={isLoading || isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="test-date">Testdatum</Label>
              <Input
                id="test-date"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                disabled={isSubmitting}
              />
              {parsed.bodyWeightDetected && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Vikt-kolumn upptäckt → sparas som kroppsvikt per atlet.
                </p>
              )}
            </div>
          </div>

          {parsed.headers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Förhandsgranskning ({entries.length} PRs klara
                {unmatchedHeaders + unmatchedNames > 0 &&
                  ` · ${unmatchedHeaders} kolumn(er) + ${unmatchedNames} atlet(er) behöver matchning`}
                )
              </p>

              <div className="rounded-md border overflow-x-auto max-h-[50vh]">
                <table className="text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left min-w-[160px]">Atlet</th>
                      {parsed.headers.map((h, i) => {
                        const matched = matchedHeaders[i]
                        return (
                          <th key={i} className="px-2 py-1.5 text-left min-w-[140px]">
                            <div className="flex flex-col gap-0.5">
                              {matched ? (
                                <span className="font-medium">
                                  {matched.nameSv || matched.name}
                                </span>
                              ) : (
                                <Select
                                  value=""
                                  onValueChange={(v) =>
                                    setHeaderOverrides((p) => ({ ...p, [i]: v }))
                                  }
                                >
                                  <SelectTrigger className="h-6 text-[11px]">
                                    <SelectValue placeholder={h || '— välj —'} />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    {exercises.map((e) => (
                                      <SelectItem key={e.id} value={e.id}>
                                        {e.nameSv || e.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <Select
                                value={matchedUnits[i]}
                                onValueChange={(v) =>
                                  setUnitOverrides((p) => ({ ...p, [i]: v as PrUnit }))
                                }
                              >
                                <SelectTrigger className="h-5 text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PR_UNITS.map((u) => (
                                    <SelectItem key={u} value={u}>
                                      {PR_UNIT_LABELS[u]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.names.map((name, rIdx) => {
                      const matched = matchedNames[rIdx]
                      return (
                        <tr key={rIdx} className="border-t">
                          <td className="px-2 py-1.5">
                            {matched ? (
                              <div className="flex items-center gap-1">
                                <Check className="h-3 w-3 text-green-600 shrink-0" />
                                <span className="truncate">{matched.name}</span>
                              </div>
                            ) : (
                              <Select
                                value=""
                                onValueChange={(v) =>
                                  setNameOverrides((p) => ({ ...p, [rIdx]: v }))
                                }
                              >
                                <SelectTrigger className="h-6 text-[11px] min-w-[140px]">
                                  <SelectValue placeholder={name} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {members.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          {parsed.headers.map((_, cIdx) => {
                            const cell = parsed.cells.find(
                              (c) => c.rowIndex === rIdx && c.colIndex === cIdx
                            )
                            const headerMatched = !!matchedHeaders[cIdx]
                            const nameMatched = !!matched
                            return (
                              <td
                                key={cIdx}
                                className={`px-2 py-1.5 tabular-nums ${
                                  cell && headerMatched && nameMatched
                                    ? 'text-foreground'
                                    : cell
                                      ? 'text-orange-600'
                                      : 'text-muted-foreground/50'
                                }`}
                              >
                                {cell ? (
                                  <div className="flex items-baseline gap-1">
                                    <span>
                                      {cell.value} {PR_UNIT_LABELS[matchedUnits[cIdx]]}
                                    </span>
                                    {cell.note && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {cell.note}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  '—'
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
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
            Stäng
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || entries.length === 0 || isLoading}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Spara {entries.length > 0 ? `${entries.length} ` : ''}PR
            {entries.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
