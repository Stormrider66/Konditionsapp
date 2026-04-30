'use client'

/**
 * TeamTestManualEntryDialog
 *
 * Form-driven alternative to the wide-format paste flow. Use case:
 * the coach is sitting next to the rack with a phone, no paper sheet
 * to paste from. Pick exercises + athletes, type values into a grid,
 * save.
 *
 * Submission piggybacks on the same /api/strength-pr/bulk endpoint
 * the paste flow uses. Source = TESTED, unit = KG (always — for now
 * non-KG tests still go through the per-PR form).
 */

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Loader2, Plus, X, Pencil, Check, AlertCircle } from 'lucide-react'

interface Member {
  id: string
  name: string
}

interface Exercise {
  id: string
  name: string
  nameSv: string | null
}

interface TeamTestManualEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
  onSaved?: () => void
}

export function TeamTestManualEntryDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  onSaved,
}: TeamTestManualEntryDialogProps) {
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [members, setMembers] = useState<Member[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  // Selection state. Athletes default-included; coach un-checks the
  // ones not present at the test. Exercises start empty — coach picks
  // each one through the searchable popover.
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([])
  const [excludedAthleteIds, setExcludedAthleteIds] = useState<Set<string>>(new Set())
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false)

  // Cell values keyed by `${clientId}:${exerciseId}` — sparse storage
  // so empty cells stay empty (vs. a 2D array of 0s the bulk endpoint
  // would reject as ogiltig vikt).
  const [values, setValues] = useState<Record<string, string>>({})

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

  // Reset state when the dialog closes so reopening starts clean.
  useEffect(() => {
    if (open) return
    setSelectedExercises([])
    setExcludedAthleteIds(new Set())
    setValues({})
    setResultMsg(null)
    setServerError(null)
  }, [open])

  const includedAthletes = useMemo(
    () => members.filter((m) => !excludedAthleteIds.has(m.id)),
    [members, excludedAthleteIds]
  )

  const cellKey = (clientId: string, exerciseId: string) => `${clientId}:${exerciseId}`

  const setCell = (clientId: string, exerciseId: string, raw: string) => {
    setValues((prev) => {
      const k = cellKey(clientId, exerciseId)
      const next = { ...prev }
      const trimmed = raw.trim()
      if (trimmed === '') {
        delete next[k]
      } else {
        next[k] = raw
      }
      return next
    })
  }

  const addExercise = (ex: Exercise) => {
    if (selectedExercises.some((e) => e.id === ex.id)) {
      setExercisePickerOpen(false)
      return
    }
    setSelectedExercises((prev) => [...prev, ex])
    setExercisePickerOpen(false)
  }

  const removeExercise = (id: string) => {
    setSelectedExercises((prev) => prev.filter((e) => e.id !== id))
    // Drop any cells for this exercise so the kg → bulk submission
    // doesn't carry orphan values from a removed column.
    setValues((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(next)) {
        if (k.endsWith(`:${id}`)) delete next[k]
      }
      return next
    })
  }

  const toggleAthlete = (id: string) => {
    setExcludedAthleteIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Build entries from non-empty, valid cells. Cells whose values
  // can't parse as positive numbers are silently skipped (server
  // would reject them anyway with `ogiltig vikt`).
  const entries = useMemo(() => {
    const out: Array<{
      clientId: string
      exerciseId: string
      oneRepMax: number
    }> = []
    for (const member of includedAthletes) {
      for (const ex of selectedExercises) {
        const raw = values[cellKey(member.id, ex.id)]
        if (!raw) continue
        const value = parseFloat(raw.replace(',', '.'))
        if (!Number.isFinite(value) || value <= 0) continue
        out.push({
          clientId: member.id,
          exerciseId: ex.id,
          oneRepMax: value,
        })
      }
    }
    return out
  }, [values, includedAthletes, selectedExercises])

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
      const updatedSuffix = body.updated > 0 ? ` · ${body.updated} uppdaterade` : ''
      setResultMsg(`Sparade ${body.created} nya PRs${updatedSuffix}.`)
      setValues({})
      onSaved?.()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Kunde inte spara')
    } finally {
      setIsSubmitting(false)
    }
  }

  const exercisesById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-500" />
            Manuell inmatning – {teamName}
          </DialogTitle>
          <DialogDescription>
            Välj övningar (kolumner) och atleter (rader), skriv in vikt per cell. Tom
            cell hoppas över. Källa sätts som &quot;Testat&quot;, enhet KG.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
            <div>
              <Label htmlFor="manual-test-date">Testdatum</Label>
              <Input
                id="manual-test-date"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label>Övningar</Label>
              <div className="flex flex-wrap gap-1.5 items-center min-h-[36px]">
                {selectedExercises.map((ex) => (
                  <Badge key={ex.id} variant="secondary" className="text-xs gap-1">
                    {ex.nameSv || ex.name}
                    <button
                      type="button"
                      onClick={() => removeExercise(ex.id)}
                      className="hover:text-destructive transition-colors"
                      aria-label="Ta bort övning"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Popover open={exercisePickerOpen} onOpenChange={setExercisePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={isLoading}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Lägg till övning
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Sök övning…" className="h-9" />
                      <CommandList>
                        <CommandEmpty>Inga övningar hittades</CommandEmpty>
                        <CommandGroup>
                          {exercises
                            .filter((e) => !selectedExercises.some((s) => s.id === e.id))
                            .map((e) => (
                              <CommandItem
                                key={e.id}
                                value={`${e.nameSv ?? ''} ${e.name}`}
                                onSelect={() => addExercise(e)}
                              >
                                {e.nameSv || e.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {members.length > 0 && (
            <div>
              <Label>Atleter</Label>
              <div className="rounded-md border bg-muted/20 p-2 flex flex-wrap gap-2">
                {members.map((m) => {
                  const included = !excludedAthleteIds.has(m.id)
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
                    >
                      <Checkbox
                        checked={included}
                        onCheckedChange={() => toggleAthlete(m.id)}
                      />
                      <span className={included ? '' : 'text-muted-foreground line-through'}>
                        {m.name}
                      </span>
                    </label>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {includedAthletes.length} av {members.length} atleter inkluderade.
              </p>
            </div>
          )}

          {includedAthletes.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Välj minst en atlet för att starta inmatning.
            </p>
          )}

          {selectedExercises.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Lägg till minst en övning för att starta inmatning.
            </p>
          ) : includedAthletes.length > 0 ? (
            <div className="rounded-md border overflow-x-auto max-h-[50vh]">
              <table className="text-xs w-full">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left min-w-[160px]">Atlet</th>
                    {selectedExercises.map((ex) => (
                      <th key={ex.id} className="px-2 py-1.5 text-left min-w-[110px]">
                        {ex.nameSv || ex.name}
                        <span className="ml-1 font-normal text-muted-foreground">
                          (kg)
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {includedAthletes.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-2 py-1.5 font-medium">{m.name}</td>
                      {selectedExercises.map((ex) => (
                        <td key={ex.id} className="px-1 py-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="—"
                            value={values[cellKey(m.id, ex.id)] ?? ''}
                            onChange={(e) => setCell(m.id, ex.id, e.target.value)}
                            className="h-7 text-xs px-2 tabular-nums"
                            disabled={isSubmitting}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

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

          {entries.length > 0 && !isSubmitting && (
            <p className="text-xs text-muted-foreground text-center">
              {entries.length} PRs redo att sparas.
            </p>
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
