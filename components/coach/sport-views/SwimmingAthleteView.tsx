'use client'

import { useLocale } from 'next-intl'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Waves, Timer, Calendar, Target } from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import { SportTestHistory } from '@/components/tests/shared'

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

const STROKE_LABELS: Record<string, { sv: string; en: string }> = {
  freestyle: { sv: 'Frisim', en: 'Freestyle' },
  backstroke: { sv: 'Ryggsim', en: 'Backstroke' },
  breaststroke: { sv: 'Bröstsim', en: 'Breaststroke' },
  butterfly: { sv: 'Fjärilsim', en: 'Butterfly' },
  im: { sv: 'Medley', en: 'Individual medley' },
}

const DISCIPLINE_LABELS: Record<string, { sv: string; en: string }> = {
  sprint: { sv: 'Sprint (50-100m)', en: 'Sprint (50-100m)' },
  middle: { sv: 'Mellandistans (200-400m)', en: 'Middle distance (200-400m)' },
  distance: { sv: 'Distans (800m+)', en: 'Distance (800m+)' },
  open_water: { sv: 'Öppet vatten', en: 'Open water' },
  triathlon: { sv: 'Triathlon', en: 'Triathlon' },
}

const POOL_LABELS: Record<string, { sv: string; en: string }> = {
  '25m': { sv: '25m (kortbana)', en: '25m (short course)' },
  '50m': { sv: '50m (långbana)', en: '50m (long course)' },
  open: { sv: 'Öppet vatten', en: 'Open water' },
}

const EQUIPMENT_LABELS: Record<string, { sv: string; en: string }> = {
  paddles: { sv: 'Handpaddlar', en: 'Hand paddles' },
  fins: { sv: 'Fenor', en: 'Fins' },
  pull_buoy: { sv: 'Pull buoy', en: 'Pull buoy' },
  kickboard: { sv: 'Platta', en: 'Kickboard' },
  snorkel: { sv: 'Snorkel', en: 'Snorkel' },
}

function formatCss(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateString: string | null | undefined, locale: string): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')
  } catch {
    return '-'
  }
}

// CSS-based training zones (percentage of CSS)
function getCssZones(css: number, locale: string) {
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en
  return [
    { zone: 1, name: t('Återhämtning', 'Recovery'), pace: Math.round(css * 1.15), percent: '115%' },
    { zone: 2, name: t('Aerob uthållighet', 'Aerobic endurance'), pace: Math.round(css * 1.08), percent: '108%' },
    { zone: 3, name: t('Tempo', 'Tempo'), pace: Math.round(css * 1.02), percent: '102%' },
    { zone: 4, name: t('Tröskel (CSS)', 'Threshold (CSS)'), pace: css, percent: '100%' },
    { zone: 5, name: t('VO2max', 'VO2 max'), pace: Math.round(css * 0.95), percent: '95%' },
    { zone: 6, name: t('Sprint', 'Sprint'), pace: Math.round(css * 0.88), percent: '88%' },
  ]
}

export function SwimmingAthleteView({ clientId, clientName: _clientName, settings }: SwimmingAthleteViewProps) {
  const locale = useLocale()
  const isSv = locale === 'sv'
  const t = (sv: string, en: string) => isSv ? sv : en
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const swimmingSettings = settings as SwimmingSettings | undefined

  if (!swimmingSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <span>🏊‍♂️</span> {t('Simprofil', 'Swimming Profile')}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t('Ingen simdata tillgänglig', 'No swimming data available')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            {t('Atleten har inte angett siminställningar ännu.', 'The athlete has not entered swimming settings yet.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const css = swimmingSettings.currentCss
  const cssZones = css ? getCssZones(css, locale) : null

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>🏊‍♂️</span> {t('Simningsöversikt', 'Swimming Dashboard')}
              </CardTitle>
              <CardDescription>{t('Teknik och hastighetsdata', 'Technique and speed data')}</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {swimmingSettings.primaryStroke && (
                <Badge variant="default">
                  {STROKE_LABELS[swimmingSettings.primaryStroke]?.[isSv ? 'sv' : 'en'] || swimmingSettings.primaryStroke}
                </Badge>
              )}
              {swimmingSettings.primaryDiscipline && (
                <Badge variant="secondary">
                  {DISCIPLINE_LABELS[swimmingSettings.primaryDiscipline]?.[isSv ? 'sv' : 'en'] || swimmingSettings.primaryDiscipline}
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
              <p className="text-xs text-muted-foreground">{t('Testad', 'Tested')}</p>
              <p className="font-bold text-sm">
                {formatDate(swimmingSettings.cssTestDate, locale)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Waves className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
              <p className="text-xs text-muted-foreground">{t('km/vecka', 'km/week')}</p>
              <p className="font-bold text-lg">{swimmingSettings.weeklySwimDistance || '-'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Target className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xs text-muted-foreground">{t('Pass/vecka', 'Sessions/week')}</p>
              <p className="font-bold text-lg">{swimmingSettings.weeklySwimSessions || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSS Zones */}
      {cssZones && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('Träningszoner (CSS-baserade)', 'Training Zones (CSS-based)')}</CardTitle>
            <CardDescription>{t('Tempo per 100m baserat på CSS', 'Pace per 100m based on CSS')}: {formatCss(css!)}</CardDescription>
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
            <CardTitle className="text-base">{t('Simtag', 'Strokes')}</CardTitle>
          </CardHeader>
          <CardContent>
            {swimmingSettings.strokeTypes && swimmingSettings.strokeTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {swimmingSettings.strokeTypes.map((stroke) => (
                  <Badge
                    key={stroke}
                    variant={stroke === swimmingSettings.primaryStroke ? 'default' : 'secondary'}
                  >
                    {STROKE_LABELS[stroke]?.[isSv ? 'sv' : 'en'] || stroke}
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
            <CardTitle className="text-base">{t('Träningsmiljö', 'Training Environment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {swimmingSettings.preferredPoolLength && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('Bassäng', 'Pool')}</span>
                  <span className="font-medium">
                    {POOL_LABELS[swimmingSettings.preferredPoolLength]?.[isSv ? 'sv' : 'en'] || swimmingSettings.preferredPoolLength}
                  </span>
                </div>
              )}
              {swimmingSettings.openWaterExperience && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('Öppet vatten', 'Open water')}</span>
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
            <CardTitle className="text-base">{t('Utrustning', 'Equipment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {swimmingSettings.equipment.map((equip) => (
                <Badge key={equip} variant="outline">
                  {EQUIPMENT_LABELS[equip]?.[isSv ? 'sv' : 'en'] || equip}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="SWIMMING"
        title={t('Testhistorik - Simning', 'Test History - Swimming')}
        protocolLabels={{
          CSS_TEST: 'CSS Test',
          TIME_TRIAL_100M: '100m TT',
          TIME_TRIAL_400M: '400m TT',
        }}
      />
    </div>
  )
}
