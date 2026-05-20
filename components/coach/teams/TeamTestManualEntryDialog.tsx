'use client'

/**
 * TeamTestManualEntryDialog
 *
 * Form-driven alternative to the wide-format paste flow. The coach
 * picks tests from the team's hockey battery so values map to
 * canonical hockey metrics and linked 1RM exercises without name
 * ambiguity.
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Loader2, Plus, X, Pencil, Check, AlertCircle } from 'lucide-react'
import { useLocale } from 'next-intl'

type Locale = 'en' | 'sv'

const copy = (locale: Locale, en: string, sv: string) => locale === 'sv' ? sv : en

interface Member {
  id: string
  name: string
}

interface PackageItem {
  id: string
  metricKey: string
  label: string
  unit: string
  category: string
  linkedExerciseId?: string | null
  linkedExerciseName?: string | null
  aliases: string[]
  enabled: boolean
}

interface TeamTestManualEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
  businessSlug?: string
  onSaved?: () => void
}

export function TeamTestManualEntryDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  businessSlug,
  onSaved,
}: TeamTestManualEntryDialogProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [members, setMembers] = useState<Member[]>([])
  const [packageItems, setPackageItems] = useState<PackageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [exerciseLoadError, setExerciseLoadError] = useState<string | null>(null)

  const [selectedItems, setSelectedItems] = useState<PackageItem[]>([])
  const [excludedAthleteIds, setExcludedAthleteIds] = useState<Set<string>>(new Set())
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false)

  // Cell values keyed by `${clientId}:${packageItemId}` - sparse storage
  // so empty cells stay empty (vs. a 2D array of 0s the bulk endpoint
  // would reject as an invalid weight).
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setExerciseLoadError(null)
      try {
        const [teamRes, exRes] = await Promise.all([
          fetch(`/api/teams/${teamId}/analysis-summary`),
          fetch(`/api/teams/${teamId}/hockey-test-package${businessSlug ? `?businessSlug=${encodeURIComponent(businessSlug)}` : ''}`),
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
          const list = Array.isArray(body.package?.items) ? body.package.items : []
          if (!cancelled) {
            setPackageItems(list.filter((item: PackageItem) => item.enabled))
          }
        } else if (!cancelled) {
          setPackageItems([])
          setExerciseLoadError(copy(locale, 'Could not fetch the team test package right now.', 'Kunde inte hämta lagets testpaket just nu.'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [businessSlug, locale, open, teamId])

  const resetDialogState = () => {
    setSelectedItems([])
    setExcludedAthleteIds(new Set())
    setValues({})
    setResultMsg(null)
    setServerError(null)
    setExerciseLoadError(null)
    setExercisePickerOpen(false)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetDialogState()
    }
    onOpenChange(nextOpen)
  }

  const includedAthletes = useMemo(
    () => members.filter((m) => !excludedAthleteIds.has(m.id)),
    [members, excludedAthleteIds]
  )

  const cellKey = (clientId: string, packageItemId: string) => `${clientId}:${packageItemId}`

  const setCell = (clientId: string, packageItemId: string, raw: string) => {
    setValues((prev) => {
      const k = cellKey(clientId, packageItemId)
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

  const addItem = (item: PackageItem) => {
    if (selectedItems.some((selected) => selected.id === item.id)) {
      setExercisePickerOpen(false)
      return
    }
    setSelectedItems((prev) => [...prev, item])
    setExercisePickerOpen(false)
  }

  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id))
    // Drop any cells for this test so the submission
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
  // would reject them anyway as invalid values.
  const entries = useMemo(() => {
    const out: Array<{
      clientId: string
      packageItemId: string
      value: number
    }> = []
    for (const member of includedAthletes) {
      for (const item of selectedItems) {
        const raw = values[cellKey(member.id, item.id)]
        if (!raw) continue
        const value = parseFloat(raw.replace(',', '.'))
        if (!Number.isFinite(value) || value <= 0) continue
        out.push({
          clientId: member.id,
          packageItemId: item.id,
          value,
        })
      }
    }
    return out
  }, [values, includedAthletes, selectedItems])

  const handleSubmit = async () => {
    if (entries.length === 0) return
    setIsSubmitting(true)
    setServerError(null)
    setResultMsg(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/hockey-test-package/results${businessSlug ? `?businessSlug=${encodeURIComponent(businessSlug)}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testDate,
          entries,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const body = await res.json()
      const prCount = (body.prCreated ?? 0) + (body.prUpdated ?? 0)
      const hockeyCount = (body.hockeyCreated ?? 0) + (body.hockeyUpdated ?? 0)
      setResultMsg(copy(locale, `Saved ${hockeyCount} hockey tests - ${prCount} PR rows.`, `Sparade ${hockeyCount} hockeytester - ${prCount} PR-rader.`))
      setValues({})
      onSaved?.()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : copy(locale, 'Could not save', 'Kunde inte spara'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-500" />
            {copy(locale, 'Manual entry', 'Manuell inmatning')} - {teamName}
          </DialogTitle>
          <DialogDescription>
            {copy(locale, 'Choose tests from the team hockey package (columns) and athletes (rows). Empty cells are skipped. Strength tests are also saved to PR history when the test has a linked exercise.', 'Välj tester från lagets hockeypaket (kolumner) och atleter (rader). Tom cell hoppas över. Styrketester sparas även till PR-historik när testet har en kopplad övning.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
            <div>
              <Label htmlFor="manual-test-date">{copy(locale, 'Test date', 'Testdatum')}</Label>
              <Input
                id="manual-test-date"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label>{copy(locale, 'Tests', 'Tester')}</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 items-center min-h-[36px]">
                  {selectedItems.map((item) => (
                    <Badge key={item.id} variant="secondary" className="text-xs gap-1">
                      {item.label}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="hover:text-destructive transition-colors"
                        aria-label={copy(locale, 'Remove test', 'Ta bort test')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={isLoading}
                    aria-expanded={exercisePickerOpen}
                    onClick={() => setExercisePickerOpen((current) => !current)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1" />
                    )}
                    {copy(locale, 'Add test', 'Lägg till test')}
                  </Button>
                </div>

                {exercisePickerOpen && (
                  <div className="w-full max-w-sm overflow-hidden rounded-md border bg-background shadow-sm">
                    <Command>
                      <CommandInput placeholder={copy(locale, 'Search test...', 'Sök test...')} className="h-9" />
                      <CommandList>
                        <CommandEmpty>
                          {exerciseLoadError ?? copy(locale, 'No tests found', 'Inga tester hittades')}
                        </CommandEmpty>
                        <CommandGroup>
                          {packageItems
                            .filter((item) => !selectedItems.some((selected) => selected.id === item.id))
                            .map((item) => (
                              <CommandItem
                                key={item.id}
                                value={`${item.label} ${item.aliases.join(' ')}`}
                                onSelect={() => addItem(item)}
                              >
                                <div className="flex w-full items-center justify-between gap-2">
                                  <span>{item.label}</span>
                                  <span className="text-[10px] uppercase text-muted-foreground">
                                    {item.unit}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                )}

                {exerciseLoadError && !exercisePickerOpen && (
                  <p className="text-xs text-destructive">{exerciseLoadError}</p>
                )}
              </div>
            </div>
          </div>

          {members.length > 0 && (
            <div>
              <Label>{copy(locale, 'Athletes', 'Atleter')}</Label>
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
                {copy(locale, `${includedAthletes.length} of ${members.length} athletes included.`, `${includedAthletes.length} av ${members.length} atleter inkluderade.`)}
              </p>
            </div>
          )}

          {includedAthletes.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {copy(locale, 'Select at least one athlete to start entry.', 'Välj minst en atlet för att starta inmatning.')}
            </p>
          )}

          {selectedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {copy(locale, 'Add at least one test to start entry.', 'Lägg till minst ett test för att starta inmatning.')}
            </p>
          ) : includedAthletes.length > 0 ? (
            <div className="rounded-md border overflow-auto max-h-[50vh]">
              <table className="text-xs min-w-max">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left min-w-[180px]">{copy(locale, 'Athlete', 'Atlet')}</th>
                    {selectedItems.map((item) => (
                      <th key={item.id} className="px-2 py-1.5 text-left min-w-[170px]">
                        <span className="inline-block max-w-[130px] truncate align-bottom">
                          {item.label}
                        </span>
                        <span className="ml-1 font-normal text-muted-foreground">
                          ({item.unit})
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {includedAthletes.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-2 py-1.5 font-medium">{m.name}</td>
                      {selectedItems.map((item) => (
                        <td key={item.id} className="px-1 py-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="-"
                            value={values[cellKey(m.id, item.id)] ?? ''}
                            onChange={(e) => setCell(m.id, item.id, e.target.value)}
                            className="h-7 w-40 text-xs px-2 tabular-nums"
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
              {copy(locale, `${entries.length} results ready to save.`, `${entries.length} resultat redo att sparas.`)}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isSubmitting}>
            {copy(locale, 'Close', 'Stäng')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || entries.length === 0 || isLoading}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {copy(locale, `Save ${entries.length > 0 ? `${entries.length} ` : ''}results`, `Spara ${entries.length > 0 ? `${entries.length} ` : ''}resultat`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
