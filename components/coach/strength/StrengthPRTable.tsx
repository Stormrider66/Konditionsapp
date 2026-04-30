'use client'

/**
 * StrengthPRTable
 *
 * Renders an athlete's recorded 1RMs grouped by exercise. Each row
 * shows the current PR + a small history (date, value, source) on
 * expand. The "Lägg till PR" button opens StrengthPRForm in a dialog.
 *
 * The current PR per exercise is what `% av 1RM` session prescriptions
 * resolve against in the focus-mode runner — so this is also the
 * surface a coach uses to keep team workouts producing the right
 * resolved kg per athlete.
 */

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, ChevronDown, ChevronRight, Trophy, Info, Pencil, Trash2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StrengthPRForm } from './StrengthPRForm'
import { ClientBulkPRImportDialog } from './ClientBulkPRImportDialog'
import { PR_UNITS, PR_UNIT_LABELS, isPrUnit, type PrUnit } from '@/lib/strength/units'

interface OneRepMaxEntry {
  id: string
  date: string
  oneRepMax: number
  source: string
  unit: string
  bodyWeight: number | null
  notes: string | null
}

interface OneRepMaxGroup {
  exerciseId: string
  exerciseName: string
  exerciseNameSv: string | null
  category: string
  current: OneRepMaxEntry
  history: OneRepMaxEntry[]
}

interface StrengthPRTableProps {
  clientId: string
  clientName: string
}

const SOURCE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  TESTED: { label: 'Testat', variant: 'default' },
  CALCULATED: { label: 'Beräknat', variant: 'secondary' },
  ESTIMATED: { label: 'Uppskattat', variant: 'outline' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function staleness(iso: string): { stale: boolean; days: number } {
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  )
  // 90 days = roughly a strength block. PRs older than this likely
  // don't reflect the athlete's current capacity, so % prescriptions
  // built on them may be off.
  return { stale: days > 90, days }
}

export function StrengthPRTable({ clientId, clientName }: StrengthPRTableProps) {
  const [groups, setGroups] = useState<OneRepMaxGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  // Edit / delete state. Source is editable so coaches can confirm an
  // auto-detected ESTIMATED → TESTED after they actually verified it,
  // which is what makes the runner-side PR feed actionable. Exercise
  // re-assignment still goes through delete + add.
  const [editing, setEditing] = useState<
    | {
        id: string
        exerciseName: string
        oneRepMax: string
        date: string
        source: string
        unit: string
      }
    | null
  >(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSaveEdit = async () => {
    if (!editing) return
    const value = parseFloat(editing.oneRepMax)
    if (!value || value <= 0) {
      setError('Vikten måste vara större än 0')
      return
    }
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/strength-pr/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oneRepMax: value,
          date: editing.date,
          source: editing.source,
          unit: editing.unit,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEditing(null)
      await fetchPRs()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara ändring')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/strength-pr/${deletingId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDeletingId(null)
      await fetchPRs()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte ta bort PR')
    } finally {
      setIsDeleting(false)
    }
  }

  const fetchPRs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/one-rep-maxes`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.success) setGroups(data.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta PR')
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchPRs()
  }, [fetchPRs])

  const toggleExpanded = (exerciseId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(exerciseId)) next.delete(exerciseId)
      else next.add(exerciseId)
      return next
    })
  }

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Styrke-PR
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            1RM per övning. Används för att räkna ut vikt när pass har % av 1RM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Importera flera
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Lägg till PR
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive py-4">{error}</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Inga PR loggade ännu.</p>
          <p className="text-xs mt-1">
            Lägg till en PR för att aktivera %-baserade pass för {clientName}.
          </p>
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {groups.map((g) => {
            const isOpen = expanded.has(g.exerciseId)
            const stale = staleness(g.current.date)
            const sourceMeta = SOURCE_LABELS[g.current.source] ?? {
              label: g.current.source,
              variant: 'outline' as const,
            }
            const displayName = g.exerciseNameSv || g.exerciseName

            return (
              <div key={g.exerciseId}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(g.exerciseId)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{displayName}</span>
                      <Badge variant={sourceMeta.variant} className="text-[10px] py-0">
                        {sourceMeta.label}
                      </Badge>
                      {stale.stale && (
                        <Badge variant="outline" className="text-[10px] py-0 text-orange-600 border-orange-300">
                          {stale.days}d sedan – kan vara inaktuell
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(g.current.date)}
                      {g.history.length > 1 && ` · ${g.history.length} mätningar`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold tabular-nums">
                      {g.current.oneRepMax}{' '}
                      <span className="text-sm font-normal text-muted-foreground">
                        {PR_UNIT_LABELS[(isPrUnit(g.current.unit) ? g.current.unit : 'KG') as PrUnit]}
                      </span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="bg-muted/20 px-3 py-2 space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Historik
                    </p>
                    {g.history.map((h, idx) => {
                      const prev = g.history[idx + 1]
                      const delta = prev ? h.oneRepMax - prev.oneRepMax : null
                      const meta = SOURCE_LABELS[h.source] ?? { label: h.source, variant: 'outline' as const }
                      return (
                        <div key={h.id} className="flex items-center gap-2 text-xs group">
                          <span className="w-24 text-muted-foreground tabular-nums">
                            {formatDate(h.date)}
                          </span>
                          <Badge variant={meta.variant} className="text-[10px] py-0 shrink-0">
                            {meta.label}
                          </Badge>
                          <span className="font-mono ml-auto">
                            {h.oneRepMax}{' '}
                            {PR_UNIT_LABELS[(isPrUnit(h.unit) ? h.unit : 'KG') as PrUnit]}
                          </span>
                          {delta != null && delta !== 0 ? (
                            <span
                              className={`text-[10px] tabular-nums w-10 text-right ${
                                delta > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {delta > 0 ? '+' : ''}
                              {delta}
                            </span>
                          ) : (
                            <span className="w-10" />
                          )}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                              onClick={() =>
                                setEditing({
                                  id: h.id,
                                  exerciseName: displayName,
                                  oneRepMax: String(h.oneRepMax),
                                  date: h.date.slice(0, 10),
                                  source: h.source,
                                  unit: isPrUnit(h.unit) ? h.unit : 'KG',
                                })
                              }
                              title="Redigera"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeletingId(h.id)}
                              title="Ta bort"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && groups.length > 0 && (
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            Varje PR används som referens när pass innehåller &quot;% av 1RM&quot;. Logga ny PR efter
            tester eller PR-set så att vikterna stämmer.
          </span>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lägg till PR – {clientName}</DialogTitle>
            <DialogDescription>
              Logga en ny PR. 1RM beräknas automatiskt från reps × vikt om du inte
              testar för en singel.
            </DialogDescription>
          </DialogHeader>
          <StrengthPRForm
            clientId={clientId}
            clientName={clientName}
            onSuccess={() => {
              setFormOpen(false)
              fetchPRs()
            }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Inline edit — typo / date corrections only. Re-categorising
          (changing the exercise or source) is rare and goes through
          delete + add. */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redigera PR</DialogTitle>
            <DialogDescription>
              {editing?.exerciseName} – ändra vikt eller datum.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <div>
                  <Label htmlFor="edit-pr-weight">Värde</Label>
                  <Input
                    id="edit-pr-weight"
                    type="number"
                    step="0.5"
                    min={0}
                    value={editing.oneRepMax}
                    onChange={(e) =>
                      setEditing({ ...editing, oneRepMax: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-pr-unit">Enhet</Label>
                  <Select
                    value={editing.unit}
                    onValueChange={(v) => setEditing({ ...editing, unit: v })}
                  >
                    <SelectTrigger id="edit-pr-unit">
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
              </div>
              <div>
                <Label htmlFor="edit-pr-date">Datum</Label>
                <Input
                  id="edit-pr-date"
                  type="date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-pr-source">Källa</Label>
                <Select
                  value={editing.source}
                  onValueChange={(v) => setEditing({ ...editing, source: v })}
                >
                  <SelectTrigger id="edit-pr-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TESTED">Testat (faktiskt 1RM-test)</SelectItem>
                    <SelectItem value="CALCULATED">Beräknat (verifierad formel)</SelectItem>
                    <SelectItem value="ESTIMATED">Uppskattat (auto från set)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Bekräfta auto-uppskattningar genom att flytta dem till &quot;Testat&quot; när du verifierat dem.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={isSavingEdit}
            >
              Avbryt
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Spara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientBulkPRImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        clientId={clientId}
        clientName={clientName}
        onImported={() => {
          setBulkOpen(false)
          fetchPRs()
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort PR?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta tar permanent bort PR-loggen. Andra mätningar för samma övning
              påverkas inte. Aktiva pass med &quot;% av 1RM&quot; använder nästa nyaste PR
              för övningen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Tar bort…' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
