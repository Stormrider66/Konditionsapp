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
} from 'lucide-react'
import { TeamTestImportDialog } from './TeamTestImportDialog'
import { PR_UNIT_LABELS, isPrUnit, type PrUnit } from '@/lib/strength/units'

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

export function TeamTestsClient({ teamId, teamName, basePath }: TeamTestsClientProps) {
  const [sessions, setSessions] = useState<TestSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/test-sessions`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      if (body.success) setSessions(body.data.sessions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta testdata')
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchSessions()
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {sessions.length === 0
            ? 'Inga testpass registrerade ännu.'
            : `${sessions.length} testpass · ${sessions.reduce((s, r) => s + r.totalPRs, 0)} loggade PRs`}
        </div>
        <Button size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-1.5" />
          Importera testresultat
        </Button>
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
              värdena används direkt för att lösa upp "% av 1RM"-pass per atlet.
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
                                  <Link
                                    href={`${basePath}/clients/${r.clientId}?tab=analysis`}
                                  >
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </Link>
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
            med "% av 1RM" löser sig per atlet baserat på senaste KG-värde — kör
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
          fetchSessions()
        }}
      />
    </div>
  )
}
