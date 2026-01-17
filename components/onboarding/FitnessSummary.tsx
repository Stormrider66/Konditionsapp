'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Activity, Heart, Target, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import {
  estimateFitnessLevel,
  getFitnessLevelDisplayName,
  getConfidenceDisplayName,
  type FitnessEstimationInput,
} from '@/lib/training/fitness-estimation'
import type { FitnessEstimate } from '@/types'
import type { BiometricsData } from './BiometricsStep'

interface RecentRaceTime {
  distance: '1500M' | '1_MILE' | '3K' | '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON'
  timeMinutes: number
}

interface FitnessSummaryProps {
  biometrics: BiometricsData
  recentRaceTime?: RecentRaceTime | null
  experienceLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  age?: number
  gender?: 'MALE' | 'FEMALE'
  locale?: 'en' | 'sv'
  onContinue?: () => void
  onScheduleFieldTest?: () => void
}

export function FitnessSummary({
  biometrics,
  recentRaceTime,
  experienceLevel,
  age,
  gender,
  locale = 'sv',
  onContinue,
  onScheduleFieldTest,
}: FitnessSummaryProps) {
  const t = (en: string, sv: string) => (locale === 'sv' ? sv : en)

  // Calculate fitness estimate from available data
  const fitnessEstimate = useMemo((): FitnessEstimate | null => {
    const input: FitnessEstimationInput = {
      age,
      gender,
      restingHR: biometrics.restingHR ?? undefined,
      maxHR: biometrics.maxHR ?? undefined,
      watchVO2maxEstimate: biometrics.watchVO2maxEstimate ?? undefined,
      experienceLevel,
    }

    if (recentRaceTime?.distance && recentRaceTime?.timeMinutes) {
      input.recentRaceTime = {
        distance: recentRaceTime.distance,
        timeMinutes: recentRaceTime.timeMinutes,
      }
    }

    // Only calculate if we have some data
    if (
      input.restingHR ||
      input.watchVO2maxEstimate ||
      input.recentRaceTime ||
      input.experienceLevel
    ) {
      return estimateFitnessLevel(input)
    }

    return null
  }, [biometrics, recentRaceTime, experienceLevel, age, gender])

  // Get color for fitness level badge
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'UNTRAINED':
        return 'bg-gray-200 text-gray-700'
      case 'BEGINNER':
        return 'bg-blue-200 text-blue-700'
      case 'RECREATIONAL':
        return 'bg-green-200 text-green-700'
      case 'TRAINED':
        return 'bg-emerald-200 text-emerald-700'
      case 'WELL_TRAINED':
        return 'bg-purple-200 text-purple-700'
      case 'ELITE':
        return 'bg-amber-200 text-amber-700'
      default:
        return 'bg-gray-200 text-gray-700'
    }
  }

  // Get color for confidence badge
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return 'bg-green-100 text-green-700'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700'
      case 'LOW':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Calculate zone width for visualization
  const getZoneWidth = (estimate: FitnessEstimate) => {
    return estimate.lt2PercentHRmax - estimate.lt1PercentHRmax
  }

  if (!fitnessEstimate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('Fitness Estimate', 'Konditionsuppskattning')}
          </CardTitle>
          <CardDescription>
            {t(
              'We need more data to estimate your fitness level. Consider adding heart rate data or a recent race time.',
              'Vi behöver mer data för att uppskatta din konditionsnivå. Överväg att lägga till pulsdata eller en nylig tävlingstid.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onContinue} className="w-full">
            {t('Continue to Dashboard', 'Fortsätt till Dashboard')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  const zoneWidth = getZoneWidth(fitnessEstimate)
  const isNarrowZone = zoneWidth < 17

  return (
    <div className="space-y-4">
      {/* Main Fitness Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t('Your Fitness Estimate', 'Din konditionsuppskattning')}
            </CardTitle>
            <Badge className={getConfidenceColor(fitnessEstimate.confidence)}>
              {t('Confidence', 'Säkerhet')}: {getConfidenceDisplayName(fitnessEstimate.confidence)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fitness Level */}
          <div className="text-center space-y-2">
            <Badge className={`text-lg px-4 py-2 ${getLevelColor(fitnessEstimate.level)}`}>
              {getFitnessLevelDisplayName(fitnessEstimate.level)}
            </Badge>
            {fitnessEstimate.estimatedVO2max && (
              <p className="text-sm text-muted-foreground">
                {t('Estimated VO2max', 'Uppskattad VO2max')}: ~{Math.round(fitnessEstimate.estimatedVO2max)} ml/kg/min
              </p>
            )}
          </div>

          {/* Zone Visualization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('Training Zone 2 Width', 'Zon 2-bredd')}</span>
              <span className="font-medium">{zoneWidth}% {t('of max HR', 'av maxpuls')}</span>
            </div>
            <div className="relative h-8 bg-muted rounded-full overflow-hidden">
              {/* Zone 1 */}
              <div
                className="absolute left-0 h-full bg-blue-200"
                style={{ width: `${fitnessEstimate.lt1PercentHRmax}%` }}
              />
              {/* Zone 2 */}
              <div
                className="absolute h-full bg-green-400"
                style={{
                  left: `${fitnessEstimate.lt1PercentHRmax}%`,
                  width: `${zoneWidth}%`,
                }}
              />
              {/* Zone 3+ */}
              <div
                className="absolute right-0 h-full bg-orange-300"
                style={{ width: `${100 - fitnessEstimate.lt2PercentHRmax}%` }}
              />
              {/* Labels */}
              <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-medium">
                <span className="text-blue-700">{t('Easy', 'Lätt')}</span>
                <span className="text-green-700">{t('Zone 2', 'Zon 2')}</span>
                <span className="text-orange-700">{t('Hard', 'Hårt')}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>{fitnessEstimate.lt1PercentHRmax}% (LT1)</span>
              <span>{fitnessEstimate.lt2PercentHRmax}% (LT2)</span>
              <span>100%</span>
            </div>
          </div>

          {/* Narrow Zone Warning */}
          {isNarrowZone && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-amber-800">
                      {t('Narrow Zone 2 Detected', 'Smal zon 2 upptäckt')}
                    </p>
                    <p className="text-sm text-amber-700">
                      {t(
                        'Your aerobic zone is relatively narrow. To stay in the right intensity during easy workouts, consider using walk/run intervals (e.g., 2 min running, 1 min walking).',
                        'Din aeroba zon är relativt smal. För att hålla rätt intensitet under lätta pass, överväg att använda gång/löp-intervaller (t.ex. 2 min löpning, 1 min gång).'
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Sources */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-medium mb-2">
              {t('Based on', 'Baserat på')}:
            </p>
            <div className="flex flex-wrap gap-2">
              {fitnessEstimate.source === 'RACE_TIME' && (
                <Badge variant="outline" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  {t('Race time', 'Tävlingstid')}
                </Badge>
              )}
              {fitnessEstimate.source === 'WATCH_ESTIMATE' && (
                <Badge variant="outline" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  {t('Watch VO2max', 'Klock-VO2max')}
                </Badge>
              )}
              {fitnessEstimate.source === 'RESTING_HR' && (
                <Badge variant="outline" className="text-xs">
                  <Heart className="h-3 w-3 mr-1" />
                  {t('Resting HR', 'Vilopuls')}
                </Badge>
              )}
              {fitnessEstimate.source === 'EXPERIENCE' && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('Experience level', 'Erfarenhetsnivå')}
                </Badge>
              )}
              {fitnessEstimate.source === 'COMBINED' && (
                <Badge variant="outline" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  {t('Multiple sources', 'Flera källor')}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Test Recommendation */}
      {fitnessEstimate.confidence !== 'HIGH' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              {t('Want more accurate zones?', 'Vill du ha mer exakta zoner?')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t(
                'A field test (like a 30-minute time trial or a lactate threshold test) provides much more accurate training zones. We recommend doing one within the first few weeks.',
                'Ett fälttest (som ett 30-minuters tempopass eller ett laktattröskeltest) ger mycket mer exakta träningszoner. Vi rekommenderar att göra ett inom de första veckorna.'
              )}
            </p>
            {onScheduleFieldTest && (
              <Button variant="outline" size="sm" onClick={onScheduleFieldTest}>
                <Target className="h-4 w-4 mr-2" />
                {t('Schedule Field Test', 'Boka fälttest')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <Button onClick={onContinue} className="w-full" size="lg">
        {t('Continue to Dashboard', 'Fortsätt till Dashboard')}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}
