'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AthleteComparison } from './AthleteComparison'
import { GroupStats } from './GroupStats'
import { YearOverYearChart } from './YearOverYearChart'
import { FlaskConical, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
}

interface TestOverviewClientProps {
  teams: Team[]
  businessSlug?: string
  canAccessSimca: boolean
}

interface TestRecord {
  id: string
  clientId: string
  clientName: string
  teamName: string | null
  testType: string
  testDate: string
  vo2max: number | null
  maxHR: number | null
  maxLactate: number | null
}

interface AthleteSummary {
  id: string
  name: string
  teamName: string | null
  testCount: number
  latestVo2max: number | null
  latestMaxHR: number | null
  latestMaxLactate: number | null
  latestTestDate: string | null
}

interface TeamGroupStats {
  teamName: string
  athleteCount: number
  vo2max: { avg: number | null; min: number | null; max: number | null }
  maxHR: { avg: number | null; min: number | null; max: number | null }
  maxLactate: { avg: number | null; min: number | null; max: number | null }
}

export function TestOverviewClient({ teams, businessSlug, canAccessSimca }: TestOverviewClientProps) {
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const [tests, setTests] = useState<TestRecord[]>([])
  const [athletes, setAthletes] = useState<AthleteSummary[]>([])
  const [groupStats, setGroupStats] = useState<TeamGroupStats[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [selectedMetric, setSelectedMetric] = useState<'vo2max' | 'maxHR' | 'maxLactate'>('vo2max')
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedTeam !== 'all') params.set('teamId', selectedTeam)

      const res = await fetch(`/api/coach/test-overview?${params}`, {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setTests(data.tests || [])
        setAthletes(data.athletes || [])
        setGroupStats(data.groupStats || [])
      }
    } catch {
      toast.error(locale === 'sv' ? 'Kunde inte hämta testdata' : 'Could not load test data')
    } finally {
      setLoading(false)
    }
  }, [businessSlug, locale, selectedTeam])

  useEffect(() => {
    setLoading(true)
    void fetchData()
  }, [fetchData])

  const toggleAthlete = (id: string) => {
    setSelectedAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectedAthletes = athletes.filter((a) => selectedAthleteIds.includes(a.id))

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 p-3 rounded-xl backdrop-blur-sm shadow-md">
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-48 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
            <SelectValue placeholder={locale === 'sv' ? 'Alla lag' : 'All teams'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{locale === 'sv' ? 'Alla lag' : 'All teams'}</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canAccessSimca && selectedTeam !== 'all' && (
          <a href={`${businessSlug ? `/${businessSlug}` : ''}/coach/teams/${selectedTeam}/multivariate`}>
            <Button variant="outline" size="sm" className="bg-white/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white">
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
              {locale === 'sv' ? 'SIMCA-analys' : 'SIMCA analysis'}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </a>
        )}

        {selectedAthleteIds.length > 0 && (
          <Badge variant="secondary" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-400">
            {selectedAthleteIds.length}{' '}
            {locale === 'sv' ? 'valda för jämförelse' : 'selected for comparison'}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-1 rounded-xl gap-1">
          <TabsTrigger value="overview" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">{locale === 'sv' ? 'Översikt' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="comparison" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">{locale === 'sv' ? 'Jämförelse' : 'Comparison'}</TabsTrigger>
          <TabsTrigger value="trends" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">{locale === 'sv' ? 'Utveckling' : 'Trends'}</TabsTrigger>
          <TabsTrigger value="group" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">{locale === 'sv' ? 'Gruppstatistik' : 'Group stats'}</TabsTrigger>
        </TabsList>

        {/* Overview - athlete list with selection */}
        <TabsContent value="overview">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : athletes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {locale === 'sv' ? 'Inga testresultat hittades' : 'No test results found'}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                {locale === 'sv'
                  ? 'Klicka för att välja atleter till jämförelse'
                  : 'Click to select athletes for comparison'}
              </p>
              {athletes.map((a) => {
                const isSelected = selectedAthleteIds.includes(a.id)
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAthlete(a.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-300 border ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                        : 'bg-white/50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-900/30 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        isSelected ? 'bg-blue-500 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-slate-300 dark:border-white/20 bg-white/5'
                      }`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-white">{a.name}</p>
                        <p className="text-xs text-slate-500 dark:text-muted-foreground">
                          {a.teamName || (locale === 'sv' ? 'Inget lag' : 'No team')} · {a.testCount}{' '}
                          {locale === 'sv' ? 'tester' : 'tests'}
                          {a.latestTestDate && ` · ${locale === 'sv' ? 'Senaste' : 'Latest'}: ${new Date(a.latestTestDate).toLocaleDateString(dateLocale)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs font-mono">
                      {a.latestVo2max && (
                        <div className="text-right">
                          <span className="text-slate-500 dark:text-muted-foreground">VO2 </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-200">{a.latestVo2max.toFixed(1)}</span>
                        </div>
                      )}
                      {a.latestMaxHR && (
                        <div className="text-right">
                          <span className="text-slate-500 dark:text-muted-foreground">HR </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-200">{a.latestMaxHR}</span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Comparison */}
        <TabsContent value="comparison">
          <AthleteComparison athletes={selectedAthletes} />
        </TabsContent>

        {/* Year-over-year trends */}
        <TabsContent value="trends">
          <div className="space-y-4">
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-1 rounded-lg w-fit">
              {(['vo2max', 'maxHR', 'maxLactate'] as const).map((m) => (
                <Button
                  key={m}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMetric(m)}
                  className={`text-xs transition-all duration-300 ${
                    selectedMetric === m
                      ? 'bg-white dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-blue-500/30 shadow-sm dark:shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {m === 'vo2max' ? 'VO2max' : m === 'maxHR' ? 'Max HR' : locale === 'sv' ? 'Max Laktat' : 'Max lactate'}
                </Button>
              ))}
            </div>
            <YearOverYearChart
              tests={tests}
              selectedAthleteIds={selectedAthleteIds}
              metric={selectedMetric}
            />
          </div>
        </TabsContent>

        {/* Group stats */}
        <TabsContent value="group">
          <GroupStats stats={groupStats} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
