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
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

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

const SOURCE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  TESTED: 'default',
  CALCULATED: 'secondary',
  ESTIMATED: 'outline',
}

const copy = {
  en: {
    source: {
      TESTED: 'Tested',
      CALCULATED: 'Calculated',
      ESTIMATED: 'Estimated',
    },
    sourceOptions: {
      TESTED: 'Tested (actual 1RM test)',
      CALCULATED: 'Calculated (verified formula)',
      ESTIMATED: 'Estimated (auto from sets)',
    },
    errors: {
      positiveWeight: 'Weight must be greater than 0',
      save: 'Could not save change',
      delete: 'Could not delete PR',
      fetch: 'Could not fetch PRs',
    },
    title: 'Strength PRs',
    description:
      '1RM per exercise. Add it here or via New test -> Strength. Values are used for sessions with % of 1RM.',
    importMany: 'Import multiple',
    addPr: 'Add PR',
    emptyTitle: 'No PRs logged yet.',
    emptyDescription:
      'Add the first 1RM here, or register a full strength test under New test -> Strength.',
    addFirst: 'Add first PR',
    stale: (days: number) => `${days}d ago - may be outdated`,
    measurements: (count: number) => `${count} measurements`,
    history: 'History',
    edit: 'Edit',
    remove: 'Remove',
    info:
      'Each PR is used as the reference when sessions contain "% of 1RM". Log a new PR after tests or PR sets so prescribed weights stay accurate.',
    addDialogTitle: (name: string) => `Add PR - ${name}`,
    addDialogDescription:
      'Log a new PR. 1RM is calculated automatically from reps x weight unless you test a single.',
    editDialogTitle: 'Edit PR',
    editDialogDescription: (exercise?: string) => `${exercise ?? 'PR'} - change weight or date.`,
    value: 'Value',
    unit: 'Unit',
    date: 'Date',
    sourceLabel: 'Source',
    sourceHint: 'Confirm auto-estimates by moving them to "Tested" when you have verified them.',
    cancel: 'Cancel',
    save: 'Save',
    deleteTitle: 'Delete PR?',
    deleteDescription:
      'This permanently deletes the PR log. Other measurements for the same exercise are not affected. Active sessions with "% of 1RM" use the next newest PR for the exercise.',
    deleting: 'Deleting...',
  },
  sv: {
    source: {
      TESTED: 'Testat',
      CALCULATED: 'Beräknat',
      ESTIMATED: 'Uppskattat',
    },
    sourceOptions: {
      TESTED: 'Testat (faktiskt 1RM-test)',
      CALCULATED: 'Beräknat (verifierad formel)',
      ESTIMATED: 'Uppskattat (auto från set)',
    },
    errors: {
      positiveWeight: 'Vikten måste vara större än 0',
      save: 'Kunde inte spara ändring',
      delete: 'Kunde inte ta bort PR',
      fetch: 'Kunde inte hämta PR',
    },
    title: 'Styrke-PR',
    description:
      '1RM per övning. Lägg till här eller via Nytt test -> Styrka. Värdena används för pass med % av 1RM.',
    importMany: 'Importera flera',
    addPr: 'Lägg till PR',
    emptyTitle: 'Inga PR loggade ännu.',
    emptyDescription:
      'Lägg till första 1RM här, eller registrera ett fullständigt styrketest under Nytt test -> Styrka.',
    addFirst: 'Lägg till första PR',
    stale: (days: number) => `${days}d sedan - kan vara inaktuell`,
    measurements: (count: number) => `${count} mätningar`,
    history: 'Historik',
    edit: 'Redigera',
    remove: 'Ta bort',
    info:
      'Varje PR används som referens när pass innehåller "% av 1RM". Logga ny PR efter tester eller PR-set så att vikterna stämmer.',
    addDialogTitle: (name: string) => `Lägg till PR - ${name}`,
    addDialogDescription:
      'Logga en ny PR. 1RM beräknas automatiskt från reps x vikt om du inte testar för en singel.',
    editDialogTitle: 'Redigera PR',
    editDialogDescription: (exercise?: string) => `${exercise ?? 'PR'} - ändra vikt eller datum.`,
    value: 'Värde',
    unit: 'Enhet',
    date: 'Datum',
    sourceLabel: 'Källa',
    sourceHint: 'Bekräfta auto-uppskattningar genom att flytta dem till "Testat" när du verifierat dem.',
    cancel: 'Avbryt',
    save: 'Spara',
    deleteTitle: 'Ta bort PR?',
    deleteDescription:
      'Detta tar permanent bort PR-loggen. Andra mätningar för samma övning påverkas inte. Aktiva pass med "% av 1RM" använder nästa nyaste PR för övningen.',
    deleting: 'Tar bort...',
  },
} as const

function sourceMeta(source: string, locale: AppLocale) {
  const t = copy[locale] ?? copy.en
  return {
    label: t.source[source as keyof typeof t.source] ?? source,
    variant: SOURCE_VARIANTS[source] ?? 'outline',
  }
}

function formatDate(iso: string, locale: AppLocale): string {
  return new Date(iso).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
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
  const locale = useLocale() as AppLocale
  const t = copy[locale] ?? copy.en
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
      setError(t.errors.positiveWeight)
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
      setError(e instanceof Error ? e.message : t.errors.save)
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
      setError(e instanceof Error ? e.message : t.errors.delete)
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
      setError(e instanceof Error ? e.message : t.errors.fetch)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, t.errors.fetch])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchPRs()
    }, 0)

    return () => window.clearTimeout(timeoutId)
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
            {t.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            {t.importMany}
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t.addPr}
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
          <p className="text-sm">{t.emptyTitle}</p>
          <p className="text-xs mt-1">
            {t.emptyDescription}
          </p>
          <Button size="sm" className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t.addFirst}
          </Button>
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {groups.map((g) => {
            const isOpen = expanded.has(g.exerciseId)
            const stale = staleness(g.current.date)
            const currentSourceMeta = sourceMeta(g.current.source, locale)
            const displayName = locale === 'sv' ? g.exerciseNameSv || g.exerciseName : g.exerciseName

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
                      <Badge variant={currentSourceMeta.variant} className="text-[10px] py-0">
                        {currentSourceMeta.label}
                      </Badge>
                      {stale.stale && (
                        <Badge variant="outline" className="text-[10px] py-0 text-orange-600 border-orange-300">
                          {t.stale(stale.days)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(g.current.date, locale)}
                      {g.history.length > 1 && ` · ${t.measurements(g.history.length)}`}
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
                      {t.history}
                    </p>
                    {g.history.map((h, idx) => {
                      const prev = g.history[idx + 1]
                      const delta = prev ? h.oneRepMax - prev.oneRepMax : null
                      const meta = sourceMeta(h.source, locale)
                      return (
                        <div key={h.id} className="flex items-center gap-2 text-xs group">
                          <span className="w-24 text-muted-foreground tabular-nums">
                            {formatDate(h.date, locale)}
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
                              title={t.edit}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeletingId(h.id)}
                              title={t.remove}
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
            {t.info}
          </span>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.addDialogTitle(clientName)}</DialogTitle>
            <DialogDescription>
              {t.addDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <StrengthPRForm
            clientId={clientId}
            clientName={clientName}
            onSuccess={() => {
              setFormOpen(false)
              void fetchPRs()
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
            <DialogTitle>{t.editDialogTitle}</DialogTitle>
            <DialogDescription>
              {t.editDialogDescription(editing?.exerciseName)}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <div>
                  <Label htmlFor="edit-pr-weight">{t.value}</Label>
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
                  <Label htmlFor="edit-pr-unit">{t.unit}</Label>
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
                <Label htmlFor="edit-pr-date">{t.date}</Label>
                <Input
                  id="edit-pr-date"
                  type="date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-pr-source">{t.sourceLabel}</Label>
                <Select
                  value={editing.source}
                  onValueChange={(v) => setEditing({ ...editing, source: v })}
                >
                  <SelectTrigger id="edit-pr-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TESTED">{t.sourceOptions.TESTED}</SelectItem>
                    <SelectItem value="CALCULATED">{t.sourceOptions.CALCULATED}</SelectItem>
                    <SelectItem value="ESTIMATED">{t.sourceOptions.ESTIMATED}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t.sourceHint}
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
              {t.cancel}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.save}
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
          void fetchPRs()
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? t.deleting : t.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
