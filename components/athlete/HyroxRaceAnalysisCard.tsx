'use client'

import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Timer,
  Target,
  TrendingUp,
  TrendingDown,
  Footprints,
  Clock,
  ArrowRightLeft,
} from 'lucide-react'
import {
  analyzeStationWeaknesses,
  estimateRaceTime,
  getPerformanceLevel,
  formatTime,
  type StationTimes,
  type PerformanceLevel,
} from '@/lib/program-generator/hyrox-benchmarks'

interface HyroxRaceAnalysisCardProps {
  stationTimes: {
    skierg?: number | null
    sledPush?: number | null
    sledPull?: number | null
    burpeeBroadJump?: number | null
    rowing?: number | null
    farmersCarry?: number | null
    sandbagLunge?: number | null
    wallBalls?: number | null
  }
  averageRunPace?: number | null // seconds per km
  gender?: 'male' | 'female'
  targetLevel?: PerformanceLevel // For benchmark comparison
  targetTime?: string // HH:MM:SS format
  compact?: boolean // For smaller displays
  variant?: 'default' | 'glass'
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const STATION_LABELS: Record<string, Record<AppLocale, string>> = {
  skierg: { sv: 'SkiErg 1km', en: 'SkiErg 1km' },
  sledPush: { sv: 'Släde Push 50m', en: 'Sled Push 50m' },
  sledPull: { sv: 'Släde Pull 50m', en: 'Sled Pull 50m' },
  burpeeBroadJump: { sv: 'Burpee Längdhopp 80m', en: 'Burpee Broad Jump 80m' },
  rowing: { sv: 'Rodd 1km', en: 'Row 1km' },
  farmersCarry: { sv: 'Farmers Carry 200m', en: "Farmer's Carry 200m" },
  sandbagLunge: { sv: 'Sandsäck Utfall 100m', en: 'Sandbag Lunge 100m' },
  wallBalls: { sv: 'Wall Balls', en: 'Wall Balls' },
}

const STATION_ICONS: Record<string, string> = {
  skierg: '🎿',
  sledPush: '🛷',
  sledPull: '🪢',
  burpeeBroadJump: '🦘',
  rowing: '🚣',
  farmersCarry: '🏋️',
  sandbagLunge: '🎒',
  wallBalls: '⚽',
}

const LEVEL_LABELS: Record<PerformanceLevel, { label: Record<AppLocale, string>; color: string; bgColor: string }> = {
  world_class: { label: { sv: 'Världsklass', en: 'World class' }, color: 'text-purple-700', bgColor: 'bg-purple-100' },
  elite: { label: { sv: 'Elit', en: 'Elite' }, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  advanced: { label: { sv: 'Avancerad', en: 'Advanced' }, color: 'text-blue-700', bgColor: 'bg-blue-100' },
  intermediate: { label: { sv: 'Mellanliggande', en: 'Intermediate' }, color: 'text-green-700', bgColor: 'bg-green-100' },
  beginner: { label: { sv: 'Nybörjare', en: 'Beginner' }, color: 'text-gray-700', bgColor: 'bg-gray-100' },
}

function parseTargetTimeToSeconds(timeStr?: string): number | null {
  if (!timeStr) return null
  const parts = timeStr.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return null
}

export function HyroxRaceAnalysisCard({
  stationTimes,
  averageRunPace,
  gender = 'male',
  targetLevel = 'intermediate',
  targetTime,
  compact = false,
  variant: _variant = 'default',
}: HyroxRaceAnalysisCardProps) {
  const locale = getAppLocale(useLocale())
  const analysis = useMemo(() => {
    // Convert to StationTimes format
    const times: StationTimes = {
      skierg: stationTimes.skierg ?? null,
      sledPush: stationTimes.sledPush ?? null,
      sledPull: stationTimes.sledPull ?? null,
      burpeeBroadJump: stationTimes.burpeeBroadJump ?? null,
      rowing: stationTimes.rowing ?? null,
      farmersCarry: stationTimes.farmersCarry ?? null,
      sandbagLunge: stationTimes.sandbagLunge ?? null,
      wallBalls: stationTimes.wallBalls ?? null,
      roxzone: null,
    }

    // Check if we have enough data
    const knownStations = Object.values(times).filter(v => v !== null).length
    if (knownStations < 3) {
      return null
    }

    // Analyze weaknesses against target level
    const weaknessAnalysis = analyzeStationWeaknesses(times, gender, targetLevel)

    // Estimate race time
    const raceEstimate = estimateRaceTime(times, averageRunPace || 300, 45)

    // Get performance level
    const level = getPerformanceLevel(raceEstimate.totalTime, gender)

    const targetSeconds = parseTargetTimeToSeconds(targetTime)
    const timeDifference = targetSeconds ? raceEstimate.totalTime - targetSeconds : null

    return {
      weaknessAnalysis,
      raceEstimate,
      level,
      targetSeconds,
      timeDifference,
    }
  }, [stationTimes, averageRunPace, gender, targetLevel, targetTime])

  if (!analysis) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" />
            {t(locale, 'Tidsanalys', 'Time analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t(locale, 'Fyll i minst 3 stationstider för att se din analys.', 'Enter at least 3 station times to see your analysis.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const { weaknessAnalysis, raceEstimate, level, targetSeconds, timeDifference } = analysis
  const levelInfo = LEVEL_LABELS[level]

  if (compact) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{formatTime(raceEstimate.totalTime)}</p>
              <p className="text-xs text-muted-foreground">{t(locale, 'Uppskattad tid', 'Estimated time')}</p>
            </div>
            <div className="text-center">
              <Target className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <Badge className={`${levelInfo.bgColor} ${levelInfo.color}`}>
                {levelInfo.label[locale]}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">{t(locale, 'Prestationsnivå', 'Performance level')}</p>
            </div>
          </div>
          {weaknessAnalysis.weakStations.length > 0 && (
            <div className="mt-4 p-2 bg-orange-50 rounded-lg">
              <p className="text-xs font-medium text-orange-700">
                {t(locale, 'Fokusera på:', 'Focus on:')} {weaknessAnalysis.weakStations.slice(0, 2).map(s => STATION_ICONS[s]).join(' ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5 text-orange-500" />
            HYROX {t(locale, 'Tidsanalys', 'Time analysis')}
          </CardTitle>
          <Badge className={`${levelInfo.bgColor} ${levelInfo.color}`}>
            {levelInfo.label[locale]}
          </Badge>
        </div>
        <CardDescription>
          {t(locale, 'Baserad på dina stationstider och löptempo', 'Based on your station times and run pace')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time Breakdown */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{formatTime(raceEstimate.totalTime)}</p>
            <p className="text-xs text-muted-foreground">{t(locale, 'Total tid', 'Total time')}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Footprints className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{formatTime(raceEstimate.breakdown.running)}</p>
            <p className="text-xs text-muted-foreground">{t(locale, 'Löpning', 'Running')}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Target className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{formatTime(raceEstimate.breakdown.stations)}</p>
            <p className="text-xs text-muted-foreground">{t(locale, 'Stationer', 'Stations')}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <ArrowRightLeft className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-bold">{formatTime(raceEstimate.breakdown.transitions)}</p>
            <p className="text-xs text-muted-foreground">{t(locale, 'Övergångar', 'Transitions')}</p>
          </div>
        </div>

        {/* Target Comparison */}
        {targetSeconds && timeDifference !== null && (
          <div className={`p-3 rounded-lg ${timeDifference > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {timeDifference > 0
                  ? t(locale, 'Över mål med', 'Over target by')
                  : t(locale, 'Under mål med', 'Under target by')}
              </span>
              <span className={`font-bold ${timeDifference > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatTime(Math.abs(timeDifference))}
              </span>
            </div>
            <Progress
              value={Math.min(100, (targetSeconds / raceEstimate.totalTime) * 100)}
              className="h-2 mt-2"
            />
          </div>
        )}

        {/* Weak Stations */}
        {weaknessAnalysis.weakStations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              {t(locale, 'Svaga stationer att förbättra', 'Weak stations to improve')}
            </h4>
            <div className="space-y-2">
              {weaknessAnalysis.weakStations.slice(0, 3).map((station) => (
                <div key={station} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                  <span className="text-lg">{STATION_ICONS[station]}</span>
                  <span className="text-sm flex-1">{STATION_LABELS[station]?.[locale] || station}</span>
                  <Badge variant="outline" className="text-xs text-orange-600">
                    {t(locale, 'Behöver träning', 'Needs training')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strong Stations */}
        {weaknessAnalysis.strongStations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              {t(locale, 'Starka stationer', 'Strong stations')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {weaknessAnalysis.strongStations.slice(0, 4).map((station) => (
                <Badge key={station} variant="outline" className="bg-green-50">
                  {STATION_ICONS[station]} {(STATION_LABELS[station]?.[locale] || station).split(' ')[0]}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {weaknessAnalysis.recommendations.length > 0 && (
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium mb-2">{t(locale, 'Rekommendationer', 'Recommendations')}</h4>
            <ul className="space-y-1">
              {weaknessAnalysis.recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-orange-500">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
