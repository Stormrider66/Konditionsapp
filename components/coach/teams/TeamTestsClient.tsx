'use client'

/**
 * TeamTestsClient
 *
 * The team Tests page. Two halves:
 *  - "Importera testresultat" CTA opens TeamTestImportDialog (the
 *    wide-format paste flow that mirrors a coach's paper sheet).
 *  - History list of past test sessions (synthesised by grouping
 *    OneRepMaxHistory rows by date), each session expandable into
 *    the per-row PR list with name + value + unit + source badge.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Upload,
  ChevronDown,
  ChevronRight,
  Calendar,
  Users,
  Activity,
  ExternalLink,
  Pencil,
  Trash2,
  Shield,
  Trophy,
} from 'lucide-react'
import { TeamTestImportDialog } from './TeamTestImportDialog'
import { TeamTestManualEntryDialog } from './TeamTestManualEntryDialog'
import { PR_UNIT_LABELS, isPrUnit, type PrUnit, PR_UNITS } from '@/lib/strength/units'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
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

interface PRRow {
  id: string
  clientId: string
  exerciseId: string
  exerciseName: string
  oneRepMax: number
  unit: string
  source: string
  athleteName: string
}

interface TestSession {
  date: string
  athleteCount: number
  exerciseCount: number
  totalPRs: number
  bySource: Record<'TESTED' | 'CALCULATED' | 'ESTIMATED', number>
  rows: PRRow[]
}

interface HockeyMetric {
  key: string
  label: string
  unit: string
  lowerIsBetter?: boolean
}

interface HockeyAthleteRow {
  id: string
  name: string
  latestTestDate: string | null
  metrics: Record<string, number | null>
  ranks: Record<string, { rank: number; percentile: number } | null>
}

interface HockeyLeader {
  key: string
  label: string
  unit: string
  coverage: number
  average: number | null
  leader: { athleteId: string; athleteName: string; value: number } | null
}

interface HockeyTeamSummary {
  metrics: HockeyMetric[]
  athletes: HockeyAthleteRow[]
  leaders: HockeyLeader[]
  testCount: number
}

interface TeamTestsClientProps {
  teamId: string
  teamName: string
  basePath: string
}

const SOURCE_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  TESTED: { label: 'Testat', variant: 'default' },
  CALCULATED: { label: 'Beräknat', variant: 'secondary' },
  ESTIMATED: { label: 'Auto', variant: 'outline' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatMetricValue(value: number | null | undefined, unit: string): string {
  if (value == null) return '–'
  const decimals = unit === 's' ? 2 : unit === 'W/kg' || unit === 'nivå' ? 1 : 0
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function getRankVariant(percentile: number): 'default' | 'secondary' | 'outline' {
  if (percentile >= 80) return 'default'
  if (percentile >= 50) return 'secondary'
  return 'outline'
}

export function TeamTestsClient({ teamId, teamName, basePath }: TeamTestsClientProps) {
  const [sessions, setSessions] = useState<TestSession[]>([])
  const [hockey, setHockey] = useState<HockeyTeamSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Edit/delete state for individual PRs in a session. Editing uses
  // the same PATCH endpoint as the per-client PR table — value, unit,
  // source. Re-categorising the exercise still goes through delete +
  // re-add since changing exerciseId rewrites the row's identity.
  const [editing, setEditing] = useState<
    | {
        id: string
        athleteName: string
        exerciseName: string
        oneRepMax: string
        unit: string
        source: string
      }
    | null
  >(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSaveEdit = async () => {
    if (!editing) return
    const value = parseFloat(editing.oneRepMax.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) return
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/strength-pr/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oneRepMax: value,
          unit: editing.unit,
          source: editing.source,
        }),
      })
      if (res.ok) {
        setEditing(null)
        await fetchSessions()
      }
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/strength-pr/${deletingId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeletingId(null)
        await fetchSessions()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/test-sessions`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      if (body.success) {
        setSessions(body.data.sessions)
        setHockey(body.data.hockey ?? null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta testdata')
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  const toggleExpand = (date: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {hockey && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-500" />
                  Hockey testmatris
                </CardTitle>
                <CardDescription>
                  Senaste hockeysession per spelare med lagets nyckelvärden, rank och percentil.
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {hockey.testCount} hockeytester
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {hockey.leaders
                .filter((leader) => leader.leader)
                .slice(0, 4)
                .map((leader) => (
                  <div key={leader.key} className="rounded-md border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">{leader.label}</p>
                    <p className="text-sm font-semibold truncate">{leader.leader?.athleteName}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatMetricValue(leader.leader?.value, leader.unit)}
                      {leader.average != null && ` · snitt ${formatMetricValue(leader.average, leader.unit)}`}
                    </p>
                  </div>
                ))}
            </div>

            {hockey.athletes.some((athlete) => athlete.latestTestDate) ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium min-w-40">
                        Spelare
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Senast</th>
                      {hockey.metrics.map((metric) => (
                        <th key={metric.key} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                          {metric.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hockey.athletes.map((athlete) => (
                      <tr key={athlete.id} className="border-b last:border-0">
                        <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium">
                          <Link href={`${basePath}/clients/${athlete.id}/profile?tab=hockey`} className="hover:underline">
                            {athlete.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {athlete.latestTestDate ? new Date(athlete.latestTestDate).toLocaleDateString('sv-SE') : '–'}
                        </td>
                        {hockey.metrics.map((metric) => (
                          <td key={metric.key} className="px-3 py-2 text-right font-mono whitespace-nowrap">
                            <div>{formatMetricValue(athlete.metrics[metric.key], metric.unit)}</div>
                            {athlete.ranks[metric.key] && (
                              <Badge
                                variant={getRankVariant(athlete.ranks[metric.key]?.percentile ?? 0)}
                                className="mt-1 h-4 px-1.5 text-[9px] font-normal"
                              >
                                #{athlete.ranks[metric.key]?.rank} · P{athlete.ranks[metric.key]?.percentile}
                              </Badge>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                Inga hockeysessioner registrerade ännu. Logga tester från hockeysidan för att fylla matrisen.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link href={`${basePath}/hockey-tests`}>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-1.5" />
                  Logga hockeytest
                </Button>
              </Link>
              <Link href={`${basePath}/teams/${teamId}/multivariate`}>
                <Button variant="outline" size="sm">
                  <Trophy className="h-4 w-4 mr-1.5" />
                  Öppna MVA
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {sessions.length === 0
            ? 'Inga testpass registrerade ännu.'
            : `${sessions.length} testpass · ${sessions.reduce((s, r) => s + r.totalPRs, 0)} loggade PRs`}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setManualOpen(true)}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Manuell inmatning
          </Button>
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Importera testresultat
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive py-4">{error}</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <Activity className="h-10 w-10 mx-auto opacity-30" />
            <p className="text-sm">Inga testpass registrerade för {teamName}.</p>
            <p className="text-xs">
              Klistra in en testtabell från en träning för att börja bygga PR-historik —
              värdena används direkt för att lösa upp &quot;% av 1RM&quot;-pass per atlet.
            </p>
            <Button size="sm" className="mt-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Importera första testet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const isOpen = expanded.has(s.date)
            return (
              <Card key={s.date} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(s.date)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="font-medium text-sm">{formatDate(s.date)}</span>
                      {s.bySource.TESTED > 0 && (
                        <Badge variant="default" className="text-[10px] py-0">
                          {s.bySource.TESTED} testat
                        </Badge>
                      )}
                      {s.bySource.ESTIMATED > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          {s.bySource.ESTIMATED} auto
                        </Badge>
                      )}
                      {s.bySource.CALCULATED > 0 && (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {s.bySource.CALCULATED} beräknat
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {s.athleteCount} atlet{s.athleteCount === 1 ? '' : 'er'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {s.exerciseCount} övning{s.exerciseCount === 1 ? '' : 'ar'}
                      </span>
                      <span className="tabular-nums">{s.totalPRs} PRs</span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <CardContent className="border-t bg-muted/10 px-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b">
                            <th className="text-left font-medium px-3 py-2">Atlet</th>
                            <th className="text-left font-medium px-3 py-2">Övning</th>
                            <th className="text-right font-medium px-3 py-2">Värde</th>
                            <th className="text-right font-medium px-3 py-2">Källa</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.rows.map((r) => {
                            const meta = SOURCE_LABEL[r.source] ?? {
                              label: r.source,
                              variant: 'outline' as const,
                            }
                            const unit = isPrUnit(r.unit) ? r.unit : ('KG' as PrUnit)
                            return (
                              <tr key={r.id} className="border-b last:border-0">
                                <td className="px-3 py-1.5">
                                  <Link
                                    href={`${basePath}/clients/${r.clientId}?tab=analysis`}
                                    className="hover:underline"
                                  >
                                    {r.athleteName}
                                  </Link>
                                </td>
                                <td className="px-3 py-1.5">{r.exerciseName}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums font-mono">
                                  {r.oneRepMax} {PR_UNIT_LABELS[unit]}
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  <Badge variant={meta.variant} className="text-[10px] py-0">
                                    {meta.label}
                                  </Badge>
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  <div className="flex items-center justify-end gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                      onClick={() =>
                                        setEditing({
                                          id: r.id,
                                          athleteName: r.athleteName,
                                          exerciseName: r.exerciseName,
                                          oneRepMax: String(r.oneRepMax),
                                          unit: isPrUnit(r.unit) ? r.unit : 'KG',
                                          source: r.source,
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
                                      onClick={() => setDeletingId(r.id)}
                                      title="Ta bort"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                    <Link
                                      href={`${basePath}/clients/${r.clientId}?tab=analysis`}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                        title="Öppna atletvy"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Card className="bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Hur testdata används</CardTitle>
          <CardDescription className="text-xs">
            Varje rad ovan är en PR i atletens registrerade 1RM-historik. Pass byggda
            med &quot;% av 1RM&quot; löser sig per atlet baserat på senaste KG-värde — kör
            tester regelbundet så pass alltid räknas mot aktuell styrka.
          </CardDescription>
        </CardHeader>
      </Card>

      <TeamTestImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        teamId={teamId}
        teamName={teamName}
        onImported={() => {
          setImportOpen(false)
          void fetchSessions()
        }}
      />

      <TeamTestManualEntryDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        teamId={teamId}
        teamName={teamName}
        onSaved={() => {
          setManualOpen(false)
          void fetchSessions()
        }}
      />

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redigera PR</DialogTitle>
            <DialogDescription>
              {editing?.athleteName} – {editing?.exerciseName}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <div>
                  <Label htmlFor="session-edit-value">Värde</Label>
                  <Input
                    id="session-edit-value"
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
                  <Label htmlFor="session-edit-unit">Enhet</Label>
                  <Select
                    value={editing.unit}
                    onValueChange={(v) => setEditing({ ...editing, unit: v })}
                  >
                    <SelectTrigger id="session-edit-unit">
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
                <Label htmlFor="session-edit-source">Källa</Label>
                <Select
                  value={editing.source}
                  onValueChange={(v) => setEditing({ ...editing, source: v })}
                >
                  <SelectTrigger id="session-edit-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TESTED">Testat</SelectItem>
                    <SelectItem value="CALCULATED">Beräknat</SelectItem>
                    <SelectItem value="ESTIMATED">Auto-uppskattat</SelectItem>
                  </SelectContent>
                </Select>
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

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort PR?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta tar permanent bort PR-loggen från detta testpass. Andra rader
              i passet och tidigare PR-historik påverkas inte.
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
