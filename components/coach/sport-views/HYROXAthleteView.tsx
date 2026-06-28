'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity, Clock, Gauge, HeartPulse, Target, TrendingUp, TrendingDown, AlertCircle, Calculator, Play } from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import { SportTestHistory } from '@/components/tests/shared'

interface HYROXSettings {
  raceCategory?: string
  experienceLevel?: string
  targetRaceDate?: string | null
  fiveKmTime?: number | null
  tenKmTime?: number | null
  currentWeeklyRunKm?: number
  skiErgTime?: number | null
  sledPushTime?: number | null
  sledPullTime?: number | null
  burpeeBroadJumpTime?: number | null
  rowingTime?: number | null
  farmersCarryTime?: number | null
  sandbagLungeTime?: number | null
  wallBallTime?: number | null
  strongestStation?: string
  weakestStation?: string
}

interface HYROXAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
}

const STATION_INFO: Record<string, { name: string; icon: string; benchmark: { pro: number; open: number } }> = {
  skiErgTime: { name: 'SkiErg (1km)', icon: '🎿', benchmark: { pro: 210, open: 270 } },
  sledPushTime: { name: 'Sled Push (50m)', icon: '🛷', benchmark: { pro: 90, open: 150 } },
  sledPullTime: { name: 'Sled Pull (50m)', icon: '🪢', benchmark: { pro: 75, open: 120 } },
  burpeeBroadJumpTime: { name: 'Burpee Broad Jump (80m)', icon: '🦘', benchmark: { pro: 180, open: 300 } },
  rowingTime: { name: 'Rowing (1km)', icon: '🚣', benchmark: { pro: 195, open: 250 } },
  farmersCarryTime: { name: 'Farmers Carry (200m)', icon: '🏋️', benchmark: { pro: 120, open: 180 } },
  sandbagLungeTime: { name: 'Sandbag Lunge (100m)', icon: '🎒', benchmark: { pro: 150, open: 240 } },
  wallBallTime: { name: 'Wall Balls (75/100)', icon: '⚽', benchmark: { pro: 240, open: 360 } },
}

const CATEGORY_LABELS: Record<string, string> = {
  open: 'Open',
  pro: 'Pro',
  doubles: 'Doubles',
  relay: 'Relay',
}

const LEVEL_LABELS: Record<string, { sv: string; en: string }> = {
  beginner: { sv: 'Nybörjare', en: 'Beginner' },
  intermediate: { sv: 'Mellanliggande', en: 'Intermediate' },
  advanced: { sv: 'Avancerad', en: 'Advanced' },
  elite: { sv: 'Elit', en: 'Elite' },
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatRunTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Race simulation constants
const ROXZONE_ESTIMATE = 15 // Average roxzone transition time in seconds

interface HyroxEvaluationSummary {
  id: string
  startedAt: string
  summary: {
    name?: string
    type?: string
    durationSec?: number
    avgHr?: number
    maxHr?: number
    hyrox?: {
      status?: string
      mode?: string
      raceType?: string
      expectedLapCount?: number
      actualLapCount?: number
      performance?: {
        hyroxStations?: Record<string, number>
        hyroxRunSplits?: number[]
        hyroxTotalTime?: number
        roxzoneTime?: number
        stationTime?: number
        runningTime?: number
      }
    }
  }
  fatigueSummary?: {
    level?: string
    score?: number
    paceDropPct?: number
    highIntensitySeconds?: number
  }
  confidence?: string
}

const HYROX_STATION_REVIEW_LABELS: Record<string, string> = {
  skiErg: 'SkiErg',
  sledPush: 'Sled Push',
  sledPull: 'Sled Pull',
  burpeeBroadJump: 'Burpee Broad Jump',
  rowing: 'Row',
  farmersCarry: "Farmer's Carry",
  sandbagLunge: 'Sandbag Lunge',
  wallBalls: 'Wall Balls',
}

function HYROXEvaluationReviewCard({ clientId }: { clientId: string }) {
  const locale = useLocale()
  const isSv = locale === 'sv'
  const t = (sv: string, en: string) => isSv ? sv : en
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME
  const [evaluation, setEvaluation] = useState<HyroxEvaluationSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadEvaluation() {
      setLoading(true)
      try {
        const response = await fetch(`/api/clients/${clientId}/workout-evaluations?days=365&limit=50`, { cache: 'no-store' })
        const json = await response.json()
        if (!response.ok || !json.success) throw new Error(json.error || 'Failed')
        const latest = (json.data || []).find((item: HyroxEvaluationSummary) =>
          item.summary?.type === 'HYROX' || item.summary?.hyrox
        )
        if (!cancelled) setEvaluation(latest ?? null)
      } catch {
        if (!cancelled) setEvaluation(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadEvaluation()
    return () => {
      cancelled = true
    }
  }, [clientId])

  const performance = evaluation?.summary?.hyrox?.performance
  const stationEntries = Object.entries(performance?.hyroxStations ?? {})
  const weakestStation = stationEntries.length > 0
    ? stationEntries.reduce((slowest, current) => current[1] > slowest[1] ? current : slowest)
    : null
  const strongestStation = stationEntries.length > 0
    ? stationEntries.reduce((fastest, current) => current[1] < fastest[1] ? current : fastest)
    : null

  return (
    <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <Gauge className="h-5 w-5 text-orange-500" />
              {t('Senaste HYROX-utvärdering', 'Latest HYROX evaluation')}
            </CardTitle>
            <CardDescription style={{ color: theme.colors.textMuted }}>
              {t('Garmin-varv, stationstider, Roxzone och pulsrespons', 'Garmin laps, station times, Roxzone, and HR response')}
            </CardDescription>
          </div>
          {evaluation?.summary?.hyrox?.status && (
            <Badge variant={evaluation.summary.hyrox.status === 'CONFIRMED' ? 'default' : 'secondary'}>
              {evaluation.summary.hyrox.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>{t('Läser HYROX-data...', 'Loading HYROX data...')}</p>
        ) : !evaluation ? (
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            {t('Inga importerade HYROX-race eller simuleringar ännu.', 'No imported HYROX races or simulations yet.')}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3" style={{ borderColor: theme.colors.border }}>
                <Clock className="mb-1 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('Total tid', 'Total time')}</p>
                <p className="font-semibold" style={{ color: theme.colors.textPrimary }}>
                  {formatTime(Math.round(performance?.hyroxTotalTime ?? evaluation.summary.durationSec ?? 0))}
                </p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.colors.border }}>
                <Activity className="mb-1 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>Roxzone</p>
                <p className="font-semibold" style={{ color: theme.colors.textPrimary }}>
                  {formatTime(Math.round(performance?.roxzoneTime ?? 0))}
                </p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.colors.border }}>
                <HeartPulse className="mb-1 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('Puls', 'Heart rate')}</p>
                <p className="font-semibold" style={{ color: theme.colors.textPrimary }}>
                  {evaluation.summary.avgHr ? `${Math.round(evaluation.summary.avgHr)} / ${Math.round(evaluation.summary.maxHr ?? evaluation.summary.avgHr)}` : '-'}
                </p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.colors.border }}>
                <TrendingDown className="mb-1 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('Fatigue', 'Fatigue')}</p>
                <p className="font-semibold" style={{ color: theme.colors.textPrimary }}>
                  {evaluation.fatigueSummary?.level ?? '-'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3" style={{ borderColor: theme.colors.border }}>
                <p className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>{t('Stationer', 'Stations')}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {stationEntries.map(([key, seconds]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span style={{ color: theme.colors.textMuted }}>{HYROX_STATION_REVIEW_LABELS[key] ?? key}</span>
                      <span style={{ color: theme.colors.textPrimary }}>{formatTime(Math.round(seconds))}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.colors.border }}>
                <p className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>{t('Analys', 'Analysis')}</p>
                <div className="mt-2 space-y-2 text-sm" style={{ color: theme.colors.textMuted }}>
                  <p>{t('Starkast:', 'Strongest:')} {strongestStation ? HYROX_STATION_REVIEW_LABELS[strongestStation[0]] ?? strongestStation[0] : '-'}</p>
                  <p>{t('Behöver mest tid:', 'Most time spent:')} {weakestStation ? HYROX_STATION_REVIEW_LABELS[weakestStation[0]] ?? weakestStation[0] : '-'}</p>
                  <p>{t('Löpningar:', 'Runs:')} {performance?.hyroxRunSplits?.length ?? 0} · {t('Pace drop:', 'Pace drop:')} {evaluation.fatigueSummary?.paceDropPct ?? 0}%</p>
                  <p>{t('Källa:', 'Source:')} {evaluation.confidence ?? '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function HYROXAthleteView({ clientId, clientName: _clientName, settings }: HYROXAthleteViewProps) {
  const locale = useLocale()
  const isSv = locale === 'sv'
  const t = (sv: string, en: string) => isSv ? sv : en
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const hyroxSettings = settings as HYROXSettings | undefined

  // Race simulation state
  const [showSimulation, setShowSimulation] = useState(false)
  const [simulationPace, setSimulationPace] = useState<string>('')
  const [simulationResult, setSimulationResult] = useState<{
    totalTime: number
    runTime: number
    stationTime: number
    roxzoneTime: number
    pace: number
  } | null>(null)

  // Calculate race simulation based on profile data
  const calculateSimulation = () => {
    if (!hyroxSettings) return

    // Parse pace input (format: "5:30" or just seconds)
    let paceSeconds = 0
    if (simulationPace.includes(':')) {
      const [mins, secs] = simulationPace.split(':').map(Number)
      paceSeconds = mins * 60 + (secs || 0)
    } else if (simulationPace) {
      paceSeconds = Number(simulationPace)
    } else if (hyroxSettings.fiveKmTime) {
      // Use 5K time to estimate pace (add 10% for HYROX fatigue)
      paceSeconds = Math.round((hyroxSettings.fiveKmTime / 5) * 1.1)
    } else {
      paceSeconds = 330 // Default 5:30/km
    }

    // Calculate total station time from profile
    const stationTimes = [
      hyroxSettings.skiErgTime || 0,
      hyroxSettings.sledPushTime || 0,
      hyroxSettings.sledPullTime || 0,
      hyroxSettings.burpeeBroadJumpTime || 0,
      hyroxSettings.rowingTime || 0,
      hyroxSettings.farmersCarryTime || 0,
      hyroxSettings.sandbagLungeTime || 0,
      hyroxSettings.wallBallTime || 0,
    ]

    const stationTime = stationTimes.reduce((sum, t) => sum + t, 0)
    const runTime = paceSeconds * 8 // 8 x 1km runs
    const roxzoneTime = ROXZONE_ESTIMATE * 16 // 16 transitions
    const totalTime = stationTime + runTime + roxzoneTime

    setSimulationResult({
      totalTime,
      runTime,
      stationTime,
      roxzoneTime,
      pace: paceSeconds,
    })
  }

  if (!hyroxSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <span>💪</span> HYROX Profil
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t('Ingen HYROX-data tillgänglig', 'No HYROX data available')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            {t('Atleten har inte angett HYROX-inställningar ännu.', 'The athlete has not entered HYROX settings yet.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const category = hyroxSettings.raceCategory || 'open'
  const benchmarks = category === 'pro' ? 'pro' : 'open'

  // Calculate station performance
  const stationPerformance = Object.entries(STATION_INFO).map(([key, info]) => {
    const time = hyroxSettings[key as keyof HYROXSettings] as number | null
    const benchmark = info.benchmark[benchmarks as 'pro' | 'open']
    const percentage = time ? Math.min(100, Math.max(0, (benchmark / time) * 100)) : null
    const status = time
      ? time <= benchmark ? 'good' : time <= benchmark * 1.2 ? 'average' : 'needs_work'
      : 'no_data'

    return {
      key,
      ...info,
      time,
      benchmark,
      percentage,
      status,
    }
  })

  // Find strongest and weakest by performance
  const stationsWithData = stationPerformance.filter(s => s.time !== null)
  const bestStation = stationsWithData.length > 0
    ? stationsWithData.reduce((best, curr) =>
        (curr.percentage || 0) > (best.percentage || 0) ? curr : best
      )
    : null
  const worstStation = stationsWithData.length > 0
    ? stationsWithData.reduce((worst, curr) =>
        (curr.percentage || 100) < (worst.percentage || 100) ? curr : worst
      )
    : null

  // Calculate estimated total time
  const totalStationTime = stationPerformance.reduce((sum, s) => sum + (s.time || 0), 0)
  // Estimate running time (8x1km runs) based on 5K time
  const estimatedRunPace = hyroxSettings.fiveKmTime
    ? (hyroxSettings.fiveKmTime / 5) * 1.1 // Slightly slower due to fatigue
    : 330 // 5:30/km default
  const estimatedRunTime = estimatedRunPace * 8
  const estimatedTotalTime = totalStationTime + estimatedRunTime

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg" style={{ color: theme.colors.textPrimary }}>
                <span>💪</span> HYROX Dashboard
              </CardTitle>
              <CardDescription style={{ color: theme.colors.textMuted }}>Stationsprestanda och analys</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">
                {CATEGORY_LABELS[category] || category}
              </Badge>
              <Badge variant="secondary">
                {LEVEL_LABELS[hyroxSettings.experienceLevel || 'beginner'][isSv ? 'sv' : 'en']}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            >
              <Clock className="h-5 w-5 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('Uppskattad tid', 'Estimated time')}</p>
              <p className="font-bold text-lg" style={{ color: theme.colors.textPrimary }}>
                {totalStationTime > 0 ? formatTime(Math.round(estimatedTotalTime)) : '-'}
              </p>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            >
              <Target className="h-5 w-5 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('5K tid', '5K time')}</p>
              <p className="font-bold text-lg" style={{ color: theme.colors.textPrimary }}>
                {hyroxSettings.fiveKmTime ? formatRunTime(hyroxSettings.fiveKmTime) : '-'}
              </p>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4' }}
            >
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('Starkast', 'Strongest')}</p>
              <p className="font-medium text-sm truncate" style={{ color: theme.colors.textPrimary }}>
                {bestStation?.name.split(' ')[0] || hyroxSettings.strongestStation || '-'}
              </p>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed' }}
            >
              <TrendingDown className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('Fokusera på', 'Focus on')}</p>
              <p className="font-medium text-sm truncate" style={{ color: theme.colors.textPrimary }}>
                {worstStation?.name.split(' ')[0] || hyroxSettings.weakestStation || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <HYROXEvaluationReviewCard clientId={clientId} />

      {/* Station Times Grid */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base" style={{ color: theme.colors.textPrimary }}>{t('Stationstider', 'Station Times')}</CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t('Jämfört med', 'Compared with')} {category === 'pro' ? 'Pro' : 'Open'} benchmarks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stationPerformance.map((station) => (
              <div
                key={station.key}
                className="p-3 rounded-lg border"
                style={{
                  borderColor: station.status === 'good'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0')
                    : station.status === 'average'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(234, 179, 8, 0.3)' : '#fef08a')
                    : station.status === 'needs_work'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(249, 115, 22, 0.3)' : '#fed7aa')
                    : theme.colors.border,
                  backgroundColor: station.status === 'good'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(240, 253, 244, 0.5)')
                    : station.status === 'average'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(254, 252, 232, 0.5)')
                    : station.status === 'needs_work'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 247, 237, 0.5)')
                    : (theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{station.icon}</span>
                    <span className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>{station.name}</span>
                  </div>
                  <span className="font-bold" style={{ color: theme.colors.textPrimary }}>
                    {station.time ? formatTime(station.time) : '-'}
                  </span>
                </div>
                {station.time && (
                  <div className="space-y-1">
                    <Progress
                      value={station.percentage || 0}
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs" style={{ color: theme.colors.textMuted }}>
                      <span>Benchmark: {formatTime(station.benchmark)}</span>
                      <span className={
                        station.status === 'good' ? 'text-green-600' :
                        station.status === 'average' ? 'text-yellow-600' :
                        'text-orange-600'
                      }>
                        {station.status === 'good' ? t('Bra!', 'Good!') :
                         station.status === 'average' ? 'OK' :
                         t('Behöver träning', 'Needs training')}
                      </span>
                    </div>
                  </div>
                )}
                {!station.time && (
                  <p className="text-xs flex items-center gap-1" style={{ color: theme.colors.textMuted }}>
                    <AlertCircle className="h-3 w-3" />
                    {t('Ingen tid registrerad', 'No time recorded')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Running Fitness */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base" style={{ color: theme.colors.textPrimary }}>{t('Löpkondition', 'Running Fitness')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>5K</p>
              <p className="font-bold" style={{ color: theme.colors.textPrimary }}>
                {hyroxSettings.fiveKmTime ? formatRunTime(hyroxSettings.fiveKmTime) : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>10K</p>
              <p className="font-bold" style={{ color: theme.colors.textPrimary }}>
                {hyroxSettings.tenKmTime ? formatRunTime(hyroxSettings.tenKmTime) : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('km/vecka', 'km/week')}</p>
              <p className="font-bold" style={{ color: theme.colors.textPrimary }}>
                {hyroxSettings.currentWeeklyRunKm || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Race Simulation */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Calculator className="h-4 w-4" />
                Race Simulation
              </CardTitle>
              <CardDescription style={{ color: theme.colors.textMuted }}>
                {t('Beräkna din uppskattade sluttid', 'Calculate your estimated finish time')}
              </CardDescription>
            </div>
            <Button
              variant={showSimulation ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowSimulation(!showSimulation)}
            >
              {showSimulation ? t('Dölj', 'Hide') : t('Simulera', 'Simulate')}
            </Button>
          </div>
        </CardHeader>
        {showSimulation && (
          <CardContent className="space-y-4">
            {/* Check if we have enough station data */}
            {stationsWithData.length === 0 ? (
              <div className="text-center py-4" style={{ color: theme.colors.textMuted }}>
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('Inga stationstider registrerade.', 'No station times recorded.')}</p>
                <p className="text-xs">{t('Lägg till dina stationstider för att kunna simulera.', 'Add station times to run a simulation.')}</p>
              </div>
            ) : (
              <>
                {/* Pace Input */}
                <div className="space-y-2">
                  <Label style={{ color: theme.colors.textPrimary }}>
                    {t('Löptempo (min:sek/km)', 'Running pace (min:sec/km)')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={hyroxSettings.fiveKmTime
                        ? `${formatTime(Math.round((hyroxSettings.fiveKmTime / 5) * 1.1))} (${t('baserat på 5K', 'based on 5K')})`
                        : '5:30'}
                      value={simulationPace}
                      onChange={(e) => setSimulationPace(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={calculateSimulation}>
                      <Play className="h-4 w-4 mr-1" />
                      {t('Beräkna', 'Calculate')}
                    </Button>
                  </div>
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                    {t('Lämna tomt för att använda uppskattning från din 5K-tid', 'Leave blank to use an estimate from your 5K time')}
                  </p>
                </div>

                {/* Simulation Result */}
                {simulationResult && (
                  <div
                    className="p-4 rounded-lg space-y-3"
                    style={{
                      backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4',
                      borderColor: theme.id === 'FITAPP_DARK' ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0',
                      border: '1px solid'
                    }}
                  >
                    <div className="text-center">
                      <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                        {t('Uppskattad sluttid', 'Estimated finish time')}
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {Math.floor(simulationResult.totalTime / 3600)}:{formatTime(simulationResult.totalTime % 3600)}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div
                        className="p-2 rounded"
                        style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                      >
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('Löpning', 'Running')}</p>
                        <p className="font-semibold" style={{ color: theme.colors.textPrimary }}>
                          {formatTime(simulationResult.runTime)}
                        </p>
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                          @ {formatTime(simulationResult.pace)}/km
                        </p>
                      </div>
                      <div
                        className="p-2 rounded"
                        style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                      >
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('Stationer', 'Stations')}</p>
                        <p className="font-semibold" style={{ color: theme.colors.textPrimary }}>
                          {formatTime(simulationResult.stationTime)}
                        </p>
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                          {stationsWithData.length}/8 {t('inmatade', 'entered')}
                        </p>
                      </div>
                      <div
                        className="p-2 rounded"
                        style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                      >
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>{t('Roxzoner', 'Roxzones')}</p>
                        <p className="font-semibold" style={{ color: theme.colors.textPrimary }}>
                          {formatTime(simulationResult.roxzoneTime)}
                        </p>
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                          16 × {ROXZONE_ESTIMATE}s
                        </p>
                      </div>
                    </div>

                    {stationsWithData.length < 8 && (
                      <p className="text-xs text-center text-orange-600">
                        ⚠️ {8 - stationsWithData.length} {t('station(er) saknar data - resultatet är en uppskattning', 'station(s) missing data - result is an estimate')}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="HYROX"
        title={t('Testhistorik - HYROX', 'Test History - HYROX')}
        protocolLabels={{
          HYROX_SKIERG_1K: 'SkiErg 1K',
          HYROX_ROW_1K: 'Row 1K',
          HYROX_SLED_PUSH: 'Sled Push',
          HYROX_SLED_PULL: 'Sled Pull',
          HYROX_BURPEE_BROAD_JUMP: 'Burpee Broad Jump',
          HYROX_FARMERS_CARRY: 'Farmers Carry',
          HYROX_SANDBAG_LUNGE: 'Sandbag Lunge',
          HYROX_WALL_BALLS: 'Wall Balls',
        }}
      />
    </div>
  )
}
