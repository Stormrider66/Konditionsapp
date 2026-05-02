'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { BarChart3, Users, Calendar, FlaskConical, ExternalLink } from 'lucide-react'
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
      toast.error('Kunde inte hämta testdata')
    } finally {
      setLoading(false)
    }
  }, [businessSlug, selectedTeam])

  useEffect(() => {
    setLoading(true)
    fetchData()
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
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Alla lag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla lag</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canAccessSimca && selectedTeam !== 'all' && (
          <a href={`${businessSlug ? `/${businessSlug}` : ''}/coach/teams/${selectedTeam}/multivariate`}>
            <Button variant="outline" size="sm">
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
              SIMCA-analys
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </a>
        )}

        {selectedAthleteIds.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedAthleteIds.length} valda för jämförelse
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="comparison">Jämförelse</TabsTrigger>
          <TabsTrigger value="trends">Utveckling</TabsTrigger>
          <TabsTrigger value="group">Gruppstatistik</TabsTrigger>
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
              Inga testresultat hittades
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-2">Klicka för att välja atleter till jämförelse</p>
              {athletes.map((a) => {
                const isSelected = selectedAthleteIds.includes(a.id)
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAthlete(a.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
                        : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-muted-foreground/30'
                      }`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.teamName || 'Inget lag'} · {a.testCount} tester
                          {a.latestTestDate && ` · Senaste: ${new Date(a.latestTestDate).toLocaleDateString('sv-SE')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs font-mono">
                      {a.latestVo2max && (
                        <div className="text-right">
                          <span className="text-muted-foreground">VO2 </span>
                          <span className="font-semibold">{a.latestVo2max.toFixed(1)}</span>
                        </div>
                      )}
                      {a.latestMaxHR && (
                        <div className="text-right">
                          <span className="text-muted-foreground">HR </span>
                          <span className="font-semibold">{a.latestMaxHR}</span>
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
            <div className="flex gap-2">
              {(['vo2max', 'maxHR', 'maxLactate'] as const).map((m) => (
                <Button
                  key={m}
                  variant={selectedMetric === m ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric(m)}
                >
                  {m === 'vo2max' ? 'VO2max' : m === 'maxHR' ? 'Max HR' : 'Max Laktat'}
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
