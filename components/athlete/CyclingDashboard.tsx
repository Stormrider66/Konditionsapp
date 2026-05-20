'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Gauge, TrendingUp, Clock, Target, Activity } from 'lucide-react'
import { calculatePowerZones, evaluateCyclingPower } from '@/lib/calculations/cycling'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { useLocale, useTranslations } from '@/i18n/client'

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

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale.startsWith('sv') ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

const DISCIPLINE_LABELS: Record<string, Record<AppLocale, string>> = {
  endurance: { sv: 'Uthållighet / Gran Fondo', en: 'Endurance / Gran Fondo' },
  racing: { sv: 'Tävlingscykling', en: 'Road racing' },
  tt: { sv: 'Tempo', en: 'Time trial' },
  climbing: { sv: 'Klättring', en: 'Climbing' },
  crit: { sv: 'Criterium', en: 'Criterium' },
  triathlon: { sv: 'Triathlon', en: 'Triathlon' },
  mtb_xc: { sv: 'MTB XC', en: 'MTB XC' },
  mtb_enduro: { sv: 'MTB Enduro', en: 'MTB Enduro' },
  gravel: { sv: 'Graveltävling', en: 'Gravel racing' },
  recreational: { sv: 'Motionscykling', en: 'Recreational cycling' },
}

const BIKE_TYPE_ICONS: Record<string, string> = {
  road: '🚴',
  tt: '🚴‍♂️',
  mtb: '🚵',
  gravel: '🚲',
  indoor: '🏠',
}

const POWER_ZONE_DESCRIPTIONS: Record<string, Record<AppLocale, string>> = {
  'Active Recovery': { sv: 'Aktiv återhämtning, mycket låg intensitet', en: 'Active recovery, very low intensity' },
  Endurance: { sv: 'Grundträning, lång långsam distans', en: 'Base training, long slow distance' },
  Tempo: { sv: 'Tempo, aerob kapacitet', en: 'Tempo, aerobic capacity' },
  'Lactate Threshold': { sv: 'Laktattröskel, "sweet spot"', en: 'Lactate threshold, "sweet spot"' },
  'VO2 Max': { sv: 'VO2 max intervaller', en: 'VO2 max intervals' },
  'Anaerobic Capacity': { sv: 'Anaerob kapacitet, korta intervaller', en: 'Anaerobic capacity, short intervals' },
  Neuromuscular: { sv: 'Neuromuskulär träning, sprint', en: 'Neuromuscular training, sprint' },
}

export function CyclingDashboard({
  cyclingSettings,
  experience: _experience,
  clientName,
}: CyclingDashboardProps) {
  const t = useTranslations('components.cyclingDashboard')
  const locale = getAppLocale(useLocale())
  const dateLocale = locale === 'sv' ? sv : enUS
  const basePath = useBasePath()
  const pageCtx = usePageContextOptional()
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const [daysSinceFtpTest, setDaysSinceFtpTest] = useState<number | null>(null)
  useEffect(() => {
    const ftpTestDate = cyclingSettings?.ftpTestDate
    if (!ftpTestDate) {
      queueMicrotask(() => setDaysSinceFtpTest(null))
      return
    }
    const updateDaysSinceFtpTest = () => {
      setDaysSinceFtpTest(Math.floor((Date.now() - new Date(ftpTestDate).getTime()) / (1000 * 60 * 60 * 24)))
    }
    queueMicrotask(updateDaysSinceFtpTest)
  }, [cyclingSettings?.ftpTestDate])

  // Set rich page context for AI chat
  useEffect(() => {
    if (!cyclingSettings) return
    const ftp = cyclingSettings.currentFtp
    const w = cyclingSettings.weight
    const wpkg = ftp && w ? (ftp / w) : null
    const pzones = ftp ? calculatePowerZones(ftp) : null
    pageCtx?.setPageContext({
      type: 'cycling',
      title: text(locale, `Cykling - ${clientName}`, `Cycling - ${clientName}`),
      conceptKeys: ['ftp', 'wattsPerKg', 'criticalPower', 'trainingZones'],
      data: {
        clientName,
        ftp,
        weight: w,
        wattsPerKg: wpkg ? parseFloat(wpkg.toFixed(2)) : null,
        ftpTestDate: cyclingSettings.ftpTestDate,
        primaryDiscipline: cyclingSettings.primaryDiscipline,
        weeklyHours: cyclingSettings.weeklyHours,
        bikeTypes: cyclingSettings.bikeTypes,
        zoneCount: pzones?.length ?? 0,
        zones: pzones?.map(z => ({
          zone: z.zone,
          name: z.name,
          powerMin: z.powerMin,
          powerMax: z.powerMax,
        })) ?? [],
      },
      summary: text(
        locale,
        `Cykling för ${clientName}: FTP ${ftp ? `${ftp}W` : 'ej registrerad'}${wpkg ? `, ${wpkg.toFixed(2)} W/kg` : ''}. ${cyclingSettings.weeklyHours}h/vecka, disciplin: ${cyclingSettings.primaryDiscipline || 'ej angiven'}. ${pzones ? `${pzones.length} träningszoner beräknade.` : 'Inga zoner beräknade.'}`,
        `Cycling for ${clientName}: FTP ${ftp ? `${ftp}W` : 'not registered'}${wpkg ? `, ${wpkg.toFixed(2)} W/kg` : ''}. ${cyclingSettings.weeklyHours}h/week, discipline: ${cyclingSettings.primaryDiscipline || 'not specified'}. ${pzones ? `${pzones.length} training zones calculated.` : 'No zones calculated.'}`
      ),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cyclingSettings, clientName, locale])

  if (!cyclingSettings) {
    return (
      <Card
        className="border-dashed border-2"
        style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundCard }}
      >
        <CardContent className="py-8 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4" style={{ color: theme.colors.textMuted }} />
          <p style={{ color: theme.colors.textMuted }}>
            {t('emptyState.description')}
          </p>
          <Link href={`${basePath}/athlete/onboarding`} className="underline mt-2 inline-block" style={{ color: theme.colors.accent }}>
            {t('actions.goToOnboarding')}
          </Link>
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

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* FTP Card */}
        <Card className="relative overflow-hidden" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-yellow-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: theme.colors.textMuted }}>FTP <InfoTooltip conceptKey="ftp" /></p>
                <p className="text-3xl font-bold mt-1" style={{ color: theme.colors.textPrimary }}>
                  {currentFtp ? `${currentFtp}W` : '—'}
                </p>
                {ftpDate && (
                  <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                    {text(locale, 'Testad', 'Tested')} {format(ftpDate, 'd MMM yyyy', { locale: dateLocale })}
                  </p>
                )}
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        {/* W/kg Card */}
        <Card className="relative overflow-hidden" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>Watt/kg <InfoTooltip conceptKey="wattsPerKg" /></p>
                <p className="text-3xl font-bold mt-1" style={{ color: theme.colors.textPrimary }}>
                  {wattsPerKg ? wattsPerKg.toFixed(2) : '—'}
                </p>
                {weight && (
                  <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                    {weight} kg {text(locale, 'kroppsvikt', 'body weight')}
                  </p>
                )}
              </div>
              <Gauge className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Training */}
        <Card className="relative overflow-hidden" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>{text(locale, 'Veckoträning', 'Weekly training')}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: theme.colors.textPrimary }}>
                  {weeklyHours}h
                </p>
                <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                  {indoorOutdoorSplit}% {text(locale, 'inomhus', 'indoor')}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Discipline */}
        <Card className="relative overflow-hidden" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>{text(locale, 'Disciplin', 'Discipline')}</p>
                <p className="text-lg font-semibold mt-1" style={{ color: theme.colors.textPrimary }}>
                  {DISCIPLINE_LABELS[primaryDiscipline]?.[locale] || primaryDiscipline || '—'}
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
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-5 w-5" />
              {text(locale, 'Dina träningszoner', 'Your training zones')}
              <InfoTooltip conceptKey="trainingZones" />
            </CardTitle>
            <CardDescription style={{ color: theme.colors.textMuted }}>
              {text(locale, 'Baserat på din FTP på', 'Based on your FTP of')} {currentFtp}W
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
                      <span className="font-medium" style={{ color: theme.colors.textPrimary }}>
                        Z{zone.zone} - {zone.name}
                      </span>
                      <span style={{ color: theme.colors.textMuted }}>
                        {zone.powerMin}–{zone.powerMax}W
                      </span>
                    </div>
                    <div className="h-6 w-full rounded-full overflow-hidden relative" style={{ backgroundColor: theme.colors.border }}>
                      <div
                        className={`h-full ${zoneColors[zone.zone]} transition-all`}
                        style={{ width: `${widthPercent}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium" style={{ color: theme.colors.textPrimary }}>
                        {zone.percentMin}–{zone.percentMax}% FTP
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                      {POWER_ZONE_DESCRIPTIONS[zone.name]?.[locale] ?? zone.description}
                    </p>
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
            <CardTitle style={{ color: theme.colors.textPrimary }}>{text(locale, 'Din nivå', 'Your level')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-base px-4 py-2">
                {evaluation}
              </Badge>
              {daysSinceFtpTest !== null && daysSinceFtpTest > 42 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  {text(
                    locale,
                    `FTP-test rekommenderas (senast för ${daysSinceFtpTest} dagar sedan)`,
                    `FTP test recommended (last test was ${daysSinceFtpTest} days ago)`
                  )}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FTP Test Reminder */}
      {!currentFtp && (
        <Card
          style={{
            backgroundColor: theme.id === 'FITAPP_DARK' ? '#422006' : '#fffbeb',
            borderColor: theme.id === 'FITAPP_DARK' ? '#92400e' : '#fde68a',
          }}
        >
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <Zap className="h-6 w-6 text-amber-500 mt-0.5" />
              <div>
                <p
                  className="font-medium"
                  style={{ color: theme.id === 'FITAPP_DARK' ? '#fde68a' : '#78350f' }}
                >
                  {text(locale, 'Ingen FTP registrerad', 'No FTP registered')}
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: theme.id === 'FITAPP_DARK' ? '#fcd34d' : '#92400e' }}
                >
                  {text(
                    locale,
                    'Genomför ett FTP-test för att få personliga träningszoner och bättre anpassade träningsprogram. Du kan använda ett 20-minuters eller 8-minuters testprotokoll.',
                    'Complete an FTP test to get personal training zones and better tailored training programs. You can use a 20-minute or 8-minute test protocol.'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
