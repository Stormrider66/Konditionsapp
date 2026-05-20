'use client'

/**
 * TeamAnalysisClient
 *
 * Roster-aggregated analysis view for a team coach. Answers "who do I
 * need to talk to today?" via:
 *  - ACWR zone tiles (Optimal / Caution / Danger / Critical counts)
 *  - "Needs attention" list with stacked reasons per athlete
 *  - Per-member table: ACWR + days-since-last-activity + recent PRs
 *  - Recent team-wide PR feed
 *
 * Each member row links into the per-athlete client page's Analysis tab
 * for the full drill-down.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  AlertTriangle,
  Activity,
  Trophy,
  Users,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Shield,
  TrendingDown,
  Minus,
  HelpCircle,
  Upload,
} from 'lucide-react'
import { StrengthPRFeed } from '@/components/coach/dashboard/StrengthPRFeed'
import { BulkPRImportDialog } from '@/components/coach/strength/BulkPRImportDialog'
import { PendingPRFeed } from '@/components/coach/strength/PendingPRFeed'
import { useLocale } from 'next-intl'

type Locale = 'en' | 'sv'

const copy = (locale: Locale, en: string, sv: string) => locale === 'sv' ? sv : en

type AcwrZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL' | 'UNKNOWN'

interface MemberSummary {
  clientId: string
  name: string
  acwr: { value: number; zone: AcwrZone; asOf: string } | null
  daysSinceLastActivity: number | null
  recentPRs: number
  totalPRs: number
}

interface NeedsAttentionEntry {
  clientId: string
  name: string
  reasons: string[]
}

interface RecentPR {
  id: string
  clientId: string
  clientName: string
  exerciseName: string
  oneRepMax: number
  previousMax: number | null
  date: string
  source: string
  unit: string
}

interface PendingPR {
  id: string
  clientId: string
  clientName: string
  exerciseId: string
  exerciseName: string
  oneRepMax: number
  date: string
  unit: string
}

interface TeamAnalysisData {
  teamId: string
  teamName: string
  members: MemberSummary[]
  aggregates: {
    total: number
    acwrZones: Record<AcwrZone, number>
    needsAttention: NeedsAttentionEntry[]
  }
  recentPRs: RecentPR[]
  pendingPRs: PendingPR[]
}

interface TeamAnalysisClientProps {
  teamId: string
  /** Base path for links into per-athlete pages, e.g. `/<businessSlug>/coach`. */
  basePath: string
}

const ZONE_META: Record<
  AcwrZone,
  { label: Record<Locale, string>; color: string; icon: React.ElementType; bg: string }
> = {
  OPTIMAL: { label: { en: 'Optimal', sv: 'Optimal' }, color: 'text-green-700 dark:text-green-400', icon: ShieldCheck, bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  CAUTION: { label: { en: 'Caution', sv: 'Varning' }, color: 'text-yellow-700 dark:text-yellow-400', icon: Shield, bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
  DANGER: { label: { en: 'Danger', sv: 'Fara' }, color: 'text-orange-700 dark:text-orange-400', icon: ShieldAlert, bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
  CRITICAL: { label: { en: 'Critical', sv: 'Kritisk' }, color: 'text-red-700 dark:text-red-400', icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
  DETRAINING: { label: { en: 'Detraining', sv: 'Nedträning' }, color: 'text-blue-700 dark:text-blue-400', icon: TrendingDown, bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  UNKNOWN: { label: { en: 'Unknown', sv: 'Okänt' }, color: 'text-muted-foreground', icon: HelpCircle, bg: 'bg-muted/30' },
}

export function TeamAnalysisClient({ teamId, basePath }: TeamAnalysisClientProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const [data, setData] = useState<TeamAnalysisData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  // Bumped after a successful bulk import so the page refetches and
  // newly-imported PRs immediately surface in the per-member table +
  // recent feed.
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/teams/${teamId}/analysis-summary`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        if (!cancelled && body.success) setData(body.data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : copy(locale, 'Could not fetch data', 'Kunde inte hämta data'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [locale, teamId, refreshKey])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-destructive">
        {error ?? copy(locale, 'No data available', 'Inget data tillgängligt')}
      </div>
    )
  }

  if (data.members.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{copy(locale, 'No athletes in the team yet.', 'Inga atleter i laget ännu.')}</p>
        </CardContent>
      </Card>
    )
  }

  const { aggregates, members, recentPRs, pendingPRs } = data
  // Order zone tiles by severity so the most actionable info is leftmost.
  const zoneOrder: AcwrZone[] = ['OPTIMAL', 'CAUTION', 'DANGER', 'CRITICAL', 'DETRAINING', 'UNKNOWN']

  const missingPRCount = members.filter((m) => m.totalPRs === 0).length

  return (
    <div className="space-y-6">
      {/* Action bar: bulk PR import is the team-coach's onboarding lever
          for the % of 1RM workflow. Calling out missingPRCount keeps it
          discoverable when the roster is half-populated. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {missingPRCount > 0 ? (
            <>
              <span className="text-orange-600 font-medium">{missingPRCount}</span>{' '}
              {copy(locale, missingPRCount === 1 ? 'athlete is missing 1RM' : 'athletes are missing 1RM', missingPRCount === 1 ? 'atlet saknar 1RM' : 'atleter saknar 1RM')} -
              {' '}<span className="text-foreground">% {copy(locale, 'of 1RM workouts', 'av 1RM-pass')}</span> {copy(locale, 'requires registered PRs.', 'kräver registrerade PR.')}
            </>
          ) : (
            <>{copy(locale, 'All athletes have at least one registered 1RM.', 'Alla atleter har minst en registrerad 1RM.')}</>
          )}
        </div>
        <Button size="sm" onClick={() => setBulkOpen(true)}>
          <Upload className="h-4 w-4 mr-1.5" />
          {copy(locale, 'Import PRs', 'Importera PRs')}
        </Button>
      </div>

      {/* ACWR zone tiles */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {copy(locale, 'Load today', 'Belastning idag')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {zoneOrder.map((zone) => {
            const meta = ZONE_META[zone]
            const count = aggregates.acwrZones[zone]
            const Icon = meta.icon
            return (
              <div
                key={zone}
                className={`rounded-lg border p-3 ${meta.bg}`}
              >
                <div className={`flex items-center gap-1.5 ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{meta.label[locale]}</span>
                </div>
                <div className="text-2xl font-bold mt-1 tabular-nums">{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Needs attention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            {copy(locale, 'Needs attention', 'Behöver uppmärksamhet')}
            <Badge variant="secondary">{aggregates.needsAttention.length}</Badge>
          </CardTitle>
          <CardDescription>
            {copy(locale, 'Athletes with high injury risk, long inactivity, or missing PR data.', 'Atleter med hög skaderisk, lång inaktivitet eller saknad PR-data.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aggregates.needsAttention.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-70" />
              {copy(locale, 'Everything is under control right now.', 'Allt under kontroll just nu.')}
            </div>
          ) : (
            <div className="divide-y">
              {aggregates.needsAttention.map((entry) => (
                <Link
                  key={entry.clientId}
                  href={`${basePath}/clients/${entry.clientId}?tab=development`}
                  className="flex items-center gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{entry.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                      {entry.reasons.map((r, i) => (
                        <span key={i} className="inline-flex items-center">
                          {i > 0 && <span className="mr-2 opacity-30">·</span>}
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-member table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            {copy(locale, 'Athletes', 'Atleter')}
          </CardTitle>
          <CardDescription>
            {copy(locale, 'Click an athlete for the full analysis.', 'Klicka på en atlet för full analys.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                  <th className="text-left font-medium px-3 py-2">{copy(locale, 'Name', 'Namn')}</th>
                  <th className="text-right font-medium px-3 py-2">ACWR</th>
                  <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">{copy(locale, 'Latest activity', 'Senaste aktivitet')}</th>
                  <th className="text-right font-medium px-3 py-2">PR (30d)</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const zone = m.acwr?.zone ?? 'UNKNOWN'
                  const meta = ZONE_META[zone]
                  const ZoneIcon = meta.icon
                  return (
                    <tr key={m.clientId} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <Link
                          href={`${basePath}/clients/${m.clientId}?tab=development`}
                          className="font-medium hover:underline"
                        >
                          {m.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {m.acwr ? (
                          <span className={`inline-flex items-center gap-1 ${meta.color}`}>
                            <ZoneIcon className="h-3 w-3" />
                            <span className="tabular-nums">{m.acwr.value}</span>
                          </span>
                        ) : (
                          <Minus className="h-3 w-3 text-muted-foreground inline" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right hidden sm:table-cell text-muted-foreground tabular-nums">
                        {m.daysSinceLastActivity == null
                          ? '—'
                          : m.daysSinceLastActivity === 0
                            ? copy(locale, 'Today', 'Idag')
                            : copy(locale, `${m.daysSinceLastActivity}d ago`, `${m.daysSinceLastActivity}d sedan`)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {m.recentPRs > 0 ? (
                          <span className="inline-flex items-center gap-1 text-yellow-600">
                            <Trophy className="h-3 w-3" />
                            {m.recentPRs}
                          </span>
                        ) : m.totalPRs === 0 ? (
                          <Badge variant="outline" className="text-[10px] py-0">{copy(locale, 'Missing', 'Saknar')}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`${basePath}/clients/${m.clientId}?tab=development`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <ChevronRight className="h-4 w-4" />
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
      </Card>

      {/* Pending auto-detected PRs — only render when there's actually
          something for the coach to act on, otherwise the empty state
          would just clutter the page. */}
      {pendingPRs.length > 0 && (
        <PendingPRFeed
          items={pendingPRs}
          basePath={basePath}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {/* Recent PRs feed */}
      <StrengthPRFeed recentPRs={recentPRs} />

      <BulkPRImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        teamId={teamId}
        teamName={data.teamName}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
