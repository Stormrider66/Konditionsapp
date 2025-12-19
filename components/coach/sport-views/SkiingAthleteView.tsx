'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mountain, Snowflake, Timer, TrendingUp } from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'

interface SkiingSettings {
  technique?: string
  primaryDiscipline?: string
  skiLength?: number | null
  poleLength?: number | null
  bootSize?: number | null
  experienceYears?: number
  weeklyDistance?: number
  weeklyHours?: number
  hasHeartRateMonitor?: boolean
  hasPowerMeter?: boolean
  currentLactateThreshold?: number | null
  testDate?: string | null
  preferredTerrain?: string[]
  racingGoals?: string[]
}

interface SkiingAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
}

const TECHNIQUE_LABELS: Record<string, { label: string; icon: string }> = {
  classic: { label: 'Klassisk', icon: '🎿' },
  skate: { label: 'Skate', icon: '⛷️' },
  both: { label: 'Båda', icon: '🎿⛷️' },
}

const DISCIPLINE_LABELS: Record<string, string> = {
  distance: 'Distans',
  sprint: 'Sprint',
  skiathlon: 'Skiathlon',
  relay: 'Stafett',
  recreational: 'Motion',
}

const TERRAIN_LABELS: Record<string, string> = {
  flat: 'Plant',
  rolling: 'Kuperat',
  hilly: 'Backigt',
  mountainous: 'Fjäll',
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('sv-SE')
  } catch {
    return '-'
  }
}

export function SkiingAthleteView({ clientId, clientName, settings }: SkiingAthleteViewProps) {
  const skiingSettings = settings as SkiingSettings | undefined

  if (!skiingSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>⛷️</span> Skidprofil
          </CardTitle>
          <CardDescription>Ingen skiddata tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Atleten har inte angett skidinställningar ännu.
          </p>
        </CardContent>
      </Card>
    )
  }

  const technique = TECHNIQUE_LABELS[skiingSettings.technique || 'classic'] || TECHNIQUE_LABELS.classic

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>{technique.icon}</span> Längdskidåkning Dashboard
              </CardTitle>
              <CardDescription>Teknik och prestanda</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default">{technique.label}</Badge>
              {skiingSettings.primaryDiscipline && (
                <Badge variant="secondary">
                  {DISCIPLINE_LABELS[skiingSettings.primaryDiscipline] || skiingSettings.primaryDiscipline}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Timer className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-xs text-muted-foreground">LT (bpm)</p>
              <p className="font-bold text-lg">
                {skiingSettings.currentLactateThreshold || '-'}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Mountain className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xs text-muted-foreground">km/vecka</p>
              <p className="font-bold text-lg">{skiingSettings.weeklyDistance || '-'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <p className="text-xs text-muted-foreground">tim/vecka</p>
              <p className="font-bold text-lg">{skiingSettings.weeklyHours || '-'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Snowflake className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
              <p className="text-xs text-muted-foreground">Erfarenhet</p>
              <p className="font-bold text-lg">
                {skiingSettings.experienceYears ? `${skiingSettings.experienceYears} år` : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Utrustning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Skidlängd</p>
              <p className="font-bold">{skiingSettings.skiLength ? `${skiingSettings.skiLength}cm` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stavlängd</p>
              <p className="font-bold">{skiingSettings.poleLength ? `${skiingSettings.poleLength}cm` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Skostorlek</p>
              <p className="font-bold">{skiingSettings.bootSize || '-'}</p>
            </div>
          </div>
          <div className="flex gap-4 mt-4 justify-center">
            <Badge variant={skiingSettings.hasHeartRateMonitor ? 'default' : 'outline'}>
              HF-mätare: {skiingSettings.hasHeartRateMonitor ? 'Ja' : 'Nej'}
            </Badge>
            <Badge variant={skiingSettings.hasPowerMeter ? 'default' : 'outline'}>
              Effektmätare: {skiingSettings.hasPowerMeter ? 'Ja' : 'Nej'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Terrain & Goals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Föredragen Terräng</CardTitle>
          </CardHeader>
          <CardContent>
            {skiingSettings.preferredTerrain && skiingSettings.preferredTerrain.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skiingSettings.preferredTerrain.map((terrain) => (
                  <Badge key={terrain} variant="secondary">
                    {TERRAIN_LABELS[terrain] || terrain}
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
            <CardTitle className="text-base">Tävlingsmål</CardTitle>
          </CardHeader>
          <CardContent>
            {skiingSettings.racingGoals && skiingSettings.racingGoals.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skiingSettings.racingGoals.map((goal) => (
                  <Badge key={goal} variant="outline">
                    {goal}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ej angivet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
