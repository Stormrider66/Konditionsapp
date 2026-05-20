'use client'

import { useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mountain, Snowflake, Timer, TrendingUp } from 'lucide-react'

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

const TECHNIQUE_LABELS: Record<string, { label: string; labelSv: string; icon: string }> = {
  classic: { label: 'Classic', labelSv: 'Klassisk', icon: '🎿' },
  skate: { label: 'Skate', labelSv: 'Skate', icon: '⛷️' },
  both: { label: 'Both', labelSv: 'Båda', icon: '🎿⛷️' },
}

const DISCIPLINE_LABELS: Record<string, { sv: string; en: string }> = {
  distance: { sv: 'Distans', en: 'Distance' },
  sprint: { sv: 'Sprint', en: 'Sprint' },
  skiathlon: { sv: 'Skiathlon', en: 'Skiathlon' },
  relay: { sv: 'Stafett', en: 'Relay' },
  recreational: { sv: 'Motion', en: 'Recreational' },
}

const TERRAIN_LABELS: Record<string, { sv: string; en: string }> = {
  flat: { sv: 'Plant', en: 'Flat' },
  rolling: { sv: 'Kuperat', en: 'Rolling' },
  hilly: { sv: 'Backigt', en: 'Hilly' },
  mountainous: { sv: 'Fjäll', en: 'Mountainous' },
}

export function SkiingAthleteView({ clientId: _clientId, clientName: _clientName, settings }: SkiingAthleteViewProps) {
  const locale = useLocale()
  const isSv = locale === 'sv'
  const t = (sv: string, en: string) => isSv ? sv : en
  const skiingSettings = settings as SkiingSettings | undefined

  if (!skiingSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>⛷️</span> {t('Skidprofil', 'Skiing Profile')}
          </CardTitle>
          <CardDescription>{t('Ingen skiddata tillgänglig', 'No skiing data available')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('Atleten har inte angett skidinställningar ännu.', 'The athlete has not entered skiing settings yet.')}
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
                <span>{technique.icon}</span> {t('Längdskidåkning översikt', 'Cross-Country Skiing Dashboard')}
              </CardTitle>
              <CardDescription>{t('Teknik och prestanda', 'Technique and performance')}</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default">{isSv ? technique.labelSv : technique.label}</Badge>
              {skiingSettings.primaryDiscipline && (
                <Badge variant="secondary">
                  {DISCIPLINE_LABELS[skiingSettings.primaryDiscipline]?.[isSv ? 'sv' : 'en'] || skiingSettings.primaryDiscipline}
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
              <p className="text-xs text-muted-foreground">{t('km/vecka', 'km/week')}</p>
              <p className="font-bold text-lg">{skiingSettings.weeklyDistance || '-'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <p className="text-xs text-muted-foreground">{t('tim/vecka', 'hours/week')}</p>
              <p className="font-bold text-lg">{skiingSettings.weeklyHours || '-'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Snowflake className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
              <p className="text-xs text-muted-foreground">{t('Erfarenhet', 'Experience')}</p>
              <p className="font-bold text-lg">
                {skiingSettings.experienceYears ? `${skiingSettings.experienceYears} ${t('år', 'yrs')}` : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('Utrustning', 'Equipment')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">{t('Skidlängd', 'Ski length')}</p>
              <p className="font-bold">{skiingSettings.skiLength ? `${skiingSettings.skiLength}cm` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Stavlängd', 'Pole length')}</p>
              <p className="font-bold">{skiingSettings.poleLength ? `${skiingSettings.poleLength}cm` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Skostorlek', 'Boot size')}</p>
              <p className="font-bold">{skiingSettings.bootSize || '-'}</p>
            </div>
          </div>
          <div className="flex gap-4 mt-4 justify-center">
            <Badge variant={skiingSettings.hasHeartRateMonitor ? 'default' : 'outline'}>
              {t('HF-mätare', 'HR monitor')}: {skiingSettings.hasHeartRateMonitor ? t('Ja', 'Yes') : t('Nej', 'No')}
            </Badge>
            <Badge variant={skiingSettings.hasPowerMeter ? 'default' : 'outline'}>
              {t('Effektmätare', 'Power meter')}: {skiingSettings.hasPowerMeter ? t('Ja', 'Yes') : t('Nej', 'No')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Terrain & Goals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('Föredragen terräng', 'Preferred Terrain')}</CardTitle>
          </CardHeader>
          <CardContent>
            {skiingSettings.preferredTerrain && skiingSettings.preferredTerrain.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skiingSettings.preferredTerrain.map((terrain) => (
                  <Badge key={terrain} variant="secondary">
                    {TERRAIN_LABELS[terrain]?.[isSv ? 'sv' : 'en'] || terrain}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('Ej angivet', 'Not specified')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('Tävlingsmål', 'Race Goals')}</CardTitle>
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
              <p className="text-sm text-muted-foreground">{t('Ej angivet', 'Not specified')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
