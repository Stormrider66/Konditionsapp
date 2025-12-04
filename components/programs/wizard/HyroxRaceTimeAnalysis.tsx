'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Timer,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Footprints,
  Dumbbell,
  ArrowRightLeft,
} from 'lucide-react'

// Types matching hyrox-benchmarks.ts
interface StationTimes {
  skierg: number | null
  sledPush: number | null
  sledPull: number | null
  burpeeBroadJump: number | null
  rowing: number | null
  farmersCarry: number | null
  sandbagLunge: number | null
  wallBalls: number | null
}

type Gender = 'male' | 'female'
type PerformanceLevel = 'world_class' | 'elite' | 'advanced' | 'intermediate' | 'beginner'

interface HyroxRaceTimeAnalysisProps {
  stationTimes: {
    skierg?: string
    sledPush?: string
    sledPull?: string
    burpeeBroadJump?: string
    rowing?: string
    farmersCarry?: string
    sandbagLunge?: string
    wallBalls?: string
    averageRunPace?: string
  }
  gender?: Gender
  targetTime?: string // HH:MM:SS format
}

// Station benchmarks (condensed from hyrox-benchmarks.ts)
const STATION_BENCHMARKS: Record<Gender, Record<Exclude<PerformanceLevel, 'world_class'>, Record<string, number>>> = {
  male: {
    elite: { skierg: 180, sledPush: 90, sledPull: 120, burpeeBroadJump: 180, rowing: 180, farmersCarry: 90, sandbagLunge: 240, wallBalls: 180 },
    advanced: { skierg: 210, sledPush: 120, sledPull: 150, burpeeBroadJump: 210, rowing: 210, farmersCarry: 120, sandbagLunge: 300, wallBalls: 210 },
    intermediate: { skierg: 240, sledPush: 150, sledPull: 180, burpeeBroadJump: 240, rowing: 240, farmersCarry: 150, sandbagLunge: 360, wallBalls: 240 },
    beginner: { skierg: 300, sledPush: 210, sledPull: 240, burpeeBroadJump: 300, rowing: 300, farmersCarry: 210, sandbagLunge: 450, wallBalls: 300 },
  },
  female: {
    elite: { skierg: 210, sledPush: 105, sledPull: 135, burpeeBroadJump: 210, rowing: 210, farmersCarry: 105, sandbagLunge: 270, wallBalls: 195 },
    advanced: { skierg: 240, sledPush: 135, sledPull: 165, burpeeBroadJump: 240, rowing: 240, farmersCarry: 135, sandbagLunge: 330, wallBalls: 225 },
    intermediate: { skierg: 270, sledPush: 165, sledPull: 195, burpeeBroadJump: 270, rowing: 270, farmersCarry: 165, sandbagLunge: 390, wallBalls: 270 },
    beginner: { skierg: 330, sledPush: 225, sledPull: 255, burpeeBroadJump: 330, rowing: 330, farmersCarry: 225, sandbagLunge: 480, wallBalls: 330 },
  },
}

// Race time benchmarks
const RACE_TIME_BENCHMARKS: Record<Gender, Record<PerformanceLevel, number>> = {
  male: {
    world_class: 3600,  // 1:00:00
    elite: 4200,        // 1:10:00
    advanced: 4800,     // 1:20:00
    intermediate: 5400, // 1:30:00
    beginner: 6600,     // 1:50:00
  },
  female: {
    world_class: 4200,  // 1:10:00
    elite: 4800,        // 1:20:00
    advanced: 5400,     // 1:30:00
    intermediate: 6000, // 1:40:00
    beginner: 7200,     // 2:00:00
  },
}

const STATION_LABELS: Record<string, { en: string; sv: string }> = {
  skierg: { en: 'SkiErg', sv: 'SkiErg' },
  sledPush: { en: 'Sled Push', sv: 'Släde Push' },
  sledPull: { en: 'Sled Pull', sv: 'Släde Pull' },
  burpeeBroadJump: { en: 'Burpee Broad Jump', sv: 'Burpee Längdhopp' },
  rowing: { en: 'Rowing', sv: 'Rodd' },
  farmersCarry: { en: 'Farmers Carry', sv: 'Farmers Carry' },
  sandbagLunge: { en: 'Sandbag Lunge', sv: 'Sandsäcksutfall' },
  wallBalls: { en: 'Wall Balls', sv: 'Wall Balls' },
}

// Helper functions
function parseTimeToSeconds(timeStr?: string): number | null {
  if (!timeStr || timeStr.trim() === '') return null
  const parts = timeStr.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getPerformanceLevel(totalTime: number, gender: Gender): PerformanceLevel {
  const benchmarks = RACE_TIME_BENCHMARKS[gender]
  if (totalTime <= benchmarks.world_class) return 'world_class'
  if (totalTime <= benchmarks.elite) return 'elite'
  if (totalTime <= benchmarks.advanced) return 'advanced'
  if (totalTime <= benchmarks.intermediate) return 'intermediate'
  return 'beginner'
}

function getPerformanceLevelLabel(level: PerformanceLevel): { en: string; sv: string; color: string } {
  const labels: Record<PerformanceLevel, { en: string; sv: string; color: string }> = {
    world_class: { en: 'World Class', sv: 'Världsklass', color: 'bg-purple-500' },
    elite: { en: 'Elite', sv: 'Elit', color: 'bg-amber-500' },
    advanced: { en: 'Advanced', sv: 'Avancerad', color: 'bg-blue-500' },
    intermediate: { en: 'Intermediate', sv: 'Mellanliggande', color: 'bg-green-500' },
    beginner: { en: 'Beginner', sv: 'Nybörjare', color: 'bg-gray-500' },
  }
  return labels[level]
}

export function HyroxRaceTimeAnalysis({ stationTimes, gender = 'male', targetTime }: HyroxRaceTimeAnalysisProps) {
  const analysis = useMemo(() => {
    // Parse station times
    const parsedTimes: Record<string, number | null> = {
      skierg: parseTimeToSeconds(stationTimes.skierg),
      sledPush: parseTimeToSeconds(stationTimes.sledPush),
      sledPull: parseTimeToSeconds(stationTimes.sledPull),
      burpeeBroadJump: parseTimeToSeconds(stationTimes.burpeeBroadJump),
      rowing: parseTimeToSeconds(stationTimes.rowing),
      farmersCarry: parseTimeToSeconds(stationTimes.farmersCarry),
      sandbagLunge: parseTimeToSeconds(stationTimes.sandbagLunge),
      wallBalls: parseTimeToSeconds(stationTimes.wallBalls),
    }

    const runPace = parseTimeToSeconds(stationTimes.averageRunPace)
    const targetTimeSeconds = parseTimeToSeconds(targetTime)

    // Count filled stations
    const filledStations = Object.values(parsedTimes).filter(t => t !== null)
    const hasEnoughData = filledStations.length >= 3

    if (!hasEnoughData) {
      return null
    }

    // Calculate totals
    const stationsTotal = filledStations.reduce((sum, t) => sum + (t || 0), 0)
    const runningTotal = runPace ? runPace * 8 : 0 // 8 x 1km
    const transitionsTotal = 45 * 8 // 45 seconds x 8 transitions (estimate)
    const estimatedTotal = stationsTotal + runningTotal + transitionsTotal

    // Analyze each station
    const stationAnalysis: Array<{
      station: string
      time: number
      benchmark: number
      diff: number
      percentDiff: number
      status: 'strong' | 'average' | 'weak'
      potentialSaving: number
    }> = []

    const targetLevel = getPerformanceLevel(estimatedTotal, gender)
    const benchmarkLevel = targetLevel === 'world_class' ? 'elite' : targetLevel
    const benchmarks = STATION_BENCHMARKS[gender][benchmarkLevel]

    Object.entries(parsedTimes).forEach(([station, time]) => {
      if (time !== null) {
        const benchmark = benchmarks[station]
        const diff = time - benchmark
        const percentDiff = (diff / benchmark) * 100

        let status: 'strong' | 'average' | 'weak'
        if (percentDiff <= -10) status = 'strong'
        else if (percentDiff >= 20) status = 'weak'
        else status = 'average'

        // Potential saving if they match benchmark
        const potentialSaving = diff > 0 ? diff : 0

        stationAnalysis.push({
          station,
          time,
          benchmark,
          diff,
          percentDiff,
          status,
          potentialSaving,
        })
      }
    })

    // Sort by worst to best
    stationAnalysis.sort((a, b) => b.percentDiff - a.percentDiff)

    const performanceLevel = getPerformanceLevel(estimatedTotal, gender)
    const totalPotentialSaving = stationAnalysis.reduce((sum, s) => sum + s.potentialSaving, 0)

    return {
      stationsTotal,
      runningTotal,
      transitionsTotal,
      estimatedTotal,
      performanceLevel,
      stationAnalysis,
      weakStations: stationAnalysis.filter(s => s.status === 'weak'),
      strongStations: stationAnalysis.filter(s => s.status === 'strong'),
      targetTimeSeconds,
      timeToTarget: targetTimeSeconds ? estimatedTotal - targetTimeSeconds : null,
      totalPotentialSaving,
    }
  }, [stationTimes, gender, targetTime])

  if (!analysis) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Fyll i minst 3 stationstider för att se analys</p>
        </CardContent>
      </Card>
    )
  }

  const levelInfo = getPerformanceLevelLabel(analysis.performanceLevel)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Tävlingstidsanalys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estimated Time & Level */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Beräknad tävlingstid</p>
            <p className="text-3xl font-bold">{formatTime(analysis.estimatedTotal)}</p>
          </div>
          <Badge className={`${levelInfo.color} text-white`}>
            {levelInfo.sv}
          </Badge>
        </div>

        {/* Time Breakdown */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Tidsfördelning</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
              <Footprints className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xs text-muted-foreground">Löpning</p>
              <p className="font-semibold">{analysis.runningTotal > 0 ? formatTime(analysis.runningTotal) : '--'}</p>
              <p className="text-xs text-muted-foreground">
                {analysis.runningTotal > 0 ? `${Math.round((analysis.runningTotal / analysis.estimatedTotal) * 100)}%` : ''}
              </p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg text-center">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <p className="text-xs text-muted-foreground">Stationer</p>
              <p className="font-semibold">{formatTime(analysis.stationsTotal)}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round((analysis.stationsTotal / analysis.estimatedTotal) * 100)}%
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
              <ArrowRightLeft className="h-5 w-5 mx-auto mb-1 text-gray-600" />
              <p className="text-xs text-muted-foreground">Övergångar</p>
              <p className="font-semibold">{formatTime(analysis.transitionsTotal)}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round((analysis.transitionsTotal / analysis.estimatedTotal) * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* Target Comparison */}
        {analysis.targetTimeSeconds && analysis.timeToTarget !== null && (
          <div className={`p-4 rounded-lg ${analysis.timeToTarget > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950'}`}>
            <div className="flex items-center gap-2 mb-2">
              {analysis.timeToTarget > 0 ? (
                <>
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-700 dark:text-red-400">
                    {formatTime(Math.abs(analysis.timeToTarget))} över måltid
                  </span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {formatTime(Math.abs(analysis.timeToTarget))} under måltid
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Måltid: {formatTime(analysis.targetTimeSeconds)}
            </p>
          </div>
        )}

        {/* Weak Stations - Priority */}
        {analysis.weakStations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Prioriterade stationer
            </div>
            <div className="space-y-2">
              {analysis.weakStations.map((station) => (
                <div key={station.station} className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{STATION_LABELS[station.station].sv}</span>
                    <span className="text-sm text-red-600">+{Math.round(station.percentDiff)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Din tid: {formatTime(station.time)}</span>
                    <span>Riktmärke: {formatTime(station.benchmark)}</span>
                  </div>
                  {station.potentialSaving > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Potentiell besparing: {formatTime(station.potentialSaving)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strong Stations */}
        {analysis.strongStations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Starka stationer
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.strongStations.map((station) => (
                <Badge key={station.station} variant="outline" className="bg-green-50 dark:bg-green-950">
                  {STATION_LABELS[station.station].sv} ({Math.round(Math.abs(station.percentDiff))}% under)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Station Progress Bars */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Alla stationer vs. riktmärke</p>
          {analysis.stationAnalysis.map((station) => {
            // Calculate progress relative to benchmark (100% = at benchmark)
            const progress = Math.min(150, Math.max(50, (station.benchmark / station.time) * 100))
            const barColor = station.status === 'strong'
              ? 'bg-green-500'
              : station.status === 'weak'
              ? 'bg-red-500'
              : 'bg-blue-500'

            return (
              <div key={station.station} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{STATION_LABELS[station.station].sv}</span>
                  <span className={`font-medium ${
                    station.status === 'strong' ? 'text-green-600' :
                    station.status === 'weak' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {formatTime(station.time)}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Total Potential Saving */}
        {analysis.totalPotentialSaving > 30 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-amber-700 dark:text-amber-400">
                Total potential: -{formatTime(analysis.totalPotentialSaving)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Om du når riktmärkestider på svaga stationer
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
