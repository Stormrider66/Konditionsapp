'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, Target, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

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

export function HYROXAthleteView({ clientId, clientName, settings }: HYROXAthleteViewProps) {
  const hyroxSettings = settings as HYROXSettings | undefined

  if (!hyroxSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💪</span> HYROX Profil
          </CardTitle>
          <CardDescription>Ingen HYROX-data tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
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
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>💪</span> HYROX Dashboard
              </CardTitle>
              <CardDescription>Stationsprestanda och analys</CardDescription>
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
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Uppskattad tid</p>
              <p className="font-bold text-lg">
                {totalStationTime > 0 ? formatTime(Math.round(estimatedTotalTime)) : '-'}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">5K tid</p>
              <p className="font-bold text-lg">
                {hyroxSettings.fiveKmTime ? formatRunTime(hyroxSettings.fiveKmTime) : '-'}
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-xs text-muted-foreground">Starkast</p>
              <p className="font-medium text-sm truncate">
                {bestStation?.name.split(' ')[0] || hyroxSettings.strongestStation || '-'}
              </p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <TrendingDown className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <p className="text-xs text-muted-foreground">Fokusera på</p>
              <p className="font-medium text-sm truncate">
                {worstStation?.name.split(' ')[0] || hyroxSettings.weakestStation || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station Times Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stationstider</CardTitle>
          <CardDescription>Jämfört med {category === 'pro' ? 'Pro' : 'Open'} benchmarks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stationPerformance.map((station) => (
              <div
                key={station.key}
                className={`p-3 rounded-lg border ${
                  station.status === 'good'
                    ? 'border-green-200 bg-green-50/50'
                    : station.status === 'average'
                    ? 'border-yellow-200 bg-yellow-50/50'
                    : station.status === 'needs_work'
                    ? 'border-orange-200 bg-orange-50/50'
                    : 'border-gray-200 bg-gray-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{station.icon}</span>
                    <span className="font-medium text-sm">{station.name}</span>
                  </div>
                  <span className="font-bold">
                    {station.time ? formatTime(station.time) : '-'}
                  </span>
                </div>
                {station.time && (
                  <div className="space-y-1">
                    <Progress
                      value={station.percentage || 0}
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Löpkondition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">5K</p>
              <p className="font-bold">
                {hyroxSettings.fiveKmTime ? formatRunTime(hyroxSettings.fiveKmTime) : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">10K</p>
              <p className="font-bold">
                {hyroxSettings.tenKmTime ? formatRunTime(hyroxSettings.tenKmTime) : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">km/vecka</p>
              <p className="font-bold">
                {hyroxSettings.currentWeeklyRunKm || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
