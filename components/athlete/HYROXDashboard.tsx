'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Target,
  Timer,
  Footprints,
  TrendingUp,
  Dumbbell,
  Zap,
  Activity
} from 'lucide-react'
import { HyroxRaceAnalysisCard } from './HyroxRaceAnalysisCard'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'

interface HYROXSettings {
  raceCategory: 'open' | 'pro' | 'doubles' | 'relay'
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite'
  targetRaceDate: string | null
  fiveKmTime: number | null
  tenKmTime: number | null
  currentWeeklyRunKm: number
  skiErgTime: number | null
  sledPushTime: number | null
  sledPullTime: number | null
  burpeeBroadJumpTime: number | null
  rowingTime: number | null
  farmersCarryTime: number | null
  sandbagLungeTime: number | null
  wallBallTime: number | null
  strongestStation: string
  weakestStation: string
  weeklyTrainingHours: number
  runningSessionsPerWeek: number
  strengthSessionsPerWeek: number
  hyroxSpecificSessionsPerWeek: number
}

interface HYROXDashboardProps {
  settings: HYROXSettings
  gender?: 'MALE' | 'FEMALE'
}

const CATEGORY_LABELS: Record<string, string> = {
  open: 'HYROX Open',
  pro: 'HYROX Pro',
  doubles: 'HYROX Doubles',
  relay: 'HYROX Relay',
}

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Nybörjare',
  intermediate: 'Medel',
  advanced: 'Avancerad',
  elite: 'Elit',
}

const STATION_LABELS: Record<string, string> = {
  skierg: 'SkiErg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  burpee_broad_jump: 'Burpee Broad Jump',
  rowing: 'Rodd',
  farmers_carry: 'Farmers Carry',
  sandbag_lunge: 'Sandbag Lunge',
  wall_balls: 'Wall Balls',
}

// Target times for different levels (in seconds) - used for progress visualization
const TARGET_TIMES: Record<string, Record<string, number>> = {
  beginner: {
    skierg: 300, // 5:00
    sled_push: 210, // 3:30
    sled_pull: 180, // 3:00
    burpee_broad_jump: 420, // 7:00
    rowing: 270, // 4:30
    farmers_carry: 180, // 3:00
    sandbag_lunge: 360, // 6:00
    wall_balls: 300, // 5:00
    total: 5400, // 90 min
  },
  intermediate: {
    skierg: 240, // 4:00
    sled_push: 150, // 2:30
    sled_pull: 120, // 2:00
    burpee_broad_jump: 300, // 5:00
    rowing: 225, // 3:45
    farmers_carry: 120, // 2:00
    sandbag_lunge: 270, // 4:30
    wall_balls: 240, // 4:00
    total: 4200, // 70 min
  },
  advanced: {
    skierg: 210, // 3:30
    sled_push: 120, // 2:00
    sled_pull: 90, // 1:30
    burpee_broad_jump: 240, // 4:00
    rowing: 195, // 3:15
    farmers_carry: 90, // 1:30
    sandbag_lunge: 210, // 3:30
    wall_balls: 180, // 3:00
    total: 3600, // 60 min
  },
  elite: {
    skierg: 180, // 3:00
    sled_push: 90, // 1:30
    sled_pull: 75, // 1:15
    burpee_broad_jump: 180, // 3:00
    rowing: 165, // 2:45
    farmers_carry: 75, // 1:15
    sandbag_lunge: 150, // 2:30
    wall_balls: 150, // 2:30
    total: 3000, // 50 min
  },
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function estimateTotalTime(settings: HYROXSettings): string | null {
  const stationTimes = [
    settings.skiErgTime,
    settings.sledPushTime,
    settings.sledPullTime,
    settings.burpeeBroadJumpTime,
    settings.rowingTime,
    settings.farmersCarryTime,
    settings.sandbagLungeTime,
    settings.wallBallTime,
  ]

  const knownStations = stationTimes.filter(t => t !== null).length
  if (knownStations < 4) return null // Need at least half the stations

  // Sum known station times
  const totalStationTime = stationTimes.reduce<number>((sum, t) => sum + (t || 0), 0)

  // Estimate running time from 5k or 10k
  let runningTime: number
  if (settings.tenKmTime) {
    // 8km is 80% of 10km, but HYROX running is slower due to fatigue
    runningTime = settings.tenKmTime * 0.95 // Factor in fatigue
  } else if (settings.fiveKmTime) {
    // Estimate 8km from 5km
    runningTime = settings.fiveKmTime * 1.75
  } else {
    // Default estimate based on experience
    const defaultRunTimes: Record<string, number> = {
      beginner: 3000, // 50 min
      intermediate: 2400, // 40 min
      advanced: 2100, // 35 min
      elite: 1800, // 30 min
    }
    runningTime = defaultRunTimes[settings.experienceLevel]
  }

  // Estimate missing stations based on averages
  const avgStationTime = totalStationTime / knownStations
  const estimatedMissingTime = avgStationTime * (8 - knownStations)

  // Add transition times (roughly 30 seconds per transition)
  const transitionTime = 8 * 30

  const totalSeconds = totalStationTime + estimatedMissingTime + runningTime + transitionTime

  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:00`
  }
  return `${mins}:00`
}

function getStationProgress(time: number | null, targetTime: number): number {
  if (time === null) return 0
  // Inverse progress - lower time = higher percentage (capped at 150%)
  const progress = (targetTime / time) * 100
  return Math.min(progress, 150)
}

export function HYROXDashboard({ settings, gender }: HYROXDashboardProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const estimatedTotal = estimateTotalTime(settings)
  const targets = TARGET_TIMES[settings.experienceLevel]

  const stations = [
    { key: 'skierg', time: settings.skiErgTime, icon: Activity, color: 'text-cyan-500' },
    { key: 'sled_push', time: settings.sledPushTime, icon: Dumbbell, color: 'text-red-500' },
    { key: 'sled_pull', time: settings.sledPullTime, icon: Dumbbell, color: 'text-orange-500' },
    { key: 'burpee_broad_jump', time: settings.burpeeBroadJumpTime, icon: Zap, color: 'text-yellow-500' },
    { key: 'rowing', time: settings.rowingTime, icon: Activity, color: 'text-blue-500' },
    { key: 'farmers_carry', time: settings.farmersCarryTime, icon: Dumbbell, color: 'text-green-500' },
    { key: 'sandbag_lunge', time: settings.sandbagLungeTime, icon: Footprints, color: 'text-purple-500' },
    { key: 'wall_balls', time: settings.wallBallTime, icon: Target, color: 'text-pink-500' },
  ]

  // Computed client-side to avoid SSR/client timezone mismatch
  const [daysUntilRace, setDaysUntilRace] = useState<number | null>(null)
  useEffect(() => {
    if (settings.targetRaceDate) {
      setDaysUntilRace(Math.ceil((new Date(settings.targetRaceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    }
  }, [settings.targetRaceDate])

  return (
    <div className="space-y-6">
      {/* Header with Race Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Target className="h-6 w-6 text-orange-500" />
            HYROX Dashboard
          </h2>
          <p style={{ color: theme.colors.textMuted }}>
            {CATEGORY_LABELS[settings.raceCategory]} • {EXPERIENCE_LABELS[settings.experienceLevel]}
          </p>
        </div>

        <div className="flex gap-2">
          {daysUntilRace !== null && daysUntilRace > 0 && (
            <Badge variant="outline" className="text-lg px-4 py-2">
              {daysUntilRace} dagar till tävling
            </Badge>
          )}
          {estimatedTotal && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Est. tid: {estimatedTotal}
            </Badge>
          )}
        </div>
      </div>

      {/* Advanced Race Time Analysis */}
      <HyroxRaceAnalysisCard
        stationTimes={{
          skierg: settings.skiErgTime,
          sledPush: settings.sledPushTime,
          sledPull: settings.sledPullTime,
          burpeeBroadJump: settings.burpeeBroadJumpTime,
          rowing: settings.rowingTime,
          farmersCarry: settings.farmersCarryTime,
          sandbagLunge: settings.sandbagLungeTime,
          wallBalls: settings.wallBallTime,
        }}
        averageRunPace={settings.fiveKmTime ? Math.round(settings.fiveKmTime / 5 * 1.1) : undefined}
        gender={gender === 'FEMALE' ? 'female' : 'male'}
        targetLevel={settings.experienceLevel === 'elite' ? 'elite' :
                     settings.experienceLevel === 'advanced' ? 'advanced' :
                     settings.experienceLevel === 'intermediate' ? 'intermediate' : 'beginner'}
      />

      {/* Running Stats */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Footprints className="h-5 w-5 text-green-500" />
            Löpkapacitet
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            8km total löpning (8 x 1km mellan stationer)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{formatTime(settings.fiveKmTime)}</div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>5 km PB</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{formatTime(settings.tenKmTime)}</div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>10 km PB</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.currentWeeklyRunKm}</div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>km/vecka</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station Overview */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Timer className="h-5 w-5 text-blue-500" />
            Stationsöversikt
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Dina tider vs måltider för {EXPERIENCE_LABELS[settings.experienceLevel].toLowerCase()}-nivå
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stations.map(({ key, time, icon: Icon, color }) => {
              const progress = getStationProgress(time, targets[key])
              const isStrong = settings.strongestStation === key
              const isWeak = settings.weakestStation === key

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <span className="font-medium" style={{ color: theme.colors.textPrimary }}>{STATION_LABELS[key]}</span>
                      {isStrong && (
                        <Badge variant="default" className="bg-green-500 text-xs">Starkast</Badge>
                      )}
                      {isWeak && (
                        <Badge variant="destructive" className="text-xs">Fokusområde</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span style={{ color: theme.colors.textMuted }}>
                        Mål: {formatTime(targets[key])}
                      </span>
                      <span className="font-medium w-16 text-right" style={{ color: theme.colors.textPrimary }}>
                        {formatTime(time)}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={progress}
                    className="h-2"
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Training Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="text-lg" style={{ color: theme.colors.textPrimary }}>Träningsfördelning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: theme.colors.textPrimary }}>Löppass</span>
                <Badge variant="outline">{settings.runningSessionsPerWeek}/vecka</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: theme.colors.textPrimary }}>Styrkepass</span>
                <Badge variant="outline">{settings.strengthSessionsPerWeek}/vecka</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: theme.colors.textPrimary }}>HYROX-specifikt</span>
                <Badge variant="outline">{settings.hyroxSpecificSessionsPerWeek}/vecka</Badge>
              </div>
              <div className="border-t pt-3 mt-3" style={{ borderColor: theme.colors.border }}>
                <div className="flex justify-between items-center font-medium" style={{ color: theme.colors.textPrimary }}>
                  <span>Total tid</span>
                  <span>{settings.weeklyTrainingHours} tim/vecka</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-5 w-5 text-green-500" />
              Träningstips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm" style={{ color: theme.colors.textPrimary }}>
              {settings.weakestStation && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  Fokusera extra på {STATION_LABELS[settings.weakestStation]} - din svagaste station
                </li>
              )}
              {settings.currentWeeklyRunKm < 30 && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  Öka gradvis löpvolymen mot 30+ km/vecka för bättre uthållighet
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                Träna övergångar - simulera att växla mellan löpning och stationer
              </li>
              {settings.experienceLevel === 'beginner' && (
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  Prioritera teknik på alla stationer före fart
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Race Format Reminder */}
      <Card
        style={{
          backgroundColor: theme.id === 'FITAPP_DARK' ? '#431407' : '#fff7ed',
          borderColor: theme.id === 'FITAPP_DARK' ? '#9a3412' : '#fdba74',
        }}
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Target className="h-8 w-8 text-orange-500 flex-shrink-0" />
            <div>
              <h3
                className="font-semibold mb-2"
                style={{ color: theme.id === 'FITAPP_DARK' ? '#fed7aa' : '#9a3412' }}
              >
                HYROX-format
              </h3>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                8 x 1km löpning med 8 funktionella stationer emellan:
              </p>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <span className="px-2 py-1 rounded" style={{ backgroundColor: theme.colors.backgroundCard, color: theme.colors.textPrimary }}>1. SkiErg 1km</span>
                <span className="px-2 py-1 rounded" style={{ backgroundColor: theme.colors.backgroundCard, color: theme.colors.textPrimary }}>2. Sled Push 50m</span>
                <span className="px-2 py-1 rounded" style={{ backgroundColor: theme.colors.backgroundCard, color: theme.colors.textPrimary }}>3. Sled Pull 50m</span>
                <span className="px-2 py-1 rounded" style={{ backgroundColor: theme.colors.backgroundCard, color: theme.colors.textPrimary }}>4. Burpee BJ 80m</span>
                <span className="px-2 py-1 rounded" style={{ backgroundColor: theme.colors.backgroundCard, color: theme.colors.textPrimary }}>5. Rodd 1km</span>
                <span className="px-2 py-1 rounded" style={{ backgroundColor: theme.colors.backgroundCard, color: theme.colors.textPrimary }}>6. Farmers 200m</span>
                <span className="px-2 py-1 rounded" style={{ backgroundColor: theme.colors.backgroundCard, color: theme.colors.textPrimary }}>7. Lunges 100m</span>
                <span className="px-2 py-1 rounded" style={{ backgroundColor: theme.colors.backgroundCard, color: theme.colors.textPrimary }}>8. Wall Balls</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
