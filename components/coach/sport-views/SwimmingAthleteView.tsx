'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Waves, Timer, Calendar, Target } from 'lucide-react'

interface SwimmingSettings {
  strokeTypes?: string[]
  primaryStroke?: string
  primaryDiscipline?: string
  preferredPoolLength?: string
  trainingEnvironments?: string[]
  currentCss?: number | null
  cssTestDate?: string | null
  weeklySwimDistance?: number
  weeklySwimSessions?: number
  equipment?: string[]
  hasHeartRateMonitor?: boolean
  openWaterExperience?: string
  swimmingExperience?: string
}

interface SwimmingAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
}

const STROKE_LABELS: Record<string, string> = {
  freestyle: 'Frisim',
  backstroke: 'Ryggsim',
  breaststroke: 'Bröstsim',
  butterfly: 'Fjärilsim',
  im: 'Medley',
}

const DISCIPLINE_LABELS: Record<string, string> = {
  sprint: 'Sprint (50-100m)',
  middle: 'Mellandistans (200-400m)',
  distance: 'Distans (800m+)',
  open_water: 'Öppet vatten',
  triathlon: 'Triathlon',
}

const POOL_LABELS: Record<string, string> = {
  '25m': '25m (kortbana)',
  '50m': '50m (långbana)',
  open: 'Öppet vatten',
}

const EQUIPMENT_LABELS: Record<string, string> = {
  paddles: 'Handpaddlar',
  fins: 'Fenor',
  pull_buoy: 'Pull buoy',
  kickboard: 'Platta',
  snorkel: 'Snorkel',
}

function formatCss(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('sv-SE')
  } catch {
    return '-'
  }
}

// CSS-based training zones (percentage of CSS)
function getCssZones(css: number) {
  return [
    { zone: 1, name: 'Återhämtning', pace: Math.round(css * 1.15), percent: '115%' },
    { zone: 2, name: 'Aerob uthållighet', pace: Math.round(css * 1.08), percent: '108%' },
    { zone: 3, name: 'Tempo', pace: Math.round(css * 1.02), percent: '102%' },
    { zone: 4, name: 'Tröskel (CSS)', pace: css, percent: '100%' },
    { zone: 5, name: 'VO2max', pace: Math.round(css * 0.95), percent: '95%' },
    { zone: 6, name: 'Sprint', pace: Math.round(css * 0.88), percent: '88%' },
  ]
}

export function SwimmingAthleteView({ clientId, clientName, settings }: SwimmingAthleteViewProps) {
  const swimmingSettings = settings as SwimmingSettings | undefined

  if (!swimmingSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🏊‍♂️</span> Simprofil
          </CardTitle>
          <CardDescription>Ingen simdata tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Atleten har inte angett siminställningar ännu.
          </p>
        </CardContent>
      </Card>
    )
  }

  const css = swimmingSettings.currentCss
  const cssZones = css ? getCssZones(css) : null

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>🏊‍♂️</span> Simning Dashboard
              </CardTitle>
              <CardDescription>Teknik och hastighetsdata</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {swimmingSettings.primaryStroke && (
                <Badge variant="default">
                  {STROKE_LABELS[swimmingSettings.primaryStroke] || swimmingSettings.primaryStroke}
                </Badge>
              )}
              {swimmingSettings.primaryDiscipline && (
                <Badge variant="secondary">
                  {DISCIPLINE_LABELS[swimmingSettings.primaryDiscipline] || swimmingSettings.primaryDiscipline}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Timer className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-xs text-muted-foreground">CSS</p>
              <p className="font-bold text-lg">
                {css ? `${formatCss(css)}/100m` : '-'}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Testad</p>
              <p className="font-bold text-sm">
                {formatDate(swimmingSettings.cssTestDate)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Waves className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
              <p className="text-xs text-muted-foreground">km/vecka</p>
              <p className="font-bold text-lg">{swimmingSettings.weeklySwimDistance || '-'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Target className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xs text-muted-foreground">Pass/vecka</p>
              <p className="font-bold text-lg">{swimmingSettings.weeklySwimSessions || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSS Zones */}
      {cssZones && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Träningszoner (CSS-baserade)</CardTitle>
            <CardDescription>Tempo per 100m baserat på CSS: {formatCss(css!)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {cssZones.map((zone) => (
                <div
                  key={zone.zone}
                  className={`p-2 rounded-lg text-center ${
                    zone.zone <= 2 ? 'bg-blue-50' :
                    zone.zone <= 4 ? 'bg-green-50' :
                    'bg-orange-50'
                  }`}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    Z{zone.zone}: {zone.name}
                  </p>
                  <p className="font-bold">{formatCss(zone.pace)}</p>
                  <p className="text-xs text-muted-foreground">{zone.percent}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strokes & Environment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Simtag</CardTitle>
          </CardHeader>
          <CardContent>
            {swimmingSettings.strokeTypes && swimmingSettings.strokeTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {swimmingSettings.strokeTypes.map((stroke) => (
                  <Badge
                    key={stroke}
                    variant={stroke === swimmingSettings.primaryStroke ? 'default' : 'secondary'}
                  >
                    {STROKE_LABELS[stroke] || stroke}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ej angivet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Träningsmiljö</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {swimmingSettings.preferredPoolLength && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bassäng</span>
                  <span className="font-medium">
                    {POOL_LABELS[swimmingSettings.preferredPoolLength] || swimmingSettings.preferredPoolLength}
                  </span>
                </div>
              )}
              {swimmingSettings.openWaterExperience && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Öppet vatten</span>
                  <Badge variant="outline" className="capitalize">
                    {swimmingSettings.openWaterExperience}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment */}
      {swimmingSettings.equipment && swimmingSettings.equipment.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Utrustning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {swimmingSettings.equipment.map((equip) => (
                <Badge key={equip} variant="outline">
                  {EQUIPMENT_LABELS[equip] || equip}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
