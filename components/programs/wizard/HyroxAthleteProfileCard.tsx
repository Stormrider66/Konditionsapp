'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  User,
  Footprints,
  Dumbbell,
  Target,
  TrendingUp,
  TrendingDown,
  Scale,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react'

interface HyroxAthleteProfileCardProps {
  // Race results for VDOT
  recentRaceDistance?: '5K' | '10K' | 'HALF' | 'MARATHON'
  recentRaceTime?: string
  // HYROX-specific
  hyroxAverageRunPace?: string // MM:SS format
  stationTimes?: {
    skierg?: string
    sledPush?: string
    sledPull?: string
    burpeeBroadJump?: string
    rowing?: string
    farmersCarry?: string
    sandbagLunge?: string
    wallBalls?: string
  }
  // Athlete info
  gender?: 'male' | 'female'
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  currentWeeklyKm?: number
  // Goal
  goalTime?: string // H:MM:SS format
}

type AthleteType = 'FAST_WEAK' | 'SLOW_STRONG' | 'BALANCED' | 'NEEDS_BOTH'
type RunnerType = 'FAST_RUNNER' | 'AVERAGE_RUNNER' | 'SLOW_RUNNER'
type StationType = 'STRONG_STATIONS' | 'AVERAGE_STATIONS' | 'WEAK_STATIONS'

interface ProfileAnalysis {
  athleteType: AthleteType
  runnerType: RunnerType
  stationType: StationType
  vdot: number | null
  pureRunPacePerKm: number | null
  hyroxRunPacePerKm: number | null
  paceDegradation: number | null
  volumeScaleFactor: number
  recommendedWeeklyKm: number
  profileDescription: string
  trainingFocus: string[]
  goalAssessment: string | null
  isGoalRealistic: boolean
  currentEstimatedTime: number | null
  goalTimeSeconds: number | null
  timeGapSeconds: number | null
}

// Constants for classification
const VDOT_THRESHOLDS = {
  male: { FAST_RUNNER: 55, AVERAGE_RUNNER: 45 },
  female: { FAST_RUNNER: 50, AVERAGE_RUNNER: 40 },
}

const STATION_BENCHMARKS_AVG = {
  male: { strong: 1500, average: 1900, weak: 2400 }, // seconds for all 8 stations combined
  female: { strong: 1700, average: 2100, weak: 2700 },
}

const WEEKLY_KM_RECOMMENDATIONS = {
  FAST_WEAK: { min: 40, max: 50 },
  SLOW_STRONG: { min: 50, max: 70 },
  BALANCED: { min: 45, max: 60 },
  NEEDS_BOTH: { min: 40, max: 55 },
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

function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// VDOT calculation (simplified)
function calculateVDOT(distanceMeters: number, timeMinutes: number): number {
  const velocity = distanceMeters / timeMinutes
  const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes)
  const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2)
  return Math.round(vo2 / percentMax * 10) / 10
}

function getDistanceMeters(distance: '5K' | '10K' | 'HALF' | 'MARATHON'): number {
  const distances: Record<string, number> = {
    '5K': 5000,
    '10K': 10000,
    'HALF': 21097.5,
    'MARATHON': 42195,
  }
  return distances[distance] || 0
}

export function HyroxAthleteProfileCard({
  recentRaceDistance,
  recentRaceTime,
  hyroxAverageRunPace,
  stationTimes,
  gender = 'male',
  experienceLevel = 'intermediate',
  currentWeeklyKm,
  goalTime,
}: HyroxAthleteProfileCardProps) {
  const analysis = useMemo((): ProfileAnalysis | null => {
    // Calculate VDOT and paces from race result
    let vdot: number | null = null
    let pureRunPacePerKm: number | null = null

    if (recentRaceDistance && recentRaceTime) {
      const timeSeconds = parseTimeToSeconds(recentRaceTime)
      if (timeSeconds) {
        const distanceMeters = getDistanceMeters(recentRaceDistance)
        const timeMinutes = timeSeconds / 60
        vdot = calculateVDOT(distanceMeters, timeMinutes)
        pureRunPacePerKm = timeSeconds / (distanceMeters / 1000)
      }
    }

    // Get HYROX running pace
    const hyroxPaceSeconds = parseTimeToSeconds(hyroxAverageRunPace)
    const hyroxRunPacePerKm = hyroxPaceSeconds || null

    // Calculate pace degradation
    let paceDegradation: number | null = null
    if (pureRunPacePerKm && hyroxRunPacePerKm) {
      paceDegradation = ((hyroxRunPacePerKm - pureRunPacePerKm) / pureRunPacePerKm) * 100
    }

    // Determine runner type
    let runnerType: RunnerType = 'AVERAGE_RUNNER'
    if (vdot !== null) {
      const thresholds = VDOT_THRESHOLDS[gender]
      if (vdot >= thresholds.FAST_RUNNER) runnerType = 'FAST_RUNNER'
      else if (vdot >= thresholds.AVERAGE_RUNNER) runnerType = 'AVERAGE_RUNNER'
      else runnerType = 'SLOW_RUNNER'
    } else if (pureRunPacePerKm !== null) {
      // Fall back to pace-based classification
      const fastPace = gender === 'male' ? 270 : 300
      const avgPace = gender === 'male' ? 315 : 360
      if (pureRunPacePerKm <= fastPace) runnerType = 'FAST_RUNNER'
      else if (pureRunPacePerKm <= avgPace) runnerType = 'AVERAGE_RUNNER'
      else runnerType = 'SLOW_RUNNER'
    }

    // Calculate total station time
    let totalStationTime = 0
    let stationCount = 0

    if (stationTimes) {
      const stationKeys = ['skierg', 'sledPush', 'sledPull', 'burpeeBroadJump', 'rowing', 'farmersCarry', 'sandbagLunge', 'wallBalls'] as const
      for (const key of stationKeys) {
        const time = parseTimeToSeconds(stationTimes[key])
        if (time !== null) {
          totalStationTime += time
          stationCount++
        }
      }
    }

    // Determine station type
    let stationType: StationType = 'AVERAGE_STATIONS'
    if (stationCount >= 3) {
      // Extrapolate to 8 stations
      const estimatedTotalStations = (totalStationTime / stationCount) * 8
      const benchmarks = STATION_BENCHMARKS_AVG[gender]
      if (estimatedTotalStations <= benchmarks.strong) stationType = 'STRONG_STATIONS'
      else if (estimatedTotalStations >= benchmarks.weak) stationType = 'WEAK_STATIONS'
    }

    // Determine athlete type
    let athleteType: AthleteType = 'BALANCED'
    if (runnerType === 'FAST_RUNNER' && stationType === 'WEAK_STATIONS') {
      athleteType = 'FAST_WEAK'
    } else if (runnerType === 'SLOW_RUNNER' && stationType === 'STRONG_STATIONS') {
      athleteType = 'SLOW_STRONG'
    } else if (runnerType !== 'FAST_RUNNER' && stationType === 'WEAK_STATIONS') {
      athleteType = 'NEEDS_BOTH'
    }

    // Calculate volume recommendations
    const kmRecs = WEEKLY_KM_RECOMMENDATIONS[athleteType]
    let recommendedWeeklyKm = (kmRecs.min + kmRecs.max) / 2
    if (experienceLevel === 'beginner') recommendedWeeklyKm = kmRecs.min
    else if (experienceLevel === 'advanced') recommendedWeeklyKm = kmRecs.max

    let volumeScaleFactor = 1.0
    if (currentWeeklyKm) {
      const ratio = currentWeeklyKm / recommendedWeeklyKm
      volumeScaleFactor = Math.max(0.7, Math.min(1.3, ratio))
    }

    // Generate profile description
    const descriptions: Record<AthleteType, string> = {
      FAST_WEAK: 'Din löpkapacitet är stark, men stationerna bromsar dig. Fokusera på stationsträning och "kompromisslöpning" efter stationer.',
      SLOW_STRONG: 'Dina stationer är effektiva, men löpningen begränsar din totaltid. Öka löpvolymen och laktattröskelträning.',
      BALANCED: 'Du har en balanserad profil. Fortsätt utveckla båda områdena parallellt.',
      NEEDS_BOTH: 'Både löpning och stationer behöver utvecklas. Bygg gradvis upp kapacitet på båda fronterna.',
    }

    // Generate training focus
    const focusAreas: Record<AthleteType, string[]> = {
      FAST_WEAK: [
        'Stationsspecifik uthållighetsträning',
        'Kompromisslöpning (löpning direkt efter stationer)',
        'Sled push/pull teknik och styrka',
      ],
      SLOW_STRONG: [
        'Öka löpvolym gradvis (+15-20%)',
        'Tröskelintervaller (4-8 x 1km @ LT2)',
        'Långpass med ökad distans',
      ],
      BALANCED: [
        'Fortsätt balanserad träning',
        'Race-simuleringar för HYROX-formatet',
        'Fokusera på övergångar (roxzone-effektivitet)',
      ],
      NEEDS_BOTH: [
        'Bygg aerob bas (Zone 2 löpning)',
        'Grundläggande styrka för stationer',
        'Fokusera på teknik innan intensitet',
      ],
    }

    // Goal analysis
    let goalAssessment: string | null = null
    let isGoalRealistic = true
    let currentEstimatedTime: number | null = null
    let timeGapSeconds: number | null = null
    const goalTimeSeconds = parseTimeToSeconds(goalTime)

    if (goalTimeSeconds && stationCount >= 3 && (pureRunPacePerKm || hyroxRunPacePerKm)) {
      // Estimate current race time
      const estimatedStationTime = (totalStationTime / stationCount) * 8
      const runPace = hyroxRunPacePerKm || (pureRunPacePerKm ? pureRunPacePerKm * 1.1 : null)
      if (runPace) {
        const runningTime = runPace * 8
        const transitionTime = 45 * 8
        currentEstimatedTime = Math.round(estimatedStationTime + runningTime + transitionTime)
        timeGapSeconds = currentEstimatedTime - goalTimeSeconds

        if (timeGapSeconds <= 0) {
          goalAssessment = `Du är redan ${formatTime(Math.abs(timeGapSeconds))} under måltiden!`
        } else {
          const improvementPercent = (timeGapSeconds / currentEstimatedTime) * 100
          if (improvementPercent <= 5) {
            goalAssessment = `Nåbart mål - ${formatTime(timeGapSeconds)} att förbättra`
          } else if (improvementPercent <= 10) {
            goalAssessment = `Ambitiöst mål - ${formatTime(timeGapSeconds)} att förbättra`
          } else {
            goalAssessment = `Mycket ambitiöst - ${formatTime(timeGapSeconds)} att förbättra`
            isGoalRealistic = false
          }
        }
      }
    }

    // Need at least some data to show profile
    const hasRunningData = vdot !== null || pureRunPacePerKm !== null || hyroxRunPacePerKm !== null
    const hasStationData = stationCount >= 3
    if (!hasRunningData && !hasStationData) {
      return null
    }

    return {
      athleteType,
      runnerType,
      stationType,
      vdot,
      pureRunPacePerKm,
      hyroxRunPacePerKm,
      paceDegradation,
      volumeScaleFactor,
      recommendedWeeklyKm: Math.round(recommendedWeeklyKm),
      profileDescription: descriptions[athleteType],
      trainingFocus: focusAreas[athleteType],
      goalAssessment,
      isGoalRealistic,
      currentEstimatedTime,
      goalTimeSeconds,
      timeGapSeconds,
    }
  }, [recentRaceDistance, recentRaceTime, hyroxAverageRunPace, stationTimes, gender, experienceLevel, currentWeeklyKm, goalTime])

  if (!analysis) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Ange löptempo eller stationstider för att se din atletprofil</p>
        </CardContent>
      </Card>
    )
  }

  const athleteTypeLabels: Record<AthleteType, { label: string; color: string; icon: typeof User }> = {
    FAST_WEAK: { label: 'Stark löpare', color: 'bg-blue-500', icon: Footprints },
    SLOW_STRONG: { label: 'Stark stationsutövare', color: 'bg-orange-500', icon: Dumbbell },
    BALANCED: { label: 'Balanserad', color: 'bg-green-500', icon: Scale },
    NEEDS_BOTH: { label: 'Under utveckling', color: 'bg-purple-500', icon: TrendingUp },
  }

  const typeInfo = athleteTypeLabels[analysis.athleteType]
  const TypeIcon = typeInfo.icon

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Atletprofil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Type Badge */}
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <div className={`p-2 rounded-full ${typeInfo.color}`}>
            <TypeIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge className={`${typeInfo.color} text-white`}>
                {typeInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {analysis.profileDescription}
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {/* VDOT */}
          {analysis.vdot && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-xs text-muted-foreground">VDOT</p>
              <p className="text-xl font-bold text-blue-600">{analysis.vdot}</p>
            </div>
          )}

          {/* Pace Degradation */}
          {analysis.paceDegradation !== null && (
            <div className={`p-3 rounded-lg ${analysis.paceDegradation <= 10 ? 'bg-green-50 dark:bg-green-950' : 'bg-amber-50 dark:bg-amber-950'}`}>
              <p className="text-xs text-muted-foreground">Tempotapp i HYROX</p>
              <p className={`text-xl font-bold ${analysis.paceDegradation <= 10 ? 'text-green-600' : 'text-amber-600'}`}>
                +{Math.round(analysis.paceDegradation)}%
              </p>
            </div>
          )}

          {/* Pure Running Pace */}
          {analysis.pureRunPacePerKm && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-muted-foreground">Löptempo (ren löpning)</p>
              <p className="text-lg font-semibold">{formatPace(analysis.pureRunPacePerKm)} /km</p>
            </div>
          )}

          {/* HYROX Running Pace */}
          {analysis.hyroxRunPacePerKm && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-muted-foreground">Löptempo (HYROX)</p>
              <p className="text-lg font-semibold">{formatPace(analysis.hyroxRunPacePerKm)} /km</p>
            </div>
          )}
        </div>

        {/* Volume Recommendation */}
        {analysis.volumeScaleFactor !== 1.0 && (
          <Alert className={analysis.volumeScaleFactor < 1 ? 'border-amber-500' : 'border-green-500'}>
            <Scale className="h-4 w-4" />
            <AlertTitle>Volymjustering</AlertTitle>
            <AlertDescription>
              {analysis.volumeScaleFactor < 1 ? (
                <>
                  Programmet skalas ner till {Math.round(analysis.volumeScaleFactor * 100)}% av standardvolym.
                  <span className="block text-xs mt-1">
                    Rekommenderad veckovolym: {analysis.recommendedWeeklyKm} km
                  </span>
                </>
              ) : (
                <>
                  Programmet skalas upp till {Math.round(analysis.volumeScaleFactor * 100)}% av standardvolym.
                  <span className="block text-xs mt-1">
                    Din kapacitet stödjer högre volym!
                  </span>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Goal Assessment */}
        {analysis.goalAssessment && (
          <div className={`p-4 rounded-lg ${analysis.isGoalRealistic ? 'bg-green-50 dark:bg-green-950' : 'bg-amber-50 dark:bg-amber-950'}`}>
            <div className="flex items-center gap-2 mb-1">
              {analysis.isGoalRealistic ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <span className={`font-medium ${analysis.isGoalRealistic ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {analysis.goalAssessment}
              </span>
            </div>
            {analysis.currentEstimatedTime && analysis.goalTimeSeconds && (
              <div className="text-sm text-muted-foreground mt-2 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs">Nuvarande:</span>
                  <span className="block font-medium">{formatTime(analysis.currentEstimatedTime)}</span>
                </div>
                <div>
                  <span className="text-xs">Mål:</span>
                  <span className="block font-medium">{formatTime(analysis.goalTimeSeconds)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Training Focus */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Träningsfokus
          </div>
          <ul className="space-y-1">
            {analysis.trainingFocus.map((focus, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Target className="h-3 w-3 mt-1 flex-shrink-0" />
                {focus}
              </li>
            ))}
          </ul>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <p>
            Profilen baseras på dina angivna tider och används för att anpassa programmet.
            Mer data ger bättre analys.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
