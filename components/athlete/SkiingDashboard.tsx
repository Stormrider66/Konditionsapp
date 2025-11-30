'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Timer, Gauge, TrendingUp, Clock, Target, Activity, Snowflake, Mountain } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface SkiingSettings {
  technique: string
  primaryDiscipline: string
  terrainPreference: string
  trainingMethods: string[]
  currentThresholdPace: number | null // min/km
  thresholdTestDate: string | null
  weeklyHours: number
  onSnowAccessMonths: number
  hasHeartRateMonitor: boolean
  hasPoleStraps: boolean
  weight: number | null
  targetRaces: string[]
}

interface SkiingDashboardProps {
  skiingSettings: SkiingSettings | null
  experience: string | null
  clientName: string
}

const TECHNIQUE_LABELS: Record<string, { label: string, icon: string }> = {
  classic: { label: 'Klassisk', icon: '⛷️' },
  skating: { label: 'Skate', icon: '🎿' },
  both: { label: 'Båda teknikerna', icon: '⛷️🎿' },
}

const DISCIPLINE_LABELS: Record<string, string> = {
  distance: 'Distans / Maraton',
  sprint: 'Sprint',
  skiathlon: 'Skiathlon',
  biathlon: 'Skidskytte',
  recreational: 'Motionsskidåkning',
  touring: 'Skidturism',
  orienteering: 'Skidorientering',
}

const TERRAIN_LABELS: Record<string, string> = {
  flat: 'Platt terräng',
  hilly: 'Kuperad terräng',
  mountainous: 'Fjällterräng',
  mixed: 'Blandad terräng',
}

interface PaceZone {
  zone: number
  name: string
  paceMin: number // min/km
  paceMax: number // min/km
  percentMin: number
  percentMax: number
  description: string
}

/**
 * Calculate skiing pace zones from threshold pace
 * Zone structure based on lactate-guided training zones
 */
function calculateSkiingPaceZones(thresholdPace: number): PaceZone[] {
  // Threshold pace is approximately Zone 4 (lactate threshold)
  // Zones are calculated as multipliers of threshold pace
  // Higher pace = slower (more min/km), lower = faster
  return [
    {
      zone: 1,
      name: 'Återhämtning',
      paceMin: Number((thresholdPace * 1.30).toFixed(2)),
      paceMax: Number((thresholdPace * 1.50).toFixed(2)),
      percentMin: 67,
      percentMax: 77,
      description: 'Lätt tempo för återhämtning och uppvärmning'
    },
    {
      zone: 2,
      name: 'Grunduthållighet',
      paceMin: Number((thresholdPace * 1.15).toFixed(2)),
      paceMax: Number((thresholdPace * 1.30).toFixed(2)),
      percentMin: 77,
      percentMax: 87,
      description: 'Aerob basträning, distansträning'
    },
    {
      zone: 3,
      name: 'Tempo',
      paceMin: Number((thresholdPace * 1.05).toFixed(2)),
      paceMax: Number((thresholdPace * 1.15).toFixed(2)),
      percentMin: 87,
      percentMax: 95,
      description: 'Tempointervaller, uthållighetsträning'
    },
    {
      zone: 4,
      name: 'Tröskel',
      paceMin: Number((thresholdPace * 0.95).toFixed(2)),
      paceMax: Number((thresholdPace * 1.05).toFixed(2)),
      percentMin: 95,
      percentMax: 105,
      description: 'Tröskeltempo, tävlingsfart på längre distanser'
    },
    {
      zone: 5,
      name: 'VO2max',
      paceMin: Number((thresholdPace * 0.85).toFixed(2)),
      paceMax: Number((thresholdPace * 0.95).toFixed(2)),
      percentMin: 105,
      percentMax: 118,
      description: 'Hög intensitet, korta intervaller'
    },
  ]
}

/**
 * Format pace as mm:ss
 */
function formatPace(paceMinPerKm: number): string {
  const minutes = Math.floor(paceMinPerKm)
  const seconds = Math.round((paceMinPerKm - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Evaluate skiing level based on threshold pace
 * Values based on cross-country skiing performance standards
 */
function evaluateSkiingLevel(thresholdPace: number, technique: string): string {
  // Classic technique is generally slower than skating
  const isClassic = technique === 'classic'
  const adjustedPace = isClassic ? thresholdPace * 0.9 : thresholdPace // Normalize for comparison

  if (adjustedPace < 3.0) return 'Elite'
  if (adjustedPace < 3.5) return 'Mycket hög nivå'
  if (adjustedPace < 4.0) return 'Hög nivå'
  if (adjustedPace < 4.5) return 'God nivå'
  if (adjustedPace < 5.5) return 'Medel'
  return 'Nybörjare/Motionär'
}

export function SkiingDashboard({
  skiingSettings,
  experience,
  clientName,
}: SkiingDashboardProps) {
  if (!skiingSettings) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="py-8 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Slutför din skidprofil för att se dina mätvärden.
          </p>
          <a href="/athlete/onboarding" className="text-primary underline mt-2 inline-block">
            Gå till onboarding
          </a>
        </CardContent>
      </Card>
    )
  }

  const {
    currentThresholdPace,
    weight,
    thresholdTestDate,
    primaryDiscipline,
    technique,
    terrainPreference,
    weeklyHours,
    onSnowAccessMonths,
    trainingMethods
  } = skiingSettings

  // Get pace zones if we have threshold pace
  const paceZones = currentThresholdPace ? calculateSkiingPaceZones(currentThresholdPace) : null

  // Get evaluation if we have threshold pace
  const evaluation = currentThresholdPace && technique
    ? evaluateSkiingLevel(currentThresholdPace, technique)
    : null

  // Parse threshold test date
  const testDate = thresholdTestDate ? new Date(thresholdTestDate) : null
  const daysSinceTest = testDate
    ? Math.floor((Date.now() - testDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Check if currently in snow season (roughly Nov-Apr in Scandinavia)
  const currentMonth = new Date().getMonth()
  const isSnowSeason = currentMonth >= 10 || currentMonth <= 3

  // Calculate training methods display
  const hasRollerSki = trainingMethods?.includes('roller_ski')
  const hasOnSnow = trainingMethods?.includes('on_snow')

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Threshold Pace Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Tröskeltempo</p>
                <p className="text-3xl font-bold mt-1">
                  {currentThresholdPace ? formatPace(currentThresholdPace) : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">min/km</p>
                {testDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Testad {format(testDate, 'd MMM yyyy', { locale: sv })}
                  </p>
                )}
              </div>
              <Timer className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Technique Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Teknik</p>
                <p className="text-2xl font-bold mt-1">
                  {TECHNIQUE_LABELS[technique]?.icon || '⛷️'}
                </p>
                <p className="text-sm font-medium mt-1">
                  {TECHNIQUE_LABELS[technique]?.label || technique || '—'}
                </p>
              </div>
              <Mountain className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Training */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Veckoträning</p>
                <p className="text-3xl font-bold mt-1">
                  {weeklyHours}h
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasRollerSki && hasOnSnow ? 'Snö + Rullskidor' : hasOnSnow ? 'Snöträning' : hasRollerSki ? 'Rullskidor' : 'Blandad träning'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Snow Access */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Snötillgång</p>
                <p className="text-3xl font-bold mt-1">
                  {onSnowAccessMonths} mån
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isSnowSeason ? '❄️ Säsong nu' : '☀️ Utanför säsong'}
                </p>
              </div>
              <Snowflake className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discipline & Terrain */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Primär disciplin</p>
                <p className="text-lg font-semibold mt-1">
                  {DISCIPLINE_LABELS[primaryDiscipline] || primaryDiscipline || '—'}
                </p>
              </div>
              <Target className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Terrängpreferens</p>
                <p className="text-lg font-semibold mt-1">
                  {TERRAIN_LABELS[terrainPreference] || terrainPreference || '—'}
                </p>
              </div>
              <Gauge className="h-6 w-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pace Zones */}
      {paceZones && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Dina tempoznoner
            </CardTitle>
            <CardDescription>
              Baserat på ditt tröskeltempo på {formatPace(currentThresholdPace!)} min/km
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paceZones.map((zone) => {
                const zoneColors: Record<number, string> = {
                  1: 'bg-gray-400',
                  2: 'bg-blue-400',
                  3: 'bg-green-400',
                  4: 'bg-yellow-400',
                  5: 'bg-red-500',
                }
                // Width based on zone number for visual representation
                const widthPercent = 50 + (zone.zone * 10)

                return (
                  <div key={zone.zone} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        Z{zone.zone} - {zone.name}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {formatPace(zone.paceMax)}–{formatPace(zone.paceMin)} min/km
                      </span>
                    </div>
                    <div className="h-6 w-full bg-muted rounded-full overflow-hidden relative">
                      <div
                        className={`h-full ${zoneColors[zone.zone]} transition-all`}
                        style={{ width: `${widthPercent}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {zone.percentMin}–{zone.percentMax}% av tröskel
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{zone.description}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evaluation & Status */}
      {evaluation && (
        <Card>
          <CardHeader>
            <CardTitle>Din nivå</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="secondary" className="text-base px-4 py-2">
                {evaluation}
              </Badge>
              {daysSinceTest !== null && daysSinceTest > 56 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Tröskeltest rekommenderas (senast för {daysSinceTest} dagar sedan)
                </Badge>
              )}
              {weight && (
                <Badge variant="outline">
                  {weight} kg
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Threshold Test Reminder */}
      {!currentThresholdPace && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <Timer className="h-6 w-6 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Inget tröskeltempo registrerat
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                  Genomför ett tröskeltest för att få personliga tempoznoner och bättre
                  anpassade träningsprogram. Du kan använda ett 30-minuters maxtest på
                  rullskidor eller skidor.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Season Training Tips */}
      <Card className={isSnowSeason ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' : 'border-orange-200 bg-orange-50 dark:bg-orange-950/20'}>
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            {isSnowSeason ? (
              <Snowflake className="h-6 w-6 text-blue-500 mt-0.5" />
            ) : (
              <Activity className="h-6 w-6 text-orange-500 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${isSnowSeason ? 'text-blue-900 dark:text-blue-100' : 'text-orange-900 dark:text-orange-100'}`}>
                {isSnowSeason ? 'Skidsäsong' : 'Förberedelsesäsong'}
              </p>
              <p className={`text-sm mt-1 ${isSnowSeason ? 'text-blue-700 dark:text-blue-200' : 'text-orange-700 dark:text-orange-200'}`}>
                {isSnowSeason
                  ? 'Fokusera på teknik och tävlingsförberedelser. Prioritera snöträning när möjligt.'
                  : 'Bygg aerob bas med rullskidor, löpning och styrketräning. Perfekt tid för grundutbyggnad.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
