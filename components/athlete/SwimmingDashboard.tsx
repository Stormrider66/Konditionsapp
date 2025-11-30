'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Waves, Timer, Target, TrendingUp, Droplets, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface SwimmingDashboardProps {
  swimmingSettings: SwimmingSettings | null | undefined
  experience: string | null
  clientName: string
}

interface SwimZone {
  zone: number
  name: string
  paceMin: number // seconds per 100m
  paceMax: number // seconds per 100m
  percentMin: number
  percentMax: number
  description: string
  color: string
}

// Format pace as mm:ss per 100m
function formatPace(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Calculate swimming pace zones based on CSS
function calculateSwimmingPaceZones(css: number): SwimZone[] {
  return [
    {
      zone: 1,
      name: 'Återhämtning',
      paceMin: Math.round(css * 1.20),
      paceMax: Math.round(css * 1.35),
      percentMin: 74,
      percentMax: 83,
      description: 'Lätt simning för återhämtning och uppvärmning',
      color: 'bg-blue-100 text-blue-800',
    },
    {
      zone: 2,
      name: 'Uthållighet',
      paceMin: Math.round(css * 1.08),
      paceMax: Math.round(css * 1.20),
      percentMin: 83,
      percentMax: 93,
      description: 'Aerob basträning, längre intervaller',
      color: 'bg-green-100 text-green-800',
    },
    {
      zone: 3,
      name: 'Tröskel (CSS)',
      paceMin: Math.round(css * 0.98),
      paceMax: Math.round(css * 1.08),
      percentMin: 93,
      percentMax: 102,
      description: 'CSS-tempo, tävlingsfart på längre distanser',
      color: 'bg-yellow-100 text-yellow-800',
    },
    {
      zone: 4,
      name: 'VO2max',
      paceMin: Math.round(css * 0.90),
      paceMax: Math.round(css * 0.98),
      percentMin: 102,
      percentMax: 111,
      description: 'Hög intensitet, medellånga intervaller (200-400m)',
      color: 'bg-orange-100 text-orange-800',
    },
    {
      zone: 5,
      name: 'Sprint',
      paceMin: Math.round(css * 0.82),
      paceMax: Math.round(css * 0.90),
      percentMin: 111,
      percentMax: 122,
      description: 'Maximal intensitet, korta intervaller (25-100m)',
      color: 'bg-red-100 text-red-800',
    },
  ]
}

// Get stroke name in Swedish
function getStrokeName(stroke: string): string {
  const names: Record<string, string> = {
    freestyle: 'Frisim',
    backstroke: 'Ryggsim',
    breaststroke: 'Bröstsim',
    butterfly: 'Fjärilsim',
    im: 'Medley',
  }
  return names[stroke] || stroke
}

// Get discipline name in Swedish
function getDisciplineName(discipline: string): string {
  const names: Record<string, string> = {
    pool_distance: 'Pool Distans',
    pool_sprint: 'Pool Sprint',
    open_water: 'Öppet vatten',
    triathlon: 'Triathlon',
    masters: 'Mastersim',
    recreational: 'Motionssim',
  }
  return names[discipline] || discipline
}

// Get experience level display
function getExperienceLevel(exp: string): { label: string; color: string } {
  const levels: Record<string, { label: string; color: string }> = {
    beginner: { label: 'Nybörjare', color: 'bg-blue-100 text-blue-800' },
    intermediate: { label: 'Medel', color: 'bg-green-100 text-green-800' },
    advanced: { label: 'Avancerad', color: 'bg-yellow-100 text-yellow-800' },
    elite: { label: 'Elit', color: 'bg-purple-100 text-purple-800' },
  }
  return levels[exp] || { label: exp, color: 'bg-gray-100 text-gray-800' }
}

// Get training tips based on discipline and experience
function getTrainingTips(discipline: string, experience: string): string[] {
  const tips: string[] = []

  if (discipline === 'triathlon') {
    tips.push('Fokusera på CSS-intervaller för effektivitet')
    tips.push('Träna simdragning med pull buoy regelbundet')
    tips.push('Öva våtdräktssimning före tävling')
    tips.push('Inkludera open water-pass om möjligt')
  } else if (discipline === 'pool_distance') {
    tips.push('Bygg aerob bas med längre lågintensiva pass')
    tips.push('Inkludera CSS-set för att höja tröskeln')
    tips.push('Arbeta med simteknik och effektivitet')
  } else if (discipline === 'pool_sprint') {
    tips.push('Fokusera på teknik vid låg hastighet')
    tips.push('Inkludera sprintset med full återhämtning')
    tips.push('Träna starts och vändningar')
  } else if (discipline === 'open_water') {
    tips.push('Träna navigation och siktning')
    tips.push('Öva massstart och positionering')
    tips.push('Bygg uthållighet med långa, kontinuerliga pass')
  } else {
    tips.push('Variera simsätten för allsidig träning')
    tips.push('Fokusera på teknik framför hastighet')
    tips.push('Inkludera återhämtningspass mellan hårda pass')
  }

  if (experience === 'beginner') {
    tips.push('Prioritera simteknik över volym')
    tips.push('Börja med kortare intervaller och bygg upp')
  } else if (experience === 'elite') {
    tips.push('Periodisera träningen mot huvudtävlingar')
    tips.push('Använd videanalys för teknikförbättring')
  }

  return tips.slice(0, 4)
}

export function SwimmingDashboard({
  swimmingSettings,
  experience,
  clientName,
}: SwimmingDashboardProps) {
  const settings = swimmingSettings || {}
  const css = settings.currentCss
  const paceZones = css ? calculateSwimmingPaceZones(css) : []

  const primaryStroke = settings.primaryStroke || 'freestyle'
  const primaryDiscipline = settings.primaryDiscipline || 'recreational'
  const poolLength = settings.preferredPoolLength || '25'
  const swimExperience = settings.swimmingExperience || experience || 'intermediate'

  const trainingTips = getTrainingTips(primaryDiscipline, swimExperience)
  const expLevel = getExperienceLevel(swimExperience)

  return (
    <div className="space-y-6">
      {/* Header with CSS and Key Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* CSS Card */}
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4 text-cyan-500" />
              CSS (Tröskel)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {css ? (
              <div>
                <p className="text-2xl font-bold text-cyan-600">
                  {formatPace(css)}<span className="text-sm font-normal text-muted-foreground ml-1">/100m</span>
                </p>
                {settings.cssTestDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Testad: {new Date(settings.cssTestDate).toLocaleDateString('sv-SE')}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-lg text-muted-foreground">Ej angiven</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gör ett CSS-test för att få träningszoner
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Primary Stroke */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Waves className="h-4 w-4 text-blue-500" />
              Huvudsimsätt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{getStrokeName(primaryStroke)}</p>
            {settings.strokeTypes && settings.strokeTypes.length > 1 && (
              <p className="text-xs text-muted-foreground">
                +{settings.strokeTypes.length - 1} andra
              </p>
            )}
          </CardContent>
        </Card>

        {/* Discipline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Fokus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{getDisciplineName(primaryDiscipline)}</p>
            <p className="text-xs text-muted-foreground">{poolLength}m bassäng</p>
          </CardContent>
        </Card>

        {/* Experience */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Nivå
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={cn('text-sm', expLevel.color)}>{expLevel.label}</Badge>
            {settings.weeklySwimSessions && (
              <p className="text-xs text-muted-foreground mt-1">
                {settings.weeklySwimSessions} pass/vecka
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pace Zones */}
      {css && paceZones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-cyan-500" />
              Simzoner
            </CardTitle>
            <CardDescription>
              Baserade på din CSS ({formatPace(css)}/100m)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paceZones.map((zone) => (
                <div key={zone.zone} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={cn('w-8 h-6 flex items-center justify-center', zone.color)}>
                        Z{zone.zone}
                      </Badge>
                      <span className="font-medium text-sm">{zone.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm">
                        {formatPace(zone.paceMax)} - {formatPace(zone.paceMin)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({zone.percentMin}-{zone.percentMax}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={(zone.percentMax - 70) * 2}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">{zone.description}</p>
                </div>
              ))}
            </div>

            {/* Estimated Race Paces */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium text-sm mb-3">Beräknade tävlingstempo</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-2 bg-muted rounded">
                  <span className="text-muted-foreground">400m:</span>
                  <span className="ml-2 font-mono">{formatPace(Math.round(css * 1.02))}</span>
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="text-muted-foreground">800m:</span>
                  <span className="ml-2 font-mono">{formatPace(Math.round(css * 1.05))}</span>
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="text-muted-foreground">1500m:</span>
                  <span className="ml-2 font-mono">{formatPace(Math.round(css * 1.08))}</span>
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="text-muted-foreground">3000m+:</span>
                  <span className="ml-2 font-mono">{formatPace(Math.round(css * 1.12))}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Träningstips för {getDisciplineName(primaryDiscipline)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {trainingTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-cyan-500 mt-0.5">
                  <Waves className="h-4 w-4" />
                </span>
                {tip}
              </li>
            ))}
          </ul>

          {/* CSS Test Reminder */}
          {(!css || (settings.cssTestDate && daysSince(settings.cssTestDate) > 60)) && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                {!css
                  ? 'Gör ett CSS-test för att få personliga träningszoner. Ett enkelt test: simma 400m + vila 10 min + simma 200m på tid.'
                  : 'Din CSS är över 2 månader gammal. Överväg att göra ett nytt test för att uppdatera dina zoner.'}
              </p>
            </div>
          )}

          {/* Equipment Tips */}
          {settings.equipment && settings.equipment.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium text-sm mb-2">Din utrustning</h4>
              <div className="flex flex-wrap gap-2">
                {settings.equipment.map((equip) => (
                  <Badge key={equip} variant="outline" className="text-xs">
                    {getEquipmentName(equip)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper to get equipment name in Swedish
function getEquipmentName(equip: string): string {
  const names: Record<string, string> = {
    pull_buoy: 'Pull buoy',
    paddles: 'Paddlar',
    fins: 'Fenor',
    snorkel: 'Snorkel',
    kickboard: 'Simplatta',
    wetsuit: 'Våtdräkt',
  }
  return names[equip] || equip
}

// Helper to calculate days since a date
function daysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}
