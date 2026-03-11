'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Timer, Gauge, TrendingUp, Clock, Target, Activity, Snowflake, Mountain } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import { useBasePath } from '@/lib/contexts/BasePathContext'

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
  const basePath = useBasePath()
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  // Days since test & snow season (computed client-side to avoid SSR/client timezone mismatch)
  const [daysSinceTest, setDaysSinceTest] = useState<number | null>(null)
  const [isSnowSeason, setIsSnowSeason] = useState(false)
  useEffect(() => {
    const testDate = skiingSettings?.thresholdTestDate
    if (testDate) {
      setDaysSinceTest(Math.floor((Date.now() - new Date(testDate).getTime()) / (1000 * 60 * 60 * 24)))
    }
    const currentMonth = new Date().getMonth()
    setIsSnowSeason(currentMonth >= 10 || currentMonth <= 3)
  }, [skiingSettings?.thresholdTestDate])

  if (!skiingSettings) {
    return (
      <Card
        className="border-dashed border-2"
        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundCard }}
      >
        <CardContent className="py-8 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4" style={{ color: theme.colors.textMuted }} />
          <p style={{ color: theme.colors.textMuted }}>
            Slutför din skidprofil för att se dina mätvärden.
          </p>
          <Link href={`${basePath}/athlete/onboarding`} className="underline mt-2 inline-block" style={{ color: theme.colors.accent }}>
            Gå till onboarding
          </Link>
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

  // Calculate training methods display
  const hasRollerSki = trainingMethods?.includes('roller_ski')
  const hasOnSnow = trainingMethods?.includes('on_snow')

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Threshold Pace Card */}
        <Card className="relative overflow-hidden" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>Tröskeltempo</p>
                <p className="text-3xl font-bold mt-1" style={{ color: theme.colors.textPrimary }}>
                  {currentThresholdPace ? formatPace(currentThresholdPace) : '—'}
                </p>
                <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>min/km</p>
                {testDate && (
                  <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                    Testad {format(testDate, 'd MMM yyyy', { locale: sv })}
                  </p>
                )}
              </div>
              <Timer className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Technique Card */}
        <Card className="relative overflow-hidden" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>Teknik</p>
                <p className="text-2xl font-bold mt-1">
                  {TECHNIQUE_LABELS[technique]?.icon || '⛷️'}
                </p>
                <p className="text-sm font-medium mt-1" style={{ color: theme.colors.textPrimary }}>
                  {TECHNIQUE_LABELS[technique]?.label || technique || '—'}
                </p>
              </div>
              <Mountain className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Training */}
        <Card className="relative overflow-hidden" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>Veckoträning</p>
                <p className="text-3xl font-bold mt-1" style={{ color: theme.colors.textPrimary }}>
                  {weeklyHours}h
                </p>
                <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                  {hasRollerSki && hasOnSnow ? 'Snö + Rullskidor' : hasOnSnow ? 'Snöträning' : hasRollerSki ? 'Rullskidor' : 'Blandad träning'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Snow Access */}
        <Card className="relative overflow-hidden" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>Snötillgång</p>
                <p className="text-3xl font-bold mt-1" style={{ color: theme.colors.textPrimary }}>
                  {onSnowAccessMonths} mån
                </p>
                <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
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
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>Primär disciplin</p>
                <p className="text-lg font-semibold mt-1" style={{ color: theme.colors.textPrimary }}>
                  {DISCIPLINE_LABELS[primaryDiscipline] || primaryDiscipline || '—'}
                </p>
              </div>
              <Target className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>Terrängpreferens</p>
                <p className="text-lg font-semibold mt-1" style={{ color: theme.colors.textPrimary }}>
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
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-5 w-5" />
              Dina tempoznoner
            </CardTitle>
            <CardDescription style={{ color: theme.colors.textMuted }}>
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
                      <span className="font-medium" style={{ color: theme.colors.textPrimary }}>
                        Z{zone.zone} - {zone.name}
                      </span>
                      <span className="font-mono" style={{ color: theme.colors.textMuted }}>
                        {formatPace(zone.paceMax)}–{formatPace(zone.paceMin)} min/km
                      </span>
                    </div>
                    <div className="h-6 w-full rounded-full overflow-hidden relative" style={{ backgroundColor: theme.colors.border }}>
                      <div
                        className={`h-full ${zoneColors[zone.zone]} transition-all`}
                        style={{ width: `${widthPercent}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium" style={{ color: theme.colors.textPrimary }}>
                        {zone.percentMin}–{zone.percentMax}% av tröskel
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: theme.colors.textMuted }}>{zone.description}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evaluation & Status */}
      {evaluation && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle style={{ color: theme.colors.textPrimary }}>Din nivå</CardTitle>
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
        <Card
          style={{
            backgroundColor: theme.id === 'FITAPP_DARK' ? '#422006' : '#fffbeb',
            borderColor: theme.id === 'FITAPP_DARK' ? '#92400e' : '#fde68a',
          }}
        >
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <Timer className="h-6 w-6 text-amber-500 mt-0.5" />
              <div>
                <p
                  className="font-medium"
                  style={{ color: theme.id === 'FITAPP_DARK' ? '#fde68a' : '#78350f' }}
                >
                  Inget tröskeltempo registrerat
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: theme.id === 'FITAPP_DARK' ? '#fcd34d' : '#92400e' }}
                >
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
      <Card
        style={{
          backgroundColor: isSnowSeason
            ? (theme.id === 'FITAPP_DARK' ? '#172554' : '#eff6ff')
            : (theme.id === 'FITAPP_DARK' ? '#431407' : '#fff7ed'),
          borderColor: isSnowSeason
            ? (theme.id === 'FITAPP_DARK' ? '#1e40af' : '#bfdbfe')
            : (theme.id === 'FITAPP_DARK' ? '#9a3412' : '#fdba74'),
        }}
      >
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            {isSnowSeason ? (
              <Snowflake className="h-6 w-6 text-blue-500 mt-0.5" />
            ) : (
              <Activity className="h-6 w-6 text-orange-500 mt-0.5" />
            )}
            <div>
              <p
                className="font-medium"
                style={{
                  color: isSnowSeason
                    ? (theme.id === 'FITAPP_DARK' ? '#93c5fd' : '#1e3a8a')
                    : (theme.id === 'FITAPP_DARK' ? '#fed7aa' : '#9a3412')
                }}
              >
                {isSnowSeason ? 'Skidsäsong' : 'Förberedelsesäsong'}
              </p>
              <p
                className="text-sm mt-1"
                style={{
                  color: isSnowSeason
                    ? (theme.id === 'FITAPP_DARK' ? '#bfdbfe' : '#1e40af')
                    : (theme.id === 'FITAPP_DARK' ? '#fdba74' : '#c2410c')
                }}
              >
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
