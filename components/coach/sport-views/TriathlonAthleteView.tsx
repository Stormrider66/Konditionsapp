'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Target, TrendingUp, TrendingDown, AlertTriangle, Zap, Timer, Waves } from 'lucide-react'

interface TriathlonSettings {
  targetRaceDistance?: string
  experienceLevel?: string
  strongestDiscipline?: string
  weakestDiscipline?: string
  currentCss?: number | null
  cssTestDate?: string | null
  openWaterExperience?: string
  wetsuitType?: string
  currentFtp?: number | null
  ftpTestDate?: string | null
  bikeType?: string
  hasPowerMeter?: boolean
  currentVdot?: number | null
  runTestDate?: string | null
  weeklySwimDistance?: number | null
  weeklyCycleHours?: number | null
  weeklyRunDistance?: number | null
  transitionPractice?: boolean
}

interface TriathlonAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
}

const DISTANCE_INFO: Record<string, { name: string; swim: string; bike: string; run: string }> = {
  sprint: { name: 'Sprint', swim: '750m', bike: '20km', run: '5km' },
  olympic: { name: 'Olympisk', swim: '1.5km', bike: '40km', run: '10km' },
  half: { name: 'Halv Ironman (70.3)', swim: '1.9km', bike: '90km', run: '21.1km' },
  full: { name: 'Ironman', swim: '3.8km', bike: '180km', run: '42.2km' },
}

const DISCIPLINE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  swim: { icon: '🏊', label: 'Simning', color: 'bg-blue-100 text-blue-800' },
  bike: { icon: '🚴', label: 'Cykling', color: 'bg-yellow-100 text-yellow-800' },
  run: { icon: '🏃', label: 'Löpning', color: 'bg-green-100 text-green-800' },
}

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Nybörjare',
  intermediate: 'Mellanliggande',
  advanced: 'Avancerad',
  elite: 'Elit',
}

function formatCss(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}/100m`
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('sv-SE')
  } catch {
    return '-'
  }
}

// Calculate relative strength based on typical proportions
function calculateDisciplineStrength(settings: TriathlonSettings): { swim: number; bike: number; run: number } {
  // Default all to 50 (average)
  const strengths = { swim: 50, bike: 50, run: 50 }

  // Adjust based on declared strengths/weaknesses
  if (settings.strongestDiscipline) {
    strengths[settings.strongestDiscipline as keyof typeof strengths] = 80
  }
  if (settings.weakestDiscipline) {
    strengths[settings.weakestDiscipline as keyof typeof strengths] = 30
  }

  // Adjust remaining discipline to middle
  const declared = [settings.strongestDiscipline, settings.weakestDiscipline].filter(Boolean)
  const remaining = ['swim', 'bike', 'run'].filter(d => !declared.includes(d))
  remaining.forEach(d => {
    strengths[d as keyof typeof strengths] = 55
  })

  return strengths
}

export function TriathlonAthleteView({ clientId, clientName, settings }: TriathlonAthleteViewProps) {
  const triathlonSettings = settings as TriathlonSettings | undefined

  if (!triathlonSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🏊</span> Triathlon Profil
          </CardTitle>
          <CardDescription>Ingen triathlondata tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Atleten har inte angett triatloninställningar ännu.
          </p>
        </CardContent>
      </Card>
    )
  }

  const raceDistance = DISTANCE_INFO[triathlonSettings.targetRaceDistance || 'olympic'] || DISTANCE_INFO.olympic
  const disciplineStrengths = calculateDisciplineStrength(triathlonSettings)

  const strongestInfo = triathlonSettings.strongestDiscipline
    ? DISCIPLINE_LABELS[triathlonSettings.strongestDiscipline]
    : null
  const weakestInfo = triathlonSettings.weakestDiscipline
    ? DISCIPLINE_LABELS[triathlonSettings.weakestDiscipline]
    : null

  // Calculate weekly volume
  const totalWeeklyVolume = (triathlonSettings.weeklySwimDistance || 0) +
    (triathlonSettings.weeklyCycleHours || 0) * 30 + // Approx km per hour
    (triathlonSettings.weeklyRunDistance || 0)

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>🏊‍♂️🚴🏃</span> Triathlon Dashboard
              </CardTitle>
              <CardDescription>Multi-sport analys</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default">
                {raceDistance.name}
              </Badge>
              <Badge variant="secondary">
                {EXPERIENCE_LABELS[triathlonSettings.experienceLevel || 'beginner']}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Race Distance Details */}
          <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <span className="text-lg">🏊</span>
              <p className="text-xs text-muted-foreground">Simning</p>
              <p className="font-bold text-sm">{raceDistance.swim}</p>
            </div>
            <div className="text-center">
              <span className="text-lg">🚴</span>
              <p className="text-xs text-muted-foreground">Cykling</p>
              <p className="font-bold text-sm">{raceDistance.bike}</p>
            </div>
            <div className="text-center">
              <span className="text-lg">🏃</span>
              <p className="text-xs text-muted-foreground">Löpning</p>
              <p className="font-bold text-sm">{raceDistance.run}</p>
            </div>
          </div>

          {/* Strengths/Weaknesses */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Starkast</span>
              </div>
              <p className="font-bold">
                {strongestInfo ? `${strongestInfo.icon} ${strongestInfo.label}` : '-'}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Fokusera på</span>
              </div>
              <p className="font-bold">
                {weakestInfo ? `${weakestInfo.icon} ${weakestInfo.label}` : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discipline Balance Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Disciplinbalans</CardTitle>
          <CardDescription>Jämförelse av relativ styrka per gren</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(['swim', 'bike', 'run'] as const).map((discipline) => {
              const info = DISCIPLINE_LABELS[discipline]
              const strength = disciplineStrengths[discipline]
              return (
                <div key={discipline}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="flex items-center gap-2">
                      <span>{info.icon}</span>
                      <span className="font-medium text-sm">{info.label}</span>
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        strength >= 70 ? 'border-green-500 text-green-700' :
                        strength <= 40 ? 'border-orange-500 text-orange-700' :
                        'border-gray-500'
                      }
                    >
                      {strength >= 70 ? 'Stark' : strength <= 40 ? 'Utveckla' : 'Medel'}
                    </Badge>
                  </div>
                  <Progress
                    value={strength}
                    className={`h-3 ${
                      strength >= 70 ? '[&>div]:bg-green-500' :
                      strength <= 40 ? '[&>div]:bg-orange-500' :
                      ''
                    }`}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Swimming */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Waves className="h-4 w-4 text-blue-500" />
              Simning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">CSS</p>
              <p className="font-bold">
                {triathlonSettings.currentCss ? formatCss(triathlonSettings.currentCss) : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Testad</p>
              <p className="text-sm">{formatDate(triathlonSettings.cssTestDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Öppet vatten</p>
              <p className="text-sm capitalize">
                {triathlonSettings.openWaterExperience || '-'}
              </p>
            </div>
            {triathlonSettings.weeklySwimDistance && (
              <div>
                <p className="text-xs text-muted-foreground">km/vecka</p>
                <p className="font-medium">{triathlonSettings.weeklySwimDistance}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cycling */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Cykling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">FTP</p>
              <p className="font-bold">
                {triathlonSettings.currentFtp ? `${triathlonSettings.currentFtp}W` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Testad</p>
              <p className="text-sm">{formatDate(triathlonSettings.ftpTestDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Effektmätare</p>
              <p className="text-sm">{triathlonSettings.hasPowerMeter ? 'Ja' : 'Nej'}</p>
            </div>
            {triathlonSettings.weeklyCycleHours && (
              <div>
                <p className="text-xs text-muted-foreground">tim/vecka</p>
                <p className="font-medium">{triathlonSettings.weeklyCycleHours}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Running */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4 text-green-500" />
              Löpning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">VDOT</p>
              <p className="font-bold">
                {triathlonSettings.currentVdot || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Testad</p>
              <p className="text-sm">{formatDate(triathlonSettings.runTestDate)}</p>
            </div>
            {triathlonSettings.weeklyRunDistance && (
              <div>
                <p className="text-xs text-muted-foreground">km/vecka</p>
                <p className="font-medium">{triathlonSettings.weeklyRunDistance}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Recommendations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Träningsrekommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {weakestInfo && (
              <p className="p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                <strong>Prioritet:</strong> Fokusera på {weakestInfo.label.toLowerCase()} för att förbättra balansen.
              </p>
            )}
            {!triathlonSettings.transitionPractice && (
              <p className="p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                <strong>Tips:</strong> Träna växlingar (T1/T2) regelbundet för bättre racetider.
              </p>
            )}
            {triathlonSettings.openWaterExperience === 'none' && (
              <p className="p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                <strong>Simning:</strong> Börja träna i öppet vatten före race.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
