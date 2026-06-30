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
import { Progress } from '@/components/ui/progress'
import { Zap, Scale, Calendar, Bike, TrendingUp, Activity } from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'

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

const DISCIPLINE_LABELS: Record<string, { sv: string; en: string }> = {
  road: { sv: 'Landsvägscykling', en: 'Road cycling' },
  gravel: { sv: 'Gravel', en: 'Gravel' },
  mtb: { sv: 'Mountainbike', en: 'Mountain bike' },
  triathlon: { sv: 'Triathlon', en: 'Triathlon' },
  track: { sv: 'Bana', en: 'Track' },
  cx: { sv: 'Cyclocross', en: 'Cyclocross' },
  indoor: { sv: 'Inomhus/Zwift', en: 'Indoor/Zwift' },
}

const BIKE_LABELS: Record<string, { sv: string; en: string }> = {
  road: { sv: 'Landsvägscykel', en: 'Road bike' },
  gravel: { sv: 'Gravelcykel', en: 'Gravel bike' },
  mtb: { sv: 'MTB', en: 'MTB' },
  tt: { sv: 'Tempcykel', en: 'Time trial bike' },
  indoor: { sv: 'Smart Trainer', en: 'Smart trainer' },
  hybrid: { sv: 'Hybridcykel', en: 'Hybrid bike' },
}

// FTP zones based on percentage of FTP
const FTP_ZONES = [
  { zone: 1, name: { sv: 'Återhämtning', en: 'Recovery' }, min: 0, max: 55, color: 'bg-gray-200' },
  { zone: 2, name: { sv: 'Uthållighet', en: 'Endurance' }, min: 56, max: 75, color: 'bg-blue-200' },
  { zone: 3, name: { sv: 'Tempo', en: 'Tempo' }, min: 76, max: 90, color: 'bg-emerald-200' },
  { zone: 4, name: { sv: 'Tröskel', en: 'Threshold' }, min: 91, max: 105, color: 'bg-amber-200' },
  { zone: 5, name: { sv: 'VO2max', en: 'VO2 max' }, min: 106, max: 120, color: 'bg-orange-200' },
  { zone: 6, name: { sv: 'Anaerob', en: 'Anaerobic' }, min: 121, max: 150, color: 'bg-red-200' },
]

function getFtpCategory(ftp: number, weight: number | null, locale: string): { category: string; color: string } {
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en
  const wpkg = weight ? ftp / weight : 0
  if (wpkg >= 5.0) return { category: 'World Class', color: 'text-purple-600' }
  if (wpkg >= 4.5) return { category: t('Exceptionell', 'Exceptional'), color: 'text-indigo-600' }
  if (wpkg >= 4.0) return { category: t('Utmärkt', 'Excellent'), color: 'text-blue-600' }
  if (wpkg >= 3.5) return { category: t('Mycket bra', 'Very good'), color: 'text-emerald-600' }
  if (wpkg >= 3.0) return { category: t('Bra', 'Good'), color: 'text-amber-600' }
  if (wpkg >= 2.5) return { category: t('Medel', 'Average'), color: 'text-orange-600' }
  return { category: t('Nybörjare', 'Beginner'), color: 'text-gray-600' }
}

function formatDate(dateString: string | null | undefined, locale: string): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')
  } catch {
    return '-'
  }
}

export function CyclingAthleteView({ clientId: _clientId, clientName: _clientName, settings }: CyclingAthleteViewProps) {
  const locale = useLocale()
  const isSv = locale === 'sv'
  const t = (sv: string, en: string) => isSv ? sv : en
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const cyclingSettings = settings as CyclingSettings | undefined

  if (!cyclingSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <span>🚴</span> {t('Cykelprofil', 'Cycling Profile')}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t('Ingen cykeldata tillgänglig', 'No cycling data available')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            {t('Atleten har inte angett cykelinställningar ännu.', 'The athlete has not entered cycling settings yet.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const ftp = cyclingSettings.currentFtp
  const weight = cyclingSettings.weight
  const wpkg = ftp && weight ? (ftp / weight).toFixed(2) : null
  const ftpCategory = ftp && weight ? getFtpCategory(ftp, weight, locale) : null

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>🚴</span> {t('Cykelöversikt', 'Cycling Dashboard')}
              </CardTitle>
              <CardDescription>{t('Effektdata och prestanda', 'Power data and performance')}</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {cyclingSettings.primaryDiscipline && (
                <Badge variant="outline">
                  {DISCIPLINE_LABELS[cyclingSettings.primaryDiscipline]?.[isSv ? 'sv' : 'en'] || cyclingSettings.primaryDiscipline}
                </Badge>
              )}
              {cyclingSettings.powerMeterType && cyclingSettings.powerMeterType !== 'none' && (
                <Badge variant="secondary">{t('Effektmätare', 'Power meter')}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Zap className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">FTP</p>
              <p className="font-bold text-lg">{ftp ? `${ftp}W` : '-'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Scale className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
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
                {formatDate(cyclingSettings.ftpTestDate, locale)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Activity className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('Tim/vecka', 'Hours/week')}</p>
              <p className="font-bold text-lg">{cyclingSettings.weeklyHours || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Power Zones */}
      {ftp && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('Effektzoner', 'Power Zones')}</CardTitle>
            <CardDescription>{t('Baserat på FTP', 'Based on FTP')}: {ftp}W</CardDescription>
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
                        <span className="font-medium text-sm">{zone.name[isSv ? 'sv' : 'en']}</span>
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
              {t('Utrustning', 'Equipment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cyclingSettings.bikeTypes && cyclingSettings.bikeTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cyclingSettings.bikeTypes.map((bike) => (
                  <Badge key={bike} variant="outline">
                    {BIKE_LABELS[bike]?.[isSv ? 'sv' : 'en'] || bike}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('Ingen utrustning angiven', 'No equipment entered')}</p>
            )}
            {cyclingSettings.powerMeterType && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('Effektmätare', 'Power meter')}: {cyclingSettings.powerMeterType}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Training Split */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('Träningsfördelning', 'Training Split')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cyclingSettings.indoorOutdoorSplit !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('Inomhus', 'Indoor')}</span>
                  <span>{cyclingSettings.indoorOutdoorSplit}%</span>
                </div>
                <Progress value={cyclingSettings.indoorOutdoorSplit} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>{t('Utomhus', 'Outdoor')}</span>
                  <span>{100 - cyclingSettings.indoorOutdoorSplit}%</span>
                </div>
              </div>
            )}
            {cyclingSettings.trainingPlatforms && cyclingSettings.trainingPlatforms.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">{t('Plattformar', 'Platforms')}</p>
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
