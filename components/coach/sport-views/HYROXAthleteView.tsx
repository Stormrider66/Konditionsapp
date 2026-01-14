'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clock, Target, TrendingUp, TrendingDown, AlertCircle, Calculator, Play } from 'lucide-react'
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

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Nybörjare',
  intermediate: 'Mellanliggande',
  advanced: 'Avancerad',
  elite: 'Elit',
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

export function HYROXAthleteView({ clientId, clientName, settings }: HYROXAthleteViewProps) {
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
          <CardDescription style={{ color: theme.colors.textMuted }}>Ingen HYROX-data tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            Atleten har inte angett HYROX-inställningar ännu.
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
                {LEVEL_LABELS[hyroxSettings.experienceLevel || 'beginner']}
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
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>Uppskattad tid</p>
              <p className="font-bold text-lg" style={{ color: theme.colors.textPrimary }}>
                {totalStationTime > 0 ? formatTime(Math.round(estimatedTotalTime)) : '-'}
              </p>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            >
              <Target className="h-5 w-5 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>5K tid</p>
              <p className="font-bold text-lg" style={{ color: theme.colors.textPrimary }}>
                {hyroxSettings.fiveKmTime ? formatRunTime(hyroxSettings.fiveKmTime) : '-'}
              </p>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4' }}
            >
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>Starkast</p>
              <p className="font-medium text-sm truncate" style={{ color: theme.colors.textPrimary }}>
                {bestStation?.name.split(' ')[0] || hyroxSettings.strongestStation || '-'}
              </p>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed' }}
            >
              <TrendingDown className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>Fokusera på</p>
              <p className="font-medium text-sm truncate" style={{ color: theme.colors.textPrimary }}>
                {worstStation?.name.split(' ')[0] || hyroxSettings.weakestStation || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station Times Grid */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base" style={{ color: theme.colors.textPrimary }}>Stationstider</CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>Jämfört med {category === 'pro' ? 'Pro' : 'Open'} benchmarks</CardDescription>
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
                        {station.status === 'good' ? 'Bra!' :
                         station.status === 'average' ? 'OK' :
                         'Behöver träning'}
                      </span>
                    </div>
                  </div>
                )}
                {!station.time && (
                  <p className="text-xs flex items-center gap-1" style={{ color: theme.colors.textMuted }}>
                    <AlertCircle className="h-3 w-3" />
                    Ingen tid registrerad
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
          <CardTitle className="text-base" style={{ color: theme.colors.textPrimary }}>Löpkondition</CardTitle>
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
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>km/vecka</p>
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
                Beräkna din uppskattade sluttid
              </CardDescription>
            </div>
            <Button
              variant={showSimulation ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowSimulation(!showSimulation)}
            >
              {showSimulation ? 'Dölj' : 'Simulera'}
            </Button>
          </div>
        </CardHeader>
        {showSimulation && (
          <CardContent className="space-y-4">
            {/* Check if we have enough station data */}
            {stationsWithData.length === 0 ? (
              <div className="text-center py-4" style={{ color: theme.colors.textMuted }}>
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Inga stationstider registrerade.</p>
                <p className="text-xs">Lägg till dina stationstider för att kunna simulera.</p>
              </div>
            ) : (
              <>
                {/* Pace Input */}
                <div className="space-y-2">
                  <Label style={{ color: theme.colors.textPrimary }}>
                    Löptempo (min:sek/km)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={hyroxSettings.fiveKmTime
                        ? `${formatTime(Math.round((hyroxSettings.fiveKmTime / 5) * 1.1))} (baserat på 5K)`
                        : '5:30'}
                      value={simulationPace}
                      onChange={(e) => setSimulationPace(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={calculateSimulation}>
                      <Play className="h-4 w-4 mr-1" />
                      Beräkna
                    </Button>
                  </div>
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                    Lämna tomt för att använda uppskattning från din 5K-tid
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
                        Uppskattad sluttid
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
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>Löpning</p>
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
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>Stationer</p>
                        <p className="font-semibold" style={{ color: theme.colors.textPrimary }}>
                          {formatTime(simulationResult.stationTime)}
                        </p>
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                          {stationsWithData.length}/8 inmatade
                        </p>
                      </div>
                      <div
                        className="p-2 rounded"
                        style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                      >
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>Roxzoner</p>
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
                        ⚠️ {8 - stationsWithData.length} station(er) saknar data - resultatet är en uppskattning
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
        title="Testhistorik - HYROX"
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
