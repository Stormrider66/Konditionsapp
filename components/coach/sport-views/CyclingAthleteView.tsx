'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Zap, Scale, Calendar, Bike, TrendingUp, Activity } from 'lucide-react'

interface CyclingSettings {
  bikeTypes?: string[]
  primaryDiscipline?: string
  currentFtp?: number | null
  ftpTestDate?: string | null
  powerMeterType?: string
  trainingPlatforms?: string[]
  weeklyHours?: number
  indoorOutdoorSplit?: number
  hasHeartRateMonitor?: boolean
  weight?: number | null
}

interface CyclingAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
}

const DISCIPLINE_LABELS: Record<string, string> = {
  road: 'Landsvägscykling',
  gravel: 'Gravel',
  mtb: 'Mountainbike',
  triathlon: 'Triathlon',
  track: 'Bana',
  cx: 'Cyclocross',
  indoor: 'Inomhus/Zwift',
}

const BIKE_LABELS: Record<string, string> = {
  road: 'Landsvägscykel',
  gravel: 'Gravelcykel',
  mtb: 'MTB',
  tt: 'Tempcykel',
  indoor: 'Smart Trainer',
  hybrid: 'Hybridcykel',
}

// FTP zones based on percentage of FTP
const FTP_ZONES = [
  { zone: 1, name: 'Återhämtning', min: 0, max: 55, color: 'bg-gray-200' },
  { zone: 2, name: 'Uthållighet', min: 56, max: 75, color: 'bg-blue-200' },
  { zone: 3, name: 'Tempo', min: 76, max: 90, color: 'bg-green-200' },
  { zone: 4, name: 'Tröskel', min: 91, max: 105, color: 'bg-yellow-200' },
  { zone: 5, name: 'VO2max', min: 106, max: 120, color: 'bg-orange-200' },
  { zone: 6, name: 'Anaerob', min: 121, max: 150, color: 'bg-red-200' },
]

function getFtpCategory(ftp: number, weight: number | null): { category: string; color: string } {
  const wpkg = weight ? ftp / weight : 0
  if (wpkg >= 5.0) return { category: 'World Class', color: 'text-purple-600' }
  if (wpkg >= 4.5) return { category: 'Exceptionell', color: 'text-indigo-600' }
  if (wpkg >= 4.0) return { category: 'Utmärkt', color: 'text-blue-600' }
  if (wpkg >= 3.5) return { category: 'Mycket Bra', color: 'text-green-600' }
  if (wpkg >= 3.0) return { category: 'Bra', color: 'text-yellow-600' }
  if (wpkg >= 2.5) return { category: 'Medel', color: 'text-orange-600' }
  return { category: 'Nybörjare', color: 'text-gray-600' }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('sv-SE')
  } catch {
    return '-'
  }
}

export function CyclingAthleteView({ clientId, clientName, settings }: CyclingAthleteViewProps) {
  const cyclingSettings = settings as CyclingSettings | undefined

  if (!cyclingSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🚴</span> Cykling Profil
          </CardTitle>
          <CardDescription>Ingen cykeldata tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Atleten har inte angett cykelinställningar ännu.
          </p>
        </CardContent>
      </Card>
    )
  }

  const ftp = cyclingSettings.currentFtp
  const weight = cyclingSettings.weight
  const wpkg = ftp && weight ? (ftp / weight).toFixed(2) : null
  const ftpCategory = ftp && weight ? getFtpCategory(ftp, weight) : null

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>🚴</span> Cykling Dashboard
              </CardTitle>
              <CardDescription>Effektdata och prestanda</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {cyclingSettings.primaryDiscipline && (
                <Badge variant="outline">
                  {DISCIPLINE_LABELS[cyclingSettings.primaryDiscipline] || cyclingSettings.primaryDiscipline}
                </Badge>
              )}
              {cyclingSettings.powerMeterType && cyclingSettings.powerMeterType !== 'none' && (
                <Badge variant="secondary">Effektmätare</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Zap className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-xs text-muted-foreground">FTP</p>
              <p className="font-bold text-lg">{ftp ? `${ftp}W` : '-'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Scale className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-xs text-muted-foreground">W/kg</p>
              <p className="font-bold text-lg">{wpkg || '-'}</p>
              {ftpCategory && (
                <p className={`text-xs ${ftpCategory.color}`}>{ftpCategory.category}</p>
              )}
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">FTP Test</p>
              <p className="font-bold text-sm">
                {formatDate(cyclingSettings.ftpTestDate)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Activity className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xs text-muted-foreground">Tim/vecka</p>
              <p className="font-bold text-lg">{cyclingSettings.weeklyHours || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Power Zones */}
      {ftp && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Effektzoner</CardTitle>
            <CardDescription>Baserat på FTP: {ftp}W</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {FTP_ZONES.map((zone) => {
                const minWatts = Math.round(ftp * (zone.min / 100))
                const maxWatts = Math.round(ftp * (zone.max / 100))
                return (
                  <div key={zone.zone} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${zone.color} flex items-center justify-center font-bold text-sm`}>
                      {zone.zone}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{zone.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {minWatts} - {maxWatts}W
                        </span>
                      </div>
                      <Progress
                        value={zone.max - zone.min}
                        className={`h-2 ${zone.color}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment & Training */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bikes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bike className="h-4 w-4" />
              Utrustning
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cyclingSettings.bikeTypes && cyclingSettings.bikeTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cyclingSettings.bikeTypes.map((bike) => (
                  <Badge key={bike} variant="outline">
                    {BIKE_LABELS[bike] || bike}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen utrustning angiven</p>
            )}
            {cyclingSettings.powerMeterType && (
              <p className="text-sm text-muted-foreground mt-2">
                Effektmätare: {cyclingSettings.powerMeterType}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Training Split */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Träningsfördelning
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cyclingSettings.indoorOutdoorSplit !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Inomhus</span>
                  <span>{cyclingSettings.indoorOutdoorSplit}%</span>
                </div>
                <Progress value={cyclingSettings.indoorOutdoorSplit} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>Utomhus</span>
                  <span>{100 - cyclingSettings.indoorOutdoorSplit}%</span>
                </div>
              </div>
            )}
            {cyclingSettings.trainingPlatforms && cyclingSettings.trainingPlatforms.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Plattformar</p>
                <div className="flex flex-wrap gap-1">
                  {cyclingSettings.trainingPlatforms.map((platform) => (
                    <Badge key={platform} variant="secondary" className="text-xs">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
