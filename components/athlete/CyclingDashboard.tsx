'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Zap, Gauge, TrendingUp, Clock, Target, Activity } from 'lucide-react'
import { calculatePowerZones, evaluateCyclingPower } from '@/lib/calculations/cycling'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface CyclingSettings {
  bikeTypes: string[]
  primaryDiscipline: string
  currentFtp: number | null
  ftpTestDate: string | null
  powerMeterType: string
  trainingPlatforms: string[]
  weeklyHours: number
  indoorOutdoorSplit: number
  hasHeartRateMonitor: boolean
  weight: number | null
}

interface CyclingDashboardProps {
  cyclingSettings: CyclingSettings | null
  experience: string | null
  clientName: string
}

const DISCIPLINE_LABELS: Record<string, string> = {
  endurance: 'Uthållighet / Gran Fondo',
  racing: 'Tävlingscykling',
  tt: 'Tempo',
  climbing: 'Klättring',
  crit: 'Criterium',
  triathlon: 'Triathlon',
  mtb_xc: 'MTB XC',
  mtb_enduro: 'MTB Enduro',
  gravel: 'Graveltävling',
  recreational: 'Motionscykling',
}

const BIKE_TYPE_ICONS: Record<string, string> = {
  road: '🚴',
  tt: '🚴‍♂️',
  mtb: '🚵',
  gravel: '🚲',
  indoor: '🏠',
}

export function CyclingDashboard({
  cyclingSettings,
  experience,
  clientName,
}: CyclingDashboardProps) {
  if (!cyclingSettings) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="py-8 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Slutför din cyklingsprofil för att se dina mätvärden.
          </p>
          <a href="/athlete/onboarding" className="text-primary underline mt-2 inline-block">
            Gå till onboarding
          </a>
        </CardContent>
      </Card>
    )
  }

  const { currentFtp, weight, ftpTestDate, primaryDiscipline, bikeTypes, weeklyHours, indoorOutdoorSplit } = cyclingSettings

  // Calculate W/kg if we have both FTP and weight
  const wattsPerKg = currentFtp && weight ? (currentFtp / weight) : null

  // Get power zones if we have FTP
  const powerZones = currentFtp ? calculatePowerZones(currentFtp) : null

  // Get evaluation if we have W/kg
  const evaluation = wattsPerKg
    ? evaluateCyclingPower(wattsPerKg, 30, 'MALE') // Default age/gender for now
    : null

  // Parse FTP test date
  const ftpDate = ftpTestDate ? new Date(ftpTestDate) : null
  const daysSinceFtpTest = ftpDate
    ? Math.floor((Date.now() - ftpDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* FTP Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-yellow-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">FTP</p>
                <p className="text-3xl font-bold mt-1">
                  {currentFtp ? `${currentFtp}W` : '—'}
                </p>
                {ftpDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Testad {format(ftpDate, 'd MMM yyyy', { locale: sv })}
                  </p>
                )}
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        {/* W/kg Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Watt/kg</p>
                <p className="text-3xl font-bold mt-1">
                  {wattsPerKg ? wattsPerKg.toFixed(2) : '—'}
                </p>
                {weight && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {weight} kg kroppsvikt
                  </p>
                )}
              </div>
              <Gauge className="h-8 w-8 text-blue-500" />
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
                  {indoorOutdoorSplit}% inomhus
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Discipline */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Disciplin</p>
                <p className="text-lg font-semibold mt-1">
                  {DISCIPLINE_LABELS[primaryDiscipline] || primaryDiscipline || '—'}
                </p>
                <div className="flex gap-1 mt-2">
                  {bikeTypes.slice(0, 3).map((bike) => (
                    <span key={bike} className="text-xl" title={bike}>
                      {BIKE_TYPE_ICONS[bike] || '🚲'}
                    </span>
                  ))}
                </div>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Power Zones */}
      {powerZones && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Dina träningszoner
            </CardTitle>
            <CardDescription>
              Baserat på din FTP på {currentFtp}W
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {powerZones.map((zone) => {
                const zoneColors: Record<number, string> = {
                  1: 'bg-gray-400',
                  2: 'bg-blue-400',
                  3: 'bg-green-400',
                  4: 'bg-yellow-400',
                  5: 'bg-orange-400',
                  6: 'bg-red-400',
                  7: 'bg-purple-500',
                }
                const widthPercent = Math.min((zone.percentMax / 200) * 100, 100)

                return (
                  <div key={zone.zone} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        Z{zone.zone} - {zone.name}
                      </span>
                      <span className="text-muted-foreground">
                        {zone.powerMin}–{zone.powerMax}W
                      </span>
                    </div>
                    <div className="h-6 w-full bg-muted rounded-full overflow-hidden relative">
                      <div
                        className={`h-full ${zoneColors[zone.zone]} transition-all`}
                        style={{ width: `${widthPercent}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {zone.percentMin}–{zone.percentMax}% FTP
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
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-base px-4 py-2">
                {evaluation}
              </Badge>
              {daysSinceFtpTest !== null && daysSinceFtpTest > 42 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  FTP-test rekommenderas (senast för {daysSinceFtpTest} dagar sedan)
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FTP Test Reminder */}
      {!currentFtp && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <Zap className="h-6 w-6 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Ingen FTP registrerad
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                  Genomför ett FTP-test för att få personliga träningszoner och bättre
                  anpassade träningsprogram. Du kan använda ett 20-minuters eller 8-minuters
                  testprotokoll.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
